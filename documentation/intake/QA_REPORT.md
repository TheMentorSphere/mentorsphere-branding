# Primary learner profile QA report

Status: release-readiness testing completed with fictional data on 31 July 2026. The production form has not been deployed and production submissions remain disabled.

The isolated staging Worker was returned to both release flags `false` after testing. The final GitHub Actions result for the current commit is recorded on the dedicated launch pull request after this report is committed.

## Automated checks

- `pnpm install --frozen-lockfile`: passed.
- `pnpm run check`: passed before final documentation. This generated Worker types, typechecked the Worker, ran 42 tests and validated all 29 HTML files. The same checks are rerun against the final commit.
- `pnpm run deploy:dry-run`: passed. Wrangler prepared the Worker and 85 static assets without deploying production.
- `node scripts/verify-worker-site.mjs [staging URL]`: passed against the deployed staging Worker.
- Production configuration was inspected after testing: `FORM_SUBMISSIONS_ENABLED` remains `false` and `TURNSTILE_TEST_MODE` remains `false`. The production Turnstile widget was configured later on the dedicated launch branch while both release flags remained `false`.

## Isolated staging setup

- Cloudflare Worker: separate `thementorsphere-intake-staging` environment on `workers.dev`, with no production custom-domain route.
- Turnstile: Cloudflare's published always-pass test site key and test secret.
- Google Sheet: separate private native Google Sheet titled `MentorSphere fictional intake staging - 2026-07-31` with one 35-column response tab.
- Apps Script: separate versioned test web-app project running as the owner, protected by a staging-only HMAC secret.
- Data: fictional names, reserved `.test` email addresses and an Ofcom drama-range mobile number only.
- Test controls: `TEST_MODE=true` in the isolated Apps Script project enabled controlled request and notification failures. Both force-failure properties were reset to `false` after testing.
- Disabled at rest: the staging Worker was redeployed from the committed configuration after the test, and its configuration endpoint returned `enabled:false`.

No production form, Google Sheet, Apps Script deployment, Turnstile widget or production secret was changed.

## End-to-end results

### Final production-integration smoke test

The final production integration was tested through an isolated local Worker preview. The public production Worker was not deployed and both committed production flags remained `false`. The preview used Cloudflare's test Turnstile credentials, fictional respondent and learner information, the authorised versioned production Apps Script web app and the owner-only production Sheet.

- The browser completed all five steps and submitted successfully after Worker validation, Turnstile verification, HMAC forwarding and Apps Script validation.
- Apps Script wrote one row in the exact 46-column order. The row recorded `primary-learner-profile-v2`, the explicit-consent wording version, the authority wording version, consent timestamp and active consent status.
- A formula-like value beginning `=SUM(1,1)` had a string user-entered value, a string effective value and the `TEXT` number format. It was not a formula.
- Repeating the same submission ID through the Worker returned success and left exactly one Sheet row.
- With the isolated notification-failure flag enabled, the Worker returned success, the row remained stored and `Notification status` recorded `Failed: review Apps Script executions`.
- With the isolated Apps Script request-failure flag enabled, the browser displayed the retry message and retained the fictional respondent name, learner name and ordinary learning-preference answer on the review screen. No row was written.
- The minimal notification body contained only a UTC receipt timestamp, the restricted Sheet link and the fixed statement that no answers were included. It contained no learner or respondent answer.
- Local Worker logs contained method, route, outcome and status only. They contained no fictional email, name, learner detail or answer. Browser inspection likewise found no submitted answer in console output, storage, URLs or analytics.
- After the final HMAC rotation, a second fictional request through the isolated Worker returned 201 and produced a correctly structured row with `Notification status` set to `Sent`.
- All fictional production rows were removed immediately after verification. The production Sheet was confirmed to contain one 46-column header row and zero response rows. All fictional notification messages were moved to Gmail Trash.

The self-addressed notifications were delivered to Gmail Spam during testing. This did not expose answers or lose submissions, but the owner must create or approve a Gmail rule that never sends the exact fixed notification to Spam before enabling submissions.

### Browser, Worker and Sheet

1. A complete fictional form reached the review screen through the deployed staging Worker. The published Turnstile test widget reported `Security check complete`.
2. With the Apps Script request-failure switch enabled, submission returned the generic retry message. The browser still contained the fictional email, learner name and formula-like answer, and remained on step 5.
3. After the switch was reset, the same browser form submitted successfully. The controls were disabled after success and the confirmation message was displayed.
4. The Worker validated the request, verified Turnstile, signed the Apps Script request and forwarded it. Apps Script wrote one row with all 35 columns in the enforced order.
5. The browser row contained the acknowledgement version `approval-candidate-2026-07-31` and a `Sent` notification status.

### Formula-injection protection

The fictional support-needs value began with `=MS-QA-BROWSER-SUCCESS`. Google Sheets cell metadata confirmed:

- `userEnteredValue.stringValue`: `=MS-QA-BROWSER-SUCCESS`
- `effectiveValue.stringValue`: `=MS-QA-BROWSER-SUCCESS`
- number format: `TEXT`, pattern `@`
- no formula value was present

This proves the formula-like input was stored as text rather than evaluated.

### Duplicate-submission protection

Submission ID `123e4567-e89b-42d3-a456-426614174222` was sent repeatedly through the staging Worker. Every Worker response was successful, while the Sheet contained only one row with that ID. The repeated requests created no additional row and no additional notification.

### Notification failure without data loss

With the notification-failure switch enabled, submission ID `123e4567-e89b-42d3-a456-426614174333` returned a successful browser-facing Worker response. The Sheet retained the complete row and recorded:

> Failed: review Apps Script executions

The notification timestamp remained blank. The failure switch was reset immediately afterwards.

### Minimal notification email

Two successful fictional submissions produced two messages with this exact content shape:

> Subject: New learner profile received
>
> A new learner profile was received at [UTC timestamp].
>
> Open the private response sheet:
> [restricted Google Sheet URL]
>
> This notification intentionally contains no learner or respondent answers.

The full message bodies contained no fictional learner name, respondent name, email address, mobile number, subject, need, strategy, session preference or formula-like answer. The test messages were delivered but classified as Spam because the staging script sent from and to the same Workspace account. Production launch testing must confirm acceptable notification routing or add an appropriate Workspace rule.

### Logging and browser storage

- A live Cloudflare tail was attached while duplicate requests containing known fictional markers were sent. The tail contained method, route, outcome and status metadata. It contained none of the marker, email, name or answer values.
- Browser console searches for the formula marker, fictional email, learner first name and learner surname returned zero entries. There were no browser warnings or errors.
- The form source contains no `console` calls and uses no local storage, session storage or cookies for answers.
- Answers remained in page memory after a failed request and were cleared only by page navigation or the successful form lockout.
- No submitted profile payload was placed in URLs, analytics calls or repository files. Only the deliberately chosen fictional QA markers needed to document these checks appear in this report.

## Existing-site Worker regression

The following checks passed against both a local Worker and the deployed staging Worker:

| Area | Representative path or check | Result |
| --- | --- | --- |
| Homepage | `/` | 200, expected content and security headers |
| Contact form | `/contact/` | 200, existing Formspree content preserved |
| Tutoring | `/tutoring/`, `/tutoring/maths/` | 200 |
| ADHD coaching | `/adhd-coaching/`, `/adhd-coaching/access-to-work/` | 200 |
| Education and SEND support | `/support-services/`, `/support-services/ehcp-support/` | 200 |
| Policies | `/policies/`, `/privacy-policy/`, `/safeguarding-policy/` | 200 |
| Static assets | main CSS, site JavaScript and main logo SVG | 200 |
| Trailing slash | `/contact` | 307 to `/contact/` |
| Missing route | `/release-readiness-missing-page/` | 404 with the custom 404 page |
| Existing headers | nosniff, frame, referrer and intake noindex/cache headers | passed |
| Mobile navigation | 390 by 844 pixels | `aria-expanded=true`, navigation class `open` |

The repository contains no PDF files and no links to PDF files, so there was no existing PDF route to exercise. All current policy content is HTML and passed the Worker regression checks.

## Screenshots

- Desktop: `screenshots/primary-learner-profile-desktop.jpg`, recaptured from the final launch branch at 1440 by 1000 pixels.
- Mobile: `screenshots/primary-learner-profile-mobile.jpg`, recaptured from the final launch branch at 390 by 844 pixels with no horizontal overflow.
- Consent evidence: `evidence/production-smoke-desktop.png`, captured from the final review screen with fictional information and the approved conditional consent and authority controls.

The initial page no longer moves keyboard focus to the first step heading. Focus still moves to the new heading after an intentional step change.

## Release gates still in force

Production must remain disabled until all of the following are complete:

- Owner sign-off of the completed LIA and DPIA residual risk.
- Owner approval of the final acknowledgement, separate explicit consent, authority confirmation and Privacy Policy V1.5.
- Publication of the approved Privacy Policy version.
- A Gmail rule or other approved routing control that prevents the fixed notification from being treated as Spam.
- Explicit approval to enable the page flag, followed separately by explicit approval to enable submissions.

## Final page release control

Added after the staging evidence above was collected:

- `FORM_PAGE_ENABLED` is separate from `FORM_SUBMISSIONS_ENABLED` and defaults to `false` in production and staging.
- The Worker runs before static assets for the learner-profile route and its descendants.
- When the page flag is not exactly `true`, the form path, trailing-slash form path and nested form paths return the normal MentorSphere custom 404 response.
- Submission enablement requires both flags to be exactly `true`.
- The invalid state `FORM_PAGE_ENABLED=false` with `FORM_SUBMISSIONS_ENABLED=true` reports the API as disabled and cannot call Turnstile or Apps Script.
- Automated coverage confirms disabled and preview states, API gating, invalid-state handling, homepage continuity and custom 404 continuity.
- A local Wrangler runtime confirmed 404 responses with the normal custom page for the slashless, trailing-slash and nested form paths while disabled. With only the page flag enabled, the form returned 200 while the API configuration still reported `enabled:false`.
- Both flags remain `false` in the committed production and staging configurations.
