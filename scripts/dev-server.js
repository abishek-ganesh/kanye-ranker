#!/usr/bin/env node
// Local dev server with the API: serves the site and runs api/taste.js the way Vercel does.
// serve.py only serves static files, so the taste card needs this. Reads ANTHROPIC_API_KEY from .env.local.
// Usage: node scripts/dev-server.js [port]   (default 8010)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.argv[2]) || 8010;

const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
        const match = line.match(/^([A-Z_]+)=(.+)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
}

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

// Gives a Node request/response the helpers Vercel adds (req.body, res.status().json())
async function runFunction(handler, req, res) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
        req.body = raw ? JSON.parse(raw) : undefined;
    } catch {
        req.body = undefined;
    }
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return res; };
    try {
        await handler(req, res);
    } catch (error) {
        console.error(error);
        if (!res.writableEnded) res.status(500).json({ error: 'server_error' });
    }
}

http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/api/taste') return runFunction(require('../api/taste.js'), req, res);

    const relative = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = path.join(root, relative);
    if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (error, data) => {
        if (error) { res.statusCode = 404; return res.end('Not found'); }
        res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
    });
}).listen(port, () => console.log(`Kanye Ranker with API on http://localhost:${port}`));
