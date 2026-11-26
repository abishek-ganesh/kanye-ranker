// Taste card on the song results page: "Roast me" / "Gas me up" fetch an AI parody of what Ye would say
// about the Top 10, shown with one real quote and era "DNA" bars. Request rules and eras live in
// TasteCore (js/taste-core.js); the share image is drawn by TasteCardExport (js/taste-card-export.js).
(function () {
    const ENDPOINT = '/api/taste';
    const TIMEOUT_MS = 25000;
    const MAX_REGENERATIONS = 3;
    const LOADING_STEP_MS = 1600;
    const LOADING_COPY = [
        'Ye is reading your list...',
        'Checking your Top 10 for deep cuts...',
        'Through the wire to Ye...',
        "Can't tell him nothing, but he's looking...",
        'No one man should have all that taste...',
        'Wait for it. He has thoughts...'
    ];
    const ERROR_COPY = {
        rateLimited: 'Ye needs a minute. Try again shortly.',
        generic: "Couldn't reach Ye. Try again."
    };
    const KICKER = { roast: 'The roast', hype: 'The hype' };
    const SHARE_TEXT = {
        roast: 'My Kanye Top 10 got roasted. Get yours at kanyeranker.com',
        hype: 'My Kanye Top 10 got gassed up. Get yours at kanyeranker.com'
    };
    const PARODY_LABEL = 'AI parody of Ye. Not a real quote.';

    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Builds an element with a class and optional text (text always goes in as textContent)
    function el(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    class TasteCardUI {
        constructor(app) {
            this.app = app;
            this.state = 'idle';
            this.tone = null;
            this.card = null;
            this.eras = [];
            this.signature = null;
            this.cache = new Map();
            this.regenerations = new Map();
            this.run = 0;
            this.controller = null;
            this.loadingTimer = null;
            this.sharing = false;

            const $ = id => document.getElementById(id);
            this.el = {
                section: $('taste-card'),
                tones: Array.from(document.querySelectorAll('.taste-tone-btn')),
                error: $('taste-error'),
                loading: $('taste-loading'),
                loadingText: $('taste-loading-text'),
                result: $('taste-card-result'),
                actions: $('taste-actions'),
                share: $('taste-share'),
                regenerate: $('taste-regenerate')
            };
            this.bind();
            this.setState('idle');
        }

        bind() {
            this.el.tones.forEach(btn => btn.addEventListener('click', () => this.selectTone(btn.dataset.tone)));
            this.el.regenerate.addEventListener('click', () => this.regenerate());
            this.el.share.addEventListener('click', () => this.share());
        }

        // The results list in order: the Top 10, then the song that just missed
        shownSongs() {
            return this.app.getTopSongs(TasteCore.TOP_MAX + 1);
        }

        signatureOf(shown) {
            return shown.slice(0, TasteCore.TOP_MAX).map(song => song.id).join(',');
        }

        key(tone) {
            return `${this.signature}|${tone}`;
        }

        regenerationsLeft(tone) {
            return MAX_REGENERATIONS - (this.regenerations.get(this.key(tone)) || 0);
        }

        // Called whenever the song results are shown: a changed Top 10 puts the section back to idle
        refresh() {
            const signature = this.signatureOf(this.shownSongs());
            if (signature === this.signature) {
                this.setState(this.state);
                return;
            }
            this.signature = signature;
            this.toIdle();
        }

        // Start Over: forget every card
        reset() {
            this.cache.clear();
            this.regenerations.clear();
            this.signature = null;
            this.toIdle();
        }

        toIdle() {
            this.cancelRequest();
            this.tone = null;
            this.card = null;
            this.eras = [];
            this.el.error.textContent = '';
            this.el.result.replaceChildren();
            this.setState('idle');
        }

        // Drops any in-flight request; its late answer is ignored through the run counter
        cancelRequest() {
            this.run++;
            this.controller?.abort();
            this.controller = null;
        }

        selectTone(tone) {
            if (this.state === 'loading' || !TasteCore.TONES.includes(tone)) return;
            this.refresh();
            const cached = this.cache.get(this.key(tone));
            if (cached) this.show(tone, cached);
            else this.request(tone, false);
        }

        regenerate() {
            if (this.state === 'loading' || !this.tone || this.regenerationsLeft(this.tone) <= 0) return;
            this.request(this.tone, true);
        }

        // Body for the endpoint: the shown Top 10 (+ just missed), and the lowest-rated compared songs
        buildRequest(tone) {
            const { elo, songRatings, songs } = this.app;
            const shownIds = this.shownSongs().map(song => song.id);
            const comparedIds = songs
                .filter(song => elo.getComparisonCount(song.id) > 0)
                .sort((a, b) => songRatings.get(b.id) - songRatings.get(a.id))
                .map(song => song.id);
            return TasteCore.buildRequest(tone, shownIds, comparedIds);
        }

        async request(tone, isRegenerate) {
            const key = this.key(tone);
            const previous = { tone: this.tone, card: this.card };
            this.cancelRequest();
            const run = this.run;
            const controller = this.controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

            this.tone = tone;
            this.card = null;
            this.el.error.textContent = '';
            this.setState('loading');
            window.analytics?.trackTasteCardRequested(tone, isRegenerate);

            try {
                const response = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.buildRequest(tone)),
                    signal: controller.signal
                });
                if (!response.ok) throw Object.assign(new Error(`Taste card HTTP ${response.status}`), { status: response.status });
                const card = await response.json();
                if (typeof card?.archetype !== 'string' || !Array.isArray(card.lines) || !card.lines.length) {
                    throw Object.assign(new Error('Taste card response malformed'), { status: 'bad_response' });
                }
                if (run !== this.run) return;

                this.cache.set(key, card);
                if (isRegenerate) this.regenerations.set(key, (this.regenerations.get(key) || 0) + 1);
                window.analytics?.trackTasteCardGenerated(tone, card.fallback === true);
                this.show(tone, card);
            } catch (error) {
                if (run !== this.run) return;
                const status = error.status || (error.name === 'AbortError' ? 'timeout' : 'network');
                window.analytics?.trackTasteCardFailed(tone, status);
                this.fail(status, previous);
            } finally {
                clearTimeout(timeout);
            }
        }

        show(tone, card) {
            this.tone = tone;
            this.card = card;
            this.eras = this.eraRows();
            this.el.error.textContent = '';
            this.renderCard();
            this.setState('ready');
            this.revealCard();
        }

        // Puts back whatever card was on screen before the failed request, with the message above it
        fail(status, previous) {
            this.tone = previous.card ? previous.tone : null;
            this.card = previous.card;
            this.el.error.textContent = status === 429 ? ERROR_COPY.rateLimited : ERROR_COPY.generic;
            this.setState('error');
        }

        // Share of the shown Top 10 in each era, by album year
        eraRows() {
            const years = this.shownSongs()
                .slice(0, TasteCore.TOP_MAX)
                .map(song => this.app.albums.get(song.albumId)?.year)
                .filter(Number.isFinite);
            return TasteCore.eraBreakdown(years);
        }

        // One place decides what is visible and enabled for the current state
        setState(state) {
            this.state = state;
            const loading = state === 'loading';
            const hasCard = !!this.card && !loading;
            const { section, tones, loading: loadingEl, result, actions, share, regenerate } = this.el;

            section.dataset.state = state;
            section.dataset.tone = this.tone || '';
            tones.forEach(btn => {
                btn.setAttribute('aria-pressed', String(btn.dataset.tone === this.tone));
                btn.disabled = loading;
            });
            loadingEl.hidden = !loading;
            result.hidden = !hasCard;
            result.setAttribute('aria-busy', String(loading));
            actions.hidden = !hasCard;
            share.hidden = !window.TasteCardExport;
            regenerate.hidden = !hasCard || this.regenerationsLeft(this.tone) <= 0;

            if (loading) this.startLoadingCopy();
            else this.stopLoadingCopy();
        }

        startLoadingCopy() {
            this.stopLoadingCopy();
            let step = 0;
            this.el.loadingText.textContent = LOADING_COPY[0];
            this.loadingTimer = setInterval(() => {
                step = (step + 1) % LOADING_COPY.length;
                this.el.loadingText.textContent = LOADING_COPY[step];
            }, LOADING_STEP_MS);
        }

        stopLoadingCopy() {
            clearInterval(this.loadingTimer);
            this.loadingTimer = null;
        }

        renderCard() {
            const { card, tone } = this;
            const result = this.el.result;

            const head = el('div', 'taste-result-head');
            head.append(el('span', 'taste-kicker', KICKER[tone]), el('span', 'taste-site', 'kanyeranker.com'));

            const lines = el('div', 'taste-lines');
            card.lines.forEach(line => lines.appendChild(el('p', 'taste-line', String(line))));

            const parts = [
                head,
                el('h3', 'taste-archetype', card.archetype),
                lines,
                el('p', 'taste-parody-label', PARODY_LABEL)
            ];

            if (typeof card.quote === 'string' && card.quote.trim()) {
                const quote = el('figure', 'taste-quote');
                quote.append(el('figcaption', 'taste-label', 'Real Ye quote'), el('blockquote', 'taste-quote-text', card.quote));
                parts.push(quote);
            }

            const dna = el('div', 'taste-dna');
            dna.appendChild(el('p', 'taste-label', 'Your Ye DNA'));
            this.eras.forEach(era => {
                const row = el('div', 'taste-dna-row');
                row.dataset.era = era.id;
                const track = el('span', 'taste-dna-track');
                track.setAttribute('aria-hidden', 'true');
                const fill = el('span', 'taste-dna-fill');
                fill.style.width = `${era.percent}%`;
                track.appendChild(fill);
                row.append(el('span', 'taste-dna-name', era.name), track, el('span', 'taste-dna-percent', `${era.percent}%`));
                dna.appendChild(row);
            });
            parts.push(dna);

            result.replaceChildren(...parts);
        }

        // Replays the entrance animation and brings a card that runs off screen back to its heading
        revealCard() {
            const { result, section } = this.el;
            result.classList.remove('is-entering');
            void result.offsetHeight;
            result.classList.add('is-entering');
            if (result.getBoundingClientRect().bottom > window.innerHeight) {
                section.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
            }
        }

        async share() {
            const { card, tone, eras } = this;
            if (!card || this.sharing || !window.TasteCardExport) return;
            this.sharing = true;
            this.el.share.disabled = true;
            try {
                const topSongs = this.shownSongs().slice(0, 3).map(song => ({
                    title: KanyeUtils.getCensoredTitle(song.title),
                    album: this.app.albums.get(song.albumId)?.name || ''
                }));
                const canvas = await TasteCardExport.render({ card, eras, topSongs });
                const blob = await TasteCardExport.toBlob(canvas);
                const method = await KanyeUtils.shareOrDownloadFile(blob, TasteCardExport.fileName(card), SHARE_TEXT[tone]);
                if (method !== 'cancelled') window.analytics?.trackTasteCardShared(tone, method);
            } catch (error) {
                KanyeUtils.handleError(error, 'taste-card-share');
            } finally {
                this.sharing = false;
                this.el.share.disabled = false;
            }
        }
    }

    // Boot once the app has loaded its data (app-init.js creates window.kanyeApp after window.load)
    function boot() {
        const app = window.kanyeApp;
        if (!document.getElementById('taste-card') || !window.TasteCore) return;
        if (!app || !app.songs?.length) {
            setTimeout(boot, 200);
            return;
        }
        if (!window.tasteCardUI) window.tasteCardUI = new TasteCardUI(app);
    }

    window.TasteCardUI = TasteCardUI;
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();
