# Phase 2: Profile Auditor - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the profile-auditor agent end-to-end: implement `auditProfile()` in both `GeminiProvider` and `AnthropicProvider` (currently stubs that throw "not implemented"), update the `AuditResult` entity to match the actual prompt schema, create `src/cli/profile.ts` as a zero-argument CLI command, and add a `ProfilePage.tsx` with a Profile tab to the UI. Phase 1 scaffolded the use case, port, and entity — Phase 2 fills in all the real implementation.

</domain>

<decisions>
## Implementation Decisions

### AuditResult Entity Schema
- **D-01:** Update `AuditResult` entity to match `profile-auditor.md` prompt schema: `{ overallScore: number, status: string, checklist: ChecklistItem[] }`. Define `ChecklistItem` as `{ priority: 'urgente' | 'importante' | 'mejora', element: string, issue: string, action: string }`. The Phase 1 entity was a placeholder — updating it here is the intended design.
- **D-02:** Providers parse the `"X/10"` string from the AI response into a number for `overallScore` (e.g., `parseInt("7/10".split('/')[0], 10)`). Validation happens in the infrastructure layer per D-06 from Phase 1.
- **D-03:** Keep the `status` field (1-2 line summary of current profile state) in `AuditResult`. Useful for CLI summary line and UI intro text before the checklist.

### CLI Profile Command
- **D-04:** `npm run profile` takes zero arguments — reads `profile.yaml` from the fixed repo root path. No `--profile-path` flag needed for this personal-tool use case.
- **D-05:** CLI output uses ANSI color style matching `analyze.ts` / `caption.ts` pattern: overall score and status summary at the top, checklist items grouped by priority (`urgente` in RED, `importante` in YELLOW, `mejora` in DIM).

### Profile Tab — Input Design
- **D-06:** `ProfilePage.tsx` loads `profile.yaml` at build time via Vite `?raw` import: `import profileYaml from '../../profile.yaml?raw'`. YAML string baked into the bundle — no runtime fetch. Consistent with the `?raw` prompt-loading approach established in Phase 1.
- **D-07:** Left panel shows a read-only summary of key `profile.yaml` fields (handle, name, bio excerpt, niche). A "Audit my profile" button below the summary triggers the analysis. Keeps the two-panel layout consistent with Analyze and Caption tabs.

### Profile Tab — Result Rendering
- **D-08:** Audit result rendered as priority-grouped sections: three collapsible/visible groups (Urgente / Importante / Mejora), each listing its checklist items with element name, issue description, and action.
- **D-09:** Reuse the existing `ScoreBar` component for the overall score — pass `overallScore * 10` as the value. Keeps score visualization consistent across all three tabs.
- **D-10:** Display the `status` field as a short intro paragraph above the checklist sections.

### Provider Implementation
- **D-11:** Both `GeminiProvider.auditProfile()` and `AnthropicProvider.auditProfile()` assemble the full system prompt by combining `profile-auditor.md` + `strategy.md` context, consistent with how `analyzePost()` and `generateCaption()` inject strategy. Prompt assembly follows the `assembleSystemPrompt()` utility from `promptUtils.ts`.
- **D-12:** Both providers send a **text-only** API request (no image). Profile audit is text-based — `profileYaml` string is passed as the user message, no base64 image encoding needed.

### AuditProfile Use Case
- **D-13:** `AuditProfile.execute(profileYaml: string)` signature stays unchanged. No `AuditRequest` entity wrapper needed — YAGNI applies. If future phases add image input or other context, the signature will evolve then.

### Claude's Discretion
- `ChecklistItem` type should be co-located with `AuditResult` in `src/domain/entities/AuditResult.ts` (exported as a named type), not a separate file — too small to warrant its own file.
- Priority label styling in the UI (color badges for urgente/importante/mejora) follows the same `VerdictBadge` pattern — create a `PriorityBadge` component with the same structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — PROF-01, PROF-02, PROF-03 are the locked requirements for this phase
- `.planning/ROADMAP.md` §Phase 2 — Goal, success criteria, dependency on Phase 1

### Phase 1 Context (architectural decisions that constrain this phase)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-05 (separate typed method per use case), D-06 (validation in infrastructure layer), D-01..03 (TypeScript config); these are binding constraints for Phase 2 implementation

### Existing Code to Build On
- `src/domain/entities/AuditResult.ts` — Phase 1 scaffold; MUST be updated to match D-01 schema before other work
- `src/domain/ports/AIProvider.ts` — `auditProfile(profileYaml: string): Promise<AuditResult>` port is defined; providers must implement it
- `src/application/AuditProfile.ts` — use case is complete; no changes needed
- `src/infrastructure/ai/GeminiProvider.ts` — has stub `auditProfile()` at line 154; implement it following `analyzePost()` pattern
- `src/infrastructure/ai/AnthropicProvider.ts` — has stub `auditProfile()` at line 113; implement it following `analyzePost()` pattern
- `src/infrastructure/ai/promptUtils.ts` — `assembleSystemPrompt()` utility; use for prompt assembly in both providers
- `src/ui/App.tsx` — current two-tab UI; add Profile tab to the `Tab` union type and tab navigation

### Prompt & Profile Layer
- `prompts/profile-auditor.md` — defines the JSON output schema that `AuditResult` must match; MUST read before implementing providers
- `prompts/strategy.md` — injected as context into the provider call (per D-11)
- `profile.yaml` — the data passed to `auditProfile()` in both CLI and UI

### Reference Implementations
- `src/cli/analyze.ts` — reference for CLI entry point structure and ANSI color output pattern
- `src/ui/pages/AnalyzePage.tsx` — reference for page component structure and ScoreBar usage
- `src/ui/components/ScoreBar.tsx` — reuse for overall score rendering (pass `overallScore * 10`)
- `src/ui/components/VerdictBadge.tsx` — reference pattern for `PriorityBadge` component

### Architecture Decisions
- `.planning/codebase/ARCHITECTURE.md` — current architecture; check before adding new patterns to ensure Clean Architecture constraints are respected
- `.planning/codebase/CONCERNS.md` — known concerns; verify Phase 2 doesn't reintroduce them

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/ui/components/ScoreBar.tsx` — renders label + percentage bar; pass `overallScore * 10` for profile score
- `src/ui/components/VerdictBadge.tsx` — pattern for `PriorityBadge` component (urgente/importante/mejora labels)
- `src/ui/components/Spinner.tsx` — reuse for loading state during audit
- `src/infrastructure/ai/promptUtils.ts` — `assembleSystemPrompt()` already handles strategy.md + system prompt composition
- `src/ui/hooks/useAIProvider.ts` — existing hook for provider instantiation in the UI; profile page should follow the same hook pattern

### Established Patterns
- **Provider implementation pattern**: `analyzePost()` and `generateCaption()` show exactly how to structure `auditProfile()` — load prompts, assemble system prompt via `promptUtils`, call API, validate and parse JSON response, return typed domain object
- **CLI entry point pattern**: `analyze.ts` and `caption.ts` show the zero-deps script pattern: load config → instantiate provider → call use case → format ANSI output
- **`?raw` import**: Phase 1 UI layer already uses `?raw` for prompt files; same approach applies to `profile.yaml`
- **Two-panel layout**: `App.tsx` enforces a two-panel grid; `ProfilePage` must fit this layout (left: input summary, right: result)

### Integration Points
- `src/ui/App.tsx` — add `'profile'` to the `Tab` union type and add Profile tab button in the tabs bar; render `<ProfilePage>` when `tab === 'profile'`
- `src/cli/` — add `profile.ts` entry point alongside `analyze.ts` and `caption.ts`
- `package.json` — add `"profile": "tsx src/cli/profile.ts"` script (following the `analyze` and `caption` script pattern)

</code_context>

<specifics>
## Specific Ideas

- The `AuditResult.status` field reads like a Twitter-length summary of the profile state — display it as a muted subtitle below the overall score in the UI.
- Priority badge colors map directly to CLI ANSI colors: urgente = RED (`var(--error)` or similar), importante = YELLOW (`var(--warning)`), mejora = DIM (`var(--text-3)`).
- The CLI's grouped output should show a section header per priority level (e.g., `— URGENTE —` in bold red) followed by indented items showing `element: issue → action`.
- Future phase idea (captured, not in scope): direct Instagram profile analysis by passing a screenshot or scraped profile data to the agent — deferred to a future v2 phase after the text-only version proves the end-to-end flow.

</specifics>

<deferred>
## Deferred Ideas

- **Direct Instagram profile analysis** — user mentioned that after text-only works, it would be worth exploring ways to have the agent analyze the Instagram profile directly (e.g., via screenshot or scraped data). Deferred to a future v2 phase — the text-only `profile.yaml` approach proves the end-to-end flow first.

</deferred>

---

*Phase: 2-Profile-Auditor*
*Context gathered: 2026-05-29*
