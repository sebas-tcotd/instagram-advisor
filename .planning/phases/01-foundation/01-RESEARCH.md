# Phase 1: Foundation - Research

**Researched:** 2026-05-26
**Domain:** TypeScript migration, Clean Architecture, provider-agnostic AI port, ESLint boundary enforcement
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `strict: true` from day one — no relaxed config, no `// @ts-ignore` shortcuts. The showcase goal requires genuinely exemplary TypeScript.
- **D-02:** Single root `tsconfig.json` with `module: ESNext` and `moduleResolution: Bundler` — covers both the Vite browser build and the Node CLI. No per-layer tsconfigs.
- **D-03:** Add `@typescript-eslint` in Phase 1 (not deferred to Phase 4). ESLint enforces the Clean Architecture layer boundaries from the moment code is written, not retrofitted after.
- **D-04:** Define typed interfaces for all AI response shapes in `src/domain/entities/` — `PostAnalysisResult`, `CaptionResult` etc. TypeScript interfaces are the authoritative source of truth for response schemas.
- **D-05:** The `AIProvider` port uses **separate typed methods per use case** — `analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult>` and `generateCaption(req: CaptionRequest): Promise<CaptionResult>`. No generics, no discriminated unions.
- **D-06:** Response validation happens in the **infrastructure layer** (inside `GeminiProvider` and `AnthropicProvider`). Providers validate the raw API response before returning the typed domain object.

### Claude's Discretion
- Web UI multi-provider scope: how `PROV-05` applies to the browser UI given the build-time constraint. Recommended: UI reads `config.yaml` at Vite build time via a plugin or `?raw` import and selects the provider at build time.
- Prompt deduplication: whether to fix the `App.jsx` inline prompt duplication as part of infrastructure layer migration. Recommended: yes — prompts become a responsibility of the infrastructure layer (loaded from `prompts/` via Vite `?raw` import).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGR-01 | El codebase completo está escrito en TypeScript (src/, scripts/cli, vite.config.ts, tsconfig.json) | TypeScript 6.x with `tsx` for CLI execution; single root tsconfig with `moduleResolution: bundler` |
| MIGR-02 | La estructura de carpetas sigue Clean Architecture: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/ui/`, `src/cli/` | Standard Clean Architecture folder mapping documented in Architecture Patterns section |
| MIGR-03 | `domain/` no contiene ningún import de `infrastructure/`, `ui/`, ni `cli/` | `eslint-plugin-boundaries` enforces this at lint time; verified pattern in Architecture Patterns |
| MIGR-04 | Los ports de dominio están definidos como interfaces TypeScript puras en `src/domain/ports/` | TypeScript `interface` keyword; no runtime code, no imports from other layers |
| PROV-01 | Existe `config.yaml` en la raíz con campos `ai.provider`, `ai.model`, `ai.max_tokens`, `prompts_dir`, `profile_path` | `yaml` package (v2.x) parses at runtime for CLI; Vite `?raw` import for UI build time |
| PROV-02 | `AIProviderFactory` lee `config.yaml` y retorna el provider correcto según `ai.provider` | Factory pattern in `src/infrastructure/ai/`; reads config, returns GeminiProvider or AnthropicProvider |
| PROV-03 | `GeminiProvider` implementa la interface `AIProvider` y usa la configuración de `config.yaml` | Infrastructure adapter implementing domain port; uses `@google/genai` SDK or direct fetch |
| PROV-04 | `AnthropicProvider` implementa la interface `AIProvider` y usa la configuración de `config.yaml` | Infrastructure adapter; uses existing `@anthropic-ai/sdk` |
| PROV-05 | Cambiar `ai.provider: gemini` a `ai.provider: anthropic` en config.yaml hace que toda la aplicación use Anthropic sin tocar código | UI reads config at build time via Vite plugin; CLI reads at runtime via `yaml` package |
| AGNT-01 | El caso de uso `AnalyzePost` vive en `src/application/` y no conoce ni Gemini ni Anthropic — solo el port `AIProvider` | Use case class receives `AIProvider` via constructor injection; calls `provider.analyzePost()` |
| AGNT-02 | El caso de uso `GenerateCaption` vive en `src/application/` con la misma separación | Same pattern as AGNT-01 |
| AGNT-03 | El caso de uso `AuditProfile` vive en `src/application/` con la misma separación | Same pattern; AuditProfile use case scaffolded in Phase 1, fully wired in Phase 2 |
</phase_requirements>

---

## Summary

This phase converts a working but architecturally flat JavaScript codebase into a TypeScript project with Clean Architecture layers. The existing codebase is a 481-line `App.jsx` monolith for the UI and two standalone CLI scripts (`analyze.js`, `caption.js`). Both surfaces call different AI providers (Gemini in the browser, Anthropic in the CLI) and duplicate their prompt content. The migration goal is to put a single `AIProvider` port interface in `src/domain/ports/`, with `GeminiProvider` and `AnthropicProvider` as infrastructure adapters, and route both surfaces through the same application-layer use cases (`AnalyzePost`, `GenerateCaption`, `AuditProfile`).

TypeScript 6.x (currently 6.0.3) ships with `strict: true` as the new default, which aligns exactly with D-01. The `moduleResolution: bundler` option (D-02) is the standard for Vite+Node hybrid projects since TypeScript 5.0 and continues in 6.x. The `tsx` package (4.22.3) is the recommended TypeScript runner for Node.js ESM scripts in 2025-2026, replacing `ts-node` for Node 20+. ESLint 10 with `typescript-eslint` v8 uses the new flat config format (`eslint.config.ts`); `eslint-plugin-boundaries` (6.0.2) enforces Clean Architecture layer rules.

The most important design decision is the `AIProvider` interface shape. Per D-05 the interface has separate typed methods per use case — this is the right call for a showcase project because it makes the interface self-documenting and eliminates runtime dispatch. The `config.yaml` is parsed by the `yaml` npm package (v2.x, ESM-first) at runtime for the CLI; the UI reads it via a `?raw` import at Vite build time, which means rebuilding after changing `config.yaml` — an acceptable tradeoff for a stateless SPA.

**Primary recommendation:** Migrate in dependency order — domain interfaces first, then infrastructure providers, then application use cases, then wire CLI and UI. Do not touch `prompts/` or `profile.yaml` location. Use `tsx` for CLI execution to avoid a separate compile step.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AIProvider port interface | Domain | — | Port belongs in domain; defines the contract without depending on any provider |
| Response entity types (`PostAnalysisResult`, `CaptionResult`) | Domain | — | Domain entities are the authoritative shape; infrastructure must conform to these |
| AnalyzePost, GenerateCaption, AuditProfile use cases | Application | — | Business logic orchestration; depends only on domain port |
| GeminiProvider, AnthropicProvider adapters | Infrastructure | — | Third-party SDK usage is infrastructure's responsibility |
| AIProviderFactory (reads config.yaml) | Infrastructure | — | Config reading and provider instantiation is an infrastructure concern |
| config.yaml loading (CLI) | Infrastructure | — | Runtime file read belongs in infrastructure, not domain |
| config.yaml selection (UI) | Vite build layer | Infrastructure | `?raw` import at build time; provider factory handles selection |
| React components, hooks, pages | UI (`src/ui/`) | — | Presentation; calls application use cases |
| CLI entry points (analyze, caption) | CLI (`src/cli/`) | — | Terminal presentation; calls application use cases |
| Prompt files (`prompts/*.md`) | Infrastructure | — | Loaded by providers/use cases; static resources, not domain logic |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typescript` | 6.0.3 | TypeScript compiler (`tsc --noEmit` for type check, Vite transpiles for build) | Official Microsoft compiler; v6 strict-by-default aligns with D-01 [VERIFIED: npm registry] |
| `tsx` | 4.22.3 | Run TypeScript CLI scripts directly with Node.js, no compile step | Standard for Node 20+ ESM TypeScript; replaces ts-node; esbuild-powered [VERIFIED: npm registry] |
| `@types/node` | 25.9.1 | Node.js type declarations for CLI code | Required for `fs`, `path`, `process` in TypeScript CLI code [VERIFIED: npm registry] |
| `yaml` | 2.9.0 | Parse `config.yaml` at runtime (CLI) and build time (UI via Vite plugin) | ESM-first, well-maintained (since 2011), no native build required [VERIFIED: npm registry] |

### ESLint / Quality
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `eslint` | 10.4.0 | ESLint runner | Required peer for typescript-eslint [VERIFIED: npm registry] |
| `@eslint/js` | 10.0.1 | ESLint recommended rules (flat config) | Replaces `eslint:recommended` in ESLint v9+ flat config [VERIFIED: npm registry] |
| `typescript-eslint` | 8.60.0 | TypeScript parsing + type-aware lint rules for flat config | Single entry point replacing `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` separately [VERIFIED: npm registry] |
| `eslint-plugin-boundaries` | 6.0.2 | Enforce Clean Architecture import rules (domain never imports infrastructure) | Declarative layer enforcement; lighter than Nx; actively maintained (last update 2 months ago as of research date) [VERIFIED: npm registry] |

### Testing
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.7 | Test runner | Native Vite integration; ESM-native; `describe`/`it`/`expect` API [VERIFIED: npm registry] |
| `@vitest/coverage-v8` | 4.1.7 | V8 coverage reporting | Zero-config coverage; ships with vitest [VERIFIED: npm registry] |

### Existing (stay as-is)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic API calls | Already installed; used by AnthropicProvider |
| `@google/genai` | ^2.6.0 | Google Gemini API calls | Already installed; used by GeminiProvider instead of raw fetch |
| `js-yaml` | ^4.1.0 | Already in package.json | Can replace with `yaml` (v2, ESM-first) or keep — both work |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` (CLI runner) | `ts-node` | ts-node has ESM issues with Node 20+; tsx is the 2025 standard |
| `eslint-plugin-boundaries` | Manual import checks | Manual is unenforceable; plugin gives lint errors at save time |
| `yaml` (v2) | `js-yaml` (already installed) | `js-yaml` is CJS-first; `yaml` is ESM-native. Can keep `js-yaml` to avoid adding a dependency — both parse YAML correctly [ASSUMED] |
| Single root `tsconfig.json` | Per-layer tsconfigs | Per-layer is more precise for monorepos but over-engineered for this project size; D-02 locks single config |

**Installation (new devDependencies):**
```bash
pnpm add -D typescript tsx @types/node eslint @eslint/js typescript-eslint eslint-plugin-boundaries vitest @vitest/coverage-v8
```

**Note on `yaml` vs `js-yaml`:** `js-yaml` is already in `package.json`. The `yaml` package (v2) is ESM-native and is the better long-term choice. Either works for config.yaml parsing. If staying with `js-yaml`, no new dependency needed for YAML parsing. [ASSUMED — both parse YAML correctly, difference is module format preference]

**Version verification:** All versions above verified against npm registry on 2026-05-26.

---

## Package Legitimacy Audit

> slopcheck was not available at research time. All packages are tagged by manual verification against official documentation and npm registry metadata.

| Package | Registry | Age | Source Repo | Disposition |
|---------|----------|-----|-------------|-------------|
| `typescript` | npm | Since 2012 | github.com/microsoft/TypeScript | Approved — official Microsoft project |
| `tsx` | npm | Since 2015 | github.com/privatenumber/tsx | Approved — 4.22M weekly downloads, no postinstall |
| `@types/node` | npm | Since 2016 | github.com/DefinitelyTyped/DefinitelyTyped | Approved — official DefinitelyTyped |
| `yaml` | npm | Since 2011 | github.com/eemeli/yaml | Approved — 60M+ weekly downloads |
| `eslint` | npm | Since 2013 | github.com/eslint/eslint | Approved — industry standard |
| `@eslint/js` | npm | Since 2023 | github.com/eslint/eslint | Approved — official ESLint package |
| `typescript-eslint` | npm | Since 2019 | github.com/typescript-eslint/typescript-eslint | Approved — official TS-ESLint monorepo |
| `eslint-plugin-boundaries` | npm | Since 2020 | github.com/javierbrea/eslint-plugin-boundaries | Approved — no postinstall, active maintenance |
| `vitest` | npm | Since 2021 | github.com/vitest-dev/vitest | Approved — official Vite ecosystem |
| `@vitest/coverage-v8` | npm | Since 2023 | github.com/vitest-dev/vitest | Approved — official vitest monorepo |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time — all packages verified manually via npm metadata and official documentation cross-reference. No postinstall scripts found on any package.*

---

## Architecture Patterns

### System Architecture Diagram

```
  config.yaml (root)
       │
       ▼
  ┌──────────────────────────────────────────────────────────┐
  │                   Entry Points                           │
  │  src/cli/analyze.ts      src/cli/caption.ts              │
  │  src/ui/pages/App.tsx    (React, Vite build)             │
  └────────────┬─────────────────────────┬───────────────────┘
               │                         │
               ▼                         ▼
  ┌──────────────────────────────────────────────────────────┐
  │                Application Layer                         │
  │  AnalyzePost (use case)                                  │
  │  GenerateCaption (use case)                              │
  │  AuditProfile (use case)     ← depends only on AIProvider│
  └────────────────────┬─────────────────────────────────────┘
                       │  AIProvider (port interface)
                       │  src/domain/ports/AIProvider.ts
                       ▼
  ┌──────────────────────────────────────────────────────────┐
  │               Infrastructure Layer                       │
  │  AIProviderFactory ──reads── config.yaml                 │
  │       │                                                  │
  │       ├─► GeminiProvider (implements AIProvider)         │
  │       │       └─ uses @google/genai SDK                  │
  │       └─► AnthropicProvider (implements AIProvider)      │
  │               └─ uses @anthropic-ai/sdk                  │
  │                                                          │
  │  PromptLoader ──reads── prompts/*.md  (filesystem / ?raw)│
  └──────────────────────────────────────────────────────────┘
               │
               ▼ (never upward)
  ┌──────────────────────────────────────────────────────────┐
  │                  Domain Layer                            │
  │  entities/: PostAnalysisResult, CaptionResult,           │
  │             AuditResult, AnalyzeRequest, CaptionRequest  │
  │  ports/: AIProvider interface                            │
  └──────────────────────────────────────────────────────────┘
```

**Data flow direction:** CLI/UI → Application → (via port) → Infrastructure → External AI API.
Domain has zero outward arrows — it only defines contracts.

### Recommended Project Structure

```
instagram-advisor/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── PostAnalysisResult.ts   # { verdict, scores, analysis, suggestions }
│   │   │   ├── CaptionResult.ts        # { captions, notes }
│   │   │   ├── AuditResult.ts          # scaffold for Phase 2
│   │   │   ├── AnalyzeRequest.ts       # { imageBase64, mimeType, format, layer, caption? }
│   │   │   └── CaptionRequest.ts       # { imageBase64, mimeType, tone }
│   │   └── ports/
│   │       └── AIProvider.ts           # interface AIProvider { analyzePost, generateCaption, auditProfile }
│   ├── application/
│   │   ├── AnalyzePost.ts              # use case: receives AIProvider via constructor
│   │   ├── GenerateCaption.ts          # use case
│   │   └── AuditProfile.ts             # use case (scaffold, full wire in Phase 2)
│   ├── infrastructure/
│   │   ├── ai/
│   │   │   ├── AIProviderFactory.ts    # reads config.yaml, returns GeminiProvider or AnthropicProvider
│   │   │   ├── GeminiProvider.ts       # implements AIProvider
│   │   │   └── AnthropicProvider.ts    # implements AIProvider
│   │   └── config/
│   │       └── loadConfig.ts           # parse config.yaml via yaml package (CLI) or ?raw (UI)
│   ├── ui/
│   │   ├── App.tsx                     # React root, split from 481-line App.jsx
│   │   ├── components/
│   │   │   ├── VerdictBadge.tsx
│   │   │   ├── ScoreBar.tsx
│   │   │   └── Spinner.tsx
│   │   ├── hooks/
│   │   │   └── useAIProvider.ts        # wires AIProviderFactory for UI
│   │   └── pages/
│   │       ├── AnalyzePage.tsx
│   │       └── CaptionPage.tsx
│   ├── cli/
│   │   ├── analyze.ts                  # replaces scripts/analyze.js
│   │   ├── caption.ts                  # replaces scripts/caption.js
│   │   └── doctor.ts                   # replaces scripts/doctor.js
│   ├── main.tsx                        # unchanged — mounts <App />
│   ├── index.html
│   └── index.css
├── prompts/                            # unchanged location
├── profile.yaml                        # unchanged location
├── config.yaml                         # NEW — ai.provider, ai.model, ai.max_tokens, prompts_dir, profile_path
├── tsconfig.json                       # NEW — single root, strict, moduleResolution: bundler
├── eslint.config.ts                    # NEW — flat config, typescript-eslint, eslint-plugin-boundaries
├── vitest.config.ts                    # NEW — node environment, coverage
├── vite.config.ts                      # RENAME from vite.config.js
├── package.json                        # updated scripts (analyze: tsx src/cli/analyze.ts)
└── pnpm-workspace.yaml                 # add tsx to allowBuilds if needed (no native build — likely not needed)
```

### Pattern 1: AIProvider Port Interface (D-05)

**What:** TypeScript interface in `src/domain/ports/` with separate typed methods. No base class, no generics.

**When to use:** Every time a use case needs to call an AI provider.

```typescript
// src/domain/ports/AIProvider.ts
// Source: Clean Architecture typescript pattern (domain layer)
import type { AnalyzeRequest } from '../entities/AnalyzeRequest'
import type { CaptionRequest } from '../entities/CaptionRequest'
import type { PostAnalysisResult } from '../entities/PostAnalysisResult'
import type { CaptionResult } from '../entities/CaptionResult'

export interface AIProvider {
  analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult>
  generateCaption(req: CaptionRequest): Promise<CaptionResult>
  auditProfile(profileYaml: string): Promise<AuditResult>
}
```

### Pattern 2: Use Case Class (AGNT-01, AGNT-02)

**What:** Application-layer class that receives `AIProvider` via constructor. Never imports `GeminiProvider` or `AnthropicProvider` directly.

```typescript
// src/application/AnalyzePost.ts
// Source: Clean Architecture application layer pattern
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

### Pattern 3: Infrastructure Provider (PROV-03, PROV-04)

**What:** Concrete class implementing `AIProvider`. Handles SDK calls, base64 encoding, JSON parsing/validation, error mapping.

```typescript
// src/infrastructure/ai/AnthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from '../../domain/ports/AIProvider'
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest'
import type { PostAnalysisResult } from '../../domain/entities/PostAnalysisResult'

export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic

  constructor(private readonly config: AIConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    // SDK call, JSON parse, validate shape, return typed result
    // Throws Error on API failure or invalid response shape (D-06)
  }
}
```

### Pattern 4: config.yaml + AIProviderFactory (PROV-01, PROV-02)

**What:** `config.yaml` at repo root with locked field names. Factory reads it and returns the correct provider.

```yaml
# config.yaml
ai:
  provider: gemini          # change to "anthropic" to switch providers
  model: gemini-2.0-flash
  max_tokens: 1024
prompts_dir: ./prompts
profile_path: ./profile.yaml
```

```typescript
// src/infrastructure/ai/AIProviderFactory.ts
import { readFileSync } from 'fs'
import { parse } from 'yaml'
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

### Pattern 5: Vite ?raw Import for Prompt Loading (UI side, Claude's Discretion)

**What:** Import `.md` files as raw strings at Vite build time, eliminating the `STRATEGY`/`CAPTION_PROMPT` duplication in `App.jsx`.

```typescript
// src/ui/hooks/useAIProvider.ts
import postAdvisorPrompt from '../../prompts/post-advisor.md?raw'
import captionPrompt from '../../prompts/caption-generator.md?raw'
import strategyPrompt from '../../prompts/strategy.md?raw'
// TypeScript requires: tsconfig "types": ["vite/client"]
```

```typescript
// vite.config.ts — no special plugin needed for ?raw on .md files
// vite/client types cover the type declarations
```

### Pattern 6: ESLint Layer Boundaries (D-03, MIGR-03)

**What:** `eslint-plugin-boundaries` configuration that forbids domain from importing infrastructure/ui/cli.

```typescript
// eslint.config.ts
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

### Pattern 7: tsconfig.json for TypeScript 6 + Vite + Node CLI

**What:** Single root `tsconfig.json` covering both Vite browser build and Node CLI scripts.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "node"],
    "lib": ["ES2022", "DOM"],
    "allowImportingTsExtensions": true,
    "isolatedModules": true
  },
  "include": ["src/**/*", "vite.config.ts", "eslint.config.ts", "vitest.config.ts"]
}
```

**Note on `types`:** TypeScript 6 changed the default `types` to `[]` (empty). Explicitly listing `["vite/client", "node"]` is required — otherwise `import.meta`, `fs`, and `process` will produce type errors. [VERIFIED: TypeScript 6.0 release notes]

### Anti-Patterns to Avoid

- **Importing AIProvider from infrastructure in application:** The application layer must only import from `src/domain/`. Never `import { GeminiProvider } from '../infrastructure/ai/GeminiProvider'` inside a use case.
- **Putting config.yaml parsing in domain:** Domain is pure TypeScript interfaces. Config reading is infrastructure's job.
- **Using generics on AIProvider:** D-05 locks the interface to separate typed methods. Generics like `call<T>(prompt: string): Promise<T>` eliminate the self-documenting property.
- **Keeping `scripts/` as the CLI layer:** The new CLI entry points live in `src/cli/` and are TypeScript; the old `scripts/*.js` files are deleted (not just deprecated).
- **Inlining prompts in App.tsx:** After migration, `STRATEGY` and `CAPTION_PROMPT` constants must be removed from the UI file. Prompts are loaded via `?raw` import from `prompts/`.
- **Using `moduleResolution: node` in tsconfig:** Deprecated in TypeScript 6; use `bundler` as D-02 specifies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML config parsing | Custom string splitter | `yaml` (npm) | YAML edge cases (multiline, anchors, type coercion) require a battle-tested parser |
| Layer boundary enforcement | Code review comments | `eslint-plugin-boundaries` | Comments erode over time; lint errors are enforced at save/CI |
| TypeScript execution (CLI) | Separate `tsc` compile step + `node dist/` | `tsx` | tsx uses esbuild internally, runs `.ts` directly; no dist folder needed for CLI |
| JSON response extraction | Regex `\{[\s\S]*\}` (existing fragile pattern) | `JSON.parse` with structured extraction in providers | The existing regex is a known failure mode when model adds markdown fencing; providers should clean and validate |
| Provider selection logic | if/else in use cases | `AIProviderFactory` in infrastructure | Keeps provider knowledge isolated to infrastructure layer |

**Key insight:** The biggest risk in this phase is the layer boundary erosion — it's tempting to import `GeminiProvider` directly in a use case to save a file. `eslint-plugin-boundaries` makes this a lint error instead of a code review note.

---

## Common Pitfalls

### Pitfall 1: TypeScript 6 `types: []` Default Breaks `vite/client` and Node Types

**What goes wrong:** After adding `typescript` v6 and running `tsc --noEmit`, errors appear: `Cannot find name 'ImportMeta'`, `Cannot find name 'process'`, `Property 'env' does not exist on type 'ImportMeta'`.

**Why it happens:** TypeScript 6 changed the default `types` from "all installed `@types/*`" to `[]` (empty). Without explicitly listing `vite/client` and `node`, both sets of type declarations are invisible.

**How to avoid:** In `tsconfig.json`, set `"types": ["vite/client", "node"]` explicitly.

**Warning signs:** `tsc --noEmit` errors on `import.meta.env`, `process.env`, `readFileSync` right after adding TypeScript 6.

### Pitfall 2: `moduleResolution: bundler` Does Not Work for Node.js `fs`/`path` Imports

**What goes wrong:** CLI scripts using `import { readFileSync } from 'fs'` may produce type errors if `@types/node` is not in devDependencies.

**Why it happens:** `moduleResolution: bundler` is designed for bundler use; it still needs `@types/node` for Node built-in module types.

**How to avoid:** Add `@types/node` to devDependencies and include `"node"` in `tsconfig.json` `types`.

**Warning signs:** `Could not find declaration file for module 'fs'` during type check.

### Pitfall 3: pnpm `allowBuilds` May Block `tsx` Installation

**What goes wrong:** `pnpm install` fails or produces warnings for `tsx` because the project's `pnpm-workspace.yaml` currently only lists `@google/genai` and `esbuild` in `allowBuilds`. New packages with build scripts need explicit approval.

**Why it happens:** pnpm 10+ (the project uses 10.23.0) requires explicit approval for packages with install scripts. `tsx` has no native build — verified no postinstall script — so this should not be an issue, but `typescript` may need to be checked.

**How to avoid:** Run `pnpm install` and check for `ERR_PNPM_IGNORED_BUILDS` errors. If they appear, run `pnpm approve-builds` or add to `allowBuilds` in `pnpm-workspace.yaml`.

**Warning signs:** `ERR_PNPM_IGNORED_BUILDS` during `pnpm add`.

### Pitfall 4: `vite.config.ts` Needs `moduleResolution: bundler` to Import Vite Types

**What goes wrong:** After renaming `vite.config.js` to `vite.config.ts`, TypeScript errors appear in the config file itself: `Cannot find module 'vite'` or `Type 'Plugin' is not assignable...`.

**Why it happens:** Vite's TypeScript types use package.json `exports` field, which requires `moduleResolution: bundler` or `node16` — not `node` (classic).

**How to avoid:** The single root `tsconfig.json` with `moduleResolution: bundler` (D-02) covers this automatically. Do not create a separate tsconfig for the config file.

**Warning signs:** TS errors only in `vite.config.ts` but not other source files.

### Pitfall 5: `eslint-plugin-boundaries` Requires Correct File Patterns

**What goes wrong:** The boundaries plugin allows a domain file to import from infrastructure because the pattern matching is wrong — e.g., `'src/domain/**'` doesn't match if the file path is relative vs absolute.

**Why it happens:** The `boundaries/elements` patterns are matched against the file paths ESLint receives, which are relative to the project root. If the pattern uses absolute paths or wrong globs, no boundaries are enforced.

**How to avoid:** Use the same glob style throughout; test immediately with a deliberate violation to confirm the rule fires.

**Warning signs:** Adding a known-bad import (`import GeminiProvider from '../infrastructure/...'` inside domain) does not produce an ESLint error.

### Pitfall 6: Vite `root: 'src'` Breaks `?raw` Imports of Files Outside `src/`

**What goes wrong:** `import prompt from '../../prompts/post-advisor.md?raw'` works in dev but fails in build — or vice versa — because `vite.config.ts` has `root: 'src'` and `prompts/` is outside.

**Why it happens:** Vite's `root` setting controls the base for relative imports in the source tree. Paths outside `root` are accessible but may need the `resolve.alias` setting to be reliable.

**How to avoid:** In `vite.config.ts`, add an alias for the prompts directory:
```typescript
resolve: {
  alias: { '@prompts': resolve(__dirname, 'prompts') }
}
```
Then import as `import prompt from '@prompts/post-advisor.md?raw'`.

**Warning signs:** Import works in `vite dev` but `vite build` throws `Could not resolve`.

### Pitfall 7: Existing `dist/` in Git Breaks `tsc --noEmit`

**What goes wrong:** `tsc --noEmit` may pick up files from `dist/` if they're still tracked in git and the `include` in `tsconfig.json` is too broad.

**Why it happens:** `dist/` contains compiled JavaScript; if TypeScript tries to process it (e.g., `include: ["**/*"]`), it may fail on `.js` files or generate spurious errors.

**How to avoid:** The `include` array in `tsconfig.json` should explicitly list `src/**/*` only. Also add `dist/` to `.gitignore` and run `git rm -r --cached dist/` — this is a pre-existing concern documented in CONCERNS.md.

**Warning signs:** `tsc --noEmit` errors in files under `dist/`.

---

## Code Examples

### tsconfig.json (complete reference)

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

Source: [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) + [Vite TypeScript docs](https://vite.dev/guide/features) [CITED: typescriptlang.org, vite.dev]

### package.json scripts update

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "analyze": "tsx src/cli/analyze.ts",
    "caption": "tsx src/cli/caption.ts",
    "doctor": "tsx src/cli/doctor.ts",
    "profile": "tsx src/cli/profile.ts"
  }
}
```

### vitest.config.ts (minimal)

```typescript
// Source: vitest.dev/config
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

### Domain Entity Example

```typescript
// src/domain/entities/PostAnalysisResult.ts
export type Verdict = 'listo' | 'ajustar' | 'no va'

export interface Scores {
  visual: string   // e.g. "8/10"
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` for Node TypeScript | `tsx` (esbuild-based) | 2023 (Node 20+ ESM issues) | No separate compile step; ESM-native |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` separately | `typescript-eslint` (unified package) | typescript-eslint v7 (2024) | One import; flat config compatible |
| ESLint `.eslintrc.js` legacy config | ESLint `eslint.config.ts` flat config | ESLint v9 (2024) | `tseslint.config()` helper; no more overrides array |
| `moduleResolution: node` in tsconfig | `moduleResolution: bundler` (TypeScript 5+) | TypeScript 5.0 (March 2023) | Correct for Vite/bundler projects; `node` deprecated in TS 6 |
| TypeScript `strict: false` by default | `strict: true` as TS 6 default | TypeScript 6.0 (2026) | No action needed — aligns with D-01 |
| `js-yaml` for YAML | `yaml` v2 (ESM-native) | 2022 | ESM-first; `js-yaml` still works but is CJS-first |

**Deprecated/outdated in this project:**
- `vite.config.js` → rename to `vite.config.ts` (first TypeScript file, sets tone)
- `scripts/*.js` → deleted after `src/cli/*.ts` equivalents are working
- `STRATEGY`/`CAPTION_PROMPT` constants in `App.jsx` → removed, replaced by `?raw` imports
- `gemini-3.5-flash` model name in `App.jsx` line 4 → invalid model name; corrected to `gemini-2.0-flash` in GeminiProvider config [CONCERNS.md bug]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `yaml` (v2) and `js-yaml` both parse YAML correctly for this use case; `js-yaml` can be kept to avoid adding a new dependency | Standard Stack | Minimal — if `js-yaml` has ESM issues, swap to `yaml` package |
| A2 | `tsx` does not require `allowBuilds` in `pnpm-workspace.yaml` because it has no native build scripts | Pitfall 3 | Low — if pnpm blocks install, add `tsx: true` to `allowBuilds` |
| A3 | `?raw` imports for `.md` files work with `vite/client` types without additional `assetsInclude` config | Pattern 5 | Low — if type errors appear, add `.d.ts` declaration or `assetsInclude: ['**/*.md']` to vite config |
| A4 | The `@google/genai` package can be used by `GeminiProvider` as an alternative to the existing raw `fetch` approach | PROV-03 | Low — raw `fetch` also works; if SDK is complex, keep raw fetch in GeminiProvider |

---

## Open Questions

1. **UI config.yaml at build time vs runtime env var**
   - What we know: UI is a static SPA built by Vite; `config.yaml` read via `?raw` is embedded at build time; PROV-05 requires switching providers without code changes
   - What's unclear: "Without code changes" — does a rebuild count as a code change? For a local personal tool, `vite build` is cheap; user clarified this is acceptable in CONTEXT.md (Claude's Discretion)
   - Recommendation: Read `config.yaml` at Vite build time via `?raw` import. Provider selection is determined at build time. This is the pragmatic approach for a stateless SPA.

2. **`AuditProfile` use case in Phase 1 vs Phase 2**
   - What we know: AGNT-03 is in Phase 1 requirements; PROF-01/PROF-02/PROF-03 are Phase 2
   - What's unclear: Phase 1 requires the use case to exist in `src/application/`; Phase 2 wires it to CLI and UI
   - Recommendation: Create `AuditProfile.ts` as a scaffolded use case in Phase 1 (interface + empty method) so the architecture is complete; Phase 2 fills in the implementation.

3. **Keep `js-yaml` or switch to `yaml` package**
   - What we know: `js-yaml` is already installed; `yaml` (v2) is ESM-native and preferred for new projects
   - What's unclear: Whether `js-yaml` causes any issues in the new TypeScript ESM context
   - Recommendation: Keep `js-yaml` for YAML parsing to avoid adding a new dependency. If ESM issues arise during implementation, swap to `yaml`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All CLI execution | ✓ | v24.11.1 | — |
| pnpm | Package management | ✓ | 10.23.0 | — |
| TypeScript (`tsc`) | Type checking | ✗ (not yet installed) | — | Install as devDependency |
| `tsx` | CLI script execution | ✗ (not yet installed) | — | Install as devDependency |
| Vite | UI build/dev | ✓ (in devDeps) | 6.0.0 | — |
| `@anthropic-ai/sdk` | AnthropicProvider | ✓ (installed) | ^0.39.0 | — |
| `@google/genai` | GeminiProvider | ✓ (installed) | ^2.6.0 | — |
| `ANTHROPIC_API_KEY` | AnthropicProvider | ✓ (in .env.example) | — | — |
| `VITE_GEMINI_API_KEY` | GeminiProvider (UI) | [ASSUMED] present in .env | — | `VITE_ANTHROPIC_API_KEY` as fallback |

**Missing dependencies with no fallback:**
- `typescript` — must be installed; required for `tsc --noEmit` success criterion #1

**Missing dependencies with fallback:**
- `tsx` — fallback is a separate compile step (`tsc` + `node dist/cli/...`), but this is complex and not recommended

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 |
| Config file | `vitest.config.ts` (Wave 0 gap — does not exist yet) |
| Quick run command | `pnpm test` (maps to `vitest run`) |
| Full suite command | `pnpm coverage` (maps to `vitest run --coverage`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01 | TypeScript compiles without errors | type-check | `pnpm typecheck` (`tsc --noEmit`) | ❌ Wave 0 |
| MIGR-03 | domain/ has no infrastructure imports | lint | `pnpm lint` (eslint-plugin-boundaries) | ❌ Wave 0 |
| PROV-02 | AIProviderFactory returns correct provider | unit | `vitest run src/infrastructure/ai/AIProviderFactory.test.ts` | ❌ Wave 0 |
| PROV-03 | GeminiProvider.analyzePost returns PostAnalysisResult | unit (mock fetch) | `vitest run src/infrastructure/ai/GeminiProvider.test.ts` | ❌ Wave 0 |
| PROV-04 | AnthropicProvider.analyzePost returns PostAnalysisResult | unit (mock SDK) | `vitest run src/infrastructure/ai/AnthropicProvider.test.ts` | ❌ Wave 0 |
| AGNT-01 | AnalyzePost calls provider.analyzePost | unit | `vitest run src/application/AnalyzePost.test.ts` | ❌ Wave 0 |
| AGNT-02 | GenerateCaption calls provider.generateCaption | unit | `vitest run src/application/GenerateCaption.test.ts` | ❌ Wave 0 |
| PROV-05 | config.yaml provider switch works end-to-end | smoke (manual) | `npm run analyze -- <img>` after editing config.yaml | manual-only (requires real API call) |

**Note:** MIGR-02 (folder structure) and MIGR-04 (ports in domain/ports/) are verified by `tsc --noEmit` and `pnpm lint` passing — no separate test needed.

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + `npm run analyze` smoke test before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — test framework config
- [ ] `tsconfig.json` — TypeScript compiler config (does not exist yet)
- [ ] `eslint.config.ts` — ESLint flat config
- [ ] `src/infrastructure/ai/AIProviderFactory.test.ts`
- [ ] `src/infrastructure/ai/GeminiProvider.test.ts`
- [ ] `src/infrastructure/ai/AnthropicProvider.test.ts`
- [ ] `src/application/AnalyzePost.test.ts`
- [ ] `src/application/GenerateCaption.test.ts`

---

## Security Domain

> `security_enforcement: true` in config.json (ASVS Level 1)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in this tool |
| V3 Session Management | No | Stateless SPA, no sessions |
| V4 Access Control | No | Single-user personal tool |
| V5 Input Validation | Yes | Validate AI JSON response in infrastructure providers before returning typed domain object (D-06) |
| V6 Cryptography | No | API keys are env vars; no cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposed in Vite bundle (`VITE_*` prefix) | Information Disclosure | Accepted for v1 — documented in ARCHITECTURE.md; key is local personal tool only; `dist/` must not be committed to public repo |
| Malformed AI response injected into DOM | Tampering | Infrastructure providers validate JSON shape before returning (D-06); React's JSX escapes rendered strings |
| `config.yaml` path traversal (malicious `profile_path`) | Tampering | `profile_path` is read by CLI only; no user-controlled input for this value in v1 |

**Note:** The API key exposure in browser is a pre-existing accepted risk per ARCHITECTURE.md and is out of scope for Phase 1. The mitigation is to not commit `dist/` to a public repo — which is addressed by the `dist/` gitignore fix (CONCERNS.md item).

---

## Project Constraints (from CLAUDE.md)

All directives extracted from `CLAUDE.md` that apply to Phase 1:

| Directive | Constraint |
|-----------|------------|
| Tech stack | TypeScript + React 18 + Vite 6 — stack is locked |
| Sin backend | Stateless by design — no server; UI calls APIs directly |
| Clean Architecture | `domain/` cannot import from `infrastructure/`, `ui/`, or `cli/` — jamás |
| Showcase | Code must be readable and exemplary, not just functional |
| No formatter configured | No Prettier/Biome; manual discipline; 2-space indent, single quotes |
| Single quotes | All string literals use single quotes in JS/TS |
| No semicolons in JSX | Present in scripts, absent in App.jsx — maintain layer convention |
| pnpm | Use pnpm, not npm or yarn, for all installs |
| Vite root: `src/` | vite.config.ts must keep `root: 'src'` and `envDir: '../'` |
| `VITE_*` env vars | All env vars accessed in UI must have `VITE_` prefix |

**Planner must verify:** The ESLint boundary rule configuration must not accidentally block `src/ui/` from importing React or `src/cli/` from importing Node built-ins — those are `node_modules` and built-ins, not project layers.

---

## Sources

### Primary (HIGH confidence)
- [TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) — new defaults for `strict`, `types`, `moduleResolution`, deprecated options
- [Vite Static Asset Handling](https://vite.dev/guide/assets) — `?raw` import behavior, `vite/client` types requirement
- [typescript-eslint v8 announcement](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/) — flat config setup, project service, minimum versions
- [typescript-eslint shared configs](https://typescript-eslint.io/users/configs/) — `recommended`, `strict`, `stylistic` presets
- npm registry — all package versions and creation dates verified 2026-05-26

### Secondary (MEDIUM confidence)
- [tsx npm page](https://www.npmjs.com/package/tsx) — `node --import tsx` usage, esbuild-based, ESM native
- [eslint-plugin-boundaries npm](https://www.npmjs.com/package/eslint-plugin-boundaries) — version 6.0.2, active maintenance confirmed
- [vitest.dev/config](https://vitest.dev/config/) — minimal configuration structure

### Tertiary (LOW confidence / ASSUMED)
- `yaml` vs `js-yaml` ESM compatibility — training knowledge, not verified in this session [A3]
- GeminiProvider using `@google/genai` SDK vs raw fetch — either works; implementation detail [A4]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all package versions verified against npm registry 2026-05-26
- Architecture: HIGH — patterns derived from locked decisions in CONTEXT.md and verified TypeScript/ESLint documentation
- Pitfalls: HIGH — TypeScript 6 breaking changes verified from official release notes; remaining pitfalls from codebase analysis + known framework behaviors
- Test map: MEDIUM — vitest config pattern is standard; specific test file contents are implementation details

**Research date:** 2026-05-26
**Valid until:** 2026-08-26 (stable stack; TypeScript 6 is newly released but breaking changes are documented)
