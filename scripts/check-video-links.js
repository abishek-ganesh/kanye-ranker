// Checks every YouTube ID in data/video-links.json and exits 1 if any is
// removed, private, not embeddable or age-restricted. Run: node scripts/check-video-links.js
const fs = require('fs');
const path = require('path');

const LINKS_PATH = path.join(__dirname, '../data/video-links.json');
const CONCURRENCY = 4;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Groups song titles by video ID so shared IDs are checked once
function loadIds() {
    const { videoIds } = JSON.parse(fs.readFileSync(LINKS_PATH, 'utf8'));
    const byId = new Map();
    for (const [title, entry] of Object.entries(videoIds)) {
        const id = typeof entry === 'string' ? entry : entry?.id;
        if (!id) continue;
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(title);
    }
    return byId;
}

// oEmbed: 401 = embedding disabled, 400/403/404 = removed or private
async function checkOembed(id) {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reason: 'embedding disabled' };
    if ([400, 403, 404].includes(res.status)) return { ok: false, reason: `removed or private (oEmbed ${res.status})` };
    return { unknown: true, reason: `oEmbed HTTP ${res.status}` };
}

// Set once YouTube rate-limits or bot-checks us; later watch pages are skipped
let watchPageBlocked = null;

// Watch page player response catches age restriction, which oEmbed does not.
// YouTube often answers with a 429 or a bot check instead (always on CI runners),
// so anything that is not a definite answer is skipped or unknown, never a failure.
async function checkPlayability(id) {
    if (watchPageBlocked) return { skipped: true };
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US' }
    });
    if (res.status === 429) {
        watchPageBlocked = 'rate limited (HTTP 429)';
        return { skipped: true };
    }
    if (!res.ok) return { unknown: true, reason: `watch page HTTP ${res.status}` };
    const html = await res.text();
    const status = html.match(/"playabilityStatus":\{"status":"([A-Z_]+)"/)?.[1];
    const reason = html.match(/"playabilityStatus":\{[^}]*?"reason":"([^"]*)"/)?.[1] || '';
    const embeddable = html.match(/"playableInEmbed":(true|false)/)?.[1];

    if (/not a bot/i.test(reason)) {
        watchPageBlocked = 'bot check';
        return { skipped: true };
    }

    if (!status) return { unknown: true, reason: 'no player response' };
    if (status === 'OK') {
        return embeddable === 'false' ? { ok: false, reason: 'not playable in embed' } : { ok: true };
    }
    if (status === 'LOGIN_REQUIRED' && /age/i.test(reason)) return { ok: false, reason: 'age-restricted' };
    if (status === 'LOGIN_REQUIRED') return { unknown: true, reason: reason || 'login required' };
    return { ok: false, reason: `${status}${reason ? `: ${reason}` : ''}` };
}

async function checkId(id) {
    const oembed = await checkOembed(id);
    if (oembed.ok === false) return oembed;
    const play = await checkPlayability(id);
    if (play.ok === false || play.unknown) return play;
    if (oembed.unknown) return oembed;
    return play.skipped ? { ok: true, ageUnchecked: true } : { ok: true };
}

async function main() {
    const byId = loadIds();
    const ids = [...byId.keys()];
    const results = new Map();

    let next = 0;
    const worker = async () => {
        while (next < ids.length) {
            const id = ids[next++];
            try {
                results.set(id, await checkId(id));
            } catch (err) {
                results.set(id, { unknown: true, reason: err.message });
            }
            await sleep(300);
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const bad = ids.filter(id => results.get(id).ok === false);
    const unknown = ids.filter(id => results.get(id).unknown);
    const ageUnchecked = ids.filter(id => results.get(id).ageUnchecked);
    const line = id => `  ${id}  ${byId.get(id).join(' / ')}: ${results.get(id).reason}`;

    console.log(`Checked ${ids.length} videos (${[...byId.values()].flat().length} titles)`);
    if (ageUnchecked.length) console.log(`\nAge restriction not checked for ${ageUnchecked.length}: YouTube ${watchPageBlocked}, so only oEmbed ran for those (normal on CI; try again later locally)`);
    if (unknown.length) console.log(`\nCould not verify ${unknown.length} (not counted as failures):\n${unknown.map(line).join('\n')}`);
    if (bad.length) {
        console.log(`\nBroken ${bad.length}:\n${bad.map(line).join('\n')}`);
        process.exit(1);
    }
    console.log('\nNo broken videos found');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
