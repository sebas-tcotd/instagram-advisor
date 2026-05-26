# Phase 1: Foundation - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the existing JavaScript codebase to TypeScript with a Clean Architecture folder structure (`src/domain/`, `src/application/`, `src/infrastructure/`, `src/ui/`, `src/cli/`), wire both existing agents (AnalyzePost, GenerateCaption) through a provider-agnostic `AIProvider` port, and expose a `config.yaml` at the repo root so a developer can switch from Gemini to Anthropic by changing one line — without touching any code.

</domain>

<decisions>
## Implementation Decisions

### TypeScript Configuration
- **D-01:** Use `strict: true` from day one — no relaxed config, no `// @ts-ignore` shortcuts. The showcase goal requires genuinely exemplary TypeScript.
- **D-02:** Single root `tsconfig.json` with `module: ESNext` and `moduleResolution: Bundler` — covers both the Vite browser build and the Node CLI. No per-layer tsconfigs.
- **D-03:** Add `@typescript-eslint` in Phase 1 (not deferred to Phase 4). ESLint enforces the Clean Architecture layer boundaries from the moment code is written, not retrofitted after.

### Domain Entity Typing
- **D-04:** Define typed interfaces for all AI response shapes in `src/domain/entities/` — `PostAnalysisResult`, `CaptionResult` etc. TypeScript interfaces are the authoritative source of truth for response schemas; the prompt `.md` files reference the shape in prose but TS is authoritative. This prevents silent drift between what the AI returns and what the code expects.
- **D-05:** The `AIProvider` port uses **separate typed methods per use case** — `analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult>` and `generateCaption(req: CaptionRequest): Promise<CaptionResult>`. No generics, no discriminated unions — maximum readability for a showcase.
- **D-06:** Response validation happens in the **infrastructure layer** (inside `GeminiProvider` and `AnthropicProvider`). Providers validate the raw API response before returning the typed domain object. The application layer always receives a valid, fully-typed result or throws an `Error` — never malformed data.

### Claude's Discretion
- Web UI multi-provider scope: user did not discuss this area. Claude should decide how `PROV-05` ("whole app switches") applies to the browser UI given the build-time constraint. Recommended approach: UI reads `config.yaml` at Vite build time via a plugin or `?raw` import and selects the provider at build time — acceptable because the stateless SPA is always rebuilt for deployment.
- Prompt deduplication: user did not discuss this area. Claude should decide whether to fix the `App.jsx` inline prompt duplication as part of the infrastructure layer migration. Recommended: yes — prompts become a responsibility of the infrastructure layer (loaded from `prompts/` via Vite `?raw` import), eliminating the anti-pattern identified in ARCHITECTURE.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — MIGR-01..04, PROV-01..05, AGNT-01..03 are the locked requirements for this phase
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, and dependency chain

### Existing Code to Migrate
- `src/App.jsx` — 481-line monolith; the UI layer source. Split into `src/ui/` components/hooks/pages during migration
- `scripts/analyze.js` — CLI post-advisor script; migrates to `src/cli/` as TypeScript
- `scripts/caption.js` — CLI caption-generator script; migrates to `src/cli/` as TypeScript
- `scripts/doctor.js` — prerequisite checker; migrates to `src/cli/` as TypeScript

### Prompt & Profile Layer (stays as-is, location unchanged)
- `prompts/post-advisor.md` — defines PostAnalysisResult schema in prose; TS interface in `src/domain/entities/` is the authoritative shape
- `prompts/caption-generator.md` — defines CaptionResult schema in prose; same rule applies
- `prompts/strategy.md` — injected as context into all agent calls
- `profile.yaml` — structured identity data injected into agent calls

### Architecture Decisions
- `.planning/codebase/ARCHITECTURE.md` — current architecture and identified anti-patterns (prompt duplication, exposed API key) that Phase 1 partially resolves
- `.planning/codebase/CONCERNS.md` — known concerns; check before planning to avoid reintroducing them

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prompts/*.md` — all four prompt files stay in place; infrastructure layer reads them via `fs.readFileSync` (CLI) or Vite `?raw` import (UI)
- `profile.yaml` — stays at root; loaded by infrastructure layer for both CLI and UI
- Existing ANSI color output pattern in `scripts/*.js` — can be ported to the new CLI layer as a shared utility

### Established Patterns
- **All AI responses are structured JSON** — every agent already outputs a defined JSON schema. TypeScript interfaces in `src/domain/entities/` formalize what's already implicit.
- **Base64 image encoding** — both CLI and UI encode images to base64 before sending to AI. This pattern moves into the infrastructure providers unchanged.
- **callAPI() in App.jsx** (`src/App.jsx` lines 137–214) — the web UI's API call abstraction. Becomes `GeminiProvider.analyzePost()` and `GeminiProvider.generateCaption()` in `src/infrastructure/ai/`.

### Integration Points
- `vite.config.js` → `vite.config.ts`: the first TypeScript file. Sets the tone for the whole migration.
- `src/main.jsx` → `src/main.tsx`: entry point; mounts `<App />` unchanged.
- `package.json` scripts: `analyze`, `caption`, `profile` commands will point to compiled CLI entry points (or use `tsx` for direct TypeScript execution without a separate compile step).

</code_context>

<specifics>
## Specific Ideas

- The `AIProvider` port interface is the **central architectural example** of this phase — it should be designed to be readable and self-explanatory when a developer opens `src/domain/ports/AIProvider.ts` for the first time.
- `config.yaml` field names are locked by PROV-01: `ai.provider`, `ai.model`, `ai.max_tokens`, `prompts_dir`, `profile_path`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-26*
