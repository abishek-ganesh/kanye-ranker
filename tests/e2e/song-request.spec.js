// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E coverage for the mid-session "request a song" feature.
 * Helpers are copied from app-flow.spec.js (not shared) to keep specs independent.
 */

// Low-popularity songs (highest spotifyRank in data/songs.json) so they are
// very unlikely to show up in early comparisons on their own.
const REQUESTED = { id: 'v2-14', title: 'Sky City', query: 'sky city' };
const CAP_SONGS = [
  { id: 'v2-14', query: 'sky city' },
  { id: 'v2-13', query: 'my soul' },
  { id: 'v2-12', query: 'time moving slow' },
  { id: 'v2-10', query: 'husband' },
  { id: 'v2-11', query: 'lifestyle' },
  { id: 'v2-9', query: 'river' },
];

/**
 * Helper: wait for the app to fully initialize (copied from app-flow.spec.js).
 */
async function waitForAppReady(page) {
  await page.locator('#landing-screen.active').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#start-ranking').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    return window.kanyeApp && window.kanyeApp.songs && window.kanyeApp.songs.length > 0;
  }, { timeout: 15000 });
}

/**
 * Helper: click card A N times (adapted from app-flow.spec.js).
 * Waits on currentPairIndex advancing instead of a fixed sleep, so the next
 * pair is guaranteed to be rendered when this returns.
 */
async function makeComparisons(page, count) {
  for (let i = 0; i < count; i++) {
    const albumArt = page.locator('#song-a .album-art');
    await albumArt.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
    const before = await page.evaluate(() => window.kanyeApp.currentPairIndex);
    await albumArt.click();
    await page.waitForFunction(
      (idx) => window.kanyeApp.currentPairIndex > idx && !window.kanyeApp.isProcessingChoice,
      before,
      { timeout: 5000 }
    );
  }
}

/**
 * Helper: load the app and land on the first comparison (same flow as app-flow.spec.js).
 */
async function startRanking(page) {
  await page.goto('/');
  await waitForAppReady(page);
  await page.locator('#start-ranking').click();
  await page.locator('#comparison-screen').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(
    () => document.getElementById('song-title-a')?.textContent?.length > 0,
    { timeout: 5000 }
  );
}

// Phones (<=540px) get the full-screen sheet that closes on request; wider screens get the drawer
function isPhone(page) {
  return (page.viewportSize()?.width ?? 1280) <= 540;
}

function isTouch() {
  return !!test.info().project.use.hasTouch;
}

// Taps on touch devices, clicks elsewhere, so each project exercises its real input
async function press(page, locator) {
  if (isTouch()) await locator.tap();
  else await locator.click();
}

async function pressAt(page, x, y) {
  if (isTouch()) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function expectClosedAndUnlocked(page) {
  await expect(page.locator('#song-request-modal')).not.toHaveClass(/\bshow\b/);
  await expect(page.locator('body')).not.toHaveClass(/\bsong-request-open\b/);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
}

// Any uncaught page error fails the test, so a broken flow can't hide behind passing assertions
let pageErrors = [];
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});
test.afterEach(async () => {
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});

async function openModal(page) {
  const modal = page.locator('#song-request-modal');
  if (await modal.evaluate(el => el.classList.contains('show'))) return;
  await page.locator('#song-request-btn').click();
  await expect(modal).toHaveClass(/\bshow\b/);
}

async function closeModal(page) {
  const modal = page.locator('#song-request-modal');
  if (!(await modal.evaluate(el => el.classList.contains('show')))) return;
  await page.locator('#song-request-close').click();
  await expect(modal).not.toHaveClass(/\bshow\b/);
}

function rowFor(page, songId) {
  return page.locator(`.song-request-row[data-song-id="${songId}"]`);
}

/**
 * Helper: open the modal (if needed), search, and request a song by id.
 * Resolves once the queue reports the song as queued.
 */
async function requestSong(page, songId, query) {
  await openModal(page);
  await page.locator('#song-request-search').fill(query);
  const action = rowFor(page, songId).locator('.song-request-action');
  await expect(action).toHaveText('Request');
  await action.click();
  await page.waitForFunction(
    (id) => window.kanyeApp.songRequests.isQueued(id),
    songId,
    { timeout: 5000 }
  );
}

/**
 * Helper: count how many pairings (up to and including the one on screen) contain songId.
 */
async function countAppearances(page, songId) {
  return page.evaluate((id) => {
    const app = window.kanyeApp;
    return app.pairings
      .slice(0, app.currentPairIndex + 1)
      .filter(pair => pair && pair.includes(id)).length;
  }, songId);
}

/**
 * Helper: make one comparison, picking whichever card is NOT songId.
 */
async function chooseAgainst(page, songId) {
  await page.waitForFunction(() => !window.kanyeApp?.isProcessingChoice, { timeout: 5000 });
  const { before, side } = await page.evaluate((id) => {
    const app = window.kanyeApp;
    const [a] = app.pairings[app.currentPairIndex];
    return { before: app.currentPairIndex, side: a === id ? 'b' : 'a' };
  }, songId);
  await page.locator(`#song-${side} .album-art`).click();
  await page.waitForFunction(
    (idx) => window.kanyeApp.currentPairIndex > idx && !window.kanyeApp.isProcessingChoice,
    before,
    { timeout: 5000 }
  );
}

async function currentTitles(page) {
  return [
    (await page.locator('#song-title-a').textContent())?.trim(),
    (await page.locator('#song-title-b').textContent())?.trim(),
  ];
}

// ============================================================
// Opening the modal
// ============================================================
test.describe('Song request modal', () => {
  test('request button is visible on comparison screen and opens modal with search focused', async ({ page }) => {
    await startRanking(page);

    const btn = page.locator('#song-request-btn');
    await expect(btn).toBeVisible();
    await expect(page.locator('#song-request-badge')).toBeHidden();

    await btn.click();
    await expect(page.locator('#song-request-modal')).toHaveClass(/\bshow\b/);
    await expect(page.locator('#song-request-search')).toBeFocused();
  });

  test('search narrows results and shows empty state for gibberish', async ({ page }) => {
    await startRanking(page);
    await openModal(page);

    const totalSongs = await page.evaluate(() => window.kanyeApp.songs.length);
    const search = page.locator('#song-request-search');
    const rows = page.locator('.song-request-row[data-song-id]:visible');

    await search.fill('runaway');
    await expect(rowFor(page, 'mbdtf-9')).toBeVisible();
    await expect(rowFor(page, 'mbdtf-9')).toContainText(/Runaway/i);
    // Search is debounced, so poll until the filter has applied
    await expect.poll(() => rows.count()).toBeLessThan(totalSongs);
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.locator('.song-request-empty')).toBeHidden();

    await search.fill('zxqvbnmwplk');
    await expect(page.locator('.song-request-empty')).toBeVisible();
    await expect(rows).toHaveCount(0);
  });

  test('Escape closes the modal', async ({ page }) => {
    await startRanking(page);
    await openModal(page);

    await page.keyboard.press('Escape');
    await expect(page.locator('#song-request-modal')).not.toHaveClass(/\bshow\b/);
  });

  test('typing 1 and 2 in search does not advance the comparison', async ({ page }) => {
    await startRanking(page);
    await makeComparisons(page, 1);

    const counter = page.locator('#current-comparison');
    const counterBefore = await counter.textContent();
    const indexBefore = await page.evaluate(() => window.kanyeApp.currentPairIndex);
    const titlesBefore = await currentTitles(page);

    await openModal(page);
    const search = page.locator('#song-request-search');
    await search.focus();
    await search.pressSequentially('12');
    await expect(search).toHaveValue('12');

    // Choice handling is async (setTimeout); give a stray keypress time to land.
    await page.waitForTimeout(600);

    await expect(counter).toHaveText(counterBefore || '');
    expect(await page.evaluate(() => window.kanyeApp.currentPairIndex)).toBe(indexBefore);
    expect(await page.evaluate(() => window.kanyeApp.isProcessingChoice)).toBe(false);
    expect(await currentTitles(page)).toEqual(titlesBefore);
  });
});

// ============================================================
// Requesting songs
// ============================================================
test.describe('Requesting a song', () => {
  test('requested song is queued, badge shows 1, and it appears within 3 comparisons', async ({ page }) => {
    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);

    // Mobile closes the modal on request; reopen to inspect the row state
    if (isPhone(page)) {
      await openModal(page);
      await page.locator('#song-request-search').fill(REQUESTED.query);
    }
    await expect(rowFor(page, REQUESTED.id).locator('.song-request-action')).toHaveText('Queued ✓');

    const badge = page.locator('#song-request-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
    expect(await page.evaluate(() => window.kanyeApp.songRequests.pendingCount)).toBe(1);

    await closeModal(page);

    let seen = (await currentTitles(page)).includes(REQUESTED.title);
    for (let i = 0; i < 3 && !seen; i++) {
      await makeComparisons(page, 1);
      seen = (await currentTitles(page)).includes(REQUESTED.title);
    }
    expect(seen, `"${REQUESTED.title}" should appear within 3 comparisons`).toBe(true);
  });

  test('requested song appears 4 times then leaves the queue', async ({ page }) => {
    test.setTimeout(120_000); // Makes ~14 comparisons

    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);
    await closeModal(page);

    // Always pick the other song: a requested song that wins can stay on via the normal
    // winner carry-over, which would add appearances beyond the 4 the queue injects
    const maxComparisons = 16;
    let made = 0;
    while (made < maxComparisons) {
      const pending = await page.evaluate(() => window.kanyeApp.songRequests.pendingCount);
      if (pending === 0) break;
      await chooseAgainst(page, REQUESTED.id);
      made++;
    }

    expect(await page.evaluate(() => window.kanyeApp.songRequests.pendingCount)).toBe(0);
    expect(await page.evaluate((id) => window.kanyeApp.songRequests.isQueued(id), REQUESTED.id)).toBe(false);
    await expect(page.locator('#song-request-badge')).toBeHidden();
    expect(await countAppearances(page, REQUESTED.id)).toBe(4);
  });

  test('queue caps at 5 and the 6th song shows Queue full', async ({ page }) => {
    await startRanking(page);

    for (const song of CAP_SONGS.slice(0, 5)) {
      await requestSong(page, song.id, song.query);
    }
    expect(await page.evaluate(() => window.kanyeApp.songRequests.pendingCount)).toBe(5);
    await expect(page.locator('#song-request-badge')).toHaveText('5');

    const sixth = CAP_SONGS[5];
    await openModal(page);
    await page.locator('#song-request-search').fill(sixth.query);
    await expect(rowFor(page, sixth.id).locator('.song-request-action')).toHaveText('Queue full');
    expect(await page.evaluate((id) => window.kanyeApp.songRequests.isQueued(id), sixth.id)).toBe(false);
  });

  test('modal closes after request on mobile and stays open on desktop', async ({ page }) => {
    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);

    const modal = page.locator('#song-request-modal');
    if (isPhone(page)) {
      await expect(modal).not.toHaveClass(/\bshow\b/);
    } else {
      await expect(rowFor(page, REQUESTED.id).locator('.song-request-action')).toHaveText('Queued ✓');
      await expect(modal).toHaveClass(/\bshow\b/);
      await expect(page.locator('#song-request-search')).toBeVisible();
    }
  });
});

// ============================================================
// "Your requests" list
// ============================================================
test.describe('Your requests list', () => {
  const queueItem = (page, songId) => page.locator(`.song-request-queue-item[data-song-id="${songId}"]`);

  test('is hidden with no requests and lists a request expanded with "Up next"', async ({ page }) => {
    await startRanking(page);
    await openModal(page);
    await expect(page.locator('.song-request-queue')).toBeHidden();

    await requestSong(page, REQUESTED.id, REQUESTED.query);
    await openModal(page); // mobile closes on request

    const section = page.locator('.song-request-queue');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('open', '');
    await expect(page.locator('.song-request-queue-count')).toHaveText('1');
    await expect(queueItem(page, REQUESTED.id)).toContainText(REQUESTED.title);
    await expect(queueItem(page, REQUESTED.id).locator('.song-request-queue-progress')).toHaveText('Up next');
  });

  test('progress updates after the requested song is shown', async ({ page }) => {
    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);
    await closeModal(page);

    for (let i = 0; i < 3 && (await countAppearances(page, REQUESTED.id)) === 0; i++) {
      await makeComparisons(page, 1);
    }
    expect(await countAppearances(page, REQUESTED.id)).toBe(1);

    await openModal(page);
    await expect(queueItem(page, REQUESTED.id).locator('.song-request-queue-progress')).toHaveText('Shown 1 of 4');
  });

  test('removing a request clears the badge, resets the row, and stops injections', async ({ page }) => {
    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);
    await openModal(page);

    await queueItem(page, REQUESTED.id).locator('.song-request-remove').click();

    await expect(page.locator('.song-request-queue')).toBeHidden();
    await expect(page.locator('#song-request-badge')).toBeHidden();
    await expect(page.locator('.song-request-status')).toContainText(`${REQUESTED.title} removed`);
    await page.locator('#song-request-search').fill(REQUESTED.query);
    await expect(rowFor(page, REQUESTED.id).locator('.song-request-action')).toHaveText('Request');
    // Removal keeps the panel open on every platform
    await expect(page.locator('#song-request-modal')).toHaveClass(/\bshow\b/);

    await closeModal(page);
    const before = await countAppearances(page, REQUESTED.id);
    await makeComparisons(page, 6);
    expect(await countAppearances(page, REQUESTED.id)).toBe(before);
  });

  test('lists multiple requests oldest first and removes only the chosen one', async ({ page }) => {
    await startRanking(page);
    for (const song of CAP_SONGS.slice(0, 3)) {
      await requestSong(page, song.id, song.query);
    }
    await openModal(page);

    const ids = await page.locator('.song-request-queue-item').evaluateAll(els => els.map(el => el.dataset.songId));
    expect(ids).toEqual(CAP_SONGS.slice(0, 3).map(s => s.id));

    await queueItem(page, CAP_SONGS[1].id).locator('.song-request-remove').click();
    await expect(page.locator('.song-request-queue-count')).toHaveText('2');
    await expect(page.locator('#song-request-badge')).toHaveText('2');
    await expect(queueItem(page, CAP_SONGS[1].id)).toHaveCount(0);
    await expect(queueItem(page, CAP_SONGS[0].id)).toBeVisible();
    await expect(queueItem(page, CAP_SONGS[2].id)).toBeVisible();
  });
});

// ============================================================
// Exiting the panel: every route out must close it, unlock the page, and leave ranking working
// ============================================================
test.describe('Exiting the panel', () => {
  test('close button closes the panel and ranking keeps working', async ({ page }) => {
    await startRanking(page);
    await openModal(page);
    await press(page, page.locator('#song-request-close'));
    await expectClosedAndUnlocked(page);
    await makeComparisons(page, 1);
  });

  test('tapping outside the drawer closes it and ranking keeps working', async ({ page }) => {
    // Phones get a full-screen sheet with only a 12px edge, and Android's touch adjustment
    // redirects edge taps onto the list, so the X button is the phone exit (covered above)
    test.skip(isPhone(page), 'full-screen sheet on phones has no real outside area');
    await startRanking(page);
    await openModal(page);

    // The dimmed area to the left of the drawer
    const box = await page.locator('.song-request-content').boundingBox();
    await pressAt(page, Math.round(box.x / 2), Math.round(page.viewportSize().height / 2));

    await expectClosedAndUnlocked(page);
    await makeComparisons(page, 1);
  });

  test('tapping inside the panel does not close it', async ({ page }) => {
    await startRanking(page);
    await openModal(page);
    await press(page, page.locator('.song-request-subtitle'));
    await press(page, page.locator('.song-request-heading'));
    await expect(page.locator('#song-request-modal')).toHaveClass(/\bshow\b/);
  });

  test('keyboard: Enter opens, Escape closes, and focus returns to the button', async ({ page }) => {
    await startRanking(page);
    const btn = page.locator('#song-request-btn');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#song-request-modal')).toHaveClass(/\bshow\b/);
    await expect(page.locator('#song-request-search')).toBeFocused();

    await page.keyboard.press('Escape');
    await expectClosedAndUnlocked(page);
    await expect(btn).toBeFocused();
  });

  test('rapid open and close never leaves it stuck', async ({ page }) => {
    await startRanking(page);
    const btn = page.locator('#song-request-btn');
    for (let i = 0; i < 8; i++) {
      await btn.click({ force: true, noWaitAfter: true });
      await page.keyboard.press('Escape');
    }
    await expectClosedAndUnlocked(page);

    // Still opens and closes normally afterward
    await openModal(page);
    await closeModal(page);
    await expectClosedAndUnlocked(page);
    await makeComparisons(page, 1);
  });

  test('reopening clears the search but keeps your requests', async ({ page }) => {
    await startRanking(page);
    await requestSong(page, REQUESTED.id, REQUESTED.query);
    await closeModal(page);
    await openModal(page);

    await expect(page.locator('#song-request-search')).toHaveValue('');
    await expect(page.locator(`.song-request-queue-item[data-song-id="${REQUESTED.id}"]`)).toBeVisible();
    const total = await page.evaluate(() => window.kanyeApp.songs.length);
    await expect(page.locator('.song-request-row[data-song-id]:visible')).toHaveCount(total);
  });

  test('the undo back arrow hides while the panel is open and returns after', async ({ page }) => {
    await startRanking(page);
    await makeComparisons(page, 3); // phones hide the back arrow until there is more than one comparison
    const back = page.locator('#back-button');
    await expect(back).toBeVisible();

    await openModal(page);
    await expect(back).toBeHidden();
    await closeModal(page);
    await expect(back).toBeVisible();
  });
});
