# Technology Stack

**Analysis Date:** 2026-05-26

## Languages

**Primary:**
- JavaScript (ESM) — all source files (`src/`, `scripts/`)
- JSX — UI components (`src/App.jsx`, `src/main.jsx`)

**Secondary:**
- YAML — profile data (`profile.yaml`)
- Markdown — prompt files (`prompts/*.md`, `SKILL.md`)
- CSS — global stylesheet (`src/index.css`)

## Runtime

**Environment:**
- Node.js v24.11.1 (active runtime at analysis time; no `.nvmrc` or `.node-version` pinning)

**Package Manager:**
- pnpm (lockfile version 9.0)
- Lockfile: `pnpm-lock.yaml` present and committed
- Workspace config: `pnpm-workspace.yaml` (controls build allowlist for `@google/genai` and `esbuild`)

## Frameworks

**Core:**
- React 18.3.1 — UI component rendering (`src/App.jsx`, `src/main.jsx`)
- ReactDOM 18.3.1 — DOM mounting via `ReactDOM.createRoot`

**Build/Dev:**
- Vite 6.0.0 — dev server (port 5173) and production build
  - Config: `vite.config.js`
  - Root: `src/`, output: `dist/`, env dir: project root
- `@vitejs/plugin-react` 4.3.4 — JSX transform for Vite

**Testing:**
- None detected

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` ^0.39.0 — used exclusively in CLI scripts (`scripts/analyze.js`, `scripts/caption.js`) to call Claude API
- `@google/genai` ^2.6.0 — installed as dependency; not actively imported in source (UI uses raw `fetch` to Gemini REST endpoint instead)
- `dotenv` ^16.0.0 — loads `.env` into `process.env` for CLI scripts via `import 'dotenv/config'`
- `js-yaml` ^4.1.0 — YAML parsing (referenced in package.json; no active import found in audited source files)
- `minimist` ^1.2.8 — CLI argument parsing in `scripts/analyze.js` and `scripts/caption.js`
- `react` + `react-dom` ^18.3.1 — UI framework

**Infrastructure:**
- `@google/genai` ^2.6.0 — native build allowed via `pnpm-workspace.yaml`; esbuild native build is explicitly suppressed

## Configuration

**Environment:**
- `.env` file at project root (gitignored)
- Template: `.env.example` documents two required variables:
  - `ANTHROPIC_API_KEY` — used by Node.js CLI scripts
  - `VITE_ANTHROPIC_API_KEY` — used by Vite browser UI (VITE_ prefix required for exposure)
- UI also checks `VITE_GEMINI_API_KEY` as primary key (falls back to `VITE_ANTHROPIC_API_KEY`): `src/App.jsx` line 3
- Vite reads env from parent of `src/` root via `envDir: '../'`

**Build:**
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

**Development:**
- Node.js (v24+ confirmed working; no lower bound pinned)
- pnpm package manager
- `.env` with at least `ANTHROPIC_API_KEY` for CLI scripts
- `.env` with `VITE_GEMINI_API_KEY` or `VITE_ANTHROPIC_API_KEY` for UI

**Production:**
- Static site deployment target — `dist/` contains the built SPA
- No server-side runtime required; all AI calls are client-side to external APIs
- API key must be embedded in the built bundle (Vite inlines `VITE_*` env vars at build time — security implication)

---

*Stack analysis: 2026-05-26*
