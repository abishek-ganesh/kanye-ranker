# Kanye Ranker 🌊

Find your favorite Kanye West songs through an interactive ELO rating system.

## Features

- **180+ Songs**: Complete discography from The College Dropout to Vultures 2
- **Smart Algorithm**: ELO rating system ensures accurate rankings with minimal comparisons
- **Album Diversity**: Balanced representation across Kanye's entire career
- **Visual Experience**: Album-specific colors and patterns for each era
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
git clone https://github.com/YOUR_USERNAME/kanye-ranker.git
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

## Tech Stack

- Pure HTML/CSS/JavaScript (no framework dependencies)
- ELO rating algorithm
- Local storage for session persistence
- Responsive design for all devices

## Credits

Created by [Abishek Ganesh](https://www.linkedin.com/in/abishekganesh)

## License

MIT License - feel free to fork and create your own music ranker!

---

*"My greatest pain in life is that I will never be able to see myself perform live." - Kanye West*