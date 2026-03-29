// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Helper: wait for the app to fully initialize.
 * The app uses a 500ms setTimeout on window load before creating KanyeRankerApp,
 * so we wait for the start button to become interactive as the ready signal.
 */
async function waitForAppReady(page) {
  // Wait for the landing screen to be visible and start button to be present
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-ranking').waitFor({ state: 'visible', timeout: 15000 });
  // Wait for the app instance to be available (songs loaded)
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

/**
 * Helper: rapidly click through N comparisons by clicking song card A each time.
 * Note: The .btn-choose buttons are hidden via CSS (ui-clarity.css) and the entire
 * .song-card is clickable instead. We click on the album art image inside the card
 * to avoid accidentally hitting links or preview buttons (which are filtered out
 * by the card click handler).
 */
async function makeComparisons(page, count) {
  for (let i = 0; i < count; i++) {
    const albumArt = page.locator('#song-a .album-art');
    await albumArt.waitFor({ state: 'visible', timeout: 5000 });
    // Wait for the app to be ready for input (not processing a previous choice)
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
    await albumArt.click();
    // Brief pause for the app to process the choice and load next comparison
    await page.waitForTimeout(350);
  }
}

// ============================================================
// Landing Page
// ============================================================
test.describe('Landing page loads', () => {
  test('page title contains Kanye Ranker', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page).toHaveTitle(/Kanye Ranker/i);
  });

  test('start button is visible and enabled', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const startBtn = page.locator('#start-ranking');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
    await expect(startBtn).toContainText('START');
  });

  test('landing screen is visible', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const landing = page.locator('#landing-screen');
    await expect(landing).toBeVisible();
    await expect(landing).toHaveClass(/active/);
  });
});

// ============================================================
// Start Ranking Flow
// ============================================================
test.describe('Start ranking flow', () => {
  test('clicking start transitions to comparison screen', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.locator('#start-ranking').click();

    // Comparison screen should appear (app has ~300ms of setup delays)
    const comparisonScreen = page.locator('#comparison-screen');
    await expect(comparisonScreen).toBeVisible({ timeout: 5000 });

    // Landing screen should be hidden
    const landingScreen = page.locator('#landing-screen');
    await expect(landingScreen).not.toBeVisible();
  });

  test('two song cards are displayed with titles', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();

    // Wait for comparison to load
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    // Wait for song titles to populate
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    const songA = page.locator('#song-a');
    const songB = page.locator('#song-b');
    await expect(songA).toBeVisible();
    await expect(songB).toBeVisible();

    // Titles should be populated with real song names
    const titleA = page.locator('#song-title-a');
    const titleB = page.locator('#song-title-b');
    await expect(titleA).not.toBeEmpty();
    await expect(titleB).not.toBeEmpty();
  });

  test('song cards are clickable (choose mechanism)', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // The .btn-choose buttons are hidden via CSS; the entire song card is clickable
    const cardA = page.locator('#song-a');
    const cardB = page.locator('#song-b');
    await expect(cardA).toBeVisible();
    await expect(cardB).toBeVisible();

    // Verify cards have cursor:pointer (confirming clickability)
    const cursorA = await cardA.evaluate(el => getComputedStyle(el).cursor);
    const cursorB = await cardB.evaluate(el => getComputedStyle(el).cursor);
    expect(cursorA).toBe('pointer');
    expect(cursorB).toBe('pointer');
  });

  test('skip button is visible', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.locator('#skip-comparison')).toBeVisible();
  });

  test('progress counter shows initial value', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });

    // After starting, completed comparisons is 0; the display shows current comparison count
    const counter = page.locator('#current-comparison');
    await expect(counter).toBeVisible();
    // Initial value is "0" (zero completed comparisons)
    await expect(counter).toHaveText('0');
  });
});

// ============================================================
// Making Comparisons
// ============================================================
test.describe('Making comparisons', () => {
  test('clicking a song card loads the next comparison', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Click on the album art inside card A (avoids hitting links/preview buttons)
    await page.locator('#song-a .album-art').click();
    await page.waitForTimeout(500);

    // The comparison screen should still be visible (not results)
    await expect(page.locator('#comparison-screen')).toBeVisible();

    // Counter should show 1 completed comparison
    const counter = page.locator('#current-comparison');
    await expect(counter).toHaveText('1');
  });

  test('progress counter increments with each comparison', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Make 3 comparisons and check counter after each
    for (let expected = 1; expected <= 3; expected++) {
      await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
      await page.locator('#song-a .album-art').click();
      await page.waitForTimeout(400);
      const counter = page.locator('#current-comparison');
      await expect(counter).toHaveText(String(expected));
    }
  });

  test('can make multiple comparisons in sequence', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Make 8 comparisons alternating between card A and card B
    for (let i = 0; i < 8; i++) {
      const cardSelector = i % 2 === 0 ? '#song-a .album-art' : '#song-b .album-art';
      await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
      await page.locator(cardSelector).click();
      await page.waitForTimeout(350);
    }

    // After 8 comparisons, counter should show 8
    await expect(page.locator('#current-comparison')).toHaveText('8');
    // Should still be on comparison screen
    await expect(page.locator('#comparison-screen')).toBeVisible();
  });
});

// ============================================================
// Skip Functionality
// ============================================================
test.describe('Skip functionality', () => {
  test('clicking skip loads the next comparison', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Record current songs
    const titleABefore = await page.locator('#song-title-a').textContent();
    const titleBBefore = await page.locator('#song-title-b').textContent();

    // Skip
    await page.locator('#skip-comparison').click();
    await page.waitForTimeout(500);

    // Should still be on comparison screen
    await expect(page.locator('#comparison-screen')).toBeVisible();

    // At least one song should have changed (new pair loaded)
    const titleAAfter = await page.locator('#song-title-a').textContent();
    const titleBAfter = await page.locator('#song-title-b').textContent();
    const songsChanged =
      titleABefore !== titleAAfter || titleBBefore !== titleBAfter;
    expect(songsChanged).toBe(true);
  });
});

// ============================================================
// Early Exit to Results
// ============================================================
test.describe('Early exit to results', () => {
  test('show results button is locked before 20 comparisons', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeDisabled();
    await expect(showResultsBtn).toHaveClass(/btn-locked/);
  });

  test('show results button unlocks after 20 comparisons and navigates to results', async ({ page }) => {
    test.setTimeout(120_000); // This test makes many comparisons

    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Make 22 comparisons (threshold is 20)
    await makeComparisons(page, 22);

    // Show results button should now be enabled
    const showResultsBtn = page.locator('#show-results');
    await expect(showResultsBtn).toBeEnabled({ timeout: 5000 });
    await expect(showResultsBtn).not.toHaveClass(/btn-locked/);

    // Click to view results
    await showResultsBtn.click();
    await page.waitForTimeout(500);

    // Results screen should appear
    const resultsScreen = page.locator('#results-screen');
    await expect(resultsScreen).toBeVisible({ timeout: 5000 });

    // Top songs list should be populated
    const topSongs = page.locator('#top-songs .result-item');
    await expect(topSongs.first()).toBeVisible({ timeout: 5000 });
    const songCount = await topSongs.count();
    expect(songCount).toBeGreaterThanOrEqual(1);
    expect(songCount).toBeLessThanOrEqual(10);

    // Album rankings should be shown
    const topAlbums = page.locator('#top-albums .result-item');
    await expect(topAlbums.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// Back Button
// ============================================================
test.describe('Back button', () => {
  test('back button appears after making comparisons and reverts on click', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );

    // Make 3 comparisons so back button is visible regardless of viewport
    await makeComparisons(page, 3);

    // Wait for the counter to reflect all 3 completed comparisons
    await expect(page.locator('#current-comparison')).toHaveText('3', { timeout: 5000 });

    // Back button should now be visible
    const backBtn = page.locator('#back-button');
    await expect(backBtn).toBeVisible({ timeout: 5000 });

    // Click back
    await backBtn.click();
    await page.waitForTimeout(600);

    // Counter should have decremented from 3 to 2
    const counterAfter = await page.locator('#current-comparison').textContent();
    const countAfter = parseInt(counterAfter || '0', 10);
    expect(countAfter).toBe(2);

    // Should still be on the comparison screen
    await expect(page.locator('#comparison-screen')).toBeVisible();
  });
});
