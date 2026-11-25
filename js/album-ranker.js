// Album mode: pure pairing + rating engine (unit tested). Albums go head to head, ratings come from EloRating.
// Pairing: unseen albums first, then the least-compared album against a close-rated album it hasn't faced.
(function (root) {
    const INITIAL_RATING = 1500;
    const MAX_SKIPS = 3;
    const CLOSEST = 3;

    class AlbumRankerCore {
        constructor(albumIds, { Elo = root.EloRating, random = Math.random } = {}) {
            this.ids = [...albumIds];
            this.Elo = Elo;
            this.random = random;
            this.reset();
        }

        reset() {
            this.elo = new this.Elo();
            this.ratings = new Map(this.ids.map(id => [id, INITIAL_RATING]));
            this.history = [];
            this.pending = null;
            this.lastPair = null;
        }

        current() {
            if (!this.pending) this.pending = this.nextPair();
            return this.pending ? [...this.pending] : null;
        }

        choose(winnerId) {
            const pair = this.current();
            if (!pair || !pair.includes(winnerId)) return false;
            const [a, b] = pair;
            const before = { a: this.ratings.get(a), b: this.ratings.get(b) };
            const { newRatingA, newRatingB } = this.elo.updateRatings(before.a, before.b, winnerId === a ? 1 : 0, a, b);
            this.elo.recordComparison(a, b, winnerId);
            this.ratings.set(a, newRatingA);
            this.ratings.set(b, newRatingB);
            this.history.push({ pair, before, lastPair: this.lastPair });
            this.lastPair = pair;
            this.pending = null;
            return true;
        }

        skip() {
            const pair = this.current();
            if (!pair) return false;
            this.elo.recordSkip(pair[0], pair[1]);
            this.lastPair = pair;
            this.pending = null;
            return true;
        }

        undo() {
            const entry = this.history.pop();
            if (!entry) return false;
            const [a, b] = entry.pair;
            this.ratings.set(a, entry.before.a);
            this.ratings.set(b, entry.before.b);
            this.elo.removeLastComparison(a, b);
            this.lastPair = entry.lastPair;
            this.pending = entry.pair;
            return true;
        }

        canUndo() {
            return this.history.length > 0;
        }

        completed() {
            return this.elo.getCompletedComparisons();
        }

        comparisonCount(id) {
            return this.elo.getComparisonCount(id);
        }

        rating(id) {
            return this.ratings.get(id);
        }

        items() {
            return this.ids.map(id => ({ id, score: this.comparisonCount(id) > 0 ? this.rating(id) : null }));
        }

        shuffled(list) {
            const out = [...list];
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        }

        pick(list) {
            return list[Math.floor(this.random() * list.length)];
        }

        // All pairs still offerable, narrowed by the soft rules (no skipped pairs, no repeat cover) while possible
        candidatePairs() {
            const valid = [];
            for (let i = 0; i < this.ids.length; i++) {
                for (let j = i + 1; j < this.ids.length; j++) {
                    const a = this.ids[i], b = this.ids[j];
                    if (this.elo.hasBeenCompared(a, b)) continue;
                    const skips = this.elo.getSkipCount(a, b);
                    if (skips >= MAX_SKIPS) continue;
                    valid.push({ a, b, skipped: skips > 0 });
                }
            }
            const prev = new Set(this.lastPair || []);
            const fresh = p => !prev.has(p.a) && !prev.has(p.b);
            const tiers = [p => !p.skipped && fresh(p), p => !p.skipped, fresh];
            for (const keep of tiers) {
                const pairs = valid.filter(keep);
                if (pairs.length) return pairs;
            }
            return valid;
        }

        nextPair() {
            const pairs = this.candidatePairs();
            if (!pairs.length) return null;
            const counts = new Map(this.ids.map(id => [id, this.comparisonCount(id)]));

            const unseenPairs = pairs.filter(p => counts.get(p.a) === 0 && counts.get(p.b) === 0);
            if (unseenPairs.length) return this.order(this.pick(unseenPairs));

            const opponents = new Map();
            pairs.forEach(({ a, b }) => {
                if (!opponents.has(a)) opponents.set(a, []);
                if (!opponents.has(b)) opponents.set(b, []);
                opponents.get(a).push(b);
                opponents.get(b).push(a);
            });
            const focal = this.shuffled([...opponents.keys()]).sort((x, y) => counts.get(x) - counts.get(y))[0];
            const rating = this.ratings.get(focal);
            const closest = this.shuffled(opponents.get(focal))
                .sort((x, y) => Math.abs(this.ratings.get(x) - rating) - Math.abs(this.ratings.get(y) - rating));
            // A lone unseen album meets its closest-rated rival; otherwise pick among the few closest
            const pool = counts.get(focal) === 0 ? closest.slice(0, 1) : closest.slice(0, CLOSEST);
            return this.order({ a: focal, b: this.pick(pool) });
        }

        order({ a, b }) {
            return this.random() < 0.5 ? [a, b] : [b, a];
        }
    }

    Object.assign(AlbumRankerCore, { INITIAL_RATING, MAX_SKIPS, CLOSEST });
    root.AlbumRankerCore = AlbumRankerCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = AlbumRankerCore;
})(typeof window !== 'undefined' ? window : globalThis);
