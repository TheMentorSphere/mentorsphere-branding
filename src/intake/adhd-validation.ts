import { CONTACT_METHODS, LEARNER_CONSENT_ROUTES } from "./validation";
export const FORM_VERSION = "adhd-coaching-intake-v1" as const;
export const SUPPORT_FOR = ["adult", "child", "parent", "combined"] as const;
export const ADHD_STATUS = ["Diagnosed", "Self-identified / suspected", "Waiting for assessment", "Unsure", "Prefer not to say", "Other"] as const;
export const ADULT_DIFFICULTIES = ["Starting tasks", "Procrastination", "Time management", "Emotional regulation", "Organisation", "Burnout", "Focus", "Impulsivity", "Not sure", "Other"] as const;
export const ADULT_PRIORITIES = ["Understanding how my brain works", "Practical strategies", "Accountability", "Emotional support", "Workplace navigation", "Unsure", "Other"] as const;
export const EDUCATIONAL_STAGES = ["Reception", "Years 1 to 6 / Primary", "Years 7 to 9 / KS3", "Years 10 to 11 / GCSE", "Sixth Form / College", "Other"] as const;
export const NEURODIVERGENCE = ["ADHD", "Autism / autistic", "Dyslexia", "Dyspraxia", "Dyscalculia", "Auditory processing difficulties", "Anxiety", "Not sure", "Other"] as const;
export const CHILD_DIFFICULTIES = ["Focusing in class", "Homework", "Emotional regulation", "Social interaction", "Morning routines", "Sleep", "Organisation", "School attendance", "Not sure", "Other"] as const;
export const HOUSEHOLD = ["Two-parent household", "Single-parent household", "Co-parenting across two homes", "Multi-generational household", "Supporting more than one child", "Other"] as const;
export const DAILY_IMPACT = ["Manageable: looking for adjustments", "Moderate: frequent stress", "Severe: significant current difficulty", "Not sure", "Other"] as const;
export const PARENT_HELP = ["Support strategies", "Understanding ADHD", "Navigating school / SEND / EHCP processes", "Emotional support for myself", "Reducing conflict", "Not sure", "Other"] as const;
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}; }
export function validateAdhdRequest(input: unknown) {
    const errors: Record<string, string> = {};
    const data = record(input);
    const respondent = record(data.respondent), adult = record(data.adult), child = record(data.child), parent = record(data.parent), confirmations = record(data.confirmations);
    function text(source: RecordValue, key: string, path: string, max = 160, required = false) {
        const raw = source[key];
        if (typeof raw !== "string" || raw.trim().length > max || (required && !raw.trim())) {
            errors[path] = required ? "Enter this information." : `Use ${max} characters or fewer.`;
            return "";
        }
        return raw.trim();
    }
    function choice(source: RecordValue, key: string, path: string, allowed: readonly string[], required = false) {
        const value = text(source, key, path, 500, required);
        if (value && !allowed.includes(value))
            errors[path] = "Choose an available option.";
        return value;
    }
    function choices(source: RecordValue, key: string, path: string, allowed: readonly string[], required = false) {
        const value = source[key];
        if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !allowed.includes(item)) || new Set(value).size !== value.length || (required && !value.length)) {
            errors[path] = "Choose from the available options.";
            return [];
        }
        return allowed.filter(item => value.includes(item));
    }
    function bool(key: string) {
        if (typeof confirmations[key] !== "boolean")
            errors[`confirmations.${key}`] = "Confirm this choice.";
        return confirmations[key] === true;
    }
    function other(source: RecordValue, key: string, path: string, selected: string | string[]) {
        const result = text(source, key, path, 1000);
        if (result && !(Array.isArray(selected) ? selected.includes("Other") : selected === "Other"))
            errors[path] = "Remove details for an option that is not selected.";
        return result;
    }
    if (data.formVersion !== FORM_VERSION)
        errors.formVersion = "Refresh the page before submitting.";
    const submissionId = text(data, "submissionId", "submissionId", 64, true);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(submissionId))
        errors.submissionId = "Refresh the page before submitting.";
    const turnstileToken = text(data, "turnstileToken", "turnstileToken", 2048, true);
    const honeypot = text(data, "honeypot", "honeypot", 200);
    const firstName = text(respondent, "firstName", "respondent.firstName", 100, true), surname = text(respondent, "surname", "respondent.surname", 100, true);
    const email = text(respondent, "email", "respondent.email", 254, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
        errors["respondent.email"] = "Enter a valid email address.";
    const mobile = text(respondent, "mobile", "respondent.mobile", 40);
    const preferredContactMethods = choices(respondent, "preferredContactMethods", "respondent.preferredContactMethods", CONTACT_METHODS, true);
    if (preferredContactMethods.some(value => value !== "Email") && !mobile)
        errors["respondent.mobile"] = "Enter a contact number for the selected contact methods.";
    const supportFor = choice(data, "supportFor", "supportFor", SUPPORT_FOR, true);
    const hasAdult = supportFor === "adult", hasChild = supportFor === "child" || supportFor === "combined", hasParent = supportFor === "parent" || supportFor === "combined";
    const adultSpecialCategoryConsent = bool("adultSpecialCategoryConsent"), childSpecialCategoryConsent = bool("childSpecialCategoryConsent"), childSpecialCategoryAuthority = bool("childSpecialCategoryAuthority");
    const learnerConsentRoute = choice(confirmations, "learnerConsentRoute", "confirmations.learnerConsentRoute", LEARNER_CONSENT_ROUTES);
    if (confirmations.authorised !== true)
        errors["confirmations.authorised"] = "Confirm your authority to provide this information.";
    if (confirmations.privacyAcknowledged !== true)
        errors["confirmations.privacyAcknowledged"] = "Acknowledge the Privacy Policy.";
    if (adultSpecialCategoryConsent && !hasAdult && !hasParent)
        errors["confirmations.adultSpecialCategoryConsent"] = "Remove consent for a route that is not selected.";
    if (childSpecialCategoryConsent && (!hasChild || !childSpecialCategoryAuthority || !learnerConsentRoute))
        errors["confirmations.childSpecialCategoryConsent"] = "Complete child consent, parental or legal authority and the learner consent route.";
    if (!childSpecialCategoryConsent && (childSpecialCategoryAuthority || learnerConsentRoute))
        errors["confirmations.childSpecialCategoryAuthority"] = "Remove child authority and learner consent when optional child information is not provided.";
    const adhdStatus = choice(adult, "adhdStatus", "adult.adhdStatus", ADHD_STATUS);
    const adultDifficulties = choices(adult, "difficulties", "adult.difficulties", ADULT_DIFFICULTIES);
    const priority = choice(adult, "priority", "adult.priority", ADULT_PRIORITIES);
    const adultValues = { adhdStatus, adhdStatusOther: other(adult, "adhdStatusOther", "adult.adhdStatusOther", adhdStatus), difficulties: adultDifficulties, difficultiesOther: other(adult, "difficultiesOther", "adult.difficultiesOther", adultDifficulties), priority, priorityOther: other(adult, "priorityOther", "adult.priorityOther", priority) };
    const name = text(child, "name", "child.name", 200, hasChild);
    const age = text(child, "age", "child.age", 3, hasChild);
    if (hasChild && (!/^(0|[1-9]\d{0,2})$/.test(age) || Number(age) < 10 || Number(age) > 17))
        errors["child.age"] = "Direct young-person coaching is for ages 10 to 17. Use Parent/carer support for under 10s or Adult coaching for age 18 or over.";
    const educationalStage = choice(child, "educationalStage", "child.educationalStage", EDUCATIONAL_STAGES, hasChild);
    const educationalStageOther = other(child, "educationalStageOther", "child.educationalStageOther", educationalStage);
    const neurodivergence = choices(child, "neurodivergence", "child.neurodivergence", NEURODIVERGENCE), childDifficulties = choices(child, "difficulties", "child.difficulties", CHILD_DIFFICULTIES);
    const childSensitiveValues = { neurodivergence, neurodivergenceOther: other(child, "neurodivergenceOther", "child.neurodivergenceOther", neurodivergence), difficulties: childDifficulties, difficultiesOther: other(child, "difficultiesOther", "child.difficultiesOther", childDifficulties) };
    const household = choices(parent, "household", "parent.household", HOUSEHOLD), dailyImpact = choice(parent, "dailyImpact", "parent.dailyImpact", DAILY_IMPACT), help = choices(parent, "help", "parent.help", PARENT_HELP);
    const parentValues = { household, householdOther: other(parent, "householdOther", "parent.householdOther", household), dailyImpact, dailyImpactOther: other(parent, "dailyImpactOther", "parent.dailyImpactOther", dailyImpact), help, helpOther: other(parent, "helpOther", "parent.helpOther", help) };
    function hasValues(values: object) { return Object.values(values).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value)); }
    if ((!hasAdult || !adultSpecialCategoryConsent) && hasValues(adultValues))
        errors.adult = "Remove adult information or give the appropriate explicit consent.";
    if ((!hasParent || !adultSpecialCategoryConsent) && hasValues(parentValues))
        errors.parent = "Remove parent information or give the appropriate explicit consent.";
    if ((!hasChild || !childSpecialCategoryConsent || !childSpecialCategoryAuthority || !learnerConsentRoute) && hasValues(childSensitiveValues))
        errors.child = "Remove optional child information or complete the child consent and authority route.";
    if (!hasChild && (name || age || educationalStage || educationalStageOther))
        errors.child = "Remove child details for a route that is not selected.";
    const additionalInformation = text(data, "additionalInformation", "additionalInformation", 5000);
    const additionalAllowed = (!hasAdult && !hasParent || adultSpecialCategoryConsent) && (!hasChild || childSpecialCategoryConsent && childSpecialCategoryAuthority && Boolean(learnerConsentRoute));
    if (additionalInformation && !additionalAllowed)
        errors.additionalInformation = "Complete the relevant consent routes before sharing optional additional information.";
    if (Object.keys(errors).length)
        return { ok: false as const, errors };
    return { ok: true as const, request: { turnstileToken, honeypot, submission: {
                formVersion: FORM_VERSION, submissionId, respondent: { firstName, surname, email, mobile, preferredContactMethods }, supportFor,
                adult: adultValues, child: { name, age, educationalStage, educationalStageOther, ...childSensitiveValues }, parent: parentValues,
                additionalInformation, confirmations: { authorised: true as const, privacyAcknowledged: true as const, adultSpecialCategoryConsent, childSpecialCategoryConsent, childSpecialCategoryAuthority, learnerConsentRoute },
            } } };
}
