// Taste card export: 1080x1920 share image of the AI parody card (archetype, lines, top 3, era DNA, real quote).
// The text helpers (wrapText, balanceText, fitText) only need a 2D context's measureText, so they unit test in Node.
(function (root) {
    'use strict';

    const W = 1080;
    const H = 1920;
    const MARGIN = 64;
    const CONTENT = W - MARGIN * 2;
    // Vertical band the blocks flow in, between the fixed header and footer
    const BODY = { top: 200, bottom: 1730 };
    const GAP = { min: 40, max: 84 };

    const FONTS = {
        sans: '"Helvetica Neue", Arial, sans-serif',
        // System condensed faces (iOS/macOS, Android, Windows) before the site font
        display: '"Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", sans-serif-condensed, "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
        serif: 'Georgia, "Times New Roman", serif'
    };
    const INK = '#F3F3F3';
    const MUTED = 'rgba(243, 243, 243, 0.62)';
    const STAGE = '#04060A';
    // Accents and era colours match the on-screen card (css/taste-card.css)
    const TONES = {
        roast: { accent: '#FF6B4A', verb: 'ROASTED' },
        hype: { accent: '#D4AF37', verb: 'HYPED' }
    };
    const ERA_COLORS = { college: '#D4AF37', experimental: '#E5484D', modern: '#FF8A3D', new: '#CFCFCF' };

    const PARODY_LABEL = 'AI parody of Ye. Not a real quote.';
    const QUOTE_LABEL = 'Real Ye quote';
    const SITE_NAME = 'KANYE RANKER';
    const SITE_URL = 'kanyeranker.com';

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function clean(text) {
        return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    }

    function rgba(hex, alpha) {
        const n = parseInt(hex.replace('#', ''), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    function toneOf(card) {
        return TONES[card && card.tone] ? card.tone : 'roast';
    }

    // Word-wrap text into lines no wider than maxWidth, using the context's current font
    function wrapText(ctx, text, maxWidth) {
        const words = clean(text).split(' ').filter(Boolean);
        const lines = [];
        let current = '';
        words.forEach(word => {
            const next = current ? `${current} ${word}` : word;
            if (ctx.measureText(next).width <= maxWidth) {
                current = next;
                return;
            }
            if (current) lines.push(current);
            current = word;
            // A single word wider than the box is split by character so it can't overflow
            while (current.length > 1 && ctx.measureText(current).width > maxWidth) {
                let cut = current.length - 1;
                while (cut > 1 && ctx.measureText(current.slice(0, cut)).width > maxWidth) cut--;
                lines.push(current.slice(0, cut));
                current = current.slice(cut);
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    // Same line count as wrapText, but with the narrowest width that keeps it, so no orphan last word
    function balanceText(ctx, text, maxWidth) {
        let best = wrapText(ctx, text, maxWidth);
        if (best.length < 2) return best;
        let lo = 0;
        let hi = maxWidth;
        while (hi - lo > 4) {
            const mid = (lo + hi) / 2;
            const lines = wrapText(ctx, text, mid);
            if (lines.length <= best.length) {
                best = lines;
                hi = mid;
            } else {
                lo = mid;
            }
        }
        return best;
    }

    // Trim text until it fits maxWidth with a trailing ellipsis
    function ellipsize(ctx, text, maxWidth) {
        let s = text.replace(/[\s.,;:!?…]+$/, '');
        while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1).trimEnd();
        return `${s}…`;
    }

    // Wrap paragraphs at one font size and measure the stack
    function measureParagraphs(ctx, list, size, opts) {
        const font = opts.font(size);
        ctx.font = font;
        const paragraphs = list.map(p => wrapText(ctx, p, opts.width));
        const lineCount = paragraphs.reduce((n, lines) => n + lines.length, 0);
        const lineHeight = Math.round(size * (opts.lineHeight || 1.25));
        const paragraphGap = Math.round(size * (opts.paragraphGap || 0));
        const height = lineCount * lineHeight + Math.max(0, paragraphs.length - 1) * paragraphGap;
        return { size, font, paragraphs, lineCount, lineHeight, paragraphGap, height };
    }

    // Last resort when min size still overflows: drop the lines that don't fit and end on an ellipsis
    function cutToBox(ctx, fit, opts, maxHeight, maxLines) {
        const kept = [];
        let used = 0;
        let count = 0;
        let full = false;
        fit.paragraphs.forEach(lines => {
            const para = [];
            lines.forEach(line => {
                const step = fit.lineHeight + (!para.length && kept.length ? fit.paragraphGap : 0);
                if (full || (count > 0 && (count + 1 > maxLines || used + step > maxHeight))) {
                    full = true;
                    return;
                }
                para.push(line);
                used += step;
                count++;
            });
            if (para.length) kept.push(para);
        });
        const last = kept[kept.length - 1];
        if (last) last[last.length - 1] = ellipsize(ctx, last[last.length - 1], opts.width);
        return Object.assign({}, fit, { paragraphs: kept, lineCount: count, height: used });
    }

    // Largest font size from opts.max down to opts.min at which the wrapped text fits its box.
    // text: string or array of paragraphs. opts: { width, height, max, min, font(size), lineHeight,
    // paragraphGap (both in em), maxLines, balance: 'all' | 'stubs' }. Leaves ctx.font at the chosen size.
    function fitText(ctx, text, opts) {
        const list = (Array.isArray(text) ? text : [text]).map(clean).filter(Boolean);
        const maxHeight = opts.height == null ? Infinity : opts.height;
        const maxLines = opts.maxLines == null ? Infinity : opts.maxLines;
        const min = Math.min(opts.min, opts.max);
        let fit = null;
        for (let size = opts.max; size >= min; size--) {
            fit = measureParagraphs(ctx, list, size, opts);
            fit.fits = fit.height <= maxHeight && fit.lineCount <= maxLines;
            if (fit.fits) break;
        }
        if (!fit.fits) return Object.assign(cutToBox(ctx, fit, opts, maxHeight, maxLines), { fits: false });
        // balance: 'all' evens out every paragraph; 'stubs' only those whose last line is a stray word or two
        if (opts.balance) {
            fit.paragraphs = fit.paragraphs.map((lines, i) => {
                const stub = ctx.measureText(lines[lines.length - 1]).width < opts.width * 0.25;
                return opts.balance === 'all' || stub ? balanceText(ctx, list[i], opts.width) : lines;
            });
        }
        return fit;
    }

    // Baseline that centers capital letters in a line box starting at top
    function baselineIn(top, lineHeight, size) {
        return top + (lineHeight + size * 0.72) / 2;
    }

    function trackedWidth(ctx, text, spacing) {
        return [...text].reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing);
    }

    // fillText with letter spacing, drawn per character (ctx.letterSpacing is missing in older Safari).
    // align: 'left' | 'center' | 'right' relative to x
    function fillTracked(ctx, text, x, y, spacing, align) {
        const width = trackedWidth(ctx, text, spacing);
        let cx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
        ctx.textAlign = 'left';
        [...text].forEach(ch => {
            ctx.fillText(ch, cx, y);
            cx += ctx.measureText(ch).width + spacing;
        });
        return width;
    }

    function drawFit(ctx, fit, x, top, align) {
        ctx.font = fit.font;
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'alphabetic';
        let y = top;
        fit.paragraphs.forEach((lines, p) => {
            if (p > 0) y += fit.paragraphGap;
            lines.forEach(line => {
                ctx.fillText(line, x, baselineIn(y, fit.lineHeight, fit.size));
                y += fit.lineHeight;
            });
        });
    }

    // Soft spotlight cone from (x, y), angle in radians from straight down, widening to spread at length
    function drawBeam(ctx, x, y, angle, length, spread, color) {
        // Canvas filters don't work in Safari, so the cone is drawn off-canvas and only its blurred shadow lands
        const OFF = 4000;
        const dir = [-Math.sin(angle), Math.cos(angle)];
        const across = [Math.cos(angle), Math.sin(angle)];
        const at = (along, side) => [x - OFF + dir[0] * along + across[0] * side, y + dir[1] * along + across[1] * side];
        const grad = ctx.createLinearGradient(...at(0, 0), ...at(length, 0));
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = color;
        ctx.shadowBlur = 44;
        ctx.shadowOffsetX = OFF;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(...at(0, -8));
        ctx.lineTo(...at(0, 8));
        ctx.lineTo(...at(length, spread));
        ctx.lineTo(...at(length, -spread));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Night stage: tone-coloured light from above, the globe dome rising behind the footer
    function drawBackdrop(ctx, accent) {
        ctx.fillStyle = STAGE;
        ctx.fillRect(0, 0, W, H);

        const glow = ctx.createRadialGradient(W / 2, -120, 0, W / 2, -120, 1100);
        glow.addColorStop(0, rgba(accent, 0.34));
        glow.addColorStop(0.45, rgba(accent, 0.09));
        glow.addColorStop(1, rgba(accent, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, 1100);

        drawBeam(ctx, 130, -80, -0.33, 1500, 240, accent);
        drawBeam(ctx, W - 130, -80, 0.33, 1500, 240, accent);
        drawBeam(ctx, W / 2, -80, 0, 1200, 170, '#FFFFFF');

        const domeRadius = 1500;
        const domeTop = 1752;
        const cy = domeTop + domeRadius;
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, cy, domeRadius, 0, Math.PI * 2);
        ctx.clip();
        const dome = ctx.createLinearGradient(0, domeTop, 0, H);
        dome.addColorStop(0, '#111B2B');
        dome.addColorStop(1, '#070B12');
        ctx.fillStyle = dome;
        ctx.fillRect(0, domeTop, W, H - domeTop);
        ctx.restore();
        ctx.strokeStyle = rgba(accent, 0.55);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, cy, domeRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Site name, then what happened: "MY KANYE RANKING GOT ROASTED"
    function drawHeader(ctx, tone) {
        const { accent, verb } = TONES[tone];
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold 26px ${FONTS.sans}`;
        ctx.fillStyle = MUTED;
        fillTracked(ctx, SITE_NAME, W / 2, 96, 9, 'center');

        const lead = 'MY KANYE RANKING GOT ';
        const spacing = 3;
        const width = text => trackedWidth(ctx, text, spacing);
        // Wider fallback fonts shrink until the line clears the margins
        let size = 50;
        do {
            ctx.font = `800 ${size}px ${FONTS.display}`;
        } while (width(lead + verb) > CONTENT - 60 && --size > 30);
        const leadWidth = width(lead) + spacing;
        const total = leadWidth + width(verb);
        const x = (W - total) / 2;
        ctx.fillStyle = INK;
        fillTracked(ctx, lead, x, 160, spacing, 'left');
        ctx.fillStyle = accent;
        fillTracked(ctx, verb, x + leadWidth, 160, spacing, 'left');
    }

    function drawFooter(ctx, tone) {
        const { accent, verb } = TONES[tone];
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold 24px ${FONTS.sans}`;
        ctx.fillStyle = MUTED;
        fillTracked(ctx, `GET YOUR RANKING ${verb} AT`, W / 2, 1812, 6, 'center');
        ctx.font = `bold 58px ${FONTS.sans}`;
        ctx.fillStyle = accent;
        ctx.textAlign = 'center';
        ctx.fillText(SITE_URL, W / 2, 1876);
    }

    // Headline: the archetype, uppercase, on one or two balanced lines
    function archetypeBlock(ctx, card, tone) {
        const text = clean(card.archetype).toUpperCase();
        if (!text) return null;
        const fit = fitText(ctx, text, {
            width: CONTENT, max: 150, min: 54, maxLines: 2, lineHeight: 0.98, balance: 'all',
            font: size => `800 ${size}px ${FONTS.display}`
        });
        return {
            id: 'archetype',
            height: fit.height,
            fit,
            draw(y) {
                ctx.fillStyle = TONES[tone].accent;
                drawFit(ctx, fit, W / 2, y, 'center');
            }
        };
    }

    // Centrepiece: the parody lines in a panel, with the parody label riding its top edge
    function linesBlock(ctx, card, tone, maxHeight) {
        const lines = (Array.isArray(card.lines) ? card.lines : []).map(clean).filter(Boolean);
        if (!lines.length) return null;
        const pad = 44;
        const badge = { height: 52, font: `bold 26px ${FONTS.sans}`, padX: 22 };
        const textTop = badge.height + 30;
        const chrome = textTop + pad;
        const fit = fitText(ctx, lines, {
            width: CONTENT - pad * 2, height: maxHeight - chrome, max: 60, min: 28,
            lineHeight: 1.3, paragraphGap: 0.6, balance: 'stubs',
            font: size => `500 ${size}px ${FONTS.sans}`
        });
        const accent = TONES[tone].accent;
        return {
            id: 'lines',
            height: fit.height + chrome,
            fit,
            draw(y) {
                const panelTop = y + badge.height / 2;
                ctx.beginPath();
                ctx.roundRect(MARGIN, panelTop, CONTENT, this.height - badge.height / 2, 28);
                ctx.fillStyle = 'rgba(10, 14, 22, 0.78)';
                ctx.fill();
                ctx.strokeStyle = rgba(accent, 0.6);
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.font = badge.font;
                const badgeWidth = ctx.measureText(PARODY_LABEL).width + badge.padX * 2;
                ctx.beginPath();
                ctx.roundRect(MARGIN + pad - 8, y, badgeWidth, badge.height, badge.height / 2);
                ctx.fillStyle = accent;
                ctx.fill();
                ctx.fillStyle = '#0A0A0A';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(PARODY_LABEL, MARGIN + pad - 8 + badge.padX, baselineIn(y, badge.height, 26));

                ctx.fillStyle = INK;
                drawFit(ctx, fit, MARGIN + pad, y + textTop, 'left');
            }
        };
    }

    // One "rank, title, album" row of the top 3 column
    function songRow(ctx, song, width) {
        const font = size => `bold ${size}px ${FONTS.sans}`;
        let title = fitText(ctx, song.title, { width, max: 30, min: 25, maxLines: 1, lineHeight: 1.2, font });
        // Long titles wrap to a second line before the type gets any smaller
        if (!title.fits) title = fitText(ctx, song.title, { width, max: 28, min: 22, maxLines: 2, lineHeight: 1.2, font });
        const album = fitText(ctx, song.album, {
            width, max: 22, min: 18, maxLines: 1, lineHeight: 1.3,
            font: size => `${size}px ${FONTS.sans}`
        });
        return { title, album, height: title.height + album.height };
    }

    // Top 3 songs and era DNA bars, side by side (either takes the full width when the other is missing)
    function statsBlock(ctx, topSongs, eras, tone) {
        const songs = (Array.isArray(topSongs) ? topSongs : []).slice(0, 3)
            .map(s => ({ title: clean(s && s.title), album: clean(s && s.album) })).filter(s => s.title);
        const bars = (Array.isArray(eras) ? eras : []).filter(e => e && e.name);
        if (!songs.length && !bars.length) return null;

        const accent = TONES[tone].accent;
        const gutter = 56;
        const both = songs.length && bars.length;
        const songsWidth = both ? 430 : CONTENT;
        const barsX = both ? MARGIN + songsWidth + gutter : MARGIN;
        const barsWidth = both ? CONTENT - songsWidth - gutter : CONTENT;
        const labelHeight = 50;
        const rankWidth = 46;

        const rows = songs.map(song => songRow(ctx, song, songsWidth - rankWidth));
        const rowsHeight = rows.reduce((sum, row) => sum + row.height, 0);
        const bar = { text: 30, gap: 8, thick: 10, between: 22 };
        const barRow = bar.text + bar.gap + bar.thick;
        const barsHeight = bars.length ? bars.length * barRow + (bars.length - 1) * bar.between : 0;
        const songGapMin = 18;
        const bodyHeight = Math.max(barsHeight, rowsHeight + Math.max(0, rows.length - 1) * songGapMin);
        // Spread the song rows so both columns end on the same line
        const songGap = rows.length > 1 ? clamp((bodyHeight - rowsHeight) / (rows.length - 1), songGapMin, 44) : 0;
        const total = bars.reduce((sum, era) => sum + (Number(era.count) || 0), 0);

        return {
            id: 'stats',
            height: labelHeight + bodyHeight,
            draw(y) {
                ctx.textBaseline = 'alphabetic';
                const labelFont = `bold 22px ${FONTS.sans}`;
                const top = y + labelHeight;

                if (rows.length) {
                    ctx.font = labelFont;
                    ctx.fillStyle = MUTED;
                    fillTracked(ctx, `MY TOP ${rows.length}`, MARGIN, y + 22, 5, 'left');
                    let ry = top;
                    rows.forEach((row, i) => {
                        ctx.fillStyle = accent;
                        ctx.font = `800 42px ${FONTS.display}`;
                        ctx.textAlign = 'left';
                        ctx.fillText(String(i + 1), MARGIN, baselineIn(ry, row.title.lineHeight, 42) + 4);
                        ctx.fillStyle = INK;
                        drawFit(ctx, row.title, MARGIN + rankWidth, ry, 'left');
                        ctx.fillStyle = MUTED;
                        drawFit(ctx, row.album, MARGIN + rankWidth, ry + row.title.height, 'left');
                        ry += row.height + songGap;
                    });
                }

                if (bars.length) {
                    ctx.font = labelFont;
                    ctx.fillStyle = MUTED;
                    fillTracked(ctx, total > 0 ? `ERA DNA OF MY TOP ${total}` : 'MY ERA DNA', barsX, y + 22, 5, 'left');
                    bars.forEach((era, i) => {
                        const by = top + i * (barRow + bar.between);
                        const percent = clamp(Math.round(Number(era.percent) || 0), 0, 100);
                        const color = ERA_COLORS[era.id] || accent;
                        ctx.font = `bold 26px ${FONTS.sans}`;
                        ctx.textAlign = 'left';
                        ctx.fillStyle = percent > 0 ? INK : 'rgba(243, 243, 243, 0.45)';
                        ctx.fillText(era.name, barsX, baselineIn(by, bar.text, 26));
                        ctx.textAlign = 'right';
                        ctx.fillStyle = percent > 0 ? color : 'rgba(243, 243, 243, 0.45)';
                        ctx.fillText(`${percent}%`, barsX + barsWidth, baselineIn(by, bar.text, 26));

                        const trackY = by + bar.text + bar.gap;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                        ctx.beginPath();
                        ctx.roundRect(barsX, trackY, barsWidth, bar.thick, bar.thick / 2);
                        ctx.fill();
                        if (percent > 0) {
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.roundRect(barsX, trackY, Math.max(bar.thick, barsWidth * percent / 100), bar.thick, bar.thick / 2);
                            ctx.fill();
                        }
                    });
                }
            }
        };
    }

    // The real quote: serif italic behind a rule, so it can't be confused with the parody panel
    function quoteBlock(ctx, card) {
        const quote = clean(card.quote).replace(/^["“”']+|["“”']+$/g, '');
        if (!quote) return null;
        const indent = 30;
        const labelHeight = 42;
        const fit = fitText(ctx, `“${quote}”`, {
            width: CONTENT - indent, height: 190, max: 38, min: 25, lineHeight: 1.34, balance: 'stubs',
            font: size => `italic ${size}px ${FONTS.serif}`
        });
        return {
            id: 'quote',
            height: labelHeight + fit.height,
            fit,
            draw(y) {
                ctx.fillStyle = 'rgba(243, 243, 243, 0.4)';
                ctx.fillRect(MARGIN, y + 2, 4, this.height - 4);
                ctx.fillStyle = INK;
                ctx.font = `bold 24px ${FONTS.sans}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(QUOTE_LABEL, MARGIN + indent, y + 24);
                ctx.fillStyle = 'rgba(243, 243, 243, 0.86)';
                drawFit(ctx, fit, MARGIN + indent, y + labelHeight, 'left');
            }
        };
    }

    // Measure every block and place them top to bottom between header and footer.
    // The lines panel takes whatever height the other blocks leave; spare room widens the gaps
    function layout(ctx, data) {
        const { card = {}, eras, topSongs } = data || {};
        const tone = toneOf(card);
        const head = archetypeBlock(ctx, card, tone);
        const stats = statsBlock(ctx, topSongs, eras, tone);
        const quote = quoteBlock(ctx, card);
        const others = [head, stats, quote].filter(Boolean);
        const bodyHeight = BODY.bottom - BODY.top;
        const fixed = others.reduce((sum, b) => sum + b.height, 0);
        const lines = linesBlock(ctx, card, tone, bodyHeight - fixed - others.length * GAP.min);

        const blocks = [head, lines, stats, quote].filter(Boolean);
        const gaps = Math.max(1, blocks.length - 1);
        const used = blocks.reduce((sum, b) => sum + b.height, 0);
        let gap = clamp((bodyHeight - used) / gaps, GAP.min, GAP.max);
        // Short cards: what the widest gaps can't absorb is shared evenly, edges included
        const extra = Math.max(0, bodyHeight - used - gap * (blocks.length - 1)) / (blocks.length + 1);
        gap += extra;
        let y = BODY.top + extra;
        blocks.forEach(block => {
            block.y = Math.round(y);
            y += block.height + gap;
        });
        return { tone, blocks, gap, top: BODY.top, bottom: BODY.bottom };
    }

    // Draw the whole card synchronously; returns the 1080x1920 canvas (created when not given)
    function render(data, canvas) {
        const target = canvas || document.createElement('canvas');
        target.width = W;
        target.height = H;
        const ctx = target.getContext('2d');
        const plan = layout(ctx, data);
        drawBackdrop(ctx, TONES[plan.tone].accent);
        drawHeader(ctx, plan.tone);
        plan.blocks.forEach(block => block.draw(block.y));
        drawFooter(ctx, plan.tone);
        return target;
    }

    function toBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/png');
        });
    }

    function fileName(card) {
        return `kanye-ranker-${toneOf(card)}.png`;
    }

    const TasteCardExport = {
        WIDTH: W, HEIGHT: H, FONTS, TONES, ERA_COLORS, PARODY_LABEL, QUOTE_LABEL,
        render, toBlob, fileName, layout, wrapText, balanceText, fitText, ellipsize
    };
    root.TasteCardExport = TasteCardExport;
    if (typeof module !== 'undefined' && module.exports) module.exports = TasteCardExport;
})(typeof window !== 'undefined' ? window : globalThis);
