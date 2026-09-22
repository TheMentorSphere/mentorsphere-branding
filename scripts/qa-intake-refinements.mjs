import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Fictional owner-review regression checks, locally or on the two isolated previews.
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const deployed = process.argv.includes('--deployed');
const selected = process.argv.find(arg => arg.startsWith('--form='))?.split('=')[1] || 'secondary';
const output = path.resolve('tmp/intake-refinements', deployed ? 'deployed' : 'local');
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const relative = new URL(request.url, 'http://localhost').pathname;
    const target = path.resolve('docs', '.' + relative + (relative.endsWith('/') ? 'index.html' : ''));
    assert.ok(target.startsWith(path.resolve('docs') + path.sep));
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(target)] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const local = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'chrome', headless: true });
const results = [], errors = [];
const pass = name => { results.push(name); console.log('PASS ' + name); };
const named = (page, name) => page.locator(`[name="${name}"]`);
const choice = (page, name, value) => page.locator(`[name="${name}"][value=${JSON.stringify(value)}]`).check();
const next = page => page.locator('[data-step]:not([hidden]) [data-continue]').click();
async function open(form) {
  const origin = deployed ? `https://mentorsphere-${form}-owner-preview.luke-f8c.workers.dev` : local;
  const slug = form === 'secondary' ? 'secondary-learner-profile' : 'adhd-coaching-intake';
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  const payloads = [];
  if (!deployed) await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'challenges.cloudflare.com') return route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={render:(el,opts)=>{queueMicrotask(()=>opts.callback('fictional-token'));return 'widget';},isExpired:()=>false};window[${JSON.stringify(url.searchParams.get('onload'))}]();` });
    if (url.origin !== local) return route.abort();
    if (url.pathname.endsWith('/config')) return route.fulfill({ json: { enabled: true, siteKey: 'test', action: slug.replaceAll('-', '_') } });
    if (url.pathname.startsWith('/api/')) {
      payloads.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: { success: true, stored: true, status: 'created', notificationSent: false } });
    }
    return route.continue();
  });
  await page.goto(`${origin}/forms/${slug}/`);
  await page.waitForFunction(() => document.querySelector('[data-turnstile-status]').textContent.includes('Security check complete'));
  await named(page, 'respondent_email').fill('fictional@example.test');
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Review');
  await choice(page, 'preferred_contact_methods', 'Email');
  return { page, payloads };
}
async function layout(page, label, selects = false) {
  for (const [width, zoom] of [[1440, 1], [320, 1], [1440, 2]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom); }, zoom);
    const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
    assert.ok(sizes.scroll <= sizes.width, `${label}: overflow at ${width}, zoom ${zoom}`);
    if (selects) {
      for (const control of await page.locator('select[name^="exam_board_"]').all()) {
        const dimensions = await control.evaluate(el => ({ width: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width }));
        assert.ok(Math.abs(dimensions.width - dimensions.parent) < 2, 'Board select fills its field');
      }
    }
    await page.locator('[data-step]:not([hidden]) h2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `${label}-${width}-${zoom}x.png`), fullPage: true });
    if (label.includes('consent-help') || label.includes('additional-field')) {
      await page.locator('[data-step]:not([hidden])').screenshot({ path: path.join(output, `${label}-step-${width}-${zoom}x.png`) });
    }
  }
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  pass(`${label}: desktop, 320px, 200% CSS zoom, no overflow${selects ? ', full-width selects' : ''}`);
}
async function secondary() {
  const { page, payloads } = await open('secondary');
  await choice(page, 'relationship', 'Parent');
  await next(page);
  await named(page, 'learner_first_name').fill('Fictional');
  await named(page, 'learner_surname').fill('Learner');
  await named(page, 'learner_date_of_birth').fill('2012-01-01');
  await named(page, 'learner_year_group').selectOption('Year 10');
  assert.equal(await page.locator('datalist, input[list]').count(), 0);
  for (const subject of ['English', 'Maths', 'Science', 'Other']) {
    const key = subject.toLowerCase();
    await choice(page, 'learner_subjects', subject);
    if (subject === 'Other') await named(page, 'subject_other').fill('Fictional subject');
    const board = named(page, `exam_board_${key}`), custom = named(page, `exam_board_${key}_custom`);
    assert.equal(await board.evaluate(el => el.tagName), 'SELECT');
    assert.equal(await board.getAttribute('required'), null);
    for (const value of ['AQA', 'Pearson Edexcel', 'OCR', 'WJEC / Eduqas', 'CCEA', 'Not known', 'Not applicable']) {
      await board.click();
      await page.keyboard.press('Escape');
      await board.selectOption(value);
      assert.equal(await board.inputValue(), value);
    }
    await board.selectOption('Other');
    assert.equal(await custom.isVisible(), true);
    await custom.fill('Fictional custom board');
    await board.selectOption('AQA');
    assert.equal(await custom.isVisible(), false);
    assert.equal(await custom.inputValue(), '');
    await board.selectOption('Other');
    await custom.fill('Fictional removed board');
    await page.locator(`[name="learner_subjects"][value="${subject}"]`).uncheck();
    assert.equal(await board.inputValue(), '');
    assert.equal(await custom.inputValue(), '');
    assert.equal(await board.isVisible(), false);
    await choice(page, 'learner_subjects', subject);
    if (subject === 'Other') await named(page, 'subject_other').fill('Fictional subject');
    await board.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    assert.equal(await board.inputValue(), 'AQA');
    pass(`${subject}: native select, reopen/change, Other reveal/clear, subject removal, keyboard selection`);
  }
  await named(page, 'exam_board_english').selectOption('Other');
  await named(page, 'exam_board_english_custom').fill('Fictional custom board');
  await named(page, 'exam_board_maths').selectOption('Not known');
  await named(page, 'exam_board_science').selectOption('Not applicable');
  await named(page, 'exam_board_other').selectOption('Other');
  await named(page, 'exam_board_other_custom').fill('Fictional old subject board');
  await named(page, 'subject_other').fill('Fictional changed subject');
  assert.equal(await named(page, 'exam_board_other').inputValue(), '');
  assert.equal(await named(page, 'exam_board_other_custom').inputValue(), '');
  await named(page, 'exam_board_other').selectOption('Other');
  await layout(page, 'secondary-exam-boards', true);
  const board = named(page, 'exam_board_english');
  await board.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await board.evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle !== 'none'), true);
  await next(page); await choice(page, 'special_category_choice', 'No'); await next(page);
  await choice(page, 'session_length', '45 minutes'); await choice(page, 'session_frequency', '1 per week'); await next(page);
  assert.match(await page.locator('[data-review-sections]').innerText(), /Fictional custom board/);
  if (!deployed) {
    await named(page, 'authority_privacy_confirmation').check();
    await page.locator('[data-submit-button]').click();
    assert.equal(payloads.length, 1);
    assert.deepEqual(payloads[0].learner.examBoards, { English: 'Fictional custom board', Maths: 'Not known', Science: 'Not applicable', Other: 'Other' });
    pass('Secondary: final payload contains exactly the existing four exam-board strings');
  }
  await page.close();
}

const consentText = {
  adult: 'To add optional information here, go back to the Coaching context step and give consent for us to use the health, disability or neurodiversity information you choose to provide. You can also leave this section blank and continue.',
  child: 'To add optional information here, go back to the Coaching context step and complete the optional child information consent and authority section. You can also leave this section blank and continue.',
  parent: 'To add optional information here, go back to the Parent/carer context step and give consent for us to use the relevant information you choose to provide about yourself. You can also leave this section blank and continue.',
  combined: 'To add optional information here, the relevant consent sections for both you and the child or young person need to be completed. Go back to review the consent sections, or leave this section blank and continue.',
};
async function childDetails(page, age = '12') {
  await named(page, 'child_age').fill(age);
  await named(page, 'child_name').fill('Fictional Child');
  await choice(page, 'child_stage', 'Years 7 to 9 / KS3');
}
async function childConsent(page) {
  await named(page, 'child_special_category_consent').check();
  await named(page, 'child_special_category_authority').check();
  await named(page, 'learner_consent_route').first().check();
}
async function forwardToAdditional(page) {
  while (!await page.locator('[data-step="4"]').isVisible()) await next(page);
}
async function adhd() {
  for (const route of ['adult', 'child', 'parent', 'combined']) {
    const { page } = await open('adhd');
    await choice(page, 'support_for', route);
    await next(page);
    const child = route === 'child' || route === 'combined';
    if (child) await childDetails(page);
    await forwardToAdditional(page);
    const help = page.locator('[data-additional-consent-help]');
    const text = named(page, 'additional_information');
    assert.equal(await text.count(), 1);
    assert.equal(await text.isVisible(), false);
    assert.equal(await help.isVisible(), true);
    assert.equal(await page.locator('[data-consent-help-text]').innerText(), consentText[route]);
    await layout(page, `adhd-${route}-consent-help`);
    const button = page.locator('[data-review-consent]');
    const labels = { adult: 'Go back to coaching consent', child: 'Go back to child consent', parent: 'Go back to parent/carer consent', combined: 'Review consent sections' };
    assert.equal(await button.innerText(), labels[route]);
    await button.focus(); await page.keyboard.press('Enter');
    const firstStep = route === 'parent' ? 3 : 2;
    assert.equal(await page.locator(`[data-step="${firstStep}"]`).isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), child ? 'child-consent-heading' : 'adult-consent-heading');
    assert.equal(await page.locator(`[data-progress-button="${firstStep}"]`).getAttribute('aria-current'), 'step');
    assert.equal(await named(page, 'respondent_email').inputValue(), 'fictional@example.test');
    if (child) {
      // A partial child consent must still fail ordinary Continue validation.
      await named(page, 'child_special_category_consent').check();
      await next(page);
      assert.equal(await page.locator('[data-step="2"]').isVisible(), true);
      assert.equal(await page.locator('[data-error-summary]').isVisible(), true);
      await childConsent(page);
    } else await named(page, 'adult_special_category_consent').check();
    if (route === 'combined') {
      await forwardToAdditional(page);
      assert.equal(await help.isVisible(), true);
      await button.click();
      assert.equal(await page.locator('[data-step="3"]').isVisible(), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'adult-consent-heading');
      await named(page, 'adult_special_category_consent').check();
    }
    // Hidden state updates immediately at consent time, before navigating forward.
    assert.equal(await help.getAttribute('hidden'), '');
    assert.equal(await page.locator('[data-sensitive="additional"]').getAttribute('hidden'), null);
    await forwardToAdditional(page);
    assert.equal(await help.isVisible(), false);
    assert.equal(await text.isVisible(), true);
    await text.fill('Fictional preference: captions please.');
    await layout(page, `adhd-${route}-additional-field`);
    await page.locator(`[data-progress-button="${route === 'parent' || route === 'combined' ? 3 : 2}"]`).click();
    if (route === 'child') {
      await named(page, 'child_special_category_authority').uncheck();
      assert.equal(await text.inputValue(), '');
      assert.equal(await page.locator('[data-sensitive="additional"]').getAttribute('hidden'), '');
      await page.locator('[data-clear-child-consent]').click();
    } else await named(page, 'adult_special_category_consent').uncheck();
    assert.equal(await text.inputValue(), '');
    assert.equal(await page.locator('[data-progress-button="5"]').isDisabled(), true);
    await forwardToAdditional(page);
    assert.equal(await help.isVisible(), true);
    assert.equal(await text.isVisible(), false);
    await next(page);
    assert.equal(await page.locator('[data-step="5"]').isVisible(), true, 'Optional Additional information does not block review');
    pass(`ADHD ${route}: exact help, keyboard navigation/focus/progress, consent reveal, withdrawal clearing, forward state, one optional shared textarea`);
    await page.close();
  }
  for (const route of ['child', 'combined']) {
    const { page } = await open('adhd');
    await choice(page, 'support_for', route); await next(page);
    await childDetails(page, '9');
    await next(page);
    assert.equal(await page.locator('[data-step="2"]').isVisible(), true);
    assert.equal(await page.locator('[data-age-under10]').isVisible(), true);
    await layout(page, `adhd-${route}-age-boundary`);
    for (const age of ['10', '17']) {
      await named(page, 'child_age').fill(age);
      assert.equal(await page.locator('[data-age-under10]').isVisible(), false);
      await next(page);
      assert.equal(await page.locator(`[data-step="${route === 'combined' ? 3 : 4}"]`).isVisible(), true);
      await page.locator('[data-step]:not([hidden]) [data-back]').click();
      assert.equal(await named(page, 'child_special_category_consent').isChecked(), false, 'Age does not confer consent');
    }
    await childConsent(page);
    await choice(page, 'child_neurodivergence', 'ADHD');
    await named(page, 'child_age').fill('9');
    await page.locator('[data-age-switch="parent"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-step="1"]').isVisible(), true);
    assert.equal(await named(page, 'respondent_first_name').inputValue(), 'Fictional');
    assert.equal(await named(page, 'respondent_email').inputValue(), 'fictional@example.test');
    for (const field of ['child_name', 'child_age']) assert.equal(await named(page, field).inputValue(), '');
    assert.equal(await named(page, 'child_special_category_consent').isChecked(), false);
    assert.equal(await page.locator('[name="child_neurodivergence"]:checked').count(), 0);
    await next(page);
    assert.equal(await page.locator('[data-step="3"]').isVisible(), true);
    await next(page); await next(page);
    assert.equal(await page.locator('[data-step="5"]').isVisible(), true, 'Parent support has no child age restriction');
    await page.locator('[data-progress-button="1"]').click();
    await choice(page, 'support_for', route); await next(page); await childDetails(page, '18');
    await next(page);
    assert.equal(await page.locator('[data-step="2"]').isVisible(), true);
    assert.equal(await page.locator('[data-age-adult]').isVisible(), true);
    await page.locator('[data-age-switch="adult"]').click();
    assert.equal(await named(page, 'child_age').inputValue(), '');
    assert.equal(await named(page, 'respondent_email').inputValue(), 'fictional@example.test');
    await next(page);
    assert.equal(await page.locator('[data-step="2"]').isVisible(), true);
    assert.equal(await page.locator('[data-adult-consent]').isVisible(), true);
    assert.equal(await named(page, 'adult_special_category_consent').isChecked(), false);
    pass(`ADHD ${route}: 9/10/17/18 boundaries, parent/adult route switches preserve contact and clear child answers, no age-based consent`);
    await page.close();
  }
}
try {
  if (selected === 'secondary' || selected === 'all') await secondary();
  if (selected === 'adhd' || selected === 'all') await adhd();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ selected, deployed, results }, null, 2));
  console.log(`${results.length} refinement scenario groups passed.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
