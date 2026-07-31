# Primary learner profile production launch record

Status: technical launch preparation and fictional production-integration testing complete. Owner legal and launch approvals remain. This document contains no credentials, deployment URLs or private file identifiers.

Last updated: 31 July 2026

## Release controls

- Production `FORM_PAGE_ENABLED`: `false`.
- Production `FORM_SUBMISSIONS_ENABLED`: `false`.
- Staging `FORM_PAGE_ENABLED`: `false`.
- Staging `FORM_SUBMISSIONS_ENABLED`: `false`.
- Privacy Policy V1.5: not published.
- Final launch pull request: not opened.

## Google Workspace

- A dedicated native Google Sheet was created in an owner-only restricted Drive folder.
- The response tab is named `Primary learner profiles` and has the approved 46-column consent, authority, notification and retention schema.
- The five administrative retention fields have controlled values and date formatting.
- A saved filter view named `Retention review due` identifies prospective records that are due, are not on hold and need the monthly review process.
- The notification recipient is the monitored MentorSphere business inbox.
- The production Apps Script project was authorised under the MentorSphere business account and deployed as a versioned web app running as the owner.
- The final HMAC was rotated after testing and the matching Worker secret was stored in an undeployed production version.
- Fictional test rows were removed after verification. The response tab is header-only with zero learner or respondent records.

## Cloudflare

- A managed production Turnstile widget was created for the approved MentorSphere hostnames.
- The production site key is recorded in `wrangler.jsonc`.
- The production Turnstile secret was uploaded to an undeployed Worker version.
- The Apps Script URL and matching final HMAC secret are stored in undeployed Worker versions.
- No Worker version created during this preparation has been deployed to production.

## Data protection

- `DATA_PROTECTION_DECISION_NOTE.md` records the approved Article 6 split and Article 9(2)(a) condition.
- `LEGITIMATE_INTERESTS_ASSESSMENT.md` contains the completed child-specific balancing assessment for ordinary learner and third-party information and identifies no unmitigated high risk.
- `DATA_PROTECTION_IMPACT_ASSESSMENT.md` contains the completed focused DPIA and identifies no unmitigated high risk.
- The exact separate explicit-consent and authority controls are implemented and independently enforced in the browser, Worker and Apps Script.
- Privacy Policy V1.5 is prepared in the branch but has not been published.
- Owner sign-off is required for the LIA and DPIA residual risk, Privacy Policy V1.5 and launch pull request before either production flag is changed.

## Remaining controlled sequence

1. Owner reviews and signs off the LIA and DPIA residual risk.
2. Owner approves the exact form controls and Privacy Policy V1.5 wording in the launch pull request.
3. Create or approve a Gmail rule that prevents the exact fixed learner-profile notification from being treated as Spam.
4. Wait for all GitHub Actions checks on the current launch commit to pass.
5. Owner explicitly approves the launch pull request. Do not merge or deploy before that approval.
6. Publish the approved Privacy Policy V1.5 before enabling the form page.
7. Enable `FORM_PAGE_ENABLED` only after the policy is live and verify the page in preview mode while submissions remain disabled.
8. Enable `FORM_SUBMISSIONS_ENABLED` only after a final fictional smoke test and explicit owner approval.
