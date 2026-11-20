// Tier list: pure board logic (unit tested). Ranked items are bucketed into S-D by rank percentile;
// moves the user makes are pinned and survive rebuilds (e.g. after Continue Ranking).
(function (root) {
    const TIERS = ['S', 'A', 'B', 'C', 'D'];
    const UNRANKED = 'unranked';
    // Cumulative share of ranked items at or above each tier: S 10%, A 20%, B 30%, C 25%, D 15%
    const CUTOFFS = [0.10, 0.30, 0.60, 0.85, 1];
    const KINDS = ['songs', 'albums'];

    function emptyBoard() {
        const board = {};
        [...TIERS, UNRANKED].forEach(t => { board[t] = []; });
        return board;
    }

    // items: [{id, score}] with a numeric score -> Map id -> tier. Ties share a tier; #1 is always S.
    function bucket(items) {
        const ranked = items
            .map((item, i) => ({ ...item, i }))
            .sort((a, b) => (b.score - a.score) || (a.i - b.i));
        const n = ranked.length;
        const tiers = new Map();
        ranked.forEach((item, r) => {
            let tier;
            if (r === 0) {
                tier = 'S';
            } else if (item.score === ranked[r - 1].score) {
                tier = tiers.get(ranked[r - 1].id);
            } else {
                const pos = (r + 0.5) / n;
                tier = TIERS[CUTOFFS.findIndex(c => pos <= c)];
            }
            tiers.set(item.id, tier);
        });
        return tiers;
    }

    // D up to S, left to right within each tier; unranked tiles are not part of the reveal
    function revealOrder(board) {
        const order = [];
        [...TIERS].reverse().forEach(tier => {
            board[tier].forEach(id => order.push({ tier, id }));
        });
        return order;
    }

    function tierOf(board, id) {
        return [...TIERS, UNRANKED].find(t => board[t].includes(id)) || null;
    }

    function rankedCount(board) {
        return TIERS.reduce((sum, t) => sum + board[t].length, 0);
    }

    class TierListCore {
        constructor() {
            this.pins = { songs: new Map(), albums: new Map() };
        }

        // items: [{id, score}] where score is a number (ranked) or null (unranked), in display order for unranked
        build(kind, items) {
            const pins = this.pins[kind];
            const board = emptyBoard();
            const scored = items.filter(item => typeof item.score === 'number');
            const auto = bucket(scored);
            const scoreOf = new Map(items.map(item => [item.id, item.score]));
            const present = new Set(items.map(item => item.id));

            const byScore = scored
                .map((item, i) => ({ ...item, i }))
                .sort((a, b) => (b.score - a.score) || (a.i - b.i));
            byScore.forEach(item => {
                if (!pins.has(item.id)) board[auto.get(item.id)].push(item.id);
            });
            items.forEach(item => {
                if (typeof item.score !== 'number' && !pins.has(item.id)) board[UNRANKED].push(item.id);
            });

            // Pinned items: scored ones slot in by score, unscored ones go last in the order they were moved
            const pinnedScored = [];
            const pinnedUnscored = [];
            pins.forEach((tier, id) => {
                if (!present.has(id)) return;
                (typeof scoreOf.get(id) === 'number' ? pinnedScored : pinnedUnscored).push({ id, tier });
            });
            pinnedScored.forEach(({ id, tier }) => {
                const list = board[tier];
                const score = scoreOf.get(id);
                const at = list.findIndex(other => {
                    const s = scoreOf.get(other);
                    return typeof s !== 'number' || s < score;
                });
                list.splice(at === -1 ? list.length : at, 0, id);
            });
            pinnedUnscored.forEach(({ id, tier }) => board[tier].push(id));

            return board;
        }

        move(kind, id, tier) {
            if (!this.pins[kind] || !(TIERS.includes(tier) || tier === UNRANKED)) return false;
            this.pins[kind].delete(id);
            this.pins[kind].set(id, tier);
            return true;
        }

        hasEdits(kind) {
            return this.pins[kind].size > 0;
        }

        reset() {
            KINDS.forEach(kind => this.pins[kind].clear());
        }
    }

    Object.assign(TierListCore, { TIERS, UNRANKED, CUTOFFS, KINDS, bucket, revealOrder, tierOf, rankedCount, emptyBoard });
    root.TierListCore = TierListCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = TierListCore;
})(typeof window !== 'undefined' ? window : globalThis);
