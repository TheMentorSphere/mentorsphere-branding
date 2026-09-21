# adhd-coaching-intake: proposed private storage

53 columns. Separate Sheet and standalone Apps Script project, HMAC secret and endpoint from Primary and the other new form. No production storage is provisioned by this change.

| Column | Heading |
| --- | --- |
| 1 | Submission ID |
| 2 | Worker accepted at (UTC) |
| 3 | Google received at (UTC) |
| 4 | Form version |
| 5 | Respondent first name |
| 6 | Respondent surname |
| 7 | Respondent email |
| 8 | Contact number |
| 9 | Preferred contact methods |
| 10 | Support for |
| 11 | ADHD status |
| 12 | ADHD status details |
| 13 | Adult current difficulties |
| 14 | Adult difficulty details |
| 15 | Coaching priority |
| 16 | Coaching priority details |
| 17 | Child name |
| 18 | Educational stage |
| 19 | Educational stage details |
| 20 | Known or suspected neurodivergence |
| 21 | Neurodivergence details |
| 22 | Child current difficulties |
| 23 | Child difficulty details |
| 24 | Household context |
| 25 | Household context details |
| 26 | Daily impact |
| 27 | Daily impact details |
| 28 | Parent support preferences |
| 29 | Parent support details |
| 30 | Additional relevant information |
| 31 | Ordinary information authority |
| 32 | Privacy acknowledgement |
| 33 | Adult explicit consent |
| 34 | Adult consent wording version |
| 35 | Adult consent recorded at (UTC) |
| 36 | Adult consent status |
| 37 | Adult consent withdrawn at (UTC) |
| 38 | Child explicit consent |
| 39 | Child consent wording version |
| 40 | Child consent recorded at (UTC) |
| 41 | Parental responsibility or documented authority |
| 42 | Authority wording version |
| 43 | Learner consent route |
| 44 | Learner consent route wording version |
| 45 | Child consent status |
| 46 | Child consent withdrawn at (UTC) |
| 47 | Notification status |
| 48 | Notification sent at (UTC) |
| 49 | Record status |
| 50 | Last meaningful contact date |
| 51 | Retention review date |
| 52 | Safeguarding or legal hold |
| 53 | Retention notes |

All cells are written as plain text and formula-leading values are escaped. Consent timestamps are recorded by the receiving backend in UTC at acceptance; wording versions identify the displayed consent. Notifications contain only the received timestamp and private Sheet link. TEST_MODE suppresses mail. Withdrawal columns are operational records, not client input. The six-month prospective-record review date follows the existing intake retention workflow.
