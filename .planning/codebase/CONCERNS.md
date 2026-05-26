# Codebase Concerns

**Analysis Date:** 2026-05-26

## Tech Debt

**Dual-API architecture inconsistency (CLI vs UI):**
- Issue: CLI scripts (`scripts/analyze.js`, `scripts/caption.js`) use the Anthropic Claude SDK directly. The UI (`src/App.jsx`) calls the Gemini REST API. These are entirely different providers with different schemas, SDKs, and keys. The codebase installs both `@anthropic-ai/sdk` and `@google/genai` but the UI does not use the `@google/genai` package — it uses raw `fetch` against the Gemini REST endpoint instead.
- Files: `src/App.jsx` (lines 4–5, 166), `scripts/analyze.js` (line 61), `scripts/caption.js` (line 53), `package.json`
- Impact: Confusion about which AI provider the tool actually uses. Changes to prompts or response schema must be maintained in two completely separate codepaths. The `@google/genai` SDK dependency is a dead install for the UI.
- Fix approach: Either unify both surfaces on the same provider (Anthropic everywhere via SDK, or Gemini everywhere via SDK), or explicitly document the split with clear separation at the module level.

**Prompts duplicated across CLI and UI:**
- Issue: The full system prompt content is copy-pasted verbatim into `src/App.jsx` as top-level string constants (`STRATEGY`, `CAPTION_PROMPT`). The canonical versions live in `prompts/post-advisor.md`, `prompts/caption-generator.md`, and `prompts/strategy.md`. These two copies can drift silently.
- Files: `src/App.jsx` (lines 7–31), `prompts/post-advisor.md`, `prompts/caption-generator.md`, `prompts/strategy.md`
- Impact: A prompt improvement in the `.md` files does not propagate to the UI. The UI always runs the older inlined version.
- Fix approach: In the UI, either load prompts at build time via a Vite import or virtual module, or maintain a single shared `prompts/` source and have the build pipeline inline them.

**`dist/` is committed to git:**
- Issue: The build output directory `dist/` is not listed in `.gitignore` and is tracked in git. The bundled JS in `dist/assets/` contains an older, broken version of `callAPI` that throws immediately (`throw new Error("VITE_GEMINI_API_KEY no está configurada en el .env.")`), meaning the committed dist differs from the current source.
- Files: `dist/assets/index-BDn6gCD0.js`, `dist/assets/index-DUgJzFaf.js`, `.gitignore`
- Impact: The repo is misleadingly in a "broken" deployed state. Any CI/CD or static host deploying from `dist/` will serve non-functional code. The dist also reveals the full (minified but readable) prompt content in `dist/assets/index-BDn6gCD0.js`.
- Fix approach: Add `dist/` to `.gitignore` and remove tracked dist files with `git rm -r --cached dist/`.

**`scripts/profile.js` is missing but referenced:**
- Issue: `package.json` registers `"profile": "node scripts/profile.js"` as a runnable script. The file `scripts/profile.js` does not exist. Running `npm run profile` (or `pnpm run profile`) will throw a "cannot find module" error.
- Files: `package.json` (line 12), `scripts/` directory
- Impact: The profile-auditor feature (`prompts/profile-auditor.md` exists with a full system prompt) is inaccessible via the CLI.
- Fix approach: Either implement `scripts/profile.js` following the pattern of `analyze.js` and `caption.js`, or remove the script entry from `package.json`.

## Known Bugs

**`callAPI` in UI requires an image but caption flow always needs one:**
- Symptoms: `callAPI` at line 142 of `src/App.jsx` throws "No hay una imagen cargada" if `image` is null. Both tabs (analyze and caption) gate the submit button on `!image`. However, the caption tab could conceptually work without an image (text-only captions for in-progress drafts). The hard image requirement in `callAPI` blocks this use case and errors silently in edge cases.
- Files: `src/App.jsx` (lines 142–144, 383, 399)
- Trigger: Removing the `disabled={!image || loading}` guard and clicking submit without an image.
- Workaround: Guard buttons currently prevent this, but guard is a fragile UI-only protection.

**`gemini-3.5-flash` model name likely invalid:**
- Symptoms: API calls from the UI will receive a 404 or 400 from Gemini. The valid model names are `gemini-1.5-flash`, `gemini-2.0-flash`, or `gemini-2.5-flash`. `gemini-3.5-flash` does not exist as of the analysis date.
- Files: `src/App.jsx` (line 4)
- Trigger: Running either the Analyze or Caption flow in the UI.
- Workaround: Manually change the constant to a valid model name.

**`doctor.js` only checks `ANTHROPIC_API_KEY`, not `VITE_GEMINI_API_KEY`:**
- Symptoms: `npm run doctor` reports "Todo listo" even when `VITE_GEMINI_API_KEY` is missing. The UI will then immediately fail on first API call with the "No se encontró ninguna API key" error.
- Files: `scripts/doctor.js` (lines 36–45), `src/App.jsx` (line 3)
- Trigger: Running `npm run doctor` after configuring only `ANTHROPIC_API_KEY` (which is what `.env.example` shows as the only key).
- Workaround: None at present — the mismatch is silent.

## Security Considerations

**API key exposed to browser via Vite `VITE_` prefix:**
- Risk: The `VITE_GEMINI_API_KEY` (and fallback `VITE_ANTHROPIC_API_KEY`) are embedded at build time into the client-side JavaScript bundle. Any user who opens DevTools → Sources can read the key from the minified bundle.
- Files: `src/App.jsx` (line 3), `vite.config.js`, `.env`
- Current mitigation: None. This is an inherent limitation of client-side API calls; the key will be in the bundle.
- Recommendations: Add an API proxy (e.g., a minimal serverless function or local Vite dev server proxy) so the key stays server-side. For a local-only personal tool this is low urgency but note that `dist/` being committed to a public repo would immediately expose the key — see the `dist/` gitignore concern above.

**`.env` is gitignored but `.env.example` only documents `ANTHROPIC_API_KEY`:**
- Risk: A developer following `.env.example` will configure only `ANTHROPIC_API_KEY`, which the UI does not actually use (it needs `VITE_GEMINI_API_KEY`). The mismatch is invisible until runtime.
- Files: `.env.example`
- Current mitigation: None.
- Recommendations: Update `.env.example` to document `VITE_GEMINI_API_KEY` as the primary key for the UI and `ANTHROPIC_API_KEY` as required for the CLI scripts.

## Performance Bottlenecks

**No image size limit before base64 encoding and API upload:**
- Problem: `loadImage` in `src/App.jsx` reads any dropped/selected image as a base64 DataURL with no size check. A 20MB RAW export or high-res TIFF will be fully encoded in memory and then sent as inline base64 in the Gemini API request body.
- Files: `src/App.jsx` (lines 106–130)
- Cause: `FileReader.readAsDataURL` is unbounded.
- Improvement path: Add a file size check (e.g., reject files > 5MB) before calling `reader.readAsDataURL`, and optionally downscale via `canvas` before encoding.

## Fragile Areas

**Inline prompt strings in `App.jsx` (fragile JSON schema):**
- Files: `src/App.jsx` (lines 7–31)
- Why fragile: The JSON schema embedded in the prompt (lines 19–20 and 30–31) is a raw string. If the model doesn't follow it exactly, `JSON.parse` throws and the UI shows a generic error. There's no schema validation, default fallback, or partial parse attempt.
- Safe modification: Any changes to expected response shape require updating both the prompt string in `App.jsx` AND the render logic in the same file (lines 429–476).
- Test coverage: None.

**CLI scripts rely on `profile.yaml` existing at runtime:**
- Files: `scripts/analyze.js` (line 43), `scripts/caption.js` (line 40)
- Why fragile: Both CLI scripts do `readFileSync(resolve(ROOT, 'profile.yaml'), 'utf8')` with no error handling. If `profile.yaml` is missing or renamed, the script crashes with an unformatted Node.js stack trace rather than a friendly error like the other path checks.
- Safe modification: Wrap the `profile.yaml` read in a try/catch and emit a clear error message similar to the photo-not-found check.
- Test coverage: None.

**`callAPI` uses a regex to extract JSON from model response:**
- Files: `src/App.jsx` (lines 206–213), `scripts/analyze.js` (lines 80–82), `scripts/caption.js` (lines 70–72)
- Why fragile: `/\{[\s\S]*\}/` is a greedy match that will misfire if the model wraps the JSON in a markdown code block containing other `{}` text, or if the model adds trailing text after the closing brace. This is a known failure mode for multiline Gemini/Claude responses.
- Safe modification: Use a JSON extraction library or try parsing each `\{[\s\S]*?\}` candidate from innermost to outermost.
- Test coverage: None.

## Scaling Limits

**Single-file UI (481 lines in `App.jsx`):**
- Current capacity: All UI logic, all prompts, all API calls, and all component rendering live in one file.
- Limit: Any new feature (profile auditor tab, history, settings) will push the file past maintainability thresholds.
- Scaling path: Extract components into `src/components/`, API logic into `src/lib/api.js`, and prompts into `src/prompts/` loaded at build time.

## Missing Critical Features

**No request cancellation:**
- Problem: The UI sets `loading=true` and fires a `fetch` with no `AbortController`. If the user switches tabs mid-request or closes/refreshes the tab, the pending API call has no way to be cancelled, and the state update (`setResult`) will fire on an unmounted component.
- Blocks: Clean UX on tab switch, race condition prevention.

**No response history or copy-to-clipboard:**
- Problem: Each new analysis clears `result`. There's no way to compare two runs or copy a generated caption without selecting text manually.
- Blocks: Core workflow — caption generation produces text the user needs to act on.

## Test Coverage Gaps

**No tests of any kind:**
- What's not tested: All application logic — JSON parsing, API call construction, error handling, image validation, UI rendering.
- Files: `src/App.jsx`, `scripts/analyze.js`, `scripts/caption.js`
- Risk: Silent regressions in prompt parsing, API schema changes, or image handling go undetected until runtime.
- Priority: Medium — this is a personal single-user tool, but the fragile JSON extraction pattern is the highest priority to cover with at least a unit test.

---

*Concerns audit: 2026-05-26*
