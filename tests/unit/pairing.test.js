/**
 * Tests for app.js pairing logic: getCurrentPhase, shouldCarryOverWinner,
 * and selectOpponentForWinner.
 *
 * Rather than instantiating KanyeRankerApp (which has heavy DOM dependencies),
 * we extract the pure-logic methods from the class prototype and invoke them
 * with a mocked `this` context.
 *
 * KanyeRankerApp is loaded into window by tests/setup.js.
 */

const {
  TEST_SONGS,
  TEST_ALBUMS,
  RATING_SCENARIOS,
  buildRatingsMap
} = require('../fixtures/test-data');

// KanyeRankerApp is available on window from setup.js
const KanyeRankerApp = window.KanyeRankerApp;

// ---------------------------------------------------------------------------
// Helper: create a mock "this" context for method calls
// ---------------------------------------------------------------------------
function createMockContext(overrides = {}) {
  const elo = new window.EloRating(32);
  const songRatings = new Map(TEST_SONGS.map(s => [s.id, s.initialRating]));

  return {
    elo,
    songRatings,
    songs: TEST_SONGS,
    top20Array: TEST_SONGS.slice(0, 5).map(s => s.id),
    top50Array: TEST_SONGS.slice(0, 10).map(s => s.id),
    top100Array: TEST_SONGS.slice(0, 12).map(s => s.id),
    allSongsArray: TEST_SONGS.map(s => s.id),
    consecutiveWins: 0,
    comparisonsSinceBreak: 0,
    carryOverProbability: 0.75,
    lastWinnerId: null,
    ...overrides
  };
}

// ======================================================================
// getCurrentPhase
// ======================================================================
describe('getCurrentPhase', () => {
  const getCurrentPhase = KanyeRankerApp
    ? KanyeRankerApp.prototype.getCurrentPhase
    : () => {};

  test('< 15 comparisons returns phase 1, top20 pool', () => {
    const ctx = createMockContext();
    // 0 comparisons
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(1);
    expect(result.poolName).toBe('top20');
    expect(result.pool).toBe(ctx.top20Array);
  });

  test('exactly 14 comparisons is still phase 1', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 14; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(1);
    expect(result.poolName).toBe('top20');
  });

  test('15 comparisons returns phase 2, top50 pool', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 15; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(2);
    expect(result.poolName).toBe('top50');
    expect(result.pool).toBe(ctx.top50Array);
  });

  test('29 comparisons is still phase 2', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 29; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(2);
    expect(result.poolName).toBe('top50');
  });

  test('30 comparisons returns phase 3, top100 pool', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 30; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(3);
    expect(result.poolName).toBe('top100');
    expect(result.pool).toBe(ctx.top100Array);
  });

  test('49 comparisons is still phase 3', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 49; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(3);
    expect(result.poolName).toBe('top100');
  });

  test('50 comparisons returns phase 4, all songs pool', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 50; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(4);
    expect(result.poolName).toBe('all');
    expect(result.pool).toBe(ctx.allSongsArray);
  });

  test('79 comparisons is still phase 4', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 79; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(4);
    expect(result.poolName).toBe('all');
  });

  test('80+ comparisons returns phase 5, finals', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 80; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(5);
    expect(result.poolName).toBe('finals');
    expect(result.pool).toBe(ctx.allSongsArray);
  });

  test('100 comparisons is still phase 5', () => {
    const ctx = createMockContext();
    for (let i = 0; i < 100; i++) {
      ctx.elo.recordComparison(`a-${i}`, `b-${i}`, `a-${i}`);
    }
    const result = getCurrentPhase.call(ctx);
    expect(result.phase).toBe(5);
    expect(result.poolName).toBe('finals');
  });
});

// ======================================================================
// shouldCarryOverWinner
// ======================================================================
describe('shouldCarryOverWinner', () => {
  const shouldCarryOverWinner = KanyeRankerApp
    ? KanyeRankerApp.prototype.shouldCarryOverWinner
    : () => false;

  test('returns false when consecutiveWins >= 3', () => {
    const ctx = createMockContext({ consecutiveWins: 3 });
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
  });

  test('returns false when consecutiveWins > 3', () => {
    const ctx = createMockContext({ consecutiveWins: 5 });
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
  });

  test('returns false when comparisonsSinceBreak >= 7', () => {
    const ctx = createMockContext({ comparisonsSinceBreak: 7 });
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
  });

  test('returns false when comparisonsSinceBreak > 7', () => {
    const ctx = createMockContext({ comparisonsSinceBreak: 10 });
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
  });

  test('returns true when random < carryOverProbability', () => {
    const ctx = createMockContext({
      consecutiveWins: 0,
      comparisonsSinceBreak: 0,
      carryOverProbability: 0.75
    });
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 < 0.75
    expect(shouldCarryOverWinner.call(ctx)).toBe(true);
    Math.random.mockRestore();
  });

  test('returns false when random >= carryOverProbability', () => {
    const ctx = createMockContext({
      consecutiveWins: 0,
      comparisonsSinceBreak: 0,
      carryOverProbability: 0.75
    });
    jest.spyOn(Math, 'random').mockReturnValue(0.8); // 0.8 >= 0.75
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
    Math.random.mockRestore();
  });

  test('returns true when random is 0 and probability > 0', () => {
    const ctx = createMockContext({
      consecutiveWins: 0,
      comparisonsSinceBreak: 0,
      carryOverProbability: 0.1
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(shouldCarryOverWinner.call(ctx)).toBe(true);
    Math.random.mockRestore();
  });

  test('fatigue rules take priority over probability', () => {
    // Even if random would say yes, fatigue says no
    const ctx = createMockContext({
      consecutiveWins: 3,
      comparisonsSinceBreak: 0,
      carryOverProbability: 1.0
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(shouldCarryOverWinner.call(ctx)).toBe(false);
    Math.random.mockRestore();
  });
});

// ======================================================================
// selectOpponentForWinner
// ======================================================================
describe('selectOpponentForWinner', () => {
  const selectOpponentForWinner = KanyeRankerApp
    ? KanyeRankerApp.prototype.selectOpponentForWinner
    : () => null;

  test('excludes the winner from candidates', () => {
    const ctx = createMockContext();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = ['runaway', 'power', 'jesus-walks'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(opponent).not.toBe('runaway');
    Math.random.mockRestore();
  });

  test('excludes already-compared songs', () => {
    const ctx = createMockContext();
    ctx.elo.recordComparison('runaway', 'power', 'runaway');
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = ['runaway', 'power', 'jesus-walks'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(opponent).not.toBe('power');
    expect(opponent).toBe('jesus-walks');
    Math.random.mockRestore();
  });

  test('excludes songs that have hit skip threshold', () => {
    const ctx = createMockContext();
    // Skip runaway+power 3 times (default threshold)
    ctx.elo.recordSkip('runaway', 'power');
    ctx.elo.recordSkip('runaway', 'power');
    ctx.elo.recordSkip('runaway', 'power');
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = ['runaway', 'power', 'jesus-walks'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(opponent).not.toBe('power');
    Math.random.mockRestore();
  });

  test('returns null when no candidates available', () => {
    const ctx = createMockContext();
    // Compare runaway with every other song in a tiny pool
    ctx.elo.recordComparison('runaway', 'power', 'runaway');
    const pool = ['runaway', 'power'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(opponent).toBeNull();
  });

  test('returns null for single-element pool (just the winner)', () => {
    const ctx = createMockContext();
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', ['runaway']);
    expect(opponent).toBeNull();
  });

  test('prefers similar-rated opponents', () => {
    const ctx = createMockContext();
    // Set winner to 1800
    ctx.songRatings.set('runaway', 1800);
    // Set opponents at various ratings
    ctx.songRatings.set('power', 1790);          // very close: diff 10
    ctx.songRatings.set('jesus-walks', 1600);     // medium: diff 200
    ctx.songRatings.set('stars', 1200);           // far: diff 600

    // The method sorts by score = 1000 - ratingDiff - comparisonCount*20
    // power:       1000 - 10 - 0 = 990
    // jesus-walks: 1000 - 200 - 0 = 800
    // stars:       1000 - 600 - 0 = 400
    // Top 5 candidates picked, then random selects from them.
    // With Math.random()=0 we get the first of the top candidates.

    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = ['runaway', 'power', 'jesus-walks', 'stars'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    // With random=0, should pick the best-scored candidate (power)
    expect(opponent).toBe('power');
    Math.random.mockRestore();
  });

  test('returns a valid song id from the pool', () => {
    const ctx = createMockContext();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = TEST_SONGS.map(s => s.id);
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(pool).toContain(opponent);
    expect(opponent).not.toBe('runaway');
    Math.random.mockRestore();
  });

  test('considers comparison count in scoring (fewer comparisons preferred)', () => {
    const ctx = createMockContext();
    ctx.songRatings.set('runaway', 1500);
    ctx.songRatings.set('power', 1500);        // same rating, 0 comparisons
    ctx.songRatings.set('jesus-walks', 1500);   // same rating, 5 comparisons

    // Give jesus-walks 5 comparisons
    for (let i = 0; i < 5; i++) {
      ctx.elo.recordComparison('jesus-walks', `opp-${i}`, 'jesus-walks');
    }

    // power score: 1000 - 0 - 0*20 = 1000
    // jesus-walks: 1000 - 0 - 5*20 = 900
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = ['runaway', 'power', 'jesus-walks'];
    const opponent = selectOpponentForWinner.call(ctx, 'runaway', pool);
    expect(opponent).toBe('power');
    Math.random.mockRestore();
  });
});
