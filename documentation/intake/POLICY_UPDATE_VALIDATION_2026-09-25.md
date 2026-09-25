# Intake policy update validation

Date: 25 September 2026. Status: prepared for owner review, not merged or deployed.

Starting fetched `origin/main`: `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`. The original checkout was on an unrelated branch with untracked archive files; it was not switched or cleaned. A clean worktree and feature branch `codex/update-intake-policies-v1-6-v1-4` were created from the fetched production baseline.

## Repository gates

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed; lockfile unchanged |
| `pnpm run check` | Passed: generated types, TypeScript, 525 tests in 19 files and content validation across 40 HTML pages |
| `pnpm run deploy:dry-run` | Passed; dry run exited without deployment |
| `git diff --check` | Passed |
| Intake/runtime/config scope | No changes to form HTML, clients, shared scripts/CSS, Worker, validators, schemas, Apps Script, package/lock files or release configuration |
| Secret review | No credentials, private Apps Script endpoints, tokens or private keys introduced in reviewed text; DOCX/PDF policy content checked against the public candidate text |
| Historical evidence | Original Primary governance, QA, launch, owner-review and incident records unchanged |

The existing tests cover the three intake implementations, receiver and validation behaviour, receipts, duplicates, consent and Turnstile. No new production submission was made. A further production end-to-end test is not claimed or required for this document-only change.

## Website and document checks

[Website QA](POLICY_WEBSITE_QA_2026-09-25.md) records local inspection of all seven changed HTML pages at 1440, 390 and 320 px, links and policy-index navigation, headings and keyboard operation, touch/no-hover and reduced motion. There are no new policy layout regressions or browser errors. Two existing limitations are explicitly retained for separate review: the ADHD service hero clips at 320 px; the no-JavaScript mobile fallback navigation can cover the policy text. Full no-JavaScript visual readability is not claimed.

[Document QA](POLICY_DOCUMENT_QA_2026-09-25.md) records source-template preservation, complete text comparison, metadata, export hashes and every-page inspection. Privacy V1.6 is eight pages; ADHD V1.4 is six. The PDFs were exported from the revised DOCX files through Word after the packaged renderer reported no bundled LibreOffice on Windows. All 14 pages were rendered and visually checked. Website, DOCX and PDF full policy bodies match after documented layout-only normalisation. Local mirrors are byte-identical to repository assets.

Both policies use the requested effective date, 25 September 2026. The ADHD next review remains 27 July 2027; existing prices and historical pricing-transition dates remain unchanged. Old current-version labels are removed from page control/metadata, policy cards and four service links. Historical V1.5/V1.4 Privacy and V1.3 ADHD change logs remain. The three forms use correct unversioned policy links and need no edit.

## Local archive and register checks

Six new versioned files were copied into the original local `business-documents/policies` archive: two DOCX files, two PDFs and two Markdown source snapshots. Exact paths and hashes are in the document QA record. Older policy assets and source snapshots retain their original contents and paths.

These three local control files were also updated outside the clean review worktree:

- `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/README.md`
- `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/register/MentorSphere_Policy_Register.csv`
- `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/register/MentorSphere_Policy_Register.xlsx`

Privacy V1.4 is marked superseded by published V1.5. The missing published V1.5 record is added with its actual archive source. ADHD V1.3 stays current published pending approval. V1.6/V1.4 candidates are marked prepared for owner review, with no implied publication. The original README generation/provenance record remains intact under a historical heading.

The XLSX was imported and edited with the bundled artifact tool. Export checks confirm typed dates, one existing table extended from A1:O9 to A1:O12, the original A2 freeze pane, existing filters and all unrelated values/styles preserved. CSV and XLSX records match. The artifact renderer did not produce an image on Windows; native Excel read-only PDF exports were used to inspect the source and changed ranges. New rows follow the original font, wrap, alignment and row height. Recalculation and error scan passed; this register contains no calculation model. Neither Word nor Excel saved changes to the retained source templates.

The scoped local register changes are not imported into Git because the broader original archive is untracked and contains unrelated records. The reviewable repository [document-control note](../../business-documents/policies/INTAKE_POLICY_DOCUMENT_CONTROL.md) covers this update.

## Owner review boundary

The [cross-form decision note](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md) records the authoritative sources and specific outstanding decisions. Both new DPIAs identify no high residual risk with the assessed safeguards operating, with medium risks and private operational assumptions requiring owner review. Both LIAs conditionally support the limited ordinary child/third-party use. No approval or signature is fabricated, and no historical consent is retrospectively relabelled.

No merge, live deployment, Pages/DNS/domain setting, Sheet, secret, release flag or production integration is changed by this task. The PR and exact final head are reported in the final handover.
