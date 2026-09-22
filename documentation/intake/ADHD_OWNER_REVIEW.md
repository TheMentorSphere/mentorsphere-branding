# ADHD Coaching Intake V1: owner review

Status: draft, owner-preview only. Production page and submission controls must remain false until separate approval. No public navigation or sitemap entry is added. The page is `noindex,nofollow,noarchive`.

Preview: https://mentorsphere-adhd-owner-preview.luke-f8c.workers.dev/forms/adhd-coaching-intake/

The preview uses Cloudflare test keys and simulated outcomes only, with no saved responses or email. The real HMAC/Apps Script durable contract is tested separately through temporary disk-backed storage that is deleted after each test. Google-hosted permissions, persistence and notification delivery remain unverified and must be tested with fictional data before production release.

## Sources and scope

The authoritative content source is the nine-page **The ADHD Mentor - Intake Form (Optional) - Google Forms.pdf**, supplied on 21 September 2026. Its 18 questions and branching inform this intake. The source PDF contains no instruction to change production services or systems. The live Primary V5 form is the implementation reference.

The Primary page, JavaScript, shared stylesheet and submission contract are unchanged. This form imports the existing `intake-submission-contract.js` and references the existing `intake-forms.css`. Its separate client follows the proven Primary validation, review, request, status and Turnstile lifecycle patterns. The narrow copy of interface orchestration avoids a shared-code refactor that would risk changing the working Primary form. ADHD-specific route, disclosure and review code remains separate.

The new client additionally validates ordinary required fields in all relevant wizard steps at final submission, including steps currently hidden by navigation. It skips fields only when their branch or disclosure gate is hidden. This does not alter Primary behaviour.

## Step structure and branching

```text
About you: ordinary respondent/contact details and support route
|
+-- Myself: adult coaching (18 or over)
|   +-- Coaching context: explicit own-information consent, optional adult questions
|   +-- Additional information: optional consented free text
|   +-- Review and submit
|
+-- My child/teen
|   +-- Coaching context: age/name/stage, child consent/authority, optional child questions
|   |   +-- Parent support also wanted? Yes changes route to combined
|   +-- Additional information: optional consented child information
|   +-- Review and submit
|
+-- Myself as a parent/carer
|   +-- Parent/carer context: explicit own-information consent, optional parent questions
|   +-- Additional information: optional consented own information
|   +-- Review and submit
|
+-- Child/teen plus parent/carer support
    +-- Coaching context: ordinary child details, child consent and questions
    +-- Parent/carer context: separate own-information consent and questions
    +-- Additional information: enabled only with both sets of consent complete
    +-- Review and submit
```

Adult, child and parent routes contain four visible steps. The combined route contains five. Progress numbering adapts to the route. Completed-step navigation is invalidated when earlier answers change. Switching routes clears irrelevant fields immediately. The additional text is cleared on every route change because the permitted subject of disclosure may have changed.

## Final field list

Required means required only if the person chooses to submit this entirely optional form. Completing it is not required to access a discovery call. Brief answers and alternative formats are explicitly welcomed.

| Scope | Fields | Requirement |
| --- | --- | --- |
| Every route | First name; surname; email address; preferred contact methods; telephone/mobile number; support route | Names, email, contact selection and route required. Number required only for Telephone, Text message or WhatsApp. |
| Adult | Current ADHD status; Other status; current difficulties; Other difficulties; main coaching priority; Other priority | All optional, revealed after own-information consent. |
| Child/combined ordinary details | Child/young person's age in completed years; name; educational stage; Other educational stage; whether parent support is also wanted | Age (10 to 17), name and stage required; Other stage text optional. The parent support selector updates the support route, without a duplicate stored answer. |
| Child/combined sensitive context | Known/suspected neurodivergence or related support needs; Other needs; current support difficulties; Other difficulties | All optional after all three child consent controls. |
| Parent/combined | Household context; Other household context; daily impact; Other daily impact; helpful support areas; Other support areas | All optional after own-information consent. No child name, diagnoses or identifiers requested on the parent-only route. |
| Every route | Additional information | Optional, gated by the relevant consent(s), maximum 5,000 characters. |
| Relevant routes | Own-information explicit consent; child explicit consent; parental responsibility/legal authority; learner consent route | Separate affirmative controls. Can all be omitted to send only ordinary information. |
| Final review | Ordinary-information authority and Privacy Policy acknowledgement; Turnstile | Required to submit. Does not repeat or replace branch-specific sensitive-data consent. |

Contact choices are Email, Telephone, Text message and WhatsApp, in the canonical Primary order. There is no marketing consent.

Adult status choices preserve Diagnosed, Waiting for assessment, Unsure, Prefer not to say and Other; `Self-identified / suspected` replaces `Self-Diagnosed / Suspected`. The page explicitly distinguishes self-identification from clinical diagnosis.

Educational-stage choices are Reception; Years 1 to 6 / Primary; Years 7 to 9 / KS3; Years 10 to 11 / GCSE; Sixth Form / College; Other. The ordinary Other-stage field requests only educational context and warns against health disclosure.

All conditional Other fields are optional. They are displayed only while Other is selected and cleared immediately when it is deselected. Sensitive Other text is limited to 1,000 characters. Names are limited to 100 characters per respondent field and 200 characters for the child's name. Email is limited to 254 characters, number to 40 and Other educational stage to 200.

## Consent and authority wording

Each relevant step links to the Privacy Policy at the point of collection. Sensitive questions start hidden. Withdrawing a checkbox or learner route immediately hides and clears the affected sensitive answers and additional text. The child route has a **Skip optional child information** button that clears all three consent controls and sensitive answers. Incomplete child consent does not accidentally submit partial authority records.

The following displayed wording is associated with the backend versions. A wording change requires reviewing the recorded version.

| Record | Version | Displayed wording |
| --- | --- | --- |
| Own-information explicit consent | `adhd-adult-explicit-consent-v1-2026-09-21` | I explicitly consent to The MentorSphere using the optional health, disability and neurodiversity information I provide about myself to prepare for the discovery call and personalise support. |
| Child explicit consent | `adhd-child-explicit-consent-v1-2026-09-21` | I explicitly consent to The MentorSphere using the optional health, disability, SEND and neurodiversity information I provide about the child or young person to prepare for the discovery call and personalise support. |
| Child authority | `adhd-special-category-authority-v1-2026-09-21` | I confirm that I have parental responsibility or documented legal authority to provide this information and communicate or give this consent. |
| Learner route | `adhd-learner-consent-route-v1-2026-09-21` | The learner understands how this information will be used and has authorised me to communicate this consent on their behalf. **OR** The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority. |

The own-information consent is used for adult coaching and for a parent's own context. It never gives permission to disclose a child's or another person's health information. Child disclosure also requires a separate affirmative declaration of parental responsibility or documented legal authority. The learner route retains Primary wording and does not decide capacity by age alone. The page asks that privacy information be given in a way appropriate to age and understanding.

Withdrawal guidance: **You can withdraw consent by emailing luke@thementorsphere.co.uk. This will not affect processing before withdrawal.**

The final declaration reads: **I confirm that I am authorised to provide the ordinary information in this form and I have read the Privacy Policy, opens in a new tab.**

The backend records consent booleans, wording versions and the server's UTC receipt time, with authority and learner-route records separate. This is a receipt-time consent record, not a claim that the server observed the precise time of an earlier checkbox interaction.

## Additional information and minimisation

The final prompt retains accessibility needs, camera/captions preferences, name/pronouns, topics the person does not want to discuss yet and unhelpful previous support. It explicitly says: **Please include only information that is relevant to the discovery call or support you are seeking.**

Because this free text may contain health or disability information, it is hidden until all applicable consent is complete. Adult and parent-only routes require own-information consent. Child-only requires the child route. Combined requires both. The person can always skip it and discuss preferences during the call. This conservative gate avoids an unprotected narrative field beside otherwise protected sensitive questions.

Parent household wording uses **Supporting more than one child**, omitting any inference about children's neurodivergence. Parent questions concern the respondent's experience and service interests. All parent narrative prompts warn against naming or describing other people's diagnoses or health. A child's sensitive context belongs in the child route with its separate authority controls.

Free text cannot reliably be classified for accidental disclosures on the client. Ordinary name, educational-stage and contact fields are tightly scoped; the Other-stage field explicitly excludes health information. Accidental special-category information remains subject to the existing handling policy. No automated diagnosis or inference is attempted, and the Privacy Policy is not changed.

## Source differences and rationale

| Legacy source | Website implementation | Reason |
| --- | --- | --- |
| Three initial routes, with combined route selected later | Four explicit routes, retaining the child's follow-up parent-support selector | Preserves the source paths with clearer navigation and no repeated contact details. |
| Numerous mandatory context questions in an optional form | Context questions optional after separate consent; ordinary contact and selected child age/identity/stage required | The person can submit ordinary information without being compelled to disclose sensitive information. |
| Phone number always required | Required only when selecting a phone-based contact method | Follows Primary's modern contact/minimisation pattern. |
| Contact methods near the end, including Other | Canonical Primary contact checkboxes on the first step | Prevents duplicate respondent data and avoids an unneeded free-text contact field. An alternative format remains available through Contact Luke. |
| Self-Diagnosed / Suspected | Self-identified / suspected | Avoids presenting self-identification as a clinical diagnosis. |
| Understanding my brain | Understanding how my brain works | Plain wording without changing the priority. |
| Autism (ASC); Auditory Processing | Autism / autistic; Auditory processing difficulties | Respectful, clearer wording. Anxiety remains explicitly a related support need. |
| Emotional outbursts; Social skills; School refusal | Emotional regulation; Social interaction; School attendance | Preserves planning intent with non-judgemental wording. |
| Organization; Behavior strategies | Organisation; Support strategies | UK English and broader, affirming support language. |
| Multiple neurodivergent children | Supporting more than one child | Avoids collecting third-party diagnoses or inferring children's neurodivergence. |
| Severe: crisis mode | Severe: significant current difficulty | Does not suggest coaching is crisis support. The intro states its limits. |
| Navigating schools/EHCPs | Navigating school / SEND / EHCP processes | Clear modern wording for the same service-interest question; no promised outcome. |
| Ungated optional final text | Same prompt examples, gated by applicable consent | The answers may contain special-category information. |

The form does not add a diagnosis requirement, clinical claims, counselling/therapy, promised outcomes, prices, qualifications or permanent future services.

## Proposed storage

Dedicated ADHD storage is specified in [the 54-column schema](../../integrations/google-apps-script/adhd-coaching-intake/SCHEMA.md). The payload is `adhd-coaching-intake-v1`. It uses its own API path, Turnstile action and isolated Apps Script/HMAC configuration. It must never target the Primary production response Sheet.

The schema contains submission identity and receipt time, ordinary respondent details, support route, branch-specific answers, separate consent/authority/learner-route versions and timestamps, and notification status. Irrelevant or unconsented branch values are empty. The backend rejects crafted out-of-branch or unconsented sensitive values instead of silently accepting them.

## Validation and release review

The focused client suite currently contains **49 passing tests** covering route selection, the consent truth table, minimisation, source wording, conditional clearing safeguards, contacts, progress validation, shared submission contract, token lifecycle, no browser storage, no answer-bearing URLs, metadata, IDs and error descriptions. Run with `node node_modules/vitest/vitest.mjs run tests/adhd-client.test.js`.

Actual browser interaction, responsive/reflow review, backend integration and the full Primary regression baseline are recorded in the task's combined QA report. This document does not treat static assertions as a substitute for browser testing.

Before any production setup, Luke should review the displayed wording, consent scopes, child authority route, conservative gate on final text and the 54-column storage proposal. Dedicated production storage, Apps Script deployment, secrets, page enablement and submission enablement require separate owner approval. No production deployment is authorised by this review document.

## Owner-review refinements, 21 September 2026

The separate Additional information step keeps one shared textarea. The heading is **Additional information**, with the intro: **This section is optional. You can share anything else that would be useful for the discovery call, including accessibility or communication preferences.** All previous example guidance and the relevant-information reminder remain.

The yellow panel appears only while the relevant optional consent is incomplete. It hides immediately when consent is complete. The secondary button uses existing wizard navigation, preserves answers, updates progress and focuses the relevant consent heading. Editing consent invalidates later completed steps; normal Continue and final-submit validation remain active. Withdrawal clears Additional information immediately.

| Route | Yellow-panel wording | Button and destination |
| --- | --- | --- |
| Adult | To add optional information here, go back to the Coaching context step and give consent for us to use the health, disability or neurodiversity information you choose to provide. You can also leave this section blank and continue. | Go back to coaching consent: Coaching context, own-information consent heading. |
| Parent/carer | To add optional information here, go back to the Parent/carer context step and give consent for us to use the relevant information you choose to provide about yourself. You can also leave this section blank and continue. | Go back to parent/carer consent: Parent/carer context, own-information consent heading. |
| Child | To add optional information here, go back to the Coaching context step and complete the optional child information consent and authority section. You can also leave this section blank and continue. | Go back to child consent: Coaching context, child consent heading. |
| Combined | To add optional information here, the relevant consent sections for both you and the child or young person need to be completed. Go back to review the consent sections, or leave this section blank and continue. | Review consent sections: first incomplete consent in wizard order, child before parent. |

### Service age boundary

The latest owner instruction confirms adult coaching for ages 18+, direct young-person coaching for ages 10 to 17, and independent parent/carer support. The child/combined route now requires completed-years age, never full date of birth. Ages 10 and 17 are accepted. Under 10s receive a direct switch to Parent/carer support; ages 18+ receive a direct switch to Adult coaching. Switches return to About you for route review, preserve respondent/contact details and clear child-specific or sensitive answers that no longer apply. The parent-only route has no child-age restriction. Age never determines consent or capacity. Both the Worker and generated Apps Script independently enforce this service boundary.

The draft ADHD schema now has 54 columns, including Child age in completed years after Child name. No production Sheet or Apps Script has been provisioned or changed. Secondary's 52-column schema remains unchanged.

Privacy Policy V1.6, DPIA and LIA revisions and policy publication are deferred. No governance PR was created; no current Privacy Policy was edited. Both form PRs remain draft and require owner review.
