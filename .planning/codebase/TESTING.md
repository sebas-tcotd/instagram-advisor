# Testing Patterns

**Analysis Date:** 2026-05-26

## Test Framework

**Runner:** None configured.

No test framework is installed or configured. `package.json` has no test runner dependency (no Jest, Vitest, Mocha, or equivalent). There is no test script in `"scripts"`. No test configuration files exist (`jest.config.*`, `vitest.config.*`).

**Assertion Library:** None.

**Run Commands:**
```bash
# No test commands available
# package.json scripts:
#   dev      → vite
#   build    → vite build
#   doctor   → node scripts/doctor.js
#   analyze  → node scripts/analyze.js
#   caption  → node scripts/caption.js
#   profile  → node scripts/profile.js
```

## Test File Organization

**Location:** No test files exist in the repository.

**Naming:** No naming convention established.

**Structure:** Not applicable.

## Test Structure

No tests exist. No suite organization pattern to document.

## Mocking

**Framework:** None.

No mocking patterns present. External API calls (`fetch` to Gemini, `Anthropic` SDK) are made directly without any test doubles.

## Fixtures and Factories

**Test Data:** None.

No fixture files, factory functions, or seed data present.

## Coverage

**Requirements:** None enforced.

No coverage tooling configured. No coverage thresholds set.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## Manual Verification Tooling

The closest thing to testing infrastructure is `scripts/doctor.js`, which performs a runtime pre-flight check:

```js
// scripts/doctor.js — checks required files exist before running
const checks = [
  { file: 'prompts/strategy.md',          label: 'Estrategia personal' },
  { file: 'prompts/post-advisor.md',       label: 'System prompt: post-advisor' },
  { file: 'prompts/caption-generator.md', label: 'System prompt: caption-generator' },
  { file: 'prompts/profile-auditor.md',   label: 'System prompt: profile-auditor' },
  { file: 'profile.yaml',                 label: 'Perfil (profile.yaml)' },
  { file: '.env',                         label: 'Variables de entorno (.env)' },
  { file: 'src/index.html',               label: 'UI web (src/index.html)' },
]
```

Run via: `npm run doctor` — exits with code `1` if any required file is missing.

## Notable Gaps

- No unit tests for `callAPI` in `src/App.jsx`
- No tests for JSON response parsing logic (the `raw.match(/\{[\s\S]*\}/)` pattern used in both `src/App.jsx` and `scripts/analyze.js` / `scripts/caption.js`)
- No tests for `loadImage` file validation logic in `src/App.jsx`
- No tests for CLI scripts in `scripts/`
- No snapshot tests for UI components (`VerdictBadge`, `ScoreBar`, `Spinner`)
- No mocking of `fetch` or Anthropic SDK for deterministic testing

## Adding Tests (Recommended Approach)

If tests are added, the natural fit for this project is **Vitest** (already using Vite):

```bash
# Install
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom

# Add to package.json scripts
"test": "vitest",
"test:ui": "vitest --ui",
"coverage": "vitest run --coverage"
```

**Config addition to `vite.config.js`:**
```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.js',
}
```

**Test file placement:** Co-locate with source — `src/App.test.jsx`, `scripts/analyze.test.js`.

**Priority candidates for first tests:**
1. JSON parse fallback logic: `raw.match(/\{[\s\S]*\}/)` in `src/App.jsx` (line 206) and `scripts/analyze.js` (line 81)
2. `loadImage` validation (`src/App.jsx` lines 106–130) — pure logic, easy to unit test
3. `callAPI` with mocked `fetch` — verifies request shape sent to Gemini

---

*Testing analysis: 2026-05-26*
