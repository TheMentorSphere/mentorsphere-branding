import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUBMISSION_TIMEOUT_MS } from '../docs/assets/js/intake-submission-contract.js';

// Real owner-preview browser smoke tests: public test Turnstile and simulated
// upstream scenarios. Only the explicitly isolated workers.dev hosts are allowed.
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const output = path.resolve('tmp/owner-preview-qa');
const selectedForm = process.argv.find((argument) => argument.startsWith('--form='))?.split('=')[1] || 'secondary';
assert.ok(['secondary', 'adhd', 'all'].includes(selectedForm), 'Use --form=secondary, --form=adhd or --form=all');
await mkdir(output, { recursive: true });
const targets = [
  ['secondary-learner-profile', 'https://mentorsphere-secondary-owner-preview.luke-f8c.workers.dev'],
  ['adhd-coaching-intake', 'https://mentorsphere-adhd-owner-preview.luke-f8c.workers.dev'],
];
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const results = [];
const named = (page, name) => page.locator(`[name="${name}"]`);
const choice = (page, name, value) => page.locator(`[name="${name}"][value=${JSON.stringify(value)}]`).check();
const next = (page) => page.locator('[data-step]:not([hidden]) [data-continue]').click();
const ready = (page) => page.waitForFunction(() => document.querySelector('[data-turnstile-status]').textContent.includes('Security check complete'), { timeout: 30_000 });
async function prepare(form, origin) {
  assert.ok(new URL(origin).hostname.endsWith('.workers.dev'));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const state = { scenario: 'created', ids: [], responses: [], pageErrors: [] };
  page.on('pageerror', error => state.pageErrors.push(error.message));
  await page.route(`${origin}/api/forms/${form}`, async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      state.ids.push(request.postDataJSON().submissionId);
      assert.equal(request.headers()['x-mentorsphere-preview-scenario'], state.scenario);
    }
    await route.continue();
  });
  page.on('response', async response => {
    if (response.url() !== `${origin}/api/forms/${form}` || response.request().method() !== 'POST') return;
    let contract;
    try { contract = await response.json(); } catch { contract = { malformed: true }; }
    state.responses.push({ status: response.status(), scenario: state.scenario, requestId: response.headers()['x-mentorsphere-request-id'] || '', contentType: response.headers()['content-type'], contract });
  });
  const response = await page.goto(`${origin}/forms/${form}/`);
  assert.equal(response.status(), 200);
  assert.match(response.headers()['x-robots-tag'], /noindex.*nofollow.*noarchive/u);
  assert.match(response.headers()['cache-control'], /no-store/u);
  assert.match(response.headers()['content-security-policy'], /frame-src https:\/\/challenges.cloudflare.com/u);
  assert.ok((await page.locator('a[href*="privacy-policy"]').first().getAttribute('href')).startsWith('https://www.thementorsphere.co.uk/'));
  await named(page, 'respondent_email').fill('fictional@example.test');
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Preview');
  await choice(page, 'preferred_contact_methods', 'Email');
  if (form === 'secondary-learner-profile') {
    await choice(page, 'relationship', 'Parent');
    await next(page);
    await named(page, 'learner_first_name').fill('Fictional');
    await named(page, 'learner_surname').fill('Learner');
    await named(page, 'learner_date_of_birth').fill('2012-01-01');
    await named(page, 'learner_year_group').selectOption('Year 9');
    await choice(page, 'learner_subjects', 'Maths');
    await next(page);
    await choice(page, 'special_category_choice', 'No');
    await next(page);
    await choice(page, 'session_length', '45 minutes');
    await choice(page, 'session_frequency', '1 per week');
    await next(page);
  } else {
    await choice(page, 'support_for', 'adult');
    await next(page);
    await named(page, 'adult_special_category_consent').check();
    await choice(page, 'adult_status', 'Prefer not to say');
    await next(page);
    await named(page, 'additional_information').fill('Fictional preference: captions welcome.');
    await next(page);
  }
  await named(page, 'authority_privacy_confirmation').check();
  assert.equal(await page.locator('[data-step="5"]').isVisible(), true);
  await ready(page);
  return { page, state };
}

try {
  for (const [form, origin] of targets.filter(([form]) => selectedForm === 'all' || form.startsWith(selectedForm))) {
    const { page, state } = await prepare(form, origin);
    const submit = page.locator('[data-submit-button]');
    for (const scenario of ['failure', 'malformed', 'stale-duplicate', 'timeout']) {
      state.scenario = scenario;
      await page.locator('#preview-scenario').selectOption(scenario);
      await ready(page);
      const start = Date.now();
      await submit.click();
      await page.waitForFunction(() => !document.querySelector('[data-submit-status]').hidden && document.querySelector('[data-submit-status]').classList.contains('is-error') && !document.querySelector('[data-intake-form]').hasAttribute('aria-busy'), null, { timeout: SUBMISSION_TIMEOUT_MS + 10_000 });
      assert.equal(await named(page, 'respondent_first_name').inputValue(), 'Fictional');
      assert.equal(await submit.isEnabled(), true);
      assert.equal(new Set(state.ids).size, 1);
      results.push({ form, scenario, result: 'passed', elapsedMs: Date.now() - start });
      console.log(`PASS ${form}: real Turnstile and ${scenario}, retained answers, stable UUID`);
    }
    assert.equal(state.ids.length, 4, 'No automatic retry should occur');
    state.scenario = 'duplicate';
    await page.locator('#preview-scenario').selectOption('duplicate');
    await ready(page);
    await submit.click();
    await page.waitForFunction(() => document.querySelector('[data-submit-button]').textContent === 'Already received');
    assert.equal(await submit.isDisabled(), true);
    assert.equal(new Set(state.ids).size, 1);
    assert.deepEqual(state.pageErrors, []);
    await page.screenshot({ path: path.join(output, `${form}-duplicate-mobile.png`), fullPage: true });
    results.push({ form, scenario: 'duplicate', result: 'passed', responses: state.responses });
    console.log(`PASS ${form}: real Turnstile and verified duplicate`);
    await page.close();
    const created = await prepare(form, origin);
    await ready(created.page);
    const createdResponsePromise = created.page.waitForResponse(response => response.url() === `${origin}/api/forms/${form}` && response.request().method() === 'POST');
    await created.page.locator('[data-submit-button]').click();
    const createdResponse = await createdResponsePromise;
    const createdContract = await createdResponse.json();
    await created.page.waitForFunction(() => document.querySelector('[data-submit-button]').textContent === 'Submitted');
    assert.equal(createdResponse.status(), 201);
    assert.equal(createdContract.stored, true);
    assert.equal(createdContract.notificationSent, false);
    assert.deepEqual(created.state.pageErrors, []);
    const privacy = await created.page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, url: location.pathname }));
    assert.deepEqual(privacy, { local: 0, session: 0, cookies: '', url: `/forms/${form}/` });
    await created.page.screenshot({ path: path.join(output, `${form}-created-mobile.png`), fullPage: true });
    results.push({ form, scenario: 'created', result: 'passed', responses: created.state.responses, privacy });
    console.log(`PASS ${form}: real Turnstile and created contract; no browser answer storage`);
    await created.page.close();
  }
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ scope: 'Real workers.dev previews and published test Turnstile; upstream simulation only; no durable storage or emails', results }, null, 2));
  console.log(`Passed ${results.length} deployed-browser scenarios. Evidence: ${output}`);
} finally { await browser.close(); }
