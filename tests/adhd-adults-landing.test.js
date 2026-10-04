import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');
const page = read('docs/adhd-coaching/adults/index.html');
const hub = read('docs/adhd-coaching/index.html');
const youngPeople = read('docs/adhd-coaching/young-people/index.html');
const canonical = 'https://www.thementorsphere.co.uk/adhd-coaching/adults/';
const bookingUrl = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ViGgA98iq2gb-3Xn3TdTTqfAdWXE2XN5SpS6PBaaZzRc5DXacuud78LNwUEHlSSk5VPAYTcB-';
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const main = page.match(/<main id="main-content">([\s\S]*?)<\/main>/)[1];
const hero = page.match(/<section class="page-hero">([\s\S]*?)<\/section>/)[1];
const section = (id) => page.match(new RegExp(`<section[^>]*id="${id}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? '';
const form = page.match(/<form\b[\s\S]*?<\/form>/)[0];
const metadata = (name) => page.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]+)"`))?.[1];
const graph = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];

describe('adult ADHD coaching landing page', () => {
  it('immediately identifies the adult, online, UK-based audience and both funding routes', () => {
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(hero).toContain('<h1>Online ADHD coaching for adults</h1>');
    for (const wording of ['UK-based', 'Adults aged 18+', 'Self-funded', 'Access to Work', 'Free 60-minute introduction']) {
      expect(textOf(hero)).toContain(wording);
    }
    expect(textOf(main)).not.toMatch(/employer-funded|international|young people|parents|children/i);
  });

  it('provides the complete adult journey in the agreed order', () => {
    const ids = ['funding', 'recognition', 'how-coaching-works', 'pricing', 'introduction', 'questions', 'enquiry'];
    const positions = ids.map((id) => {
      expect(section(id).length).toBeGreaterThan(100);
      return main.indexOf(`id="${id}"`);
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const journey = ['recognition', 'what-can-help', 'how-coaching-works', 'who-youll-work-with', 'pricing'];
    const journeyPositions = journey.map(id => main.indexOf(`id="${id}"`));
    expect(journeyPositions.every(position => position >= 0)).toBe(true);
    expect(journeyPositions).toEqual([...journeyPositions].sort((a, b) => a - b));
    expect(main.match(/<section\b/g)).toHaveLength(8);
    expect(section('recognition')).toContain('<dl');
    expect(section('recognition').match(/<dt>/g)).toHaveLength(4);
    expect(section('how-coaching-works')).toContain('id="practical-details"');
    expect(section('enquiry')).toContain('id="next-step"');
  });

  it('shows exact prices, durations and package validity without requiring a package', () => {
    const cards = [...section('pricing').matchAll(/<article class="price-card">([\s\S]*?)<\/article>/g)].map((m) => textOf(m[1]));
    expect(cards).toHaveLength(3);
    expect(cards[0]).toContain('Single session £70 60 minutes');
    for (const fact of ['Six sessions', '£390', '£65 per session', 'Six 60-minute sessions', 'Valid for six months']) expect(cards[1]).toContain(fact);
    for (const fact of ['Twelve sessions', '£740', 'About £61.67 per session', 'Twelve 60-minute sessions', 'Valid for twelve months']) expect(cards[2]).toContain(fact);
    expect(section('pricing')).toContain('Packages are optional');
    expect(main).not.toMatch(/guaranteed results|success rate/i);
  });

  it('uses the approved booking URL and one consistent CTA throughout', () => {
    const links = [...page.matchAll(/<a\b([^>]*)href="(https:\/\/calendar\.google\.com[^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)];
    expect(links.length).toBeGreaterThanOrEqual(6);
    for (const [, before, href, after, label] of links) {
      expect(href).toBe(bookingUrl);
      expect(`${before}${after}`).toContain('target="_blank"');
      expect(`${before}${after}`).toContain('rel="noopener"');
      expect(textOf(label)).toMatch(/^Book a free introduction(?: \(opens in a new tab\))?$/);
    }
    expect(page).not.toMatch(/discovery call|consultation|placeholder|BOOKING_BUTTON|ENQUIRY_SECTION/i);
    expect(hero).toContain('Ask a question first');
    expect(section('enquiry')).toContain('class="button button-secondary" href="#enquiry"');
    expect(section('enquiry')).not.toContain('button-light');
  });

  it('explains the shared free 60-minute introduction without an intake requirement', () => {
    const introduction = textOf(section('introduction'));
    expect(introduction).toContain('free and there is no obligation to continue');
    expect(introduction).not.toMatch(/intake|questionnaire/i);
    expect(introduction).toContain('60-minute introductory session');
    expect(introduction).toContain('same for both funding routes; ongoing coaching is paid');
    expect(page).not.toContain('forms/adhd-coaching-intake');
  });

  it('states all clinical boundaries and welcomes enquiries without a diagnosis', () => {
    const faq = textOf(section('questions'));
    for (const limit of ['therapy', 'counselling', 'crisis support', 'medical treatment', 'medical advice', 'medication management', 'diagnostic assessment']) {
      expect(faq).toContain(limit);
    }
    expect(faq).toContain('It is not a substitute for clinical assessment');
    expect(faq).toContain('A formal ADHD diagnosis is not required to enquire');
    expect(faq).toContain('awaiting assessment');
    expect(faq).toContain('coaching does not diagnose ADHD');
    expect(textOf(main)).not.toMatch(/treats ADHD|cures ADHD|fix(?:es)? ADHD/i);
  });

  it('keeps Luke’s claims within the approved education, SEND and lived-experience facts', () => {
    const trust = section('how-coaching-works').match(/<div[^>]*id="who-youll-work-with">([\s\S]*?)<\/div>/)[1];
    const luke = textOf(trust);
    expect(luke).toMatch(/work directly with Luke/);
    expect(luke).toMatch(/more than ten years' experience across education and SEND/);
    expect(luke).toMatch(/has ADHD himself/);
    expect(luke).toContain('practical and non-judgemental');
    expect(luke).toContain('adult clients');
    expect(textOf(read('docs/about/index.html'))).toContain('adult clients');
    expect(trust).toContain('href="../../about/"');
    expect(trust).toContain('<h3>');
    expect(luke.split(/\s+/).length).toBeLessThan(80);
    expect(textOf(main)).not.toMatch(/accredit|certified|qualified|\bICF\b|testimonial|review score|ten years.{0,20}ADHD coach/i);
  });

  it('keeps the coach as supporting context rather than a visible marketing hook', () => {
    const headings = [...page.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)].map(m => textOf(m[1]));
    expect(headings.join(' ')).not.toMatch(/Luke Turner|Meet Luke|Why choose Luke|ADHD expert/i);
    expect(textOf(main)).not.toContain('Luke Turner');
    expect(textOf(hero)).not.toMatch(/\bLuke\b/);
    expect(textOf(section('introduction'))).not.toMatch(/\bLuke\b/);
    expect(textOf(main)).not.toMatch(/unlock your potential|best self|transform your life|not lazy|not broken/i);
  });

  it('retains confidentiality exceptions and discusses adjustments without promising extras', () => {
    const practical = textOf(section('how-coaching-works'));
    for (const fact of ['60 minutes', 'online across the UK', 'frequency is agreed individually', 'camera-off', 'Communication preferences']) {
      expect(practical).toContain(fact);
    }
    for (const fact of ['serious risk of harm', 'safeguarding concern', 'legal requirement', 'need agreed by you', 'kept securely']) expect(textOf(section('questions'))).toContain(fact);
    expect(textOf(main)).not.toMatch(/unlimited support|between-session messaging|evening availability|weekend availability/i);
  });

  it('has unique, indexable adult metadata and the adult self canonical', () => {
    const title = page.match(/<title>(.*?)<\/title>/)[1];
    expect(title).toBe('Online ADHD Coaching for Adults | The MentorSphere');
    expect(hub).not.toContain(`<title>${title}</title>`);
    expect(metadata('robots')).toBe('index,follow');
    expect(metadata('description')).toContain('adults aged 18+');
    expect(hub).not.toContain(`content="${metadata('description')}"`);
    expect(page.match(/<link rel="canonical"/g)).toHaveLength(1);
    expect(page).toContain(`<link rel="canonical" href="${canonical}">`);
    expect(metadata('og:url')).toBe(canonical);
    for (const prefix of ['og', 'twitter']) {
      expect(metadata(`${prefix}:title`)).toBe(title);
      expect(metadata(`${prefix}:description`)).toBe(metadata('description'));
      expect(metadata(`${prefix}:image`)).toContain('/assets/images/adhd-logo.svg');
    }
  });

  it('publishes valid adult-specific WebPage, Service and breadcrumb schema matching visible facts', () => {
    expect(page.match(/type="application\/ld\+json"/g)).toHaveLength(1);
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'Service']);
    const [webpage, breadcrumb, service] = graph;
    expect(webpage.url).toBe(canonical);
    expect(webpage.description).toBe(metadata('description'));
    expect(webpage.mainEntity['@id']).toBe(service['@id']);
    expect(webpage.breadcrumb['@id']).toBe(breadcrumb['@id']);
    expect(breadcrumb.itemListElement.map((node) => node.item)).toEqual(['https://www.thementorsphere.co.uk/', 'https://www.thementorsphere.co.uk/adhd-coaching/', canonical]);
    expect(service.name).toBe('Online ADHD coaching for adults');
    expect(service.provider).toEqual({ '@type': 'EducationalOrganization', name: 'The MentorSphere', url: 'https://www.thementorsphere.co.uk/' });
    expect(service.description).toContain('Luke Turner');
    expect(service.audience).toMatchObject({ suggestedMinAge: 18, audienceType: 'Adults seeking ADHD coaching for themselves, self-funded or through Access to Work' });
    expect(service.areaServed).toEqual({ '@type': 'Country', name: 'United Kingdom' });
    expect(service.hasOfferCatalog.itemListElement.map((offer) => [offer.price, offer.priceCurrency])).toEqual([['70', 'GBP'], ['390', 'GBP'], ['740', 'GBP'], ['110', 'GBP']]);
    expect(JSON.stringify(graph)).not.toMatch(/AggregateRating|"review|FAQPage|MedicalBusiness|hasCredential|young.people/i);
  });

  it('adds contextual discovery while preserving the hub and existing site shell', () => {
    expect(read('docs/sitemap.xml').split(`<loc>${canonical}</loc>`)).toHaveLength(2);
    expect(hub).toContain('<a class="card-link" href="adults/">Find out about ADHD coaching for adults</a>');
    expect(hub).toContain('<h1>Online ADHD coaching</h1>');
    expect(page).toContain('<span aria-current="page">Adults</span>');
    for (const tag of ['header', 'footer']) {
      const pattern = new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`);
      const clean = (html) => html.match(pattern)[0].replace(/ data-measure-event="[^"]+"/g, '').replace(/\s+/g, ' ');
      expect(clean(page)).toBe(clean(youngPeople));
    }
  });

  it('reuses the minimal form endpoint and canonical source without adding sensitive fields', () => {
    expect(page.match(/data-contact-form/g)).toHaveLength(1);
    expect(form).toContain('action="https://formspree.io/f/meeynlze" method="POST"');
    expect(form).toContain(`<input type="hidden" name="source_page" value="${canonical}" data-source-page>`);
    const fields = [...form.matchAll(/\sname="([^"]+)"/g)].map((m) => m[1]);
    expect(fields.sort()).toEqual(['_gotcha', 'area_of_support', 'email', 'funding_route', 'message', 'name', 'phone', 'privacy_acknowledgement', 'source_page', 'subject']);
    const required = [...form.matchAll(/<(?:input|textarea)\b[^>]*\srequired\b[^>]*>/g)].map((m) => m[0].match(/name="([^"]+)"/)[1]);
    expect(required).toEqual(['name', 'email', 'message', 'privacy_acknowledgement']);
    expect(form).toContain('Do not include medical records, diagnosis details or other unnecessary sensitive personal information');
    expect(form).toContain('name="_gotcha" type="text" tabindex="-1"');
    expect(form).toContain('href="../../privacy-policy/"');
    expect(form).not.toMatch(/type="(?:file|date)"/);
  });

  it('provides labels, associated errors, live status and native HTML fallbacks', () => {
    expect(page).toContain('class="skip-link" href="#main-content"');
    for (const id of ['name', 'email', 'phone', 'funding-route', 'message']) expect(form).toContain(`<label for="${id}">`);
    for (const id of ['name-error', 'email-error', 'message-error', 'privacy-error']) {
      expect(form).toContain(`id="${id}"`);
      expect(form).toMatch(new RegExp(`aria-describedby="[^"]*${id}`));
    }
    expect(form).toContain('role="status" aria-live="polite" aria-atomic="true" tabindex="-1"');
    expect(form).not.toContain('novalidate');
    expect(page.match(/<details\b/g)).toHaveLength(5);
    expect(page).toContain('animation: none !important');
    expect(page).toContain('filter: none !important');
    expect(page).not.toMatch(/[\u2013\u2014]/u);
    const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prioritises five useful FAQ questions without repeating the session explanation', () => {
    const questions = [...section('questions').matchAll(/<summary>(.*?)<\/summary>/g)].map((m) => m[1]);
    expect(questions).toHaveLength(5);
    for (const topic of [/diagnosis/, /therapy/, /often/, /package/, /confidential/]) expect(questions.some((q) => topic.test(q))).toBe(true);
    expect(questions.join(' ')).not.toMatch(/happens in a coaching session|planners|university|questions before booking/);
  });

  it('isolates accessibility and layout overrides to the adult page', () => {
    const css = read('docs/assets/css/styles.css');
    expect(page).toContain('page-adhd-adults');
    expect(youngPeople).not.toContain('page-adhd-adults');
    expect(css).toMatch(/html:not\(\.js\) \.page-adhd-adults \.site-header\s*\{\s*position: static;/);
    expect(css).toMatch(/\.page-adhd-adults \.form-field textarea[^{}]*\{\s*border-color: var\(--muted\)/);
  });


  it('distinguishes funding routes and keeps both enquiry CTAs on this page', () => {
    const funding = section('funding');
    expect(funding.match(/<article/g)).toHaveLength(2);
    expect(funding.match(/href="#enquiry"/g)).toHaveLength(2);
    for (const value of ['£70', '£390', '£740', '£110', 'free 60-minute introduction']) expect(funding).toContain(value);
    expect(section('pricing')).toContain('Funding and payment arrangements depend on your approved award');
    expect(section('pricing')).toContain('approval is not guaranteed');
    expect(section('pricing')).toContain('href="../access-to-work/"');
    const atw = read('docs/adhd-coaching/access-to-work/index.html');
    expect(atw).toContain('free 60-minute introductory session');
    expect(atw).toContain('£110');
    expect(atw).toContain('href="../adults/#enquiry"');
    expect(atw).not.toMatch(/(?:15|20|30)[ -]minute|£70/);
  });

  it('offers an accessible funding choice without requiring knowledge of funding', () => {
    expect(form).toContain('<label for="funding-route">How are you planning to fund coaching?</label>');
    expect(form).toContain('name="funding_route" aria-describedby="funding-help"');
    const options = [...form.matchAll(/<option value="([^"]+)"[^>]*>/g)].map(m => m[1]);
    expect(options).toEqual(['Self-funded', 'Access to Work', "I'm not sure yet"]);
    expect(form).toContain(`value="I'm not sure yet" selected`);
    expect(form).toContain('id="funding-help"');
  });

  it('wires only the approved adult actions behind explicit scope 2', () => {
    expect(page).not.toMatch(/adhd_young_people_|gtag|googletagmanager|google-analytics|dataLayer|sendBeacon|<iframe/i);
    const configs = [...page.matchAll(/<script type="application\/json" data-ads-measurement-config>(.*?)<\/script>/g)];
    expect(configs).toHaveLength(1);
    expect(JSON.parse(configs[0][1])).toEqual({
      googleAdsId: 'AW-18485496875', requiredConsentScopeVersion: 2,
      conversionLabels: { adhd_adults_enquiry_success: 'zVkyCOb3tI8dEKuYye5E', adhd_adults_booking_click: 'zp7QCOn3tI8dEKuYye5E' },
    });
    expect([...page.matchAll(/<a\b[^>]*data-measure-event="adhd_adults_booking_click"[^>]*>/g)]).toHaveLength(7);
    expect([...page.matchAll(/<form\b[^>]*data-contact-form data-measure-event="adhd_adults_enquiry_success"/g)]).toHaveLength(1);
    const scripts = [...page.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts).toEqual(['../../assets/js/site.js?v=20260804-home-education-v2', '../../assets/js/consent.js?v=20261003-consent-scope-v2', '../../assets/js/ads-measurement.js?v=20261003-ads-scope-v3']);
    const validator = read('scripts/validate-site.mjs');
    const allowlist = validator.match(/const adsMeasurementPages = new Set\((.*?)\);/s)[1];
    expect(allowlist).toContain('adults');
    expect(allowlist).toContain('young-people');
  });
});
