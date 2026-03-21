# The Core - Word Filtering App

A progressive web app for word filtering and workflow management.

## Features
- 20 filtering features (ABCDE, ABC, FIND-EEE, VOWEL, etc.)
- Multiple wordlists (134K, 19127, Emotions, Names, etc.)
- Custom workflow builder with drag-and-drop
- Case-insensitive filtering
- Mobile-optimized PWA

## Setup

### GitHub Pages Deployment

1. Go to repository Settings → Pages
2. Set source to `main` branch
3. Set custom path to `/coretest/` 
4. Deploy and access at: `andyhjay83.github.io/coretest/`

### Development

```bash
# Serve locally
python3 -m http.server 8000
# Or
npx serve .
```

Access at: `http://localhost:8000`

### API server (`server.js`) — WORD ENGINE (Anthropic)

WORD ENGINE (`/api/claude`, `mode: association`) uses **Anthropic only** (no Datamuse). It asks the model for up to **250** association words per submit, using the Universal Association Engine spec loaded from the repo.

1. Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`).
2. Start the Node API: `node server.js`.

NAME ENGINE and other Claude paths use the same Anthropic key.

### Frontend: where API requests go

- **Settings → ENGINE API:** optional **API base URL** (e.g. `http://localhost:3000`).
- If left **blank**: opening the app from **`localhost` / `127.0.0.1`** uses **`http://localhost:3000`** automatically; **GitHub Pages / production** uses **Render**.
- See **`.env.example`** for server-side variables (`ANTHROPIC_*`, `TMDB_API_KEY`, `PORT`).

## PWA Installation

After deployment, visit the site and:
1. Click "Add to Home Screen"
2. App will install as "The Core"

## Recent Updates

- Fixed case-sensitivity bugs in ABCDE, ABC, FIND-EEE, and frequency features
- Updated paths from /grail-binary/ to /coretest/
- Added scope to manifest for proper PWA installation
