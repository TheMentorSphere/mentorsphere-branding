# Policy document QA, 25 September 2026

Status: completed for the prepared owner-review candidates. These files have not been approved, merged or published.

## Source fidelity and rendering

The retained Privacy V1.5 and ADHD V1.3 DOCX files listed in the pre-edit manifest were copied at package level. Unchanged policy paragraphs retain their original OOXML; added or amended blocks clone the source heading, body, list or closing-note patterns. Only the body, necessary external hyperlink relationships, footer version text and core metadata changed. Styles, numbering, geometry, headers, logo/media and all other package parts are byte-identical to their templates. Original source hashes remain unchanged.

Both sources and final files use one portrait US Letter section with one-inch margins, source-derived branding and real PAGE fields. Document-control areas show the requested version and 25 September 2026, plus a small "Prepared for owner review. Publication pending." status. ADHD retains its 27 July 2027 review date and historical pricing dates.

The documents skill `render_docx.py` was run against the reference and both final DOCX files. It failed with `FileNotFoundError: LibreOffice soffice.exe was not found on PATH`; the bundled Windows dependency runtime has no LibreOffice binary. No installed desktop LibreOffice was used. Microsoft Word 16.0 COM opened each source/final DOCX read-only, repaginated it, and exported PDF with document structure tags and heading bookmarks. The DOCX was not round-tripped through another format or saved by Word. pypdfium2 rendered every exported page to PNG for visual inspection.

All final pages were opened and inspected: Privacy pages 1 to 8 and ADHD pages 1 to 6. No clipped or overlapping text, missing glyphs, broken list formatting, orphan headings or footer collisions were found. Page numbers are sequential and correct. Branding, title/control layout, hierarchy, generous margins and closing-note treatment remain recognisably source-derived. New content increases length without shrinking the text. PDF text is selectable and links are present.

## Text parity method

The website comparison scope is the policy body in `div.narrow.prose`, excluding the presentation header and duplicated document-control data. DOCX comparison extracts policy wording after the dedicated front matter. PDF extraction removes repeating archive headers, policy/version/page footers and front matter. Unicode ligatures, whitespace, list bullets and line wrapping after an existing hyphen are normalised. Punctuation and substantive words are otherwise retained. All three full policy-body strings must be exactly equal. Metadata, version, effective date, change-log history, header/footer content and pending-review status are separately checked.

| Policy | Website / DOCX / PDF parity | PDF pages | Body blocks | Retained blocks | Normalised policy SHA-256 |
|---|---|---:|---:|---:|---|
| Privacy Policy V1.6 | PASS, exact full-body equality | 8 | 120 | 67 | `daf433d84c5e4d9e30b39c37fda5de5ba9426ec8ca433a88c5fdea69a3b8bb59` |
| ADHD Coaching Policy V1.4 | PASS, exact full-body equality | 6 | 91 | 84 | `5244bb57e09f741b0ca49912ca9ce0561a55447ddb8cc13c679639d6d8031614` |

## Final file checksums

### Privacy Policy V1.6

- HTML SHA-256: `38f7c890664a9587f46f1e2a7bcdb444499b3b8432e8c19fc5e73aab25a5ddf6`.
- DOCX SHA-256: `4fe718bd223b4d440f7a9a2bb9005193d19752486ead06783804a42eeebb9a98`.
- PDF SHA-256: `3cf7a3d2fd68cf31c2a27e90c1102d754ef0c29eb2ce6c4f13ea17c06864fe82`.

### ADHD Coaching Policy V1.4

- HTML SHA-256: `c2d25af6ac7840b0844bd135e8cffa6238201dacdb24a0af5094c3312eac886a`.
- DOCX SHA-256: `b0da57a0091ba5a4cb08ccb16f48d110e850109b0a515df8de7b5c185e6b7a24`.
- PDF SHA-256: `e2e2d8e65db1ab1c7fc22d8309c5994565e286a6d01d1584881f7439d1a9fa37`.

## Files and preservation

New editable/PDF files and candidate source snapshots are under `business-documents/policies/current/{docx,pdf}` and `business-documents/policies/source-snapshots`. Original V1.5 Privacy DOCX/PDF and V1.3 ADHD DOCX/PDF are unchanged, as are the original V1.4 Privacy copies, old source snapshots and historic task worktrees. The manifest records exact locations and initial hashes.

The task-local renderer logs, all reference/final PNGs, template contract, package inventories, export evidence and comparison helpers are retained outside Git at `C:/Users/luke9/AppData/Local/Temp/mentorsphere-policy-update-20260925`. They are QA intermediates, not policy publication assets. Local mirror copying and register/README status updates are recorded separately after verification.

The explicit pending-review control line is a layout/document-control addition, not a difference in the substantive policy wording. Public production policy versions remain unchanged until owner review and separately authorised publication.


## Verified local mirrors outside the review worktree

The six new versioned files below were copied into the original checkout's established local archive. Each is byte-identical to the reviewed worktree asset. No old policy asset was overwritten or moved. The original checkout's website files were not changed. The owner-review status remains explicit; ADHD V1.3 is still the current published version.

| Absolute local path | SHA-256 |
|---|---|
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/current/docx/Privacy_Policy_V1.6.docx` | `4fe718bd223b4d440f7a9a2bb9005193d19752486ead06783804a42eeebb9a98` |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/current/docx/ADHD_Coaching_Policy_V1.4.docx` | `b0da57a0091ba5a4cb08ccb16f48d110e850109b0a515df8de7b5c185e6b7a24` |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/current/pdf/Privacy_Policy_V1.6.pdf` | `3cf7a3d2fd68cf31c2a27e90c1102d754ef0c29eb2ce6c4f13ea17c06864fe82` |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/current/pdf/ADHD_Coaching_Policy_V1.4.pdf` | `e2e2d8e65db1ab1c7fc22d8309c5994565e286a6d01d1584881f7439d1a9fa37` |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/source-snapshots/Privacy_Policy_V1.6.md` | `c16073d7ab7710d409c786d978a73d2795a2115b5f9c423ae0445e286c7f12ef` |
| `C:/Users/luke9/Documents/GitHub/mentorsphere-branding/business-documents/policies/source-snapshots/ADHD_Coaching_Policy_V1.4.md` | `d458113d8946404d53d144dfb9358d0d371937c2bdfaac8b1705c4c9977a8c9e` |
