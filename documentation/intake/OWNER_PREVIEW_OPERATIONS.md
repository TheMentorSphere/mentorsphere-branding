# Owner previews and release boundary

These previews are explicitly isolated from production. No production deploy command was run. Primary remains enabled on its existing domain and its page, client, validation, Apps Script, policy and schema are unchanged.

| Form | Owner preview | Entry point | Configuration |
| --- | --- | --- | --- |
| Secondary | https://mentorsphere-secondary-owner-preview.luke-f8c.workers.dev/forms/secondary-learner-profile/ | `src/preview/secondary-preview.ts` | `wrangler.secondary-preview.jsonc` |
| ADHD, added by the dependent draft PR | https://mentorsphere-adhd-owner-preview.luke-f8c.workers.dev/forms/adhd-coaching-intake/ | `src/preview/adhd-preview.ts` | `wrangler.adhd-preview.jsonc` |

Use fictional information only. The banner explains that responses are simulated and not stored. Its labelled selector exercises successful submission, verified duplicate, retryable upstream failure, malformed JSON, unverified duplicate and a 30-second browser timeout. A failed attempt preserves the form and submission ID; a fresh security token is required before manually retrying. Reload after a completed success to begin again.

The preview entrypoint rejects every hostname except workers.dev and local development, rejects Primary's routes and the other form's page/API, and only serves the chosen new form and its required assets. Assets are packaged separately; Primary's page is not uploaded. Links to current Privacy Policy, Accessibility and Contact go to their existing live pages. The test controls and simulated forwarding are not imported by the production entrypoint. The shared API handler takes an optional forwarding function whose production default remains the real signed Apps Script transport.

Cloudflare's public always-pass Turnstile test keys are the only keys in these preview Workers. There is no Apps Script endpoint, HMAC secret, Sheet binding, persistent storage or email binding. Invocation logs are disabled. The proven fixed-field diagnostic logger is the only application logging path; tests check that it never includes answers, identities, tokens or credentials.

All preview responses carry no-store, noindex/nofollow/noarchive, no-referrer, nosniff, frame restrictions and a CSP limited to self and Cloudflare Turnstile. No production custom-domain route is present. Production form-page and submission defaults remain false independently for both new forms; Primary's true/true flags are untouched.

## Reproduction

```sh
# PR A can run all Secondary commands on its own.
node scripts/prepare-intake-preview.mjs secondary-learner-profile
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config wrangler.secondary-preview.jsonc
node scripts/qa-extension-browser.mjs --form=secondary
node scripts/qa-owner-previews.mjs --form=secondary

# PR B adds the ADHD form and its isolated configuration.
node scripts/prepare-intake-preview.mjs adhd-coaching-intake
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config wrangler.adhd-preview.jsonc
node scripts/qa-extension-browser.mjs --form=adhd
node scripts/qa-owner-previews.mjs --form=adhd
```

The browser harness accepts `QA_NODE_MODULES` pointing to a directory containing Playwright, and `QA_BROWSER_CHANNEL` (default `chrome`). The default module location is the local Codex bundled runtime used for this review. Browser QA is separate from the dependency-locked Vitest/TypeScript/content checks and is not claimed as a portable CI job without those browser prerequisites.

## Data and cleanup

The Apps Script tests use actual generated form scripts, actual signed HMAC envelopes and temporary on-disk storage through a local Google-service adapter. Tests reopen the stored file in a fresh VM, verify the duplicate against canonical answers and consent, reject conflicting retries/corrupt or missing rows, check formula escaping and notification failure, and delete the temporary directory in a `finally` block. Cleanup asserts the resolved target is a generated test directory and verifies its removal. No temporary or production Google resource has been created.

This proves the local durable contract, not Google-hosted deployment, permissions, quotas or real delivery. A fictional-data test of each dedicated Google backend is a release prerequisite after separate setup approval. No real learner or client data was used. Local screenshots and QA evidence contain deliberately fictional details.

## Read-only production verification

On 21 September 2026, the existing Primary page returned HTTP 200 with version `primary-learner-profile-v5` and its robots controls. Its public config returned `enabled: true`, action `primary_learner_profile`. Both new custom-domain page routes returned HTTP 404. No production submission was sent. Origin/main remained `cb5486ac17fd6f16dc26795b116ce2433e5fea89` during final review.

These draft PRs are review artefacts. They must not be merged, deployed to production, connected to production storage or enabled by this task. Owner approval of wording/schema, dedicated Google-hosted setup and release validation precedes any future activation.
