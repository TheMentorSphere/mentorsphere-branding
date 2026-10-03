import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy = readFileSync('docs/privacy-policy/index.html', 'utf8');
const policies = readFileSync('docs/policies/index.html', 'utf8');
// The effective date is set once, in the parity manifest, so that the adoption
// date can be confirmed in one place and checked everywhere.
const manifest = JSON.parse(readFileSync('business-documents/policies/policy-parity-manifest.json', 'utf8'));
const EFFECTIVE = manifest.policies.find((entry) => entry.title === 'Privacy Policy').effectiveDate;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EFFECTIVE_ISO = (() => {
  const [day, month, year] = EFFECTIVE.split(' ');
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
})();
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const text = textOf(policy);
const section13 = textOf(policy.match(/<h2 id="advertising-measurement">([\s\S]*?)<h2>14\./)[1]);

it('keeps the Phase 9 page configuration within the adopted V1.9 two-page scope', () => {
  for (const [slug, scope] of [['young-people', 1], ['adults', 2]]) {
    const html = readFileSync(`docs/adhd-coaching/${slug}/index.html`, 'utf8');
    const config = JSON.parse(html.match(/data-ads-measurement-config>(.*?)<\/script>/)[1]);
    expect(config.requiredConsentScopeVersion ?? 1).toBe(scope);
    expect(Object.keys(config.conversionLabels)).toHaveLength(2);
    expect(Object.keys(config.conversionLabels).every(event => /_(enquiry_success|booking_click)$/.test(event))).toBe(true);
  }
  expect(section13).toContain('Before measurement can be used on the adults page, you must accept the expanded scope.');
});

describe('Privacy Policy V1.9', () => {
  it('uses one version and effective date across metadata, controls and structured data', () => {
    expect(policy).toContain('<title>Privacy Policy V1.9 | The MentorSphere</title>');
    expect(policy).toContain(`content="Privacy Policy V1.9, effective ${EFFECTIVE},`);
    expect(policy).toContain(`<meta property="og:description" content="Privacy Policy V1.9, effective ${EFFECTIVE},`);
    expect(policy).toContain('<meta property="og:title" content="Privacy Policy V1.9 | The MentorSphere">');
    expect(text).toContain(`This web version reflects Privacy Policy V1.9, effective from ${EFFECTIVE}.`);
    expect(policy).toContain(`<span class="policy-version">V1.9, effective ${EFFECTIVE}</span>`);
    expect(policy).toContain('<div><dt>Version</dt><dd>1.9</dd></div>');
    expect(policy).toContain(`<div><dt>Effective date</dt><dd>${EFFECTIVE}</dd></div>`);
    const structuredData = JSON.parse(policy.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    expect(structuredData).toMatchObject({ name: 'Privacy Policy V1.9', version: '1.9', datePublished: EFFECTIVE_ISO, dateModified: EFFECTIVE_ISO });
    const privacyCard = policies.match(/<article class="policy-card">\s*<span class="policy-version">([^<]+)<\/span>\s*<h2>Privacy Policy<\/h2>([\s\S]*?)<\/article>/);
    expect(privacyCard[1]).toBe('Version 1.9');
    expect(privacyCard[2]).toContain(`Effective from ${EFFECTIVE}`);
    expect(policy).not.toMatch(/V1\.6, effective|<dd>1\.6<\/dd>|"version":"1\.6"/);
  });

  it('keeps the full change log, newest first', () => {
    const entries = [...policy.matchAll(/<p><strong>(V1\.\d), (\d+ \w+ 2026):<\/strong>/g)].map((match) => `${match[1]} ${match[2]}`);
    expect(entries).toEqual([`V1.9 ${EFFECTIVE}`, 'V1.8 3 October 2026', 'V1.7 30 September 2026', 'V1.6 25 September 2026', 'V1.5 31 July 2026', 'V1.4 28 July 2026']);
  });

  it('keeps every V1.6 section, in order, with the new section added before policy updates', () => {
    const headings = [...policy.matchAll(/<h2(?: id="[^"]+")?>(\d+)\. ([^<]+)<\/h2>/g)].map((match) => `${match[1]}. ${match[2]}`);
    expect(headings).toEqual([
      '1. Introduction',
      '2. Information collected',
      '3. How information is used',
      '4. Information sharing and security',
      '5. Individual rights',
      '6. Third-party services',
      '7. Session recordings',
      '8. Website contact form',
      '9. Primary and Secondary learner profiles',
      '10. ADHD Coaching Intake',
      '11. Consent, privacy rights and secure intake processing',
      '12. Retaining intake information',
      '13. Advertising measurement, cookies and similar technologies',
      '14. Policy updates',
      '15. Contact information',
    ]);
    for (const retained of [
      'Additional optional information supplied solely to personalise possible support is used on the basis of consent under Article 6(1)(a).',
      'explicit consent under Article 9(2)(a) is required as well.',
      'responses will normally be deleted six months after the last meaningful contact.',
      'Answers are not put into URLs or intentionally saved in localStorage or sessionStorage by The MentorSphere application.',
      'Recordings are made only with explicit prior consent.',
    ]) {
      expect(text).toContain(retained);
    }
  });

  it('explains consent-based Google Ads measurement and how to refuse or withdraw it', () => {
    for (const statement of [
      'Article 6(1)(a) of the UK GDPR',
      'Privacy and Electronic Communications Regulations',
      'Before then, the Google Ads code is not loaded and no advertising measurement information is sent to Google.',
      'Nothing is accepted by default, and continuing to use the website is not treated as acceptance.',
      'does not affect your use of the website, sending an enquiry or booking an introduction.',
      'You can change or withdraw your choice at any time using the "Cookie settings" control at the bottom of The MentorSphere website\'s pages.',
      'This is currently limited to the ADHD coaching landing page for young people and parents and the ADHD coaching landing page for adults.',
      'Withdrawal does not affect measurement that took place lawfully before it was withdrawn.',
      'The website cannot see whether an appointment is then made, and a click is not treated as a booking.',
      'This is recorded only after the form provider confirms that the enquiry has been received.',
      'Enhanced conversions, remarketing, Customer Match and advertising audiences are not used as part of this setup',
    ]) {
      expect(section13).toContain(statement);
    }
    for (const item of ['mentorsphere-consent', '_gcl_au', '_gcl_aw', '_gcl_gb', '_gcl_dc', '_gcl_gs', '_gcl_ls']) {
      expect(section13).toContain(item);
    }
    for (const neverSent of ['names, email addresses, telephone numbers and messages', 'individual health, disability, diagnosis, SEND or neurodiversity information supplied through enquiries', 'ADHD Coaching Intake or learner-profile responses']) {
      expect(section13).toContain(neverSent);
    }
    expect(policy).toContain('<button class="button button-secondary" type="button" data-consent-open hidden>Change your advertising measurement choice</button>');
    expect(policy).toContain('<script src="../assets/js/consent.js?v=20261003-consent-scope-v2" defer></script>');
    expect(text).toContain('Enquiry form contents are not sent to Google Ads.');
    expect(text).toContain('Google Ads: measuring, only with consent,');
  });

  it('avoids absolute legal guarantees and dash characters', () => {
    expect(section13).not.toMatch(/fully compliant|guarantee|complies with/i);
    const enOrEmDash = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'u');
    expect(policy).not.toMatch(enOrEmDash);
  });

  it('limits capability to exactly two named landing pages and explains renewal without claiming activation', () => {
    const scope = section13.match(/This is currently limited to ([^.]+)\./g);
    expect(scope).toEqual(['This is currently limited to the ADHD coaching landing page for young people and parents and the ADHD coaching landing page for adults.']);
    expect(section13).not.toMatch(/ADHD coaching pages generally|all ADHD coaching pages|all advertising landing pages|on that page|from that page/);
    expect(section13).toContain('on either of these pages');
    expect(section13).toContain('from either of these pages');
    expect(section13).toContain('Before measurement can be used on the adults page, you must accept the expanded scope.');
    expect(section13).toContain('An existing rejection continues to apply to both pages without a new request solely because the scope has expanded');
    expect(section13).toContain('rejecting the expanded scope also switches measurement off for both pages');
    expect(section13).toContain('the scope covered by that choice');
    expect(text).toContain('This revision does not activate adult measurement.');
    expect(section13).toContain('advertising personalisation signals are switched off');
    expect(section13).toContain('Google Analytics and other advertising tracking, such as Meta Pixel, are not used');
    expect(section13).toContain('removes the Google Ads cookies and stored items that it can access');
    expect(section13).toContain('Your choice is remembered for six months');
  });

  it('distinguishes consented page context from personal form and health information', () => {
    expect(section13).toContain('the page title and the address of the referring page, where available');
    expect(section13).toContain('Google may send page-view measurement when its code loads after you accept');
    expect(section13).toContain('Page addresses and titles may indicate that the page relates to ADHD coaching');
    expect(section13).toContain('separate from personal information you enter into a form');
    expect(section13).toContain('does not establish that you have ADHD or another condition');
    expect(policy).not.toContain('<li>health, disability, diagnosis, SEND or neurodiversity information;</li>');
  });
});
