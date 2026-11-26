// TasteCore: shared rules for the AI taste card (eras, tones, request limits). Pure; used by the
// browser for the DNA bars and by api/taste.js for the prompt. Unit tested.
(function (root) {
    'use strict';

    const TONES = ['roast', 'hype'];

    // Top picks sent to the endpoint, and the lowest-rated compared songs sent as "bottom picks"
    const TOP_MIN = 5;
    const TOP_MAX = 10;
    const BOTTOM_MAX = 3;

    // Contiguous by album year; `until` is the last year of the era
    const ERAS = [
        { id: 'college', name: 'College Trilogy', until: 2007 },
        { id: 'experimental', name: 'Experimental Era', until: 2013 },
        { id: 'modern', name: 'Modern Ye', until: 2019 },
        { id: 'new', name: 'New Chapter', until: Infinity }
    ];

    function eraOf(year) {
        return ERAS.find(era => year <= era.until) || ERAS[ERAS.length - 1];
    }

    // Share of the given album years in each era, every era listed, percents rounded to sum to 100
    function eraBreakdown(years) {
        const counts = new Map(ERAS.map(era => [era.id, 0]));
        years.forEach(year => {
            const era = eraOf(year);
            counts.set(era.id, counts.get(era.id) + 1);
        });
        const total = years.length;
        const rows = ERAS.map(era => {
            const count = counts.get(era.id);
            const exact = total ? (count / total) * 100 : 0;
            return { id: era.id, name: era.name, count, percent: Math.floor(exact), remainder: exact - Math.floor(exact) };
        });
        // Largest remainder: hand the leftover points to the eras that were rounded down the most
        let leftover = total ? 100 - rows.reduce((sum, row) => sum + row.percent, 0) : 0;
        [...rows].sort((a, b) => b.remainder - a.remainder).forEach(row => {
            if (leftover > 0) { row.percent++; leftover--; }
        });
        return rows.map(({ remainder, ...row }) => row);
    }

    // Body for POST /api/taste. shownIds: the results list in order (top picks, then the one that just
    // missed). comparedIds: every song the user compared, best first; its tail becomes the bottom picks.
    function buildRequest(tone, shownIds, comparedIds) {
        const top = shownIds.slice(0, TOP_MAX);
        const missed = shownIds[TOP_MAX] || null;
        const used = new Set(missed ? [...top, missed] : top);
        const bottom = comparedIds.filter(id => !used.has(id)).slice(-BOTTOM_MAX).reverse();
        return { tone, top, missed, bottom };
    }

    const TasteCore = { TONES, TOP_MIN, TOP_MAX, BOTTOM_MAX, ERAS, eraOf, eraBreakdown, buildRequest };
    root.TasteCore = TasteCore;
    if (typeof module !== 'undefined' && module.exports) module.exports = TasteCore;
})(typeof window !== 'undefined' ? window : globalThis);
