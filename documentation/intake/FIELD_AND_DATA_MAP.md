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

- Diagnosed, suspected or assessed needs status: required, single choice.
- Relevant areas: optional, multiple choice, displayed only for diagnosed, suspected or currently assessed needs.
- Helpful support-needs information: optional long text.
- Helpful strategies, adjustments or approaches: optional long text.
- Unhelpful approaches: optional long text.
- Other relevant educational or personal background: optional long text.
- EHCP status: required, single choice.

### Step 4: Initial session preferences

- Session length: required, single choice, including Not sure.
- Session frequency: required, single choice, including Not sure.
- Wider MentorSphere support discussion: optional, single choice.

### Step 5: Review and submit

- Readable review of all entered information with Edit section controls.
- Confirmation that the respondent is authorised to provide the learner's information: required.
- Privacy Policy acknowledgement: required.
- Sensitive-information acknowledgement: required draft, explicitly awaiting owner approval.
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
32. Sensitive-information acknowledgement
33. Acknowledgement wording version
34. Notification status
35. Notification sent at (UTC)

Multi-choice answers are stored as plain text separated by ` | `. Every destination cell is formatted as text, and values beginning with spreadsheet formula characters are prefixed safely before writing.

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
