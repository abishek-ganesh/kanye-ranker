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
kanye_app/
├── index.html
├── css/
│   ├── style.css
│   └── animations.css
├── js/
│   ├── app.js
│   ├── elo.js
│   ├── ui.js
│   └── export.js
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
1. Pairwise song comparison interface
2. Song preview functionality (Spotify/YouTube embeds)
3. Progress tracking and early exit option
4. Top 10 results visualization
5. Social media export capability using html2canvas

## Development Notes

- **Mobile-First**: Ensure touch-friendly interface with large tap targets
- **Performance**: Implement lazy loading for album artwork and audio previews
- **Storage**: Use localStorage for progress persistence
- **No API Keys**: Use embed URLs only to avoid exposing credentials

## Current Status

The project is in planning phase with IMPLEMENTATION_PLAN.md containing the full technical specification. No code has been implemented yet.