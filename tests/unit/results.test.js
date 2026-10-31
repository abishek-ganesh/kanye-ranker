/**
 * Tests for ranking/sorting logic: getTopSongs, getTopAlbums, tie handling,
 * and that the results screen and sharing show the same album ranking.
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
// getTopAlbums (the single album ranking used by results, export and share)
// ======================================================================
describe('getTopAlbums', () => {
  const app = () => Object.create(KanyeRankerApp.prototype);

  // Marks songs as compared by recording a comparison for each consecutive pair
  function compareAll(ctx, ids) {
    for (let i = 0; i < ids.length; i += 2) {
      const a = ids[i];
      const b = ids[i + 1] || ids[0];
      ctx.elo.recordComparison(a, b, a);
    }
  }

  function rankedContext(ratings, comparedIds) {
    const ctx = Object.assign(app(), createMockContext(ratings));
    compareAll(ctx, comparedIds || TEST_SONGS.map(s => s.id));
    return ctx;
  }

  test('ranks MBDTF first in the clearRankings scenario', () => {
    const ctx = rankedContext(RATING_SCENARIOS.clearRankings);
    const albums = ctx.getTopAlbums();
    expect(albums[0].album.id).toBe('mbdtf');
  });

  test('is sorted by finalScore descending', () => {
    const albums = rankedContext(RATING_SCENARIOS.clearRankings).getTopAlbums();
    for (let i = 1; i < albums.length; i++) {
      expect(albums[i - 1].finalScore).toBeGreaterThanOrEqual(albums[i].finalScore);
    }
  });

  test('ignores uncompared songs entirely', () => {
    const compared = TEST_SONGS.map(s => s.id).filter(id => id !== 'all-of-the-lights');
    const ratings = new Map(RATING_SCENARIOS.clearRankings);
    ratings.set('all-of-the-lights', 2500);
    const ctx = rankedContext(ratings, compared);
    const mbdtf = ctx.getTopAlbums().find(a => a.album.id === 'mbdtf');
    expect(mbdtf.songs.map(s => s.id)).not.toContain('all-of-the-lights');
    expect(mbdtf.comparedSongCount).toBe(2);
  });

  test('percentile cut-offs are not diluted by uncompared songs', () => {
    const base = rankedContext(RATING_SCENARIOS.clearRankings).getTopAlbums();

    // Same compared songs, plus 150 never-compared songs sitting at the default 1500
    const ctx = rankedContext(RATING_SCENARIOS.clearRankings);
    const extra = Array.from({ length: 150 }, (_, i) => ({ id: `filler-${i}`, albumId: 'cd', initialRating: 1500 }));
    ctx.songs = [...TEST_SONGS, ...extra];
    extra.forEach(s => ctx.songRatings.set(s.id, 1500));

    const withFiller = ctx.getTopAlbums();
    expect(withFiller.map(a => [a.album.id, a.finalScore])).toEqual(base.map(a => [a.album.id, a.finalScore]));
  });

  test('requires at least 2 compared songs per album', () => {
    // Only one Donda song compared
    const compared = TEST_SONGS.map(s => s.id).filter(id => id !== 'jail');
    const albums = rankedContext(RATING_SCENARIOS.clearRankings, compared).getTopAlbums();
    expect(albums.map(a => a.album.id)).not.toContain('donda');
    albums.forEach(a => expect(a.comparedSongCount).toBeGreaterThanOrEqual(2));
  });

  test.each([
    [2, 0.88],
    [3, 0.92],
    [4, 0.96],
    [5, 1.0],
    [6, 1.0]
  ])('small-album penalty: %i compared songs scales the score by %f', (count, multiplier) => {
    const songs = Array.from({ length: count }, (_, i) => ({ id: `s${i}`, albumId: 'cd', initialRating: 1500 }));
    const ctx = Object.assign(app(), {
      songs,
      songRatings: new Map(songs.map((s, i) => [s.id, 1600 + i * 10])),
      albums: new Map(TEST_ALBUMS.map(a => [a.id, a])),
      elo: new window.EloRating(32)
    });
    compareAll(ctx, songs.map(s => s.id));
    const [album] = ctx.getTopAlbums();
    expect(album.finalScore / album.qualityScore).toBeCloseTo(multiplier, 10);
  });

  test('median takes the lower middle value for an even song count', () => {
    const ctx = rankedContext(RATING_SCENARIOS.clearRankings);
    const yeezus = ctx.getTopAlbums().find(a => a.album.id === 'yeezus');
    // black-skinhead 1580, bound-2 1550
    expect(yeezus.medianRating).toBe(1550);
    expect(yeezus.averageRating).toBe(1565);
  });

  test('returns at most 10 albums', () => {
    const songs = [];
    for (let album = 0; album < 14; album++) {
      for (let n = 0; n < 2; n++) songs.push({ id: `a${album}-${n}`, albumId: `album-${album}`, initialRating: 1500 });
    }
    const ctx = Object.assign(app(), {
      songs,
      songRatings: new Map(songs.map((s, i) => [s.id, 1400 + i])),
      albums: new Map(Array.from({ length: 14 }, (_, i) => [`album-${i}`, { id: `album-${i}`, name: `Album ${i}` }])),
      elo: new window.EloRating(32)
    });
    compareAll(ctx, songs.map(s => s.id));
    expect(ctx.getTopAlbums()).toHaveLength(10);
  });

  test('no compared songs returns no albums', () => {
    const ctx = Object.assign(app(), createMockContext(RATING_SCENARIOS.clearRankings));
    expect(ctx.getTopAlbums()).toEqual([]);
  });
});

// ======================================================================
// Results screen and sharing use the same album ranking
// ======================================================================
describe('showResults album consistency', () => {
  let savedAnalytics;
  beforeAll(() => { savedAnalytics = window.analytics; window.analytics = null; });
  afterAll(() => { window.analytics = savedAnalytics; });

  test('results screen shows exactly getTopAlbums().slice(0, 5)', () => {
    // Realistic state: a few compared songs plus many never-compared songs at the
    // default 1500. The old results-screen formula counted those in its percentile
    // cut-offs and ranked College Dropout 4th; sharing ranked it 2nd.
    const ctx = Object.assign(Object.create(KanyeRankerApp.prototype), createMockContext(new Map(RATING_SCENARIOS.clearRankings)));
    const filler = Array.from({ length: 150 }, (_, i) => ({ id: `filler-${i}`, albumId: 'unreleased', initialRating: 1500 }));
    ctx.songs = [...TEST_SONGS, ...filler];
    filler.forEach(s => ctx.songRatings.set(s.id, 1500));

    // 21 comparisons among the fixture songs so results unlock (minimum is 20)
    const ids = TEST_SONGS.map(s => s.id);
    for (let i = 0; i < 21; i++) {
      ctx.elo.recordComparison(ids[i % ids.length], ids[(i + 1) % ids.length], ids[i % ids.length]);
    }
    let shownAlbums = null;
    ctx.ui = {
      displayResults: (songs, albums) => { shownAlbums = albums; },
      showScreen: jest.fn(),
      showWarning: jest.fn()
    };

    ctx.showResults('early_exit');

    const expected = ctx.getTopAlbums().slice(0, 5).map(a => a.album.id);
    expect(shownAlbums.map(a => a.album.id)).toEqual(expected);
    expect(expected.slice(0, 2)).toEqual(['mbdtf', 'cd']);
  });
});

describe('results unlock threshold', () => {
  let savedAnalytics, savedUnlock;
  beforeAll(() => { savedAnalytics = window.analytics; window.analytics = null; });
  afterAll(() => { window.analytics = savedAnalytics; });
  beforeEach(() => { savedUnlock = KanyeUtils.RESULTS_UNLOCK_AT; });
  afterEach(() => { KanyeUtils.RESULTS_UNLOCK_AT = savedUnlock; });

  function appWithComparisons(n) {
    const ctx = Object.assign(Object.create(KanyeRankerApp.prototype), createMockContext(new Map(RATING_SCENARIOS.clearRankings)));
    const ids = TEST_SONGS.map(s => s.id);
    for (let i = 0; i < n; i++) {
      ctx.elo.recordComparison(ids[i % ids.length], ids[(i + 1) % ids.length], ids[i % ids.length]);
    }
    ctx.ui = { displayResults: jest.fn(), showScreen: jest.fn(), showWarning: jest.fn() };
    return ctx;
  }

  test('is 20 comparisons', () => {
    expect(KanyeUtils.RESULTS_UNLOCK_AT).toBe(20);
  });

  test('showResults refuses one comparison short of the threshold', () => {
    const ctx = appWithComparisons(KanyeUtils.RESULTS_UNLOCK_AT - 1);
    ctx.showResults('early_exit');
    expect(ctx.ui.showWarning).toHaveBeenCalledWith(expect.stringContaining(`Need ${KanyeUtils.RESULTS_UNLOCK_AT}+`));
    expect(ctx.ui.displayResults).not.toHaveBeenCalled();
  });

  test('showResults opens exactly at the threshold, wherever it is set', () => {
    KanyeUtils.RESULTS_UNLOCK_AT = 5;
    const ctx = appWithComparisons(5);
    ctx.showResults('early_exit');
    expect(ctx.ui.showWarning).not.toHaveBeenCalled();
    expect(ctx.ui.displayResults).toHaveBeenCalled();
  });
});
