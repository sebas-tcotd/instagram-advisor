# External Integrations

**Analysis Date:** 2026-05-26

## APIs & External Services

**AI / Language Models:**

- **Google Gemini** — post analysis and caption generation in the browser UI
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models`
  - Model: `gemini-3.5-flash` (hardcoded in `src/App.jsx` line 4)
  - SDK/Client: raw `fetch` (no SDK used in UI despite `@google/genai` being installed)
  - Auth: API key appended as query param `?key=${API_KEY}` — sourced from `VITE_GEMINI_API_KEY` or `VITE_ANTHROPIC_API_KEY`
  - Used in: `src/App.jsx` — `callAPI()` function, lines 137–214
  - Features used: `systemInstruction`, `contents` with `inlineData` (base64 image + text)

- **Anthropic Claude** — post analysis and caption generation in CLI scripts
  - Model: `claude-sonnet-4-20250514` (hardcoded in `scripts/analyze.js` line 66 and `scripts/caption.js` line 56)
  - SDK/Client: `@anthropic-ai/sdk` ^0.39.0 — `new Anthropic()` instantiated from env
  - Auth: `ANTHROPIC_API_KEY` env var (read automatically by SDK from `process.env`)
  - Used in: `scripts/analyze.js`, `scripts/caption.js`
  - Features used: `messages.create()` with vision (base64 image blocks) and text blocks, `max_tokens: 1024`

**Font CDN:**

- **Google Fonts** — typography for the UI
  - Endpoint: `https://fonts.googleapis.com` / `https://fonts.gstatic.com`
  - Fonts loaded: `DM Serif Display` (weights: regular, italic), `DM Mono` (weights: 300, 400, 500)
  - Used in: `src/index.html` lines 6–9 (preconnect + stylesheet link)

## Data Storage

**Databases:**
- None detected — no database client, no ORM, no connection string

**File Storage:**
- Local filesystem only — images are read from disk by CLI scripts using `fs.readFileSync` and converted to base64
- Browser UI accepts image upload via drag-and-drop or file input, processes entirely in-memory using `FileReader`

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None — no user authentication system
- Access control: bare API key in environment variable only
- Risk: `VITE_*` env vars are inlined into the Vite build bundle and shipped to the browser — the Gemini/Anthropic API key is exposed to any user who loads the built app

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- CLI scripts: `console.log` / `console.error` with ANSI color codes for terminal output
- UI: errors surfaced to user via inline `errBox` component; `console.error` not used explicitly

## CI/CD & Deployment

**Hosting:**
- Not configured — no deploy scripts, no Vercel/Netlify/GitHub Actions config detected
- `dist/` folder contains a committed build artifact (`dist/index.html`)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**

For CLI scripts (`scripts/analyze.js`, `scripts/caption.js`):
- `ANTHROPIC_API_KEY` — Anthropic API key (SDK reads this automatically)

For browser UI (`src/App.jsx`):
- `VITE_GEMINI_API_KEY` — primary key checked first
- `VITE_ANTHROPIC_API_KEY` — fallback if Gemini key absent (note: UI always calls Gemini endpoint regardless of which key is set)

**Secrets location:**
- `.env` at project root (gitignored via `.gitignore`)
- Template documented at `.env.example`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None — all API calls are request/response; no webhooks configured

## Prompt Files (Integration Layer)

The system uses external Markdown files as prompt sources loaded at runtime:

| File | Used By | Purpose |
|------|---------|---------|
| `prompts/post-advisor.md` | `scripts/analyze.js` | System prompt for post analysis |
| `prompts/caption-generator.md` | `scripts/caption.js` | System prompt for caption generation |
| `prompts/profile-auditor.md` | `scripts/profile.js` (not present) | System prompt for profile audit |
| `prompts/strategy.md` | `scripts/analyze.js`, `scripts/caption.js` | Strategy context injected into every call |
| `profile.yaml` | `scripts/analyze.js`, `scripts/caption.js` | Profile data injected into every call |

CLI scripts compose: `systemPrompt + strategy.md + profile.yaml` as the full system instruction per request.

UI hardcodes strategy and prompt content as inline JS string constants in `src/App.jsx` (not loaded from files).

---

*Integration audit: 2026-05-26*
