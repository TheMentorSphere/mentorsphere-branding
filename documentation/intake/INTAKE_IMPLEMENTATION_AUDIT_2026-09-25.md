# Intake implementation evidence, 25 September 2026

Status: read-only implementation audit supporting the policy and governance review. Starting production/main SHA: `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`. Prepared after the [policy-copy manifest](POLICY_COPY_MANIFEST_2026-09-25.md) was recorded. This is a current evidence note, not a replacement for historical launch, QA or incident records.

## Direct public-production verification

Read-only HTTPS GETs to `https://www.thementorsphere.co.uk` returned the following on 25 September 2026. No form was submitted, no POST was made and no Cloudflare, Google, release or integration configuration was changed.

| Form page path | HTTP | Public configuration path | HTTP / enabled | Returned action |
| --- | --- | --- | --- | --- |
| `/forms/primary-learner-profile/` | 200 | `/api/forms/primary-learner-profile/config` | 200 / true | `primary_learner_profile` |
| `/forms/secondary-learner-profile/` | 200 | `/api/forms/secondary-learner-profile/config` | 200 / true | `secondary_learner_profile` |
| `/forms/adhd-coaching-intake/` | 200 | `/api/forms/adhd-coaching-intake/config` | 200 / true | `adhd_coaching_intake` |

All three fetched page bodies exactly matched their clean-main `docs/forms/.../index.html` files after CRLF/LF normalisation. The following public assets also returned 200 and exactly matched the clean-main files after the same normalisation:

- `/assets/js/intake-form.js`
- `/assets/js/secondary-intake-form.js`
- `/assets/js/adhd-intake-form.js`
- `/assets/js/intake-submission-contract.js`

This directly verifies the public markup, client behaviour implemented in those assets, and enabled configuration responses. It does not independently prove today's deployed Worker source hash, Apps Script immutable deployment source, private Sheet sharing permissions, notification delivery, retention actions or complete end-to-end submission. No private response records were inspected by this audit. Those distinctions must remain visible when relying on the evidence below.

## Current form contracts and fields

Repository contracts are Primary `primary-learner-profile-v5`, Secondary `secondary-learner-profile-v1` and ADHD `adhd-coaching-intake-v1`. Their submission paths are the public configuration paths above with `/config` removed. This note intentionally omits private receiver URLs, identifiers, keys, signatures and credentials.

| Data class | Primary and Secondary | ADHD |
| --- | --- | --- |
| Respondent | Name, email, relationship, selected contact methods, conditionally required contact number, optional suitable contact times | Name, email, selected contact methods, conditionally required contact number, support route |
| Ordinary learner details | First name, surname, date of birth, year group/context, selected subjects and Other details | Child/combined routes: name, age in completed years, educational stage and optional Other details |
| Secondary difference | Years 7 to 11 or Other/non-standard year; optional subject-specific exam board for English, Maths, Science and Other | Not applicable |
| Optional sensitive/context fields | Needs status, relevant areas, support needs, helpful strategies, unhelpful approaches, other educational/personal background and EHCP status | Adult: ADHD status, difficulties, priority and Other details. Child: known/suspected neurodivergence or related support needs, difficulties and Other details. Parent: household context, daily impact, helpful support areas and Other details |
| Preferences | Session length/frequency and optional wider-support discussion; the latter is expressly an enquiry preference, not marketing consent | Optional relevant Additional Information, including accessibility/communication preferences, at most 5,000 characters |
| Administration | Submission/form identifiers, acceptance and receipt times, consent/authority records, notification and retention administration | Same classes, with separate own-information and child consent/withdrawal records |

Primary has 48 stored columns, Secondary 52 and ADHD 54. Primary offers Reception to Year 6 plus home-education/non-formal year and Other routes; Secondary has its own year-group choices and optional exam boards. Primary session length/frequency use single choices; Secondary preserves multiple selections. Removing a Secondary subject clears its exam board; changing Other subject/board selections clears irrelevant custom text. Do not describe an optional exam board as required.

Sources: [Primary validation](../../src/intake/validation.ts), [Secondary validation](../../src/intake/secondary-validation.ts), [ADHD validation](../../src/intake/adhd-validation.ts), [Secondary schema](../../integrations/google-apps-script/secondary-learner-profile/schema.json), [ADHD schema](../../integrations/google-apps-script/adhd-coaching-intake/schema.json), and the live-matched form/client files.

## Consent, authority and young-person controls

The Primary and Secondary optional sensitive route is limited to the selected relationship `Parent` or `Guardian or carer`. Other respondents can submit ordinary information but are told to arrange an appropriate separate sharing route. Secondary also includes Medical or health professional, Friend and Employer among its ordinary respondent relationships. A relationship label is not itself proof of parental responsibility or legal authority.

Both learner profiles first ask whether optional health, disability, SEND or neurodiversity information is to be supplied. Respondents may choose No and still submit. Sensitive fields are hidden and cleared when the relevant route becomes incomplete or disallowed. Both server validators and Apps Script receivers independently enforce the known sensitive-field and relationship requirements; unknown fields are not forwarded in the allowlisted submission object. This does not detect every sensitive fact typed into an ordinary text field, so accidental disclosure still needs human review, non-use for personalisation without valid consent, and removal/redaction unless a separate lawful safeguarding/legal purpose applies.

The live controls are not identical across the learner profiles:

- Primary V5 displays explicit consent and a learner consent-route choice. Its client derives the stored `specialCategoryAuthority` value from the sensitive-information choice, explicit consent and selected learner route (`intake-form.js`, payload construction). It does not display an additional separate sensitive-information authority checkbox. The final ordinary-information authority/privacy acknowledgement remains separate.
- Secondary displays explicit consent, a separate parental-responsibility/documented-legal-authority confirmation, and the learner consent-route choice. All are required for sensitive fields.
- ADHD child/combined uses the same three substantive controls as Secondary. Adult/parent own-information consent is a separate checkbox.

The exact learner consent-route choices shared by the forms are:

1. "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf."
2. "The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority."

The pages say selecting a learner route confirms relevant privacy information has been given in a way appropriate to age and understanding. ADHD explicitly says there is no blanket age/capacity assumption. These are respondent attestations, not an automated assessment of the young person's capacity or actual authority. Age-appropriate involvement, wishes, accuracy and suitability require Luke's judgement.

## ADHD routes and clearing behaviour

The exact current public choices are:

| Stored route | Public label | Permitted optional context |
| --- | --- | --- |
| `adult` | Myself: adult coaching (18 or over) | Respondent's own adult context, with own-information consent |
| `child` | My child/teen: coaching (ages 10 to 17) | Child context, with all child consent/authority controls |
| `parent` | Myself as a parent/carer | Respondent's own parent/carer context, with own-information consent |
| `combined` | Child/teen (ages 10 to 17) plus parent/carer support | Separate child and parent context, each with its applicable consent controls |

The form expressly says completion is entirely optional and is not required to access a discovery call. It describes practical coaching, not therapy, diagnosis, medical treatment or crisis support. No diagnosis is required, and self-identification is distinguished from clinical diagnosis.

Child/combined submissions require an integer age from 10 to 17, a name and educational stage. The browser, Worker validator and generated receiver enforce this rule. The HTML number input's broad native limits are supplemented by the client route validation. Under-10 and age-18-or-over guidance offers appropriate parent/adult routes; this service eligibility rule does not decide legal capacity. A young person seeking support directly is told to contact Luke about the appropriate route.

The parent-only route does not request a child's name, age, diagnosis or other direct identifier. It tells respondents to share their own information and not children's or other people's diagnoses/health information. Household categories can still disclose ordinary third-party context indirectly; it should remain minimal and relevant. The consent gate does not turn every household/practical answer into special-category data or authorise another person's health information.

Client `updateBranches()` clears fields from irrelevant branches immediately on a route change. It clears Additional Information on every route change because the permitted disclosure subject can change. The own-information consent control is shared/moved between the relevant adult/parent steps and can remain selected where still applicable; do not claim every consent resets on every route change. Revoking a required consent/authority/learner choice hides and clears the corresponding sensitive fields. Additional Information requires own-information consent for adult/parent, all child controls for child, and both complete consent sets for combined. Guidance limits Additional Information to those consented people. Worker and Apps Script validators reject irrelevant route content or known sensitive content without the corresponding gate.

Sources: [ADHD page](../../docs/forms/adhd-coaching-intake/index.html), [ADHD client](../../docs/assets/js/adhd-intake-form.js), [ADHD validator](../../src/intake/adhd-validation.ts).

## Processing, storage and operational security

Repository implementation follows browser JSON POST to the same-origin Cloudflare Worker, server-side schema and Turnstile verification, authenticated HMAC transfer to the form's Google Apps Script receiver, private Google Workspace Sheet storage, and a minimal email notification. The Worker sends the connecting IP to Turnstile when available. The IP and Turnstile token are not included in the allowlisted submission forwarded for Sheet storage.

The Worker checks same origin, content type, bounded request size, form version, schema, submission identity, honeypot and Turnstile action/hostname. Secondary and ADHD bindings fail closed if required credentials are absent or private endpoint/HMAC values are reused across forms. Runtime public `enabled:true` supports that their configured release checks pass; it does not reveal the private values or prove their access controls.

The receivers validate the authenticated fresh envelope and payload again. They use a script lock, write plain-text cells, escape formula-leading characters, flush and read back durable storage. Secondary/ADHD compare stored payload and absence of formulas before success and before accepting an exact-ID duplicate; conflicting duplicates fail closed. An exact verified duplicate does not append a second row or send a second notification. Duplicate protection is by submission identity and verified payload, not general deduplication of every repeated person or every new submission ID.

Notifications contain a receipt time and private Sheet link, with fixed supporting text and no submitted answers. Secondary/ADHD preserve a confirmed accepted-storage receipt even if notification fails and record notification status on a best-effort basis. Primary retains its separate historical receiver implementation; do not claim the later post-commit fixes changed it. The preserved Secondary close-out explicitly leaves Primary post-storage receipt semantics as a separate follow-up.

Answers are sent in JSON bodies, not query strings. Inspection found no localStorage/sessionStorage use or answer console logging in the three clients. Source restricts application diagnostics as described below. This is not a claim that browsers, Cloudflare, Google or other infrastructure never retain their own technical logs, nor a fresh confirmation of private Sheet ACLs.

Sources: [Worker](../../src/worker.ts), [transport](../../src/intake/submission.ts), [Secondary bindings](../../src/intake/secondary.ts), [ADHD bindings](../../src/intake/adhd.ts), [Primary receiver](../../integrations/google-apps-script/primary-learner-profile/Code.gs), [Secondary receiver](../../integrations/google-apps-script/secondary-learner-profile/Code.gs), [ADHD receiver](../../integrations/google-apps-script/adhd-coaching-intake/Code.gs).

## Safe diagnostics and human decisions

Current [diagnostic source](../../src/intake/diagnostics.ts) allowlists two application events:

- Pre-forward rejection: event, request ID, fixed error/stage codes, HTTP status, timestamp, parsing/schema completion flags, Turnstile attempted/success state, allowlisted Turnstile error codes, hostname/action comparison results and whether forwarding was attempted.
- Receipt failure introduced by [PR #60](https://github.com/TheMentorSphere/mentorsphere-branding/pull/60): event, request ID, fixed error code, processing stage and elapsed duration.

These records are designed to exclude submitted answers, respondent/learner names, email/telephone details, raw exception messages, response bodies, private URLs, Turnstile tokens, HMAC signatures, credentials and secrets. The production repository config enables sampled application logs at 10% and disables invocation logs. Do not promise either complete diagnostics coverage or no infrastructure logs. A diagnostic reference may still relate to a request and needs proportionate access and retention controls.

Form validation, age routing, anti-abuse checks and duplicate handling are automated operational controls. Inspection found no automated diagnosis, clinical assessment, scoring of need, safeguarding decision or substantive decision about accepting a person for service. Human review and an introductory discussion are needed for suitability, adjustments, inaccurate/excessive information, authority concerns, withdrawal, safeguarding and retention. No source-based claim should imply the age gate itself assesses legal capacity.

## Retention: initialisation is automated, review/deletion is manual

All three receiver schemas initialise a row as `Prospective`, set last meaningful contact to the received date, calculate a review date six calendar months later, set the safeguarding/legal hold to `No`, and leave retention notes empty. This is a review-date calculation, not automatic deletion or an automatic determination that later contact was meaningful.

The established [Primary field/data map](FIELD_AND_DATA_MAP.md), especially its monthly retention-review section, requires owner review at least monthly. Luke must update the last meaningful contact and review date, move an active relationship into the applicable client-record arrangements, remove test/duplicate/unnecessary records promptly, and retain an applicable safeguarding/legal hold separately. The same operational framework is appropriate for the new-form administrative fields. No scheduled deletion function or trigger is provided in the inspected receiver source. This audit did not verify a saved retention filter, monthly review completion, deletion history, backup/version-history deletion, or an automated deletion service on the new production Sheets.

Prospective responses where no service begins are normally deleted six months after last meaningful contact; active client records follow their applicable record-retention rules. The implementation supports that policy through fields, but delivery depends on the owner-operated review and deletion process. Withdrawal status and dates likewise require a human process; there is no self-service withdrawal endpoint in these forms.

## Launch evidence and limits

- Historical Primary `PRODUCTION_LAUNCH_RECORD.md`, QA and DPIA records include July/August preparation-state references to disabled flags and unpublished V1.5. They are preserved; they do not contradict today's live GET results because they record earlier stages.
- `SECONDARY_OWNER_REVIEW.md`, `SECONDARY_QA_REPORT.md`, `ADHD_OWNER_REVIEW.md`, `ADHD_QA_REPORT.md` and generated schema/setup prose describe preview/preproduction stages. Their local-adapter and simulated-preview checks are not themselves proof of Google-hosted production delivery.
- [PR #52](https://github.com/TheMentorSphere/mentorsphere-branding/pull/52) records corrected Secondary Apps Script version 3 and prior isolated Google readback/duplicate/notification-failure verification. Preserved local commit `f7cf072` contains `documentation/intake/SECONDARY_ROLLOUT_CLOSE_OUT.md` (24 September). That close-out records the supplied verified Secondary HTTP 201/created/stored result, formula-like literal handling, storage and notification verification, exact fictional-row/email cleanup and return to zero responses. This commit is outside the starting main tree and has not been copied, rewritten or treated as today's independent Google inspection.
- [PR #53](https://github.com/TheMentorSphere/mentorsphere-branding/pull/53) records ADHD receiver version 3 matching merged PR #50, a non-writing signed verification at 12:49 UTC on 24 September, an exact 54-column production Sheet, isolated bindings and no test/failure flags. Later launch attempts and the [receipt-timeout investigation](RECEIPT_TIMEOUT_INVESTIGATION.md) remain historical evidence, including the distinction between confirmed storage and an unconfirmed browser receipt.
- [PR #60](https://github.com/TheMentorSphere/mentorsphere-branding/pull/60) records bounded receipt timing and safe diagnostics; it did not change the production receivers, form controls or schemas. Its isolated real-Google timing evidence must not be described as a full production launch test.
- [PR #61](https://github.com/TheMentorSphere/mentorsphere-branding/pull/61), merged into the starting SHA on 24 September, enabled the fourth controlled ADHD launch attempt. Its body records the authorised verification plan, not the final outcome. No final ADHD outcome was present in its comments or the clean-main launch documents inspected. The owner's current brief confirms all three forms are live, and today's GETs independently confirm enabled public pages/configurations. No new submission was needed or attempted for this documentation task.

Owner review should confirm ongoing restricted Sheet access, monthly retention/withdrawal administration, processor/account safeguards and any separately held final ADHD launch evidence. These verification limits are not permission to change production configuration, inspect unrelated client data or recreate a launch test.

## Form-policy references and change boundary

All three form pages link to `../../privacy-policy/` without hard-coded V1.5/V1.3 text. Their links remain accurate when the policy at that location is updated. No form-page edit is required merely to publish the new version. This audit makes no form, client, schema, Worker, Apps Script, Turnstile, release-flag, endpoint, secret or production change.
