# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 1-Foundation
**Areas discussed:** TypeScript strictness, Domain entity typing depth

---

## TypeScript Strictness

### Q1: Strictness level

| Option | Description | Selected |
|--------|-------------|----------|
| strict: true from day one | All strict flags on — noImplicitAny, strictNullChecks, etc. Makes migration harder but result is genuinely exemplary TypeScript | ✓ |
| Relaxed first (strict: false, noImplicitAny: true) | Faster to get tsc --noEmit green but risks any creeping in | |
| Strictest possible (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes) | Maximum rigor, hardest to migrate to | |

**User's choice:** `strict: true` from day one
**Notes:** Consistent with the showcase goal.

---

### Q2: ESLint

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript only — tsc --noEmit is enough for Phase 1 | Keep Phase 1 focused on structural migration | |
| Add @typescript-eslint now | Lint from day one catches import-from-wrong-layer violations immediately | ✓ |
| You decide | Claude picks based on showcase goal | |

**User's choice:** Add `@typescript-eslint` in Phase 1
**Notes:** Sets up tooling before code is written rather than retrofitting.

---

### Q3: tsconfig topology

| Option | Description | Selected |
|--------|-------------|----------|
| Single root tsconfig | module: ESNext, moduleResolution: Bundler — works for both Vite and Node CLI | ✓ |
| Separate tsconfigs per layer | tsconfig.node.json + tsconfig.browser.json — more precise but more complexity | |
| You decide | Claude picks | |

**User's choice:** Single root tsconfig
**Notes:** Standard Vite+TS setup; simpler for a project of this size.

---

## Domain Entity Typing Depth

### Q1: Response shape typing

| Option | Description | Selected |
|--------|-------------|----------|
| Typed interfaces in domain/entities/ for all responses | Define PostAnalysisResult, CaptionResult etc. as TypeScript interfaces | ✓ |
| Generic in Phase 1, typed in Phase 2 | AIProvider returns Record<string, unknown>; type later | |
| You decide | Claude picks | |

**User's choice:** Typed interfaces in `src/domain/entities/` from day one.

---

### Q2: Schema source of truth

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript interfaces are the source of truth | TS interfaces in domain/entities/ are authoritative; prompts reference shape in prose | ✓ |
| Prompts are the source of truth | Prompts define JSON schema; TS hand-written to match | |
| You decide | Claude decides | |

**User's choice:** TypeScript interfaces are authoritative.
**Notes:** Prevents silent drift between what the AI returns and what the code expects.

---

### Q3: Validation location

| Option | Description | Selected |
|--------|-------------|----------|
| In the infrastructure layer — validate before returning | GeminiProvider and AnthropicProvider validate raw response before returning typed object | ✓ |
| In the application use case — validate after receiving | Use cases handle invalid responses defensively | |
| You decide | Claude applies Clean Architecture principles | |

**User's choice:** Infrastructure layer validates.
**Notes:** Application layer always gets a valid typed result or an Error.

---

### Q4: AIProvider interface design

| Option | Description | Selected |
|--------|-------------|----------|
| Separate typed methods per use case | analyzePost(req): Promise<PostAnalysisResult>, generateCaption(req): Promise<CaptionResult> — clear and direct | ✓ |
| Generic provider AIProvider<TReq, TRes> | Single call(req: TReq): Promise<TRes> — flexible but harder to read | |
| Single method with discriminated union | call(req: AIRequest): Promise<AIResult> — middleground with boilerplate switch/case | |
| You decide | Claude picks | |

**User's choice:** Separate typed methods per use case.
**Notes:** Most readable for a showcase; no generics needed.

---

## Claude's Discretion

- **Web UI multi-provider scope** — User chose not to discuss. Claude decides how PROV-05 applies to the browser UI given the build-time constraint.
- **Prompt deduplication** — User chose not to discuss. Claude decides whether to fix the App.jsx inline prompt duplication as part of Phase 1.

## Deferred Ideas

None.
