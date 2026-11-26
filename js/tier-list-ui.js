// Tier list screen: D-to-S reveal, tap-to-move, image and reveal-video sharing.
// Board logic lives in TierListCore (js/tier-list.js); drawing for share files in TierListExport.
(function () {
    const TIERS = ['S', 'A', 'B', 'C', 'D'];
    const UNRANKED = 'unranked';
    const LABELS = { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', unranked: 'Unranked' };
    const SHARE_TEXT = {
        songs: 'My Kanye song tier list. Make yours at kanyeranker.com',
        albums: 'My Kanye album tier list. Make yours at kanyeranker.com'
    };
    const TILE_MIN = { songs: 64, albums: 56 };
    const TILE_MAX = 104;
    const GAP = 6;

    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Same pacing as the video (TierListExport.revealSchedule); local fallback if that file failed to load
    function revealSchedule(board) {
        if (window.TierListExport?.revealSchedule) return window.TierListExport.revealSchedule(board);
        const order = TierListCore.revealOrder(board);
        const perTile = Math.min(220, Math.max(90, 5500 / Math.max(order.length, 1)));
        const firstS = order.findIndex(step => step.tier === 'S');
        const starts = order.map((_, i) => 600 + i * perTile + (firstS >= 0 && i >= firstS ? 700 : 0));
        return { order, starts, firstS, timeline: { sPause: 700 } };
    }

    class TierListUI {
        constructor(app) {
            this.app = app;
            this.kind = 'songs';
            this.albumsOnly = false;
            this.board = null;
            this.selectedId = null;
            this.revealing = false;
            this.revealTimers = [];
            this.revealedKinds = new Set();
            this.videoRun = 0;
            this.songsById = new Map(app.songs.map(song => [song.id, song]));

            const $ = id => document.getElementById(id);
            this.el = {
                screen: $('tier-list-screen'),
                open: $('open-tier-list'),
                back: $('tier-back'),
                board: $('tier-board'),
                summary: $('tier-summary'),
                skip: $('tier-skip-reveal'),
                replay: $('tier-replay'),
                shareImage: $('tier-share-image'),
                shareVideo: $('tier-share-video'),
                moveBar: $('tier-move-bar'),
                moveTitle: $('tier-move-title'),
                moveCancel: $('tier-move-cancel'),
                videoOverlay: $('tier-video-overlay'),
                videoCanvas: $('tier-video-canvas'),
                videoStatus: $('tier-video-status'),
                videoFill: $('tier-video-progress-fill'),
                videoSave: $('tier-video-save'),
                videoClose: $('tier-video-close'),
                tabs: Array.from(document.querySelectorAll('.tier-tab')),
                tabsWrap: document.querySelector('.tier-tabs'),
                title: document.querySelector('.tier-title')
            };
            this.bind();
            this.el.shareVideo.hidden = !window.TierListExport?.videoSupport?.().supported;
        }

        // Album mode keeps its own pins, so moves there never touch the song-mode album tier list
        get core() {
            return this.albumsOnly ? this.app.albumTierList : this.app.tierList;
        }

        // Which ranking mode produced this tier list, for analytics
        get mode() {
            return this.albumsOnly ? 'albums' : 'songs';
        }

        bind() {
            this.el.open.addEventListener('click', () => this.open());
            this.el.back.addEventListener('click', () => this.close());
            this.el.skip.addEventListener('click', () => this.finishReveal());
            this.el.replay.addEventListener('click', () => {
                window.analytics?.trackTierRevealReplayed(this.kind, this.mode);
                this.render(true);
            });
            this.el.tabs.forEach(tab => tab.addEventListener('click', () => this.setKind(tab.dataset.kind)));
            this.el.shareImage.addEventListener('click', () => this.shareImage());
            this.el.shareVideo.addEventListener('click', () => this.recordVideo());
            this.el.moveCancel.addEventListener('click', () => this.clearSelection());
            this.el.moveBar.querySelectorAll('.tier-move-btn').forEach(btn => {
                btn.addEventListener('click', () => this.moveSelected(btn.dataset.tier));
            });
            this.el.videoClose.addEventListener('click', () => this.closeVideo());

            // One delegated handler for tiles and tier labels
            this.el.board.addEventListener('click', e => {
                const tile = e.target.closest('.tier-tile');
                if (tile) {
                    if (this.revealing) return;
                    this.toggleSelect(tile.dataset.id, e.detail === 0);
                    return;
                }
                const label = e.target.closest('.tier-label');
                if (label && this.selectedId) this.moveSelected(label.closest('.tier-row').dataset.tier);
            });

            document.addEventListener('keydown', e => {
                if (e.key !== 'Escape' || !this.isActive()) return;
                if (!this.el.videoOverlay.hidden) this.closeVideo();
                else this.clearSelection();
            });

            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this.isActive() && this.sizeTiles(), 150);
            });
        }

        isActive() {
            return this.el.screen.classList.contains('active');
        }

        isRevealing() {
            return this.revealing;
        }

        // albumsOnly: opened from album mode, so there's no Songs tab and Back returns to the comparisons
        open({ albumsOnly = false } = {}) {
            this.albumsOnly = albumsOnly;
            if (!this.core) return;
            this.kind = albumsOnly ? 'albums' : 'songs';
            this.revealedKinds.clear();
            this.el.tabsWrap.hidden = albumsOnly;
            this.el.title.textContent = albumsOnly ? 'Your Album Tier List' : 'Your Tier List';
            this.app.ui.showScreen('tierList');
            window.analytics?.trackScreenView('tier_list');
            window.scrollTo(0, 0);
            this.syncTabs();
            this.render(true);
            window.analytics?.trackTierListViewed(this.kind, TierListCore.rankedCount(this.board), this.app.comparisonsDone(), this.mode);
        }

        close() {
            this.stopReveal();
            this.clearSelection();
            if (this.albumsOnly) {
                this.app.showAlbumResults();
                return;
            }
            this.app.ui.showScreen('results');
            window.scrollTo(0, 0);
        }

        setKind(kind) {
            if (kind === this.kind) return;
            this.stopReveal();
            this.clearSelection();
            this.kind = kind;
            this.syncTabs();
            this.render(!this.revealedKinds.has(kind));
            window.analytics?.trackTierListViewed(kind, TierListCore.rankedCount(this.board), this.app.comparisonsDone(), this.mode);
        }

        syncTabs() {
            this.el.tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.kind === this.kind)));
            this.el.board.dataset.kind = this.kind;
        }

        // Rebuilds the board from current ratings + pins and redraws it; reveal=true plays the animation
        render(reveal = false) {
            this.stopReveal();
            this.board = this.core.build(this.kind, this.app.getTierListItems(this.kind));
            this.el.board.replaceChildren(...[...TIERS, UNRANKED].map(tier => this.row(tier)));
            this.renderSummary();
            this.sizeTiles();
            if (reveal && !reducedMotion()) {
                this.startReveal();
            } else {
                this.finishReveal();
            }
        }

        row(tier) {
            const row = document.createElement('div');
            row.className = `tier-row tier-row-${tier}`;
            row.dataset.tier = tier;

            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'tier-label';
            label.textContent = LABELS[tier];
            label.setAttribute('aria-label', tier === UNRANKED ? 'Unranked' : `${tier} tier`);

            const items = document.createElement('div');
            items.className = 'tier-items';
            this.board[tier].forEach(id => items.appendChild(this.tile(id)));

            row.append(label, items);
            if (tier === UNRANKED) {
                row.hidden = this.board[tier].length === 0 && this.kind === 'songs';
                if (this.kind === 'albums' && this.board[tier].length) {
                    const note = document.createElement('p');
                    note.className = 'tier-unranked-note';
                    note.textContent = 'Not enough picks to rank these yet. Place them yourself.';
                    row.appendChild(note);
                }
            }
            return row;
        }

        tile(id) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tier-tile';
            btn.dataset.id = id;
            btn.setAttribute('aria-pressed', 'false');

            const isSong = this.kind === 'songs';
            const song = isSong ? this.songsById.get(id) : null;
            const album = this.app.albums.get(isSong ? song?.albumId : id);
            const name = isSong ? KanyeUtils.getCensoredTitle(song?.title || '') : album?.name || '';
            btn.setAttribute('aria-label', isSong ? `${name}, ${album?.name || ''}` : name);
            btn.title = name;

            const img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            img.src = `assets/album-covers/${album?.coverArt || 'placeholder.svg'}`;
            btn.appendChild(img);

            if (isSong) {
                const caption = document.createElement('span');
                caption.className = 'tier-tile-caption';
                caption.textContent = name;
                btn.appendChild(caption);
            }
            return btn;
        }

        renderSummary() {
            const ranked = TierListCore.rankedCount(this.board);
            if (this.kind === 'songs') {
                this.el.summary.textContent = ranked
                    ? `Built from the ${ranked} songs you've compared. Keep ranking to add more.`
                    : 'Compare a few songs first to build your tier list.';
            } else {
                const total = this.app.albums.size;
                if (this.albumsOnly) {
                    const picks = this.app.comparisonsDone();
                    this.el.summary.textContent = ranked === total
                        ? `All ${total} albums, ranked from your ${picks} head-to-head picks.`
                        : `${ranked} of ${total} albums ranked so far. Keep ranking to place the rest.`;
                } else {
                    this.el.summary.textContent = ranked === total
                        ? `All ${total} albums, ranked from your picks.`
                        : `${ranked} of ${total} albums ranked from your picks.`;
                }
            }
        }

        // Picks the largest tile that keeps S-D on screen, never below the tap-target floor
        sizeTiles() {
            const items = this.el.board.querySelector('.tier-items');
            if (!items) return;
            const width = items.clientWidth - 12;
            const boardTop = this.el.board.getBoundingClientRect().top + window.scrollY;
            const available = Math.max(320, window.innerHeight - Math.min(boardTop, 220) - 150);
            const counts = TIERS.map(t => this.board[t].length);
            let size = TILE_MIN[this.kind];
            for (let s = TILE_MAX; s >= TILE_MIN[this.kind]; s -= 2) {
                const perRow = Math.max(1, Math.floor((width + GAP) / (s + GAP)));
                const lines = counts.reduce((sum, c) => sum + Math.max(1, Math.ceil(c / perRow)), 0);
                if (lines * (s + GAP) + TIERS.length * 12 <= available) {
                    size = s;
                    break;
                }
            }
            this.el.board.style.setProperty('--tile', `${size}px`);
        }

        // ---------- Reveal ----------

        startReveal() {
            const { order, starts, firstS, timeline } = revealSchedule(this.board);
            this.revealing = true;
            this.el.board.dataset.revealing = 'true';
            this.el.skip.hidden = false;

            const sLabel = this.el.board.querySelector('.tier-row-S .tier-label');
            if (firstS >= 0) this.later(() => sLabel?.classList.add('is-flash'), starts[firstS] - timeline.sPause);
            order.forEach((step, i) => {
                this.later(() => this.tileEl(step.id)?.classList.add('is-revealed'), starts[i]);
            });
            const end = order.length ? starts[order.length - 1] : 0;
            this.later(() => this.finishReveal(), end + 500);
        }

        later(fn, ms) {
            this.revealTimers.push(setTimeout(fn, ms));
        }

        stopReveal() {
            this.revealTimers.forEach(clearTimeout);
            this.revealTimers = [];
            this.revealing = false;
            this.el.board.dataset.revealing = 'false';
            this.el.skip.hidden = true;
        }

        // Snaps straight to the finished board (no ease-in for tiles that hadn't appeared yet)
        finishReveal() {
            this.stopReveal();
            const board = this.el.board;
            board.classList.add('is-instant');
            board.querySelectorAll('.tier-tile').forEach(t => t.classList.add('is-revealed'));
            void board.offsetHeight;
            requestAnimationFrame(() => board.classList.remove('is-instant'));
            this.el.board.querySelector('.tier-row-S .tier-label')?.classList.remove('is-flash');
            this.revealedKinds.add(this.kind);
        }

        tileEl(id) {
            return this.el.board.querySelector(`.tier-tile[data-id="${CSS.escape(id)}"]`);
        }

        // ---------- Tap to move ----------

        toggleSelect(id, fromKeyboard) {
            if (this.selectedId === id) {
                this.clearSelection();
                return;
            }
            this.clearSelection();
            this.selectedId = id;
            const tile = this.tileEl(id);
            tile?.classList.add('is-selected');
            tile?.setAttribute('aria-pressed', 'true');
            this.el.board.classList.add('has-selection');

            const current = TierListCore.tierOf(this.board, id);
            this.el.moveTitle.textContent = `Move “${tile?.title || ''}” to`;
            this.el.moveBar.querySelectorAll('.tier-move-btn').forEach(btn => {
                btn.classList.toggle('is-current', btn.dataset.tier === current);
            });
            this.el.moveBar.hidden = false;
            // Keep the selected tile above the move bar
            const overlap = tile ? tile.getBoundingClientRect().bottom - (window.innerHeight - this.el.moveBar.offsetHeight - 12) : 0;
            if (overlap > 0) window.scrollBy({ top: overlap, behavior: reducedMotion() ? 'auto' : 'smooth' });
            if (fromKeyboard) this.el.moveBar.querySelector('.tier-move-btn')?.focus();
        }

        clearSelection() {
            if (!this.selectedId && this.el.moveBar.hidden) return;
            const tile = this.selectedId && this.tileEl(this.selectedId);
            tile?.classList.remove('is-selected');
            tile?.setAttribute('aria-pressed', 'false');
            this.selectedId = null;
            this.el.board.classList.remove('has-selection');
            this.el.moveBar.hidden = true;
        }

        moveSelected(tier) {
            const id = this.selectedId;
            if (!id) return;
            const from = TierListCore.tierOf(this.board, id);
            this.clearSelection();
            if (from === tier) return;
            this.core.move(this.kind, id, tier);
            this.render(false);
            const moved = this.tileEl(id);
            if (moved) {
                moved.classList.add('just-moved');
                moved.focus({ preventScroll: true });
                moved.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
            }
            window.analytics?.trackTierItemMoved(this.kind, from, tier, this.mode);
        }

        // ---------- Sharing ----------

        exporter() {
            return new TierListExport({
                board: this.board,
                kind: this.kind,
                songs: this.songsById,
                albums: this.app.albums
            });
        }

        async shareImage() {
            if (this.revealing) this.finishReveal();
            this.clearSelection();
            const kind = this.kind;
            try {
                this.app.ui.showOverlay('Drawing your tier list...');
                const canvas = this.app.ui.elements.exportCanvas || document.createElement('canvas');
                const blob = await this.exporter().renderImage(canvas);
                this.app.ui.hideOverlay();
                const method = await KanyeUtils.shareOrDownloadFile(blob, `kanye-tier-list-${kind}.png`, SHARE_TEXT[kind]);
                if (method !== 'cancelled') window.analytics?.trackTierListShared(kind, 'image', method, this.mode);
            } catch (error) {
                this.app.ui.hideOverlay();
                KanyeUtils.handleError(error, 'tier-list-image');
            }
        }

        // Records the reveal on a visible canvas, then asks for a tap to save (share needs a fresh user gesture)
        async recordVideo() {
            if (this.revealing) this.finishReveal();
            this.clearSelection();
            const kind = this.kind;
            const run = ++this.videoRun;
            const { videoOverlay, videoStatus, videoFill, videoSave } = this.el;

            videoOverlay.hidden = false;
            videoSave.hidden = true;
            videoStatus.textContent = 'Recording your reveal...';
            videoFill.style.width = '0%';
            document.body.classList.add('tier-video-open');

            try {
                const result = await this.exporter().recordVideo(this.el.videoCanvas, {
                    onProgress: p => {
                        if (run === this.videoRun) videoFill.style.width = `${Math.round(p * 100)}%`;
                    }
                });
                if (run !== this.videoRun || videoOverlay.hidden) return;
                if (!result?.blob?.size) throw new Error('Recording came back empty');

                videoFill.style.width = '100%';
                videoStatus.textContent = isMobile() ? 'Your reveal is ready. Save it, then post it with a sound.' : 'Your reveal is ready.';
                videoSave.hidden = false;
                videoSave.onclick = async () => {
                    const filename = `kanye-tier-list-${kind}.${result.extension}`;
                    const method = await KanyeUtils.shareOrDownloadFile(result.blob, filename, SHARE_TEXT[kind]);
                    if (method !== 'cancelled') {
                        window.analytics?.trackTierListShared(kind, 'video', method, this.mode);
                        this.closeVideo();
                    }
                };
                videoSave.focus();
            } catch (error) {
                if (run !== this.videoRun) return;
                videoStatus.textContent = "Couldn't record a video on this browser. Try Share image instead.";
                KanyeUtils.handleError?.(error, 'tier-list-video');
            }
        }

        closeVideo() {
            this.videoRun++;
            this.el.videoOverlay.hidden = true;
            this.el.videoSave.onclick = null;
            document.body.classList.remove('tier-video-open');
        }
    }

    // Boot once the app has loaded its data (app-init.js creates window.kanyeApp after window.load)
    function boot() {
        const app = window.kanyeApp;
        if (!document.getElementById('tier-list-screen')) return;
        if (!app || !app.songs?.length || !app.tierList) {
            setTimeout(boot, 200);
            return;
        }
        if (!window.tierListUI) window.tierListUI = new TierListUI(app);
    }

    window.TierListUI = TierListUI;
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();
