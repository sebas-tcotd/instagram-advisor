# Walking Skeleton — instagram-advisor

**Phase:** 1
**Generated:** 2026-05-26

## Capability Proven End-to-End

> A developer can run `pnpm run analyze <photo.jpg>` and receive a structured AI analysis (verdict, scores, suggestions) in the terminal — routed through TypeScript Clean Architecture layers (CLI → use case → AIProvider port → provider adapter → Gemini API) with the active provider controlled by a single line in config.yaml.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript 6 with strict: true | D-01 (locked): showcase-quality code requires genuine TS; v6 strict-by-default aligns with this goal |
| Runtime | Node.js v24 + tsx for CLI | tsx replaces ts-node; ESM-native, esbuild-powered, no separate compile step for CLI execution |
| Build tool | Vite 6 (existing) | Already in project; handles both UI bundle and dev server; keeps stack minimal |
| AI abstraction | AIProvider port interface in src/domain/ports/ | D-05 (locked): separate typed methods per use case; self-documenting contract for a developer reading the codebase cold |
| Config | config.yaml at repo root | PROV-01 (locked): ai.provider, ai.model, ai.max_tokens, prompts_dir, profile_path — all five fields required |
| Layer enforcement | eslint-plugin-boundaries (D-03) | Lint errors, not convention — domain/ can never import from infrastructure/, ui/, or cli/ |
| Testing | vitest 4.x | Native Vite integration; ESM-native; same config pattern as vite.config.ts |
| Directory layout | src/domain/, src/application/, src/infrastructure/, src/ui/, src/cli/ | Clean Architecture (D-MIGR-02): each layer has a single clearly bounded responsibility |

## Stack Touched in Phase 1

- [x] TypeScript scaffold (tsconfig.json, eslint.config.ts, vitest.config.ts)
- [x] Domain entities (PostAnalysisResult, CaptionResult, AnalyzeRequest, CaptionRequest, AuditResult)
- [x] Domain port (AIProvider interface — the central architectural contract)
- [x] Infrastructure providers (GeminiProvider, AnthropicProvider) + AIProviderFactory
- [x] Application use cases (AnalyzePost, GenerateCaption, AuditProfile scaffold)
- [x] CLI entry points (src/cli/analyze.ts, src/cli/caption.ts, src/cli/doctor.ts)
- [x] UI migration (src/ui/ — App.tsx, components, pages, hooks with ?raw prompt loading)
- [x] config.yaml at repo root (provider switching via single line)

## Out of Scope (Deferred to Later Slices)

- Profile auditor CLI and UI wiring — AuditProfile use case is scaffolded but provider body and CLI/UI entry points ship in Phase 2 (PROF-01/PROF-02/PROF-03)
- AnthropicProvider in browser — Anthropic API requires a server-side proxy for CORS; browser UI uses Gemini only in v1
- Tailwind CSS — Phase 3
- Dark mode toggle — Phase 3
- Copy-to-clipboard for captions — Phase 3
- Feed reviewer (Playwright) — v2 requirement, out of scope for this roadmap

## Subsequent Slice Plan

- Phase 2: Profile auditor end-to-end — `pnpm run profile` CLI + Profile tab in web UI, using AuditProfile use case scaffolded in Phase 1
- Phase 3: UI polish — Tailwind CSS, responsive layout, dark mode, caption copy button, three-tab navigation
- Phase 4: Ship-ready — doctor script updated for config.yaml provider, commitlint, LICENSE, v0.1.0 tag, GitHub Release Notes
