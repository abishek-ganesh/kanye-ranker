# Kanye Ranker Scripts

Maintenance scripts for the song data and Watch clips. None of them run as part of the app or the test suites. Run everything from the repo root.

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

## check-video-links.js

Checks every YouTube ID in `data/video-links.json` and fails if any Watch clip has rotted.

```bash
node scripts/check-video-links.js
```

- **Input**: `data/video-links.json`; needs network access and Node 18+ (global `fetch`)
- **Output**: prints broken clips with the song titles that use them, exits 1 if any are broken; writes nothing
- oEmbed catches removed, private and embedding-disabled videos; the watch page's player response catches age restriction (oEmbed misses it)
- If YouTube answers a watch page with a 429 or a bot check, the script stops requesting watch pages for the rest of the run and reports how many clips skipped the age-restriction check (not a failure)
- Runs weekly in GitHub Actions (`.github/workflows/clip-check.yml`, Mondays 15:00 UTC, or manually from the Actions tab). It is separate from CI, so a dead clip never blocks a deploy; GitHub emails on failure
- On GitHub's runners YouTube bot-checks nearly every watch page, so the weekly run only catches removed, private and embed-disabled videos. Run it locally now and then for age restriction too
- Takes about a minute for ~140 videos

## Adding a new album

The old `filter-songs.js`, `parse-top-songs.js` and `download-album-covers.sh` were removed (2026-10-31; see git history). They predated Bully and would have dropped its songs or overwritten real covers with placeholders. Add albums by hand:

1. Add the album and its songs to `data/songs.json` (with `spotifyStreams`/`spotifyRank`), then bump the `?v=` cache-buster where `songs.json` is fetched
2. Put the cover in `assets/album-covers/` and set `coverArt`
3. Add the album's colors to `js/album-colors.js`; to feature it as the new album, change `newAlbumConfig.albumId` in `js/app.js`
4. Run `fetch-spotify-uris.js` for the new songs
5. Add Watch clips to `data/video-links.json`, then run `check-video-links.js`
6. Update the static SEO copy: the album list, counts and FAQ in `index.html` (visible section and JSON-LD), the meta description, and `llms.txt`. `npm test` fails until they match `songs.json`
