# Primary learner profile field and data map

Status: implementation draft for owner review before production launch.

## Final form fields

### Step 1: About you

- Email address: required.
- First name: required.
- Surname: required.
- Relationship to the learner: required, single choice.
- Relationship details: conditionally required when Other is selected.
- Preferred contact method: required, single choice.
- Mobile number: conditionally required for Telephone, Text message or WhatsApp; otherwise optional.
- Suitable contact times: optional, multiple choice.

### Step 2: About the learner

- Learner's first name: required.
- Learner's surname: required.
- Date of birth: required.
- Current year group or equivalent: required, single choice.
- Year group details: conditionally required when Other is selected.
- Subjects requiring support: required, one or more choices.
- Other subject details: conditionally required when Other is selected.

### Step 3: Learning and support profile

- Whether optional health, disability, SEND or neurodiversity information will be provided: required, single choice.
- Diagnosed, suspected or assessed needs status: optional and displayed only when the respondent chooses the special-category route.
- Relevant areas: optional, multiple choice, displayed only when the respondent chooses the special-category route and a relevant needs status.
- Helpful support-needs information: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Helpful strategies, adjustments or approaches: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Unhelpful approaches: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Other relevant educational or personal background: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- EHCP status: optional and displayed only when the respondent chooses the special-category route.
- For the initial launch, the special-category route is available only where the selected relationship is Parent or Guardian or carer. Education or support professionals, other family members and Other respondents are directed to ask Luke for a separate information-sharing route. Structured and narrative special-category fields are rejected server-side if either the relationship restriction or the respondent's No choice is bypassed.

### Step 4: Initial session preferences

- Session length: required, single choice, including Not sure.
- Session frequency: required, single choice, including Not sure.
- Wider MentorSphere support discussion: optional, single choice.

### Step 5: Review and submit

- Readable review of all entered information with Edit section controls.
- Confirmation that the respondent is authorised to provide the learner's information: required.
- Privacy Policy acknowledgement: required.
- Explicit consent for optional health, disability, SEND and neurodiversity information: separate, unticked by default and required only when the special-category route is selected.
- Learner consent route: required single choice when the special-category route is selected. It records either that the learner cannot yet give informed consent and the authorised adult is consenting, or that the learner understands and has authorised the respondent to communicate consent.
- Confirmation of parental responsibility or documented legal authority: separate, unticked by default and required only when the special-category route is selected.
- Cloudflare Turnstile security token: required and verified server-side.
- Honeypot: hidden and expected to remain blank.

## Exact Google Sheet columns

The integration enforces this order:

1. Submission ID
2. Worker accepted at (UTC)
3. Google received at (UTC)
4. Form version
5. Respondent email
6. Respondent first name
7. Respondent surname
8. Relationship to learner
9. Relationship details
10. Mobile number
11. Preferred contact method
12. Suitable contact times
13. Learner first name
14. Learner surname
15. Learner date of birth
16. Year group or equivalent
17. Year group details
18. Subjects requiring support
19. Other subject
20. Needs status
21. Relevant need areas
22. Support needs information
23. Helpful strategies
24. Unhelpful approaches
25. Other educational or personal background
26. EHCP status
27. Preferred session length
28. Preferred session frequency
29. Wider MentorSphere support discussion
30. Authorised confirmation
31. Privacy acknowledgement
32. Special-category information provided
33. Explicit consent
34. Explicit consent wording version
35. Consent recorded at (UTC)
36. Parental responsibility or documented authority
37. Authority wording version
38. Learner consent route
39. Learner consent route wording version
40. Special-category consent status
41. Consent withdrawn at (UTC)
42. Notification status
43. Notification sent at (UTC)
44. Record status
45. Last meaningful contact date
46. Retention review date
47. Safeguarding or legal hold
48. Retention notes

Multi-choice answers are stored as plain text separated by ` | `. Every destination cell is formatted as text, and values beginning with spreadsheet formula characters are prefixed safely before writing.

Columns 32 to 41 record whether special-category information was provided, the conditional explicit consent and authority confirmation, the learner consent route, their wording versions, the consent timestamp, status and any later withdrawal. Respondent identity is recorded in columns 5 to 9 on the same row. Empty special-category submissions record `No`, use `Not applicable` for consent status and leave the conditional route, wording and timestamp cells blank.

Columns 44 to 48 are owner-managed administrative fields and are not respondent-facing questions. A new row starts with `Prospective`, the received date as its initial last meaningful contact date, a review date six months later, and `No` for the safeguarding or legal hold. The owner updates these fields as the relationship changes.

## Monthly retention review

Use a saved filter view named `Retention review due` with these conditions:

- `Record status` is `Prospective`.
- `Retention review date` is on or before today.
- `Safeguarding or legal hold` is not `Yes`.

At least monthly:

1. Open the saved filter view and review each due record.
2. Confirm that no service relationship has begun and that there is no safeguarding or legal reason to retain it.
3. Delete records that have reached the approved retention point and are no longer needed.
4. If meaningful contact has occurred, update `Last meaningful contact date` and set `Retention review date` to six months later.
5. If a service relationship begins, change `Record status` to `Active client` and manage the intake under the applicable client-record arrangements.
6. Set `Safeguarding or legal hold` to `Yes` only where applicable and add a minimal administrative explanation in `Retention notes`. Do not automatically delete held or active-client records.

If optional health, disability, SEND or neurodiversity information is received without the required consent:

1. Do not use it to personalise support.
2. Remove or irreversibly redact it as soon as reasonably possible.
3. Where useful and proportionate, contact the respondent without repeating the information and offer the correct consent or information-sharing route.
4. Keep only the minimum administrative record needed to evidence the removal or redaction and any follow-up.
5. Handle safeguarding information separately where required by the Safeguarding Policy or a legal obligation.

## Minimal notification email template

Subject:

> New learner profile received

Body:

> A new learner profile was received at [UTC timestamp].
>
> Open the private response sheet:
> [restricted Google Sheet URL]
>
> This notification intentionally contains no learner or respondent answers.

The email contains no respondent name, learner name, contact details, subjects, needs, EHCP status or other answers.
