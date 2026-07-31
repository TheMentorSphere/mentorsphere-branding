# Isolated staging and preview test process

Status: safe test process. Production submissions remain disabled.

Use fictional learner and respondent information only. Never copy a production response into the staging Sheet, Apps Script project, preview Worker, screenshots or test logs.

## Isolation model

- Cloudflare: use `wrangler dev --remote --env staging`. This creates a Cloudflare-hosted development preview for the staging environment and does not use the production custom-domain route.
- Turnstile: use Cloudflare's published always-pass test site key and matching test secret. `TURNSTILE_TEST_MODE` accepts only a successful Siteverify response and is never enabled in production.
- Google Workspace: use a separate private spreadsheet named `MentorSphere fictional intake staging` with a response tab named `Primary learner profiles`.
- Apps Script: create a separate script project and test web-app deployment attached to the fictional staging Sheet.
- Authentication: generate a staging-only HMAC secret. Never reuse the production secret.
- Email: send the minimal notification to an approved owner-controlled test inbox. The message must contain no form answers.

The committed staging configuration keeps `FORM_SUBMISSIONS_ENABLED=false`. For a supervised test only, copy `.dev.vars.staging.example` to the ignored `.dev.vars.staging`, insert the test deployment URL and staging HMAC secret, and retain `FORM_SUBMISSIONS_ENABLED=true` only in that ignored file.

## Google Sheet and Apps Script

1. Create the fictional spreadsheet in the approved Google Workspace account and keep link sharing disabled.
2. Install `integrations/google-apps-script/primary-learner-profile/Code.gs` and the supplied manifest in a separate Apps Script project.
3. Configure the test project's Script Properties: `SPREADSHEET_ID`, `SHEET_NAME`, `PRIVATE_SHEET_URL`, `NOTIFICATION_EMAIL`, `HMAC_SECRET` and `TEST_MODE=true`.
4. Deploy a test-only web app. Record the URL only in `.dev.vars.staging`.
5. Keep `FORCE_REQUEST_FAILURE=false` and `FORCE_NOTIFICATION_FAILURE=false` except during the two controlled failure tests.

The force-failure properties are ignored unless `TEST_MODE=true`. They must not be created in the production Apps Script project.

## Cloudflare preview

1. Put the published Turnstile test secret, test Apps Script URL and matching staging HMAC secret in `.dev.vars.staging`.
2. Run `pnpm run dev:staging` and use the temporary preview URL printed by Wrangler.
3. Confirm the preview URL has no production custom-domain route and the production `FORM_SUBMISSIONS_ENABLED` value remains `false`.
4. Keep Wrangler request and application logging free of bodies, parsed answers and upstream response content.

## End-to-end evidence sequence

1. Submit one complete fictional profile in the browser and verify a single 35-column row in the private Sheet.
2. Include a formula-like optional value such as `=FICTIONAL_TEST_VALUE`. Verify it is stored as text and is not a formula.
3. Verify the notification subject and body against the approved template and search it for every fictional name, email, telephone number and answer.
4. Replay the same submission ID and verify the response is treated as a duplicate with no additional row.
5. Set `FORCE_NOTIFICATION_FAILURE=true`, submit a new fictional profile, and verify the row remains with `Failed: review Apps Script executions` in `Notification status`. Reset the property immediately.
6. Set `FORCE_REQUEST_FAILURE=true`, attempt a browser submission, verify the retry message and confirm the entered fields remain populated. Reset the property, retry and verify success.
7. Search the browser console and Wrangler output for the fictional marker values. Verify answers were not logged.
8. Run the site-regression checks against the same preview URL and capture desktop and mobile screenshots.

After testing, stop the remote preview, delete test emails and fictional rows when they are no longer needed, and either disable or remove the test Apps Script deployment. Do not move test resources into production.
