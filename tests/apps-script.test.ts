import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { validIntakeRequest } from "./fixtures";

const LEARNER_CANNOT_CONSENT =
  "The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.";
const LEARNER_AUTHORISED =
  "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.";

interface AppsScriptTestExports {
  FORM_VERSION: string;
  CONSENT_WORDING_VERSION: string;
  AUTHORITY_WORDING_VERSION: string;
  LEARNER_CONSENT_ROUTE_WORDING_VERSION: string;
  SHEET_COLUMNS: string[];
  classifyDuplicate_(sheet: unknown, submissionId: string, cache: unknown): { status: string; rowNumber: number };
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
    `${source}\nglobalThis.__testExports = { FORM_VERSION, CONSENT_WORDING_VERSION, AUTHORITY_WORDING_VERSION, LEARNER_CONSENT_ROUTE_WORDING_VERSION, SHEET_COLUMNS, classifyDuplicate_, hasValidShape_, retentionReviewDate_, rowFor_ };`,
    sandbox,
  );
  if (!sandbox.__testExports) throw new Error("Apps Script test exports were not created");
  return sandbox.__testExports;
}

describe("Apps Script retention schema", () => {
  it("accepts only the V5 form contract", async () => {
    const script = await loadAppsScript();
    expect(script.FORM_VERSION).toBe("primary-learner-profile-v5");
    const v4 = validIntakeRequest();
    v4.formVersion = "primary-learner-profile-v4";
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload: v4 })).toBe(false);
  });

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
    expect(byColumn["Explicit consent wording version"]).toBe("explicit-consent-v5-2026-08-01");
    expect(byColumn["Consent recorded at (UTC)"]).toBe(receivedAt);
    expect(byColumn["Parental responsibility or documented authority"]).toBe("Yes");
    expect(byColumn["Authority wording version"]).toBe("special-category-authority-v5-2026-08-01");
    expect(byColumn["Learner consent route"]).toBe(LEARNER_AUTHORISED);
    expect(byColumn["Learner consent route wording version"]).toBe("learner-consent-route-v5-2026-08-01");
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

  it("stores formula-like text as literal text", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    const support = payload.supportProfile as Record<string, unknown>;
    const confirmations = payload.confirmations as Record<string, unknown>;
    support.specialCategoryProvided = true;
    support.supportNeeds = "=FICTIONAL_TEST_VALUE";
    confirmations.specialCategoryConsent = true;
    confirmations.specialCategoryAuthority = true;
    confirmations.learnerConsentRoute = LEARNER_AUTHORISED;
    const row = Array.from(script.rowFor_({ issuedAt: new Date().toISOString(), payload }, "2026-08-01T10:15:30.000Z"));
    expect(row[21]).toBe("'=FICTIONAL_TEST_VALUE");
  });

  it("requires a fresh signed-envelope timestamp shape", async () => {
    const script = await loadAppsScript();
    const payload = validIntakeRequest();
    expect(script.hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(true);
    expect(script.hasValidShape_({ issuedAt: "2020-01-01T00:00:00.000Z", payload })).toBe(false);
  });

  it("keeps notification contents minimal and verifies storage before created success", async () => {
    const source = await readFile(
      path.join(process.cwd(), "integrations", "google-apps-script", "primary-learner-profile", "Code.gs"),
      "utf8",
    );
    const notificationFunction = source.slice(
      source.indexOf("function sendMinimalNotification_"),
      source.indexOf("function doPost"),
    );
    expect(notificationFunction).toContain("A new learner profile was received at");
    expect(notificationFunction).toContain("This notification intentionally contains no learner or respondent answers.");
    expect(notificationFunction).not.toMatch(/payload\.(?:respondent|learner|supportProfile|sessionPreferences)/u);
    expect(source).toContain("SpreadsheetApp.flush()");
    expect(source).toContain("verifyStoredRow_(sheet, rowNumber, request.payload.submissionId)");
    expect(source).toContain("{ success: true, stored: true, status: 'created', notificationSent }");
  });

  it("classifies a cached duplicate without a durable row as an error", async () => {
    const script = await loadAppsScript();
    const sheet = { getLastRow: () => 1 };
    const cache = { get: () => "stored" };
    expect(script.classifyDuplicate_(sheet, "123e4567-e89b-42d3-a456-426614174000", cache)).toEqual({
      status: "duplicate_without_record",
      rowNumber: 0,
    });
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
