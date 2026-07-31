import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { validIntakeRequest } from "./fixtures";

const LEARNER_CANNOT_CONSENT =
  "The learner is not yet able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.";
const LEARNER_AUTHORISED =
  "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.";

interface AppsScriptTestExports {
  SHEET_COLUMNS: string[];
  hasValidShape_(request: unknown): boolean;
  retentionReviewDate_(receivedAt: string): string;
  rowFor_(request: { issuedAt: string; payload: Record<string, unknown> }, receivedAt: string): string[];
}

async function loadAppsScript(): Promise<AppsScriptTestExports> {
  const source = await readFile(
    path.join(process.cwd(), "integrations", "google-apps-script", "primary-learner-profile", "Code.gs"),
    "utf8",
  );
  const sandbox: { __testExports?: AppsScriptTestExports } = {};
  vm.runInNewContext(
    `${source}\nglobalThis.__testExports = { SHEET_COLUMNS, hasValidShape_, retentionReviewDate_, rowFor_ };`,
    sandbox,
  );
  if (!sandbox.__testExports) throw new Error("Apps Script test exports were not created");
  return sandbox.__testExports;
}

describe("Apps Script retention schema", () => {
  it("retains 48 columns and uses the plural contact-method header", async () => {
    const script = await loadAppsScript();
    expect(script.SHEET_COLUMNS).toHaveLength(48);
    expect(script.SHEET_COLUMNS[10]).toBe("Preferred contact methods");
  });

  it("stores contact methods in canonical semicolon-separated order", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    (payload.respondent as Record<string, unknown>).preferredContactMethods = ["WhatsApp", "Email", "Telephone"];
    (payload.respondent as Record<string, unknown>).mobile = "07123 456 789";
    const row = Array.from(script.rowFor_({ issuedAt: new Date().toISOString(), payload }, "2026-07-31T10:15:30.000Z"));
    expect(row[10]).toBe("Email; Telephone; WhatsApp");
    expect(row).toHaveLength(48);
  });

  it.each([
    { preferredContactMethods: [] },
    { preferredContactMethods: ["Carrier pigeon"] },
    { preferredContactMethods: ["Email", "Email"] },
  ])("rejects an invalid contact-method array: $preferredContactMethods", async ({ preferredContactMethods }) => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    (payload.respondent as Record<string, unknown>).preferredContactMethods = preferredContactMethods;
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
  });

  it("rejects phone-based contact without a mobile number", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    (payload.respondent as Record<string, unknown>).preferredContactMethods = ["Email", "WhatsApp"];
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
  });

  it("appends the five administrative retention columns in the enforced order", async () => {
    const script = await loadAppsScript();
    expect(Array.from(script.SHEET_COLUMNS).slice(-5)).toEqual([
      "Record status",
      "Last meaningful contact date",
      "Retention review date",
      "Safeguarding or legal hold",
      "Retention notes",
    ]);
    expect(script.SHEET_COLUMNS).toHaveLength(48);
  });

  it("initialises a prospective record with a six-month review date", async () => {
    const script = await loadAppsScript();
    const receivedAt = "2026-07-31T10:15:30.000Z";
    const row = Array.from(script.rowFor_(
      { issuedAt: "2026-07-31T10:15:29.000Z", payload: validIntakeRequest() },
      receivedAt,
    ));

    expect(row).toHaveLength(48);
    expect(row.slice(-5)).toEqual(["Prospective", "2026-07-31", "2027-01-31", "No", ""]);
  });

  it("records conditional explicit consent, authority and wording versions", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    const support = payload.supportProfile as Record<string, unknown>;
    const confirmations = payload.confirmations as Record<string, unknown>;
    support.specialCategoryProvided = true;
    support.needsStatus = "Yes: diagnosed";
    support.relevantAreas = ["ADHD"];
    support.ehcpStatus = "Yes";
    confirmations.specialCategoryConsent = true;
    confirmations.specialCategoryAuthority = true;
    confirmations.learnerConsentRoute = LEARNER_AUTHORISED;
    const receivedAt = "2026-07-31T10:15:30.000Z";
    const row = Array.from(script.rowFor_({ issuedAt: receivedAt, payload }, receivedAt));
    const byColumn = Object.fromEntries(script.SHEET_COLUMNS.map((column, index) => [column, row[index]]));

    expect(byColumn["Special-category information provided"]).toBe("Yes");
    expect(byColumn["Explicit consent"]).toBe("Yes");
    expect(byColumn["Explicit consent wording version"]).toBe("explicit-consent-2026-07-31");
    expect(byColumn["Consent recorded at (UTC)"]).toBe(receivedAt);
    expect(byColumn["Parental responsibility or documented authority"]).toBe("Yes");
    expect(byColumn["Authority wording version"]).toBe("authority-confirmation-2026-07-31");
    expect(byColumn["Learner consent route"]).toBe(LEARNER_AUTHORISED);
    expect(byColumn["Learner consent route wording version"]).toBe("learner-consent-route-2026-07-31");
    expect(byColumn["Special-category consent status"]).toBe("Active");
    expect(byColumn["Consent withdrawn at (UTC)"]).toBe("");
  });

  it("rejects special-category information from a relationship without launch authority", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    const respondent = payload.respondent as Record<string, unknown>;
    const support = payload.supportProfile as Record<string, unknown>;
    const confirmations = payload.confirmations as Record<string, unknown>;
    support.specialCategoryProvided = true;
    support.needsStatus = "Yes: diagnosed";
    confirmations.specialCategoryConsent = true;
    confirmations.specialCategoryAuthority = true;
    confirmations.learnerConsentRoute = LEARNER_CANNOT_CONSENT;
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(true);

    respondent.relationship = "Education or support professional";
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
  });

  it.each([LEARNER_CANNOT_CONSENT, LEARNER_AUTHORISED])(
    "accepts the permitted learner consent route: %s",
    async (learnerConsentRoute) => {
      const script = await loadAppsScript();
      const payload = validIntakeRequest();
      const support = payload.supportProfile as Record<string, unknown>;
      const confirmations = payload.confirmations as Record<string, unknown>;
      support.specialCategoryProvided = true;
      support.supportNeeds = "Fictional support detail";
      confirmations.specialCategoryConsent = true;
      confirmations.specialCategoryAuthority = true;
      confirmations.learnerConsentRoute = learnerConsentRoute;
      expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(true);
    },
  );

  it("rejects missing or crafted learner consent routes", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    const support = payload.supportProfile as Record<string, unknown>;
    const confirmations = payload.confirmations as Record<string, unknown>;
    support.specialCategoryProvided = true;
    confirmations.specialCategoryConsent = true;
    confirmations.specialCategoryAuthority = true;

    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
    confirmations.learnerConsentRoute = "A crafted route";
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
  });

  it.each(["supportNeeds", "helpfulStrategies", "unhelpfulApproaches", "otherBackground"])(
    "rejects crafted %s text when special-category information is declined",
    async (field) => {
      const script = await loadAppsScript();
      const payload = validIntakeRequest();
      (payload.supportProfile as Record<string, unknown>)[field] = "Fictional crafted detail";
      expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
    },
  );

  it("calculates the review date from the received date", async () => {
    const script = await loadAppsScript();
    expect(script.retentionReviewDate_("2026-08-15T12:00:00.000Z")).toBe("2027-02-15");
    expect(script.retentionReviewDate_("2026-08-31T12:00:00.000Z")).toBe("2027-02-28");
  });
});
