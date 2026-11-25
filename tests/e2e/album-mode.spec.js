// @ts-check
const { test, expect, makeComparisons } = require('./fixtures');
const fs = require('fs');
const path = require('path');
const { albums: ALBUMS } = require('../../data/songs.json');

/**
 * E2E tests for album mode: entry from the landing button and ?mode=albums, album cards,
 * album coverage, the 15-pick unlock and undo, the albums-only tier list, Keep ranking,
 * Rank songs too, restart, image export and the 390px layout.
 */

const ALBUM_NAMES = ALBUMS.map(album => album.name);
// Every quote the landing can show (js/kanye-quotes.js picks one at random)
const LANDING_QUOTES = [...fs.readFileSync(path.join(__dirname, '../../js/kanye-quotes.js'), 'utf8')
  .matchAll(/quote: "(.*)",/g)].map(match => match[1]);
const RANKED_TIERS = ['S', 'A', 'B', 'C', 'D'];
const isMobileProject = name => /Mobile|Android|iPad/.test(name);

async function waitForAppReady(page) {
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-album-mode').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

async function waitForAlbumComparison(page) {
  await expect(page.locator('#comparison-screen')).toHaveClass(/active/, { timeout: 15000 });
  await page.waitForFunction(() => window.kanyeApp?.mode === 'albums', null, { timeout: 15000 });
  await expect(page.locator('#song-title-a')).not.toBeEmpty();
}

async function startAlbumMode(page) {
  await page.goto('/');
  await waitForAppReady(page);
  await page.locator('#start-album-mode').click();
  await waitForAlbumComparison(page);
}

async function openAlbumTierList(page) {
  const btn = page.locator('#show-results');
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.locator('#tier-list-screen')).toHaveClass(/active/, { timeout: 5000 });
}

async function skipReveal(page) {
  const skip = page.locator('#tier-skip-reveal');
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator('#tier-board')).toHaveAttribute('data-revealing', 'false', { timeout: 5000 });
}

async function rankAlbumsToTierList(page, picks = 15) {
  await startAlbumMode(page);
  await makeComparisons(page, picks);
  await openAlbumTierList(page);
  await skipReveal(page);
}

const row = (page, tier) => page.locator(`.tier-row[data-tier="${tier}"]`);
const rowTiles = (page, tier) => row(page, tier).locator('.tier-tile');
const milestoneLabels = page => page.locator('.milestone .milestone-number').allTextContents();
const albumsDone = page => page.evaluate(() => window.kanyeApp.albumRanker.completed());

// The cards' slideInRight entrance pokes past the viewport while it runs, so measure once it ends
async function cardsSettled(page) {
  await page.waitForFunction(() => ['song-a', 'song-b'].every(id => document.getElementById(id).getAnimations().length === 0), null, { timeout: 5000 });
}

async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// ============================================================
// Entry and cards
// ============================================================
test.describe('Album mode entry', () => {
  test('landing button starts album mode with album cards', async ({ page }) => {
    await startAlbumMode(page);

    expect(await page.evaluate(() => window.kanyeApp.mode)).toBe('albums');
    await expect(page.locator('body')).toHaveClass(/album-mode/);

    for (const side of ['a', 'b']) {
      expect(ALBUM_NAMES).toContain(await page.locator(`#song-title-${side}`).textContent());
      await expect(page.locator(`#album-name-${side}`)).not.toBeEmpty();
      await expect(page.locator(`#year-${side}`)).toHaveText(/^\(\d{4}\)$/);
      await expect(page.locator(`#clip-label-${side}`)).toContainText(' · ');
      await expect(page.locator(`#song-${side} .song-actions`)).toBeHidden();
    }
    await expect(page.locator('#song-request-btn')).toBeHidden();

    expect(await milestoneLabels(page)).toEqual(['Start', '15', '30', '50+']);
    await expect(page.locator('#progress-message')).toContainText('tier list');
    await expect(page.locator('#show-results .btn-text')).toHaveText("I'm Done - Show Tier List");
    await expect(page.locator('#show-results')).toBeDisabled();
  });

  test('?mode=albums link starts album mode directly', async ({ page }) => {
    await page.goto('/?mode=albums');
    await waitForAlbumComparison(page);

    await expect(page.locator('#landing-screen')).not.toHaveClass(/active/);
    await expect(page.locator('body')).toHaveClass(/album-mode/);
    expect(ALBUM_NAMES).toContain(await page.locator('#song-title-a').textContent());
    expect(await milestoneLabels(page)).toEqual(['Start', '15', '30', '50+']);
  });

  test('all 17 albums appear within the first 9 picks', async ({ page }) => {
    await startAlbumMode(page);

    const seen = new Set();
    for (let i = 0; i < 9; i++) {
      const pair = await page.evaluate(() => window.kanyeApp.albumRanker.current());
      pair.forEach(id => seen.add(id));
      await makeComparisons(page, 1);
    }
    expect([...seen].sort()).toEqual(ALBUMS.map(album => album.id).sort());
  });
});

// ============================================================
// Unlock and undo
// ============================================================
test.describe('Album mode progress', () => {
  test('done button unlocks at 15 and undo re-locks it', async ({ page }) => {
    await startAlbumMode(page);
    const done = page.locator('#show-results');

    await makeComparisons(page, 14);
    await expect(done).toBeDisabled();
    await expect(page.locator('#current-comparison')).toHaveText('14');

    await makeComparisons(page, 1);
    await expect(done).toBeEnabled();
    await expect(page.locator('#current-comparison')).toHaveText('15');

    await page.locator('#back-button').click();
    await expect(page.locator('#current-comparison')).toHaveText('14');
    expect(await albumsDone(page)).toBe(14);
    await expect(done).toBeDisabled();
  });
});

// ============================================================
// Album tier list
// ============================================================
test.describe('Album mode tier list', () => {
  test('opens albums only with all 17 albums ranked', async ({ page }) => {
    await rankAlbumsToTierList(page);

    await expect(page.locator('.tier-tabs')).toBeHidden();
    await expect(page.locator('.tier-title')).toHaveText('Your Album Tier List');
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'albums');
    await expect(page.locator('#tier-back')).toHaveText('← Keep ranking');
    await expect(page.locator('#tier-rank-songs')).toBeVisible();
    await expect(page.locator('#tier-summary')).toContainText('15 picks');

    let ranked = 0;
    for (const tier of RANKED_TIERS) ranked += await rowTiles(page, tier).count();
    expect(ranked).toBe(17);
    expect(await rowTiles(page, 'S').count()).toBeGreaterThan(0);
    await expect(rowTiles(page, 'unranked')).toHaveCount(0);
  });

  test('Keep ranking resumes the count and keeps moves', async ({ page }) => {
    await rankAlbumsToTierList(page);

    const tile = rowTiles(page, 'S').first();
    const id = await tile.getAttribute('data-id');
    await tile.click();
    await page.locator('.tier-move-btn[data-tier="D"]').click();
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);

    await page.locator('#tier-back').click();
    await waitForAlbumComparison(page);
    await expect(page.locator('#current-comparison')).toHaveText('15');
    expect(await albumsDone(page)).toBe(15);

    await makeComparisons(page, 1);
    await openAlbumTierList(page);
    await skipReveal(page);
    await expect(page.locator('#tier-summary')).toContainText('16 picks');
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
  });

  test('Rank songs too restores song mode', async ({ page }) => {
    await page.goto('/?mode=albums');
    await waitForAlbumComparison(page);
    await makeComparisons(page, 15);
    await openAlbumTierList(page);
    await skipReveal(page);

    await page.locator('#tier-rank-songs').click();
    await expect(page.locator('#comparison-screen')).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForFunction(() => window.kanyeApp.mode === 'songs');
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    expect(await page.evaluate(() => window.kanyeApp.albumRanker)).toBeNull();
    await expect(page.locator('#preview-a')).toBeVisible();
    expect(await milestoneLabels(page)).toEqual(['Start', '20', '50', '100+']);
    await expect(page.locator('#show-results .btn-text')).toHaveText("I'm Done - Show Results");
    expect(new URL(page.url()).searchParams.has('mode')).toBe(false);

    // A song-mode tier list gets its tabs and Results back
    await makeComparisons(page, 20);
    await page.locator('#show-results').click();
    await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#open-tier-list').click();
    await expect(page.locator('#tier-list-screen')).toHaveClass(/active/, { timeout: 5000 });
    await skipReveal(page);
    await expect(page.locator('.tier-tabs')).toBeVisible();
    await expect(page.locator('#tier-back')).toHaveText('← Results');
    await expect(page.locator('.tier-title')).toHaveText('Your Tier List');
    await expect(page.locator('#tier-rank-songs')).toBeHidden();
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'songs');
  });

  test('restart exits album mode', async ({ page }) => {
    await startAlbumMode(page);
    await makeComparisons(page, 2);

    await page.evaluate(() => window.kanyeApp.restart());
    expect(await page.evaluate(() => window.kanyeApp.mode)).toBe('songs');
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    expect(await milestoneLabels(page)).toEqual(['Start', '20', '50', '100+']);
  });

  test('share image downloads an albums PNG on desktop', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo.project.name), 'Mobile projects use Web Share');
    await rankAlbumsToTierList(page);

    const share = page.locator('#tier-share-image');
    await expect(share).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      share.click()
    ]);
    expect(download.suggestedFilename()).toMatch(/kanye-tier-list-albums.*\.png/);
  });
});

// ============================================================
// Layout
// ============================================================
test.describe('Album mode layout', () => {
  // The landing quote is random, so check the button against every quote instead of whichever one loads.
  // 390x664 is the iPhone 13 viewport with Safari's bars; the button must clear the floating settings button too.
  test('at 390x664 the album button is in the first viewport whatever the quote', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto('/');
    await waitForAppReady(page);

    const misplaced = await page.evaluate(quotes => {
      const quote = document.querySelector('.main-quote');
      const settings = document.getElementById('settings-button')?.getBoundingClientRect();
      const overlaps = (a, b) => b && b.width > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return quotes.map(text => {
        quote.textContent = `"${text}"`;
        const r = document.getElementById('start-album-mode').getBoundingClientRect();
        return { quote: text.slice(0, 40), top: r.top, bottom: Math.round(r.bottom), left: r.left, right: r.right, height: r.height, hitsSettings: overlaps(r, settings) };
      }).filter(b => b.top < 0 || b.left < 0 || b.bottom > window.innerHeight || b.right > window.innerWidth || b.height < 44 || b.hitsSettings);
    }, LANDING_QUOTES);
    expect(misplaced).toEqual([]);
  });

  test('at 390px nothing scrolls sideways on landing, album comparison or album tier list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForAppReady(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.locator('#start-album-mode').click();
    await waitForAlbumComparison(page);
    await cardsSettled(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await makeComparisons(page, 15);
    await openAlbumTierList(page);
    await skipReveal(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
