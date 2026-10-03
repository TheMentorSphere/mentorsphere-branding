# Privacy Policy V1.8 document QA, 3 October 2026

Status: adopted with effect from 3 October 2026 under the owner's task instruction; website publication pending. See [document control](../../business-documents/policies/PRIVACY_V1.8_DOCUMENT_CONTROL.md). The unchanged ADHD Coaching Policy V1.5 retains its [30 September QA evidence](POLICY_DOCUMENT_QA_2026-09-29.md).

## Method and results

The tracked V1.7 DOCX was copied at package level using the established policy generation helper. Website `div.narrow.prose` supplies the policy body. Unchanged paragraphs retain their original OOXML; new paragraphs clone the nearest matching paragraph style. Only `word/document.xml`, `word/footer2.xml` and `docProps/core.xml` differ from V1.7. All other package parts are byte-identical.

Microsoft Word opened the new document read-only in an invisible instance and exported a tagged PDF with heading bookmarks, then closed without saving. Its DOCX hash did not change. The standard standalone DOCX renderer was unavailable because LibreOffice was not installed; the repository's existing Word export and pypdfium2 rendering method was used. No installation was needed.

Website, DOCX, source snapshot and extracted PDF body match exactly after the existing layout-only normalisation. There are **157 body blocks**, with **153 of 154 V1.7 blocks retained verbatim and in order**. The only replaced block is the categorical health-information exclusion, now qualified as individual information supplied through enquiries, intake or profiles. Added blocks are the page-title/referrer bullet, page-context explanation and V1.8 change log.

The PDF has **10 pages**, tagged structure, three bookmarks and five link annotations. All ten pages were rendered and inspected individually. No clipped text, overlap, missing glyphs or footer collisions were found. Section 13 spans pages 7 to 9; contact information and the closing note occupy page 10. Existing list continuations remain readable across page breaks. Version 1.8 and page numbers appear in the footers, and front matter shows the adopted status/date.

| Verified item | SHA-256 |
|---|---|
| Normalised policy body | `afb0bf1f83258cf98c062f24e779e0a338f00c7ebdd76967ec907c2a1c8967cb` |
| V1.8 DOCX | `e55577500e9324e376ca490033f5447b8ed053b82d5822e703e11d68c5ea428b` |
| V1.8 PDF | `280b5b4fd33127699bdee1d96371509ed2835dfd08a6ceac5c10acedb241329f` |
| V1.8 source snapshot | `86860a385165e85b3af37da0368b3914d38c7a242ff5cf7705689b702d7f4beb` |
| Unchanged V1.7 DOCX | `7e87310d23fd38513ac60bf8997595904d792713ade77da88b7e9900c93e4b59` |
| Unchanged V1.7 PDF | `47bde716eccb47290eea42ca36180acd73b15bd22ade362f1db5fcdb4181774f` |

`tests/policy-document-parity.test.js` checks full website/DOCX/snapshot equality, verified PDF/DOCX hashes, all version/date/status controls, precise changes from V1.7 and unchanged V1.6 and V1.7 historical files. The existing ADHD policy tests are unchanged.

Build/export/verification helpers, summaries and all page renders are retained outside Git in `C:/Users/luke9/AppData/Local/Temp/mentorsphere-policy-update-20261003`. Commands: `build_policy_documents.py "3 October 2026" --adopted`, `export_probe.ps1 -Stem Privacy_Policy_V1.8 -Out <absolute PDF path>`, then `verify_policy_documents.py --adopted`. These are QA intermediates, following the earlier release convention. No historical file was overwritten, moved or deleted.

The local, untracked archive README and CSV/XLSX registers were updated consistently. Artifact Tool authored the XLSX edit; a read-only comparison confirms only V1.7 status/note and a new V1.8 row changed, with existing cell styles, dates, filter/table and frozen header preserved. No formulas were introduced. Artifact Tool rendering exited unsuccessfully, so Excel opened the saved file read-only and exported the affected policy/version/date range for visual inspection, then closed without saving. Original register/README backups and this preview are retained in the same private QA folder.
