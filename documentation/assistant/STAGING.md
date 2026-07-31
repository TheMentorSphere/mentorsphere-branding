# Staging and owner-testing instructions

These commands prepare a separate Workers staging environment. They do not alter DNS, the production custom domain or GitHub Pages settings.

## Local review

1. Install dependencies:

   ```powershell
   pnpm install
   ```

2. Copy `.dev.vars.example` to `.dev.vars` and add an owner-approved OpenAI API key. Do not commit the file.

3. Run all checks:

   ```powershell
   pnpm check
   pnpm run deploy:dry-run
   pnpm run audit:dependencies
   ```

4. Start the local staging configuration:

   ```powershell
   pnpm dev
   ```

5. Open the local URL printed by Wrangler and complete `MANUAL_QA.md`.

## Cloudflare staging

Only continue after the owner approves OpenAI, the privacy wording and a staging release.

1. Confirm Cloudflare authentication:

   ```powershell
   pnpm exec wrangler whoami
   ```

2. Add the provider credential to the staging Worker:

   ```powershell
   pnpm exec wrangler secret put OPENAI_API_KEY --env staging
   ```

3. Optionally restrict use to a selected OpenAI project:

   ```powershell
   pnpm exec wrangler secret put OPENAI_PROJECT_ID --env staging
   ```

4. Validate the staging bundle without uploading:

   ```powershell
   pnpm exec wrangler deploy --env staging --dry-run
   ```

5. After explicit owner approval, deploy only the staging environment:

   ```powershell
   pnpm exec wrangler deploy --env staging
   ```

6. Record the generated `workers.dev` staging URL. Treat it as public unless Cloudflare Access or another approved access control is configured.

7. Verify:

   - `/api/assistant/config` returns `enabled: true` on staging.
   - The production custom domain still returns `enabled: false`.
   - Page source and network responses contain no API key.
   - All high-risk manual tests pass.
   - OpenAI usage and Cloudflare logs contain no unexpected content.

## Production hold

Do not deploy the top-level Wrangler environment, change `routes`, modify the custom domain, change DNS or merge to `main` as part of staging review. Production enablement needs a separate explicit approval after privacy, content, accessibility and high-risk checks pass.
