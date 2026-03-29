// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Button regression tests — PRIORITY per TESTING_GUIDE.md
 *
 * The app has had recurring issues with buttons breaking.
 * These tests ensure every user-facing button works correctly.
 */

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
 * Helper: navigate to the comparison screen and wait for the first pair to load.
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
 * Helper: rapidly click through N comparisons by clicking song card A.
 * The .btn-choose buttons are hidden via CSS; the entire .song-card is clickable.
 */
async function makeComparisons(page, count) {
  for (let i = 0; i < count; i++) {
    const albumArt = page.locator('#song-a .album-art');
    await albumArt.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
    await albumArt.click();
    await page.waitForTimeout(350);
  }
}

// ============================================================
// Start Button
// ============================================================
test.describe('Start button', () => {
  test('is clickable on page load', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const startBtn = page.locator('#start-ranking');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Verify it's not obscured and is interactable
    const box = await startBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('actually transitions to comparison screen', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.locator('#start-ranking').click();

    // Comparison screen appears
    await expect(page.locator('#comparison-screen')).toBeVisible({ timeout: 5000 });
    // Landing screen is gone
    await expect(page.locator('#landing-screen')).not.toBeVisible();
    // Song cards are populated
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );
  });

  test('works on mobile viewport too', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForAppReady(page);

    const startBtn = page.locator('#start-ranking');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    await startBtn.click();
    await expect(page.locator('#comparison-screen')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// Song Card Click (Choose Mechanism)
// ============================================================
// Note: The .btn-choose buttons are hidden via CSS (ui-clarity.css uses display:none).
// Instead, the entire .song-card element is clickable. These tests verify that mechanism.
test.describe('Song card click (choose mechanism)', () => {
  test('both song cards are visible and clickable', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const cardA = page.locator('#song-a');
    const cardB = page.locator('#song-b');

    await expect(cardA).toBeVisible();
    await expect(cardB).toBeVisible();

    // Verify cards have non-zero dimensions
    const boxA = await cardA.boundingBox();
    const boxB = await cardB.boundingBox();
    expect(boxA.width).toBeGreaterThan(0);
    expect(boxA.height).toBeGreaterThan(0);
    expect(boxB.width).toBeGreaterThan(0);
    expect(boxB.height).toBeGreaterThan(0);

    // Verify cursor:pointer (clickable indicator)
    const cursorA = await cardA.evaluate(el => getComputedStyle(el).cursor);
    const cursorB = await cardB.evaluate(el => getComputedStyle(el).cursor);
    expect(cursorA).toBe('pointer');
    expect(cursorB).toBe('pointer');
  });

  test('clicking card A processes the choice and updates the screen', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const counterBefore = await page.locator('#current-comparison').textContent();

    // Click on album art inside card A (avoids links/preview buttons)
    await page.locator('#song-a .album-art').click();
    await page.waitForTimeout(500);

    const counterAfter = await page.locator('#current-comparison').textContent();
    expect(parseInt(counterAfter)).toBeGreaterThan(parseInt(counterBefore));
  });

  test('clicking card B processes the choice and updates the screen', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const counterBefore = await page.locator('#current-comparison').textContent();

    await page.locator('#song-b .album-art').click();
    await page.waitForTimeout(500);

    const counterAfter = await page.locator('#current-comparison').textContent();
    expect(parseInt(counterAfter)).toBeGreaterThan(parseInt(counterBefore));
  });

  test('app is ready for next input after processing a choice', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    await page.locator('#song-a .album-art').click();
    // Wait for processing to finish
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });

    // Song cards should still be visible and ready for the next click
    await expect(page.locator('#song-a')).toBeVisible();
    await expect(page.locator('#song-b')).toBeVisible();
  });

  test('double-click protection: rapid clicks only register once', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const counterBefore = await page.locator('#current-comparison').textContent();

    // Rapidly click the card twice
    await page.locator('#song-a .album-art').click();
    await page.locator('#song-a .album-art').click();

    // Check that isProcessingChoice was set (double-click guard)
    const isProcessing = await page.evaluate(() => window.kanyeApp?.isProcessingChoice);
    // isProcessing may be true or may have already resolved, either is fine

    // Wait for processing to finish
    await page.waitForTimeout(600);

    // Counter should have incremented by exactly 1 (second click was ignored)
    const counterAfter = await page.locator('#current-comparison').textContent();
    expect(parseInt(counterAfter)).toBe(parseInt(counterBefore) + 1);
  });
});

// ============================================================
// Show Results Button
// ============================================================
test.describe('Show Results button', () => {
  test('is disabled initially before sufficient comparisons', async ({ page }) => {
    await page.goto('/');
    await goToComparison(page);

    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeVisible();
    await expect(showResultsBtn).toBeDisabled();
    await expect(showResultsBtn).toHaveClass(/btn-locked/);
  });

  test('is enabled after 20 comparisons', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await goToComparison(page);

    // Make 20 comparisons (the UI unlock threshold)
    await makeComparisons(page, 20);

    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeEnabled({ timeout: 5000 });
    await expect(showResultsBtn).not.toHaveClass(/btn-locked/);
  });

  test('clicking navigates to results screen', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await goToComparison(page);

    await makeComparisons(page, 22);

    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeEnabled({ timeout: 5000 });
    await showResultsBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('#results-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#comparison-screen')).not.toBeVisible();
  });
});

// ============================================================
// Restart Button
// ============================================================
test.describe('Restart button', () => {
  test('is visible on results screen', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await goToComparison(page);
    await makeComparisons(page, 22);

    await page.locator('#show-results').click();
    await page.locator('#results-screen').waitFor({ state: 'visible', timeout: 5000 });

    const restartBtn = page.locator('#restart');
    await expect(restartBtn).toBeVisible();
    await expect(restartBtn).toBeEnabled();
  });

  test('returns to landing screen', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await goToComparison(page);
    await makeComparisons(page, 22);

    await page.locator('#show-results').click();
    await page.locator('#results-screen').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#restart').click();
    await page.waitForTimeout(500);

    // Landing screen should be visible again
    await expect(page.locator('#landing-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#results-screen')).not.toBeVisible();
  });

  test('can start a new ranking session after restart', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/');
    await goToComparison(page);
    await makeComparisons(page, 22);

    // Go to results and restart
    await page.locator('#show-results').click();
    await page.locator('#results-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#restart').click();
    await page.locator('#landing-screen').waitFor({ state: 'visible', timeout: 5000 });

    // Start a new session
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Counter should be reset to 0
    await expect(page.locator('#current-comparison')).toHaveText('0');

    // Make a comparison to verify the flow works
    await page.locator('#song-a .album-art').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#current-comparison')).toHaveText('1');

    // Show results button should be locked again
    await expect(page.locator('#show-results')).toBeDisabled();
  });
});
