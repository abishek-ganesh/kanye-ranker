// @ts-check
const { test, expect, makeComparisons } = require('./fixtures');
const { albums: ALBUMS, songs: SONGS } = require('../../data/songs.json');

/**
 * E2E tests for album mode: entry from the landing button and ?mode=albums, album cards and captions,
 * album coverage, the 15-pick unlock and undo, the album results page, the albums-only tier list,
 * Keep ranking, the Songs / Albums switch between coexisting sessions, Start Over, image export
 * and the 390px layout.
 */

const ALBUM_NAMES = ALBUMS.map(album => album.name);
const ALBUMS_BY_ID = new Map(ALBUMS.map(album => [album.id, album]));
const SHORT_NAMES = { mbdtf: 'MBDTF' };
const CENSORED = { 'Niggas in Paris': 'N****s in Paris' };
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

async function waitForSongComparison(page) {
  await expect(page.locator('#comparison-screen')).toHaveClass(/active/, { timeout: 15000 });
  await page.waitForFunction(() => window.kanyeApp?.mode === 'songs', null, { timeout: 15000 });
  await expect(page.locator('#song-title-a')).not.toBeEmpty();
}

async function startAlbumMode(page) {
  await page.goto('/');
  await waitForAppReady(page);
  await page.locator('#start-album-mode').click();
  await waitForAlbumComparison(page);
}

// I'm Done in album mode opens the album results page
async function showAlbumResults(page) {
  const btn = page.locator('#show-results');
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });
}

async function showSongResults(page) {
  const btn = page.locator('#show-results');
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
}

async function skipReveal(page) {
  const skip = page.locator('#tier-skip-reveal');
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator('#tier-board')).toHaveAttribute('data-revealing', 'false', { timeout: 5000 });
}

async function openAlbumTierList(page) {
  await page.locator('#open-album-tier-list').click();
  await expect(page.locator('#tier-list-screen')).toHaveClass(/active/, { timeout: 5000 });
  await skipReveal(page);
}

async function rankAlbumsToResults(page, picks = 15) {
  await startAlbumMode(page);
  await makeComparisons(page, picks);
  await showAlbumResults(page);
}

const row = (page, tier) => page.locator(`.tier-row[data-tier="${tier}"]`);
const rowTiles = (page, tier) => row(page, tier).locator('.tier-tile');
const milestoneLabels = page => page.locator('.milestone .milestone-number').allTextContents();
const albumsDone = page => page.evaluate(() => window.kanyeApp.albumRanker.completed());
const songsDone = page => page.evaluate(() => window.kanyeApp.elo.getCompletedComparisons());
const albumRankingTitles = page => page.locator('#album-ranking .result-title').allTextContents();
const modeTab = (page, screen, mode) => page.locator(`#${screen} .mode-tab[data-mode="${mode}"]`);

async function rankedTileCount(page) {
  let total = 0;
  for (const tier of RANKED_TIERS) total += await rowTiles(page, tier).count();
  return total;
}

// Moves the first tile of one tier to another with the move bar; returns the moved id
async function moveFirstTile(page, from, to) {
  const tile = rowTiles(page, from).first();
  const id = await tile.getAttribute('data-id');
  await tile.click();
  await page.locator(`.tier-move-btn[data-tier="${to}"]`).click();
  await expect(row(page, to).locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
  return id;
}

// The tier board as shown: tier -> tile ids
function boardOnScreen(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#tier-board .tier-row')]
    .map(r => [r.dataset.tier, [...r.querySelectorAll('.tier-tile')].map(t => t.dataset.id)])));
}

// Checks the Songs / Albums switch on a results screen: which tab is current and each tab's status line
async function expectModeSwitch(page, screen, current, status) {
  for (const mode of ['songs', 'albums']) {
    const tab = modeTab(page, screen, mode);
    await expect(tab).toHaveAttribute('aria-selected', String(mode === current));
    await expect(tab.locator('.mode-tab-status')).toHaveText(status[mode]);
  }
}

// The card caption: top 3 songs by streams, then "+N more" (non-breaking space) for the rest of the album
function expectCaption(albumId, caption) {
  const albumSongs = SONGS.filter(song => song.albumId === albumId);
  const match = caption.match(/^(.+) · (.+) · (.+) \+(\d+) more$/);
  expect(match, `caption for ${albumId}: "${caption}"`).not.toBeNull();
  if (!match) return;
  const shown = match.slice(1, 4);
  expect(Number(match[4])).toBe(albumSongs.length - 3);
  expect(new Set(shown).size).toBe(3);

  const display = song => CENSORED[song.title] || song.title;
  const shownSongs = shown.map(title => albumSongs.find(song => display(song) === title));
  expect(shownSongs.every(Boolean), `"${caption}" lists songs from ${albumId}`).toBe(true);
  const minShown = Math.min(...shownSongs.map(song => song.spotifyStreams || 0));
  const others = albumSongs.filter(song => !shownSongs.includes(song));
  expect(others.every(song => (song.spotifyStreams || 0) <= minShown), `"${caption}" lists the top 3 by streams`).toBe(true);
}

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
      await expect(page.locator(`#album-name-${side}`)).not.toBeEmpty();
      await expect(page.locator(`#year-${side}`)).toHaveText(/^\(\d{4}\)$/);
      await expect(page.locator(`#clip-label-${side}`)).toContainText(' · ');
      await expect(page.locator(`#song-${side} .song-actions`)).toBeHidden();
    }
    await expect(page.locator('#song-request-btn')).toBeHidden();

    expect(await milestoneLabels(page)).toEqual(['Start', '15', '30', '50+']);
    await expect(page.locator('#progress-message')).toContainText('album ranking');
    await expect(page.locator('#show-results .btn-text')).toHaveText("I'm Done - Show Results");
    await expect(page.locator('#show-results')).toBeDisabled();
  });

  test('?mode=albums link starts album mode directly', async ({ page }) => {
    await page.goto('/?mode=albums');
    await waitForAlbumComparison(page);

    await expect(page.locator('#landing-screen')).not.toHaveClass(/active/);
    await expect(page.locator('body')).toHaveClass(/album-mode/);
    const [idA] = await page.evaluate(() => window.kanyeApp.albumRanker.current());
    await expect(page.locator('#song-title-a')).toHaveText(SHORT_NAMES[idA] || ALBUMS_BY_ID.get(idA).name);
    expect(await milestoneLabels(page)).toEqual(['Start', '15', '30', '50+']);
  });

  test('all 17 albums appear within the first 9 picks with their title and top-songs caption', async ({ page }) => {
    await startAlbumMode(page);

    const seen = new Set();
    for (let i = 0; i < 9; i++) {
      const pair = await page.evaluate(() => window.kanyeApp.albumRanker.current());
      for (const [side, id] of [['a', pair[0]], ['b', pair[1]]]) {
        // MBDTF is shortened on the card; every other album shows its full name
        await expect(page.locator(`#song-title-${side}`)).toHaveText(SHORT_NAMES[id] || ALBUMS_BY_ID.get(id).name);
        expectCaption(id, await page.locator(`#clip-label-${side}`).textContent() || '');
        seen.add(id);
      }
      await makeComparisons(page, 1);
    }
    expect([...seen].sort()).toEqual(ALBUMS.map(album => album.id).sort());
    expect(seen.has('mbdtf')).toBe(true);
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
// Album results page
// ============================================================
test.describe('Album results', () => {
  test("I'm Done at 15 opens the album ranking with all 17 albums", async ({ page }) => {
    await rankAlbumsToResults(page);

    await expect(page.locator('#tier-list-screen')).not.toHaveClass(/active/);
    await expect(page.locator('#album-results-header')).toHaveText('Your Album Ranking');
    await expect(page.locator('#album-results-subtitle')).toHaveText('All 17 albums, ranked from your 15 head-to-head picks');
    await expect(page.locator('#open-album-tier-list')).toContainText('Reveal your tier list');
    await expect(page.locator('.album-results-actions #album-keep-ranking')).toBeVisible();
    await expect(page.locator('.album-results-actions #album-restart')).toBeVisible();
    await expectModeSwitch(page, 'album-results-screen', 'albums', { songs: 'Rank songs', albums: 'All 17 ranked' });

    const rows = page.locator('#album-ranking .result-item');
    await expect(rows).toHaveCount(17);
    const titles = await albumRankingTitles(page);
    expect([...titles].sort()).toEqual([...ALBUM_NAMES].sort());

    // Rows follow the head-to-head ratings, highest first
    const expected = await page.evaluate(() => window.kanyeApp.albumRanker.items()
      .map(({ id, score }) => ({ id, score }))
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
      .map(({ id }) => window.kanyeApp.albums.get(id).name));
    expect(titles).toEqual(expected);

    for (let i = 0; i < 17; i++) {
      const item = rows.nth(i);
      const album = ALBUMS.find(a => a.name === titles[i]);
      await expect(item.locator('.result-rank')).toHaveText(`#${i + 1}`);
      await expect(item.locator('.result-album-art')).toHaveAttribute('src', `assets/album-covers/${album?.coverArt}`);
      await expect(item.locator('.result-album')).toHaveText(new RegExp(`^.+ · ${album?.year}$`));
    }
  });

  test('tier list from album results shows albums only and Back returns to the ranking', async ({ page }) => {
    await rankAlbumsToResults(page);
    await openAlbumTierList(page);

    await expect(page.locator('.tier-tabs')).toBeHidden();
    await expect(page.locator('.tier-title')).toHaveText('Your Album Tier List');
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'albums');
    await expect(page.locator('#tier-back')).toHaveText('← Results');
    await expect(page.locator('#tier-rank-songs')).toHaveCount(0);
    await expect(page.locator('#tier-summary')).toContainText('15 head-to-head picks');

    expect(await rankedTileCount(page)).toBe(17);
    expect(await rowTiles(page, 'S').count()).toBeGreaterThan(0);
    await expect(rowTiles(page, 'unranked')).toHaveCount(0);

    await page.locator('#tier-back').click();
    await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#album-ranking .result-item')).toHaveCount(17);
  });

  test('Keep ranking albums keeps the count and a tier move', async ({ page }) => {
    await rankAlbumsToResults(page);
    await openAlbumTierList(page);
    const id = await moveFirstTile(page, 'S', 'D');
    await page.locator('#tier-back').click();
    await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });

    await page.locator('#album-keep-ranking').click();
    await waitForAlbumComparison(page);
    await expect(page.locator('#current-comparison')).toHaveText('15');
    expect(await albumsDone(page)).toBe(15);
    await expect(page.locator('#show-results')).toBeEnabled();

    await makeComparisons(page, 1);
    await showAlbumResults(page);
    await expect(page.locator('#album-results-subtitle')).toHaveText('All 17 albums, ranked from your 16 head-to-head picks');
    await openAlbumTierList(page);
    await expect(page.locator('#tier-summary')).toContainText('16 head-to-head picks');
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
  });

  test('share image downloads an albums PNG on desktop', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo.project.name), 'Mobile projects use Web Share');
    await rankAlbumsToResults(page);
    await openAlbumTierList(page);

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
// Songs and albums side by side
// ============================================================
test.describe('Album and song sessions', () => {
  test('Songs tab from album results starts a song session and keeps the album picks', async ({ page }) => {
    await page.goto('/?mode=albums');
    await waitForAlbumComparison(page);
    await makeComparisons(page, 15);
    await showAlbumResults(page);

    await modeTab(page, 'album-results-screen', 'songs').click();
    await waitForSongComparison(page);
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    await expect(page.locator('#preview-a')).toBeVisible();
    expect(await milestoneLabels(page)).toEqual(['Start', '20', '50', '100+']);
    await expect(page.locator('#show-results .btn-text')).toHaveText("I'm Done - Show Results");
    await expect(page.locator('#show-results')).toBeDisabled();
    await expect(page.locator('#current-comparison')).toHaveText('0');
    await expect(page.locator('#back-button')).not.toHaveClass(/visible/);
    expect(new URL(page.url()).searchParams.has('mode')).toBe(false);
    expect(await albumsDone(page)).toBe(15);

    // Undo in song mode only rewinds song picks
    await makeComparisons(page, 2);
    await expect(page.locator('#current-comparison')).toHaveText('2');
    await page.locator('#back-button').click();
    await expect(page.locator('#current-comparison')).toHaveText('1');
    expect(await songsDone(page)).toBe(1);
    expect(await albumsDone(page)).toBe(15);
  });

  test('both sessions coexist: switch, separate undo and tier pins, then Start Over clears both', async ({ page }) => {
    test.slow();
    const narrow = (page.viewportSize()?.width || 1280) <= 768;
    const back = page.locator('#back-button');

    // Song results first, with no album session yet
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await waitForSongComparison(page);
    await makeComparisons(page, 20);
    await showSongResults(page);
    await expectModeSwitch(page, 'results-screen', 'songs', { songs: 'Your Top 10', albums: 'Head to head' });

    // Albums tab starts album mode with its own counter and an empty undo history
    await modeTab(page, 'results-screen', 'albums').click();
    await waitForAlbumComparison(page);
    await expect(page.locator('body')).toHaveClass(/album-mode/);
    expect(await milestoneLabels(page)).toEqual(['Start', '15', '30', '50+']);
    await expect(page.locator('#current-comparison')).toHaveText('0');
    await expect(back).not.toHaveClass(/visible/);

    // Undo in album mode only rewinds album picks, never into the song session
    await makeComparisons(page, 3);
    await back.click();
    await expect(page.locator('#current-comparison')).toHaveText('2');
    await back.click();
    await expect(page.locator('#current-comparison')).toHaveText('1');
    if (!narrow) {
      await back.click();
      await expect(page.locator('#current-comparison')).toHaveText('0');
    }
    await expect(back).not.toHaveClass(/visible/);
    expect(await songsDone(page)).toBe(20);

    await makeComparisons(page, 15 - await albumsDone(page));
    await showAlbumResults(page);
    await expectModeSwitch(page, 'album-results-screen', 'albums', { songs: 'Your Top 10', albums: 'All 17 ranked' });
    const albumOrder = await albumRankingTitles(page);

    await openAlbumTierList(page);
    const movedId = await moveFirstTile(page, 'S', 'D');
    await page.locator('#tier-back').click();
    await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });

    // Songs tab goes straight to song results (20+ picks)
    await modeTab(page, 'album-results-screen', 'songs').click();
    await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
    expect(await page.evaluate(() => window.kanyeApp.mode)).toBe('songs');
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    await expectModeSwitch(page, 'results-screen', 'songs', { songs: 'Your Top 10', albums: 'All 17 ranked' });

    // The song tier list's Albums tab has no album-mode pins
    await page.locator('#open-tier-list').click();
    await expect(page.locator('#tier-list-screen')).toHaveClass(/active/, { timeout: 5000 });
    await skipReveal(page);
    await expect(page.locator('.tier-tabs')).toBeVisible();
    await expect(page.locator('.tier-title')).toHaveText('Your Tier List');
    await page.locator('.tier-tab[data-kind="albums"]').click();
    await skipReveal(page);
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'albums');
    const unpinned = await page.evaluate(() => new window.TierListCore().build('albums', window.kanyeApp.getTierListItems('albums')));
    expect(await boardOnScreen(page)).toEqual(unpinned);
    expect(await page.evaluate(() => window.kanyeApp.tierList.pins.albums.size)).toBe(0);
    await page.locator('#tier-back').click();
    await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });

    // Undo in song mode only rewinds song picks
    await page.locator('#continue-ranking').click();
    await waitForSongComparison(page);
    await back.click();
    await expect(page.locator('#current-comparison')).toHaveText('19');
    expect(await songsDone(page)).toBe(19);
    expect(await albumsDone(page)).toBe(15);
    await makeComparisons(page, 1);
    await showSongResults(page);

    // Back to albums: same ranking, same tier move
    await modeTab(page, 'results-screen', 'albums').click();
    await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });
    expect(await albumRankingTitles(page)).toEqual(albumOrder);
    await expect(page.locator('#album-results-subtitle')).toHaveText('All 17 albums, ranked from your 15 head-to-head picks');
    await openAlbumTierList(page);
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${movedId}"]`)).toHaveCount(1);
    await page.locator('#tier-back').click();
    await expect(page.locator('#album-results-screen')).toHaveClass(/active/, { timeout: 5000 });

    // Start Over clears both sessions
    await page.locator('#album-restart').click();
    await expect(page.locator('#landing-screen')).toHaveClass(/active/, { timeout: 5000 });
    const state = await page.evaluate(() => ({
      mode: window.kanyeApp.mode,
      albumRanker: window.kanyeApp.albumRanker,
      songs: window.kanyeApp.elo.getCompletedComparisons()
    }));
    expect(state).toEqual({ mode: 'songs', albumRanker: null, songs: 0 });
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    expect(await milestoneLabels(page)).toEqual(['Start', '20', '50', '100+']);

    await page.locator('#start-album-mode').click();
    await waitForAlbumComparison(page);
    await expect(page.locator('#current-comparison')).toHaveText('0');
    await expect(back).not.toHaveClass(/visible/);
    expect(await albumsDone(page)).toBe(0);
  });

  test('restart exits album mode', async ({ page }) => {
    await startAlbumMode(page);
    await makeComparisons(page, 2);

    await page.evaluate(() => window.kanyeApp.restart());
    expect(await page.evaluate(() => window.kanyeApp.mode)).toBe('songs');
    expect(await page.evaluate(() => window.kanyeApp.albumRanker)).toBeNull();
    await expect(page.locator('body')).not.toHaveClass(/album-mode/);
    expect(await milestoneLabels(page)).toEqual(['Start', '20', '50', '100+']);
  });
});

// ============================================================
// Layout
// ============================================================
test.describe('Album mode layout', () => {
  // The button sits bottom right of the globe stage, beside the scene label (which drops its "On the dome" prefix on phones)
  test('at 390px the album button sits in the stage beside the scene label without covering the globe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForAppReady(page);

    const problems = await page.evaluate(() => {
      const box = el => el.getBoundingClientRect();
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      // Longest scene name the dome can show
      document.getElementById('globe-scene').textContent = 'College Dropout';
      const btn = box(document.getElementById('start-album-mode'));
      const stage = box(document.getElementById('globe-stage'));
      const found = [];
      if (btn.height < 44) found.push(`button is ${btn.height}px tall`);
      if (btn.left < stage.left || btn.right > stage.right || btn.top < stage.top || btn.bottom > stage.bottom) found.push('button leaves the stage');
      if (overlaps(btn, box(document.querySelector('.globe-meta > span')))) found.push('button covers the scene label');
      if (overlaps(btn, box(document.getElementById('globe-dome')))) found.push('button covers the globe');
      return found;
    });
    expect(problems).toEqual([]);
  });

  test('at 390px nothing scrolls sideways on landing, album comparison, album results or album tier list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForAppReady(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.locator('#start-album-mode').click();
    await waitForAlbumComparison(page);
    await cardsSettled(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await makeComparisons(page, 15);
    await showAlbumResults(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await openAlbumTierList(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
