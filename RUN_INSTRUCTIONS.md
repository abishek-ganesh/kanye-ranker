# How to Run Kanye Ranker

Due to browser security restrictions, you cannot open the HTML file directly from your file system. You need to run a local web server.

## Quick Start

### Option 1: Python Server (Recommended)
```bash
# Navigate to the project folder
cd /Users/abishek/GitHub/kanye_app

# Run the provided server script
python3 serve.py

# Or use Python's built-in server
python3 -m http.server 8000
```

Then open your browser to: http://localhost:8000

### Option 2: Node.js Server
If you have Node.js installed:
```bash
# Install http-server globally (one time only)
npm install -g http-server

# Run the server
http-server -p 8000
```

### Option 3: VS Code Live Server
If using VS Code:
1. Install the "Live Server" extension
2. Right-click on index.html
3. Select "Open with Live Server"

## Troubleshooting

If you see "Failed to load song data":
1. Make sure you're running a local server (not opening file:// directly)
2. Check the browser console for specific errors
3. Ensure the data/songs.json file exists

## Note
The album ID mismatch issue has been fixed. The College Dropout now uses "cd" instead of "tcd".