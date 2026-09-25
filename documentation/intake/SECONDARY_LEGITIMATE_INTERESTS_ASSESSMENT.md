# Legitimate interests assessment: Secondary Learner Profile

Version: 1.0

Assessment date: 25 September 2026

Controller and owner: Luke Turner, The MentorSphere

Status: completed assessment proposed for owner adoption. Residual-risk acceptance and operational confirmations are pending. This is a review of an already-live form, not evidence that this assessment preceded launch.

## 1. Scope and basis boundaries

This assessment applies to **necessary ordinary information about the learner or another third party** used to understand a request, assess service suitability, prepare an introductory discussion and plan requested personalised learning/support. The interest belongs to The MentorSphere and the person seeking appropriate support. It is not a general entitlement to collect everything a respondent knows.

Article 6(1)(b) applies separately to the respondent's own necessary pre-contract information when steps are requested by that person. Optional personalisation context beyond necessary steps uses Article 6(1)(a) under the proposed current framework; optional health, disability, SEND and neurodiversity information additionally needs Article 9(2)(a). This LIA does not authorise sensitive processing or treat the parent's contract as the child's lawful basis. See [the cross-form decision note](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md) for the prospective adoption boundary and treatment of existing records.

Source: current Secondary HTML/client, `src/intake/secondary-validation.ts`, `src/intake/secondary.ts`, the 52-column schema and generated Apps Script at baseline `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`; public GET verification on 25 September 2026. [The DPIA](SECONDARY_DATA_PROTECTION_IMPACT_ASSESSMENT.md) records the limits of backend and operational evidence.

## 2. Purpose test

The defined interest is an informed, proportionate response to an adult's deliberate request for education support. Limited learner identity, stage, requested subjects, known boards and practical preferences help Luke distinguish the learner, understand the request, avoid assumptions about curriculum and assess whether he can provide the requested support. The learner benefits from fewer repeated explanations and an introductory conversation grounded in their actual learning context.

The interest is legitimate and consistent with the form's purpose. It excludes marketing, diagnosis, statutory education decisions, legal representation, unrelated profiling and automatic eligibility decisions. An enquiry about wider MentorSphere support is a service preference, not marketing permission.

## 3. Necessity test

| Ordinary information | Assessment of need and alternatives |
| --- | --- |
| Learner name | Distinguishes the person for whom support is requested and avoids confusing siblings or simultaneous enquiries. A name-only enquiry remains possible through direct contact. Do not request identity documents. |
| Date of birth and year/stage | The deployed form requires both. Date of birth can disambiguate learners and clarify age where education stage differs from chronological age, but age in years plus stage is a less intrusive alternative. Exact date is not needed merely to discuss a subject. Continued early collection is a minimisation issue for owner review; use it only for identification/age-appropriate planning, never routine scoring. |
| Subjects and subject-specific exam boards | Necessary when the respondent requests preparation for a particular subject/specification. Boards are optional, subject-dependent and allow unknown/not-applicable answers; do not infer a board or demand details for an introductory conversation. Unselecting a subject clears its board. |
| Ordinary education context | Helps explain a non-standard school year or education setting. Keep brief and relevant. This does not justify health information in an ordinary text field. |
| Session length/frequency and communication preferences concerning the learner | Useful for the specifically requested practical planning; use only to that extent. More extensive optional preferences for personalisation are consent-based, not automatically covered by this LIA. |
| Incidental ordinary information about family/professionals | Only keep a minimum where directly needed to understand the request or authority. Role descriptions are preferable to names. Remove unrelated details; a free-text box does not establish necessity. |

A short direct discussion can achieve a smaller initial enquiry and remains available. The form is a structured alternative, not a compulsory condition for discussing support. The necessity conclusion is limited to relevant entries and actual requested planning; optional boards and narrative must remain optional. Exact date-of-birth necessity must be confirmed by the owner or referred to a separately approved form-minimisation task. This task changes no fields.

## 4. Balancing test

### Expectations and children's interests

The respondent expects an education-focused follow-up, not wider sharing. The learner may be unaware of the submission or disagree with the adult's view. Secondary learners may be capable of understanding and exercising their own privacy rights. Their interests receive particular weight regardless of diagnosis, attainment or whether a parent is paying.

Educational information can cause embarrassment, conflict, distress or loss of trust even when it is not special-category data. An adult's inaccurate account could influence support planning. A sole-trader service has a limited audience and use, but dependence on support and family power differences can make it difficult to object.

### Safeguards and limits

- Tell the learner in age-appropriate language what is held, where it came from, its use and their rights. Follow the active-information procedure in the cross-form note rather than assuming the public link was read.
- Consider the learner's wishes and understanding in the introductory discussion. Pause disputed optional use; do not treat parental responsibility as permission to disregard a capable learner.
- General authority/privacy acknowledgement is distinct from sensitive consent. Only Parent or Guardian or carer can enter the sensitive route after explicit consent, separate authority confirmation and learner consent route.
- Reject irrelevant conditional fields server-side; keep narrative short, review actual content and promptly remove accidental unconsented sensitive details.
- Use human review, correction and direct discussion. The form does not assess grades, diagnose, make safeguarding decisions or decide eligibility automatically.
- Keep answers in restricted Google Workspace storage, use authenticated transfer, store formula-like values as text, verify durable duplicates and keep notifications answer-free.
- Use answer-free operational diagnostics and the manual six-month prospective-record review process. Access and retention operation require the confirmations below.

### Balance reached

| Risk | Residual assessment with safeguards |
| --- | --- |
| Learner's account/wishes overlooked | Medium: requires active involvement and contextual review, particularly for capable secondary-age learners. |
| Excessive detail or exact date of birth collected too early | Medium: owner must record necessity and pursue minimisation separately if it cannot be shown. |
| Incorrect subject/board or education assumptions | Low: optional boards, review screen and human clarification. |
| Disclosure, family conflict or unneeded third-party detail | Medium: restricted access, minimisation and careful handling of mixed-person narratives. |
| Retention beyond need or ignored objection | Medium until owner confirms actual review and rights-handling practice; low with that practice operating. |

The limited ordinary-data purpose can pass the balancing test where these safeguards operate. A serious conflict with a learner's rights, unnecessary detail, inappropriate authority or failed access safeguards can override the business interest in an individual case. This is not a blanket approval of all received data.

## 5. Right to object

Bring the right to object to the individual's attention separately and clearly. Accept a child's own request or a properly authorised representative's request, whether verbal or written. Record only the minimum needed to identify the concern; verify identity/authority proportionately.

On objection, stop the disputed use unless compelling legitimate grounds overriding that person's interests, rights and freedoms can be demonstrated, or the processing is needed for legal claims. Repeating this LIA's general interest is insufficient. Restrict use while resolving the objection where appropriate, consider erasure/correction, and provide the decision and available complaint rights within the applicable response period, normally one month. Optional sensitive consent withdrawal is a separate right and does not require a reason. Ordinary intake should generally be discontinued or reduced when a learner objects rather than insisting on a planning preference.

## 6. Decision, actions and review

Proposed outcome: **Article 6(1)(f) is supportable for necessary, proportionate ordinary learner/third-party information only**, subject to the child-specific balance and individual objections. There is no identified high residual risk on the documented safeguards; this does not certify currently unverified private settings.

Owner actions: confirm the reason for requiring date of birth at intake; confirm restricted Sheet/folder access and current receiver revision; operate monthly due-record reviews; record child transparency/authority practice; adopt or revise this conclusion. No owner approval is recorded here.

Review annually or sooner for a complaint, authority dispute, breach, new recipient, purpose, data class, retention period or automated decision. The proposed policy update does not amend the historic Primary LIA.

## 7. Sources and sign-off

The ICO three-part test, current children's lawful-basis/rights guidance, contract guidance, right to object and storage limitation sources were checked on 25 September 2026 and are linked with current-law caveats in [the source register](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md#7-authoritative-sources-checked-on-25-september-2026).

Owner decision: **pending**. Decision date: **pending**. Evidence of operational actions: **pending**.
