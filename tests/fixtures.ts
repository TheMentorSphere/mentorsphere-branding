import { FORM_VERSION } from "../src/intake/validation";

export function validIntakeRequest(): Record<string, unknown> {
  return {
    formVersion: FORM_VERSION,
    submissionId: "123e4567-e89b-42d3-a456-426614174000",
    turnstileToken: "fictional-turnstile-token",
    honeypot: "",
    respondent: {
      email: "alex@example.test",
      firstName: "Alex",
      surname: "Example",
      relationship: "Parent",
      relationshipOther: "",
      mobile: "",
      preferredContactMethod: "Email",
      suitableContactTimes: ["Weekday evening"],
    },
    learner: {
      firstName: "Sam",
      surname: "Example",
      dateOfBirth: "2017-04-15",
      yearGroup: "Year 4",
      yearGroupOther: "",
      subjects: ["English", "Maths"],
      subjectOther: "",
    },
    supportProfile: {
      needsStatus: "No known additional needs",
      relevantAreas: [],
      supportNeeds: "Short fictional test answer.",
      helpfulStrategies: "Short tasks and clear instructions.",
      unhelpfulApproaches: "",
      otherBackground: "",
      ehcpStatus: "No",
    },
    sessionPreferences: {
      sessionLength: "Not sure: happy to discuss",
      sessionFrequency: "Weekly",
      widerSupport: "",
    },
    confirmations: {
      authorised: true,
      privacyAcknowledged: true,
      sensitiveDataAcknowledged: true,
    },
  };
}
