# Data protection impact assessment: ADHD Coaching Intake

Version: 1.0

Assessment date: 25 September 2026

Controller and owner: Luke Turner, The MentorSphere

Status: completed current assessment proposed for owner review/adoption. The intake is already live. No pre-launch completion, owner sign-off, merge or deployment is asserted or authorised by this record.

## 1. Why this assessment is needed

The intake can combine health/neurodiversity information, children's information, parent wellbeing and household context. The effect of unwanted disclosure or an inaccurate adult account can be substantial even at sole-trader scale. Information may inform human consideration of service suitability, which is relevant to ICO DPIA screening. A focused DPIA is therefore appropriate; absence of automated diagnosis does not remove sensitive-data and autonomy risks.

The intake is optional before or early in support. It helps Luke understand the request, priorities, context and possible adjustments. It is not required merely to request a discovery/introduction call, and it is not clinical assessment, diagnosis, therapy or crisis triage. A diagnosis is not inferred from choosing a route.

## 2. Evidence and current-state limits

The assessment uses baseline `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`: `docs/forms/adhd-coaching-intake/index.html`, its client, `src/intake/adhd-validation.ts`, `src/intake/adhd.ts`, shared transport/diagnostics, generated Apps Script and 54-column schema. [The implementation audit](INTAKE_IMPLEMENTATION_AUDIT_2026-09-25.md) records read-only production GET checks: all forms are enabled and public clients match the baseline. The current brief confirms production use.

Historical evidence inspected includes `ADHD_OWNER_REVIEW.md`, `ADHD_QA_REPORT.md`, `RECEIPT_TIMEOUT_INVESTIGATION.md`, original Primary governance and PR #53 integration evidence. Older disabled/preview statements remain correct historical descriptions. They were not rewritten to manufacture a launch history. Current private ACLs, deployed Script source, supplier account settings and actual deletion operation were not independently inspected. A complete final ADHD launch close-out was not found in the clean repository. No production answer row or new submission was used in this assessment.

## 3. Route-by-route data and purpose assessment

All four routes request the respondent's first name, surname, email, preferred contact method, conditional contact number and support route. Telephone is required only for selected telephone/text/WhatsApp contact. The routes share final ordinary-authority/privacy acknowledgement and Turnstile, which are not sensitive-data consent.

| Exact deployed route label | Additional information requested | Necessity and principal privacy issue |
| --- | --- | --- |
| Myself: adult coaching (18 or over) | Optional ADHD status, including diagnosed or self-identified/suspected, current difficulties, coaching priority and conditional Other details | Minimum contact/request enables a response. Health/status and wider personalisation are optional; do not claim they are all necessary for a call. |
| My child/teen: coaching (ages 10 to 17) | Child name, completed-years age and education stage; optional known/suspected neurodivergence and current difficulties | Ordinary name/age/stage helps identify and plan the requested direct support. Health-revealing context concerns a separate person with their own consent/rights. |
| Myself as a parent/carer | Optional household context, daily impact, helpful support priorities and Other details | Questions concern the respondent's experience. No child's name, age or diagnosis is requested. Broad family structure may be ordinary; distress and narrative may reveal health information. Parent consent does not cover others' diagnoses. |
| Child/teen (ages 10 to 17) plus parent/carer support | Both child and parent sets, with separate consents | Assess two subjects separately. Parent preference does not override a capable child's wishes. Mixed narrative may need selective or complete redaction on either withdrawal. |

Each route offers optional Additional Information, maximum 5,000 characters. Other sensitive detail fields are bounded, generally at 1,000 characters. The open narrative can contain more people or sensitive categories than intended; prompts and validation cannot reliably identify all such content. No uploads or full clinical reports are requested.

## 4. Lawful basis by data class

The proposed framework in [the cross-form decision note](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md) applies as follows:

- **Necessary respondent-own ordinary information:** Article 6(1)(b), when needed for the pre-contract steps that person requested. Adult and parent routes do not automatically require Article 6(1)(f).
- **Necessary ordinary child or third-party data:** Article 6(1)(f), subject to [the separate LIA](ADHD_CHILD_THIRD_PARTY_LEGITIMATE_INTERESTS_ASSESSMENT.md). The parent's prospective contract alone does not cover the child.
- **Optional ordinary context solely for additional personalisation:** Article 6(1)(a), where voluntary completion and clear optional-purpose notices demonstrate valid consent. A sensitive checkbox gate or general acknowledgement alone is not that evidence.
- **Optional sensitive information about adult or child:** Article 6(1)(a) and Article 9(2)(a). Health/neurodiversity status, relevant difficulties and narratives are handled through subject-specific explicit consent. Ordinary household categories are not automatically health data just because they share a gate.
- **Minimum compliance records and technical diagnostics:** separate accountability/security purposes as assessed in the cross-form note. They must not become a parallel answer store.

This basis selection is by purpose and actual content, not merely route or field. Keep only a minimum of ordinary third-party context where necessary; remove unrelated detail. For health information about a person outside the permitted route, parent-own or adult-own consent is insufficient. The current wording identifies purpose, controller and withdrawal, with affirmative unbundled controls. The clarified Article 6/9 pairing needs owner adoption and appropriate privacy information. Existing records need review against the notices/authority actually evidenced; do not retroactively switch their recorded basis or backfill consent.

## 5. Consent gating, clearing and young people's involvement

Adult and parent optional blocks use the respondent's own-information consent. Child sensitive fields require explicit consent, parental responsibility/documented legal authority confirmation and one learner consent route. Combined intake keeps adult and child consent separate. Additional Information is available only with the route-relevant consent(s); combined requires both sets because the text may concern both people.

Removing consent hides and clears affected fields. Removing child authority or the learner route clears the child sensitive block. Route changes clear irrelevant answers and Additional Information because its permitted subject changes. Consent that remains relevant may persist; route switching is not described as universally clearing every consent. The server and receiver independently reject known sensitive/out-of-route fields where prerequisites fail. They do not use keyword scanning to determine legal sensitivity of ordinary free text.

For child/combined direct coaching, browser, Worker and receiver enforce completed-years age 10 to 17. Under-10 respondents can switch to independent parent support; 18+ can switch to adult coaching. Contact details can remain while irrelevant child/sensitive details clear. Parent-only support is not restricted by the child's age. This is a service boundary, not an automated judgement of legal capacity, diagnosis or wider suitability.

The learner route records either informed learner authorisation communicated through the adult or consent from an authorised adult where the young person cannot currently understand and consent. Luke must consider understanding, wishes, privacy and the adult's authority in context; a declaration is not conclusive verification. Give age-appropriate information and pause disputed optional use. Confirm the applicable ISS/children's-code and under-13 consent rules as described in the cross-form note, without equating age 10, 13 or 17 with general capacity.

## 6. Architecture, processors and security

The browser submits through the Cloudflare-hosted site to its Worker. Validation includes permitted origin/content type, size, form version, conditional fields, honeypot and Turnstile. The authenticated, time-limited Worker-to-Apps Script transfer keeps secrets outside public assets. The receiver revalidates the message, locks duplicate lookup/write, stores one text-formatted row, flushes and reads back payload/formula state, then returns a verified stored/duplicate receipt.

Formula-leading inputs are safely escaped. Exact same-ID duplicates do not append or resend notifications; conflicting reused IDs fail verification. The fixed notification contains only receipt time and a restricted Sheet link, no submitted answers, names or contact details. A mail error does not discard a stored result. A receipt timeout can still leave stored data whose arrival is unconfirmed to the browser; human review is needed for suspected duplicates, especially if a new submission ID is generated.

The controller is The MentorSphere; Google Workspace and Cloudflare supply infrastructure under the applicable contracts. Production Sheets should be restricted to the owner and specifically authorised people with a need. This assessment does not claim current private sharing was freshly verified or all data stays in the UK. Confirm account security, access, processor terms, transfer safeguards and any data-region limits.

The intake does not intentionally put answers in URLs, localStorage/sessionStorage or application diagnostic logs. PR #60 introduced receipt events with fixed event name, request/reference ID, failure code, stage and elapsed duration. Pre-forward events can additionally record safe timestamp/status/validation indicators. Application logs are designed to exclude answers, names, contact information, tokens, signatures, credentials, raw exceptions and upstream response bodies. Supplier infrastructure logs are separate; review their access and retention without making an absolute no-log claim.

No automated diagnosis, clinical or safeguarding decision exists. Luke makes wider suitability and support decisions. The numeric age validation and anti-abuse checks are technical/service-boundary checks, not clinical judgement.

## 7. Retention, rights and accidental information

The 54-column schema keeps separate adult and child consent versions, UTC receipt consent timestamps, status and withdrawal dates. Receipt time is not the instant a checkbox was ticked. Administrative fields initialise prospective status, last meaningful contact at receipt, review date six calendar months later and no hold. No automatic expiry/deletion job is implemented by the assessed receiver.

Luke must operate monthly due-record reviews, update meaningful contact/review dates and normally delete prospective intake six months after the last meaningful contact when no service begins. Active-client material follows the applicable client-record arrangements; remove test/duplicate/unnecessary submissions promptly. Separate safeguarding/legal retention needs a documented basis, minimum information, hold reason and review.

On withdrawal, stop the relevant optional use and update the correct subject's consent record. Remove/redact structured and free-text content, including mixed combined-route Additional Information. If another subject's continuing consent cannot be separated reliably, remove the mixed text and invite a minimal replacement if necessary. Do not treat the adult's consent as preserving the child's information, or vice versa. Keep only justified administrative evidence and confirm action. Browser clearing does not remove information already submitted.

If sensitive information is provided without valid consent or about someone outside the authorised route, do not use it for personalisation; remove/redact as soon as reasonably possible. Offer the appropriate sharing route without repeating the sensitive content. Any safeguarding concern is handled separately with an identified lawful basis and Article 9 condition as needed, not by assuming this intake gives universal permission. A request to withdraw or object may come from a capable young person; it need not be made by the original adult respondent.

## 8. Risks and controls

Use likelihood and severity from 1 to 5, multiplied: 1 to 4 low, 5 to 9 medium, 10 to 14 significant, 15 to 25 high. Residual scores assume the documented safeguards operate. Current private-setting and operational uncertainties must be resolved rather than silently scored away.

| Risk and affected route | Initial | Safeguards | Residual |
| --- | ---: | --- | ---: |
| Optional health answers treated as mandatory or clinical evidence, all routes | 3 x 4 = 12 | Optional introduction/intake, no-consent ordinary path, non-clinical explanation and human review | 2 x 3 = 6 |
| Parent overrides a capable child's wishes, child/combined | 3 x 5 = 15 | Separate learner route, authority, age-appropriate explanation, contextual check and pause | 2 x 4 = 8 |
| Parent-own consent used for someone else's health detail, parent/combined | 3 x 5 = 15 | Own-experience warnings, no child identity in parent route, distinct child controls, review/redaction | 2 x 4 = 8 |
| Mixed-person or excessive 5,000-character narrative, all routes | 4 x 4 = 16 | Route-specific gating, relevance prompts, no uploads, length limit, content review/minimisation | 2 x 4 = 8 |
| Stale branch answers survive a route change | 3 x 4 = 12 | Irrelevant branch and Additional Information clearing; independent server/receiver validation | 1 x 4 = 4 |
| Service age boundary confused with capacity | 3 x 4 = 12 | Age-purpose explanation; individual understanding review; independent parent support | 1 x 4 = 4 |
| Invalid or ambiguous existing consent/notice evidence | 3 x 4 = 12 | Preserve versions; owner record review; clarify/refresh consent before disputed optional use | 2 x 4 = 8 |
| Sheet/account compromise or unauthorised sharing | 3 x 5 = 15 | Restricted access, account security, supplier review, minimum recipients | 2 x 4 = 8 |
| Forged rows or spreadsheet formula execution | 3 x 4 = 12 | HMAC/freshness, independent validation, text formatting, escaping and readback | 1 x 4 = 4 |
| Duplicate/ambiguous receipt or missed notification | 3 x 3 = 9 | Durable duplicate checks, fixed notifications, safe receipt handling and owner follow-up | 1 x 3 = 3 |
| Sensitive answers in logs or email | 3 x 5 = 15 | Fixed mail and diagnostic allowlists, no raw answer/body/exception logging | 1 x 4 = 4 |
| Partial withdrawal or over-retention in combined record | 3 x 4 = 12 | Separate subject status/dates, mixed-text redaction, monthly manual review | 2 x 4 = 8 |
| Unassessed international processing/supplier change | 3 x 4 = 12 | Applicable contracts/transfer review; minimise; no unsupported location assurances | 2 x 4 = 8 |

## 9. Consultation, decision and owner actions

This assessment draws on the owner's brief, live client and prior fictional QA/integration evidence. No consultation with clients or children during this documentation task is claimed. Invite accessible feedback in introductory discussions, especially on route clarity, pressure to disclose and whether young people understand privacy choices. Review combined-text design if withdrawals or feedback show that separation is difficult.

Proposed result: **no high residual risk identified with the assessed controls operating**. Medium residual risks concern child autonomy, parent/third-party disclosure, mixed free text, existing-consent evidence, private access, supplier arrangements and manual withdrawal/retention. Owner acceptance and verification are pending.

Required owner evidence before policy publication approval: adopt the lawful-basis split and existing-record approach; check all relevant Sheet/folder sharing and account security; confirm deployed receiver/source and 54-column match; confirm actual monthly retention and subject-specific withdrawal process; verify child privacy/authority/ISS arrangements and supplier/diagnostic controls. Record only non-sensitive evidence in the repository. If a safeguard is missing, reassess affected live use promptly. A high residual risk that cannot be reduced needs ICO consultation; it cannot be accepted away.

## 10. Sources, review and sign-off

The [cross-form source register](CROSS_FORM_DATA_PROTECTION_DECISION_NOTE.md#7-authoritative-sources-checked-on-25-september-2026) records authoritative ICO/UK sources checked on 25 September 2026 and current DUAA caveats. The [child/third-party LIA](ADHD_CHILD_THIRD_PARTY_LEGITIMATE_INTERESTS_ASSESSMENT.md) contains purpose, necessity, balancing and objection analysis for the limited Article 6(1)(f) use.

Review annually and whenever routes, consent, fields, ages/audiences, decisions, recipients, retention, suppliers or purposes change, or following an incident/objection. Owner decision/date and action evidence: **pending**.
