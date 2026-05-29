# Phase 2: Profile Auditor — Research

**Researched:** 2026-05-29
**Domain:** TypeScript CLI + React UI — profile audit agent completion
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Update `AuditResult` entity to match `profile-auditor.md` prompt schema: `{ overallScore: number, status: string, checklist: ChecklistItem[] }`. Define `ChecklistItem` as `{ priority: 'urgente' | 'importante' | 'mejora', element: string, issue: string, action: string }`.
- **D-02:** Providers parse the `"X/10"` string from the AI response into a number for `overallScore` (e.g., `parseInt("7/10".split('/')[0], 10)`). Validation in the infrastructure layer.
- **D-03:** Keep the `status` field in `AuditResult` (1-2 line summary).
- **D-04:** `npm run profile` takes zero arguments — reads `profile.yaml` from the fixed repo root path.
- **D-05:** CLI output uses ANSI color style matching `analyze.ts`/`caption.ts`: overall score and status at top, checklist items grouped by priority (urgente=RED, importante=YELLOW, mejora=DIM).
- **D-06:** `ProfilePage.tsx` loads `profile.yaml` at build time via Vite `?raw` import: `import profileYaml from '../../profile.yaml?raw'` (resolves via `@root` alias).
- **D-07:** Left panel shows read-only summary of key `profile.yaml` fields (handle, name, bio excerpt, niche) + "Audit my profile" button. Two-panel layout consistent with Analyze and Caption tabs.
- **D-08:** Audit result rendered as priority-grouped sections: three visible groups (Urgente / Importante / Mejora), each listing checklist items.
- **D-09:** Reuse existing `ScoreBar` component — pass `overallScore * 10` as the value.
- **D-10:** Display `status` field as short intro paragraph above checklist sections.
- **D-11:** Both providers assemble the full system prompt via `assembleSystemPrompt('profile-auditor.md', config)`.
- **D-12:** Both providers send a **text-only** API request — `profileYaml` string is the user message, no base64 image.
- **D-13:** `AuditProfile.execute(profileYaml: string)` signature stays unchanged.

### Claude's Discretion

- `ChecklistItem` type co-located with `AuditResult` in `src/domain/entities/AuditResult.ts` (exported as named type), not a separate file.
- `PriorityBadge` component created following the same pattern as `VerdictBadge.tsx`.

### Deferred Ideas (OUT OF SCOPE)

- **Direct Instagram profile analysis** — via screenshot or scraped profile data. Deferred to future v2 phase.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | `npm run profile` reads `profile.yaml` and calls the profile-auditor agent | `src/cli/profile.ts` follows `analyze.ts` pattern: zero-arg, loads config, instantiates provider, calls `AuditProfile.execute()`, prints ANSI output |
| PROF-02 | Web UI has a Profile tab that executes `AuditProfile` use case and shows results | Add `'profile'` to `Tab` union in `App.tsx`; add `ProfilePage.tsx` following `AnalyzePage.tsx` structure; add `useAuditProfile` hook in `useAIProvider.ts` |
| PROF-03 | Audit result shows overall score, strengths, improvement areas, concrete recommendations | `AuditResult` entity updated to `{ overallScore, status, checklist: ChecklistItem[], wins: string[] }` — `overallScore` satisfies "overall score", `wins[]` satisfies "strengths", checklist urgente/importante satisfies "improvement areas", `action` field satisfies "concrete recommendations" |

</phase_requirements>

---

## Summary

Phase 2 is a pure **completion phase** — Phase 1 already scaffolded the entire Clean Architecture skeleton (use case, port, entity placeholder, provider stubs). This phase fills in exactly four implementation gaps: the `AuditResult` entity schema, both provider `auditProfile()` method bodies, the CLI entry point `src/cli/profile.ts`, and the UI `ProfilePage.tsx` + hook.

The AI response schema from `prompts/profile-auditor.md` returns `{ overall: "X/10", status, checklist: [...], wins: [...] }`. The domain entity must be updated from the Phase 1 placeholder (`strengths[]`, `improvements[]`, `recommendations[]`) to match: `{ overallScore: number, status: string, checklist: ChecklistItem[], wins: string[] }`. Note the prompt schema also includes a `wins` array (things already working) — this satisfies PROF-03's "strengths" requirement and must be included in the entity despite not being called out in D-01 of the context. This is the single most important schema observation.

The text-only API call path is simpler than image calls: `GeminiProvider` already has a `callGemini()` helper that accepts optional image parameters — but since profile audit is text-only, a new `callGeminiText()` variant (or overloading the existing helper) is needed. Similarly, `AnthropicProvider` calls `messages.create()` with content array holding only a `{ type: 'text' }` block instead of `[image, text]`. The hook in `useAIProvider.ts` needs a new `useAuditProfile()` function that calls a text-only Gemini REST path.

**Primary recommendation:** Update `AuditResult.ts` first (it is the shared type consumed by all other work), then implement provider methods, then CLI, then UI — each step has no forward-dependency surprises because the architecture was fully scaffolded in Phase 1.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile data loading (CLI) | CLI script | Infrastructure (fs) | CLI reads `profile.yaml` from disk at runtime; `promptUtils.ts` already does this via `assembleSystemPrompt` |
| Profile data loading (UI) | Frontend build-time (Vite) | — | `?raw` import bakes YAML string into bundle at build time; no runtime fetch needed |
| Prompt assembly | Infrastructure (providers) | — | `assembleSystemPrompt()` in `promptUtils.ts` owns this for both providers |
| Text-only API call | Infrastructure (providers) | — | GeminiProvider needs a text-only fetch variant; AnthropicProvider passes `[{ type: 'text', text }]` content |
| JSON validation | Infrastructure (providers) | — | Follows existing `validatePostAnalysisResult`/`validateCaptionResult` pattern — each provider validates before returning domain type |
| Schema parsing (`"X/10"` → number) | Infrastructure (providers) | — | D-02: both providers parse `overall` string into `overallScore` number before constructing `AuditResult` |
| ANSI output formatting | CLI layer | — | `src/cli/profile.ts` handles all terminal output, not the domain layer |
| UI rendering + state | Frontend (React) | — | `ProfilePage.tsx` + `useAuditProfile` hook in `useAIProvider.ts` |
| `AuditProfile` orchestration | Application layer | — | `AuditProfile.execute()` is already complete and stays unchanged |

---

## Standard Stack

No new packages are needed for this phase. All required libraries are already installed.

### Confirmed Existing Dependencies

| Library | Version (installed) | Purpose in Phase 2 |
|---------|--------------------|--------------------|
| `@anthropic-ai/sdk` | ^0.39.0 | `AnthropicProvider.auditProfile()` — SDK already in use |
| `react` | ^18.3.1 | `ProfilePage.tsx` component |
| `tsx` | 4.22.3 | Runs `src/cli/profile.ts` (same as analyze.ts and caption.ts) |
| `vitest` | 4.1.7 | Tests for `AuditProfile` use case, provider methods |

[VERIFIED: codebase grep of package.json]

### No New Packages Required

This phase adds zero new dependencies. All infrastructure (SDK, React, tsx, Vite `?raw` imports, `assembleSystemPrompt`) was established in Phase 1.

**Installation:** None.

---

## Package Legitimacy Audit

No packages are being installed in this phase. This section is intentionally omitted.

---

## Architecture Patterns

### System Architecture Diagram

```
profile.yaml (static file)
       |
       |-- [Vite ?raw import, build time] --> bundle
       |                                         |
       |                                    ProfilePage.tsx
       |                                    (useAuditProfile hook)
       |                                         |
       |-- [fs.readFileSync, runtime] -------> profile.ts CLI
                                                 |
                                         AuditProfile.execute(profileYaml)
                                                 |
                                         AIProvider.auditProfile(profileYaml)
                                                 |
                              ┌──────────────────┴──────────────────┐
                     GeminiProvider                         AnthropicProvider
                  callGeminiText() [text-only fetch]    messages.create() [text content]
                              |                                       |
                         Gemini REST API                     Anthropic SDK
                              |                                       |
                         JSON response: { overall, status, checklist, wins }
                              |
                   validateAuditResult() + parse "X/10" → overallScore
                              |
                        AuditResult domain object returned
                              |
               ┌─────────────┴──────────────┐
         CLI: ANSI output              UI: ProfilePage renders
         (score, status,               ScoreBar, status text,
          grouped checklist)           PriorityBadge groups
```

### Recommended Project Structure (additions only)

```
src/
├── domain/entities/
│   └── AuditResult.ts           # UPDATE: new schema + ChecklistItem type
├── application/
│   └── AuditProfile.test.ts     # ADD: tests for AuditProfile use case
├── infrastructure/ai/
│   ├── GeminiProvider.ts        # UPDATE: implement auditProfile()
│   ├── GeminiProvider.test.ts   # UPDATE: replace "Phase 2" stub test with real tests
│   ├── AnthropicProvider.ts     # UPDATE: implement auditProfile()
│   └── AnthropicProvider.test.ts # UPDATE: replace "Phase 2" stub test with real tests
├── cli/
│   └── profile.ts               # ADD: new CLI entry point
└── ui/
    ├── pages/
    │   └── ProfilePage.tsx       # ADD: new page component
    ├── components/
    │   └── PriorityBadge.tsx     # ADD: new badge component
    ├── hooks/
    │   └── useAIProvider.ts      # UPDATE: add useAuditProfile hook
    └── App.tsx                   # UPDATE: add 'profile' tab
package.json                      # UPDATE: add "profile" script
```

### Pattern 1: Text-Only Provider Call

**What:** Profile audit sends `profileYaml` as a plain text user message — no image attachment. Both providers already support text-only internally; this is a simplified variant of the existing image call.

**Gemini approach:** The existing `callGemini()` in `GeminiProvider.ts` is tightly coupled to an image inlineData part. The cleanest option is to add a `callGeminiText()` function in the same file that omits the image part from `contents[].parts`:

```typescript
// [CITED: prompts/profile-auditor.md + existing GeminiProvider.ts pattern]
async function callGeminiText(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  maxTokens: number,
): Promise<unknown> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens },
    contents: [{
      role: 'user',
      parts: [{ text: userText }],   // no inlineData
    }],
  }
  // ...same fetch/error/JSON-parse logic as callGemini()
}
```

**Anthropic approach:** Replace the `[image, text]` content array with just `[{ type: 'text', text: userText }]`:

```typescript
// [CITED: existing AnthropicProvider.ts analyzePost() pattern]
const response = await this.client.messages.create({
  model: this.config.ai.model,
  max_tokens: this.config.ai.max_tokens,
  system: systemPrompt,
  messages: [{
    role: 'user',
    content: [{ type: 'text', text: profileYaml }],
  }],
})
```

### Pattern 2: AuditResult Validation Function

**What:** Following the same validate-then-return pattern as `validatePostAnalysisResult` and `validateCaptionResult`.

```typescript
// [CITED: existing GeminiProvider.ts + CONTEXT.md D-01, D-02]
const VALID_PRIORITIES = ['urgente', 'importante', 'mejora'] as const
type Priority = typeof VALID_PRIORITIES[number]

function validateAuditResult(parsed: unknown): AuditResult {
  const obj = parsed as Record<string, unknown>
  if (
    !obj ||
    typeof obj['overall'] !== 'string' ||
    typeof obj['status'] !== 'string' ||
    !Array.isArray(obj['checklist'])
  ) {
    throw new Error('Provider response missing required AuditResult fields')
  }
  for (const item of obj['checklist'] as unknown[]) {
    const c = item as Record<string, unknown>
    if (
      typeof c['element'] !== 'string' ||
      typeof c['issue'] !== 'string' ||
      typeof c['action'] !== 'string' ||
      !VALID_PRIORITIES.includes(c['priority'] as Priority)
    ) {
      throw new Error('AuditResult checklist item missing required fields')
    }
  }
  const overallScore = parseInt((obj['overall'] as string).split('/')[0], 10)
  if (isNaN(overallScore)) {
    throw new Error(`Cannot parse overallScore from: "${String(obj['overall'])}"`)
  }
  return {
    overallScore,
    status: obj['status'] as string,
    checklist: obj['checklist'] as ChecklistItem[],
    wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : [],
  }
}
```

### Pattern 3: Profile Tab in App.tsx

**What:** Add `'profile'` to the `Tab` union type and add a tab button + conditional render. The Profile tab does NOT require the shared image state — it uses `profileYaml` loaded via `?raw` import.

```typescript
// [CITED: existing App.tsx Tab union + tab render pattern]
type Tab = 'analyze' | 'caption' | 'profile'

// In tab array:
[['analyze', 'analizar post'], ['caption', 'generar caption'], ['profile', 'perfil']] as [Tab, string][]

// In right panel:
{tab === 'profile' && <ProfilePage />}
```

Note: `ProfilePage` receives no `image` prop — it is self-contained.

### Pattern 4: useAuditProfile Hook

**What:** Follows the same hook shape as `useAnalyzePost` and `useGenerateCaption`, but calls a text-only Gemini function.

```typescript
// [CITED: existing useAIProvider.ts useGenerateCaption pattern]
import profileAuditorPrompt from '@prompts/profile-auditor.md?raw'
import profileRaw from '@root/profile.yaml?raw'  // already imported in file

export function useAuditProfile() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const parsed = await callGeminiText(
        buildSystemPrompt(profileAuditorPrompt),
        profileRaw,
      )
      // validate and set result
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}
```

Note: `callGeminiText` in the hook does not need an `imageBase64`/`mimeType` parameter — it is a new local function signature or an adaptation of the existing `callGemini` hook function.

### Pattern 5: PriorityBadge Component

**What:** Directly mirrors `VerdictBadge.tsx` with priority-specific colors.

```typescript
// [CITED: existing VerdictBadge.tsx pattern + CONTEXT.md discretion note]
type Priority = 'urgente' | 'importante' | 'mejora'
interface Props { priority: Priority }

export function PriorityBadge({ priority }: Props) {
  const map: Record<Priority, { label: string; color: string; bg: string }> = {
    'urgente':    { label: 'urgente',    color: 'var(--red)',    bg: 'var(--red-bg)' },
    'importante': { label: 'importante', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    'mejora':     { label: 'mejora',     color: 'var(--text-3)', bg: 'var(--bg-2)' },
  }
  const v = map[priority]
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}
```

### Pattern 6: CLI profile.ts

**What:** Zero-arg CLI, reads config, calls use case, prints grouped output.

```typescript
// [CITED: existing analyze.ts CLI pattern]
#!/usr/bin/env node
import 'dotenv/config'
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory'
import { AuditProfile } from '../application/AuditProfile'

const BOLD = '\x1b[1m'; const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'; const RESET = '\x1b[0m'

console.log(`\n${BOLD}profile-auditor${RESET} ${DIM}@sebas_tcotd${RESET}`)
console.log(`${DIM}Auditando perfil...${RESET}\n`)

try {
  const provider = createAIProvider()
  const useCase = new AuditProfile(provider)
  // profile.yaml path is resolved inside assembleSystemPrompt via config.profile_path
  // but the CLI also needs to pass the YAML content as the user message.
  // Load it from config.profile_path (matches what assembleSystemPrompt already reads).
  const { readFileSync } = await import('fs')
  const { resolve } = await import('path')
  const { loadConfig } = await import('../infrastructure/config/loadConfig')
  const config = loadConfig()
  const profileYaml = readFileSync(resolve(process.cwd(), config.profile_path), 'utf8')

  const result = await useCase.execute(profileYaml)

  const scoreColor = result.overallScore >= 7 ? GREEN : result.overallScore >= 4 ? YELLOW : RED
  console.log(`${scoreColor}${BOLD}Puntuación general: ${result.overallScore}/10${RESET}`)
  console.log(`${DIM}${result.status}${RESET}\n`)

  // Group checklist by priority and print
  const urgentes = result.checklist.filter(i => i.priority === 'urgente')
  const importantes = result.checklist.filter(i => i.priority === 'importante')
  const mejoras = result.checklist.filter(i => i.priority === 'mejora')

  if (urgentes.length) {
    console.log(`${RED}${BOLD}— URGENTE —${RESET}`)
    urgentes.forEach(i => console.log(`  ${RED}${i.element}${RESET}: ${i.issue}\n  ${DIM}→ ${i.action}${RESET}\n`))
  }
  // ...same for importantes (YELLOW) and mejoras (DIM)

  if (result.wins?.length) {
    console.log(`${GREEN}${BOLD}Bien hecho:${RESET}`)
    result.wins.forEach(w => console.log(`  ${GREEN}✓${RESET} ${w}`))
  }
} catch (e) {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`)
  process.exit(1)
}
```

### Anti-Patterns to Avoid

- **Defining a new Gemini helper that duplicates error/JSON-parse logic:** The JSON extraction pattern (strip code fences, try `JSON.parse`, fallback regex `\{[\s\S]*\}`) is already tested. Copy the exact same logic into `callGeminiText()`, do not rewrite it.
- **Adding a `wins` field to `ChecklistItem`:** `wins` is a top-level array of strings in the prompt response, separate from `checklist`. Keep them at the entity root level.
- **Forgetting the `wins` field in `AuditResult`:** The prompt schema explicitly includes `wins: ["..."]`. PROF-03 requires "at least one strength" — `wins` is the strengths field. D-01 in CONTEXT.md was written before examining the prompt closely; the actual entity must include `wins: string[]`.
- **Importing in `domain/` from `infrastructure/`:** `AuditResult.ts` is a domain entity — it must contain only pure TypeScript types, no SDK or fs imports.
- **Using `import()` dynamically in CLI scripts:** The existing `analyze.ts` uses top-level `import` statements. Use static imports consistently.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON extraction from AI response | Custom regex parser | Existing `extractJSON()`/`callGemini()` pattern already in providers | Already handles code-fence stripping and `\{[\s\S]*\}` fallback — tested |
| Prompt assembly | Custom string concat | `assembleSystemPrompt('profile-auditor.md', config)` | Already handles `strategy.md` + `profile.yaml` injection — single source of truth |
| Vite YAML loading | `fetch()`/`fs.readFileSync` in UI | `import profileYaml from '@root/profile.yaml?raw'` | Phase 1 already established the `@root` alias; `?raw` is Vite-native |
| Score bar rendering | Custom progress bar | `<ScoreBar label="overall" score={`${result.overallScore}/10`} />` | `ScoreBar` already parses `"X/10"` strings — pass score as `"${n}/10"` not `n * 10` |

**Key insight:** `ScoreBar` accepts a `score: string` prop and parses `"X/10"` internally (see `ScoreBar.tsx` line 4: `score.match(/^(\d+)\s*\/\s*(\d+)$/)`). D-09 says "pass `overallScore * 10` as the value" — this is incorrect if `ScoreBar` expects a `"X/10"` string. The correct call is `<ScoreBar label="overall" score={`${result.overallScore}/10`} />` which gives the component `"7/10"` to parse, producing a 70% fill. Passing `70` (a number) as a string would produce `"70"` which the regex will not match and the bar would show 0%. **Planner must use the string form.**

---

## Common Pitfalls

### Pitfall 1: AuditResult `wins` field omitted

**What goes wrong:** The domain entity is defined without `wins: string[]` and the UI cannot render the "already working" section. PROF-03 ("at least one strength") fails.
**Why it happens:** D-01 in CONTEXT.md lists the entity shape as `{ overallScore, status, checklist }` — but `profile-auditor.md` prompt schema also outputs a top-level `wins` array. The context decision was written as a summary, not as a complete schema.
**How to avoid:** Read `prompts/profile-auditor.md` response schema before finalizing the entity. Add `wins: string[]` to `AuditResult`.
**Warning signs:** Validation passes but UI has no strengths section; PROF-03 acceptance fails.

### Pitfall 2: ScoreBar receives a number instead of "X/10" string

**What goes wrong:** `ScoreBar` displays an empty bar (0%) because its internal regex `score.match(/^(\d+)\s*\/\s*(\d+)$/)` does not match a plain number string.
**Why it happens:** D-09 says "pass `overallScore * 10` as the value" — this was written assuming a percent-based API that doesn't exist. `ScoreBar` takes a `score: string` like `"7/10"`.
**How to avoid:** Pass `` score={`${result.overallScore}/10`} `` to ScoreBar. Never pass `overallScore * 10`.
**Warning signs:** Score bar renders at 0 even when AI returns valid scores.

### Pitfall 3: Profile tab breaks when no image is loaded

**What goes wrong:** If `ProfilePage` is added to the tab list but the shared `image` state check (`if (!image) return`) is applied to it, the profile tab will show "sube una foto para comenzar" or be blocked.
**Why it happens:** `AnalyzePage` and `CaptionPage` both take `image` as a prop and require it. `ProfilePage` is self-contained — it does not need an image.
**How to avoid:** `ProfilePage` takes no `image` prop. The "Audit my profile" button is always enabled. In `App.tsx`, do not condition the Profile tab render on `image !== null`.
**Warning signs:** Profile tab shows the upload prompt or the run button is always disabled.

### Pitfall 4: `callGeminiText` in the hook adds imageBase64 parameter inadvertently

**What goes wrong:** The existing `callGemini()` in `useAIProvider.ts` requires `imageBase64` and `mimeType`. If the developer refactors the shared function to make image optional via `undefined`, TypeScript may not catch incorrect callers, and existing analyze/caption paths could break.
**How to avoid:** Add a new separate `callGeminiText(systemPrompt, userText)` function in the hook file instead of modifying the existing `callGemini`. Keep existing function signature intact.

### Pitfall 5: Static imports vs. dynamic imports in CLI profile.ts

**What goes wrong:** Using `await import(...)` for `loadConfig`, `readFileSync`, etc. inside the main `try` block, whereas `analyze.ts` and `caption.ts` use top-level static imports.
**How to avoid:** Use top-level `import` statements consistent with existing CLI scripts. The `tsx` runner handles ESM top-level await without issue.

### Pitfall 6: `assembleSystemPrompt` already includes `profile.yaml` content

**What goes wrong:** `promptUtils.assembleSystemPrompt()` appends `profile.yaml` to the system prompt as context (line 17-18 in `promptUtils.ts`). The user message for `auditProfile()` is also `profileYaml`. This means the profile data appears twice: once in the system prompt (as background context) and once as the user message (as "what to audit"). This is intentional — the system prompt provides the strategy framing while the user message is the audit input — but implementors should be aware.
**How to avoid:** No change needed — this double-inclusion is the correct design per D-11 and D-12. Document it in code comments.

---

## Code Examples

### AuditResult.ts (updated entity)

```typescript
// Source: prompts/profile-auditor.md response schema + CONTEXT.md D-01/D-02/D-03
export type Priority = 'urgente' | 'importante' | 'mejora'

export interface ChecklistItem {
  priority: Priority
  element: string
  issue: string
  action: string
}

export interface AuditResult {
  overallScore: number        // parsed from "X/10" string by provider
  status: string              // 1-2 line summary of current profile state
  checklist: ChecklistItem[]  // max 7 items per prompt
  wins: string[]              // things already working; satisfies PROF-03 "strengths"
}
```

### GeminiProvider.auditProfile() skeleton

```typescript
// Source: existing GeminiProvider.ts analyzePost() pattern + callGeminiText() variant
async auditProfile(profileYaml: string): Promise<AuditResult> {
  const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config)
  const parsed = await callGeminiText(
    this.config.apiKey,
    this.config.ai.model,
    systemPrompt,
    profileYaml,
    this.config.ai.max_tokens,
  )
  return validateAuditResult(parsed)
}
```

### AnthropicProvider.auditProfile() skeleton

```typescript
// Source: existing AnthropicProvider.ts analyzePost() pattern
async auditProfile(profileYaml: string): Promise<AuditResult> {
  const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config)
  const response = await this.client.messages.create({
    model: this.config.ai.model,
    max_tokens: this.config.ai.max_tokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [{ type: 'text', text: profileYaml }],
    }],
  })
  const raw = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
  const parsed = extractJSON(raw)
  return validateAuditResult(parsed)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 1 `AuditResult` placeholder (`strengths[]`, `improvements[]`, `recommendations[]`) | Updated entity matching prompt schema (`overallScore`, `status`, `checklist`, `wins`) | Phase 2 | All three provider stubs, CLI, and UI depend on the new shape |
| Provider stubs throwing "not implemented" | Real `auditProfile()` implementations in both providers | Phase 2 | Enables both CLI and UI paths to function end-to-end |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `wins` field from prompt schema satisfies PROF-03 "at least one strength" — no separate `strengths[]` field needed | AuditResult entity design | Low — `wins` is the strengths equivalent in the prompt schema; verified by reading prompt file |
| A2 | `ScoreBar` expects `"X/10"` string format (not a raw number) | Don't Hand-Roll / ScoreBar pitfall | Medium — if interface was changed in Phase 1, the `*10` approach in D-09 would be correct; verified by reading `ScoreBar.tsx` source directly |

[VERIFIED: direct file reads of `prompts/profile-auditor.md` and `src/ui/components/ScoreBar.tsx`]

---

## Open Questions (RESOLVED)

1. **Does `assembleSystemPrompt` need a variant that skips profile.yaml injection for the profile audit?**
   - What we know: `assembleSystemPrompt` always appends `profile.yaml` to the system prompt (it's the third context item). For `auditProfile()`, the profile YAML is also the user message.
   - What's unclear: Whether the AI model is confused by receiving identical content in both system and user turn.
   - Recommendation: Keep as-is for Phase 2 (the prompt is designed to receive the user profile as user message, and strategy as system context). The `profile_path` in `assembleSystemPrompt` provides structured identity context; the user message is "here is the current state to audit." These serve different purposes.

2. **Should `ProfilePage.tsx` parse `profile.yaml` to display the summary, or just show raw YAML text?**
   - What we know: D-07 says "left panel shows a read-only summary of key fields (handle, name, bio excerpt, niche)". The `js-yaml` package is already installed.
   - What's unclear: Whether to parse YAML in the browser or display a formatted static excerpt.
   - Recommendation: Use `js-yaml` in the browser (`import { load } from 'js-yaml'`) to parse `profileRaw` and extract `identity.username`, `identity.name`, and `bio_target`. Simpler than raw text display and matches D-07 intent. This is Claude's discretion territory.

---

## Environment Availability

Step 2.6: SKIPPED — no external tools, services, or CLIs required beyond what is already verified in the project environment. All dependencies (`tsx`, `@anthropic-ai/sdk`, Node.js, Vite) were confirmed operational in Phase 1.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (repo root) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` (single suite, no split) |

Note: `vitest.config.ts` excludes `src/ui/**` from coverage. UI components (`ProfilePage.tsx`, `PriorityBadge.tsx`) are not test-covered by policy — consistent with how `AnalyzePage.tsx` and `CaptionPage.tsx` have no tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | `AuditProfile.execute()` calls `provider.auditProfile()` once and returns its result | unit | `pnpm test src/application/AuditProfile.test.ts` | ❌ Wave 0 |
| PROF-01 | `GeminiProvider.auditProfile()` returns valid `AuditResult` from mocked Gemini JSON | unit | `pnpm test src/infrastructure/ai/GeminiProvider.test.ts` | ✅ (update needed — replace stub test) |
| PROF-01 | `AnthropicProvider.auditProfile()` returns valid `AuditResult` from mocked Anthropic JSON | unit | `pnpm test src/infrastructure/ai/AnthropicProvider.test.ts` | ✅ (update needed — replace stub test) |
| PROF-02 | UI ProfilePage renders — manual smoke test only (UI excluded from vitest) | manual | `pnpm dev` → open Profile tab | N/A |
| PROF-03 | Validated `AuditResult` includes `overallScore`, `status`, `checklist`, `wins` | unit (via provider tests) | `pnpm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/application/AuditProfile.test.ts` — covers PROF-01 (use case delegation) and error propagation
- [ ] Add `auditProfile` happy-path and validation tests to `GeminiProvider.test.ts` (replace existing "throws Phase 2 message" test)
- [ ] Add `auditProfile` happy-path and validation tests to `AnthropicProvider.test.ts` (replace existing "throws Phase 2 message" test)

---

## Security Domain

`security_enforcement` is enabled. ASVS level 1 applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in this phase; API keys via env vars only |
| V3 Session Management | No | Stateless — no sessions |
| V4 Access Control | No | Single-user personal tool |
| V5 Input Validation | Yes | `validateAuditResult()` validates all fields before constructing domain type; priority field validated against union type |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via `profile.yaml` content | Tampering | `profile.yaml` is a static committed file — not user-controlled at runtime. Low risk. Do not allow user-editable input to flow into the system prompt without sanitization in future phases. |
| API key exposure in Vite bundle | Information Disclosure | Accepted known anti-pattern (documented in ARCHITECTURE.md). In-scope for this phase — the `VITE_GEMINI_API_KEY` approach is unchanged. |
| JSON injection in AI response | Tampering | `validateAuditResult()` validates schema before accepting. `extractJSON` strips code fences. Priority field validated against exact union — no arbitrary strings accepted. |

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `src/infrastructure/ai/GeminiProvider.ts`, `AnthropicProvider.ts`, `promptUtils.ts` — verified exact implementation patterns
- Direct file reads: `src/ui/hooks/useAIProvider.ts`, `src/ui/pages/AnalyzePage.tsx`, `src/ui/App.tsx` — verified UI patterns
- Direct file reads: `src/ui/components/ScoreBar.tsx`, `VerdictBadge.tsx` — verified component APIs
- Direct file reads: `prompts/profile-auditor.md` — verified actual JSON response schema
- Direct file reads: `src/domain/entities/AuditResult.ts`, `src/application/AuditProfile.ts`, `src/domain/ports/AIProvider.ts` — verified Phase 1 scaffolds
- Direct file reads: `vitest.config.ts`, `package.json`, `vite.config.ts` — verified tooling setup
- Direct file reads: `src/cli/analyze.ts` — verified CLI entry point pattern

### Secondary (MEDIUM confidence)

- N/A — all findings are from direct codebase reads at HIGH confidence

### Tertiary (LOW confidence)

- N/A

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct `package.json` and source file reads
- Architecture: HIGH — all patterns verified by reading existing Phase 1 implementations
- Pitfalls: HIGH — identified from direct schema comparison between CONTEXT.md decisions and actual prompt file; ScoreBar API verified by reading source

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stable stack; no fast-moving dependencies)
