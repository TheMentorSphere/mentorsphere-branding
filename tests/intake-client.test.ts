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

  it("ships the v4 payload and exact learner consent-route question", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(script).toContain("formVersion: 'primary-learner-profile-v4'");
    expect(html).toContain('name="form_version" value="primary-learner-profile-v4"');
    expect(html).toContain("Which statement applies to the learner’s consent?");
    expect(html).toContain("The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.");
  });

  it("uses checkbox contact methods and an ordered array payload", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(html.match(/type="checkbox" name="preferred_contact_methods"/gu)).toHaveLength(4);
    expect(html).toContain('data-field-path="respondent.preferredContactMethods"');
    expect(html).toContain("Choose at least one preferred contact method.");
    expect(script).toContain("preferredContactMethods: canonicalContactMethods()");
    expect(script).toContain("CONTACT_METHODS.filter((method) => selected.has(method))");
    expect(script).toContain("['Preferred contact methods', canonicalContactMethods().join('; ')]");
    expect(script).toContain("const selectedPhoneMethods = canonicalContactMethods().filter");
    expect(script).toContain("if (!required || mobileInput.value.trim()) clearFieldError(wrapper)");
    expect(script).toContain("if (event.target.name === 'preferred_contact_methods') updateMobileRequirement()");
  });

  it("hides every decorative choice icon and names every subject logo", async () => {
    const html = await readFile(
      path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"),
      "utf8",
    );

    const iconCount = (html.match(/class="choice-icon"/gu) ?? []).length;
    expect(iconCount).toBeGreaterThanOrEqual(13);
    expect(html.match(/class="choice-icon" aria-hidden="true" focusable="false"/gu)).toHaveLength(iconCount);
    expect(html).toContain('src="../../assets/images/english-logo.svg"');
    expect(html).toContain('alt="The English Mentor geometric book logo"');
    expect(html).toContain('src="../../assets/images/maths-logo.svg"');
    expect(html).toContain('alt="The Maths Mentor geometric cube logo"');
    expect(html).toContain('src="../../assets/images/science-logo.svg"');
    expect(html).toContain('alt="The Science Mentor geometric laboratory flask logo"');
  });

  it("retains noindex and responsive accessibility treatments", async () => {
    const [html, css] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "css", "intake-forms.css"), "utf8"),
    ]);

    expect(html).toContain('<meta name="robots" content="noindex,nofollow,noarchive">');
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (max-width: 32rem)");
    expect(css).toMatch(/\.page-intake-form\s*\{[^}]*min-width:\s*0;/su);
  });
});
