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

  it("uses one shared clearing path for sensitive fields and Part 3 consent controls", async () => {
    const script = await readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8");

    expect(script).toContain("form.querySelectorAll('[data-special-category-field]')");
    expect(script).toContain("form.querySelectorAll('[data-special-category-consent-control]')");
    expect(script).toContain("clearContainerControls(field)");
    expect(script).toContain("Optional sensitive information was cleared because consent is no longer complete.");
    expect(script).toContain("const learnerConsentRoute = singleValue('learner_consent_route')");
  });

  it("ships the V5 payload and exact learner consent-route question", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(script).toContain("formVersion: 'primary-learner-profile-v5'");
    expect(html).toContain('name="form_version" value="primary-learner-profile-v5"');
    expect(html).toContain("Who is giving or authorising this consent?");
    expect(html).toContain("The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.");
    expect(html).toContain("The learner is not currently able to understand and give informed consent");
  });

  it("uses one combined authority and privacy acknowledgement on the final section", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(html.match(/name="authority_privacy_confirmation"/gu)).toHaveLength(1);
    expect(html).not.toContain('name="authorised_confirmation"');
    expect(html).not.toContain('name="privacy_confirmation"');
    expect(html).not.toContain('name="special_category_authority"');
    expect(html).toContain('href="../../privacy-policy/" target="_blank" rel="noopener"');
    expect(script).toContain("authorised: authorityPrivacyConfirmed");
    expect(script).toContain("privacyAcknowledged: authorityPrivacyConfirmed");
  });

  it("places consent before sensitive fields and gates their reveal", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(html.indexOf('name="special_category_consent"')).toBeLessThan(html.indexOf('name="needs_status"'));
    expect(html.indexOf('name="learner_consent_route"')).toBeLessThan(html.indexOf('name="needs_status"'));
    expect(script).toContain("const consentComplete = requested &&");
    expect(script).toContain("Boolean(namedControl('special_category_consent')?.checked)");
    expect(script).toContain("Boolean(singleValue('learner_consent_route'))");
  });

  it("uses accessible progress buttons without positive tabindex", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
    ]);

    expect(html.match(/data-progress-button="[1-5]"/gu)).toHaveLength(5);
    expect(html.match(/aria-label="Go to section [1-5]:/gu)).toHaveLength(5);
    expect(html).toContain('aria-current="step"');
    expect(html).not.toMatch(/tabindex="[1-9]/u);
    expect(script).toContain("stepNumber <= highestValidatedStep");
    expect(script).toContain("stepNumber === 5 && highestValidatedStep >= 4");
    expect(script).toContain("highestValidatedStep = editedStep - 1");
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

  it("renders a selectable, accessible per-request reference without browser storage", async () => {
    const [html, formScript, contractScript, css] = await Promise.all([
      readFile(path.join(process.cwd(), "docs", "forms", "primary-learner-profile", "index.html"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-submission-contract.js"), "utf8"),
      readFile(path.join(process.cwd(), "docs", "assets", "css", "intake-forms.css"), "utf8"),
    ]);

    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(formScript).toContain("reference.className = 'intake-request-reference'");
    expect(formScript).toContain("reference.textContent = referenceText");
    expect(formScript).toContain("submitStatus.replaceChildren()");
    expect(contractScript).toContain("`Reference: ${requestId}`");
    expect(css).toMatch(/\.intake-request-reference\s*\{[^}]*user-select:\s*text;/su);

    for (const source of [formScript, contractScript]) {
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("sessionStorage");
    }
  });

  it("refreshes expired or failed Turnstile challenges without losing the submission identity", async () => {
    const script = await readFile(path.join(process.cwd(), "docs", "assets", "js", "intake-form.js"), "utf8");

    expect(script).toContain("let turnstileTokenIssuedAt = null");
    expect(script).toContain("turnstileTokenIssuedAt = Date.now()");
    expect(script).toContain("window.turnstile.isExpired(turnstileWidgetId)");
    expect(script).toContain("'timeout-callback': () =>");
    expect(script).toContain("resetTurnstile('The security check expired. Please complete it again.')");
    expect(script).toContain("resetTurnstile('The security check timed out. Please complete it again.')");
    expect(script).toContain("const expiredMessage = 'The security check has expired. Please complete it again before submitting.'");
    expect(script).toContain("if (ui.resetTurnstile) resetTurnstile()");
    expect(script.match(/submissionId = crypto\.randomUUID\(\)/gu)).toHaveLength(1);
  });
});
