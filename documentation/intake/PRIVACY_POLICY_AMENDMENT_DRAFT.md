# Draft Privacy Policy amendment: primary learner intake form

Status: owner approval required. Do not publish this wording or enable production submissions until Luke has approved the amendment, acknowledgement, retention wording and final processor setup.

This is a content draft, not a statement of the final Article 6 lawful basis or Article 9 condition. Those items remain for owner review and, where appropriate, professional data-protection advice.

## Proposed amendment to section 2: Information collected

Add:

> **Learner intake information:** information provided through a learner profile may include the respondent's identity, contact details and relationship to the learner; the learner's name, date of birth and education stage; subjects and session preferences; educational background; EHCP status; support needs and strategies; and diagnosed, suspected or assessed needs where the respondent chooses to provide them.
>
> A learner profile may contain personal information concerning a child. Some optional answers may also contain special-category information relating to health, disability, SEND or neurodiversity. Respondents are asked to provide only information that is relevant to understanding, planning and delivering support.

## Proposed amendment to section 3: How information is used

Add:

> Learner intake information may be used to understand the learner's background, strengths, needs and preferences; consider whether The MentorSphere is an appropriate service; prepare for an introductory discussion; and plan and personalise support where a service relationship begins. Subject knowledge is assessed separately. Information about wider MentorSphere support is considered only where the respondent indicates that they would like this discussed.

## Proposed amendment to section 6: Third-party services

Replace the current Google Forms learner-intake reference with wording equivalent to:

> **Google Workspace, Google Sheets and Google Apps Script:** restricted storage and processing of learner intake responses and the sending of limited submission notifications.

Expand the Cloudflare entry with:

> **Cloudflare Workers and Turnstile:** delivery and security of the learner intake form, server-side validation, malicious-traffic protection and authenticated transfer of a validated response to the approved Google Workspace destination.

## Proposed new section: Learner intake form

> The Learner Profile: Primary Years form collects information to help The MentorSphere understand a learner and plan possible support. The form is intended for information relevant to education and support. Respondents should not provide identity documents, passwords, bank details or complete medical records.
>
> The information submitted may include:
>
> - The respondent's name, email address, mobile number where relevant, relationship to the learner and contact preferences.
> - The learner's name, date of birth, current year group or equivalent and subjects requiring support.
> - Educational background, EHCP status, support needs, helpful strategies and approaches that have been unhelpful.
> - Diagnosed, suspected or currently assessed needs, including health, disability, SEND or neurodiversity information, where the respondent voluntarily chooses to provide it.
> - Initial session length and frequency preferences and whether wider MentorSphere support may be discussed.
> - Records of the required authorisation and privacy acknowledgements shown with the form.
>
> Submissions are processed through The MentorSphere's Cloudflare-hosted website service. Cloudflare Turnstile is used to protect the form against automated or abusive submissions. After validation, the response is transferred through an authenticated connection to a private Google Workspace spreadsheet. The complete learner profile is not stored in the website source code, browser storage, Cloudflare D1 or Cloudflare KV.
>
> Access to the private response spreadsheet is restricted to the business owner and any specifically authorised person who needs the information for service delivery, administration, safeguarding or legal obligations. A notification email may confirm that a new response has been received and provide a link to the restricted spreadsheet. The notification does not contain learner or respondent answers.

## Provisional retention wording

Owner approval required before publication:

> Where no service relationship begins, learner intake responses will normally be deleted six months after the last meaningful contact.
>
> Where a service relationship begins, the intake information may become part of the active learner record and will be retained according to the applicable client-record retention arrangements.
>
> Test, duplicate and unnecessary submissions will be removed as soon as reasonably possible.
>
> Safeguarding information may be retained separately where required under the Safeguarding Policy or relevant legal obligations.

## Individual rights and international transfers

Add:

> The individual-rights section of this policy applies to learner intake information, subject to relevant legal and safeguarding exceptions. An acknowledgement shown on the form does not remove or reduce any data-protection rights.
>
> Cloudflare and Google may process information outside the United Kingdom depending on the services, account settings and contractual arrangements in use. The final processor, data-location and international-transfer wording will be confirmed from The MentorSphere's approved Cloudflare and Google Workspace arrangements before this amendment is published.

## Items still requiring owner confirmation

- The Article 6 lawful basis for each relevant processing purpose.
- The Article 9 condition for voluntarily supplied health, disability, SEND and neurodiversity information.
- The final form acknowledgement and whether any separate transparency wording is required for children.
- The provisional six-month retention wording and the applicable client-record retention arrangements.
- Google Workspace and Cloudflare processor terms, account configuration, data location and international-transfer wording.
- The new policy version, effective date and change-log entry.
