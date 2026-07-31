# Primary learner profile data-protection decision note

Status: approved by the owner on 31 July 2026, subject to the completed child-specific LIA, focused DPIA and final launch controls. Privacy Policy V1.5 must not be published and the form must not be enabled until the remaining launch gates are complete.

Date reviewed: 31 July 2026

## Processing reviewed

The form collects respondent contact and relationship information, learner identity and educational information, session preferences, and optional information that may reveal health, disability, SEND or neurodiversity. The Worker validates the submission, verifies Turnstile, signs it using HMAC and forwards it to Google Apps Script. Apps Script writes it to a restricted Google Sheet and sends an answer-free notification. No answers are intentionally placed in browser storage, URLs, analytics or Cloudflare logs.

## Approved Article 6 position

Use a purpose-specific combination rather than one basis for every person and purpose:

1. **Article 6(1)(b), contract:** use for the respondent's own contact and intake information where that individual asks The MentorSphere to take necessary steps towards a possible service contract with them. This can cover pre-contractual steps even if no contract follows.
2. **Article 6(1)(f), legitimate interests:** use for ordinary learner or other third-party information where the prospective contract is with someone else, and for submissions by an authorised professional where Article 6(1)(b) does not apply. The specific interest is assessing whether requested support is suitable and planning proportionate, personalised education support. This basis is conditional on the documented legitimate interests assessment and its child-specific safeguards.

Do not use Article 6(1)(b) for a learner's information merely because the respondent may enter a contract. ICO guidance says the contract basis does not apply when the contract is with one person but another person's details are processed, or where steps are taken at a third party's request.

## Approved Article 9 position

Use **Article 9(2)(a), explicit consent** for optional health, disability, SEND and neurodiversity information used to understand the learner and personalise support.

No other Article 9 condition clearly fits this routine intake purpose on the current facts. Safeguarding conditions may apply to separate safeguarding processing where a concern actually arises, but they should not be used as the general condition for routine personalisation.

## Role of the approved acknowledgement

Use a separate, unticked explicit-consent control that is required only when the respondent chooses to provide special-category information. A respondent must still be able to submit the ordinary intake without providing that information or giving this consent.

Approved exact form wording:

> **Optional health, disability, SEND and neurodiversity information**
>
> I explicitly consent to The MentorSphere using the health, disability, SEND and neurodiversity information I choose to provide in this form to understand the learner and personalise support. Providing this information and giving consent are optional, and I can still submit the form without doing so. I can withdraw my consent at any time by emailing luke@thementorsphere.co.uk. Withdrawal will not affect processing that took place before it was withdrawn.

Approved separate authority confirmation:

> I confirm that I have parental responsibility for the learner, or hold documented legal authority to act on their behalf. I have shared the relevant privacy information with the learner in a way appropriate to their age and understanding. The statement selected above accurately reflects the learner’s ability to understand and authorise this consent.

Approved learner consent routes:

> The learner is not yet able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.

> The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.

For the initial launch, only Parent and Guardian or carer relationships can choose the special-category route, and they must give the approved authority confirmation. Education or support professionals, other family members and Other respondents cannot submit structured health, disability, SEND, neurodiversity, diagnosis or EHCP information through the form. They are directed to ask Luke for a separate documented-authority information-sharing route. The Worker and Apps Script enforce this restriction independently.

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

## Exact Privacy Policy wording reflected in V1.5

Add to the learner-intake section:

> The lawful basis for using the respondent's own information to take necessary steps towards a possible service contract is Article 6(1)(b) of the UK GDPR. Where learner or other third-party information is needed to assess suitability and plan requested support, The MentorSphere relies on Article 6(1)(f), legitimate interests. The legitimate interest is providing a proportionate and informed response to a request for personalised education support. A legitimate interests assessment considers necessity, reasonable expectations, data minimisation and the particular protections required for children's information.
>
> Where optional answers include health, disability, SEND or neurodiversity information, the Article 9 condition is explicit consent under Article 9(2)(a). This information is optional. Consent can be withdrawn at any time by emailing luke@thementorsphere.co.uk. Withdrawal does not affect processing that was lawful before withdrawal. After withdrawal, The MentorSphere will stop using and remove or redact the special-category information unless another Article 9 condition applies to a separate purpose that was explained to the individual. Ordinary information may still be retained where a separate lawful basis and the retention arrangements apply.
>
> If someone provides special-category information about another person, they must have parental responsibility or other specific authority to give consent on that person's behalf. The MentorSphere may ask for confirmation of that authority. Privacy information should be shared with the learner in a way appropriate to their age and understanding where practicable.

## Implemented consequences and remaining approvals

1. The legitimate interests assessment and focused DPIA are complete and identify no unmitigated high risk. Owner residual-risk sign-off remains required.
2. The separate explicit-consent field, learner consent route, authority confirmation, wording versions, consent date and respondent details are recorded in the 48-column schema.
3. Sensitive fields are optional and ordinary intake can be submitted without explicit consent when they are blank.
4. The browser, Worker and Apps Script independently enforce consent, authority and restricted-relationship rules.
5. The consent-withdrawal and redaction procedure is documented with the retention process.
6. Professionals, other family members and Other respondents cannot submit special-category information through the initial form.
7. Privacy Policy V1.5 and both production feature flags remain blocked pending owner approval.

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
