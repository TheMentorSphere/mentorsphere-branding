# Isolated intake backends: proposed setup

These files are owner-review implementations. No production Sheet, Apps Script project, deployment or secret has been created or changed. Do not install either script in the Primary project, use the Primary response Sheet or reuse its endpoint or HMAC secret.

Each new form requires its own private spreadsheet, standalone Apps Script project and endpoint after owner approval. Copy only that form's generated `Code.gs` and `appsscript.json` to its dedicated project. Never combine the scripts. `schema.json` is the exact column-to-payload mapping and `SCHEMA.md` lists the ordered columns.

| Script property | Purpose |
| --- | --- |
| `SPREADSHEET_ID` | ID of this form's dedicated private spreadsheet |
| `SHEET_NAME` | Name of this form's response tab |
| `HMAC_SECRET` | Unique randomly generated shared secret for this form |
| `NOTIFICATION_EMAIL` | Owner notification recipient; only configure for approved production |
| `PRIVATE_SHEET_URL` | Private link to this form's response Sheet |
| `TEST_MODE` | `true` for isolated tests; prevents mail |
| `FORCE_REQUEST_FAILURE` | Optional test-only rejection, effective only with TEST_MODE |
| `FORCE_NOTIFICATION_FAILURE` | Optional test-only notification failure after durable storage |

Worker bindings are separate for each form: `SECONDARY_APPS_SCRIPT_URL`, `SECONDARY_HMAC_SECRET`, `SECONDARY_TURNSTILE_SITE_KEY`, `SECONDARY_TURNSTILE_SECRET_KEY`, `SECONDARY_TURNSTILE_EXPECTED_HOSTNAMES`, `SECONDARY_TURNSTILE_TEST_MODE`; the coaching form uses the `ADHD_` prefix. No new binding falls back to Primary. Missing credentials, reused Primary endpoints/secrets, or reuse between the two new forms disables new-form submissions. The allowed production hostname remains `www.thementorsphere.co.uk`; test mode defaults false.

The separate release gates are `SECONDARY_FORM_PAGE_ENABLED`, `SECONDARY_FORM_SUBMISSIONS_ENABLED`, `ADHD_INTAKE_PAGE_ENABLED` and `ADHD_INTAKE_SUBMISSIONS_ENABLED`. All four production defaults are false. Production setup, credential provisioning and enabling gates require separate owner approval.

Regenerate one script after changing its validator or schema:

```sh
node integrations/google-apps-script/build-intakes.mjs --form=secondary
node integrations/google-apps-script/build-intakes.mjs --form=adhd
```

The generator compiles the same form-specific TypeScript validator used by the Worker into the standalone script, and reuses the existing Primary lock, HMAC freshness, plain-text escaping, schema headers, storage readback, deduplication and minimal-notification implementation without writing to the Primary source. New duplicate verification checks the stored form version, received timestamp, privacy acknowledgement and every canonical form and consent column. It uses the original received timestamp, ignores the Worker timestamp from the retry and ignores notification/administrative columns. A same-ID request with changed answers or consent is rejected as a payload conflict without appending or notifying. ID-only or partial records are rejected. Every accepted row is flushed and verified before `created`; cached duplicates without a surviving durable record are rejected.

Automated integration tests run the generated `Code.gs` in a local Apps Script service adapter with an actual temporary on-disk response file. They pass a real HMAC envelope from `sendToAppsScript`, reopen storage in a fresh VM, replay a verified duplicate, remove the record to test stale duplication, test formula protection and notification failures, then delete and verify removal of the temporary directory. This is **local durable integration**, not evidence of Google-hosted deployment, permissions or delivery. A Google-hosted fictional-data end-to-end test remains required before production approval.

Owner previews simulate submission results and do not persist responses. They use test Turnstile keys and no production integrations. Do not enter real learner or client information in them.
