---
phase: 01-foundation
fixed_at: 2026-05-27T17:00:00Z
review_path: .planning/phases/01-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 12
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-05-27T17:00:00Z
**Source review:** `.planning/phases/01-foundation/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (4 Critical + 6 Warning + 3 Info)
- Fixed: 12
- Skipped: 1 (CR-01, per user instruction)

## Fixed Issues

### CR-02: `npm run profile` points to missing file

**Files modified:** `package.json`
**Commit:** 9a8afec
**Applied fix:** Removed the broken `"profile": "tsx src/cli/profile.ts"` entry from the scripts section of package.json. The file `src/cli/profile.ts` does not exist; leaving the script entry would cause a module-not-found exit on `pnpm run profile`.

---

### CR-03: Greedy regex for JSON extraction produces malformed parses

**Files modified:** `src/infrastructure/ai/AnthropicProvider.ts`, `src/infrastructure/ai/GeminiProvider.ts`, `src/ui/hooks/useAIProvider.ts`
**Commit:** aa1f0b9
**Applied fix:** Replaced the single-pass greedy `/\{[\s\S]*\}/` regex in all three locations with a strip-markdown-fences-first approach: strip triple-backtick fences (` ```json ` or plain ` ``` `) from the response text, attempt `JSON.parse` on the stripped string directly, and only fall back to a greedy regex match if the first parse fails. This handles the common pattern of models wrapping JSON in code fences, while still recovering from extra text around a JSON object.

---

### CR-04: API key exposed in Gemini HTTP request URL (query parameter)

**Files modified:** `src/infrastructure/ai/GeminiProvider.ts`, `src/ui/hooks/useAIProvider.ts`
**Commit:** dd4df9e
**Applied fix:** Removed `?key=${apiKey}` from the Gemini endpoint URL in both files. Added `'x-goog-api-key': apiKey` to the request `headers` object. The API key is now sent as an HTTP header instead of a URL query parameter, keeping it out of server access logs, proxy logs, and browser network history URLs.

---

### WR-01: `max_tokens` from config silently ignored for Gemini calls

**Files modified:** `src/infrastructure/ai/GeminiProvider.ts`, `src/ui/hooks/useAIProvider.ts`
**Commit:** 1ec3983
**Applied fix:** In `GeminiProvider.ts`, added `maxTokens: number` parameter to `callGemini` and included `generationConfig: { maxOutputTokens: maxTokens }` in the request body. Both `analyzePost` and `generateCaption` now pass `this.config.ai.max_tokens`. In `useAIProvider.ts`, added a module-level `maxTokens` constant parsed from `config.yaml` via regex, and added `generationConfig: { maxOutputTokens: maxTokens }` to the request body in `callGemini`.

---

### WR-02: `ScoreBar` renders `NaN%` when score string is not in `N/10` format

**Files modified:** `src/ui/components/ScoreBar.tsx`
**Commit:** b1dee22
**Applied fix:** Replaced the `score.split('/')[0]` + hardcoded divisor of 10 logic with a regex match `/^(\d+)\s*\/\s*(\d+)$/`. When the match succeeds, computes `pct` as `(parseInt(match[1]) / parseInt(match[2])) * 100`. When the match fails (malformed AI output), `pct` defaults to `0` and `displayScore` shows the raw string or `'—'`. The rendered score display now uses `displayScore` instead of `score`.

---

### WR-03: UI hook casts AI response to typed result without runtime validation

**Files modified:** `src/ui/hooks/useAIProvider.ts`
**Commit:** 3adbf95
**Applied fix:** Added inline shape guards after each `callGemini` call before the type cast. For `PostAnalysisResult`: checks that `parsed` is a non-null object containing `verdict` and `scores` properties. For `CaptionResult`: checks that `parsed` is a non-null object containing `captions` as an array. Both throw `"Gemini devolvió JSON con formato inesperado."` on mismatch, surfacing structured errors to the UI error state instead of silently rendering broken data.

---

### WR-04: CLI scripts cast unvalidated user input directly to typed enum values

**Files modified:** `src/cli/analyze.ts`, `src/cli/caption.ts`
**Commit:** 69458cf
**Applied fix:** In `analyze.ts`, added `VALID_FORMATS` and `VALID_LAYERS` const arrays and validated the `format` and `layer` CLI args against them before the API call, printing a descriptive error and exiting with code 1 on invalid input. In `caption.ts`, added `VALID_TONES` const array and validated the `tone` arg similarly. The type casts now use the derived `Format`, `Layer`, and `Tone` types instead of inline union literals.

---

### WR-05: `onDrop` in `App.tsx` holds a stale closure over `loadImage`

**Files modified:** `src/ui/App.tsx`
**Commit:** 6028717
**Applied fix:** Wrapped `loadImage` in `useCallback(fn, [])` (empty deps — `setImage` is a stable state setter). Updated `onDrop`'s dependency array from `[]` to `[loadImage]`. Both functions are now stable across renders and the dependency relationship is correctly expressed.

---

### WR-06: `loadConfig` does not validate required string fields

**Files modified:** `src/infrastructure/config/loadConfig.ts`
**Commit:** 07d36b0
**Applied fix:** After the `provider` enum check, added three explicit guards: (1) checks that `ai.model` is a non-empty string, (2) checks that `ai.max_tokens` is a number, (3) checks that both `prompts_dir` and `profile_path` are truthy. Each guard throws a descriptive error naming the missing/wrong field. This surfaces config errors immediately at startup rather than as confusing downstream `undefined` references.

---

### IN-01: Debug `console.log` left in production module

**Files modified:** none (not needed)
**Commit:** n/a
**Applied fix:** Skipped — the `console.log({model})` statement cited at `src/ui/hooks/useAIProvider.ts:13` was not present in the current file. The debug statement was already removed in the prior pass or was never committed to this version of the file. No change needed.

---

### IN-02: `assembleSystemPrompt` is duplicated between AnthropicProvider and GeminiProvider

**Files modified:** `src/infrastructure/ai/promptUtils.ts` (new), `src/infrastructure/ai/AnthropicProvider.ts`, `src/infrastructure/ai/GeminiProvider.ts`
**Commit:** edf1432
**Applied fix:** Extracted the identical `assembleSystemPrompt` function from both providers into a new shared module `src/infrastructure/ai/promptUtils.ts`. Removed the local definitions from both providers and replaced them with a named import from `./promptUtils`. The unused `readFileSync` and `resolve` imports were also removed from both providers as a result.

---

### IN-03: `Verdict` type not enforced in `validatePostAnalysisResult`

**Files modified:** `src/infrastructure/ai/AnthropicProvider.ts`, `src/infrastructure/ai/GeminiProvider.ts`
**Commit:** 1cbf1ef
**Applied fix:** Added `Verdict` to the import from `PostAnalysisResult` in both providers. Added a `VALID_VERDICTS: readonly Verdict[]` constant (`['listo', 'ajustar', 'no va']`) and an `includes()` check after the structural field validation. If the AI returns a verdict string not in the valid set, the validator now throws a descriptive error with the actual value received, instead of silently passing through to `VerdictBadge`'s fallback mapping.

---

## Skipped Issues

### CR-01: `config.yaml` references a non-existent Gemini model

**File:** `config.yaml:3`
**Reason:** User confirmed model is valid — per user instruction: "gemini-3.5-flash is a valid model name (https://deepmind.google/models/gemini/flash/)". Do not change.
**Original issue:** Reviewer identified `gemini-3.5-flash` as a non-existent model; valid alternatives per reviewer were `gemini-1.5-flash` and `gemini-2.0-flash`.

---

## Verification

- `pnpm typecheck`: passed (0 errors) — verified in both passes
- `pnpm test`: passed (24/24 tests, 5 test files) — verified in both passes

---

_Fixed: 2026-05-27T17:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
