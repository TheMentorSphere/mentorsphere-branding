# Primary learner profile QA report

Status: release-readiness testing completed with fictional data on 31 July 2026. The Primary Learner Profile page is available as a direct-link live preview, and production submissions remain disabled.

The isolated staging Worker was returned to both release flags `false` after testing. The final GitHub Actions result for each reviewed change is recorded on its pull request.

## V5 false-success correction and usability review

The production V4 page remains live at its existing direct URL while production submissions are disabled. The safety configuration is `FORM_PAGE_ENABLED=true`, `FORM_SUBMISSIONS_ENABLED=false` and `TURNSTILE_TEST_MODE=false`.

The incident code path collapsed Apps Script `created` and `duplicate` responses into the same Worker `{success:true}` response. The browser then accepted any 2xx response with `success:true` as successful storage. V4 did not require `stored`, a recognised status or verified durable-record fields. The V4 success path also disabled the submit button while its label was still `Submitting...`; it did not set the label to a completed state. These two code defects are corrected in V5.

V5 introduces an explicit three-layer contract:

- Apps Script flushes the write and verifies the stored submission ID in the expected 48-column row before returning `stored:true` and `status:"created"`.
- A duplicate is successful only when the existing durable row is verified. A stale cache marker without a row returns `duplicate_without_record` and is not presented as received.
- The Worker validates HTTP status, JSON content type and every required response field. Created responses use HTTP 201; verified duplicates use HTTP 200.
- The browser requires the complete recognised contract, uses a 30-second timeout, does not retry automatically and does not replace the submission ID. Created, duplicate and failure states set the button to `Submitted`, `Already received` or `Submit learner profile` respectively.

The Part 3 flow now presents the optional-information choice, a just-in-time privacy notice, one explicit-consent checkbox and one learner consent route before revealing sensitive fields. Removing Yes, consent or the route clears and hides related values. Restricted respondent relationships remain blocked in both Worker and Apps Script validation.

The final section now has one required combined authority and Privacy Policy acknowledgement. That control populates the two existing backend fields; no Sheet column was added or removed. The Privacy Policy V1.5 content is unchanged.

Progress markers are native buttons. Completed sections support mouse, touch and keyboard navigation, future incomplete sections remain disabled, current state uses `aria-current="step"`, and editing a completed section invalidates forward progress.

Automated V5 review currently passes 103 tests across five test files and validates 29 HTML files. Coverage includes created-only success, explicit verified duplicates, stale duplicates, HTTP errors, timeouts, invalid JSON, unexpected content types, missing fields, answer preservation, Turnstile reset state, no automatic retry, unchanged submission IDs, combined confirmations, Part 3 clearing and restrictions, exact V5 validation, V4 rejection, progress-button semantics, the 48-column schema, contact ordering, mobile conditions, formula protection, HMAC validation, notification minimality, disabled-gate ordering, no answer logging and no browser storage.

## V4 visual and usability amendment review

The `primary-learner-profile-v4` review branch changes preferred contact methods from one radio choice to one or more checkbox choices. The browser sends `respondent.preferredContactMethods` as an array. Worker validation requires a non-empty allowlisted array, rejects duplicates, restores the fixed order Email, Telephone, Text message, WhatsApp, and requires a mobile number whenever any telephone-based method is selected. The local Apps Script source independently applies the same allowlist, duplicate and mobile checks.

Column 11 remains the existing contact-method column, renamed `Preferred contact methods`. Selected methods are stored in this exact canonical format, including only selected values:

> Email; Telephone; Text message; WhatsApp

The schema remains exactly 48 columns. No production Sheet header, production Sheet row or deployed Apps Script version was changed during this review. A later controlled integration deployment must rename the existing column 11 header and deploy the compatible v4 Apps Script together before submissions can be enabled.

The form introduction now uses the unchanged local `english-logo.svg`, `maths-logo.svg` and `science-logo.svg` assets. Restrained inline line icons are used for contact methods, contact times and subject choices. Every inline icon has `aria-hidden="true"` and `focusable="false"`; the three subject logos retain meaningful alternative text. Typography now uses 1.1rem to 1.125rem question labels, 0.95rem to 1rem help text with 1.5 line height, at least 1rem choice and input text, and 0.85rem required or optional markers.

Automated review completed with 80 tests across four files, 29 validated HTML files and an 85-asset Worker dry run. Coverage includes one and four contact methods, empty, malformed, unknown and duplicate arrays, every telephone-based mobile condition, canonical review and Sheet ordering, the v4 form version, 48-column schema, disabled API ordering, hidden decorative icons and the responsive accessibility rules.

Visual review used fictional details only. The following checks passed:

- desktop at 1440 by 1000 CSS pixels;
- tablet at 768 by 1024 CSS pixels;
- mobile at 390 by 844 CSS pixels;
- narrow layout at 320 by 800 CSS pixels, with document scroll width equal to client width and no horizontal scrolling;
- an approximate 200 per cent reflow check using a 720 CSS-pixel viewport for a 1440-pixel desktop reference, with no clipped text and no horizontal scrolling;
- selected contact methods persisted after editing Step 1 and returning to the review page;
- the mobile requirement changed immediately from required to optional when WhatsApp was removed and Email remained, then returned to required when WhatsApp was selected again;
- visible controls follow DOM order with no positive `tabindex`, practical interactive targets measured at least 48 pixels high, and a focused checkbox responded to the Space key;
- selected controls retain a checkbox or radio indicator, stronger border and inset marker, so colour is not the only state cue;
- `prefers-reduced-motion` and `forced-colors` styles are present, and no decorative animation was added.

The in-app review browser did not expose active Windows forced-colours or reduced-motion emulation. The dedicated CSS rules, colour-independent state markers and absence of decorative motion were verified; a native Windows High Contrast smoke test remains advisable before the later controlled deployment.

## Automated checks

- `pnpm install --frozen-lockfile`: passed.
- `pnpm run check`: passed before final documentation. This generated Worker types, typechecked the Worker, ran 63 tests across four test files and validated all 29 HTML files. The same checks are rerun against the final commit.
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

No production website Worker or form flag was deployed or changed. The authorised production Apps Script integration, owner-only Sheet schema and Gmail routing rule were updated under the controlled launch process described below.

## End-to-end results

### Final production-integration smoke test

The final production integration was tested through an isolated local Worker preview. The public production Worker was not deployed and both committed production flags remained `false`. The preview used Cloudflare's test Turnstile credentials, fictional respondent and learner information, the authorised versioned production Apps Script web app and the owner-only production Sheet.

- The browser completed all five steps and submitted successfully after Worker validation, Turnstile verification, HMAC forwarding and Apps Script validation.
- The completed v3 production-integration smoke test wrote one row in the exact 48-column order. The row recorded `primary-learner-profile-v3`, the explicit-consent wording version, selected learner consent route, learner-route wording version, authority wording version, consent timestamp and active consent status. The new v4 branch has not been deployed to that integration during this amendment review.
- A formula-like value beginning `=SUM(1,1)` had a string user-entered value, a string effective value and the `TEXT` number format. It was not a formula.
- Repeating the same submission ID through the Worker returned success and left exactly one Sheet row.
- With the isolated notification-failure flag enabled, the Worker returned success, the row remained stored and `Notification status` recorded `Failed: review Apps Script executions`.
- With the isolated Apps Script request-failure flag enabled, the browser displayed the retry message and retained the fictional respondent name, learner name and ordinary learning-preference answer on the review screen. No row was written.
- The minimal notification body contained only a UTC receipt timestamp, the restricted Sheet link and the fixed statement that no answers were included. It contained no learner or respondent answer.
- Local Worker logs contained method, route, outcome and status only. They contained no fictional email, name, learner detail or answer. Browser inspection likewise found no submitted answer in console output, storage, URLs or analytics.
- After the final HMAC rotation, a second fictional request through the isolated Worker returned 201 and produced a correctly structured row with `Notification status` set to `Sent`.
- All fictional production rows were removed immediately after verification. The production Sheet was confirmed to contain one 48-column header row and zero response rows. All fictional notification messages were removed from Inbox and moved to Gmail Trash.

The final narrow Gmail rule matches sender `luke@thementorsphere.co.uk`, recipient `luke@thementorsphere.co.uk` and subject `New learner profile received`. It applies `Never send it to Spam`, the `Learner profile notifications` label and `Always mark it as important`. The final fictional notification arrived in Inbox, had the label and Important status, was not in Spam and contained no submitted answer.

### Final consent-route and free-text closure test

- Before Yes was chosen, all four narrative fields were absent from the accessible browser view.
- Choosing Yes revealed `supportNeeds`, `helpfulStrategies`, `unhelpfulApproaches` and `otherBackground`.
- After fictional values, explicit consent, authority and the learner-authorised route were selected, returning to step 3 and choosing No cleared all four narratives, both checkboxes and the learner consent route. The four narrative containers were hidden again.
- A crafted Worker request with `specialCategoryProvided=false` and a narrative support value returned 400 with the conditional-consent error and did not reach Apps Script or create a Sheet row.
- Worker automated tests reject each of the four crafted narrative fields on No, accept both exact learner consent routes, and reject missing, altered or out-of-context routes.
- Apps Script automated tests independently reject each narrative bypass and missing or crafted routes, and accept both exact routes.
- No keyword scanning is used. The control is based on explicit field state and allowlisted route values.

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

The full message bodies contained no fictional learner name, respondent name, email address, mobile number, subject, need, strategy, session preference or formula-like answer. The final production-integration message passed the exact Inbox, label, Important and not-Spam checks after the narrow routing rule was created.

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

- Desktop: `screenshots/primary-learner-profile-desktop.jpg`, recaptured from the final launch branch using the desktop viewport override.
- Mobile: `screenshots/primary-learner-profile-mobile.jpg`, recaptured as a full-page image using the 390 by 844 responsive viewport override, with no horizontal overflow.
- Consent evidence: `evidence/production-smoke-desktop.png`, recaptured from the final review screen with fictional information and the approved explicit consent, learner consent route and authority controls.

The initial page no longer moves keyboard focus to the first step heading. Focus still moves to the new heading after an intentional step change.

## Release gates still in force

Production must remain disabled until all of the following are complete:

- Owner sign-off of the completed LIA and DPIA residual risk.
- Owner approval of the final acknowledgement, separate explicit consent, authority confirmation and Privacy Policy V1.5.
- Publication of the approved Privacy Policy version.
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
