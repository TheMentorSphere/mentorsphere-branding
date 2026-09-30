# Google Ads measurement record

Branch: `adhd-google-ads-measurement`, based on `origin/main` `7d9270ca8fc5b95dd80eb21c75a2c6d4a198e2ec` (PR #63).
Prepared: 29 and 30 September 2026. Status: implementation approved by the owner; Privacy Policy V1.7 and ADHD Coaching Policy V1.5 adopted with effect from 30 September 2026. Submitted for review by pull request. Not merged or deployed.

## 1. Owner decisions recorded for this implementation

| Decision | Implementation |
|---|---|
| Consent is asked again after six months | `CHOICE_LIFETIME_DAYS = 182` in `docs/assets/js/consent.js` |
| Google Ads Conversion ID and labels stay empty | The young people page ships `{"googleAdsId":"","conversionLabels":{...:""}}`; measurement is inert and no banner is shown until real values are added |
| Enquiry success is the proposed Primary conversion | `adhd_young_people_enquiry_success`, raised only after Formspree confirms receipt |
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

- Keyboard order at 320 x 568 and 1366 x 800: skip link, "How advertising measurement works", Accept, Reject, then the page. Each shows a 3px solid focus outline. Enter on Accept records the choice and moves focus to the confirmation (`role="alert"`).
- Cookie settings on an ordinary page at 375 x 812: the button is 89 x 24px (WCAG 2.2 target size minimum); Enter opens the panel with focus on its heading; Escape closes it and returns focus to the button.
- The banner is a labelled region ("Advertising measurement"). Both choices are found by their full accessible names.
- Reduced motion: with `prefers-reduced-motion: reduce`, the banner has no animation and all transitions resolve to effectively zero through the site-wide rule. The banner adds no motion of its own.
- All 38 public pages show a visible Cookie settings control, with no Google script, no `dataLayer`, no automatic banner and no page errors, including after acceptance.

## 8. Still required before measurement can be switched on

- From Google Ads: the Conversion ID (`AW-` followed by digits), the enquiry conversion label (Primary) and the booking-click conversion label (Secondary).
- Publication of Privacy Policy V1.7 (adopted with effect from 30 September 2026) on the live website, by merging and deploying this change, before real IDs are added: see `business-documents/policies/PRIVACY_V1.7_ADHD_V1.5_DOCUMENT_CONTROL.md`.
- The site's security headers set no global Content Security Policy for public pages, so no header change is needed for the Google tag. If one is added later, it must allow the Google Ads tag hosts on the young people page only.
