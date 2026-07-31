# Privacy Policy V1.5 publication text

Status: final wording prepared in the launch branch for owner approval. The LIA, DPIA, production integration and fictional smoke test are complete. Do not publish this amendment until the owner has approved the LIA and DPIA residual risk and explicitly approved the launch pull request. Both production feature flags remain under deliberate launch control.

## Exact changes to Privacy Policy V1.4

Publish as Privacy Policy V1.5 using the actual publication date, and make these changes together:

1. Add the learner intake bullet below to section 2, `Information collected`.
2. Add the learner intake paragraph below to section 3, `How information is used`.
3. In section 6, `Third-party services`, replace the Google and Cloudflare bullets and add the restricted-access paragraph below.
4. Insert the complete new section 9, `Primary learner profile form`, after section 8, `Website contact form`.
5. Renumber `Policy updates` to section 10 and add the V1.5 change-log entry.
6. Renumber `Contact information` to section 11. Its content does not otherwise change.

No other existing section changes.

## Section 2 addition

Add after `Educational information`:

> **Learner intake information:** information provided through a learner profile may include the respondent's identity, contact details and relationship to the learner; the learner's name, date of birth and education stage; subjects and session preferences; educational background; EHCP status; support needs and strategies; and diagnosed, suspected or assessed needs where the respondent chooses to provide them. Some optional answers may include information concerning health, disability, SEND or neurodiversity. Respondents should provide only information that is relevant to understanding, planning and delivering support.

## Section 3 addition

Add after the existing list:

> Learner intake information may be used to understand the learner's background, strengths, needs and preferences; consider whether The MentorSphere is an appropriate service; prepare for an introductory discussion; and plan and personalise support where a service relationship begins. Information about wider MentorSphere support is considered only where the respondent asks for this to be discussed.

## Section 6 replacements and addition

Replace the Google bullet with:

> **Google Calendar, Google Workspace, Google Sheets and Google Apps Script:** scheduling, restricted storage and processing of learner intake responses, and limited submission notifications.

Replace the Cloudflare bullet with:

> **Cloudflare:** website hosting, content delivery, network security, protection against malicious traffic and website performance. Cloudflare Workers and Turnstile also support server-side validation, automated-traffic protection and authenticated transfer of validated learner intake responses to the approved Google Workspace destination.

Add after the service list:

> Access to the private learner intake spreadsheet is restricted to the business owner and any specifically authorised person who needs the information for service delivery, administration, safeguarding or legal obligations. A notification email may confirm that a new response has been received and provide a link to the restricted spreadsheet. It does not contain learner or respondent answers.

## New section 9: Primary learner profile form

> The Learner Profile: Primary Years form collects information to help The MentorSphere understand a learner, consider the suitability of requested support and plan possible support. It is intended only for information relevant to education and support. Respondents should not provide identity documents, passwords, bank details or complete medical records.
>
> The information submitted may include the respondent's contact details, relationship to the learner and contact preferences; the learner's identity, date of birth, education stage and subjects; educational background, support needs and strategies; optional diagnosed, suspected or currently assessed needs and EHCP information; session preferences; and records of the acknowledgements and consent choices shown with the form.
>
> The lawful basis for using the respondent's own information to take necessary steps towards a possible service contract at their request is Article 6(1)(b) of the UK GDPR. Where ordinary information about a learner or another third party is needed to assess suitability and plan requested support, The MentorSphere relies on Article 6(1)(f), legitimate interests. The legitimate interest is providing a proportionate and informed response to a request for personalised education support. A legitimate interests assessment considers necessity, reasonable expectations, data minimisation and the particular protections required for children's information.
>
> Some optional answers may include health, disability, SEND or neurodiversity information. The Article 9 condition for using that information to understand the learner and personalise support is explicit consent under Article 9(2)(a). Providing the information and giving consent are optional, and an ordinary intake can be submitted without doing so. Respondents should provide only relevant information.
>
> If optional health, disability, SEND or neurodiversity information is provided without the required consent, The MentorSphere will not use it for personalisation and will remove or redact it as soon as reasonably possible, unless it must be handled separately for a safeguarding or legal purpose.
>
> Consent can be withdrawn at any time by emailing luke@thementorsphere.co.uk. Withdrawal does not affect processing that took place before it was withdrawn. After withdrawal, The MentorSphere will stop using and remove or irreversibly redact the special-category information unless another Article 9 condition applies to a separate purpose that was explained to the individual. Ordinary information may still be retained where a separate lawful basis and the retention arrangements apply. A minimal record of the withdrawal may be retained where necessary to honour it.
>
> For the initial form, a person providing optional special-category information about a learner must confirm that they have parental responsibility or documented legal authority to act on the learner's behalf. They must also select whether the learner is not yet able to understand and give informed consent, so the authorised adult is giving consent, or whether the learner understands how the information will be used and has authorised the respondent to communicate consent on their behalf. The learner's wishes and ability to understand will be considered in context. Education or support professionals, other family members and other respondents cannot provide health, disability, SEND, neurodiversity, diagnosis or EHCP information through this form. Luke can arrange a separate information-sharing route where appropriate authority has been documented. Relevant privacy information must be shared with the learner in a way appropriate to their age and understanding.
>
> Submissions are processed through The MentorSphere's Cloudflare-hosted website service. Cloudflare Turnstile protects the form against automated or abusive submissions. After server-side validation, the response is transferred through an HMAC-authenticated connection to a private Google Workspace spreadsheet. Answers are not placed in URLs or browser storage and are not intentionally written to Cloudflare or browser logs.
>
> Where no service relationship begins, learner intake responses will normally be deleted six months after the last meaningful contact.
>
> Where a service relationship begins, the intake information may become part of the active learner record and will be retained according to the applicable client-record retention arrangements.
>
> Test, duplicate and unnecessary submissions will be removed as soon as reasonably possible.
>
> Safeguarding information may be retained separately where required under the Safeguarding Policy or relevant legal obligations.

## Section 10 change-log addition

Add above the V1.4 entry using the publication date:

> **V1.5, [publication date]:** added information about the Primary learner profile form, its lawful bases and explicit consent, service providers, security controls, restricted notifications and retention arrangements.

## Form controls reflected by the policy

The general authority confirmation remains separate from consent:

> I confirm that I am authorised to provide the learner's information to The MentorSphere for the purpose of planning and delivering support.

The general privacy acknowledgement also remains separate from consent:

> I have read the Privacy Policy and understand how information from this form will be used.

The exact separate consent wording is:

> **Optional health, disability, SEND and neurodiversity information**
>
> I explicitly consent to The MentorSphere using the health, disability, SEND and neurodiversity information I choose to provide in this form to understand the learner and personalise support. Providing this information and giving consent are optional, and I can still submit the form without doing so. I can withdraw my consent at any time by emailing luke@thementorsphere.co.uk. Withdrawal will not affect processing that took place before it was withdrawn.

The exact learner consent-route question is:

> **Which statement applies to the learner’s consent?**
>
> The learner is not yet able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.
>
> The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.

The exact authority confirmation is:

> I confirm that I have parental responsibility for the learner, or hold documented legal authority to act on their behalf. I have shared the relevant privacy information with the learner in a way appropriate to their age and understanding. The statement selected above accurately reflects the learner’s ability to understand and authorise this consent.
