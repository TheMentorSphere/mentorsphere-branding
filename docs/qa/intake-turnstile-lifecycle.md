# Intake Turnstile lifecycle QA

Date: 24 September 2026. Base: `a4759b89144e71ad0792a54a32013b687e94482f`.

## Root cause and scope

Primary, Secondary and ADHD all loaded and rendered Turnstile during page initialisation with its default automatic execution. Each stored the callback token and timestamp, then rejected tokens aged four minutes or more on Submit. A person completing a long form could therefore arrive at Review with a token obtained several minutes earlier. This matches the reported ADHD launch failure, which did not send a POST.

The four-minute defence in `intake-submission-contract.js` is unchanged. It leaves a margin before Cloudflare's five-minute limit. All server verification, API contracts, versions, schemas, consent and notification handling are unchanged.

## Selected lifecycle

`docs/assets/js/intake-turnstile.js` owns configuration/script loading, widget execution, current token and issue time, readiness, timers, retry, navigation invalidation and completion. All three intake clients use the same helper. Only their existing payload construction and submission handling remain per form.

| Event | Behaviour |
| --- | --- |
| Initial page load | Fetch configuration and load the SDK for enabled forms. No widget execution or token. Submit stays disabled. |
| Enter Review | Render with `execution: 'execute'`, then explicitly execute. Display preparation status until verification succeeds. The compact widget fits narrow screens. |
| Successful challenge | Store the token and timestamp, announce completion and enable Submit. Schedule replacement at the existing four-minute boundary. |
| Expiry on Review | Clear the token, disable Submit, reset and execute once. No POST, answer mutation, navigation or focus change. Cloudflare automatic retry/refresh is disabled so the helper owns this flow. |
| Leave Review | Clear the timer and token and remove the widget. Ignore callbacks from removed widgets. |
| Return to Review | Create a fresh widget and challenge. Never reuse the previous token. |
| Stale token at Submit | Check both the unchanged local age guard and `isExpired()`. Refresh without sending; require a new deliberate Submit click once ready. No queued submission intent. |
| Timeout or error | Preserve answers, keep Submit disabled, and offer a keyboard-operable Retry security check button. Configuration/script errors can also be retried. |
| SDK never responds | Offer retry after a bounded wait. Once an interactive challenge begins, Cloudflare controls its timeout rather than imposing a local deadline on the person. |
| Request in progress | Capture the token into the payload, invalidate local readiness and stop timers. Existing in-progress guard rejects repeat clicks and synthetic submit events. |
| Server failure | Preserve answers and submission ID, obtain fresh verification, and permit a deliberate retry. Never automatically resend the payload. |
| Created or verified duplicate receipt | Preserve the existing receipt messages, keep Submit disabled, remove the widget and stop all further execution. |
| Disabled configuration | No widget or submission, including synthetic submit attempts. |

Cloudflare explicitly describes deferred execution for final steps of multi-step forms. Its tokens expire after 300 seconds, are single-use, and require server-side Siteverify. The helper uses supported render, execute, reset, remove and callback APIs. Siteverify remains unchanged and mandatory.

Sources checked on 24 September 2026:

- [Widget configuration and execution modes](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Public test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Automated and browser verification

Required commands:

```text
pnpm install --frozen-lockfile
pnpm run check
pnpm run deploy:dry-run
git diff --check
```

All pass. `pnpm run check` runs type generation, TypeScript checking, 469 tests across 18 files, and validation of 40 HTML pages. There are 23 new deterministic helper tests; the existing 446 tests remain, with client source assertions updated to follow the shared helper. Primary, Secondary and ADHD client, validation, Worker and receiver regression suites pass.

Browser commands, using the bundled Playwright runtime (or `QA_NODE_MODULES`):

```text
node scripts/qa-intake-turnstile.mjs
node scripts/qa-intake-turnstile.mjs --real
node scripts/qa-extension-browser.mjs --form=all
node scripts/qa-intake-refinements.mjs --form=all
```

- New deterministic browser suite: 39 checks across all three actual form clients. Covers delayed first Review, fresh token, timer expiry, all error callbacks, SDK expiry, stale Submit with suspended timers, editing and returning, unchanged ordinary/sensitive answers, failure/retry, concurrent submit events, success, verified duplicate and disabled configuration.
- Real Cloudflare public test-key suite: 18 checks across all three clients on localhost. Uses `1x00000000000000000000AA`. The SDK and challenges are real; expiry is triggered through the registered callback. Every form POST is fulfilled by the browser harness with a test receipt. There is no forwarding to a Worker, Apps Script, Sheet or notification service.
- Existing extension browser suite: 35 checks pass, including Secondary and all ADHD routes, consent withdrawal, payload isolation, request failures/timeouts, verified duplicates, reduced motion and forced colours.
- Existing refinement browser suite: 22 scenario groups pass, including exam-board controls, ADHD consent help, keyboard navigation, age boundaries and route changes.
- Desktop (1440px), 320px and 200% CSS zoom checks pass without horizontal overflow. The new suite also uses touch/no-hover and reduced-motion settings. Security status is a polite atomic live region. Automatic refresh leaves focus unchanged. Retry and Submit are keyboard-operable, with visible focus and no focus trap. Screenshot outputs remain local under `tmp/turnstile-qa/`.

The new browser harness reproduces ADHD Combined navigation from child/parent context to Additional information, back through consent help, and forward to Review. Before first Review it advances the client clock five minutes and proves zero widgets/executions. Review then obtains fresh verification. It also edits sensitive Additional information after leaving Review for a further accelerated five minutes. The next Review obtains a new token and one intentional Submit produces exactly one intercepted request. No expired-security dead end occurs.

The public test key proves SDK integration, not production risk scoring or production Siteverify/storage. No production form submission occurred.

## Release state and owner review

No release flags or backend configuration changed:

| Production flag | Value |
| --- | --- |
| `FORM_PAGE_ENABLED` | `true` |
| `FORM_SUBMISSIONS_ENABLED` | `true` |
| `SECONDARY_FORM_PAGE_ENABLED` | `true` |
| `SECONDARY_FORM_SUBMISSIONS_ENABLED` | `true` |
| `ADHD_INTAKE_PAGE_ENABLED` | `true` |
| `ADHD_INTAKE_SUBMISSIONS_ENABLED` | `false` |

No merge or deployment is authorised by this change. The next controlled ADHD launch still requires owner review, approval and deployment of this client fix, followed by separate explicit authorisation to enable ADHD submissions and conduct a controlled production submission. This PR can be reverted without touching stored data.
