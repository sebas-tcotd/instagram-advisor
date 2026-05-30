---
phase: 02-profile-auditor
plan: "03"
subsystem: ui
tags: [profile-auditor, web-ui, react, gemini, profile-tab]
dependency_graph:
  requires: [02-01]
  provides: [PROF-02, PROF-03 partial]
  affects: [src/ui/App.tsx, src/ui/pages/ProfilePage.tsx, src/ui/components/PriorityBadge.tsx, src/ui/hooks/useAIProvider.ts]
tech_stack:
  added: []
  patterns: [inline-styles-object, hook-state-triple, gemini-rest-text, yaml-raw-import]
key_files:
  created:
    - src/ui/components/PriorityBadge.tsx
    - src/ui/pages/ProfilePage.tsx
  modified:
    - src/ui/hooks/useAIProvider.ts
    - src/ui/App.tsx
decisions:
  - "ProfilePage reads profile.yaml via Vite ?raw import at build time — no runtime fetch needed"
  - "callGeminiText duplicates callGemini fetch logic but omits inlineData — clean separation for text-only agent calls"
  - "overallScore parsed from AI 'overall' field (string X/10) via parseInt with isNaN guard per T-02-08"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-30"
  tasks_completed: 2
  tasks_total: 3
  checkpoint_reached: true
---

# Phase 02 Plan 03: Profile Tab UI Summary

**One-liner:** Profile tab added to web UI with PriorityBadge component, callGeminiText helper, useAuditProfile hook, and ProfilePage rendering ScoreBar + priority-grouped checklist + wins from Gemini audit.

## What Was Built

Added the Profile tab to the instagram-advisor web UI. Users can now click "perfil" in the tab bar (without uploading any image) and trigger an AI profile audit that returns structured results including an overall score, status text, priority-grouped checklist items, and a wins list.

### Components and Files

**src/ui/components/PriorityBadge.tsx** (new)
- Priority badge component following VerdictBadge structure
- Maps `urgente` → red, `importante` → yellow, `mejora` → text-3/bg-2 colors
- Imports `Priority` type from domain entity

**src/ui/hooks/useAIProvider.ts** (modified)
- Added `callGeminiText(systemPrompt, userText)` — text-only variant of `callGemini()` with no `inlineData` in request body
- Added `useAuditProfile()` hook exporting `{ loading, result, error, run }`
- Hook parses AI `overall` field (string "X/10") via `parseInt` with `isNaN` guard (T-02-08 mitigation)
- Added imports: `profileAuditorPrompt` from `@prompts/profile-auditor.md?raw` and `AuditResult` type

**src/ui/pages/ProfilePage.tsx** (new)
- Self-contained page — no props, no image dependency
- Left panel: profile summary div showing handle, name, bio excerpt (first 80 chars) from `profile.yaml`
- Run button: `disabled={loading}`, calls `void run()`, shows Spinner while loading
- Results section: error box → loading spinner → result content
- Result content: ScoreBar with `score={\`${result.overallScore}/10\`}`, status paragraph, priority groups mapped over `['urgente', 'importante', 'mejora']`, wins list with ✓ prefix

**src/ui/App.tsx** (modified)
- Added `ProfilePage` import
- Extended `Tab` type: `'analyze' | 'caption' | 'profile'`
- Added `['profile', 'perfil']` entry to tab array
- Added `{tab === 'profile' && <ProfilePage />}` render NOT gated on image state

## Verification

| Check | Result |
|-------|--------|
| pnpm typecheck | Passed (exit 0) |
| pnpm build | Passed (exit 0, 42 modules, 217KB bundle) |
| Human checkpoint | Pending |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to live AI API call via useAuditProfile hook.

## Threat Flags

No new threat surfaces beyond what the plan's threat model covers:
- T-02-07: VITE_GEMINI_API_KEY inlined in bundle (accepted)
- T-02-08: overallScore parseInt + isNaN guard implemented
- T-02-09: profile.yaml baked into bundle (accepted)
- T-02-10: js-yaml.load on static committed file (accepted)

## Self-Check: PASSED

- FOUND: src/ui/components/PriorityBadge.tsx
- FOUND: src/ui/pages/ProfilePage.tsx
- FOUND: src/ui/hooks/useAIProvider.ts (modified)
- FOUND: src/ui/App.tsx (modified)
- FOUND: .planning/phases/02-profile-auditor/02-03-SUMMARY.md
- Commit f61a479 exists (Task 1)
- Commit 1a82e09 exists (Task 2)
