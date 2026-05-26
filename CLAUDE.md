<!-- GSD:project-start source:PROJECT.md -->
## Project

**instagram-advisor**

Herramienta personal de análisis de Instagram impulsada por IA — tres agentes core (post-advisor, caption-generator, profile-auditor) accesibles desde una web UI y CLI, con un feed-reviewer standalone via Playwright. Construida en TypeScript con Clean Architecture como showcase de SOLID y Desarrollo Dirigido por Agentes (DDA).

Objetivo público: publicar en LinkedIn/X como demostración de que se puede construir software bien estructurado usando agentes — no "vibe coding".

**Core Value:** Un advisor de Instagram completo y arquitecturalmente ejemplar: cualquier developer puede clonar el repo, entender la estructura en minutos, y cambiar de proveedor de IA editando una línea en config.yaml.

### Constraints

- **Tech stack**: TypeScript + React 18 + Vite 6 — no cambiar el stack frontend
- **Sin backend**: stateless por decisión de diseño — la UI llama APIs directamente con VITE_ env vars
- **Clean Architecture**: `domain/` no puede importar de `infrastructure/`, `ui/`, ni `cli/` — jamás
- **Showcase**: el código debe ser legible y ejemplar — no solo funcional
- **Playwright**: el feed-reviewer usa Playwright para scraping; requiere login de Instagram en las vars de entorno
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ESM) — all source files (`src/`, `scripts/`)
- JSX — UI components (`src/App.jsx`, `src/main.jsx`)
- YAML — profile data (`profile.yaml`)
- Markdown — prompt files (`prompts/*.md`, `SKILL.md`)
- CSS — global stylesheet (`src/index.css`)
## Runtime
- Node.js v24.11.1 (active runtime at analysis time; no `.nvmrc` or `.node-version` pinning)
- pnpm (lockfile version 9.0)
- Lockfile: `pnpm-lock.yaml` present and committed
- Workspace config: `pnpm-workspace.yaml` (controls build allowlist for `@google/genai` and `esbuild`)
## Frameworks
- React 18.3.1 — UI component rendering (`src/App.jsx`, `src/main.jsx`)
- ReactDOM 18.3.1 — DOM mounting via `ReactDOM.createRoot`
- Vite 6.0.0 — dev server (port 5173) and production build
- `@vitejs/plugin-react` 4.3.4 — JSX transform for Vite
- None detected
## Key Dependencies
- `@anthropic-ai/sdk` ^0.39.0 — used exclusively in CLI scripts (`scripts/analyze.js`, `scripts/caption.js`) to call Claude API
- `@google/genai` ^2.6.0 — installed as dependency; not actively imported in source (UI uses raw `fetch` to Gemini REST endpoint instead)
- `dotenv` ^16.0.0 — loads `.env` into `process.env` for CLI scripts via `import 'dotenv/config'`
- `js-yaml` ^4.1.0 — YAML parsing (referenced in package.json; no active import found in audited source files)
- `minimist` ^1.2.8 — CLI argument parsing in `scripts/analyze.js` and `scripts/caption.js`
- `react` + `react-dom` ^18.3.1 — UI framework
- `@google/genai` ^2.6.0 — native build allowed via `pnpm-workspace.yaml`; esbuild native build is explicitly suppressed
## Configuration
- `.env` file at project root (gitignored)
- Template: `.env.example` documents two required variables:
- UI also checks `VITE_GEMINI_API_KEY` as primary key (falls back to `VITE_ANTHROPIC_API_KEY`): `src/App.jsx` line 3
- Vite reads env from parent of `src/` root via `envDir: '../'`
- `vite.config.js` — single config file, no separate prod/dev splits
- Output directory: `dist/` (contains committed `dist/index.html`)
- `pnpm-workspace.yaml` — controls which packages may run native builds
## NPM Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start Vite dev server on port 5173 |
| `build` | `vite build` | Build to `dist/` |
| `doctor` | `node scripts/doctor.js` | Check all prerequisites exist |
| `analyze` | `node scripts/analyze.js` | CLI: analyze photo via Claude API |
| `caption` | `node scripts/caption.js` | CLI: generate captions via Claude API |
| `profile` | `node scripts/profile.js` | CLI: profile audit (script file not present) |
## Platform Requirements
- Node.js (v24+ confirmed working; no lower bound pinned)
- pnpm package manager
- `.env` with at least `ANTHROPIC_API_KEY` for CLI scripts
- `.env` with `VITE_GEMINI_API_KEY` or `VITE_ANTHROPIC_API_KEY` for UI
- Static site deployment target — `dist/` contains the built SPA
- No server-side runtime required; all AI calls are client-side to external APIs
- API key must be embedded in the built bundle (Vite inlines `VITE_*` env vars at build time — security implication)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase `.jsx` — `App.jsx`
- Node CLI scripts: camelCase `.js` — `analyze.js`, `caption.js`, `doctor.js`
- Config files: lowercase — `vite.config.js`
- Prompt files: kebab-case `.md` — `post-advisor.md`, `caption-generator.md`
- React components: PascalCase — `VerdictBadge`, `ScoreBar`, `Spinner`, `App`
- Helper functions: camelCase — `loadImage`, `callAPI`, `runAnalyze`, `runCaption`
- Event handlers: camelCase `on`-prefix — `onDrop`
- Module-level constants: SCREAMING_SNAKE_CASE — `API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL`, `STRATEGY`, `CAPTION_PROMPT`, `TONES`, `FORMATS`, `LAYERS`
- React state vars: camelCase — `tab`, `image`, `caption`, `format`, `layer`, `loading`, `result`, `error`
- Local variables: camelCase — `fileType`, `photoPath`, `mimeType`, `imageData`, `verdictColor`
- ANSI color constants in scripts: SCREAMING_SNAKE_CASE — `BOLD`, `DIM`, `GREEN`, `YELLOW`, `RED`, `RESET`, `CYAN`
- Defined in `:root` with `--kebab-case` — `--bg`, `--bg-2`, `--text-2`, `--accent-dim`, `--radius-lg`
## Code Style
- No automated formatter configured (no `.prettierrc`, `biome.json`, or `.eslintrc`)
- Indentation: 2 spaces throughout
- Single quotes for string literals in JSX/JS — `'react'`, `'listo'`, `'post_individual'`
- Template literals for multiline strings — system prompts in `App.jsx`
- Trailing commas: not consistently enforced
- No ESLint or Biome configuration present
- Code relies on developer discipline
- Absent in `App.jsx` (no-semicolons style)
- Present in script files (`analyze.js`, `caption.js`, `doctor.js`) — inconsistency across layers
## Import Organization
## Inline Styles Pattern
- Static styles: plain objects as values — `s.root`, `s.label`
- Dynamic styles: functions returning objects — `s.tab(active)`, `s.chip(active)`, `s.dropzone(dragging)`
- CSS variables used for all design tokens, never raw hex values in inline styles (except computed values)
- CSS animation (`@keyframes spin`) injected via `<style>` tag inside JSX
## Error Handling
- `try/catch` wraps all async API calls in `callAPI`, `runAnalyze`, `runCaption`
- Errors are stored in state: `setError(e.message)` — rendered in UI as an `errBox`
- Input validation is synchronous and early-return: `if (!file) return` in `loadImage`
- JSON parse errors from API responses throw with descriptive messages: `'La respuesta de Gemini no es JSON válido.'`
- API key absence throws immediately with a clear message
- Validation with `process.exit(1)` after `console.error()` for missing args, missing files, unsupported types
- API response JSON parsed in `try/catch` — error prints raw response and exits
- No thrown errors bubble up unhandled; all errors are caught at top-level
## Logging
- Direct `console.log` / `console.error` with ANSI color codes
- ANSI constants declared at top of each script file
- Progress messages use `DIM` color; results use `BOLD` + semantic colors (GREEN/YELLOW/RED)
- No logger library — raw `console.*`
- No console logging present in `App.jsx` — all feedback goes through React state to UI
## Comments
- JSX section delimiters: `{/* LEFT PANEL — input */}` style comments to mark regions
- Inline annotations on state declarations: `useState(null) // { base64, type, url }`
- No JSDoc / TSDoc used (JavaScript, not TypeScript)
## Function Design
- UI sub-components receive simple props: `{ verdict }`, `{ label, score }`
- No prop destructuring with defaults; defaults implied by fallback logic
- `callAPI` returns parsed JSON object (throws on error)
- `loadImage` returns nothing; results via `setState`
- Sub-components return JSX
## Module Design
- `src/App.jsx` uses `export default function App()`
- Sub-components (`VerdictBadge`, `ScoreBar`, `Spinner`) are not exported — local to module
- CLI scripts have no exports; they are top-level executable modules
- In `App.jsx`: hardcoded as module-level template literal constants (`STRATEGY`, `CAPTION_PROMPT`)
- In CLI scripts: loaded at runtime from `prompts/*.md` files via `readFileSync`
- These two approaches are inconsistent between frontend and CLI layers
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Two independent surfaces (Web UI and CLI) that call different AI providers but use the same prompt content
- Prompt-driven architecture: all agent logic lives in `.md` files under `prompts/`, not in JS code
- All AI responses are structured JSON — every agent outputs a defined JSON schema
- No backend server — the web UI calls Gemini directly from the browser; CLI scripts call Anthropic via SDK
- Stateless: no database, no session persistence, no server-side state
## Layers
- Purpose: Defines agent behavior, output schemas, and personal strategy context
- Location: `prompts/`
- Contains: System prompts (`.md`) and structured identity data (`profile.yaml`)
- Depends on: Nothing (static markdown/YAML)
- Used by: CLI scripts (read via `fs.readFileSync`) and referenced conceptually by Web UI (inlined in `App.jsx`)
- Purpose: Node.js entry points for terminal-based usage
- Location: `scripts/`
- Contains: `analyze.js`, `caption.js`, `doctor.js`
- Depends on: `prompts/`, `profile.yaml`, `@anthropic-ai/sdk`, `dotenv`
- Used by: Direct `npm run` invocation or Claude Code slash commands
- Purpose: Browser-based React interface for image upload, mode switching, and result display
- Location: `src/`
- Contains: `App.jsx` (single component), `index.css`, `index.html`, `main.jsx`
- Depends on: Gemini API (direct fetch), environment variable `VITE_GEMINI_API_KEY`
- Used by: Browser via `npm run dev` or built `dist/`
## Data Flow
### Web UI — Analyze Post Path
### Web UI — Generate Caption Path
### CLI — analyze.js Path
### CLI — caption.js Path
- Web UI: React `useState` only — all state is local to the single `App` component, no external state manager
- CLI: No state — each script invocation is a single-shot operation
## Key Abstractions
- Purpose: Each "agent" is a `.md` system prompt defining a persona, analysis process, and a strict JSON output schema
- Examples: `prompts/post-advisor.md`, `prompts/caption-generator.md`, `prompts/profile-auditor.md`
- Pattern: System prompt defines behavior; caller passes image + user text; response is always a specific JSON shape
- Purpose: `prompts/strategy.md` and `profile.yaml` are injected as additional context into every CLI agent call
- Examples: CLI scripts concatenate these before the system prompt: `` `${systemPmt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}` ``
- Pattern: Static files read at runtime and composed into the API call
- Purpose: Single async function in `App.jsx` that handles all Gemini API communication, error handling, and JSON parsing
- Location: `src/App.jsx` lines 137–214
- Pattern: Takes `systemPrompt` and `userText`; returns parsed JSON object; throws descriptive errors on failure
## Entry Points
- Location: `src/main.jsx`
- Triggers: `npm run dev` (Vite dev server) or `npm run build` → `dist/`
- Responsibilities: Mounts `<App />` into `#root` div
- Location: `scripts/analyze.js`
- Triggers: `npm run analyze -- <foto.jpg> [flags]`
- Responsibilities: Post analysis with verdict, scores, analysis text, suggestions
- Location: `scripts/caption.js`
- Triggers: `npm run caption -- <foto.jpg> [--tone ...]`
- Responsibilities: Generate 2 caption variants with tone and hook_type metadata
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
### API key exposed in browser
## Error Handling
- Web UI: try/catch around `callAPI()` → error string stored in `error` state → rendered in `errBox` div
- CLI scripts: try/catch around JSON parse step; HTTP non-OK responses surfaced as `Gemini API {status}: {detail}` errors
- `doctor.js` exits with code 1 if any required file or API key is missing
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
