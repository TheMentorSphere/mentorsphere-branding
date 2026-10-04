// Phase 9 authoritative integration QA. Every request is fulfilled from disk,
// mocked or aborted. No remote tag download, collector, enquiry or booking.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [moduleArg, outputArg = 'tmp/phase9/browser', baselineArg] = process.argv.slice(2);
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.resolve(moduleArg || path.join(modules, 'playwright/index.mjs'))).href);
const output = path.resolve(outputArg), docs = path.resolve('docs');
assert(!output.startsWith(docs + path.sep) && output !== docs, 'QA output must not be published');
await mkdir(output, { recursive: true });
const baseline = baselineArg ? path.resolve(baselineArg) : null;
const origin = 'https://www.thementorsphere.co.uk', adsId = 'AW-18485496875';
const calendar = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2ViGgA98iq2gb-3Xn3TdTTqfAdWXE2XN5SpS6PBaaZzRc5DXacuud78LNwUEHlSSk5VPAYTcB-';
const routes = {
  adult: { route: '/adhd-coaching/adults/', prefix: 'adhd_adults', enquiry: `${adsId}/zVkyCOb3tI8dEKuYye5E`, booking: `${adsId}/zp7QCOn3tI8dEKuYye5E` },
  young: { route: '/adhd-coaching/young-people/', prefix: 'adhd_young_people', enquiry: `${adsId}/7zLXCPz_lowdEKuYye5E`, booking: `${adsId}/bi_lCP__lowdEKuYye5E` },
};
const today = () => new Date().toISOString().slice(0, 10);
const choice = (value, scopeVersion, date = today()) => JSON.stringify({ version: 1, choices: { advertising: { value, date, ...(scopeVersion === undefined ? {} : { scopeVersion }) } } });
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const checks = [], errors = [], traffic = [];
const check = async (name, run) => {
  try { const detail = await run(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false, error: error.stack }); console.error(`FAIL ${name}: ${error.message}`); }
};
const calls = page => page.evaluate(() => (window.dataLayer || []).map(call => Array.from(call)));
const conversions = async page => (await calls(page)).filter(call => call[0] === 'event' && call[1] === 'conversion').map(call => call[2]);
const googleScripts = page => page.locator('script[src*="googletagmanager.com"]').count();
const banner = page => page.locator('[data-consent-banner]');
const deniedSignals = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
const grantedSignals = { ...deniedSignals, ad_storage: 'granted', ad_user_data: 'granted' };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
async function fixture({ stored = null, tag = 'mock', viewport = { width: 1366, height: 768 }, before = false, touch = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: touch, isMobile: touch, serviceWorkers: 'block' });
  const run = { requests: [], forms: [], response: 'success', release: null };
  const gate = new Promise(resolve => { run.release = resolve; });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(docs, `.${pathname}`);
      assert(file.startsWith(docs + path.sep));
      let body;
      if (before && baseline) {
        try { body = await readFile(path.join(baseline, 'docs', pathname)); } catch { /* Unchanged assets use current disk. */ }
      }
      try { body ??= await readFile(file); }
      catch { return route.fulfill({ status: 404, body: 'Local fixture: not found' }); }
      return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body });
    }
    const item = { url: request.url(), method: request.method(), handling: 'blocked' };
    traffic.push(item); run.requests.push(item);
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
      assert.equal(url.searchParams.get('id'), adsId);
      if (tag === 'blocked' || tag === 'failed') return route.abort(tag === 'blocked' ? 'blockedbyclient' : 'failed');
      if (tag === 'delayed') await gate;
      item.handling = 'local-tag-stub';
      return route.fulfill({ contentType: 'text/javascript', body: 'window.phase9MockTagLoaded = true;' });
    }
    if (url.href === 'https://formspree.io/f/meeynlze') {
      run.forms.push(request.postData()); item.handling = 'mock-provider';
      if (run.response === 'pending') await gate;
      if (run.response === 'network') return route.abort('failed');
      const status = ({ '4xx': 400, validation: 422, '5xx': 500 })[run.response] || 200;
      const json = run.response === 'validation' ? { errors: [{ field: 'email', message: 'Local QA validation rejection.' }] } : status === 200 ? { ok: true } : { error: 'Local QA failure.' };
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    }
    if (url.href === calendar) {
      item.handling = 'local-calendar-stub';
      return route.fulfill({ contentType: 'text/html', body: '<title>Local Calendar placeholder</title><p>No booking service contacted.</p>' });
    }
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  await page.goto(origin + '/privacy-policy/');
  await page.evaluate(stored => { if (stored !== null) localStorage.setItem('mentorsphere-consent', stored); else localStorage.removeItem('mentorsphere-consent'); }, stored);
  run.context = context; run.page = page;
  run.goto = async (kind = 'adult', suffix = '') => { await page.goto(origin + routes[kind].route + suffix, { waitUntil: 'domcontentloaded' }); };
  run.close = async () => { run.release(); await context.close(); };
  return run;
}
async function accept(page) {
  await page.locator('[data-consent-choice="granted"]').click();
  await page.waitForFunction(() => typeof window.gtag === 'function');
  await page.locator('[data-consent-hide]').click();
}
async function withdraw(page) {
  await page.locator('.footer-bottom [data-consent-open]').evaluate(e => e.click());
  await page.locator('[data-consent-choice="denied"]').click();
}
const values = { name: 'Phase Nine Fictional Person', email: 'phase9@example.test', phone: '07700 900999', message: 'Private QA health information must never enter a Google command.' };
async function submit(run, scenario = 'success') {
  run.response = scenario;
  const beforeInput = await conversions(run.page);
  await run.page.evaluate(() => { window.phase9Hooks = []; document.querySelector('form[data-contact-form]').addEventListener('mentorsphere:enquiry-success', e => window.phase9Hooks.push(e.detail)); });
  if (scenario !== 'empty') {
    for (const [name, value] of Object.entries(values)) await run.page.locator(`#${name}`).fill(value);
    await run.page.locator('#privacy-acknowledgement').check();
  }
  if (scenario === 'invalid-email') await run.page.locator('#email').fill('not-an-email');
  if (scenario === 'honeypot') await run.page.locator('[name="_gotcha"]').evaluate(e => { e.value = 'qa-bot'; });
  assert.deepEqual(await conversions(run.page), beforeInput, 'Viewing and filling a form must not record a conversion');
  await run.page.locator('[data-submit-button]').click();
  await run.page.waitForFunction(() => !document.querySelector('[data-submit-button]').disabled);
}
async function clickBooking(run, kind, index, keyboard = false) {
  const link = run.page.locator('a[data-measure-event]').nth(index);
  assert.equal(await link.getAttribute('href'), calendar);
  assert.equal(await link.getAttribute('target'), '_blank'); assert.equal(await link.getAttribute('rel'), 'noopener');
  assert.equal(await link.getAttribute('data-measure-event'), routes[kind].prefix + '_booking_click');
  await link.evaluate(e => e.addEventListener('click', event => { window.phase9ClickPrevented = event.defaultPrevented; }, { once: true }));
  const popupPromise = run.context.waitForEvent('page', { timeout: 5000 });
  if (keyboard) { await link.focus(); await run.page.keyboard.press('Enter'); } else await link.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  assert.equal(popup.url(), calendar);
  assert.equal(await run.page.evaluate(() => window.phase9ClickPrevented), false);
  await popup.close();
  return { opened: true, defaultPrevented: false, keyboard };
}
try {
  const matrix = [
    ['no choice', null, false, false, true], ['legacy grant', choice('granted'), false, true, true],
    ['legacy refusal', choice('denied'), false, false, false], ['scope-2 grant', choice('granted', 2), true, true, false],
    ['scope-2 refusal', choice('denied', 2), false, false, false], ['expired grant', choice('granted', 2, '2000-01-01'), false, false, true],
    ['malformed storage', '{broken', false, false, true], ['malformed stored scope', choice('granted', '2'), false, false, true],
  ];
  for (const [label, stored, adultAllowed, youngAllowed, prompt] of matrix) for (const kind of ['adult', 'young']) await check(`${kind}: ${label}`, async () => {
    const run = await fixture({ stored });
    try {
      await run.goto(kind);
      const allowed = kind === 'adult' ? adultAllowed : youngAllowed;
      assert.equal(await googleScripts(run.page), allowed ? 1 : 0);
      assert.equal(await banner(run.page).isVisible(), kind === 'adult' ? prompt : !allowed && prompt);
      if (!allowed) { assert.deepEqual(await calls(run.page), []); assert.equal(await run.page.evaluate(() => typeof window.gtag), 'undefined'); assert.equal(run.requests.length, 0); }
      return { allowed, prompt: await banner(run.page).isVisible() };
    } finally { await run.close(); }
  });
  await check('scope expansion: explicit acceptance, four signals and no replay', async () => {
    const run = await fixture({ stored: choice('granted') });
    try {
      await run.goto(); assert.match(await banner(run.page).innerText(), /scope now includes the adults page/);
      await clickBooking(run, 'adult', 1); assert.deepEqual(await conversions(run.page), []);
      await accept(run.page);
      const commands = await calls(run.page);
      assert.deepEqual(commands[0], ['consent', 'default', deniedSignals]); assert.deepEqual(commands[1], ['consent', 'update', grantedSignals]);
      assert.deepEqual(commands.find(c => c[0] === 'config'), ['config', adsId, { send_page_view: false, page_title: 'The MentorSphere', allow_ad_personalization_signals: false, allow_google_signals: false, page_location: origin + routes.adult.route, page_referrer: '' }]);
      assert.deepEqual(await conversions(run.page), []); return { commands };
    } finally { await run.close(); }
  });
  const locations = ['navigation', 'hero', 'pricing', 'free introduction', 'enquiry-side action', 'closing CTA', 'footer'];
  for (const [label, stored, allowed] of [['no choice', null, false], ['legacy grant', choice('granted'), false], ['scope-2 grant', choice('granted', 2), true]]) {
    const run = await fixture({ stored });
    try {
      await run.goto(); assert.equal(await run.page.locator('a[data-measure-event]').count(), 7);
      for (let index = 0; index < 7; index++) await check(`adult booking ${index + 1}: ${locations[index]}, ${label}`, async () => {
        const activations = [];
        for (const keyboard of [false, true]) {
          const previous = (await conversions(run.page)).length;
          activations.push(await clickBooking(run, 'adult', index, keyboard));
          assert.equal((await conversions(run.page)).length, previous + (allowed ? 1 : 0));
          if (allowed) assert.deepEqual((await conversions(run.page)).at(-1), { send_to: routes.adult.booking });
        }
        return { activations, event: routes.adult.prefix + '_booking_click', conversion: allowed ? routes.adult.booking : null };
      });
    } finally { await run.close(); }
  }
  for (const scenario of ['success', 'empty', 'invalid-email', '4xx', 'validation', '5xx', 'network', 'honeypot']) await check(`adult actual form: ${scenario}`, async () => {
    const run = await fixture({ stored: choice('granted', 2) });
    try {
      await run.goto(); await submit(run, scenario);
      const invalid = ['empty', 'invalid-email'].includes(scenario);
      assert.equal(run.forms.length, invalid ? 0 : 1);
      assert.deepEqual(await conversions(run.page), scenario === 'success' ? [{ send_to: routes.adult.enquiry }] : []);
      assert.deepEqual(await run.page.evaluate(() => window.phase9Hooks), scenario === 'success' ? [null] : []);
      if (invalid) {
        const field = run.page.locator(scenario === 'empty' ? '#name' : '#email');
        assert.equal(await field.evaluate(e => e.validity.valid), false); assert.equal(await field.getAttribute('aria-invalid'), 'true');
      } else {
        const successUI = ['success', 'honeypot'].includes(scenario);
        assert.match(await run.page.locator('[data-form-status]').innerText(), successUI ? /Enquiry sent/ : /could not be sent/);
        assert.equal(await run.page.locator('#message').inputValue(), successUI ? '' : values.message);
        assert.equal(await run.page.locator('[data-form-status]').evaluate(e => e === document.activeElement), true);
        if (scenario === 'validation') assert.match(await run.page.locator('#email-error').innerText(), /Local QA validation rejection/);
      }
      const commands = JSON.stringify(await calls(run.page));
      for (const value of [...Object.values(values), 'privacy_acknowledgement', 'Acknowledged', '"user_data"', 'currency']) assert(!commands.includes(value));
      return { providerRequestsMocked: run.forms.length, successHooks: await run.page.evaluate(() => window.phase9Hooks.length), conversions: await conversions(run.page) };
    } finally { await run.close(); }
  });
  for (const stored of [null, choice('granted')]) await check(`adult form without sufficient consent: ${stored ? 'legacy grant' : 'no choice'}`, async () => {
    const run = await fixture({ stored });
    try { await run.goto(); await submit(run); assert.equal(run.forms.length, 1); assert.deepEqual(await conversions(run.page), []); assert.equal(await googleScripts(run.page), 0); assert.match(await run.page.locator('[data-form-status]').innerText(), /Enquiry sent/); }
    finally { await run.close(); }
  });
  for (const funding of ['Self-funded', 'Access to Work', "I'm not sure yet"]) await check(`adult funding choice: ${funding}, payload and conversion isolation`, async () => {
    const run = await fixture({ stored: choice('granted', 2) });
    try {
      await run.goto();
      assert.deepEqual(await conversions(run.page), []);
      await run.page.locator('#funding-route').selectOption(funding);
      assert.deepEqual(await conversions(run.page), [], 'Selecting funding must not convert');
      await submit(run);
      assert.equal(run.forms.length, 1);
      assert.ok(run.forms[0].includes(`name="funding_route"\r\n\r\n${funding}\r\n`), 'Selected funding reaches Formspree payload');
      assert.match(await run.page.locator('[data-form-status]').innerText(), /Enquiry sent/);
      assert.deepEqual(await conversions(run.page), [{ send_to: routes.adult.enquiry }]);
      assert.ok(!JSON.stringify(await calls(run.page)).includes(funding), 'Funding is not sent to Google');
      // The reset form cannot resubmit the previous enquiry or replay its conversion.
      await run.page.locator('[data-submit-button]').click();
      assert.equal(run.forms.length, 1);
      assert.deepEqual(await conversions(run.page), [{ send_to: routes.adult.enquiry }]);
      await run.page.reload();
      assert.deepEqual(await conversions(run.page), []);
      await run.page.goto(origin + '/privacy-policy/'); await run.goto();
      assert.deepEqual(await conversions(run.page), []);
      return { funding, payloadVerified: true, successConversions: 1, bookingConversions: 0, youngConversions: 0, reloadConversions: 0 };
    } finally { await run.close(); }
  });
  await check('adult pending backend: repeated submit produces one enquiry and converts only after success', async () => {
    const run = await fixture({ stored: choice('granted', 2) });
    try {
      await run.goto();
      for (const [name, value] of Object.entries(values)) await run.page.locator(`#${name}`).fill(value);
      await run.page.locator('#funding-route').selectOption('Access to Work');
      await run.page.locator('#privacy-acknowledgement').check();
      run.response = 'pending';
      await run.page.locator('[data-submit-button]').click();
      await run.page.locator('[data-contact-form]').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
      assert.deepEqual(await conversions(run.page), []);
      run.release();
      await run.page.waitForFunction(() => !document.querySelector('[data-submit-button]').disabled);
      assert.equal(run.forms.length, 1);
      assert.deepEqual(await conversions(run.page), [{ send_to: routes.adult.enquiry }]);
    } finally { await run.close(); }
  });
  for (const kind of ['adult', 'young']) await check(`${kind}: URL/referrer sanitisation and label isolation`, async () => {
    const run = await fixture({ stored: choice('granted', 2) });
    try {
      await run.page.goto(origin + routes[kind].route + '?gclid=QA1&gbraid=QA2&wbraid=QA3&utm_source=private&utm_medium=private&utm_campaign=private&utm_term=private&utm_content=private&search=private&email=private#private', { referer: 'https://referrer.example/private?email=private#private' });
      await clickBooking(run, kind, 1, true); await submit(run);
      assert.deepEqual(await conversions(run.page), [{ send_to: routes[kind].booking }, { send_to: routes[kind].enquiry }]);
      const commands = await calls(run.page), config = commands.find(c => c[0] === 'config')[2];
      assert.equal(config.page_location, origin + routes[kind].route + '?gclid=QA1&gbraid=QA2&wbraid=QA3'); assert.equal(config.page_referrer, 'https://referrer.example/');
      assert(!JSON.stringify(commands).includes('private'));
      const other = routes[kind === 'adult' ? 'young' : 'adult'];
      assert(!JSON.stringify(commands).includes(other.booking)); assert(!JSON.stringify(commands).includes(other.enquiry));
      assert(run.forms[0].includes(origin + routes[kind].route)); assert(!run.forms[0].includes('QA1')); assert(!run.forms[0].includes('utm_'));
      return { config, conversions: await conversions(run.page) };
    } finally { await run.close(); }
  });
  await check('cross-page navigation: legacy young grant, adult upgrade, young retained, refusal on both', async () => {
    const run = await fixture({ stored: choice('granted') });
    try {
      await run.goto('young'); assert.equal(await googleScripts(run.page), 1);
      await run.goto(); assert.equal(await googleScripts(run.page), 0);
      await accept(run.page); await run.goto('young'); assert.equal(await googleScripts(run.page), 1); await withdraw(run.page);
      for (const kind of ['adult', 'young']) { await run.goto(kind); assert.equal(await googleScripts(run.page), 0); assert.equal(await banner(run.page).isVisible(), false); }
    } finally { await run.close(); }
  });
  await check('real cross-tab upgrade and withdrawal stop both pages and remove accessible _gcl_ storage', async () => {
    const run = await fixture({ stored: choice('granted') });
    try {
      await run.goto(); const adult = run.page, young = await run.context.newPage(); await young.goto(origin + routes.young.route);
      await young.locator('.footer-bottom [data-consent-open]').evaluate(e => e.click()); await accept(young);
      await adult.waitForFunction(() => typeof window.gtag === 'function');
      await adult.evaluate(() => { document.cookie = '_gcl_aw=qa; path=/'; localStorage.setItem('_gcl_ls', 'qa'); }); await withdraw(young);
      await adult.waitForFunction(() => [...window.dataLayer.at(-1)][2]?.ad_storage === 'denied');
      for (const page of [adult, young]) {
        assert.deepEqual((await calls(page)).at(-1), ['consent', 'update', deniedSignals]); const count = (await conversions(page)).length;
        run.page = page; await submit(run); await clickBooking(run, page === adult ? 'adult' : 'young', 1);
        assert.equal((await conversions(page)).length, count); assert.equal(await page.evaluate(() => localStorage.getItem('_gcl_ls')), null);
        assert.equal(await page.evaluate(() => document.cookie.includes('_gcl_')), false); assert.equal(await googleScripts(page), 1);
      }
    } finally { await run.close(); }
  });
  await check('pageshow persisted and history restoration recheck adult scope', async () => {
    const run = await fixture({ stored: choice('granted', 2) });
    try {
      await run.goto();
      await run.page.evaluate(stored => { localStorage.setItem('mentorsphere-consent', stored); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }, choice('granted'));
      assert.deepEqual((await calls(run.page)).at(-1), ['consent', 'update', deniedSignals]);
      await clickBooking(run, 'adult', 1); assert.deepEqual(await conversions(run.page), []);
      await run.page.goto(origin + '/privacy-policy/'); await run.page.goBack();
      assert.equal(await googleScripts(run.page), 0); assert.equal(await banner(run.page).isVisible(), true);
      return { syntheticPersistedEvent: true, realHistoryNavigation: true, actualBFCacheUseNotAssumed: true };
    } finally { await run.close(); }
  });
  for (const tag of ['blocked', 'failed', 'delayed']) await check(`${tag} Google script: navigation, form, withdrawal and no delivery claim`, async () => {
    const run = await fixture({ stored: choice('granted', 2), tag });
    try {
      await run.goto(); await clickBooking(run, 'adult', 1, true); await submit(run);
      assert.deepEqual(await conversions(run.page), [{ send_to: routes.adult.booking }, { send_to: routes.adult.enquiry }]);
      assert.equal(await run.page.evaluate(() => window.phase9MockTagLoaded), undefined); await withdraw(run.page);
      assert.deepEqual((await calls(run.page)).at(-1), ['consent', 'update', deniedSignals]); run.release();
      if (tag === 'delayed') await run.page.waitForFunction(() => window.phase9MockTagLoaded === true);
      await clickBooking(run, 'adult', 1); assert.equal((await conversions(run.page)).length, 2);
      return { commandsQueued: 2, externalConversionsDelivered: 0, deliveryClaimed: false };
    } finally { await run.close(); }
  });
  for (const kind of ['adult', 'young']) for (const [width, height] of [[1366, 768], [375, 667], [320, 667]]) await check(`${kind} visual ${width}x${height}: unchanged page and usable consent`, async () => {
    const options = { stored: choice('denied', 2), viewport: { width, height }, touch: width < 600 };
    const run = await fixture(options);
    try {
      await run.goto(kind); await run.page.evaluate(() => document.fonts.ready);
      assert.equal(await run.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const after = await run.page.screenshot({ path: path.join(output, `${kind}-${width}-page.png`), fullPage: true, animations: 'disabled' });
      let identical = null;
      if (baseline) {
        const prior = await fixture({ ...options, before: true });
        try {
          await prior.goto(kind); await prior.page.evaluate(() => document.fonts.ready);
          const before = await prior.page.screenshot({ path: path.join(output, `${kind}-${width}-before.png`), fullPage: true, animations: 'disabled' });
          identical = before.equals(after); assert(identical, 'Measurement wiring changed the rendered page');
        } finally { await prior.close(); }
      }
      await run.page.evaluate(() => localStorage.removeItem('mentorsphere-consent')); await run.page.reload();
      assert.equal(await banner(run.page).isVisible(), true);
      const bounds = await banner(run.page).boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= height + 1);
      assert.equal(await run.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const value of ['granted', 'denied']) {
        const button = run.page.locator(`[data-consent-choice="${value}"]`), box = await button.boundingBox(); assert(box.width >= 44 && box.height >= 44);
        await button.focus(); assert.equal(await button.evaluate(e => e === document.activeElement), true); assert(parseFloat(await button.evaluate(e => getComputedStyle(e).outlineWidth)) >= 2);
      }
      await run.page.screenshot({ path: path.join(output, `${kind}-${width}-consent.png`), animations: 'disabled' });
      await run.page.keyboard.press('Enter'); assert.equal(await run.page.evaluate(() => MentorSphereConsent.get('advertising', 2)), 'denied');
      return { identicalToBaseline: identical, sha256: createHash('sha256').update(after).digest('hex'), consentBounds: bounds, reducedMotion: true, touch: options.touch };
    } finally { await run.close(); }
  });
  await check('no browser exceptions or unexpected external endpoints', async () => {
    assert.deepEqual(errors, []); assert(traffic.every(request => request.url.startsWith('https://www.googletagmanager.com/gtag/js?') || request.url === calendar || request.url === 'https://formspree.io/f/meeynlze'));
  });
} finally {
  await browser.close();
  const report = { generated: new Date().toISOString(), methodology: 'All routes local or blocked; tag is an inert local stub; dataLayer commands are not proof of delivery.', passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length, checks, errors, traffic, externalRequestsDelivered: 0 };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: path.join(output, 'report.json') })); if (report.failed) process.exitCode = 1;
}
