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

### API server (`server.js`) — WORD ENGINE + Ollama (local)

WORD ENGINE (`/api/claude`, `mode: association`) can use **Anthropic** (default) or **Ollama** on your machine.

1. Install and run [Ollama](https://ollama.com), then pull a model, e.g. `ollama pull llama3.1:8b`.
2. Start the Node API (e.g. `node server.js` or your process manager).
3. Set environment variables:

| Variable | Purpose |
|----------|---------|
| `WORD_ENGINE_LLM_PROVIDER` | `anthropic` (default) or `ollama` |
| `OLLAMA_HOST` | Ollama API base (default `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | Model tag (default `llama3.1:8b`) |
| `OLLAMA_TIMEOUT_MS` | Request timeout ms (default `480000`) |

Example (local testing):

```bash
export WORD_ENGINE_LLM_PROVIDER=ollama
export OLLAMA_MODEL=llama3.1:8b
node server.js
```

NAME ENGINE and other Claude paths still use `ANTHROPIC_API_KEY` when calling Anthropic.

### Frontend: where API requests go

- **Settings → ENGINE API:** optional **API base URL** (e.g. `http://localhost:3000`).
- If left **blank**: opening the app from **`localhost` / `127.0.0.1`** uses **`http://localhost:3000`** automatically; **GitHub Pages / production** uses **Render**.
- See **`.env.example`** for server-side variables (`WORD_ENGINE_LLM_PROVIDER`, `OLLAMA_*`, etc.).

## PWA Installation

After deployment, visit the site and:
1. Click "Add to Home Screen"
2. App will install as "The Core"

## Recent Updates

- Fixed case-sensitivity bugs in ABCDE, ABC, FIND-EEE, and frequency features
- Updated paths from /grail-binary/ to /coretest/
- Added scope to manifest for proper PWA installation
