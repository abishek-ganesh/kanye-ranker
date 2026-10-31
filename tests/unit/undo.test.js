/**
 * Tests for undo: BackButtonManager (js/back-button.js), KanyeRankerApp
 * captureUndoState / restoreUndoState, and SongRequestQueue snapshot / restore.
 *
 * Drives the real chooseSong() on a lightweight app instance built from the
 * prototype, so the rating, ELO and pairing-state mutations are the real ones.
 */

const { TEST_SONGS, TEST_ALBUMS } = require('../fixtures/test-data');

const KanyeRankerApp = window.KanyeRankerApp;
const BackButtonManager = window.BackButtonManager;
const SongRequestQueue = window.SongRequestQueue;

let savedAnalytics;

beforeAll(() => {
  savedAnalytics = window.analytics;
  window.analytics = null;
});

afterAll(() => {
  window.analytics = savedAnalytics;
});

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  document.getElementById('back-button')?.remove();
});

afterEach(() => {
  jest.useRealTimers();
});

function createApp() {
  const app = Object.create(KanyeRankerApp.prototype);
  Object.assign(app, {
    songs: TEST_SONGS,
    albums: new Map(TEST_ALBUMS.map(a => [a.id, a])),
    songRatings: new Map(TEST_SONGS.map(s => [s.id, 1500])),
    elo: new window.EloRating(32),
    pairings: [],
    currentPairIndex: 0,
    isProcessingChoice: false,
    minComparisons: 50,
    userFavorites: new Set(),
    lastWinnerId: null,
    lastWinnerPosition: null,
    consecutiveWins: 0,
    comparisonsSinceBreak: 0,
    newAlbumComparisonsShown: 0,
    shownNewAlbumSongs: new Set(),
    songRequests: new SongRequestQueue(),
    ui: {
      disableComparisonButtons: jest.fn(),
      enableComparisonButtons: jest.fn(),
      showSuccess: jest.fn()
    },
    animateChoice: jest.fn(),
    showNextComparison: jest.fn()
  });
  app.backButton = new BackButtonManager(app);
  return app;
}

// Shows a pair at the current index (as showNextComparison would) and picks a side
function play(app, pair, side) {
  if (!app.pairings[app.currentPairIndex]) app.pairings.push(pair);
  app.chooseSong(side);
  jest.advanceTimersByTime(500);
}

// Simulates the pair generator running after a choice and mutating its state
function generateNext(app, pair, { newAlbumSong } = {}) {
  app.pairings.push(pair);
  app.comparisonsSinceBreak++;
  if (newAlbumSong) {
    app.newAlbumComparisonsShown++;
    app.shownNewAlbumSongs.add(newAlbumSong);
  }
}

function ratingsOf(app) {
  return Object.fromEntries(app.songRatings);
}

// ======================================================================
// Ratings and ELO history
// ======================================================================
describe('undo restores ratings', () => {
  test('undoing the first comparison restores starting ratings', () => {
    const app = createApp();
    const before = ratingsOf(app);

    play(app, ['runaway', 'power'], 'a');
    expect(app.songRatings.get('runaway')).toBeGreaterThan(1500);

    app.backButton.goBack();

    expect(ratingsOf(app)).toEqual(before);
    expect(app.elo.getCompletedComparisons()).toBe(0);
    expect(app.currentPairIndex).toBe(0);
  });

  test('undoing a later comparison restores the ratings from just before it', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    play(app, ['runaway', 'bound-2'], 'a');
    const beforeThird = ratingsOf(app);

    play(app, ['runaway', 'jesus-walks'], 'b');
    app.backButton.goBack();

    expect(ratingsOf(app)).toEqual(beforeThird);
    expect(app.elo.getCompletedComparisons()).toBe(2);
    expect(app.currentPairIndex).toBe(2);
  });

  test('undoing every comparison in sequence returns to the start', () => {
    const app = createApp();
    const start = ratingsOf(app);
    play(app, ['runaway', 'power'], 'a');
    play(app, ['runaway', 'bound-2'], 'b');
    play(app, ['bound-2', 'jesus-walks'], 'a');

    app.backButton.goBack();
    app.backButton.goBack();
    app.backButton.goBack();

    expect(ratingsOf(app)).toEqual(start);
    expect(app.elo.getCompletedComparisons()).toBe(0);
    expect(app.backButton.history).toHaveLength(0);
  });

  test('undoing one of two meetings of the same pair keeps the other', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    play(app, ['bound-2', 'jesus-walks'], 'a');
    play(app, ['power', 'runaway'], 'a');

    app.backButton.goBack();

    expect(app.elo.getCompletedComparisons()).toBe(2);
    expect(app.elo.hasBeenCompared('runaway', 'power')).toBe(true);
  });

  test('re-choosing after undo applies the new outcome from the restored ratings', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    app.backButton.goBack();
    play(app, ['runaway', 'power'], 'b');

    expect(app.songRatings.get('power')).toBeGreaterThan(1500);
    expect(app.songRatings.get('runaway')).toBeLessThan(1500);
    expect(app.elo.getCompletedComparisons()).toBe(1);
  });
});

// ======================================================================
// Pairing state
// ======================================================================
describe('undo restores pairing state', () => {
  test('discards the pair generated from the undone outcome', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    generateNext(app, ['runaway', 'bound-2']);
    expect(app.pairings).toHaveLength(2);

    app.backButton.goBack();

    expect(app.pairings).toEqual([['runaway', 'power']]);
  });

  test('pick A, undo, pick B leaves B as the carry-over winner', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    generateNext(app, ['runaway', 'bound-2']);
    expect(app.lastWinnerId).toBe('runaway');

    app.backButton.goBack();
    expect(app.lastWinnerId).toBeNull();

    play(app, ['runaway', 'power'], 'b');
    expect(app.lastWinnerId).toBe('power');
    expect(app.lastWinnerPosition).toBe('b');
    expect(app.consecutiveWins).toBe(1);
    expect(app.pairings).toHaveLength(1);
  });

  test('restores consecutive wins and fatigue counters', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    generateNext(app, ['runaway', 'bound-2']);
    play(app, ['runaway', 'bound-2'], 'a');
    generateNext(app, ['runaway', 'jesus-walks']);
    // State as the third pair is shown; undoing the third choice must land here
    const snapshot = {
      lastWinnerId: app.lastWinnerId,
      consecutiveWins: app.consecutiveWins,
      comparisonsSinceBreak: app.comparisonsSinceBreak
    };
    play(app, ['runaway', 'jesus-walks'], 'a');
    generateNext(app, ['runaway', 'all-falls-down']);
    expect(app.consecutiveWins).toBe(3);

    app.backButton.goBack();

    expect(app.lastWinnerId).toBe(snapshot.lastWinnerId);
    expect(app.consecutiveWins).toBe(snapshot.consecutiveWins);
    expect(app.comparisonsSinceBreak).toBe(snapshot.comparisonsSinceBreak);
  });

  test('removes the winner from favorites only if the undone choice added it', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    play(app, ['runaway', 'bound-2'], 'a');

    app.backButton.goBack();
    expect(app.userFavorites.has('runaway')).toBe(true);

    app.backButton.goBack();
    expect(app.userFavorites.has('runaway')).toBe(false);
  });

  test('rewinds the new album boost counter and shown songs', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    generateNext(app, ['black-skinhead', 'bound-2'], { newAlbumSong: 'black-skinhead' });
    expect(app.newAlbumComparisonsShown).toBe(1);

    app.backButton.goBack();

    expect(app.newAlbumComparisonsShown).toBe(0);
    expect(app.shownNewAlbumSongs.has('black-skinhead')).toBe(false);
  });
});

// ======================================================================
// Song request queue
// ======================================================================
describe('undo and song requests', () => {
  test('gives back an appearance consumed by the discarded pair', () => {
    const app = createApp();
    app.songRequests.enqueue('bound-2', 0);
    play(app, ['runaway', 'power'], 'a');

    // Generator injects the requested song into the next pair
    const injected = app.songRequests.takeNext(app.elo.getCompletedComparisons());
    app.pairings.push([injected, 'jesus-walks']);
    expect(app.songRequests.getQueue()[0].appearancesLeft).toBe(3);

    app.backButton.goBack();

    const entry = app.songRequests.getQueue().find(e => e.songId === 'bound-2');
    expect(entry.appearancesLeft).toBe(4);
    expect(app.songRequests.lastInjectedAt).toBeNull();
  });

  test('restores a request the discarded pair had exhausted', () => {
    const queue = new SongRequestQueue({ appearancesPerRequest: 1 });
    queue.enqueue('bound-2', 0);
    const snapshot = queue.snapshot();
    queue.takeNext(0);
    expect(queue.pendingCount).toBe(0);

    queue.restore(snapshot, ['bound-2', 'jesus-walks']);

    expect(queue.isQueued('bound-2')).toBe(true);
    expect(queue.getQueue()[0].appearancesLeft).toBe(1);
  });

  test('keeps requests the user added or removed after the choice', () => {
    const queue = new SongRequestQueue();
    queue.enqueue('bound-2', 0);
    queue.enqueue('power', 0);
    const snapshot = queue.snapshot();

    queue.remove('power');
    queue.enqueue('runaway', 1);
    queue.restore(snapshot, []);

    expect(queue.isQueued('bound-2')).toBe(true);
    expect(queue.isQueued('power')).toBe(false);
    expect(queue.isQueued('runaway')).toBe(true);
  });

  test('snapshot is a copy, not a live reference', () => {
    const queue = new SongRequestQueue();
    queue.enqueue('bound-2', 0);
    const snapshot = queue.snapshot();
    queue.takeNext(0);
    expect(snapshot.entries[0].appearancesLeft).toBe(4);
  });
});

// ======================================================================
// BackButtonManager behaviour
// ======================================================================
describe('BackButtonManager', () => {
  test('ignores undo while a choice is still animating', () => {
    const app = createApp();
    app.pairings.push(['runaway', 'power']);
    app.chooseSong('a');
    expect(app.isProcessingChoice).toBe(true);

    app.backButton.goBack();
    expect(app.backButton.history).toHaveLength(1);

    jest.advanceTimersByTime(500);
    expect(app.currentPairIndex).toBe(1);
  });

  test('keeps the history entry when the undo fails', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    app.restoreUndoState = () => { throw new Error('boom'); };

    expect(() => app.backButton.goBack()).not.toThrow();
    expect(app.backButton.history).toHaveLength(1);
    spy.mockRestore();
  });

  test('does not persist history to localStorage', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    expect(localStorage.getItem('comparison-history')).toBeNull();
  });

  test('removes history left by older versions on startup', () => {
    localStorage.setItem('comparison-history', '[{"songIdA":"x","songIdB":"y"}]');
    const app = createApp();
    expect(localStorage.getItem('comparison-history')).toBeNull();
    expect(app.backButton.history).toHaveLength(0);
  });

  test('clear() empties history and hides the button', () => {
    const app = createApp();
    play(app, ['runaway', 'power'], 'a');
    play(app, ['runaway', 'bound-2'], 'a');
    expect(document.getElementById('back-button').classList.contains('visible')).toBe(true);

    app.backButton.clear();

    expect(app.backButton.history).toHaveLength(0);
    expect(document.getElementById('back-button').classList.contains('visible')).toBe(false);
  });
});
