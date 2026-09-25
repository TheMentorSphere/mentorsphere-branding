# Policy-copy manifest, recorded before editing

Audit date: 25 September 2026. Starting production/main commit: `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`.

This records discovered copies and their status before policy drafting. New V1.6/V1.4 documents are owner-review candidates; production remains V1.5/V1.3 until separately approved and published. No historical launch, QA, incident, policy or assessment evidence is to be rewritten.

## Search scope and storage finding

Filename/content and document-control searches covered the whole repository, all registered local worktrees, `C:/Users/luke9/Documents`, `C:/Users/luke9/OneDrive`, `C:/Users/luke9/Desktop`, `C:/Users/luke9/Downloads` and `C:/Users/luke9/.codex/worktrees`, including hidden/ignored policy paths. DOCX XML, PDF text/metadata, archive README, CSV register and policy source snapshots were inspected. The Downloads policy ZIP was inspected without extraction. No additional current Privacy V1.5 or ADHD V1.3 editable/PDF copy was found in those business locations. `Documents/The MentorSphere` currently contains migration records and teaching resources, not a policy library. Recovery packages and unrelated personal/client records were not opened or modified.

There is no demonstrated single canonical current business-document library. The best available local Privacy editing source is in an old registered task worktree, while ADHD is in the original checkout's untracked policy archive. The word "current" in a historical task path is not evidence of a maintained mirror. These distinct origins are retained in the record rather than silently treating the historical worktree as the business's canonical current location.

## Path keys

- **W**: `C:/Users/luke9/.codex/worktrees/update-intake-policies/mentorsphere-branding`
- **O**: `C:/Users/luke9/Documents/GitHub/mentorsphere-branding`
- **A**: `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-archive-data-protection`
- **D**: `C:/Users/luke9/Downloads`

## Policy and control copies

| Root / relative path | Format / version found | Pre-edit status | Required action / history treatment |
|---|---|---|---|
| W / `docs/privacy-policy/index.html` | HTML V1.5, effective 31 July 2026 | Current production source at starting main | Prepare V1.6, dated 25 September 2026 |
| W / `docs/adhd-coaching-policy/index.html` | HTML V1.3, effective 28 July 2026 | Current production source | Prepare V1.4, dated 25 September 2026 |
| W / `docs/policies/index.html` | HTML policy directory | Current version references | Update affected index entries only |
| A / `business-documents/policies/current/docx/Privacy_Policy_V1.5.docx` | DOCX V1.5, effective 31 July 2026 | Best available matching editable source, preserved task archive | Use as template/content baseline; keep original unchanged |
| A / `business-documents/policies/current/pdf/Privacy_Policy_V1.5.pdf` | PDF V1.5, five pages, Word export | Matching historical approved export | Preserve byte-for-byte; compare new PDF with new editable source |
| O / `business-documents/policies/current/docx/ADHD_Coaching_Policy_V1.3.docx` | DOCX V1.3, effective 28 July 2026 | Latest local editable ADHD copy in untracked archive | Use template; retain original path as current published pending owner approval of V1.4 |
| O / `business-documents/policies/current/pdf/ADHD_Coaching_Policy_V1.3.pdf` | PDF V1.3, five pages, generated export | Current local ADHD export | Retain original path as current published pending owner approval of V1.4 |
| O / `business-documents/policies/source-snapshots/ADHD_Coaching_Policy_V1.3.md` | Markdown V1.3 | Source snapshot generated 29 July 2026 | Preserve historical snapshot |
| O / `business-documents/policies/current/docx/Privacy_Policy_V1.4.docx` | DOCX V1.4, effective 28 July 2026 | Stale copy still labelled current locally | Preserve original path; explicitly mark superseded in local controls |
| O / `business-documents/policies/current/pdf/Privacy_Policy_V1.4.pdf` | PDF V1.4 | Stale local export | Preserve original path; explicitly mark superseded in local controls |
| O / `business-documents/policies/source-snapshots/Privacy_Policy_V1.4.md` | Markdown V1.4 | Historical source snapshot | Preserve unchanged |
| A / `business-documents/policies/superseded/docx/Privacy_Policy_V1.4_SUPERSEDED_effective_28_July_2026.docx` | DOCX V1.4 | Explicit historical archive | Preserve unchanged |
| A / `business-documents/policies/superseded/pdf/Privacy_Policy_V1.4_SUPERSEDED_effective_28_July_2026.pdf` | PDF V1.4 | Explicit historical archive | Preserve unchanged |
| O / `business-documents/policies/README.md` | Markdown, generated 29 July 2026 | Stale current list, Privacy V1.4; folder convention source | Add scoped update/status note; preserve old provenance |
| O / `business-documents/policies/register/MentorSphere_Policy_Register.csv` | CSV | Stale current Privacy V1.4; ADHD V1.3 | Update only affected rows/statuses and new version records |
| O / `business-documents/policies/register/MentorSphere_Policy_Register.xlsx` | XLSX | Companion register | Keep affected policy records aligned with CSV |
| D / `ADHD Coaching Policy V1.2.docx.pdf` | PDF V1.2, ten pages | Older downloaded copy | Preserve unchanged; not used as current content/template |
| D / `MentorSphere_New_Policies_V2.0.zip` | ZIP containing only EDI and Complaints PDFs | Unrelated policy package | Preserve unchanged |
| W / `documentation/intake/PRIVACY_POLICY_AMENDMENT_DRAFT.md` | Markdown V1.5 publication text | Historical Primary record | Preserve unchanged |

The original local archive README states it was generated from `origin/main` commit `24266488ce402ab67e482e55f9101b0463489e4b` on 29 July 2026. It establishes `current/docx`, `current/pdf`, `source-snapshots`, `register` and `superseded`. Its stale Privacy V1.4 row is a document-control inconsistency, not a competing approved V1.5 policy. The source-of-truth rule in the current brief resolves version/content precedence in favour of current production V1.5.

A is a clean registered worktree on `codex/archive-primary-learner-data-protection`, HEAD `6f51eba53656d7e2ce6a6ee6bded84e10dccd7af`, whose commit is titled "Archive approved learner profile data protection records". That branch tracks the Privacy V1.5 and superseded V1.4 files plus Primary assessment exports. Those assets were not present in the starting main commit. The starting main tracks only EDI and Complaints policy PDFs in `business-documents/policies/current/pdf`; repository PDF coverage is deliberately incomplete at this point. No public downloadable Privacy/ADHD PDF route was identified.

## Editing sources, mirrors and preservation decision

- Privacy editable baseline: **A / `business-documents/policies/current/docx/Privacy_Policy_V1.5.docx`**. The current public HTML is the substantive production cross-check.
- ADHD editable baseline: **O / `business-documents/policies/current/docx/ADHD_Coaching_Policy_V1.3.docx`**. The current public HTML is the substantive production cross-check.
- Prepare new versioned DOCX/PDF files in W under the existing `business-documents/policies/current/{docx,pdf}` convention, and copy the verified files into O's matching local archive locations as the maintained local mirror. Track only the two revised policy families and directly relevant control/evidence files.
- Do not mutate A or other old task worktrees. Retain old O filenames and identify status in README/register, avoiding unverified link or synchronisation breakage from moving them. Privacy V1.4 is superseded by published V1.5; ADHD V1.3 remains current published until V1.4 is approved and published.
- New document controls must say prepared for owner review; creation does not make an unapproved version live. Historical V1.5 Privacy and V1.3 ADHD remain recoverable.
- Preserve established branded headers, footer version/page numbering, document-control headings, accessible Word styles and source layout. V1.5 Privacy includes official logo artwork and five-page Word export; ADHD V1.3 has text branding, archive header and page-number footer. The Privacy V1.5 core-properties comment still refers to the older July 29 V1.4 generation commit: preserve that original, but correct provenance in newly created documents.

## Historical task copies

Each worktree below contains `docs/privacy-policy/index.html` and `docs/adhd-coaching-policy/index.html`. It also contains the historical Primary `documentation/intake/PRIVACY_POLICY_AMENDMENT_DRAFT.md` unless noted. These copies are checkout snapshots, not intentionally maintained current mirrors. Leave them unchanged. Only W is the new production-based editing checkout; O's website files are unrelated working-tree content and are not edited by this task.

| Absolute worktree root | Privacy HTML version | ADHD HTML version | Treatment |
|---|---|---|---|
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/.codex/worktrees/adhd-launch-four/mentorsphere-branding` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/.codex/worktrees/intake-receipt-timeout/mentorsphere-branding` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/.codex/worktrees/intake-secondary-v1/mentorsphere-branding` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/.codex/worktrees/update-intake-policies/mentorsphere-branding` | V1.5 | V1.3 | Editing checkout |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/adhd-launch-attempt-2` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/adhd-production-launch` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/intake-owner-refinements` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/intake-post-storage-fix` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/intake-production-launch` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/online-adhd-coaching-seo-clean` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/.worktrees/turnstile-lifecycle` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-archive-data-protection` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-deploy-v15` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-disable-v5` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-enable-primary-page` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-enable-v4-submissions` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-enable-v5` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-launch-primary-learner-profile` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-pr28` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-primary-learner-profile` | V1.4 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-refine-primary-profile` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-relaunch-v4` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-restore-v4-disabled` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-v5-diagnostics` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-v5-enable` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-v5-enable-secret` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-v5-safety` | V1.5 | V1.3 | Preserve |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding-v5-turnstile-lifecycle` | V1.5 | V1.3 | Preserve |

A package cache also contains V1.5/V1.3 HTML at O / `.pnpm-store/v11/projects/6ec705c3568cc0950d3391c9f21cf48b/docs/{privacy-policy,adhd-coaching-policy}/index.html`. This is a generated/dependency-cache snapshot, not a policy mirror; preserve it. Historical QA, launch, owner-review and receipt-timeout reports may correctly retain older policy references and must remain intact.

## Baseline checksums

- `Privacy_Policy_V1.5.docx`: SHA-256 `5c923b2b6d7d461910885e2a78ac78f3e3257d7fa1fc3b5ff8ddf7fdc4a0e7da`.
- `Privacy_Policy_V1.5.pdf`: SHA-256 `8eb3ef4d17d21b34915c72c8e00baa72c75fe2dc2e2d1e4b5de7e2034cca9b3d`.
- `ADHD_Coaching_Policy_V1.3.docx`: SHA-256 `9cb91179315ebe8fb342c7a67de36234ef19f9b87a56579fa356b28f2d75b154`.
- `ADHD_Coaching_Policy_V1.3.pdf`: SHA-256 `b9b9be528881d206a1ea8974bdb442214dca2b0fd1a9803fc725d5e677292d2f`.
