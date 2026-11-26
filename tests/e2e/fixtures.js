// @ts-check
const base = require('@playwright/test');

// GA4 and Clarity endpoints; tests must never report to the live properties
const ANALYTICS_URL = /^https?:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com|clarity\.ms)\//;

/**
 * Shared test with analytics requests aborted for every page in the context, and a page clock that
 * runs in real time but can be fast-forwarded (see makeComparisons).
 * Specs import { test, expect } from here instead of @playwright/test.
 */
const test = base.test.extend({
  context: async ({ context }, use) => {
    await context.route(ANALYTICS_URL, route => route.abort());
    await use(context);
  },
  page: async ({ page }, use) => {
    await page.clock.install();
    await use(page);
  },
});

/**
 * Picks the left card `count` times with real clicks (or taps), fast-forwarding the app's
 * 500ms post-choice pause instead of waiting it out, and waits until each next pair is up.
 */
async function makeComparisons(page, count, { tap = false } = {}) {
  const card = page.locator('#song-a .album-art');
  for (let i = 0; i < count; i++) {
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, null, { timeout: 10000 });
    const before = await page.evaluate(() => window.kanyeApp.currentPairIndex);
    await (tap ? card.tap() : card.click());
    await page.clock.runFor(600);
    await page.waitForFunction(
      idx => window.kanyeApp.currentPairIndex > idx && !window.kanyeApp.isProcessingChoice,
      before,
      { timeout: 10000 }
    );
  }
}

module.exports = { test, expect: base.expect, ANALYTICS_URL, makeComparisons };
