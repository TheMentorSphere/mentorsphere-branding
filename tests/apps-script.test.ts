import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { validIntakeRequest } from "./fixtures";

interface AppsScriptTestExports {
  SHEET_COLUMNS: string[];
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
    `${source}\nglobalThis.__testExports = { SHEET_COLUMNS, retentionReviewDate_, rowFor_ };`,
    sandbox,
  );
  if (!sandbox.__testExports) throw new Error("Apps Script test exports were not created");
  return sandbox.__testExports;
}

describe("Apps Script retention schema", () => {
  it("appends the five administrative retention columns in the enforced order", async () => {
    const script = await loadAppsScript();
    expect(Array.from(script.SHEET_COLUMNS).slice(-5)).toEqual([
      "Record status",
      "Last meaningful contact date",
      "Retention review date",
      "Safeguarding or legal hold",
      "Retention notes",
    ]);
    expect(script.SHEET_COLUMNS).toHaveLength(40);
  });

  it("initialises a prospective record with a six-month review date", async () => {
    const script = await loadAppsScript();
    const receivedAt = "2026-07-31T10:15:30.000Z";
    const row = Array.from(script.rowFor_(
      { issuedAt: "2026-07-31T10:15:29.000Z", payload: validIntakeRequest() },
      receivedAt,
    ));

    expect(row).toHaveLength(40);
    expect(row.slice(-5)).toEqual(["Prospective", "2026-07-31", "2027-01-31", "No", ""]);
  });

  it("calculates the review date from the received date", async () => {
    const script = await loadAppsScript();
    expect(script.retentionReviewDate_("2026-08-15T12:00:00.000Z")).toBe("2027-02-15");
    expect(script.retentionReviewDate_("2026-08-31T12:00:00.000Z")).toBe("2027-02-28");
  });
});
