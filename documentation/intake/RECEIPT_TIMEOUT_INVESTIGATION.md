# Intake receipt timeout investigation

Date: 24 September 2026. Scope: receipt handling only, for owner review before deployment.

## Production evidence and certainty

Incident baseline and current remote `main`: `a1a4aa4716c375c5e96c8f00e8becbdba3217067`.
Read-only live config requests confirmed Primary enabled, Secondary enabled and ADHD disabled.
Wrangler deployment history confirmed incident Worker version `2d73885e-6481-4594-9473-b8dad2de1871`, created at `20:11:50.576Z`, and current version `8400698a-84ca-467f-a6ed-adaadc4d2285`, deployed at `20:17:19.234Z` with 100% traffic.

| Evidence | Confirmed value |
| --- | --- |
| Browser diagnostic reference, preserved launch record and PR #59 | `c71c59ed-7f20-49e8-8fdd-e67e180ca210` |
| Preserved Sheet submission ID, read only A2:D2 | `18a3b58d-472f-4cdb-bd10-3b400f8b7e1d` |
| Worker accepted timestamp stored in row | `2026-09-24T20:15:21.538Z` |
| Google received timestamp stored in row | `2026-09-24T20:15:22.737Z` |
| Google execution UI | Version 3, doPost, Web app, 24 September 21:15:21 BST, 19.955 seconds, Completed |
| Notification status and timestamp, read only AV2:AW2 | Sent, `2026-09-24T20:15:40.423Z` |
| Preserved notification metadata | Message Date `20:15:25Z`; final Gmail Received `20:15:41Z` |
| Source at incident baseline | Apps Script fetch `AbortSignal.timeout(12_000)`; browser `30_000` |

The notification contains the same Google received timestamp. Its message Date is message-generation metadata, not proof of when MailApp returned. The Sheet sent timestamp is taken after the synchronous send returns. No answers were needed for these reads or copied into this report. Google received time is captured before opening/appending the Sheet; it is not the durable commit timestamp.

**Confirmed:** a durable row and notification exist despite the browser's unconfirmed result; the Google execution exceeded the Worker's upstream allowance; the baseline timeout mechanism reproduces locally.

**Strongly inferred:** the production Worker took its upstream timeout failure path near 12 seconds. The preserved browser UI does not expose raw HTTP status or duration. A direct request-ID-to-Worker-timeout record is required to call the exact historical HTTP failure confirmed. An Apps Script Completed status alone does not establish the returned JSON, because the receiver catches errors.

The documented Cloudflare telemetry API query for the exact request reference in `20:14:30Z` to `20:16:30Z` returned HTTP 403, code 10000, Authentication error. The existing Wrangler OAuth lacks the Workers Observability permission; no permissions were changed. The signed-in dashboard was also checked: the Events query `contains(requestId, "c71c59ed-7f20-49e8-8fdd-e67e180ca210")` over the last hour, covering the incident, returned No events found. Configuration samples logs at 10%, disables invocation logs and the incident forwarding catch logs no reason. These results do not prove there was no request; they leave the exact HTTP 503, elapsed request duration and timeout error unconfirmed for production.

## Baseline timing chain

Browser request (30 seconds for fetch and body) -> Worker request body and validation -> Siteverify (10 seconds) -> HMAC signing -> Apps Script POST (12 seconds including redirected receipt fetch) -> lock acquisition (10 seconds inside that upstream allowance) -> Sheet append -> flush -> durable row and payload/formula verification -> cache -> lock release -> synchronous notification -> notification status writes and flush -> JSON -> Google ContentService redirect -> Worker receipt validation -> browser receipt.

The old 10 + 12 seconds is the sum of explicit network allowances, not an enforced whole-Worker maximum. Request-body reading and crypto signing had no wall-time deadline. Google service operations have no individual application deadline in this receiver. The lock wait is included in Apps Script execution, not added a second time to its elapsed time.

Other existing limits: HMAC freshness five minutes, duplicate cache lifetime six hours, browser challenge preparation 60 seconds, security script loading 15 seconds, token age four minutes. Challenge preparation occurs before submission transport. These values and the challenge lifecycle remain unchanged.

## Receiver sequence and latency

The generated ADHD version-3 receiver in `integrations/google-apps-script/adhd-coaching-intake/Code.gs` follows this sequence:

1. Parse envelope, authenticate HMAC, validate freshness and submitted structure.
2. Acquire script lock, capture Google received time, open Sheet, check headers and look for the ID.
3. For an existing ID, verify the durable row and canonical payload, including formula absence, and return a verified duplicate without mail.
4. For a new ID, format the row as text, write values and flush.
5. Read values to verify durable identity/version/privacy acknowledgement. Read values again and call `getFormulas()` to verify canonical payload and formula absence.
6. Establish the accepted stored result. Attempt a cache write and release the lock.
7. Synchronously call MailApp for a new production row. A mail error preserves the accepted receipt with `notificationSent:false`.
8. Write notification timestamp and status, then flush again. Administrative write failure preserves the accepted receipt.
9. Return JSON through ContentService.

Mail, cache work, lock release, two administrative Sheet writes and the second flush occur after verified storage and before HTTP receipt completion. Earlier Sheet initialisation, header lookup, duplicate lookup, formatting, append, flush and readback also take time. These are plausible contributors, not measured per-operation causes. The incident has no stage timing instrumentation to determine which operation consumed the approximately 20 seconds.

## Isolated baseline reproduction

Run `node scripts/reproduce-intake-receipt-timeout.mjs`. It compiles the actual incident-baseline Worker and submission source, stubs Siteverify, and uses a real loopback HTTP receiver with synthetic commit-before-delay storage. No production endpoint or notification service is called. Temporary compiled snapshots are removed.

| Receipt delay | Worker result and elapsed time | Receiver completion | Counts |
| --- | --- | --- | --- |
| 100 ms | HTTP 201, created, 125 ms | 120 ms | 1 POST, 1 row, 1 simulated notification |
| 13 seconds | HTTP 503, upstream_failure, TimeoutError, 12,020 ms | 13,017 ms | 1 POST, 1 row, 1 simulated notification |
| 20 seconds | HTTP 503, upstream_failure, TimeoutError, 12,020 ms | 20,031 ms | 1 POST, 1 row, 1 simulated notification |

Both slow connections closed before the isolated receiver finished. This demonstrates that cancelling transport does not undo or stop an accepted upstream operation. It confirms the same failure class, not the exact production HTTP history.

## Options and selected design

| Option | Assessment |
| --- | --- |
| A. Increase bounded receipt budgets | Selected. Covers the observed duration without introducing another write attempt or a receiver deployment. Includes response-body consumption and an overall Worker deadline. |
| B. Automatic same-ID retry | Can recover some lost transport receipts. Requires overlapping execution proof, another bounded attempt and careful HMAC/identity handling. Adds another execution and is unnecessary for the observed 20-second successful execution. |
| C. Authenticated status endpoint | Can distinguish receipt status without resubmitting answers, but needs a new authenticated protocol, ownership/access checks and receiver deployment. Excessive scope for this incident. |
| D. Larger budgets plus retry/status | Could improve recovery from arbitrary transport loss, but adds the complexity of B/C without being needed for the reproduced timing mismatch. |

Selected budgets: 35 seconds for signing and the Apps Script receipt, 55 seconds overall inside the Worker, and 70 seconds in the browser. Siteverify retains its 10-second allowance. The upstream 35 seconds allows approximately 20 seconds observed execution, a conservative additional 10 seconds of lock contention and five seconds of transport/signing/receipt overhead. Worker 55 leaves ten seconds beyond Siteverify plus upstream for request reading, validation and scheduling. Browser 70 adds 15 seconds for request and response delivery.

These are engineered service allowances, not a guarantee that Google operations finish within 35 seconds. All unresolved overruns fail closed. Arbitrary network loss can still leave storage unconfirmed; no finite HTTP timeout can remove that possibility.

The deadline must cover response-body reads as well as headers, and signing before transport. Cancellation checks must prevent a delayed continuation from starting an upstream POST after the overall Worker deadline. The browser still makes one request. The Worker still makes one Apps Script POST, with the same validated submission ID and HMAC envelope semantics. There is no automatic retry or new receipt/status endpoint.

## Idempotency and notification limits

The change adds no new upstream execution. The receiver still serialises lookup, append, flush and verification under the script lock. Existing verified duplicates return before mail. Under unchanged durable storage and the same identity, only the execution classified as new writes a row and attempts a notification. This is an at-most-once notification attempt guarantee, not guaranteed mail delivery. A mail failure does not make storage fail and an exact duplicate does not resend mail.

Primary retains its existing ID-based duplicate verification. Secondary and ADHD additionally compare canonical payloads. All three use the same strict Worker/browser created-or-verified-duplicate receipt contract; this change does not claim that their receiver verification is identical.

## Production boundary

Release flags, consent, questions, schemas, policies, Turnstile lifecycle and production Apps Script receivers are outside this change. The preserved attempt-3 row and notification remain untouched. No production submission, merge, deployment or launch attempt #4 is authorised by this investigation. Owner review is required before deployment and a separate controlled launch decision.

## Diagnostics

Each failed receipt emits one `intake_receipt_failure` event with exactly `requestId`, `errorCode`, `stage` and `durationMs`. No submitted identity, answers, endpoint, raw exception, upstream response body, token, signature or secret is logged. The existing generic browser failure wording remains; the response includes a safe error code for diagnosis and the existing diagnostic request header/body reference.

Codes: `WORKER_RECEIPT_TIMEOUT`, `UPSTREAM_TIMEOUT`, `UPSTREAM_SIGNING_FAILURE`, `UPSTREAM_TRANSPORT_FAILURE`, `UPSTREAM_HTTP_FAILURE`, `UPSTREAM_CONTENT_TYPE_INVALID`, `UPSTREAM_RESPONSE_TOO_LARGE`, `UPSTREAM_JSON_INVALID`, `UPSTREAM_RECEIPT_INVALID`.

Stages: `request_reading`, `turnstile_verification`, `upstream_forward`, `upstream_signing`, `upstream_fetch`, `upstream_body`, `upstream_receipt`. A whole-Worker timeout reports the current top-level stage; the Apps Script deadline reports its detailed stage. Log sampling configuration is unchanged, so availability of any one future log is not guaranteed.

## Verification coverage

The new deterministic timing suite runs actual Worker/browser code with a controlled clock. It delays headers and response bodies at 5 ms, 11,999 ms, 12,000 ms, 12,001 ms, 13,000 ms, 20,000 ms and 34,999 ms. Every supported receipt succeeds below the deadline. At 35,000 ms and beyond, the Worker fails closed. Separate tests cover 55-second whole-Worker cancellation, slow request bodies, late signing without a subsequent POST, Siteverify's unchanged 10-second allowance, the real 70-second browser default and one browser request.

Actual Primary, Secondary and ADHD receiver source runs against isolated disk-backed Sheet adapters for delayed created receipts, exact duplicates, one row and one notification attempt, timeout after storage, pre-storage failure and post-storage mail failure. These are local adapter tests, not Google-hosted delivery evidence. No automatic reconciliation is implemented, so internal retry and newly overlapping execution tests are not claimed.

The preview timeout fixture and local QA waiting periods track the longer browser budget. The preview's simulated delivery delay is outside the real Worker handler and never contacts Google. It does not change the production Worker deadline.

Required local gates passed: `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run deploy:dry-run` and `git diff --check`. The full suite passes **525 tests in 19 files**, up from the incident baseline's 469: 55 new timing tests and one new preview timeout regression. Content validation covers 40 HTML pages. Primary, Secondary, ADHD and all 23 shared Turnstile lifecycle tests pass. The protected source diff is empty for release configuration, receiver integrations, the Turnstile controller and form markup.

`node scripts/qa-extension-browser.mjs --form=all` also passed **35 local browser scenario groups**: 13 Secondary and 22 ADHD, across widths 1440, 768, 720, 390 and 320 pixels, including reduced motion and forced colours. It verifies retained answers, stable identity, no automatic retry at the 70-second timeout, created/duplicate outcomes, expired-widget prevention and fresh verification. Network and Turnstile are intercepted for this local QA. Independent code review found no remaining actionable defect.

## Real Google isolated verification

A fresh temporary Apps Script project deployed `scripts/fixtures/intake-receipt-google.gs` as version 1. Its setup creates only a new temporary Sheet; its receiver accepts four fixed synthetic form versions and IDs, rejects extra payload fields, verifies a test-only HMAC, writes under a script lock, flushes and reads back values/formulas before delaying its receipt. It has no MailApp call, recipient or production Sheet identifier. The runner verifies an exact fixture marker and empty Sheet before its first POST.

`node scripts/verify-intake-receipt-google.mjs --isolated-url <temporary URL> --include-old-timeout` passed using the actual changed `sendToAppsScript` function and real Google HTTP/ContentService/Sheet operations. It does not claim a deployed Cloudflare or production browser test.

| Case | Real elapsed time | Receipt | Rows after exact repeat |
| --- | --- | --- | --- |
| Fast | 2,996 ms | created, stored true, notificationSent false | 1; repeat verified duplicate in 2,325 ms |
| 13-second post-commit delay | 15,611 ms | created, stored true, notificationSent false | 2 total; repeat verified duplicate in 3,150 ms |
| 20-second post-commit delay | 23,326 ms | created, stored true, notificationSent false | 3 total; repeat verified duplicate in 3,322 ms |
| Incident-baseline 12-second transport against a fourth 13-second case | TimeoutError at 12,013 ms | Baseline failed; an explicit same-ID test repeat returned verified duplicate | 4 total, one per synthetic identity |

The final Google readback contained exactly four unique synthetic IDs. Notifications were disabled throughout, as permitted by the brief. The fourth case proves the old transport ambiguity against real Google: the baseline times out while the receiver retains the row; an explicitly invoked same-ID test repeat verifies it. This test repeat is not automatic retry logic in the fix. The fixture delays while holding its lock. If the first execution is still running, the repeat waits for its lock before checking the duplicate; the test does not measure actual lock-wait duration.

Google initially held the setup requests pending authorisation. Two queued setup runs created two temporary Sheets before either saved its property; only the second was configured and used for test data. Both are included in cleanup. This is fixture setup behaviour, not duplicate intake submission behaviour.

Cleanup completed: the temporary web app deployment was archived, both temporary Sheets were moved to the bin, and the temporary Apps Script project was moved to the bin. The Google interfaces confirmed both Sheet removals and the project disappeared from My Projects. No production resource was modified.

## Reference behaviour

- [Cloudflare Worker duration and cancellation limits](https://developers.cloudflare.com/workers/platform/limits/): waiting on network I/O differs from CPU time; disconnected requests may be cancelled.
- [Google Lock and flush guidance](https://developers.google.com/apps-script/reference/lock/lock): commit pending Sheet changes before releasing the lock.
- [Google ContentService redirects](https://developers.google.com/apps-script/guides/content): receipt content is served through a redirected Google URL.
- [Google Apps Script execution limits](https://developers.google.com/apps-script/guides/services/quotas): platform execution limits do not replace the application's shorter receipt deadline.
