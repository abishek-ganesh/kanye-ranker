// @ts-check
const base = require('@playwright/test');

// GA4 and Clarity endpoints; tests must never report to the live properties
const ANALYTICS_URL = /^https?:\/\/([^/]+\.)?(googletagmanager\.com|google-analytics\.com|clarity\.ms)\//;

/**
 * Shared test with analytics requests aborted for every page in the context.
 * Specs import { test, expect } from here instead of @playwright/test.
 */
const test = base.test.extend({
  context: async ({ context }, use) => {
    await context.route(ANALYTICS_URL, route => route.abort());
    await use(context);
  },
});

module.exports = { test, expect: base.expect, ANALYTICS_URL };
