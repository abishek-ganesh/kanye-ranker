// Taste card: validates a ranking sent by the results page, builds the prompt from the catalog
// (the browser only sends song ids, never text), and asks Claude for the card.
const AnthropicModule = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');
const TasteCore = require('../../js/taste-core.js');
const QUOTES = require('../../js/kanye-quotes.js');
const REFERENCES = require('./ye-references.js');
const catalog = require('../../data/songs.json');

const Anthropic = AnthropicModule.default || AnthropicModule;

const MODEL = 'claude-sonnet-5-5';
// Thinking counts toward max_tokens, so leave room beyond the ~150 tokens of card text
const MAX_TOKENS = 2000;
const LINE_MAX_CHARS = 180;
// Real quotes offered per request; a fresh random handful keeps regenerated cards from reusing one quote
const QUOTE_CHOICES = 6;
// Lyrics and sayings offered per request: all that match the fan's own picks, plus a few from elsewhere
const SNUBBED_REFERENCES = 3;
const SAYING_CHOICES = 4;
const ARCHETYPE_MAX_CHARS = 40;

const ALBUMS = new Map(catalog.albums.map(album => [album.id, album]));
const SONGS = new Map(catalog.songs.map(song => [song.id, song]));

// Popularity within the catalog: top 15% by streams are hits, bottom 35% are deep cuts
const BY_STREAMS = [...catalog.songs].sort((a, b) => b.spotifyStreams - a.spotifyStreams);
const POPULARITY = new Map(BY_STREAMS.map((song, index) => {
    const position = index / BY_STREAMS.length;
    return [song.id, position < 0.15 ? 'hit' : position >= 0.65 ? 'deep cut' : ''];
}));

const CardSchema = z.object({
    archetype: z.string(),
    lines: z.array(z.string()),
    quote_index: z.number().int()
});

class TasteRequestError extends Error {}

function censor(title) {
    return title === 'Niggas in Paris' ? 'N****s in Paris' : title;
}

function idList(value, name, min, max) {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
        throw new TasteRequestError(`${name} must list ${min} to ${max} song ids`);
    }
    value.forEach(id => {
        if (typeof id !== 'string' || !SONGS.has(id)) throw new TasteRequestError(`${name} has an unknown song id`);
    });
    return value;
}

// Returns { tone, top, bottom, missed } as catalog songs, or throws TasteRequestError
function validate(body) {
    if (!body || typeof body !== 'object') throw new TasteRequestError('Body must be a JSON object');
    if (!TasteCore.TONES.includes(body.tone)) throw new TasteRequestError('Unknown tone');

    const top = idList(body.top, 'top', TasteCore.TOP_MIN, TasteCore.TOP_MAX);
    const bottom = idList(body.bottom ?? [], 'bottom', 0, TasteCore.BOTTOM_MAX);
    const missed = body.missed == null ? [] : idList([body.missed], 'missed', 1, 1);

    const all = [...top, ...bottom, ...missed];
    if (new Set(all).size !== all.length) throw new TasteRequestError('A song id is repeated');

    const songs = ids => ids.map(id => SONGS.get(id));
    return { tone: body.tone, top: songs(top), bottom: songs(bottom), missed: songs(missed)[0] || null };
}

function songLine(song) {
    const album = ALBUMS.get(song.albumId);
    const popularity = POPULARITY.get(song.id);
    return `${censor(song.title)} | ${album.name} (${album.year})${popularity ? ` | ${popularity}` : ''}`;
}

const SYSTEM_PROMPT = `You write the "taste card" for Kanye Ranker (kanyeranker.com), a fan site where people rank Kanye West songs head to head. A fan has just finished ranking and tapped a button to hear what Ye would say about their list. What you write appears on their results page and on an image they send to friends, labelled as an AI parody and not a real quote.

What makes a card good
The card is unmistakably about this fan's list. The fan should feel seen, and a friend reading it should want to try the ranker to get their own. That comes from specifics: the song they put at #1, an album that dominates the list or is missing from it, a classic sitting in their bottom picks, a list that is all hits or all deep cuts, a hard swerve between eras. A line that could be pasted onto anyone's list has failed. Name at least two of their songs or albums across the card.

The voice
Ye speaking directly to the fan as "you", in the register of his interviews and old tweets: total self-belief, grand comparisons, sudden sincerity, short declarative sentences, now and then one word in ALL CAPS. He treats his catalog as sacred and takes the fan's choices personally. He never talks down one of his own songs or albums: when something is wrong with a list, the offence is what the fan did (ranked a classic low, left an album out, played it safe), never the music. He is funny because he is completely serious, so write speech, not a joke with a setup and a punchline. Start in the middle of the thought: no "Yo", no "Listen", no narration such as "Ye would say".

His own words
This is where most of the humour lives. Each request lists lyrics, skits and sayings of his that connect to this fan's list, and sometimes facts about a newer album on it. Build at least two of your lines on one of them, turned on the fan: keep enough of the original that a fan hears it instantly, and bend the rest so it is about their list, by swapping in their song, their album or their ranking, or by aiming the line at what they did. A lyric from a song they ranked high or low is funniest used against that very ranking. Use each reference once, one per line, and do not recite it unchanged with nothing added. Use only what the request lists and never extend a lyric past the words given: a misquoted lyric is the first thing a fan notices, and anything longer than these short lines is not ours to print. Give each line a different job and a different shape; one can react to a specific pick, another can pass a verdict on the fan as a person of taste. Album facts are things a fan already knows, not his words: react to them in his voice, never present them as a lyric or a quote. The fan could be anyone, so they are only ever "you": no "man", "king", "queen" or "bro".

The tone is set per request:
- roast: he takes their choices as a personal slight and tells them so. It targets their taste and nothing else, and it lands as affectionate: the fan should laugh and want to show someone, not feel insulted.
- hype: he sees his own greatness reflected in their choices and praises the specific ones in the most grandiose terms he has. It is funny because of how far he takes it. A hype card contains no criticism at all: what they left out or ranked low is either the mark of a bold mind or not mentioned.

Each request also names what to lead with. Open the card there, then go wherever the list is most interesting.

What you return
- archetype: a title for this fan, two to five words, in title case, that a friend would understand without seeing the list. It names the kind of fan they are, in the card's tone. No quotation marks.
- lines: two or three lines in his voice. Each stands on its own and is short: one or two sentences, around 100 characters and never more than 140, because it is set large on a phone-sized image.
- quote_index: the number of the real Kanye quote, from the handful listed in the request, that best fits this fan and this tone. It is printed under your lines as a genuine quote, so pick for fit, and do not repeat or paraphrase it in your lines.

Facts
The request gives each song with its album and year, marks the biggest hits and the deep cuts, and lists which eras and albums the fan favoured or left out. Build on those, plus what is common knowledge among fans about these albums. Leave out details you are not sure of, such as who produced or featured on a track, chart positions or sales: one confident wrong detail ruins the card for a fan who knows better. Write titles exactly as given; one is censored on purpose.

Limits, and why
The card is public, carries a real person's name and gets shared without context, so it stays entirely about the music and the fan's taste:
- Nothing about his politics, religion, mental health, relationships, family (his mother included, even when a song title mentions her), feuds or controversies, and nothing about any other living person, including collaborators. He can compare himself or the fan to historical greats, as he does.
- Tease the fan's taste only, never who they might be.
- No slurs and no profanity stronger than "damn".
- Lyrics and sayings come only from the request, as described above. Titles of songs and albums are always fine.`;

function pickRandom(list, count, random) {
    const pool = [...list];
    const picked = [];
    while (picked.length < count && pool.length) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return picked;
}

// One opening angle per request, so a regenerated card does not retrace the last one
function leads({ tone, top, bottom, missed }, favoured, hits, deepCuts) {
    const options = [`their #1 pick, ${censor(top[0].title)}`];
    if (favoured.length) options.push(`how much of the list is ${ALBUMS.get(favoured[0][0]).name}`);
    // Omissions and low ranks are roast material; leading a hype card with them turns it into a roast
    if (tone === 'roast') {
        options.push('an album that is missing from the list');
        if (bottom.length) options.push('what they ranked at the bottom');
        if (missed) options.push(`the song that just missed, ${censor(missed.title)}`);
    }
    if (hits >= 6) options.push('how many of the picks are the biggest hits');
    if (deepCuts >= 4) options.push('how many of the picks are deep cuts');
    return options;
}

// His own words that connect to this list: lyrics from the fan's picks, from albums they left out, skits, album facts and sayings
function buildReferences({ top, bottom, missed }, absentAlbums, random) {
    const lyric = (song, where) => (REFERENCES.songs[song.title] || [])
        .map(text => `- ${censor(song.title)} (${where}): "${text}"`);
    const own = [
        ...top.flatMap((song, index) => lyric(song, `their #${index + 1}`)),
        ...(missed ? lyric(missed, `just missed at #${top.length + 1}`) : []),
        ...bottom.flatMap(song => lyric(song, 'a bottom pick'))
    ];
    // An album whose only listed song is a bottom pick or the near miss was ranked low, not left out
    const lowOnly = new Set([...bottom, ...(missed ? [missed] : [])].map(song => song.albumId));
    const absentIds = new Set(absentAlbums.map(album => album.id).filter(id => !lowOnly.has(id)));
    const listed = new Set([...top, ...bottom, ...(missed ? [missed] : [])].map(song => song.id));
    const snubbed = pickRandom(
        catalog.songs.filter(song => absentIds.has(song.albumId) && !listed.has(song.id) && REFERENCES.songs[song.title]),
        SNUBBED_REFERENCES, random
    ).flatMap(song => lyric(song, `from ${ALBUMS.get(song.albumId).name}, which they left out`).slice(0, 1));
    const present = new Set(top.map(song => song.albumId));
    const skits = Object.entries(REFERENCES.skits).map(([albumId, text]) =>
        `- ${text} (${present.has(albumId) ? 'this album is on their list' : lowOnly.has(albumId) ? 'they ranked this album low' : 'they left this album out'})`);
    const onList = new Set([...present, ...lowOnly]);
    const albumFacts = Object.entries(REFERENCES.albums).filter(([albumId]) => onList.has(albumId)).map(([albumId, text]) =>
        `- ${text} (${present.has(albumId) ? 'this album is on their list' : 'they ranked this album low'})`);
    const sayings = pickRandom(REFERENCES.sayings, SAYING_CHOICES, random).map(text => `- "${text}"`);

    const parts = [];
    if (own.length) parts.push(`Lyrics from songs on their list:\n${own.join('\n')}`);
    if (snubbed.length) parts.push(`Lyrics from albums they left out:\n${snubbed.join('\n')}`);
    parts.push(`Skits:\n${skits.join('\n')}`);
    if (albumFacts.length) parts.push(`About albums on their list:\n${albumFacts.join('\n')}`);
    parts.push(`Things he has said:\n${sayings.join('\n')}`);
    return `<his_words>\n${parts.join('\n\n')}\n</his_words>`;
}

// The per-request half of the prompt: the fan's list as plain facts. quoteChoices are indexes into QUOTES
function buildUserMessage({ tone, top, bottom, missed }, quoteChoices, random = Math.random) {
    const eras = TasteCore.eraBreakdown(top.map(song => ALBUMS.get(song.albumId).year));
    const albumCounts = new Map();
    top.forEach(song => albumCounts.set(song.albumId, (albumCounts.get(song.albumId) || 0) + 1));
    const favoured = [...albumCounts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
    const absent = catalog.albums.filter(album => !albumCounts.has(album.id));
    const hits = top.filter(song => POPULARITY.get(song.id) === 'hit').length;
    const deepCuts = top.filter(song => POPULARITY.get(song.id) === 'deep cut').length;

    const lead = pickRandom(leads({ tone, top, bottom, missed }, favoured, hits, deepCuts), 1, random)[0];
    const sections = [
        `Tone: ${tone}\nLead with: ${lead}`,
        `<top_songs>\n${top.map((song, index) => `#${index + 1} ${songLine(song)}`).join('\n')}\n</top_songs>`
    ];
    if (missed) sections.push(`<just_missed>\n#${top.length + 1} ${songLine(missed)}\n</just_missed>`);
    if (bottom.length) {
        sections.push(`<bottom_picks>\nSongs this fan kept picking against, ranked lowest of everything they were shown:\n${bottom.map(songLine).join('\n')}\n</bottom_picks>`);
    }
    sections.push([
        '<summary>',
        `Top ${top.length} by era: ${eras.map(era => `${era.name} ${era.percent}%`).join(', ')}`,
        `Biggest hits in the top ${top.length}: ${hits}. Deep cuts: ${deepCuts}.`,
        favoured.length
            ? `Albums with two or more songs: ${favoured.map(([id, count]) => `${ALBUMS.get(id).name} (${count})`).join(', ')}`
            : 'No album has more than one song in the list.',
        `Albums with no song in the top ${top.length}: ${absent.map(album => album.name).join(', ') || 'none'}`,
        '</summary>'
    ].join('\n'));
    sections.push(buildReferences({ top, bottom, missed }, absent, random));
    sections.push(`<real_quotes>\n${quoteChoices.map((quoteIndex, choice) => `${choice}. ${QUOTES[quoteIndex].quote}`).join('\n')}\n</real_quotes>`);
    return sections.join('\n\n');
}

// Tidies model text; anything over the limit is cut back to its last full sentence (or dropped)
function clip(text, max) {
    let clean = String(text).replace(/\s+/g, ' ').trim();
    // Drop quote marks only when they wrap the whole line; a line may open with a quoted lyric
    if (/^["“][^"“”]*["”]$/.test(clean)) clean = clean.slice(1, -1).trim();
    if (clean.length <= max) return clean;
    const sentences = clean.slice(0, max).match(/^.*[.!?]/);
    return sentences ? sentences[0] : '';
}

// Turns the model's JSON into what the page shows, or null if it is unusable
function toCard(parsed, tone, quoteChoices) {
    if (!parsed) return null;
    const lines = parsed.lines.map(line => clip(line, LINE_MAX_CHARS)).filter(Boolean).slice(0, 3);
    const archetype = String(parsed.archetype).replace(/\s+/g, ' ').trim().slice(0, ARCHETYPE_MAX_CHARS);
    if (!lines.length || !archetype) return null;
    const quote = QUOTES[quoteChoices[parsed.quote_index] ?? quoteChoices[0]];
    return { tone, archetype, lines, quote: quote.quote, fallback: false };
}

// Shown when Claude declines or returns nothing usable, so the button never dead-ends
const FALLBACK = {
    roast: { archetype: 'The Unreadable One', lines: ['I looked at this list twice and it still would not explain itself.', 'Nobody has ever ranked like this. I am not saying that is a good thing.'], quote: 19 },
    hype: { archetype: 'The Visionary', lines: ['This list is ahead of its time. People will study it.', 'You did not rank songs. You curated a museum.'], quote: 8 }
};

function fallbackCard(tone) {
    const { archetype, lines, quote } = FALLBACK[tone];
    return { tone, archetype, lines, quote: QUOTES[quote].quote, fallback: true };
}

let sharedClient = null;

// Asks Claude for the card. Returns { card, usage, stopReason }; SDK errors (rate limit, network) propagate
async function generate(ranking, { client, random = Math.random, model = MODEL } = {}) {
    const anthropic = client || (sharedClient ||= new Anthropic({ timeout: 12_000, maxRetries: 1 }));
    const quoteChoices = pickRandom(QUOTES.map((_, index) => index), QUOTE_CHOICES, random);
    // Server-side fallback: if the model's safety filters decline, the API retries on its default fallback model
    let response;
    try {
        response = await anthropic.beta.messages.parse({
            model,
            max_tokens: MAX_TOKENS,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: buildUserMessage(ranking, quoteChoices, random) }],
            output_config: { effort: 'low', format: zodOutputFormat(CardSchema) }
        });
    } catch (error) {
        // The SDK throws a plain AnthropicError when the reply is not complete JSON (cut off or declined midway)
        if (error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError)) {
            return { card: fallbackCard(ranking.tone), usage: null, stopReason: 'unparsed' };
        }
        throw error;
    }
    const usable = response.stop_reason === 'end_turn';
    const card = (usable && toCard(response.parsed_output, ranking.tone, quoteChoices)) || fallbackCard(ranking.tone);
    return { card, usage: response.usage, stopReason: response.stop_reason };
}

module.exports = { MODEL, SYSTEM_PROMPT, TasteRequestError, validate, buildUserMessage, toCard, fallbackCard, generate };
