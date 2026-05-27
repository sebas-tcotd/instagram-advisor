# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 22 new/modified files
**Analogs found:** 14 / 22 (8 have no codebase analog — greenfield for this phase)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tsconfig.json` | config | — | none | none |
| `eslint.config.ts` | config | — | `vite.config.js` | partial (config file shape) |
| `vitest.config.ts` | config | — | `vite.config.js` | partial (defineConfig pattern) |
| `vite.config.ts` (rename) | config | — | `vite.config.js` | exact (rename only) |
| `config.yaml` | config | — | `profile.yaml` | partial (YAML file at root) |
| `package.json` (update) | config | — | `package.json` | exact |
| `src/domain/entities/PostAnalysisResult.ts` | model | — | `scripts/analyze.js` (JSON shape extracted at lines 80–98) | partial (shape implied, no TS file) |
| `src/domain/entities/CaptionResult.ts` | model | — | `scripts/caption.js` (JSON shape at lines 70–84) | partial |
| `src/domain/entities/AnalyzeRequest.ts` | model | — | `scripts/analyze.js` (args at lines 9–14) | partial |
| `src/domain/entities/CaptionRequest.ts` | model | — | `scripts/caption.js` (args at lines 9–11) | partial |
| `src/domain/entities/AuditResult.ts` | model | — | none | none (scaffold only) |
| `src/domain/ports/AIProvider.ts` | port/interface | request-response | none | none (greenfield) |
| `src/application/AnalyzePost.ts` | service/use-case | request-response | `scripts/analyze.js` | partial (business logic extracted) |
| `src/application/GenerateCaption.ts` | service/use-case | request-response | `scripts/caption.js` | partial |
| `src/application/AuditProfile.ts` | service/use-case | request-response | none | none (scaffold only) |
| `src/infrastructure/ai/GeminiProvider.ts` | service/adapter | request-response | `src/App.jsx` callAPI (lines 137–214) | role-match |
| `src/infrastructure/ai/AnthropicProvider.ts` | service/adapter | request-response | `scripts/analyze.js` + `scripts/caption.js` Anthropic calls (lines 61–85) | exact |
| `src/infrastructure/ai/AIProviderFactory.ts` | utility/factory | — | none | none (greenfield) |
| `src/infrastructure/config/loadConfig.ts` | utility | file-I/O | `scripts/analyze.js` (readFileSync pattern, lines 41–44) | role-match |
| `src/cli/analyze.ts` | cli-entry | request-response | `scripts/analyze.js` | exact |
| `src/cli/caption.ts` | cli-entry | request-response | `scripts/caption.js` | exact |
| `src/cli/doctor.ts` | cli-entry | file-I/O | `scripts/doctor.js` | exact |
| `src/ui/App.tsx` (split) | component | request-response | `src/App.jsx` | exact |
| `src/ui/components/VerdictBadge.tsx` | component | — | `src/App.jsx` VerdictBadge (lines 46–60) | exact |
| `src/ui/components/ScoreBar.tsx` | component | — | `src/App.jsx` ScoreBar (lines 62–79) | exact |
| `src/ui/components/Spinner.tsx` | component | — | `src/App.jsx` Spinner (lines 81–91) | exact |
| `src/ui/pages/AnalyzePage.tsx` | component | request-response | `src/App.jsx` analyze tab (lines 358–387) | exact |
| `src/ui/pages/CaptionPage.tsx` | component | request-response | `src/App.jsx` caption tab (lines 389–409) | exact |
| `src/ui/hooks/useAIProvider.ts` | hook | request-response | `src/App.jsx` callAPI + runAnalyze (lines 137–244) | role-match |
| `src/main.tsx` (rename) | entry | — | `src/main.jsx` | exact |

---

## Pattern Assignments

### `tsconfig.json` (config)

**Analog:** none in codebase — use RESEARCH.md pattern directly.

**Core pattern** (from RESEARCH.md Code Examples section):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"],
    "types": ["vite/client", "node"],
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "vite.config.ts", "eslint.config.ts", "vitest.config.ts"]
}
```

**Critical note:** TypeScript 6 defaults `types` to `[]`. Without `["vite/client", "node"]` explicitly, `import.meta.env`, `process.env`, and `readFileSync` all produce type errors immediately. This is Pitfall 1 from RESEARCH.md.

---

### `vite.config.ts` (config, rename from `vite.config.js`)

**Analog:** `vite.config.js` (lines 1–10) — exact rename + TypeScript conversion.

**Existing file to copy** (`vite.config.js` lines 1–10):
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  envDir: '../',
  build: { outDir: '../dist' },
  server: { port: 5173 }
})
```

**Migration delta:** Add `resolve.alias` for `@prompts` so `?raw` imports of `prompts/*.md` work reliably outside the `root: 'src'` boundary (Pitfall 6 from RESEARCH.md):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  envDir: '../',
  build: { outDir: '../dist' },
  server: { port: 5173 },
  resolve: {
    alias: { '@prompts': resolve(__dirname, 'prompts') }
  }
})
```

---

### `vitest.config.ts` (config)

**Analog:** `vite.config.js` — same `defineConfig` export shape.

**Core pattern** (from RESEARCH.md):
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/ui/**'],
    },
  },
})
```

---

### `eslint.config.ts` (config)

**Analog:** `vite.config.js` — same default export of a config object pattern.

**Core pattern** (from RESEARCH.md Pattern 6):
```typescript
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain',         pattern: 'src/domain/**' },
        { type: 'application',    pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'ui',             pattern: 'src/ui/**' },
        { type: 'cli',            pattern: 'src/cli/**' },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'domain',         allow: ['domain'] },
          { from: 'application',    allow: ['domain', 'application'] },
          { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure'] },
          { from: 'ui',             allow: ['domain', 'application', 'ui'] },
          { from: 'cli',            allow: ['domain', 'application', 'cli'] },
        ],
      }],
    },
  },
)
```

**Critical note:** `node_modules` and Node built-ins are NOT project layers — the `boundaries/elements` setting only applies to files under `src/`. External package imports are never blocked by this rule. Verify the rule fires with a deliberate violation before shipping (Pitfall 5).

---

### `config.yaml` (config, new file at root)

**Analog:** `profile.yaml` (root) — same location and YAML format convention.

**Core pattern** (from RESEARCH.md Pattern 4, field names locked by PROV-01):
```yaml
ai:
  provider: gemini          # change to "anthropic" to switch providers
  model: gemini-2.0-flash
  max_tokens: 1024
prompts_dir: ./prompts
profile_path: ./profile.yaml
```

**Note:** `gemini-3.5-flash` in `src/App.jsx` line 4 is an invalid model name — use `gemini-2.0-flash` here (CONCERNS.md bug documented in RESEARCH.md State of the Art section).

---

### `src/domain/entities/PostAnalysisResult.ts` (model)

**Analog:** `scripts/analyze.js` — the JSON shape is implicit in lines 87–98.

**Shape source** (`scripts/analyze.js` lines 87–98):
```javascript
// parsed.verdict — 'listo' | 'ajustar' | 'no va'
// parsed.scores.visual, parsed.scores.caption, parsed.scores.fit — "X/10"
// parsed.analysis — string
// parsed.suggestions — string[]
const verdictColor = parsed.verdict === 'listo' ? GREEN : parsed.verdict === 'ajustar' ? YELLOW : RED
console.log(`${parsed.scores?.visual || '—'}`)
console.log(`${parsed.analysis}\n`)
parsed.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`))
```

**TypeScript interface to produce** (from RESEARCH.md Code Examples):
```typescript
// src/domain/entities/PostAnalysisResult.ts
export type Verdict = 'listo' | 'ajustar' | 'no va'

export interface Scores {
  visual: string   // e.g. '8/10'
  caption: string
  fit: string
}

export interface PostAnalysisResult {
  verdict: Verdict
  scores: Scores
  analysis: string
  suggestions: string[]
}
```

---

### `src/domain/entities/CaptionResult.ts` (model)

**Analog:** `scripts/caption.js` — JSON shape implicit at lines 77–84.

**Shape source** (`scripts/caption.js` lines 77–84):
```javascript
// parsed.captions — array of { tone, hook_type, text }
// parsed.notes — string
parsed.captions?.forEach((c, i) => {
  console.log(`── Versión ${i + 1} · ${c.tone} · hook: ${c.hook_type}`)
  console.log(`\n${c.text}\n`)
})
if (parsed.notes) { console.log(`Nota: ${parsed.notes}`) }
```

**TypeScript interface to produce:**
```typescript
// src/domain/entities/CaptionResult.ts
export interface Caption {
  tone: string
  hook_type: string
  text: string
}

export interface CaptionResult {
  captions: Caption[]
  notes?: string
}
```

---

### `src/domain/entities/AnalyzeRequest.ts` (model)

**Analog:** `scripts/analyze.js` — CLI args at lines 9–14, image loading at line 44.

**Shape source** (`scripts/analyze.js` lines 9–14, 44):
```javascript
const photo   = args._[0] || args.photo      // → imageBase64 after encoding
const caption = args.caption || null
const format  = args.format  || 'post_individual'
const layer   = args.layer   || 'externa'
const imageData = readFileSync(photoPath).toString('base64')  // → base64 string
```

**TypeScript interface to produce:**
```typescript
// src/domain/entities/AnalyzeRequest.ts
export interface AnalyzeRequest {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  format: 'post_individual' | 'carrusel' | 'historia' | 'reel'
  layer: 'externa' | 'interna' | 'engineer'
  caption?: string
}
```

---

### `src/domain/entities/CaptionRequest.ts` (model)

**Analog:** `scripts/caption.js` — CLI args at lines 9–11.

**Shape source** (`scripts/caption.js` lines 9–11):
```javascript
const photo = args._[0] || args.photo
const tone  = args.tone || 'narrativo'
```

**TypeScript interface to produce:**
```typescript
// src/domain/entities/CaptionRequest.ts
export interface CaptionRequest {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  tone: 'narrativo' | 'introspectivo' | 'sensorial' | 'proceso' | 'tensión'
}
```

---

### `src/domain/ports/AIProvider.ts` (port/interface)

**Analog:** none — greenfield. Use RESEARCH.md Pattern 1 directly.

**Core pattern** (from RESEARCH.md Pattern 1, D-05 locked):
```typescript
// src/domain/ports/AIProvider.ts
import type { AnalyzeRequest } from '../entities/AnalyzeRequest'
import type { CaptionRequest } from '../entities/CaptionRequest'
import type { PostAnalysisResult } from '../entities/PostAnalysisResult'
import type { CaptionResult } from '../entities/CaptionResult'
import type { AuditResult } from '../entities/AuditResult'

export interface AIProvider {
  analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult>
  generateCaption(req: CaptionRequest): Promise<CaptionResult>
  auditProfile(profileYaml: string): Promise<AuditResult>
}
```

**Design rule (D-05):** No generics, no discriminated unions. Separate typed method per use case. This is the central architectural showcase file — it must be self-explanatory when a developer opens it cold.

---

### `src/application/AnalyzePost.ts` (service/use-case, request-response)

**Analog:** `scripts/analyze.js` — business logic at lines 49–85 (user text construction, API call, result use).

**Application layer pattern** (from RESEARCH.md Pattern 2):
```typescript
// src/application/AnalyzePost.ts
import type { AIProvider } from '../domain/ports/AIProvider'
import type { AnalyzeRequest } from '../domain/entities/AnalyzeRequest'
import type { PostAnalysisResult } from '../domain/entities/PostAnalysisResult'

export class AnalyzePost {
  constructor(private readonly provider: AIProvider) {}

  async execute(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    return this.provider.analyzePost(req)
  }
}
```

**Import rule (MIGR-03, AGNT-01):** This file MUST NOT import from `src/infrastructure/`. Only `src/domain/` imports allowed. ESLint boundaries enforces this.

---

### `src/application/GenerateCaption.ts` (service/use-case, request-response)

**Analog:** `scripts/caption.js` — same structure as AnalyzePost.

**Pattern:** Identical shape to `AnalyzePost.ts` above — constructor receives `AIProvider`, `execute` delegates to `provider.generateCaption(req)`. See AnalyzePost pattern above and substitute types.

---

### `src/application/AuditProfile.ts` (service/use-case, scaffold)

**Analog:** none — Phase 1 scaffold only; full implementation in Phase 2.

**Pattern:** Same constructor injection shape as AnalyzePost. `execute` calls `provider.auditProfile(profileYaml)`. Body can be minimal in Phase 1 — the interface must exist for the architecture to be complete.

---

### `src/infrastructure/ai/AnthropicProvider.ts` (service/adapter, request-response)

**Analog:** `scripts/analyze.js` + `scripts/caption.js` — Anthropic SDK call pattern at lines 61–85 of both scripts.

**SDK call pattern** (`scripts/analyze.js` lines 61–85):
```javascript
const client = new Anthropic()

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `${systemPmt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}`,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
      { type: 'text', text: userText }
    ]
  }]
})

const raw = response.content.map(b => b.text || '').join('').trim()

let parsed
try {
  const match = raw.match(/\{[\s\S]*\}/)
  parsed = JSON.parse(match ? match[0] : raw)
} catch {
  console.error(`Error al parsear respuesta:\n${raw}`)
  process.exit(1)
}
```

**TypeScript class pattern to produce** (from RESEARCH.md Pattern 3):
```typescript
// src/infrastructure/ai/AnthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from '../../domain/ports/AIProvider'
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest'
import type { PostAnalysisResult } from '../../domain/entities/PostAnalysisResult'
// ... other domain imports

export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic

  constructor(private readonly config: AppConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    // Mirrors scripts/analyze.js lines 61-85 but:
    // 1. Uses config.model and config.max_tokens instead of hardcoded values
    // 2. Throws Error (not process.exit) on parse failure — D-06
    // 3. Validates response shape before returning typed object — D-06
  }
}
```

**Key migration deltas from analog:**
- Replace `process.exit(1)` with `throw new Error(...)` — providers throw, callers handle
- Replace hardcoded `'claude-sonnet-4-20250514'` and `1024` with `config.model` and `config.max_tokens`
- Regex JSON extraction `raw.match(/\{[\s\S]*\}/)` is the existing fragile pattern — validate the parsed shape explicitly (D-06)
- System prompt assembly (`systemPmt + strategy + profile`) moves into the provider method

---

### `src/infrastructure/ai/GeminiProvider.ts` (service/adapter, request-response)

**Analog:** `src/App.jsx` `callAPI` function (lines 137–214) — the existing Gemini API call logic.

**API call pattern** (`src/App.jsx` lines 137–214):
```javascript
const callAPI = async (systemPrompt, userText) => {
  if (!API_KEY) throw new Error('No se encontró ninguna API key válida...')
  if (!image?.base64 || !image?.type) throw new Error('No hay una imagen cargada...')

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: image.type, data: image.base64 } },
        { text: userText },
      ],
    }],
  }

  const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = res.statusText
    try { const err = await res.json(); detail = err.error?.message || JSON.stringify(err) } catch {}
    throw new Error(`Gemini API ${res.status}: ${detail}`)
  }

  const data = await res.json()
  if (data?.promptFeedback?.blockReason) throw new Error(`Gemini bloqueó la respuesta: ${data.promptFeedback.blockReason}`)

  const responseText = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text).filter(Boolean).join('').trim()

  if (!responseText) throw new Error(...)

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  try { return JSON.parse(jsonMatch ? jsonMatch[0] : responseText) }
  catch (error) { throw new Error(`La respuesta de Gemini no es JSON válido. ${error.message}`) }
}
```

**Key migration deltas from analog:**
- Replace raw `fetch` with `@google/genai` SDK (assumption A4 from RESEARCH.md — either works)
- Replace `API_KEY` module constant with `config.apiKey` from constructor
- Replace `GEMINI_MODEL` constant with `config.model`
- Move out of React component — pure class, no `useState` or `image` state dependency
- Input validation (image present check) moves to the use case or CLI layer, not the provider

---

### `src/infrastructure/ai/AIProviderFactory.ts` (utility/factory)

**Analog:** none — greenfield. Use RESEARCH.md Pattern 4 directly.

**Core pattern** (from RESEARCH.md Pattern 4):
```typescript
// src/infrastructure/ai/AIProviderFactory.ts
import { readFileSync } from 'fs'
import { parse } from 'yaml'   // or js-yaml if keeping existing dep
import { GeminiProvider } from './GeminiProvider'
import { AnthropicProvider } from './AnthropicProvider'
import type { AIProvider } from '../../domain/ports/AIProvider'

export function createAIProvider(): AIProvider {
  const raw = readFileSync('./config.yaml', 'utf8')
  const config = parse(raw)
  if (config.ai.provider === 'anthropic') {
    return new AnthropicProvider(config)
  }
  return new GeminiProvider(config)
}
```

**Note on YAML parser:** `js-yaml` is already installed (`package.json` line 17). Use `import { load } from 'js-yaml'` to avoid adding a new dependency. The `yaml` (v2) package is preferred for new projects but both parse correctly (assumption A1 from RESEARCH.md).

---

### `src/infrastructure/config/loadConfig.ts` (utility, file-I/O)

**Analog:** `scripts/analyze.js` — `readFileSync` pattern at lines 41–44.

**File loading pattern** (`scripts/analyze.js` lines 41–44):
```javascript
const strategy  = readFileSync(resolve(ROOT, 'prompts/strategy.md'), 'utf8')
const systemPmt = readFileSync(resolve(ROOT, 'prompts/post-advisor.md'), 'utf8')
const profile   = readFileSync(resolve(ROOT, 'profile.yaml'), 'utf8')
const imageData = readFileSync(photoPath).toString('base64')
```

**TypeScript utility to produce:**
```typescript
// src/infrastructure/config/loadConfig.ts
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { load } from 'js-yaml'

const ROOT = resolve(import.meta.dirname, '..', '..', '..')

export interface AppConfig {
  ai: { provider: string; model: string; max_tokens: number }
  prompts_dir: string
  profile_path: string
  apiKey: string   // injected from env, not in yaml
}

export function loadConfig(): AppConfig {
  const raw = readFileSync(resolve(ROOT, 'config.yaml'), 'utf8')
  const parsed = load(raw) as Record<string, unknown>
  // validate shape, inject API key from process.env
  return { ...parsed, apiKey: process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || '' } as AppConfig
}
```

---

### `src/cli/analyze.ts` (cli-entry, request-response)

**Analog:** `scripts/analyze.js` — exact migration to TypeScript.

**Full structure** (`scripts/analyze.js` lines 1–99):
- Lines 1–6: imports (`fs`, `path`, `minimist`, `@anthropic-ai/sdk`, `dotenv`)
- Lines 8–14: ROOT resolution, arg parsing
- Lines 16–20: ANSI color constants (SCREAMING_SNAKE_CASE — keep pattern)
- Lines 22–39: Input validation with `process.exit(1)` on failure
- Lines 41–44: Prompt + image file loading via `readFileSync`
- Lines 46–55: `userText` construction
- Lines 57–59: Progress logging (DIM color)
- Lines 61–74: Anthropic SDK call
- Lines 76–85: JSON parse + error handling
- Lines 87–98: Result rendering with ANSI colors

**Migration delta:** Replace direct Anthropic SDK call (lines 61–74) with use case invocation:
```typescript
// src/cli/analyze.ts
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory'
import { AnalyzePost } from '../application/AnalyzePost'

const provider = createAIProvider()
const useCase = new AnalyzePost(provider)
const result = await useCase.execute({ imageBase64, mimeType, format, layer, caption })
```

**Keep unchanged:** ANSI color constants pattern, `minimist` arg parsing, `process.exit(1)` for validation errors, all `console.log` output formatting.

---

### `src/cli/caption.ts` (cli-entry, request-response)

**Analog:** `scripts/caption.js` — exact migration.

**Migration delta:** Same pattern as `analyze.ts` — replace direct Anthropic SDK call with:
```typescript
import { GenerateCaption } from '../application/GenerateCaption'
const useCase = new GenerateCaption(provider)
const result = await useCase.execute({ imageBase64, mimeType, tone })
```

**Keep unchanged:** All ANSI output, arg parsing, validation pattern.

---

### `src/cli/doctor.ts` (cli-entry, file-I/O)

**Analog:** `scripts/doctor.js` — exact migration to TypeScript.

**Full structure** (`scripts/doctor.js` lines 1–53):
- Lines 5–15: ROOT + checks array (add `config.yaml` to the checks list in the migration)
- Lines 17–22: ANSI constants
- Lines 24–53: Loop + API key check + exit logic

**Migration delta:** Minimal. Change `import.meta.dirname` resolution if needed for TypeScript; add `config.yaml` to the checks array. No structural change.

---

### `src/ui/components/VerdictBadge.tsx` (component)

**Analog:** `src/App.jsx` lines 46–60 — extract as-is.

**Exact source** (`src/App.jsx` lines 46–60):
```javascript
function VerdictBadge({ verdict }) {
  const map = {
    'listo':   { label: '✓ listo para publicar', color: 'var(--green)',  bg: 'var(--green-bg)' },
    'ajustar': { label: '⚠ necesita ajustes',    color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    'no va':   { label: '✕ no va al feed',        color: 'var(--red)',   bg: 'var(--red-bg)' },
  }
  const v = map[verdict] || map['ajustar']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}
```

**Migration delta:** Add prop type `{ verdict: Verdict }` using the domain entity type. Export the component.

---

### `src/ui/components/ScoreBar.tsx` (component)

**Analog:** `src/App.jsx` lines 62–79 — extract as-is.

**Exact source** (`src/App.jsx` lines 62–79):
```javascript
function ScoreBar({ label, score }) {
  const [num] = score.split('/')
  const pct = (parseInt(num) / 10) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: 11 }}>
        <span>{label}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{score}</span>
      </div>
      <div style={{ height: 2, background: 'var(--bg-3)', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 1,
          background: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}
```

**Migration delta:** Add prop type `{ label: string; score: string }`. Export the component.

---

### `src/ui/components/Spinner.tsx` (component)

**Analog:** `src/App.jsx` lines 81–91 — extract as-is.

**Migration delta:** No props. Export the component. The `@keyframes spin` `<style>` tag currently lives in the root `App` JSX (line 312) — move it to `index.css` or keep it in `Spinner.tsx`.

---

### `src/ui/hooks/useAIProvider.ts` (hook, request-response)

**Analog:** `src/App.jsx` — `callAPI`, `runAnalyze`, `runCaption` functions (lines 137–244).

**Loading pattern** (from RESEARCH.md Pattern 5 — Claude's Discretion):
```typescript
// src/ui/hooks/useAIProvider.ts
import postAdvisorPrompt from '@prompts/post-advisor.md?raw'
import captionPrompt from '@prompts/caption-generator.md?raw'
import strategyPrompt from '@prompts/strategy.md?raw'
```

**State management pattern** (`src/App.jsx` lines 94–103):
```javascript
const [loading, setLoading] = useState(false)
const [result, setResult]   = useState(null)
const [error, setError]     = useState(null)
```

**Error handling pattern** (`src/App.jsx` lines 216–244):
```javascript
const runAnalyze = async () => {
  if (!image) return
  setLoading(true); setResult(null); setError(null)
  try {
    const parsed = await callAPI(STRATEGY, userText)
    setResult({ type: 'analyze', data: parsed })
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

**Migration delta:** Replace `callAPI` (Gemini direct fetch) with the `AIProviderFactory` + use case pattern. The hook reads `config.yaml` via `?raw` import at build time to select provider.

---

### `src/ui/pages/AnalyzePage.tsx` and `src/ui/pages/CaptionPage.tsx` (components)

**Analog:** `src/App.jsx` — tab sections at lines 358–409.

**Inline style pattern** (`src/App.jsx` lines 246–308) — copy the `s` object pattern:
```javascript
const s = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  tab: (active) => ({            // dynamic style: function returning object
    color: active ? 'var(--accent)' : 'var(--text-3)',
  }),
  dropzone: (drag) => ({         // dynamic style: function returning object
    border: `1px dashed ${drag ? 'var(--accent)' : 'var(--border-md)'}`,
  }),
}
```

**Style rule (from CLAUDE.md):** CSS variables for all design tokens (`var(--accent)`, `var(--bg-2)`, etc.) — never raw hex in inline styles.

---

### `src/main.tsx` (entry, rename from `src/main.jsx`)

**Analog:** `src/main.jsx` — exact rename + update import extension.

**Exact source** (`src/main.jsx` lines 1–10):
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Migration delta:** Change `'./App.jsx'` to `'./App.tsx'` (or `'./App'` with `allowImportingTsExtensions: true`). Add `!` to `getElementById` call for strict TypeScript: `document.getElementById('root')!`.

---

## Shared Patterns

### ANSI Color Logging (CLI layer)
**Source:** `scripts/analyze.js` lines 15–20, `scripts/caption.js` lines 14–17, `scripts/doctor.js` lines 17–22
**Apply to:** All `src/cli/*.ts` files
```javascript
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const CYAN   = '\x1b[36m'
const RESET  = '\x1b[0m'
```
**Pattern rule:** Declare at top of each CLI file (SCREAMING_SNAKE_CASE). No shared logger module — raw `console.*` only (CLAUDE.md convention).

### Input Validation + Exit Pattern (CLI layer)
**Source:** `scripts/analyze.js` lines 22–39
**Apply to:** `src/cli/analyze.ts`, `src/cli/caption.ts`
```javascript
if (!photo) {
  console.error(`\n${RED}Uso: npm run analyze -- <foto> ...${RESET}\n`)
  process.exit(1)
}
if (!existsSync(photoPath)) {
  console.error(`\n${RED}No se encuentra la foto: ${photoPath}${RESET}\n`)
  process.exit(1)
}
```
**Pattern rule:** Synchronous, early-return validation. `console.error` + `process.exit(1)`. No thrown errors for CLI validation.

### Prompt + Profile Composition (CLI layer → infrastructure)
**Source:** `scripts/analyze.js` lines 41–44, 66
**Apply to:** `src/infrastructure/ai/AnthropicProvider.ts`, `src/infrastructure/ai/GeminiProvider.ts`
```javascript
const strategy  = readFileSync(resolve(ROOT, 'prompts/strategy.md'), 'utf8')
const systemPmt = readFileSync(resolve(ROOT, 'prompts/post-advisor.md'), 'utf8')
const profile   = readFileSync(resolve(ROOT, 'profile.yaml'), 'utf8')
// Assembly:
system: `${systemPmt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}`
```
**Pattern rule:** Prompt loading moves from CLI scripts into the infrastructure providers or a shared `PromptLoader` utility. The assembly format (`\n\n---\n\n## Estrategia completa\n\n`) is the established format — keep it.

### React Error State Pattern (UI layer)
**Source:** `src/App.jsx` lines 216–244
**Apply to:** `src/ui/hooks/useAIProvider.ts`, all page components
```javascript
setLoading(true); setResult(null); setError(null)
try {
  const parsed = await callAPI(...)
  setResult(parsed)
} catch (e) {
  setError(e.message)      // string only — e.message, not the Error object
} finally {
  setLoading(false)
}
```
**Pattern rule:** Error stored as `string | null` in state. Rendered in a `errBox` div (line 307). No re-thrown errors from UI event handlers.

### JSON Parse + Error Handling (Infrastructure providers)
**Source:** `scripts/analyze.js` lines 79–85
**Apply to:** `src/infrastructure/ai/AnthropicProvider.ts`, `src/infrastructure/ai/GeminiProvider.ts`
```javascript
try {
  const match = raw.match(/\{[\s\S]*\}/)
  parsed = JSON.parse(match ? match[0] : raw)
} catch {
  console.error(`Error al parsear respuesta:\n${raw}`)
  process.exit(1)
}
```
**Migration rule:** Keep the regex extraction `raw.match(/\{[\s\S]*\}/)` as the baseline, but replace `process.exit(1)` with `throw new Error(...)`. Add post-parse shape validation (D-06) — check required fields exist before returning typed object.

### Inline Style Object Pattern (UI components)
**Source:** `src/App.jsx` lines 246–308
**Apply to:** All `src/ui/` component files
```javascript
const s = {
  staticStyle: { padding: '3px 10px', borderRadius: 'var(--radius)' },  // plain object
  dynamicStyle: (active) => ({ color: active ? 'var(--accent)' : 'var(--text-3)' }),  // function
}
```
**Pattern rule:** All design tokens via CSS variables (`var(--*)`). No raw hex values in inline styles. Static styles are plain objects; dynamic styles (based on props/state) are functions returning objects.

---

## No Analog Found

Files with no close codebase match — planner should use RESEARCH.md patterns directly:

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `tsconfig.json` | config | — | No TypeScript in codebase yet |
| `eslint.config.ts` | config | — | No ESLint config in codebase |
| `src/domain/ports/AIProvider.ts` | port/interface | — | No interfaces exist yet; pure TS interface pattern from RESEARCH.md Pattern 1 |
| `src/infrastructure/ai/AIProviderFactory.ts` | utility/factory | — | No factory pattern exists in codebase |
| `src/domain/entities/AuditResult.ts` | model | — | Profile audit is new (scaffold only in Phase 1) |
| `src/application/AuditProfile.ts` | service/use-case | — | Scaffold only; no analog for profile audit |

---

## Metadata

**Analog search scope:** `src/`, `scripts/`, root config files
**Files scanned:** 8 source files (App.jsx, main.jsx, analyze.js, caption.js, doctor.js, vite.config.js, package.json, profile.yaml)
**Pattern extraction date:** 2026-05-26

**Key conventions preserved from existing codebase:**
- Single quotes for all string literals (CLAUDE.md)
- No semicolons in JSX/TSX files; semicolons present in scripts (maintain per-layer)
- 2-space indentation throughout
- SCREAMING_SNAKE_CASE for module-level constants
- camelCase for functions, variables, state; PascalCase for components and interfaces
- CSS variables for all design tokens — never raw hex in inline styles
