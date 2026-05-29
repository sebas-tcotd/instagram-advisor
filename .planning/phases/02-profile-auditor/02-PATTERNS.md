# Phase 2: Profile Auditor - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 11 (7 new, 4 updated)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/entities/AuditResult.ts` | model | transform | `src/domain/entities/PostAnalysisResult.ts` | role-match |
| `src/infrastructure/ai/GeminiProvider.ts` | service | request-response | `src/infrastructure/ai/GeminiProvider.ts` (analyzePost/generateCaption) | exact — fill stub |
| `src/infrastructure/ai/AnthropicProvider.ts` | service | request-response | `src/infrastructure/ai/AnthropicProvider.ts` (analyzePost/generateCaption) | exact — fill stub |
| `src/infrastructure/ai/GeminiProvider.test.ts` | test | request-response | `src/infrastructure/ai/GeminiProvider.test.ts` (existing auditProfile stub test) | exact — replace stub block |
| `src/infrastructure/ai/AnthropicProvider.test.ts` | test | request-response | `src/infrastructure/ai/AnthropicProvider.test.ts` (existing auditProfile stub test) | exact — replace stub block |
| `src/application/AuditProfile.test.ts` | test | request-response | `src/infrastructure/ai/AnthropicProvider.test.ts` (use case delegation pattern) | role-match |
| `src/cli/profile.ts` | utility (CLI entry) | request-response | `src/cli/analyze.ts` | exact |
| `src/ui/pages/ProfilePage.tsx` | component | request-response | `src/ui/pages/AnalyzePage.tsx` | exact |
| `src/ui/components/PriorityBadge.tsx` | component | transform | `src/ui/components/VerdictBadge.tsx` | exact |
| `src/ui/hooks/useAIProvider.ts` | hook | request-response | `src/ui/hooks/useAIProvider.ts` (useGenerateCaption) | exact — add new export |
| `src/ui/App.tsx` | component | event-driven | `src/ui/App.tsx` (existing Tab union + tab render) | exact — extend |
| `package.json` | config | — | `package.json` (existing `analyze`/`caption` scripts) | exact |

---

## Pattern Assignments

### `src/domain/entities/AuditResult.ts` (model, transform)

**Analog:** `src/domain/entities/PostAnalysisResult.ts` (co-location of union types with the result interface)

**Current file state** (lines 1–9 — the Phase 1 placeholder to replace entirely):
```typescript
// Phase 1 scaffold — full implementation in Phase 2 (PROF-01/PROF-02/PROF-03)
export interface AuditResult {
  overallScore: number
  strengths: string[]
  improvements: string[]
  recommendations: string[]
}
```

**Target pattern — full replacement:**
```typescript
// Source: prompts/profile-auditor.md response schema + CONTEXT.md D-01/D-02/D-03
// ChecklistItem co-located here per CONTEXT.md Claude's Discretion note
export type Priority = 'urgente' | 'importante' | 'mejora'

export interface ChecklistItem {
  priority: Priority
  element: string
  issue: string
  action: string
}

export interface AuditResult {
  overallScore: number       // parsed from "X/10" string by provider (D-02)
  status: string             // 1-2 line summary of current profile state (D-03)
  checklist: ChecklistItem[] // max 7 items per prompt schema
  wins: string[]             // strengths already working; satisfies PROF-03
}
```

**CRITICAL:** `wins: string[]` is a top-level field, NOT inside `ChecklistItem`. Omitting it breaks PROF-03.

---

### `src/infrastructure/ai/GeminiProvider.ts` (service, request-response)

**Analog:** `src/infrastructure/ai/GeminiProvider.ts` — copy `callGemini()` structure for the new `callGeminiText()` helper, and follow `validatePostAnalysisResult()` for `validateAuditResult()`.

**Validation pattern to copy** (`GeminiProvider.ts` lines 14–32 — `validatePostAnalysisResult`):
```typescript
function validatePostAnalysisResult(parsed: unknown): PostAnalysisResult {
  const obj = parsed as Record<string, unknown>;
  if (
    !obj ||
    typeof obj['verdict'] !== 'string' ||
    ...
  ) {
    throw new Error('Gemini response missing required PostAnalysisResult fields');
  }
  if (!VALID_VERDICTS.includes(obj['verdict'] as Verdict)) {
    throw new Error(`Invalid verdict value: "${String(obj['verdict'])}". ...`);
  }
  return parsed as PostAnalysisResult;
}
```

**New `callGeminiText()` helper — copy `callGemini()` structure** (`GeminiProvider.ts` lines 48–118), omitting the `inlineData` part:
```typescript
// Add after callGemini() — same error handling, JSON extraction, fetch pattern
async function callGeminiText(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  maxTokens: number,
): Promise<unknown> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens },
    contents: [{
      role: 'user',
      parts: [{ text: userText }],   // no inlineData — text-only per D-12
    }],
  };
  // --- copy everything from callGemini lines 70–118 unchanged ---
  // (fetch, !res.ok error, promptFeedback block check, parts extraction,
  //  code-fence strip, JSON.parse with \{[\s\S]*\} fallback)
}
```

**New `validateAuditResult()` — follow `validatePostAnalysisResult()` pattern** (`GeminiProvider.ts` lines 14–32):
```typescript
const VALID_PRIORITIES = ['urgente', 'importante', 'mejora'] as const;
type Priority = typeof VALID_PRIORITIES[number];

function validateAuditResult(parsed: unknown): AuditResult {
  const obj = parsed as Record<string, unknown>;
  if (
    !obj ||
    typeof obj['overall'] !== 'string' ||  // note: prompt returns 'overall', not 'overallScore'
    typeof obj['status'] !== 'string' ||
    !Array.isArray(obj['checklist'])
  ) {
    throw new Error('Gemini response missing required AuditResult fields');
  }
  for (const item of obj['checklist'] as unknown[]) {
    const c = item as Record<string, unknown>;
    if (
      typeof c['element'] !== 'string' ||
      typeof c['issue'] !== 'string' ||
      typeof c['action'] !== 'string' ||
      !VALID_PRIORITIES.includes(c['priority'] as Priority)
    ) {
      throw new Error('AuditResult checklist item missing required fields');
    }
  }
  const overallScore = parseInt((obj['overall'] as string).split('/')[0], 10);
  if (isNaN(overallScore)) {
    throw new Error(`Cannot parse overallScore from: "${String(obj['overall'])}"`);
  }
  return {
    overallScore,
    status: obj['status'] as string,
    checklist: obj['checklist'] as ChecklistItem[],
    wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : [],
  };
}
```

**`auditProfile()` method — replace stub at line 154:**
```typescript
// Before (stub to replace):
auditProfile(_profileYaml: string): Promise<AuditResult> {
  return Promise.reject(new Error('AuditProfile not implemented — Phase 2'));
}

// After:
async auditProfile(profileYaml: string): Promise<AuditResult> {
  const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config);
  const parsed = await callGeminiText(
    this.config.apiKey,
    this.config.ai.model,
    systemPrompt,
    profileYaml,
    this.config.ai.max_tokens,
  );
  return validateAuditResult(parsed);
}
```

**Required import addition** (line 6 — `AuditResult` already imported; add `ChecklistItem`):
```typescript
import type { AuditResult, ChecklistItem } from '../../domain/entities/AuditResult';
```

---

### `src/infrastructure/ai/AnthropicProvider.ts` (service, request-response)

**Analog:** `src/infrastructure/ai/AnthropicProvider.ts` — follow `analyzePost()` pattern (lines 68–88), dropping the image content block.

**`validateAuditResult()` — copy exact same function as GeminiProvider** (same validation logic applies to both providers — same schema):
- Place after `validateCaptionResult()` (line 45)
- Error message prefix: `'Anthropic response missing required AuditResult fields'`

**`auditProfile()` method — replace stub at line 113:**
```typescript
// Before (stub to replace):
auditProfile(_profileYaml: string): Promise<AuditResult> {
  return Promise.reject(new Error('AuditProfile not implemented — Phase 2'));
}

// After — text-only: replace [image, text] content array with [{ type: 'text' }] only:
async auditProfile(profileYaml: string): Promise<AuditResult> {
  const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config);
  const response = await this.client.messages.create({
    model: this.config.ai.model,
    max_tokens: this.config.ai.max_tokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [{ type: 'text', text: profileYaml }],  // no image block — D-12
    }],
  });
  const raw = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  const parsed = extractJSON(raw);  // reuse existing extractJSON() at line 47
  return validateAuditResult(parsed);
}
```

**Required import addition** (line 7):
```typescript
import type { AuditResult, ChecklistItem } from '../../domain/entities/AuditResult';
```

---

### `src/infrastructure/ai/GeminiProvider.test.ts` (test, request-response)

**Analog:** `src/infrastructure/ai/GeminiProvider.test.ts` — `analyzePost` describe block (lines 65–112). Replace the existing `auditProfile` stub test block (lines 145–151).

**Helpers to reuse** (already in file, lines 12–48):
- `makeConfig()` — unchanged
- `makeGeminiResponse(jsonBody)` — unchanged, returns `{ ok: true, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: jsonBody }] } }] }) }`
- `makeErrorResponse(status, statusText)` — unchanged

**Replace stub block** (lines 145–151) with:
```typescript
describe('auditProfile', () => {
  it('returns AuditResult when Gemini returns valid JSON', async () => {
    const validResult = {
      overall: '7/10',
      status: 'Perfil sólido con oportunidades de mejora.',
      checklist: [
        { priority: 'urgente', element: 'Bio', issue: 'Demasiado genérico', action: 'Incluir nicho y CTA' },
      ],
      wins: ['Consistencia visual en el feed'],
    };
    fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(validResult)));

    const result = await provider.auditProfile('profile yaml content');

    expect(result.overallScore).toBe(7);
    expect(result.status).toBe('Perfil sólido con oportunidades de mejora.');
    expect(result.checklist).toHaveLength(1);
    expect(result.checklist[0].priority).toBe('urgente');
    expect(result.wins).toHaveLength(1);
  });

  it('throws Error when AuditResult is missing required fields', async () => {
    const invalidResult = { overall: '7/10' }; // missing status, checklist
    fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(invalidResult)));

    await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
      'missing required AuditResult fields',
    );
  });

  it('throws Error when checklist item has invalid priority', async () => {
    const invalidResult = {
      overall: '7/10',
      status: 'OK',
      checklist: [{ priority: 'critico', element: 'Bio', issue: 'Bad', action: 'Fix' }],
      wins: [],
    };
    fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(invalidResult)));

    await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
      'checklist item missing required fields',
    );
  });

  it('throws Error when overall score is not parseable as X/10', async () => {
    const invalidResult = {
      overall: 'siete',
      status: 'OK',
      checklist: [],
      wins: [],
    };
    fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(invalidResult)));

    await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
      'Cannot parse overallScore',
    );
  });
});
```

---

### `src/infrastructure/ai/AnthropicProvider.test.ts` (test, request-response)

**Analog:** `src/infrastructure/ai/AnthropicProvider.test.ts` — `analyzePost` describe block (lines 53–92). Replace existing `auditProfile` stub test block (lines 130–136).

**Helpers to reuse** (already in file):
- `makeConfig()`, `makeAnthropicResponse(jsonBody)`, `mockCreate` — unchanged

**Replace stub block** (lines 130–136) with the same test cases as GeminiProvider above, but:
- Use `mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validResult)))` instead of `fetchSpy`
- Error message prefix: `'Anthropic response missing required AuditResult fields'`
- Add one extra test verifying `mockCreate` was called with `content: [{ type: 'text', text: 'profile yaml content' }]` (no image block):
```typescript
it('sends text-only content (no image block) to Anthropic', async () => {
  const validResult = {
    overall: '7/10', status: 'OK',
    checklist: [], wins: [],
  };
  mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validResult)));

  await provider.auditProfile('profile yaml content');

  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'profile yaml content' }] }],
    }),
  );
});
```

---

### `src/application/AuditProfile.test.ts` (test, request-response) — NEW FILE

**Analog:** `AnthropicProvider.test.ts` use-case delegation style. Simple provider mock via `vi.fn()`.

**Full pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { AuditProfile } from './AuditProfile';
import type { AuditResult } from '../domain/entities/AuditResult';
import type { AIProvider } from '../domain/ports/AIProvider';

const makeAuditResult = (): AuditResult => ({
  overallScore: 7,
  status: 'Perfil sólido.',
  checklist: [
    { priority: 'urgente', element: 'Bio', issue: 'Vago', action: 'Añadir nicho' },
  ],
  wins: ['Feed consistente'],
});

describe('AuditProfile', () => {
  it('calls provider.auditProfile() with the given profileYaml', async () => {
    const mockProvider = { auditProfile: vi.fn().mockResolvedValue(makeAuditResult()) } as unknown as AIProvider;
    const useCase = new AuditProfile(mockProvider);

    await useCase.execute('profile yaml content');

    expect(mockProvider.auditProfile).toHaveBeenCalledOnce();
    expect(mockProvider.auditProfile).toHaveBeenCalledWith('profile yaml content');
  });

  it('returns the AuditResult from the provider unchanged', async () => {
    const expected = makeAuditResult();
    const mockProvider = { auditProfile: vi.fn().mockResolvedValue(expected) } as unknown as AIProvider;
    const useCase = new AuditProfile(mockProvider);

    const result = await useCase.execute('yaml');

    expect(result).toBe(expected);
  });

  it('propagates provider errors without wrapping', async () => {
    const mockProvider = { auditProfile: vi.fn().mockRejectedValue(new Error('API failure')) } as unknown as AIProvider;
    const useCase = new AuditProfile(mockProvider);

    await expect(useCase.execute('yaml')).rejects.toThrow('API failure');
  });
});
```

---

### `src/cli/profile.ts` (utility/CLI entry, request-response) — NEW FILE

**Analog:** `src/cli/analyze.ts` — exact same structure. Key differences: zero args (no minimist), no image loading, reads `profileYaml` via `fs.readFileSync`.

**Imports pattern** (copy from `analyze.ts` lines 1–7, remove minimist and image-related):
```typescript
#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory';
import { AuditProfile } from '../application/AuditProfile';
import { loadConfig } from '../infrastructure/config/loadConfig';
```

**ANSI constants** (copy from `analyze.ts` lines 15–20 verbatim):
```typescript
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
```

**Header log** (follow `analyze.ts` line 62–64 pattern):
```typescript
console.log(`\n${BOLD}profile-auditor${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Auditando perfil...${RESET}\n`);
```

**Core execution pattern** (follow `analyze.ts` lines 66–92 try/catch structure):
```typescript
try {
  const config = loadConfig();
  const profileYaml = readFileSync(resolve(process.cwd(), config.profile_path), 'utf8');
  const provider = createAIProvider();
  const useCase = new AuditProfile(provider);
  const result = await useCase.execute(profileYaml);

  const scoreColor = result.overallScore >= 7 ? GREEN : result.overallScore >= 4 ? YELLOW : RED;
  console.log(`${scoreColor}${BOLD}Puntuación general: ${result.overallScore}/10${RESET}`);
  console.log(`${DIM}${result.status}${RESET}\n`);

  const urgentes   = result.checklist.filter(i => i.priority === 'urgente');
  const importantes = result.checklist.filter(i => i.priority === 'importante');
  const mejoras    = result.checklist.filter(i => i.priority === 'mejora');

  if (urgentes.length) {
    console.log(`${RED}${BOLD}— URGENTE —${RESET}`);
    urgentes.forEach(i => console.log(`  ${RED}${i.element}${RESET}: ${i.issue}\n  ${DIM}→ ${i.action}${RESET}\n`));
  }
  if (importantes.length) {
    console.log(`${YELLOW}${BOLD}— IMPORTANTE —${RESET}`);
    importantes.forEach(i => console.log(`  ${YELLOW}${i.element}${RESET}: ${i.issue}\n  ${DIM}→ ${i.action}${RESET}\n`));
  }
  if (mejoras.length) {
    console.log(`${DIM}${BOLD}— MEJORA —${RESET}`);
    mejoras.forEach(i => console.log(`  ${DIM}${i.element}${RESET}: ${i.issue}\n  ${DIM}→ ${i.action}${RESET}\n`));
  }

  if (result.wins?.length) {
    console.log(`${GREEN}${BOLD}Bien hecho:${RESET}`);
    result.wins.forEach(w => console.log(`  ${GREEN}✓${RESET} ${w}`));
    console.log('');
  }
} catch (e) {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`);
  process.exit(1);
}
```

**Error handling pattern** (copy from `analyze.ts` lines 90–93 exactly):
```typescript
} catch (e) {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`);
  process.exit(1);
}
```

---

### `src/ui/pages/ProfilePage.tsx` (component, request-response) — NEW FILE

**Analog:** `src/ui/pages/AnalyzePage.tsx` — identical two-section structure (controls + results in same fragment), same `s` styles object pattern, same error/loading/result conditional rendering order.

**Imports pattern** (follow `AnalyzePage.tsx` lines 1–5, replacing domain types):
```typescript
import { useAuditProfile } from '../hooks/useAIProvider'
import { ScoreBar } from '../components/ScoreBar'
import { PriorityBadge } from '../components/PriorityBadge'
import { Spinner } from '../components/Spinner'
import type { ChecklistItem } from '../../domain/entities/AuditResult'
import profileYaml from '@root/profile.yaml?raw'
import { load } from 'js-yaml'
```

**Note:** Do NOT import `profileAuditorPrompt` in `ProfilePage.tsx` — the hook (`useAuditProfile`) owns that import internally inside `useAIProvider.ts`. Importing it in ProfilePage would produce an unused import lint warning.

**Note on `profile.yaml` import:** Per D-06, import is `import profileYaml from '@root/profile.yaml?raw'` (using the `@root` alias defined in `vite.config.ts`). The relative path `'../../profile.yaml?raw'` also works if the alias is not confirmed.

**Styles object** (follow `AnalyzePage.tsx` lines 24–45 `const s = {...}` pattern):
```typescript
const s = {
  section: { marginBottom: 20 },
  label: { fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' },
  runBtn: {
    width: '100%', padding: '10px', fontSize: 11, letterSpacing: '0.08em',
    borderColor: 'var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  // ... add profile-specific styles: profileSummary, statusText, priorityGroup, checklistItem
  errBox: { background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em' },
}
```

**No `image` prop** — ProfilePage takes no props. `useAuditProfile()` handles the `profileYaml` internally.

**Component skeleton** (follow `AnalyzePage.tsx` lines 47–130 structure):
```typescript
export function ProfilePage() {
  const { loading, result, error, run } = useAuditProfile()

  return (
    <>
      {/* Profile summary — left panel section */}
      <div style={s.section}>
        {/* read-only summary: parse profileYaml via js-yaml, display handle/name/bio/niche */}
      </div>
      <button style={s.runBtn} disabled={loading} onClick={() => void run()}>
        {loading ? <><Spinner /> auditando...</> : '→ auditar perfil'}
      </button>

      {/* Results — right panel section */}
      {error && (
        <div style={{ ...s.section, marginTop: 20 }}>
          <div style={s.errBox}>
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 4, fontSize: 11, letterSpacing: '0.06em' }}>ERROR</strong>
            {error}
          </div>
        </div>
      )}

      {loading && (
        <div style={s.empty}>
          <Spinner />
          <span style={{ marginTop: 8 }}>auditando perfil...</span>
        </div>
      )}

      {result && !loading && (
        <>
          <ScoreBar label="puntuación general" score={`${result.overallScore}/10`} />
          {/* D-09 CRITICAL: pass score as "7/10" string, NOT overallScore * 10 */}
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{result.status}</p>
          {/* D-10: status as muted paragraph above checklist */}

          {/* Priority groups: urgente → importante → mejora */}
          {(['urgente', 'importante', 'mejora'] as const).map(priority => {
            const items = result.checklist.filter((i: ChecklistItem) => i.priority === priority)
            if (!items.length) return null
            return (
              <div key={priority} style={s.priorityGroup}>
                <PriorityBadge priority={priority} />
                {items.map((item: ChecklistItem, idx: number) => (
                  <div key={idx} style={s.checklistItem}>
                    <strong style={{ fontSize: 12 }}>{item.element}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 6 }}>{item.issue}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      → {item.action}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {result.wins?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 11, color: 'var(--green)', letterSpacing: '0.06em' }}>Bien hecho:</strong>
              {result.wins.map((w: string, idx: number) => (
                <div key={idx} style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                  <span style={{ color: 'var(--green)' }}>✓</span> {w}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
```

---

### `src/ui/components/PriorityBadge.tsx` (component, transform) — NEW FILE

**Analog:** `src/ui/components/VerdictBadge.tsx` — exact same structure: `Record<type, {label, color, bg}>` map, `span` with inline styles, no external deps.

**Full pattern** (copy `VerdictBadge.tsx` lines 1–19 and adapt):
```typescript
// VerdictBadge.tsx for reference (lines 1–19):
import type { Verdict } from '../../domain/entities/PostAnalysisResult'
interface Props { verdict: Verdict }
export function VerdictBadge({ verdict }: Props) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'listo':   { label: '✓ listo para publicar', color: 'var(--green)',  bg: 'var(--green-bg)' },
    'ajustar': { label: '⚠ necesita ajustes',    color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    'no va':   { label: '✕ no va al feed',        color: 'var(--red)',   bg: 'var(--red-bg)' },
  }
  const v = map[verdict] ?? map['ajustar']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}
```

**Adapted as PriorityBadge:**
```typescript
import type { Priority } from '../../domain/entities/AuditResult'
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

---

### `src/ui/hooks/useAIProvider.ts` (hook, request-response) — ADD EXPORT

**Analog:** `src/ui/hooks/useAIProvider.ts` — `useGenerateCaption()` (lines 151–183). Same `[loading, result, error]` state triple, same `run()` pattern, same error catch.

**New imports to add** at top of file (after existing imports):
```typescript
import profileAuditorPrompt from '@prompts/profile-auditor.md?raw'
import type { AuditResult } from '../../domain/entities/AuditResult'
```

**`profileRaw` is already imported** at line 5: `import profileRaw from '@root/profile.yaml?raw'` — do not re-import.

**New `callGeminiText()` function** — add after `callGemini()` (line 107), same structure minus `imageBase64`/`mimeType` params:
```typescript
// Text-only variant of callGemini() — no inlineData part in contents
// Separate function (not a modification of callGemini) to avoid breaking existing callers
async function callGeminiText(
  systemPrompt: string,
  userText: string
): Promise<unknown> {
  if (!API_KEY) {
    throw new Error('No se encontró ninguna API key válida en el .env (se intentó VITE_GEMINI_API_KEY y VITE_ANTHROPIC_API_KEY).')
  }
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens },
    contents: [{ role: 'user', parts: [{ text: userText }] }],  // no inlineData
  }
  // --- copy lines 52–107 of callGemini() unchanged (fetch, error handling, JSON parse) ---
}
```

**New `useAuditProfile()` export** (add after `useGenerateCaption()`, following the same structure exactly):
```typescript
export function useAuditProfile() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const parsed = await callGeminiText(
        buildSystemPrompt(profileAuditorPrompt),  // uses existing buildSystemPrompt()
        profileRaw,                               // already-imported @root/profile.yaml?raw
      )
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('overall' in parsed) ||    // prompt returns 'overall', providers parse to 'overallScore'
        !('checklist' in parsed)
      ) {
        throw new Error('Gemini devolvió JSON con formato inesperado.')
      }
      // The hook receives raw Gemini JSON (not via provider validation).
      // Parse 'overall' → overallScore here, same as validateAuditResult in providers.
      const obj = parsed as Record<string, unknown>
      const overallScore = parseInt((obj['overall'] as string).split('/')[0], 10)
      setResult({
        overallScore,
        status: obj['status'] as string,
        checklist: obj['checklist'] as AuditResult['checklist'],
        wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : [],
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}
```

---

### `src/ui/App.tsx` (component, event-driven) — UPDATE

**Analog:** `src/ui/App.tsx` — extend the `Tab` union and tab array. Exact lines to change.

**Line 37 — extend Tab union:**
```typescript
// Before:
type Tab = 'analyze' | 'caption'
// After:
type Tab = 'analyze' | 'caption' | 'profile'
```

**Line 79 — extend tab array** (inside the `map` call):
```typescript
// Before:
([['analyze', 'analizar post'], ['caption', 'generar caption']] as [Tab, string][])
// After:
([['analyze', 'analizar post'], ['caption', 'generar caption'], ['profile', 'perfil']] as [Tab, string][])
```

**Add import** at top (after existing page imports):
```typescript
import { ProfilePage } from './pages/ProfilePage'
```

**Lines 124–125 — add ProfilePage render** (after the caption conditional):
```typescript
{tab === 'analyze' && <AnalyzePage image={image} />}
{tab === 'caption' && <CaptionPage image={image} />}
{tab === 'profile' && <ProfilePage />}  // no image prop — self-contained
```

**CRITICAL: do not** wrap `<ProfilePage />` inside `{image && ...}` — profile tab must always be accessible regardless of image state.

---

### `package.json` (config) — UPDATE

**Analog:** `package.json` existing `scripts` block — copy the `analyze` and `caption` script pattern.

**Add one line to `scripts` object:**
```json
"profile": "tsx src/cli/profile.ts"
```

---

## Shared Patterns

### Validation Pattern
**Source:** `src/infrastructure/ai/GeminiProvider.ts` lines 14–32 and `src/infrastructure/ai/AnthropicProvider.ts` lines 13–45
**Apply to:** `validateAuditResult()` in both providers
```typescript
// Pattern: cast to Record<string, unknown>, check each required field type,
// validate enum fields against const arrays, return typed object or throw descriptive Error
function validate*(parsed: unknown): DomainType {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj['field'] !== 'expectedType' || ...) {
    throw new Error('{Provider} response missing required {Type} fields');
  }
  // enum validation:
  if (!VALID_VALUES.includes(obj['field'] as ValueType)) {
    throw new Error(`Invalid value: "${String(obj['field'])}". Expected: ${VALID_VALUES.join(', ')}`);
  }
  return parsed as DomainType;
}
```

### extractJSON / JSON Parse with Fallback
**Source:** `src/infrastructure/ai/AnthropicProvider.ts` lines 47–59 (`extractJSON`) and `src/infrastructure/ai/GeminiProvider.ts` lines 107–118 (inline in `callGemini`)
**Apply to:** `callGeminiText()` in GeminiProvider and in useAIProvider hook — copy the exact same strip + parse + regex fallback block:
```typescript
const stripped = responseText.replace(/^```(?:json)?\n?|```$/gm, '').trim();
try {
  return JSON.parse(stripped) as unknown;
} catch {
  const match = stripped.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : stripped) as unknown;
  } catch (err) {
    throw new Error(`Gemini response is not valid JSON: ${String(err)}`, { cause: err });
  }
}
```

### assembleSystemPrompt Usage
**Source:** `src/infrastructure/ai/promptUtils.ts` lines 13–19
**Apply to:** Both `GeminiProvider.auditProfile()` and `AnthropicProvider.auditProfile()`
```typescript
// Single call — handles strategy.md + profile.yaml injection automatically
const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config);
```

### buildSystemPrompt Usage (UI hook)
**Source:** `src/ui/hooks/useAIProvider.ts` lines 22–24
**Apply to:** `useAuditProfile()` hook — reuse the existing `buildSystemPrompt()` function already in the file
```typescript
function buildSystemPrompt(agentPrompt: string): string {
  return `${agentPrompt}\n\n---\n\n## Estrategia completa\n\n${strategyPrompt}\n\n## Perfil\n\n${profileRaw}`
}
```

### Hook State Triple
**Source:** `src/ui/hooks/useAIProvider.ts` lines 109–148 (`useAnalyzePost`) and 151–183 (`useGenerateCaption`)
**Apply to:** `useAuditProfile()` — identical `[loading, result, error]` pattern:
```typescript
const [loading, setLoading] = useState(false)
const [result, setResult] = useState<T | null>(null)
const [error, setError] = useState<string | null>(null)
// ... try/catch with setLoading(true)/finally setLoading(false)
return { loading, result, error, run }
```

### Error/Loading/Result Render Order
**Source:** `src/ui/pages/AnalyzePage.tsx` lines 88–127 and `src/ui/pages/CaptionPage.tsx` lines 63–98
**Apply to:** `ProfilePage.tsx` results section — always render in this order:
1. Error box (if `error`)
2. Loading spinner (if `loading`)
3. Result content (if `result && !loading`)

### ANSI Color Output (CLI)
**Source:** `src/cli/analyze.ts` lines 15–20
**Apply to:** `src/cli/profile.ts` — copy constants verbatim, same color semantics

---

## No Analog Found

All files in this phase have close analogs in the codebase. No files require patterns from RESEARCH.md only.

---

## Metadata

**Analog search scope:** `src/cli/`, `src/ui/`, `src/infrastructure/ai/`, `src/domain/entities/`, `src/application/`
**Files read:** 14
**Pattern extraction date:** 2026-05-29
