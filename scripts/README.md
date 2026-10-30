# Kanye Ranker Scripts

One-off maintenance scripts for the song database and album art. None of them run as part of the app or the test suites. Run everything from the repo root.

For analytics and MCP setup, see the "Analytics & Reporting" section of `CLAUDE.md`.

## fetch-spotify-uris.js

Adds a `spotifyUri` to every song in `data/songs.json` by searching the Spotify Web API (Client Credentials flow, no user login).

```bash
node scripts/fetch-spotify-uris.js <CLIENT_ID> <CLIENT_SECRET>
```

- **Input**: `data/songs.json`, Spotify app credentials as arguments
- **Output**: rewrites `data/songs.json` in place; prints found/not-found counts and a list of songs to fix by hand
- Skips songs that already have a `spotifyUri`, so it is safe to re-run after adding songs
- Searches `track:<title> artist:<artist>` (strips "ft." features), using per-album artist overrides for collabs (Watch the Throne, Kids See Ghosts, Vultures); falls back to a looser query; takes the first hit
- Handles 429 rate limits via `Retry-After`; requires Node 18+ (global `fetch`)
- When adding a new album, add its ID to `ALBUM_NAMES` (and `ALBUM_ARTIST` if it is a collab)
- The URIs feed the Spotify playlist export (`js/spotify-playlist.js`), which is currently disabled

## parse-top-songs.js

Data module, not really a standalone tool. Holds a hard-coded list of 189 Kanye tracks with Spotify stream counts (`topSongs`), plus a `titleMap` for name variants (e.g. "Ni**as In Paris").

- **Exports**: `{ topSongs, topSongTitles, titleMap }`
- **Output**: logs "Parsed N top songs" when loaded; writes nothing
- Used by `filter-songs.js`. Update the list here before re-filtering.

## filter-songs.js

Trims `data/songs.json` down to songs that appear in `parse-top-songs.js`, attaching `spotifyRank` and `spotifyStreams` to each.

```bash
node scripts/filter-songs.js
```

- **Input**: `data/songs.json`, `scripts/parse-top-songs.js`
- **Output**: rewrites `data/songs.json` (songs sorted by rank, plus `totalSongs` and `lastFiltered`); writes a one-time backup to `data/songs-backup.json` if none exists
- Matches titles case- and punctuation-insensitively, with a small manual mapping table
- **Destructive**: any song not in the hard-coded list is dropped. The list predates Bully, so running it today would remove all 19 Bully songs. Add new songs to `topSongs` first.

## download-album-covers.sh

Downloads a fixed set of album covers from Wikimedia into `assets/album-covers/`.

```bash
bash scripts/download-album-covers.sh
```

- **Output**: overwrites `808s-heartbreak.jpg`, `donda.jpg`, `donda-2.jpg`, `jesus-is-king.jpg`, `kids-see-ghosts.jpg`, `watch-the-throne.jpg`, `vultures.jpg`, `vultures-2.jpg`
- Vultures and Vultures 2 come from `via.placeholder.com` placeholders, so running it would replace the real `vultures-2.jpg` with a placeholder (the app uses `vultures.png` for Vultures 1, so `vultures.jpg` is unused)
- Does not cover Bully or the other albums; those covers were added manually
- Mostly historical. Prefer adding new covers by hand and setting `coverArt` in `data/songs.json`
