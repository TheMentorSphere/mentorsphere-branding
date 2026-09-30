# Policy document QA, 29 and 30 September 2026

Status: completed for Privacy Policy V1.7 and ADHD Coaching Policy V1.5, adopted by the owner with effect from 30 September 2026. Not yet merged or published. See the [document-control note](../../business-documents/policies/PRIVACY_V1.7_ADHD_V1.5_DOCUMENT_CONTROL.md).

## Method

The [25 September 2026 method](../intake/POLICY_DOCUMENT_QA_2026-09-25.md) was followed.

- Templates: the approved, tracked `Privacy_Policy_V1.6.docx` and `ADHD_Coaching_Policy_V1.4.docx`. Their SHA-256 values were checked before and after the build and are unchanged.
- Text source: the website policy body in `div.narrow.prose` on this branch.
- Build: each template was copied at package level. Every unchanged policy paragraph keeps its original OOXML. New or amended blocks clone the paragraph properties of the nearest unchanged block of the same kind (heading, paragraph, list item or closing note). Only `word/document.xml`, the document relationships (Privacy only, for the new Google Privacy Policy link), the footer version text and core metadata changed; every other package part is byte-identical to its template.
- Front matter: version, effective date and status. The 29 September builds used a provisional date and the status "Approved in principle by the owner, 29 September 2026. Not yet adopted or published; the effective date is provisional until adoption." The adopted 30 September build uses the effective date 30 September 2026 and the status "Approved and current. Owner adoption: 30 September 2026." The ADHD next review date remains 27 July 2027.
- PDF: Microsoft Word 16.0 opened each DOCX read-only and exported a tagged PDF with heading bookmarks, closing without saving. The DOCX hashes were identical before and after export. Word stalled intermittently when one instance exported several documents or started immediately after a forced close, so each document is exported by its own Word instance.
- Parity: website, DOCX and PDF policy bodies were compared after the documented layout-only normalisation (NFKC, bullet characters, whitespace, wrapped hyphens). PDF text was extracted with pypdf after removing the archive header, page footers and front matter.
- Rendering: pypdfium2 rendered every PDF page for visual inspection.

## Results

| Policy | Website / DOCX / PDF parity | PDF pages | Body blocks | Unchanged blocks reused | Previous-version blocks retained verbatim | Normalised body SHA-256 |
|---|---|---:|---:|---:|---|---|
| Privacy Policy V1.7 | PASS, exact full-body equality | 9 | 154 | 117 | 117 of 120 | `145ce160418e914c752b7bd89b76dcf0f5490374a86e33431558710908f0c4b6` |
| ADHD Coaching Policy V1.5 | PASS, exact full-body equality | 6 | 92 | 90 | 90 of 91 | `42efd76d2c5b527ad8e5a2119261da9a87de8e0121abdef8fd5a411f536a8608` |

These are the adopted 30 September 2026 results. The body hashes differ from the 29 September builds because of the adoption date in each change-log entry and, for Privacy, the format-neutral "Cookie settings" wording correction in section 13 described in the document-control note. Block counts, reuse and retention are unchanged.

Privacy Policy V1.7: the three V1.6 blocks not retained verbatim are the renumbered "13. Policy updates" and "14. Contact information" headings (now 14 and 15) and the closing note, which now also names advertising measurement. The 34 new blocks are the section 6 Google Ads entry, the section 8 statement that enquiry form contents are not sent to Google Ads, section 13 and the V1.7 change-log entry. All other V1.6 provisions, including learner-profile, ADHD Coaching Intake, consent, lawful-basis, retention, rights and governance provisions, are unchanged and in their original order.

ADHD Coaching Policy V1.5: the only V1.4 block not retained verbatim is the section 3 intake paragraph, where "The Privacy Policy V1.6 explains" became "The current Privacy Policy explains". The only other change is the V1.5 change-log entry. Coaching scope, audiences and ages, fees, transition dates, cancellation terms, confidentiality, parent and guardian involvement, funded coaching, intake arrangements, safeguarding boundaries and the next review date are unchanged.

Both PDFs are tagged, have heading bookmarks and working link annotations. Every page carries the "Version 1.7" or "Version 1.5" footer and the correct page number. The PDF title metadata is "Privacy Policy V1.7" and "ADHD Coaching Policy V1.5".

All 15 pages of the first export (29 September) were inspected individually. The files were re-exported on 30 September when the export procedure was finalised; the re-export was re-verified for parity and page count and all 15 pages were inspected again on contact sheets. After adoption on 30 September, the documents were rebuilt with the adopted status, exported and verified again, and all 15 adopted pages were inspected individually. A final rebuild changed only the source-snapshot Markdown for line breaks (backslash hard breaks and a single final newline, so that `git diff --check` passes); its DOCX and PDF bodies were unchanged and all 15 rendered pages were pixel-identical to the inspected pages. No clipped or overlapping text, missing glyphs, broken lists, orphaned headings or footer collisions were found. Section 13 of the Privacy Policy runs from page 7 to page 9; the corrected "Cookie settings" item is on page 8.

## Files

| File | SHA-256 |
|---|---|
| `business-documents/policies/current/docx/Privacy_Policy_V1.7.docx` | `7e87310d23fd38513ac60bf8997595904d792713ade77da88b7e9900c93e4b59` |
| `business-documents/policies/current/pdf/Privacy_Policy_V1.7.pdf` | `47bde716eccb47290eea42ca36180acd73b15bd22ade362f1db5fcdb4181774f` |
| `business-documents/policies/current/docx/ADHD_Coaching_Policy_V1.5.docx` | `14ca222cff3c0ce2f8609d19021c38a2885002527a01762b36b59e0e4ee74927` |
| `business-documents/policies/current/pdf/ADHD_Coaching_Policy_V1.5.pdf` | `1fdcb7c9ca0183ddcde90e4d4029177e6406cbc887f4b0cf6df73300d1578237` |

Source snapshots: `business-documents/policies/source-snapshots/Privacy_Policy_V1.7.md` and `ADHD_Coaching_Policy_V1.5.md`. Each records the normalised policy body hash above.

Historical copies are unchanged: Privacy V1.6 DOCX `6c7266dc…6923` and PDF `dfbfd209…9f3fca`; ADHD V1.4 DOCX `62facdf1…fb91` and PDF `02ec6f9e…8668`, matching the approved values in the 25 September record. No historical file was overwritten, moved or deleted.

## Automated checks

`tests/policy-document-parity.test.js` reads `business-documents/policies/policy-parity-manifest.json` and checks, for both policies:

- the website, DOCX and source-snapshot bodies are identical and match the manifest body hash;
- the DOCX and PDF match their verified hashes, so a changed PDF or a body that drifts from the verified PDF fails;
- one version, status and effective date across page metadata, visible controls, structured data, change log, policy directory card, DOCX front matter, footer, core metadata and snapshot header;
- adoption is not claimed while the date is provisional, and an adopted version carries no provisional or "approved in principle" wording in its status, DOCX front matter or source snapshot;
- the previous-version provisions retained, as described above, and the unchanged ADHD service terms;
- the historical V1.6 and V1.4 files are unchanged.

## Generation helpers

The build, export and verification helpers are retained outside Git at `C:/Users/luke9/AppData/Local/Temp/mentorsphere-policy-update-20260929`, as in the previous release: `build_policy_documents.py`, `export_pdf.ps1` (with `export_probe.ps1`) and `verify_policy_documents.py`, with `build-summary.json`, `verification-summary.json` and the page renders. They are QA intermediates, not publication assets.
