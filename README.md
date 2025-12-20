# ChatTok AI Live Game Builder (Local)

This is a **template-first** (low cost) builder:

1) You paste a game idea.
2) Click **Build HTML**, **Build CSS**, **Build game.js**.
3) It outputs the 3 files you can copy into your ChatTok game project.

## Why this version is cheaper

- **HTML + CSS are rendered from local templates** (no OpenAI call).
- OpenAI is used for:
  - a **small JSON spec** (1 short call), and
  - the **small AI region only** inside `game.js` (not the whole file).
- The API caches results per-idea, so re-clicking a stage usually returns instantly without re-billing.

## Folder map

```
/index.html                (the builder UI)
/api/server.js             (local API)
/api/templates/            (template-first generated game files)
/api/reference/            (your starter prompt parts + TikTok refs)
```

## Run locally

### 1) API

```bash
cd api
npm install
```

Edit `api/.env`:

- `OPENAI_API_KEY=YOUR_KEY`
- Optionally change models:
  - `OPENAI_MODEL_SPEC` (cheap)
  - `OPENAI_MODEL_JS` (better code)

Start:

```bash
npm start
```

API health should be:

- `http://127.0.0.1:8787/health`

### 2) Builder UI

Open the project in VS Code and run **Live Server** on `index.html`.

The UI expects the API at:

- `http://127.0.0.1:8787`

## Notes

- This builder does **not** modify your TikTok connection stack. Generated games assume your existing:
  - `generic.js`, `unknownobjects.js`, `data_linkmic_messages.js`, `tiktok-client.js`
- The generated `game.js` calls `client.setAccessToken(window.CHATTOK_CREATOR_TOKEN || "")`.
  Your platform should inject `window.CHATTOK_CREATOR_TOKEN` (or provide `?token=` in the URL).
