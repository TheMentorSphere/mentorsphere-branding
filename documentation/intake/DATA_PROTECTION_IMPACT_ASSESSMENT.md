# Data protection impact assessment: primary learner profile

Version: 1.0

Assessment date: 31 July 2026

Controller and owner: Luke Turner, The MentorSphere

Status: completed for owner residual-risk sign-off. No unmitigated high risk has been identified. Processing must not begin until the recorded safeguards, integration tests and policy publication are complete.

## 1. Why a DPIA is required

The form concerns children and other potentially vulnerable learners and may collect health-related special-category information. A parent or another adult may submit information about the learner. Although the expected volume is small and there is no profiling or automated decision-making, the nature and context create a risk of significant privacy, emotional and autonomy impacts if information is excessive, inaccurate, disclosed or used without valid authority.

The DPIA was started before production processing and follows the ICO sequence of describing the processing, assessing necessity and proportionality, identifying risks, selecting safeguards and recording residual risk.

## 2. Nature, scope, context and purposes

### Nature

The direct, unlisted website form collects:

- respondent identity, contact details, relationship and communication preferences;
- learner identity, date of birth, education stage and subjects;
- ordinary educational background, strategies and session preferences;
- optional structured needs, diagnosis, neurodiversity and EHCP information where the special-category route is chosen;
- general authority, privacy acknowledgement, conditional explicit consent and conditional authority confirmation; and
- operational metadata including submission ID, processing timestamps, notification status and retention controls.

The form does not request identity documents, full medical records, financial information, passwords, biometric data, location tracking or recordings. It does not conduct profiling, behavioural advertising, automated eligibility decisions or automated safeguarding decisions.

### Scope

- Data subjects: primary-age learners, respondents and potentially family members or professionals mentioned in relevant text.
- Vulnerability: learners are children and may also be disabled, neurodivergent, anxious or otherwise vulnerable.
- Volume: low-volume sole-trader intake, one row per submitted learner profile, with no bulk import.
- Geography: predominantly online support across the UK. Cloud service processing may involve international processing under supplier contractual safeguards.
- Duration: prospective intake data is reviewed against the approved six-month rule. Active-client, safeguarding and legal records follow their separately applicable arrangements.

### Context

The respondent deliberately opens an unlisted form after contact or direction from Luke. The learner may not be the respondent. The power and understanding difference between an adult respondent and a child makes transparency, authority and data minimisation especially important.

### Purposes

- respond to a request for education support;
- assess whether the requested support falls within service scope;
- prepare a proportionate introductory discussion;
- plan and personalise support if a relationship begins;
- communicate using the chosen method;
- maintain a minimal audit record of privacy, consent, authority, notification and retention actions; and
- meet safeguarding or legal obligations where a separate issue arises.

No data is collected for unrelated marketing or sold.

## 3. Data flow

1. The respondent enters information in the browser. Answers remain in page memory and are not written to URLs, cookies, local storage or session storage.
2. The browser obtains a Turnstile token and sends the JSON request to the same-origin Cloudflare Worker.
3. The Worker applies page and submission flags, origin and content-type checks, a body-size limit, honeypot handling, field allowlists and conditional consent and authority validation.
4. The Worker sends the Turnstile token, submission ID and connection information needed for verification to Cloudflare Turnstile. Learner answers are not included in the Turnstile verification request.
5. After validation, the Worker signs a short-lived request with HMAC and forwards it to Google Apps Script.
6. Apps Script independently checks the HMAC, timestamp, form shape, special-category relationship rule and duplicate submission ID.
7. Apps Script writes one text-formatted row to an owner-only Google Sheet.
8. Apps Script sends a minimal notification to the monitored business inbox. It contains a receipt timestamp and restricted Sheet link, but no respondent or learner answers.
9. Luke reviews the private row, updates record and retention status, and removes records when no longer required.

On a Worker, Turnstile or Apps Script failure, the page displays a generic retry message and does not clear the answers. No answer values are intentionally logged.

## 4. Roles, processors and access

The MentorSphere is the controller. Luke Turner is the business owner and only planned production Sheet user at launch.

Cloudflare provides website delivery, Worker execution, Turnstile and network protection. Its customer DPA describes Cloudflare as processor or sub-processor for customer personal data, includes security and sub-processing commitments, and provides mechanisms for restricted UK transfers. The architecture minimises Cloudflare content handling by disabling answer logs and forwarding only after validation.

Google provides Workspace, Sheets, Apps Script, Gmail notification delivery and related infrastructure. Google Workspace processing is governed by the applicable agreement and Cloud Data Processing Addendum. Google states that data-region controls depend on the Workspace edition and the covered service and data. This assessment therefore does not assume that every Sheet or Apps Script data element remains in the UK. Supplier transfer terms, account configuration and sub-processors must remain under review.

Production Drive sharing is owner-only. Link sharing is disabled. No third party receives learner answers through the notification.

## 5. Lawful basis, consent and authority

### Article 6

- Article 6(1)(b) applies to the respondent's own information where processing is necessary to take steps requested by that person before a possible contract.
- Article 6(1)(f) applies to proportionate ordinary learner and third-party information needed for suitability and support planning, subject to the separate child-specific legitimate interests assessment.

### Article 9

Article 9(2)(a), explicit consent, applies to optional health, disability, SEND and neurodiversity information.

The form has a required Yes or No choice before the structured special-category fields. Choosing No leaves those fields hidden and cleared, does not require consent and still permits submission. Choosing Yes reveals separate, unticked explicit-consent and authority controls.

At initial launch, the special-category route is available only where the relationship is Parent or Guardian or carer and the respondent confirms parental responsibility or documented legal authority. Education or support professionals, other family members and Other respondents are told not to provide health, disability, SEND, neurodiversity, diagnosis or EHCP information and are directed to a separate documented-authority workflow. The Worker and Apps Script reject attempts to bypass this rule.

Consent is recorded with respondent details, received date, exact wording version, authority wording version and status.

## 6. Consent withdrawal

Withdrawal requests are sent to luke@thementorsphere.co.uk.

Luke must:

1. identify the relevant record and verify the requester's identity and authority proportionately;
2. record the withdrawal date and change consent status to Withdrawn;
3. stop using the special-category information;
4. remove or irreversibly redact structured special-category cells and special-category content within free-text cells unless another Article 9 condition applies to a separate purpose already disclosed to the individual;
5. retain ordinary information only where its separate Article 6 basis and retention arrangements continue to apply;
6. retain only a minimal withdrawal record where needed to honour the request;
7. confirm completion to the requester; and
8. explain that withdrawal does not affect processing that occurred lawfully before withdrawal and may limit personalisation that depended on the removed information.

Withdrawal does not automatically end ordinary support and carries no penalty.

## 7. Necessity, proportionality and minimisation

- Fixed choices are used where possible to reduce open-ended collection.
- Special-category collection is optional and segregated.
- The restricted relationship rule prevents routine third-party special-category submission.
- Free-text fields are optional, length-limited and accompanied by relevance warnings.
- The form requests no evidence, reports or documents.
- A direct-contact and alternative-format route remains available.
- Suitability is reviewed by a person and is not determined automatically.
- The information is not reused for marketing or unrelated profiling.
- One integrated profile avoids repeated collection across tutoring, coaching and education support where support needs legitimately evolve.

The ordinary information and optional special-category route are proportionate to an informed support-planning discussion. The processing would become disproportionate if the fields, recipients, decisions or purposes expanded without reassessment.

## 8. Retention and deletion

- Where no service relationship begins, intake responses are normally deleted six months after the last meaningful contact.
- Where a service relationship begins, intake information may become part of the active learner record and follows applicable client-record arrangements.
- Test, duplicate and unnecessary submissions are removed as soon as reasonably possible.
- Safeguarding information may be retained separately where required under the Safeguarding Policy or relevant legal obligations.
- Each row has record status, last meaningful contact date, review date, safeguarding or legal hold and minimal retention notes.
- A saved monthly filter identifies prospective records due for review and not on hold.
- Consent status and withdrawal date support removal and redaction after withdrawal.

## 9. Security and breach considerations

Security measures include:

- separate page and submission release flags that fail closed;
- Turnstile, honeypot, same-origin, content-type and body-size checks;
- strict server-side allowlists and conditional validation;
- HMAC authentication, short timestamp window and constant-time comparison;
- independent Apps Script shape validation;
- duplicate submission locking;
- formula-injection protection and text-formatted Sheet cells;
- owner-only Drive sharing;
- answer-free notifications;
- no sensitive browser storage, analytics, URL parameters or intentional answer logging;
- generic client and API errors;
- secret rotation and non-repository secret storage; and
- fictional-only testing followed by immediate cleanup.

If a suspected breach occurs, Luke must contain access, preserve minimal evidence, assess affected data and individuals, follow the business breach procedure and determine whether notification to the ICO or affected individuals is required. Answers must not be copied into diagnostic tickets or ordinary email.

## 10. Consultation

The design incorporates the owner's requirements, the live form source, the approved privacy wording, the child-specific LIA and current ICO guidance. Direct consultation with children was not undertaken before this limited sole-trader launch because the form is completed by an authorised adult and the processing is small in scale. This decision must be reviewed if the form is offered directly to children, the audience expands or feedback indicates that the privacy explanation is not understood.

The form provides age-appropriate-information duties through the authority confirmation and Privacy Policy. Luke must make reasonable adjustments or provide an alternative format when requested.

## 11. Risk method

Likelihood and severity are each scored from 1 to 5. The risk score is likelihood multiplied by severity:

- 1 to 4: low;
- 5 to 9: medium;
- 10 to 14: significant; and
- 15 to 25: high.

Any residual high risk requires consultation with the ICO before processing starts.

## 12. Risk register

| Risk | Initial score | Measures | Residual score |
| --- | ---: | --- | ---: |
| Child is unaware of or does not understand the processing | 12, significant | Adult authority confirmation, age-appropriate privacy sharing, plain language, learner involvement where appropriate | 8, medium |
| Special-category information submitted without valid explicit consent | 15, high | Optional Yes or No route, separate unticked consent, wording and timestamp record, Worker and Apps Script checks | 6, medium |
| Professional or other third party submits special-category information without authority | 15, high | Restricted relationships, hidden and cleared structured fields, clear separate-route wording, independent server rejection | 6, medium |
| Excessive special-category detail entered in free text | 12, significant | Optional fields, explicit relevance warnings, no document upload, length limits, contextual owner review and deletion | 8, medium |
| Inaccurate third-party information affects suitability or planning | 9, medium | No automated decisions, introductory discussion, correction rights and contextual review | 4, low |
| Unauthorised access to the Sheet | 15, high | Owner-only sharing, business account, restricted folder, account security, HMAC and access review | 6, medium |
| Secret or endpoint compromise permits forged rows | 15, high | High-entropy HMAC, rotation, short freshness window, duplicate protection, no secret in repository | 4, low |
| Formula-like input executes in the spreadsheet | 12, significant | Text number format and prefix protection for formula-leading characters | 2, low |
| Duplicate retry creates multiple learner records or emails | 9, medium | Stable submission ID, Script Lock and duplicate lookup before append | 2, low |
| Notification discloses answers | 12, significant | Fixed minimal template with no submitted fields, tested against monitored inbox | 2, low |
| Submission failure causes loss or misleading success | 9, medium | Fail-closed upstream result, generic retry response and browser answer preservation | 3, low |
| Answers appear in browser, Worker or diagnostic logs | 15, high | No console logging, no browser storage, invocation logging disabled, no answer values in application errors | 4, low |
| Data retained longer than necessary | 12, significant | Automatic review date, monthly filter, record status, hold flag and documented deletion process | 4, low |
| Consent withdrawal is not actioned completely | 12, significant | Consent status and withdrawal date, documented cell removal and redaction procedure, minimal completion record | 6, medium |
| Supplier or international-transfer risk | 12, significant | Google and Cloudflare DPAs, contractual transfer mechanisms, minimisation, restricted access and periodic terms review | 8, medium |
| Account compromise or device loss | 15, high | Business account security, least-privilege sharing, owner access only and prompt access revocation | 6, medium |
| Safeguarding information is deleted or retained incorrectly | 12, significant | Separate hold field, safeguarding policy exception, minimal notes and individual review | 6, medium |
| Function creep into marketing, profiling or automated decisions | 12, significant | Purpose limitation, no analytics answers, documented prohibited uses and mandatory DPIA review trigger | 3, low |

No residual score is high. The remaining medium risks are inherent to authorised adult collection of children's educational information and use of major cloud processors. They are accepted only subject to owner sign-off and continued operation of every listed safeguard.

## 13. Required actions and completion evidence

| Action | Status |
| --- | --- |
| Implement approved conditional consent and authority logic | Completed and tested |
| Enforce restricted relationships in Worker and Apps Script | Completed and tested in the browser, Worker and Apps Script validation layers |
| Record wording versions, timestamp, status and withdrawal date | Completed in the 46-column production schema and verified by fictional smoke test |
| Complete child-specific LIA | Completed |
| Prepare final Privacy Policy V1.5 wording | Completed in the launch branch, not published |
| Confirm owner-only Google Workspace access | Completed |
| Rotate HMAC and deploy authorised Apps Script version | Completed using the MentorSphere business account |
| Store all production Worker secrets without deploying production | Completed in undeployed Worker versions |
| Pass fictional production-path smoke test and remove test data | Completed on 31 July 2026; the Sheet was returned to header-only state and test emails were moved to Trash |
| Confirm no answer logging | Completed through browser inspection and answer-free local Worker request logs |
| Publish approved Privacy Policy V1.5 | Blocked until final owner approval |
| Enable form page and submissions | Blocked until final owner approval |

## 14. Outcome and sign-off

The processing is necessary and proportionate for the limited intake purpose after applying the documented controls. The assessment identifies no unmitigated high risk. Production processing must not start if any high-risk safeguard fails or if the residual risk changes materially.

Owner sign-off:

- Outcome: pending final owner approval with the launch pull request.
- Residual risks accepted: pending.
- Signed by: Luke Turner.
- Date: pending.

## Official sources

- ICO DPIA process: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/
- ICO DPIAs and children's risks: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/
- ICO special-category conditions and explicit consent: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/
- Google Cloud terms directory and Workspace processing terms: https://cloud.google.com/product-terms
- Google Workspace service-specific data-region terms: https://workspace.google.com/intl/en_uk/terms/service-terms/
- Cloudflare customer DPA: https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/
