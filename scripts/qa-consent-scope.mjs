import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Local consent-only QA. Block every external request, including Google and
// Formspree. The adult runtime now requests scope 2; this harness checks consent UI.
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const output = path.resolve('tmp/phase9/consent-ui');
await mkdir(output, { recursive: true });
const docs = path.resolve('docs');
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(docs, `.${new URL(req.url, 'http://localhost').pathname}`);
    if (!file.startsWith(`${docs}${path.sep}`)) throw new Error('Outside preview');
    if (!path.extname(file)) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const adult = '/adhd-coaching/adults/';
const young = '/adhd-coaching/young-people/';
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const checks = [], errors = [], blocked = [];
const check = async (name, run) => {
  try { const detail = await run(); checks.push({ name, passed: true, detail }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
const record = (value, scopeVersion) => ({ version: 1, choices: { advertising: { value, date: new Date().toISOString().slice(0, 10), ...(scopeVersion ? { scopeVersion } : {}) } } });
async function contextFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    blocked.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
  return context;
}
async function seed(page, choice) {
  await page.goto(origin + '/privacy-policy/');
  await page.evaluate(choice => choice ? localStorage.setItem('mentorsphere-consent', JSON.stringify(choice)) : localStorage.removeItem('mentorsphere-consent'), choice);
}
const decision = page => page.evaluate(() => [MentorSphereConsent.get('advertising'), MentorSphereConsent.get('advertising', 2)]);
const banner = page => page.locator('[data-consent-banner]');
const settings = page => page.locator('.footer-bottom [data-consent-open]');
try {
  for (const [label, choice, states] of [['first visit', null, [null, null]], ['legacy grant', record('granted'), ['granted', null]], ['legacy refusal', record('denied'), ['denied', 'denied']], ['expanded grant', record('granted', 2), ['granted', 'granted']], ['expanded refusal', record('denied', 2), ['denied', 'denied']]]) {
    await check(`${label}: adult scope 2 and young-person scope 1 remain distinct`, async () => {
      const ctx = await contextFor(), page = await ctx.newPage();
      await seed(page, choice); await page.goto(origin + adult);
      assert.equal(await banner(page).isVisible(), states[1] === null);
      assert.equal(await page.locator('script[src*="googletagmanager"]').count(), states[1] === 'granted' ? 1 : 0);
      assert.deepEqual(await decision(page), states);
      await page.evaluate(() => MentorSphereConsent.request('advertising', 2));
      assert.equal(await banner(page).isVisible(), states[1] === null);
      await page.goto(origin + young);
      assert.equal(await page.locator('script[src*="googletagmanager"]').count(), states[0] === 'granted' ? 1 : 0);
      assert.equal(await banner(page).isVisible(), states[0] === null);
      await ctx.close();
    });
  }
  for (const width of [1280, 375, 320]) {
    await check(`${width}px: renewal, keyboard, equal buttons, confirmation, reduced motion and no hover`, async () => {
      const ctx = await contextFor({ viewport: { width, height: width < 600 ? 667 : 800 }, reducedMotion: 'reduce', hasTouch: true, isMobile: width < 600 });
      const page = await ctx.newPage();
      await seed(page, record('granted')); await page.goto(origin + adult);
      await page.evaluate(() => MentorSphereConsent.request('advertising', 2));
      assert.match(await banner(page).innerText(), /Please accept again before measurement can be used there/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const metrics = await page.locator('[data-consent-choice]').evaluateAll(elements => elements.map(e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height, animation: getComputedStyle(e).animationName })));
      assert.ok(metrics.every(m => m.height >= 44 && m.animation === 'none'));
      assert.ok(Math.abs(metrics[0].width - metrics[1].width) < 1);
      await page.screenshot({ path: path.join(output, `renewal-${width}.png`) });
      await settings(page).evaluate(e => e.click());
      assert.equal(await page.locator('#consent-banner-title').evaluate(e => document.activeElement === e), true);
      await page.keyboard.press('Tab'); // policy explanation link
      await page.keyboard.press('Tab'); // accept
      assert.equal(await page.locator('[data-consent-choice="granted"]').evaluate(e => document.activeElement === e), true);
      assert.ok(parseFloat(await page.locator('[data-consent-choice="granted"]').evaluate(e => getComputedStyle(e).outlineWidth)) >= 2);
      await page.keyboard.press('Escape');
      assert.equal(await banner(page).isVisible(), false);
      assert.equal(await settings(page).evaluate(e => document.activeElement === e), true);
      assert.deepEqual(await decision(page), ['granted', null]);
      await settings(page).click();
      await page.locator('[data-consent-close]').click();
      assert.deepEqual(await decision(page), ['granted', null]);
      await settings(page).click();
      await page.locator('[data-consent-choice="granted"]').click();
      assert.deepEqual(await decision(page), ['granted', 'granted']);
      assert.equal(await page.locator('.consent-banner-confirmation').evaluate(e => document.activeElement === e), true);
      assert.match(await banner(page).innerText(), /You have accepted advertising measurement/);
      await page.locator('[data-consent-hide]').click();
      assert.equal(await settings(page).evaluate(e => document.activeElement === e), true);
      await settings(page).click();
      assert.match(await banner(page).innerText(), /Your current choice: accepted/);
      await page.locator('[data-consent-choice="denied"]').click();
      assert.deepEqual(await decision(page), ['denied', 'denied']);
      assert.match(await banner(page).innerText(), /You have rejected advertising measurement/);
      await ctx.close();
      return metrics;
    });
  }
  await check('actual cross-tab upgrade and withdrawal refresh settings and stop young-person dispatch', async () => {
    const ctx = await contextFor(), a = await ctx.newPage(), b = await ctx.newPage();
    await seed(a, record('granted')); await a.goto(origin + young); await b.goto(origin + adult);
    await settings(a).click();
    await b.evaluate(() => MentorSphereConsent.request('advertising', 2));
    await b.locator('[data-consent-choice="granted"]').click();
    await a.waitForFunction(() => document.querySelector('.consent-banner-current').textContent === 'Your current choice: accepted.');
    assert.deepEqual(await decision(a), ['granted', 'granted']);
    await b.evaluate(() => { document.cookie = '_gcl_aw=test; path=/'; localStorage.setItem('_gcl_ls', 'test'); });
    await settings(b).evaluate(e => e.click()); await b.locator('[data-consent-choice="denied"]').click();
    await a.waitForFunction(() => document.querySelector('.consent-banner-current').textContent === 'Your current choice: rejected.');
    assert.deepEqual(await decision(a), ['denied', 'denied']);
    assert.equal(await a.evaluate(() => localStorage.getItem('_gcl_ls')), null);
    assert.equal(await a.evaluate(() => document.cookie.includes('_gcl_aw')), false);
    assert.equal(await a.evaluate(() => [...dataLayer.at(-1)][2].ad_storage), 'denied');
    await ctx.close();
  });
  await check('history restoration rechecks scope and keeps confirmation focus visible', async () => {
    const ctx = await contextFor(), page = await ctx.newPage();
    await seed(page, record('granted')); await page.goto(origin + adult);
    await settings(page).click(); await page.locator('[data-consent-choice="granted"]').click();
    await page.evaluate(() => {
      localStorage.setItem('mentorsphere-consent', JSON.stringify({ version: 1, choices: { advertising: { value: 'denied', date: new Date().toISOString().slice(0, 10) } } }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    assert.deepEqual(await decision(page), ['denied', 'denied']);
    assert.match(await banner(page).innerText(), /Your current choice: rejected/);
    assert.equal(await page.locator('#consent-banner-title').evaluate(e => document.activeElement === e), true);
    await page.goto(origin + '/privacy-policy/'); await page.goBack();
    assert.deepEqual(await decision(page), ['denied', 'denied']);
    await ctx.close();
  });
  await check('no browser exceptions', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
await writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, blockedExternalRequests: blocked.length, errors }, null, 2));
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed), blockedExternalRequests: blocked.length }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
