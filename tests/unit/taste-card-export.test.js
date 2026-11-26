/**
 * Tests for js/taste-card-export.js: text wrapping and fitting, file names, and what render draws.
 * jsdom has no canvas, so render runs against a recording 2D context whose text is 0.5em per character.
 */

const TasteCardExport = require('../../js/taste-card-export.js');

const { wrapText, balanceText, fitText, fileName, render, layout, toBlob, WIDTH, HEIGHT } = TasteCardExport;

function fontSize(font) {
  return parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]);
}

function makeCtx() {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = {
    font: '10px sans-serif',
    textAlign: 'left',
    calls: [],
    measureText(text) {
      return { width: [...String(text)].length * fontSize(this.font) * 0.5 };
    },
    fillText(text, x, y) {
      this.calls.push({ text, x, y, font: this.font, align: this.textAlign, width: this.measureText(text).width });
    },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient
  };
  ['fillRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'arc', 'clip', 'save', 'restore', 'roundRect']
    .forEach(name => { ctx[name] = noop; });
  return ctx;
}

function makeCanvas() {
  const ctx = makeCtx();
  return { width: 0, height: 0, ctx, getContext: () => ctx };
}

// Everything drawn, in order; letter-spaced labels are drawn one character at a time, so join without separators
function drawnText(canvas) {
  return canvas.ctx.calls.map(c => c.text).join('');
}

function drawnStrings(canvas) {
  return canvas.ctx.calls.map(c => c.text);
}

const squash = text => text.replace(/\s+/g, '');

function repeatTo(text, length) {
  let out = text;
  while (out.length < length) out += ` ${text}`;
  return out.slice(0, length).trim();
}

const ERAS = [
  { id: 'college', name: 'College Trilogy', count: 5, percent: 50 },
  { id: 'experimental', name: 'Experimental Era', count: 4, percent: 40 },
  { id: 'modern', name: 'Modern Ye', count: 1, percent: 10 },
  { id: 'new', name: 'New Chapter', count: 0, percent: 0 }
];

const TOP_SONGS = [
  { title: 'Heartless', album: '808s & Heartbreak' },
  { title: 'N****s in Paris', album: 'Watch the Throne' },
  { title: 'Stronger', album: 'Graduation' }
];

const ROAST = {
  tone: 'roast',
  archetype: 'Certified Greatest Hits Loyalist',
  lines: [
    "How could you be so heartless? Heartless at #1 and all of Bully at the bottom. You didn't even give Mama's Favorite a chance.",
    'Ten hits out of ten. No deep cuts. I specifically ordered a list with risk in it, and you sent back the radio!!!',
    'Bow in the presence of greatness, and you ranked OK dead last. Run away fast as you can from the new album, huh?'
  ],
  quote: "I hate when I'm on a plane and I wake up with a water bottle next to me like oh great now I gotta be responsible for this water bottle.",
  fallback: false
};

const WORST = {
  card: {
    tone: 'hype',
    archetype: repeatTo('Unapologetic Yeezus Season Maximalist', 40),
    lines: [1, 2, 3].map(i => repeatTo(`Line ${i} put Father Stretch My Hands, Pt. 1 above Diamonds from Sierra Leone (Remix) and called it a personality.`, 180)),
    quote: repeatTo("I feel like I'm too busy writing history to read it, and my greatest pain in life is that I will never be able to see myself perform live.", 280),
    fallback: false
  },
  eras: ERAS.map(era => ({ ...era, count: era.id === 'new' ? 1 : 3, percent: era.id === 'new' ? 10 : 30 })),
  topSongs: [
    { title: 'Diamonds from Sierra Leone (Remix)', album: 'Late Registration' },
    { title: 'Father Stretch My Hands, Pt. 1', album: 'The Life of Pablo' },
    { title: 'All of the Lights (Interlude)', album: 'My Beautiful Dark Twisted Fantasy' }
  ]
};

// Every piece of text stays inside the frame, and the blocks stack without touching
function expectInsideFrame(canvas, data) {
  canvas.ctx.calls.forEach(call => {
    const left = call.align === 'center' ? call.x - call.width / 2 : call.align === 'right' ? call.x - call.width : call.x;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + call.width).toBeLessThanOrEqual(WIDTH);
    expect(call.y).toBeGreaterThan(0);
    expect(call.y).toBeLessThan(HEIGHT);
  });
  const plan = layout(makeCtx(), data);
  expect(plan.blocks[0].y).toBeGreaterThanOrEqual(plan.top);
  plan.blocks.forEach((block, i) => {
    const next = plan.blocks[i + 1];
    const end = block.y + block.height;
    expect(end).toBeLessThanOrEqual(next ? next.y : plan.bottom + 1);
  });
  return plan;
}

describe('module loading', () => {
  test('exposes the contract on window and module.exports', () => {
    expect(window.TasteCardExport).toBe(TasteCardExport);
    expect(WIDTH).toBe(1080);
    expect(HEIGHT).toBe(1920);
    ['render', 'toBlob', 'fileName', 'wrapText', 'fitText'].forEach(name => {
      expect(typeof TasteCardExport[name]).toBe('function');
    });
  });
});

describe('fileName', () => {
  test('names the file after the tone', () => {
    expect(fileName({ tone: 'roast' })).toBe('kanye-ranker-roast.png');
    expect(fileName({ tone: 'hype' })).toBe('kanye-ranker-hype.png');
  });

  test('an unknown or missing tone falls back to roast', () => {
    expect(fileName({ tone: 'sermon' })).toBe('kanye-ranker-roast.png');
    expect(fileName()).toBe('kanye-ranker-roast.png');
  });
});

describe('wrapText', () => {
  const ctx = makeCtx();
  ctx.font = '20px sans-serif'; // 10px per character

  test('breaks on word boundaries and keeps every word', () => {
    const text = 'I specifically ordered a list with risk in it, and you sent back the radio';
    const lines = wrapText(ctx, text, 200);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(line => expect(ctx.measureText(line).width).toBeLessThanOrEqual(200));
    expect(lines.join(' ')).toBe(text);
  });

  test('short text stays on one line and empty text gives no lines', () => {
    expect(wrapText(ctx, 'Day One', 200)).toEqual(['Day One']);
    expect(wrapText(ctx, '', 200)).toEqual([]);
    expect(wrapText(ctx, null, 200)).toEqual([]);
  });

  test('collapses stray whitespace and newlines', () => {
    expect(wrapText(ctx, '  Bow in the\n presence  ', 400)).toEqual(['Bow in the presence']);
  });

  test('a word wider than the box is split instead of overflowing', () => {
    const lines = wrapText(ctx, `ok ${'W'.repeat(45)} ok`, 200);
    lines.forEach(line => expect(ctx.measureText(line).width).toBeLessThanOrEqual(200));
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(squash(lines.join(''))).toBe(`ok${'W'.repeat(45)}ok`);
  });
});

describe('balanceText', () => {
  const ctx = makeCtx();
  ctx.font = '20px sans-serif';

  test('keeps the line count but does not leave a stray last word', () => {
    const text = 'Certified Greatest Hits Loyalist';
    const greedy = wrapText(ctx, text, 240);
    const balanced = balanceText(ctx, text, 240);
    expect(greedy).toEqual(['Certified Greatest Hits', 'Loyalist']);
    expect(balanced).toEqual(['Certified Greatest', 'Hits Loyalist']);
  });

  test('leaves a single line alone', () => {
    expect(balanceText(ctx, 'Day One', 240)).toEqual(['Day One']);
  });
});

describe('fitText', () => {
  const font = size => `${size}px sans-serif`;

  test('uses the largest size when there is room', () => {
    const fit = fitText(makeCtx(), 'Day One', { width: 900, max: 120, min: 50, maxLines: 2, font });
    expect(fit.size).toBe(120);
    expect(fit.fits).toBe(true);
    expect(fit.paragraphs).toEqual([['Day One']]);
  });

  test('shrinks until the lines fit the height, and no further', () => {
    const ctx = makeCtx();
    const text = repeatTo('Bow in the presence of greatness and rank accordingly.', 180);
    const opts = { width: 800, height: 200, max: 60, min: 20, lineHeight: 1.25, font };
    const fit = fitText(ctx, text, opts);
    expect(fit.fits).toBe(true);
    expect(fit.size).toBeLessThan(60);
    expect(fit.height).toBeLessThanOrEqual(200);
    expect(fit.height).toBe(fit.lineCount * fit.lineHeight);
    // One size up would not have fitted
    const bigger = fitText(makeCtx(), text, { ...opts, max: fit.size + 1, min: fit.size + 1 });
    expect(bigger.fits).toBe(false);
  });

  test('respects maxLines and counts paragraph gaps', () => {
    const one = fitText(makeCtx(), 'Father Stretch My Hands, Pt. 1', { width: 300, max: 30, min: 10, maxLines: 1, font });
    expect(one.lineCount).toBe(1);
    expect(one.size).toBe(20);

    const paras = fitText(makeCtx(), ['One line.', 'Two line.', 'Three line.'], {
      width: 900, max: 40, min: 20, lineHeight: 1.5, paragraphGap: 0.5, font
    });
    expect(paras.paragraphs).toHaveLength(3);
    expect(paras.height).toBe(3 * 60 + 2 * 20);
  });

  test('never goes below min: text that cannot fit is cut on an ellipsis', () => {
    const ctx = makeCtx();
    const fit = fitText(ctx, repeatTo('Too many words for this small box.', 600), {
      width: 300, height: 100, max: 40, min: 20, lineHeight: 1.25, font
    });
    expect(fit.fits).toBe(false);
    expect(fit.size).toBe(20);
    expect(fit.height).toBeLessThanOrEqual(100);
    const lines = fit.paragraphs.flat();
    expect(lines[lines.length - 1].endsWith('…')).toBe(true);
    lines.forEach(line => expect(ctx.measureText(line).width).toBeLessThanOrEqual(300));
  });
});

describe('render', () => {
  test('returns the given canvas at 1080x1920', () => {
    const canvas = makeCanvas();
    expect(render({ card: ROAST, eras: ERAS, topSongs: TOP_SONGS }, canvas)).toBe(canvas);
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  test('creates a canvas when none is given', () => {
    const ctx = makeCtx();
    const spy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const canvas = render({ card: ROAST, eras: ERAS, topSongs: TOP_SONGS });
    spy.mockRestore();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  test('labels the parody and the real quote, and says where to get one', () => {
    const canvas = makeCanvas();
    render({ card: ROAST, eras: ERAS, topSongs: TOP_SONGS }, canvas);
    const strings = drawnStrings(canvas);
    expect(strings).toContain('AI parody of Ye. Not a real quote.');
    expect(strings).toContain('Real Ye quote');
    expect(strings).toContain('kanyeranker.com');
    expect(squash(drawnText(canvas))).toContain('KANYERANKER');
  });

  test('the parody label sits on the lines panel, above the first line', () => {
    const canvas = makeCanvas();
    const data = { card: ROAST, eras: ERAS, topSongs: TOP_SONGS };
    render(data, canvas);
    const lines = layout(makeCtx(), data).blocks.find(b => b.id === 'lines');
    const label = canvas.ctx.calls.find(c => c.text === 'AI parody of Ye. Not a real quote.');
    const firstLine = canvas.ctx.calls.find(c => c.text.startsWith('How could you'));
    expect(label.y).toBeGreaterThan(lines.y);
    expect(label.y).toBeLessThan(firstLine.y);
    expect(firstLine.y).toBeLessThan(lines.y + lines.height);
  });

  test('draws the archetype, tone, every line, the quote, eras and top 3', () => {
    const canvas = makeCanvas();
    render({ card: ROAST, eras: ERAS, topSongs: TOP_SONGS }, canvas);
    const all = squash(drawnText(canvas));
    expect(all).toContain(squash('CERTIFIED GREATEST HITS LOYALIST'));
    expect(all).toContain('MYKANYERANKINGGOTROASTED');
    ROAST.lines.forEach(line => expect(all).toContain(squash(line)));
    expect(all).toContain(squash(`“${ROAST.quote}”`));
    const strings = drawnStrings(canvas);
    ERAS.forEach(era => {
      expect(strings).toContain(era.name);
      expect(strings).toContain(`${era.percent}%`);
    });
    TOP_SONGS.forEach(song => {
      expect(strings).toContain(song.title);
      expect(strings).toContain(song.album);
    });
  });

  test('hype cards say hyped, not roasted', () => {
    const canvas = makeCanvas();
    render({ card: { ...ROAST, tone: 'hype' }, eras: ERAS, topSongs: TOP_SONGS }, canvas);
    const all = squash(drawnText(canvas));
    expect(all).toContain('MYKANYERANKINGGOTHYPED');
    expect(all).not.toContain('ROASTED');
  });

  test('uses no em-dashes in its own copy', () => {
    const canvas = makeCanvas();
    render({ card: ROAST, eras: ERAS, topSongs: TOP_SONGS }, canvas);
    expect(drawnText(canvas)).not.toMatch(/[—–]/);
  });

  test('a typical card stays inside the frame', () => {
    const canvas = makeCanvas();
    const data = { card: ROAST, eras: ERAS, topSongs: TOP_SONGS };
    render(data, canvas);
    expectInsideFrame(canvas, data);
  });

  test('worst-case lengths fit without clipping or overlap', () => {
    expect(WORST.card.archetype).toHaveLength(40);
    WORST.card.lines.forEach(line => expect(line.length).toBeGreaterThanOrEqual(178));
    expect(WORST.card.quote.length).toBeGreaterThanOrEqual(278);

    const canvas = makeCanvas();
    expect(() => render(WORST, canvas)).not.toThrow();
    const plan = expectInsideFrame(canvas, WORST);
    expect(plan.blocks.map(b => b.id)).toEqual(['archetype', 'lines', 'stats', 'quote']);
    plan.blocks.filter(b => b.fit).forEach(block => expect(block.fit.fits).toBe(true));

    // Nothing was cut: every word of the lines, quote, archetype and titles is on the card
    const all = squash(drawnText(canvas));
    WORST.card.lines.forEach(line => expect(all).toContain(squash(line)));
    expect(all).toContain(squash(WORST.card.quote));
    expect(all).toContain(squash(WORST.card.archetype.toUpperCase()));
    WORST.topSongs.forEach(song => {
      expect(all).toContain(squash(song.title));
      expect(all).toContain(squash(song.album));
    });
    expect(all).not.toContain('…');
  });

  test('content past the contract limits is cut, not spilled', () => {
    const data = {
      card: { ...WORST.card, archetype: 'W'.repeat(90), lines: WORST.card.lines.map(l => repeatTo(l, 700)), quote: repeatTo(WORST.card.quote, 900) },
      eras: ERAS,
      topSongs: WORST.topSongs.map(song => ({ title: repeatTo(song.title, 140), album: repeatTo(song.album, 140) }))
    };
    const canvas = makeCanvas();
    expect(() => render(data, canvas)).not.toThrow();
    expectInsideFrame(canvas, data);
  });

  test('missing pieces are skipped without throwing', () => {
    const canvas = makeCanvas();
    expect(() => render({ card: { tone: 'hype', archetype: 'Day One', lines: ['You were there.', 'That is all.'], quote: '' } }, canvas)).not.toThrow();
    const strings = drawnStrings(canvas);
    expect(strings).toContain('AI parody of Ye. Not a real quote.');
    expect(strings).not.toContain('Real Ye quote');
    expect(strings).toContain('kanyeranker.com');
  });
});

describe('toBlob', () => {
  test('resolves with the PNG blob', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const canvas = { toBlob: jest.fn(callback => callback(blob)) };
    await expect(toBlob(canvas)).resolves.toBe(blob);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  test('rejects when the browser returns no blob', async () => {
    await expect(toBlob({ toBlob: callback => callback(null) })).rejects.toThrow('Image export failed');
  });
});
