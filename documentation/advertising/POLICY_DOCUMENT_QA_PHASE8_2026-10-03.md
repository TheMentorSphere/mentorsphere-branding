# Phase 8 policy document QA

Privacy V1.9 is adopted with effect from 3 October 2026, with publication pending. V1.8 remains live according to the owner's Phase 8 brief. See [document control](../../business-documents/policies/PRIVACY_V1.9_DOCUMENT_CONTROL.md).

## Generation and parity

The retained repository workflow was adapted from `C:/Users/luke9/AppData/Local/Temp/mentorsphere-policy-update-20261003` into `tmp/phase8`. `build_policy_documents.py "3 October 2026" --adopted` uses the approved website HTML and V1.8 DOCX template, reuses unchanged OOXML paragraphs and clones nearby formatting only for amended/new blocks. Only `word/document.xml`, `word/footer2.xml` and `docProps/core.xml` changed in the DOCX package.

`export_probe.ps1 -Stem Privacy_Policy_V1.9 -Out <absolute PDF path>` opened Word invisibly and the DOCX read-only, exported a tagged PDF with heading bookmarks and closed without saving. The DOCX hash remained unchanged. The skill's standalone renderer was attempted but unavailable because LibreOffice was absent. The established Word export plus pypdfium2 rendering workflow succeeded without installation.

`verify_policy_documents.py --adopted` confirmed exact policy-body text parity between website, DOCX and pypdf-extracted PDF, after the existing layout-only normalisation. The source-snapshot parity is also covered by the installed tests. There are **159 body blocks**, with **153 of 157 V1.8 blocks retained verbatim**, four approved replacements and two additions. All prior change-log entries remain in order. No other provisions changed.

The PDF has **10 pages**, tagged structure, **3 bookmarks** and **5 link destinations**. Every page was rendered and visually inspected individually. No clipping, overlap, missing glyphs or footer collisions were found. Section 13 spans pages 7 to 9. All pages carry version 1.9 and the correct page number; front matter carries 3 October 2026. The historical list and paragraph continuations across pages remain readable.

| Item | SHA-256 |
|---|---|
| Normalised policy body | `177a247a64809304c34e14634cbd5cb64acded00f00d8b20ebfad5ec3e0d63ec` |
| V1.9 DOCX | `70bf71e5069f9d8d2a49c4fd8aa18e5e5409ef48791460b88a75f32e16d93b98` |
| V1.9 PDF | `a37230106142793659ff7a4de2ebc5e41046a202f6d7c8a80bf8fca7f849e8fd` |

## Register and archive

Artifact Tool authored the XLSX changes. A read-only comparison checked all **16 rows by 15 columns** against the CSV. Only the existing status/note cells M13/O13 and M15/O15 changed, plus the new V1.9 row 16. Heights of those three affected rows were fitted for readable notes. Existing cell styles, freeze panes, table structure and unrelated values are preserved. The new effective date is a numeric Excel date formatted `dd/mm/yyyy`.

Artifact Tool's native renderer exited unsuccessfully on this host, as in the earlier archive workflow. Excel opened the saved workbook read-only and exported the policy/version/date and changed status/note ranges; all three previews were rendered and inspected. No changed text was clipped in the final previews. The workbook was closed without saving. The DOCX structural accessibility audit also returned zero high, medium or low findings. Intermediate builders, original backups, verification summaries and page renders are retained in ignored `tmp/phase8`; they are not publication assets.

The README and V1.8 document-control correction distinguish the owner's confirmation of live V1.8 from the obsolete publication-pending preparation record. V1.9's document control, parity manifest and both registers agree on adoption and pending publication. Historical controlled copies and snapshots remain unchanged.
