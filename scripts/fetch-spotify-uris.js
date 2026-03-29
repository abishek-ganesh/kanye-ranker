#!/usr/bin/env node
/**
 * Fetch Spotify track URIs for all songs in songs.json
 *
 * Usage:
 *   node scripts/fetch-spotify-uris.js <CLIENT_ID> <CLIENT_SECRET>
 *
 * This uses the Spotify Client Credentials flow (no user auth needed)
 * to search for each song and add its spotifyUri to songs.json.
 */

const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Usage: node scripts/fetch-spotify-uris.js <CLIENT_ID> <CLIENT_SECRET>');
    process.exit(1);
}

const SONGS_PATH = path.join(__dirname, '..', 'data', 'songs.json');

// Album name mapping for better search accuracy
const ALBUM_NAMES = {
    'cd': 'The College Dropout',
    'lr': 'Late Registration',
    'grad': 'Graduation',
    '808s': '808s & Heartbreak',
    'mbdtf': 'My Beautiful Dark Twisted Fantasy',
    'wtt': 'Watch the Throne',
    'cruel': 'Cruel Summer',
    'yeezus': 'Yeezus',
    'tlop': 'The Life of Pablo',
    'ye': 'ye',
    'ksg': 'Kids See Ghosts',
    'jik': 'Jesus Is King',
    'donda': 'Donda',
    'donda2': 'Donda 2',
    'v1': 'Vultures 1',
    'v2': 'Vultures 2',
    'bully': 'Bully'
};

// Artist to search with per album (some albums are collabs)
const ALBUM_ARTIST = {
    'wtt': 'Jay-Z Kanye West',
    'ksg': 'Kids See Ghosts',
    'cruel': 'Kanye West',
    'v1': 'Kanye West Ty Dolla Sign',
    'v2': 'Kanye West Ty Dolla Sign',
    'bully': 'Kanye West'
};

async function getAccessToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        throw new Error(`Failed to get token: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function searchTrack(token, songTitle, albumId) {
    const artist = ALBUM_ARTIST[albumId] || 'Kanye West';
    // Clean up title - remove "ft." features for better matching
    const cleanTitle = songTitle.replace(/\s*ft\.?\s*.*/i, '').trim();

    const query = encodeURIComponent(`track:${cleanTitle} artist:${artist}`);
    const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.log(`  Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        return searchTrack(token, songTitle, albumId);
    }

    if (!response.ok) {
        console.error(`  Search failed for "${songTitle}": ${response.status}`);
        return null;
    }

    const data = await response.json();
    const tracks = data.tracks?.items || [];

    if (tracks.length === 0) {
        // Fallback: broader search without track: prefix
        const fallbackQuery = encodeURIComponent(`${cleanTitle} ${artist}`);
        const fallbackUrl = `https://api.spotify.com/v1/search?q=${fallbackQuery}&type=track&limit=5`;
        const fallbackResp = await fetch(fallbackUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fallbackResp.ok) {
            const fallbackData = await fallbackResp.json();
            const fallbackTracks = fallbackData.tracks?.items || [];
            if (fallbackTracks.length > 0) {
                return fallbackTracks[0].uri;
            }
        }
        return null;
    }

    return tracks[0].uri;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('Fetching Spotify access token...');
    const token = await getAccessToken();
    console.log('Got access token.\n');

    const data = JSON.parse(fs.readFileSync(SONGS_PATH, 'utf8'));
    const songs = data.songs;

    let found = 0;
    let notFound = 0;
    const notFoundList = [];

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];

        // Skip if already has a URI
        if (song.spotifyUri) {
            console.log(`[${i + 1}/${songs.length}] SKIP "${song.title}" (already has URI)`);
            found++;
            continue;
        }

        process.stdout.write(`[${i + 1}/${songs.length}] Searching "${song.title}" (${song.albumId})... `);

        const uri = await searchTrack(token, song.title, song.albumId);

        if (uri) {
            song.spotifyUri = uri;
            console.log(`FOUND ${uri}`);
            found++;
        } else {
            console.log('NOT FOUND');
            notFound++;
            notFoundList.push(`${song.id}: ${song.title} (${song.albumId})`);
        }

        // Small delay to respect rate limits
        await sleep(100);
    }

    // Write updated songs.json
    fs.writeFileSync(SONGS_PATH, JSON.stringify(data, null, 2) + '\n');

    console.log(`\n--- Results ---`);
    console.log(`Found: ${found}/${songs.length}`);
    console.log(`Not found: ${notFound}/${songs.length}`);

    if (notFoundList.length > 0) {
        console.log('\nMissing songs (add manually):');
        notFoundList.forEach(s => console.log(`  - ${s}`));
    }

    console.log('\nDone! songs.json has been updated.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
