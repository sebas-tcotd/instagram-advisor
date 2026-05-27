---
phase: 1
slug: foundation
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `pnpm vitest run --reporter=dot` |
| **Full suite command** | `pnpm vitest run && pnpm tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=dot`
- **After every plan wave:** Run `pnpm vitest run && pnpm tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 0 | MIGR-01 | — | N/A | build | `pnpm tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 1 | MIGR-01 | — | N/A | build | `pnpm tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 1 | MIGR-02 | — | N/A | lint | `pnpm eslint src/` | ❌ W0 | ⬜ pending |
| 01-04 | 02 | 1 | PROV-01 | — | config keys validated at load | unit | `pnpm vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 01-05 | 02 | 1 | PROV-02 | — | N/A | unit | `pnpm vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 01-06 | 03 | 2 | AGNT-01 | — | N/A | unit | `pnpm vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 01-07 | 03 | 2 | AGNT-02 | — | N/A | unit | `pnpm vitest run --reporter=dot` | ❌ W0 | ⬜ pending |
| 01-08 | 03 | 2 | PROV-03 | — | N/A | unit | `pnpm vitest run --reporter=dot` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test runner config, aliasing src/ layers
- [ ] `tsconfig.json` — strict TypeScript config covering src/ and cli/
- [ ] `eslint.config.ts` — flat config with typescript-eslint + eslint-plugin-boundaries
- [ ] `dist/` removed from git tracking (`git rm -r --cached dist/`)
- [ ] `vitest` + `@vitest/coverage-v8` installed as devDependencies

*Note: No existing test infrastructure — Wave 0 installs all tooling.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Switching `ai.provider` in config.yaml from `gemini` to `anthropic` routes CLI call to Anthropic | PROV-03 | Requires live API key and an actual image; cannot be mocked in unit tests | Run `pnpm run analyze <test-image.jpg>` after changing config.yaml to `provider: anthropic`; verify response uses Claude not Gemini |
| UI call uses Gemini provider when config.yaml has `provider: gemini` | PROV-05 | Browser + Vite rebuild required | Run `pnpm dev`, upload image in UI, confirm Gemini API called in network tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
