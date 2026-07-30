# Phase 1 repository and content audit

Audit date: 30 July 2026.

## Technology and deployment found

- The public site contains 28 static HTML pages in `docs/`, with shared vanilla CSS and JavaScript.
- There is no frontend framework or component compiler. Repeated navigation and footer markup are static; cross-site behaviour is centralised in `docs/assets/js/site.js`.
- Branding tokens and responsive styles are CSS custom properties in `docs/assets/css/styles.css`.
- Motion is separated into `motion.css`, respects reduced motion and data-saving preferences, and is loaded by the shared script.
- `wrangler.jsonc` configures Cloudflare Workers Assets and the production custom domain `www.thementorsphere.co.uk`.
- Before Phase 1 there was no Worker entry point, API route, package manifest, automated test setup, environment-variable validation or secure server-side AI route.
- `docs/_headers` contained baseline security headers but no Content Security Policy.
- The contact form posts to Formspree. The site also links to Google appointment scheduling. No first-party analytics package was found.
- `WEBSITE-README.md` still describes GitHub Pages from `main` and `/docs`, while `wrangler.jsonc` configures Cloudflare Workers and a custom domain. The actual production deployment source therefore needs owner confirmation before any release automation is changed.

## Canonical content sources used

| Information | Canonical source |
| --- | --- |
| Versioned policies | Current published policy page and matching current source snapshot where available |
| Tutoring and ADHD prices | Pricing Plan V3.1 on `/pricing/` |
| Booking, cancellation and subscription terms | Current published `/pricing/#terms` wording |
| Service scope and subject boundaries | Current service pages |
| Contact details | Current contact page and consistent website footer |

The untracked archive under `business-documents/policies/` was read for parity checks but is not required at runtime and is not included in this chatbot change set.

## Stale, conflicting or incomplete material

1. The policy archive README and register list eight current records, but tracked V2.0 Complaints and Equality, Diversity and Inclusion replacements now exist as published pages and repository PDFs. The archive and register omit them. Phase 1 links the current V2.0 website pages and records the archive mismatch for correction.
2. The policy register calls PAYG and Subscription Terms `Terms under review` and records no version or effective date. The current task explicitly requires the published 48-hour, 60-day and 10-working-day terms. Phase 1 therefore uses the exact current website wording but does not invent a version.
3. Pricing Plan V3.1 has no explicit effective date in its approved source. The register notes a directory publication date of 11 August 2025. Phase 1 records the currently approved page version and its audit date without inventing missing policy-control fields.
4. `WEBSITE-README.md` describes GitHub Pages while the active Wrangler file describes Cloudflare Workers and a production custom domain. Deployment ownership and the canonical release path require owner confirmation.
5. The current Privacy Policy V1.4 does not mention chatbot processing or OpenAI. The feature must not be enabled for public visitors until the amendment draft has been approved and published.
6. The existing-client ADHD price-transition wording is relevant only through 31 August 2026. Phase 1 applies an automatic `validUntil` cutoff so it is excluded from retrieval from 1 September 2026.

## Searches with no stale result found

- Current visible email addresses consistently use `luke@thementorsphere.co.uk`.
- Current visible telephone links consistently use `07955 723 133` and `+447955723133`.
- Published tutoring and coaching price values match Pricing Plan V3.1 and ADHD Coaching Policy V1.3.
- Occurrences of `The Maths Mentor` in current pages refer to the approved Maths tutoring branch, its logo or its alt text. No umbrella-level contact or policy wording was found that should be silently renamed.
- No archived policy directory or duplicate superseded price file was found in the tracked public site.

## Owner approvals required

- Approve OpenAI as a new sub-processor and paid provider.
- Approve and publish the chatbot Privacy Policy wording.
- Decide whether to request Modified Abuse Monitoring or Zero Data Retention from OpenAI. `store: false` prevents Responses application-state storage, but default abuse-monitoring logs may still retain prompts and responses for up to 30 days.
- Confirm whether normal production deployment is Cloudflare Workers or GitHub Pages.
- Update or approve the policy archive and register so Complaints V2.0 and Equality, Diversity and Inclusion V2.0 are recorded.
- Confirm whether the unversioned PAYG and Subscription Terms should receive a formal version and effective date.
- Approve any public staging deployment and its access controls.
