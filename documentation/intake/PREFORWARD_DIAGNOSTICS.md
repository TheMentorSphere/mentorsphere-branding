# V5 pre-forward diagnostics

These diagnostics identify where a primary learner profile request was rejected before forwarding to Apps Script. They do not alter any acceptance rule, the public failure wording, the Apps Script contract or the 48-column Sheet schema.

Each form POST uses a separate UUID v4 diagnostic request ID. A valid client-generated ID is accepted; a missing or invalid value is replaced. The ID is returned in the `X-MentorSphere-Request-ID` response header and the JSON `requestId` field. It exists in the browser only for that request and is never added to the submitted profile, Sheet, notification or browser storage.

## Error codes

| Code | Confirmed rejection condition |
|---|---|
| `SUBMISSIONS_DISABLED` | The release gate is closed. |
| `INVALID_ORIGIN` | The request does not have the required same-origin value. |
| `INVALID_CONTENT_TYPE` | The request is not JSON. |
| `REQUEST_TOO_LARGE` | The declared or streamed request body exceeds the existing limit. |
| `REQUEST_BODY_UNREADABLE` | The request body is missing or cannot be read. |
| `INVALID_JSON` | The bounded request body cannot be parsed as JSON. |
| `PAYLOAD_NOT_OBJECT` | Parsed JSON is not an object. |
| `INVALID_FORM_VERSION` | The form version is not the supported V5 version. |
| `PAYLOAD_VALIDATION_FAILED` | The existing V5 schema validation rejects the payload. |
| `INVALID_SUBMISSION_ID` | The submission ID is not a UUID v4. |
| `TURNSTILE_TOKEN_MISSING` | The Turnstile token is absent or empty. |
| `HONEYPOT_REJECTED` | The existing honeypot branch rejected the request. |
| `TURNSTILE_RESPONSE_INVALID` | Turnstile returned malformed JSON or an incomplete response. |
| `TURNSTILE_VERIFICATION_FAILED` | Turnstile returned an unsuccessful result or non-successful HTTP response. |
| `TURNSTILE_HOSTNAME_MISMATCH` | A successful production Turnstile response named a hostname outside the configured allowlist. |
| `TURNSTILE_ACTION_MISMATCH` | A successful production Turnstile response named the wrong action. |
| `TURNSTILE_INTERNAL_ERROR` | The Turnstile verification request failed before a usable response was received. |
| `UNKNOWN_PREFORWARD_REJECTION` | A defensive fallback caught an unexpected failure before forwarding. |

There is deliberately no `TURNSTILE_CHALLENGE_EXPIRED` classification. Turnstile reports `timeout-or-duplicate`, which cannot distinguish an expired challenge from a reused token. Recognised Turnstile error-code names may be logged as a comma-separated allowlisted string; unknown values become `unrecognised`.

## Logging boundary

The structured logger constructs a fixed object from explicitly typed primitive metadata. It records request correlation and stage booleans only. It never receives or records the request payload, answer values, field/value pairs, names, contact details, learner information, IP addresses, user agents, tokens, endpoints, secrets, signatures or Sheet identifiers.

Cloudflare invocation logging remains disabled. The response header and JSON classification are authoritative for a controlled test even if the sampled structured log is not retained.
