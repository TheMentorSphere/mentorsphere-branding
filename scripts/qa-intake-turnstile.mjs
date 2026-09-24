import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Local static files only. Every form POST is intercepted; this server has no backend.
// --real permits only Cloudflare challenge traffic, using its public always-pass key.
const real = process.argv.includes('--real');
const modules = process.env.QA_NODE_MODULES || 'C:/Users/luke9/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = await import(pathToFileURL(path.join(modules, 'playwright/index.mjs')).href);
const output = path.resolve('tmp/turnstile-qa', real ? 'real' : 'deterministic');
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    assert.equal(request.method, 'GET');
    const relative = new URL(request.url, 'http://localhost').pathname;
    assert.ok(!relative.startsWith('/api/'));
    const target = path.resolve('docs', '.' + relative + (relative.endsWith('/') ? 'index.html' : ''));
    assert.ok(target.startsWith(path.resolve('docs') + path.sep));
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(target)] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'chrome', headless: true });
const results = [], errors = [];
const pass = label => { results.push(label); console.log('PASS ' + label); };
const named = (page, name) => page.locator(`[name="${name}"]`);
const choice = (page, name, value) => page.locator(`[name="${name}"][value=${JSON.stringify(value)}]`).check();
const next = page => page.locator('[data-step]:not([hidden]) [data-continue]').click();
const ready = page => page.waitForFunction(() => !document.querySelector('[data-submit-button]').disabled, null, { timeout: 45_000 });
const snapshot = page => page.locator('form[data-intake-form]').evaluate(form => [...new FormData(form).entries()]);
const submitEvent = page => page.locator('form[data-intake-form]').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
async function open(slug, enabled = true, outcome = 'created') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  if (!real) await page.clock.install();
  const state = { payloads: [], outcome, hold: false, release: null };
  page.on('pageerror', error => errors.push(`${slug}: ${error.message}`));
  if (real) page.on('requestfailed', request => console.log('Network diagnostic:', new URL(request.url()).hostname, request.failure()?.errorText));
  await page.addInitScript(() => {
    const qa = window.__securityQA = { renders: 0, executes: 0, resets: 0, callbacks: [], auto: true, expired: false, offset: 0 };
    const now = Date.now.bind(Date);
    Date.now = () => now() + qa.offset;
    let loaded;
    Object.defineProperty(window, 'mentorSphereIntakeTurnstileReady', {
      set(value) { loaded = value; },
      get() { return () => {
        for (const [name, counter] of [['render', 'renders'], ['execute', 'executes'], ['reset', 'resets']]) {
          const original = window.turnstile[name].bind(window.turnstile);
          window.turnstile[name] = (...args) => {
            qa[counter]++;
            if (name === 'render') qa.callbacks.push(args[1]);
            return original(...args);
          };
        }
        loaded();
      }; },
    });
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'challenges.cloudflare.com') {
      if (real) return route.continue();
      return route.fulfill({ contentType: 'application/javascript', body: `
        const widgets = new Map(); let index = 0;
        window.turnstile = {
          render: (el, opts) => { const id = ++index; widgets.set(id, opts); return id; },
          execute: id => { if (window.__securityQA.auto) queueMicrotask(() => widgets.get(id)?.callback('fictional-' + id + '-' + window.__securityQA.executes)); },
          reset: () => { window.__securityQA.expired = false; },
          remove: id => widgets.delete(id), isExpired: () => window.__securityQA.expired,
        }; window.mentorSphereIntakeTurnstileReady();` });
    }
    if (url.origin !== origin) return route.abort();
    if (url.pathname.endsWith('/config')) return route.fulfill({ json: { enabled, siteKey: '1x00000000000000000000AA', action: slug.replaceAll('-', '_') } });
    if (url.pathname.startsWith('/api/')) {
      assert.equal(route.request().method(), 'POST');
      state.payloads.push(route.request().postDataJSON());
      if (state.hold) await new Promise(resolve => { state.release = resolve; });
      const json = state.outcome === 'failure' ? { success: false }
        : state.outcome === 'duplicate' ? { success: true, stored: false, status: 'duplicate', existingRecordVerified: true }
        : { success: true, stored: true, status: 'created', notificationSent: false };
      return route.fulfill({ status: state.outcome === 'failure' ? 503 : 200, json });
    }
    return route.continue();
  });
  await page.goto(`${origin}/forms/${slug}/`);
  await page.waitForFunction(() => /will run|not accepting/.test(document.querySelector('[data-turnstile-status]').textContent));
  return { page, state };
}

async function complete(page, slug) {
  await named(page, 'respondent_first_name').fill('Fictional');
  await named(page, 'respondent_surname').fill('Lifecycle');
  await named(page, 'respondent_email').fill('fictional@example.test');
  await choice(page, 'preferred_contact_methods', 'Email');
  if (slug.startsWith('adhd')) {
    await choice(page, 'support_for', 'combined'); await next(page);
    await named(page, 'child_age').fill('12');
    await named(page, 'child_name').fill('Fictional Child');
    await choice(page, 'child_stage', 'Years 7 to 9 / KS3');
    await next(page); await next(page);
    // Reproduce the launch route through Additional information and consent help.
    await page.locator('[data-review-consent]').click();
    await named(page, 'child_special_category_consent').check();
    await named(page, 'child_special_category_authority').check();
    await named(page, 'learner_consent_route').first().check();
    await choice(page, 'child_neurodivergence', 'ADHD');
    await next(page);
    await named(page, 'adult_special_category_consent').check();
    await next(page);
    await named(page, 'additional_information').fill('Fictional sensitive answer retained through security refresh.');
  } else {
    await choice(page, 'relationship', 'Parent'); await next(page);
    await named(page, 'learner_first_name').fill('Fictional');
    await named(page, 'learner_surname').fill('Learner');
    await named(page, 'learner_date_of_birth').fill(slug.startsWith('primary') ? '2017-01-01' : '2012-01-01');
    await named(page, 'learner_year_group').selectOption(slug.startsWith('primary') ? 'Year 5' : 'Year 9');
    await choice(page, 'learner_subjects', 'Maths'); await next(page);
    await choice(page, 'special_category_choice', 'Yes');
    await named(page, 'special_category_consent').check();
    if (slug.startsWith('secondary')) await named(page, 'special_category_authority').check();
    await named(page, 'learner_consent_route').first().check();
    await named(page, 'support_needs').fill('Fictional sensitive answer retained through security refresh.');
    await next(page);
    await choice(page, 'session_length', '45 minutes');
    await named(page, 'session_frequency').first().check();
  }
  // Advance the client clock on an early step beyond the old four-minute guard.
  await page.evaluate(() => { window.__securityQA.offset += 5 * 60_000; });
  assert.equal(await page.evaluate(() => window.__securityQA.renders), 0);
  assert.equal(await page.evaluate(() => window.__securityQA.executes), 0);
  await next(page);
  await named(page, 'authority_privacy_confirmation').check();
}

try {
  for (const slug of ['primary-learner-profile', 'secondary-learner-profile', 'adhd-coaching-intake']) {
    const { page, state } = await open(slug);
    await complete(page, slug); await ready(page);
    pass(`${slug}: SDK loads early, no early widget/token, delayed Review executes and becomes ready`);
    let answers = await snapshot(page);
    const submit = page.locator('[data-submit-button]');
    assert.equal(await page.evaluate(() => matchMedia('(hover: none)').matches && matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    assert.equal(await page.locator('[data-turnstile-status]').getAttribute('role'), 'status');
    await named(page, 'authority_privacy_confirmation').focus();
    const focused = await page.evaluate(() => document.activeElement.id);
    const beforeRefresh = await page.evaluate(() => window.__securityQA.executes);
    if (real) await page.evaluate(() => window.__securityQA.callbacks.at(-1)['expired-callback']());
    else await page.clock.runFor(4 * 60_000);
    await ready(page);
    assert.equal(await page.evaluate(() => window.__securityQA.executes), beforeRefresh + 1);
    assert.deepEqual(await snapshot(page), answers);
    assert.equal(state.payloads.length, 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), focused);
    pass(`${slug}: Review expiry refresh preserves all answers and focus, with no POST`);

    await page.locator('[data-step="5"] [data-back]').click();
    await page.evaluate(() => { window.__securityQA.offset += 5 * 60_000; });
    if (slug.startsWith('adhd')) await named(page, 'additional_information').fill('Fictional revised sensitive answer.');
    else await choice(page, 'session_length', '30 minutes');
    const beforeReturn = await page.evaluate(() => window.__securityQA.executes);
    await next(page); await ready(page);
    assert.equal(await page.evaluate(() => window.__securityQA.executes), beforeReturn + 1);
    answers = await snapshot(page);
    pass(`${slug}: leave, wait, edit and return obtains a new verification`);

    if (!real) {
      for (const event of ['expired-callback', 'timeout-callback', 'error-callback']) {
        await page.evaluate(event => { window.__securityQA.auto = false; window.__securityQA.callbacks.at(-1)[event](); }, event);
        assert.equal(await submit.isDisabled(), true);
        assert.deepEqual(await snapshot(page), answers);
        assert.equal(state.payloads.length, 0);
        if (event !== 'expired-callback') {
          const retry = page.getByRole('button', { name: 'Retry security check', exact: true });
          await retry.focus(); await page.keyboard.press('Enter');
        }
        await page.evaluate(() => { window.__securityQA.auto = true; window.__securityQA.callbacks.at(-1).callback('recovered'); });
        await ready(page);
        pass(`${slug}: ${event} recovers with answers intact and no POST`);
      }
      for (const stale of ['client age', 'SDK expired']) {
        await page.evaluate(stale => {
          window.__securityQA.auto = false;
          if (stale === 'client age') window.__securityQA.offset += 4 * 60_000;
          else window.__securityQA.expired = true;
        }, stale);
        await submitEvent(page); await submitEvent(page);
        assert.equal(await submit.isDisabled(), true);
        assert.equal(state.payloads.length, 0);
        assert.deepEqual(await snapshot(page), answers);
        await page.evaluate(() => { window.__securityQA.auto = true; window.__securityQA.callbacks.at(-1).callback('fresh-after-submit'); });
        await ready(page);
        assert.equal(state.payloads.length, 0);
        pass(`${slug}: ${stale} at Submit refreshes and requires a deliberate new click`);
      }
    }

    for (const [width, zoom] of [[1440, 1], [320, 1], [1440, 2]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom); }, zoom);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
      await page.screenshot({ path: path.join(output, `${slug}-${width}-${zoom}x.png`), fullPage: true });
    }
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await submit.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.equal(await submit.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle !== 'none'), true);
    pass(`${slug}: desktop, 320px and 200% zoom reflow, live security status and keyboard focus`);

    state.outcome = 'failure';
    await submit.click();
    await page.waitForFunction(() => document.querySelector('[data-submit-status]').textContent.includes('could not confirm'));
    await ready(page);
    assert.equal(state.payloads.length, 1);
    assert.deepEqual(await snapshot(page), answers);
    assert.ok(state.payloads[0].turnstileToken);
    pass(`${slug}: server failure retains answers and prepares a deliberate retry`);
    state.outcome = 'created'; state.hold = true;
    await submit.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('form[data-intake-form]').getAttribute('aria-busy') === 'true');
    await submitEvent(page); await submitEvent(page);
    await page.evaluate(() => window.__securityQA.callbacks.at(-1)['expired-callback']());
    while (!state.release) await new Promise(resolve => setTimeout(resolve, 10));
    const executionsAtSubmit = await page.evaluate(() => window.__securityQA.executes);
    state.release();
    await page.waitForFunction(() => document.querySelector('[data-submit-button]').textContent === 'Submitted');
    await submitEvent(page);
    if (!real) await page.clock.runFor(5 * 60_000);
    assert.equal(state.payloads.length, 2);
    assert.equal(state.payloads[0].submissionId, state.payloads[1].submissionId);
    assert.equal(await page.evaluate(() => window.__securityQA.executes), executionsAtSubmit);
    assert.equal(await submit.isDisabled(), true);
    assert.deepEqual(await snapshot(page), answers);
    pass(`${slug}: one request per intent, same retry identity, no execution or POST after success`);
    await page.close();

    if (!real) {
      for (const outcome of ['duplicate', 'disabled']) {
        const { page: other, state: otherState } = await open(slug, outcome !== 'disabled', outcome);
        await complete(other, slug);
        if (outcome === 'disabled') {
          await submitEvent(other);
          assert.equal(otherState.payloads.length, 0);
          assert.equal(await other.evaluate(() => window.__securityQA.executes), 0);
        } else {
          await ready(other); await other.locator('[data-submit-button]').click();
          await other.waitForFunction(() => document.querySelector('[data-submit-button]').textContent === 'Already received');
          await submitEvent(other); await other.clock.runFor(5 * 60_000);
          assert.equal(otherState.payloads.length, 1);
          assert.equal(await other.evaluate(() => window.__securityQA.executes), 1);
        }
        pass(`${slug}: ${outcome} blocks any additional submission`);
        await other.close();
      }
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ real, results, errors }, null, 2));
  await browser.close(); server.close();
}
console.log(`${results.length} browser checks passed (${real ? 'Cloudflare public test key' : 'deterministic SDK'}).`);
