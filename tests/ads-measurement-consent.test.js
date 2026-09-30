import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(file, 'utf8');
const siteScript = read('docs/assets/js/site.js');
const consentScript = read('docs/assets/js/consent.js');
const measurementScript = read('docs/assets/js/ads-measurement.js');
const landingPage = read('docs/adhd-coaching/young-people/index.html');

const CANONICAL = 'https://www.thementorsphere.co.uk/adhd-coaching/young-people/';
// Test-only values in the Google Ads formats. They are never used on the website.
const TEST_ADS_ID = 'AW-000000000';
const ENQUIRY_LABEL = 'TEST_ENQUIRY_LABEL';
const BOOKING_LABEL = 'TEST_BOOKING_LABEL';
const CONFIGURED = {
  googleAdsId: TEST_ADS_ID,
  conversionLabels: {
    adhd_young_people_enquiry_success: ENQUIRY_LABEL,
    adhd_young_people_booking_click: BOOKING_LABEL,
  },
};
const FIELDS = {
  name: 'Test Parent',
  email: 'parent@example.com',
  phone: '07700 900123',
  message: 'My son finds mornings hard and has an ADHD diagnosis.',
  area_of_support: 'ADHD Coaching',
  privacy_acknowledgement: 'Acknowledged',
};
const today = () => new Date().toISOString().slice(0, 10);
const flush = async () => {
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

// A deliberately small DOM: enough for the shared site script, the consent
// manager and the measurement script to run exactly as written.
const toKebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.key = init.key;
    this.defaultPrevented = false;
    this.target = null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

const compileSelector = (selector) => {
  const parts = selector.trim().match(/^([a-z0-9]+)?((?:\.[\w-]+|#[\w-]+|\[[^\]]+\])*)$/i);
  if (!parts) return null;
  const checks = [];
  if (parts[1]) checks.push((element) => element.tagName === parts[1].toUpperCase());
  for (const token of parts[2].match(/\.[\w-]+|#[\w-]+|\[[^\]]+\]/g) ?? []) {
    if (token.startsWith('.')) checks.push((element) => element.classList.contains(token.slice(1)));
    else if (token.startsWith('#')) checks.push((element) => element.id === token.slice(1));
    else {
      const [, name, value] = token.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      checks.push((element) => (value === undefined ? element.hasAttribute(name) : element.getAttribute(name) === value));
    }
  }
  return (element) => checks.every((check) => check(element));
};

class FakeElement {
  constructor(document, tagName) {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.ownText = '';
    this.offsetHeight = 96;
    this.style = { values: {}, setProperty(name, value) { this.values[name] = value; } };
    const element = this;
    this.dataset = new Proxy({}, {
      get: (_, key) => element.getAttribute(`data-${toKebab(String(key))}`) ?? undefined,
      set: (_, key, value) => {
        element.setAttribute(`data-${toKebab(String(key))}`, value);
        return true;
      },
    });
    this.classList = {
      contains: (name) => element.className.split(/\s+/).includes(name),
      add: (...names) => { element.className = [...new Set([...element.className.split(/\s+/), ...names])].filter(Boolean).join(' '); },
      remove: (...names) => { element.className = element.className.split(/\s+/).filter((name) => !names.includes(name)).join(' '); },
      toggle: (name, force) => {
        const add = force === undefined ? !element.classList.contains(name) : force;
        if (add) element.classList.add(name);
        else element.classList.remove(name);
        return add;
      },
    };
  }

  get className() { return this.getAttribute('class') ?? ''; }

  set className(value) { this.setAttribute('class', value); }

  get id() { return this.getAttribute('id') ?? ''; }

  get hidden() { return this.hasAttribute('hidden'); }

  set hidden(value) {
    if (value) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  get href() { return new URL(this.getAttribute('href'), this.ownerDocument.location.href).href; }

  set href(value) { this.setAttribute('href', value); }

  get src() { return this.getAttribute('src') ?? ''; }

  set src(value) { this.setAttribute('src', value); }

  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(''); }

  set textContent(value) {
    this.ownText = String(value);
    this.children = [];
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }

  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }

  hasAttribute(name) { return this.attributes.has(name); }

  removeAttribute(name) { this.attributes.delete(name); }

  append(...nodes) {
    nodes.forEach((node) => {
      if (typeof node === 'string') {
        this.children.push({ textContent: node });
        return;
      }
      node.remove();
      node.parentNode = this;
      this.children.push(node);
    });
  }

  prepend(...nodes) {
    nodes.reverse().forEach((node) => {
      node.remove();
      node.parentNode = this;
      this.children.unshift(node);
    });
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  after(node) {
    const parent = this.parentNode;
    node.remove();
    parent.children.splice(parent.children.indexOf(this) + 1, 0, node);
    node.parentNode = parent;
  }

  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentNode = null;
  }

  contains(node) {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }

  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }

  dispatchEvent(event) {
    event.target ??= this;
    for (let current = this; current; current = event.bubbles ? current.parentNode : null) {
      (current.listeners?.[event.type] ?? []).slice().forEach((listener) => listener.call(current, event));
    }
    return !event.defaultPrevented;
  }

  click() {
    const event = new FakeEvent('click', { bubbles: true });
    this.dispatchEvent(event);
    return event;
  }

  focus() { this.ownerDocument.activeElement = this; }

  descendants() {
    return this.children.filter((child) => child instanceof FakeElement).flatMap((child) => [child, ...child.descendants()]);
  }

  querySelectorAll(selector) {
    const matches = compileSelector(selector);
    return matches ? this.descendants().filter(matches) : [];
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

// Cookies keyed by name and domain, so that host-only and domain cookies
// behave as they do in a browser when deleted.
class CookieJar {
  constructor(hostname) {
    this.hostname = hostname;
    this.cookies = new Map();
  }

  read() { return [...this.cookies.values()].map(({ name, value }) => `${name}=${value}`).join('; '); }

  write(text) {
    const [pair, ...attributeParts] = text.split(';');
    const [rawName, ...valueParts] = pair.split('=');
    const name = rawName.trim();
    const attributes = Object.fromEntries(attributeParts.map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key.toLowerCase(), rest.join('=')];
    }));
    const domain = attributes.domain ? attributes.domain.replace(/^\./, '') : null;
    if (domain && !this.hostname.endsWith(domain)) return;
    const key = `${name}|${domain ?? 'host-only'}`;
    if (attributes['max-age'] === '0') this.cookies.delete(key);
    else this.cookies.set(key, { name, value: valueParts.join('=') });
  }

  names() { return [...this.cookies.values()].map(({ name }) => name); }
}

class FakeStorage {
  constructor(items = {}) { this.items = new Map(Object.entries(items)); }

  get length() { return this.items.size; }

  key(index) { return [...this.items.keys()][index] ?? null; }

  getItem(key) { return this.items.has(key) ? this.items.get(key) : null; }

  setItem(key, value) { this.items.set(key, String(value)); }

  removeItem(key) { this.items.delete(key); }
}

class FakeFormData {
  constructor(form) { this.entries = new Map(form.fields); }

  get(name) { return this.entries.has(name) ? this.entries.get(name) : null; }

  set(name, value) { this.entries.set(name, String(value)); }
}

// kind 'landing' is the advertising landing page, with all three scripts and the
// measurement configuration. kind 'ordinary' is any other public page, which
// loads only site.js and the shared consent manager. Passing `shared` carries
// the same browser cookies and storage to the next page, as navigation would.
function buildPage({
  href = CANONICAL,
  kind = 'landing',
  shared = null,
  config = CONFIGURED,
  consent = null,
  consentDate = today(),
  cookies = [],
  storageItems = {},
  storageAvailable = true,
  formEvent = 'adhd_young_people_enquiry_success',
  linkEvents = ['adhd_young_people_booking_click', 'adhd_young_people_booking_click'],
  referrer = '',
} = {}) {
  const landing = kind === 'landing';
  const location = new URL(href);
  const jar = shared?.jar ?? new CookieJar(location.hostname);
  cookies.forEach((cookie) => jar.write(cookie));
  const storage = shared?.storage ?? new FakeStorage(storageItems);
  if (consent) {
    storage.setItem('mentorsphere-consent', JSON.stringify({ version: 1, choices: { advertising: { value: consent, date: consentDate } } }));
  }

  const document = {
    location,
    referrer,
    activeElement: null,
    currentScript: null,
    get cookie() { return jar.read(); },
    set cookie(value) { jar.write(value); },
    createElement: (tag) => new FakeElement(document, tag),
    querySelector: (selector) => document.documentElement.querySelector(selector),
    querySelectorAll: (selector) => document.documentElement.querySelectorAll(selector),
    addEventListener: () => {},
  };
  const el = (tag, attributes = {}, text = '') => {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    if (text) node.textContent = text;
    return node;
  };

  const html = el('html');
  const head = el('head');
  const body = el('body');
  document.documentElement = html;
  document.head = head;
  document.body = body;
  html.append(head, body);
  head.append(el('link', { rel: 'canonical', href: landing ? CANONICAL : `${location.origin}${location.pathname}` }));

  const skipLink = el('a', { class: 'skip-link', href: '#main-content' }, 'Skip to main content');
  const main = el('main', { id: 'main-content' });
  const form = el('form', { 'data-contact-form': '' });
  if (formEvent && landing) form.setAttribute('data-measure-event', formEvent);
  Object.assign(form, {
    action: 'https://formspree.io/f/meeynlze',
    method: 'post',
    valid: true,
    resets: 0,
    fields: new Map(Object.entries({ ...FIELDS, _gotcha: '' })),
    elements: { namedItem: () => null },
    checkValidity() { return this.valid; },
    reportValidity() { return this.valid; },
    reset() { this.resets += 1; },
  });
  const submitButton = el('button', { 'data-submit-button': '' }, 'Send enquiry');
  const subjectInput = el('input', { 'data-enquiry-subject': '' });
  const sourceInput = el('input', { 'data-source-page': '' });
  subjectInput.value = 'unset';
  sourceInput.value = CANONICAL;
  form.append(subjectInput, sourceInput, submitButton);
  const status = el('div', { 'data-form-status': '' });
  // Ordinary pages keep an unmarked booking link, as the real shared footer does.
  const links = (landing ? linkEvents : [null]).map((eventName) => {
    const link = el('a', { href: 'https://calendar.google.com/calendar/u/0/appointments/schedules/example', target: '_blank', rel: 'noopener' }, 'Book a free introduction');
    if (eventName) link.setAttribute('data-measure-event', eventName);
    return link;
  });
  main.append(form, status, ...links);
  const footer = el('footer', { class: 'site-footer' });
  const footerBottom = el('div', { class: 'container footer-bottom' });
  footer.append(footerBottom);
  body.append(skipLink, main, footer);
  if (landing) {
    body.append(el('script', { type: 'application/json', 'data-ads-measurement-config': '' }, typeof config === 'string' ? config : JSON.stringify(config)));
  }

  const network = [];
  let nextResponse = { ok: true, body: { ok: true } };
  const windowListeners = {};
  const ctx = {
    document,
    location,
    navigator: {},
    URL,
    FormData: FakeFormData,
    CustomEvent: FakeEvent,
    HTMLElement: FakeElement,
    HTMLInputElement: class {},
    HTMLSelectElement: class {},
    HTMLTextAreaElement: class {},
    setTimeout,
    clearTimeout,
    scrollY: 0,
    innerHeight: 800,
    innerWidth: 1280,
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    requestAnimationFrame: () => 0,
    scrollTo: () => {},
    addEventListener: (type, listener) => { (windowListeners[type] ??= []).push(listener); },
    fetch: async (url, init) => {
      network.push({ url: String(url), fields: Object.fromEntries(init.body.entries) });
      if (nextResponse === 'network-error') throw new TypeError('Network request failed');
      return { ok: nextResponse.ok, status: nextResponse.status ?? 200, json: async () => nextResponse.body ?? {} };
    },
  };
  Object.defineProperty(ctx, 'localStorage', {
    get() {
      if (!storageAvailable) throw new Error('Storage is blocked');
      return storage;
    },
  });
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const script of landing ? [siteScript, consentScript, measurementScript] : [siteScript, consentScript]) vm.runInContext(script, ctx);

  const page = {
    ctx,
    document,
    jar,
    storage,
    shared: { jar, storage },
    form,
    links,
    status,
    network,
    banner: () => body.querySelector('[data-consent-banner]'),
    settingsButton: () => footerBottom.querySelector('[data-consent-open]'),
    choice: (value) => body.querySelector(`[data-consent-choice="${value}"]`),
    googleScripts: () => head.querySelectorAll('script').filter((script) => script.src.includes('googletagmanager.com')),
    calls: () => (ctx.dataLayer ?? []).map((entry) => JSON.parse(JSON.stringify(Array.from(entry)))),
    conversions: () => page.calls().filter(([command, name]) => command === 'event' && name === 'conversion').map(([, , params]) => params),
    storedConsent: () => JSON.parse(storage.getItem('mentorsphere-consent') ?? 'null')?.choices?.advertising?.value ?? null,
    fireWindow: (type, event) => (windowListeners[type] ?? []).forEach((listener) => listener(event)),
    async submit({ response = { ok: true, body: { ok: true } }, honeypot = '', valid = true } = {}) {
      nextResponse = response;
      form.valid = valid;
      form.fields.set('_gotcha', honeypot);
      form.dispatchEvent(new FakeEvent('submit'));
      await flush();
    },
  };
  return page;
}

describe('consent before any advertising measurement', () => {
  it('loads no Google code and sends nothing before the visitor chooses', () => {
    const page = buildPage();
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
    expect(page.ctx.gtag).toBeUndefined();
    expect(page.network).toHaveLength(0);
    expect(page.banner().hidden).toBe(false);
    expect(page.ctx.MentorSphereConsent.get('advertising')).toBeNull();
  });

  it('offers accept and reject with equal weight, nothing preselected and nothing focused automatically', () => {
    const page = buildPage();
    const accept = page.choice('granted');
    const reject = page.choice('denied');
    // The accessible name always states the purpose. On small screens only the
    // context words are visually hidden, so the visible label stays inside it.
    expect(accept.textContent).toBe('Accept advertising measurement');
    expect(reject.textContent).toBe('Reject advertising measurement');
    expect(accept.querySelector('.consent-button-context').textContent).toBe(' advertising measurement');
    expect(reject.querySelector('.consent-button-context').textContent).toBe(' advertising measurement');
    expect(accept.className).toBe(reject.className);
    expect(accept.getAttribute('type')).toBe('button');
    const explanation = page.banner().querySelector('.consent-banner-text');
    expect(explanation.textContent).toContain('Google Ads cookies');
    expect(explanation.textContent).toContain('Nothing is sent to Google unless you accept');
    expect(explanation.querySelector('a').getAttribute('href')).toBe('/privacy-policy/#advertising-measurement');
    expect(explanation.querySelector('a').textContent).toBe('How advertising measurement works');
    expect(page.banner().querySelector('#consent-banner-title').textContent).toBe('Advertising measurement');
    expect(page.banner().getAttribute('role')).toBe('region');
    expect(page.banner().getAttribute('aria-labelledby')).toBe('consent-banner-title');
    expect(page.banner().contains(page.document.activeElement)).toBe(false);
    const bodyChildren = page.document.body.children;
    expect(bodyChildren[bodyChildren.indexOf(page.document.querySelector('.skip-link')) + 1]).toBe(page.banner());
  });

  it('never treats scrolling, clicking elsewhere or continued browsing as consent', async () => {
    const page = buildPage();
    page.fireWindow('scroll', {});
    page.links[0].click();
    await page.submit();
    expect(page.ctx.MentorSphereConsent.get('advertising')).toBeNull();
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
  });

  it('sends nothing to Google after rejection and keeps the website fully usable', async () => {
    const page = buildPage({ href: `${CANONICAL}?gclid=TESTCLICK` });
    page.choice('denied').click();
    expect(page.storedConsent()).toBe('denied');
    const click = page.links[0].click();
    expect(click.defaultPrevented).toBe(false);
    await page.submit();
    expect(page.network).toHaveLength(1);
    expect(page.network[0].url).toBe('https://formspree.io/f/meeynlze');
    expect(page.status.children[0].textContent).toBe('Enquiry sent');
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
    expect(page.network.some(({ url }) => /google/i.test(url))).toBe(false);
  });

  it('confirms the choice accessibly and hides the message on request', () => {
    const page = buildPage();
    page.choice('denied').click();
    const confirmation = page.banner().querySelector('[role="alert"]');
    expect(confirmation.hidden).toBe(false);
    expect(page.document.activeElement).toBe(confirmation);
    expect(confirmation.textContent).toContain('You have rejected advertising measurement.');
    expect(confirmation.textContent).toContain('Cookie settings');
    page.banner().querySelector('[data-consent-hide]').click();
    expect(page.banner().hidden).toBe(true);
  });

  it('loads the approved Google tag only after acceptance, with personalisation off and no page view', () => {
    const page = buildPage({ href: `${CANONICAL}?gclid=TESTCLICK&utm_term=adhd+coach+for+my+son#enquiry`, referrer: 'https://www.google.com/search?q=adhd+coach' });
    page.choice('granted').click();
    const scripts = page.googleScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`https://www.googletagmanager.com/gtag/js?id=${TEST_ADS_ID}`);
    const calls = page.calls();
    expect(calls[0]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
    expect(calls[1]).toEqual(['consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' }]);
    expect(calls).toContainEqual(['set', 'url_passthrough', false]);
    const config = calls.find(([command]) => command === 'config');
    expect(config[1]).toBe(TEST_ADS_ID);
    expect(config[2]).toEqual({
      send_page_view: false,
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      page_location: `${CANONICAL}?gclid=TESTCLICK`,
      page_referrer: 'https://www.google.com/',
    });
    expect(page.conversions()).toHaveLength(0);
    expect(page.network).toHaveLength(0);
  });

  it('loads the tag on arrival for a visitor who accepted earlier, and asks again once the choice is six months old', () => {
    expect(buildPage({ consent: 'granted' }).googleScripts()).toHaveLength(1);
    const expired = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const page = buildPage({ consent: 'granted', consentDate: expired, cookies: ['_gcl_aw=GCL.1.TESTCLICK; path=/'] });
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.banner().hidden).toBe(false);
    expect(page.jar.names()).not.toContain('_gcl_aw');
  });

  it('still works in memory when browser storage is blocked', () => {
    const page = buildPage({ storageAvailable: false });
    expect(page.banner().hidden).toBe(false);
    page.choice('granted').click();
    expect(page.googleScripts()).toHaveLength(1);
    expect(page.ctx.MentorSphereConsent.get('advertising')).toBe('granted');
  });
});

describe('changing or withdrawing consent', () => {
  it('adds a persistent Cookie settings control that reopens the choice and returns focus', () => {
    const page = buildPage({ consent: 'denied' });
    const settings = page.settingsButton();
    expect(settings.textContent).toBe('Cookie settings');
    expect(settings.getAttribute('type')).toBe('button');
    expect(page.banner()).toBeNull();
    settings.click();
    expect(page.banner().hidden).toBe(false);
    expect(page.banner().textContent).toContain('Your current choice: rejected.');
    expect(page.document.activeElement.id).toBe('consent-banner-title');
    page.banner().dispatchEvent(new FakeEvent('keydown', { key: 'Escape' }));
    expect(page.banner().hidden).toBe(true);
    expect(page.document.activeElement).toBe(settings);
  });

  it('can change a rejection into acceptance later', () => {
    const page = buildPage({ consent: 'denied' });
    page.settingsButton().click();
    page.choice('granted').click();
    expect(page.storedConsent()).toBe('granted');
    expect(page.googleScripts()).toHaveLength(1);
  });

  it('withdraws: tells the tag, removes Google Ads storage, and records nothing further', async () => {
    const page = buildPage({
      consent: 'granted',
      cookies: ['_gcl_au=1.1.TEST; path=/; domain=.thementorsphere.co.uk', '_gcl_aw=GCL.1.TESTCLICK; path=/', 'unrelated=keep; path=/'],
      storageItems: { _gcl_ls: 'TEST', 'unrelated-item': 'keep' },
    });
    expect(page.googleScripts()).toHaveLength(1);
    page.settingsButton().click();
    expect(page.banner().textContent).toContain('Your current choice: accepted.');
    page.choice('denied').click();
    expect(page.storedConsent()).toBe('denied');
    expect(page.calls().at(-1)).toEqual(['consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
    expect(page.jar.names()).toEqual(['unrelated']);
    expect(page.storage.getItem('_gcl_ls')).toBeNull();
    expect(page.storage.getItem('unrelated-item')).toBe('keep');
    page.links[0].click();
    await page.submit();
    expect(page.conversions()).toHaveLength(0);
    page.banner().querySelector('[data-consent-hide]').click();
    expect(page.document.activeElement).toBe(page.settingsButton());
  });

  it('follows a withdrawal made in another tab', () => {
    const page = buildPage({ consent: 'granted' });
    page.storage.setItem('mentorsphere-consent', JSON.stringify({ version: 1, choices: { advertising: { value: 'denied', date: today() } } }));
    page.fireWindow('storage', { key: 'mentorsphere-consent' });
    expect(page.calls().at(-1)[2]).toMatchObject({ ad_storage: 'denied', ad_user_data: 'denied' });
  });
});

describe('adhd_young_people_enquiry_success', () => {
  it('fires once, only after Formspree reports success, with nothing but the conversion target', async () => {
    const page = buildPage({ consent: 'granted', href: `${CANONICAL}?gclid=TESTCLICK&utm_source=google&utm_term=adhd+coach+for+my+son#enquiry` });
    await page.submit();
    expect(page.network).toHaveLength(1);
    expect(page.conversions()).toEqual([{ send_to: `${TEST_ADS_ID}/${ENQUIRY_LABEL}` }]);
    expect(page.network[0].fields.source_page).toBe(CANONICAL);
    const sentToGoogle = JSON.stringify(page.calls());
    for (const value of [...Object.values(FIELDS), 'Website enquiry', 'utm_', 'adhd+coach', 'my son', '#enquiry']) {
      expect(sentToGoogle).not.toContain(value);
    }
  });

  it.each([
    ['an HTML validation failure', { valid: false }],
    ['a 4xx rejection', { response: { ok: false, status: 422, body: { errors: [] } } }],
    ['a 5xx failure', { response: { ok: false, status: 500 } }],
    ['a network failure', { response: 'network-error' }],
  ])('does not fire for %s', async (_, submission) => {
    const page = buildPage({ consent: 'granted' });
    await page.submit(submission);
    expect(page.conversions()).toHaveLength(0);
  });

  it('does not fire for a spam-trap submission, although Formspree still receives it', async () => {
    const page = buildPage({ consent: 'granted' });
    await page.submit({ honeypot: 'https://spam.example' });
    expect(page.network).toHaveLength(1);
    expect(page.conversions()).toHaveLength(0);
  });

  it('does not fire for clicking Submit, starting the form or an invalid field', () => {
    const page = buildPage({ consent: 'granted' });
    page.form.querySelector('[data-submit-button]').click();
    page.form.dispatchEvent(new FakeEvent('input', { bubbles: true }));
    page.form.dispatchEvent(new FakeEvent('invalid'));
    expect(page.conversions()).toHaveLength(0);
    expect(page.network).toHaveLength(0);
  });

  it('does not fire without consent, or for other website contact forms', async () => {
    const undecided = buildPage();
    await undecided.submit();
    expect(undecided.ctx.dataLayer).toBeUndefined();
    const otherForm = buildPage({ consent: 'granted', formEvent: null });
    await otherForm.submit();
    expect(otherForm.network).toHaveLength(1);
    expect(otherForm.conversions()).toHaveLength(0);
  });
});

describe('adhd_young_people_booking_click', () => {
  it('is recorded only after consent, as its own observation, without affecting the link', () => {
    const page = buildPage();
    expect(page.links[0].click().defaultPrevented).toBe(false);
    expect(page.ctx.dataLayer).toBeUndefined();
    page.choice('granted').click();
    const click = page.links[1].click();
    expect(click.defaultPrevented).toBe(false);
    expect(page.conversions()).toEqual([{ send_to: `${TEST_ADS_ID}/${BOOKING_LABEL}`, transport_type: 'beacon' }]);
    expect(BOOKING_LABEL).not.toBe(ENQUIRY_LABEL);
  });

  it('is never raised by a booking_confirmed marker or configuration, and a bad configuration stays inert', () => {
    const confirmed = 'adhd_young_people_booking_confirmed';
    const page = buildPage({
      consent: 'granted',
      config: { googleAdsId: TEST_ADS_ID, conversionLabels: { ...CONFIGURED.conversionLabels, [confirmed]: 'TEST_CONFIRMED_LABEL' } },
      linkEvents: [confirmed],
    });
    page.links[0].click();
    expect(page.conversions()).toHaveLength(0);
    const onlyConfirmed = buildPage({ consent: 'granted', config: { googleAdsId: TEST_ADS_ID, conversionLabels: { [confirmed]: 'TEST_CONFIRMED_LABEL' } }, linkEvents: [confirmed] });
    expect(onlyConfirmed.googleScripts()).toHaveLength(0);
    expect(buildPage({ consent: 'granted', config: '{not json' }).googleScripts()).toHaveLength(0);
    expect(buildPage({ consent: 'granted', config: { ...CONFIGURED, googleAdsId: 'GTM-TEST' } }).googleScripts()).toHaveLength(0);
  });
});

describe('the landing page as shipped', () => {
  const shippedConfig = landingPage.match(/<script type="application\/json" data-ads-measurement-config>(.*?)<\/script>/)[1];

  it('ships with empty Google Ads identifiers, so measurement stays inactive and no banner appears', () => {
    expect(JSON.parse(shippedConfig)).toEqual({
      googleAdsId: '',
      conversionLabels: { adhd_young_people_enquiry_success: '', adhd_young_people_booking_click: '' },
    });
    const page = buildPage({ config: shippedConfig, consent: 'granted' });
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
    expect(page.banner()).toBeNull();
    expect(page.settingsButton().textContent).toBe('Cookie settings');
  });

  it('marks the short enquiry form and every Calendar link on the page', () => {
    expect(landingPage).toContain('data-contact-form data-measure-event="adhd_young_people_enquiry_success"');
    const calendarLinks = [...landingPage.matchAll(/<a\b[^>]*calendar\.google\.com[^>]*>/g)].map((match) => match[0]);
    expect(calendarLinks).toHaveLength(6);
    calendarLinks.forEach((link) => expect(link).toContain('data-measure-event="adhd_young_people_booking_click"'));
  });

  it('has no invented identifiers, no booking_confirmed event and Google code only in the gated script', () => {
    const files = (directory) => readdirSync(directory).flatMap((entry) => {
      const target = path.join(directory, entry);
      return statSync(target).isDirectory() ? files(target) : [target];
    });
    const textFiles = files('docs').filter((file) => /\.(?:html|js|css|json|xml|txt)$/.test(file));
    for (const file of textFiles) {
      const content = read(file);
      expect(content, file).not.toMatch(/AW-\d{6,}|booking_confirmed|googleadservices|fbq\(|google-analytics/);
      if (!file.endsWith(path.join('js', 'ads-measurement.js'))) {
        expect(content, file).not.toMatch(/googletagmanager|gtag\(|dataLayer/);
      }
    }
    expect(siteScript).toContain("new CustomEvent('mentorsphere:enquiry-success')");
    expect(siteScript).not.toMatch(/gtag|googletagmanager|dataLayer|conversion/i);
  });
});

const htmlPages = (() => {
  const files = (directory) => readdirSync(directory).flatMap((entry) => {
    const target = path.join(directory, entry);
    return statSync(target).isDirectory() ? files(target) : [target];
  });
  return files('docs').filter((file) => file.endsWith('.html')).map((file) => ({
    file: file.split(path.sep).join('/'),
    html: read(file),
  }));
})();
const isIntakeForm = ({ file }) => file.startsWith('docs/forms/');
const publicPages = htmlPages.filter((page) => !isIntakeForm(page));
const LANDING_FILE = 'docs/adhd-coaching/young-people/index.html';
const ORDINARY = 'https://www.thementorsphere.co.uk/tutoring/';
const PRIVACY = 'https://www.thementorsphere.co.uk/privacy-policy/';
const consentCalls = (page) => page.calls().filter(([command]) => command === 'consent');

describe('site-wide Cookie settings', () => {
  it('loads the shared consent manager on every public page, after site.js, and never on the unlisted intake forms', () => {
    expect(publicPages.length).toBeGreaterThanOrEqual(38);
    for (const { file, html } of publicPages) {
      const consentScripts = [...html.matchAll(/<script src="[^"]*assets\/js\/consent\.js\?v=20260929-consent-v1" defer><\/script>/g)];
      const consentStyles = [...html.matchAll(/<link rel="stylesheet" href="[^"]*assets\/css\/consent\.css\?v=20260929-consent-v1">/g)];
      expect(consentScripts, file).toHaveLength(1);
      expect(consentStyles, file).toHaveLength(1);
      expect(html.indexOf('assets/js/consent.js'), file).toBeGreaterThan(html.indexOf('assets/js/site.js'));
      // The control is added to the shared footer's bottom row.
      expect(html, file).toContain('class="container footer-bottom"');
    }
    for (const { file, html } of htmlPages.filter(isIntakeForm)) {
      expect(html, file).not.toMatch(/consent\.js|ads-measurement\.js|data-ads-measurement-config/);
    }
  });

  it('offers Cookie settings on an ordinary page without showing a banner or loading anything', () => {
    const page = buildPage({ kind: 'ordinary', href: ORDINARY });
    const settings = page.settingsButton();
    expect(settings.textContent).toBe('Cookie settings');
    expect(settings.getAttribute('type')).toBe('button');
    expect(page.banner()).toBeNull();
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
    settings.click();
    expect(page.banner().hidden).toBe(false);
    expect(page.banner().textContent).toContain('You have not made a choice yet.');
    expect(page.document.activeElement.id).toBe('consent-banner-title');
    page.banner().querySelector('[data-consent-close]').click();
    expect(page.banner().hidden).toBe(true);
    expect(page.document.activeElement).toBe(settings);
    expect(page.storedConsent()).toBeNull();
  });

  it('records a choice made on an ordinary page without loading Google code there', async () => {
    const page = buildPage({ kind: 'ordinary', href: ORDINARY });
    page.settingsButton().click();
    page.choice('granted').click();
    expect(page.storedConsent()).toBe('granted');
    expect(page.googleScripts()).toHaveLength(0);
    expect(page.ctx.dataLayer).toBeUndefined();
    expect(page.ctx.gtag).toBeUndefined();
    page.links[0].click();
    await page.submit();
    expect(page.network).toHaveLength(1);
    expect(page.network.some(({ url }) => /google/i.test(url))).toBe(false);
  });
});

describe('Google Ads measurement stays on the advertising landing page', () => {
  it('ships the measurement script and configuration only on the young people page', () => {
    const withMeasurement = htmlPages.filter(({ html }) => /ads-measurement\.js|data-ads-measurement-config/.test(html)).map(({ file }) => file);
    expect(withMeasurement).toEqual([LANDING_FILE]);
    const landing = htmlPages.find(({ file }) => file === LANDING_FILE).html;
    expect(landing.indexOf('assets/js/ads-measurement.js')).toBeGreaterThan(landing.indexOf('assets/js/consent.js'));
    expect(consentScript).not.toMatch(/googletagmanager|gtag|dataLayer|createElement\('script'\)/);
  });

  it('never loads Google code on ordinary pages because the visitor accepted earlier', async () => {
    for (const href of [ORDINARY, PRIVACY, 'https://www.thementorsphere.co.uk/contact/']) {
      const page = buildPage({ kind: 'ordinary', href, consent: 'granted', cookies: ['_gcl_aw=GCL.1.TESTCLICK; path=/'] });
      expect(page.googleScripts(), href).toHaveLength(0);
      expect(page.ctx.dataLayer, href).toBeUndefined();
      expect(page.ctx.gtag, href).toBeUndefined();
      expect(page.banner(), href).toBeNull();
      // Accepted storage is left alone; only a non-accepted choice removes it.
      expect(page.jar.names(), href).toContain('_gcl_aw');
      page.links[0].click();
      await page.submit();
      expect(page.network.some(({ url }) => /google/i.test(url)), href).toBe(false);
    }
  });
});

describe('withdrawal from a non-advertising page', () => {
  it('stops measurement, removes Google Ads storage and keeps the rejection across pages', async () => {
    // Accept on the landing page; Google code may then set its storage.
    const landing = buildPage({ href: `${CANONICAL}?gclid=TESTCLICK` });
    landing.choice('granted').click();
    expect(landing.googleScripts()).toHaveLength(1);
    landing.jar.write('_gcl_au=1.1.TEST; path=/; domain=.thementorsphere.co.uk');
    landing.jar.write('_gcl_aw=GCL.1.TESTCLICK; path=/');
    landing.jar.write('unrelated=keep; path=/');
    landing.storage.setItem('_gcl_ls', 'TEST');

    // Navigate to an ordinary page and withdraw there.
    const ordinary = buildPage({ kind: 'ordinary', href: ORDINARY, shared: landing.shared });
    expect(ordinary.jar.names()).toContain('_gcl_aw');
    ordinary.settingsButton().click();
    expect(ordinary.banner().textContent).toContain('Your current choice: accepted.');
    ordinary.choice('denied').click();
    expect(ordinary.storedConsent()).toBe('denied');
    expect(ordinary.jar.names()).toEqual(['unrelated']);
    expect(ordinary.storage.getItem('_gcl_ls')).toBeNull();
    expect(ordinary.googleScripts()).toHaveLength(0);
    expect(ordinary.ctx.dataLayer).toBeUndefined();

    // The site's own preference alone remembers the rejection.
    expect([...ordinary.storage.items.keys()]).toEqual(['mentorsphere-consent']);

    // Returning to the landing page, even from a new advert click, does not
    // reactivate measurement or ask again.
    const back = buildPage({ href: `${CANONICAL}?gclid=SECONDCLICK`, shared: ordinary.shared });
    expect(back.banner()).toBeNull();
    expect(back.googleScripts()).toHaveLength(0);
    expect(back.ctx.dataLayer).toBeUndefined();
    back.links[0].click();
    await back.submit();
    expect(back.network).toHaveLength(1);
    expect(back.conversions()).toHaveLength(0);
    expect(back.jar.names()).toEqual(['unrelated']);
  });

  it('is followed by a landing page restored from the back/forward cache', async () => {
    const landing = buildPage({ consent: 'granted' });
    expect(landing.googleScripts()).toHaveLength(1);
    landing.jar.write('_gcl_aw=GCL.1.TESTCLICK; path=/');
    const ordinary = buildPage({ kind: 'ordinary', href: PRIVACY, shared: landing.shared });
    ordinary.settingsButton().click();
    ordinary.choice('denied').click();
    // No storage event reaches a page held in the back/forward cache.
    landing.fireWindow('pageshow', { persisted: true });
    expect(consentCalls(landing).at(-1)).toEqual(['consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
    expect(landing.jar.names()).toEqual([]);
    landing.links[0].click();
    await landing.submit();
    expect(landing.conversions()).toHaveLength(0);
  });

  it('never relies on a stale in-memory acceptance once the stored choice has changed', async () => {
    const landing = buildPage();
    landing.choice('granted').click();
    const ordinary = buildPage({ kind: 'ordinary', href: ORDINARY, shared: landing.shared });
    ordinary.settingsButton().click();
    ordinary.choice('denied').click();
    // Even before any storage or pageshow event arrives, nothing is recorded.
    landing.links[0].click();
    await landing.submit();
    expect(landing.conversions()).toHaveLength(0);
  });

  it('treats an expired choice on an ordinary page as no choice and removes Google Ads storage', () => {
    const expired = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const page = buildPage({ kind: 'ordinary', href: ORDINARY, consent: 'granted', consentDate: expired, cookies: ['_gcl_aw=GCL.1.TESTCLICK; path=/'] });
    expect(page.ctx.MentorSphereConsent.get('advertising')).toBeNull();
    expect(page.jar.names()).not.toContain('_gcl_aw');
    expect(page.banner()).toBeNull();
  });
});

describe('Google Consent Mode signals', () => {
  const FOUR = ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage'];
  const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  // Standard tag-based conversion measurement needs both ad_storage and
  // ad_user_data once the visitor accepts; personalisation and analytics stay off.
  const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' };

  it('uses basic consent mode: no Google command of any kind before acceptance', () => {
    const page = buildPage({ href: `${CANONICAL}?gclid=TESTCLICK` });
    expect(page.ctx.dataLayer).toBeUndefined();
    page.choice('denied').click();
    expect(page.ctx.dataLayer).toBeUndefined();
  });

  it('pins every state of all four signals through accept, withdraw and accept again', () => {
    const page = buildPage();
    page.choice('granted').click();
    page.settingsButton().click();
    page.choice('denied').click();
    page.settingsButton().click();
    page.choice('granted').click();
    expect(consentCalls(page)).toEqual([
      ['consent', 'default', DENIED],
      ['consent', 'update', GRANTED],
      ['consent', 'update', DENIED],
      ['consent', 'update', GRANTED],
    ]);
    for (const [, , states] of consentCalls(page)) {
      expect(Object.keys(states).sort()).toEqual(FOUR);
      expect(states.ad_personalization).toBe('denied');
      expect(states.analytics_storage).toBe('denied');
      expect(states.ad_user_data).toBe(states.ad_storage);
    }
    expect(page.googleScripts()).toHaveLength(1);
  });

  it('sets the defaults before configuring the tag, with redaction on and no personalisation or user data', () => {
    const page = buildPage({ consent: 'granted' });
    const calls = page.calls();
    const index = (predicate) => calls.findIndex(predicate);
    const configAt = index(([command]) => command === 'config');
    expect(index(([command, type]) => command === 'consent' && type === 'default')).toBe(0);
    expect(index(([command, name, value]) => command === 'set' && name === 'ads_data_redaction' && value === true)).toBeLessThan(configAt);
    expect(index(([command, name, value]) => command === 'set' && name === 'url_passthrough' && value === false)).toBeLessThan(configAt);
    expect(calls[configAt][2]).toMatchObject({ allow_ad_personalization_signals: false, allow_google_signals: false, send_page_view: false });
    // ad_user_data is the consent signal; a separate user_data parameter would
    // carry user-provided data for enhanced conversions and must never appear.
    const serialised = JSON.stringify(calls);
    for (const forbidden of [/"user_data"/, /"user_id"/, /enhanced_conversion/, /allow_enhanced_conversions/, /user_provided_data/]) {
      expect(serialised).not.toMatch(forbidden);
    }
    for (const forbidden of [/(?<!ad_)user_data/, /user_id/, /enhanced_conversion/, /set_user_properties/]) {
      expect(measurementScript).not.toMatch(forbidden);
    }
  });
});

describe('source_page protection with measurement active', () => {
  it.each(['granted', 'denied', null])('sends Formspree only the clean canonical address when consent is %s', async (choice) => {
    const page = buildPage({
      consent: choice,
      href: `${CANONICAL}?gclid=abc123&gbraid=def456&wbraid=ghi789&utm_source=google&utm_medium=cpc&utm_campaign=adhd-young-people&utm_term=adhd+coach+for+my+son#enquiry`,
    });
    await page.submit();
    expect(page.network).toHaveLength(1);
    expect(page.network[0].url).toBe('https://formspree.io/f/meeynlze');
    expect(page.network[0].fields.source_page).toBe(CANONICAL);
    const payload = JSON.stringify(page.network[0].fields);
    for (const leaked of ['gclid', 'abc123', 'gbraid', 'wbraid', 'utm_', 'adhd+coach', 'my son', '#enquiry']) {
      expect(payload).not.toContain(leaked);
    }
    // Google receives only the conversion target, never a form value.
    const sentToGoogle = JSON.stringify(page.calls());
    for (const value of [...Object.values(FIELDS), 'source_page', 'Website enquiry']) {
      expect(sentToGoogle).not.toContain(value);
    }
  });

  it('keeps the PR #63 canonical source logic in site.js unchanged', () => {
    expect(siteScript).toContain("const canonicalLink = document.querySelector('link[rel=\"canonical\"]');");
    expect(siteScript).toContain('return `${url.origin}${url.pathname}`;');
    expect(siteScript).toContain("data.set('source_page', sourcePage);");
    expect(landingPage).toContain(`<input type="hidden" name="source_page" value="${CANONICAL}" data-source-page>`);
  });
});

describe('mobile consent banner styling', () => {
  const css = read('docs/assets/css/consent.css');
  const small = css.slice(css.indexOf('@media (max-width: 36rem)'), css.indexOf('@media (forced-colors: active)'));

  it('keeps both choices at least 44px tall and equal in width, without tiny text', () => {
    expect(css).toMatch(/\.consent-button \{[^}]*min-height: 2\.75rem;/);
    expect(small).toMatch(/\.consent-banner-actions \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(small).not.toMatch(/\.consent-button \{/);
    const fontSizes = [...small.matchAll(/font-size: ([\d.]+)rem/g)].map((match) => Number(match[1]));
    expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(0.93);
  });

  it('hides only the repeated context words visually, and only on small screens', () => {
    expect(css.indexOf('.consent-button-context')).toBeGreaterThan(css.indexOf('@media (max-width: 36rem)'));
    expect(small).toMatch(/\.consent-button-context \{[^}]*clip: rect\(0, 0, 0, 0\);/);
  });
});
