/**
 * Tests for ranking/sorting logic: getTopSongs, album averages, tie handling.
 *
 * Like pairing.test.js, we test the pure-logic methods from KanyeRankerApp
 * by calling them with a mocked `this` context rather than instantiating the
 * full app.
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
// Helper: create a mock context with customizable ratings
// ---------------------------------------------------------------------------
function createMockContext(ratingsMap) {
  const songRatings = ratingsMap || RATING_SCENARIOS.clearRankings;
  const albums = new Map(TEST_ALBUMS.map(a => [a.id, a]));

  return {
    songs: TEST_SONGS,
    songRatings,
    albums,
    elo: new window.EloRating(32)
  };
}

// ======================================================================
// getTopSongs
// ======================================================================
describe('getTopSongs', () => {
  const getTopSongs = KanyeRankerApp
    ? KanyeRankerApp.prototype.getTopSongs
    : () => [];

  test('songs are sorted by rating descending', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top = getTopSongs.call(ctx, 20);

    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].rating).toBeGreaterThanOrEqual(top[i].rating);
    }
  });

  test('respects limit parameter', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top5 = getTopSongs.call(ctx, 5);
    expect(top5).toHaveLength(5);
  });

  test('limit = 1 returns only the top song', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top1 = getTopSongs.call(ctx, 1);
    expect(top1).toHaveLength(1);
    expect(top1[0].id).toBe('runaway'); // highest rated in clearRankings
    expect(top1[0].rating).toBe(1800);
  });

  test('default limit is 20', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const topDefault = getTopSongs.call(ctx);
    // We only have 14 test songs, so it returns all
    expect(topDefault).toHaveLength(TEST_SONGS.length);
  });

  test('limit larger than song count returns all songs', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const all = getTopSongs.call(ctx, 100);
    expect(all).toHaveLength(TEST_SONGS.length);
  });

  test('each returned song has a rating property from songRatings', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top = getTopSongs.call(ctx, 5);
    top.forEach(song => {
      expect(song.rating).toBe(RATING_SCENARIOS.clearRankings.get(song.id));
    });
  });

  test('returned songs retain original properties', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top = getTopSongs.call(ctx, 1);
    expect(top[0]).toHaveProperty('id');
    expect(top[0]).toHaveProperty('title');
    expect(top[0]).toHaveProperty('albumId');
  });

  test('with all-equal ratings, returns limit songs (order may vary but all have same rating)', () => {
    const ctx = createMockContext(RATING_SCENARIOS.allEqual);
    const top5 = getTopSongs.call(ctx, 5);
    expect(top5).toHaveLength(5);
    top5.forEach(song => {
      expect(song.rating).toBe(1500);
    });
  });

  test('with tight race, order reflects small differences', () => {
    const ctx = createMockContext(RATING_SCENARIOS.tightRace);
    const top3 = getTopSongs.call(ctx, 3);
    expect(top3[0].id).toBe('runaway');  // 1550
    expect(top3[1].id).toBe('power');     // 1548
    expect(top3[2].id).toBe('jesus-walks'); // 1545
  });
});

// ======================================================================
// calculateAlbumStats
// ======================================================================
describe('calculateAlbumStats', () => {
  const calculateAlbumStats = KanyeRankerApp
    ? KanyeRankerApp.prototype.calculateAlbumStats
    : () => new Map();

  test('calculates correct average rating per album', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: RATING_SCENARIOS.clearRankings.get(s.id)
    }));

    const stats = calculateAlbumStats.call(ctx, songsWithRatings);

    // College Dropout songs: jesus-walks (1700), through-the-wire (1480), all-falls-down (1650)
    const cdStats = stats.get('cd');
    expect(cdStats).toBeDefined();
    expect(cdStats.songCount).toBe(3);
    expect(cdStats.totalRating).toBe(1700 + 1480 + 1650);
    expect(cdStats.averageRating).toBeCloseTo((1700 + 1480 + 1650) / 3, 2);
  });

  test('includes all albums that have songs', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: RATING_SCENARIOS.clearRankings.get(s.id)
    }));

    const stats = calculateAlbumStats.call(ctx, songsWithRatings);
    const albumIds = new Set(TEST_SONGS.map(s => s.albumId));
    albumIds.forEach(albumId => {
      expect(stats.has(albumId)).toBe(true);
    });
  });

  test('songCount is correct for each album', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: RATING_SCENARIOS.clearRankings.get(s.id)
    }));

    const stats = calculateAlbumStats.call(ctx, songsWithRatings);

    // MBDTF has 3 songs in test data
    expect(stats.get('mbdtf').songCount).toBe(3);
    // Yeezus has 2 songs in test data
    expect(stats.get('yeezus').songCount).toBe(2);
    // Vultures 1 has 2 songs in test data
    expect(stats.get('v1').songCount).toBe(2);
  });

  test('averageRating is totalRating / songCount', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: RATING_SCENARIOS.clearRankings.get(s.id)
    }));

    const stats = calculateAlbumStats.call(ctx, songsWithRatings);

    stats.forEach((albumData, albumId) => {
      expect(albumData.averageRating).toBeCloseTo(
        albumData.totalRating / albumData.songCount,
        5
      );
    });
  });

  test('empty song list returns empty map', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const stats = calculateAlbumStats.call(ctx, []);
    expect(stats.size).toBe(0);
  });

  test('single song produces correct stats', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const singleSong = [{ ...TEST_SONGS[0], rating: 1800, albumId: 'cd' }];
    const stats = calculateAlbumStats.call(ctx, singleSong);

    expect(stats.get('cd').songCount).toBe(1);
    expect(stats.get('cd').totalRating).toBe(1800);
    expect(stats.get('cd').averageRating).toBe(1800);
  });
});

// ======================================================================
// Tie handling and sorting stability
// ======================================================================
describe('Tie handling', () => {
  const getTopSongs = KanyeRankerApp
    ? KanyeRankerApp.prototype.getTopSongs
    : () => [];

  test('songs with equal ratings are all included (no loss due to ties)', () => {
    const tiedRatings = new Map(TEST_SONGS.map(s => [s.id, 1500]));
    const ctx = createMockContext(tiedRatings);
    const all = getTopSongs.call(ctx, TEST_SONGS.length);
    expect(all).toHaveLength(TEST_SONGS.length);
    // All should have rating 1500
    all.forEach(song => {
      expect(song.rating).toBe(1500);
    });
  });

  test('tied songs are handled consistently (deterministic order)', () => {
    const tiedRatings = new Map(TEST_SONGS.map(s => [s.id, 1500]));
    const ctx = createMockContext(tiedRatings);

    const run1 = getTopSongs.call(ctx, 5).map(s => s.id);
    const run2 = getTopSongs.call(ctx, 5).map(s => s.id);
    // Array.sort is not guaranteed stable in all JS engines, but for the
    // same input it should produce the same output within a single runtime
    expect(run1).toEqual(run2);
  });

  test('songs with small rating differences maintain correct order', () => {
    const ctx = createMockContext(RATING_SCENARIOS.tightRace);
    const top = getTopSongs.call(ctx, TEST_SONGS.length);

    // Verify sorted descending even with tight differences
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].rating).toBeGreaterThanOrEqual(top[i].rating);
    }
  });

  test('getTopSongs with limit 0 returns empty array', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const top0 = getTopSongs.call(ctx, 0);
    expect(top0).toHaveLength(0);
  });
});

// ======================================================================
// Album averages with RATING_SCENARIOS
// ======================================================================
describe('Album averages with fixture scenarios', () => {
  const calculateAlbumStats = KanyeRankerApp
    ? KanyeRankerApp.prototype.calculateAlbumStats
    : () => new Map();

  test('MBDTF has highest average in clearRankings scenario', () => {
    const ctx = createMockContext(RATING_SCENARIOS.clearRankings);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: RATING_SCENARIOS.clearRankings.get(s.id)
    }));
    const stats = calculateAlbumStats.call(ctx, songsWithRatings);

    // MBDTF: runaway(1800) + power(1750) + all-of-the-lights(1500) = 5050/3 ≈ 1683
    // CD: jesus-walks(1700) + through-the-wire(1480) + all-falls-down(1650) = 4830/3 = 1610
    const mbdtfAvg = stats.get('mbdtf').averageRating;
    const cdAvg = stats.get('cd').averageRating;
    expect(mbdtfAvg).toBeGreaterThan(cdAvg);
  });

  test('allEqual scenario gives same average for all albums', () => {
    const ctx = createMockContext(RATING_SCENARIOS.allEqual);
    const songsWithRatings = TEST_SONGS.map(s => ({
      ...s,
      rating: 1500
    }));
    const stats = calculateAlbumStats.call(ctx, songsWithRatings);

    const averages = new Set();
    stats.forEach(data => averages.add(data.averageRating));
    expect(averages.size).toBe(1);
    expect(averages.has(1500)).toBe(true);
  });
});
