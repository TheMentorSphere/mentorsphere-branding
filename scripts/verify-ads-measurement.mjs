// Opt-in, isolated browser QA. No browser request reaches a remote server.
// Supply an installed Playwright module and an output directory outside docs.
// The sole outbound request is a cookie/referrer-free download of gtag.js.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [playwrightModule, outputDirectory] = process.argv.slice(2);
assert(playwrightModule && outputDirectory, 'Usage: node scripts/verify-ads-measurement.mjs PLAYWRIGHT_MODULE OUTPUT_DIRECTORY');
const { chromium } = await import(pathToFileURL(path.resolve(playwrightModule)).href);
const output = path.resolve(outputDirectory);
const relativeOutput = path.relative(path.resolve('docs'), output);
assert(relativeOutput.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOutput), 'QA output must not be published');
await mkdir(output, { recursive: true });
const origin = 'https://www.thementorsphere.co.uk';
const canonical = `${origin}/adhd-coaching/young-people/`;
const tagUrl = 'https://www.googletagmanager.com/gtag/js?id=AW-18485496875';
const booking = 'AW-18485496875/bi_lCP__lowdEKuYye5E';
const enquiry = 'AW-18485496875/7zLXCPz_lowdEKuYye5E';
// Node fetch has no browser cookie jar. Do not follow redirects to collectors.
const response = await fetch(tagUrl, { redirect: 'error' });
assert(response.ok, `Tag download failed: ${response.status}`);
const vendor = await response.text();
await writeFile(path.join(output, 'vendor-gtag.js'), vendor);
const baselineCommit = '7535d62917d60e1dff7c94369919f8c079fa3eb4';
const originalScript = execFileSync('git', ['show', `${baselineCommit}:docs/assets/js/ads-measurement.js`], { encoding: 'utf8' });
const report = { date: new Date().toISOString(), baselineCommit, vendorSha256: createHash('sha256').update(vendor).digest('hex'), runs: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const calls = (page) => page.evaluate(() => (window.dataLayer || []).filter((x) => typeof x?.length === 'number').map((x) => Array.from(x)));
const conversions = async (page) => (await calls(page)).filter((x) => x[0] === 'event' && x[1] === 'conversion');
const state = async (page, context) => ({
  ...(await page.evaluate(() => ({ gtag: typeof window.gtag, dataLayer: typeof window.dataLayer, scripts: [...document.scripts].map((s) => s.src).filter((s) => s.includes('googletagmanager')), localStorage: { ...localStorage }, sessionStorage: { ...sessionStorage }, title: document.title, sourcePage: document.querySelector('[data-source-page]')?.value }))),
  cookies: await context.cookies(),
});

try {
  for (const mode of ['original', 'no-beacon', 'neutral-title', 'current', 'mobile', 'delayed-tag', 'blocked-tag']) {
    const run = { mode, requests: [], pageErrors: [], checkpoints: {} };
    report.runs.push(run);
    const mobile = mode === 'mobile';
    const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 812 } : { width: 1366, height: 800 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', serviceWorkers: 'block' });
    context.on('page', (p) => p.on('pageerror', (err) => run.pageErrors.push(err.message)));
    let releaseTag;
    const tagGate = new Promise((resolve) => { releaseTag = resolve; });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin) {
        let pathname = decodeURIComponent(url.pathname);
        if (pathname.endsWith('/')) pathname += 'index.html';
        const file = path.resolve('docs', `.${pathname}`);
        assert(file.startsWith(path.resolve('docs') + path.sep));
        try {
          let body = await readFile(file);
          if (pathname.endsWith('/ads-measurement.js')) {
            let js = ['original', 'no-beacon', 'neutral-title'].includes(mode) ? originalScript : body.toString();
            if (mode === 'no-beacon') js = js.replace(", { transport_type: 'beacon' }", '');
            if (mode === 'neutral-title') js = js.replace('send_page_view: false,', "send_page_view: false,\n      page_title: 'The MentorSphere',");
            body = Buffer.from(js);
          }
          return route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body });
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          return route.fulfill({ status: 404, body: 'Local fixture not found' });
        }
      }
      const record = { url: request.url(), method: request.method(), type: request.resourceType(), query: Object.fromEntries(url.searchParams), body: request.postData(), headers: await request.allHeaders(), disposition: 'aborted' };
      run.requests.push(record);
      if (request.url() === tagUrl) {
        if (mode === 'blocked-tag') return route.abort();
        if (mode === 'delayed-tag') await tagGate;
        record.disposition = 'fulfilled from downloaded asset';
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: vendor });
      }
      // Includes all collection/conversion, Calendar and Formspree requests.
      return route.abort();
    });
    const page = await context.newPage();
    const testUrl = `${canonical}?gclid=TESTCLICK&gbraid=TESTBRAID&wbraid=TESTWBRAID&utm_source=EXCLUDED_CAMPAIGN&utm_term=EXCLUDED_SEARCH&other=EXCLUDED_QUERY#EXCLUDED_FRAGMENT`;
    await page.goto(testUrl, { waitUntil: 'networkidle', referer: `${origin}/referrer-path?private=EXCLUDED_REFERRER` });
    run.checkpoints.before = await state(page, context);
    assert.equal(run.requests.length, 0);
    assert.equal(run.checkpoints.before.gtag, 'undefined');
    assert.equal(run.checkpoints.before.dataLayer, 'undefined');
    assert.equal(run.checkpoints.before.cookies.length, 0);
    assert.deepEqual(run.checkpoints.before.localStorage, {});
    assert.deepEqual(run.checkpoints.before.sessionStorage, {});
    assert.equal(run.checkpoints.before.sourcePage, canonical);
    await page.screenshot({ path: path.join(output, `${mode}-before.png`) });
    await page.getByRole('button', { name: 'Reject advertising measurement', exact: true }).click();
    await page.locator('form[data-measure-event]').evaluate((form) => form.dispatchEvent(new CustomEvent('mentorsphere:enquiry-success')));
    assert.equal(run.requests.length, 0);
    assert.equal((await conversions(page)).length, 0);
    await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
    await page.getByRole('button', { name: 'Accept advertising measurement', exact: true }).click();
    if (!['delayed-tag', 'blocked-tag'].includes(mode)) await page.waitForFunction(() => window.google_tag_manager?.['AW-18485496875']);
    await delay(700);
    run.checkpoints.accepted = await state(page, context);
    const config = (await calls(page)).find((x) => x[0] === 'config');
    assert.equal(config[1], 'AW-18485496875');
    assert.equal(config[2].send_page_view, false);
    assert.equal(config[2].page_location, `${canonical}?gclid=TESTCLICK&gbraid=TESTBRAID&wbraid=TESTWBRAID`);
    assert.equal(config[2].page_referrer, `${origin}/`);
    const consentCalls = (await calls(page)).filter((x) => x[0] === 'consent');
    assert.deepEqual(consentCalls[0][2], { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    assert.deepEqual(consentCalls.at(-1)[2], { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' });
    const links = page.locator('a[data-measure-event="adhd_young_people_booking_click"]');
    const linkCount = await links.count();
    assert(linkCount > 0);
    run.links = [];
    for (let i = 0; i < linkCount; i += 1) {
      const link = links.nth(i);
      assert.equal(await link.getAttribute('target'), '_blank');
      // The collapsed mobile navigation contains hidden links; desktop covers
      // every marker, mobile covers every currently visible booking control.
      if (mobile && !(await link.isVisible())) continue;
      const popupPromise = context.waitForEvent('page').catch((error) => ({ error }));
      const before = (await conversions(page)).length;
      if (mobile) await link.tap();
      else if (i % 2) { await link.focus(); await page.keyboard.press('Enter'); }
      else await link.click();
      const popup = await popupPromise;
      if (popup.error) throw popup.error;
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      assert.equal(page.url(), testUrl, 'Original page must remain open');
      assert.equal((await conversions(page)).length, before + 1);
      assert.equal((await conversions(page)).at(-1)[2].send_to, booking);
      run.links.push({ index: i, input: mobile ? 'touch' : i % 2 ? 'keyboard' : 'mouse', originalPageRetained: true, popupOpened: true });
      await popup.close();
    }
    releaseTag();
    if (mode === 'delayed-tag') await page.waitForFunction(() => window.google_tag_manager?.['AW-18485496875']);
    await page.locator('form[data-measure-event]').evaluate((form) => form.dispatchEvent(new CustomEvent('mentorsphere:enquiry-success')));
    assert.equal((await conversions(page)).at(-1)[2].send_to, enquiry);
    await delay(1600);
    run.calls = await calls(page);
    run.checkpoints.afterEvents = await state(page, context);
    const hits = run.requests.filter((r) => /\/pagead\/(?:1p-)?conversion\//.test(new URL(r.url).pathname));
    run.conversionRequests = hits.map((r) => ({ url: r.url, label: r.query.label, method: r.method, type: r.type }));
    if (mode !== 'blocked-tag') {
      for (const endpoint of ['/pagead/conversion/18485496875/', '/pagead/1p-conversion/18485496875/']) {
        assert.equal(hits.filter((r) => new URL(r.url).pathname === endpoint && r.query.label === booking.split('/')[1]).length, run.links.length, `${mode}: one request per booking per endpoint`);
        assert.equal(hits.filter((r) => new URL(r.url).pathname === endpoint && r.query.label === enquiry.split('/')[1]).length, 1, `${mode}: one enquiry per endpoint`);
      }
      const views = run.requests.filter((r) => r.query.en === 'page_view');
      assert(views.length > 0, 'Capture vendor page-view behaviour separately from website events');
      if (!['original', 'no-beacon'].includes(mode)) {
        assert.equal(config[2].page_title, 'The MentorSphere');
        assert(views.every((r) => r.query.dt === 'The MentorSphere'));
      }
    }
    assert.equal(run.calls.filter((x) => x[0] === 'event').length, run.links.length + 1);
    assert(run.calls.filter((x) => x[0] === 'event').every((x) => x[1] === 'conversion'));
    assert.equal(await page.title(), 'Online ADHD Coaching for Young People and Parents | The MentorSphere');
    assert(!run.requests.some((r) => r.url.includes('formspree')));
    const payloads = JSON.stringify(run.requests.filter((r) => !r.url.startsWith('https://calendar.google.com')).map((r) => ({ url: r.url, body: r.body })));
    for (const excluded of ['EXCLUDED_CAMPAIGN', 'EXCLUDED_SEARCH', 'EXCLUDED_QUERY', 'EXCLUDED_FRAGMENT', 'EXCLUDED_REFERRER']) assert(!payloads.includes(excluded), `${mode}: leaked ${excluded}`);
    await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
    await page.getByRole('button', { name: 'Reject advertising measurement', exact: true }).click();
    const count = (await conversions(page)).length;
    // Synthetic clicks here check withdrawal without creating another popup.
    await links.first().evaluate((link) => { link.addEventListener('click', (e) => e.preventDefault(), { once: true }); link.click(); });
    await page.locator('form[data-measure-event]').evaluate((form) => form.dispatchEvent(new CustomEvent('mentorsphere:enquiry-success')));
    assert.equal((await conversions(page)).length, count);
    run.checkpoints.withdrawn = await state(page, context);
    assert(!run.checkpoints.withdrawn.cookies.some((c) => c.name.startsWith('_gcl')));
    assert(!Object.keys(run.checkpoints.withdrawn.localStorage).some((key) => key.startsWith('_gcl')));
    const requestCount = run.requests.length;
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(run.requests.length, requestCount);
    assert.equal((await state(page, context)).gtag, 'undefined');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(run.pageErrors, []);
    await context.close();
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${mode}: passed ${run.links.length} booking links, enquiry, consent and withdrawal`);
  }
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
