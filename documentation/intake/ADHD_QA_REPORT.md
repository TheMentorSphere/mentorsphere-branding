# ADHD Coaching Intake V1 QA

Date: 21 September 2026. All information used was fictional. See [Primary baseline](PRIMARY_EXTENSION_BASELINE.md) and [owner review](ADHD_OWNER_REVIEW.md).

## Automated checks

The ADHD suites pass **155 tests**: validation 58, Worker/API 35, client route/privacy/accessibility rules 49, and Apps Script durable-storage harness 13. The existing Primary suites pass **130 tests**. The full combined implementation passes **388 tests across 14 files**; Secondary contributes the remaining 103 tests.

Coverage includes adult, child/teen, parent-only and combined routes; independent explicit consent and child authority/learner routes; crafted/irrelevant sensitive payload rejection; prefer-not-to-say and Other choices; additional-information consent scopes; contact conditions; version/UUID/JSON/content-type/honeypot failures; Turnstile validation and form action; strict created/verified-duplicate/stale-duplicate contracts; malformed/time-out/failure handling; HMAC, formula protection, notification failure and no-answer diagnostics. The real Apps Script executes against a temporary disk-backed Sheet-service harness, including reopened-file readback and conflicting-duplicate rejection. Files are deleted after tests. No Google-hosted integration is claimed by this harness.

## Real browser checks

`node scripts/qa-extension-browser.mjs --form=adhd` passes **22 scenario groups** using real headless Chrome with a local static server and mocked API/Turnstile transport. The combined two-form run passes 35 groups.

- Adult, child/teen, parent-only and combined routes each reach review and submit with only their relevant fields in the payload.
- Adult ordinary intake also completes without sensitive consent or sensitive answers.
- Child information is withheld until explicit consent, legal authority and learner route are all selected. Partial consent blocks continuation with a clear error. The skip control clears partial consent.
- Adult/child consent withdrawal clears gated values; changing Other choices clears the corresponding hidden text.
- Combined to child to adult changes clear irrelevant parent, child and additional answers and consent flags.
- Keyboard Space operates native checkboxes; current progress has one `aria-current`; edited completed steps require revalidation.
- Retryable failure, malformed JSON, unverified duplicate and timeout preserve answers and submission identity with no automatic retry. Created and verified-duplicate states complete distinctly.
- No local/session answer storage, answer cookies, answer URL values, answer console values or positive tabindex are introduced.

The figures count scenario groups, not every individual assertion or interaction.

## Deployed owner-preview smoke tests

Preview: [ADHD Coaching Intake](https://mentorsphere-adhd-owner-preview.luke-f8c.workers.dev/forms/adhd-coaching-intake/).

`node scripts/qa-owner-previews.mjs --form=adhd` uses the actual workers.dev page/API and the published Turnstile test widget, including real server verification. **Six deployed scenarios passed**: created (201, stored true, notification false), verified duplicate, retryable failure, malformed response, unverified duplicate and an actual browser timeout at approximately 30 seconds. Answers and submission UUID remain stable through failures; retry uses a fresh challenge. The preview simulates its upstream outcomes, so no real or temporary Google response record or notification is created.

The final harness selects outcomes through the owner-visible preview control, checks its header, verifies no-store/noindex headers and CSP, and checks the Privacy Policy link points to the approved live policy. Exact results and fictional screenshots are generated in ignored `tmp/owner-preview-qa/` and `tmp/extension-browser-qa/`; no credentials, private file identifiers or client data appear in this report.

## Accessibility and layout

Review screens for all four branches and the no-consent adult path pass no-horizontal-overflow checks at 1440, 768, 720, 390 and 320 CSS pixels. The 720px layout checks reflow relative to a 1440px desktop; separate 200% CSS zoom checks also pass. This verifies rendered CSS zoom, not browser-chrome zoom. Chrome forced-colours and reduced-motion emulation pass. Branching hides irrelevant controls, the progress list adjusts to four or five steps, and review labels use the visible public wording. Native keyboard activation and progress/error handling are exercised.

No axe package was available in the bundled runtime. No screen-reader or native Windows High Contrast session was performed, and these checks are not a full WCAG certification. Reproducible narrow screenshots use names such as `adhd-child-review-320-forced-colours.png` and `adhd-combined-review-320-forced-colours.png`; deployed mobile created/duplicate screenshots are also produced.

## Boundaries

Primary's page, client, validation, CSS, response/token contract, Apps Script, schema and Privacy Policy remain unchanged. No Primary deployment or production credential/storage change was made. ADHD production page and submission controls remain false; the workers.dev preview packages only its own page/dependencies and uses published test keys. Its records and notification outcomes are simulations, and local durable-storage test files are removed. Separate Google-hosted storage and deployment need owner approval and a later controlled integration test.

## Owner-review refinements: consent help and age eligibility

The final combined suite passes **388 tests across 14 files**: **130 Primary**, **103 Secondary** and **155 ADHD**. All existing tests remain, with the datalist assertion updated to require native selects. The new Secondary assertions were also run against the old HTML: both native-select/datalist checks failed as expected, then the current file was restored.

`qa-intake-refinements.mjs --form=adhd` passes **16 local groups** and **16 deployed groups**. These check exact route-specific wording; all four direct-consent buttons; relevant heading focus and progress; the first incomplete combined consent; partial-consent validation; exactly one textarea; immediate hide/reveal state; withdrawal clearing; successful forward navigation with or without optional text; and child/combined ages 9, 10, 17 and 18. Parent/adult switches retain contact information, clear irrelevant child answers and never infer consent from age. Screenshots for the four callouts and available textarea were visually inspected.

All callouts and textarea states passed desktop, **320px** and **200% CSS zoom/reflow** checks with no horizontal overflow. The separate existing local suite also passed **22 ADHD groups**, and all **six deployed submission scenarios** passed with real test Turnstile verification and simulated storage outcomes. CSS zoom is not a claim of browser-chrome zoom testing. Native screen-reader and Google-hosted end-to-end checks remain unverified.

Content validation passed for **40 HTML pages**. TypeScript, JavaScript syntax checks, generated Apps Script/schema/manifest reproducibility for both forms, the combined Worker dry build and isolated ADHD preview dry build passed. The Apps Script age tests verify stored completed years and reject changed-age duplicate payloads, ineligible ages and malformed ages. The draft ADHD schema is now 54 columns; Secondary remains at 52.

Preview deployment version: `fec3bb64-d2cc-446e-b08f-ca75ae8be57b`. It is workers.dev only with published Turnstile test credentials, no production Sheet/Apps Script/email and no custom-domain route. Primary files, shared form CSS/transport, production configuration and the current Privacy Policy are unchanged. Privacy Policy V1.6, DPIA, LIA and policy publication remain deferred; no governance PR was created. No governance branch or open governance PR was found during the starting inspection.
