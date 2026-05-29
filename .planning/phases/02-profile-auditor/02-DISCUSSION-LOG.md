# Phase 2: Profile Auditor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 02-profile-auditor
**Areas discussed:** AuditResult schema, CLI profile command, Audit result rendering, Profile tab input design, Provider implementation details, AuditProfile use case signature

---

## AuditResult Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Update entity to match prompt | Change AuditResult to { overall, status, checklist } with ChecklistItem shape | ✓ |
| Update prompt to match entity | Rewrite prompt to return { overallScore, strengths[], improvements[], recommendations[] } | |
| Keep entity, transform in provider | Map prompt's checklist into the Phase 1 entity arrays at provider level | |

**User's choice:** Update the entity to match the prompt (Recommended)
**Notes:** Phase 1 entity was always a scaffold — updating it here is the intended design.

---

**Overall score format**

| Option | Description | Selected |
|--------|-------------|----------|
| Parse to number in provider | Extract integer from "7/10", store as overallScore: number | ✓ |
| Keep as string | AuditResult.overall: string = "7/10" | |
| Store both | overallScore: number + overallLabel: string | |

**User's choice:** Parse to number in provider (Recommended)

---

**Status field**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include status | AuditResult: { overallScore, status, checklist[] } | ✓ |
| No, skip it | Drop status, keep overallScore and checklist only | |

**User's choice:** Yes, include status (Recommended)

---

## CLI Profile Command

**Invocation design**

| Option | Description | Selected |
|--------|-------------|----------|
| Zero args | Just `npm run profile` — reads profile.yaml from fixed root path | ✓ |
| --profile-path flag | Accept optional path for flexibility | |
| Extra context notes | --notes flag for audit focus area | |

**User's choice:** Zero args (Recommended) — single-user personal tool, fixed path always correct.

---

**Output format**

| Option | Description | Selected |
|--------|-------------|----------|
| Same ANSI style as analyze.ts | Score+status at top, checklist grouped by priority with colors | ✓ |
| Simpler format | Plain text without ANSI colors | |
| You decide | Claude picks | |

**User's choice:** Same ANSI style as analyze.ts (Recommended)

---

## Audit Result Rendering

**Checklist layout**

| Option | Description | Selected |
|--------|-------------|----------|
| Priority-grouped sections | Three sections: Urgente / Importante / Mejora | ✓ |
| Flat checklist ordered by priority | All items in one list with priority badge | |
| Card per element | One card per audited element (Bio, Foto, Highlights…) | |

**User's choice:** Priority-grouped sections (Recommended)

---

**Score display**

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse ScoreBar | Pass overallScore*10; consistent score visualization across all tabs | ✓ |
| Simple text display | Just show "7/10" as text | |
| You decide | Claude picks | |

**User's choice:** Reuse ScoreBar (Recommended)

---

**Left panel content**

| Option | Description | Selected |
|--------|-------------|----------|
| Profile info summary | Show key profile.yaml fields + "Run audit" button | ✓ |
| Empty left panel with just a button | Minimal with description and CTA button | |
| Full-width single panel | Break two-panel layout for profile tab | |

**User's choice:** Profile info summary (Recommended)

---

## Profile Tab Input Design

**YAML loading strategy**

| Option | Description | Selected |
|--------|-------------|----------|
| Vite ?raw import at build time | import profileYaml from '../../profile.yaml?raw' — baked into bundle | ✓ |
| Runtime fetch from /profile.yaml | Fetch at runtime; requires file in public/ | |

**User's choice:** Vite ?raw import at build time (Recommended) — consistent with Phase 1 ?raw prompt loading.

---

## Provider Implementation Details

**Strategy context injection**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — inject strategy.md | Both providers load profile-auditor.md + strategy.md, consistent with other providers | ✓ |
| No — send profileYaml as-is | Skip strategy context | |
| You decide | Claude determines from existing pattern | |

**User's choice:** Yes — providers assemble full prompt with strategy context (Recommended)

---

**Request type**

| Option | Description | Selected |
|--------|-------------|----------|
| Text-only request | No image in API call — just system prompt + profileYaml | ✓ (for Phase 2) |
| Same structure as analyzePost | Keep request shape with null/empty image | |

**User's choice:** Text-only first to get the feature ready.
**Notes:** User mentioned: "Primero que sea como text only para tener la feature lista. Luego, habría que ver otras maneras para que analice el perfil de Instagram directamente." — direct Instagram profile analysis is a future v2 idea (captured in deferred ideas).

---

## AuditProfile Use Case Signature

| Option | Description | Selected |
|--------|-------------|----------|
| Keep execute(profileYaml: string) | Phase 1 signature is correct for text-only case; YAGNI | ✓ |
| Introduce AuditRequest entity | Typed wrapper { profileYaml: string }, uniform with AnalyzeRequest/CaptionRequest | |
| You decide | Claude decides based on D-05 consistency principle | |

**User's choice:** Keep execute(profileYaml: string) as-is (Recommended) — YAGNI applies.

---

## Claude's Discretion

- `ChecklistItem` type co-located with `AuditResult` in the same entity file (not a separate file — too small)
- `PriorityBadge` component follows the same structure as `VerdictBadge`

## Deferred Ideas

- **Direct Instagram profile analysis**: user wants to eventually have the agent analyze the actual Instagram profile (screenshot or scraped data), not just profile.yaml text. Deferred to v2 — prove end-to-end flow with text-only first.
