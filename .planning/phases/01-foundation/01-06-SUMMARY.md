---
phase: 01-foundation
plan: 06
subsystem: ui
tags: [typescript, react, vite, clean-architecture, migration, gemini, hooks]

requires:
  - phase: 01-05
    provides: CLI layer complete; TypeScript toolchain confirmed working
  - phase: 01-03
    provides: infrastructure/ai providers with GeminiProvider

provides:
  - src/ui/App.tsx — TypeScript root component
  - src/ui/components/VerdictBadge.tsx — typed verdict badge
  - src/ui/components/ScoreBar.tsx — typed score bar
  - src/ui/components/Spinner.tsx — spinner component
  - src/ui/hooks/useAIProvider.ts — Gemini hook with ?raw prompt imports
  - src/ui/pages/AnalyzePage.tsx — analyze tab page
  - src/ui/pages/CaptionPage.tsx — caption tab page
  - src/main.tsx — renamed entry point with non-null assertion

affects:
  - Phase 2 UI features
  - Any consumer of src/ui/ components

tech-stack:
  added:
    - "@types/react@19.2.15"
    - "@types/react-dom@19.2.3"
    - "@types/minimist@1.2.5"
  patterns:
    - "?raw import pattern: prompts and YAML loaded at Vite build time via @prompts/@root aliases"
    - "useAIProvider hook: encapsulates Gemini fetch, prompt assembly, typed React state"
    - "Page components: self-contained with controls + results; receive image state as props"
    - "@root alias in vite.config.ts for files outside src/ root"

key-files:
  created:
    - src/ui/App.tsx
    - src/ui/components/VerdictBadge.tsx
    - src/ui/components/ScoreBar.tsx
    - src/ui/components/Spinner.tsx
    - src/ui/hooks/useAIProvider.ts
    - src/ui/pages/AnalyzePage.tsx
    - src/ui/pages/CaptionPage.tsx
    - src/main.tsx
  modified:
    - src/index.css (added @keyframes spin)
    - vite.config.ts (added @root alias)
    - package.json (added @types/react, @types/react-dom, @types/minimist)
    - pnpm-lock.yaml
  deleted:
    - src/App.jsx
    - src/main.jsx

key-decisions:
  - "Browser UI only supports Gemini REST API in v1 — AnthropicProvider requires Node.js (CORS + server-side key); documented as TODO in useAIProvider.ts"
  - "@root alias added to vite.config.ts to resolve profile.yaml and config.yaml outside Vite root (src/)"
  - "Page components (AnalyzePage, CaptionPage) are self-contained with both controls and results; rendered in App.tsx right column"
  - "@types/react, @types/react-dom, @types/minimist installed as devDependencies (were missing from prior plans)"

patterns-established:
  - "?raw import via alias: import configRaw from '@root/config.yaml?raw' — use @root for project-root files outside src/"
  - "Hook pattern: useAnalyzePost/useGenerateCaption return { loading, result, error, run } with typed state"
  - "Inline styles with TypeScript: use 'as const' for string literal CSS values (e.g., textTransform: 'uppercase' as const)"

requirements-completed:
  - MIGR-01
  - MIGR-02
  - PROV-03
  - PROV-05

duration: 45min
completed: "2026-05-27"
---

# Phase 01 Plan 06: UI Migration Summary

**App.jsx monolith (481 lines) split into typed TypeScript src/ui/ components with ?raw prompt imports, eliminating the STRATEGY/CAPTION_PROMPT inline duplication anti-pattern**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-27T13:00:00Z
- **Completed:** 2026-05-27T13:45:00Z
- **Tasks:** 3/3 complete (human checkpoint APPROVED)
- **Files modified:** 12 (8 created, 4 modified/deleted)

## Accomplishments

- Split App.jsx monolith into src/ui/ with typed components (VerdictBadge, ScoreBar, Spinner), page components (AnalyzePage, CaptionPage), and a useAIProvider hook
- Eliminated STRATEGY and CAPTION_PROMPT inline constants — prompts now load from prompts/*.md via Vite ?raw imports at build time
- Added @root alias to vite.config.ts to resolve files outside Vite's src/ root (profile.yaml, config.yaml)
- pnpm typecheck exits 0 across full src/ tree; pnpm build produces dist/ without errors
- Deleted src/App.jsx and src/main.jsx — UI layer is now 100% TypeScript

## Task Commits

1. **Task 1: Extract UI components and rename entry point** - `fa449ea` (feat)
2. **Task 2: Create useAIProvider hook, page components, and App.tsx — delete App.jsx** - `ac90a23` (feat)
3. **Task 3: Human verification checkpoint** — ✅ APPROVED (2026-05-27)

## Files Created/Modified

- `src/ui/components/VerdictBadge.tsx` — Verdict prop type from domain entities
- `src/ui/components/ScoreBar.tsx` — label/score props, percentage progress bar
- `src/ui/components/Spinner.tsx` — animation via @keyframes spin in index.css
- `src/ui/hooks/useAIProvider.ts` — Gemini fetch logic, ?raw prompt imports, typed hooks
- `src/ui/pages/AnalyzePage.tsx` — format/layer/caption controls + verdict/scores/analysis results
- `src/ui/pages/CaptionPage.tsx` — tone selector + caption card results
- `src/ui/App.tsx` — tab nav, dropzone, image state; delegates to page components
- `src/main.tsx` — renamed from main.jsx with non-null assertion and './ui/App' import
- `src/index.css` — added @keyframes spin (extracted from App.jsx inline style tag)
- `vite.config.ts` — added @root alias for project-root files
- `package.json` — added @types/react, @types/react-dom, @types/minimist
- `src/App.jsx` — DELETED
- `src/main.jsx` — DELETED (renamed to main.tsx)

## Decisions Made

1. **Browser-only Gemini for v1**: AnthropicProvider uses Node.js APIs incompatible with browser context (CORS, API key exposure). Only Gemini REST API is supported in the browser UI. Documented as TODO in useAIProvider.ts; AnthropicProvider in browser deferred to v2 with a backend proxy.

2. **@root alias for files outside src/**: Vite's `root: 'src'` restricts direct relative-path access to files above `src/`. Added `@root: resolve(__dirname)` alias to allow `import profileRaw from '@root/profile.yaml?raw'` and similar.

3. **Self-contained page components**: AnalyzePage and CaptionPage render both their controls (left-panel content) and results (stacked below in the right panel). App.tsx renders page components in the right column alongside the dropzone in the left column.

4. **Type packages installed**: @types/react, @types/react-dom, and @types/minimist were missing from devDependencies despite React/minimist being used. Installed as Rule 3 auto-fix (blocked typecheck).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @types/react, @types/react-dom caused typecheck failures**
- **Found during:** Task 1 (first typecheck run)
- **Issue:** TypeScript could not find declarations for 'react', 'react-dom/client', 'react/jsx-runtime' — JSX elements had implicit any types
- **Fix:** `pnpm add -D @types/react @types/react-dom @types/minimist` in worktree
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** pnpm typecheck exits 0 after install
- **Committed in:** fa449ea (Task 1 commit)

**2. [Rule 3 - Blocking] Vite root: 'src' prevented resolution of profile.yaml and config.yaml via relative paths**
- **Found during:** Task 2 (pnpm build — Vite could not resolve '../../profile.yaml?raw')
- **Issue:** With `root: 'src'`, Vite restricts the module graph to files under src/. Relative paths from src/ui/hooks/ escaping src/ boundary failed at build time.
- **Fix:** Added `@root: resolve(__dirname)` alias to vite.config.ts. Updated useAIProvider.ts to use `import configRaw from '@root/config.yaml?raw'` and `import profileRaw from '@root/profile.yaml?raw'`
- **Files modified:** vite.config.ts, src/ui/hooks/useAIProvider.ts
- **Verification:** pnpm build exits 0, dist/ produced
- **Committed in:** ac90a23 (Task 2 commit)

**3. [Rule 2 - Missing] Path safety: worktree vs. main repo**
- **Found during:** Task 1 execution — initial file writes went to main repo path instead of worktree
- **Issue:** Agent working directory was set to the worktree path but absolute path construction targeted the main repo
- **Fix:** Identified the worktree root, recreated all files in the correct worktree path, reverted accidental changes to main repo (restored main.jsx, removed incorrectly placed src/ui/ files, reverted package.json/pnpm-lock via git checkout)
- **Impact:** No data lost; main repo left clean

---

**Total deviations:** 3 (2 blocking auto-fixes, 1 path safety correction)
**Impact on plan:** All fixes were necessary for typecheck and build to pass. No scope creep.

## Known Stubs

None — all UI functionality is fully wired. The Gemini provider path is complete for the browser; AnthropicProvider in-browser is documented as out-of-scope for v1 (not a stub, a deliberate limitation).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | src/ui/hooks/useAIProvider.ts | T-06-01: VITE_GEMINI_API_KEY inlined in Vite bundle at build time — accepted per plan (personal tool, dist/ gitignored) |
| threat_flag: information_disclosure | src/ui/hooks/useAIProvider.ts | T-06-04: prompts/*.md and profile.yaml inlined in production bundle via ?raw imports — accepted (personal tool) |

## Verification Evidence

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm build` | exits 0 — dist/ produced |
| src/App.jsx deleted | CONFIRMED |
| src/main.jsx deleted | CONFIRMED |
| STRATEGY/CAPTION_PROMPT absent from src/ | CONFIRMED |
| No infrastructure/cli imports in src/ui/ | CONFIRMED |
| useAIProvider.ts uses @prompts ?raw imports | CONFIRMED |
| src/main.tsx contains getElementById('root')! | CONFIRMED |

## Checkpoint Status

**Task 3 (checkpoint:human-verify)** — ✅ APPROVED by user (2026-05-27)

Verified in browser with Gemini provider:
- UI renders two tabs ("analizar post", "generar caption") with image dropzone
- Analyze flow: uploaded B&W portrait → received verdict "necesita ajustes", visual 8.5/10, caption 9.5/10, fit 8.5/10, 3 suggestions in Spanish
- Caption flow: generated 2 variants (introspectivo + narrativo tono) with hook type tags and editorial recommendation note
- `pnpm build` exits 0 (automated: CONFIRMED)

## Next Phase Readiness

- UI layer complete in TypeScript; Clean Architecture boundary maintained (no infrastructure imports in src/ui/)
- src/ui/ folder structure is ready for Phase 2 feature additions
- @prompts/?raw pattern established — adding new agent prompts requires only adding import in useAIProvider.ts

---
*Phase: 01-foundation*
*Completed: 2026-05-27*
