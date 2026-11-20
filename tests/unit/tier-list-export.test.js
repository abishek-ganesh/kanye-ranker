/**
 * Tests for the pure helpers in js/tier-list-export.js: reveal pacing, schedule and tile fitting.
 */

require('../../js/tier-list.js');
const TierListExport = require('../../js/tier-list-export.js');

const { revealTimeline, revealSchedule, fitTileSize } = TierListExport;

describe('module loading', () => {
  test('loads without export.js and exposes the static helpers', () => {
    expect(window.TierListExport).toBe(TierListExport);
    expect(typeof revealTimeline).toBe('function');
    expect(typeof fitTileSize).toBe('function');
    expect(typeof TierListExport.videoSupport).toBe('function');
  });

  test('videoSupport reports unsupported without MediaRecorder', () => {
    expect(TierListExport.videoSupport()).toEqual({ supported: false, mimeType: null, extension: null });
  });
});

describe('revealTimeline', () => {
  test('perTile clamps between 90 and 220ms', () => {
    expect(revealTimeline(5).perTile).toBe(220);
    expect(revealTimeline(200).perTile).toBe(90);
    expect(revealTimeline(40).perTile).toBeCloseTo(137.5);
  });

  test('total is intro + tiles + S pause + hold', () => {
    [5, 17, 35, 120].forEach(n => {
      const t = revealTimeline(n);
      expect(t.total).toBeCloseTo(t.intro + n * t.perTile + t.sPause + t.hold);
    });
  });

  test('an empty board has no S pause', () => {
    const t = revealTimeline(0);
    expect(t.sPause).toBe(0);
    expect(t.total).toBe(t.intro + t.hold);
  });

  test('a 35-song reveal stays short enough for a TikTok clip', () => {
    expect(revealTimeline(35).total).toBeLessThan(10000);
  });
});

describe('revealSchedule', () => {
  test('starts increase and the S pause lands before the first S tile', () => {
    const board = window.TierListCore.emptyBoard();
    board.S = ['s1', 's2'];
    board.B = ['b1'];
    board.D = ['d1', 'd2'];
    const { order, starts, firstS, timeline } = revealSchedule(board);
    expect(order.map(o => o.id)).toEqual(['d1', 'd2', 'b1', 's1', 's2']);
    expect(firstS).toBe(3);
    for (let i = 1; i < starts.length; i++) expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    expect(starts[3] - starts[2]).toBeCloseTo(timeline.perTile + timeline.sPause);
    expect(starts[4] - starts[3]).toBeCloseTo(timeline.perTile);
  });
});

describe('fitTileSize', () => {
  const WIDTH = 860;
  const HEIGHT = 1470;

  test('an empty board uses the largest tile', () => {
    const fit = fitTileSize([0, 0, 0, 0, 0], WIDTH, HEIGHT);
    expect(fit.size).toBe(170);
    expect(fit.fits).toBe(true);
  });

  test('more items never give a bigger tile', () => {
    const sizes = [5, 17, 35, 80, 120, 198].map(n => {
      const shares = [0.1, 0.2, 0.3, 0.25, 0.15].map(s => Math.round(n * s));
      return fitTileSize(shares, WIDTH, HEIGHT).size;
    });
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
  });

  test('even all 198 songs fit in the frame', () => {
    const fit = fitTileSize([20, 40, 59, 50, 29], WIDTH, HEIGHT);
    expect(fit.fits).toBe(true);
    expect(fit.totalHeight).toBeLessThanOrEqual(HEIGHT);
    expect(fit.size).toBeGreaterThanOrEqual(52);
  });

  test('rows fit the width and every row has at least one line', () => {
    const fit = fitTileSize([4, 7, 10, 9, 5], WIDTH, HEIGHT);
    expect(fit.perRow * fit.size + (fit.perRow - 1) * fit.gap + fit.pad * 2).toBeLessThanOrEqual(WIDTH);
    fit.rowHeights.forEach(h => expect(h).toBeGreaterThanOrEqual(fit.size + fit.pad * 2));
  });
});
