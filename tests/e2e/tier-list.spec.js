// @ts-check
const { test, expect } = require('./fixtures');

/**
 * E2E tests for the tier list screen: entry from results, the D-to-S reveal,
 * Songs/Albums tabs, tap-to-move, edits surviving Continue Ranking, restart,
 * image export, tap targets and reduced motion.
 */

const RANKED_TIERS = ['S', 'A', 'B', 'C', 'D'];
const isMobileProject = name => /Mobile|Android|iPad/.test(name);

async function waitForAppReady(page) {
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-ranking').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

async function makeComparisons(page, count) {
  for (let i = 0; i < count; i++) {
    const albumArt = page.locator('#song-a .album-art');
    await albumArt.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
    await albumArt.click();
    await page.waitForTimeout(350);
  }
}

async function showResults(page) {
  const btn = page.locator('#show-results');
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
}

async function rankToResults(page, comparisons = 20) {
  await page.goto('/');
  await waitForAppReady(page);
  await page.locator('#start-ranking').click();
  await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
  await makeComparisons(page, comparisons);
  await showResults(page);
}

async function openTierList(page) {
  await page.locator('#open-tier-list').click();
  await expect(page.locator('#tier-list-screen')).toHaveClass(/active/, { timeout: 5000 });
}

async function skipReveal(page) {
  const board = page.locator('#tier-board');
  const skip = page.locator('#tier-skip-reveal');
  if (await skip.isVisible()) await skip.click();
  await expect(board).toHaveAttribute('data-revealing', 'false', { timeout: 5000 });
}

const row = (page, tier) => page.locator(`.tier-row[data-tier="${tier}"]`);
const rowTiles = (page, tier) => row(page, tier).locator('.tier-tile');

// Last ranked row with tiles, searching D upward
async function lowestFilledTier(page) {
  for (const tier of [...RANKED_TIERS].reverse()) {
    if (await rowTiles(page, tier).count() > 0) return tier;
  }
  throw new Error('No ranked tiles on the board');
}

async function rankedTileCount(page) {
  let total = 0;
  for (const tier of RANKED_TIERS) total += await rowTiles(page, tier).count();
  return total;
}

// ============================================================
// Entry and reveal
// ============================================================
test.describe('Tier list entry and reveal', () => {
  test('open button sits in the first viewport of results and opens the screen', async ({ page }) => {
    await rankToResults(page);
    const open = page.locator('#open-tier-list');
    await expect(open).toBeVisible();

    const { top, viewport } = await page.evaluate(() => {
      const r = document.getElementById('open-tier-list').getBoundingClientRect();
      return { top: r.top + window.scrollY, viewport: window.innerHeight };
    });
    expect(top).toBeLessThan(viewport);

    await openTierList(page);
    await expect(page.locator('#results-screen')).toBeHidden();
  });

  test('reveal runs, then every tile is revealed and skip disappears', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);

    const board = page.locator('#tier-board');
    await expect(board).toHaveAttribute('data-revealing', 'true');
    await expect(page.locator('#tier-skip-reveal')).toBeVisible();

    await expect(board).toHaveAttribute('data-revealing', 'false', { timeout: 15000 });
    await expect(page.locator('#tier-skip-reveal')).toBeHidden();

    const tiles = page.locator('#tier-board .tier-tile');
    const total = await tiles.count();
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('#tier-board .tier-tile.is-revealed')).toHaveCount(total);
  });

  test('replay restarts the reveal', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    await page.locator('#tier-replay').click();
    await expect(page.locator('#tier-board')).toHaveAttribute('data-revealing', 'true');
    await skipReveal(page);
  });

  test('reduced motion skips the reveal', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await rankToResults(page);
    await openTierList(page);

    await expect(page.locator('#tier-board')).toHaveAttribute('data-revealing', 'false', { timeout: 1000 });
    const total = await page.locator('#tier-board .tier-tile').count();
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('#tier-board .tier-tile.is-revealed')).toHaveCount(total);
  });
});

// ============================================================
// Boards
// ============================================================
test.describe('Tier list boards', () => {
  test('songs board holds exactly the compared songs', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    await expect(page.locator('.tier-tab[data-kind="songs"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'songs');

    const compared = await page.evaluate(() => window.kanyeApp.getTierListItems('songs').length);
    expect(compared).toBeGreaterThan(0);
    expect(await rankedTileCount(page)).toBe(compared);
    expect(await rowTiles(page, 'S').count()).toBeGreaterThan(0);
    await expect(rowTiles(page, 'unranked')).toHaveCount(0);
    await expect(page.locator('#tier-summary')).toContainText(String(compared));
  });

  test('albums tab shows all 17 albums', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    await page.locator('.tier-tab[data-kind="albums"]').click();
    await expect(page.locator('.tier-tab[data-kind="albums"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.tier-tab[data-kind="songs"]')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#tier-board')).toHaveAttribute('data-kind', 'albums');
    await skipReveal(page);

    await expect(page.locator('#tier-board .tier-tile')).toHaveCount(17);
  });
});

// ============================================================
// Moving tiles
// ============================================================
test.describe('Tier list moves', () => {
  test('move bar moves a tile to S', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    const from = await lowestFilledTier(page);
    const tile = rowTiles(page, from).first();
    const id = await tile.getAttribute('data-id');

    await tile.click();
    await expect(tile).toHaveClass(/is-selected/);
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tier-move-bar')).toBeVisible();

    await page.locator('.tier-move-btn[data-tier="S"]').click();

    await expect(row(page, 'S').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
    await expect(page.locator('#tier-move-bar')).toBeHidden();
    await expect(page.locator('.tier-tile.is-selected')).toHaveCount(0);
  });

  test('tapping a tier label moves the selected tile there', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    const tile = rowTiles(page, 'S').first();
    const id = await tile.getAttribute('data-id');
    await tile.click();
    await row(page, 'A').locator('.tier-label').click();

    await expect(row(page, 'A').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
    await expect(row(page, 'S').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(0);
    await expect(page.locator('#tier-move-bar')).toBeHidden();
  });

  test('Escape cancels a selection', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    await rowTiles(page, 'S').first().click();
    await expect(page.locator('#tier-move-bar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tier-move-bar')).toBeHidden();
    await expect(page.locator('.tier-tile.is-selected')).toHaveCount(0);
  });

  test('edits survive Continue Ranking', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    const tile = rowTiles(page, 'S').first();
    const id = await tile.getAttribute('data-id');
    await tile.click();
    await page.locator('.tier-move-btn[data-tier="D"]').click();
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);

    await page.locator('#tier-back').click();
    await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#continue-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await makeComparisons(page, 3);
    await showResults(page);

    await openTierList(page);
    await skipReveal(page);
    await expect(row(page, 'D').locator(`.tier-tile[data-id="${id}"]`)).toHaveCount(1);
  });

  test('restart clears edits', async ({ page }) => {
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    await rowTiles(page, 'S').first().click();
    await page.locator('.tier-move-btn[data-tier="D"]').click();
    expect(await page.evaluate(() => window.kanyeApp.tierList.hasEdits('songs'))).toBe(true);

    await page.locator('#tier-back').click();
    await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#restart').click();
    await expect(page.locator('#landing-screen')).toHaveClass(/active/, { timeout: 5000 });
    expect(await page.evaluate(() => window.kanyeApp.tierList.hasEdits('songs'))).toBe(false);

    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await makeComparisons(page, 20);
    await showResults(page);
    expect(await page.evaluate(() => window.kanyeApp.tierList.hasEdits('songs'))).toBe(false);
  });
});

// ============================================================
// Export and layout
// ============================================================
test.describe('Tier list export and layout', () => {
  test('share image downloads a songs PNG on desktop', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo.project.name), 'Mobile projects use Web Share');
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    const share = page.locator('#tier-share-image');
    await expect(share).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      share.click()
    ]);
    expect(download.suggestedFilename()).toMatch(/kanye-tier-list-songs.*\.png/);
  });

  test('tap targets are at least 44px and nothing scrolls sideways at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await rankToResults(page);
    await openTierList(page);
    await skipReveal(page);

    // Open the move bar so its buttons are measured too
    await rowTiles(page, 'S').first().click();
    await expect(page.locator('#tier-move-bar')).toBeVisible();

    const tooSmall = await page.evaluate(() => {
      const selector = '.tier-tile, .tier-move-btn, .tier-tab, #tier-back, #tier-share-image';
      return Array.from(document.querySelectorAll(selector))
        .filter(el => {
          const style = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        })
        .map(el => {
          const r = el.getBoundingClientRect();
          return { id: el.id || el.dataset.id || el.dataset.tier || el.dataset.kind || el.className, w: r.width, h: r.height };
        })
        .filter(({ w, h }) => w < 44 || h < 44);
    });
    expect(tooSmall).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
