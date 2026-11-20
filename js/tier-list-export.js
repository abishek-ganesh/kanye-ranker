// Tier list export: 1080x1920 canvas frames of the S-D board, as a PNG or a recorded reveal video.
// The static helpers (timeline, fit, video support) are pure and load in Node for unit tests.
(function (root) {
    const W = 1080;
    const H = 1920;
    const TIER_COLORS = { S: '#FF7F7F', A: '#FFBF7F', B: '#FFDF7F', C: '#FFFF7F', D: '#BFFF7F' };
    const TIERS = ['S', 'A', 'B', 'C', 'D'];

    // Board geometry inside the 1080x1920 frame
    const BOARD = { x: 40, top: 280, bottom: 1750, labelWidth: 140, width: 1000 };
    const FIT = { min: 52, max: 170, albumMax: 200, gap: 8, pad: 10, rowGap: 12 };
    const POP_MS = 260;
    const DEFAULT_FONT = '"Helvetica Neue", Arial, sans-serif';

    const VIDEO_TYPES = [
        ['video/mp4;codecs=avc1.42E01E', 'mp4'],
        ['video/mp4;codecs=avc1', 'mp4'],
        ['video/mp4', 'mp4'],
        ['video/webm;codecs=vp9', 'webm'],
        ['video/webm;codecs=vp8', 'webm'],
        ['video/webm', 'webm']
    ];

    // Shared across exports so repeat shares don't refetch covers
    const imageCache = new Map();

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function luminance(hex) {
        const n = parseInt(String(hex).replace('#', ''), 16);
        const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    }

    function contrast(a, b) {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
    }

    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // Reveal pacing shared by the on-screen reveal and the video
    function revealTimeline(count) {
        const intro = 600;
        const perTile = clamp(count > 0 ? 5500 / count : 220, 90, 220);
        const sPause = count > 0 ? 700 : 0;
        const hold = 1800;
        return { intro, perTile, sPause, hold, total: intro + count * perTile + sPause + hold };
    }

    // Start time (ms) of every tile in TierListCore.revealOrder(board); the S pause sits before the first S tile
    function revealSchedule(board) {
        const order = root.TierListCore.revealOrder(board);
        const timeline = revealTimeline(order.length);
        const firstS = order.findIndex(t => t.tier === 'S');
        const starts = order.map((_, i) =>
            timeline.intro + i * timeline.perTile + (firstS >= 0 && i >= firstS ? timeline.sPause : 0));
        return { order, starts, firstS, timeline };
    }

    // Largest square tile (up to maxSize) that fits every row (min one line each) in width x height
    function fitTileSize(rowCounts, width, height, maxSize = FIT.max) {
        const { gap, pad, rowGap } = FIT;
        const inner = width - pad * 2;
        let layout = null;
        for (let size = maxSize; size >= FIT.min; size--) {
            const perRow = Math.max(1, Math.floor((inner + gap) / (size + gap)));
            const rowHeights = rowCounts.map(count => {
                const lines = Math.max(1, Math.ceil(count / perRow));
                return lines * size + (lines - 1) * gap + pad * 2;
            });
            const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + rowGap * (rowCounts.length - 1);
            layout = { size, perRow, gap, pad, rowGap, rowHeights, totalHeight, fits: totalHeight <= height };
            if (layout.fits) return layout;
        }
        return layout;
    }

    function videoSupport() {
        const none = { supported: false, mimeType: null, extension: null };
        if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') return none;
        if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return none;
        const check = typeof MediaRecorder.isTypeSupported === 'function'
            ? t => MediaRecorder.isTypeSupported(t)
            : () => false;
        const match = VIDEO_TYPES.find(([type]) => check(type));
        return match ? { supported: true, mimeType: match[0], extension: match[1] } : none;
    }

    function loadImage(coverArt) {
        if (!coverArt) return Promise.resolve(null);
        if (!imageCache.has(coverArt)) {
            imageCache.set(coverArt, new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = `assets/album-covers/${coverArt}`;
            }));
        }
        return imageCache.get(coverArt);
    }

    const Base = typeof KanyeRankerExport !== 'undefined' ? KanyeRankerExport : class {};

    class TierListExport extends Base {
        constructor({ board, kind, songs, albums } = {}) {
            super();
            this.board = board;
            this.kind = kind;
            this.songs = songs || new Map();
            this.albums = albums || new Map();
            this.images = new Map();
            this.bgLayer = null;
        }

        albumFor(id) {
            if (this.kind === 'albums') return this.albums.get(id) || null;
            const song = this.songs.get(id);
            return song ? this.albums.get(song.albumId) || null : null;
        }

        // Theme album: the first S tile, else the first tile anywhere on the board
        themeAlbumId() {
            const id = TIERS.map(t => this.board[t][0]).find(Boolean);
            return id ? this.albumFor(id)?.id || null : null;
        }

        async prepare() {
            const covers = new Set();
            TIERS.forEach(t => this.board[t].forEach(id => {
                const album = this.albumFor(id);
                if (album?.coverArt) covers.add(album.coverArt);
            }));
            await Promise.all([...covers].map(async cover => {
                const img = await loadImage(cover);
                if (img) this.images.set(cover, img);
            }));
            this.buildBackground();
        }

        // Background, header and footer never change between frames; random patterns would flicker if redrawn
        buildBackground() {
            const layer = document.createElement('canvas');
            layer.width = W;
            layer.height = H;
            const prevCanvas = this.canvas;
            const prevCtx = this.ctx;
            this.canvas = layer;
            this.ctx = layer.getContext('2d');
            const albumId = this.themeAlbumId();
            this.drawBackground(albumId);
            this.drawTierHeader(albumId);
            this.drawTierFooter(albumId);
            this.canvas = prevCanvas;
            this.ctx = prevCtx;
            this.bgLayer = layer;
        }

        theme(albumId) {
            let primary = '#D4AF37';
            let text = '#FFFFFF';
            let headerFont = DEFAULT_FONT;
            let bodyFont = DEFAULT_FONT;
            if (albumId && root.getAlbumColors) {
                const c = root.getAlbumColors(albumId);
                // Some album primaries vanish on their own background (e.g. College Dropout brown)
                primary = [c.primary, c.secondary, this.getReadableTextColor(c.background)]
                    .find(color => color && contrast(color, c.background) >= 3) || '#FFFFFF';
                text = this.getReadableTextColor(c.background);
                headerFont = c.headerFont || headerFont;
                bodyFont = c.bodyFont || bodyFont;
            }
            return { primary, text, headerFont, bodyFont };
        }

        drawTierHeader(albumId) {
            const { primary, text, headerFont } = this.theme(albumId);
            const ctx = this.ctx;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = text;
            ctx.font = `bold 60px ${headerFont}`;
            ctx.fillText('MY KANYE', W / 2, 110);
            ctx.fillStyle = primary;
            ctx.font = `bold 88px ${headerFont}`;
            ctx.fillText(this.kind === 'albums' ? 'ALBUM TIER LIST' : 'SONG TIER LIST', W / 2, 205, W - 80);
            ctx.strokeStyle = primary;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(100, 245);
            ctx.lineTo(W - 100, 245);
            ctx.stroke();
        }

        drawTierFooter(albumId) {
            const { primary, bodyFont } = this.theme(albumId);
            const ctx = this.ctx;
            ctx.strokeStyle = primary;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(100, 1785);
            ctx.lineTo(W - 100, 1785);
            ctx.stroke();
            ctx.fillStyle = primary;
            ctx.font = `bold 52px ${bodyFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('kanyeranker.com', W / 2, 1860);
        }

        layout() {
            if (!this._layout) {
                const contentWidth = BOARD.width - BOARD.labelWidth;
                const maxSize = this.kind === 'albums' ? FIT.albumMax : FIT.max;
                const fit = fitTileSize(TIERS.map(t => this.board[t].length), contentWidth, BOARD.bottom - BOARD.top, maxSize);
                const top = BOARD.top + Math.max(0, (BOARD.bottom - BOARD.top - fit.totalHeight) / 2);
                const rowTops = [];
                let y = top;
                fit.rowHeights.forEach(h => { rowTops.push(y); y += h + fit.rowGap; });
                this._layout = { ...fit, rowTops, contentX: BOARD.x + BOARD.labelWidth };
            }
            return this._layout;
        }

        // revealed: how many tiles of revealOrder are visible; pop: scale-in progress of the newest one.
        // opts.popOf(index) overrides per-tile pop (video); opts.sGlow 0..1 lights the S label
        drawFrame(canvas, revealed = Infinity, pop = 1, opts = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            if (canvas.width !== W) canvas.width = W;
            if (canvas.height !== H) canvas.height = H;
            if (!this.bgLayer) this.buildBackground();

            const ctx = this.ctx;
            ctx.drawImage(this.bgLayer, 0, 0);

            const L = this.layout();
            const order = root.TierListCore.revealOrder(this.board);
            const count = Math.min(revealed, order.length);
            const visible = new Map();
            for (let i = 0; i < count; i++) {
                const p = opts.popOf ? opts.popOf(i) : (i === count - 1 ? pop : 1);
                visible.set(order[i].id, p);
            }

            TIERS.forEach((tier, r) => {
                const y = L.rowTops[r];
                const h = L.rowHeights[r];
                this.drawRow(tier, y, h, tier === 'S' ? opts.sGlow || 0 : 0);
                this.board[tier].forEach((id, k) => {
                    if (!visible.has(id)) return;
                    const line = Math.floor(k / L.perRow);
                    const col = k % L.perRow;
                    const x = L.contentX + L.pad + col * (L.size + L.gap);
                    const ty = y + L.pad + line * (L.size + L.gap);
                    this.drawTile(id, x, ty, L.size, visible.get(id));
                });
            });
        }

        drawRow(tier, y, h, glow) {
            const ctx = this.ctx;
            const x = BOARD.x;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, BOARD.width, h, 12);
            ctx.clip();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x, y, BOARD.width, h);
            ctx.fillStyle = TIER_COLORS[tier];
            ctx.fillRect(x, y, BOARD.labelWidth, h);
            if (glow > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * glow})`;
                ctx.fillRect(x, y, BOARD.labelWidth, h);
            }
            ctx.restore();

            if (glow > 0) {
                ctx.save();
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * glow})`;
                ctx.lineWidth = 4;
                ctx.shadowColor = TIER_COLORS.S;
                ctx.shadowBlur = 30 * glow;
                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, BOARD.width - 4, h - 4, 12);
                ctx.stroke();
                ctx.restore();
            }

            ctx.save();
            ctx.fillStyle = '#1A1A1A';
            ctx.font = `bold ${Math.round(clamp(h * 0.5, 44, 84))}px ${DEFAULT_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tier, x + BOARD.labelWidth / 2, y + h / 2 + 2);
            ctx.restore();
        }

        drawTile(id, x, y, size, pop) {
            const ctx = this.ctx;
            const album = this.albumFor(id);
            const img = album?.coverArt ? this.images.get(album.coverArt) : null;
            const p = clamp(pop, 0, 1);

            ctx.save();
            if (p < 1) {
                const scale = 0.6 + 0.4 * easeOutBack(p);
                ctx.globalAlpha = Math.min(1, p * 2.5);
                ctx.translate(x + size / 2, y + size / 2);
                ctx.scale(scale, scale);
                ctx.translate(-(x + size / 2), -(y + size / 2));
            }
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, Math.max(4, size * 0.08));
            ctx.clip();
            if (img) {
                ctx.drawImage(img, x, y, size, size);
            } else {
                ctx.fillStyle = '#333333';
                ctx.fillRect(x, y, size, size);
            }

            const label = this.labelFor(id);
            if (label) {
                const fontSize = this.kind === 'songs'
                    ? Math.round(clamp(size * 0.14, 11, 24))
                    : Math.round(clamp(size * 0.105, 12, 21));
                ctx.font = `bold ${fontSize}px ${DEFAULT_FONT}`;
                const lines = this.wrap(label, size - size * 0.12, 2);
                const lineHeight = fontSize * 1.15;
                const textTop = y + size - size * 0.06 - lines.length * lineHeight;
                const grad = ctx.createLinearGradient(0, Math.max(y, textTop - size * 0.25), 0, y + size);
                grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
                ctx.fillStyle = grad;
                ctx.fillRect(x, Math.max(y, textTop - size * 0.25), size, y + size - Math.max(y, textTop - size * 0.25));

                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 4;
                lines.forEach((line, i) => ctx.fillText(line, x + size / 2, textTop + i * lineHeight));
            }
            ctx.restore();
        }

        // Song tiles always carry the title; album tiles only when there's room for a name strip
        labelFor(id) {
            if (this.kind === 'songs') {
                const title = this.songs.get(id)?.title || '';
                return root.KanyeUtils?.getCensoredTitle ? root.KanyeUtils.getCensoredTitle(title) : title;
            }
            const album = this.albums.get(id);
            if (!album || this.layout().size < 100) return '';
            return this.formatAlbumName ? this.formatAlbumName(album.name) : album.name;
        }

        // Word-wrap into at most maxLines, ellipsizing the last line
        wrap(text, maxWidth, maxLines) {
            const ctx = this.ctx;
            const words = text.split(/\s+/).filter(Boolean);
            const lines = [];
            let current = '';
            let i = 0;
            for (; i < words.length; i++) {
                const next = current ? `${current} ${words[i]}` : words[i];
                if (ctx.measureText(next).width <= maxWidth || !current) {
                    current = next;
                } else {
                    lines.push(current);
                    current = words[i];
                    if (lines.length === maxLines) break;
                }
            }
            if (lines.length < maxLines && current) {
                lines.push(current);
                current = '';
                i = words.length;
            }
            const overflow = i < words.length;
            const last = lines.length - 1;
            if (last >= 0 && (overflow || ctx.measureText(lines[last]).width > maxWidth)) {
                let s = overflow ? `${lines[last]} ${words.slice(i).join(' ')}` : lines[last];
                while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
                lines[last] = `${s.trimEnd()}…`;
            }
            return lines;
        }

        async renderImage(canvas) {
            await this.prepare();
            this.drawFrame(canvas, Infinity, 1);
            return new Promise((resolve, reject) => {
                canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/png');
            });
        }

        // Frame at time t (ms) of the reveal
        drawAt(canvas, t, schedule) {
            const { starts, firstS, timeline } = schedule;
            let revealed = 0;
            while (revealed < starts.length && starts[revealed] <= t) revealed++;
            let sGlow = 0;
            if (firstS >= 0) {
                const sStart = starts[firstS];
                const glowFrom = sStart - timeline.sPause;
                if (t >= glowFrom && t < sStart + POP_MS) {
                    sGlow = 0.5 + 0.5 * Math.sin(((t - glowFrom) / 350) * Math.PI * 2 - Math.PI / 2);
                }
            }
            this.drawFrame(canvas, revealed, 1, {
                popOf: i => (t - starts[i]) / POP_MS,
                sGlow
            });
        }

        async recordVideo(canvas, { onProgress } = {}) {
            const support = videoSupport();
            if (!support.supported) throw new Error('Video recording is not supported in this browser');
            await this.prepare();

            const schedule = revealSchedule(this.board);
            const total = schedule.timeline.total;
            this.drawAt(canvas, 0, schedule);

            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, { mimeType: support.mimeType, videoBitsPerSecond: 6000000 });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
            const stopped = new Promise((resolve, reject) => {
                recorder.onstop = resolve;
                recorder.onerror = e => reject(e.error || new Error('Recording failed'));
            });

            recorder.start(250);
            const t0 = performance.now();
            await new Promise(resolve => {
                const tick = now => {
                    const t = now - t0;
                    this.drawAt(canvas, t, schedule);
                    if (onProgress) onProgress(Math.min(1, t / total));
                    if (t >= total) return resolve();
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
            recorder.stop();
            await stopped;
            stream.getTracks().forEach(track => track.stop());

            const mimeType = support.mimeType.split(';')[0];
            return { blob: new Blob(chunks, { type: mimeType }), mimeType, extension: support.extension };
        }
    }

    Object.assign(TierListExport, { revealTimeline, revealSchedule, fitTileSize, videoSupport, TIER_COLORS, WIDTH: W, HEIGHT: H });
    root.TierListExport = TierListExport;
    if (typeof module !== 'undefined' && module.exports) module.exports = TierListExport;
})(typeof window !== 'undefined' ? window : globalThis);
