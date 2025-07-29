# GitHub Setup Instructions

## Option 1: Using GitHub CLI (Recommended)

1. First, authenticate with GitHub:
```bash
gh auth login
```

2. Follow the prompts to authenticate (choose GitHub.com, HTTPS, and authenticate via browser)

3. Once authenticated, create and push the repository:
```bash
gh repo create kanye-ranker --public --description "Find your favorite Kanye West songs through an interactive ELO rating system" --source=. --remote=origin --push
```

## Option 2: Manual Setup via GitHub.com

1. Go to https://github.com/new

2. Create a new repository with these settings:
   - Repository name: `kanye-ranker`
   - Description: `Find your favorite Kanye West songs through an interactive ELO rating system`
   - Public repository
   - Do NOT initialize with README (we already have one)

3. After creating, run these commands in your terminal:
```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/kanye-ranker.git

# Push the code
git push -u origin main
```

## After Setup

Your repository will be available at:
```
https://github.com/YOUR_USERNAME/kanye-ranker
```

## Enable GitHub Pages (Optional)

To host the app on GitHub Pages:

1. Go to your repository on GitHub
2. Click "Settings" → "Pages"
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

Your app will be available at:
```
https://YOUR_USERNAME.github.io/kanye-ranker/
```

## Next Steps

1. Add topics to your repository: `kanye-west`, `music`, `ranking`, `elo-rating`, `javascript`
2. Consider adding a LICENSE file (MIT recommended)
3. Add a link to the live demo in your README if using GitHub Pages