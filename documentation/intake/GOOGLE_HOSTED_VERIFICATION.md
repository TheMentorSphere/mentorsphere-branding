# PR #50 real Google-hosted verification

23 September 2026. Corrected receiver reviewed at `87e3329cfd07e8259eec80dd810104792a042ebc`, against production base `bfd96d570e6d68dd35cbe26e1dd959e23e212a9a`.

## Owner decision and evidence limits

The owner accepts the preserved-row deterministic replay as sufficient historical evidence and explicitly removes the requirement to recover the caught historical exception. The historical exception and stack have not been recovered. The original investigation remains the record of historical observations, deterministic replay evidence and the inferred source-predicted exception. The old report's unresolved-owner-gate statements describe its original stage; this decision supersedes them.

## Isolated Google verification

The approved generated Secondary Code.gs was installed unchanged in a temporary standalone Apps Script project, with a separate temporary verification helper. The receiver SHA-256 is `76b9275d8413ef563ab4ed33ae9f25068615874d545af8515d2043e2b65f3719` after LF normalisation. A version 1 web app executed as Luke, with Anyone access for signed server-to-server requests. A newly created private Sheet had the exact 52-column schema, TEST_MODE was true, a temporary random HMAC secret was generated, and no notification recipient or production routing was configured. No production Sheet or Apps Script project was used for these tests.

Requests were signed and sent with UrlFetchApp to the deployed web-app endpoint. Readback used real SpreadsheetApp getValues(), getFormulas(), getNumberFormats() and the corrected row/payload verifiers. An independent Sheets CellData read confirmed literal string values, TEXT formatting and the administrative status cells.

| Test | Observed result |
| --- | --- |
| A, 12:44:27 UTC | HTTP 200 from Apps Script; success true, stored true, status created, notificationSent false. Exactly one response row; 52 columns; both verifiers true. The four inputs `=2+2 fictional Google readback test`, `+FICTIONAL()`, `@FICTIONAL()` and `'=FICTIONAL()` read back exactly. All four getFormulas entries were empty and number formats were `@`. Notification status was Disabled: isolated test, sent time blank. |
| B, 12:44:52 UTC | Exact same submission ID and payload, with fresh signed-envelope timestamp: HTTP 200; success true, stored false, status duplicate, existingRecordVerified true. Still one response row. No mail path runs for duplicates. |
| C, 12:45:25 UTC | A second fictional ID with TEST_MODE and FORCE_NOTIFICATION_FAILURE true: HTTP 200; success true, stored true, status created, notificationSent false. Row durable and payload verifier true; status Failed: review Apps Script executions; sent time blank. Exact retry returned verified duplicate. Two total response rows, one for A and one for C. |
| D, 12:45:57 UTC | Approved FORCE_REQUEST_FAILURE flag in test mode: HTTP 200; success false, stored false, status rejected. Row count unchanged and attempted submission ID absent. |

Apps Script HTTP 200 is its transport status; production Worker HTTP 201 is a separate later gate. No production browser success is claimed by these isolated results. No real notification was generated: A was suppressed by test mode, B and C's retry took the duplicate path, C threw before MailApp, and D failed before storage.

The local suite remains responsible for deterministic cache, lock and administrative-write fault injection. It passed 442 tests across 16 files, TypeScript, generated types and validation of 40 HTML pages. Frozen installation and deployment dry run passed. Schemas, Primary, Worker/browser code and release flags are unchanged.

## Cleanup and preserved evidence

All temporary Script Properties, including the test HMAC secret and saved fictional test requests, were removed at 12:46:36 UTC. The temporary web-app deployment was archived and its project moved to the bin. The temporary Sheet was permanently deleted; a subsequent Sheets metadata request returned 404 NOT_FOUND. No active temporary web-app integration remains.

After the real Google tests passed, only the preserved production row with submission ID `b19425e0-2c71-480b-9da6-5fa16e1b9f1b` was deleted. Immediately before deletion, A2 matched that exact ID and A3 was empty. Deletion targeted row index 1 only in the known Secondary sheet. After deletion, A2:A3 was empty; the exact approved 52-column header was retained. This removes the sole response identified in the preserved evidence and the owner's starting state. A full production-content scan was not performed: automatic review rejected broader reads and selection, so verification used the bounded empty-row check instead. No form answers were copied into this report. There was no matching historical notification to delete.

## Primary follow-up

Review Primary post-storage receipt semantics separately.

This is not a blocker to the Secondary correction unless new evidence shows an active Primary failure. Primary has not been modified.
