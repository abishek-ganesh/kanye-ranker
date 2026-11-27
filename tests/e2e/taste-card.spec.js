// @ts-check
const { test, expect, makeComparisons } = require('./fixtures');

/**
 * E2E tests for the taste card on the song results page: Roast me / Gas me up, the card
 * (archetype, parody lines, real quote, DNA bars), the per-tone cache, regenerate limit,
 * errors, reset on a changed Top 10 or Start Over, sharing and phone layout.
 * /api/taste is always mocked; no test reaches the real endpoint.
 */

const isMobileProject = name => /Mobile|Android|iPad/.test(name);

const ROAST = {
  tone: 'roast',
  archetype: 'Certified Greatest Hits Loyalist',
  lines: [
    "How could you be so heartless? Heartless at #1 and all of Bully at the bottom. You didn't even give Mama's Favorite a chance.",
    'Ten hits out of ten. No deep cuts. I specifically ordered a list with risk in it, and you sent back the radio!!!',
    'Bow in the presence of greatness, and you ranked OK dead last. Run away fast as you can from the new album, huh?'
  ],
  quote: "I hate when I'm on a plane and I wake up with a water bottle next to me like oh great now I gotta be responsible for this water bottle.",
  fallback: false
};

const HYPE = {
  tone: 'hype',
  archetype: 'Late Registration Scholar',
  lines: ['You put Heard Em Say in the top three. That is taste.', 'This list belongs in a museum, next to me.'],
  quote: 'I refuse to accept other people’s ideas of happiness for me.',
  fallback: false
};

// Exactly `length` characters of words, ending in a period
const filled = (length, seed) => `${seed.repeat(Math.ceil(length / seed.length)).slice(0, length - 1)}.`;

// Longest text the endpoint can return, with markup that must stay text
const WORST = {
  tone: 'roast',
  archetype: filled(40, 'Supreme Maximalist Dropout Bear Whisperer '),
  lines: [
    filled(180, '<img src=x onerror="window.tasteXss=1"> You ranked Runaway first and I respect that more than words can say. '),
    filled(180, 'Second line runs all the way out to the limit because the list had that much going on, truly. '),
    filled(180, 'Third line also runs to the limit, and nobody asked it to stop, so it kept going like a ten minute outro. ')
  ],
  quote: filled(280, 'I am so credible and so influential and so relevant that I will change things, and I still think I am the greatest. '),
  fallback: false
};

// Stand-in for js/taste-card-export.js, so sharing is tested without the real canvas drawing
const EXPORT_STUB = `
  window.TasteCardExport = {
    calls: [],
    render(args) {
      this.calls.push(args);
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      return canvas;
    },
    toBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); },
    fileName(card) { return 'kanye-taste-card-' + card.tone + '.png'; }
  };
`;

/**
 * Mocks POST /api/taste. `reply(body, requestNumber)` returns { status, body } or 'abort';
 * the default answers each tone with its sample card. Returns the request bodies seen so far.
 */
async function mockTaste(page, reply = body => ({ status: 200, body: body.tone === 'hype' ? HYPE : ROAST })) {
  const requests = [];
  await page.route('**/api/taste', async route => {
    const body = route.request().postDataJSON();
    requests.push(body);
    const answer = await reply(body, requests.length);
    if (answer === 'abort') return route.abort('failed');
    await route.fulfill({ status: answer.status, contentType: 'application/json', body: JSON.stringify(answer.body) });
  });
  return requests;
}

async function waitForAppReady(page) {
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-ranking').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

async function showResults(page) {
  const btn = page.locator('#show-results');
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.locator('#results-screen')).toHaveClass(/active/, { timeout: 5000 });
  // The share scripts rebuild the action buttons above the section 200-800ms after results show;
  // run those timers now so a click can't land mid-shift
  await page.clock.runFor(1000);
}

async function rankToResults(page, comparisons = 20) {
  await page.goto('/');
  await waitForAppReady(page);
  await page.locator('#start-ranking').click();
  await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
  await makeComparisons(page, comparisons);
  await showResults(page);
  await page.waitForFunction(() => window.tasteCardUI?.state === 'idle', null, { timeout: 5000 });
}

const uiState = page => page.evaluate(() => {
  const ui = window.tasteCardUI;
  return { state: ui.state, tone: ui.tone, hasCard: !!ui.card };
});

const topTenIds = page => page.evaluate(() => window.kanyeApp.getTopSongs(10).map(song => song.id));

async function expectReady(page, tone) {
  await expect(page.locator('#taste-card')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#taste-card-result')).toBeVisible();
  expect(await uiState(page)).toEqual({ state: 'ready', tone, hasCard: true });
}

async function expectIdle(page) {
  await expect(page.locator('#taste-card')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('#taste-card-result')).toBeHidden();
  await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#taste-hype')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#taste-roast')).toBeEnabled();
  expect(await uiState(page)).toEqual({ state: 'idle', tone: null, hasCard: false });
}

// ============================================================
// Rendering
// ============================================================
test.describe('Taste card rendering', () => {
  test('idle section sits between the tier list button and the tracklist bar', async ({ page }) => {
    const requests = await mockTaste(page);
    await rankToResults(page);

    await expect(page.locator('#taste-card')).toBeVisible();
    await expect(page.locator('#taste-roast')).toHaveText(/Roast me/);
    await expect(page.locator('#taste-hype')).toHaveText(/Gas me up/);
    await expectIdle(page);
    await expect(page.locator('#taste-share')).toBeHidden();
    await expect(page.locator('#taste-regenerate')).toBeHidden();
    await expect(page.locator('#taste-error')).toBeHidden();

    const order = await page.evaluate(() => {
      const top = sel => document.querySelector(sel).getBoundingClientRect().top;
      return { tier: top('#open-tier-list'), taste: top('#taste-card'), tracklist: top('.tracklist-bar') };
    });
    expect(order.tier).toBeLessThan(order.taste);
    expect(order.taste).toBeLessThan(order.tracklist);
    expect(requests).toHaveLength(0);
  });

  test('roast shows a loading state, then the full card', async ({ page }) => {
    let release = () => {};
    const held = new Promise(resolve => { release = resolve; });
    await mockTaste(page, async () => {
      await held;
      return { status: 200, body: ROAST };
    });
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expect(page.locator('#taste-card')).toHaveAttribute('data-state', 'loading');
    await expect(page.locator('#taste-loading')).toBeVisible();
    await expect(page.locator('#taste-loading-text')).not.toBeEmpty();
    await expect(page.locator('#taste-roast')).toBeDisabled();
    await expect(page.locator('#taste-hype')).toBeDisabled();
    await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'true');
    expect((await uiState(page)).state).toBe('loading');

    release();
    await expectReady(page, 'roast');
    await expect(page.locator('#taste-loading')).toBeHidden();
    await expect(page.locator('#taste-roast')).toBeEnabled();
    await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#taste-hype')).toHaveAttribute('aria-pressed', 'false');

    const card = page.locator('#taste-card-result');
    await expect(card.locator('.taste-archetype')).toHaveText(ROAST.archetype);
    await expect(card.locator('.taste-line')).toHaveText(ROAST.lines);
    await expect(card.locator('.taste-parody-label')).toHaveText('AI parody of Ye. Not a real quote.');
    await expect(card.locator('.taste-quote')).toContainText('Real Ye quote');
    await expect(card.locator('.taste-quote')).toContainText(ROAST.quote);
    await expect(page.locator('#taste-regenerate')).toBeVisible();
    expect(await page.evaluate(() => window.tasteCardUI.card.archetype)).toBe(ROAST.archetype);
  });

  test('DNA rows match the eras of the Top 10', async ({ page }) => {
    await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    const expected = await page.evaluate(() => {
      const app = window.kanyeApp;
      const years = app.getTopSongs(10).map(song => app.albums.get(song.albumId).year);
      return window.TasteCore.eraBreakdown(years);
    });
    const rows = page.locator('#taste-card-result .taste-dna-row');
    await expect(rows).toHaveCount(expected.length);
    expect(expected.reduce((sum, era) => sum + era.percent, 0)).toBe(100);

    for (const era of expected) {
      const row = page.locator(`.taste-dna-row[data-era="${era.id}"]`);
      await expect(row.locator('.taste-dna-name')).toHaveText(era.name);
      await expect(row.locator('.taste-dna-percent')).toHaveText(`${era.percent}%`);
      expect(await row.locator('.taste-dna-fill').evaluate(el => el.style.width)).toBe(`${era.percent}%`);
    }
  });

  test('hype renders its own card and marks its button', async ({ page }) => {
    await mockTaste(page);
    await rankToResults(page);

    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');
    await expect(page.locator('#taste-hype')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'false');

    const card = page.locator('#taste-card-result');
    await expect(card.locator('.taste-archetype')).toHaveText(HYPE.archetype);
    await expect(card.locator('.taste-line')).toHaveText(HYPE.lines);
    await expect(card.locator('.taste-parody-label')).toHaveText('AI parody of Ye. Not a real quote.');
    await expect(card.locator('.taste-quote')).toContainText(HYPE.quote);
    await expect(card.locator('.taste-dna-row')).toHaveCount(4);
  });

  test('model text is rendered as text, never as markup', async ({ page }) => {
    await mockTaste(page, () => ({ status: 200, body: WORST }));
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    const card = page.locator('#taste-card-result');
    await expect(card.locator('.taste-line').first()).toContainText('<img src=x onerror=');
    await expect(card.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.tasteXss)).toBeUndefined();
  });
});

// ============================================================
// Requests, cache and regenerate
// ============================================================
test.describe('Taste card requests', () => {
  test('request body carries the tone, the 10 shown songs, the miss and bottom picks', async ({ page }) => {
    const requests = await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    expect(requests).toHaveLength(1);
    const body = requests[0];
    const shown = await page.evaluate(() => window.kanyeApp.getTopSongs(11).map(song => song.id));
    expect(Object.keys(body).sort()).toEqual(['bottom', 'missed', 'tone', 'top']);
    expect(body.tone).toBe('roast');
    expect(body.top).toHaveLength(10);
    expect(body.top).toEqual(shown.slice(0, 10));
    expect(body.missed).toBe(shown[10]);

    // Bottom picks: compared songs outside the shown 11, lowest rated first
    const { compared, ratings } = await page.evaluate(() => {
      const app = window.kanyeApp;
      const ids = app.songs.filter(song => app.elo.getComparisonCount(song.id) > 0).map(song => song.id);
      return { compared: ids, ratings: Object.fromEntries(ids.map(id => [id, app.songRatings.get(id)])) };
    });
    expect(body.bottom.length).toBeGreaterThan(0);
    expect(body.bottom.length).toBeLessThanOrEqual(3);
    const lowestOutside = Math.min(...compared.filter(id => !shown.includes(id)).map(id => ratings[id]));
    expect(ratings[body.bottom[0]]).toBe(lowestOutside);
    for (const id of body.bottom) {
      expect(compared).toContain(id);
      expect(shown).not.toContain(id);
    }
  });

  test('switching tones reuses cached cards without another request', async ({ page }) => {
    const requests = await mockTaste(page);
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');
    await expect(page.locator('.taste-archetype')).toHaveText(HYPE.archetype);
    expect(requests.map(body => body.tone)).toEqual(['roast', 'hype']);

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await expect(page.locator('.taste-archetype')).toHaveText(ROAST.archetype);
    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');
    await expect(page.locator('.taste-archetype')).toHaveText(HYPE.archetype);
    expect(requests).toHaveLength(2);
  });

  test('"Another one" fetches a new card, three times at most per tone', async ({ page }) => {
    const requests = await mockTaste(page, (body, n) => ({
      status: 200,
      body: { ...(body.tone === 'hype' ? HYPE : ROAST), archetype: `Take ${n}` }
    }));
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await expect(page.locator('.taste-archetype')).toHaveText('Take 1');

    const regenerate = page.locator('#taste-regenerate');
    await expect(regenerate).toHaveText(/Another one/);
    for (let n = 2; n <= 4; n++) {
      await expect(regenerate).toBeVisible();
      await regenerate.click();
      await expect(page.locator('.taste-archetype')).toHaveText(`Take ${n}`);
      await expectReady(page, 'roast');
    }
    await expect(regenerate).toBeHidden();
    expect(requests).toHaveLength(4);
    expect(requests.every(body => body.tone === 'roast')).toBe(true);

    // The limit is per tone, and the latest roast is what the cache hands back
    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');
    await expect(regenerate).toBeVisible();
    await page.locator('#taste-roast').click();
    await expect(page.locator('.taste-archetype')).toHaveText('Take 4');
    await expect(regenerate).toBeHidden();
    expect(requests).toHaveLength(5);
  });

  test('analytics events carry the tone as event_label', async ({ page }) => {
    await mockTaste(page, (body, n) => (n === 3 ? { status: 500, body: { error: 'upstream' } } : { status: 200, body: { ...ROAST, fallback: n === 2 } }));
    await rankToResults(page);
    await page.evaluate(() => {
      // Analytics is off on localhost, so record what track() is handed instead
      window.tasteEvents = [];
      window.analytics.track = (name, params) => window.tasteEvents.push({ name, ...params });
    });

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await page.locator('#taste-regenerate').click();
    await expect.poll(() => page.evaluate(() => window.tasteEvents.length)).toBe(4);
    await page.locator('#taste-regenerate').click();
    await expect(page.locator('#taste-error')).toBeVisible();

    const events = await page.evaluate(() => window.tasteEvents.map(({ name, event_label, is_regenerate, is_fallback, error_message }) => (
      { name, event_label, is_regenerate, is_fallback, error_message }
    )));
    expect(events).toEqual([
      { name: 'taste_card_requested', event_label: 'roast', is_regenerate: false },
      { name: 'taste_card_generated', event_label: 'roast', is_fallback: false },
      { name: 'taste_card_requested', event_label: 'roast', is_regenerate: true },
      { name: 'taste_card_generated', event_label: 'roast', is_fallback: true },
      { name: 'taste_card_requested', event_label: 'roast', is_regenerate: true },
      { name: 'taste_card_failed', event_label: 'roast', error_message: '500' }
    ]);
  });
});

// ============================================================
// Errors
// ============================================================
test.describe('Taste card errors', () => {
  test('429 asks for a minute, and the next tap works', async ({ page }) => {
    const requests = await mockTaste(page, (body, n) => (n === 1 ? { status: 429, body: { error: 'rate_limited' } } : { status: 200, body: ROAST }));
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    const error = page.locator('#taste-error');
    await expect(error).toHaveText('Ye needs a minute. Try again shortly.');
    await expect(error).toHaveAttribute('role', 'status');
    await expect(page.locator('#taste-card')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#taste-card-result')).toBeHidden();
    await expect(page.locator('#taste-loading')).toBeHidden();
    await expect(page.locator('#taste-roast')).toBeEnabled();
    await expect(page.locator('#taste-hype')).toBeEnabled();
    await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'false');
    expect(await uiState(page)).toEqual({ state: 'error', tone: null, hasCard: false });

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await expect(error).toBeHidden();
    await expect(error).toHaveText('');
    expect(requests).toHaveLength(2);
  });

  test('500 says Ye could not be reached, and the other tone still works', async ({ page }) => {
    await mockTaste(page, body => (body.tone === 'roast' ? { status: 500, body: { error: 'upstream' } } : { status: 200, body: HYPE }));
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expect(page.locator('#taste-error')).toHaveText("Couldn't reach Ye. Try again.");
    await expect(page.locator('#taste-hype')).toBeEnabled();

    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');
    await expect(page.locator('#taste-error')).toBeHidden();
  });

  test('a network failure shows the same message', async ({ page }) => {
    await mockTaste(page, () => 'abort');
    await rankToResults(page);

    await page.locator('#taste-hype').click();
    await expect(page.locator('#taste-error')).toHaveText("Couldn't reach Ye. Try again.");
    await expect(page.locator('#taste-roast')).toBeEnabled();
    expect((await uiState(page)).state).toBe('error');
  });

  test('a request that hangs times out after 25 seconds', async ({ page }) => {
    await page.route('**/api/taste', () => { /* never answered */ });
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expect(page.locator('#taste-loading')).toBeVisible();
    await page.clock.runFor(24000);
    expect((await uiState(page)).state).toBe('loading');
    await page.clock.runFor(2000);

    await expect(page.locator('#taste-error')).toHaveText("Couldn't reach Ye. Try again.");
    await expect(page.locator('#taste-roast')).toBeEnabled();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('a failed "Another one" keeps the card that was showing', async ({ page }) => {
    await mockTaste(page, (body, n) => (n === 1 ? { status: 200, body: ROAST } : { status: 503, body: { error: 'busy' } }));
    await rankToResults(page);

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await page.locator('#taste-regenerate').click();

    await expect(page.locator('#taste-error')).toHaveText("Couldn't reach Ye. Try again.");
    await expect(page.locator('#taste-card-result')).toBeVisible();
    await expect(page.locator('.taste-archetype')).toHaveText(ROAST.archetype);
    await expect(page.locator('#taste-roast')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#taste-regenerate')).toBeVisible();
    expect(await uiState(page)).toEqual({ state: 'error', tone: 'roast', hasCard: true });
  });
});

// ============================================================
// Reset
// ============================================================
test.describe('Taste card reset', () => {
  // Each test ranks twice (up to 45 picks), which can pass 60s on a slow CI runner
  test.slow();

  test('stays when results come back with the same Top 10', async ({ page }) => {
    const requests = await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    await page.locator('#continue-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await showResults(page);

    await expectReady(page, 'roast');
    await expect(page.locator('.taste-archetype')).toHaveText(ROAST.archetype);
    expect(requests).toHaveLength(1);
  });

  test('goes back to idle when Continue Ranking changes the Top 10', async ({ page }) => {
    const requests = await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    const before = await topTenIds(page);

    await page.locator('#continue-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    // Keep picking until the Top 10 is a different list
    for (let i = 0; i < 25 && (await topTenIds(page)).join() === before.join(); i++) {
      await makeComparisons(page, 1);
    }
    expect((await topTenIds(page)).join()).not.toBe(before.join());
    await showResults(page);

    await expectIdle(page);
    await expect(page.locator('#taste-regenerate')).toBeHidden();

    // The new ranking gets its own card
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    expect(requests).toHaveLength(2);
    expect(requests[1].top).toEqual(await topTenIds(page));
  });

  test('Start Over clears the card', async ({ page }) => {
    await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-hype').click();
    await expectReady(page, 'hype');

    await page.locator('#restart').click();
    await expect(page.locator('#landing-screen')).toHaveClass(/active/, { timeout: 5000 });
    expect(await uiState(page)).toEqual({ state: 'idle', tone: null, hasCard: false });
    expect(await page.evaluate(() => window.tasteCardUI.cache.size)).toBe(0);

    await page.locator('#start-ranking').click();
    await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
    await makeComparisons(page, 20);
    await showResults(page);
    await expectIdle(page);
  });
});

// ============================================================
// Sharing and layout
// ============================================================
test.describe('Taste card sharing and layout', () => {
  test('Share card is hidden when the export script is missing', async ({ page }) => {
    await page.route('**/js/taste-card-export.js*', route => route.abort());
    await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    expect(await page.evaluate(() => typeof window.TasteCardExport)).toBe('undefined');
    await expect(page.locator('#taste-share')).toBeHidden();
    await expect(page.locator('#taste-regenerate')).toBeVisible();
  });

  test('Share card downloads the image on desktop', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo.project.name), 'Mobile projects use Web Share');
    await page.route('**/js/taste-card-export.js*', route => route.fulfill({ contentType: 'text/javascript', body: EXPORT_STUB }));
    await mockTaste(page);
    await rankToResults(page);
    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');

    const share = page.locator('#taste-share');
    await expect(share).toBeVisible();
    await expect(share).toHaveText(/Share card/);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      share.click()
    ]);
    expect(download.suggestedFilename()).toBe('kanye-taste-card-roast.png');

    // What the export was handed: the card, the DNA rows and the top 3 songs
    const call = await page.evaluate(() => {
      const [args] = window.TasteCardExport.calls;
      return { calls: window.TasteCardExport.calls.length, card: args.card, eras: args.eras, topSongs: args.topSongs };
    });
    const top3 = await page.evaluate(() => {
      const app = window.kanyeApp;
      return app.getTopSongs(3).map(song => ({
        title: window.KanyeUtils.getCensoredTitle(song.title),
        album: app.albums.get(song.albumId).name
      }));
    });
    expect(call.calls).toBe(1);
    expect(call.card).toEqual(ROAST);
    expect(call.eras.map(era => era.id)).toEqual(['college', 'experimental', 'modern', 'new']);
    expect(call.eras.reduce((sum, era) => sum + era.percent, 0)).toBe(100);
    expect(call.topSongs).toEqual(top3);
    await expect(share).toBeEnabled();
  });

  test('reduced motion turns off the card and loading animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let release = () => {};
    const held = new Promise(resolve => { release = resolve; });
    await mockTaste(page, async () => {
      await held;
      return { status: 200, body: ROAST };
    });
    await rankToResults(page);

    const animation = selector => page.locator(selector).first().evaluate(el => getComputedStyle(el).animationName);
    await page.locator('#taste-roast').click();
    await expect(page.locator('#taste-loading')).toBeVisible();
    expect(await animation('.taste-loading-bars i')).toBe('none');

    release();
    await expectReady(page, 'roast');
    expect(await animation('#taste-card-result')).toBe('none');
    expect(await animation('.taste-dna-fill')).toBe('none');
  });

  test('worst-case text fits at 390px with 44px tap targets and no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/js/taste-card-export.js*', route => route.fulfill({ contentType: 'text/javascript', body: EXPORT_STUB }));
    await mockTaste(page, () => ({ status: 200, body: WORST }));
    await rankToResults(page);

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.locator('#taste-roast').click();
    await expectReady(page, 'roast');
    await expect(page.locator('.taste-archetype')).toHaveText(WORST.archetype);
    await expect(page.locator('.taste-line')).toHaveCount(3);
    await expect(page.locator('#taste-share')).toBeVisible();
    await expect(page.locator('#taste-regenerate')).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    // Nothing inside the card pokes out of it
    const escaped = await page.evaluate(() => {
      const card = document.getElementById('taste-card-result').getBoundingClientRect();
      return Array.from(document.querySelectorAll('#taste-card-result *'))
        .map(el => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.left < card.left - 0.5 || r.right > card.right + 0.5))
        .map(({ el }) => el.className);
    });
    expect(escaped).toEqual([]);

    const tooSmall = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.taste-tone-btn, #taste-share, #taste-regenerate'))
        .map(el => ({ id: el.id, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 44 || r.height < 44)
        .map(({ id, r }) => ({ id, w: r.width, h: r.height }));
    });
    expect(tooSmall).toEqual([]);
  });
});
