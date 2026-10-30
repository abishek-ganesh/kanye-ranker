// FIFO queue of user-requested songs. Each request is injected into upcoming
// comparisons a fixed number of times, spaced out so requests never run back to back.
class SongRequestQueue {
    constructor({
        maxPending = 5,
        appearancesPerRequest = 4,
        minGapBetweenInjections = 2,
        respawnDelay = 3,
        storageKey = 'song-requests'
    } = {}) {
        this.maxPending = maxPending;
        this.appearancesPerRequest = appearancesPerRequest;
        this.minGapBetweenInjections = minGapBetweenInjections;
        this.respawnDelay = respawnDelay;
        this.storageKey = storageKey;
        this.entries = [];
        this.lastInjectedAt = null;
        this.listeners = new Set();
        this._load();
    }

    enqueue(songId, completedComparisons = 0) {
        if (this.isQueued(songId)) return { ok: false, reason: 'duplicate' };
        if (this.entries.length >= this.maxPending) return { ok: false, reason: 'full' };

        this.entries.push({
            songId,
            appearancesLeft: this.appearancesPerRequest,
            nextEligibleAt: completedComparisons,
            requestedAt: Date.now()
        });
        this._changed();
        return { ok: true };
    }

    isQueued(songId) {
        return this.entries.some(entry => entry.songId === songId);
    }

    get pendingCount() {
        return this.entries.length;
    }

    getQueue() {
        return this.entries.slice();
    }

    // True when an entry is eligible and enough comparisons have passed since the last injection
    shouldInject(completedComparisons) {
        const hasEligible = this.entries.some(entry => entry.nextEligibleAt <= completedComparisons);
        if (!hasEligible) return false;
        return this.lastInjectedAt === null ||
            completedComparisons - this.lastInjectedAt >= this.minGapBetweenInjections;
    }

    // Consumes one appearance of the first eligible entry; re-queues it at the back until exhausted
    takeNext(completedComparisons) {
        const index = this.entries.findIndex(entry => entry.nextEligibleAt <= completedComparisons);
        if (index === -1) return null;

        const [entry] = this.entries.splice(index, 1);
        entry.appearancesLeft--;
        this.lastInjectedAt = completedComparisons;

        if (entry.appearancesLeft > 0) {
            entry.nextEligibleAt = completedComparisons + this.respawnDelay;
            this.entries.push(entry);
        }

        this._changed();
        return entry.songId;
    }

    // Undo support: copy of queue state at the moment a choice is made
    snapshot() {
        return {
            entries: this.entries.map(entry => ({ ...entry })),
            lastInjectedAt: this.lastInjectedAt
        };
    }

    // Undo support: rewinds to a snapshot while keeping user edits made since.
    // consumedSongIds are songs injected after the snapshot; a snapshot entry
    // missing now was either exhausted by that injection (restore it) or
    // removed by the user (keep it removed). Requests added since are kept.
    restore(snapshot, consumedSongIds = []) {
        const currentIds = new Set(this.entries.map(entry => entry.songId));
        const snapshotIds = new Set(snapshot.entries.map(entry => entry.songId));

        const restored = snapshot.entries
            .filter(entry => currentIds.has(entry.songId) || consumedSongIds.includes(entry.songId))
            .map(entry => ({ ...entry }));
        const addedSince = this.entries.filter(entry => !snapshotIds.has(entry.songId));

        this.entries = [...restored, ...addedSince];
        this.lastInjectedAt = snapshot.lastInjectedAt;
        this._changed();
    }

    // Drops a request entirely, whatever appearances it had left; returns true if it was queued
    remove(songId) {
        const index = this.entries.findIndex(entry => entry.songId === songId);
        if (index === -1) return false;
        this.entries.splice(index, 1);
        this._changed();
        return true;
    }

    clear() {
        this.entries = [];
        this.lastInjectedAt = null;
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Could not clear song requests:', error);
        }
        this._notify();
    }

    onChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _changed() {
        this._save();
        this._notify();
    }

    _notify() {
        const count = this.pendingCount;
        this.listeners.forEach(callback => {
            try {
                callback(count);
            } catch (error) {
                console.error('Song request listener failed:', error);
            }
        });
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                entries: this.entries,
                lastInjectedAt: this.lastInjectedAt
            }));
        } catch (error) {
            console.warn('Could not save song requests:', error);
        }
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (Array.isArray(saved?.entries)) this.entries = saved.entries;
            if (typeof saved?.lastInjectedAt === 'number') this.lastInjectedAt = saved.lastInjectedAt;
        } catch (error) {
            console.warn('Could not load song requests:', error);
        }
    }
}

window.SongRequestQueue = SongRequestQueue;
