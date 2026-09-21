import { describe, expect, it } from "vitest";
import { validateAdhdRequest, SUPPORT_FOR, ADHD_STATUS } from "../src/intake/adhd-validation";
import { LEARNER_CONSENT_ROUTES } from "../src/intake/validation";
import { validAdhdRequest } from "./adhd-fixtures";
import { section } from "./secondary-fixtures";
function adultConsent(input: Record<string, unknown>) { section(input, "confirmations").adultSpecialCategoryConsent = true; }
function childConsent(input: Record<string, unknown>) { Object.assign(section(input, "confirmations"), { childSpecialCategoryConsent: true, childSpecialCategoryAuthority: true, learnerConsentRoute: LEARNER_CONSENT_ROUTES[0] }); }
describe("ADHD intake schema", () => {
    it.each(SUPPORT_FOR)("allows ordinary-only optional route %s", route => { expect(validateAdhdRequest(validAdhdRequest(route)).ok).toBe(true); });
    it.each(ADHD_STATUS)("accepts consented adult status %s", adhdStatus => { const input = validAdhdRequest(); adultConsent(input); section(input, "adult").adhdStatus = adhdStatus; expect(validateAdhdRequest(input).ok).toBe(true); });
    it.each(["adult", "parent", "combined"])("requires adult consent for respondent narrative on %s", route => { const input = validAdhdRequest(route); input.additionalInformation = "Camera off and captions please"; expect(validateAdhdRequest(input).ok).toBe(false); adultConsent(input); if (route === "combined")
        childConsent(input); expect(validateAdhdRequest(input).ok).toBe(true); });
    it.each(["child", "combined"])("requires child consent and authority on %s", route => { const input = validAdhdRequest(route); section(input, "child").neurodivergence = ["ADHD"]; expect(validateAdhdRequest(input).ok).toBe(false); childConsent(input); expect(validateAdhdRequest(input).ok).toBe(true); section(input, "confirmations").childSpecialCategoryAuthority = false; expect(validateAdhdRequest(input).ok).toBe(false); });
    it.each(LEARNER_CONSENT_ROUTES)("accepts either learner route without assuming capacity", route => { const input = validAdhdRequest("child"); childConsent(input); section(input, "confirmations").learnerConsentRoute = route; expect(validateAdhdRequest(input).ok).toBe(true); });
    it.each(["adult", "parent", "combined"])("rejects child data left hidden on changed route %s", route => { const input = validAdhdRequest("child"); input.supportFor = route; if (route === "combined")
        input.supportFor = "parent"; expect(validateAdhdRequest(input).ok).toBe(false); });
    it("rejects parent context without consent", () => { const input = validAdhdRequest("parent"); section(input, "parent").dailyImpact = "Moderate: frequent stress"; expect(validateAdhdRequest(input).ok).toBe(false); adultConsent(input); expect(validateAdhdRequest(input).ok).toBe(true); });
    it("rejects irrelevant adult consent in child route", () => { const input = validAdhdRequest("child"); adultConsent(input); expect(validateAdhdRequest(input).ok).toBe(false); });
    it.each(["adhdStatusOther", "difficultiesOther", "priorityOther"])("rejects hidden Other details %s", key => { const input = validAdhdRequest(); adultConsent(input); section(input, "adult")[key] = "Unexpected hidden detail"; expect(validateAdhdRequest(input).ok).toBe(false); });
    it("allows Other without demanding further disclosure", () => { const input = validAdhdRequest(); adultConsent(input); section(input, "adult").adhdStatus = "Other"; expect(validateAdhdRequest(input).ok).toBe(true); });
    it("rejects oversized narrative", () => { const input = validAdhdRequest(); adultConsent(input); input.additionalInformation = "x".repeat(5001); expect(validateAdhdRequest(input).ok).toBe(false); });
    it.each(["Telephone", "Text message", "WhatsApp"])("requires contact number for %s", method => { const input = validAdhdRequest(); section(input, "respondent").preferredContactMethods = [method]; expect(validateAdhdRequest(input).ok).toBe(false); section(input, "respondent").mobile = "07700 900123"; expect(validateAdhdRequest(input).ok).toBe(true); });
});
