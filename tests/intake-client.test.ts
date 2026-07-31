import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const narrativePaths = ["supportNeeds", "helpfulStrategies", "unhelpfulApproaches", "otherBackground"];

describe("primary learner profile client controls", () => {
  it("keeps every narrative support field inside the hidden special-category route", async () => {
    const html = await readFile(
      path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"),
      "utf8",
    );

    for (const field of narrativePaths) {
      expect(html).toMatch(
        new RegExp(`data-special-category-field[^>]+data-field-path="supportProfile\\.${field}"[^>]+hidden`, "u"),
      );
    }
  });

  it("uses one shared clearing path for narratives, consent, authority and learner route", async () => {
    const script = await readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8");

    expect(script).toContain("form.querySelectorAll('[data-special-category-field]')");
    expect(script).toContain("form.querySelectorAll('[data-special-category-confirmation]')");
    expect(script.match(/if \(!provided\) clearContainerControls\(field\);/gu)).toHaveLength(2);
    expect(script).toContain("learnerConsentRoute: singleValue('learner_consent_route')");
  });

  it("ships the v3 payload and exact learner consent-route question", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(script).toContain("formVersion: 'primary-learner-profile-v3'");
    expect(html).toContain("Which statement applies to the learner’s consent?");
    expect(html).toContain("The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.");
  });
});
