# CLAUDE.md

Hi! This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Kanye West Song Ranking App: an HTML-based web application that uses an ELO rating system to rank Kanye West songs through pairwise comparisons. Live at www.kanyeranker.com (custom domain configured in Vercel; the `CNAME` file is a leftover from GitHub Pages).

## Tech Stack

- **Frontend Only**: Pure HTML5, CSS3, and Vanilla JavaScript (no framework, no build step)
- **No Backend**: Client-side only application; all scripts load via plain `<script>` tags in `index.html`
- **External Services**:
  - YouTube embeds (iframe) for song clips
  - EmailJS (CDN) for the feedback form
  - Google Analytics 4 and Microsoft Clarity
- **Image export**: native Canvas 2D API (`js/export.js`), no html2canvas
- **Dev/test only**: Jest + jsdom (unit), Playwright (E2E), `http-server` (used by Playwright)

## Project Structure

```
kanye-ranker/
├── index.html                  # Single page: landing, comparison, results screens
├── serve.py                    # Local dev server (python3 serve.py, port 8000)
├── robots.txt, sitemap.xml, llms.txt   # llms.txt: plain-text summary for AI crawlers
├── 3a895aad7da92bea2cf467869d9fa77e.txt    # IndexNow key file (public; must match INDEXNOW_KEY in indexnow.yml)
├── .vercelignore               # Keeps tests/, scripts/, CLAUDE.md etc. off the live site
├── CNAME                       # Leftover from GitHub Pages
├── package.json                # Test scripts only (Jest, Playwright)
├── jest.config.js
├── playwright.config.js
├── css/
│   ├── style.css
│   ├── animations.css
│   ├── features.css
│   ├── ui-clarity.css
│   ├── dark-mode.css
│   ├── feedback.css
│   ├── mobile-override.css
│   ├── milestone-progress.css
│   ├── song-request.css
│   ├── globe-stage.css         # Landing globe stage band, beams, callout
│   └── tier-list.css           # Tier list screen, results entry button, move bar, video overlay
├── js/
│   ├── app.js                  # KanyeRankerApp: pairing algorithm, choice handling, results, album ranking
│   ├── app-init.js             # Boots the app on window load (waits for video links)
│   ├── elo.js                  # EloRating: dynamic K, comparison/skip history, confidence
│   ├── ui.js                   # Screens, song cards, progress bar, results rendering
│   ├── utils.js                # KanyeUtils shared helpers (error handling, video entry lookup, Spotify links, tracklist text)
│   ├── back-button.js          # Undo last comparison
│   ├── song-request.js         # SongRequestQueue (queue logic)
│   ├── song-request-ui.js      # Request button, badge, search drawer/sheet
│   ├── tier-list.js            # TierListCore: S-D buckets, pinned moves, reveal order (pure, unit tested)
│   ├── tier-list-ui.js         # Tier list screen: reveal, tap-to-move, share image/video
│   ├── tier-list-export.js     # TierListExport: 1080x1920 canvas frames, PNG, MediaRecorder reveal video
│   ├── globe-stage.js          # Landing globe stage: GlobeStageCore (scene timeline) + canvas dome renderer
│   ├── video-loader.js         # Loads data/video-links.json into window.videoLinks
│   ├── youtube-preview-fallback.js  # "Watch" button + YouTube modal + clip labels
│   ├── export.js               # Canvas image generation for results
│   ├── share-integrated.js     # Share flow (Web Share API, clipboard, download)
│   ├── share-incentive-simple.js    # Results insights panels
│   ├── album-colors.js         # Per-album color/font theming
│   ├── kanye-messages.js       # Themed copy (loading, results headers)
│   ├── kanye-quotes.js         # Rotating quote section
│   ├── theme-manager.js        # Dark mode
│   ├── settings-menu.js
│   ├── feedback.js             # Feedback modal (EmailJS)
│   ├── analytics.js            # GA4 event tracking wrapper
│   └── analytics-config.js     # Internal-traffic exclusion
├── data/
│   ├── songs.json              # 17 albums, 198 songs
│   └── video-links.json        # Song title -> YouTube ID (or {id, label})
├── assets/
│   ├── album-covers/
│   ├── goat.jpeg, goat_circle.png (favicon), kanyealbums.jpg (social preview)
│   ├── stage/                  # earth.jpg, moon.jpg: NASA public-domain textures for the globe stage
├── scripts/                    # One-off data maintenance scripts (see scripts/README.md)
├── tests/
│   ├── setup.js                # Jest setup: mocks + loads source files into jsdom
│   ├── fixtures/test-data.js
│   ├── unit/                   # Jest: elo, pairing, results, song-request, undo, seo, globe-stage, listen, tier-list, tier-list-export
│   └── e2e/                    # Playwright: app-flow, button-regression, mobile, song-request, globe-stage, tier-list
└── docs/                       # Gitignored, local only
    ├── ROADMAP.md
    ├── ALGORITHMS.md
    ├── TESTING.md
    └── archive/
```

## Key Implementation Details

### ELO Rating System
- Initial rating: 1500 for all songs (`initialRating` in songs.json)
- Dynamic K-factor per song, based on that song's prior comparisons: 48 (fewer than 3), 32 (3 to 6), 16 (7+). The `k = 32` constructor argument is stored but not used for updates.
- Ratings are rounded to integers after each update
- Phase-based dynamic pairing (popular songs first, finals mode at 80+ comparisons), winner carry-over, album coverage (every album gets a compared song by comparison 20 and a second by 30), classic-album boost, and cross-tier challenges. Full details in `docs/ALGORITHMS.md`.

### Song Database
- 17 albums, 198 songs (filtered to the most-streamed tracks, so per-album song counts are lower than `trackCount`)
- Albums range from "The College Dropout" (2004) to "Bully" (2026)
- Each song has `spotifyStreams`/`spotifyRank` (drive popularity tiers) and `spotifyUri`
- `songs.json` is fetched with a cache-busting query (`?v=3`); bump it when the data changes

### Core Features
1. **Pairwise song comparison**: tap/click a card, or keyboard (Left/1, Right/2, Space/S to skip)
2. **"Watch" clips**: YouTube embed in a modal for songs listed in `data/video-links.json`. An entry is either a video ID string or `{ "id": ..., "label": ... }`; the optional label is shown as a caption on the card (e.g. "MBDTF short film")
3. **Mid-session song requests**: search and queue up to 5 songs; each appears 4 times, spaced out, against similarly rated opponents. Queue logic in `js/song-request.js`, UI in `js/song-request-ui.js` (drawer on desktop, full-screen sheet at 540px and below)
4. **Progress tracking and early exit**: milestone progress bar; "I'm Done" unlocks at 20 comparisons; "Continue Ranking" returns to comparisons from results
5. **Results**: Top 10 songs and top 5 albums (album formula in `docs/ALGORITHMS.md`), each song with Watch and Spotify links, plus "Copy tracklist"
6. **Insights** (`js/share-incentive-simple.js`): songs get an underrated pick, "Just Missed the Cut" (#11), and era preference; albums get "Your Kanye Timeline" and the album that just missed the top 5
7. **Sharing/export**: Canvas-generated images; Web Share API on mobile, Clipboard API on desktop
8. **Back button**: undo last comparison, rolling back ratings and all pairing state, in-memory history cleared on start/restart (on mobile, 768px and below, it only appears once 2 comparisons are done)
9. **Globe stage** (`js/globe-stage.js`): the landing hero is a dark stage band (dark in both themes) where START stands on a spinning dome, after the 2026 Ye Live tour stage. The dome is Canvas 2D sphere-mapped from `assets/stage/` textures and cycles Earth, album-color washes and the Moon (`TIMELINE`/`WASHES` in `GlobeStageCore`, wash ids match `album-colors.js`). Tapping it slows the spin and fires `globe_tapped`. It only animates while the landing screen is visible, shows a still frame under reduced motion, and lowers its render resolution on slow devices. `window.globeStage` exposes `isReady/isRunning/currentScene/domeTop` for E2E tests
10. **Tier list** (`js/tier-list*.js`): "Reveal your tier list" near the top of results opens its own screen with Songs / Albums tabs. `TierListCore` buckets ranked items by rank percentile (S 10%, A 20%, B 30%, C 25%, D 15%; ties share a tier, #1 is always S). Songs = only compared songs; albums = all 17, with albums under the 2-compared-song minimum in an Unranked tray. Tiles fill in D up to S with a pause before S (skipped under reduced motion). Tap a tile, then a tier in the bottom move bar (or a tier label) to move it; moves are pinned, survive Continue Ranking, and clear on restart. Shares a 1080x1920 PNG per tab and a silent reveal video (canvas `captureStream` + MediaRecorder, MP4 where supported, else WebM); the on-screen reveal and the video share `TierListExport.revealSchedule`. `window.tierListUI` exposes `kind/board/isRevealing()` for E2E tests
11. **Dark mode, feedback form, rotating Kanye quotes**

### Spotify (no API login)
Each Top 10 row has a "Spotify" link (`open.spotify.com/track/<id>` from `spotifyUri`, opens the app on mobile), and "Copy tracklist" copies `Kanye West - Title` lines (real, uncensored titles) for import tools like TuneMyMusic. A real "Create playlist" button was built and deleted (2026-11-06): Spotify's 2026 Development Mode rules allow one Client ID per developer and 5 users per app, and public access needs a business with 250k MAU. The OAuth version is in git history before that date.

## Development Notes

- **Run locally**: `python3 serve.py` (port 8000). Opening `index.html` directly will fail to fetch the JSON data.
- **SEO copy is static**: the landing "About" section (albums, FAQ), the JSON-LD (WebApplication + FAQPage), the meta description and `llms.txt` repeat song/album counts and the album list from `songs.json`. `tests/unit/seo.test.js` fails when they drift, so update them when the catalog changes. The title and description are repeated in the `og:` and `twitter:` tags (the test keeps them identical and within 60 / 160 characters), and each FAQ item lives twice: visible in `.about-faq` and in the FAQPage JSON-LD
- **Search wording comes from real queries**: exports from Search Console and Bing Webmaster live in `analytics-reports/search/` (gitignored). As of 2026-11-25 the page shows up for song/album "ranker", "tier list" and "niche Kanye songs" searches, which is why the title, About intro and FAQ use those words. `meta keywords` was removed (search engines ignore it); Ye/Yeezy are tied to Kanye West through `sameAs` links in the JSON-LD
- **Mobile-First**: Touch-friendly interface with large tap targets (44px minimum, enforced in E2E tests)
- **Performance**: next comparison's album art is preloaded; YouTube iframes are only created when "Watch" is clicked; globe stage textures load after `window.load`
- **Storage**: no ranking progress is persisted; every session starts fresh. localStorage holds the theme, back-button history, song request queue, share-incentive state, and the internal-user analytics flag
- **No secrets**: only public identifiers (EmailJS public key) live in client code
- **Analytics**: Google Analytics 4 (G-Z2S91E0R6Z) and Microsoft Clarity (spowj2ipam)

## Testing

- `npm install` once, then:
  - `npm test` (or `npm run test:unit`): Jest unit tests in `tests/unit`
  - `npm run test:e2e`: Playwright E2E in `tests/e2e`, across Desktop Chrome/Firefox/Safari, Mobile Safari (iPhone 13), Android Chrome (Pixel 7), and iPad; auto-starts `http-server` on port 8080
  - `npm run test:all`: both
- Details and manual release checklist: `docs/TESTING.md`

## Deployment

- **Hosted on Vercel**, not GitHub Pages: DNS for kanyeranker.com points at Vercel, and Vercel builds every push to `main`
- **Gated on CI**: `.github/workflows/ci.yml` runs Jest plus Playwright (Desktop Chrome, Mobile Safari) on every push and PR. A Vercel Deployment Check requires the `test` job to pass before a build is promoted to the custom domain, so a red build never goes live
- **Don't rename the `test` job** without updating the Deployment Check in Vercel (Project Settings > Build and Deployment > Deployment Checks); Vercel matches checks by job name and would hold every deploy
- Emergency bypass: **Force Promote** on the Vercel deployment page
- `.github/workflows/indexnow.yml` runs when a push to `main` changes `index.html`: it waits until the live page matches the pushed file (so only after Vercel promotes the build), then pings IndexNow so Bing recrawls the homepage. It is not a deployment check. Google does not use IndexNow; request indexing in Search Console after copy changes
- `.github/workflows/clip-check.yml` runs `scripts/check-video-links.js` weekly to catch dead Watch videos; it is not a deployment check
- GitHub Pages was turned off 2026-10-30 (it was a redundant build nothing pointed at)

## Recent Updates

- Search copy tuned from Search Console and Bing data (2026-11-25): title and FAQ now cover album ranking, tier lists, niche songs and "Ye"; Kanye West entity links in the JSON-LD; IndexNow ping on deploy
- Album coverage in early pairings: every album gets a compared song by comparison 20 and a second by 30, so all 17 albums can be ranked; replaced the album diversity roll and the Bully new-album boost (2026-11-13)
- Tier list: S-D song and album tiers from your ranking, D-to-S reveal, tap-to-move edits, share image and downloadable reveal video
- Spotify links on each Top 10 song and "Copy tracklist" for playlist import tools; the disabled Spotify OAuth playlist export was deleted
- CI with deploys gated on tests (Vercel Deployment Checks); undo rewritten to restore exact state; ~640 lines of dead pairing code removed; 26 broken Watch videos replaced; analytics tracking fixed
- Mid-session song requests with queue management, plus cross-browser E2E coverage
- Added Bully (2026) with a new-album boost in early pairings; switched to the deluxe cover and added "OK"; removed the landing page Bully banner and featured-artist tags from titles
- Renamed "Listen" to "Watch" and added curated clip labels; removed the lyrics button
- Added Jest unit and Playwright E2E suites
- Built Spotify playlist export, then disabled it pending API access
- YouTube link fixes and additions; larger preview modal on desktop
- Consolidated duplicate CSS/JS and merged the quote system into one rotating section
- SEO improvements, album collage social preview image, circular goat favicon

## Docs

Local docs live in `docs/` (gitignored):
- `docs/ROADMAP.md`: Now/Next/Later plan
- `docs/ALGORITHMS.md`: pairing, ELO, and album ranking algorithms in detail
- `docs/TESTING.md`: how to run the suites, what they cover, release checklists
- `docs/ANALYTICS.md`: every GA4 event and param, plus the custom dimensions that still need registering
- `docs/clip-descriptors.md`: every Watch video with its label, status and YouTube title (broken ones flagged)
- `docs/archive/`: superseded docs and 2025 analytics reports

## Analytics & Reporting

### Analytics Configuration
- **Google Analytics 4**: Property ID 498617351 (accessed via `analytics-mcp` MCP server)
- **Microsoft Clarity**: Project ID spowj2ipam (accessed via `clarity-kanye` MCP server)
- **MCP Configuration**: API tokens stored in `~/.config/claude-code/mcp_servers.json`
- **Reports**: Generated in `analytics-reports/` (gitignored). 2025 reports are archived in `docs/archive/analytics-reports-2025/`.

### Running Analytics Reports
Use the `/analytics-report` command (`.claude/commands/analytics-report.md`) to generate combined GA4 + Clarity reports:
- Daily: `/analytics-report` or `/analytics-report daily`
- Weekly: `/analytics-report weekly`
- Biweekly: `/analytics-report biweekly`
- Monthly: `/analytics-report monthly`

Reports combine data from both platforms. The MCP servers handle authentication automatically using configured tokens.
