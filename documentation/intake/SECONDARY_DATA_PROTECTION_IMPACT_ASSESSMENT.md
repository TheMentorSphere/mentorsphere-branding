# Data protection impact assessment: Secondary Learner Profile

Version: 1.0

Assessment date: 25 September 2026

Controller and owner: Luke Turner, The MentorSphere

Status: current assessment prepared for owner review. The form is already live. This record does not assert that the assessment was completed before launch or replace the historical Primary DPIA.

## 1. Screening, purpose and scope

A focused DPIA is warranted because this processing combines children's information, education context and optional health/neurodiversity information, with possible impact on service suitability and learner autonomy. Small sole-trader volumes and human decisions do not remove those risks. Sensitive information influencing access to a service is also an ICO DPIA screening factor. There is no evidence of large-scale processing, behavioural advertising, profiling or automated clinical/eligibility decisions.

The purpose is to understand the learner and requested support, prepare an introductory conversation and personalise support if a relationship begins. It covers ordinary respondent/learner information, Years 7 to 11 or other education context, English/Maths/Science/Other subjects and optional corresponding exam boards, session preferences, optional needs/strategies/background/EHCP information, and consent/authority/receipt/retention metadata. No file upload, full medical record, payment detail or identity document is requested.

Children, adult respondents and people incidentally mentioned may be data subjects. The learner can differ from both respondent and prospective contracting person. Older learners may have a strong expectation of control over personal education and health information. Disability, neurodivergence, disrupted education or reliance on adults may heighten the impact of disclosure; do not assume incapacity from any of these.

## 2. Evidence and limits

Assessed source is baseline `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`: the Secondary page/client, Worker route and validator, receiver and 52-column schema. Public GET checks on 25 September confirm the live page/client and enabled configuration match that baseline. [The cross-form note](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md) records PR #52 and the separately preserved Secondary rollout evidence, plus the current private-backend verification limits.

`SECONDARY_OWNER_REVIEW.md`, `SECONDARY_QA_REPORT.md`, `RECEIPT_TIMEOUT_INVESTIGATION.md` and original Primary records were inspected as historical design/verification evidence. Their earlier disabled-state wording is preserved. Neither public GETs nor source inspection establish today's private ACLs, receiver revision, transfer settings or completed retention reviews. No real answer row was read for this assessment.

## 3. Data flow and processors

1. Answers are entered in browser memory. They are not intentionally put in URLs or localStorage/sessionStorage.
2. The same-origin Cloudflare Worker applies release, origin, content-type/body-size, honeypot, allowlist, schema, consent and authority validation. Turnstile verifies the challenge; learner answers are not sent as Turnstile verification fields.
3. The Worker signs an authenticated, time-limited transfer to the dedicated Google Apps Script receiver. No secret or endpoint is exposed in this record.
4. Apps Script independently validates the envelope and payload, locks duplicate lookup/storage, formats cells as text, escapes formula-leading values, writes and flushes, then verifies durable payload/formula state.
5. Verified duplicate IDs are not appended again; mismatched payloads are rejected. A new stored row prompts a fixed notification containing receipt time and a link to the private Sheet, with no submitted answers. Mail failure does not turn verified storage into failure.
6. Luke reviews suitability and follows up with the respondent/learner. He manages consent, correction, retention and deletion.

Cloudflare and Google Workspace provide processing infrastructure under the applicable service/processor terms. The design calls for restricted business-owned Sheets and least-privilege access. Account security, sharing, supplier terms, sub-processors and international-transfer safeguards must be checked by the owner; UK-only storage is not assumed.

The receipt contract checks actual stored or verified-duplicate results. A transport timeout can still leave a durable row while the browser cannot confirm success. Retrying with the same submission ID is protected against duplicate rows; a new identity can create another record and requires owner duplicate review. No automatic retry or automated safeguarding decision is introduced.

## 4. Lawfulness, proportionality and consent

The proposed framework uses 6(1)(b) for necessary respondent-own pre-contract information, 6(1)(f) for necessary ordinary learner/third-party data under [the Secondary LIA](SECONDARY_LEGITIMATE_INTERESTS_ASSESSMENT.md), and 6(1)(a) for optional personalisation context. Optional health/disability/SEND/neurodiversity information uses 6(1)(a) plus 9(2)(a). Each applies to actual content and purpose; a required software field is not proof of necessity. The cross-form note sets out the owner adoption and existing-record review boundary.

The respondent can choose No to sensitive information and still submit. Choosing Yes requires a permitted Parent or Guardian or carer relationship, explicit consent, separate parental responsibility/documented legal authority confirmation and learner consent route before sensitive fields appear. Removing a prerequisite or changing to an ineligible relationship clears the conditional information; Worker and receiver reject known sensitive fields without the valid route. Optional exam boards and Other details clear when no longer applicable.

The learner route distinguishes a learner who understands and authorises the adult to communicate consent from a learner currently unable to give informed consent for this use, whose authorised adult consents. It is not a capacity finding or identity check. Luke must confirm understanding, wishes and authority contextually, provide age-appropriate privacy information and pause disputed optional use. Professionals/other relatives do not gain sensitive-data authority by completing ordinary fields.

Minimisation controls include short choices, bounded text, no uploads, optional boards including unknown answers, and an alternative direct conversation. Exact date of birth plus year group is required in the deployed Secondary form. Its specific early-intake necessity needs owner confirmation: identification and age/stage context may justify it, but completed-years age can be less intrusive. This is recorded as a residual minimisation issue, not silently treated as established necessity or changed in this policy task.

## 5. Rights, withdrawal and retention

Use the cross-form procedures for child privacy information, correction, access, objection and explicit-consent withdrawal. A capable child's rights are their own. Withdrawal stops the affected optional processing and requires removal/redaction of both structured and narrative sensitive content, with only justified administrative evidence retained. Accidental sensitive information without valid consent is not used for personalisation and is promptly removed/redacted unless a separately documented safeguarding/legal purpose applies.

The receiver's last five columns initialise prospective status, last contact at receipt, review date six calendar months later, no hold and minimal notes. This is a review aid, not scheduled deletion. Luke must review at least monthly, update last meaningful contact, and normally delete unsuccessful prospective intake six months after that contact. Active-client records follow the applicable client-record arrangements. Tests, unnecessary records and duplicates are removed promptly; any safeguarding/legal hold is separate, reasoned and reviewed. Current operational execution is an owner confirmation item.

## 6. Diagnostics and security boundaries

PR #60 receipt diagnostics use request/reference ID, a fixed error code, stage and elapsed duration, plus a fixed event name. Existing pre-forward diagnostics contain safe status/time/validation indicators. The application is designed not to log answers, identities, contact details, raw Turnstile tokens, HMAC signatures, secrets, raw exception text or response bodies. This is not a promise about every supplier infrastructure log. Confirm log permissions and retention separately.

On an incident, restrict access, preserve minimal answer-free evidence and assess affected people, containment and notification duties under the business breach process. Do not paste answers into diagnostic tickets or ordinary email.

## 7. Risk assessment

Likelihood and severity use 1 to 5; score is their product. Scores 1 to 4 are low, 5 to 9 medium, 10 to 14 significant and 15 to 25 high. Residual estimates assume the stated controls actually operate. Unknown controls are action items, not deemed verified.

| Risk | Initial | Mitigation | Residual |
| --- | ---: | --- | ---: |
| Learner uninformed or adult overrides wishes | 3 x 4 = 12 | Learner route, appropriate privacy explanation, human authority/understanding check, pause disputed optional use | 2 x 4 = 8 |
| Unauthorised or unconsented sensitive information | 3 x 5 = 15 | Optional route; three controls; relationship limit; client clearing; independent server rejection; accidental-disclosure procedure | 2 x 4 = 8 |
| Excessive narrative or date-of-birth collection | 3 x 4 = 12 | Relevance/length limits, no uploads, optional boards, owner review of DOB necessity | 2 x 4 = 8 |
| Incorrect board or third-party account affects planning | 3 x 3 = 9 | Unknown/optional answers, review screen, no automated decision, correction and discussion | 1 x 3 = 3 |
| Unauthorised Sheet/account access | 3 x 5 = 15 | Restricted sharing, business account security, least privilege and access review | 2 x 4 = 8 |
| Forged submission or formula execution | 3 x 4 = 12 | Signed fresh envelope, validation, text formatting/escaping and formula readback | 1 x 4 = 4 |
| Duplicate retry or ambiguous receipt | 3 x 3 = 9 | Script lock and durable same-ID/payload verification, strict receipt, preserved client answers and human duplicate review | 1 x 3 = 3 |
| Answers leak through email or diagnostics | 3 x 5 = 15 | Fixed minimal mail; allowlisted diagnostics; no raw exception/payload logs | 1 x 4 = 4 |
| Withdrawal/retention not completed | 3 x 4 = 12 | Separate status/date fields, monthly due-record review, mixed-text redaction and confirmation | 2 x 3 = 6 |
| Supplier processing or international transfer not assessed | 3 x 4 = 12 | Applicable contracts, transfer/access review, minimisation; no unsupported location assurance | 2 x 4 = 8 |
| Function creep or use for automated eligibility | 3 x 4 = 12 | Purpose limits, human decisions, mandatory assessment before changed processing | 1 x 4 = 4 |

## 8. Consultation, outcome and owner actions

This review uses the owner brief, implementation and recorded QA; no new consultation with learners/families is claimed. Seek accessible feedback during early discussions and revisit the design if children do not understand the privacy explanation or experience pressure to disclose. Consider an external specialist view where authority or capacity cannot be resolved.

Proposed result: **no high residual risk identified with the assessed controls operating**. Medium risks remain around autonomy, excessive disclosure, private access, supplier processing and manual deletion. This is conditional, not unconditional production approval.

Luke must record: acceptance/revision of risk and lawful-basis conclusions; current Sheet/folder sharing and account security; deployed receiver/source match; operational retention and withdrawal arrangements; child transparency/authority/ISS applicability; supplier and log controls; and the date-of-birth necessity decision. Complete these verification actions before approving publication. If evidence shows an absent safeguard, reassess the affected live use promptly. Unmitigated high risk requires ICO consultation rather than owner acceptance alone.

## 9. Sources and review

The [cross-form source register](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md#7-authoritative-sources-checked-on-25-september-2026) records authoritative ICO/UK sources checked on 25 September 2026 and DUAA update caveats. This DPIA applies those sources to the Secondary implementation; it does not copy or replace the Primary assessment.

Review at least annually and on changes to fields, audience, use, recipients, consent, retention, technology or after an incident/objection. Owner decision and date: **pending**.
