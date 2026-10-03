# Phase 9: adult ADHD coaching local advertising measurement

Prepared and tested locally on 3 October 2026. Deployment remains pending.

## A. Executive result

Ready for controlled deployment, subject to separate owner approval. Adult measurement is implemented locally behind advertising consent scope 2. Existing young-person scope-1 behaviour is retained. No commit, push, merge, deployment, Google Ads change, real enquiry or Calendar booking occurred.

## B. Files modified

Relative to the working tree at the start of Phase 9:

| File | Change |
|---|---|
| `docs/adhd-coaching/adults/index.html` | Seven booking markers, one form marker, scope-2 JSON and deferred runtime |
| `docs/adhd-coaching/young-people/index.html` | Ads-script cache key only |
| `docs/assets/js/ads-measurement.js` | Validate and pass the configured required consent scope |
| `scripts/validate-site.mjs` | Exact two-page allowlist and page-specific configuration checks |
| `scripts/verify-ads-measurement.mjs` | Authoritative, entirely mocked browser integration suite |
| `scripts/qa-adhd-adults.mjs` | Layout-only QA; overlapping form/consent checks consolidated into the integration suite |
| `scripts/qa-consent-scope.mjs` | Retain Phase 8 consent UI checks with adult measurement now eligible at scope 2 |
| `tests/ads-measurement-consent.test.js` | Scope-aware runtime integration and both-page isolation |
| `tests/adhd-adults-landing.test.js` | Exact adult configuration and marker assertions |
| `tests/adhd-young-people-landing.test.js` | Current Ads-script version assertion |
| `tests/privacy-policy-advertising.test.js` | Configuration consistency with the adopted V1.9 scope |
| `tests/ads-measurement-validator.test.js` | New: actual validator exercised against in-memory corruptions |
| `documentation/advertising/GOOGLE_ADS_MEASUREMENT_RECORD.md` | Pointer from historical implementation to this local record |
| `documentation/advertising/ADULT_ADHD_PHASE9_MEASUREMENT.md` | This record |

No Phase 9 change to `consent.js`, `site.js`, CSS, Privacy Policy V1.9, controlled policy documents, policy registers, sitemap, deployment settings or dependencies. The approved consent cache key remains `20261003-consent-scope-v2`.

## C. Adult configuration

```json
{
  "googleAdsId": "AW-18485496875",
  "requiredConsentScopeVersion": 2,
  "conversionLabels": {
    "adhd_adults_enquiry_success": "zVkyCOb3tI8dEKuYye5E",
    "adhd_adults_booking_click": "zp7QCOn3tI8dEKuYye5E"
  }
}
```

No value, currency, enhanced-conversion payload or form data is configured. JSON precedes deferred `site.js`, `consent.js`, then `ads-measurement.js`. The two landing pages and validator use `ads-measurement.js?v=20261003-ads-scope-v3`.

## D. Booking markers

Seven structurally verified Calendar CTAs: navigation, hero, pricing, free introduction, enquiry-side action, closing CTA and footer. Each has `data-measure-event="adhd_adults_booking_click"`. Existing `target="_blank"`, `rel="noopener"`, accessible wording and destination are unchanged.

Approved destination, common to all seven:

```text
https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ViGgA98iq2gb-3Xn3TdTTqfAdWXE2XN5SpS6PBaaZzRc5DXacuud78LNwUEHlSSk5VPAYTcB-
```

## E. Enquiry marker

The existing `form[data-contact-form]` inside `#enquiry`, posting to `https://formspree.io/f/meeynlze`, now carries `data-measure-event="adhd_adults_enquiry_success"`. Its fields, honeypot, privacy acknowledgement, source-page value, validation, accessibility and success/error UX are unchanged.

`site.js` raises the existing, data-free `mentorsphere:enquiry-success` only on its provider-confirmed success path and excludes honeypot submissions. The measurement listener consumes that hook; it does not measure viewing, filling or clicking Submit. Browser QA exercises this actual form pathway with intercepted responses, rather than manually dispatching the success hook.

## F. Runtime scope handling

Only absence of `requiredConsentScopeVersion` defaults to 1. The young-person JSON remains unchanged and uses this default. The adult JSON explicitly supplies numeric 2.

A present value must be exactly numeric 1 or 2. Zero, negative values, strings, null, 3, fractions, booleans, arrays, objects and NaN-like malformed JSON leave the runtime inert, even with a stored scope-2 grant. Invalid present values never fall back to 1.

Initial checks, conversion-time checks, `request` and `subscribe` use the configured scope. `MentorSphereConsent` remains the sole consent authority. The Ads runtime does not inspect localStorage or duplicate migration logic.

## G. Consent integration results

All rows passed using the actual consent manager and measurement runtime, in both automated unit integration and browser QA.

| Choice | Young-person page | Adult page | Automatic prompt |
|---|---|---|---|
| No choice | Off | Off | Normal request |
| Legacy grant, no scopeVersion | On | Off until explicit scope-2 acceptance | Adult expansion only |
| Legacy refusal | Off | Off | None |
| Scope-2 grant | On | On | None |
| Scope-2 refusal | Off | Off | None |
| Expired grant | Off until renewed | Off until renewed | Normal renewal |
| Malformed record or grant scope | Off | Off | Normal valid-choice request |

No Google script, gtag function, Ads configuration or Google request was present before sufficient consent. Prior clicks are not replayed after acceptance. Acceptance grants `ad_storage` and `ad_user_data`; `ad_personalization` and `analytics_storage` remain denied. The all-denied default precedes the grant and Ads configuration.

## H. Exact conversion targets

| Website event | Exact `send_to` |
|---|---|
| `adhd_adults_enquiry_success` | `AW-18485496875/zVkyCOb3tI8dEKuYye5E` |
| `adhd_adults_booking_click` | `AW-18485496875/zp7QCOn3tI8dEKuYye5E` |
| `adhd_young_people_enquiry_success` | `AW-18485496875/7zLXCPz_lowdEKuYye5E` |
| `adhd_young_people_booking_click` | `AW-18485496875/bi_lCP__lowdEKuYye5E` |

These are observed local queued `gtag('event', 'conversion', {send_to: ...})` commands, not claims of Google receipt.

## I. Each adult booking link

Each row passed separately with both pointer click and Enter activation in three contexts: no choice, legacy grant and scope-2 grant. Each activation opened the unchanged URL immediately in a locally mocked new tab. The runtime did not prevent navigation. No enquiry or young-person label fired.

| Link | No choice | Legacy grant | Scope-2 grant |
|---|---|---|---|
| Navigation | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Hero | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Pricing | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Free introduction | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Enquiry-side action | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Closing CTA | Opens; no conversion | Opens; no conversion | One booking command per activation |
| Footer | Opens; no conversion | Opens; no conversion | One booking command per activation |

## J. Actual adult form with mocked Formspree

| Scenario with scope-2 grant | Mock requests | Success hooks | Conversion commands | Existing UX |
|---|---:|---:|---:|---|
| Valid form, HTTP 200 confirmation | 1 | 1 | 1 adult enquiry | Success, reset and status focus |
| Empty required fields | 0 | 0 | 0 | Invalid fields identified |
| Invalid email | 0 | 0 | 0 | Email invalidity identified |
| HTTP 400 | 1 | 0 | 0 | Error; values retained |
| HTTP 422 provider validation error | 1 | 0 | 0 | Field error and status; values retained |
| HTTP 500 | 1 | 0 | 0 | Error; values retained |
| Network failure | 1 intercepted | 0 | 0 | Error; values retained |
| Honeypot filled, mocked HTTP 200 | 1 | 0 | 0 | Existing success-looking spam response; no measurement |

Valid mocked submissions also succeed without a choice and under a legacy grant, with zero adult measurement. Viewing and filling the form produces no conversion. No real enquiry was transmitted.

## K. Data exclusion

Exact conversion payloads contain only `send_to`. No name, email, telephone, message, privacy acknowledgement, health information, user-data payload, value or currency enters Google commands. Tests use distinct fictional form values and check their absence. The success hook has null detail. Form fields are available only to the unchanged form submission pathway and its local provider mock.

## L. URL and referrer sanitisation

Both pages retain only `gclid`, `gbraid` and `wbraid` on their canonical `page_location`. The adult base is `https://www.thementorsphere.co.uk/adhd-coaching/adults/`. All five UTM fields, arbitrary query values, search text and fragments are excluded. Configured `page_referrer` is reduced to origin. Formspree receives the clean canonical source page, without click IDs or UTM values. These checks concern application-supplied commands; the mocked vendor asset cannot prove all future vendor-generated network behaviour.

## M. Cross-page label isolation

Both pages dispatch only their own exact labels. Foreign event markers remain unhandled; the validator rejects foreign labels, extra event mappings and altered IDs. Navigation tests cover legacy grant on young, adult scope expansion, return to young, and scope-2 refusal on both.

## N. Withdrawal, cross-tab and history

An actual second browser tab upgraded the stored scope and activated the waiting adult runtime. Subsequent withdrawal propagated denied signals to both already-loaded page runtimes, stopped booking and enquiry commands, and removed accessible `_gcl_` cookies and localStorage items. The loaded script elements remain; they are not physically unloaded.

Unit integration covers scope upgrades, downgrade to scope 1, and withdrawal for both `storage` and `pageshow`. Browser QA exercises a synthetic `pageshow` with `persisted: true`, then actual back navigation. Adult scope is rechecked and stale scope does not permit dispatch. The harness does not claim that Chromium actually chose BFCache for that navigation.

## O. Blocked, failed and delayed Google scripts

All three passed. Booking navigation and the real form pathway with a mocked provider remain usable; no uncaught browser exception occurs; consent can still be withdrawn. Commands queued before withdrawal are distinguishable from delivery and are never reported as accepted conversions. Further conversion commands stop after withdrawal. The delayed tag is released after withdrawal to check that the latest queued consent remains denied.

## P. Validator

The allowlist is exactly `/adhd-coaching/young-people/` and `/adhd-coaching/adults/`. No directory wildcard is used. Other public pages and intake forms remain excluded.

Each allowed page must have one configuration, the correct ID, the exact pair of event names and labels, its required scope, no unexpected configuration fields, the current deferred runtime in the correct order, all approved Calendar markers and destination, and the matching Formspree form marker. The adult page requires seven booking links; the young-person page requires six. Extra markers are rejected.

Twenty-eight validator tests execute the actual validator using in-memory HTML alterations, including malformed/missing adult scope, label contamination, duplicate or malformed JSON, extra events, altered destinations, non-deferred/wrong-order runtime, and forbidden pages.

## Q. Privacy V1.9

The implementation remains within the adopted two-page scope, optional consent and renewal rules, enquiry/book-click distinction, page-context disclosures, data exclusions and withdrawal behaviour. No material discrepancy was found. V1.9 and its controlled source/PDF/DOCX remain unchanged. Its change-log statement that the policy revision itself did not activate adult measurement remains historical and accurate; this separate Phase 9 implements local activation.

## R. Visual regression

Both pages were checked at 1366 x 768, 375 x 667 and 320 x 667. All six full-page screenshots with remembered refusal were byte-identical to screenshots generated from the saved pre-edit HTML/runtime baseline. Hero and CTA layouts are unchanged. New JSON and attributes add no visible page content.

Separate first-visit consent screenshots confirm the banner, keyboard focus, minimum 44-pixel accept/reject targets, reduced motion and narrow touch layouts remain usable without horizontal overflow. The banner is expected to appear on the adult page when consent is insufficient and can overlay part of the initial hero while awaiting a choice. Desktop and mobile images were also visually inspected.

## S. Validation and exact counts

| Check | Result |
|---|---|
| Complete installed Vitest suite | 718 passed, 0 failed, 25 files |
| Adult landing tests, included above | 17 passed |
| Young-person landing tests, included above | 16 passed |
| Consent and measurement tests, included above | 113 passed |
| Measurement validator tests, included above | 28 passed |
| Privacy tests, included above | 8 passed |
| Policy document parity, included above | 11 passed |
| Authoritative measurement browser suite | 63 passed, 0 failed |
| Additional adult layout/accessibility QA | 19 passed, 0 failed |
| Consent UI/browser regression | 11 passed, 0 failed |
| Site/content validator | 42 HTML files passed |
| TypeScript | `tsc --noEmit` passed |
| JavaScript syntax | Edited runtime, validator, QA scripts and tests passed |
| Sitemap XML | Parsed; 34 URLs |
| `git diff --check` | Passed |
| External services contacted by browser QA | 0 |

The installed Node/Vitest runner was used directly. pnpm was not invoked or repaired and dependency state was not changed. The previous wrapper issue was not re-tested.

Reproduction from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node scripts/validate-site.mjs
node scripts/verify-ads-measurement.mjs
node scripts/qa-adhd-adults.mjs
node scripts/qa-consent-scope.mjs
git diff --check
```

The measurement harness also accepts an installed Playwright module, an output directory outside `docs`, and an optional baseline directory. The initial run's delayed-tag scenario timed out because the harness waited for the deliberately delayed load event. Changing only the harness to wait for DOM readiness resolved that; the final run passed all 63 checks. Earlier one-page-only test assertions were updated to the authorised two-page scope.

## T. Implementation evidence

Current record: this file. Historical record linked to it without rewriting earlier deployment history. Local, unpublished QA artifacts:

- `tmp/phase9/vitest.json`
- `tmp/phase9/browser/report.json` and before/after/consent screenshots
- `tmp/phase9/adult-layout/browser-qa.json`
- `tmp/phase9/consent-ui/results.json`
- `tmp/phase9/changed-from-baseline.txt`
- `tmp/phase9/phase9-diff-summary.json`

All browser contexts are fresh and service workers are blocked. Requests to the apparent production origin are fulfilled from repository files. Google tag requests receive an inert local JavaScript stub, a controlled delay or an abort. Formspree and Calendar are mocked, and every other remote request is aborted. No live tag asset is downloaded and no collector is contacted. The record does not claim Google ingestion has been verified.

## U. Google Ads account

No account was opened or altered. No actions, goals, campaigns, bidding or budgets were changed. The owner's verified starting state is retained as supplied: Adult ADHD - Enquiry submitted and Adult ADHD - Booking page click are Secondary, without values; no custom goal and no adult campaign. This phase does not independently re-verify live account state. Calendar and Formspree configuration were untouched.

## V. Git and preservation

Current branch remains `codex/adult-adhd-phase5`.

HEAD remains `9546ee214fbf942d4de058b3594dbd34a0d4f148`.

Before editing, the branch, HEAD, full status including untracked files, and SHA256 hashes of repository files were saved under `C:/Users/luke9/AppData/Local/Temp/mentorsphere-phase9-baseline`. Relevant editing targets were also copied there. `.pnpm-store` contents were not hashed; the directory was preserved and no package manager was used.

Phase 9 changes 12 existing working-tree files and adds the validator test and this record. Only three public files change: the adult HTML, the young-person Ads cache key and the shared Ads runtime. The runtime delta is 10 added and 4 removed lines. Adult HTML differs only by the eight markers, JSON and loader; young HTML differs only by the single Ads cache key. These narrow diffs were asserted against the saved baseline.

The larger repository diff against HEAD includes approved Phase 2 to 8 work and is not a Phase 9 change summary. Hash verification confirms all files outside the Phase 9 file list remain unchanged, including policies and registers. No files were reset, removed, stashed or replaced from main. No commit, push, merge or deployment was performed.

## W. Remaining limitations

- No completed Calendar attribution: opening its page is a behavioural proxy, not an appointment.
- Consent rejection, expired choices and blockers reduce observable conversions.
- Local QA verifies application decisions and queued commands, not acceptance by Google's servers, Ads diagnostics, attribution or reporting.
- Actual BFCache selection and real third-party vendor execution are not claimed by this mocked harness.
- Deployment and any later live verification require separate owner approval.

## X. Recommendation

**Ready for controlled deployment.** Phase 9 ends with this tested local implementation. Nothing has been committed, pushed, merged or deployed.
