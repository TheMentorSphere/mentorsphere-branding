import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestSubmission, submissionUiState } from '../docs/assets/js/intake-submission-contract.js';
import { handleIntakeApi } from '../src/worker';
import { secondaryDefinition } from '../src/intake/secondary';
import { adhdDefinition } from '../src/intake/adhd';
import { validSecondaryRequest } from './secondary-fixtures';
import { validAdhdRequest } from './adhd-fixtures';
import { createDiskBackedScript, FICTIONAL_HMAC_SECRET } from './isolated-apps-script-harness';
import { APPS_SCRIPT_RECEIPT_TIMEOUT_MS } from '../src/intake/deadline';

// Runs the real browser contract, Worker validation, signing/transport and generated
// receiver in sequence. Only Google services/network are substituted; no live mail.
for (const [slug, definition, fixture] of [
  ['secondary-learner-profile', secondaryDefinition, validSecondaryRequest],
  ['adhd-coaching-intake', adhdDefinition, validAdhdRequest],
]) describe(`${slug}: isolated browser-to-storage pipeline`, () => {
  let harness;
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    harness?.cleanup();
    if (harness) expect(existsSync(harness.directory)).toBe(false);
  });
  function setup(properties = {}, upstream = 'receiver') {
    harness = createDiskBackedScript(slug, { TEST_MODE: 'false', ...properties });
    const origin = 'https://www.thementorsphere.co.uk';
    const env = {
      FORM_PAGE_ENABLED: 'true', FORM_SUBMISSIONS_ENABLED: 'true',
      TURNSTILE_SITE_KEY: 'fictional-key', TURNSTILE_SECRET_KEY: 'fictional-secret',
      TURNSTILE_EXPECTED_HOSTNAMES: 'www.thementorsphere.co.uk', TURNSTILE_TEST_MODE: 'false',
      INTAKE_APPS_SCRIPT_URL: 'https://script.google.test/macros/s/isolated/exec',
      INTAKE_HMAC_SECRET: FICTIONAL_HMAC_SECRET,
    };
    const contracts = [], httpStatuses = [];
    const upstreamStarted = Promise.withResolvers();
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (String(url) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
        return Response.json({ success: true, hostname: 'www.thementorsphere.co.uk', action: definition.action });
      }
      expect(url).toBe(env.INTAKE_APPS_SCRIPT_URL);
      if (upstream === 'malformed') return new Response('{', { headers: { 'Content-Type': 'application/json' } });
      if (upstream === 'timeout') {
        upstreamStarted.resolve();
        // Fake timers exercise the actual bounded transport signal below.
        return new Promise((_resolve, reject) => {
          const rejectTimeout = () => reject(options.signal.reason);
          if (options.signal.aborted) rejectTimeout();
          else options.signal.addEventListener('abort', rejectTimeout, { once: true });
        });
      }
      const output = harness.open().doPost({ postData: { contents: String(options.body) } });
      contracts.push(JSON.parse(output.value));
      return new Response(output.value, { headers: { 'Content-Type': 'application/json' } });
    }));
    const browserFetch = async (_endpoint, options) => {
      const headers = new Headers(options.headers);
      headers.set('Origin', origin);
      const response = await handleIntakeApi(new Request(origin + definition.apiPath, { ...options, headers }), env, definition);
      httpStatuses.push(response.status);
      return response;
    };
    const input = fixture();
    return { submit: () => requestSubmission(browserFetch, definition.apiPath, input), contracts, httpStatuses, upstreamStarted: upstreamStarted.promise };
  }
  it.each(['normal', 'mail-failure', 'forced-notification-failure', 'cache-failure', 'status-failure'])(
    '%s reaches Submitted after verified storage, then Already received without more mail', async scenario => {
      const properties = scenario === 'mail-failure' ? { MAIL_FAILURE: 'true' }
        : scenario === 'forced-notification-failure' ? { TEST_MODE: 'true', FORCE_NOTIFICATION_FAILURE: 'true' }
        : scenario === 'cache-failure' ? { CACHE_PUT_FAILURE: 'true' }
        : scenario === 'status-failure' ? { STATUS_WRITE_FAILURE: 'true' } : {};
      const pipeline = setup(properties);
      const notificationSent = !['mail-failure', 'forced-notification-failure'].includes(scenario);
      const outcome = await pipeline.submit();
      expect(outcome).toEqual({ kind: 'created', notificationSent });
      expect(submissionUiState(outcome)).toMatchObject({ buttonText: 'Submitted', completed: true });
      expect(pipeline.contracts[0]).toEqual({ success: true, stored: true, status: 'created', notificationSent });
      expect(pipeline.httpStatuses).toEqual([201]);
      expect(harness.state().rows).toHaveLength(2);
      const attempts = harness.events.filter(event => event === 'mail').length;
      const retry = await pipeline.submit();
      expect(retry).toEqual({ kind: 'duplicate' });
      expect(submissionUiState(retry).buttonText).toBe('Already received');
      expect(pipeline.contracts[1]).toEqual({ success: true, stored: false, status: 'duplicate', existingRecordVerified: true });
      expect(pipeline.httpStatuses).toEqual([201, 200]);
      expect(harness.state().rows).toHaveLength(2);
      expect(harness.events.filter(event => event === 'mail')).toHaveLength(attempts);
    },
  );
  it('returns duplicate_without_record internally and a retryable browser failure if the cached row disappeared', async () => {
    const pipeline = setup();
    await pipeline.submit();
    harness.removeStoredRows();
    const outcome = await pipeline.submit();
    expect(pipeline.contracts[1]).toEqual({ success: false, stored: false, status: 'duplicate_without_record' });
    expect(pipeline.httpStatuses).toEqual([201, 503]);
    expect(outcome.kind).toBe('failure');
    expect(submissionUiState(outcome).completed).toBe(false);
    expect(harness.state().rows).toHaveLength(1);
    expect(harness.mail).toHaveLength(1);
  });
  it.each(['malformed', 'timeout'])('%s upstream never produces a false browser receipt', async upstream => {
    if (upstream === 'timeout') vi.useFakeTimers();
    const pipeline = setup({}, upstream);
    const pending = pipeline.submit();
    if (upstream === 'timeout') {
      await pipeline.upstreamStarted;
      await vi.advanceTimersByTimeAsync(APPS_SCRIPT_RECEIPT_TIMEOUT_MS);
    }
    const outcome = await pending;
    expect(outcome.kind).toBe('failure');
    expect(submissionUiState(outcome)).toMatchObject({ completed: false, buttonDisabled: false });
    expect(pipeline.httpStatuses).toEqual([503]);
    expect(harness.state().rows).toHaveLength(0);
    expect(harness.mail).toHaveLength(0);
  });
});
