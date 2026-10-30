# Kanye Ranker

Find your favorite Kanye West songs through an interactive ELO rating system.

## Features

- **198 Songs, 17 Albums**: The most-streamed tracks from The College Dropout (2004) to Bully (2026)
- **Smart Algorithm**: ELO rating system ensures accurate rankings with minimal comparisons
- **Album Diversity**: Balanced representation across Kanye's entire career
- **Visual Experience**: Album-specific colors and patterns for each era
- **Watch Clips**: Pull up a YouTube clip for a song mid-comparison
- **Song Requests**: Queue up specific songs you want to rank
- **Social Sharing**: Export and share your top 10 songs
- **Dark Mode**: Easy on the eyes during late-night ranking sessions

## How It Works

1. **Compare** - Two songs appear side by side
2. **Choose** - Pick your favorite between the two
3. **Discover** - Your personal top 10 emerges through smart ELO ranking

The app uses an ELO rating system (like chess rankings) to efficiently determine your preferences without requiring you to compare every possible combination.

## Running Locally

### Quick Start

```bash
# Clone the repository
git clone https://github.com/abishek-ganesh/kanye-ranker.git
cd kanye-ranker

# Run the development server
python3 serve.py
```

Then open http://localhost:8000 in your browser.

### Alternative Methods

**Python HTTP Server:**
```bash
python3 -m http.server 8000
```

**Node.js (if installed):**
```bash
npx http-server -p 8000
```

**VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

## Testing

```bash
npm install              # once: Jest and Playwright
npx playwright install   # once: Playwright browsers
npm test                 # Jest unit tests (tests/unit)
npm run test:e2e         # Playwright E2E tests (tests/e2e); starts its own server on port 8080
```

## Tech Stack

- Pure HTML/CSS/JavaScript (no framework dependencies)
- ELO rating algorithm
- Canvas-generated share images (no image libraries)
- Responsive design for all devices

## Credits

Created by [Abishek Ganesh](https://www.linkedin.com/in/abishek-ganesh)

## License

MIT License - feel free to fork and create your own music ranker!

---

*"My greatest pain in life is that I will never be able to see myself perform live." - Kanye West*