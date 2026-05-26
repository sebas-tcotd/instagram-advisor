# Codebase Structure

**Analysis Date:** 2026-05-26

## Directory Layout

```
instagram-advisor/
├── src/                    # Web UI (React + Vite)
│   ├── App.jsx             # Single React component — entire web UI
│   ├── main.jsx            # React entry point (mounts App)
│   ├── index.html          # HTML shell with font imports
│   └── index.css           # Global CSS variables and base styles
├── scripts/                # CLI entry points (Node.js ESM)
│   ├── analyze.js          # post-advisor CLI
│   ├── caption.js          # caption-generator CLI
│   └── doctor.js           # prerequisite checker
├── prompts/                # AI agent system prompts and strategy
│   ├── strategy.md         # Full personal Instagram strategy document
│   ├── post-advisor.md     # Agent: post analysis (system prompt + JSON schema)
│   ├── caption-generator.md # Agent: caption generation (system prompt + JSON schema)
│   └── profile-auditor.md  # Agent: profile audit (system prompt + JSON schema)
├── dist/                   # Vite build output (generated, not committed)
│   ├── index.html
│   └── assets/
├── .planning/              # GSD planning documents (committed)
│   └── codebase/
├── profile.yaml            # Structured identity + strategy data (YAML)
├── SKILL.md                # Claude Code skill entry point
├── package.json            # Dependencies and npm scripts
├── pnpm-lock.yaml          # Lockfile
├── pnpm-workspace.yaml     # pnpm workspace build config
├── vite.config.js          # Vite config (root: src, outDir: dist)
├── .env.example            # Environment variable template
├── .env                    # Local secrets — gitignored, never commit
├── README.md               # Setup and usage documentation
└── .gitignore              # Ignores .env, dist/, node_modules/, images
```

## Directory Purposes

**`src/`:**
- Purpose: React web application (Vite project)
- Contains: One component file (`App.jsx`), entry point (`main.jsx`), HTML shell, global CSS
- Key files: `src/App.jsx` is the entire UI — all logic, state, and rendering in one file

**`scripts/`:**
- Purpose: Standalone Node.js CLI scripts invoked via `npm run`
- Contains: One file per CLI command — self-contained, no shared module
- Key files: `scripts/analyze.js` and `scripts/caption.js` are the primary workflow scripts

**`prompts/`:**
- Purpose: AI agent definitions and strategy context — the core "intelligence" of the system
- Contains: Markdown system prompts (each defines an agent's persona, process, and JSON schema) plus `strategy.md` as shared context
- Key files: `prompts/strategy.md` is the authoritative strategy document injected into all CLI agents; `prompts/post-advisor.md` is the most complex agent definition

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes — `npm run build`
- Committed: No (gitignored)

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents
- Generated: Yes — by `gsd-map-codebase`
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/main.jsx`: Web UI bootstrap — mounts React app
- `src/index.html`: HTML shell — Vite uses this as root
- `scripts/analyze.js`: CLI post analysis entry point
- `scripts/caption.js`: CLI caption generation entry point
- `scripts/doctor.js`: CLI health check entry point

**Configuration:**
- `vite.config.js`: Vite build config — `root: 'src'`, `envDir: '../'`, `build.outDir: '../dist'`
- `package.json`: npm scripts (`dev`, `build`, `analyze`, `caption`, `doctor`, `profile`)
- `pnpm-workspace.yaml`: pnpm build allow-list for native deps
- `.env`: Local environment variables (`ANTHROPIC_API_KEY`, `VITE_GEMINI_API_KEY`)

**Core Logic:**
- `src/App.jsx`: All web UI logic — `callAPI()`, `runAnalyze()`, `runCaption()`, `loadImage()`, component state, rendering
- `scripts/analyze.js`: Post analysis workflow — arg parsing, file reading, Anthropic SDK call, colored output
- `scripts/caption.js`: Caption generation workflow — same pattern as analyze.js

**AI Prompts / Strategy:**
- `prompts/strategy.md`: Full Instagram strategy — the human document that drives all agent behavior
- `prompts/post-advisor.md`: Post advisor agent definition with full JSON response schema
- `prompts/caption-generator.md`: Caption generator agent definition with full JSON response schema
- `prompts/profile-auditor.md`: Profile auditor agent definition with full JSON response schema
- `profile.yaml`: Structured data (identity, roles, visual strategy, voice, content mix)

**Styles:**
- `src/index.css`: All styles via CSS custom properties — dark theme tokens in `:root`, base element resets

## Naming Conventions

**Files:**
- React components: PascalCase for exported default component, camelCase filename (`App.jsx`)
- CLI scripts: lowercase kebab-less (`analyze.js`, `caption.js`, `doctor.js`)
- Prompt files: kebab-case (`post-advisor.md`, `caption-generator.md`, `profile-auditor.md`)
- Config files: lowercase with extension matching tool convention (`vite.config.js`, `pnpm-workspace.yaml`)

**Directories:**
- Lowercase flat names: `src/`, `scripts/`, `prompts/`, `dist/`
- Hidden tool dirs: `.planning/`, `.agent/`, `.claude/`, `.gemini/`, `.opencode/`

**CSS Custom Properties:**
- Background layers: `--bg`, `--bg-2`, `--bg-3`
- Border intensities: `--border`, `--border-md`
- Text hierarchy: `--text`, `--text-2`, `--text-3`
- Semantic colors: `--accent`, `--accent-dim`, `--green`, `--green-bg`, `--yellow`, `--yellow-bg`, `--red`, `--red-bg`

**React State Variables:**
- `tab`, `image`, `caption`, `format`, `layer`, `tone`, `dragging`, `loading`, `result`, `error`

## Where to Add New Code

**New CLI agent (e.g., a "strategy-updater" script):**
- System prompt: `prompts/<agent-name>.md` — define persona, process, JSON schema
- Script: `scripts/<verb>.js` — follow the pattern in `scripts/analyze.js` (minimist args, readFileSync prompts, Anthropic SDK call, colored output)
- Register in `package.json` scripts: `"<verb>": "node scripts/<verb>.js"`
- Add to `scripts/doctor.js` checks array

**New Web UI feature (new tab or mode):**
- All code goes in `src/App.jsx` — there is only one component file
- Add tab value to the tab array in the tabs render
- Add corresponding state, handler function, and result render section
- If adding a new prompt, inline it as a module-level constant (following `STRATEGY`/`CAPTION_PROMPT` pattern, though see ARCHITECTURE.md concern about prompt duplication)

**New prompt/agent:**
- Primary definition: `prompts/<agent-name>.md`
- Schema: Define the JSON response shape inside the `.md` file in a fenced code block
- Usage: Read with `fs.readFileSync(resolve(ROOT, 'prompts/<agent-name>.md'), 'utf8')` in CLI scripts

**New CSS styles:**
- Global tokens: `src/index.css` `:root` block — add a new `--variable-name`
- Component styles: Inline `style` objects in `src/App.jsx` via the `s` object pattern

**Utilities / helpers:**
- There is no `utils/` or `lib/` directory. CLI scripts are self-contained. For shared CLI logic, create `scripts/lib/<util>.js` and import with ESM.

## Special Directories

**`prompts/`:**
- Purpose: The "brain" of the system — all AI agent definitions and strategy
- Generated: No — hand-authored, evolving documents
- Committed: Yes — these are the primary knowledge assets of the project

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes — `npm run build`
- Committed: No

**`.planning/`:**
- Purpose: GSD project planning and codebase map documents
- Generated: Partially (codebase docs auto-generated, planning docs human-authored)
- Committed: Yes

**`node_modules/`:**
- Generated: Yes — `pnpm install`
- Committed: No

---

*Structure analysis: 2026-05-26*
