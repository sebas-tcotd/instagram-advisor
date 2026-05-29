---
phase: 2
slug: profile-auditor
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (repo root) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PROF-01 | — | N/A | unit | `pnpm test src/application/AuditProfile.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROF-01 | T-02-01 | `validateAuditResult()` rejects invalid priority strings | unit | `pnpm test src/infrastructure/ai/GeminiProvider.test.ts` | ✅ update | ⬜ pending |
| 02-01-03 | 01 | 1 | PROF-01 | T-02-01 | `validateAuditResult()` rejects invalid priority strings | unit | `pnpm test src/infrastructure/ai/AnthropicProvider.test.ts` | ✅ update | ⬜ pending |
| 02-01-04 | 01 | 1 | PROF-01 | — | N/A | unit | `pnpm test src/application/AuditProfile.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PROF-01 | — | N/A | manual | `npm run profile` → structured output printed | N/A | ⬜ pending |
| 02-02-02 | 02 | 2 | PROF-02 | — | N/A | manual | `pnpm dev` → Profile tab renders audit result | N/A | ⬜ pending |
| 02-02-03 | 02 | 2 | PROF-03 | — | N/A | manual | Audit result shows score, status, checklist with wins | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/application/AuditProfile.test.ts` — stubs for PROF-01 (use case delegation) — created in Plan 02-01 Task 1
- [x] Update `src/infrastructure/ai/GeminiProvider.test.ts` — replace "throws Phase 2 message" stub with `auditProfile()` happy-path and validation tests — addressed in Plan 02-01 Task 2
- [x] Update `src/infrastructure/ai/AnthropicProvider.test.ts` — replace "throws Phase 2 message" stub with `auditProfile()` happy-path and validation tests — addressed in Plan 02-01 Task 2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run profile` prints structured audit to terminal | PROF-01 | CLI is a Node.js side-effect; vitest covers unit, not integration CLI | Run `npm run profile`, verify JSON-shaped ANSI output appears |
| Profile tab renders in browser | PROF-02 | UI components excluded from vitest by policy | `pnpm dev`, open Profile tab, verify layout renders |
| Audit result contains score, status, checklist, wins | PROF-03 | End-to-end through live API | Live API call; verify all fields present in rendered result |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending executor run
