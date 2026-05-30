# Roadmap: instagram-advisor

## Overview

A brownfield restructure of a working Instagram advisor tool: migrate the plain-JavaScript codebase to TypeScript with Clean Architecture, unify the dual-provider setup under a single config.yaml, complete the profile-auditor agent end-to-end, polish the UI with Tailwind and dark mode, then ship a clean v0.1.0 tag with all repo hygiene in place. Each phase delivers a verifiable capability on top of the last.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - TypeScript + Clean Architecture + multi-provider: the codebase compiles in TS with proper layers and existing agents work through the new architecture (completed 2026-05-27)
- [ ] **Phase 2: Profile Auditor** - Complete third agent end-to-end: CLI script + UI tab + structured output
- [ ] **Phase 3: UI Polish** - Tailwind CSS, responsive layout, dark mode, clipboard copy, three-tab navigation
- [ ] **Phase 4: Ship-Ready** - Doctor update, env docs, conventional commits, LICENSE, v0.1.0 tag, GitHub Release Notes

## Phase Details

### Phase 1: Foundation

**Goal**: The codebase is fully TypeScript with a Clean Architecture folder structure, both existing agents work through a provider-agnostic AIProvider port, and a developer can switch from Gemini to Anthropic by changing one line in config.yaml
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-04, PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, AGNT-01, AGNT-02, AGNT-03
**Success Criteria** (what must be TRUE):

  1. `tsc --noEmit` runs without errors across the full src/ and cli/ tree
  2. The folder structure contains src/domain/, src/application/, src/infrastructure/, src/ui/, src/cli/ and domain/ has zero imports from the other layers
  3. config.yaml exists at the repo root; changing `ai.provider` from `gemini` to `anthropic` makes the next CLI or UI call use the other provider without any code change
  4. `npm run analyze` and `npm run caption` both produce correct output via the new AnalyzePost and GenerateCaption use cases
  5. The AIProvider port interface lives in src/domain/ports/ and is the only thing application layer depends on for AI calls

**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tooling scaffold (tsconfig, eslint, vitest, vite.config.ts, config.yaml, dist/ cleanup)
- [x] 01-02-PLAN.md — Domain contracts (entities + AIProvider port interface)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Infrastructure layer (loadConfig, GeminiProvider, AnthropicProvider, AIProviderFactory + tests)
- [x] 01-04-PLAN.md — Application use cases (AnalyzePost, GenerateCaption, AuditProfile scaffold + tests)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — CLI entry points (analyze.ts, caption.ts, doctor.ts; delete scripts/*.js; human smoke test)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — UI layer migration (App.tsx split, components, hooks with ?raw prompt loading; human verify)

### Phase 2: Profile Auditor

**Goal**: The profile-auditor agent is fully operational: a developer can run `npm run profile` from the terminal and open a Profile tab in the web UI, both of which return a structured audit with scores, strengths, improvement areas, and concrete recommendations
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):

  1. `npm run profile` executes without error and prints a structured audit result to the terminal
  2. The web UI has a Profile tab that calls the AuditProfile use case and renders the response
  3. The audit result visibly includes: an overall score, at least one strength, at least one improvement area, and at least one concrete recommendation

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Domain entity + provider implementations + tests (AuditResult schema update, GeminiProvider.auditProfile(), AnthropicProvider.auditProfile(), AuditProfile use case tests)

**Wave 2** *(blocked on Wave 1 completion — parallel)*

- [ ] 02-02-PLAN.md — CLI profile entry point (src/cli/profile.ts + package.json script + human smoke test)
- [ ] 02-03-PLAN.md — UI Profile tab (ProfilePage.tsx, PriorityBadge.tsx, useAuditProfile hook, App.tsx tab extension + human verify)

### Phase 3: UI Polish

**Goal**: The web UI uses Tailwind CSS throughout, is usable on mobile (375px) and tablet (768px), has a working dark/light mode toggle that persists across sessions, lets the user copy any generated caption with one click, and surfaces all three agents as navigable tabs
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):

  1. The UI renders correctly with Tailwind utility classes replacing all plain CSS; no inline style conflicts remain
  2. On a 375px viewport, all core controls (image upload, run button, results) are accessible without horizontal scrolling
  3. Clicking the dark/light toggle switches the theme and reloads on the same setting the next visit
  4. Each caption card has a copy button; clicking it places the caption text in the clipboard (confirmed via paste)
  5. Analyze, Caption, and Profile are three distinct, navigable tabs on the same page

**Plans**: TBD
**UI hint**: yes

### Phase 4: Ship-Ready

**Goal**: The project is ready for a public v0.1.0 release: the doctor script verifies the configured provider's API key, .env.example documents all provider keys, conventional commits are enforced, a LICENSE file exists, the v0.1.0 git tag is created, and GitHub Release Notes will auto-generate from commit history
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: INFR-01, INFR-02, INFR-03, REPO-01, REPO-02, REPO-03
**Success Criteria** (what must be TRUE):

  1. `npm run doctor` passes when the correct API key for the configured provider is present, and fails with a clear message when it is missing
  2. `.env.example` lists environment variables for all supported providers (Gemini and Anthropic) with comments explaining each
  3. A commit that does not follow `feat:`, `fix:`, `chore:` etc. convention is rejected by the commitlint hook
  4. The repo has a `LICENSE` file (MIT) and a `v0.1.0` git tag pointing to the final clean commit
  5. Creating a new git tag triggers auto-generation of GitHub Release Notes from conventional commit history

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 6/6 | Complete   | 2026-05-27 |
| 2. Profile Auditor | 1/3 | In Progress|  |
| 3. UI Polish | 0/TBD | Not started | - |
| 4. Ship-Ready | 0/TBD | Not started | - |
