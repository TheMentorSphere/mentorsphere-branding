import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');
const page = read('docs/adhd-coaching/young-people/index.html');
const overview = read('docs/adhd-coaching/index.html');
const sitemap = read('docs/sitemap.xml');
const siteScript = read('docs/assets/js/site.js');

const CANONICAL = 'https://www.thementorsphere.co.uk/adhd-coaching/young-people/';
const BOOKING_URL = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ViGgA98iq2gb-3Xn3TdTTqfAdWXE2XN5SpS6PBaaZzRc5DXacuud78LNwUEHlSSk5VPAYTcB-';

const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const main = page.match(/<main id="main-content">([\s\S]*?)<\/main>/)[1];
const hero = page.match(/<section class="page-hero">([\s\S]*?)<\/section>/)[1];
const sectionById = (id) => page.match(new RegExp(`<section[^>]*id="${id}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? '';
const form = page.match(/<form\b[\s\S]*?<\/form>/)[0];

describe('young people ADHD coaching landing page', () => {
  it('is one indexable, self-canonical page linked from the overview and sitemap', () => {
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('<h1>ADHD coaching for young people and their parents</h1>');
    expect(page).toContain('<title>Online ADHD Coaching for Young People and Parents | The MentorSphere</title>');
    expect(page).toMatch(/<meta name="description" content="[^"]+">/);
    expect(page).toContain('<meta name="robots" content="index,follow">');
    expect(page).toContain(`<link rel="canonical" href="${CANONICAL}">`);
    expect(page).toContain(`<meta property="og:url" content="${CANONICAL}">`);
    expect(sitemap.split(`<loc>${CANONICAL}</loc>`)).toHaveLength(2);
    expect(overview).toContain('<a class="card-link" href="young-people/">Find out about ADHD coaching for young people</a>');
    expect(page).toContain('<li><a href="../">ADHD Coaching</a></li><li><span aria-current="page">Young people</span></li>');
  });

  it('publishes valid WebPage, breadcrumb and UK-only Service structured data', () => {
    const blocks = [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    expect(blocks).toHaveLength(1);
    const graph = blocks[0]['@graph'];
    expect(graph.map((item) => item['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'Service']);
    const breadcrumb = graph.find((item) => item['@type'] === 'BreadcrumbList');
    expect(breadcrumb.itemListElement.map((item) => item.item)).toEqual([
      'https://www.thementorsphere.co.uk/',
      'https://www.thementorsphere.co.uk/adhd-coaching/',
      CANONICAL,
    ]);
    const service = graph.find((item) => item['@type'] === 'Service');
    expect(service.areaServed).toEqual({ '@type': 'Country', name: 'United Kingdom' });
    expect(service.audience[0]).toMatchObject({ suggestedMinAge: 10, suggestedMaxAge: 17 });
    expect(service.hasOfferCatalog.itemListElement.map((offer) => offer.price)).toEqual(['70', '390', '740']);
    expect(JSON.stringify(blocks)).not.toMatch(/aggregateRating|"review|MedicalBusiness|hasCredential/);
  });

  it('keeps the first campaign focused on the UK', () => {
    expect(textOf(main)).not.toMatch(/United States|international|time[- ]zone/i);
  });

  it('shows the verified self-funded prices and keeps funded pricing out of the journey', () => {
    expect(hero).toContain('£70 for 60 minutes');
    expect(textOf(hero)).toContain('Discounted bundles are also available');
    expect(hero).not.toMatch(/£390|£740|£65|£61|six|twelve|valid for/i);
    expect(textOf(sectionById('pricing'))).toContain('whether the coaching client is your young person or you as a parent or carer');
    for (const text of ['£70', '£390', '£740', 'Valid for six months', 'Valid for twelve months', 'a package is not required']) {
      expect(main).toContain(text);
    }
    expect(main).not.toContain('£110');
    expect(main).not.toMatch(/Access to Work|employer-funded/i);
  });

  it('uses one booking label and never states an unverified introduction length', () => {
    const bookingLinks = [...page.matchAll(/<a\b([^>]*)href="(https:\/\/calendar\.google\.com[^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)];
    expect(bookingLinks.length).toBeGreaterThanOrEqual(4);
    for (const [, before, href, after, label] of bookingLinks) {
      expect(href).toBe(BOOKING_URL);
      expect(`${before}${after}`).toContain('target="_blank"');
      expect(`${before}${after}`).toContain('rel="noopener"');
      expect(textOf(label).trim()).toMatch(/^Book a free introduction/);
    }
    expect(page).not.toMatch(/discovery call|introductory session/i);
    expect(textOf(sectionById('introduction'))).not.toMatch(/\bminutes?\b|\bhours?\b/i);
    expect(textOf(main)).not.toMatch(/free (?:assessment|report|strategy plan)/i);
    expect(sectionById('introduction')).toContain('does not commit you to paid coaching');
  });

  it('marks booking links only as click observations, never as confirmed bookings', () => {
    const calendarLinks = [...page.matchAll(/<a\b[^>]*calendar\.google\.com[^>]*>/g)].map((match) => match[0]);
    expect(calendarLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of calendarLinks) {
      expect(link).toContain('data-measure-event="adhd_young_people_booking_click"');
      expect(link).not.toMatch(/\sonclick=/i);
    }
    expect(page).not.toMatch(/booking_confirmed|appointment_confirmed/i);
    expect(siteScript).not.toContain('calendar.google.com');
  });

  it('keeps the detailed intake optional and unlinked', () => {
    expect(page).not.toContain('forms/adhd-coaching-intake');
    expect(sectionById('introduction')).toContain('You do not need to complete the optional ADHD coaching intake questionnaire first.');
  });

  it('preserves the policy position on privacy, parent involvement, school and boundaries', () => {
    const text = textOf(main);
    expect(text).toContain('around one in every four sessions involves a parent or guardian');
    expect(text).toContain('general recommendation, not a requirement');
    expect(text).toContain("age, needs, preferences and circumstances");
    expect(text).toContain('age-appropriate privacy');
    expect(hero).toContain('For young people aged&nbsp;10&nbsp;to&nbsp;17');
    expect(textOf(hero)).toContain('young people and their parents or carers');
    expect(textOf(hero)).toContain('occasional parent or carer sessions');
    const parents = textOf(sectionById('parents'));
    expect(parents).toContain('your young person does not need to be receiving coaching too');
    expect(parents).toContain('is not automatically passed on to you');
    const confidentiality = textOf(sectionById('confidentiality'));
    for (const limit of ['safeguarding concern', 'serious risk of harm', 'legal requirement']) {
      expect(confidentiality).toContain(limit);
    }
    const school = textOf(sectionById('school'));
    expect(school).toContain('appropriate consent');
    expect(school).toContain('not automatically included in the standard session price');
    expect(text).toContain('not therapy, clinical diagnosis, medical treatment or crisis support');
    expect(text).toContain('The MentorSphere cannot diagnose ADHD');
  });

  it('avoids unsupported proof, urgency and dash characters', () => {
    expect(textOf(main)).not.toMatch(/testimonial|accredit|certified|qualified|qualification|\bICF\b|★|guarantee|limited (?:places|spaces)|hurry/i);
    expect(page).not.toMatch(/<img\b[^>]*(?:portrait|headshot|photo)/i);
    const enOrEmDash = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`, 'u');
    expect(page).not.toMatch(enOrEmDash);
  });

  it('offers one minimal enquiry form using the shared Formspree handler', () => {
    expect(page.match(/data-contact-form/g)).toHaveLength(1);
    expect(page.match(/data-form-status/g)).toHaveLength(1);
    expect(form).toMatch(/^<form action="https:\/\/formspree\.io\/f\/meeynlze" method="POST"/);
    const names = [...form.matchAll(/\sname="([^"]+)"/g)].map((match) => match[1]);
    expect(names.sort()).toEqual([
      '_gotcha', 'area_of_support', 'email', 'message', 'name', 'phone', 'privacy_acknowledgement', 'source_page', 'subject',
    ]);
    const required = [...form.matchAll(/<(?:input|textarea|select)\b[^>]*\srequired\b[^>]*>/g)]
      .map((match) => match[0].match(/\sname="([^"]+)"/)[1]);
    expect(required).toEqual(['name', 'email', 'message', 'privacy_acknowledgement']);
    expect(form).toContain('<input type="hidden" name="area_of_support" value="ADHD Coaching">');
    expect(form).toContain(`<input type="hidden" name="source_page" value="${CANONICAL}" data-source-page>`);
    expect(form).not.toMatch(/type="(?:file|date)"|<select\b/);
    for (const id of ['name', 'email', 'phone', 'message']) {
      expect(form).toContain(`<label for="${id}">`);
    }
    expect(form).toContain('role="status" aria-live="polite"');
    expect(form).toContain('Do not include medical records, diagnosis details');
  });

  it('adds advertising measurement only through the consent-gated scripts, with no analytics', () => {
    const scriptSources = [...page.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((match) => match[1]);
    expect(scriptSources).toEqual([
      '../../assets/js/site.js?v=20260804-home-education-v2',
      '../../assets/js/consent.js?v=20260929-consent-v1',
      '../../assets/js/ads-measurement.js?v=20261003-privacy-v2',
    ]);
    for (const source of [page, siteScript]) {
      expect(source).not.toMatch(/gtag|googletagmanager|google-analytics|dataLayer|fbq|remarketing|sendBeacon|<iframe/i);
    }
  });
});

const noop = () => {};

const fakeElement = (overrides = {}) => ({
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  style: { setProperty: noop },
  dataset: {},
  children: [],
  textContent: '',
  hidden: true,
  setAttribute: noop,
  removeAttribute: noop,
  getAttribute: () => null,
  addEventListener: noop,
  append(...nodes) { this.children.push(...nodes); },
  prepend: noop,
  replaceChildren(...nodes) { this.children = [...nodes]; },
  focus: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  ...overrides,
});

class FakeFormData {
  constructor(source) { this.entries = new Map(source.fields); }
  get(name) { return this.entries.has(name) ? this.entries.get(name) : null; }
  set(name, value) { this.entries.set(name, String(value)); }
}

// Runs the real shared site.js against a minimal document and a stubbed fetch,
// so no request ever leaves the test.
async function submitEnquiry({ href, canonical = null, response = { ok: true, body: { ok: true } } }) {
  const listeners = {};
  const controls = {
    '[data-submit-button]': fakeElement({ textContent: 'Send enquiry', disabled: false }),
    '[data-enquiry-subject]': { value: 'unset' },
    '[data-source-page]': { value: 'unset' },
  };
  let resetCount = 0;
  const form = fakeElement({
    action: 'https://formspree.io/f/meeynlze',
    method: 'post',
    fields: new Map([
      ['name', 'Test Parent'],
      ['email', 'parent@example.com'],
      ['area_of_support', 'ADHD Coaching'],
      ['message', 'How do parent sessions work?'],
      ['privacy_acknowledgement', 'Acknowledged'],
    ]),
    addEventListener: (type, handler) => { listeners[type] = handler; },
    querySelector: (selector) => controls[selector] ?? null,
    checkValidity: () => true,
    reportValidity: () => true,
    reset: () => { resetCount += 1; },
  });
  const status = fakeElement();
  const requests = [];

  const document = {
    currentScript: null,
    documentElement: fakeElement({ scrollHeight: 2000 }),
    body: fakeElement(),
    createElement: () => fakeElement(),
    querySelector: (selector) => {
      if (selector === '[data-contact-form]') return form;
      if (selector === '[data-form-status]') return status;
      if (selector === 'link[rel="canonical"]') return canonical ? { href: canonical } : null;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: noop,
  };
  const media = { matches: false, addEventListener: noop };
  const window = {
    location: new URL(href),
    matchMedia: () => media,
    addEventListener: noop,
    requestAnimationFrame: noop,
    setTimeout,
    clearTimeout,
    scrollTo: noop,
    scrollY: 0,
    innerHeight: 800,
    innerWidth: 1280,
  };
  const fetch = async (url, init) => {
    requests.push({ url, fields: Object.fromEntries(init.body.entries) });
    if (response === 'network-error') throw new TypeError('Network request failed');
    return { ok: response.ok, json: async () => response.body };
  };

  vm.runInNewContext(siteScript, { window, document, navigator: {}, fetch, FormData: FakeFormData, URL });
  await listeners.submit({ preventDefault: noop });

  return { requests, controls, resetCount, statusHeading: status.children[0]?.textContent };
}

describe('contact form source_page privacy', () => {
  it('strips advertising identifiers, campaign tags and search terms from the landing page source', async () => {
    const { requests, controls, statusHeading, resetCount } = await submitEnquiry({
      href: `${CANONICAL}?gclid=abc123&gbraid=def456&utm_source=google&utm_medium=cpc&utm_campaign=adhd-young-people&utm_term=adhd+coach+for+my+son#enquiry`,
      canonical: CANONICAL,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://formspree.io/f/meeynlze');
    expect(requests[0].fields.source_page).toBe(CANONICAL);
    expect(requests[0].fields.subject).toBe('Website enquiry: ADHD Coaching');
    expect(controls['[data-source-page]'].value).toBe(CANONICAL);
    expect(requests[0].fields.source_page).not.toMatch(/[?#]/);
    const payload = JSON.stringify(requests[0].fields);
    for (const leaked of ['gclid', 'abc123', 'gbraid', 'utm_', 'adhd+coach', 'my son', '#enquiry']) {
      expect(payload).not.toContain(leaked);
    }
    expect(statusHeading).toBe('Enquiry sent');
    expect(resetCount).toBe(1);
  });

  it('falls back to the clean page path when a page has no canonical link', async () => {
    const { requests } = await submitEnquiry({
      href: 'https://www.thementorsphere.co.uk/adhd-coaching/young-people/?utm_term=adhd#top',
    });
    expect(requests[0].fields.source_page).toBe(CANONICAL);
  });

  it('keeps the existing contact page source clean as well', async () => {
    const { requests } = await submitEnquiry({
      href: 'https://www.thementorsphere.co.uk/contact/?gclid=xyz&service=ADHD#form',
      canonical: 'https://www.thementorsphere.co.uk/contact/',
    });
    expect(requests[0].fields.source_page).toBe('https://www.thementorsphere.co.uk/contact/');
  });

  it('keeps the draft and shows an error when the provider rejects the enquiry', async () => {
    const { statusHeading, resetCount } = await submitEnquiry({
      href: CANONICAL,
      canonical: CANONICAL,
      response: { ok: false, body: { errors: [] } },
    });
    expect(statusHeading).toBe('Your enquiry could not be sent');
    expect(resetCount).toBe(0);
  });

  it('keeps the draft and shows an error when the network request fails', async () => {
    const { statusHeading, resetCount } = await submitEnquiry({ href: CANONICAL, canonical: CANONICAL, response: 'network-error' });
    expect(statusHeading).toBe('Your enquiry could not be sent');
    expect(resetCount).toBe(0);
  });
});
