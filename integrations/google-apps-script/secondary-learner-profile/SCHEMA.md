# secondary-learner-profile: proposed private storage

52 columns. Separate Sheet and standalone Apps Script project, HMAC secret and endpoint from Primary and the other new form. No production storage is provisioned by this change.

| Column | Heading |
| --- | --- |
| 1 | Submission ID |
| 2 | Worker accepted at (UTC) |
| 3 | Google received at (UTC) |
| 4 | Form version |
| 5 | Respondent email |
| 6 | Respondent first name |
| 7 | Respondent surname |
| 8 | Relationship to learner |
| 9 | Relationship details |
| 10 | Mobile number |
| 11 | Preferred contact methods |
| 12 | Suitable contact times |
| 13 | Learner first name |
| 14 | Learner surname |
| 15 | Learner date of birth |
| 16 | Year group or equivalent |
| 17 | Year group details |
| 18 | Subjects requiring support |
| 19 | Other subject |
| 20 | English exam board |
| 21 | Maths exam board |
| 22 | Science exam board |
| 23 | Other subject exam board |
| 24 | Needs status |
| 25 | Relevant need areas |
| 26 | Support needs information |
| 27 | Helpful strategies |
| 28 | Unhelpful approaches |
| 29 | Other educational or personal background |
| 30 | EHCP status |
| 31 | Preferred session length |
| 32 | Preferred session frequency |
| 33 | Wider MentorSphere support discussion |
| 34 | Authorised confirmation |
| 35 | Privacy acknowledgement |
| 36 | Special-category information provided |
| 37 | Explicit consent |
| 38 | Explicit consent wording version |
| 39 | Consent recorded at (UTC) |
| 40 | Parental responsibility or documented authority |
| 41 | Authority wording version |
| 42 | Learner consent route |
| 43 | Learner consent route wording version |
| 44 | Special-category consent status |
| 45 | Consent withdrawn at (UTC) |
| 46 | Notification status |
| 47 | Notification sent at (UTC) |
| 48 | Record status |
| 49 | Last meaningful contact date |
| 50 | Retention review date |
| 51 | Safeguarding or legal hold |
| 52 | Retention notes |

All cells are written as plain text and formula-leading values are escaped. Consent timestamps are recorded by the receiving backend in UTC at acceptance; wording versions identify the displayed consent. Notifications contain only the received timestamp and private Sheet link. TEST_MODE suppresses mail. Withdrawal columns are operational records, not client input. The six-month prospective-record review date follows the existing intake retention workflow.
