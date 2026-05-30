---
phase: 02-profile-auditor
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - config.yaml
  - package.json
  - src/application/AuditProfile.test.ts
  - src/cli/profile.ts
  - src/domain/entities/AuditResult.ts
  - src/infrastructure/ai/AnthropicProvider.test.ts
  - src/infrastructure/ai/AnthropicProvider.ts
  - src/infrastructure/ai/GeminiProvider.test.ts
  - src/infrastructure/ai/GeminiProvider.ts
  - src/ui/App.tsx
  - src/ui/components/PriorityBadge.tsx
  - src/ui/hooks/useAIProvider.ts
  - src/ui/pages/ProfilePage.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-30
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The profile-auditor phase adds a working end-to-end audit flow: domain entity, use-case, both AI provider implementations, a CLI entry point, and UI hook + page. The Clean Architecture boundaries are respected — `domain/` has no upward imports, and the use-case is correctly thin. The test suite is well-structured and covers the primary happy and error paths.

Three blockers were found: (1) `config.yaml` names a model (`gemini-3.5-flash`) that does not exist in the Gemini API and will cause every CLI and UI invocation to fail at runtime; (2) `loadConfig` silently returns an empty-string API key when the env var is absent, so all providers accept the empty key and fail later with an opaque 401 error rather than a clear startup failure; (3) `AuditResult.wins` is typed as a required `string[]` in the domain entity but the providers and hook all treat it as optional via `Array.isArray` guards — consumers like `profile.ts` rely on `result.wins?.length` (optional-chain), meaning the domain type and every callsite disagree, and a provider returning `wins: null` will set an empty array while the type contract says the field is always populated. There are also five warnings covering significant code duplication, inconsistent validation depth in the UI hook, and a silent failure mode in the CLI's top-level `await`.

---

## Critical Issues

### CR-01: `config.yaml` names a non-existent Gemini model — every invocation fails

**File:** `config.yaml:3`
**Issue:** The configured model is `gemini-3.5-flash`. No such model exists in the Gemini API. The real model families are `gemini-2.0-flash`, `gemini-1.5-flash`, and `gemini-2.5-flash`. Every call routed through `GeminiProvider` and through the browser UI hook will receive a `404 Not Found` from the API. The CLI's `profile` command will always exit with error. The UI's `useAuditProfile` (and `useAnalyzePost`, `useGenerateCaption`) will always fail.
**Fix:**
```yaml
ai:
  provider: gemini
  model: gemini-2.0-flash   # was: gemini-3.5-flash — model does not exist
  max_tokens: 4096
```

---

### CR-02: `loadConfig` silently injects an empty-string API key — providers accept it, fail opaquely at runtime

**File:** `src/infrastructure/config/loadConfig.ts:60-63`
**Issue:** When the required env var is absent, `loadConfig` falls back to `''` rather than throwing:
```ts
const apiKey =
  provider === 'anthropic'
    ? (process.env['ANTHROPIC_API_KEY'] ?? '')
    : (process.env['VITE_GEMINI_API_KEY'] ?? process.env['GEMINI_API_KEY'] ?? '');
```
`AnthropicProvider` passes this empty key directly to the Anthropic SDK constructor (line 104) with no guard. `GeminiProvider` sends the empty key as the `x-goog-api-key` header and gets a 401 back. The failure surfaces as "Gemini API 401: Unauthorized" at the call site — not as a clear "API key missing" startup error. The UI hook (`useAIProvider.ts:34`) does validate the key before calling Gemini, but the CLI path (`profile.ts`) does not, so the CLI fails with a generic API error rather than a helpful message.
**Fix:**
```ts
if (!apiKey) {
  const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY / VITE_GEMINI_API_KEY';
  throw new Error(`Missing required env var: ${envVar}. Set it in your .env file.`);
}
```
Add this after computing `apiKey` in `loadConfig`, before `return`.

---

### CR-03: Domain type and all callsites disagree on whether `AuditResult.wins` is required

**File:** `src/domain/entities/AuditResult.ts:27` / `src/infrastructure/ai/AnthropicProvider.ts:82` / `src/infrastructure/ai/GeminiProvider.ts:224` / `src/ui/hooks/useAIProvider.ts:288` / `src/cli/profile.ts:58`
**Issue:** The domain entity declares `wins: string[]` — required, never undefined. But every downstream site treats it as absent-able:
- `AnthropicProvider.ts:82` and `GeminiProvider.ts:224`: `wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : []` — silently defaults to `[]` if the AI omits the field.
- `useAIProvider.ts:288`: same guard.
- `profile.ts:58`: `if (result.wins?.length)` — optional-chain on a supposedly required field.

This is a contract violation: any code that receives an `AuditResult` and uses `result.wins` without a null check is technically correct per the type, but providers can produce an object where `wins` is the empty array produced by the fallback — not a bug today, but the discrepancy will mislead future contributors. More concretely, if the AI returns `"wins": null`, the current code coerces it to `[]` but the TypeScript type allows callers to skip the guard entirely, making the system fragile.

**Fix:** Align the domain type with actual behavior. Make `wins` optional in the entity since the AI may omit it:
```ts
// src/domain/entities/AuditResult.ts
export interface AuditResult {
  overallScore: number
  status: string
  checklist: ChecklistItem[]
  wins?: string[]   // AI may omit — callers must guard
}
```
Then remove the optional-chain from `profile.ts:58` (already correct) and ensure all render sites guard properly — which they already do.

---

## Warnings

### WR-01: `callGemini` and `callGeminiText` in `GeminiProvider.ts` are ~70-line duplicates — divergence risk

**File:** `src/infrastructure/ai/GeminiProvider.ts:48-187`
**Issue:** `callGemini` (lines 48–118) and `callGeminiText` (lines 120–187) are identical except `callGemini` receives `imageBase64` and `mimeType` and includes an `inlineData` part. All error handling, JSON extraction, and response-parsing logic is copy-pasted. A bug fix in one block will not propagate to the other. The same duplication exists between `GeminiProvider.ts` and `useAIProvider.ts` (the hook reimplements both functions for the browser context).
**Fix:** Unify with a single `callGeminiInternal` that accepts an `options: { image?: { base64: string; mimeType: string } }` parameter and conditionally adds the `inlineData` part:
```ts
async function callGeminiInternal(
  apiKey: string, model: string, systemPrompt: string,
  userText: string, maxTokens: number,
  image?: { base64: string; mimeType: string }
): Promise<unknown> {
  const parts = [
    ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }] : []),
    { text: userText },
  ]
  // ... single implementation of the shared HTTP + parsing logic
}
```

---

### WR-02: `useAuditProfile` hook silently coerces malformed AI response to a zero-score result

**File:** `src/ui/hooks/useAIProvider.ts:279-290`
**Issue:** When `obj['overall']` is absent or unparseable, `overallScore` silently becomes `0`:
```ts
const overallRaw = obj['overall'] as string | undefined
const overallScore = overallRaw ? parseInt(overallRaw.split('/')[0], 10) : 0
const auditResult: AuditResult = {
  overallScore: isNaN(overallScore) ? 0 : overallScore,
  ...
}
setResult(auditResult)
```
This means a malformed AI response (e.g., missing `overall` key) silently shows `0/10` in the UI rather than surfacing an error. The server-side providers (`AnthropicProvider`, `GeminiProvider`) correctly throw on the same condition. The hook is inconsistent and will confuse users who see a "0 score" result that looks real.
**Fix:** Throw instead of defaulting, so the `catch (e)` block renders the error UI:
```ts
if (!overallRaw || isNaN(parseInt(overallRaw.split('/')[0], 10))) {
  throw new Error('Respuesta de Gemini tiene un campo "overall" inválido o ausente.')
}
const overallScore = parseInt(overallRaw.split('/')[0], 10)
```

---

### WR-03: `useAuditProfile` does not validate `checklist` item shapes — invalid priorities silently render

**File:** `src/ui/hooks/useAIProvider.ts:288`
**Issue:** The hook casts `obj['checklist']` directly to `AuditResult['checklist']` without verifying individual item fields:
```ts
checklist: Array.isArray(obj['checklist']) ? (obj['checklist'] as AuditResult['checklist']) : [],
```
If the AI returns an item with `priority: 'critico'` (not a valid `Priority`), `PriorityBadge` receives an unknown priority string. `PriorityBadge` has a fallback (`?? map['mejora']`) that silently displays "mejora" instead of the real value, masking the data quality issue. The server-side providers validate each item and throw — the UI hook skips this entirely.
**Fix:** Add item-level validation matching the server-side guard, or at minimum throw on unknown priority values so the error surface is consistent across CLI and UI.

---

### WR-04: `profile.ts` CLI uses top-level `await` inside a bare `try/catch` — unhandled rejection possible on certain Node.js + TSX versions

**File:** `src/cli/profile.ts:19-68`
**Issue:** The file uses top-level `await` (lines 21–24) to call async use-case methods. This works in ESM with Node.js 14.8+, but the `try/catch` wraps the entire body meaning that if `createAIProvider()` or `loadConfig()` throws synchronously before the first `await`, the error is still caught. However, if the Node.js runtime does not support top-level await in the module graph (e.g., if the module is ever `require()`-ed or if `tsx` transpiles it to CJS), the unhandled `await` will create an unhandled promise rejection that bypasses the `catch` block. The `package.json` does set `"type": "module"` which mitigates this, but there is no `.nvmrc` or engine field to enforce the minimum Node version.
**Fix:** Wrap the entire body in an explicit `async main()` function and call it with a trailing `.catch`:
```ts
async function main() {
  // ... all current body ...
}

main().catch((e) => {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`)
  process.exit(1)
})
```

---

### WR-05: `loadConfig` accepts any string as `model` with no validation — misconfiguration silently propagates

**File:** `src/infrastructure/config/loadConfig.ts:50-52`
**Issue:** The function validates that `ai.model` is a non-empty string but does nothing to check that it is a real model name for the configured provider. The current `config.yaml` has `gemini-3.5-flash` (an invalid model — see CR-01), and `loadConfig` accepts it without complaint. Since the factory and providers pass this value directly to the API, the error appears only at call time as a 404 or SDK error.
**Fix:** While a full enum of valid model names would need maintenance, at minimum document that the value is not validated here and add a note in the error message when an API call fails with 404 pointing users to `config.yaml`. Alternatively, validate against a small static allowlist:
```ts
const KNOWN_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']
const KNOWN_ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-sonnet-4-20250514']
// warn (not throw) if model is unknown — allows pre-release model names
```

---

## Info

### IN-01: `config.yaml` comment cites `PROV-05` — internal ticket reference in committed config

**File:** `config.yaml:2`
**Issue:** `# change to "anthropic" to switch providers (PROV-05)` — `PROV-05` is an internal planning ticket that means nothing to an external reader cloning the repo. The CLAUDE.md describes this project as a public showcase where "any developer can clone the repo and understand the structure in minutes."
**Fix:** Replace the ticket reference with a self-contained explanation:
```yaml
  provider: gemini  # change to "anthropic" to use Claude via AnthropicProvider
```

---

### IN-02: `AuditProfile.test.ts` does not test the `overallScore` field on the returned `AuditResult`

**File:** `src/application/AuditProfile.test.ts:38-48`
**Issue:** The "returns the AuditResult from the provider without modification" test only checks referential equality (`expect(result).toBe(mockResult)`). If `AuditProfile.execute` ever transforms `overallScore` (e.g., a future bug normalizes the value), this test would not catch it. The test is correct for the current use-case implementation but offers no protection against accidental field mutation.
**Fix:** Either keep the `toBe` reference test (acceptable for a pure-passthrough use-case) and add a comment acknowledging it, or add a field-level assertion:
```ts
expect(result.overallScore).toBe(mockResult.overallScore)
expect(result.checklist).toHaveLength(1)
```

---

### IN-03: `ProfilePage.tsx` uses array index as React `key` for checklist items

**File:** `src/ui/pages/ProfilePage.tsx:123` and `:144`
**Issue:** `items.map((item, i) => <div key={i} ...>` and `result.wins.map((win, i) => <div key={i} ...>` use the loop index as key. If the checklist is reordered between renders, React will incorrectly reuse DOM nodes. For a stateless render-from-API result this is low-risk, but it violates the project's "exemplary code" showcase goal.
**Fix:** Use a stable identifier. For checklist items, `item.element` is likely unique within a priority group:
```tsx
{items.map((item: ChecklistItem) => (
  <div key={`${priority}-${item.element}`} style={s.checklistItem}>
```
For wins, the string content itself can serve as key if wins are unique (reasonable assumption):
```tsx
{result.wins.map((win: string) => (
  <div key={win} style={s.winsItem}>
```

---

_Reviewed: 2026-05-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
