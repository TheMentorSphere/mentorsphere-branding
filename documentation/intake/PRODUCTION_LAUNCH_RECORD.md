# Primary learner profile production launch record

Status: launch preparation in progress. This document contains no credentials, deployment URLs or private file identifiers.

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
- The response tab is named `Primary learner profiles` and has the exact 40-column schema.
- The five administrative retention fields have controlled values and date formatting.
- A saved filter view named `Retention review due` identifies prospective records that are due, are not on hold and need the monthly review process.
- The notification recipient is the monitored MentorSphere business inbox.
- The production Apps Script project has the reviewed source and configuration prepared. The source must be refreshed from the final branch and the HMAC must be rotated before deployment.
- Apps Script deployment is paused at Google's required OAuth authorisation step.
- No learner or respondent records have been added to the production Sheet.

## Cloudflare

- A managed production Turnstile widget was created for the approved MentorSphere hostnames.
- The production site key is recorded in `wrangler.jsonc`.
- The production Turnstile secret was uploaded to an undeployed Worker version.
- The Apps Script URL and matching HMAC secret remain pending until Apps Script authorisation and deployment are complete.
- No Worker version created during this preparation has been deployed to production.

## Data protection

- The approved plain-English privacy acknowledgement and provisional retention wording remain unchanged.
- `DATA_PROTECTION_DECISION_NOTE.md` contains the Article 6 and Article 9 recommendation, exact proposed wording, consequences and current official ICO sources.
- `LEGITIMATE_INTERESTS_ASSESSMENT.md` contains the draft balancing assessment for ordinary learner and third-party information.
- Owner approval is required before implementing the proposed explicit-consent control, publishing Privacy Policy V1.5 or enabling either production flag.

## Remaining controlled sequence

1. Owner completes Google OAuth authorisation for the Apps Script deployment.
2. Refresh the production Apps Script source, rotate the HMAC, complete the integration properties and deploy the Apps Script endpoint.
3. Receive the owner's specific Article 6 and Article 9 decision.
4. Implement and test the approved consent controls and wording.
5. Publish the approved Privacy Policy V1.5.
6. Run one fictional production-path smoke test, verify the answer-free notification and remove the fictional row immediately.
7. Review the final diff, screenshots, policy version, production flags and launch gate evidence.
8. Open the focused launch pull request, wait for green checks and request explicit approval before merge or deployment.
