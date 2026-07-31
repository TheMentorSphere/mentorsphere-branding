# Primary learner profile data-protection decision note

Status: recommendation for owner approval. This note is not the final legal-basis decision and must remain internal. Privacy Policy V1.5 must not be published and the form must not be enabled until the owner approves the position below.

Date reviewed: 31 July 2026

## Processing reviewed

The form collects respondent contact and relationship information, learner identity and educational information, session preferences, and optional information that may reveal health, disability, SEND or neurodiversity. The Worker validates the submission, verifies Turnstile, signs it using HMAC and forwards it to Google Apps Script. Apps Script writes it to a restricted Google Sheet and sends an answer-free notification. No answers are intentionally placed in browser storage, URLs, analytics or Cloudflare logs.

## Recommended Article 6 position

Use a purpose-specific combination rather than one basis for every person and purpose:

1. **Article 6(1)(b), contract:** use for the respondent's own contact and intake information where that individual asks The MentorSphere to take necessary steps towards a possible service contract with them. This can cover pre-contractual steps even if no contract follows.
2. **Article 6(1)(f), legitimate interests:** use for ordinary learner or other third-party information where the prospective contract is with someone else, and for submissions by an authorised professional where Article 6(1)(b) does not apply. The specific interest is assessing whether requested support is suitable and planning proportionate, personalised education support. This basis is conditional on the documented legitimate interests assessment and its child-specific safeguards.

Do not use Article 6(1)(b) for a learner's information merely because the respondent may enter a contract. ICO guidance says the contract basis does not apply when the contract is with one person but another person's details are processed, or where steps are taken at a third party's request.

## Recommended Article 9 position

Use **Article 9(2)(a), explicit consent** for optional health, disability, SEND and neurodiversity information used to understand the learner and personalise support.

No other Article 9 condition clearly fits this routine intake purpose on the current facts. Safeguarding conditions may apply to separate safeguarding processing where a concern actually arises, but they should not be used as the general condition for routine personalisation.

## Role of the approved acknowledgement

Keep the already approved acknowledgement as a transparency acknowledgement only. It does not contain an express statement of consent and therefore should not be presented or recorded as explicit consent.

Add a separate, unticked explicit-consent control that is required only when the respondent chooses to provide special-category information. A respondent must still be able to submit the ordinary intake without providing that information or giving this consent.

Recommended exact form wording:

> **Optional sensitive information**
>
> I explicitly consent to The MentorSphere using the health, disability, SEND and neurodiversity information I choose to provide in this form to understand the learner and personalise support. I understand that providing this information is optional and that I can withdraw this consent at any time by emailing luke@thementorsphere.co.uk. Withdrawal will not affect processing that took place before it was withdrawn.

Where the information concerns someone other than the respondent, add this separate required confirmation beside the explicit-consent control:

> I confirm that I am the learner, have parental responsibility for the learner, or have other specific authority to give this consent on the learner's behalf. I confirm that the learner has been given the privacy information in a way appropriate to their age and understanding where practicable.

For an education or support professional, other family member or other third party, do not accept special-category information through the form unless The MentorSphere can demonstrate that the person has specific authority to indicate consent and that the learner was fully informed. A general professional relationship or the existing authorisation-to-provide-information checkbox is not enough by itself.

## Withdrawal implications

If explicit consent is withdrawn:

- stop using the special-category information as soon as possible;
- remove or irreversibly redact it from the active intake or learner record unless a different Article 9 condition applies to a separate, already-disclosed purpose;
- retain ordinary information only where the separate Article 6 basis and retention rules still justify it;
- retain a minimal record of the withdrawal where necessary to honour it, using a separately documented basis;
- do not penalise the person or automatically end ordinary support solely because optional sensitive information is withdrawn;
- explain that personalisation relying on the withdrawn information may become more limited; and
- keep records of who consented, when, how and the exact wording shown.

## Children and submissions by other people

- The contract basis only applies to the person who is or may become party to the contract and whose request requires the processing.
- Legitimate interests can apply to children's ordinary information only after giving their interests particular weight in the balancing test and applying safeguards.
- For consent outside the specific online-service rule, assess whether the child can understand and consent for themselves. Where they cannot, verify that the person acting for them has parental responsibility or other specific legal authority.
- A third party can indicate consent on someone's behalf only where their authority can be demonstrated and the individual was fully informed. This is likely to be difficult for professionals or wider family members without specific evidence.
- Provide privacy information in clear language appropriate to the learner's age and understanding where practicable.

## Exact Privacy Policy wording to add if approved

Add to the learner-intake section:

> The lawful basis for using the respondent's own information to take necessary steps towards a possible service contract is Article 6(1)(b) of the UK GDPR. Where learner or other third-party information is needed to assess suitability and plan requested support, The MentorSphere relies on Article 6(1)(f), legitimate interests. The legitimate interest is providing a proportionate and informed response to a request for personalised education support. A legitimate interests assessment considers necessity, reasonable expectations, data minimisation and the particular protections required for children's information.
>
> Where optional answers include health, disability, SEND or neurodiversity information, the Article 9 condition is explicit consent under Article 9(2)(a). This information is optional. Consent can be withdrawn at any time by emailing luke@thementorsphere.co.uk. Withdrawal does not affect processing that was lawful before withdrawal. After withdrawal, The MentorSphere will stop using and remove or redact the special-category information unless another Article 9 condition applies to a separate purpose that was explained to the individual. Ordinary information may still be retained where a separate lawful basis and the retention arrangements apply.
>
> If someone provides special-category information about another person, they must have parental responsibility or other specific authority to give consent on that person's behalf. The MentorSphere may ask for confirmation of that authority. Privacy information should be shared with the learner in a way appropriate to their age and understanding where practicable.

## Practical consequences before launch

1. Complete and approve the legitimate interests assessment.
2. Keep the approved acknowledgement as transparency wording.
3. Add and record a separate explicit-consent field and wording version.
4. Make sensitive fields optional and allow submission without explicit consent when they are blank.
5. Add server-side validation so sensitive information cannot be submitted without explicit consent and authority confirmation.
6. Define a simple consent-withdrawal process and update the retention procedure.
7. Do not accept sensitive information from professionals or other third parties without demonstrable authority.
8. Consider a focused DPIA screening because the form concerns children and may collect health-related information.

## Official ICO sources

- Contract lawful basis: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/contract/
- Legitimate interests and the three-part test: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legitimate-interests/
- Legitimate interests and children's information: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/when-can-we-rely-on-legitimate-interests/
- Special-category processing conditions: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/
- Special-category data rules: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/
- Valid consent, explicit consent, third-party authority and children's consent: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/what-is-valid-consent/
- Managing withdrawal: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/
- Children's lawful bases: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/

The ICO notes that some lawful-basis and consent guidance is under review following recent legislation. Recheck the cited pages immediately before publication if approval is delayed.
