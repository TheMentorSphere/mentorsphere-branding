# Current intake data-protection decision note

Version: 1.0

Assessment date: 25 September 2026

Controller and accountable owner: Luke Turner, The MentorSphere

Status: proposed current framework and owner review record. Owner adoption and residual-risk decisions are pending. This document does not authorise a merge, deployment or change to production processing.

## 1. Scope, evidence and historical boundary

This review covers the live Primary Learner Profile, Secondary Learner Profile and ADHD Coaching Intake. It accompanies proposed Privacy Policy V1.6 and ADHD Coaching Policy V1.4, dated 25 September 2026. The policy-copy audit was recorded before drafting in [the manifest](POLICY_COPY_MANIFEST_2026-09-25.md).

Implementation baseline: `5d7c99fe986fb597c2ce002f800cbbf09139cc0b`. [The implementation audit](INTAKE_IMPLEMENTATION_AUDIT_2026-09-25.md) records read-only production GET checks on 25 September: all three form configurations were enabled and their public HTML, individual clients and shared submission contract matched this baseline after line-ending normalisation. No production submission was made for this policy task. Public GET checks establish the public client and enabled state; they do not independently verify deployed Worker internals, private Apps Script source, Sheet sharing or operational deletion.

The repository Worker, validation, generated Apps Script receivers and schemas are the technical source for the assessed controls. Historical integration and launch evidence corroborates parts of this architecture. PRs [#52](https://github.com/TheMentorSphere/mentorsphere-branding/pull/52) and [#53](https://github.com/TheMentorSphere/mentorsphere-branding/pull/53) record Secondary and ADHD Google integration work. The Secondary close-out at local commit `f7cf072`, path `documentation/intake/SECONDARY_ROLLOUT_CLOSE_OUT.md`, records a successful controlled Secondary receipt and fictional-data cleanup. It is outside the clean baseline and remains historical evidence. A complete final ADHD launch close-out was not found in the clean repository; the current brief and live enabled state must not be misrepresented as a fresh private-backend audit.

The five original Primary records, including `DATA_PROTECTION_DECISION_NOTE.md`, `DATA_PROTECTION_IMPACT_ASSESSMENT.md`, `LEGITIMATE_INTERESTS_ASSESSMENT.md`, `FIELD_AND_DATA_MAP.md` and `PRIVACY_POLICY_AMENDMENT_DRAFT.md`, remain unchanged. Older QA, schema commentary, owner reviews, launch and incident documents describe their own dates, including earlier disabled states. They are not current release instructions. PR #60 and `RECEIPT_TIMEOUT_INVESTIGATION.md` explain the current receipt diagnostic controls.

## 2. Purpose-specific lawful-basis decision proposed for adoption

The same person may supply information about several people. A field being required by software does not itself make its processing legally necessary. Apply the following by person, purpose and actual content.

| Data and use | Article 6 | Article 9 | Decision and limit |
| --- | --- | --- | --- |
| Respondent's own ordinary identity, contact details and minimum request information needed for a requested possible service contract | 6(1)(b) | Not applicable | Applies to steps the respondent requests for their own prospective contract. Do not extend this to a child's information merely because the parent may pay. |
| Necessary ordinary learner or third-party identity, education context, subjects/exam boards, or limited relevant household context for requested support planning | 6(1)(f) | Not applicable | Apply the relevant child/third-party LIA, minimisation and right to object. Incidental third-party detail that is unnecessary should be removed. |
| Optional ordinary background or preferences supplied solely for additional personalisation beyond necessary pre-contract steps | 6(1)(a) | Not applicable | Use only within the clear optional purpose and actual consent. Voluntary completion with the just-in-time notice can evidence ordinary consent; the required privacy acknowledgement alone cannot. |
| Optional health, disability, SEND, neurodiversity, diagnosis/status or health-revealing narrative for personalisation | 6(1)(a) | 9(2)(a) | The explicit-consent route meets a separate Article 6 requirement and an Article 9 condition. Neither contract nor legitimate interests makes Article 9 unnecessary. |
| Minimal consent, authority, withdrawal, objection and retention evidence needed to demonstrate data-protection compliance | 6(1)(c), where necessary for applicable UK GDPR accountability duties, including Articles 5(2), 7(1), 12 to 22 and 24 | Not ordinarily required for an answer-free administrative record | Keep only the evidence needed for the duty; avoid repeating sensitive answers. Record a separate Article 9 condition if the evidence itself reveals sensitive content. |
| Limited technical anti-abuse and receipt diagnostics | 6(1)(f) | Not applicable to designed answer-free events | Necessary security/reliability interest; minimise fields, restrict access, review retention and honour applicable objections. Do not log answers. |
| A distinct safeguarding or legal matter | Identify for the actual purpose | Identify separately if needed | No blanket exemption. Record the relevant statutory duty or other Article 6 basis and Article 9 condition, including any required DPA 2018 condition, before separate retention or sharing. |

This narrows the basis claimed for optional personalisation. It does not suggest every optional answer is sensitive, every necessary field uses contract, or the consent checkbox authorises unrelated future purposes. An ordinary educational-stage answer may be ordinary; a narrative revealing a health condition must follow the sensitive route regardless of the field label.

The existing explicit statements name The MentorSphere, the optional sensitive information, preparation/personalisation purposes and withdrawal route. They are unticked and separated from the required authority/privacy acknowledgement. They can support both 6(1)(a) and 9(2)(a) without adding another checkbox, provided consent is informed, freely given, specific and valid for the person concerned. The updated notice makes that legal pairing clear. Combined ADHD intake keeps adult and child consent distinct. This assessment does not alter controls, wording versions, payloads or schemas.

## 3. Existing records and publication transition

This is a proposed clarification for future processing, not permission to retrospectively change the basis recorded for existing submissions. The original Primary Article 6 record addressed necessary respondent information and ordinary learner/third-party information, with a separate Article 9 consent condition. It did not explicitly settle every optional field's Article 6 basis.

Before adopting this framework for existing records, Luke must review the notice and consent wording actually supplied at collection, the selected route, authority, purpose and continuing need. Preserve the original form/notice versions and receipt evidence. Record the controller's decision and adoption date separately, give updated privacy information where needed, and seek fresh or clarified consent where the existing evidence does not support continued optional use. Do not silently relabel historical rows or treat publication as curing any earlier transparency gap. Pending a valid basis, do not use disputed optional information for personalisation.

Consent withdrawal must never trigger a switch to legitimate interests or contract to continue the same optional purpose. Any separate safeguarding/legal retention needs its own documented justification and transparent explanation.

## 4. Children, authority and involvement

The forms are adult-respondent pathways. The learner remains a data subject with their own rights. Obtain age-appropriate privacy understanding and meaningful involvement; a respondent's tick does not prove legal authority or the learner's capacity. Where a capable learner objects, appears distressed or contradicts the adult's account, pause optional use and resolve the issue in the learner's interests.

Primary V5 records authority through its permitted learner route and derived authority value. Secondary displays separate consent, parental responsibility/documented legal authority and learner-route controls. ADHD child/combined routes also use three controls. Do not describe them as identical interfaces. Primary and Secondary restrict their sensitive pathway to Parent or Guardian or carer. ADHD requires the parent/carer to affirm parental responsibility or documented legal authority. Others must use a separately documented sharing route, where appropriate.

The ADHD direct young-person service boundary is ages 10 to 17; it is not a capacity test. UK rules distinguish understanding from age. Scotland has a rebuttable presumption at 12; elsewhere understanding is assessed contextually. Article 8's under-13 parental rule applies to consent-based information society services offered directly to children. The owner must record its applicability to the actual online service, including the children's code where relevant; adult completion of an intake does not automatically exempt the wider service. Verify authority proportionately when needed, without routinely collecting identity documents.

For information received from an adult about a learner or another person, actively provide suitable privacy information. Arrange this within the Article 14 timetable, normally within one month and earlier at first relevant communication or disclosure, unless a documented exception applies. Sharing a public policy link with the adult alone is not conclusive evidence that the learner was informed. Keep a minimal record of explanation, understanding, any concern and its resolution.

## 5. Shared processing, diagnostics and retention

Assessed flow: browser; Cloudflare-hosted site and Turnstile; server validation; authenticated Worker transfer; independent Google Apps Script validation; restricted Google Workspace Sheet; fixed, answer-free notification email. Primary, Secondary and ADHD have 48, 52 and 54 columns respectively. This task neither opens production answer rows nor changes any integration.

Answers are not intentionally put into URLs, localStorage/sessionStorage or application diagnostic logs. Receipt failures use a fixed event plus request/reference ID, error code, processing stage and duration. Pre-forward rejection diagnostics can also include time, HTTP status and safe validation/Turnstile-result indicators. Submitted answers, names, email/telephone details, raw token, signature, secrets, raw exceptions and response bodies are excluded by the designed application logs. Do not claim that Cloudflare or Google never creates infrastructure logs. Diagnostic references remain potentially linkable operational data, with access and retention needing review.

Receivers initialise prospective status, last meaningful contact at receipt, a six-calendar-month review date and no hold. They do not automatically delete old records. Luke must review due prospective records at least monthly, update meaningful contact and the review date, and normally delete six months after the last meaningful contact if no service starts. Active records follow the applicable client-record arrangements; tests, duplicates and unnecessary records are removed promptly. Any safeguarding/legal hold needs a specific reason, minimal content and review date.

Withdrawal requires stopping the affected optional use, updating the relevant subject's consent status/date and removing or irreversibly redacting affected structured and free-text content, including mixed combined-route text. Keep only justified administrative evidence. Handle accidental sensitive disclosures without valid consent the same way: do not use them for personalisation, remove/redact promptly, and separate any genuine safeguarding/legal purpose. A browser clearing action is not deletion of an already-submitted record.

## 6. Required owner decisions and verification

| Action | Current position and completion evidence needed |
| --- | --- |
| Adopt the proposed bases and policies | Pending owner decision on V1.6/V1.4 and the four new assessments. Record decision/date; this document is not an approval. |
| Review existing consents | Check pre-update records against section 3; record any new explanation/consent without overwriting collection evidence. |
| Confirm production access | In each Sheet and containing folder, confirm restricted link access and list authorised accounts privately. Confirm account security and least privilege. Do not put identities or Sheet IDs into this repository. |
| Confirm receiver/source match | Check deployed Google revision against the reviewed 52/54-column receiver and current Worker release evidence. A public form being enabled cannot establish this. |
| Confirm retention operation | Confirm a due-record view and monthly owner review for all three Sheets; check last-contact dates/status/holds. No new production trigger is implied. |
| Confirm supplier and diagnostic controls | Check applicable Cloudflare/Google processor terms, transfer safeguards, account-region limits and log access/retention. Do not promise UK-only hosting or a diagnostic deletion period without evidence. |
| Confirm child transparency and authority | Use the introductory contact to check understanding/wishes and resolve authority doubts; record the ISS/children's-code applicability decision and proportionate safeguards. |

No residual high risk is identified on the documented architecture **if the assessed safeguards operate as described**. Medium risks and unverified operational assumptions remain for owner acceptance and evidence. If an essential safeguard is absent, reassess affected processing immediately. If high residual risk cannot be reduced, obtain ICO consultation before that processing proceeds; owner acceptance alone cannot authorise it.

## 7. Authoritative sources checked on 25 September 2026

| Source | Relevance |
| --- | --- |
| [ICO: Contract](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/contract/) | Necessary steps requested by that individual; another person's contract is insufficient. |
| [ICO: Legitimate interests](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/) and [applying the test](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/) | Purpose, necessity and balancing. Guidance updated 23 March 2026. |
| [ICO: Special-category rules](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/) | Separate Article 6 basis and Article 9 condition. |
| [ICO: Valid consent](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/what-is-valid-consent/) and [consent management](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/) | Active, informed choice; evidence, withdrawal and no retrospective basis-switching to defeat it. |
| [ICO: Children's lawful bases](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/) and [children's rights](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-data-protection-rights-do-children-have/) | Child-specific weighting, capacity, authority, autonomy and transparency. The children guidance was updated 15 May 2026. |
| [ICO: Right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/) and [right to object](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-object/) | Information for third-party data subjects and case-specific objections. |
| [ICO: DPIA screening](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/) and [ICO consultation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/do-we-need-to-consult-the-ico/) | Vulnerability, sensitive information, suitability decisions and unresolved high residual risk. |
| [ICO: Storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Necessity-based periods and periodic review. Six months is the business's intake rule, not a universal statutory period. |
| [GOV.UK: DUAA commencement](https://www.gov.uk/guidance/data-use-and-access-act-2025-plans-for-commencement) and [UK GDPR consolidated text](https://www.legislation.gov.uk/eur/2016/679/contents) | Most Part 5 data-protection amendments commenced 5 February 2026. The new recognised-legitimate-interest basis does not replace the Article 6(1)(f) balancing test for ordinary coaching/tutoring intake. |

Some ICO contract, consent, special-category and DPIA pages still carry DUAA review notices. The current updated children's and legitimate-interest guidance was checked alongside them. Direct legislation article rendering was limited by the retrieval service; official indexed consolidated text corroborated the Article 6/9 separation and 2026 amendments. Recheck guidance if owner approval is delayed or the proposed processing changes. The conclusions here are a controller decision proposed from those sources and the actual form purposes, not a claim of ICO approval.

## 8. Governance links and review

- [Secondary DPIA](SECONDARY_DATA_PROTECTION_IMPACT_ASSESSMENT.md)
- [Secondary LIA](SECONDARY_LEGITIMATE_INTERESTS_ASSESSMENT.md)
- [ADHD DPIA](ADHD_DATA_PROTECTION_IMPACT_ASSESSMENT.md)
- [ADHD child/third-party LIA](ADHD_CHILD_THIRD_PARTY_LEGITIMATE_INTERESTS_ASSESSMENT.md)

Review at least annually, and before changes to fields, purposes, audiences, consent, processors, sharing, retention, automated decisions or marketing. Review promptly after an objection, incident or evidence that a safeguard does not operate. Owner decision, date and action evidence: **pending**.
