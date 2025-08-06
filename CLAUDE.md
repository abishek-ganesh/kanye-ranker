# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Kanye West Song Ranking App - an HTML-based web application that uses an ELO rating system to rank Kanye West songs through pairwise comparisons.

## Tech Stack

- **Frontend Only**: Pure HTML5, CSS3, and Vanilla JavaScript (no framework dependencies)
- **No Backend**: Client-side only application
- **External Libraries**: 
  - html2canvas (for image export)
  - Optional: Chart.js (for visualizations)

## Project Structure

The project follows this structure:
```
kanye-ranker/
├── index.html
├── css/
│   ├── style.css
│   ├── mobile-override.css
│   ├── ui-clarity.css
│   ├── dark-mode.css
│   └── feedback.css
├── js/
│   ├── app.js
│   ├── elo.js
│   ├── ui.js
│   ├── back-button.js
│   ├── share-integrated.js
│   ├── share-incentive-simple.js
│   └── feedback.js
├── data/
│   └── songs.json
└── assets/
    ├── album-covers/
    └── fonts/
```

## Key Implementation Details

### ELO Rating System
- Initial rating: 1500 for all songs
- K-factor: 32
- Smart pairing algorithm prioritizes songs with similar ratings

### Song Database
- 15 albums covering 300+ songs
- JSON structure with song metadata including Spotify IDs
- Albums range from "The College Dropout" (2004) to "Vultures 2" (2024)

### Core Features
1. **Pairwise song comparison interface** - Touch-friendly comparison system with ELO rating updates
2. **Song preview functionality** - Spotify/YouTube embeds for audio previews
3. **Progress tracking and early exit option** - Users can exit early and see results
4. **Top 10 results visualization** - Rankings with album covers and song details
5. **Social media export capability** - Native Web Share API, Clipboard API, and html2canvas for sharing
6. **Back button functionality** - Undo comparisons with rating rollback (hidden on first comparison on mobile)
7. **Mobile-responsive design** - Dedicated mobile layouts and touch optimizations
8. **Album insights** - "Your Kanye Timeline" and "Just Missed the Cut" personalized insights

## Development Notes

- **Mobile-First**: Touch-friendly interface with large tap targets and responsive design
- **Performance**: Lazy loading for album artwork and audio previews
- **Storage**: localStorage for progress persistence and comparison history
- **No API Keys**: Uses embed URLs only to avoid exposing credentials
- **Cross-Platform Sharing**: Web Share API for mobile, Clipboard API for desktop
- **Browser Compatibility**: Tested on Safari, Chrome, and mobile browsers
- **Analytics**: Google Analytics 4 (G-Z2S91E0R6Z) and Microsoft Clarity (spowj2ipam) for user behavior tracking

## Implementation Status

The project is **fully implemented and functional** with the following key components:

### Completed Features
- ✅ ELO rating system with smart song pairing
- ✅ Complete song database (300+ songs, 15 albums)
- ✅ Responsive comparison interface
- ✅ Social sharing with platform detection
- ✅ Back button with comparison undo
- ✅ Mobile-optimized layouts
- ✅ Album insights and personalized results
- ✅ Progress tracking and early exit
- ✅ Cross-browser compatibility fixes

### Recent Updates
- Fixed mobile share button visibility issues
- Resolved Safari button sliding animations
- Implemented mobile-specific back button behavior
- Refactored duplicate code for better maintainability
- Updated landing page copy with Kanye-inspired messaging

## Analytics & Reporting

### Analytics Configuration
- **Google Analytics 4**: Property ID 498617351 (accessed via `analytics-mcp` MCP server)
- **Microsoft Clarity**: Project ID spowj2ipam (accessed via `clarity-kanye` MCP server)
- **MCP Configuration**: API tokens stored in `~/.config/claude-code/mcp_servers.json`
- **Reports**: Generated in `analytics-reports/` directory (gitignored)

### Running Analytics Reports
Use the `/analytics-report` command with Claude Code to generate combined GA4 + Clarity reports:
- Daily: `/analytics-report` or `/analytics-report daily`
- Weekly: `/analytics-report weekly`
- Monthly: `/analytics-report monthly`

Reports combine data from both platforms for comprehensive insights. The MCP servers handle authentication automatically using configured tokens.