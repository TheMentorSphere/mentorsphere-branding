# Google Ads measurement record

Current local implementation: [Phase 9 adult measurement wiring](ADULT_ADHD_PHASE9_MEASUREMENT.md). That record supersedes the historical one-page scope and browser QA commands below. The current QA harness mocks the Google asset locally and makes no live external requests. Deployment of Phase 9 remains pending.

Implementation prepared: 29 and 30 September 2026 on `adhd-google-ads-measurement` (PR #64).
PR #64 was merged and deployed on 30 September 2026 at commit `2a843db8231ec923e1161f37b524c59f89fa0874`. Its GitHub Pages build and deployment and CI both succeeded. Fresh browser loads confirmed Privacy Policy V1.7 and ADHD Coaching Policy V1.5 are live, effective from 30 September 2026.

Activation branch: `adhd-google-ads-activation`, based on that current `origin/main` commit. The Google Ads account was hardened and checked before the website configuration was populated. This activation change is for pull-request review only; it has not been merged or manually deployed. No campaign has been launched.

## 1. Owner decisions recorded for this implementation

| Decision | Implementation |
|---|---|
| Consent is asked again after six months | `CHOICE_LIFETIME_DAYS = 182` in `docs/assets/js/consent.js` |
| Activate the approved Google Ads Conversion ID and two labels | `AW-18485496875` and the two owner-supplied labels are configured only in the existing young people page JSON block; `ads-measurement.js` stays generic and unchanged |
| Enquiry success is the Primary conversion | `adhd_young_people_enquiry_success`, raised only after Formspree confirms receipt |
| Calendar booking click is a Secondary observation only | `adhd_young_people_booking_click`; a click is never treated as a booking and no `booking_confirmed` event exists |
| Not used | Enhanced conversions, remarketing, Customer Match, Google Analytics, Meta Pixel |
| Measurement scope | Only `docs/adhd-coaching/young-people/index.html` loads `ads-measurement.js` and its configuration |
| Consent control scope | The shared consent manager and "Cookie settings" are on every public page |

## 2. Google Consent Mode audit

Checked against Google's first-party documentation on 29 September 2026. The Google for Developers pages showed "Last updated 2026-07-30 UTC".

| Signal | Meaning (Google) | Before a choice | After acceptance | After rejection or withdrawal |
|---|---|---|---|---|
| `ad_storage` | Advertising cookies and identifiers | No Google code loaded; default `denied` is set before the tag is configured | `granted` | `denied` |
| `ad_user_data` | Sending user data related to advertising to Google | No Google code loaded; default `denied` | `granted` | `denied` |
| `ad_personalization` | Personalised advertising, including remarketing | No Google code loaded; `denied` | `denied` | `denied` |
| `analytics_storage` | Analytics cookies, such as visit duration | No Google code loaded; `denied` | `denied` | `denied` |

Reasons:

- `ad_storage` and `ad_user_data` are separate signals. `ad_storage` only controls advertising cookies. The Google Ads consent mode reference states that `ad_user_data` is "required for measurement use cases, such as enhanced conversions and tag-based conversion tracking". Standard tag-based conversion measurement therefore needs both once the visitor accepts. Granting `ad_user_data` does not by itself enable enhanced conversions: no `user_data`, `user_id` or form value is ever given to the tag.
- `ad_personalization` stays denied because no remarketing or personalised advertising is used. `allow_ad_personalization_signals: false` is also set; Google documents that personalisation happens only when that parameter is true and `ad_personalization` is granted.
- `analytics_storage` stays denied because Google Analytics is not used. `allow_google_signals: false` is set.
- Basic consent mode is used: Google describes basic mode as preventing Google tags from loading until the visitor interacts with the banner, so nothing is sent before a choice. Accordingly `ads-measurement.js` loads nothing before acceptance, then sets the all-denied default before the update, `js` and `config` commands, as Google's basic-mode guide orders them.
- `ads_data_redaction` is set to `true`. Google documents that it has no effect while `ad_storage` is granted and that, once `ad_storage` is denied, ad click identifiers in Google Ads requests are redacted. It protects a withdrawal made while the tag is already loaded.
- `url_passthrough` stays `false`; it only applies to advanced consent mode with `ad_storage` denied.

First-party sources:

- [Consent mode overview (Google for Developers)](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Set up consent mode, basic implementation (Google for Developers)](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [Set up consent mode, advanced features: ads_data_redaction and url_passthrough (Google for Developers)](https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced)
- [Privacy settings: allow_ad_personalization_signals and allow_google_signals (Google for Developers)](https://developers.google.com/tag-platform/security/guides/privacy)
- [Consent mode reference (Google Ads Help)](https://support.google.com/google-ads/answer/13802165)
- [About consent mode (Google Ads Help)](https://support.google.com/google-ads/answer/10000067)
- [Cookies used by Google advertising products](https://business.safety.google/adscookies/): `_gcl_au`, `_gcl_aw`, `_gcl_gb`, `_gcl_dc` and `_gcl_gs` are listed with a 90-day lifespan, matching Privacy Policy V1.7 section 13.

Pinned by `tests/ads-measurement-consent.test.js` ("Google Consent Mode signals"): the exact default, grant and withdrawal states of all four signals through accept, withdraw and accept again; exactly four keys in each call; `ad_user_data` always equal to `ad_storage`; personalisation and analytics never granted; defaults, redaction and pass-through set before `config`; no Google command before acceptance; no user-data parameters in any call or in the script.

## 3. Site-wide Cookie settings

- `consent.css` and `consent.js` (`?v=20260929-consent-v1`) are loaded on all 38 public pages, after `site.js`. The edit was mechanical: one stylesheet line and one script line per page, preserving each file's line endings. No footer markup, wording, navigation, SEO or design changed.
- `consent.js` adds a "Cookie settings" button to the shared `.footer-bottom` row. It never loads third-party code and shows no banner by itself.
- The three unlisted intake forms (`docs/forms/*`) are excluded. They are not linked from public pages, have their own restrictive Content Security Policy, and must never be an advertising measurement source.
- A choice can be made or changed on any page. On ordinary pages this records the choice only. Google code can load only on the young people page, and only once the page has real Google Ads identifiers and the visitor has accepted.
- The Privacy Policy section 13 button (`data-consent-open`) opens the same control.
- `scripts/validate-site.mjs` now requires exactly one current consent stylesheet and script on every public page, forbids consent and measurement scripts on intake forms, and allows `ads-measurement.js` and its configuration only on the approved page, loaded after `consent.js`.

## 4. Withdrawal

- Rejecting or withdrawing stores `denied` with the date in the site's own `mentorsphere-consent` item, tells a loaded tag (`consent update`, all denied) and removes first-party `_gcl_*` cookies (host and parent-domain forms) and `_gcl_*` browser storage such as `_gcl_ls`. Unrelated cookies and storage are kept. Google's own cookies on Google domains cannot be removed by this website; the Privacy Policy says Google may use its own cookies under its terms.
- Conversions are recorded only while the stored choice is `granted`. The check reads browser storage each time.
- Fixed in this refinement: a page restored from the browser's back/forward cache could previously rely on an in-memory acceptance after the visitor withdrew on another page. Browser storage is now the source of truth whenever it works, and pages re-apply the stored choice on `pageshow` and on `storage` events. The in-memory copy is used only when the choice cannot be stored.
- A rejection is remembered by `mentorsphere-consent` alone. Returning to the young people page after a withdrawal, including from a new advert click, loads no Google code, shows no banner and records no conversion.
- An expired choice (over 182 days) is treated as no choice, and Google Ads storage is removed on any page.

## 5. Form privacy

- The PR #63 `source_page` logic in `site.js` is unchanged. Formspree receives only the canonical page address, with no query string, click identifier, campaign tag, search term or fragment, whether consent is granted, denied or not yet given.
- The only `site.js` change dispatches `mentorsphere:enquiry-success` after Formspree confirms an enquiry. The event carries no form data and is not raised for spam-trap submissions.
- Google receives only the conversion target (`send_to`) and, for the booking click, `transport_type: 'beacon'`. The configured page address is the canonical page plus any `gclid`, `gbraid` or `wbraid` value; the referrer is reduced to its origin.
- Tests confirm that no name, email, telephone number, message, form field, diagnosis or health text, UTM value or search term reaches the Google command queue. The ADHD Coaching Intake is not a measurement source.

## 6. Mobile consent banner

Measured locally in Chrome through Playwright on 29 September 2026, with the banner requested as the measurement script would request it. All non-local requests were blocked; none were attempted.

| Viewport | First-visit banner | Share of viewport | Choices (width x height) | Opened from Cookie settings | After a choice |
|---|---|---|---|---|---|
| 1366 x 800 | 154.9px | 19.4% | 311.5 x 44.3 each | 191.2px (23.9%) | 81.6px (10.2%) |
| 768 x 1024 | 204.4px | 20.0% | 301.5 x 44 and 298.6 x 44 | 295.1px (28.8%) | 134.2px (13.1%) |
| 375 x 812 | 212.3px | 26.1% | 173.5 x 44 each | 294.7px (36.3%) | 150.3px (18.5%) |
| 320 x 568 | 233.9px | 41.2% | 146 x 44 each | 316.2px (55.7%) | 150.3px (26.5%) |

The previous banner occupied about 37% of 375 x 812 and 57% of 320 x 568. At every size there is no internal scrolling and no horizontal overflow, the page reserves space so no content is hidden behind the banner, body text is 14.9px or larger, and both choices share one style.

Changes: a shorter explanation; the policy link now sits at the end of the explanation; on small screens Accept and Reject sit side by side at equal width. Their visible labels are "Accept" and "Reject" there, while their accessible names remain "Accept advertising measurement" and "Reject advertising measurement" (the context words are visually hidden only below 36rem). Nothing is preselected or focused automatically. The banner is hidden when printing.

The panel opened from Cookie settings is taller because it adds the current choice and "Close without changing". It is opened deliberately by the visitor and can be closed with that button or Escape.

## 7. Accessibility checks

These are the pre-activation checks from 29 September 2026, when the shipped IDs were empty. The activated page's browser checks are recorded in section 9.

- Keyboard order at 320 x 568 and 1366 x 800: skip link, "How advertising measurement works", Accept, Reject, then the page. Each shows a 3px solid focus outline. Enter on Accept records the choice and moves focus to the confirmation (`role="alert"`).
- Cookie settings on an ordinary page at 375 x 812: the button is 89 x 24px (WCAG 2.2 target size minimum); Enter opens the panel with focus on its heading; Escape closes it and returns focus to the button.
- The banner is a labelled region ("Advertising measurement"). Both choices are found by their full accessible names.
- Reduced motion: with `prefers-reduced-motion: reduce`, the banner has no animation and all transitions resolve to effectively zero through the site-wide rule. The banner adds no motion of its own.
- All 38 public pages show a visible Cookie settings control, with no Google script, no `dataLayer`, no automatic banner and no page errors, including after acceptance.

## 8. Google Ads privacy hardening and action verification

Checked and saved through Google's browser interface on 30 September 2026, before repository activation. The embedded settings panel could be read but its click controls failed, so its displayed settings URL was opened directly. No interface restriction was bypassed and no Google Tag Manager container or new tracking implementation was installed.

| Tag control | Verified final state |
|---|---|
| Allow user-provided data capabilities | Off, saved and reopened to confirm |
| Automatic detection of email, phone, name and address | No longer active: these controls disappear when the capability is off; Google states no product or account using the tag can receive data from this feature |
| Page views on browser history change | Off, saved and reopened to confirm |
| Scrolls | Off, saved and reopened to confirm |
| Outbound clicks | Off, saved and reopened to confirm |
| Form interactions | Off, saved and reopened to confirm |
| Video engagement | Off, saved and reopened to confirm |
| File downloads | Off, saved and reopened to confirm |
| Ordinary page views | Checked and disabled in Google's interface: cannot be turned off there. Left unchanged. The website retains `send_page_view: false` and queues no automatic page-view event. Google's loaded vendor script nevertheless attempts `page_view`-labelled requests after consent; see section 9 |
| Customer Data Terms | Unaccepted: the acceptance checkbox is unchecked; exited without accepting or saving |
| Enhanced conversions | Off at account level; Not configured on both conversion actions |
| Enhanced conversions for leads | Off and not configured: the account-level switch is unchecked |

| Conversion action | Category | Role | Count | Nominal Google Ads value |
|---|---|---|---|---|
| ADHD Young People - Enquiry Submitted | Submit lead form (shown as Submit lead forms) | Primary | One | £1 |
| ADHD Young People - Booking Page Click | Outbound click (shown as Outbound clicks) | Secondary | One | £1 |

The £1 values are reporting defaults in Google Ads only. The website sends no conversion value or currency and no value-based bidding was enabled. Neither action was edited, no action was created and no completed-booking action exists. The Outbound click goal's Misconfigured warning was left alone; no Primary outbound-click action was added.

The campaign view showed zero campaigns and zero drafts. Audience manager showed no data segments and no audiences. No remarketing, audience-building, Customer Match, conversion-based customer lists, Google Analytics, automatic conversions, gateway or site-wide installation was enabled. No personal contact, health, diagnosis, intake or form data is supplied to Google Ads by the website. Consented click identifiers and technical information Google may collect are described separately in Privacy Policy V1.7 section 13.

The site's security headers set no global Content Security Policy for public pages, so no header change is needed for the Google tag. If one is added later, it must allow the Google Ads tag hosts on the young people page only.

## 9. Activation validation

The activation tests pin the exact approved configuration in the young people page, including the booking label's double underscore. They check that no account ID appears on unrelated pages, no Google tag ID appears anywhere in `docs`, and neither the account ID nor either label is hard-coded in the generic measurement script. Existing consent, enquiry-success, booking-click, withdrawal, no-user-data and Formspree canonical `source_page` tests remain in place. Tests also exercise the shipped real configuration before consent, after rejection, after acceptance and after withdrawal.

Automated checks passed: Wrangler type generation, TypeScript `--noEmit`, the full Vitest suite (23 files, 601 tests), content validation (41 HTML files, local links/assets, metadata and intake privacy controls), JavaScript syntax checks (29 files), Worker dry build and `git diff --check`.

Environment note: `pnpm run check` stopped before running checks because the runtime pnpm wrapper attempted dependency installation and encountered an ignored `sharp` build. Its automatic workspace-file addition was reverted. The repository's installed Wrangler, TypeScript and Vitest commands were then run directly from `node_modules`, with the same arguments as the package scripts. No package, lockfile, Wrangler, deployment or workspace configuration change is included.

Local Chrome verification passed 15 checks with no page errors. It used the real Google `gtag.js` asset fetched without browser cookies, referrer or form data. Every collection/conversion endpoint was intercepted and aborted. Calendar navigation was inspected with its request blocked, and enquiry success was simulated through `mentorsphere:enquiry-success`; no real Formspree enquiry or Calendar booking was submitted.

- Before consent: no Google script, request, `gtag`, `dataLayer`, `_gcl` cookie or storage, or conversion.
- Rejection: no Google measurement; enquiry and booking controls remain usable.
- Acceptance: the tag loads with the approved AW ID. Defaults are all denied; acceptance grants only `ad_storage` and `ad_user_data`. Personalisation and analytics remain denied. `send_page_view` is false and the website queues no `page_view` event.
- Enquiry and booking: real, blocked Google conversion requests use the exact approved account and respective labels. Enquiry payload is only `send_to`; booking adds only `transport_type: 'beacon'`. No value, currency or completed-booking event is supplied by the website. Measurement does not prevent or delay booking navigation.
- Payload privacy: synthetic name, email, phone, message, health, diagnosis, ADHD and intake text entered in the unsubmitted form never appears in the command queue or intercepted request URLs/bodies. There is no user-data/enhanced-conversion command. Google page-location handling excludes UTM values, search terms, arbitrary query values and fragments; only `gclid`, `gbraid` and `wbraid` are permitted. Formspree's hidden `source_page` is the clean canonical URL; existing mocked-provider tests verify the same value in its submission payload.
- Withdrawal: all four signals become denied, further enquiry and click signals create no conversion, first-party Google Ads cookies/storage are removed, and reload leaves Google code absent.
- Layout/accessibility: 1366px, 375px and 320px views have no horizontal overflow, equal consent choices at least 44px tall, the expected keyboard order and reduced-motion support. Touch/no-hover rejection works.
- Scope: ordinary pages and all three intake pages have no Google measurement implementation, even after acceptance elsewhere. No browser page errors occurred.

**Observed Google limitation:** after acceptance, the real vendor script attempted requests with `en=page_view` at Google's `/ccm/collect` and `/pagead/set_partitioned_cookie` endpoints despite `send_page_view: false` in the website configuration. These requests were blocked during QA and carried no tested excluded URL or form values. The ordinary page-view control is locked in Google's interface. Therefore the validation does not claim an absence of all vendor-generated page-view-labelled requests after consent. The website queues only the two deliberate conversion events. In accordance with the owner's instruction, no interface restriction was bypassed and the website implementation was not changed merely to address this locked control. This limitation is disclosed for review before merge.

## 10. Conversion and privacy investigation, 3 October 2026

This section records the hardening branch; sections 1 to 9 retain the historical implementation and activation evidence. The live campaign is now enabled according to the owner's brief, superseding the earlier zero-campaign observation. No campaign or account control was changed in this investigation.

### Standalone Tag Assistant observation

The preceding standalone session connected after advertising consent and detected `AW-18485496875` (alias `GT-MBNSN8SX`). Consent granted `ad_storage` and `ad_user_data`, with `ad_personalization` and `analytics_storage` denied. One booking link opened Google Calendar, but the expected conversion was not displayed in that session. The owner skipped the proposed synthetic enquiry test. No enquiry was submitted or appointment booked. Both conversion actions were reported as Misconfigured / never received data despite the tag reporting healthy data flow.

**The cause of that missing Tag Assistant display is not established.** The following tests reproduce the shipped code successfully; they cannot establish what happened in that earlier live session or confirm Google's ingestion/attribution. No additional production event was generated to resolve it.

### Official guidance and implementation decisions

Current first-party guidance was read before changing code:

| Guidance | Relevant finding and application |
|---|---|
| [Google Ads click conversion snippet](https://support.google.com/google-ads/answer/6331304?hl=en) | Google's example sends `conversion` with `send_to` and uses `event_callback` to navigate the current window. That is a navigation-control example, not evidence that a new-tab link needs a delay. |
| [gtag control parameters](https://developers.google.com/tag-platform/gtagjs/reference/parameters) | Documents `send_to`, `event_callback` and `event_timeout`. Callback marks event processing, not proof of ingestion. The reviewed Ads/control guidance does not establish `transport_type` as an Ads delivery control. |
| [Website conversions](https://support.google.com/google-ads/answer/7548399?hl=en) | Describes Google tag plus conversion event and first-party click information. Preserve the approved ID/labels and attribution identifiers. |
| [Google tag automatic event detection](https://support.google.com/tagmanager/answer/12131703?hl=en) | Ordinary page views cannot be disabled; optional history, scroll, click, form and other detection are separate controls. Existing off settings were not changed. |
| [Page configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config) | Documents `page_title`, `page_location`, `page_referrer` and `send_page_view`. This reference is Analytics-scoped, so it is not a guarantee about every Ads request. Actual Ads vendor behaviour was tested separately. No GA destination was added. |
| [Consent Mode implementation](https://developers.google.com/tag-platform/security/guides/consent) | Keep consent defaults before configuration/events and update on the user's choice. This site uses basic gating: no Google code before active acceptance. |
| [Google tag privacy controls](https://developers.google.com/tag-platform/security/guides/privacy) | Personalisation controls are distinct from conversion measurement. Keep `allow_ad_personalization_signals: false`, and deny personalisation/analytics storage; do not claim these suppress every Ads page-context request. |

The original implementation reliably queued one exact booking conversion and caused both Google conversion endpoints to be attempted for each click. Mouse and keyboard activation of all six marked links kept the originating page alive while opening a new tab. A delayed tag flushed queued events once loaded. A completely blocked tag did not prevent booking navigation. There is no demonstrated navigation race to fix: **no callback, timeout, `preventDefault`, new delay or changed target** was added.

`transport_type: 'beacon'` was removed as unnecessary custom payload. In the original and no-beacon tests, the conversion requests both used GET/fetch to the same endpoints. The original parameter appeared as `data=event=conversion;transport_type=beacon`; removing it left `data=event=conversion`, with correct counts/targets and unchanged navigation. This is a supported-pattern simplification backed by observed payload reduction, not a claimed repair of the inconclusive Tag Assistant result.

Final website event calls after consent:

```js
gtag('event', 'conversion', { send_to: 'AW-18485496875/bi_lCP__lowdEKuYye5E' });
gtag('event', 'conversion', { send_to: 'AW-18485496875/7zLXCPz_lowdEKuYye5E' });
```

The first is one signal per marked booking-link activation, still a Secondary outbound-click observation. It does not mean a booking was made. The second follows the existing provider-confirmed enquiry success hook. No value, currency, personal fields, new event type or confirmed-booking signal is supplied. IDs remain configured in the landing page, not hard-coded in the generic script.

### Vendor requests and privacy limits

All requests below were intercepted before transmission in isolated local fixtures. “Observed” means attempted request, not received or attributed conversion. [Representative exact URLs, query maps, methods, bodies, headers, command queues and storage snapshots](GOOGLE_ADS_NETWORK_EVIDENCE_2026-10-03.json) are committed for review. Test click IDs are literal dummy strings; no personal data was entered.

| Field | Original | Final configuration and observed result |
|---|---|---|
| Automatic endpoints | `https://www.google.com/ccm/collect` and `https://www.googleadservices.com/pagead/set_partitioned_cookie` | Both still attempted after consent with `en=page_view`; no website `page_view` command |
| Method/body | CCM POST/fetch; partitioned-cookie GET/fetch, plus GET/image fallbacks after abort | Same observed forms, all with null/empty body; data in query parameters |
| Page address | `dl` or `url`: `https://www.thementorsphere.co.uk/adhd-coaching/young-people/` | Same real canonical path, including ADHD context; no query or fragment on these automatic requests |
| Automatic page title | `dt=Online ADHD Coaching for Young People and Parents | The MentorSphere` | `dt=The MentorSphere` after explicit measurement configuration `page_title: 'The MentorSphere'` |
| Automatic referring page | `dr` or `ref`: fixture `https://www.thementorsphere.co.uk/referrer-path` | Path remains, query excluded. The vendor derives this despite configured origin-only `page_referrer`; do not promise origin-only referrer on every vendor request. HTTP Referer header was origin-only. |
| Click identifiers | `gclid=TESTCLICK`, `gclaw=TESTCLICK` | Preserved; conversion `url` retains the allowed `gclid`, `gbraid`, `wbraid` query values |
| Consent/privacy | `gcs=G110`, `gcd=13r3q3r3q7l1`, `npa=1` | Same observed values after acceptance; command queue confirms exactly the four intended consent states |
| Other automatic query fields | `rcb`, `frm`, `apvc`, `auid`, `tid`, `scrsrc`, `lps`, `rnd`, `navt`, `_tu`, `gtm`, `dma`, `tag_exp`, `tft`, `tfd`, `tids`, `fmt` | Tag/account, identifiers, timing, navigation, version and vendor flags remain; exact values in evidence. Unspecified vendor flags are not assigned an undocumented meaning. |
| Browser headers | User-Agent and client hints (browser/version, platform, mobile state); Accept, Origin where applicable, Referer | Still present. Interception cannot capture Google server-side processing or an IP address received by Google. |
| First-party storage | `_gcl_au`, `_gcl_aw` cookies; `_gcl_ls` local storage with test click ID, counters and join identifier; site's `mentorsphere-consent` | Created only after consent in the fixture; accessible `_gcl` items removed on withdrawal. No `_ga` observed. No Google-domain response cookies can be assessed because requests are aborted. |

Conversion requests go to `https://www.googleadservices.com/pagead/conversion/18485496875/` and `https://www.google.com/pagead/1p-conversion/18485496875/`. Each event attempted one request at each endpoint. These two vendor requests are not duplicate website events. Conversion `url` is canonical plus the three allowed click IDs, `ref` is origin-only and `top` is the public canonical path. **Conversion `tiba` remains the public ADHD page title even with the neutral measurement title.** Other query fields include label, browser/device dimensions and client hints, identifiers, consent flags, timestamps and vendor flags, as captured in the evidence.

No tested UTM value, search term, arbitrary query value, referrer query or fragment reached a Google URL/body. Existing adversarial unit tests also verify that form/personal/intake information is not put into Google commands. Formspree `source_page` remains canonical origin plus pathname with no identifiers/query/fragment. No Formspree request was made in browser QA.

Neutral title configuration was tested independently and then together with beacon removal. It reduces the automatic title field without changing the public title, canonical path, conversion target, consent or click IDs. This is limited measured minimisation, not complete anonymisation or removal of ADHD context. A fabricated root-only `page_location` was considered and rejected without a browser experiment: it would misrepresent the viewed page and was not established as a safe Ads attribution technique. Existing canonical sanitisation is retained. No undocumented vendor patch, locked-control workaround, account setting or public-title change was made.

Ordinary automatic page views remain a Google-side limitation after acceptance. A URL or public title indicating an ADHD service is page context; it does not establish a visitor's diagnosis, but it is still relevant to privacy disclosure. **Privacy Policy V1.8**, adopted/effective **3 October 2026**, makes that context, the title/referrer and automatic page views explicit while preserving the exclusion of individual information supplied through forms and all consent protections. See [document control](../../business-documents/policies/PRIVACY_V1.8_DOCUMENT_CONTROL.md).

### Reproducible browser validation

`scripts/verify-ads-measurement.mjs` accepts an installed Playwright module path and an output directory outside `docs`. It uses fresh Chrome contexts, serves local repository files through routing under the site origin, disables service workers and never continues a remote browser request. The only real external request is a separate cookie/referrer-free Node download of the exact `gtag.js` asset, with redirects rejected. Google collectors, Calendar and Formspree are always blocked. It never connects to a signed-in browser or touches Ads settings.

Final run: 3 October 2026, baseline `7535d62917d60e1dff7c94369919f8c079fa3eb4`, vendor SHA-256 `f717548bb4544b39ad2fcd9a1f520b54498a95c89f4f6900c35ead893a558fe4`.

| Mode | Booking links exercised | Conversion requests intercepted | Result |
|---|---:|---:|---|
| Original shipped implementation | 6 | 14 | PASS |
| Original without beacon parameter | 6 | 14 | PASS |
| Original with neutral measurement title | 6 | 14 | PASS |
| Final implementation, desktop 1366 x 800 | 6 | 14 | PASS |
| Final implementation, mobile 375 x 812 | 5 visible controls | 12 | PASS |
| Final implementation, tag delayed until after clicks | 6 | 14 | PASS |
| Final implementation, tag blocked | 6 | 0 | PASS: queue and navigation survive; transmission cannot occur |

Counts include one locally simulated enquiry success per mode, with two conversion endpoint attempts per event when the tag loads. Desktop mouse/keyboard covers every marked link; mobile touch covers five visible controls (the sixth is inside collapsed navigation). All seven modes check first visit, rejection, acceptance, exact consent/configuration/targets, enquiry hook, URL sanitisation, withdrawal, storage cleanup, reload and no horizontal overflow/page errors. Desktop/mobile screenshots were inspected; reduced-motion mode and mobile no-hover/touch were used. All collector attempts were aborted, including fallback image requests. These tests do not establish server acceptance, reporting delay, production ad-blocker behaviour or future vendor behaviour.

Full machine report, downloaded vendor asset and screenshots are retained outside Git in `C:/Users/luke9/AppData/Local/Temp/mentorsphere-ads-hardening-20261003/final`. To reproduce from repository root:

```text
node scripts/verify-ads-measurement.mjs <absolute installed playwright/index.mjs> <absolute private QA output directory>
```

No live test conversion, real enquiry, Calendar appointment, Ads action edit, campaign edit, merge or deployment was performed. Live Ads “Misconfigured” status and the earlier missing Tag Assistant display remain unverified; no claim is made that this branch clears them.

### Repository and document checks

Passed on the hardening branch: Wrangler type generation; TypeScript `--noEmit`; full Vitest suite, **23 files and 604 tests** including policy parity; content validation of **41 HTML files**, local references and intake privacy controls; syntax checks of **30 JavaScript files**; Worker `deploy --dry-run --env=`; and `git diff --check`. Installed commands were invoked directly from `node_modules`, matching the package scripts and avoiding the previously observed pnpm wrapper dependency-install behaviour. No dependency/configuration change was made.

The first full check found two old measurement-script cache-version pins in the landing-page test and content validator. Both were updated to the actual new version, keeping their exact-reference and ordering assertions; the full suite and content validator then passed. Privacy V1.8 passes website/DOCX/PDF/snapshot equality and all ten exported pages were inspected. Its website section was also inspected at 1366px and 375px, with no horizontal overflow or external requests. The historical policies and ADHD Coaching Policy V1.5 are unchanged.
