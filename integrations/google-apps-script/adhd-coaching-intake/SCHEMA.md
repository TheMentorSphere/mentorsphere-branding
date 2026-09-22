# adhd-coaching-intake: proposed private storage

54 columns. Separate Sheet and standalone Apps Script project, HMAC secret and endpoint from Primary and the other new form. No production storage is provisioned by this change.

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
| 18 | Child age in completed years |
| 19 | Educational stage |
| 20 | Educational stage details |
| 21 | Known or suspected neurodivergence |
| 22 | Neurodivergence details |
| 23 | Child current difficulties |
| 24 | Child difficulty details |
| 25 | Household context |
| 26 | Household context details |
| 27 | Daily impact |
| 28 | Daily impact details |
| 29 | Parent support preferences |
| 30 | Parent support details |
| 31 | Additional relevant information |
| 32 | Ordinary information authority |
| 33 | Privacy acknowledgement |
| 34 | Adult explicit consent |
| 35 | Adult consent wording version |
| 36 | Adult consent recorded at (UTC) |
| 37 | Adult consent status |
| 38 | Adult consent withdrawn at (UTC) |
| 39 | Child explicit consent |
| 40 | Child consent wording version |
| 41 | Child consent recorded at (UTC) |
| 42 | Parental responsibility or documented authority |
| 43 | Authority wording version |
| 44 | Learner consent route |
| 45 | Learner consent route wording version |
| 46 | Child consent status |
| 47 | Child consent withdrawn at (UTC) |
| 48 | Notification status |
| 49 | Notification sent at (UTC) |
| 50 | Record status |
| 51 | Last meaningful contact date |
| 52 | Retention review date |
| 53 | Safeguarding or legal hold |
| 54 | Retention notes |

All cells are written as plain text and formula-leading values are escaped. Consent timestamps are recorded by the receiving backend in UTC at acceptance; wording versions identify the displayed consent. Notifications contain only the received timestamp and private Sheet link. TEST_MODE suppresses mail. Withdrawal columns are operational records, not client input. The six-month prospective-record review date follows the existing intake retention workflow.
