# Primary learner profile field and data map

Status: V5 behavioural draft for owner review. The page remains live and production submissions remain disabled.

## Final form fields

### Step 1: About you

- Email address: required.
- First name: required.
- Surname: required.
- Relationship to the learner: required, single choice.
- Relationship details: conditionally required when Other is selected.
- Preferred contact methods: required, one or more choices. Values use the fixed order Email, Telephone, Text message, WhatsApp.
- Mobile number: conditionally required whenever Telephone, Text message or WhatsApp is selected; optional when Email is the only selected method. The requirement updates immediately as selections change.
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
- A short just-in-time privacy notice and Privacy Policy link: displayed when Yes is selected.
- Explicit consent: one required checkbox displayed when Yes is selected.
- Learner consent route: one required radio question displayed when Yes is selected. The exact route records either learner authorisation or parental responsibility or documented legal authority.
- Diagnosed, suspected or assessed needs status: optional and displayed only after Yes, explicit consent and a learner consent route are complete.
- Relevant areas: optional, multiple choice, displayed only when the respondent chooses the special-category route and a relevant needs status.
- Helpful support-needs information: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Helpful strategies, adjustments or approaches: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Unhelpful approaches: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- Other relevant educational or personal background: optional long text, displayed and accepted only when the respondent chooses the special-category route.
- EHCP status: optional and displayed only when the respondent chooses the special-category route.
- If No is selected, or consent or the route is removed, the related fields and values are hidden and cleared. The clearing is announced through the form live region.
- For the initial launch, the special-category route is available only where the selected relationship is Parent or Guardian or carer. Education or support professionals, other family members and Other respondents are directed to ask Luke for a separate information-sharing route. Structured and narrative special-category fields are rejected independently by the Worker and Apps Script if the relationship, consent or visibility rules are bypassed.

### Step 4: Initial session preferences

- Session length: required, single choice, including Not sure.
- Session frequency: required, single choice, including Not sure.
- Wider MentorSphere support discussion: optional, single choice.

### Step 5: Review and submit

- Readable review of all entered information with Edit section controls.
- One combined authority and Privacy Policy acknowledgement: required. The single control populates both existing backend fields, `authorised` and `privacyAcknowledged`.
- A concise Part 3 summary records whether optional special-category information was provided, whether explicit consent was recorded and which learner consent route applies. The full consent wording is not repeated.
- Cloudflare Turnstile security token: required and verified server-side.
- Honeypot: hidden and expected to remain blank.

The numbered progress markers are native buttons. The current section uses `aria-current="step"`; completed sections are available for backward navigation; incomplete future sections are disabled. Editing a previously validated section invalidates that section and later progress so required validation cannot be bypassed.

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
11. Preferred contact methods
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

Most multi-choice answers are stored as plain text separated by ` | `. Preferred contact methods use the canonical fixed order and semicolon-separated format `Email; Telephone; Text message; WhatsApp`, including only selected values. Every destination cell is formatted as text, and values beginning with spreadsheet formula characters are prefixed safely before writing.

Columns 32 to 41 record whether special-category information was provided, the Part 3 explicit consent, authority derived from the completed permitted learner route, the learner consent route, their V5 wording versions, the consent timestamp, status and any later withdrawal. Respondent identity is recorded in columns 5 to 9 on the same row. Empty special-category submissions record `No`, use `Not applicable` for consent status and leave the conditional route, wording and timestamp cells blank.

V5 identifiers are:

- Form version: `primary-learner-profile-v5`.
- Explicit consent wording: `explicit-consent-v5-2026-08-01`.
- Learner consent route wording: `learner-consent-route-v5-2026-08-01`.
- Special-category authority wording: `special-category-authority-v5-2026-08-01`.

V4 identifiers remain historical and are not overwritten. V4 payloads fail V5 validation.

## Submission response contract

- A newly written and verified 48-column row returns `success:true`, `stored:true`, `status:"created"` and a Boolean `notificationSent` value.
- A duplicate returns `success:true`, `stored:false`, `status:"duplicate"` and `existingRecordVerified:true` only after the existing Sheet row is verified.
- A cached duplicate marker without a durable row returns `success:false`, `stored:false`, `status:"duplicate_without_record"`.
- The Worker rejects non-2xx responses, unexpected content types, invalid JSON, missing fields and unknown statuses. The browser never infers storage from HTTP status alone.
- The browser request timeout is 30 seconds. Failure preserves the entered answers, returns the submit button to its normal label, resets Turnstile and does not retry or generate another submission ID.

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
