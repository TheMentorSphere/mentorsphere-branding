import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Browser comparison against real shared components. External services are never
// contacted, and the normal-motion checks wait for browser state, not sleeps.
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const baseline = process.argv.includes('--baseline');
const output = path.resolve(`tmp/adult-brand-motion/${baseline ? 'baseline' : 'final'}`);
const docs = path.resolve('docs');
const origin = 'https://www.thementorsphere.co.uk';
const routes = {
  young: '/adhd-coaching/young-people/', hub: '/adhd-coaching/',
  maths: '/tutoring/maths/', send: '/education-send-support/', adult: '/adhd-coaching/adults/',
};
const sections = ['funding', 'recognition', 'how-coaching-works', 'pricing', 'introduction', 'questions', 'enquiry'];
// Keep fixed UI from covering headings in screenshots taller than the viewport.
const sectionScreenshot = { style: '.site-header, .scroll-progress, .skip-link, [data-back-to-top] { opacity: 0 !important; }' };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const checks = [], audit = [], errors = [], external = [];
async function check(name, run) {
  try { const detail = await run(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false, error: error.stack }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function fixture(route, width, options = {}) {
  const { saveData = false, noObserver = false, ...browserOptions } = options;
  const context = await browser.newContext({ viewport: { width, height: 768 }, reducedMotion: 'no-preference', serviceWorkers: 'block', ...browserOptions });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.href); return route.abort(); }
    const file = path.resolve(docs, `.${decodeURIComponent(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname)}`);
    assert(file.startsWith(docs + path.sep));
    try {
      await route.fulfill({ body: await readFile(file), contentType: ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream' });
    } catch { await route.fulfill({ status: 404, body: 'Local fixture not found' }); }
  });
  await context.addInitScript(({ saveData, noObserver }) => {
    localStorage.setItem('mentorsphere-consent', JSON.stringify({ version: 1, choices: { advertising: { value: 'denied', scopeVersion: 2, date: new Date().toISOString().slice(0, 10) } } }));
    if (saveData) Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    if (noObserver) delete window.IntersectionObserver;
    window.revealTransitions = [];
    document.addEventListener('transitionrun', event => {
      if (event.target.matches('[data-reveal]')) window.revealTransitions.push({ property: event.propertyName, class: event.target.className, section: event.target.closest('section')?.id });
    });
  }, { saveData, noObserver });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + route);
  if (browserOptions.javaScriptEnabled !== false) await page.waitForFunction(() => !!document.querySelector('link[data-motion-styles]')?.sheet);
  return { context, page, close: () => context.close() };
}
async function styles(page) {
  return page.evaluate(() => {
    const sample = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const css = getComputedStyle(element);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'borderTopColor', 'boxShadow', 'transitionDuration'].map(key => [key, css[key]]));
    };
    const element = [...document.querySelectorAll('[data-reveal]')].find(e => e.getBoundingClientRect().top > innerHeight);
    const css = getComputedStyle(document.documentElement);
    return {
      body: sample('body'), h1: sample('h1'), h2: sample('.section-heading h2'),
      h3: sample('.price-card h3'), lead: sample('.page-hero .lead'), button: sample('.page-hero .button'),
      priceBody: sample('.price-card > p:not(.price)'), price: sample('.price-card .price'),
      muted: sample('.hero-note'), link: sample('.breadcrumbs a'),
      tokens: Object.fromEntries(['deep-blue', 'sky-blue', 'warm-red', 'sunny-yellow', 'bright-orange', 'off-white', 'paper', 'charcoal', 'muted', 'line', 'focus', 'shadow-sm', 'shadow-md', 'shadow-lg'].map(token => [token, css.getPropertyValue(`--${token}`).trim()])),
      below: element ? { class: element.className, opacity: getComputedStyle(element).opacity, transition: getComputedStyle(element).transition, transform: getComputedStyle(element).transform } : null,
    };
  });
}
async function settled(page) {
  await page.waitForFunction(() => document.querySelector('main').getAnimations({ subtree: true }).every(animation => animation.playState !== 'running' || animation.effect.getTiming().iterations === Infinity));
}
async function naturalScroll(page) {
  for (let index = 0; index < 100; index++) {
    const { y, max, height } = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight, height: innerHeight }));
    if (y >= max - 1) break;
    await page.mouse.wheel(0, Math.min(height * 0.65, max - y));
    await page.waitForFunction(old => scrollY > old, y);
    await settled(page);
  }
}
try {
  for (const width of baseline ? [1366] : [1366, 768, 375, 320]) {
    const data = {};
    for (const [name, route] of Object.entries(routes)) {
      const run = await fixture(route, width);
      try {
        data[name] = await styles(run.page);
        await settled(run.page);
        await run.page.screenshot({ path: path.join(output, `${name}-hero-${width}.png`) });
        await naturalScroll(run.page);
        await run.page.screenshot({ path: path.join(output, `${name}-full-${width}.png`), fullPage: true });
        if (name === 'adult') {
          for (const id of sections) await run.page.locator(`#${id}`).screenshot({ ...sectionScreenshot, path: path.join(output, `adult-${id}-${width}.png`) });
          await run.page.locator('.adult-closing').screenshot({ ...sectionScreenshot, path: path.join(output, `adult-closing-${width}.png`) });
        }
      } finally { await run.close(); }
    }
    audit.push({ width, data });
    if (baseline) continue;
    await check(`${width}: shared typography, colours, borders and shadows`, async () => {
      for (const name of ['young', 'hub', 'maths', 'send']) {
        for (const key of ['body', 'h2', 'button', 'link']) assert.deepEqual(data.adult[key], data[name][key], `${name}: ${key}`);
        assert.deepEqual(data.adult.tokens, data[name].tokens);
        // Keep the approved compact hero sizing; its family, weight and relative
        // line height still follow the shared heading system.
        for (const key of ['fontFamily', 'fontWeight', 'color']) assert.equal(data.adult.h1[key], data[name].h1[key], `${name}: h1 ${key}`);
        assert.ok(Math.abs(parseFloat(data.adult.h1.lineHeight) / parseFloat(data.adult.h1.fontSize) - parseFloat(data[name].h1.lineHeight) / parseFloat(data[name].h1.fontSize)) < 0.0001);
      }
      for (const key of ['h3', 'priceBody', 'price']) assert.deepEqual(data.adult[key], data.hub[key], `hub: ${key}`);
      assert.equal(data.adult.body.color, 'rgb(46, 46, 46)');
      assert.equal(data.adult.h2.color, 'rgb(0, 56, 81)');
      assert.equal(data.adult.muted.color, 'rgb(91, 102, 112)');
      return data.adult;
    });
    const run = await fixture(routes.adult, width);
    try {
      await check(`${width}: unrevealed content actually transitions on scroll`, async () => {
        const target = run.page.locator('#recognition .section-heading');
        await settled(run.page);
        assert.equal(await target.getAttribute('data-reveal') !== null, true);
        assert.equal(await target.evaluate(e => e.classList.contains('is-visible')), false);
        assert.equal(await target.evaluate(e => getComputedStyle(e).opacity), '0');
        assert.equal(await target.evaluate(e => getComputedStyle(e).transitionDuration), '0.72s, 0.72s, 0.72s');
        await run.page.evaluate(() => { window.revealTransitions = []; });
        for (let index = 0; index < 30 && !await target.evaluate(e => e.classList.contains('is-visible')); index++) {
          const y = await run.page.evaluate(() => scrollY);
          await run.page.mouse.wheel(0, 300);
          await run.page.waitForFunction(old => scrollY > old, y);
        }
        await run.page.waitForFunction(() => document.querySelector('#recognition .section-heading').classList.contains('is-visible'));
        await run.page.waitForFunction(() => window.revealTransitions.some(t => t.property === 'opacity' && t.section === 'recognition'));
        await settled(run.page);
        assert.equal(await target.evaluate(e => getComputedStyle(e).opacity), '1');
        await naturalScroll(run.page);
        assert.equal(await run.page.locator('main [data-reveal]:not(.is-visible)').count(), 0);
        assert.equal(await run.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        return await run.page.evaluate(() => ({ reveals: document.querySelectorAll('main [data-reveal]').length, transitions: window.revealTransitions }));
      });
    } finally { await run.close(); }
  }
  if (!baseline) {
    for (const [name, options] of [
      ['reduced motion', { reducedMotion: 'reduce' }], ['save data', { saveData: true }],
      ['no IntersectionObserver', { noObserver: true }], ['no JavaScript', { javaScriptEnabled: false }],
    ]) {
      await check(`${name}: immediate readable content`, async () => {
        const run = await fixture(routes.adult, 320, options);
        try {
          const state = await run.page.evaluate(() => {
            const elements = document.querySelectorAll('main .section-heading, main .split > *, main .price-card, main .form-card, main .adult-support-list, main .faq-list');
            return { ready: document.documentElement.classList.contains('motion-ready'), hidden: [...elements].filter(e => getComputedStyle(e).opacity !== '1').length, running: document.querySelector('main').getAnimations({ subtree: true }).filter(a => a.playState === 'running').length };
          });
          assert.equal(state.ready, false); assert.equal(state.hidden, 0); assert.equal(state.running, 0);
          await run.page.locator('#name').fill('Local QA');
          assert.equal(await run.page.locator('#name').inputValue(), 'Local QA');
          return state;
        } finally { await run.close(); }
      });
    }
    await check('changing to reduced motion reveals waiting content immediately', async () => {
      const run = await fixture(routes.adult, 375);
      try {
        assert.ok(await run.page.locator('[data-reveal]:not(.is-visible)').count() > 0);
        await run.page.emulateMedia({ reducedMotion: 'reduce' });
        await run.page.waitForFunction(() => !document.documentElement.classList.contains('motion-ok'));
        assert.equal(await run.page.locator('[data-reveal]:not(.is-visible)').count(), 0);
        assert.equal(await run.page.locator('#enquiry .form-card').evaluate(e => getComputedStyle(e).opacity), '1');
      } finally { await run.close(); }
    });
    await check('no external traffic or browser errors', () => { assert.deepEqual(external, []); assert.deepEqual(errors, []); });
  }
} finally { await browser.close(); }
const report = { baseline, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length, checks, audit, errors, external };
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, passed: report.passed, failed: report.failed, audit: baseline ? audit : undefined }));
if (report.failed) process.exitCode = 1;
