# Secondary failure investigation and isolated receiver correction

Date: 23 September 2026. Base: `bfd96d570e6d68dd35cbe26e1dd959e23e212a9a`.
Scope: draft fix only. Primary, release flags, live Apps Script projects and production storage are unchanged.

## Historical execution: observed evidence and limits

The Secondary Apps Script execution list shows **Version 2, doPost, Web app, 23 September 2026 10:44:56 BST (09:44:56 UTC), duration 2.17 seconds, Completed**. An exact millisecond start or end was not available. Adding the displayed duration to the displayed second gives approximately 09:44:58 UTC, not an independently observed end timestamp.

The execution could not be expanded to recover an exception, stack, failing function or line. Its Cloud logs and Cloud errors actions were disabled. The receiver catches exceptions and returns JSON rather than rethrowing them. Consequently, Completed does not mean the storage contract succeeded. Apps Script's exception logging records unhandled exceptions, so that facility cannot be assumed to contain a caught historical error. See [Apps Script logging](https://developers.google.com/apps-script/guides/logging).

The time-correlated attempt has submission ID `b19425e0-2c71-480b-9da6-5fa16e1b9f1b` and Worker reference `853c23cd-103b-4890-8cf1-94cfea2fb266`. The execution list does not itself expose that submission ID, so the association is time-based. Preserved evidence records Worker accepted time `2026-09-23T09:44:56.458Z`, Google received time `2026-09-23T09:44:57.687Z`, Worker HTTP 503, one complete 52-column row, correct version, Pending notification, blank sent time and no matching notification email. No second production submission was made.

**The exact historical exception remains unavailable.** The defect below is supported by source and a replay of the preserved readback, not a recovered historical stack. This distinction blocks merge, production deployment, evidence-row deletion and a new controlled launch under the current instruction.

## Supported immediate cause

The original `text_` prepares formula-leading text for a Sheet write by adding an apostrophe. The preserved Google CellData contains a string value with plain-text formatting and no formula; the write-escape apostrophe is absent from the returned value. The old `verifyStoredPayload_` compares this returned value against the escaped write value. It therefore rejects a correctly stored literal.

A local, read-only replay reconstructed the canonical request from the preserved row without printing submitted answers. At the base revision:

- `verifyStoredRow_` returns true.
- `verifyStoredPayload_` returns false.
- There is exactly one mismatching form column: column 27, Helpful strategies.
- The expected write value has an escape prefix; the preserved readback does not. Removing only that expected write prefix makes the values identical.
- The old local Sheet adapter had retained the apostrophe and masked the issue. Correcting that adapter made the existing signed-storage test fail for both forms before the runtime correction.
- With the correction, the same preserved-row replay returns true for both verifiers. It does not call `doPost`, write to Google, cache anything or send mail.

At the base revision, `verifyStoredPayload_` begins at Secondary `Code.gs:564`; the verification condition is at line 658 and its explicit `Error('Stored row could not be verified')` is at line 659. That is the **source-predicted exception**, not a historical exception recovered from Google.

| Stage | Historical observation | Source/replay conclusion |
| --- | --- | --- |
| `appendSubmission_`, line 656 | One complete response row exists | The write reached storage; this is the last directly confirmed historical side effect |
| `SpreadsheetApp.flush()`, line 657 | No statement trace | Source puts it before verification; persisted data alone cannot prove the call returned successfully |
| `verifyStoredRow_`, line 658 | No statement trace | Preserved-row replay passes |
| `verifyStoredPayload_`, line 658 | No statement trace | Preserved-row replay fails on column 27; first reproduced failing stage |
| Explicit verification error, line 659 | No historical stack | Expected error from the reproduced false result |
| `cache.put`, line 661 | Historical cache unavailable | Not reached on the reproduced path; no evidence that cache caused this incident |
| `lock.releaseLock`, line 664 | No statement trace | `finally` attempts it on this path; success cannot be historically proved |
| `sendMinimalNotification_`, line 691 | No matching mail | Not reached on the reproduced path |
| Notification status updates | Pending and blank sent time | Not reached on the reproduced path; Pending alone was not used to identify the defect |

The row was durable, but **not fully accepted by the old verification logic in the replay**. It would be inaccurate to call this a confirmed post-verification cache or mail failure. Independently, those later operations also had a real failure-semantics weakness.

## Correction and commit boundary

The shared generator now compares the stored text against the logical expected value, removing exactly one write-escape prefix from the expected value only. It does not normalise stored answers. Literal leading apostrophes are themselves escaped on write to keep distinct answers distinct. Readback must have no formula in any compared form cell, even when a formula's effective value happens to match an answer. `getFormulas()` returns an empty string for a cell without a formula: [Range documentation](https://developers.google.com/apps-script/reference/spreadsheet/range#getformulas).

`isolated-do-post.gs` is the small shared runtime for Secondary and ADHD. It establishes an accepted receipt only after append, flush, row verification and payload verification. Every later error preserves that receipt:

- A cache write is best effort for both newly stored rows and verified duplicates.
- A release-lock error after verification cannot erase the receipt.
- Mail success returns created, stored true, notificationSent true. Mail failure returns created, stored true, notificationSent false.
- Notification sent time and status are best-effort administrative writes. With successful administrative writes, failed mail produces a failure status and blank sent time. If those writes also fail, status may remain Pending, but the confirmed receipt remains true.
- Exact retries verify the Sheet record and return the existing verified-duplicate contract. They append nothing and never retry mail.
- Cache markers without a valid Sheet row still return duplicate_without_record. A verified existing row can be acknowledged even if CacheService is unavailable. Before a new write, an unavailable stale-marker check fails closed because the receiver cannot rule out a removed cached record.
- Pre-verification failures still return the generic rejected contract. A row can exist after an indeterminate readback failure without the receiver claiming it verified that row.

No submitted values or service exceptions are added to logs. A lost or malformed network response can still prevent the Worker from confirming receipt; an exact retry is the recovery mechanism. This code does not claim to make remote transport atomic.

Both generated integrations had the same comparator defect and broad outer-catch weakness. Both are regenerated. The 52-column Secondary and 54-column ADHD schemas and mapping expressions are unchanged.

Primary has the broader post-storage outer-catch pattern, including cache, lock and status operations that can invalidate its response. It does not use this full-payload comparator, so it does not have this particular escape/readback mismatch. Its files, generated output, live project, Worker and release settings are unchanged. A Primary correction requires a separate authorised change.

## Verification

The corrected suite passes **442 tests across 16 files**, up from 388. The 54 new cases cover both forms' commit boundary and the complete isolated browser-contract-to-receiver pipeline. `pnpm run check` passes generated Worker types, TypeScript, all tests, and content validation of 40 HTML files. `pnpm run deploy:dry-run` builds successfully and exits without uploading.

The isolated pipeline runs the real browser response contract, Worker validation, HMAC signing, upstream transport and generated receiver against temporary disk-backed Sheet adapters. Google services and Turnstile are simulated. Successful mail means the mail adapter accepted one minimal notification; this is **not evidence of Google-hosted delivery or a new production launch**.

| Isolated outcome, each form | Verified result |
| --- | --- |
| Normal created | One durable row, one minimal mail, Sent, sent timestamp, HTTP 201, Submitted |
| Mail adapter throws | Row remains, failure status, blank sent timestamp, created/stored true/notificationSent false, HTTP 201, Submitted |
| Forced notification failure flag | Same successful receipt, no mail, HTTP 201, Submitted |
| Cache write throws | Row remains, created/stored true, HTTP 201, Submitted |
| Administrative write throws | Receipt remains created/stored true; notification result reflects send outcome |
| Exact retry after these outcomes | HTTP 200, verified duplicate, Already received, one row, no additional mail attempt |
| Cache marker without row | Receiver duplicate_without_record, Worker 503, retryable browser failure |
| Malformed upstream response | Worker 503, no false browser receipt |
| Upstream timeout | Real transport abort signal with accelerated timeout, Worker 503, no false browser receipt |
| Append/flush/readback failure before verification | Rejected, no mail or cache write |
| Formula-like/literal-apostrophe input | Exact logical readback, duplicate comparison remains strict; actual formulas rejected |

Every storage test removes its temporary directory in cleanup and asserts it no longer exists. No Google test spreadsheet, deployment or email was created during this investigation, so no cloud test resource remains to delete.

Regenerating both receivers twice produces identical SHA-256 hashes:

| Generated receiver | SHA-256, LF generator output |
| --- | --- |
| Secondary | `76b9275d8413ef563ab4ed33ae9f25068615874d545af8515d2043e2b65f3719` |
| ADHD | `6b31a60d390307e2fc4918cf70920b4cbd212698ffa7887b385fdf9ff584f568` |

Git comparison confirms no changes to schemas, manifests, Primary, Worker source, website assets or release configuration.

## Production state and release gate

Read-only live checks return page HTTP 200 for all three forms. Primary config reports enabled true; Secondary and ADHD report enabled false. Main remains `bfd96d570e6d68dd35cbe26e1dd959e23e212a9a`.

The Secondary Sheet still has its 52-column header and exactly the preserved fictional response ID. The evidence row has **not** been deleted: the required exact historical failure record is unavailable. There is no matching notification to delete. The draft correction does not modify the deployed receiver.

Before one new controlled Secondary launch, resolve the historical-evidence gate with the owner, review this draft, authorise any merge/deployment and evidence-row cleanup, and verify the corrected receiver in an approved isolated Google environment. This report does not authorise those actions. ADHD remains disabled.
