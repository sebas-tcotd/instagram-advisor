# Coding Conventions

**Analysis Date:** 2026-05-26

## Naming Patterns

**Files:**
- React components: PascalCase `.jsx` — `App.jsx`
- Node CLI scripts: camelCase `.js` — `analyze.js`, `caption.js`, `doctor.js`
- Config files: lowercase — `vite.config.js`
- Prompt files: kebab-case `.md` — `post-advisor.md`, `caption-generator.md`

**Functions / Components:**
- React components: PascalCase — `VerdictBadge`, `ScoreBar`, `Spinner`, `App`
- Helper functions: camelCase — `loadImage`, `callAPI`, `runAnalyze`, `runCaption`
- Event handlers: camelCase `on`-prefix — `onDrop`

**Variables / Constants:**
- Module-level constants: SCREAMING_SNAKE_CASE — `API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL`, `STRATEGY`, `CAPTION_PROMPT`, `TONES`, `FORMATS`, `LAYERS`
- React state vars: camelCase — `tab`, `image`, `caption`, `format`, `layer`, `loading`, `result`, `error`
- Local variables: camelCase — `fileType`, `photoPath`, `mimeType`, `imageData`, `verdictColor`
- ANSI color constants in scripts: SCREAMING_SNAKE_CASE — `BOLD`, `DIM`, `GREEN`, `YELLOW`, `RED`, `RESET`, `CYAN`

**CSS Variables:**
- Defined in `:root` with `--kebab-case` — `--bg`, `--bg-2`, `--text-2`, `--accent-dim`, `--radius-lg`

## Code Style

**Formatting:**
- No automated formatter configured (no `.prettierrc`, `biome.json`, or `.eslintrc`)
- Indentation: 2 spaces throughout
- Single quotes for string literals in JSX/JS — `'react'`, `'listo'`, `'post_individual'`
- Template literals for multiline strings — system prompts in `App.jsx`
- Trailing commas: not consistently enforced

**Linting:**
- No ESLint or Biome configuration present
- Code relies on developer discipline

**Semicolons:**
- Absent in `App.jsx` (no-semicolons style)
- Present in script files (`analyze.js`, `caption.js`, `doctor.js`) — inconsistency across layers

## Import Organization

**React component imports (`src/App.jsx`):**
1. Named React hooks from `'react'`
2. No external UI libraries — all styling is inline

**Script imports (`scripts/*.js`):**
1. Node built-ins (`fs`, `path`) using named imports
2. Third-party packages (`minimist`, `@anthropic-ai/sdk`, `dotenv/config`)
3. No local module imports (scripts are self-contained)

**Entry point (`src/main.jsx`):**
1. `react` (default + namespace)
2. Local component `./App.jsx`
3. Local CSS `./index.css`

**Path Aliases:** None configured.

**Module system:** ES modules (`"type": "module"` in `package.json`); `import.meta.dirname` used in scripts for `__dirname` equivalent.

## Inline Styles Pattern

All component styling is done via inline style objects defined in a single `s` object within `App()`:

```jsx
// src/App.jsx — all styles declared in one object at top of render
const s = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  label: { fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', ... },
  tab: (active) => ({ ... color: active ? 'var(--accent)' : 'var(--text-3)', ... }),
}
```

- Static styles: plain objects as values — `s.root`, `s.label`
- Dynamic styles: functions returning objects — `s.tab(active)`, `s.chip(active)`, `s.dropzone(dragging)`
- CSS variables used for all design tokens, never raw hex values in inline styles (except computed values)
- CSS animation (`@keyframes spin`) injected via `<style>` tag inside JSX

## Error Handling

**Frontend (`src/App.jsx`):**
- `try/catch` wraps all async API calls in `callAPI`, `runAnalyze`, `runCaption`
- Errors are stored in state: `setError(e.message)` — rendered in UI as an `errBox`
- Input validation is synchronous and early-return: `if (!file) return` in `loadImage`
- JSON parse errors from API responses throw with descriptive messages: `'La respuesta de Gemini no es JSON válido.'`
- API key absence throws immediately with a clear message

**CLI scripts (`scripts/*.js`):**
- Validation with `process.exit(1)` after `console.error()` for missing args, missing files, unsupported types
- API response JSON parsed in `try/catch` — error prints raw response and exits
- No thrown errors bubble up unhandled; all errors are caught at top-level

**Pattern:**
```js
// scripts/analyze.js — CLI error pattern
if (!photo) {
  console.error(`\n${RED}Uso: npm run analyze -- <foto> [...]${RESET}\n`)
  process.exit(1)
}
```

## Logging

**CLI Scripts:**
- Direct `console.log` / `console.error` with ANSI color codes
- ANSI constants declared at top of each script file
- Progress messages use `DIM` color; results use `BOLD` + semantic colors (GREEN/YELLOW/RED)
- No logger library — raw `console.*`

**Frontend:**
- No console logging present in `App.jsx` — all feedback goes through React state to UI

## Comments

**When to Comment:**
- JSX section delimiters: `{/* LEFT PANEL — input */}` style comments to mark regions
- Inline annotations on state declarations: `useState(null) // { base64, type, url }`
- No JSDoc / TSDoc used (JavaScript, not TypeScript)

**Philosophy:** Code is largely self-documenting through clear variable naming. Comments are sparse and structural.

## Function Design

**Size:** Functions are medium-sized. `callAPI` (~40 lines), `runAnalyze` (~10 lines), `runCaption` (~10 lines). The `App()` component is large (481 lines total including styles + JSX).

**Parameters:**
- UI sub-components receive simple props: `{ verdict }`, `{ label, score }`
- No prop destructuring with defaults; defaults implied by fallback logic

**Return Values:**
- `callAPI` returns parsed JSON object (throws on error)
- `loadImage` returns nothing; results via `setState`
- Sub-components return JSX

**Async pattern:**
```jsx
// src/App.jsx
const runAnalyze = async () => {
  if (!image) return
  setLoading(true); setResult(null); setError(null)
  try {
    const parsed = await callAPI(STRATEGY, userText)
    setResult({ type: 'analyze', data: parsed })
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

## Module Design

**Exports:**
- `src/App.jsx` uses `export default function App()`
- Sub-components (`VerdictBadge`, `ScoreBar`, `Spinner`) are not exported — local to module
- CLI scripts have no exports; they are top-level executable modules

**Barrel Files:** None — the project has a flat source structure with only 2 JSX files.

**Prompt Strings:**
- In `App.jsx`: hardcoded as module-level template literal constants (`STRATEGY`, `CAPTION_PROMPT`)
- In CLI scripts: loaded at runtime from `prompts/*.md` files via `readFileSync`
- These two approaches are inconsistent between frontend and CLI layers

---

*Convention analysis: 2026-05-26*
