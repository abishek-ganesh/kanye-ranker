/**
 * Tests for TierListCore (js/tier-list.js) and KanyeRankerApp.getTierListItems.
 */

const TierListCore = require('../../js/tier-list.js');
const { TEST_SONGS, TEST_ALBUMS } = require('../fixtures/test-data');

const { TIERS, UNRANKED } = TierListCore;

// n items with strictly descending scores: i0 is the best
function scored(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `i${i}`, score: 2000 - i * 10 }));
}

function counts(board) {
  const out = {};
  [...TIERS, UNRANKED].forEach(t => { out[t] = board[t].length; });
  return out;
}

describe('module loading', () => {
  test('exposes the core on window and via require', () => {
    expect(window.TierListCore).toBe(TierListCore);
    expect(TIERS).toEqual(['S', 'A', 'B', 'C', 'D']);
    expect(UNRANKED).toBe('unranked');
  });
});

describe('bucket', () => {
  test('30 songs (about 20 comparisons) split 3/6/9/8/4 down the tiers', () => {
    const board = new TierListCore().build('songs', scored(30));
    expect(counts(board)).toEqual({ S: 3, A: 6, B: 9, C: 8, D: 4, unranked: 0 });
  });

  test('150 songs keep roughly 10/20/30/25/15 percent shares', () => {
    const c = counts(new TierListCore().build('songs', scored(150)));
    expect(c.S).toBe(15);
    expect(c.A).toBe(30);
    expect(c.B).toBe(45);
    expect(c.C).toBeGreaterThanOrEqual(37);
    expect(c.C).toBeLessThanOrEqual(38);
    expect(c.S + c.A + c.B + c.C + c.D).toBe(150);
  });

  test('tiers are ordered best to worst and each tier is sorted by score', () => {
    const board = new TierListCore().build('songs', scored(30).reverse());
    const flat = TIERS.flatMap(t => board[t]);
    expect(flat).toEqual(scored(30).map(i => i.id));
  });

  test('the top item is always S, even with very few items', () => {
    [1, 2, 3].forEach(n => {
      const board = new TierListCore().build('songs', scored(n));
      expect(board.S[0]).toBe('i0');
    });
  });

  test('tied scores land in the same tier', () => {
    const items = scored(30);
    // i2 is the last S at 30 items; tie i3 with it
    items[3].score = items[2].score;
    const tiers = TierListCore.bucket(items);
    expect(tiers.get('i3')).toBe(tiers.get('i2'));
  });

  test('empty input gives an empty board', () => {
    const board = new TierListCore().build('songs', []);
    expect(counts(board)).toEqual({ S: 0, A: 0, B: 0, C: 0, D: 0, unranked: 0 });
  });
});

describe('unranked items', () => {
  test('null-score items go to unranked in input order', () => {
    const items = [
      { id: 'a', score: null },
      ...scored(5),
      { id: 'b', score: null }
    ];
    const board = new TierListCore().build('albums', items);
    expect(board.unranked).toEqual(['a', 'b']);
    expect(TierListCore.rankedCount(board)).toBe(5);
  });
});

describe('moves', () => {
  test('a moved item lands in its new tier and leaves its old one', () => {
    const core = new TierListCore();
    expect(core.move('songs', 'i29', 'S')).toBe(true);
    const board = core.build('songs', scored(30));
    expect(board.S).toContain('i29');
    expect(board.D).not.toContain('i29');
    expect(TierListCore.tierOf(board, 'i29')).toBe('S');
  });

  test('a moved scored item slots into its new tier by score', () => {
    const core = new TierListCore();
    core.move('songs', 'i0', 'B');
    const board = core.build('songs', scored(30));
    expect(board.B[0]).toBe('i0');
  });

  test('unranked items moved into a tier go after the scored ones, in move order', () => {
    const core = new TierListCore();
    const items = [...scored(10), { id: 'x', score: null }, { id: 'y', score: null }];
    core.move('albums', 'y', 'A');
    core.move('albums', 'x', 'A');
    const board = core.build('albums', items);
    expect(board.A.slice(-2)).toEqual(['y', 'x']);
    expect(board.unranked).toEqual([]);
  });

  test('items can be moved back to unranked', () => {
    const core = new TierListCore();
    core.move('songs', 'i0', UNRANKED);
    const board = core.build('songs', scored(30));
    expect(board.unranked).toEqual(['i0']);
    expect(board.S).not.toContain('i0');
  });

  test('pins survive a rebuild with new scores (Continue Ranking)', () => {
    const core = new TierListCore();
    core.move('songs', 'i5', 'D');
    core.build('songs', scored(30));
    const more = scored(60);
    const board = core.build('songs', more);
    expect(board.D).toContain('i5');
    expect(counts(board).S + counts(board).A + counts(board).B + counts(board).C + counts(board).D).toBe(60);
  });

  test('pins for items no longer present are ignored', () => {
    const core = new TierListCore();
    core.move('songs', 'gone', 'S');
    const board = core.build('songs', scored(5));
    expect(TIERS.flatMap(t => board[t])).not.toContain('gone');
  });

  test('songs and albums keep separate pins', () => {
    const core = new TierListCore();
    core.move('songs', 'i3', 'S');
    const albums = core.build('albums', scored(10));
    expect(TierListCore.tierOf(albums, 'i3')).not.toBe('S');
  });

  test('invalid tier or kind is rejected', () => {
    const core = new TierListCore();
    expect(core.move('songs', 'i0', 'Z')).toBe(false);
    expect(core.move('movies', 'i0', 'S')).toBe(false);
    expect(core.hasEdits('songs')).toBe(false);
  });

  test('reset clears every pin', () => {
    const core = new TierListCore();
    core.move('songs', 'i0', 'D');
    core.move('albums', 'i0', 'D');
    core.reset();
    expect(core.hasEdits('songs')).toBe(false);
    expect(core.hasEdits('albums')).toBe(false);
    expect(core.build('songs', scored(10)).S[0]).toBe('i0');
  });
});

describe('revealOrder', () => {
  test('runs D up to S, left to right within a tier, and skips unranked', () => {
    const board = TierListCore.emptyBoard();
    board.S = ['s1'];
    board.A = ['a1', 'a2'];
    board.D = ['d1', 'd2'];
    board.unranked = ['u1'];
    expect(TierListCore.revealOrder(board)).toEqual([
      { tier: 'D', id: 'd1' },
      { tier: 'D', id: 'd2' },
      { tier: 'A', id: 'a1' },
      { tier: 'A', id: 'a2' },
      { tier: 'S', id: 's1' }
    ]);
  });
});

describe('KanyeRankerApp.getTierListItems', () => {
  const getTierListItems = window.KanyeRankerApp.prototype.getTierListItems;
  const getTopAlbums = window.KanyeRankerApp.prototype.getTopAlbums;

  function ctxWithComparisons(pairs) {
    const elo = new window.EloRating(32);
    const songRatings = new Map(TEST_SONGS.map(s => [s.id, 1500]));
    pairs.forEach(([a, b], i) => {
      elo.recordComparison(a, b, a);
      songRatings.set(a, songRatings.get(a) + 20 + i);
      songRatings.set(b, songRatings.get(b) - 20);
    });
    return {
      songs: TEST_SONGS,
      albums: new Map(TEST_ALBUMS.map(a => [a.id, a])),
      songRatings,
      elo,
      getTopAlbums
    };
  }

  test('songs: only compared songs, scored by rating', () => {
    const [s0, s1, s2] = TEST_SONGS;
    const ctx = ctxWithComparisons([[s0.id, s1.id]]);
    const items = getTierListItems.call(ctx, 'songs');
    expect(items.map(i => i.id).sort()).toEqual([s0.id, s1.id].sort());
    expect(items.find(i => i.id === s0.id).score).toBe(ctx.songRatings.get(s0.id));
    expect(items.find(i => i.id === s2.id)).toBeUndefined();
  });

  test('albums: every album present, unscored when under 2 compared songs', () => {
    const byAlbum = {};
    TEST_SONGS.forEach(s => { (byAlbum[s.albumId] = byAlbum[s.albumId] || []).push(s); });
    const [albumA, albumB] = Object.keys(byAlbum).filter(id => byAlbum[id].length >= 2);
    const [a1, a2] = byAlbum[albumA];
    const [b1, b2] = byAlbum[albumB];
    const ctx = ctxWithComparisons([[a1.id, b1.id], [a2.id, b2.id]]);
    const items = getTierListItems.call(ctx, 'albums');

    expect(items.map(i => i.id)).toEqual(TEST_ALBUMS.map(a => a.id));
    expect(typeof items.find(i => i.id === albumA).score).toBe('number');
    expect(typeof items.find(i => i.id === albumB).score).toBe('number');
    items
      .filter(i => i.id !== albumA && i.id !== albumB)
      .forEach(i => expect(i.score).toBeNull());
  });

  test('getTopAlbums still defaults to 10 for existing callers', () => {
    const ctx = ctxWithComparisons([]);
    expect(getTopAlbums.length).toBe(0);
    expect(getTopAlbums.call(ctx)).toEqual([]);
  });
});
