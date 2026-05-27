---
phase: 01-foundation
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - config.yaml
  - eslint.config.ts
  - package.json
  - src/application/AnalyzePost.test.ts
  - src/application/AnalyzePost.ts
  - src/application/AuditProfile.ts
  - src/application/GenerateCaption.test.ts
  - src/application/GenerateCaption.ts
  - src/cli/analyze.ts
  - src/cli/caption.ts
  - src/cli/doctor.ts
  - src/domain/entities/AnalyzeRequest.ts
  - src/domain/entities/AuditResult.ts
  - src/domain/entities/CaptionRequest.ts
  - src/domain/entities/CaptionResult.ts
  - src/domain/entities/PostAnalysisResult.ts
  - src/domain/ports/AIProvider.ts
  - src/index.css
  - src/infrastructure/ai/AIProviderFactory.test.ts
  - src/infrastructure/ai/AIProviderFactory.ts
  - src/infrastructure/ai/AnthropicProvider.test.ts
  - src/infrastructure/ai/AnthropicProvider.ts
  - src/infrastructure/ai/GeminiProvider.test.ts
  - src/infrastructure/ai/GeminiProvider.ts
  - src/infrastructure/config/loadConfig.ts
  - src/main.tsx
  - src/ui/App.tsx
  - src/ui/components/ScoreBar.tsx
  - src/ui/components/Spinner.tsx
  - src/ui/components/VerdictBadge.tsx
  - src/ui/hooks/useAIProvider.ts
  - src/ui/pages/AnalyzePage.tsx
  - src/ui/pages/CaptionPage.tsx
  - tsconfig.json
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

This review covers the full Phase 1 foundation: domain entities, application use cases, infrastructure providers (Anthropic + Gemini), config loading, CLI entry points, and the React UI layer. The architecture is well-structured and Clean Architecture boundaries are correctly enforced by ESLint. The core wiring is sound. However, four blockers were found that will produce silent failures or broken behavior in production: a non-existent model name in config.yaml, a broken `npm run profile` script pointing to a missing file, the JSON extraction regex producing malformed parses under normal AI output patterns, and the UI sending the API key as a query parameter in URLs (exposed in browser network logs and server access logs). Several additional warnings and quality items are documented below.

---

## Critical Issues

### CR-01: `config.yaml` references a non-existent Gemini model

**File:** `config.yaml:3`
**Issue:** The configured model is `gemini-3.5-flash`. This model does not exist in the Google Gemini API. The valid flash-tier models are `gemini-1.5-flash` and `gemini-2.0-flash`. Every CLI invocation using the Gemini provider will fail with a 404 from the API. The test fixtures in `GeminiProvider.test.ts:13` correctly use `gemini-2.0-flash`, revealing the mismatch. Because `loadConfig` passes the model string through without validation, the error surfaces only at runtime when an actual API call is made.

**Fix:**
```yaml
ai:
  provider: gemini
  model: gemini-2.0-flash   # was: gemini-3.5-flash (does not exist)
  max_tokens: 1024
```

---

### CR-02: `npm run profile` points to a missing file

**File:** `package.json:17`
**Issue:** The `profile` script is `tsx src/cli/profile.ts`, but `src/cli/profile.ts` does not exist. Running `npm run profile` exits immediately with a module-not-found error. The `doctor.ts` checks for `prompts/profile-auditor.md` (implying this feature is intended), but the CLI entry point was never created.

**Fix:** Either create `src/cli/profile.ts` implementing the `AuditProfile` use case (analogous to `analyze.ts` / `caption.ts`), or remove the `profile` entry from `package.json` scripts until Phase 2 is ready. Leaving a broken script in the published manifest misrepresents the tool's capabilities.

---

### CR-03: Greedy regex for JSON extraction produces malformed parses

**File:** `src/infrastructure/ai/AnthropicProvider.ts:52`, `src/infrastructure/ai/GeminiProvider.ts:105`, `src/ui/hooks/useAIProvider.ts:92`

**Issue:** All three callsites use the regex `/\{[\s\S]*\}/` to extract JSON from the AI response. This regex is **greedy** — it matches from the first `{` to the **last** `}` in the string. When the AI wraps its JSON in explanation text (e.g., `"Here is the analysis:\n{...}\nLet me know if..."`) or when the model produces markdown code fences that contain nested braces, the match spans from the first `{` to the final `}` of the trailing text, producing a string that is not valid JSON. The `JSON.parse` then throws, surfacing a confusing parse error to the user instead of the actual data.

Verified with Node.js:
```
Input: 'Some text { "foo": 1 } and then { "bar": 2 }'
/\{[\s\S]*\}/ matches: '{ "foo": 1 } and then { "bar": 2 }'  ← invalid JSON
```

**Fix:** Use a non-greedy regex to find the first balanced JSON object, or use a lazy quantifier and validate that the result parses, falling back to the full string:
```typescript
// Option A: non-greedy (still fragile for nested objects but better for common patterns)
const jsonMatch = responseText.match(/\{[\s\S]*?\}/)

// Option B: strip markdown code fences first, then try to parse the whole text
const stripped = responseText.replace(/^```(?:json)?\n?|```$/gm, '').trim()
try {
  return JSON.parse(stripped) as unknown
} catch {
  const match = stripped.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : stripped) as unknown
}
```
The same fix must be applied identically in all three locations.

---

### CR-04: API key exposed in Gemini HTTP request URL (query parameter)

**File:** `src/infrastructure/ai/GeminiProvider.ts:60`, `src/ui/hooks/useAIProvider.ts:51`

**Issue:** The Gemini API key is appended as a URL query parameter (`?key=${apiKey}`). Query parameters are:
- Logged in full by every HTTP proxy, load balancer, server access log, and browser network history.
- Included in the `Referer` header when following redirects.
- Visible in browser developer tools network panel (trivially inspectable by any user of the page).

For the UI case (`useAIProvider.ts`) this is especially severe because the key is already inlined in the Vite bundle (a known accepted tradeoff per CLAUDE.md), but the URL exposure adds a second attack surface via browser logs and CORS preflight logs on Google's servers.

**Fix:** Use the `x-goog-api-key` request header instead of the query parameter, which keeps the key out of URLs and server logs:
```typescript
// GeminiProvider.ts and useAIProvider.ts
const url = `${GEMINI_BASE_URL}/${model}:generateContent`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  },
  body: JSON.stringify(body),
})
```

---

## Warnings

### WR-01: `max_tokens` from config is silently ignored for Gemini calls

**File:** `src/infrastructure/ai/GeminiProvider.ts:52-76`, `src/ui/hooks/useAIProvider.ts:36-55`

**Issue:** `AppConfig.ai.max_tokens` is read from `config.yaml` (value: 1024) and stored in config, but it is never passed to the Gemini REST API request body. The Gemini API accepts `generationConfig.maxOutputTokens`. Without this field, Gemini uses its default token limit, which is often much higher than 1024. The `callGemini` function signature accepts no `maxTokens` parameter and the body object has no `generationConfig`. The `AnthropicProvider` correctly passes `max_tokens` to the Anthropic SDK, so this is an asymmetry. Configuration the user edits in `config.yaml` has no observable effect for the Gemini provider.

**Fix:**
```typescript
const body = {
  systemInstruction: { parts: [{ text: systemPrompt }] },
  generationConfig: { maxOutputTokens: maxTokens },  // add this
  contents: [{ ... }],
}
```
Update `callGemini` to accept a `maxTokens: number` parameter and pass it through from the config.

---

### WR-02: `ScoreBar` renders `NaN%` when score string is not in `N/10` format

**File:** `src/ui/components/ScoreBar.tsx:4-5`

**Issue:** `ScoreBar` splits `score` on `/` and calls `parseInt` on the first segment. If the AI returns a score in any other format (e.g., `"8"`, `"good"`, `"8 out of 10"`, or an empty string), `parseInt` returns `NaN`. The progress bar then has `width: "NaN%"` (an invalid CSS value), the bar renders as invisible with no indication to the user that something went wrong.

The domain type `Scores` declares `visual`, `caption`, and `fit` as `string` with no enforced format. The validator in both providers checks only that these fields exist as strings — it does not verify the `N/10` format. So malformed AI output passes validation and reaches `ScoreBar` undetected.

**Fix:**
```typescript
export function ScoreBar({ label, score }: Props) {
  const match = score.match(/^(\d+)\s*\/\s*(\d+)$/)
  const pct = match ? (parseInt(match[1]) / parseInt(match[2])) * 100 : 0
  const displayScore = match ? score : score || '—'
  // rest unchanged
}
```

---

### WR-03: UI hook casts AI response to typed result without runtime validation

**File:** `src/ui/hooks/useAIProvider.ts:125`, `src/ui/hooks/useAIProvider.ts:151`

**Issue:** After parsing the Gemini response JSON, the hook casts directly to the domain type with no field validation:
```typescript
setResult(parsed as PostAnalysisResult)   // line 125
setResult(parsed as CaptionResult)         // line 151
```
The infrastructure providers (`GeminiProvider`, `AnthropicProvider`) have `validatePostAnalysisResult` and `validateCaptionResult` functions, but the UI hook bypasses them entirely — it calls `callGemini` (a local function) directly rather than going through an `AIProvider` implementation. If the AI returns a partial or malformed object, the UI will silently render `undefined` fields, leading to broken renders (e.g., `result.scores.visual` crashes when `scores` is undefined).

**Fix:** Add the same validation logic used in `GeminiProvider.ts` to the UI hook's `callGemini`, or extract the validators to a shared utility in `src/domain/` and import them from both sites.

---

### WR-04: CLI scripts cast unvalidated user input directly to typed enum values

**File:** `src/cli/analyze.ts:58-59`, `src/cli/caption.ts:55`

**Issue:** User-supplied `--format`, `--layer`, and `--tone` arguments from the command line are cast to the typed union via `as`:
```typescript
format: format as 'post_individual' | 'carrusel' | 'historia' | 'reel',
layer: layer as 'externa' | 'interna' | 'engineer',
tone: tone as 'narrativo' | 'introspectivo' | 'sensorial' | 'proceso' | 'tensión',
```
A user passing `--format invalid` or `--layer foo` will send an invalid value to the AI provider without any error message. The TypeScript cast provides no runtime protection. The correct behavior is to validate early and exit with a helpful error listing valid options, consistent with how the CLI already handles missing photos and unsupported file extensions.

**Fix:**
```typescript
const VALID_FORMATS = ['post_individual', 'carrusel', 'historia', 'reel'] as const
type Format = typeof VALID_FORMATS[number]

if (!VALID_FORMATS.includes(format as Format)) {
  console.error(`\n${RED}Formato no válido: "${format}". Opciones: ${VALID_FORMATS.join(', ')}${RESET}\n`)
  process.exit(1)
}
```

---

### WR-05: `onDrop` in `App.tsx` holds a stale closure over `loadImage`

**File:** `src/ui/App.tsx:63-66`

**Issue:** `onDrop` is memoized with `useCallback(fn, [])` (empty deps), but it calls `loadImage`, which is a non-memoized inline function recreated on every render. The `useCallback` captures the first render's `loadImage` instance forever. While `loadImage` itself only uses the stable `setImage` state setter (so in practice it works correctly today), the pattern is incorrect: any future change to `loadImage` that captures other state or props would silently break drag-and-drop behavior. React's exhaustive-deps rule would flag this if `eslint-plugin-react-hooks` were configured.

**Fix:**
```typescript
const loadImage = useCallback((file: File | null | undefined) => {
  if (!file) return
  // ... rest of body unchanged
}, [])  // setImage is stable; no deps needed

const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault(); setDragging(false)
  loadImage(e.dataTransfer.files[0])
}, [loadImage])
```

---

### WR-06: `loadConfig` does not validate that required string fields are actually strings

**File:** `src/infrastructure/config/loadConfig.ts:43-64`

**Issue:** After parsing YAML, the function validates only `ai.provider` against its enum values. The `model`, `prompts_dir`, `profile_path`, and `max_tokens` fields are passed through from the cast `RawConfig` without checking that they exist and are the correct type. If `config.yaml` is malformed (e.g., `model:` is missing or has an incorrect type), subsequent code that uses `config.ai.model` or `config.prompts_dir` will receive `undefined` at runtime, causing confusing downstream errors rather than a clear config error.

**Fix:** Add explicit presence checks after the provider validation:
```typescript
if (!parsed?.ai?.model || typeof parsed.ai.model !== 'string') {
  throw new Error('config.yaml: ai.model must be a non-empty string')
}
if (typeof parsed.ai.max_tokens !== 'number') {
  throw new Error('config.yaml: ai.max_tokens must be a number')
}
if (!parsed.prompts_dir || !parsed.profile_path) {
  throw new Error('config.yaml: prompts_dir and profile_path are required')
}
```

---

## Info

### IN-01: Debug `console.log` left in production module

**File:** `src/ui/hooks/useAIProvider.ts:13`

**Issue:** A debug statement is present at module scope and will execute on every page load in production:
```typescript
console.log({model})
```
This leaks the model name (and indirectly the `config.yaml` contents parsed at build time) to the browser console.

**Fix:** Remove the `console.log` statement entirely. The model name is not information the end user needs in the console.

---

### IN-02: `assembleSystemPrompt` is duplicated verbatim between `AnthropicProvider` and `GeminiProvider`

**File:** `src/infrastructure/ai/AnthropicProvider.ts:12-18`, `src/infrastructure/ai/GeminiProvider.ts:13-19`

**Issue:** The `assembleSystemPrompt` function (reading `promptFile`, `strategy.md`, and `profile.yaml`, concatenating them in a fixed template) is identical in both providers. Any future change to the prompt assembly format must be made in two places. This violates the project's own showcase goal of exemplary code.

**Fix:** Extract the function to `src/infrastructure/ai/promptUtils.ts` and import it in both providers.

---

### IN-03: `Verdict` type not enforced in `validatePostAnalysisResult`

**File:** `src/infrastructure/ai/AnthropicProvider.ts:20-35`, `src/infrastructure/ai/GeminiProvider.ts:21-36`

**Issue:** The validators check that `verdict` is `typeof 'string'` but do not verify it is one of the three valid `Verdict` union values (`'listo'`, `'ajustar'`, `'no va'`). If the AI returns `"verdict": "good"` or `"verdict": "no"`, validation passes and the value flows to `VerdictBadge`, which handles it via `map[verdict] ?? map['ajustar']` (falls back to `ajustar`). This silently masks incorrect AI behavior and makes debugging harder.

**Fix:**
```typescript
const VALID_VERDICTS: Verdict[] = ['listo', 'ajustar', 'no va']
if (!VALID_VERDICTS.includes(obj['verdict'] as Verdict)) {
  throw new Error(`Invalid verdict value: "${String(obj['verdict'])}"`)
}
```

---

_Reviewed: 2026-05-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
