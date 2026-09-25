# Policy website QA, 25 September 2026

Scope: the seven HTML pages changed for Privacy Policy V1.6 and ADHD Coaching Policy V1.4. Starting main SHA: `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`. This records local browser and independent content review; repository build/test results are reported separately.

## Method and production boundary

The changed `docs` tree was served by a temporary static server bound to `127.0.0.1`. Bundled Playwright ran installed headless Chrome `154.0.8037.57`. Browser requests outside the local origin were blocked. The final completed browser run made 313 local GET requests and no POST or other write request. The temporary browser and server were closed after the run.

No production form was submitted. No production service, deployment, integration, release flag, secret, Sheet, email or private client record was changed or inspected. A separately served copy of the ADHD service page from the starting Git SHA was used only to compare an existing mobile layout finding.

Local evidence is retained under the ignored `tmp/policy-website-qa/` directory in the review worktree. `qa.mjs` is the one-off browser harness and `results.json` contains the browser version, viewport measurements, heading lists, link counts and findings. Screenshots are local QA evidence, not published site assets.

## Page and viewport results

| Page | Widths checked | Internal links checked on page | Result for changed content |
| --- | --- | --- | --- |
| `/privacy-policy/` | 1440, 390, 320 px | 24 | Updated policy text, hierarchy and links render correctly |
| `/adhd-coaching-policy/` | 1440, 390, 320 px | 29 | New intake subsection, privacy cross-reference and existing terms render correctly |
| `/policies/` | 1440, 390, 320 px | 33 | Correct versions, effective dates and Read online destinations |
| `/adhd-coaching/` | 1440, 390, 320 px | 27 | Updated V1.4 link visible and functional; unrelated existing hero clipping at 320 px recorded below |
| `/adhd-coaching/access-to-work/` | 1440, 390, 320 px | 25 | Updated V1.4 link visible and functional |
| `/adhd-coaching/employer-funded/` | 1440, 390, 320 px | 26 | Updated V1.4 link visible and functional |
| `/adhd-coaching/schools/` | 1440, 390, 320 px | 26 | Updated V1.4 link visible and functional |

All 21 viewport checks found document `scrollWidth` equal to viewport width. No changed policy text, policy card or updated policy link extended horizontally outside its viewport. The two policy pages and directory had no main-content element extending horizontally outside the viewport. The existing service hero exception is described explicitly below rather than hidden by the document-width result.

All seven pages returned HTTP 200 locally. Every internal link inspected on each page returned 200, and same-page fragment targets existed. Policy-directory links resolve to `/privacy-policy/` and `/adhd-coaching-policy/`; the four service-page V1.4 links resolve to the coaching policy. Keyboard activation of each service-page policy link opened the correct V1.4 page.

## Semantics, keyboard and motion

- Every reviewed page has one main landmark, one H1, no duplicate IDs and no skipped level in the main-content heading sequence.
- The first keyboard Tab reaches the visible Skip to main content link with a non-zero focus outline. Enter follows the main-content fragment.
- Updated service-page policy links are keyboard reachable, show a visible focus outline and activate with Enter.
- Privacy, coaching policy and policies directory were additionally checked at 390 px using touch input, `hover: none` and reduced motion. Navigation opens and closes by tap; essential policy content and links do not depend on hover.
- Reduced-motion contexts did not enable the site's `motion-ok` state. Inspected button animation and transition durations were `0.00001s`, matching the existing reduced-motion CSS override.
- There were no browser `pageerror` events in the completed run.

This is a focused browser/markup review, not a claim of complete WCAG conformance or testing with a native screen reader, every browser, or physical assistive technology.

## Visual inspection

Readable viewport screenshots were inspected for the new Primary/Secondary explanation, ADHD intake routes, consent/withdrawal/processing text, six-month retention text, coaching-policy intake subsection, policy-directory cards, and representative updated service links. The policy layouts preserve readable line lengths, clear headings, whitespace and working underlined links at desktop and mobile widths. No policy paragraph is clipped horizontally or overlaps an adjacent content block. The ordinary sticky header and back-to-top control remain the existing site components.

Selected local evidence:

- `privacy-1440-adhd-section.png`: exact four route labels and introductory intake explanation.
- `privacy-1440-processing.png`: shared withdrawal and processing section.
- `privacy-390-changed.png`: shared learner-profile explanation at mobile width.
- `privacy-320-retention.png`: retention and exception wording at the narrowest width.
- `adhd-policy-1440-changed.png` and `adhd-policy-320-changed.png`: new subsection at desktop and narrow mobile widths.
- `policies-1440-changed.png` and `policies-320-adhd-card.png`: versions, date labels and policy links.
- `access-to-work-390-changed.png` and `schools-1440-changed.png`: representative updated service links.
- Full-page policy and directory captures use the pattern `<privacy|adhd-policy|policies>-<1440|390|320>-full.png`.

## Existing layout limitations, not introduced by these edits

1. At 320 px, the existing `/adhd-coaching/` hero has an internal column extending from x=10 to approximately x=370.7, causing right-edge clipping even though the page suppresses horizontal overflow. The H1 extends to approximately x=354.5. The starting-main page was rendered independently with the same unchanged assets; its affected bounds exactly matched the revised page. This task changes only that page's policy-version link, which remains fully visible and keyboard functional. See `adhd-service-320-hero.png` and `adhd-service-320-baseline-hero.png`. The same hero did not fail the 390 px check.
2. With JavaScript disabled at 320 px, all policy text and links remain in the HTML and the DOM checks pass, but the expanded fallback navigation occupies the tall sticky header and visually covers the main content when scrolled to it. Therefore full no-JavaScript visual readability is **not** marked as passed. The affected header markup, shared CSS and navigation script are unchanged by the policy work. See `privacy-320-nojs.png`, `adhd-policy-320-nojs.png` and `policies-320-nojs.png`. These captures document the navigation obstruction, not a successful readable-policy view. The harness's original `noJavaScriptContentReadable` result refers only to its explicit DOM text/presence assertions and must not be interpreted as a visual pass.

These findings are recorded for a separate shared-layout review. No unrelated shared CSS or navigation changes were made during this policy/document consistency task.

## Independent content and change-scope review

The seven HTML diffs were reviewed against starting main. Privacy protections for child authority/understanding, optional special-category disclosure, consent withdrawal, accidental sensitive information, restricted notifications and retention exceptions remain present and are extended to the new forms. Unrelated ADHD scope, fees, cancellation, funded arrangements, confidentiality and safeguarding terms are preserved. The earlier pricing-transition dates remain historical dates rather than being reset by the new policy effective date.

Two implementation wording points raised during review were corrected: the privacy policy distinguishes optional sensitive child information from ordinary educational context, and describes the automated age/route validation separately from Luke's judgement about suitability. It does not claim the form has no age gate or that legal capacity follows automatically from age.

Current titles, version controls, dates and JSON-LD identify V1.6/V1.4 and 25 September 2026. No obsolete current-policy version labels remain in the four service links or policy directory. Historical change-log entries remain. The live form pages use unversioned privacy links and require no version-label edit.

A scoped Git diff for `docs/forms`, `docs/assets/js`, `docs/assets/css`, `src`, `integrations`, the Wrangler configurations, package/lock files and generated Worker bindings showed no task change. Thus this documentation work does not alter intake fields, consent controls, validation, clients, schemas, APIs, Apps Script, Turnstile or release flags. `git diff --check` passed during independent review; Git emitted only its usual LF/CRLF normalisation notices.
