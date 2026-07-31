# Legitimate interests assessment: primary learner profile

Version: 1.0

Assessment date: 31 July 2026

Controller and owner: Luke Turner, The MentorSphere

Status: completed for owner sign-off. The assessment identifies no unmitigated high risk. It applies only to ordinary learner and third-party information. It does not provide an Article 9 condition.

## 1. Decision and boundaries

The approved Article 6 position is:

- Article 6(1)(b), contract, for the respondent's own information where processing is necessary to take steps that person requested before a possible contract.
- Article 6(1)(f), legitimate interests, for proportionate ordinary information concerning the learner or another third party where the contract basis does not apply.
- Article 9(2)(a), explicit consent, is considered separately for optional health, disability, SEND and neurodiversity information.

The legitimate interest is responding to a request for personalised education support, assessing whether the requested support is suitable, preparing a proportionate introductory discussion and planning possible support without asking the learner or family to repeat ordinary educational information unnecessarily.

This assessment does not cover marketing, unrelated profiling, automated eligibility decisions, legal representation, diagnosis, clinical assessment, complete medical records or collecting information merely because it might become useful.

## 2. Purpose test

The processing has a clear and specific benefit:

- The learner and respondent receive a more informed initial response.
- The MentorSphere can identify whether the request falls within service scope and whether a different service or signposting is more appropriate.
- Information relevant to communication, learning context and session planning can be considered together.
- The risk of an unsuitable or generic first response is reduced.

The interest is lawful, connected to the respondent's deliberate request and compatible with the stated purpose of the direct learner-profile form.

## 3. Necessity test

The ordinary information is limited to what is reasonably needed for the initial purpose:

| Information | Why it is needed | Less intrusive alternative considered |
| --- | --- | --- |
| Respondent identity, relationship and contact preferences | Reply to the request and understand who is providing information | Direct contact remains available, but the same minimum details would still be needed |
| Learner identity, date of birth and education stage | Distinguish the learner and understand age-appropriate education context | Age band alone was considered, but exact date supports accurate stage and safeguarding context |
| Subjects and ordinary educational background | Identify requested learning support and likely scope | A free-text enquiry would be less structured and could invite more excessive information |
| Ordinary strategies, preferences and approaches | Plan a proportionate introductory discussion | Collecting these later would require repetition and could delay a useful response |
| Session preferences | Understand practical expectations without creating a booking | These could be collected later, but early optional or single-choice collection reduces unnecessary exchanges |

Optional special-category information is segregated behind an explicit Yes or No choice and separate consent. A respondent can submit without it. Structured and narrative support fields are hidden and cleared when the special-category route is not chosen. The Worker and Apps Script reject those fields if a crafted request contradicts the No choice.

The form discourages complete records, identity documents, passwords and bank details. Field lengths, fixed choices and server-side validation constrain collection. There is no advertising, tracking profile or automated decision.

The purpose could not be achieved as effectively with materially less ordinary information. The selected fields are therefore necessary and proportionate, subject to the safeguards below.

## 4. Balancing test

### Reasonable expectations

Factors supporting reasonable expectations:

- The respondent deliberately opens a direct, unlisted learner-profile form for support planning.
- The form explains its purpose before collection and links to the Privacy Policy.
- The information is used only to consider and plan requested support.
- A direct-contact alternative is available.

Factors requiring extra weight:

- The learner is often a child and may not be the respondent.
- A parent, carer, professional or other third party may provide information.
- Educational information can be private even where it is not special-category data.
- A child may not expect an adult to share detailed information without involving them.

### Likely impact

Potential adverse effects include embarrassment, loss of trust, inaccurate assumptions, inappropriate disclosure, reduced autonomy and distress if private information is mishandled. These effects may be greater for children and neurodivergent or otherwise vulnerable learners.

The processing does not determine access through an automated score, make statutory decisions, diagnose conditions or guarantee service suitability. Luke reviews the information contextually and can correct or disregard inaccurate information.

### Child-specific safeguards

- Children's interests receive particular weight in every review and service decision.
- The special-category route is limited at launch to a respondent selecting Parent or Guardian or carer and confirming parental responsibility or documented legal authority.
- The respondent must select a versioned learner consent route stating either that the learner cannot yet understand and give informed consent, or that the learner understands and has authorised the respondent to communicate consent.
- Education or support professionals, other family members and Other respondents cannot submit structured needs, diagnosis or EHCP information through this form. The Worker and Apps Script reject crafted attempts independently.
- Privacy information must be shared with the learner in a way appropriate to their age and understanding.
- The form uses plain language, optional fields, a direct-contact alternative and no manipulative design.
- Luke must consider the learner's wishes, competence and involvement in context. An authorised adult's decision is not treated as permission to disregard a capable learner's objection, distress or later withdrawal of cooperation. Luke must pause and review the appropriate route where the learner's wishes conflict with the respondent's account.
- Objection, correction, erasure and restriction requests are handled subject to applicable legal and safeguarding exceptions.

### Operational and technical safeguards

- Page and submission release flags default to false and are independently enforced.
- Turnstile, a honeypot, body-size limits and same-origin checks reduce abusive collection.
- The Worker validates allowed values and conditional authority before forwarding.
- HMAC authentication, freshness checks and constant-time comparison protect the Apps Script endpoint.
- Apps Script independently checks the restricted relationship, consent shape and duplicate submission ID.
- Formula-like values are stored as text.
- The Sheet is in an owner-only restricted Google Workspace folder.
- Notifications contain no learner or respondent answers.
- The fixed notification is routed by exact sender, recipient and subject to the monitored Inbox, labelled `Learner profile notifications`, marked important and excluded from Spam.
- Answers are excluded from browser storage, URLs, analytics and intentional application logs.
- Prospective records have an operational six-month review date, monthly filter and deletion process.
- Test, duplicate and unnecessary records are removed promptly.
- Safeguarding or legal holds are recorded separately and reviewed.

## 5. Risk balance

| Risk to the learner | Initial concern | Safeguard | Residual assessment |
| --- | --- | --- | --- |
| Ordinary information supplied without the learner's awareness or contrary to their wishes | Significant for an older or capable child | Versioned learner consent route, authority confirmation, age-appropriate privacy information, contextual competence review and learner involvement | Medium |
| Excessive or irrelevant information | Significant because free text is available | Optional fields, prompts to provide only relevant information, length limits and alternative route | Low to medium |
| Inaccurate third-party information affects service planning | Moderate | No automated decisions, contextual review, correction rights and introductory discussion | Low |
| Information used beyond the stated purpose | Moderate | Purpose limitation, no marketing or profiling, documented review triggers | Low |
| Unauthorised access or disclosure | Significant due to children's information | Restricted Sheet, owner-only permissions, HMAC, minimal email and no answer logging | Low to medium |
| Retention beyond need | Moderate | Review date, monthly filter, status and hold fields, deletion instructions | Low |

No residual risk is assessed as high. Medium residual risks are justified only while the safeguards remain in place and are monitored.

## 6. Outcome

Article 6(1)(f) is a proportionate basis for the ordinary learner and third-party information that is necessary to assess and plan requested support where Article 6(1)(b) does not apply. The learner's interests and rights do not override the stated interest after applying the documented child-specific, purpose, access, transparency and retention safeguards.

If a safeguard is removed, the purpose changes, additional recipients are introduced or data is used for automated decisions, this conclusion no longer applies until the assessment is reviewed.

## 7. Review and sign-off

Review at least annually and sooner if:

- form fields, purposes, processors or recipients change;
- the special-category authority workflow expands beyond Parent or Guardian or carer;
- retention arrangements change;
- a complaint, objection, breach or safeguarding issue reveals a new risk;
- automated decision-making, analytics or marketing is proposed; or
- relevant ICO guidance or law changes.

Owner sign-off:

- Owner decision: pending.
- Residual risks accepted: pending.
- Signature: pending.
- Approval date: pending.

## Official sources

- ICO legitimate interests guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legitimate-interests/
- ICO legitimate interests and children: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/when-can-we-rely-on-legitimate-interests/
- ICO children's lawful bases: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/
