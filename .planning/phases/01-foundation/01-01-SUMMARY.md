---
phase: 01-foundation
plan: 01
subsystem: toolchain
tags: [typescript, eslint, vitest, vite, config]
dependency_graph:
  requires: []
  provides: [pnpm-typecheck, pnpm-lint, pnpm-test, config-yaml, vite-ts-config]
  affects: [all-subsequent-plans]
tech_stack:
  added:
    - typescript@6.0.3
    - tsx@4.22.3
    - "@types/node@25.9.1"
    - eslint@10.4.0
    - "@eslint/js@10.0.1"
    - typescript-eslint@8.60.0
    - eslint-plugin-boundaries@6.0.2
    - jiti@2.7.0
    - vitest@4.1.7
    - "@vitest/coverage-v8@4.1.7"
  patterns:
    - Single root tsconfig.json with moduleResolution:bundler (D-02)
    - ESLint flat config with eslint-plugin-boundaries for Clean Architecture enforcement (D-03)
    - Vitest with passWithNoTests:true for pre-test-file-green baseline
    - config.yaml with PROV-01 required fields as runtime provider selector
key_files:
  created:
    - tsconfig.json
    - vitest.config.ts
    - eslint.config.ts
    - vite.config.ts
    - config.yaml
  modified:
    - package.json
decisions:
  - "Used passWithNoTests:true in vitest.config.ts so pnpm test exits 0 before any test files exist"
  - "Added jiti as devDependency — ESLint 10 requires jiti to load TypeScript config files (eslint.config.ts)"
  - "Extended eslint.config.ts ignores to include .agent/, .claude/, .gemini/, .opencode/, scripts/, prompts/ to prevent parser errors on non-project files"
  - "dist/ was already excluded from git tracking and .gitignore already contained the entry; no git rm --cached step needed"
metrics:
  duration: "3 minutes"
  completed: "2026-05-27"
  tasks_completed: 3
  files_created: 5
  files_modified: 1
---

# Phase 01 Plan 01: Toolchain Bootstrap Summary

**One-liner:** TypeScript 6 + ESLint flat config with eslint-plugin-boundaries + Vitest runner bootstrapped as the foundation toolchain for Clean Architecture enforcement.

## What Was Built

Three tasks executed to create the toolchain scaffold that all subsequent plans depend on:

1. **Task 1** — Installed 9 devDependencies (typescript, tsx, @types/node, eslint, @eslint/js, typescript-eslint, eslint-plugin-boundaries, vitest, @vitest/coverage-v8); created `tsconfig.json` with strict mode and bundler module resolution; created `vitest.config.ts` with node environment; updated `package.json` scripts (typecheck, lint, test, test:watch, coverage, and updated CLI commands to use tsx).

2. **Task 2** — Created `eslint.config.ts` with five-layer boundary enforcement (domain/application/infrastructure/ui/cli); renamed `vite.config.js` to `vite.config.ts` with `@prompts` alias for reliable prompt file imports outside the Vite root.

3. **Task 3** — Created `config.yaml` at repo root with all five PROV-01 required fields (ai.provider, ai.model, ai.max_tokens, prompts_dir, profile_path).

## Verification Evidence

All success criteria met:

| Check | Result |
|-------|--------|
| `pnpm typecheck` | exits 0 |
| `pnpm lint --max-warnings=0` | exits 0 |
| `pnpm test` | exits 0 (no tests, passWithNoTests:true) |
| `config.yaml` parses with js-yaml | all 5 PROV-01 fields present |
| `dist/` git tracking | not tracked (was already clean) |
| `vite.config.js` deleted | confirmed |
| `vite.config.ts` with @prompts alias | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint 10 requires jiti for TypeScript config files**
- **Found during:** Task 2 verification
- **Issue:** `pnpm lint` failed with "The 'jiti' library is required for loading TypeScript configuration files" — ESLint 10 uses jiti internally to transpile `eslint.config.ts` but does not bundle it
- **Fix:** Added `jiti@2.7.0` to devDependencies via `pnpm add -D jiti`
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** included in 90dd177

**2. [Rule 3 - Blocking] ESLint scanned non-project directories causing parser errors**
- **Found during:** Task 2 verification (after jiti fix)
- **Issue:** ESLint scanned `.agent/`, `.claude/`, `.gemini/`, `.opencode/`, `scripts/`, `prompts/` and failed with `"parserOptions.project" has been provided but file not found in tsconfig` for CJS files outside the TypeScript project
- **Fix:** Extended `ignores` array in `eslint.config.ts` to include all non-project directories
- **Files modified:** `eslint.config.ts`
- **Commit:** included in 90dd177

**3. [Rule 1 - Bug] vitest exits code 1 on empty test suite**
- **Found during:** Task 3 overall verification (pnpm test)
- **Issue:** vitest@4.1.7 exits with code 1 when no test files are found; plan requires `pnpm test` exits 0
- **Fix:** Added `passWithNoTests: true` to vitest.config.ts test configuration
- **Files modified:** `vitest.config.ts`
- **Commit:** 0ed0e88

**4. [Plan observation] dist/ was already not tracked by git**
- **Found during:** Task 1 pre-check
- **Issue:** Plan specified running `git rm -r --cached dist/`; however git ls-files showed dist/ was already not tracked
- **Fix:** Skipped the git rm step; .gitignore already contained `dist/` on its own line
- **Impact:** No action needed; condition already satisfied

## Known Stubs

None — this plan creates only configuration files, not application code.

## Threat Flags

None — this plan introduces no network endpoints, auth paths, file access patterns beyond config reading, or schema changes at trust boundaries.

## Self-Check: PASSED

| Artifact | Status |
|----------|--------|
| tsconfig.json | FOUND |
| vitest.config.ts | FOUND |
| eslint.config.ts | FOUND |
| vite.config.ts | FOUND |
| config.yaml | FOUND |
| package.json (updated) | FOUND |
| Commit c66e8a6 | FOUND |
| Commit 90dd177 | FOUND |
| Commit 8042856 | FOUND |
| Commit 0ed0e88 | FOUND |
