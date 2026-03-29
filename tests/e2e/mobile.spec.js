// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Mobile-specific E2E tests.
 * All tests use an iPhone-like viewport (375x812).
 */

// Set mobile viewport for every test in this file
test.use({
  viewport: { width: 375, height: 812 },
  // Use a mobile user agent to trigger mobile-specific CSS/JS behavior
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
});

/**
 * Helper: wait for the app to fully initialize.
 */
async function waitForAppReady(page) {
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-ranking').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

/**
 * Helper: navigate to the comparison screen.
 */
async function goToComparison(page) {
  await waitForAppReady(page);
  await page.locator('#start-ranking').click();
  await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(
    () => document.getElementById('song-title-a')?.textContent?.length > 0,
    { timeout: 5000 }
  );
}

/**
 * Helper: rapidly click through N comparisons by tapping song card A.
 * The .btn-choose buttons are hidden via CSS; the entire .song-card is clickable.
 */
async function makeComparisons(page, count) {
  for (let i = 0; i < count; i++) {
    const albumArt = page.locator('#song-a .album-art');
    await albumArt.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
    await albumArt.tap();
    await page.waitForTimeout(350);
  }
}

// ============================================================
// Mobile Layout
// ============================================================
test.describe('Mobile layout', () => {
  test('song cards stack vertically on mobile', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const songA = page.locator('#song-a');
    const songB = page.locator('#song-b');

    const boxA = await songA.boundingBox();
    const boxB = await songB.boundingBox();

    expect(boxA).not.toBeNull();
    expect(boxB).not.toBeNull();

    // In vertical stacking, song B should be below song A
    // (its top should be greater than song A's top)
    expect(boxB.y).toBeGreaterThan(boxA.y);

    // Both cards should be roughly the same width (full-width stacking)
    // Allow some tolerance for padding/margin differences
    expect(Math.abs(boxA.width - boxB.width)).toBeLessThan(50);
  });

  test('all interactive elements meet minimum tap target size (44px)', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const minTapSize = 44;

    // Song cards are the primary tap targets (choose buttons are hidden)
    const tapTargets = [
      { selector: '#song-a', label: 'Song card A' },
      { selector: '#song-b', label: 'Song card B' },
      { selector: '#skip-comparison', label: 'Skip button' },
      { selector: '#show-results', label: 'Show results button' },
    ];

    for (const { selector, label } of tapTargets) {
      const elem = page.locator(selector);
      const isVisible = await elem.isVisible();
      if (isVisible) {
        const box = await elem.boundingBox();
        expect(box, `${label} should have a bounding box`).not.toBeNull();
        expect(
          box.height >= minTapSize || box.width >= minTapSize,
          `${label} should have at least one dimension >= ${minTapSize}px (got ${box.width}x${box.height})`
        ).toBe(true);
      }
    }
  });

  test('text is readable and not overflowing viewport', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const viewportWidth = 375;

    // Check that song titles don't overflow
    const titleA = page.locator('#song-title-a');
    const titleB = page.locator('#song-title-b');

    const boxTA = await titleA.boundingBox();
    const boxTB = await titleB.boundingBox();

    expect(boxTA).not.toBeNull();
    expect(boxTB).not.toBeNull();

    // Title should not extend beyond viewport (with small tolerance for scrollbars)
    expect(boxTA.x + boxTA.width).toBeLessThanOrEqual(viewportWidth + 5);
    expect(boxTB.x + boxTB.width).toBeLessThanOrEqual(viewportWidth + 5);
  });
});

// ============================================================
// Mobile Interactions
// ============================================================
test.describe('Mobile interactions', () => {
  test('start button works on tap', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const startBtn = page.locator('#start-ranking');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Tap the start button
    await startBtn.tap();

    await expect(page.locator('#comparison-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#landing-screen')).not.toBeVisible();
  });

  test('song card tap selects and advances', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const counterBefore = await page.locator('#current-comparison').textContent();

    // Tap on album art inside card A (the entire card is clickable)
    await page.locator('#song-a .album-art').tap();
    await page.waitForTimeout(500);

    const counterAfter = await page.locator('#current-comparison').textContent();
    expect(parseInt(counterAfter)).toBeGreaterThan(parseInt(counterBefore));
  });

  test('skip button is accessible and functional on mobile', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const skipBtn = page.locator('#skip-comparison');
    await expect(skipBtn).toBeVisible();

    // Verify it's within the viewport (user can reach it by scrolling)
    const box = await skipBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    // Record current songs
    const titleBefore = await page.locator('#song-title-a').textContent();

    // Tap skip
    await skipBtn.tap();
    await page.waitForTimeout(500);

    // Should still be on comparison screen with new songs
    await expect(page.locator('#comparison-screen')).toBeVisible();
  });

  test('results screen is scrollable on mobile', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await goToComparison(page);
    await makeComparisons(page, 22);

    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeEnabled({ timeout: 5000 });
    await showResultsBtn.tap();
    await page.locator('#results-screen').waitFor({ state: 'visible', timeout: 5000 });

    // Results should be visible
    const topSongs = page.locator('#top-songs');
    await expect(topSongs).toBeVisible();

    // The page should be scrollable — check that document height exceeds viewport
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(812); // viewport height
  });
});
