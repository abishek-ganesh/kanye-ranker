/**
 * Tests for TasteCore (js/taste-core.js): eras, era breakdown percents and the /api/taste request body.
 */

const TasteCore = require('../../js/taste-core.js');
const { albums } = require('../../data/songs.json');

const { TONES, TOP_MIN, TOP_MAX, BOTTOM_MAX, ERAS, eraOf, eraBreakdown, buildRequest } = TasteCore;

const ids = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
const percents = rows => rows.map(row => row.percent);
const sum = list => list.reduce((total, value) => total + value, 0);

// One representative year per era, in ERAS order
const ERA_YEARS = [2004, 2010, 2016, 2024];

// Every way to split `total` songs across the four eras
function splits(total) {
  const out = [];
  for (let a = 0; a <= total; a++) {
    for (let b = 0; a + b <= total; b++) {
      for (let c = 0; a + b + c <= total; c++) out.push([a, b, c, total - a - b - c]);
    }
  }
  return out;
}

const yearsFor = counts => counts.flatMap((count, era) => Array(count).fill(ERA_YEARS[era]));

describe('TasteCore constants', () => {
  test('is exposed on window for the browser as well as through require', () => {
    expect(window.TasteCore).toBe(TasteCore);
  });

  test('tones and request limits', () => {
    expect(TONES).toEqual(['roast', 'hype']);
    expect(TOP_MIN).toBe(5);
    expect(TOP_MAX).toBe(10);
    expect(BOTTOM_MAX).toBe(3);
    expect(TOP_MIN).toBeLessThanOrEqual(TOP_MAX);
  });

  test('eras are in ascending order and the last one is open ended', () => {
    expect(ERAS.map(era => era.id)).toEqual(['college', 'experimental', 'modern', 'new']);
    const untils = ERAS.map(era => era.until);
    expect([...untils].sort((a, b) => a - b)).toEqual(untils);
    expect(new Set(untils).size).toBe(untils.length);
    expect(untils[untils.length - 1]).toBe(Infinity);
    ERAS.forEach(era => expect(era.name).toEqual(expect.any(String)));
  });
});

describe('eraOf', () => {
  test.each([
    [2004, 'college'],
    [2007, 'college'],
    [2008, 'experimental'],
    [2013, 'experimental'],
    [2014, 'modern'],
    [2016, 'modern'],
    [2019, 'modern'],
    [2020, 'new'],
    [2021, 'new'],
    [2026, 'new'],
    [2040, 'new']
  ])('%i is in the %s era', (year, eraId) => {
    expect(eraOf(year).id).toBe(eraId);
  });

  test('returns the era object from ERAS', () => {
    expect(eraOf(2010)).toBe(ERAS[1]);
  });

  test('a year before the first album still lands in the first era', () => {
    expect(eraOf(1999).id).toBe('college');
  });

  test('every album in the catalog maps to the era fans would expect', () => {
    const byEra = { college: [], experimental: [], modern: [], new: [] };
    albums.forEach(album => byEra[eraOf(album.year).id].push(album.id));
    expect(byEra.college).toEqual(['cd', 'lr', 'grad']);
    expect(byEra.experimental).toEqual(['808s', 'mbdtf', 'wtt', 'cruel', 'yeezus']);
    expect(byEra.modern).toEqual(['tlop', 'ye', 'ksg', 'jik']);
    expect(byEra.new).toEqual(['donda', 'donda2', 'v1', 'v2', 'bully']);
  });
});

describe('eraBreakdown', () => {
  test('empty input lists every era at 0', () => {
    const rows = eraBreakdown([]);
    expect(rows).toEqual(ERAS.map(era => ({ id: era.id, name: era.name, count: 0, percent: 0 })));
  });

  test('every era is listed in ERAS order with id, name, count and percent only', () => {
    const rows = eraBreakdown([2024, 2004, 2024]);
    expect(rows.map(row => row.id)).toEqual(ERAS.map(era => era.id));
    expect(rows.map(row => row.name)).toEqual(ERAS.map(era => era.name));
    rows.forEach(row => expect(Object.keys(row).sort()).toEqual(['count', 'id', 'name', 'percent']));
    expect(rows.map(row => row.count)).toEqual([1, 0, 0, 2]);
  });

  test('a single era gets 100', () => {
    expect(percents(eraBreakdown([2010, 2011, 2013]))).toEqual([0, 100, 0, 0]);
  });

  test('an even split needs no rounding', () => {
    expect(percents(eraBreakdown([2004, 2010, 2016, 2024]))).toEqual([25, 25, 25, 25]);
    expect(percents(eraBreakdown([2004, 2005, 2021, 2022]))).toEqual([50, 0, 0, 50]);
  });

  test('three eras with one song each: 34/33/33, never 33/33/33', () => {
    const rows = eraBreakdown([2004, 2010, 2016]);
    expect(sum(percents(rows))).toBe(100);
    expect(percents(rows)).toEqual([34, 33, 33, 0]);
  });

  test('seven songs split 3/2/1/1 round to 43/29/14/14', () => {
    const rows = eraBreakdown(yearsFor([3, 2, 1, 1]));
    expect(percents(rows)).toEqual([43, 29, 14, 14]);
  });

  test('the leftover point goes to the era that was rounded down the most', () => {
    // 1/6 = 16.67, 5/6 = 83.33: the single song has the larger remainder
    expect(percents(eraBreakdown(yearsFor([5, 0, 1, 0])))).toEqual([83, 0, 17, 0]);
  });

  test('ten songs (a full top 10) give multiples of 10', () => {
    expect(percents(eraBreakdown(yearsFor([3, 4, 2, 1])))).toEqual([30, 40, 20, 10]);
    expect(percents(eraBreakdown(yearsFor([7, 0, 3, 0])))).toEqual([70, 0, 30, 0]);
  });

  test('order of the input years does not matter', () => {
    const a = eraBreakdown([2004, 2010, 2016, 2016, 2024, 2024, 2024]);
    const b = eraBreakdown([2024, 2016, 2024, 2010, 2024, 2004, 2016]);
    expect(a).toEqual(b);
  });

  test('for every split of 1 to 12 songs: sums to 100, stays within a point of exact, empty eras stay 0', () => {
    for (let total = 1; total <= 12; total++) {
      splits(total).forEach(counts => {
        const rows = eraBreakdown(yearsFor(counts));
        const label = `split ${counts.join('/')}`;
        expect({ label, sum: sum(percents(rows)) }).toEqual({ label, sum: 100 });
        rows.forEach((row, index) => {
          const exact = (counts[index] / total) * 100;
          expect(row.count).toBe(counts[index]);
          expect(Number.isInteger(row.percent)).toBe(true);
          expect(Math.abs(row.percent - exact)).toBeLessThan(1);
          if (counts[index] === 0) expect(row.percent).toBe(0);
        });
      });
    }
  });

  test('a bigger era never shows a smaller percent than a smaller era', () => {
    for (let total = 1; total <= 12; total++) {
      splits(total).forEach(counts => {
        const rows = eraBreakdown(yearsFor(counts));
        rows.forEach(a => rows.forEach(b => {
          if (a.count > b.count) expect(a.percent).toBeGreaterThanOrEqual(b.percent);
        }));
      });
    }
  });

  test('does not mutate its input', () => {
    const years = [2024, 2004, 2010];
    eraBreakdown(years);
    expect(years).toEqual([2024, 2004, 2010]);
  });
});

describe('buildRequest', () => {
  test('first 10 shown are top, the 11th is missed, the worst 3 other compared songs are bottom, worst first', () => {
    const shown = ids('s', 11);
    const compared = [...shown, 'c12', 'c13', 'c14', 'c15', 'c16'];
    expect(buildRequest('roast', shown, compared)).toEqual({
      tone: 'roast',
      top: ids('s', 10),
      missed: 's11',
      bottom: ['c16', 'c15', 'c14']
    });
  });

  test('the tone is passed through', () => {
    expect(buildRequest('hype', ids('s', 10), ids('s', 10)).tone).toBe('hype');
  });

  test('missed is null when only 10 songs are shown', () => {
    const shown = ids('s', 10);
    const request = buildRequest('roast', shown, [...shown, 'x', 'y']);
    expect(request.missed).toBeNull();
    expect(request.top).toEqual(shown);
    expect(request.bottom).toEqual(['y', 'x']);
  });

  test('fewer than 10 shown: all of them are top, nothing is missed', () => {
    const shown = ids('s', 6);
    const request = buildRequest('roast', shown, [...shown, 'x']);
    expect(request.top).toEqual(shown);
    expect(request.missed).toBeNull();
    expect(request.bottom).toEqual(['x']);
  });

  test('songs shown beyond the 11th are not sent as top or missed', () => {
    const shown = ids('s', 14);
    const request = buildRequest('roast', shown, shown);
    expect(request.top).toHaveLength(TOP_MAX);
    expect(request.missed).toBe('s11');
    expect(request.bottom).toEqual(['s14', 's13', 's12']);
  });

  test('bottom never repeats a top pick or the song that just missed', () => {
    const shown = ids('s', 11);
    // Only one compared song is not already in use
    expect(buildRequest('roast', shown, [...shown, 'last']).bottom).toEqual(['last']);
    // Nothing left over at all
    expect(buildRequest('roast', shown, shown).bottom).toEqual([]);
    // Fewer compared songs than shown ones
    expect(buildRequest('roast', shown, shown.slice(0, 5)).bottom).toEqual([]);
  });

  test('bottom skips used ids wherever they sit in the compared order', () => {
    const shown = ids('s', 11);
    // A top pick and the missed song sit at the very end of the compared list
    const compared = ['a', 'b', 'c', 'd', 's3', 's11'];
    expect(buildRequest('roast', shown, compared).bottom).toEqual(['d', 'c', 'b']);
  });

  test('bottom is capped at BOTTOM_MAX', () => {
    const shown = ids('s', 11);
    const request = buildRequest('roast', shown, [...shown, ...ids('c', 40)]);
    expect(request.bottom).toHaveLength(BOTTOM_MAX);
    expect(request.bottom).toEqual(['c40', 'c39', 'c38']);
  });

  test('no id appears twice across top, missed and bottom', () => {
    const shown = ids('s', 11);
    const { top, missed, bottom } = buildRequest('roast', shown, [...ids('c', 4), ...shown.slice().reverse()]);
    const all = [...top, missed, ...bottom];
    expect(new Set(all).size).toBe(all.length);
  });

  test('does not mutate its inputs', () => {
    const shown = ids('s', 12);
    const compared = [...shown, 'x', 'y', 'z'];
    const shownCopy = [...shown];
    const comparedCopy = [...compared];
    buildRequest('roast', shown, compared);
    expect(shown).toEqual(shownCopy);
    expect(compared).toEqual(comparedCopy);
  });
});
