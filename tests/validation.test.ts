import { describe, expect, it } from "vitest";
import { validateIntakeRequest } from "../src/intake/validation";
import { validIntakeRequest } from "./fixtures";

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
    section(input, "supportProfile").needsStatus = "Yes: diagnosed";
    section(input, "supportProfile").relevantAreas = ["ADHD", "Sensory processing"];
    expect(validateIntakeRequest(input).ok).toBe(true);
  });

  it("rejects hidden relevant areas when no additional needs are selected", () => {
    const input = validIntakeRequest();
    section(input, "supportProfile").relevantAreas = ["ADHD"];
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["supportProfile.relevantAreas"]).toBeDefined();
  });

  it("requires all three launch confirmations", () => {
    const input = validIntakeRequest();
    section(input, "confirmations").sensitiveDataAcknowledged = false;
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["confirmations.sensitiveDataAcknowledged"]).toBeDefined();
  });

  it("rejects unknown choices rather than storing them", () => {
    const input = validIntakeRequest();
    section(input, "learner").subjects = ["History"];
    const result = validateIntakeRequest(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["learner.subjects"]).toBeDefined();
  });
});
