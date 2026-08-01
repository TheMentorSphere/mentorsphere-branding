export const FORM_VERSION = "primary-learner-profile-v5" as const;

export const LEARNER_CONSENT_ROUTES = [
  "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.",
  "The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.",
] as const;

export const RELATIONSHIPS = [
  "Parent",
  "Guardian or carer",
  "Other family member",
  "Education or support professional",
  "Other",
] as const;

export const CONTACT_METHODS = ["Email", "Telephone", "Text message", "WhatsApp"] as const;

export const CONTACT_TIMES = [
  "Weekday morning",
  "Weekday afternoon",
  "Weekday evening",
  "Weekend morning",
  "Weekend afternoon",
  "Weekend evening",
] as const;

export const YEAR_GROUPS = [
  "Reception",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Home educated or not currently following a formal year group",
  "Other",
] as const;

export const SUBJECTS = ["English", "Maths", "Science", "Other"] as const;

export const NEEDS_STATUSES = [
  "Yes: diagnosed",
  "Yes: suspected or informally identified",
  "An assessment is currently underway",
  "No known additional needs",
  "Prefer not to say",
] as const;

export const RELEVANT_AREAS = [
  "ADHD",
  "Autism",
  "Auditory processing",
  "Dyscalculia",
  "Dysgraphia",
  "Dyslexia",
  "Dyspraxia or developmental coordination difficulties",
  "Speech, language or communication needs",
  "Visual processing",
  "Sensory processing",
  "Emotional or mental-health needs",
  "Physical or medical needs",
  "Another need not listed",
  "Prefer not to say",
] as const;

export const EHCP_STATUSES = [
  "Yes",
  "No",
  "An EHC needs assessment has been requested or is underway",
  "I am not sure",
] as const;

export const SESSION_LENGTHS = [
  "30 minutes",
  "45 minutes",
  "60 minutes",
  "90 minutes",
  "Not sure: happy to discuss",
] as const;

export const SESSION_FREQUENCIES = [
  "Three sessions per week",
  "Two sessions per week",
  "Weekly",
  "Fortnightly",
  "Pay as you go",
  "Not sure yet",
] as const;

export const WIDER_SUPPORT_OPTIONS = [
  "Yes",
  "Not at present",
  "Not sure: I am happy for Luke to explain the options",
] as const;

type Relationship = (typeof RELATIONSHIPS)[number];
type ContactMethod = (typeof CONTACT_METHODS)[number];
type ContactTime = (typeof CONTACT_TIMES)[number];
type YearGroup = (typeof YEAR_GROUPS)[number];
type Subject = (typeof SUBJECTS)[number];
type NeedsStatus = (typeof NEEDS_STATUSES)[number];
type RelevantArea = (typeof RELEVANT_AREAS)[number];
type EhcpStatus = (typeof EHCP_STATUSES)[number];
type SessionLength = (typeof SESSION_LENGTHS)[number];
type SessionFrequency = (typeof SESSION_FREQUENCIES)[number];
type WiderSupport = (typeof WIDER_SUPPORT_OPTIONS)[number];
type LearnerConsentRoute = (typeof LEARNER_CONSENT_ROUTES)[number];

export interface ValidatedIntakeSubmission {
  formVersion: typeof FORM_VERSION;
  submissionId: string;
  respondent: {
    email: string;
    firstName: string;
    surname: string;
    relationship: Relationship;
    relationshipOther: string;
    mobile: string;
    preferredContactMethods: ContactMethod[];
    suitableContactTimes: ContactTime[];
  };
  learner: {
    firstName: string;
    surname: string;
    dateOfBirth: string;
    yearGroup: YearGroup;
    yearGroupOther: string;
    subjects: Subject[];
    subjectOther: string;
  };
  supportProfile: {
    specialCategoryProvided: boolean;
    needsStatus: NeedsStatus | "";
    relevantAreas: RelevantArea[];
    supportNeeds: string;
    helpfulStrategies: string;
    unhelpfulApproaches: string;
    otherBackground: string;
    ehcpStatus: EhcpStatus | "";
  };
  sessionPreferences: {
    sessionLength: SessionLength;
    sessionFrequency: SessionFrequency;
    widerSupport: WiderSupport | "";
  };
  confirmations: {
    authorised: true;
    privacyAcknowledged: true;
    specialCategoryConsent: boolean;
    specialCategoryAuthority: boolean;
    learnerConsentRoute: LearnerConsentRoute | "";
  };
}

export interface ValidatedRequest {
  submission: ValidatedIntakeSubmission;
  turnstileToken: string;
  honeypot: string;
}

export type ValidationResult =
  | { ok: true; request: ValidatedRequest }
  | { ok: false; errors: Record<string, string> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_CONTACT_METHODS = new Set<ContactMethod>(["Telephone", "Text message", "WhatsApp"]);
const SPECIAL_CATEGORY_RELATIONSHIPS = new Set<Relationship>(["Parent", "Guardian or carer"]);
const NEEDS_AREAS_VISIBLE = new Set<NeedsStatus>([
  "Yes: diagnosed",
  "Yes: suspected or informally identified",
  "An assessment is currently underway",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maximum ? trimmed : null;
}

function requiredText(
  source: Record<string, unknown>,
  key: string,
  path: string,
  maximum: number,
  errors: Record<string, string>,
): string {
  const value = textValue(source[key], maximum);
  if (value === null || value.length === 0) {
    errors[path] = "Enter this information.";
    return "";
  }
  return value;
}

function optionalText(
  source: Record<string, unknown>,
  key: string,
  path: string,
  maximum: number,
  errors: Record<string, string>,
): string {
  const value = textValue(source[key], maximum);
  if (value === null) {
    errors[path] = `Use ${maximum.toLocaleString("en-GB")} characters or fewer.`;
    return "";
  }
  return value;
}

function choice<const T extends readonly string[]>(
  source: Record<string, unknown>,
  key: string,
  path: string,
  allowed: T,
  errors: Record<string, string>,
): T[number] {
  const value = source[key];
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors[path] = "Choose an option.";
    const fallback = allowed[0];
    if (fallback === undefined) throw new Error("Choice validation requires at least one allowed value");
    return fallback;
  }
  return value as T[number];
}

function optionalChoice<const T extends readonly string[]>(
  source: Record<string, unknown>,
  key: string,
  path: string,
  allowed: T,
  errors: Record<string, string>,
): T[number] | "" {
  const value = source[key];
  if (value === "") return "";
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors[path] = "Choose an available option or leave this blank.";
    return "";
  }
  return value as T[number];
}

function choices<const T extends readonly string[]>(
  source: Record<string, unknown>,
  key: string,
  path: string,
  allowed: T,
  errors: Record<string, string>,
  required: boolean,
): T[number][] {
  const value = source[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.includes(item))) {
    errors[path] = "Choose only from the available options.";
    return [];
  }
  const unique = [...new Set(value)] as T[number][];
  if (unique.length !== value.length) errors[path] = "Choose each option only once.";
  if (required && unique.length === 0) errors[path] = "Choose at least one option.";
  return unique;
}

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && date <= new Date();
}

export function validateIntakeRequest(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  if (!isRecord(input)) return { ok: false, errors: { form: "The form data is invalid." } };

  const respondent = isRecord(input.respondent) ? input.respondent : {};
  const learner = isRecord(input.learner) ? input.learner : {};
  const support = isRecord(input.supportProfile) ? input.supportProfile : {};
  const sessions = isRecord(input.sessionPreferences) ? input.sessionPreferences : {};
  const confirmations = isRecord(input.confirmations) ? input.confirmations : {};

  const formVersion = input.formVersion;
  if (formVersion !== FORM_VERSION) errors.formVersion = "Refresh the page before submitting.";

  const submissionId = textValue(input.submissionId, 64) ?? "";
  if (!UUID_PATTERN.test(submissionId)) errors.submissionId = "Refresh the page before submitting.";

  const turnstileToken = textValue(input.turnstileToken, 2_048) ?? "";
  if (!turnstileToken) errors.turnstileToken = "Complete the security check.";
  const honeypot = textValue(input.honeypot, 200) ?? "";

  const email = requiredText(respondent, "email", "respondent.email", 254, errors);
  if (email && !EMAIL_PATTERN.test(email)) errors["respondent.email"] = "Enter a valid email address.";
  const respondentFirstName = requiredText(respondent, "firstName", "respondent.firstName", 100, errors);
  const respondentSurname = requiredText(respondent, "surname", "respondent.surname", 100, errors);
  const relationship = choice(respondent, "relationship", "respondent.relationship", RELATIONSHIPS, errors);
  const relationshipOther = optionalText(respondent, "relationshipOther", "respondent.relationshipOther", 160, errors);
  if (relationship === "Other" && !relationshipOther) {
    errors["respondent.relationshipOther"] = "Describe your relationship to the learner.";
  }
  const submittedPreferredContactMethods = choices(
    respondent,
    "preferredContactMethods",
    "respondent.preferredContactMethods",
    CONTACT_METHODS,
    errors,
    true,
  );
  const preferredContactMethods = CONTACT_METHODS.filter((method) => submittedPreferredContactMethods.includes(method));
  if (respondent.preferredContactMethods === undefined ||
    (Array.isArray(respondent.preferredContactMethods) && respondent.preferredContactMethods.length === 0)) {
    errors["respondent.preferredContactMethods"] = "Choose at least one contact method.";
  }
  const mobile = optionalText(respondent, "mobile", "respondent.mobile", 40, errors);
  const selectedPhoneMethods = preferredContactMethods.filter((method) => PHONE_CONTACT_METHODS.has(method));
  if (selectedPhoneMethods.length > 0 && !mobile) {
    errors["respondent.mobile"] = `Enter a mobile number because you selected ${selectedPhoneMethods.join(", ")}.`;
  }
  const suitableContactTimes = choices(
    respondent,
    "suitableContactTimes",
    "respondent.suitableContactTimes",
    CONTACT_TIMES,
    errors,
    false,
  );

  const learnerFirstName = requiredText(learner, "firstName", "learner.firstName", 100, errors);
  const learnerSurname = requiredText(learner, "surname", "learner.surname", 100, errors);
  const dateOfBirth = requiredText(learner, "dateOfBirth", "learner.dateOfBirth", 10, errors);
  if (dateOfBirth && !validDate(dateOfBirth)) errors["learner.dateOfBirth"] = "Enter a valid date of birth.";
  const yearGroup = choice(learner, "yearGroup", "learner.yearGroup", YEAR_GROUPS, errors);
  const yearGroupOther = optionalText(learner, "yearGroupOther", "learner.yearGroupOther", 160, errors);
  if (yearGroup === "Other" && !yearGroupOther) errors["learner.yearGroupOther"] = "Describe the current year group or equivalent.";
  const subjects = choices(learner, "subjects", "learner.subjects", SUBJECTS, errors, true);
  const subjectOther = optionalText(learner, "subjectOther", "learner.subjectOther", 160, errors);
  if (subjects.includes("Other") && !subjectOther) errors["learner.subjectOther"] = "Describe the other subject requiring support.";

  const specialCategoryProvided = support.specialCategoryProvided;
  if (typeof specialCategoryProvided !== "boolean") {
    errors["supportProfile.specialCategoryProvided"] = "Choose whether you want to provide optional health, disability, SEND or neurodiversity information.";
  }
  const providesSpecialCategoryInformation = specialCategoryProvided === true;
  if (providesSpecialCategoryInformation && !SPECIAL_CATEGORY_RELATIONSHIPS.has(relationship)) {
    errors["supportProfile.specialCategoryProvided"] = "This form cannot accept health, disability, SEND, neurodiversity, diagnosis or EHCP information from this relationship. Ask Luke to arrange an appropriate information-sharing route.";
  }

  const needsStatus = optionalChoice(support, "needsStatus", "supportProfile.needsStatus", NEEDS_STATUSES, errors);
  const relevantAreas = choices(
    support,
    "relevantAreas",
    "supportProfile.relevantAreas",
    RELEVANT_AREAS,
    errors,
    false,
  );
  if ((!needsStatus || !NEEDS_AREAS_VISIBLE.has(needsStatus)) && relevantAreas.length > 0) {
    errors["supportProfile.relevantAreas"] = "Remove areas that are not relevant to the selected answer.";
  }
  const supportNeeds = optionalText(support, "supportNeeds", "supportProfile.supportNeeds", 5_000, errors);
  const helpfulStrategies = optionalText(support, "helpfulStrategies", "supportProfile.helpfulStrategies", 5_000, errors);
  const unhelpfulApproaches = optionalText(support, "unhelpfulApproaches", "supportProfile.unhelpfulApproaches", 5_000, errors);
  const otherBackground = optionalText(support, "otherBackground", "supportProfile.otherBackground", 5_000, errors);
  const ehcpStatus = optionalChoice(support, "ehcpStatus", "supportProfile.ehcpStatus", EHCP_STATUSES, errors);
  const hasSpecialCategoryDetail = Boolean(
    needsStatus ||
    relevantAreas.length > 0 ||
    supportNeeds ||
    helpfulStrategies ||
    unhelpfulApproaches ||
    otherBackground ||
    ehcpStatus,
  );
  if (!SPECIAL_CATEGORY_RELATIONSHIPS.has(relationship) && hasSpecialCategoryDetail) {
    errors["supportProfile.specialCategoryProvided"] = "This relationship cannot submit health, disability, SEND, neurodiversity, diagnosis, EHCP or related support information through this form. Ask Luke to arrange an appropriate information-sharing route.";
  } else if (!providesSpecialCategoryInformation && hasSpecialCategoryDetail) {
    errors["supportProfile.specialCategoryProvided"] = "Choose Yes and complete the Part 3 consent controls before providing optional health, disability, SEND, neurodiversity, diagnosis, EHCP or related support information.";
  }

  const sessionLength = choice(sessions, "sessionLength", "sessionPreferences.sessionLength", SESSION_LENGTHS, errors);
  const sessionFrequency = choice(
    sessions,
    "sessionFrequency",
    "sessionPreferences.sessionFrequency",
    SESSION_FREQUENCIES,
    errors,
  );
  const widerSupport = optionalChoice(
    sessions,
    "widerSupport",
    "sessionPreferences.widerSupport",
    WIDER_SUPPORT_OPTIONS,
    errors,
  );

  const learnerConsentRoute = optionalChoice(
    confirmations,
    "learnerConsentRoute",
    "confirmations.learnerConsentRoute",
    LEARNER_CONSENT_ROUTES,
    errors,
  );
  if (confirmations.authorised !== true) errors["confirmations.authorised"] = "Confirm your authority and Privacy Policy acknowledgement.";
  if (confirmations.privacyAcknowledged !== true) errors["confirmations.privacyAcknowledged"] = "Confirm your authority and Privacy Policy acknowledgement.";
  if (providesSpecialCategoryInformation) {
    if (confirmations.specialCategoryConsent !== true) {
      errors["confirmations.specialCategoryConsent"] = "Give explicit consent or remove the optional health, disability, SEND and neurodiversity information.";
    }
    if (confirmations.specialCategoryAuthority !== true) {
      errors["confirmations.specialCategoryAuthority"] = "Complete the learner consent route in Part 3 or remove the optional information.";
    }
    if (!learnerConsentRoute) {
      errors["confirmations.learnerConsentRoute"] = "Choose the statement that applies to the learner’s consent.";
    }
  } else {
    if (confirmations.specialCategoryConsent === true) {
      errors["confirmations.specialCategoryConsent"] = "Remove consent when no optional special-category information is being provided.";
    }
    if (confirmations.specialCategoryAuthority === true) {
      errors["confirmations.specialCategoryAuthority"] = "Remove the authority confirmation when no optional special-category information is being provided.";
    }
    if (learnerConsentRoute) {
      errors["confirmations.learnerConsentRoute"] = "Remove the learner consent statement when no optional special-category information is being provided.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    request: {
      turnstileToken,
      honeypot,
      submission: {
        formVersion: FORM_VERSION,
        submissionId,
        respondent: {
          email,
          firstName: respondentFirstName,
          surname: respondentSurname,
          relationship,
          relationshipOther,
          mobile,
          preferredContactMethods,
          suitableContactTimes,
        },
        learner: {
          firstName: learnerFirstName,
          surname: learnerSurname,
          dateOfBirth,
          yearGroup,
          yearGroupOther,
          subjects,
          subjectOther,
        },
        supportProfile: {
          specialCategoryProvided: providesSpecialCategoryInformation,
          needsStatus,
          relevantAreas,
          supportNeeds,
          helpfulStrategies,
          unhelpfulApproaches,
          otherBackground,
          ehcpStatus,
        },
        sessionPreferences: { sessionLength, sessionFrequency, widerSupport },
        confirmations: {
          authorised: true,
          privacyAcknowledged: true,
          specialCategoryConsent: providesSpecialCategoryInformation,
          specialCategoryAuthority: providesSpecialCategoryInformation,
          learnerConsentRoute,
        },
      },
    },
  };
}
