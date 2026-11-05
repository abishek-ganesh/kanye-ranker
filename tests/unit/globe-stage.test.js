/**
 * Tests for GlobeStageCore (js/globe-stage.js): scene timeline, washes and color LUT.
 */

const fs = require('fs');
const path = require('path');

const Core = require('../../js/globe-stage.js');

const ALLOWED_WASH_IDS = ['grad', 'mbdtf', 'yeezus', 'ye', 'cd', 'bully'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const CYCLE = 31;

// Samples t from start to end (exclusive) in fixed steps
function range(start, end, step) {
  const out = [];
  for (let t = start; t < end - 1e-9; t += step) out.push(Number(t.toFixed(4)));
  return out;
}

const washNames = () => Core.WASHES.map(w => w.name);
const washIds = () => Core.WASHES.map(w => w.id);

describe('module loading', () => {
  test('requiring without #globe-stage in the DOM does not throw and exposes the core', () => {
    expect(document.getElementById('globe-stage')).toBeNull();
    expect(Core).toBeDefined();
    expect(window.GlobeStageCore).toBe(Core);
  });
});

describe('constants', () => {
  test('TIMELINE is earth, wash, moon over a 31s cycle', () => {
    expect(Core.TIMELINE).toEqual([
      { type: 'earth', dur: 9 },
      { type: 'wash', dur: 14 },
      { type: 'moon', dur: 8 }
    ]);
    expect(Core.TIMELINE.reduce((s, seg) => s + seg.dur, 0)).toBe(CYCLE);
  });

  test('XFADE and WASH_STEP', () => {
    expect(Core.XFADE).toBe(1.4);
    expect(Core.WASH_STEP).toBe(3.5);
  });
});

describe('WASHES', () => {
  test('is a non-empty list with unique, allowed ids', () => {
    expect(Array.isArray(Core.WASHES)).toBe(true);
    expect(Core.WASHES.length).toBeGreaterThan(0);
    const ids = washIds();
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(ALLOWED_WASH_IDS).toContain(id));
  });

  test('every entry has a name, 3 hex stops and 2 hex beams', () => {
    Core.WASHES.forEach(w => {
      expect(typeof w.name).toBe('string');
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.stops).toHaveLength(3);
      expect(w.beams).toHaveLength(2);
      [...w.stops, ...w.beams].forEach(hex => expect(hex).toMatch(HEX));
    });
  });

  test('ids match keys in album-colors.js', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../js/album-colors.js'), 'utf-8');
    washIds().forEach(id => expect(src).toMatch(new RegExp(`['"]?${id}['"]?\\s*:\\s*\\{`)));
  });
});

describe('hexToRgb', () => {
  test('parses #rrggbb into an rgb triple', () => {
    expect(Core.hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(Core.hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(Core.hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(Core.hexToRgb('#1a2b3c')).toEqual([26, 43, 60]);
  });
});

describe('buildLut', () => {
  const rgbAt = (lut, i) => [lut[i * 3], lut[i * 3 + 1], lut[i * 3 + 2]];

  test('returns the same Float32Array it was given', () => {
    const out = new Float32Array(768);
    expect(Core.buildLut(['#000000', '#808080', '#ffffff'], out)).toBe(out);
  });

  test('ramps stops[0] -> stops[1] (middle) -> stops[2]', () => {
    const stops = ['#ff0000', '#00ff00', '#0000ff'];
    const lut = Core.buildLut(stops, new Float32Array(768));
    const [s0, s1, s2] = stops.map(Core.hexToRgb);

    rgbAt(lut, 0).forEach((v, k) => expect(v).toBeCloseTo(s0[k], 0));
    rgbAt(lut, 255).forEach((v, k) => expect(v).toBeCloseTo(s2[k], 0));
    [127, 128].forEach(i => {
      rgbAt(lut, i).forEach((v, k) => expect(Math.abs(v - s1[k])).toBeLessThanOrEqual(3));
    });
  });

  test('a dark-to-light ramp is non-decreasing on every channel', () => {
    const lut = Core.buildLut(['#000000', '#404040', '#ffffff'], new Float32Array(768));
    for (let i = 1; i < 256; i++) {
      for (let k = 0; k < 3; k++) {
        expect(lut[i * 3 + k]).toBeGreaterThanOrEqual(lut[(i - 1) * 3 + k]);
      }
    }
  });

  test('uses the real wash stops without producing NaN', () => {
    Core.WASHES.forEach(w => {
      const lut = Core.buildLut(w.stops, new Float32Array(768));
      expect(Array.from(lut).every(Number.isFinite)).toBe(true);
    });
  });
});

describe('sceneAt fixed modes', () => {
  const times = range(0, 70, 1.3);

  test('earth mode is always Earth with no crossfade', () => {
    times.forEach(t => {
      const s = Core.sceneAt(t, 'earth');
      expect(s.a.type).toBe('earth');
      expect(s.b).toBeNull();
      expect(s.m).toBe(0);
      expect(s.label).toBe('Earth');
    });
  });

  test('moon mode is always Moon with no crossfade', () => {
    times.forEach(t => {
      const s = Core.sceneAt(t, 'moon');
      expect(s.a.type).toBe('moon');
      expect(s.b).toBeNull();
      expect(s.m).toBe(0);
      expect(s.label).toBe('Moon');
    });
  });

  test('wash mode returns wash looks built from WASHES entries', () => {
    times.forEach(t => {
      const s = Core.sceneAt(t, 'wash');
      expect(s.a.type).toBe('wash');
      expect(s.b).toBeNull();
      expect(washIds()).toContain(s.a.w1.id);
      expect(washIds()).toContain(s.a.w2.id);
      expect(s.a.m).toBeGreaterThanOrEqual(0);
      expect(s.a.m).toBeLessThanOrEqual(1);
      expect(washNames()).toContain(s.label);
    });
  });

  test('wash mode cycles through every wash name', () => {
    const seen = new Set();
    range(0, Core.WASHES.length * Core.WASH_STEP, 0.25).forEach(t => {
      seen.add(Core.sceneAt(t, 'wash').label);
    });
    expect([...seen].sort()).toEqual(washNames().slice().sort());
  });
});

describe('sceneAt auto mode', () => {
  test('defaults to auto', () => {
    [1, 12, 26].forEach(t => expect(Core.sceneAt(t)).toEqual(Core.sceneAt(t, 'auto')));
  });

  test('shows earth, then wash, then moon, then loops', () => {
    const earth = Core.sceneAt(1, 'auto');
    expect(earth.a.type).toBe('earth');
    expect(earth.b).toBeNull();
    expect(earth.m).toBe(0);
    expect(earth.label).toBe('Earth');

    const wash = Core.sceneAt(12, 'auto');
    expect(wash.a.type).toBe('wash');
    expect(washNames()).toContain(wash.label);

    const moon = Core.sceneAt(26, 'auto');
    expect(moon.a.type).toBe('moon');
    expect(moon.label).toBe('Moon');

    const again = Core.sceneAt(32, 'auto');
    expect(again.a.type).toBe('earth');
    expect(again.b).toBeNull();
  });

  test('repeats every 31 seconds', () => {
    [0.5, 4, 8.3, 12, 20, 26, 30.5].forEach(t => {
      const s1 = Core.sceneAt(t, 'auto');
      const s2 = Core.sceneAt(t + CYCLE, 'auto');
      expect(s2.a.type).toBe(s1.a.type);
      expect(s2.b ? s2.b.type : null).toBe(s1.b ? s1.b.type : null);
      expect(s2.m).toBeCloseTo(s1.m, 5);
      // Wash albums deliberately continue across cycles, so only non-wash labels repeat
      const hasWash = s1.a.type === 'wash' || (s1.b && s1.b.type === 'wash');
      if (!hasWash) expect(s2.label).toBe(s1.label);
    });
  });

  test('each cycle picks up the album sequence where the last wash stopped', () => {
    const perCycle = Math.round(14 / Core.WASH_STEP);
    const first = Core.sceneAt(9 + 0.5, 'auto');
    const next = Core.sceneAt(CYCLE + 9 + 0.5, 'auto');
    const idx = name => Core.WASHES.findIndex(w => w.name === name);
    expect(idx(next.label)).toBe((idx(first.label) + perCycle) % Core.WASHES.length);
  });

  test('crossfades earth -> wash in the last XFADE seconds of earth', () => {
    const before = Core.sceneAt(9 - Core.XFADE - 0.1, 'auto');
    expect(before.a.type).toBe('earth');
    expect(before.b).toBeNull();

    const s = Core.sceneAt(8.3, 'auto');
    expect(s.a.type).toBe('earth');
    expect(s.b).not.toBeNull();
    expect(s.b.type).toBe('wash');
    expect(s.m).toBeGreaterThan(0);
    expect(s.m).toBeLessThan(1);
  });

  test('crossfades wash -> moon at the end of the wash segment', () => {
    const s = Core.sceneAt(23 - Core.XFADE / 2, 'auto');
    expect(s.a.type).toBe('wash');
    expect(s.b).not.toBeNull();
    expect(s.b.type).toBe('moon');
  });

  test('crossfades moon -> earth at the end of the cycle', () => {
    const s = Core.sceneAt(30.5, 'auto');
    expect(s.a.type).toBe('moon');
    expect(s.b).not.toBeNull();
    expect(s.b.type).toBe('earth');
    expect(s.m).toBeGreaterThan(0);
    expect(s.m).toBeLessThan(1);
  });

  test('m rises monotonically through each crossfade window', () => {
    [9, 23, 31].forEach(end => {
      const ms = range(end - Core.XFADE + 0.05, end - 0.01, 0.05).map(t => {
        const s = Core.sceneAt(t, 'auto');
        expect(s.b).not.toBeNull();
        return s.m;
      });
      for (let i = 1; i < ms.length; i++) expect(ms[i]).toBeGreaterThanOrEqual(ms[i - 1]);
      expect(ms[ms.length - 1]).toBeGreaterThan(ms[0]);
      ms.forEach(m => {
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(1);
      });
    });
  });

  test('m is 0 whenever there is no crossfade', () => {
    range(0, CYCLE, 0.2).forEach(t => {
      const s = Core.sceneAt(t, 'auto');
      if (s.b === null) expect(s.m).toBe(0);
    });
  });
});

describe('tap callouts', () => {
  const fresh = () => ({ taps: 0, tour: 0 });
  const songs = require('../../data/songs.json').songs;

  test('every wash topSong is that album\'s most-streamed song in songs.json', () => {
    Core.WASHES.forEach(w => {
      const top = songs
        .filter(s => s.albumId === w.id)
        .sort((a, b) => b.spotifyStreams - a.spotifyStreams)[0];
      expect(top).toBeDefined();
      expect(w.topSong).toBe(top.title);
    });
  });

  test('tour lines all have text and a source', () => {
    expect(Core.TOUR_LINES.length).toBeGreaterThan(1);
    Core.TOUR_LINES.forEach(l => {
      expect(l.text.length).toBeGreaterThan(0);
      expect(l.source.length).toBeGreaterThan(0);
    });
  });

  test('the first tap is always the SoFi line, even on an album wash', () => {
    ['Earth', 'Moon', 'MBDTF'].forEach(label => {
      expect(Core.tapLine(label, fresh())).toBe(Core.TOUR_LINES[0]);
    });
  });

  test('later taps on a wash show that album\'s most-streamed song', () => {
    const state = fresh();
    Core.tapLine('Earth', state);
    const line = Core.tapLine('Graduation', state);
    expect(line.text).toContain('Stronger');
    expect(line.source).toContain('Graduation');
  });

  test('Earth and Moon taps walk through every tour line before repeating', () => {
    const state = fresh();
    const n = Core.TOUR_LINES.length;
    const seen = [];
    for (let i = 0; i < n; i++) seen.push(Core.tapLine(i % 2 ? 'Moon' : 'Earth', state));
    expect(new Set(seen).size).toBe(n);
    expect(Core.tapLine('Earth', state)).toBe(Core.TOUR_LINES[0]);
  });

  test('wash taps do not use up a tour line', () => {
    const state = fresh();
    Core.tapLine('Earth', state);
    Core.tapLine('Yeezus', state);
    expect(Core.tapLine('Moon', state)).toBe(Core.TOUR_LINES[1]);
  });
});
