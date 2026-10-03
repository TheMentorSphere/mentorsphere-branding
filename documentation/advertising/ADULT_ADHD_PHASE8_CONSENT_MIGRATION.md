# Phase 8 adult ADHD privacy scope and consent migration

## A. Executive summary

Implemented locally on `codex/adult-adhd-phase5`, based on `9546ee214fbf942d4de058b3594dbd34a0d4f148`. Privacy Policy V1.9 is adopted effective 3 October 2026 with publication pending. Scope-aware consent is ready for a future adult measurement consumer. Adult measurement remains off. Existing work in the dirty working tree was preserved. No commit, push, merge, deployment or Google Ads account change was made.

## B. Consent migration architecture

The top-level storage version remains 1. The purpose remains `advertising`. An optional purpose-entry `scopeVersion` distinguishes the old young-person disclosure (1) from the approved two-page disclosure (2). Missing scope means 1; reading a legacy record does not rewrite it, refresh its date or delete it.

A valid refusal applies at both scopes and never causes a new prompt solely for expansion. A valid legacy grant remains sufficient for the unchanged young-person consumer. A scope-2 check returns `null` for that grant, and an explicit scope-2 request explains the expansion before offering accept/reject. A new acceptance covers both pages; a new rejection refuses the entire purpose and clears accessible `_gcl_` storage. There is no partial refusal state.

Choices retain the existing 182-day lifetime and date-only storage convention. Expired or malformed choices return `null`, block measurement and permit a normal request. Invalid explicit scope values and future-dated grants fail closed. Browser storage is read afresh on every check. Storage events, including `localStorage.clear()`, and persisted `pageshow` resynchronise subscribers and visible settings. When storage is unavailable, the choice applies only to that page view in memory.

## C. Storage format

The key remains `mentorsphere-consent`. These are fake illustrative dates, not visitor data or valid current consent.

Before:

```json
{"version":1,"choices":{"advertising":{"value":"granted","date":"2000-01-01"}}}
```

After explicit expanded acceptance:

```json
{"version":1,"choices":{"advertising":{"value":"granted","date":"2000-01-02","scopeVersion":2}}}
```

A new refusal uses the same shape with `value: "denied"`. The date updates when a choice is actively made, not on a scope check or page visit.

## D. Consent API changes

| API | Behaviour |
|---|---|
| `get(purpose, requiredScopeVersion = 1)` | Returns `granted`, `denied` or `null`. Grants must meet the requested supported scope. Valid refusals cover both. Unsupported/malformed scope requirements return `null`. |
| `request(purpose, requiredScopeVersion = 1)` | Remembers the greatest supported requirement requested on that page and prompts only when no sufficient current decision exists. Existing refusals never prompt automatically. |
| `subscribe(listener, requiredScopeVersion = 1)` | Existing listeners retain scope-1 semantics. Optional scope-2 listeners receive the scope-aware value on each choice/resync, including `null` for a legacy grant. |
| `set(purpose, value)` | Signature unchanged. Valid explicit choices now write scope 2 with today's date and notify listeners. A denial stops listeners before accessible Google storage is removed. |
| `open(trigger = null, purpose = 'advertising')` | Signature unchanged. Cookie settings display the accurate current choice, including an explanatory legacy-scope state. |

Future adult wiring must use scope 2 in its initial check, request and subscription, and recheck scope 2 before every dispatch. The current adult page calls none of these automatically and has no measurement consumer. `consent.js` itself never loads third-party code. Existing young-person measurement code is unchanged and continues using the default scope 1.

## E. Banner and Cookie settings

Purpose title remains **Advertising measurement**. Button names remain **Accept advertising measurement** and **Reject advertising measurement**, displayed as Accept/Reject on narrow screens.

Updated question:

> Can The MentorSphere use Google Ads cookies on its ADHD coaching landing pages for young people and parents and for adults to measure whether adverts lead to enquiries or booking-page visits? Nothing is sent to Google unless you accept, and your enquiry details are never shared.

Legacy-grant explanation, shown in scope renewal and whenever Cookie settings review a legacy grant:

> Your previous acceptance covers the young people and parents page. The scope now includes the adults page. Please accept again before measurement can be used there, or reject measurement on both pages.

Expanded grants show “Your current choice: accepted.” Refusals show “Your current choice: rejected.” No choice shows “You have not made a choice yet.” Existing confirmation wording and the link to the detailed Privacy Policy are retained. Close without changing and Escape in settings retain the choice and restore focus. An automatic request does not steal focus or treat Escape/browsing as agreement. Cross-tab refresh does not leave focus in a hidden confirmation.

## F. Privacy Policy change

Previous scope:

> This is currently limited to the ADHD coaching page for young people and parents.

New scope:

> This is currently limited to the ADHD coaching landing page for young people and parents and the ADHD coaching landing page for adults.

Version: **V1.9**. Effective date: **3 October 2026**. Adopted locally; publication pending. V1.8 remains live according to the owner's brief. No newer reserved/adopted version was found in the repository policy records.

Change-log entry:

> V1.9, 3 October 2026: expanded the approved advertising-measurement scope to include the adult ADHD coaching advertising landing page alongside the young people and parents page; explained scope renewal for existing acceptances and continued respect for refusals. The consent implementation distinguishes the expanded scope. This revision does not activate adult measurement.

Section 13 also changes “that page” to “either of these pages”, explains narrow scope renewal and adds the scope field to the browser-storage disclosure. All existing exclusions, consent, withdrawal, retention and page-context disclosures are retained.

## G. Policy files created

- `business-documents/policies/current/docx/Privacy_Policy_V1.9.docx`
- `business-documents/policies/current/pdf/Privacy_Policy_V1.9.pdf`
- `business-documents/policies/source-snapshots/Privacy_Policy_V1.9.md`
- `business-documents/policies/PRIVACY_V1.9_DOCUMENT_CONTROL.md`
- `documentation/advertising/POLICY_DOCUMENT_QA_PHASE8_2026-10-03.md`

The editable/source controlled copy is the DOCX, with the approved HTML source recorded in the Markdown snapshot. This follows the existing archive pattern.

## H. Policy files modified

Website Privacy Policy and policy-directory card; parity manifest; archive README; CSV/XLSX policy registers; and an additive publication-status correction in V1.8 document control. V1.8 and earlier DOCX/PDF/snapshots remain unchanged. ADHD Coaching V1.5 remains unchanged substantively.

## I. Policy parity and governance

Website, DOCX, PDF and snapshot bodies match. There are 159 blocks: 153 old blocks retained verbatim, four approved replacements and two additions. Version, effective date, headings, section 13 and change log agree. All 10 PDF pages were inspected; tagged structure, three bookmarks and five link destinations are retained. DOCX accessibility audit: zero findings. See [document QA](POLICY_DOCUMENT_QA_PHASE8_2026-10-03.md).

The register contains 16 rows and 15 columns, checked cell by cell against CSV. Only two existing rows' status/notes and the new V1.9 row change; affected row heights were fitted for readable notes. All unrelated values, cell styles, freeze panes and table structure are preserved. The stale V1.8 publication-pending record is corrected using the owner's express live-policy confirmation, without inventing deployment identifiers.

## J. Adult measurement remains off

The adult page has no event markers, Ads configuration, Google Ads ID or conversion labels, Ads loader, Google tag or measurement allowlist approval. Its only change in this phase is the shared consent-script cache key. The actual validator was run against isolated copies containing trial adult configuration and a loader; both were rejected with “Google Ads measurement is not approved for this page”. No trial measurement code entered the working adult page.

## K. Young-person regression

The page differs from HEAD only in its consent-script cache key. ID `AW-18485496875`, enquiry label `7zLXCPz_lowdEKuYye5E`, booking label `bi_lCP__lowdEKuYye5E`, event names `adhd_young_people_enquiry_success` and `adhd_young_people_booking_click`, marker placement and Calendar destinations are unchanged. The entire measurement script is unchanged. Legacy grants continue enabling it; refusals, withdrawal and expiry continue blocking it. Enquiry success still requires provider confirmation; a booking click is never a confirmed booking or purchase.

## L. Legacy-consent test matrix

| Scenario | Scope 1 | Future scope 2 | Result |
|---|---|---|---|
| No record | Normal request | Normal request | PASS |
| Valid grant without scope | Granted, existing measurement works | Insufficient; explicit renewal required | PASS |
| Valid denial without scope | Denied | Denied; no automatic reprompt | PASS |
| Explicit scope-1 grant | Granted | Renewal required | PASS |
| Valid scope-2 grant | Granted | Granted; no repeat request | PASS |
| Valid scope-2 denial | Denied | Denied | PASS |
| Expired legacy grant | No grant; normal request | No grant; normal request | PASS |
| Expired scope-2 grant | No grant; normal request | No grant; normal request | PASS |
| Expired denial | Normal expired-choice behaviour | Normal expired-choice behaviour | PASS |
| Malformed record or invalid scope | Fail safely | Fail safely; no uncaught exception | PASS |
| Accept renewal | Remains granted | Scope 2 written; date renewed | PASS |
| Reject renewal | Denied; dispatch stops | Denied; accessible `_gcl_` storage removed | PASS |
| Storage event / cross-tab upgrade | Fresh state | Fresh scope and UI | PASS |
| Back/forward restoration | Fresh state | Fresh scope and UI | PASS |
| Cross-tab withdrawal / storage clear | Dispatch stops | No stale grant | PASS |
| Expiry before dispatch | Dispatch blocked | Fresh scope check blocks | PASS |
| Unavailable storage | Page-memory choice works | Scope 2 works for this page view only | PASS |
| Close settings / Escape | Choice retained | No implied upgrade | PASS |

## M. Accessibility and banner results

11 consent browser checks pass at 1280x800, 375x667 and 320x667, including reduced motion and touch/no-hover. Verified first-time, grant/refusal states, renewal explanation, equal choice weight and minimum 44px button heights, no horizontal overflow, keyboard order, visible focus, settings close/Escape, focused confirmation, focus restoration, real cross-tab storage propagation and history restoration. All external requests are blocked; three attempted Google-loader requests from authorised young-person fixtures were aborted. No Google script, conversion, real enquiry or Calendar booking was delivered by this QA.

27 existing adult-page browser checks pass, covering five representative widths, keyboard navigation, FAQ/form behaviour, no-JavaScript, touch and reduced-motion behaviour. Simulated provider responses remain local.

## N. Full validation

| Check | Result |
|---|---|
| Installed Vitest suite | **664/664 tests**, **24/24 files** |
| Consent and Ads measurement | 88/88, included above |
| Privacy policy | 7/7, included above |
| Policy parity | 11/11, included above |
| Adult landing | 17/17, included above |
| Young-person landing | 16/16, included above |
| Consent browser QA | 11/11 |
| Adult browser QA | 27/27 |
| Negative validator fixtures | 2/2 |
| Site/content validator | 42 HTML files passed |
| Wrangler type generation / TypeScript | Passed / passed |
| JavaScript syntax | 8 edited/new JS files passed |
| Policy generation/parity | Passed; 10 PDF pages reviewed |
| DOCX structural accessibility | 0 findings |
| CSV/XLSX parity | 16 rows x 15 columns passed |
| Sitemap XML | 34 URLs parsed; no Phase 8 sitemap edit |
| Git whitespace check | Passed |

Commands: `node node_modules/vitest/vitest.mjs run`, `node node_modules/wrangler/bin/wrangler.js types`, `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/validate-site.mjs`, `node scripts/qa-consent-scope.mjs`, `node scripts/qa-adhd-adults.mjs`, `node --check <each changed JS file>` and `git diff --check`. Generation/export commands and parity method are in the document QA record. Ignored `tmp/phase8` retains machine-readable results and isolated fixtures.

The pnpm wrapper stopped at an existing sharp build-policy condition, so installed runners were invoked directly. Its incidental workspace-YAML edit was removed; dependency approval settings were not changed. The standalone DOCX and Artifact Tool renderers were unavailable; the established Word/Excel read-only exports and pypdfium2 rendering completed visual QA successfully.

## O. Protected Google Ads state

No Google Ads account tool or interface was used. No action optimisation, value, label, window, goal, diagnostic or campaign was changed. Adult conversion actions were not wired. Their supplied Secondary status was left untouched, not independently re-queried.

## P. Files changed

Phase 8 changes 51 existing files and creates seven new files. Of the 39 public HTML updates, 37 are consent-cache-key-only; Privacy Policy and the policy directory also change policy content/version. Five existing tests, the consent manager, validator pin and policy governance/register files make up the other edits. The complete inventory follows below. Unrelated pre-existing adult-page, CSS, hub and sitemap work remains preserved.

## Q. Git diff summary

Tracked working-tree diff: **48 files, 431 insertions, 119 deletions**, including the pre-existing hub/CSS/sitemap/validator work. The Phase 8 share of this tracked diff is **46 files, 320 insertions, 118 deletions**. Git's diff summary excludes untracked controlled copies, registers, adult page/tests and new documentation/browser QA. Nothing is staged, committed or pushed by this phase.

## R. Remaining limits

V1.9 is not published. Adult activation requires a later authorised phase that uses scope 2 throughout its consumer and separately changes the allowlist/configuration. This phase verifies the future consent contract without introducing an adult measurement consumer. Live Google ingestion and attribution were intentionally not tested. Exact V1.8 publication identifiers were not supplied. No unresolved implementation or parity defect remains.

## S. Recommendation

**Ready for adult measurement wiring phase.** This is a readiness recommendation only; adult measurement remains off.

## Complete Phase 8 file inventory

| Change | File |
|---|---|
| Modified | `business-documents/policies/PRIVACY_V1.8_DOCUMENT_CONTROL.md` |
| Modified | `business-documents/policies/README.md` |
| Modified | `business-documents/policies/policy-parity-manifest.json` |
| Modified | `business-documents/policies/register/MentorSphere_Policy_Register.csv` |
| Modified | `business-documents/policies/register/MentorSphere_Policy_Register.xlsx` |
| Modified | `docs/404.html` |
| Modified | `docs/about/index.html` |
| Modified | `docs/accessibility/index.html` |
| Modified | `docs/adhd-coaching-policy/index.html` |
| Modified | `docs/adhd-coaching/access-to-work/index.html` |
| Modified | `docs/adhd-coaching/adults/index.html` |
| Modified | `docs/adhd-coaching/employer-funded/index.html` |
| Modified | `docs/adhd-coaching/index.html` |
| Modified | `docs/adhd-coaching/schools/index.html` |
| Modified | `docs/adhd-coaching/young-people/index.html` |
| Modified | `docs/assets/js/consent.js` |
| Modified | `docs/complaints-policy/index.html` |
| Modified | `docs/contact/index.html` |
| Modified | `docs/cover-tutor-policy/index.html` |
| Modified | `docs/education-send-support/eotas-education-access/index.html` |
| Modified | `docs/education-send-support/index.html` |
| Modified | `docs/education-send-support/meetings-evidence-communication/index.html` |
| Modified | `docs/education-send-support/private-exams-access-arrangements/index.html` |
| Modified | `docs/education-send-support/send-ehcp/index.html` |
| Modified | `docs/equality-diversity-inclusion-policy/index.html` |
| Modified | `docs/home-education/getting-started-foundations/index.html` |
| Modified | `docs/home-education/index.html` |
| Modified | `docs/home-education/planning-progress-mentoring/index.html` |
| Modified | `docs/home-education/qualifications-future-pathways/index.html` |
| Modified | `docs/index.html` |
| Modified | `docs/policies/index.html` |
| Modified | `docs/pricing/index.html` |
| Modified | `docs/privacy-policy/index.html` |
| Modified | `docs/safeguarding-policy/index.html` |
| Modified | `docs/send-neurodiversity-policy/index.html` |
| Modified | `docs/support-services/ehcp-support/index.html` |
| Modified | `docs/support-services/ehe-eotas/index.html` |
| Modified | `docs/support-services/index.html` |
| Modified | `docs/support-services/private-exams/index.html` |
| Modified | `docs/support-services/referral-preparation/index.html` |
| Modified | `docs/technical-requirements/index.html` |
| Modified | `docs/tutoring/english/index.html` |
| Modified | `docs/tutoring/index.html` |
| Modified | `docs/tutoring/maths/index.html` |
| Modified | `docs/tutoring/science/index.html` |
| Modified | `scripts/validate-site.mjs` |
| Modified | `tests/adhd-adults-landing.test.js` |
| Modified | `tests/adhd-young-people-landing.test.js` |
| Modified | `tests/ads-measurement-consent.test.js` |
| Modified | `tests/policy-document-parity.test.js` |
| Modified | `tests/privacy-policy-advertising.test.js` |
| Created | `business-documents/policies/PRIVACY_V1.9_DOCUMENT_CONTROL.md` |
| Created | `business-documents/policies/current/docx/Privacy_Policy_V1.9.docx` |
| Created | `business-documents/policies/current/pdf/Privacy_Policy_V1.9.pdf` |
| Created | `business-documents/policies/source-snapshots/Privacy_Policy_V1.9.md` |
| Created | `documentation/advertising/ADULT_ADHD_PHASE8_CONSENT_MIGRATION.md` |
| Created | `documentation/advertising/POLICY_DOCUMENT_QA_PHASE8_2026-10-03.md` |
| Created | `scripts/qa-consent-scope.mjs` |
