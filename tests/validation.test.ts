import { describe, expect, it } from "vitest";
import { validateIntakeRequest } from "../src/intake/validation";
import { validIntakeRequest } from "./fixtures";

const LEARNER_CANNOT_CONSENT =
  "The learner is not yet able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.";
const LEARNER_AUTHORISED =
  "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.";

function section(input: Record<string, unknown>, name: string): Record<string, unknown> {
  const value = input[name];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Missing ${name} fixture`);
  return value as Record<string, unknown>;
}

describe("validateIntakeRequest", () => {
  it("accepts a complete email-only request without a mobile number", () => {
    const result = validateIntakeRequest(validIntakeRequest());
    expect(result.ok).toBe(true);
  });

  it.each(["Telephone", "Text message", "WhatsApp"])("requires a mobile number for %s", (method) => {
    const input = validIntakeRequest();
    section(input, "respondent").preferredContactMethod = method;
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["respondent.mobile"]).toContain("Enter a mobile number");
  });

  it("accepts a mobile number for a phone-based contact method", () => {
    const input = validIntakeRequest();
    section(input, "respondent").preferredContactMethod = "WhatsApp";
    section(input, "respondent").mobile = "07123 456 789";
    expect(validateIntakeRequest(input).ok).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const input = validIntakeRequest();
    section(input, "respondent").email = "not-an-email";
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["respondent.email"]).toBe("Enter a valid email address.");
  });

  it("requires relationship details when Other is selected", () => {
    const input = validIntakeRequest();
    section(input, "respondent").relationship = "Other";
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["respondent.relationshipOther"]).toBeDefined();
  });

  it("accepts optional relevant areas for diagnosed needs", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").specialCategoryProvided = true;
    section(input, "supportProfile").needsStatus = "Yes: diagnosed";
    section(input, "supportProfile").relevantAreas = ["ADHD", "Sensory processing"];
    section(input, "confirmations").specialCategoryConsent = true;
    section(input, "confirmations").specialCategoryAuthority = true;
    section(input, "confirmations").learnerConsentRoute = LEARNER_CANNOT_CONSENT;
    expect(validateIntakeRequest(input).ok).toBe(true);
  });

  it("rejects hidden relevant areas when no additional needs are selected", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").specialCategoryProvided = true;
    section(input, "supportProfile").needsStatus = "No known additional needs";
    section(input, "supportProfile").relevantAreas = ["ADHD"];
    section(input, "confirmations").specialCategoryConsent = true;
    section(input, "confirmations").specialCategoryAuthority = true;
    section(input, "confirmations").learnerConsentRoute = LEARNER_CANNOT_CONSENT;
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["supportProfile.relevantAreas"]).toBeDefined();
  });

  it("requires the general launch confirmations", () => {
    const input = validIntakeRequest();
    section(input, "confirmations").privacyAcknowledged = false;
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["confirmations.privacyAcknowledged"]).toBeDefined();
  });

  it("requires separate explicit consent and authority when special-category information is provided", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").specialCategoryProvided = true;
    section(input, "supportProfile").needsStatus = "Yes: diagnosed";
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["confirmations.specialCategoryConsent"]).toBeDefined();
      expect(result.errors["confirmations.specialCategoryAuthority"]).toBeDefined();
      expect(result.errors["confirmations.learnerConsentRoute"]).toBeDefined();
    }
  });

  it.each(["Education or support professional", "Other family member", "Other"])(
    "rejects special-category information from %s",
    (relationship) => {
      const input = validIntakeRequest();
      section(input, "respondent").relationship = relationship;
      if (relationship === "Other") section(input, "respondent").relationshipOther = "Fictional relationship";
      section(input, "supportProfile").specialCategoryProvided = true;
      section(input, "supportProfile").needsStatus = "Yes: diagnosed";
      section(input, "supportProfile").ehcpStatus = "Yes";
      section(input, "confirmations").specialCategoryConsent = true;
      section(input, "confirmations").specialCategoryAuthority = true;
      section(input, "confirmations").learnerConsentRoute = LEARNER_CANNOT_CONSENT;
      const result = validateIntakeRequest(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors["supportProfile.specialCategoryProvided"]).toContain("appropriate information-sharing route");
    },
  );

  it.each(["Education or support professional", "Other family member", "Other"])(
    "rejects open support details from a restricted %s relationship",
    (relationship) => {
      const input = validIntakeRequest();
      section(input, "respondent").relationship = relationship;
      if (relationship === "Other") section(input, "respondent").relationshipOther = "Family advocate";
      section(input, "supportProfile").supportNeeds = "Ordinary-seeming support detail";
      const result = validateIntakeRequest(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors["supportProfile.specialCategoryProvided"]).toContain("information-sharing route");
    },
  );

  it("rejects structured special-category fields when the respondent says none is provided", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").needsStatus = "Yes: suspected or informally identified";
    section(input, "supportProfile").ehcpStatus = "Yes";
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["supportProfile.specialCategoryProvided"]).toContain("separate consent controls");
  });

  it.each(["supportNeeds", "helpfulStrategies", "unhelpfulApproaches", "otherBackground"])(
    "rejects crafted %s text when the respondent says none is provided",
    (field) => {
      const input = validIntakeRequest();
      section(input, "supportProfile")[field] = "Fictional crafted detail";
      const result = validateIntakeRequest(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors["supportProfile.specialCategoryProvided"]).toContain("complete the separate consent controls");
    },
  );

  it.each([LEARNER_CANNOT_CONSENT, LEARNER_AUTHORISED])(
    "accepts a permitted learner consent route",
    (learnerConsentRoute) => {
      const input = validIntakeRequest();
      section(input, "supportProfile").specialCategoryProvided = true;
      section(input, "supportProfile").supportNeeds = "Fictional support detail";
      section(input, "confirmations").specialCategoryConsent = true;
      section(input, "confirmations").specialCategoryAuthority = true;
      section(input, "confirmations").learnerConsentRoute = learnerConsentRoute;
      expect(validateIntakeRequest(input).ok).toBe(true);
    },
  );

  it("rejects a missing or crafted learner consent route", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").specialCategoryProvided = true;
    section(input, "confirmations").specialCategoryConsent = true;
    section(input, "confirmations").specialCategoryAuthority = true;
    section(input, "confirmations").learnerConsentRoute = "A different statement";
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["confirmations.learnerConsentRoute"]).toBeDefined();
  });

  it("rejects a learner consent route when no special-category information is provided", () => {
    const input = validIntakeRequest();
    section(input, "confirmations").learnerConsentRoute = LEARNER_AUTHORISED;
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["confirmations.learnerConsentRoute"]).toContain("Remove");
  });

  it("rejects unknown choices rather than storing them", () => {
    const input = validIntakeRequest();
    section(input, "learner").subjects = ["History"];
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["learner.subjects"]).toBeDefined();
  });
});
