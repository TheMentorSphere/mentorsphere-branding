# Phase 1 security, privacy and accessibility review

## Security controls implemented

- Server-side provider call through a Cloudflare Worker. No provider credential is sent to the browser.
- Worker secret names are documented; values are absent from Git and Wrangler variables.
- Production feature flag defaults to disabled.
- Same-origin checks on POST requests.
- JSON content-type validation and 16 KB request-body limit.
- Seven-message, 600-character per-message and 3,000-character total conversation limits.
- Provider output capped at 320 tokens and 2,000 response characters.
- Twelve requests per minute per in-memory browser session through a Cloudflare Rate Limiting binding.
- Twelve-second provider timeout.
- Generic client errors and structured logs without stack traces or message text.
- Plain-text rendering with DOM `textContent`; no unsanitised HTML or model-selected links.
- Server allow-list for source URLs.
- Prompt-injection rules in both deterministic routing and the provider instruction.
- Retrieved sources are treated as quoted data, not instructions.
- Content Security Policy, frame blocking, MIME sniffing protection, opener isolation, referrer policy and restricted form and connection targets.
- Dependency lockfile and production dependency audit.

## Privacy controls implemented

- No raw transcript database or application log.
- No chatbot cookies, localStorage or sessionStorage.
- Current context exists only in browser memory and is bounded to seven messages.
- OpenAI request sets `store: false`.
- No model web search, file search, tool call or vector store.
- No file uploads.
- Event-only analytics with an explicit allow-list.
- Opening notice warns against confidential, medical, safeguarding and identification information.
- Deterministic response stops apparent confidential-document pasting.

OpenAI states that API data is not used for training unless the customer opts in. The standard abuse-monitoring retention may still be up to 30 days. `store: false` is not the same as Zero Data Retention. Owner approval and a Privacy Policy update are release blockers.

## Accessibility implementation

- Native button, textarea, form and link controls.
- Dialog name and non-modal semantics.
- Logical DOM and tab order.
- Visible focus states.
- Escape closes and restores launcher focus.
- No focus trap.
- Conversation uses `role="log"` with polite live announcements.
- Error and loading status semantics.
- Minimum practical touch-target sizes.
- Responsive full-width mobile panel and bounded high-zoom layout.
- Colour is not the only state indicator.
- Reduced-motion handling for loading and scrolling.
- No sound, flashing, autoplay or manipulative reopening.
- Interface is optional and failure leaves the underlying website usable.

## Review findings and residual risks

| Risk | Status and mitigation |
| --- | --- |
| Determined automation can create fresh session IDs | Residual. Add a WAF rule or Turnstile only after owner and privacy review. |
| Provider response quality not proven with a live key | Residual. Complete the staging checklist before release. |
| OpenAI default abuse-monitoring retention | Release blocker. Approve provider, contract and retention setting; publish privacy wording. |
| Policy archive omits two current V2.0 policies | Content governance issue. Update the register and archive. |
| PAYG terms have no formal version and are labelled under review | Content governance issue. Current exact wording is used under the direct task instruction; owner should formalise it. |
| Runtime test package reports an older compatibility-date ceiling | Tooling limitation. Wrangler 4.115 dry-run bundles successfully; repeat runtime tests after the test pool catches up. |
| CSP may need future adjustment for a new third-party asset or form service | Review on every integration change. Do not add broad wildcards. |

## Automated evidence

Run:

```powershell
pnpm check
pnpm run deploy:dry-run
pnpm run audit:dependencies
```

The tests cover retrieval terminology, typos, context, exact policy facts, current-only filtering, automatic transition expiry, high-risk fixed routes, medical and legal boundaries, confidential-document protection, injection resistance, unrelated queries, request validation, provider storage settings and the disabled production feature flag.

## Verification completed on 30 July 2026

- TypeScript strict compilation passed.
- 52 automated tests passed across retrieval, safety, validation and the Worker API.
- All 28 HTML pages passed title, description, H1, duplicate-ID, placeholder, shared-script and local-reference validation.
- Production and staging Wrangler dry runs bundled successfully with the expected feature flags and bindings.
- The production dependency audit reported no known vulnerabilities.
- Desktop and 390 by 844 mobile browser checks showed no horizontal overflow or console errors.
- The accessible DOM inspection exposed the named dialog, conversation log, textbox, loading status, alert, controls and source link as expected.
- Keyboard Escape closed the panel and returned focus to the launcher.
- The fixed immediate-danger response passed through the live local Worker.
- The missing-provider state produced a clear generic error without exposing configuration or a stack trace.
- Local Worker logs contained event names, request IDs and environment only. They did not contain the submitted message text.
