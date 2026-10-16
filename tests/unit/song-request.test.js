/**
 * Tests for SongRequestQueue (js/song-request.js) and
 * KanyeRankerApp.prototype.generateRequestedPairing.
 */

const { TEST_SONGS } = require('../fixtures/test-data');

const SongRequestQueue = window.SongRequestQueue;
const KanyeRankerApp = window.KanyeRankerApp;

beforeEach(() => {
  localStorage.clear();
});

// Simulates n comparisons, injecting whenever the queue says so; returns [comparison, songId] hits
function simulate(queue, from, to) {
  const shown = [];
  for (let c = from; c <= to; c++) {
    if (queue.shouldInject(c)) shown.push([c, queue.takeNext(c)]);
  }
  return shown;
}

describe('SongRequestQueue', () => {
  test('is exposed on window', () => {
    expect(typeof SongRequestQueue).toBe('function');
  });

  test('enqueue caps at maxPending', () => {
    const q = new SongRequestQueue({ maxPending: 2 });
    expect(q.enqueue('a')).toEqual({ ok: true });
    expect(q.enqueue('b')).toEqual({ ok: true });
    expect(q.enqueue('c')).toEqual({ ok: false, reason: 'full' });
    expect(q.pendingCount).toBe(2);
    expect(q.isQueued('c')).toBe(false);
  });

  test('duplicate request is rejected', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    expect(q.enqueue('a')).toEqual({ ok: false, reason: 'duplicate' });
    expect(q.pendingCount).toBe(1);
  });

  test('duplicate takes precedence over full', () => {
    const q = new SongRequestQueue({ maxPending: 1 });
    q.enqueue('a');
    expect(q.enqueue('a').reason).toBe('duplicate');
  });

  test('entries keep FIFO order and have the documented shape', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 3);
    q.enqueue('b', 4);
    q.enqueue('c', 5);
    const queue = q.getQueue();
    expect(queue.map(e => e.songId)).toEqual(['a', 'b', 'c']);
    expect(queue[0]).toEqual({
      songId: 'a',
      appearancesLeft: 4,
      nextEligibleAt: 3,
      requestedAt: expect.any(Number)
    });
  });

  test('getQueue returns a copy', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    q.getQueue().pop();
    expect(q.pendingCount).toBe(1);
  });

  test('takeNext picks entries in FIFO order', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 0);
    q.enqueue('b', 0);
    expect(q.takeNext(0)).toBe('a');
    expect(q.takeNext(2)).toBe('b');
  });

  test('new request is eligible on the very next comparison', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 7);
    expect(q.shouldInject(7)).toBe(true);
    expect(q.takeNext(7)).toBe('a');
  });

  test('nothing eligible: shouldInject false and takeNext null', () => {
    const q = new SongRequestQueue();
    expect(q.shouldInject(0)).toBe(false);
    expect(q.takeNext(0)).toBeNull();
    q.enqueue('a', 10);
    expect(q.shouldInject(9)).toBe(false);
    expect(q.takeNext(9)).toBeNull();
  });

  test('appearances decrement, rotate to the back, and remove at 0', () => {
    const q = new SongRequestQueue({ appearancesPerRequest: 2 });
    q.enqueue('a', 0);
    q.enqueue('b', 0);

    expect(q.takeNext(0)).toBe('a');
    let queue = q.getQueue();
    expect(queue.map(e => e.songId)).toEqual(['b', 'a']);
    expect(queue[1].appearancesLeft).toBe(1);

    expect(q.takeNext(2)).toBe('b');
    expect(q.takeNext(4)).toBe('a');
    queue = q.getQueue();
    expect(queue.map(e => e.songId)).toEqual(['b']);
    expect(q.isQueued('a')).toBe(false);

    expect(q.takeNext(6)).toBe('b');
    expect(q.pendingCount).toBe(0);
  });

  test('respawnDelay is respected', () => {
    const q = new SongRequestQueue({ respawnDelay: 3, minGapBetweenInjections: 0 });
    q.enqueue('a', 0);
    q.takeNext(0);
    expect(q.getQueue()[0].nextEligibleAt).toBe(3);
    expect(q.shouldInject(1)).toBe(false);
    expect(q.shouldInject(2)).toBe(false);
    expect(q.takeNext(2)).toBeNull();
    expect(q.shouldInject(3)).toBe(true);
  });

  test('minGapBetweenInjections prevents back-to-back injections', () => {
    const q = new SongRequestQueue({ minGapBetweenInjections: 2 });
    q.enqueue('a', 0);
    q.enqueue('b', 0);
    q.takeNext(0);
    expect(q.shouldInject(1)).toBe(false);
    expect(q.shouldInject(2)).toBe(true);
  });

  test('single request appears at n, n+3, n+6, n+9 with defaults', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 10);
    expect(simulate(q, 10, 30)).toEqual([[10, 'a'], [13, 'a'], [16, 'a'], [19, 'a']]);
    expect(q.pendingCount).toBe(0);
  });

  test('two requests interleave and never run back to back', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 0);
    q.enqueue('b', 0);
    const shown = simulate(q, 0, 40);

    expect(shown.filter(([, id]) => id === 'a')).toHaveLength(4);
    expect(shown.filter(([, id]) => id === 'b')).toHaveLength(4);
    for (let i = 1; i < shown.length; i++) {
      expect(shown[i][0] - shown[i - 1][0]).toBeGreaterThanOrEqual(2);
      expect(shown[i][1]).not.toBe(shown[i - 1][1]);
    }
  });

  test('onChange fires with pendingCount after enqueue, takeNext and clear', () => {
    const q = new SongRequestQueue({ appearancesPerRequest: 1 });
    const cb = jest.fn();
    q.onChange(cb);

    q.enqueue('a');
    q.enqueue('b');
    q.takeNext(0);
    q.clear();
    expect(cb.mock.calls.map(c => c[0])).toEqual([1, 2, 1, 0]);
  });

  test('onChange does not fire on rejected enqueue', () => {
    const q = new SongRequestQueue();
    const cb = jest.fn();
    q.enqueue('a');
    q.onChange(cb);
    q.enqueue('a');
    expect(cb).not.toHaveBeenCalled();
  });

  test('unsubscribe stops callbacks', () => {
    const q = new SongRequestQueue();
    const cb = jest.fn();
    const unsubscribe = q.onChange(cb);
    q.enqueue('a');
    unsubscribe();
    q.enqueue('b');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('persistence round-trip: a new instance loads prior state', () => {
    const q1 = new SongRequestQueue();
    q1.enqueue('a', 0);
    q1.enqueue('b', 0);
    q1.takeNext(0);

    const q2 = new SongRequestQueue();
    expect(q2.getQueue()).toEqual(q1.getQueue());
    expect(q2.lastInjectedAt).toBe(0);
    expect(q2.shouldInject(1)).toBe(false);
    expect(q2.takeNext(2)).toBe('b');
  });

  test('uses a custom storageKey', () => {
    const q = new SongRequestQueue({ storageKey: 'custom-key' });
    q.enqueue('a');
    expect(localStorage.getItem('custom-key')).not.toBeNull();
    expect(localStorage.getItem('song-requests')).toBeNull();
  });

  test('clear empties the queue and storage', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 0);
    q.takeNext(0);
    expect(localStorage.getItem('song-requests')).not.toBeNull();

    q.clear();
    expect(q.pendingCount).toBe(0);
    expect(localStorage.getItem('song-requests')).toBeNull();
    expect(new SongRequestQueue().pendingCount).toBe(0);
    // lastInjectedAt resets, so a fresh request is eligible immediately
    q.enqueue('b', 1);
    expect(q.shouldInject(1)).toBe(true);
  });

  test('survives localStorage throwing', () => {
    // mockImplementationOnce, not spyOn + mockRestore: restoring would wipe the setup mock's implementation
    localStorage.getItem.mockImplementationOnce(() => { throw new Error('denied'); });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const q = new SongRequestQueue();
    expect(q.pendingCount).toBe(0);

    localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(q.enqueue('a')).toEqual({ ok: true });
    expect(q.pendingCount).toBe(1);

    localStorage.removeItem.mockImplementationOnce(() => { throw new Error('denied'); });
    expect(() => q.clear()).not.toThrow();
    warn.mockRestore();
  });

  test('ignores corrupt stored data', () => {
    localStorage.setItem('song-requests', '{not json');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(new SongRequestQueue().pendingCount).toBe(0);
    warn.mockRestore();
  });
});

// ======================================================================
// KanyeRankerApp.prototype.generateRequestedPairing
// ======================================================================
describe('SongRequestQueue.remove', () => {
  test('removes a song from the middle of the queue and keeps the rest in order', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    expect(q.remove('b')).toBe(true);
    expect(q.getQueue().map(e => e.songId)).toEqual(['a', 'c']);
    expect(q.isQueued('b')).toBe(false);
    expect(q.pendingCount).toBe(2);
  });

  test('returns false and does not notify for a song that is not queued', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    const cb = jest.fn();
    q.onChange(cb);
    expect(q.remove('zzz')).toBe(false);
    expect(cb).not.toHaveBeenCalled();
    expect(q.pendingCount).toBe(1);
  });

  test('notifies listeners with the new count', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    q.enqueue('b');
    const cb = jest.fn();
    q.onChange(cb);
    q.remove('a');
    expect(cb).toHaveBeenCalledWith(1);
  });

  test('removes a partially shown song so it is never injected again', () => {
    const q = new SongRequestQueue();
    q.enqueue('a', 0);
    expect(q.takeNext(0)).toBe('a');
    q.remove('a');
    expect(simulate(q, 1, 20)).toEqual([]);
  });

  test('frees a slot so a full queue accepts a new request', () => {
    const q = new SongRequestQueue({ maxPending: 2 });
    q.enqueue('a');
    q.enqueue('b');
    expect(q.enqueue('c')).toEqual({ ok: false, reason: 'full' });
    q.remove('a');
    expect(q.enqueue('c')).toEqual({ ok: true });
  });

  test('persists the removal', () => {
    const q = new SongRequestQueue();
    q.enqueue('a');
    q.enqueue('b');
    q.remove('a');
    expect(new SongRequestQueue().getQueue().map(e => e.songId)).toEqual(['b']);
  });
});

describe('generateRequestedPairing', () => {
  const generateRequestedPairing = KanyeRankerApp.prototype.generateRequestedPairing;
  const getCurrentPhase = KanyeRankerApp.prototype.getCurrentPhase;

  function createMockContext(overrides = {}) {
    const elo = new window.EloRating(32);
    const songRatings = new Map(TEST_SONGS.map(s => [s.id, s.initialRating]));
    const ctx = {
      elo,
      songRatings,
      songs: TEST_SONGS,
      top20Array: TEST_SONGS.slice(0, 5).map(s => s.id),
      top50Array: TEST_SONGS.slice(0, 10).map(s => s.id),
      top100Array: TEST_SONGS.slice(0, 12).map(s => s.id),
      allSongsArray: TEST_SONGS.map(s => s.id),
      songRequests: new SongRequestQueue(),
      ...overrides
    };
    ctx.selectOpponentForWinner = jest.fn(KanyeRankerApp.prototype.selectOpponentForWinner.bind(ctx));
    ctx.getCurrentPhase = getCurrentPhase.bind(ctx);
    return ctx;
  }

  // Push the context into finals phase (80+ comparisons) using ids outside the song pool
  function enterFinals(ctx) {
    for (let i = 0; i < 80; i++) ctx.elo.recordComparison(`x-${i}`, `y-${i}`, `x-${i}`);
  }

  beforeEach(() => {
    window.analytics.trackRequestedSongShown = jest.fn();
  });

  afterEach(() => {
    delete window.analytics.trackRequestedSongShown;
  });

  test('returns null when there is no queue', () => {
    const ctx = createMockContext({ songRequests: null });
    expect(generateRequestedPairing.call(ctx)).toBeNull();
  });

  test('returns null when nothing is queued', () => {
    const ctx = createMockContext();
    expect(generateRequestedPairing.call(ctx)).toBeNull();
    expect(ctx.selectOpponentForWinner).not.toHaveBeenCalled();
  });

  test('in finals phase, pairs the requested song with an opponent from allSongsArray', () => {
    // Narrow phase pools so a top-pool-only opponent would be detectable
    const ctx = createMockContext({ top20Array: [], top50Array: [], top100Array: [] });
    enterFinals(ctx);
    expect(ctx.getCurrentPhase().poolName).toBe('finals');

    ctx.songRatings.set('runaway', 1900);
    ctx.songRequests.enqueue('stars', ctx.elo.getCompletedComparisons());

    const pair = generateRequestedPairing.call(ctx);
    expect(pair).toHaveLength(2);
    expect(pair).toContain('stars');
    const opponent = pair.find(id => id !== 'stars');
    expect(ctx.allSongsArray).toContain(opponent);
    expect(ctx.selectOpponentForWinner).toHaveBeenCalledWith('stars', ctx.allSongsArray);
  });

  test('tracks the appearance number via analytics', () => {
    const ctx = createMockContext();
    ctx.songRequests.enqueue('stars', 0);

    generateRequestedPairing.call(ctx);
    expect(window.analytics.trackRequestedSongShown).toHaveBeenLastCalledWith('Stars', 1);

    ctx.elo.recordComparison('x-1', 'y-1', 'x-1');
    ctx.elo.recordComparison('x-2', 'y-2', 'x-2');
    ctx.elo.recordComparison('x-3', 'y-3', 'x-3');
    generateRequestedPairing.call(ctx);
    expect(window.analytics.trackRequestedSongShown).toHaveBeenLastCalledWith('Stars', 2);
  });

  test('respects queue gating between injections', () => {
    const ctx = createMockContext();
    ctx.songRequests.enqueue('stars', 0);
    ctx.songRequests.enqueue('jail', 0);
    expect(generateRequestedPairing.call(ctx)).toContain('stars');
    ctx.elo.recordComparison('x-1', 'y-1', 'x-1');
    expect(generateRequestedPairing.call(ctx)).toBeNull();
    ctx.elo.recordComparison('x-2', 'y-2', 'x-2');
    expect(generateRequestedPairing.call(ctx)).toContain('jail');
  });

  test('falls back to closest-rated song when everything has been compared', () => {
    const ctx = createMockContext();
    TEST_SONGS.forEach(s => {
      if (s.id !== 'stars') ctx.elo.recordComparison('stars', s.id, 'stars');
    });
    ctx.songRatings.set('stars', 1600);
    ctx.songRatings.set('carnival', 1590);
    ctx.songRequests.enqueue('stars', ctx.elo.getCompletedComparisons());

    const pair = generateRequestedPairing.call(ctx);
    expect(ctx.selectOpponentForWinner).toHaveReturnedWith(null);
    expect(pair.sort()).toEqual(['carnival', 'stars']);
  });

  test('randomizes which side the requested song is on', () => {
    const positions = new Set();
    for (let i = 0; i < 40 && positions.size < 2; i++) {
      localStorage.clear();
      const ctx = createMockContext();
      ctx.songRequests.enqueue('stars', 0);
      positions.add(generateRequestedPairing.call(ctx).indexOf('stars'));
    }
    expect(positions).toEqual(new Set([0, 1]));
  });

  test('works when analytics lacks trackRequestedSongShown', () => {
    delete window.analytics.trackRequestedSongShown;
    const ctx = createMockContext();
    ctx.songRequests.enqueue('stars', 0);
    expect(() => generateRequestedPairing.call(ctx)).not.toThrow();
  });
});
