import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Local, fictional browser QA only. All APIs and Turnstile are intercepted.
// No production hostname, Sheet, Apps Script or notification is contacted.
const runtimeRoot = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(runtimeRoot, 'playwright/index.mjs')).href);
const root = process.cwd();
const selectedForm = process.argv.find((argument) => argument.startsWith('--form='))?.split('=')[1] || 'secondary';
assert.ok(['secondary', 'adhd', 'all'].includes(selectedForm), 'Use --form=secondary, --form=adhd or --form=all');
const output = path.join(root, 'tmp/extension-browser-qa');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\//u, '') || 'index.html';
    const target = path.resolve(root, 'docs', relative.endsWith('/') ? `${relative}index.html` : relative);
    if (!target.startsWith(path.resolve(root, 'docs') + path.sep)) throw new Error('Invalid path');
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'chrome' });
const results = [];
const errors = [];
const ok = (name, detail = '') => { results.push({ name, result: 'passed', detail }); console.log(`PASS ${name}`); };
const turnstileScript = `window.turnstile={render:(element,options)=>{window.__challenge=options;queueMicrotask(()=>options.callback('fictional-test-token'));return 'qa-widget';},reset:()=>queueMicrotask(()=>window.__challenge.callback('fresh-fictional-test-token')),isExpired:()=>Boolean(window.__expired)};`;

async function newPage(form) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const state = { outcome: 'created', submissions: [], requests: [], console: [] };
  page.on('pageerror', (error) => errors.push(`${form}: ${error.message}`));
  page.on('console', (message) => state.console.push(message.text()));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    state.requests.push(url.href);
    if (url.hostname === 'challenges.cloudflare.com') return route.fulfill({ contentType: 'application/javascript', body: `${turnstileScript}window[${JSON.stringify(url.searchParams.get('onload'))}]();` });
    if (url.origin !== base) return route.abort();
    if (url.pathname.endsWith('/config')) return route.fulfill({ json: { enabled: true, siteKey: '1x00000000000000000000AA', action: form.replaceAll('-', '_') } });
    if (url.pathname.startsWith('/api/forms/')) {
      state.submissions.push(request.postDataJSON());
      const requestId = 'c8545d55-9dcb-42f7-becf-cc2e45e8ce7b';
      if (state.outcome === 'timeout') return;
      if (state.outcome === 'failure') return route.fulfill({ status: 503, json: { success: false, stored: false, status: 'upstream_failure', requestId } });
      if (state.outcome === 'malformed') return route.fulfill({ contentType: 'application/json', body: '{broken' });
      if (state.outcome === 'stale-duplicate') return route.fulfill({ json: { success: false, stored: false, status: 'duplicate_without_record', requestId } });
      if (state.outcome === 'duplicate') return route.fulfill({ json: { success: true, stored: false, status: 'duplicate', existingRecordVerified: true, requestId } });
      return route.fulfill({ status: 201, json: { success: true, stored: true, status: 'created', notificationSent: false, requestId } });
    }
    return route.continue();
  });
  await page.goto(`${base}/forms/${form}/`);
  await page.waitForFunction(() => Boolean(window.__challenge));
  return { page, state };
}
const named = (page, name) => page.locator(`[name="${name}"]`);
const choice = (page, name, value) => page.locator(`[name="${name}"][value=${JSON.stringify(value)}]`).check();
const next = (page) => page.locator('[data-step]:not([hidden]) [data-continue]').click();
const step = async (page, number) => assert.equal(await page.locator(`[data-step="${number}"]`).isVisible(), true);
async function layout(page, label) {
  for (const width of [1440, 768, 720, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const sizes = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    assert.ok(sizes.actual <= sizes.viewport, `${label}: horizontal overflow at ${width}: ${JSON.stringify(sizes)}`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  const accessible = await page.evaluate(() => ({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, forced: matchMedia('(forced-colors: active)').matches }));
  assert.deepEqual(accessible, { reduced: true, forced: true });
  await page.screenshot({ path: path.join(output, `${label}-320-forced-colours.png`), fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
  const zoomed = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  assert.ok(zoomed.actual <= zoomed.viewport, `${label}: horizontal overflow at 200% CSS zoom`);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  ok(`${label}: 1440/768/720/390/320px reflow, reduced motion and forced colours`);
}
async function commonPrivacy(page, state, label) {
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow,noarchive');
  const data = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, url: location.href, positiveTab: document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length }));
  assert.equal(data.local, 0); assert.equal(data.session, 0); assert.equal(data.cookie, ''); assert.equal(data.positiveTab, 0);
  assert.ok(!data.url.includes('fictional') && !data.url.includes('@'));
  assert.ok(state.console.every((line) => !line.includes('Fictional') && !line.includes('@example.test')));
  ok(`${label}: no answer storage, URL values, console answers or positive tabindex`);
}

async function secondary() {
  const { page, state } = await newPage('secondary-learner-profile');
  await layout(page, 'secondary-about-you');
  await next(page);
  await step(page, 1);
  assert.equal(await page.locator('[data-error-summary]').isVisible(), true);
  assert.equal(await page.locator('[data-progress-button="2"]').isDisabled(), true);
  await named(page, 'respondent_email').fill('fictional@example.test');
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Respondent');
  await choice(page, 'relationship', 'Parent');
  await choice(page, 'preferred_contact_methods', 'Email');
  await choice(page, 'preferred_contact_methods', 'WhatsApp');
  assert.equal(await named(page, 'respondent_mobile').getAttribute('required'), '');
  await next(page); await step(page, 1);
  await page.locator('[name="preferred_contact_methods"][value="WhatsApp"]').uncheck();
  assert.equal(await named(page, 'respondent_mobile').getAttribute('required'), null);
  await next(page); await step(page, 2);
  ok('Secondary: required fields, future-step restriction and mobile requirement');
  await named(page, 'learner_first_name').fill('Fictional');
  await named(page, 'learner_surname').fill('Learner');
  await named(page, 'learner_date_of_birth').fill('2012-01-01');
  await named(page, 'learner_year_group').selectOption('Year 8');
  await choice(page, 'learner_subjects', 'Maths');
  assert.equal(await named(page, 'exam_board_maths').isVisible(), true);
  assert.equal(await named(page, 'exam_board_maths').getAttribute('required'), null);
  assert.match(await page.locator('[data-exam-board-help]').innerText(), /not usually needed for Years 7 to 9/u);
  await named(page, 'exam_board_maths').selectOption('Not applicable');
  await named(page, 'learner_year_group').selectOption('Year 11');
  assert.match(await page.locator('[data-exam-board-help]').innerText(), /selected GCSE subjects/u);
  await named(page, 'exam_board_maths').selectOption('Not known');
  await choice(page, 'learner_subjects', 'Science');
  await named(page, 'exam_board_science').selectOption('Other');
  await named(page, 'exam_board_science_custom').fill('Fictional removed board');
  await page.locator('[name="learner_subjects"][value="Science"]').uncheck();
  assert.equal(await named(page, 'exam_board_science').inputValue(), '');
  assert.equal(await named(page, 'exam_board_science_custom').inputValue(), '');
  assert.equal(await named(page, 'exam_board_science').isVisible(), false);
  await named(page, 'learner_year_group').selectOption('Other / not currently following a standard school year');
  assert.equal(await named(page, 'year_group_other').isVisible(), true);
  await named(page, 'year_group_other').fill('Fictional flexible learning');
  await next(page); await step(page, 3);
  ok('Secondary: Years 7-9/10-11/Other, optional boards and deselection clearing');
  assert.equal(await named(page, 'support_needs').isVisible(), false);
  await choice(page, 'special_category_choice', 'Yes');
  await named(page, 'special_category_consent').check();
  await named(page, 'learner_consent_route').first().check();
  assert.equal(await named(page, 'support_needs').isVisible(), false);
  await named(page, 'special_category_authority').check();
  assert.equal(await named(page, 'support_needs').isVisible(), true);
  await choice(page, 'needs_status', 'Yes: diagnosed');
  await choice(page, 'relevant_areas', 'ADHD');
  await named(page, 'support_needs').fill('Fictional relevant support only');
  await choice(page, 'ehcp_status', 'Not sure');
  await named(page, 'special_category_authority').uncheck();
  assert.equal(await named(page, 'support_needs').inputValue(), '');
  assert.equal(await named(page, 'support_needs').isVisible(), false);
  assert.equal(await named(page, 'relevant_areas').locator('xpath=self::*[@checked]').count(), 0);
  await choice(page, 'special_category_choice', 'No');
  await next(page); await step(page, 4);
  await choice(page, 'session_length', '45 minutes');
  await choice(page, 'session_frequency', '1 per week');
  await choice(page, 'wider_support', "Yes, I'd like to discuss this");
  await next(page); await step(page, 5);
  await named(page, 'authority_privacy_confirmation').check();
  await layout(page, 'secondary-review');
  ok('Secondary: sensitive data remains hidden before authority and clears on withdrawal');
  await page.locator('[data-progress-button="1"]').click();
  await choice(page, 'relationship', 'Education or support professional');
  assert.equal(await page.locator('[data-progress-button="5"]').isDisabled(), true);
  await next(page); await next(page); await step(page, 3);
  assert.equal(await page.locator('[name="special_category_choice"][value="Yes"]').isDisabled(), true);
  await next(page); await next(page); await step(page, 5);
  ok('Secondary: professional relationship restriction and completed-step edit revalidation');
  const submit = page.locator('[data-submit-button]');
  await page.evaluate(() => { window.__expired = true; });
  await submit.click();
  assert.equal(state.submissions.length, 0);
  assert.match(await page.locator('[data-submit-status]').innerText(), /security check has expired/u);
  await page.evaluate(() => { window.__expired = false; });
  ok('Secondary: widget isExpired blocks forwarding and requests a fresh token');
  for (const outcome of ['failure', 'malformed', 'stale-duplicate']) {
    state.outcome = outcome;
    await submit.click();
    await page.waitForFunction(() => !document.querySelector('[data-submit-status]').hidden && document.querySelector('[data-submit-status]').classList.contains('is-error') && !document.querySelector('[data-intake-form]').hasAttribute('aria-busy'));
    assert.equal(await named(page, 'respondent_first_name').inputValue(), 'Fictional');
    assert.equal(await submit.isEnabled(), true);
    assert.equal(new Set(state.submissions.map((item) => item.submissionId)).size, 1);
    ok(`Secondary: ${outcome} retains answers, fresh token and stable submission ID`);
  }
  await page.clock.install();
  state.outcome = 'timeout';
  await submit.click();
  await page.clock.fastForward(31_000);
  await page.waitForFunction(() => !document.querySelector('[data-submit-status]').hidden && document.querySelector('[data-submit-status]').classList.contains('is-error') && !document.querySelector('[data-intake-form]').hasAttribute('aria-busy'));
  assert.equal(await submit.isEnabled(), true);
  assert.equal(state.submissions.length, 4);
  ok('Secondary: 30-second timeout has no automatic retry');
  state.outcome = 'duplicate';
  await submit.click();
  await page.waitForFunction(() => document.querySelector('[data-submit-button]').textContent === 'Already received');
  assert.equal(await submit.isDisabled(), true);
  assert.equal(new Set(state.submissions.map((item) => item.submissionId)).size, 1);
  await commonPrivacy(page, state, 'Secondary');
  ok('Secondary: verified duplicate completes separately from created');
  await page.screenshot({ path: path.join(output, 'secondary-complete.png'), fullPage: true });
  await page.close();
}

async function adhd(branch, consent = true) {
  const { page, state } = await newPage('adhd-coaching-intake');
  const label = `ADHD ${branch}${consent ? '' : ' without consent'}`;
  await named(page, 'respondent_email').fill('fictional@example.test');
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Respondent');
  await choice(page, 'preferred_contact_methods', 'Email');
  await choice(page, 'support_for', branch);
  await named(page, 'preferred_contact_methods').first().focus();
  await page.keyboard.press('Space');
  assert.equal(await named(page, 'preferred_contact_methods').first().isChecked(), false);
  await page.keyboard.press('Space');
  await next(page);
  await step(page, branch === 'parent' ? 3 : 2);
  assert.equal(await page.locator('[aria-current="step"]').count(), 1);
  if (branch === 'adult') {
    assert.equal(await named(page, 'adult_status').first().isVisible(), false);
    if (consent) {
      await named(page, 'adult_special_category_consent').check();
      await choice(page, 'adult_status', 'Other');
      await named(page, 'adult_status_other').fill('Fictional removed answer');
      await choice(page, 'adult_status', 'Prefer not to say');
      assert.equal(await named(page, 'adult_status_other').inputValue(), '');
      await choice(page, 'adult_difficulties', 'Starting tasks');
      await choice(page, 'adult_priority', 'Practical strategies');
      await named(page, 'adult_special_category_consent').uncheck();
      assert.equal(await page.locator('[name="adult_status"]:checked').count(), 0);
      await named(page, 'adult_special_category_consent').check();
      await choice(page, 'adult_status', 'Prefer not to say');
      await choice(page, 'adult_difficulties', 'Starting tasks');
      await choice(page, 'adult_priority', 'Practical strategies');
    }
    await next(page); await step(page, 4);
  } else if (branch === 'child' || branch === 'combined') {
    await next(page); await step(page, 2);
    await named(page, 'child_name').fill('Fictional Child');
    await choice(page, 'child_stage', 'Years 7 to 9 / KS3');
    assert.equal(await named(page, 'child_neurodivergence').first().isVisible(), false);
    if (consent) {
      await named(page, 'child_special_category_consent').check();
      await next(page); await step(page, 2);
      await page.locator('[data-clear-child-consent]').click();
      assert.equal(await named(page, 'child_special_category_consent').isChecked(), false);
      assert.equal(await named(page, 'child_special_category_authority').isChecked(), false);
      assert.equal(await page.locator('[name="learner_consent_route"]:checked').count(), 0);
      await named(page, 'child_special_category_consent').check();
      await named(page, 'child_special_category_authority').check();
      assert.equal(await named(page, 'child_neurodivergence').first().isVisible(), false);
      await named(page, 'learner_consent_route').first().check();
      await choice(page, 'child_neurodivergence', 'Other');
      await named(page, 'child_neurodivergence_other').fill('Fictional removed answer');
      await page.locator('[name="child_neurodivergence"][value="Other"]').uncheck();
      assert.equal(await named(page, 'child_neurodivergence_other').inputValue(), '');
      await choice(page, 'child_neurodivergence', 'Not sure');
      await choice(page, 'child_difficulties', 'Organisation');
      await named(page, 'child_special_category_consent').uncheck();
      assert.equal(await page.locator('[name="child_neurodivergence"]:checked').count(), 0);
      await named(page, 'child_special_category_consent').check();
      await choice(page, 'child_neurodivergence', 'Not sure');
      await choice(page, 'child_difficulties', 'Organisation');
    }
    await next(page); await step(page, branch === 'combined' ? 3 : 4);
  }
  if (branch === 'parent' || branch === 'combined') {
    assert.equal(await named(page, 'parent_household').first().isVisible(), false);
    if (consent) {
      await named(page, 'adult_special_category_consent').check();
      await choice(page, 'parent_household', 'Supporting more than one child');
      await choice(page, 'parent_impact', 'Manageable: looking for adjustments');
      await choice(page, 'parent_help', 'Understanding ADHD');
    }
    await next(page); await step(page, 4);
  }
  assert.equal(await named(page, 'additional_information').isVisible(), consent);
  if (consent) await named(page, 'additional_information').fill('Fictional preference: captions welcome; brief answers preferred.');
  await next(page); await step(page, 5);
  await named(page, 'authority_privacy_confirmation').check();
  await layout(page, `adhd-${branch}${consent ? '' : '-no-consent'}-review`);
  await page.locator('[data-progress-button="1"]').click();
  await named(page, 'respondent_first_name').fill('');
  assert.equal(await page.locator('[data-progress-button="5"]').isDisabled(), true);
  await next(page); await step(page, 1);
  await named(page, 'respondent_first_name').fill('Fictional');
  await next(page);
  for (let attempt = 0; attempt < 5 && await page.locator('[data-step="5"]').isHidden(); attempt += 1) await next(page);
  assert.equal(await page.locator('[data-step="5"]').isVisible(), true, `${label}: progress failed: ${await page.locator('[data-error-summary]').innerText()}`);
  ok(`${label}: branch route, consent visibility/clearing, Other clearing and progress revalidation`);
  if (branch === 'adult' && consent) {
    const submit = page.locator('[data-submit-button]');
    for (const outcome of ['failure', 'malformed', 'stale-duplicate']) {
      state.outcome = outcome;
      await submit.click();
      await page.waitForFunction(() => !document.querySelector('[data-submit-status]').hidden && document.querySelector('[data-submit-status]').classList.contains('is-error') && !document.querySelector('[data-intake-form]').hasAttribute('aria-busy'));
      assert.equal(await named(page, 'additional_information').inputValue(), 'Fictional preference: captions welcome; brief answers preferred.');
      assert.equal(await submit.isEnabled(), true);
    }
    await page.clock.install();
    state.outcome = 'timeout';
    await submit.click();
    await page.clock.fastForward(31_000);
    await page.waitForFunction(() => !document.querySelector('[data-submit-status]').hidden && document.querySelector('[data-submit-status]').classList.contains('is-error') && !document.querySelector('[data-intake-form]').hasAttribute('aria-busy'));
    assert.equal(state.submissions.length, 4);
    assert.equal(new Set(state.submissions.map((item) => item.submissionId)).size, 1);
    ok('ADHD: retryable/malformed/stale duplicate/timeout failures preserve answers and submission ID; no automatic retry');
  }
  state.outcome = branch === 'combined' ? 'duplicate' : 'created';
  await page.locator('[data-submit-button]').click();
  await page.waitForFunction(() => ['Submitted', 'Already received'].includes(document.querySelector('[data-submit-button]').textContent));
  assert.equal(await page.locator('[data-submit-button]').isDisabled(), true);
  const payload = state.submissions.at(-1);
  assert.equal(payload.supportFor, branch);
  assert.equal(payload.confirmations.adultSpecialCategoryConsent, consent && branch !== 'child');
  assert.equal(payload.confirmations.childSpecialCategoryConsent, consent && ['child', 'combined'].includes(branch));
  if (branch !== 'adult') assert.equal(payload.adult.adhdStatus, '');
  if (!['child', 'combined'].includes(branch)) assert.equal(payload.child.name, '');
  await commonPrivacy(page, state, label);
  ok(`${label}: ${state.outcome}, correct branch payload and separate consent flags`);
  await page.close();
}

async function adhdBranchChanges() {
  const { page } = await newPage('adhd-coaching-intake');
  await named(page, 'respondent_email').fill('fictional@example.test');
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Respondent');
  await choice(page, 'preferred_contact_methods', 'Email');
  await choice(page, 'support_for', 'combined');
  await next(page);
  await named(page, 'child_name').fill('Fictional Child');
  await choice(page, 'child_stage', 'Years 7 to 9 / KS3');
  await named(page, 'child_special_category_consent').check();
  await named(page, 'child_special_category_authority').check();
  await named(page, 'learner_consent_route').first().check();
  await choice(page, 'child_neurodivergence', 'ADHD');
  await next(page);
  await named(page, 'adult_special_category_consent').check();
  await choice(page, 'parent_help', 'Understanding ADHD');
  await next(page);
  await named(page, 'additional_information').fill('Fictional removed context');
  await page.locator('[data-progress-button="2"]').click();
  await named(page, 'parent_support_wanted').selectOption('No');
  assert.equal(await page.locator('[name="support_for"][value="child"]').isChecked(), true);
  assert.equal(await page.locator('[name="parent_help"]:checked').count(), 0);
  assert.equal(await named(page, 'additional_information').inputValue(), '');
  assert.equal(await named(page, 'adult_special_category_consent').isChecked(), false);
  await page.locator('[data-progress-button="1"]').click();
  await choice(page, 'support_for', 'adult');
  assert.equal(await named(page, 'child_name').inputValue(), '');
  assert.equal(await page.locator('[name="child_neurodivergence"]:checked').count(), 0);
  assert.equal(await named(page, 'child_special_category_consent').isChecked(), false);
  ok('ADHD: combined to child to adult clears irrelevant parent/child/additional values and consent');
  await page.close();
}

try {
  if (selectedForm !== 'adhd') await secondary();
  if (selectedForm !== 'secondary') {
    for (const branch of ['adult', 'child', 'parent', 'combined']) await adhd(branch);
    await adhd('adult', false);
    await adhdBranchChanges();
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ scope: 'Local browser interactions; mock transport only; fictional information only', results, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results, output }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
