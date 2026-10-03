import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Local browser QA only. Every external request is intercepted; Formspree is
// simulated, never contacted. Use the installed runtime, without installation.
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const output = path.resolve('tmp/phase9/adult-layout');
await mkdir(output, { recursive: true });
const docs = path.resolve('docs');
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(docs, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
    if (!file.startsWith(`${docs}${path.sep}`)) throw new Error('Outside preview');
    if (file.endsWith(path.sep)) file += 'index.html';
    // path.resolve removes the trailing separator.
    if (!path.extname(file)) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/adhd-coaching/adults/`;
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const checks = [];
const metrics = [];
const unexpectedExternal = [];
const pageErrors = [];
const check = async (name, run) => {
  try { const detail = await run(); checks.push({ name, passed: true, detail }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
async function pageFor(options = {}) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, ...options });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    unexpectedExternal.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  // Layout checks use a remembered refusal. The authoritative measurement and
  // form integration matrix is scripts/verify-ads-measurement.mjs.
  await page.addInitScript(() => localStorage.setItem('mentorsphere-consent', JSON.stringify({ version: 1, choices: { advertising: { value: 'denied', scopeVersion: 2, date: new Date().toISOString().slice(0, 10) } } })));
  await page.goto(url);
  return page;
}
const fits = async page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const luminance = rgb => rgb.map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4).reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);

try {
  for (const width of [1366, 1024, 768, 375, 320]) {
    const height = width < 600 ? 667 : 768;
    const page = await pageFor({ viewport: { width, height } });
    await check(`${width}: full layout, hero and pricing grid`, async () => {
      assert.ok(await fits(page));
      const data = await page.evaluate(() => {
        const box = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        };
        return { width: innerWidth, height: document.documentElement.scrollHeight, h1: box('h1'), proposition: box('.page-hero .lead'), price: box('.adult-hero-price'), cta: box('.page-hero .button'), trust: box('#who-youll-work-with'), pricing: box('#pricing'), priceRows: [...document.querySelectorAll('.price-card')].map(e => e.getBoundingClientRect().top) };
      });
      for (const key of ['h1', 'proposition', 'price', 'cta']) assert.ok(data[key].top >= 0 && data[key].bottom <= height, `${key} crosses initial viewport`);
      const phase4Height = { 375: 8879, 320: 9696 }[width];
      if (phase4Height) assert.ok(data.height <= phase4Height, `Page grew beyond Phase 4: ${data.height}px`);
      assert.equal(new Set(data.priceRows).size, width > 672 ? 1 : 3);
      metrics.push(data);
      await page.screenshot({ path: path.join(output, `qa-${width}.png`), fullPage: true });
      return data;
    });
    await check(`${width}: expanded FAQs remain usable`, async () => {
      for (const summary of await page.locator('summary').all()) await summary.click();
      assert.equal(await page.locator('details[open]').count(), 5);
      assert.ok(await fits(page));
      await page.screenshot({ path: path.join(output, `faq-open-${width}.png`), fullPage: true });
    });
    await page.close();
  }

  const keyboard = await pageFor();
  await check('keyboard skip link, hero booking and visible focus', async () => {
    await keyboard.keyboard.press('Tab');
    assert.ok(await keyboard.locator('.skip-link').evaluate(e => e === document.activeElement));
    await keyboard.keyboard.press('Enter');
    await keyboard.keyboard.press('Tab');
    assert.ok(await keyboard.locator('.page-hero .button').first().evaluate(e => e === document.activeElement));
    const outline = await keyboard.locator('.page-hero .button').first().evaluate(e => getComputedStyle(e).outlineWidth);
    assert.ok(parseFloat(outline) >= 2);
    return { outline };
  });
  await check('keyboard FAQ opens and closes', async () => {
    const summary = keyboard.locator('summary').first();
    await summary.focus(); await keyboard.keyboard.press('Enter');
    assert.equal(await keyboard.locator('details[open]').count(), 1);
    await keyboard.keyboard.press('Space');
    assert.equal(await keyboard.locator('details[open]').count(), 0);
  });
  await check('keyboard form order includes privacy link and submit; skips honeypot', async () => {
    await keyboard.locator('#name').focus();
    const order = [];
    for (let i = 0; i < 6; i++) {
      await keyboard.keyboard.press('Tab');
      order.push(await keyboard.evaluate(() => document.activeElement.id || document.activeElement.getAttribute('href') || document.activeElement.textContent.trim()));
    }
    assert.deepEqual(order, ['email', 'phone', 'message', 'privacy-acknowledgement', '../../privacy-policy/', 'Send enquiry']);
    return order;
  });
  await check('field boundary contrast preserves Phase 4 minimum in normal, error and focus states', async () => {
    const results = [];
    for (const selector of ['#name', '#email', '#phone', '#message']) {
      for (const state of ['normal', 'error', 'focus']) {
        const field = keyboard.locator(selector);
        await field.evaluate((e, state) => { e.blur(); e.removeAttribute('aria-invalid'); if (state === 'error') e.setAttribute('aria-invalid', 'true'); if (state === 'focus') e.focus(); }, state);
        // Read settled colours, not the first frame of a border transition.
        await field.evaluate(e => { getComputedStyle(e).borderTopColor; e.getAnimations().forEach(animation => animation.finish()); });
        const colours = await field.evaluate(e => { const s = getComputedStyle(e); return { border: s.borderTopColor, background: s.backgroundColor }; });
        assert.equal(colours.border, state === 'normal' ? 'rgb(91, 102, 112)' : state === 'error' ? 'rgb(169, 52, 39)' : 'rgb(0, 95, 141)');
        const rgb = value => value.match(/\d+/g).slice(0, 3).map(Number);
        const a = luminance(rgb(colours.border)), b = luminance(rgb(colours.background));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        // Phase 4's measured minimum is 5.86699:1, displayed rounded as 5.87:1.
        assert.ok(ratio >= 5.8669, `${selector} ${state}: ${ratio}`);
        results.push({ selector, state, ...colours, ratio });
      }
    }
    return results;
  });
  await keyboard.close();

  const mobile = await pageFor({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 667 } });
  await check('touch/no-hover mobile menu, submenu and closing', async () => {
    assert.equal(await mobile.evaluate(() => matchMedia('(hover: none)').matches), true);
    await mobile.locator('[data-nav-toggle]').tap();
    assert.equal(await mobile.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'true');
    await mobile.locator('[aria-controls="submenu-adhd-coaching"]').tap();
    assert.ok(await mobile.locator('#submenu-adhd-coaching').isVisible());
    await mobile.locator('[data-nav-toggle]').tap();
    assert.equal(await mobile.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
    await mobile.locator('#questions summary').first().tap();
    assert.equal(await mobile.locator('details[open]').count(), 1);
  });
  await mobile.close();

  const nojs = await pageFor({ javaScriptEnabled: false, viewport: { width: 320, height: 667 } });
  await check('no-JS navigation flows, scrolls away and leaves FAQs accessible', async () => {
    const header = nojs.locator('.site-header');
    assert.equal(await header.evaluate(e => getComputedStyle(e).position), 'static');
    assert.ok(await nojs.locator('#submenu-adhd-coaching a').first().isVisible());
    await nojs.locator('#questions summary').first().click();
    assert.equal(await nojs.locator('details[open]').count(), 1);
    const data = await nojs.evaluate(() => ({ scrollY, headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom, headerHeight: document.querySelector('.site-header').getBoundingClientRect().height }));
    assert.ok(data.scrollY > 1000 && data.headerBottom < 0);
    assert.ok(await fits(nojs));
    await nojs.screenshot({ path: path.join(output, 'no-js-faq.png') });
    return data;
  });
  await nojs.close();

  const reflow = await pageFor({ viewport: { width: 683, height: 384 }, deviceScaleFactor: 2 });
  await check('200% equivalent reflow: 1366x768 to 683x384 CSS pixels', async () => {
    assert.ok(await fits(reflow));
    await reflow.locator('#enquiry').scrollIntoViewIfNeeded();
    assert.ok(await reflow.locator('#message').isVisible());
    await reflow.screenshot({ path: path.join(output, 'reflow-200.png'), fullPage: true });
  });
  await reflow.close();

  const reduced = await pageFor({ reducedMotion: 'reduce' });
  await check('reduced motion: visible content with no running main animations', async () => {
    assert.equal(await reduced.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    const animations = await reduced.evaluate(() => document.querySelector('main').getAnimations({ subtree: true }).filter(a => a.playState === 'running').length);
    assert.equal(animations, 0);
    await reduced.screenshot({ path: path.join(output, 'reduced-motion.png') });
  });
  await reduced.close();

  // Consent and mocked submission checks live in verify-ads-measurement.mjs.
  await check('no unexpected external requests or browser JavaScript errors', async () => {
    assert.deepEqual(unexpectedExternal, []); assert.deepEqual(pageErrors, []);
  });
} finally {
  await browser.close(); server.close();
}
const report = { passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length, checks, metrics, unexpectedExternal, pageErrors };
await writeFile(path.join(output, 'browser-qa.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
