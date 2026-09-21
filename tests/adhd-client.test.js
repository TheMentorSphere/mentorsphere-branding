import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { adhdConsentState, adhdStepRoute } from '../docs/assets/js/adhd-intake-form.js';

const html = await readFile('docs/forms/adhd-coaching-intake/index.html', 'utf8');
const client = await readFile('docs/assets/js/adhd-intake-form.js', 'utf8');
const contract = await readFile('docs/assets/js/intake-submission-contract.js', 'utf8');
const css = await readFile('docs/assets/css/intake-forms.css', 'utf8');

describe('ADHD route and consent rules used by the client', () => {
  it.each([
    ['adult', [1, 2, 4, 5]], ['child', [1, 2, 4, 5]],
    ['parent', [1, 3, 4, 5]], ['combined', [1, 2, 3, 4, 5]], ['', [1, 5]],
  ])('%s shows only its relevant screens', (branch, steps) => {
    expect(adhdStepRoute(branch)).toEqual(steps);
  });

  it.each(['adult', 'parent'])('%s permits only the respondent’s consent', (branch) => {
    expect(adhdConsentState(branch, true, true, true, 'route')).toEqual({ adult: true, child: false, additional: true });
    expect(adhdConsentState(branch, false, true, true, 'route')).toEqual({ adult: false, child: false, additional: false });
  });

  it('child route cannot use an adult consent flag to reveal anything', () => {
    expect(adhdConsentState('child', true, false, false, '')).toEqual({ adult: false, child: false, additional: false });
  });

  it.each([
    [false, true, 'route'], [true, false, 'route'], [true, true, ''],
    [false, false, ''], [false, false, 'route'], [true, false, ''], [false, true, ''],
  ])('child sensitive information stays hidden for incomplete consent %s/%s/%s', (consent, authority, route) => {
    expect(adhdConsentState('child', false, consent, authority, route).child).toBe(false);
    expect(adhdConsentState('child', false, consent, authority, route).additional).toBe(false);
  });

  it('reveals child fields only after separate consent, authority and learner route', () => {
    expect(adhdConsentState('child', false, true, true, 'learner authorised')).toEqual({ adult: false, child: true, additional: true });
  });

  it('combined optional free text requires both adult and child consent', () => {
    expect(adhdConsentState('combined', false, true, true, 'route')).toEqual({ adult: false, child: true, additional: false });
    expect(adhdConsentState('combined', true, false, true, 'route')).toEqual({ adult: true, child: false, additional: false });
    expect(adhdConsentState('combined', true, true, true, 'route')).toEqual({ adult: true, child: true, additional: true });
  });

  it('unknown routes cannot unlock consented fields', () => {
    expect(adhdConsentState('unknown', true, true, true, 'route')).toEqual({ adult: false, child: false, additional: false });
  });
});

describe('ADHD client contract and safeguards', () => {
  it('retains the optional discovery-call route and contact alternative', () => {
    expect(html).toContain('Completing this form is entirely optional. It is not required to access a discovery call.');
    expect(html).toContain('You can discuss these areas during the call instead.');
    expect(html).toContain('Brief answers are welcome.');
    expect(html).toContain('alternative format');
    expect(html).toContain('not therapy, diagnosis, medical treatment or crisis support');
  });

  it('never requests child identification in the parent-only route', () => {
    const childBlock = html.slice(html.indexOf('data-branch="child combined"'), html.indexOf('data-step="3"'));
    expect(childBlock).toContain('name="child_name"');
    expect(childBlock).toContain('name="child_stage"');
    expect(html).toContain('Supporting more than one child');
    expect(html).not.toContain('Multiple neurodivergent children');
    expect(html).not.toContain('crisis mode');
  });

  it('includes source options, modernised language and prefer-not-to-say', () => {
    for (const option of ['Prefer not to say', 'Self-identified / suspected', 'Emotional regulation', 'School attendance', 'Autism / autistic', 'Severe: significant current difficulty']) expect(html).toContain(option);
    expect(html).not.toContain('Self-Diagnosed');
    expect(html).not.toContain('Emotional outbursts');
  });

  it('puts consent before sensitive questions and preserves Primary learner routes', () => {
    expect(html.indexOf('name="adult_special_category_consent"')).toBeLessThan(html.indexOf('name="adult_status"'));
    expect(html.indexOf('name="child_special_category_consent"')).toBeLessThan(html.indexOf('name="child_neurodivergence"'));
    expect(html.indexOf('name="child_special_category_authority"')).toBeLessThan(html.indexOf('name="child_neurodivergence"'));
    expect(html).toContain('The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.');
    expect(html).toContain('The learner is not currently able to understand and give informed consent');
    expect(html).toContain('data-clear-child-consent');
    expect(html).toContain('No blanket assumption is made about age or capacity.');
  });

  it('guards additional information and clears it on every route change', () => {
    expect(html).toContain('data-sensitive="additional" hidden');
    expect(client).toContain("additionalInformation: value(consent.additional, 'additional_information')");
    expect(client).toContain('if (supportFor !== previousSupportFor)');
    expect(client).toContain("clearContainerControls(form.querySelector('[data-sensitive=\"additional\"]'))");
    expect(html).toContain('Please include only information that is relevant to the discovery call or support you are seeking.');
    for (const prompt of ['accessibility needs', 'camera or captions preferences', 'preferred name or pronouns', 'topics you do not want to discuss yet', 'previous support that did not work']) expect(html).toContain(prompt);
  });

  it('clears disabled branches, conditional Other fields and withdrawn consent', () => {
    expect(client).toContain('if (!visible) clearContainerControls(branch)');
    expect(client).toContain('if (!visible) clearContainerControls(field)');
    expect(client).toContain('if (!selected) clearContainerControls(field)');
    expect(client).toContain('Optional sensitive information was cleared because consent is no longer complete.');
    expect(client).toContain('Optional child consent and sensitive answers have been cleared.');
    expect(html.match(/data-conditional="/gu)).toHaveLength(9);
  });

  it('requires at least one contact method and phone only for telephone methods', () => {
    expect(html.match(/type="checkbox" name="preferred_contact_methods"/gu)).toHaveLength(4);
    expect(client).toContain("['Telephone', 'Text message', 'WhatsApp']");
    expect(client).toContain('mobileInput.required = required');
    expect(client).toContain('preferredContactMethods: canonicalContactMethods()');
  });

  it('validates all relevant steps on submit including wizard-hidden steps', () => {
    expect(client).toContain('for (const stepNumber of route())');
    expect(client).not.toContain("wrapper.closest('[hidden]')");
    expect(client).toContain('stepNumber <= highestValidatedStep');
    expect(client).toContain('highestValidatedStep = editedStep - 1');
    expect(client).toContain('if (!validateEveryStep()) return');
    expect(html).toContain('aria-current="step"');
    expect(html).not.toMatch(/tabindex="[1-9]/u);
  });

  it('uses the unchanged proven submission contract with a stable retry identity', () => {
    expect(client).toContain("from './intake-submission-contract.js'");
    expect(client.match(/submissionId = crypto.randomUUID\(\)/gu)).toHaveLength(1);
    expect(client).toContain('requestSubmission(fetch, API_ENDPOINT, intakePayload())');
    expect(contract).toContain('SUBMISSION_TIMEOUT_MS = 30_000');
    expect(client).toContain("ui.buttonText = 'Submit optional intake form'");
    expect(client).toContain('reference.textContent = referenceText');
  });

  it('refreshes expired or failed Turnstile checks and records token time', () => {
    expect(client).toContain('turnstileTokenIssuedAt = Date.now()');
    expect(client).toContain('turnstileTokenIsStale(turnstileToken, turnstileTokenIssuedAt)');
    expect(client).toContain('window.turnstile.isExpired(turnstileWidgetId)');
    for (const callback of ['expired-callback', 'timeout-callback', 'error-callback']) expect(client).toContain(callback);
    expect(client).toContain('if (ui.resetTurnstile) resetTurnstile()');
  });

  it('keeps answers in memory and out of storage, URLs and analytics', () => {
    for (const source of [client, contract, html]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|URLSearchParams|history\.pushState|analytics|gtag\(/u);
    }
    expect(client).not.toContain('console.');
    expect(html).toContain('method="post"');
    expect(html).toContain('noindex,nofollow,noarchive');
  });

  it('reuses accessible Primary CSS and unique ids with linked error descriptions', () => {
    expect(html).toContain('../../assets/css/intake-forms.css?v=20260801v5');
    for (const query of ['forced-colors: active', 'prefers-reduced-motion: reduce', 'max-width: 32rem']) expect(css).toContain(query);
    const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of html.matchAll(/aria-describedby="([^"]+)"/gu)) {
      for (const reference of match[1].split(' ')) expect(ids).toContain(reference);
    }
  });

  it('does not add the unlisted route to the sitemap or home navigation', async () => {
    for (const path of ['docs/sitemap.xml', 'docs/index.html']) {
      expect(await readFile(path, 'utf8')).not.toContain('/forms/adhd-coaching-intake/');
    }
  });
});
