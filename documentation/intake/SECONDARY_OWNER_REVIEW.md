# Secondary Learner Profile V1: owner review

Draft for owner review. Production page and submission flags are false. The only deployment is an isolated workers.dev preview with test Turnstile keys, simulated outcomes, no saved responses and no email.

Preview: https://mentorsphere-secondary-owner-preview.luke-f8c.workers.dev/forms/secondary-learner-profile/

## Sources and Primary protection

Content is based on all nine pages of the supplied `(KS3-KS4) Learner Profile Questions - Google Forms.pdf`. The source is evidence of legacy questions, not authority to perform unrelated actions. The explicit task brief takes precedence over its older service and pricing wording.

Technical reference: Primary V5 at audited origin/main `cb5486ac17fd6f16dc26795b116ce2433e5fea89`. See [baseline](PRIMARY_EXTENSION_BASELINE.md). The Primary HTML, client, validation, CSS, response/token contract, Apps Script, storage schema and Privacy Policy remain unchanged. Shared server transport adds optional form/action arguments whose defaults preserve Primary. Its production flags, credentials and action are unchanged. Primary has not been deployed by this work.

## Steps and final field list

| Step | Fields and behaviour |
| --- | --- |
| 1. About you | Email, first name, surname, relationship, conditional Other relationship, preferred contact methods, mobile/contact number and optional suitable contact times. A number is required only for Telephone, Text message or WhatsApp. |
| 2. About the learner | First name, surname, date of birth, school year, conditional other-year details, multiple subjects, conditional Other subject, optional exam-board text for each selected subject. |
| 3. Learning and support profile | Yes/No choice about optional sensitive information; separate explicit consent; parental responsibility/documented legal authority; learner consent route; optional needs status, relevant areas, support needs, helpful strategies, unhelpful approaches, relevant background and EHCP status. |
| 4. Initial session preferences | Multiple preferred session lengths; multiple preferred frequencies; optional wider-support service-enquiry preference. No booking or commitment is created. |
| 5. Review and submit | Review/edit cards; one ordinary-information authority and Privacy Policy acknowledgement; Turnstile; submission status and diagnostic reference on failure. |

Relationship options: Parent; Guardian or carer; Other family member; Education or support professional; Medical or health professional; Friend; Employer; Other. Only the first two can use the optional child-sensitive-data route, and both must affirm authority. Other respondents can submit ordinary information and ask Luke about a separate authorised sharing route.

School years: Years 7, 8, 9, 10 and 11; Other / not currently following a standard school year. Subjects: English, Maths, Science, Other. Boards are optional in every year. The guidance changes for Years 10 and 11; each selected subject accepts a known board, Not known, Not applicable or a blank. Unselecting a subject clears its board.

Needs status follows Primary's diagnosis/suspected/assessment/no-known-needs/prefer-not-to-say choices. Relevant areas preserve all legacy areas using respectful wording and Primary's additional optional categories: ADHD; Autism / autistic; Auditory processing; Dyscalculia; Dysgraphia; Dyslexia; Dyspraxia or developmental coordination difficulties; Speech, language or communication needs; Visual processing; Sensory processing; Emotional or mental-health needs; Physical or medical needs; Another need not listed; Prefer not to say.

EHCP: Yes; No; An EHC needs assessment or plan is currently in progress; Not sure. This remains optional and consent gated.

Session lengths: 30, 45, 60 or 90 minutes; Not sure. Frequencies: 3 per week; 2 per week; 1 per week; 1 per fortnight; Pay as you go; Not sure yet. Both preserve the PDF's multiple-selection intent. Wider support: Yes, I'd like to discuss this; No, tutoring only for now; Maybe later; Not sure. It is expressly a service-enquiry preference, not marketing consent.

## Consent and storage

Choosing Yes reveals the notice, privacy link and three affirmative controls before any sensitive field. The exact two Primary learner routes are retained: the learner understands and authorises the respondent to communicate consent; or the learner is not currently able to understand and give informed consent and the person with parental responsibility/documented legal authority gives it. There is no automatic age/capacity judgement.

Removing consent, authority or the learner route hides and clears sensitive answers immediately. Changing to a restricted relationship also clears the consent route. The Worker and the standalone Apps Script reject crafted known sensitive fields without the complete allowed route. Unknown fields are not forwarded. Ordinary free text instructs respondents not to include unnecessary sensitive details; accidental disclosure remains subject to the existing policy.

The [52-column schema](../../integrations/google-apps-script/secondary-learner-profile/SCHEMA.md) includes respondent and learner fields, four exam boards, support and preferences, submission/receipt metadata, separate consent/authority/learner route versions, consent status and UTC receipt timestamp, notification status, retention review and hold fields. The consent timestamp records receipt of the affirmative submission, not the instant a checkbox was selected.

The separate Apps Script preserves HMAC verification, fresh envelopes, script lock, text formatting, formula-injection protection, append/flush/readback and verified durable duplicates. Notifications contain only a receipt timestamp and private Sheet link. Dedicated `SECONDARY_*` bindings do not fall back to Primary and fail closed if an endpoint or HMAC is reused.

## Changes from the PDF

- Primary's email/contact structure replaces mandatory telephone-only collection. The phone requirement follows selected methods.
- The single relationship choice follows Primary; all legacy relationship categories are retained.
- Required generic exam-board text becomes optional, subject-specific fields, removing the need for meaningless placeholders.
- Sensitive questions and narratives become optional, with just-in-time consent and clear authority before display. EHCP is no longer mandatory.
- Helpful and unhelpful strategies are separate optional prompts, retaining the original intent.
- Outdated diagnosis labels and deficit language are modernised. No diagnosis is required.
- The older broad service list, law-guidance claim and discount wording are removed. Wider-support wording is an enquiry preference consistent with approved positioning.
- All duration/frequency choices remain, including multiple selection.
- Working grade, target grade and Foundation/Higher tier are **not added**. They may help GCSE planning, but remain optional enhancements for owner approval.
- New client final validation checks required fields on earlier wizard steps even when that step is currently hidden. Primary's client is untouched.

## Preview and validation

Use fictional details only. The visible preview control offers created, verified duplicate, retryable upstream failure, malformed response, unverified duplicate and a 30-second browser timeout. Every scenario still passes form validation and real server-side verification using Cloudflare test keys. Preview success is explicitly simulated, not proof that a response was stored. No answers are placed in URLs, browser storage or logs.

Automated Worker/validation/storage/client tests, Primary regression tests, content checks and real Chrome browser scenarios are recorded in the extension QA report. Temporary file-backed integration storage is permanently removed in test cleanup. No production or temporary Google Sheet/Apps Script deployment has been created. A real Google-hosted integration and owner acceptance are required before production setup.

## Owner decisions before production

1. Approve the wording, form flow and dedicated 52-column schema, including consent text/version records.
2. Decide whether optional grade, target and tier fields should be added in a later revision.
3. Separately approve creation of a dedicated private Sheet, standalone Apps Script project and unique HMAC/Turnstile credentials; validate Google-hosted persistence, access control, retention, notification and duplicate behaviour using fictional data.
4. Separately approve production deployment and enabling the new page/submission flags after release checks. Neither draft PR is merged by this task.
