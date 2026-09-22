# Primary intake baseline for the Secondary and ADHD extensions

Audit date: 21 September 2026. Source: current `origin/main`, commit `cb5486ac17fd6f16dc26795b116ce2433e5fea89`. This audit inspected repository code and documentation without reading production submissions, secrets, private Sheet identifiers or Apps Script endpoint values. No production setting or resource was changed.

## Current reference, not historical release notes

The current Primary form is `/forms/primary-learner-profile/`, with API `/api/forms/primary-learner-profile` and GET configuration at `/api/forms/primary-learner-profile/config`. Its contract version is `primary-learner-profile-v5`. Current production configuration sets `FORM_PAGE_ENABLED=true`, `FORM_SUBMISSIONS_ENABLED=true`, `TURNSTILE_TEST_MODE=false` and the expected hostname to `www.thementorsphere.co.uk`. Staging remains false/false with published test credentials. The Primary action is exactly `primary_learner_profile`.

`QA_REPORT.md`, `FIELD_AND_DATA_MAP.md`, `PRODUCTION_LAUNCH_RECORD.md` and some data-protection documents retain July/August release-state statements about disabled submissions or an unpublished policy. Those are historical records, not an accurate account of current main's release flags. This extension must preserve current configuration rather than reset it to those historical values. No policy wording has been changed by this audit. Deployment state was not inferred solely from the historical documents.

## Baseline execution

| Check | Result |
| --- | --- |
| Existing five Vitest test files | **130 passed**, 0 failed, using `node node_modules/vitest/vitest.mjs run` before extension code edits |
| Existing content validation | **38 HTML files passed**, including privacy controls, local references and submission safeguards |
| Worker environment/runtime type generation | Passed using Wrangler 4.115.0 with normal filesystem access |
| TypeScript against pristine main | Passed with `tsc --noEmit`; source and tests from the audited SHA were copied to an ignored temporary snapshot after concurrent implementation began |
| Existing browser accessibility evidence | Reviewed as historical evidence only; the existing test suite checks source-level semantics and CSS, not a fresh axe or real-browser audit |

Initial sandbox-only package-wrapper/type-generation attempts encountered inaccessible installed dependency junctions (`esbuild`), not a repository test failure. Normal-access Wrangler type generation succeeded; no dependency version or lockfile change was needed for the passing baseline. The temporary pristine-main TypeScript snapshot exists only under `tmp/` and is not a deliverable.

## Client and accessibility behaviour

The five steps are About you, About the learner, Learning and support profile, Initial session preferences, and Review and submit. The respondent contact structure has a required email/name/relationship, conditional Other relationship text, ordered multiple contact methods, a mobile number required for Telephone, Text message or WhatsApp, and optional contact times. Learner details, optional support fields and session preferences are represented separately.

`intake-form.js` uses native progress buttons, `aria-current="step"`, live step announcements, focused headings after intentional navigation, an error summary with links, native labels/fieldsets and readable review cards. Future incomplete steps are disabled; editing a validated step invalidates its forward progress. Submission attempts to revalidate every step, but the existing visibility helper treats hidden steps as hidden fields, so the source-level tests do not prove revalidation of previously completed hidden steps. The new clients can close that gap without changing Primary. Conditional fields clear when hidden. Review content is inserted with `textContent`, not interpolated HTML. Answers and the stable submission UUID exist in page memory only. The script does not persist answers to browser storage, cookies, URLs or analytics.

`intake-forms.css` provides 48rem and 32rem reflow breakpoints, one-column mobile field and choice grids, wrapping review answers, visible focus, native checked indicators plus borders, practical touch targets, reduced-motion rules and forced-colours rules. The form has `noindex,nofollow,noarchive`, no public sitemap/navigation entry, no-store headers and a restrictive CSP allowing only the existing Turnstile origin beyond self. Existing visual QA documents record 320px, 390px, tablet, desktop and approximate 200% reflow checks; these historical claims are not substitutes for new-form browser checks.

## Special-category and learner authority contract

Part 3 first asks whether optional information will be provided. Only Parent and Guardian or carer can select Yes. A just-in-time notice and Privacy Policy link, an affirmative unticked explicit-consent checkbox, and one exact learner-consent route must be completed before the health, disability, SEND, neurodiversity, diagnosis, EHCP or related narrative fields are revealed. Both route strings are allowlisted independently in the Worker and Apps Script. One records the learner authorising the respondent to communicate consent; the other records consent by someone with parental responsibility or documented legal authority when the learner cannot currently understand and give informed consent.

Removing Yes, consent or the route immediately hides and clears sensitive answers and announces this. Changing to a restricted relationship clears the route. Both structured and narrative special-category values are rejected server-side when consent/authority is absent or the relationship is not allowed. No keyword scanning is used. Relevant need areas are rejected if the selected needs status does not permit them. Ordinary intake remains possible without special-category information.

The final step has one concise ordinary-information authority/Privacy Policy acknowledgement, mapped to two backend booleans. It does not repeat the full sensitive-data consent. Apps Script stores separate consent, authority, learner route, wording versions and the receipt-time consent timestamp. The existing 48-column Primary schema and versions must remain intact.

## Security, transport and diagnostics

The Worker rejects disabled submissions before validation or upstream calls, requires same-origin JSON, reads at most 32,768 bytes, validates the exact version and UUIDv4, applies typed allowlists and length limits, and rejects the honeypot without forwarding. Responses use no-store, restrictive API CSP, same-origin resource policy and nosniff. A UUIDv4 diagnostic request ID is accepted or freshly generated and returned in body and headers.

Turnstile is verified server-side using a 10-second timeout and submission ID as the idempotency key. Production checks the exact action and allowlisted hostname. Explicit test mode is the only path accepting the published test-key response without production hostname/action metadata. Turnstile error codes are reduced to a fixed allowlist.

The browser records token creation time, rejects tokens at four minutes, calls `isExpired` where supported, handles expiry/timeout/error callbacks, and clears/resets the token after failure. Submission has a 30-second browser timeout and no automatic retry. A manual retry retains answers and the same submission UUID but requires a fresh challenge. Request UUIDs are separate for each HTTP attempt.

The Worker serialises an issued-at timestamp and validated payload, signs the exact JSON body with HMAC-SHA256/base64url, and forwards a `{body, signature}` envelope with a 12-second timeout. It checks HTTP success, JSON content type, a 16,384-byte response limit and the complete response contract. It returns only recognised fields, never upstream error text. Failures produce the existing generic customer message with the safe request reference.

Pre-forward diagnostic logs have a fixed 14-key allowlist: event, request ID, error code, stage, HTTP status, timestamp, parsing/schema completion flags, Turnstile attempt/success flags, sanitised Turnstile codes, hostname/action comparison booleans and forwarding status. No body, answer, email, IP address, token, endpoint URL or HMAC value is included. Wrangler invocation logging is disabled. Existing tests assert this boundary.

## Durable storage, duplicates and notifications

Apps Script verifies the HMAC, a five-minute signed timestamp window, version, UUID shape and consent/contact shape before storage. It takes a script lock, enforces the exact 48-column header order, appends a plain-text row, flushes it and reads back the stored submission ID before reporting success. Every Sheet-bound cell is passed through formula-injection protection and the range is formatted as text.

The success contracts are deliberately distinct:

- Created: `success:true`, `stored:true`, `status:"created"`, boolean `notificationSent`. The Worker returns HTTP 201.
- Verified duplicate: `success:true`, `stored:false`, `status:"duplicate"`, `existingRecordVerified:true`. The Worker returns HTTP 200.
- A duplicate-cache marker without a verified durable row is `duplicate_without_record` and must never become a success screen.

The cache is an optimisation, not storage evidence. A duplicate requires finding and verifying a durable row. Newly created rows have independent notification state, prospective record state and a six-month retention-review date. Notification failure does not undo stored success; its failure is recorded in the Sheet. Notifications contain a receipt timestamp and private Sheet link only, never submitted answers.

## Narrow extension boundaries

Reuse the existing CSS and browser response/token contract. Preserve the Primary page, Primary client, Primary validation, Primary Apps Script, 48-column mapping, policy, flags, action, endpoint and secrets. The transport currently hardcodes the Primary action and Primary binding names; optional action parameters/default-preserving wrappers can safely support new form adapters without migrating Primary. New adapters can map dedicated form binding names into the existing HMAC transport, with independent validation and Apps Script schema. No architectural need to share production endpoint, HMAC or Sheet has been found.

New page and submission gates must be independent and default false. New browser routes need their own noindex/security header blocks and Worker-first routing. Preview configuration must have no custom-domain route and no Primary credentials. Regression tests must exercise unchanged defaults as well as form-specific actions, schemas and release flags. There is no approval to deploy or migrate Primary during this extension.

## Audited file fingerprints

SHA-256 values recorded before extension changes allow unchanged Primary assets to be checked without opening production resources:

| Path | SHA-256 |
| --- | --- |
| `docs/forms/primary-learner-profile/index.html` | `7159b7344fe2771924f4a334b580fb57877e1f47c9e1587cf6f8193dbf77e04d` |
| `docs/assets/js/intake-form.js` | `8ca4047b497a2ddec010ced05b9d75cdcccba9b65e97aba91cec257c384eefb5` |
| `docs/assets/js/intake-submission-contract.js` | `c8262fb204456f341d09ef01957702e8999eba29a1841c5b3dd6fc9eef83d029` |
| `docs/assets/css/intake-forms.css` | `907a571e1bf44a9bea911c5d17bc10e353f3f56f2d550870ab181190f8187a08` |
| `src/intake/validation.ts` | `e365879578582a75ccf537fbc177901fbc212dd5f817b050d8d0708517c9739a` |
| `src/intake/submission.ts` | `8e597cf0921ffe3767d5c622edd0b22f288452a7c80a929059e5f0157d4e605d` |
| `src/intake/diagnostics.ts` | `13fd312fecfd4ac78eecc3c2ba43ceda5936c914fcff068e223306ea449282b3` |
| `integrations/google-apps-script/primary-learner-profile/Code.gs` | `db1a6c4c11d42c486c09a41eb8148558a3583744ac3089d7880c2ba2e09681d2` |
| `docs/privacy-policy/index.html` | `39fb912dcd98d82118b42f706b932c9c0ef8da316e1a2ae496b957dea8903ead` |
