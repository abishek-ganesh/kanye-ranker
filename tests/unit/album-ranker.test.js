/**
 * Tests for AlbumRankerCore (js/album-ranker.js): album mode pairing, choices, skips and undo.
 */

const AlbumRankerCore = require('../../js/album-ranker.js');
const { albums } = require('../../data/songs.json');

const IDS = albums.map(a => a.id);
const TOTAL_PAIRS = (IDS.length * (IDS.length - 1)) / 2;

// Deterministic PRNG so every run sees the same pairings
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(ids = IDS, seed = 1) {
  return new AlbumRankerCore(ids, { random: seeded(seed) });
}

const key = (a, b) => [a, b].sort().join('|');

// Any pair (not chosen on, skipped under 3 times) that avoids every album in `avoid`
function hasFreshAlternative(core, avoid) {
  const ids = core.ids;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (avoid.includes(a) || avoid.includes(b)) continue;
      if (core.elo.hasBeenCompared(a, b)) continue;
      if (core.elo.getSkipCount(a, b) > 0) continue;
      return true;
    }
  }
  return false;
}

function averageRanks(values) {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const ranks = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++;
    for (let k = i; k <= j; k++) ranks[order[k]] = (i + j) / 2;
    i = j + 1;
  }
  return ranks;
}

function spearman(x, y) {
  const rx = averageRanks(x), ry = averageRanks(y);
  const n = x.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

describe('module loading', () => {
  test('exposes the core on window and via require', () => {
    expect(window.AlbumRankerCore).toBe(AlbumRankerCore);
    expect(AlbumRankerCore.INITIAL_RATING).toBe(1500);
  });

  test('defaults to the global EloRating and Math.random', () => {
    const core = new AlbumRankerCore(IDS);
    expect(core.elo).toBeInstanceOf(window.EloRating);
    expect(core.current()).toHaveLength(2);
  });
});

describe('fresh state', () => {
  test('every album starts at 1500 with no comparisons and nothing to undo', () => {
    const core = make();
    IDS.forEach(id => {
      expect(core.rating(id)).toBe(1500);
      expect(core.comparisonCount(id)).toBe(0);
    });
    expect(core.completed()).toBe(0);
    expect(core.canUndo()).toBe(false);
  });

  test('current() is stable until a choice or skip', () => {
    const core = make();
    const pair = core.current();
    expect(core.current()).toEqual(pair);
    expect(IDS).toEqual(expect.arrayContaining(pair));
    expect(pair[0]).not.toBe(pair[1]);
  });
});

describe('intro', () => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('all 17 albums appear within the first 9 picks (seed %i)', seed => {
    const core = make(IDS, seed);
    const seen = new Set();
    for (let i = 0; i < 9; i++) {
      const pair = core.current();
      // Both unseen while at least 2 albums are unseen
      if (IDS.length - seen.size >= 2) pair.forEach(id => expect(seen.has(id)).toBe(false));
      pair.forEach(id => seen.add(id));
      core.choose(pair[0]);
    }
    expect(seen.size).toBe(17);
  });

  test('the last unseen album meets its closest-rated rival', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const core = make(ids, 3);
    for (let i = 0; i < 2; i++) core.choose(core.current()[0]);
    const unseen = ids.find(id => core.comparisonCount(id) === 0);
    const pair = core.current();
    expect(pair).toContain(unseen);
    const prev = core.lastPair;
    const rival = pair.find(id => id !== unseen);
    const others = ids.filter(id => id !== unseen && !prev.includes(id));
    const best = Math.min(...others.map(id => Math.abs(core.rating(id) - 1500)));
    expect(Math.abs(core.rating(rival) - 1500)).toBe(best);
  });
});

describe('long sessions', () => {
  test.each([1, 2, 3])('136 picks use every pair exactly once, then current() is null (seed %i)', seed => {
    const core = make(IDS, seed);
    const random = seeded(seed + 100);
    const used = new Set();
    for (let i = 0; i < TOTAL_PAIRS; i++) {
      const pair = core.current();
      expect(pair).not.toBeNull();
      const k = key(...pair);
      expect(used.has(k)).toBe(false);
      used.add(k);
      expect(core.choose(pair[random() < 0.5 ? 0 : 1])).toBe(true);
    }
    expect(used.size).toBe(TOTAL_PAIRS);
    expect(core.completed()).toBe(TOTAL_PAIRS);
    expect(core.current()).toBeNull();
    expect(core.choose(IDS[0])).toBe(false);
    expect(core.skip()).toBe(false);
  });

  test('no album from the previous pair shows up next while an alternative exists', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const core = make(IDS, seed);
      let prev = null;
      let checked = 0;
      while (core.current()) {
        const pair = core.current();
        if (prev && hasFreshAlternative(core, prev)) {
          pair.forEach(id => expect(prev).not.toContain(id));
          checked++;
        }
        core.choose(pair[0]);
        prev = pair;
      }
      expect(checked).toBeGreaterThan(100);
    }
  });

  test('comparison counts stay balanced: least-compared album goes first', () => {
    const core = make(IDS, 7);
    for (let i = 0; i < 40; i++) core.choose(core.current()[1]);
    const counts = IDS.map(id => core.comparisonCount(id));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  test('left/right order is randomized', () => {
    const core = make(IDS, 11);
    let firstIsLowerIndex = 0;
    for (let i = 0; i < 60; i++) {
      const [a, b] = core.current();
      if (IDS.indexOf(a) < IDS.indexOf(b)) firstIsLowerIndex++;
      core.choose(a);
    }
    expect(firstIsLowerIndex).toBeGreaterThan(15);
    expect(firstIsLowerIndex).toBeLessThan(45);
  });
});

describe('choose', () => {
  test('updates both ratings, counts and history', () => {
    const core = make();
    const [a, b] = core.current();
    expect(core.choose(b)).toBe(true);
    expect(core.rating(b)).toBe(1524);
    expect(core.rating(a)).toBe(1476);
    expect(core.comparisonCount(a)).toBe(1);
    expect(core.comparisonCount(b)).toBe(1);
    expect(core.completed()).toBe(1);
    expect(core.canUndo()).toBe(true);
    expect(core.elo.hasBeenCompared(a, b)).toBe(true);
    expect(key(...core.current())).not.toBe(key(a, b));
  });

  test('an id outside the current pair returns false and changes nothing', () => {
    const core = make();
    const pair = core.current();
    const outsider = IDS.find(id => !pair.includes(id));
    expect(core.choose(outsider)).toBe(false);
    expect(core.choose('not-an-album')).toBe(false);
    expect(core.current()).toEqual(pair);
    expect(core.completed()).toBe(0);
    expect(core.canUndo()).toBe(false);
    IDS.forEach(id => expect(core.rating(id)).toBe(1500));
  });
});

describe('skip', () => {
  test('gives a different pair that does not reuse either skipped album, and the skipped pair is not re-offered next', () => {
    const core = make();
    for (let i = 0; i < 10; i++) core.choose(core.current()[0]);
    const skipped = core.current();
    expect(core.skip()).toBe(true);
    const next = core.current();
    expect(key(...next)).not.toBe(key(...skipped));
    next.forEach(id => expect(skipped).not.toContain(id));
    core.choose(next[0]);
    expect(key(...core.current())).not.toBe(key(...skipped));
    expect(core.completed()).toBe(11);
    expect(core.elo.getSkipCount(...skipped)).toBe(1);
  });

  test('skipped pairs are avoided while unskipped pairs remain', () => {
    const core = make(IDS, 5);
    const skipped = new Set();
    for (let i = 0; i < 10; i++) {
      skipped.add(key(...core.current()));
      core.skip();
    }
    for (let i = 0; i < TOTAL_PAIRS - skipped.size; i++) {
      const pair = core.current();
      expect(skipped.has(key(...pair))).toBe(false);
      core.choose(pair[0]);
    }
    // Only skipped pairs are left now, so they come back
    expect(skipped.has(key(...core.current()))).toBe(true);
  });

  test('a pair skipped 3 times is never offered again', () => {
    const core = make(['a', 'b', 'c'], 2);
    const offered = [];
    let guard = 0;
    while (core.current() && guard++ < 50) {
      offered.push(key(...core.current()));
      core.skip();
    }
    expect(core.current()).toBeNull();
    ['a|b', 'a|c', 'b|c'].forEach(k => expect(offered.filter(o => o === k)).toHaveLength(3));
  });

  test('a pair skipped 3 times stays out of a full session', () => {
    const core = make(IDS, 9);
    const banned = core.current();
    core.skip();
    let picks = 0;
    while (core.current()) {
      const pair = core.current();
      if (key(...pair) === key(...banned)) {
        // Only the skipped pair is left: it comes back until its third skip
        core.skip();
      } else {
        core.choose(pair[0]);
        picks++;
      }
    }
    expect(picks).toBe(TOTAL_PAIRS - 1);
    expect(core.elo.getSkipCount(...banned)).toBe(3);
    expect(core.current()).toBeNull();
  });
});

describe('undo', () => {
  test('restores exact ratings, counts, completed() and the current pair', () => {
    const core = make();
    for (let i = 0; i < 12; i++) core.choose(core.current()[i % 2]);
    const ratings = IDS.map(id => core.rating(id));
    const counts = IDS.map(id => core.comparisonCount(id));
    const pair = core.current();
    core.choose(pair[1]);
    expect(core.undo()).toBe(true);
    expect(IDS.map(id => core.rating(id))).toEqual(ratings);
    expect(IDS.map(id => core.comparisonCount(id))).toEqual(counts);
    expect(core.completed()).toBe(12);
    expect(core.current()).toEqual(pair);
    expect(core.elo.hasBeenCompared(...pair)).toBe(false);
  });

  test('several undos in a row walk back to the start', () => {
    const core = make(IDS, 4);
    const snapshots = [];
    for (let i = 0; i < 6; i++) {
      const pair = core.current();
      snapshots.push({ pair, ratings: IDS.map(id => core.rating(id)) });
      core.choose(pair[0]);
    }
    for (let i = 5; i >= 0; i--) {
      expect(core.undo()).toBe(true);
      expect(core.current()).toEqual(snapshots[i].pair);
      expect(IDS.map(id => core.rating(id))).toEqual(snapshots[i].ratings);
      expect(core.completed()).toBe(i);
    }
    expect(core.canUndo()).toBe(false);
    expect(core.undo()).toBe(false);
    IDS.forEach(id => expect(core.rating(id)).toBe(1500));
  });

  test('with no history returns false and changes nothing', () => {
    const core = make();
    const pair = core.current();
    expect(core.canUndo()).toBe(false);
    expect(core.undo()).toBe(false);
    expect(core.current()).toEqual(pair);
  });

  test('skips are not undone: undo reverts the last choice and keeps the skip count', () => {
    const core = make();
    const chosen = core.current();
    core.choose(chosen[0]);
    const skipped = core.current();
    core.skip();
    expect(core.undo()).toBe(true);
    expect(core.current()).toEqual(chosen);
    expect(core.completed()).toBe(0);
    expect(core.elo.getSkipCount(...skipped)).toBe(1);
    expect(core.undo()).toBe(false);
  });

  test('a skip alone leaves nothing to undo', () => {
    const core = make();
    core.skip();
    expect(core.canUndo()).toBe(false);
    expect(core.undo()).toBe(false);
  });

  test('choosing again after an undo continues normally', () => {
    const core = make();
    const pair = core.current();
    core.choose(pair[0]);
    core.undo();
    expect(core.choose(pair[1])).toBe(true);
    expect(core.rating(pair[1])).toBe(1524);
    expect(core.rating(pair[0])).toBe(1476);
    expect(core.completed()).toBe(1);
  });
});

describe('items', () => {
  test('null for unseen albums, ratings otherwise, in constructor order', () => {
    const core = make();
    expect(core.items()).toEqual(IDS.map(id => ({ id, score: null })));
    const [a, b] = core.current();
    core.choose(a);
    const items = core.items();
    expect(items.map(i => i.id)).toEqual(IDS);
    items.forEach(({ id, score }) => {
      if (id === a) expect(score).toBe(1524);
      else if (id === b) expect(score).toBe(1476);
      else expect(score).toBeNull();
    });
  });

  test('every album has a numeric score once the intro is done', () => {
    const core = make();
    for (let i = 0; i < 9; i++) core.choose(core.current()[0]);
    core.items().forEach(({ score }) => expect(Number.isInteger(score)).toBe(true));
  });

  test('custom order is preserved', () => {
    const ids = ['z', 'm', 'a'];
    expect(make(ids).items().map(i => i.id)).toEqual(ids);
  });
});

describe('reset', () => {
  test('clears ratings, comparisons, skips, history and the pending pair', () => {
    const core = make();
    for (let i = 0; i < 8; i++) core.choose(core.current()[0]);
    const skipped = core.current();
    core.skip();
    core.reset();
    IDS.forEach(id => {
      expect(core.rating(id)).toBe(1500);
      expect(core.comparisonCount(id)).toBe(0);
    });
    expect(core.completed()).toBe(0);
    expect(core.canUndo()).toBe(false);
    expect(core.undo()).toBe(false);
    expect(core.elo.getSkipCount(...skipped)).toBe(0);
    expect(core.lastPair).toBeNull();
    expect(core.items().every(i => i.score === null)).toBe(true);
    const pair = core.current();
    pair.forEach(id => expect(core.comparisonCount(id)).toBe(0));
  });
});

describe('ranking quality', () => {
  // A user with a hidden preference order who always picks the album they like more
  function simulate(seed, picks) {
    const core = make(IDS, seed);
    const shuffle = seeded(seed + 1000);
    const order = [...IDS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const strength = new Map(order.map((id, i) => [id, order.length - i]));
    const out = {};
    for (let n = 1; n <= Math.max(...picks); n++) {
      const [a, b] = core.current();
      core.choose(strength.get(a) > strength.get(b) ? a : b);
      if (picks.includes(n)) {
        const items = core.items();
        out[n] = spearman(items.map(i => i.score ?? -Infinity), items.map(i => strength.get(i.id)));
      }
    }
    return out;
  }

  test('Spearman correlation with the true order at 15 and 30 picks across 50 seeds', () => {
    const at15 = [], at30 = [];
    for (let seed = 1; seed <= 50; seed++) {
      const r = simulate(seed, [15, 30]);
      at15.push(r[15]);
      at30.push(r[30]);
    }
    const mean = v => v.reduce((s, x) => s + x, 0) / v.length;
    // Observed (these 50 seeds): 15 picks mean 0.77, min 0.51; 30 picks mean 0.89, min 0.82
    expect(mean(at15)).toBeGreaterThanOrEqual(0.65);
    expect(Math.min(...at15)).toBeGreaterThanOrEqual(0.4);
    expect(mean(at30)).toBeGreaterThanOrEqual(0.85);
    expect(Math.min(...at30)).toBeGreaterThanOrEqual(0.7);
  });
});
