# Primary learner profile QA report

Status: local implementation testing complete on 31 July 2026. Production and live Google Workspace testing remain blocked pending owner approval and manual setup.

Only fictional data may be used during testing. Production deployment remains blocked pending the approvals listed in `SETUP_CHECKLIST.md`.

## Automated checks

- `pnpm run types`: passed. Worker bindings and runtime types generated successfully.
- `pnpm run typecheck`: passed.
- `pnpm run test`: passed, including validation, body-size, origin, honeypot, Turnstile, HMAC forwarding, duplicate response and upstream-failure coverage.
- `pnpm run validate:content`: passed across all 29 HTML files, including intake privacy controls, local references, noindex controls and submission safeguards.
- `pnpm run deploy:dry-run`: passed. Wrangler prepared the Worker and all 85 static assets, then exited without deploying.

## Browser and accessibility checks

- Desktop review viewport checked at 1440 by 1000 pixels.
- Mobile entry viewport checked at 390 by 844 pixels. No horizontal overflow was present.
- Conditional mobile validation checked with WhatsApp selected. The form stayed on step 1 and displayed the reason the number was required.
- Email-only contact checked with no mobile number. The form proceeded normally.
- Back and review editing checked. Existing answers were retained and the relevant step heading received focus.
- Single-choice session length and frequency checked at the review step.
- Error summary, inline error and focus behaviour checked in the browser.
- Browser console checked after desktop and mobile flows. No warnings or errors were recorded.
- Reduced-motion behaviour is covered by the stylesheet rule and content validation. A separate operating-system reduced-motion browser profile was not available in this local run.

Screenshots use fictional names and the reserved `.test` email domain:

- `screenshots/primary-learner-profile-desktop.jpg`
- `screenshots/primary-learner-profile-mobile.jpg`

## Submission checks

- A complete fictional browser submission passed through the local Worker, official Cloudflare Turnstile test keys and an HMAC-validating local Apps Script mock.
- A rejected upstream attempt preserved every answer and showed the generic retry message before the successful retry.
- Duplicate responses, honeypot handling and formula-injection protection passed automated tests.
- The Apps Script notification template was inspected and contains only the receipt time and private Sheet link. It contains no respondent or learner answers.
- The production Apps Script deployment, private Sheet write, notification delivery and live-network interruption recovery still require the approved Google Workspace setup.
