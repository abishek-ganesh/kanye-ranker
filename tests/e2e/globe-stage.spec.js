// @ts-check
const { test, expect } = require('./fixtures');

/**
 * Globe stage E2E tests: the landing-screen dome, its tap callout,
 * pausing off-screen, reduced motion, and START still working.
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
 * Helper: wait for the globe's textures to load and its first frame to draw.
 */
async function waitForGlobeReady(page) {
  await page.waitForFunction(() => !!(window.globeStage && window.globeStage.isReady()), { timeout: 15000 });
}

/**
 * Helper: count dome canvas pixels with alpha > 0.
 */
async function domePixelCount(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('globe-dome');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
}

const isRunning = page => page.evaluate(() => window.globeStage.isRunning());

// ============================================================
// Globe stage
// ============================================================
test.describe('Globe stage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('renders the stage and draws the dome', async ({ page }) => {
    await expect(page.locator('#globe-stage')).toBeVisible();
    await expect(page.locator('#globe-dome')).toBeVisible();
    await expect(page.locator('#globe-stage #stage-performer #start-ranking')).toBeVisible();
    await waitForGlobeReady(page);

    await expect.poll(() => domePixelCount(page), { timeout: 5000 }).toBeGreaterThan(1000);
    await expect(page.locator('#globe-scene')).not.toHaveText('');
    const scene = await page.evaluate(() => window.globeStage.currentScene());
    await expect(page.locator('#globe-scene')).toHaveText(scene);
  });

  test('START sits on top of the dome', async ({ page }) => {
    await waitForGlobeReady(page);
    const startBtn = page.locator('#start-ranking');

    await expect.poll(async () => {
      const box = await startBtn.boundingBox();
      const domeTop = await page.evaluate(() => window.globeStage.domeTop());
      return box ? Math.abs(box.y + box.height - domeTop) : Infinity;
    }, { timeout: 5000 }).toBeLessThanOrEqual(8);
  });

  test('tapping the globe shows the callout and tracks globe_tapped', async ({ page }) => {
    await waitForGlobeReady(page);
    await page.evaluate(() => {
      window.__trackCalls = [];
      const original = window.analytics.track.bind(window.analytics);
      window.analytics.track = (name, params) => {
        window.__trackCalls.push({ name, params });
        return original(name, params);
      };
    });

    const dome = page.locator('#globe-dome');
    const box = await dome.boundingBox();
    expect(box).not.toBeNull();
    await dome.click({ position: { x: box.width * 0.5, y: box.height * 0.75 } });

    const callout = page.locator('#globe-callout');
    await expect(callout).toHaveClass(/\bshow\b/);
    await expect(callout).toBeVisible();
    await expect(callout).toContainText('Make the earth move slower');

    await expect.poll(
      () => page.evaluate(() => window.__trackCalls.filter(c => c.name === 'globe_tapped')),
      { timeout: 3000 }
    ).toEqual([expect.objectContaining({ params: expect.objectContaining({ scene: expect.any(String) }) })]);
    const scene = await page.evaluate(
      () => window.__trackCalls.find(c => c.name === 'globe_tapped').params.scene
    );
    expect(scene.trim().length).toBeGreaterThan(0);
  });

  test('stops animating once the landing screen is left', async ({ page }) => {
    await waitForGlobeReady(page);
    const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reduced) await expect.poll(() => isRunning(page), { timeout: 3000 }).toBe(true);

    await page.locator('#start-ranking').click();
    await expect(page.locator('#comparison-screen')).toBeVisible({ timeout: 5000 });
    await expect.poll(() => isRunning(page), { timeout: 3000 }).toBe(false);
  });

  test('START still goes straight to the comparison screen', async ({ page }) => {
    await page.locator('#start-ranking').click();
    await expect(page.locator('#comparison-screen')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('#landing-screen')).not.toBeVisible();
    await page.waitForFunction(
      () => document.getElementById('song-title-a')?.textContent?.length > 0,
      { timeout: 5000 }
    );
  });
});

// ============================================================
// Reduced motion
// ============================================================
test.describe('Globe stage with reduced motion', () => {
  test('renders a still frame without running the loop', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForAppReady(page);
    await waitForGlobeReady(page);

    await expect.poll(() => domePixelCount(page), { timeout: 5000 }).toBeGreaterThan(1000);
    await expect.poll(() => isRunning(page), { timeout: 3000 }).toBe(false);
    await page.waitForTimeout(500);
    expect(await isRunning(page)).toBe(false);
  });
});

// ============================================================
// Phone width
// ============================================================
test.describe('Globe stage at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('causes no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForGlobeReady(page);
    await expect(page.locator('#globe-stage')).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
