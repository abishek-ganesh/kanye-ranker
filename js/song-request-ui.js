// Song Request UI: footer button, badge, and searchable panel (drawer on desktop, sheet on mobile)
class SongRequestUI {
    constructor() {
        this.isOpen = false;
        this.queue = null;
        this.unsubscribe = null;
        this.rows = [];
        this.groups = [];
        this.listBuilt = false;
        this.searchTimer = null;
        this.bindTimer = null;
        this.lastFocused = null;
        // Phones get a full-screen sheet that closes on request; wider screens get a drawer that stays open
        this.mobileQuery = window.matchMedia('(max-width: 540px)');
        this.statusTimer = null;
        this.init();
    }

    init() {
        this.createButton();
        this.createModal();
        this.bindGlobalEvents();
        this.startBindPoll();
    }

    // Footer button next to "Skip This Comparison", with pending-count badge
    createButton() {
        const footer = document.querySelector('#comparison-screen .comparison-footer');
        if (!footer) {
            console.warn('SongRequestUI: comparison footer not found');
            return;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'song-request-btn';
        btn.className = 'song-request-btn';
        btn.setAttribute('aria-label', 'Request a song');
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-controls', 'song-request-modal');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="song-request-btn-label">Request a Song</span>
            <span id="song-request-badge" class="song-request-badge" hidden>0</span>
        `;
        btn.addEventListener('click', () => this.open());

        const skip = footer.querySelector('#skip-comparison');
        if (skip) skip.insertAdjacentElement('afterend', btn);
        else footer.appendChild(btn);

        this.button = btn;
        this.badge = btn.querySelector('#song-request-badge');
    }

    // Modal shell appended to body; list contents are built lazily on first open
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'song-request-modal';
        modal.className = 'song-request-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'song-request-heading');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="song-request-content">
                <div class="song-request-header">
                    <h2 id="song-request-heading" class="song-request-heading">Request a Song</h2>
                    <button type="button" id="song-request-close" class="song-request-close" aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <p class="song-request-subtitle">Pick a track and it'll show up in your next few matchups.</p>
                <details class="song-request-queue" open hidden>
                    <summary class="song-request-queue-summary">
                        <span>Your requests (<span class="song-request-queue-count">0</span>)</span>
                    </summary>
                    <ul class="song-request-queue-list"></ul>
                </details>
                <div class="song-request-search-wrap">
                    <input id="song-request-search" class="song-request-search" type="search"
                        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                        placeholder="Search songs or albums" aria-label="Search songs or albums">
                </div>
                <p class="song-request-status" role="status" aria-live="polite" hidden></p>
                <div class="song-request-list"></div>
                <p class="song-request-empty" hidden>No songs match</p>
            </div>
        `;

        this.modal = modal;
        this.list = modal.querySelector('.song-request-list');
        this.input = modal.querySelector('#song-request-search');
        this.empty = modal.querySelector('.song-request-empty');
        this.status = modal.querySelector('.song-request-status');
        this.queueSection = modal.querySelector('.song-request-queue');
        this.queueList = modal.querySelector('.song-request-queue-list');
        this.queueCount = modal.querySelector('.song-request-queue-count');

        this.queueList.addEventListener('click', (e) => {
            const remove = e.target.closest('.song-request-remove');
            if (remove) this.removeRequest(remove.dataset.songId);
        });

        modal.querySelector('#song-request-close').addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        this.input.addEventListener('input', () => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.applyFilter(this.input.value), 100);
        });

        this.list.addEventListener('click', (e) => {
            const action = e.target.closest('.song-request-action');
            if (!action || action.disabled) return;
            const row = action.closest('.song-request-row');
            if (row) this.request(row.dataset.songId);
        });

        document.body.appendChild(modal);
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });
    }

    // Poll briefly for the app's queue since kanyeApp is created ~500ms after load
    startBindPoll() {
        let attempts = 0;
        const tick = () => {
            if (this.tryBind() || ++attempts > 80) return;
            this.bindTimer = setTimeout(tick, 250);
        };
        tick();
    }

    // Subscribes to the current queue instance; returns true once bound
    tryBind() {
        const queue = window.kanyeApp?.songRequests;
        if (!queue) return false;
        if (queue === this.queue) return true;

        if (this.unsubscribe) this.unsubscribe();
        this.queue = queue;
        this.unsubscribe = typeof queue.onChange === 'function'
            ? queue.onChange((count) => this.handleQueueChange(count))
            : null;
        this.handleQueueChange(queue.pendingCount);
        return true;
    }

    handleQueueChange(count) {
        this.updateBadge(count);
        this.renderQueue();
        if (this.isOpen) this.renderRowStates();
    }

    updateBadge(count = this.queue?.pendingCount ?? 0) {
        if (!this.badge) return;
        this.badge.textContent = String(count);
        this.badge.hidden = !count;
    }

    open() {
        if (this.isOpen) return;
        this.tryBind();
        this.buildList();
        this.renderRowStates();
        this.updateBadge();
        this.renderQueue();
        if (this.queueSection) this.queueSection.open = true;

        this.lastFocused = document.activeElement;
        this.isOpen = true;
        this.modal.classList.add('show');
        this.modal.setAttribute('aria-hidden', 'false');
        this.button?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('song-request-open');
        this.input.focus({ preventScroll: true });
        requestAnimationFrame(() => {
            if (this.isOpen && document.activeElement !== this.input) this.input.focus({ preventScroll: true });
        });

        window.analytics?.trackSongRequestModalOpened?.();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.modal.classList.remove('show');
        this.modal.setAttribute('aria-hidden', 'true');
        this.button?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('song-request-open');

        clearTimeout(this.searchTimer);
        this.setStatus('');
        this.input.value = '';
        this.applyFilter('');
        this.input.blur();
        this.list.scrollTop = 0;

        if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
            this.lastFocused.focus({ preventScroll: true });
        }
        this.lastFocused = null;
    }

    // Builds album groups once from kanyeApp.songs, ordered by album year then track number
    buildList() {
        if (this.listBuilt) return;
        const app = window.kanyeApp;
        const songs = app?.songs;
        if (!Array.isArray(songs) || songs.length === 0) {
            this.empty.textContent = 'Loading songs...';
            this.empty.hidden = false;
            return;
        }

        const albums = app.albums instanceof Map ? Array.from(app.albums.values()) : [];
        const albumOrder = new Map(albums.map((album, index) => [album.id, index]));
        const byAlbum = new Map();
        songs.forEach((song) => {
            if (!song?.id) return;
            if (!byAlbum.has(song.albumId)) byAlbum.set(song.albumId, []);
            byAlbum.get(song.albumId).push(song);
        });

        const albumIds = Array.from(byAlbum.keys()).sort((a, b) => {
            const albumA = app.albums.get(a);
            const albumB = app.albums.get(b);
            const yearDiff = (albumA?.year ?? Infinity) - (albumB?.year ?? Infinity);
            if (yearDiff) return yearDiff;
            return (albumOrder.get(a) ?? Infinity) - (albumOrder.get(b) ?? Infinity);
        });

        const fragment = document.createDocumentFragment();
        let rowIndex = 0;

        albumIds.forEach((albumId) => {
            const album = app.albums.get(albumId);
            const albumName = album?.name || 'Other';
            const groupSongs = byAlbum.get(albumId).sort((a, b) =>
                (a.trackNumber ?? Infinity) - (b.trackNumber ?? Infinity) ||
                String(a.title).localeCompare(String(b.title))
            );

            const section = document.createElement('section');
            section.className = 'song-request-group';
            section.dataset.albumId = albumId;
            section.appendChild(this.createGroupHeader(album, albumName));

            const ul = document.createElement('ul');
            ul.className = 'song-request-rows';
            const group = { el: section, rows: [] };

            groupSongs.forEach((song) => {
                const row = this.createRow(song, rowIndex++);
                ul.appendChild(row.el);
                row.key = SongRequestUI.normalize(`${song.title} ${albumName}`);
                group.rows.push(row);
                this.rows.push(row);
            });

            section.appendChild(ul);
            fragment.appendChild(section);
            this.groups.push(group);
        });

        this.list.appendChild(fragment);
        this.empty.textContent = 'No songs match';
        this.empty.hidden = true;
        this.listBuilt = true;
    }

    createGroupHeader(album, albumName) {
        const header = document.createElement('div');
        header.className = 'song-request-group-header';

        const placeholder = 'assets/album-covers/placeholder.svg';
        const img = document.createElement('img');
        img.className = 'song-request-cover';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.width = 40;
        img.height = 40;
        img.addEventListener('error', () => {
            if (img.dataset.fallback) return;
            img.dataset.fallback = '1';
            img.src = placeholder;
        });
        img.src = album?.coverArt ? `assets/album-covers/${album.coverArt}` : placeholder;

        const meta = document.createElement('div');
        meta.className = 'song-request-album-meta';

        const name = document.createElement('span');
        name.className = 'song-request-album-name';
        name.textContent = albumName;

        const year = document.createElement('span');
        year.className = 'song-request-album-year';
        year.textContent = album?.year ? String(album.year) : '';

        meta.append(name, year);
        header.append(img, meta);
        return header;
    }

    createRow(song, index) {
        const li = document.createElement('li');
        li.className = 'song-request-row';
        li.dataset.songId = song.id;

        const title = document.createElement('span');
        title.className = 'song-request-title';
        title.id = `song-request-title-${index}`;
        title.textContent = song.title;

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'song-request-action';
        action.textContent = 'Request';
        action.setAttribute('aria-describedby', title.id);

        li.append(title, action);
        return { el: li, action, songId: song.id, key: '' };
    }

    // Syncs each row's button to queued / full / available
    renderRowStates() {
        if (!this.listBuilt) return;
        const queue = this.queue;
        const full = queue ? queue.pendingCount >= (queue.maxPending ?? 5) : false;

        this.rows.forEach(({ el, action, songId }) => {
            const queued = !!queue?.isQueued(songId);
            let label = 'Request';
            let disabled = !queue;
            if (queued) {
                label = 'Queued ✓';
                disabled = true;
            } else if (full) {
                label = 'Queue full';
                disabled = true;
            }
            if (action.textContent !== label) action.textContent = label;
            action.disabled = disabled;
            action.classList.toggle('is-queued', queued);
            action.classList.toggle('is-full', !queued && full);
            el.classList.toggle('is-queued', queued);
        });
    }

    // Token match across title + album name; hides empty album groups
    applyFilter(rawQuery) {
        if (!this.listBuilt) {
            this.buildList();
            if (!this.listBuilt) return;
            this.renderRowStates();
        }

        const tokens = SongRequestUI.normalize(rawQuery).split(' ').filter(Boolean);
        let anyVisible = false;

        this.groups.forEach((group) => {
            let groupVisible = false;
            group.rows.forEach((row) => {
                const match = tokens.every((token) => row.key.includes(token));
                row.el.hidden = !match;
                if (match) groupVisible = true;
            });
            group.el.hidden = !groupVisible;
            if (groupVisible) anyVisible = true;
        });

        this.empty.hidden = anyVisible;
    }

    // "Your requests" list, oldest request first, with progress and a remove button per song
    renderQueue() {
        if (!this.queueList) return;
        const app = window.kanyeApp;
        const queue = this.queue;
        const entries = queue ? queue.getQueue().sort((a, b) => a.requestedAt - b.requestedAt) : [];
        const total = queue?.appearancesPerRequest ?? 4;

        this.queueSection.hidden = entries.length === 0;
        this.queueCount.textContent = String(entries.length);
        this.queueList.replaceChildren(...entries.map((entry) => {
            const song = app?.songs?.find((s) => s.id === entry.songId);
            const album = song ? app.albums?.get(song.albumId) : null;
            const title = song?.title || entry.songId;
            const shown = total - entry.appearancesLeft;

            const li = document.createElement('li');
            li.className = 'song-request-queue-item';
            li.dataset.songId = entry.songId;

            const img = document.createElement('img');
            img.className = 'song-request-cover';
            img.alt = '';
            img.width = 32;
            img.height = 32;
            img.src = album?.coverArt ? `assets/album-covers/${album.coverArt}` : 'assets/album-covers/placeholder.svg';

            const meta = document.createElement('div');
            meta.className = 'song-request-queue-meta';
            const name = document.createElement('span');
            name.className = 'song-request-queue-title';
            name.textContent = title;
            const progress = document.createElement('span');
            progress.className = 'song-request-queue-progress';
            progress.textContent = shown === 0 ? 'Up next' : `Shown ${shown} of ${total}`;
            meta.append(name, progress);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'song-request-remove';
            remove.dataset.songId = entry.songId;
            remove.setAttribute('aria-label', `Remove ${title} from requests`);
            remove.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

            li.append(img, meta, remove);
            return li;
        }));
    }

    removeRequest(songId) {
        const queue = this.queue;
        if (!queue || typeof queue.remove !== 'function') return;
        const entry = queue.getQueue().find((e) => e.songId === songId);
        if (!entry || !queue.remove(songId)) return;

        const title = window.kanyeApp?.songs?.find((s) => s.id === songId)?.title || songId;
        const shown = (queue.appearancesPerRequest ?? 4) - entry.appearancesLeft;
        window.analytics?.trackSongRequestRemoved?.(title, shown);
        this.setStatus(`${title} removed from your requests`, 'ok');
        // Keep keyboard focus inside the panel without popping the phone keyboard via the search input
        const next = this.queueList.querySelector('.song-request-remove') || this.modal.querySelector('#song-request-close');
        next?.focus({ preventScroll: true });
    }

    request(songId) {
        const app = window.kanyeApp;
        this.tryBind();
        const queue = this.queue;
        if (!app || !queue) return;

        const song = app.songs.find((s) => s.id === songId);
        if (!song) return;

        const completed = app.elo?.getCompletedComparisons?.() ?? 0;
        const result = queue.enqueue(songId, completed);

        let message = '';
        if (result?.ok) {
            const albumName = app.albums?.get(song.albumId)?.name || '';
            message = `${song.title} is coming up soon`;
            window.analytics?.trackSongRequested?.(song.title, albumName, queue.pendingCount);
        } else if (result?.reason === 'full') {
            message = `Request queue is full (${queue.maxPending ?? 5} max)`;
        }

        this.updateBadge();
        this.renderRowStates();

        // Sheet closes, so confirm with a toast; the drawer stays open, so confirm inline instead of covering it
        if (this.mobileQuery.matches) {
            if (message) app.ui?.showSuccess?.(message);
            this.close();
        } else {
            this.setStatus(message, result?.ok ? 'ok' : 'warn');
        }
    }

    setStatus(message, tone = 'ok') {
        if (!this.status) return;
        clearTimeout(this.statusTimer);
        this.status.textContent = message;
        this.status.dataset.tone = tone;
        this.status.hidden = !message;
        if (message) this.statusTimer = setTimeout(() => { this.status.hidden = true; }, 3500);
    }

    // Lowercase, strip diacritics and apostrophes, collapse other punctuation to spaces
    static normalize(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/['‘’`]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
}

window.SongRequestUI = SongRequestUI;

(function initSongRequestUI() {
    const start = () => {
        if (!window.songRequestUI) window.songRequestUI = new SongRequestUI();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
