# Secondary Learner Profile V1 QA

Date: 21 September 2026. All information used was fictional. Primary reference: `cb5486ac17fd6f16dc26795b116ce2433e5fea89`. See [Primary baseline](PRIMARY_EXTENSION_BASELINE.md) and [owner review](SECONDARY_OWNER_REVIEW.md).

## Automated checks

The Secondary suites pass **93 tests**: validation 38, Worker/API 31, browser-source invariants 8, Apps Script durable-storage harness 7, and preview isolation 9. The unchanged existing Primary suites pass **130 tests**. A combined implementation run passes 322 tests across 14 files; each form's independent count is kept separate here so this report remains useful for its focused draft PR.

The standalone Secondary PR was also checked after physically excluding the ADHD implementation: **223 tests across 10 files**, **39 HTML pages**, TypeScript and Worker dry build all passed. The shared test runner explicitly collects `tests/` only, excluding temporary baseline snapshots.

Coverage includes all school-year routes, subject and board conditions, Other fields, relationship restrictions, consent and learner authority, crafted sensitive payloads, EHCP/session/contact choices, phone requirement, content type/JSON/version/UUID rejection, honeypot, Turnstile verification/action/hostname failures, isolated gates and bindings, HMAC, strict created/duplicate contracts, stale and conflicting duplicates, malformed upstream responses, transport failure, formula protection, minimal notifications and safe diagnostics. The real Apps Script source is executed with a temporary disk-backed Sheet-service harness; the file is reopened for duplicate/readback assertions and deleted after each test. This is durable local integration evidence, not proof of a Google-hosted deployment.

## Real browser checks

`node scripts/qa-extension-browser.mjs --form=secondary` passes **13 scenario groups** in headless Chrome with a local static server and mocked API/Turnstile transport:

- Required fields, linked error summary, disabled future progress and conditional mobile requirement.
- Years 7 to 9, Years 10 to 11 and Other, including optional boards and clearing deselected subjects' boards.
- Sensitive fields remain hidden until all consent/authority controls are complete and clear immediately on withdrawal.
- A professional relationship cannot choose the child-sensitive route; editing a completed step invalidates forward progress.
- `isExpired` prevents a request and prompts a fresh challenge.
- Retryable failure, malformed response, unverified duplicate and 30-second timeout retain answers and one submission UUID; no automatic retry occurs.
- Verified duplicate completes with its distinct button state.
- No local/session storage, answer cookies, answer URL values, console answer values or positive tabindex.

The full two-form browser run passes 35 groups. Counts are scenario groups, not a claim that each interaction is a separate unit test.

## Deployed owner-preview smoke tests

Preview: [Secondary Learner Profile](https://mentorsphere-secondary-owner-preview.luke-f8c.workers.dev/forms/secondary-learner-profile/).

`node scripts/qa-owner-previews.mjs --form=secondary` exercises the actual workers.dev page and API with the published Turnstile test widget and real server-side verification. **Six deployed scenarios passed**: created (HTTP 201, stored true, notification false), verified duplicate, retryable failure, malformed response, unverified duplicate and an actual browser timeout at approximately 30 seconds. Failed attempts preserve fictional answers and the stable submission ID, and a fresh challenge completes before retry. No answer values are written to browser storage. These scenarios simulate upstream results; no Google response Sheet, Apps Script deployment, email or real client record is used.

The final harness uses the owner-visible outcome selector and checks the outgoing preview scenario header, no-store, noindex/nofollow/noarchive, preview CSP and the approved live Privacy Policy link. The exact passed run evidence is generated in ignored `tmp/owner-preview-qa/results.json` and `tmp/extension-browser-qa/results.json`; reports deliberately contain no submitted answer values, credentials or private identifiers.

## Accessibility and layout

About-you and review screens have no horizontal document overflow at 1440, 768, 720, 390 and 320 CSS pixels. The 720px view checks reflow relative to a 1440px desktop, and a separate 200% CSS zoom assertion passes. This is an actual rendered CSS zoom check, not a claim of changing the browser chrome zoom setting. Chrome reduced-motion and forced-colours emulation pass. Visible native controls, focus states, checked indicators and semantic progress/error/review controls are exercised. Review answers wrap at narrow widths.

No axe package was available in the bundled runtime. A screen-reader session and native Windows High Contrast session were not performed. Automated/browser results do not certify full WCAG conformance.

Reproducible screenshots are generated under ignored `tmp/extension-browser-qa/` as `secondary-about-you-320-forced-colours.png`, `secondary-review-320-forced-colours.png` and `secondary-complete.png`; deployed mobile success/duplicate screenshots are under `tmp/owner-preview-qa/`. These are fictional QA artefacts only.

## Boundaries

No Primary page/client/validation/CSS/submission-contract/Apps Script/schema/policy file was changed. No Primary deployment, production credential, Sheet or configuration was changed. Production Secondary page and submission controls remain false. Preview assets omit Primary and permit only the new form and its dependencies. Temporary local storage is removed by the storage tests; owner previews intentionally persist no responses. Google-hosted integration remains a separate owner-approved setup and verification step.

## Owner-review refinement: exam-board controls

The four optional exam-board datalists are now full-width native selects. Choices can be reopened and changed without clearing the current value. Each subject has an optional Other exam board field that appears for Other and clears when a different board or subject is chosen. Editing the Other subject name also clears its previous board. Review and payload use the same resolved string: custom text, or `Other` if blank. The 52-column storage schema is unchanged.

Current validation: **233 tests passed**, comprising **103 Secondary tests** and **130 unchanged Primary regressions**. Content validation (39 pages), TypeScript, generated Worker types, production-config dry build and isolated preview dry build passed. The existing local browser suite passed all **13 groups**. The new `qa-intake-refinements.mjs` suite passed **6 local groups** and **5 deployed groups**, including all four native selects, repeated reopening, keyboard selection/focus, clearing, unchanged payload shape, desktop and 320px width, and 200% CSS zoom/reflow. CSS zoom is a rendered reflow check, not browser chrome zoom. Screenshots are in ignored `tmp/intake-refinements/`.

The existing workers.dev preview was updated using only test Turnstile and simulated outcomes. No Primary, production storage, Apps Script deployment, notification email, custom-domain route or policy was changed. Privacy Policy V1.6, DPIA and LIA work remains deferred.
