---
phase: 01-foundation
plan: 05
subsystem: cli
tags: [typescript, clean-architecture, cli, migration, analyze, caption, doctor]
dependency_graph:
  requires: [01-03, 01-04]
  provides: [cli-analyze-ts, cli-caption-ts, cli-doctor-ts, scripts-deleted]
  affects: [01-06]
tech_stack:
  added:
    - "@types/js-yaml@4.0.9"
  patterns:
    - CLI entry point pattern: dotenv/config + minimist + process.exit(1) validation + use case invocation via createAIProvider()
    - ANSI color constants as SCREAMING_SNAKE_CASE module-level consts (no logger library)
    - Provider-aware API key check in doctor.ts using loadConfig()
key_files:
  created:
    - src/cli/analyze.ts
    - src/cli/caption.ts
    - src/cli/doctor.ts
  modified:
    - package.json (added @types/js-yaml devDependency)
    - pnpm-lock.yaml
    - src/application/AnalyzePost.test.ts (vi.mocked pattern fix)
    - src/application/GenerateCaption.test.ts (vi.mocked pattern fix)
    - src/infrastructure/ai/AIProviderFactory.ts (String() cast for never type)
    - src/infrastructure/ai/AnthropicProvider.ts (Promise.reject + error cause)
    - src/infrastructure/ai/GeminiProvider.ts (Promise.reject + error cause)
    - src/infrastructure/ai/GeminiProvider.test.ts (sync json() mocks)
  deleted:
    - scripts/analyze.js
    - scripts/caption.js
    - scripts/doctor.js
decisions:
  - "CLI entry points use top-level await (ESM, package.json has type:module) — no IIFE needed"
  - "formatLabels/layerLabels removed from analyze.ts — use cases build user text internally"
  - "doctor.ts uses loadConfig() for provider-aware API key check (fixes CONCERNS.md bug)"
  - "auditProfile uses Promise.reject() instead of async throw — no empty await expression"
metrics:
  duration: "37 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  files_created: 3
  files_modified: 8
  files_deleted: 3
requirements:
  - MIGR-01
  - PROV-05
---

# Phase 01 Plan 05: CLI Entry Points Summary

**One-liner:** TypeScript CLI entry points (analyze.ts, caption.ts, doctor.ts) replace scripts/*.js and wire the full stack — CLI invokes use cases via AIProviderFactory, no direct SDK imports, old JS scripts deleted from git.

## What Was Built

Two tasks executed to migrate the three CLI scripts to TypeScript and delete the originals:

1. **Task 1** — Created `src/cli/analyze.ts` and `src/cli/caption.ts`:
   - Both preserve ANSI color constants, minimist arg parsing, input validation with `process.exit(1)`, and result rendering format from the original scripts
   - Both call use cases via `createAIProvider()` + `new AnalyzePost(provider)` / `new GenerateCaption(provider)` — no `@anthropic-ai/sdk` or `@google/genai` imports in the CLI layer
   - Error handling wraps the entire async block in try/catch; errors printed in RED and exit 1

2. **Task 2** — Created `src/cli/doctor.ts` and deleted `scripts/analyze.js`, `scripts/caption.js`, `scripts/doctor.js` via `git rm`:
   - `doctor.ts` adds `config.yaml` to prerequisite checks (missing in original)
   - Fixes the CONCERNS.md API key bug: now checks the correct key per provider (ANTHROPIC_KEY for anthropic, VITE_GEMINI_API_KEY for gemini) by calling `loadConfig()`
   - CLI is now TypeScript-only; scripts directory is empty/removed

## Verification Evidence

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm test` | 24/24 tests pass (5 test files) |
| `src/cli/analyze.ts` contains createAIProvider + new AnalyzePost | CONFIRMED |
| `src/cli/caption.ts` contains createAIProvider + new GenerateCaption | CONFIRMED |
| `src/cli/doctor.ts` contains loadConfig + config.yaml check | CONFIRMED |
| No SDK imports in src/cli/ | CONFIRMED |
| scripts/analyze.js deleted | CONFIRMED |
| scripts/caption.js deleted | CONFIRMED |
| scripts/doctor.js deleted | CONFIRMED |
| package.json scripts reference tsx src/cli/*.ts | CONFIRMED |

## Checkpoint Status

**Task 3 (checkpoint:human-verify)** is pending — human must run:
- `pnpm run analyze -- <image>` and verify structured output
- `pnpm run caption -- <image>` and verify caption output
- `pnpm run doctor` and verify all checks pass
- Provider switching via config.yaml (PROV-05 end-to-end validation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @types/js-yaml caused typecheck failure**
- **Found during:** Task 1 verification
- **Issue:** `pnpm typecheck` failed with `TS7016: Could not find a declaration file for module 'js-yaml'` in `src/infrastructure/config/loadConfig.ts`. The `@types/js-yaml` package was not installed despite `js-yaml` being a production dependency.
- **Fix:** Added `@types/js-yaml@4.0.9` to devDependencies; updated pnpm-lock.yaml in both main repo and worktree.
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** d0493ab

**2. [Rule 3 - Blocking] Pre-existing lint errors in infrastructure layer prevented pnpm lint from passing**
- **Found during:** Task 1 lint verification
- **Issue:** 20 ESLint errors in infrastructure and application files from Plan 01-03 (not introduced by this plan). Errors: `@typescript-eslint/require-await` on `auditProfile` and mock `json()`, `preserve-caught-error` on re-thrown errors without `cause`, `@typescript-eslint/restrict-template-expressions` on `'never'` type, `@typescript-eslint/unbound-method` on `vi.mocked(provider.method)` pattern.
- **Fix applied to each:**
  - `AnthropicProvider.ts` + `GeminiProvider.ts`: `auditProfile` changed from `async` throw to `Promise.reject(new Error(...))` — satisfies `require-await` without empty async
  - `AnthropicProvider.ts` + `GeminiProvider.ts`: Added `{ cause: err }` to re-thrown JSON parse errors (satisfies `preserve-caught-error`)
  - `AIProviderFactory.ts`: Added `String()` cast around `config.ai.provider` in template literal (TypeScript correctly narrows to `never` at that point; `String()` converts safely)
  - `GeminiProvider.test.ts`: Changed `async () => ({...})` to `() => Promise.resolve({...})` for mock `json()` — no empty `await`
  - `AnalyzePost.test.ts` + `GenerateCaption.test.ts`: Changed `vi.mocked(provider.method)` to `vi.mocked(provider).method` — keeps method bound, avoids `unbound-method`
- **Files modified:** All 6 files listed above
- **Commit:** d0493ab

## Known Stubs

None — all three CLI entry points are fully wired. The `auditProfile` capability in the providers throws 'Phase 2' as documented in Plan 01-03's summary, but the CLI doctor command and analyze/caption commands are complete.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | src/cli/doctor.ts | T-05-02 mitigated: API key presence/absence logged but key value never printed |

## Self-Check: PASSED

| Artifact | Status |
|----------|--------|
| src/cli/analyze.ts | FOUND |
| src/cli/caption.ts | FOUND |
| src/cli/doctor.ts | FOUND |
| scripts/analyze.js | DELETED (confirmed) |
| scripts/caption.js | DELETED (confirmed) |
| scripts/doctor.js | DELETED (confirmed) |
| Commit d0493ab (Task 1) | FOUND |
| Commit e6ff21b (Task 2) | FOUND |
| pnpm typecheck exits 0 | CONFIRMED |
| pnpm test 24/24 | CONFIRMED |
