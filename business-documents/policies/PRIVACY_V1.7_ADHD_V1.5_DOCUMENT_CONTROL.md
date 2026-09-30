# Privacy Policy V1.7 and ADHD Coaching Policy V1.5 document control

Prepared: 29 September 2026, with the export procedure finalised on 30 September 2026. Owner approval in principle: Luke Turner, 29 September 2026. Owner adoption: Luke Turner, 30 September 2026. Status: **adopted, effective 30 September 2026; website publication follows review and merge of the pull request.** Branch: `adhd-google-ads-measurement`, based on `origin/main` `7d9270ca8fc5b95dd80eb21c75a2c6d4a198e2ec`.

| Policy | Adopted version | Effective date | Supersedes | Editable copy | Matching export | Source snapshot |
|---|---|---|---|---|---|---|
| Privacy Policy | V1.7 | 30 September 2026 | V1.6, 25 September 2026 | [DOCX](current/docx/Privacy_Policy_V1.7.docx) | [PDF](current/pdf/Privacy_Policy_V1.7.pdf) | [Markdown](source-snapshots/Privacy_Policy_V1.7.md) |
| ADHD Coaching Policy | V1.5 | 30 September 2026 | V1.4, 25 September 2026 | [DOCX](current/docx/ADHD_Coaching_Policy_V1.5.docx) | [PDF](current/pdf/ADHD_Coaching_Policy_V1.5.pdf) | [Markdown](source-snapshots/ADHD_Coaching_Policy_V1.5.md) |

## What changed

**Privacy Policy V1.7** adds consent-based Google Ads conversion measurement: section 13 on advertising measurement, cookies and similar technologies; Google Ads in section 6; a statement in section 8 that enquiry form contents are not sent to Google Ads; the closing note now names advertising measurement; the policy updates and contact sections are renumbered 14 and 15. The "Cookie settings" wording reflects the site-wide control. All V1.6 substantive provisions are otherwise unchanged.

**ADHD Coaching Policy V1.5** is an administrative document-maintenance update. The section 3 intake paragraph now refers to "the current Privacy Policy" instead of Privacy Policy V1.6, so the same stale cross-reference cannot recur when the Privacy Policy changes. No service terms change: coaching scope, audiences and ages, fees, transition dates, cancellation terms, confidentiality, parent and guardian involvement, funded coaching, intake arrangements, safeguarding boundaries and the 27 July 2027 review date are identical to V1.4. The historical V1.4 change-log entry still mentions V1.6, as a record of that version.

Parity, retention and rendering evidence: [policy document QA](../../documentation/advertising/POLICY_DOCUMENT_QA_2026-09-29.md). Verified hashes: [parity manifest](policy-parity-manifest.json).

## Adoption, 30 September 2026

Luke adopted both policies with effect from 30 September 2026. Before adoption, one format-specific phrase in Privacy Policy V1.7 section 13 ("Your choice") was corrected so that the same text reads correctly on the website and in the DOCX and PDF copies, which have no button:

- Before: You can change or withdraw your choice at any time using "Cookie settings", which appears at the bottom of the website's pages, or using the button in this section.
- After: You can change or withdraw your choice at any time using the "Cookie settings" control at the bottom of The MentorSphere website's pages.

Apart from this correction and the adoption date in each change-log entry, no policy wording changed. The "Change your advertising measurement choice" button remains on the website's Privacy Policy page as an extra convenience.

The adoption date was then applied in every location listed by this record:

1. Website, `docs/privacy-policy/index.html`: meta description, `og:description`, JSON-LD `datePublished` and `dateModified` (`2026-09-30`), hero lead, version badge, "Effective date" control and the V1.7 change-log entry.
2. Website, `docs/adhd-coaching-policy/index.html`: the same seven places for V1.5.
3. Website, `docs/policies/index.html`: "Effective from 30 September 2026" on both policy cards.
4. `business-documents/policies/policy-parity-manifest.json`: `effectiveDate` "30 September 2026", `effectiveDateProvisional` `false` and `status` "Approved and current. Owner adoption: 30 September 2026." for both policies.
5. Documents regenerated from the helper folder recorded in the QA record: `build_policy_documents.py "30 September 2026" --adopted --overwrite`, then `export_pdf.ps1`, then `verify_policy_documents.py --adopted`. Both DOCX files, both PDFs and both source snapshots now carry the adopted status and date, with no provisional note.
6. `docxSha256`, `pdfSha256` and `bodySha256` updated in the manifest from `verification-summary.json`; every rendered page inspected; `pnpm run check`, the Worker dry build and `git diff --check` passed.

`tests/policy-document-parity.test.js` and `tests/privacy-policy-advertising.test.js` take the date from the manifest and fail if any of these locations disagree. The parity test also fails if an adopted version still carries provisional or "approved in principle" wording in its manifest status, DOCX front matter or source snapshot.

## Previous versions and archive safety

Privacy Policy V1.6 and ADHD Coaching Policy V1.4 are superseded by V1.7 and V1.5 with effect from 30 September 2026. They remain the versions shown on the live website until this change is merged and deployed. Their DOCX, PDF and source-snapshot files are unchanged at their existing paths and still match the approved hashes in the [25 September QA record](../../documentation/intake/POLICY_DOCUMENT_QA_2026-09-25.md). No historical version was overwritten, moved or deleted.

## Local archive and register

The untracked local archive files were updated outside Git, following the previous release's convention: `business-documents/policies/README.md`, `register/MentorSphere_Policy_Register.csv` and `register/MentorSphere_Policy_Register.xlsx`. Each records V1.7 and V1.5 as adopted, effective 30 September 2026, with website publication pending, and V1.6 and V1.4 as superseded. At publication close-out, record V1.7 and V1.5 as current published with the merge commit.

## Governance boundaries

No merge, deployment, Pages, DNS, domain, Google Ads, Formspree or Calendar change is made by this adoption. Google Ads Conversion ID and labels remain empty, so no Google measurement can run.
