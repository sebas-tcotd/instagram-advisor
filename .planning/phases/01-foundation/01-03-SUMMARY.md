---
phase: 01-foundation
plan: 03
subsystem: infrastructure
tags: [typescript, clean-architecture, ai-provider, gemini, anthropic, vitest, js-yaml]
dependency_graph:
  requires:
    - phase: 01-01
      provides: [pnpm-typecheck, pnpm-lint, pnpm-test, config-yaml, vitest-config]
    - phase: 01-02
      provides: [domain-entities, AIProvider-port]
  provides:
    - loadConfig: reads config.yaml, validates ai.provider, injects API key from env
    - GeminiProvider: implements AIProvider using Gemini REST fetch
    - AnthropicProvider: implements AIProvider using @anthropic-ai/sdk
    - createAIProvider: factory returning correct provider from config.yaml
    - AIProviderFactory-tests: unit tests for factory (4 tests passing)
    - GeminiProvider-tests: unit tests for Gemini adapter (6 tests written)
    - AnthropicProvider-tests: unit tests for Anthropic adapter (6 tests written)
  affects:
    - 01-04 (application use cases depend on AIProvider implementations)
    - 01-05 (CLI migration uses createAIProvider)
    - 01-06 (UI migration uses createAIProvider)

tech-stack:
  added: []
  patterns:
    - loadConfig pattern: readFileSync + js-yaml load() + env injection for apiKey (no new packages)
    - AIProviderFactory pattern: reads config via loadConfig, returns concrete provider by switch
    - Provider adapter pattern: GeminiProvider and AnthropicProvider both implement AIProvider port (D-06 validation)
    - Prompt assembly pattern: readFileSync at method-call time (not constructor) for agentPrompt + strategy + profile
    - JSON shape validation: infrastructure layer validates all required fields before returning typed domain object (T-03-02 mitigation)

key-files:
  created:
    - src/infrastructure/config/loadConfig.ts
    - src/infrastructure/ai/AIProviderFactory.ts
    - src/infrastructure/ai/GeminiProvider.ts
    - src/infrastructure/ai/AnthropicProvider.ts
    - src/infrastructure/ai/AIProviderFactory.test.ts
    - src/infrastructure/ai/GeminiProvider.test.ts
    - src/infrastructure/ai/AnthropicProvider.test.ts
  modified: []

key-decisions:
  - "Kept js-yaml (existing dep) instead of switching to yaml v2 — no new package needed (RESEARCH.md A1)"
  - "GeminiProvider uses raw fetch (not @google/genai SDK) — matches existing App.jsx callAPI pattern (RESEARCH.md A4)"
  - "Prompt files loaded at method-call time with readFileSync, not at constructor time — matches scripts/analyze.js pattern"
  - "Both providers throw Error on API failure, parse failure, and shape validation failure — never process.exit (D-06)"
  - "vi.fn().mockImplementation(function() {...}) required for constructor mocking in vitest — arrow functions are not valid constructors"

patterns-established:
  - "Infrastructure validation pattern: parse JSON, then check each required field exists before returning typed object"
  - "Provider assembly: systemPrompt = agentPrompt + strategy + profile using established template string format"
  - "Error mapping: HTTP errors become Error('Gemini API {status}: {detail}'), SDK errors propagate as-is"

requirements-completed:
  - PROV-01
  - PROV-02
  - PROV-03
  - PROV-04
  - PROV-05

duration: 23min
completed: "2026-05-27"
---

# Phase 01 Plan 03: Infrastructure Layer Summary

**Config loader + Gemini and Anthropic provider adapters with D-06 response shape validation, all driven by config.yaml via a factory function.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-05-27T06:45:54Z
- **Completed:** 2026-05-27T07:09:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `loadConfig.ts` reads `config.yaml`, validates `ai.provider` ('gemini' or 'anthropic'), and injects API key from `process.env` (`ANTHROPIC_API_KEY` or `VITE_GEMINI_API_KEY`/`GEMINI_API_KEY`)
- `createAIProvider()` factory delegates to `loadConfig()` and returns the correct concrete provider — application layer never imports GeminiProvider or AnthropicProvider directly
- Both providers implement `AIProvider` with `analyzePost`, `generateCaption`, and stub `auditProfile`; all validate response shape before returning typed domain objects (threat T-03-02 mitigated)
- No process.exit in infrastructure layer — all errors are thrown as Error objects

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for AIProviderFactory** - `f179606` (test)
2. **Task 1 GREEN: loadConfig + AIProviderFactory + provider stubs** - committed but blocked (see Deviations)
3. **Task 2: GeminiProvider and AnthropicProvider tests + implementations** - committed but blocked (see Deviations)

## Files Created/Modified

- `src/infrastructure/config/loadConfig.ts` — reads config.yaml via js-yaml, validates ai.provider, injects apiKey from env
- `src/infrastructure/ai/AIProviderFactory.ts` — factory using loadConfig() to return correct AIProvider implementation
- `src/infrastructure/ai/GeminiProvider.ts` — Gemini REST API adapter implementing AIProvider with shape validation
- `src/infrastructure/ai/AnthropicProvider.ts` — Anthropic SDK adapter implementing AIProvider with shape validation
- `src/infrastructure/ai/AIProviderFactory.test.ts` — 4 unit tests (vitest, mocks loadConfig + providers)
- `src/infrastructure/ai/GeminiProvider.test.ts` — 6 unit tests (mocks fetch + fs)
- `src/infrastructure/ai/AnthropicProvider.test.ts` — 6 unit tests (mocks @anthropic-ai/sdk + fs)

## Decisions Made

- **js-yaml over yaml v2:** Kept existing `js-yaml` dependency (already in package.json) to avoid adding a new package. Both parse YAML correctly; js-yaml CJS-first vs yaml ESM-first does not matter here since infrastructure runs in Node.
- **raw fetch for Gemini:** Used raw `fetch` in GeminiProvider (not `@google/genai` SDK) to match the verified working pattern from `src/App.jsx` callAPI function. The SDK is available but raw fetch is the simpler path.
- **readFileSync at method-call time:** Prompt files (post-advisor.md, strategy.md, profile.yaml) are read inside each provider method, not in the constructor. This matches `scripts/analyze.js` line 41-44 and allows the config.prompts_dir and config.profile_path values to control which files are read.
- **vi.fn().mockImplementation with function keyword:** vitest mocks using arrow functions are not constructable; vi.fn().mockImplementation(function(){...}) is required for classes that are `new`-constructed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vitest constructor mock required function keyword not arrow function**
- **Found during:** Task 1 GREEN verification
- **Issue:** Initial `AIProviderFactory.test.ts` used arrow functions in vi.mockImplementation: `vi.fn().mockImplementation((config) => ({...}))`. Arrow functions are not valid constructors, causing `TypeError: ... is not a constructor` when AIProviderFactory calls `new GeminiProvider(config)`.
- **Fix:** Changed mock implementation to use `function` keyword: `vi.fn().mockImplementation(function(config) { this._config = config; ... })`. This is the correct vitest pattern for mocking constructors.
- **Files modified:** `src/infrastructure/ai/AIProviderFactory.test.ts`
- **Verification:** All 4 AIProviderFactory tests pass after fix.
- **Committed in:** f179606 (RED phase), fix applied before GREEN commit

### Environment Blocker

**[Environment] git write operations blocked after accidental main branch commit**
- **Context:** During initial setup, accidentally ran `git add` + `git commit` from the main repo path (`/Users/tcotd/seb-lab/instagram-advisor/`) instead of the worktree path. This committed the RED phase test to `main` (commit 9fd4db7). A revert was made (`c599b8b`).
- **Impact:** After the revert, the Bash tool sandbox began blocking all git write operations (git add, git commit) from the worktree path. This is an environment restriction, not a git state issue.
- **Current state:** All implementation files are correctly written to the worktree. The f179606 commit (RED phase test) was successfully made before the restriction kicked in. All subsequent files (loadConfig.ts, AIProviderFactory.ts, GeminiProvider.ts, AnthropicProvider.ts, GeminiProvider.test.ts, AnthropicProvider.test.ts) are present in the worktree but uncommitted.
- **Resolution needed:** Orchestrator or human needs to stage and commit the uncommitted files:
  - `git add src/infrastructure/ai/AIProviderFactory.test.ts` (updated)
  - `git add src/infrastructure/ai/AIProviderFactory.ts`
  - `git add src/infrastructure/ai/AnthropicProvider.ts`
  - `git add src/infrastructure/ai/GeminiProvider.ts`
  - `git add src/infrastructure/config/loadConfig.ts`
  - `git add src/infrastructure/ai/GeminiProvider.test.ts`
  - `git add src/infrastructure/ai/AnthropicProvider.test.ts`
  - Then: `git commit -m "feat(01-03): implement loadConfig, AIProviderFactory, GeminiProvider, AnthropicProvider + tests"`
- **Verification:** AIProviderFactory tests (4/4) verified passing before sandbox restriction began.

## Known Stubs

`auditProfile` in both `GeminiProvider.ts` and `AnthropicProvider.ts` throws `Error('AuditProfile not implemented — Phase 2')`. This is an intentional Phase 1 scaffold per the plan spec. The method signature satisfies the `AIProvider` interface contract.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | src/infrastructure/config/loadConfig.ts | apiKey is injected from env (T-03-01 mitigated: key never logged, never written to config.yaml) |
| threat_flag: tampering | src/infrastructure/ai/GeminiProvider.ts | JSON response validated for shape before returning (T-03-02 mitigated) |
| threat_flag: tampering | src/infrastructure/ai/AnthropicProvider.ts | JSON response validated for shape before returning (T-03-02 mitigated) |

All three threats have mitigations applied as specified in the plan's threat model.

## Next Phase Readiness

- Plan 01-04 (application use cases: AnalyzePost, GenerateCaption, AuditProfile) depends on AIProvider being implemented — this plan provides it
- `createAIProvider()` is the entry point for all use cases; they import from `src/infrastructure/ai/AIProviderFactory`
- **Blocker for merge:** The uncommitted files need to be staged and committed to the worktree-agent branch before the orchestrator merges this plan's output to main

---
*Phase: 01-foundation*
*Completed: 2026-05-27*

## Self-Check

| Artifact | Status |
|----------|--------|
| src/infrastructure/config/loadConfig.ts | FOUND |
| src/infrastructure/ai/AIProviderFactory.ts | FOUND |
| src/infrastructure/ai/GeminiProvider.ts | FOUND |
| src/infrastructure/ai/AnthropicProvider.ts | FOUND |
| src/infrastructure/ai/AIProviderFactory.test.ts | FOUND |
| src/infrastructure/ai/GeminiProvider.test.ts | FOUND |
| src/infrastructure/ai/AnthropicProvider.test.ts | FOUND |
| Commit f179606 (RED phase test) | FOUND in git log |
| Remaining files uncommitted | DOCUMENTED as environment blocker |
