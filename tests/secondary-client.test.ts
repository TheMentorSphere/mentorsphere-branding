import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
const html = await readFile("docs/forms/secondary-learner-profile/index.html", "utf8");
const script = await readFile("docs/assets/js/secondary-intake-form.js", "utf8");
describe("Secondary client privacy and content invariants", () => {
    it("is unlisted and uses its separate endpoint/version/client", () => {
        expect(html).toContain('content="noindex,nofollow,noarchive"');
        expect(html).toContain('action="/api/forms/secondary-learner-profile"');
        expect(script).toContain("formVersion: 'secondary-learner-profile-v1'");
        expect(html).not.toContain("js/intake-form.js");
    });
    it("retains all legacy relationship routes with the Primary authorised subset", () => {
        for (const relationship of ["Parent", "Guardian or carer", "Education or support professional", "Medical or health professional", "Other family member", "Friend", "Employer", "Other"])
            expect(html).toContain(`name="relationship" value="${relationship}"`);
        expect(script).toContain("new Set(['Parent', 'Guardian or carer'])");
    });
    it("records separate explicit consent, authority and the age/understanding route before sensitive fields", () => {
        for (const name of ["special_category_consent", "special_category_authority", "learner_consent_route"])
            expect(html.indexOf(`name="${name}"`)).toBeLessThan(html.indexOf('name="needs_status"'));
        expect(html).toContain("documented legal authority");
        expect(script).toContain("Boolean(namedControl('special_category_authority')?.checked)");
    });
    it("keeps every support narrative and EHCP field hidden until consent", () => {
        for (const field of ["supportNeeds", "helpfulStrategies", "unhelpfulApproaches", "otherBackground", "ehcpStatus"])
            expect(html).toMatch(new RegExp(`data-special-category-field[^>]+data-field-path="supportProfile\\.${field}"[^>]*hidden`, "u"));
        expect(script).toContain("clearContainerControls(field)");
    });
    it("offers all school years with optional subject-specific boards and no silent grade additions", () => {
        for (const year of [7, 8, 9, 10, 11])
            expect(html).toContain(`<option value="Year ${year}">`);
        expect(html).toContain('Other / not currently following a standard school year');
        for (const subject of ["english", "maths", "science", "other"])
            expect(html).toMatch(new RegExp(`name="exam_board_${subject}"[^>]+maxlength="160"[^>]+>`, "u"));
        expect(html).toContain('value="Not known"');
        expect(html).toContain('value="Not applicable"');
        expect(html).not.toContain('name="target_grade"');
        expect(script).toContain('selected.includes(subject)');
    });
    it("preserves multiple session preferences and a distinct service-enquiry preference", () => {
        expect(html.match(/type="checkbox" name="session_length"/gu)).toHaveLength(5);
        expect(html.match(/type="checkbox" name="session_frequency"/gu)).toHaveLength(6);
        expect(script).toContain("sessionLength: multipleValues('session_length')");
        expect(script).toContain("sessionFrequency: multipleValues('session_frequency')");
        expect(html).toContain('not marketing consent');
    });
    it("retains Primary submission/token helpers without persistence or answer interpolation", () => {
        expect(script).toContain("from './intake-submission-contract.js'");
        expect(script).not.toMatch(/localStorage|sessionStorage|document\.cookie|console\.|\.innerHTML/u);
        for (const callback of ['expired-callback', 'timeout-callback', 'error-callback', 'turnstileTokenIsStale', 'isExpired'])
            expect(script).toContain(callback);
        expect(script.match(/submissionId = crypto\.randomUUID\(\)/gu)).toHaveLength(1);
    });
    it("revalidates earlier steps and provides keyboard review/progress/error navigation", () => {
        expect(script).toContain("element.hidden && !element.matches('[data-step]')");
        expect(script).toContain("highestValidatedStep = editedStep - 1");
        expect(script).toContain("control.focus()");
        expect(script).toContain("button.setAttribute('aria-current', 'step')");
        expect(html).not.toMatch(/tabindex="[1-9]/u);
    });
});
