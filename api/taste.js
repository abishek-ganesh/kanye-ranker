// POST /api/taste: { tone, top: [song ids], bottom?: [song ids], missed?: song id } -> taste card JSON.
// The key lives in ANTHROPIC_API_KEY (Vercel env); nothing from the browser reaches the prompt as text.
const AnthropicModule = require('@anthropic-ai/sdk');
const taste = require('./_lib/taste.js');

const Anthropic = AnthropicModule.default || AnthropicModule;

// The site and local dev, plus this deployment's own Vercel URLs (previews), which Vercel provides as env vars.
// A browser-only check: scripts can send any Origin, so the rate limit and spend cap are the real protection.
const SITE_ORIGIN = /^(https:\/\/(www\.)?kanyeranker\.com|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

function isAllowedOrigin(origin) {
    if (SITE_ORIGIN.test(origin)) return true;
    return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].some(host => host && origin === `https://${host}`);
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) return res.status(403).json({ error: 'forbidden' });

    let ranking;
    try {
        ranking = taste.validate(req.body);
    } catch (error) {
        if (error instanceof taste.TasteRequestError) return res.status(400).json({ error: 'bad_request', message: error.message });
        throw error;
    }

    try {
        const { card } = await taste.generate(ranking);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(card);
    } catch (error) {
        if (error instanceof Anthropic.RateLimitError) return res.status(503).json({ error: 'busy' });
        if (error instanceof Anthropic.APIError) {
            console.error('taste card failed', error.status, error.message);
            return res.status(502).json({ error: 'upstream' });
        }
        console.error('taste card crashed', error);
        return res.status(500).json({ error: 'server_error' });
    }
}

module.exports = handler;
module.exports.config = { maxDuration: 30 };
