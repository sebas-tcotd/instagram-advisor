<!-- refreshed: 2026-05-26 -->
# Architecture

**Analysis Date:** 2026-05-26

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     Two Entry Points                             │
├─────────────────────────────┬────────────────────────────────────┤
│   Web UI (Vite + React)     │   CLI Scripts (Node.js ESM)        │
│   `src/App.jsx`             │   `scripts/analyze.js`             │
│                             │   `scripts/caption.js`             │
└──────────┬──────────────────┴───────────┬────────────────────────┘
           │                              │
           │ fetch() direct to API        │ @anthropic-ai/sdk
           ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AI Layer (Dual API)                          │
│   Web: Gemini API (gemini-3.5-flash) via direct fetch            │
│   CLI: Claude API (claude-sonnet-4-20250514) via SDK             │
└──────────────────────────────────────────────────────────────────┘
           │
           │ structured JSON responses
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Prompt Layer                                 │
│   `prompts/strategy.md`       — personal strategy context        │
│   `prompts/post-advisor.md`   — post analysis agent             │
│   `prompts/caption-generator.md` — caption writing agent        │
│   `prompts/profile-auditor.md`   — profile audit agent          │
│   `profile.yaml`              — structured identity data         │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App (Web UI) | Two-tab UI: image upload, API call dispatch, result rendering | `src/App.jsx` |
| analyze script | CLI post-advisor: reads image + args, calls Claude, prints results | `scripts/analyze.js` |
| caption script | CLI caption-generator: reads image + tone arg, calls Claude, prints captions | `scripts/caption.js` |
| doctor script | Prerequisite checker: verifies all required files and API key exist | `scripts/doctor.js` |
| post-advisor prompt | System prompt defining post analysis behavior and JSON output schema | `prompts/post-advisor.md` |
| caption-generator prompt | System prompt defining caption generation behavior and JSON output schema | `prompts/caption-generator.md` |
| profile-auditor prompt | System prompt defining profile audit behavior and JSON output schema | `prompts/profile-auditor.md` |
| strategy | Full Instagram strategy document, injected as context into all CLI agents | `prompts/strategy.md` |
| profile | Structured YAML with identity, voice, visual strategy data | `profile.yaml` |

## Pattern Overview

**Overall:** Dual-surface AI agent with shared prompt layer

**Key Characteristics:**
- Two independent surfaces (Web UI and CLI) that call different AI providers but use the same prompt content
- Prompt-driven architecture: all agent logic lives in `.md` files under `prompts/`, not in JS code
- All AI responses are structured JSON — every agent outputs a defined JSON schema
- No backend server — the web UI calls Gemini directly from the browser; CLI scripts call Anthropic via SDK
- Stateless: no database, no session persistence, no server-side state

## Layers

**Prompt/Strategy Layer:**
- Purpose: Defines agent behavior, output schemas, and personal strategy context
- Location: `prompts/`
- Contains: System prompts (`.md`) and structured identity data (`profile.yaml`)
- Depends on: Nothing (static markdown/YAML)
- Used by: CLI scripts (read via `fs.readFileSync`) and referenced conceptually by Web UI (inlined in `App.jsx`)

**CLI Script Layer:**
- Purpose: Node.js entry points for terminal-based usage
- Location: `scripts/`
- Contains: `analyze.js`, `caption.js`, `doctor.js`
- Depends on: `prompts/`, `profile.yaml`, `@anthropic-ai/sdk`, `dotenv`
- Used by: Direct `npm run` invocation or Claude Code slash commands

**Web UI Layer:**
- Purpose: Browser-based React interface for image upload, mode switching, and result display
- Location: `src/`
- Contains: `App.jsx` (single component), `index.css`, `index.html`, `main.jsx`
- Depends on: Gemini API (direct fetch), environment variable `VITE_GEMINI_API_KEY`
- Used by: Browser via `npm run dev` or built `dist/`

## Data Flow

### Web UI — Analyze Post Path

1. User drops/selects image in dropzone (`src/App.jsx` — `loadImage()`) — image stored as base64 in component state
2. User selects format, layer, optionally writes caption — stored in component state
3. User clicks "analizar" — triggers `runAnalyze()` which calls `callAPI(STRATEGY, userText)`
4. `callAPI()` POSTs to `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`
5. Response text extracted from `data.candidates[0].content.parts`, JSON parsed via regex match
6. Parsed result stored in `result` state as `{ type: 'analyze', data: parsed }`
7. Right panel renders `VerdictBadge`, `ScoreBar` components and analysis text from result

### Web UI — Generate Caption Path

1. User drops/selects image — same image loading flow as above
2. User selects tone from chip buttons — stored in `tone` state
3. User clicks "generar captions" — triggers `runCaption()` which calls `callAPI(CAPTION_PROMPT, userText)`
4. Same Gemini API call flow — result stored as `{ type: 'caption', data: parsed }`
5. Right panel renders caption cards with tone/hook_type pills and caption text

### CLI — analyze.js Path

1. `npm run analyze -- foto.jpg [--caption "..."] [--format ...] [--layer ...]` invoked
2. `minimist` parses args; photo path resolved and validated
3. `prompts/strategy.md`, `prompts/post-advisor.md`, `profile.yaml` read from disk
4. Image read as base64 from disk
5. `Anthropic()` client calls `messages.create()` with `claude-sonnet-4-20250514`
6. Response text extracted from `response.content`, JSON parsed via regex match
7. Colored terminal output printed: verdict, scores, analysis, suggestions

### CLI — caption.js Path

1. `npm run caption -- foto.jpg [--tone ...]` invoked
2. `prompts/strategy.md`, `prompts/caption-generator.md`, `profile.yaml` read from disk
3. Same Anthropic SDK call with `claude-sonnet-4-20250514`
4. Parsed captions printed in colored terminal format

**State Management:**
- Web UI: React `useState` only — all state is local to the single `App` component, no external state manager
- CLI: No state — each script invocation is a single-shot operation

## Key Abstractions

**Agent (Prompt + Schema):**
- Purpose: Each "agent" is a `.md` system prompt defining a persona, analysis process, and a strict JSON output schema
- Examples: `prompts/post-advisor.md`, `prompts/caption-generator.md`, `prompts/profile-auditor.md`
- Pattern: System prompt defines behavior; caller passes image + user text; response is always a specific JSON shape

**Strategy Context:**
- Purpose: `prompts/strategy.md` and `profile.yaml` are injected as additional context into every CLI agent call
- Examples: CLI scripts concatenate these before the system prompt: `` `${systemPmt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}` ``
- Pattern: Static files read at runtime and composed into the API call

**callAPI() (Web UI):**
- Purpose: Single async function in `App.jsx` that handles all Gemini API communication, error handling, and JSON parsing
- Location: `src/App.jsx` lines 137–214
- Pattern: Takes `systemPrompt` and `userText`; returns parsed JSON object; throws descriptive errors on failure

## Entry Points

**Web UI:**
- Location: `src/main.jsx`
- Triggers: `npm run dev` (Vite dev server) or `npm run build` → `dist/`
- Responsibilities: Mounts `<App />` into `#root` div

**CLI — analyze:**
- Location: `scripts/analyze.js`
- Triggers: `npm run analyze -- <foto.jpg> [flags]`
- Responsibilities: Post analysis with verdict, scores, analysis text, suggestions

**CLI — caption:**
- Location: `scripts/caption.js`
- Triggers: `npm run caption -- <foto.jpg> [--tone ...]`
- Responsibilities: Generate 2 caption variants with tone and hook_type metadata

**CLI — doctor:**
- Location: `scripts/doctor.js`
- Triggers: `npm run doctor`
- Responsibilities: Check all required files exist and API key is configured

## Architectural Constraints

- **Threading:** Single-threaded Node.js for CLI; browser event loop for Web UI. No workers.
- **Global state:** `API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL`, `STRATEGY`, `CAPTION_PROMPT`, `TONES`, `FORMATS`, `LAYERS` are module-level constants in `src/App.jsx`. No mutable global state.
- **AI provider split:** Web UI uses Gemini (direct fetch, `VITE_GEMINI_API_KEY`); CLI uses Claude Anthropic SDK (`ANTHROPIC_API_KEY`). These are separate providers and the web UI's inlined prompts are simplified copies of the full `.md` prompts used by the CLI.
- **No shared backend:** Web UI and CLI are fully independent — there is no server bridging them. The web UI inlines a condensed version of the strategy prompt directly in `App.jsx` rather than reading from `prompts/`.
- **Image handling:** Images are always base64-encoded before sending to AI. No file URLs are sent.
- **Circular imports:** None — the codebase is shallow and each script is self-contained.

## Anti-Patterns

### Prompt duplication between Web UI and CLI

**What happens:** `src/App.jsx` contains abbreviated versions of the strategy and caption prompts as JS template literals (`STRATEGY` and `CAPTION_PROMPT` constants at lines 7–31), while the canonical full prompts live in `prompts/post-advisor.md` and `prompts/caption-generator.md`. These can diverge.

**Why it's wrong:** A strategy update in `prompts/strategy.md` does not automatically update what the web UI sends to Gemini. The two surfaces will behave differently over time.

**Do this instead:** Have the web UI load prompts from `prompts/` at build time (Vite's `?raw` import) or via a local API route, so both surfaces use the same source of truth.

### API key exposed in browser

**What happens:** `VITE_GEMINI_API_KEY` is bundled into the client-side JS by Vite and sent with every Gemini API call directly from the browser.

**Why it's wrong:** The key is visible in browser devtools network tab and in the compiled `dist/` bundle — anyone visiting the page can extract it.

**Do this instead:** Route AI calls through a server-side function (e.g., a Vite API route, Express endpoint, or Cloudflare Worker) that holds the key server-side. The browser calls the proxy, which calls Gemini.

## Error Handling

**Strategy:** Throw descriptive `Error` objects in async functions; catch at call site and store in React state (`setError(e.message)`) for Web UI; `console.error` + `process.exit(1)` for CLI scripts.

**Patterns:**
- Web UI: try/catch around `callAPI()` → error string stored in `error` state → rendered in `errBox` div
- CLI scripts: try/catch around JSON parse step; HTTP non-OK responses surfaced as `Gemini API {status}: {detail}` errors
- `doctor.js` exits with code 1 if any required file or API key is missing

## Cross-Cutting Concerns

**Logging:** No logging framework. Web UI renders errors in the UI. CLI scripts use ANSI color codes (`\x1b[32m`, etc.) directly in `console.log`/`console.error` calls.

**Validation:** Input validation is minimal — file type check on image upload in Web UI (`file.type.startsWith('image/')`); MIME extension check in CLI scripts (`MIME_MAP[ext]`). No schema validation of AI JSON responses beyond `JSON.parse()`.

**Authentication:** No user auth. API keys from environment variables only. `.env` file exists and is gitignored.

---

*Architecture analysis: 2026-05-26*
