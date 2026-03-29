/**
 * Comprehensive tests for js/elo.js — the EloRating class.
 *
 * The class is loaded into the global scope by tests/setup.js, so we
 * access it via window.EloRating (or just EloRating in jsdom).
 */

const {
  TEST_SONGS,
  RATING_SCENARIOS,
  buildRatingsMap,
  buildComparisonHistory
} = require('../fixtures/test-data');

describe('EloRating', () => {
  let elo;

  beforeEach(() => {
    elo = new window.EloRating(32);
  });

  // ====================================================================
  // Expected Score
  // ====================================================================
  describe('getExpectedScore', () => {
    test('equal ratings return 0.5', () => {
      expect(elo.getExpectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
    });

    test('higher rating A gives expected > 0.5', () => {
      const result = elo.getExpectedScore(1700, 1500);
      expect(result).toBeGreaterThan(0.5);
    });

    test('higher rating B gives expected < 0.5', () => {
      const result = elo.getExpectedScore(1300, 1500);
      expect(result).toBeLessThan(0.5);
    });

    test('extreme difference (2000 vs 1000) gives near 1.0 for A', () => {
      const result = elo.getExpectedScore(2000, 1000);
      expect(result).toBeGreaterThan(0.99);
    });

    test('extreme difference (1000 vs 2000) gives near 0.0 for A', () => {
      const result = elo.getExpectedScore(1000, 2000);
      expect(result).toBeLessThan(0.01);
    });

    test('symmetry: expectedA + expectedB ≈ 1.0', () => {
      const ratingA = 1600;
      const ratingB = 1400;
      const expectedA = elo.getExpectedScore(ratingA, ratingB);
      const expectedB = elo.getExpectedScore(ratingB, ratingA);
      expect(expectedA + expectedB).toBeCloseTo(1.0, 10);
    });

    test('symmetry holds for unequal ratings', () => {
      const pairs = [[1800, 1200], [1550, 1450], [2000, 1000], [1500, 1500]];
      pairs.forEach(([a, b]) => {
        const eA = elo.getExpectedScore(a, b);
        const eB = elo.getExpectedScore(b, a);
        expect(eA + eB).toBeCloseTo(1.0, 10);
      });
    });

    test('200-point difference gives roughly 0.76', () => {
      // Classic ELO: 200 points difference -> expected ~0.76
      const result = elo.getExpectedScore(1700, 1500);
      expect(result).toBeCloseTo(0.76, 1);
    });
  });

  // ====================================================================
  // Rating Updates
  // ====================================================================
  describe('updateRatings', () => {
    test('winner gains rating points', () => {
      const { newRatingA } = elo.updateRatings(1500, 1500, 1, 'song-a', 'song-b');
      expect(newRatingA).toBeGreaterThan(1500);
    });

    test('loser loses rating points', () => {
      const { newRatingB } = elo.updateRatings(1500, 1500, 1, 'song-a', 'song-b');
      expect(newRatingB).toBeLessThan(1500);
    });

    test('total rating change is approximately zero-sum', () => {
      // With same K factor (both songs have 0 comparisons -> K=48)
      const { newRatingA, newRatingB } = elo.updateRatings(1500, 1500, 1, 'song-a', 'song-b');
      const totalBefore = 1500 + 1500;
      const totalAfter = newRatingA + newRatingB;
      // Rounding can cause up to 1-point deviation
      expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
    });

    test('equal ratings: each moves by K/2 (with dynamic K=48 for new songs)', () => {
      const { newRatingA, newRatingB } = elo.updateRatings(1500, 1500, 1, 'song-a', 'song-b');
      // K=48 for 0 comparisons, winner gains K*0.5 = 24
      expect(newRatingA).toBe(1500 + 24);
      expect(newRatingB).toBe(1500 - 24);
    });

    test('large difference: underdog win causes bigger swing', () => {
      // Underdog (1300) beats favorite (1700)
      const underdogWin = elo.updateRatings(1300, 1700, 1, 'underdog', 'favorite');
      // Equal ratings win for reference
      const equalWin = elo.updateRatings(1500, 1500, 1, 'equal-a', 'equal-b');

      const underdogGain = underdogWin.newRatingA - 1300;
      const equalGain = equalWin.newRatingA - 1500;
      expect(underdogGain).toBeGreaterThan(equalGain);
    });

    test('score=1 means A wins', () => {
      const { newRatingA, newRatingB } = elo.updateRatings(1500, 1500, 1, 'a', 'b');
      expect(newRatingA).toBeGreaterThan(1500);
      expect(newRatingB).toBeLessThan(1500);
    });

    test('score=0 means B wins (A loses)', () => {
      const { newRatingA, newRatingB } = elo.updateRatings(1500, 1500, 0, 'a', 'b');
      expect(newRatingA).toBeLessThan(1500);
      expect(newRatingB).toBeGreaterThan(1500);
    });

    test('different K-factors for songs with different comparison counts', () => {
      // Give song-a 5 comparisons (K=32), song-b stays at 0 (K=48)
      for (let i = 0; i < 5; i++) {
        elo.recordComparison('song-a', `opponent-${i}`, 'song-a');
      }
      const { newRatingA, newRatingB } = elo.updateRatings(1500, 1500, 1, 'song-a', 'song-b');
      const gainA = newRatingA - 1500;
      const lossB = 1500 - newRatingB;
      // A uses K=32 (5 comparisons), B uses K=48 (0 comparisons)
      // With equal ratings, expected = 0.5
      // gainA = 32 * 0.5 = 16, lossB = 48 * 0.5 = 24
      expect(gainA).toBe(16);
      expect(lossB).toBe(24);
    });
  });

  // ====================================================================
  // Dynamic K-Factor
  // ====================================================================
  describe('getDynamicK', () => {
    test('0 comparisons returns K=48', () => {
      expect(elo.getDynamicK('new-song')).toBe(48);
    });

    test('2 comparisons returns K=48', () => {
      elo.recordComparison('s1', 's2', 's1');
      elo.recordComparison('s1', 's3', 's1');
      expect(elo.getDynamicK('s1')).toBe(48);
    });

    test('3 comparisons returns K=32', () => {
      for (let i = 0; i < 3; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      expect(elo.getDynamicK('s1')).toBe(32);
    });

    test('6 comparisons returns K=32', () => {
      for (let i = 0; i < 6; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      expect(elo.getDynamicK('s1')).toBe(32);
    });

    test('7 comparisons returns K=16', () => {
      for (let i = 0; i < 7; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      expect(elo.getDynamicK('s1')).toBe(16);
    });

    test('10+ comparisons returns K=16', () => {
      for (let i = 0; i < 10; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      expect(elo.getDynamicK('s1')).toBe(16);
    });

    test('20 comparisons still returns K=16', () => {
      for (let i = 0; i < 20; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      expect(elo.getDynamicK('s1')).toBe(16);
    });
  });

  // ====================================================================
  // Comparison Tracking
  // ====================================================================
  describe('Comparison Tracking', () => {
    test('recordComparison stores a comparison', () => {
      elo.recordComparison('a', 'b', 'a');
      expect(elo.comparisons).toHaveLength(1);
      expect(elo.comparisons[0]).toMatchObject({
        songIdA: 'a',
        songIdB: 'b',
        winnerId: 'a'
      });
    });

    test('recordComparison stores timestamp', () => {
      const ts = 1234567890;
      elo.recordComparison('a', 'b', 'a', ts);
      expect(elo.comparisons[0].timestamp).toBe(ts);
    });

    test('recordComparison uses Date.now() by default', () => {
      const before = Date.now();
      elo.recordComparison('a', 'b', 'a');
      const after = Date.now();
      expect(elo.comparisons[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(elo.comparisons[0].timestamp).toBeLessThanOrEqual(after);
    });

    test('hasBeenCompared returns true for recorded pair (A,B)', () => {
      elo.recordComparison('a', 'b', 'a');
      expect(elo.hasBeenCompared('a', 'b')).toBe(true);
    });

    test('hasBeenCompared works in reverse direction (B,A)', () => {
      elo.recordComparison('a', 'b', 'a');
      expect(elo.hasBeenCompared('b', 'a')).toBe(true);
    });

    test('hasBeenCompared returns false for unrecorded pair', () => {
      elo.recordComparison('a', 'b', 'a');
      expect(elo.hasBeenCompared('a', 'c')).toBe(false);
    });

    test('getComparisonCount counts correctly', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('a', 'c', 'c');
      elo.recordComparison('b', 'c', 'b');
      expect(elo.getComparisonCount('a')).toBe(2);
      expect(elo.getComparisonCount('b')).toBe(2);
      expect(elo.getComparisonCount('c')).toBe(2);
    });

    test('getComparisonCount returns 0 for unknown song', () => {
      expect(elo.getComparisonCount('unknown')).toBe(0);
    });

    test('getCompletedComparisons returns total count', () => {
      expect(elo.getCompletedComparisons()).toBe(0);
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('c', 'd', 'c');
      expect(elo.getCompletedComparisons()).toBe(2);
    });

    test('getWinRate returns 0 for song with no comparisons', () => {
      expect(elo.getWinRate('unknown')).toBe(0);
    });

    test('getWinRate returns correct ratio after wins and losses', () => {
      elo.recordComparison('a', 'b', 'a'); // a wins
      elo.recordComparison('a', 'c', 'a'); // a wins
      elo.recordComparison('a', 'd', 'd'); // a loses
      expect(elo.getWinRate('a')).toBeCloseTo(2 / 3, 5);
    });

    test('getWinRate returns 1.0 for song that always wins', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('a', 'c', 'a');
      expect(elo.getWinRate('a')).toBe(1.0);
    });

    test('getWinRate returns 0 for song that always loses', () => {
      elo.recordComparison('a', 'b', 'b');
      elo.recordComparison('a', 'c', 'c');
      expect(elo.getWinRate('a')).toBe(0);
    });

    test('getRecentComparisons returns last N comparisons for a song', () => {
      elo.recordComparison('a', 'b', 'a', 1000);
      elo.recordComparison('a', 'c', 'c', 2000);
      elo.recordComparison('a', 'd', 'a', 3000);
      elo.recordComparison('a', 'e', 'e', 4000);
      elo.recordComparison('x', 'y', 'x', 5000); // unrelated

      const recent = elo.getRecentComparisons('a', 2);
      expect(recent).toHaveLength(2);
      expect(recent[0].songIdB).toBe('d');
      expect(recent[1].songIdB).toBe('e');
    });

    test('getRecentComparisons defaults to 5', () => {
      for (let i = 0; i < 10; i++) {
        elo.recordComparison('a', `opp-${i}`, 'a');
      }
      const recent = elo.getRecentComparisons('a');
      expect(recent).toHaveLength(5);
    });

    test('getRecentComparisons returns all if fewer than limit', () => {
      elo.recordComparison('a', 'b', 'a');
      const recent = elo.getRecentComparisons('a', 5);
      expect(recent).toHaveLength(1);
    });
  });

  // ====================================================================
  // Skip Tracking
  // ====================================================================
  describe('Skip Tracking', () => {
    test('recordSkip increments skip count', () => {
      elo.recordSkip('a', 'b');
      expect(elo.getSkipCount('a', 'b')).toBe(1);
      elo.recordSkip('a', 'b');
      expect(elo.getSkipCount('a', 'b')).toBe(2);
    });

    test('getSkipCount returns 0 for unskipped pair', () => {
      expect(elo.getSkipCount('a', 'b')).toBe(0);
    });

    test('skip key is order-independent (A,B same as B,A)', () => {
      elo.recordSkip('a', 'b');
      expect(elo.getSkipCount('b', 'a')).toBe(1);
      elo.recordSkip('b', 'a');
      expect(elo.getSkipCount('a', 'b')).toBe(2);
    });

    test('shouldSkipPairing returns false below threshold', () => {
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      expect(elo.shouldSkipPairing('a', 'b')).toBe(false); // 2 < 3
    });

    test('shouldSkipPairing returns true at threshold (default 3)', () => {
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      expect(elo.shouldSkipPairing('a', 'b')).toBe(true); // 3 >= 3
    });

    test('shouldSkipPairing returns true above threshold', () => {
      for (let i = 0; i < 5; i++) elo.recordSkip('a', 'b');
      expect(elo.shouldSkipPairing('a', 'b')).toBe(true);
    });

    test('shouldSkipPairing respects custom threshold', () => {
      elo.recordSkip('a', 'b');
      expect(elo.shouldSkipPairing('a', 'b', 1)).toBe(true);
      expect(elo.shouldSkipPairing('a', 'b', 2)).toBe(false);
    });

    test('shouldSkipPairing is order-independent', () => {
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      expect(elo.shouldSkipPairing('b', 'a')).toBe(true);
    });
  });

  // ====================================================================
  // Confidence Score
  // ====================================================================
  describe('getRatingConfidence', () => {
    test('0 comparisons returns 0 confidence', () => {
      expect(elo.getRatingConfidence('unknown')).toBe(0);
    });

    test('10+ comparisons gives at least 0.6 from count component', () => {
      // 10 comparisons -> min(10/10, 1.0) * 0.6 = 0.6
      for (let i = 0; i < 10; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      const confidence = elo.getRatingConfidence('s1');
      expect(confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('win rate extremity adds confidence when comparisons >= 5', () => {
      // 100% win rate with 5 comparisons
      for (let i = 0; i < 5; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      const confidenceAllWins = elo.getRatingConfidence('s1');

      // 50% win rate with 5 comparisons (separate elo instance)
      const elo2 = new window.EloRating(32);
      for (let i = 0; i < 5; i++) {
        const winner = i < 2 ? 's2' : `opp-${i}`;
        elo2.recordComparison('s2', `opp-${i}`, winner);
      }
      // s2 wins 2 out of 5 (slightly below 50% but still closer to 0.5 than 100%)
      const confidenceMixed = elo2.getRatingConfidence('s2');

      expect(confidenceAllWins).toBeGreaterThan(confidenceMixed);
    });

    test('confidence is capped at 1.0', () => {
      // Give a song lots of comparisons with extreme win rate
      for (let i = 0; i < 50; i++) {
        elo.recordComparison('s1', `opp-${i}`, 's1');
      }
      const confidence = elo.getRatingConfidence('s1');
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    test('recency factor contributes to confidence', () => {
      // Song with a very recent comparison
      elo.recordComparison('s1', 'opp-0', 's1');
      const confidenceRecent = elo.getRatingConfidence('s1');

      // Song with a stale comparison (many other comparisons have happened since)
      const elo2 = new window.EloRating(32);
      elo2.recordComparison('s2', 'opp-0', 's2');
      // Add 50 unrelated comparisons to push s2's comparison into the past
      for (let i = 0; i < 50; i++) {
        elo2.recordComparison(`x-${i}`, `y-${i}`, `x-${i}`);
      }
      const confidenceStale = elo2.getRatingConfidence('s2');

      // Recent comparison should give slightly higher confidence
      expect(confidenceRecent).toBeGreaterThan(confidenceStale);
    });

    test('few comparisons give low confidence', () => {
      elo.recordComparison('s1', 'opp-0', 's1');
      const confidence = elo.getRatingConfidence('s1');
      // 1 comparison: min(1/10, 1)*0.6 = 0.06, plus small recency
      expect(confidence).toBeLessThan(0.2);
    });
  });

  // ====================================================================
  // Export / Import
  // ====================================================================
  describe('Export / Import', () => {
    test('exportData captures current state', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordSkip('c', 'd');
      const data = elo.exportData();

      expect(data.comparisons).toHaveLength(1);
      expect(data.comparisons[0].songIdA).toBe('a');
      expect(data.skipCount).toHaveProperty('c-d');
      expect(data.k).toBe(32);
    });

    test('importData restores state', () => {
      const data = {
        comparisons: [{ songIdA: 'x', songIdB: 'y', winnerId: 'x', timestamp: 999 }],
        skipCount: { 'a-b': 2 },
        k: 64
      };
      elo.importData(data);

      expect(elo.comparisons).toHaveLength(1);
      expect(elo.comparisons[0].songIdA).toBe('x');
      expect(elo.getSkipCount('a', 'b')).toBe(2);
      expect(elo.k).toBe(64);
    });

    test('round-trip preserves comparisons and skip counts', () => {
      elo.recordComparison('a', 'b', 'a', 1000);
      elo.recordComparison('c', 'd', 'd', 2000);
      elo.recordSkip('e', 'f');
      elo.recordSkip('e', 'f');

      const exported = elo.exportData();

      const elo2 = new window.EloRating(32);
      elo2.importData(exported);

      expect(elo2.getCompletedComparisons()).toBe(2);
      expect(elo2.hasBeenCompared('a', 'b')).toBe(true);
      expect(elo2.hasBeenCompared('c', 'd')).toBe(true);
      expect(elo2.getSkipCount('e', 'f')).toBe(2);
      expect(elo2.k).toBe(32);
    });

    test('importData handles missing fields gracefully', () => {
      elo.importData({});
      expect(elo.comparisons).toEqual([]);
      expect(elo.skipCount).toEqual({});
      expect(elo.k).toBe(32); // default
    });
  });

  // ====================================================================
  // removeComparison
  // ====================================================================
  describe('removeComparison', () => {
    test('removes the correct pair', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('c', 'd', 'c');
      elo.removeComparison('a', 'b');

      expect(elo.hasBeenCompared('a', 'b')).toBe(false);
      expect(elo.hasBeenCompared('c', 'd')).toBe(true);
      expect(elo.getCompletedComparisons()).toBe(1);
    });

    test('removes in reverse order (B,A)', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.removeComparison('b', 'a');
      expect(elo.hasBeenCompared('a', 'b')).toBe(false);
    });

    test('does not affect other comparisons', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('a', 'c', 'a');
      elo.recordComparison('b', 'c', 'b');
      elo.removeComparison('a', 'b');

      expect(elo.hasBeenCompared('a', 'c')).toBe(true);
      expect(elo.hasBeenCompared('b', 'c')).toBe(true);
      expect(elo.getCompletedComparisons()).toBe(2);
    });

    test('removes associated skip count', () => {
      elo.recordSkip('a', 'b');
      elo.recordSkip('a', 'b');
      elo.recordComparison('a', 'b', 'a');
      elo.removeComparison('a', 'b');

      expect(elo.getSkipCount('a', 'b')).toBe(0);
    });

    test('removing non-existent comparison is a no-op', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.removeComparison('x', 'y');
      expect(elo.getCompletedComparisons()).toBe(1);
    });
  });

  // ====================================================================
  // reset
  // ====================================================================
  describe('reset', () => {
    test('clears all comparisons', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('c', 'd', 'c');
      elo.reset();
      expect(elo.getCompletedComparisons()).toBe(0);
      expect(elo.comparisons).toEqual([]);
    });

    test('clears all skip counts', () => {
      elo.recordSkip('a', 'b');
      elo.recordSkip('c', 'd');
      elo.reset();
      expect(elo.getSkipCount('a', 'b')).toBe(0);
      expect(elo.getSkipCount('c', 'd')).toBe(0);
      expect(elo.skipCount).toEqual({});
    });

    test('after reset, hasBeenCompared returns false', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.reset();
      expect(elo.hasBeenCompared('a', 'b')).toBe(false);
    });

    test('after reset, getComparisonCount returns 0', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.reset();
      expect(elo.getComparisonCount('a')).toBe(0);
    });
  });

  // ====================================================================
  // getAverageOpponentRating
  // ====================================================================
  describe('getAverageOpponentRating', () => {
    test('returns 1500 when song has no comparisons', () => {
      const ratings = new Map([['a', 1600], ['b', 1400]]);
      expect(elo.getAverageOpponentRating('a', ratings)).toBe(1500);
    });

    test('returns correct average for compared opponents', () => {
      elo.recordComparison('a', 'b', 'a');
      elo.recordComparison('a', 'c', 'a');
      const ratings = new Map([['a', 1600], ['b', 1400], ['c', 1200]]);
      expect(elo.getAverageOpponentRating('a', ratings)).toBe(1300);
    });

    test('defaults opponent rating to 1500 if not in map', () => {
      elo.recordComparison('a', 'missing', 'a');
      const ratings = new Map([['a', 1600]]);
      expect(elo.getAverageOpponentRating('a', ratings)).toBe(1500);
    });
  });
});
