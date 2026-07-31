# Primary learner profile setup checklist

Status: implementation draft. Production launch is blocked until the owner approves the privacy acknowledgement, Privacy Policy amendment, retention wording and final Google Workspace setup.

No learner or respondent data, credentials or deployment URLs belong in this repository.

## 1. Google Sheet setup

1. In the approved Google Workspace account, create a dedicated spreadsheet in a restricted Drive folder.
2. Name the response tab `Primary learner profiles`, or record a different agreed tab name for the Script Property.
3. Remove link sharing. Give access only to Luke and any specifically authorised person who needs the information.
4. Leave the tab empty. The integration creates and verifies the exact header row on its first authenticated submission.
5. Record the spreadsheet ID and its private URL for the Script Properties below.
6. Confirm account security, authorised users, Google Workspace contractual settings, data location and international-transfer arrangements before launch.

The exact column order is recorded in `FIELD_AND_DATA_MAP.md` and enforced by `Code.gs`. If the header row is later changed, submissions fail closed rather than writing into the wrong columns.

## 2. Apps Script deployment

1. From the private Sheet, open Extensions, Apps Script.
2. Replace the default code with `integrations/google-apps-script/primary-learner-profile/Code.gs`.
3. In Project Settings, enable the manifest file and copy the supplied `appsscript.json` values.
4. Set these Script Properties in Project Settings:

   - `SPREADSHEET_ID`: the private spreadsheet ID.
   - `SHEET_NAME`: the response tab name.
   - `PRIVATE_SHEET_URL`: the restricted Sheet URL used in notifications.
   - `NOTIFICATION_EMAIL`: the approved recipient for minimal notifications.
   - `HMAC_SECRET`: a newly generated high-entropy secret shared only with the Worker.

5. Authorise the requested spreadsheet and email scopes using the approved owner account.
6. Deploy a new web app version. Set it to execute as the deploying owner and choose the narrowest access option that still permits the Cloudflare Worker to call it.
7. Copy the production `/exec` URL. Do not commit it.
8. When the Apps Script code changes, create a new versioned deployment and confirm whether the `/exec` URL changed.

The web app accepts only recent requests with a valid HMAC signature. It rejects unsigned, expired or malformed requests with a generic response. The shared secret is never included in the request.

## 3. Cloudflare secrets and Turnstile

1. Create a managed Turnstile widget for production, restricted to `www.thementorsphere.co.uk`.
2. Use Cloudflare's published test keys for local and staging-preview testing. Do not add local or preview hostnames to the production widget.
3. Keep `TURNSTILE_TEST_MODE` set to `false` in production. The isolated `staging` environment sets it to `true` because it uses only Cloudflare's published test credentials.
4. Replace the production `TURNSTILE_SITE_KEY` placeholder in `wrangler.jsonc` only when launch approval is given.
5. Add these Worker secrets interactively for the approved environment:

   - `TURNSTILE_SECRET_KEY`
   - `INTAKE_APPS_SCRIPT_URL`
   - `INTAKE_HMAC_SECRET`

6. Set `INTAKE_HMAC_SECRET` to the same value as the Apps Script `HMAC_SECRET` property.
7. Keep `FORM_SUBMISSIONS_ENABLED` set to `false` until all launch approvals and tests are complete.
8. Do not put real secret values in `.dev.vars.example`, source code, Wrangler variables or documentation.

## 4. Testing

1. Follow `STAGING_TEST_PLAN.md` to create the separate fictional Sheet, test Apps Script deployment and ignored `.dev.vars.staging` file.
2. Run `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run deploy:dry-run` and `pnpm run dev:staging`.
3. Test desktop, tablet and mobile widths, keyboard-only use, visible focus, error summaries and screen-reader structure.
4. Test required fields, invalid email, conditional needs fields, conditional mobile validation, Back and Continue, answer preservation and review editing.
5. Test Turnstile success, expiry and failure using Cloudflare's test keys.
6. Test successful storage, upstream failure, network interruption, repeated submission IDs, honeypot handling and formula-prefixed fictional input.
7. Confirm the email contains only the approved minimal template and private Sheet link.
8. Confirm no answers appear in browser console output, URLs, analytics, Worker application logs or repository files.
9. Delete fictional rows and emails when testing is complete.

## 5. Production launch

Production must not be deployed until Luke has approved:

- The complete sensitive-information acknowledgement.
- The proposed Privacy Policy amendment.
- The provisional retention wording.
- The final Google Workspace ownership, sharing and processor setup.

After approval:

1. Publish the approved Privacy Policy version and update its version, date, change log, policy register and downloadable copies together.
2. Configure the production Google Workspace destination, Turnstile widget and Worker secrets while `FORM_SUBMISSIONS_ENABLED` remains `false`.
3. Use an isolated Cloudflare preview, not the production custom domain, to complete one fictional smoke test against the final production integration. Confirm the stored row and minimal email, then remove the test data.
4. Confirm the smoke test and every production prerequisite are complete before changing `FORM_SUBMISSIONS_ENABLED` to `true` in a separate reviewed launch commit.
5. Run the complete check and a Wrangler dry run.
6. Deploy to the approved environment without changing DNS, the custom domain or the deployment source.
7. Confirm the form remains absent from navigation, the footer and sitemap, and retains both meta and response-header noindex controls.
