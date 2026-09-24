import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleIntakeApi } from '../src/worker';
import { sendToAppsScript } from '../src/intake/submission';
import { APPS_SCRIPT_RECEIPT_TIMEOUT_MS, WORKER_RECEIPT_TIMEOUT_MS, TURNSTILE_VERIFY_TIMEOUT_MS } from '../src/intake/deadline';
import { RECEIPT_ERROR_CODES } from '../src/intake/diagnostics';
import { secondaryDefinition } from '../src/intake/secondary';
import { adhdDefinition } from '../src/intake/adhd';
import { validateIntakeRequest, FORM_VERSION } from '../src/intake/validation';
import { requestSubmission, SUBMISSION_TIMEOUT_MS } from '../docs/assets/js/intake-submission-contract.js';
import { validIntakeRequest } from './fixtures';
import { validSecondaryRequest } from './secondary-fixtures';
import { validAdhdRequest } from './adhd-fixtures';
import { createDiskBackedScript, FICTIONAL_HMAC_SECRET } from './isolated-apps-script-harness';

const origin = 'https://www.thementorsphere.co.uk';
const primaryDefinition = {
  apiPath: '/api/forms/primary-learner-profile', formPath: '/forms/primary-learner-profile',
  formVersion: FORM_VERSION, action: 'primary_learner_profile', validate: validateIntakeRequest,
};
const requestId = 'c71c59ed-7f20-49e8-8fdd-e67e180ca210';
const env = {
  FORM_PAGE_ENABLED: 'true', FORM_SUBMISSIONS_ENABLED: 'true',
  TURNSTILE_SITE_KEY: 'fictional-key', TURNSTILE_SECRET_KEY: 'fictional-private-turnstile-secret',
  TURNSTILE_EXPECTED_HOSTNAMES: 'www.thementorsphere.co.uk', TURNSTILE_TEST_MODE: 'false',
  INTAKE_APPS_SCRIPT_URL: 'https://script.google.test/macros/s/private-receiver-url/exec',
  INTAKE_HMAC_SECRET: FICTIONAL_HMAC_SECRET,
};
const created = { success: true, stored: true, status: 'created', notificationSent: true };
const duplicate = { success: true, stored: false, status: 'duplicate', existingRecordVerified: true };
const paths = [
  ['primary-learner-profile', primaryDefinition, validIntakeRequest],
  ['secondary-learner-profile', secondaryDefinition, validSecondaryRequest],
  ['adhd-coaching-intake', adhdDefinition, validAdhdRequest],
];

function request(input = validIntakeRequest(), definition = primaryDefinition) {
  return new Request(origin + definition.apiPath, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-MentorSphere-Request-ID': requestId },
    body: JSON.stringify(input),
  });
}

// Delays are real promises/streams controlled by Vitest's clock, rather than
// pre-rejected mocks or shortened timeout constants. The stream honours cancel.
function delayedBody(text, delay) {
  let timer;
  const cancelled = vi.fn(() => clearTimeout(timer));
  const body = new ReadableStream({
    start(controller) {
      timer = setTimeout(() => { controller.enqueue(new TextEncoder().encode(text)); controller.close(); }, delay);
    },
    cancel: cancelled,
  });
  return { body, cancelled };
}
function delayedReceipt(receipt, delay, phase) {
  if (phase === 'body') {
    const { body, cancelled } = delayedBody(JSON.stringify(receipt), delay);
    return { promise: Promise.resolve(new Response(body, { headers: { 'Content-Type': 'application/json' } })), cancelled };
  }
  return { promise: new Promise(resolve => setTimeout(() => resolve(Response.json(receipt)), delay)) };
}
function upstream(apps, definition = primaryDefinition, verification) {
  const started = Promise.withResolvers();
  const posts = [];
  const fetchMock = vi.fn((url, options) => {
    if (String(url).includes('challenges.cloudflare.com')) {
      return verification ? verification(options) : Promise.resolve(Response.json({ success: true, action: definition.action, hostname: 'www.thementorsphere.co.uk' }));
    }
    expect(url).toBe(env.INTAKE_APPS_SCRIPT_URL);
    posts.push(options);
    started.resolve();
    return apps(options);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { started: started.promise, posts, fetchMock };
}

beforeEach(() => {
  vi.useFakeTimers();
  // The receiver runs in a separate VM with its own real Date for HMAC freshness.
  vi.setSystemTime(vi.getRealSystemTime());
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('bounded Apps Script receipt', () => {
  it.each(['headers', 'body'].flatMap(phase => [5, 11_999, 12_000, 12_001, 13_000, 20_000, 34_999].map(delay => ({ phase, delay }))))(
    'confirms genuinely delayed $phase at $delay ms with one POST', async ({ phase, delay }) => {
      const transport = upstream(() => delayedReceipt(created, delay, phase).promise);
      let finished = false;
      const pending = handleIntakeApi(request(), env).then(result => { finished = true; return result; });
      await transport.started;
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(finished).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const response = await pending;
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject(created);
      expect(transport.posts).toHaveLength(1);
      expect(JSON.parse(JSON.parse(transport.posts[0].body).body).payload.submissionId).toBe(validIntakeRequest().submissionId);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(['headers', 'body'].flatMap(phase => [35_000, 35_001, 40_000].map(delay => ({ phase, delay }))))(
    'fails closed for $phase at or beyond the exact 35s deadline ($delay ms)', async ({ phase, delay }) => {
      let cancelled;
      const transport = upstream(() => {
        const receipt = delayedReceipt(created, delay, phase);
        cancelled = receipt.cancelled;
        return receipt.promise;
      });
      const pending = handleIntakeApi(request(), env);
      await transport.started;
      await vi.advanceTimersByTimeAsync(APPS_SCRIPT_RECEIPT_TIMEOUT_MS);
      const response = await pending;
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ success: false, stored: false, status: 'upstream_failure', errorCode: 'UPSTREAM_TIMEOUT' });
      expect(console.warn).toHaveBeenCalledWith({
        event: 'intake_receipt_failure', requestId, errorCode: 'UPSTREAM_TIMEOUT',
        stage: phase === 'headers' ? 'upstream_fetch' : 'upstream_body', durationMs: 35_000,
      });
      if (cancelled) expect(cancelled).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(transport.posts).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([created, duplicate, { ...created, notificationSent: false }])('accepts only a verified receipt after 20s: %j', async receipt => {
    const transport = upstream(() => delayedReceipt(receipt, 20_000, 'body').promise);
    const pending = handleIntakeApi(request(), env);
    await transport.started;
    await vi.advanceTimersByTimeAsync(20_000);
    const response = await pending;
    expect(response.status).toBe(receipt.status === 'created' ? 201 : 200);
    expect(await response.json()).toMatchObject(receipt);
    expect(transport.posts).toHaveLength(1);
  });

  it('bounds signing and never posts after a late crypto result', async () => {
    const signing = Promise.withResolvers();
    const signingStarted = Promise.withResolvers();
    vi.spyOn(crypto.subtle, 'sign').mockImplementation(() => { signingStarted.resolve(); return signing.promise; });
    const transport = upstream(() => Promise.resolve(Response.json(created)));
    const pending = handleIntakeApi(request(), env);
    await signingStarted.promise;
    await vi.advanceTimersByTimeAsync(APPS_SCRIPT_RECEIPT_TIMEOUT_MS);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'UPSTREAM_TIMEOUT', success: false });
    expect(console.warn).toHaveBeenCalledWith(expect.objectContaining({ stage: 'upstream_signing' }));
    signing.resolve(new ArrayBuffer(32));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(transport.posts).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shares one 35s deadline across delayed headers and body', async () => {
    let cancelled;
    const transport = upstream(() => new Promise(resolve => setTimeout(() => {
      const stream = delayedBody(JSON.stringify(created), 20_000);
      cancelled = stream.cancelled;
      resolve(new Response(stream.body, { headers: { 'Content-Type': 'application/json' } }));
    }, 20_000)));
    const pending = handleIntakeApi(request(), env);
    await transport.started;
    await vi.advanceTimersByTimeAsync(35_000);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'UPSTREAM_TIMEOUT' });
    expect(cancelled).toHaveBeenCalledOnce();
    expect(transport.posts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('complete Worker and browser budgets', () => {
  it('keeps a 15s browser reserve beyond the complete Worker deadline', () => {
    expect(APPS_SCRIPT_RECEIPT_TIMEOUT_MS).toBe(35_000);
    expect(TURNSTILE_VERIFY_TIMEOUT_MS).toBe(10_000);
    expect(WORKER_RECEIPT_TIMEOUT_MS).toBe(55_000);
    expect(SUBMISSION_TIMEOUT_MS - WORKER_RECEIPT_TIMEOUT_MS).toBe(15_000);
  });

  it('cancels an unread request at 55s without verifying or forwarding it', async () => {
    const stream = delayedBody(JSON.stringify(validIntakeRequest()), 60_000);
    const transport = upstream(() => Promise.resolve(Response.json(created)));
    const inbound = new Request(origin + primaryDefinition.apiPath, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: stream.body, duplex: 'half',
    });
    const pending = handleIntakeApi(inbound, env);
    await vi.advanceTimersByTimeAsync(55_000);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'WORKER_RECEIPT_TIMEOUT', success: false });
    expect(stream.cancelled).toHaveBeenCalledOnce();
    expect(stream.body.locked).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(transport.fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['headers', 'body'])('retains the 10s Siteverify bound including delayed %s, with no forwarding', async phase => {
    const verificationStarted = Promise.withResolvers();
    const transport = upstream(() => Promise.resolve(Response.json(created)), primaryDefinition, () => {
      verificationStarted.resolve();
      return delayedReceipt({ success: true, action: primaryDefinition.action, hostname: 'www.thementorsphere.co.uk' }, 11_000, phase).promise;
    });
    const pending = handleIntakeApi(request(), env);
    await verificationStarted.promise;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await (await pending).json()).toMatchObject({ success: false, status: 'rejected', errorCode: phase === 'headers' ? 'TURNSTILE_INTERNAL_ERROR' : 'TURNSTILE_RESPONSE_INVALID' });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(transport.posts).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps slow request + Siteverify + receipt at 55s and aborts the upstream stream', async () => {
    const input = delayedBody(JSON.stringify(validIntakeRequest()), 30_000);
    let receipt;
    const transport = upstream(() => {
      receipt = delayedReceipt(created, 25_000, 'body');
      return receipt.promise;
    }, primaryDefinition, () => delayedReceipt({ success: true, action: primaryDefinition.action, hostname: 'www.thementorsphere.co.uk' }, 5_000, 'body').promise);
    const inbound = new Request(origin + primaryDefinition.apiPath, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: input.body, duplex: 'half' });
    const pending = handleIntakeApi(inbound, env);
    await vi.advanceTimersByTimeAsync(35_000);
    await transport.started;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'WORKER_RECEIPT_TIMEOUT', success: false });
    expect(receipt.cancelled).toHaveBeenCalledOnce();
    expect(transport.posts[0].signal.aborted).toBe(true);
    expect(transport.posts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never starts a POST when request reading leaves insufficient time for signing', async () => {
    const input = delayedBody(JSON.stringify(validIntakeRequest()), 30_000);
    const signingStarted = Promise.withResolvers();
    const signing = Promise.withResolvers();
    vi.spyOn(crypto.subtle, 'sign').mockImplementation(() => { signingStarted.resolve(); return signing.promise; });
    const transport = upstream(() => Promise.resolve(Response.json(created)));
    const inbound = new Request(origin + primaryDefinition.apiPath, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: input.body, duplex: 'half' });
    const pending = handleIntakeApi(inbound, env);
    await vi.advanceTimersByTimeAsync(30_000);
    await signingStarted.promise;
    await vi.advanceTimersByTimeAsync(25_000);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'WORKER_RECEIPT_TIMEOUT' });
    signing.resolve(new ArrayBuffer(32));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(transport.posts).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never forwards a late successful Siteverify after the whole Worker deadline', async () => {
    const input = delayedBody(JSON.stringify(validIntakeRequest()), 50_000);
    const verification = Promise.withResolvers();
    const verificationStarted = Promise.withResolvers();
    const transport = upstream(() => Promise.resolve(Response.json(created)), primaryDefinition, () => {
      verificationStarted.resolve();
      return verification.promise;
    });
    const inbound = new Request(origin + primaryDefinition.apiPath, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: input.body, duplex: 'half' });
    const pending = handleIntakeApi(inbound, env);
    await vi.advanceTimersByTimeAsync(50_000);
    await verificationStarted.promise;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await (await pending).json()).toMatchObject({ errorCode: 'WORKER_RECEIPT_TIMEOUT' });
    verification.resolve(Response.json({ success: true, action: primaryDefinition.action, hostname: 'www.thementorsphere.co.uk' }));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(transport.posts).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accepts a complete receipt just within the combined 55s Worker budget', async () => {
    const input = delayedBody(JSON.stringify(validIntakeRequest()), 15_000);
    const transport = upstream(() => delayedReceipt(created, 30_000, 'body').promise, primaryDefinition,
      () => delayedReceipt({ success: true, action: primaryDefinition.action, hostname: 'www.thementorsphere.co.uk' }, 9_999, 'body').promise);
    const inbound = new Request(origin + primaryDefinition.apiPath, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: input.body, duplex: 'half' });
    const pending = handleIntakeApi(inbound, env);
    await vi.advanceTimersByTimeAsync(24_999);
    await transport.started;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await (await pending).json()).toMatchObject(created);
    expect(transport.posts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the browser open for the Worker result and sends no second request', async () => {
    const transport = upstream(() => delayedReceipt(created, 20_000, 'body').promise);
    const browserFetch = vi.fn((_url, options) => handleIntakeApi(new Request(origin + primaryDefinition.apiPath, {
      ...options, headers: { ...options.headers, Origin: origin },
    }), env));
    const input = validIntakeRequest();
    const pending = requestSubmission(browserFetch, primaryDefinition.apiPath, input);
    await transport.started;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toEqual({ kind: 'created', notificationSent: true });
    expect(browserFetch).toHaveBeenCalledOnce();
    expect(transport.posts).toHaveLength(1);
    expect(JSON.parse(JSON.parse(transport.posts[0].body).body).payload.submissionId).toBe(input.submissionId);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds an unresponsive browser transport at its actual 70s default without retry', async () => {
    const browserFetch = vi.fn((_url, options) => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('fictional transport aborted')), { once: true });
    }));
    const pending = requestSubmission(browserFetch, primaryDefinition.apiPath, validIntakeRequest());
    await vi.advanceTimersByTimeAsync(69_999);
    expect(browserFetch.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ kind: 'failure', reason: 'timeout' });
    expect(browserFetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('safe receipt diagnostics', () => {
  const privateMarker = 'PRIVATE: Alex alex@example.test phone-health-answer-token-hmac-secret';
  it.each([
    ['http', 'UPSTREAM_HTTP_FAILURE', 'upstream_fetch', () => new Response(privateMarker, { status: 500 })],
    ['content type', 'UPSTREAM_CONTENT_TYPE_INVALID', 'upstream_fetch', () => new Response(privateMarker, { headers: { 'Content-Type': 'text/plain' } })],
    ['JSON', 'UPSTREAM_JSON_INVALID', 'upstream_body', () => new Response(privateMarker, { headers: { 'Content-Type': 'application/json' } })],
    ['oversized body', 'UPSTREAM_RESPONSE_TOO_LARGE', 'upstream_body', () => new Response(privateMarker.repeat(600), { headers: { 'Content-Type': 'application/json' } })],
    ['receipt', 'UPSTREAM_RECEIPT_INVALID', 'upstream_receipt', () => Response.json({ ...created, stored: false, privateMarker })],
    ['transport', 'UPSTREAM_TRANSPORT_FAILURE', 'upstream_fetch', () => { throw new Error(privateMarker + env.INTAKE_APPS_SCRIPT_URL); }],
  ])('classifies %s using fixed codes and never logs upstream text or payload', async (_name, code, stage, result) => {
    upstream(() => Promise.resolve().then(result));
    const response = await handleIntakeApi(request(), env);
    const body = await response.json();
    expect(body).toMatchObject({ success: false, stored: false, status: 'upstream_failure', errorCode: code, requestId });
    expect(RECEIPT_ERROR_CODES).toContain(code);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith({ event: 'intake_receipt_failure', requestId, errorCode: code, stage, durationMs: 0 });
    const logged = JSON.stringify(console.warn.mock.calls);
    for (const value of [privateMarker, env.INTAKE_APPS_SCRIPT_URL, env.INTAKE_HMAC_SECRET, env.TURNSTILE_SECRET_KEY, 'Alex', 'alex@example.test', validIntakeRequest().submissionId, 'fictional-turnstile-token']) {
      expect(logged).not.toContain(value);
      expect(JSON.stringify(body)).not.toContain(value);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it('classifies a signing failure without exposing the crypto exception', async () => {
    vi.spyOn(crypto.subtle, 'sign').mockRejectedValue(new Error(privateMarker));
    const transport = upstream(() => Promise.resolve(Response.json(created)));
    const response = await handleIntakeApi(request(), env);
    expect(await response.json()).toMatchObject({ errorCode: 'UPSTREAM_SIGNING_FAILURE', success: false });
    expect(console.warn).toHaveBeenCalledWith(expect.objectContaining({ stage: 'upstream_signing', errorCode: 'UPSTREAM_SIGNING_FAILURE' }));
    expect(JSON.stringify(console.warn.mock.calls)).not.toContain(privateMarker);
    expect(transport.posts).toHaveLength(0);
  });
});

for (const [slug, definition, fixture] of paths) describe(`${slug}: delayed durable receipt with actual receiver`, () => {
  let harness;
  afterEach(() => { harness?.cleanup(); });
  function setup(properties = {}, delay = 20_000) {
    harness = createDiskBackedScript(slug, { TEST_MODE: 'false', ...properties });
    return upstream(options => {
      const stored = harness.open().doPost({ postData: { contents: String(options.body) } });
      return delayedReceipt(JSON.parse(stored.value), delay, 'body').promise;
    }, definition);
  }

  it('confirms a 20s receipt with one row and notification, then a safe manual exact duplicate', async () => {
    const transport = setup();
    const input = fixture();
    const pending = handleIntakeApi(request(input, definition), env, definition);
    await transport.started;
    expect(harness.state().rows).toHaveLength(2);
    expect(harness.mail).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await (await pending).json()).toMatchObject(created);
    expect(transport.posts).toHaveLength(1);
    // A second explicit action, never an automatic transport retry.
    const retryStarted = Promise.withResolvers();
    upstream(options => {
      retryStarted.resolve();
      const stored = harness.open().doPost({ postData: { contents: String(options.body) } });
      expect(JSON.parse(JSON.parse(options.body).body).payload.submissionId).toBe(input.submissionId);
      return Promise.resolve(new Response(stored.value, { headers: { 'Content-Type': 'application/json' } }));
    }, definition);
    const retry = handleIntakeApi(request(input, definition), env, definition);
    await retryStarted.promise;
    expect(await (await retry).json()).toMatchObject(duplicate);
    expect(harness.state().rows).toHaveLength(2);
    expect(harness.mail).toHaveLength(1);
  });

  it('fails closed after storage if the receipt exceeds 35s, with no automatic second row or mail', async () => {
    const transport = setup({}, 40_000);
    const pending = handleIntakeApi(request(fixture(), definition), env, definition);
    await transport.started;
    await vi.advanceTimersByTimeAsync(35_000);
    expect(await (await pending).json()).toMatchObject({ success: false, stored: false, status: 'upstream_failure', errorCode: 'UPSTREAM_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(transport.posts).toHaveLength(1);
    expect(harness.state().rows).toHaveLength(2);
    expect(harness.mail).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the created receipt after a delayed post-storage notification failure', async () => {
    const transport = setup({ MAIL_FAILURE: 'true' });
    const pending = handleIntakeApi(request(fixture(), definition), env, definition);
    await transport.started;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await (await pending).json()).toMatchObject({ ...created, notificationSent: false });
    expect(harness.state().rows).toHaveLength(2);
    expect(harness.mail).toHaveLength(0);
    expect(transport.posts).toHaveLength(1);
  });

  it('rejects a pre-storage failure with no durable row or notification', async () => {
    const transport = setup({ APPEND_FAILURE: 'true' });
    const pending = handleIntakeApi(request(fixture(), definition), env, definition);
    await transport.started;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await (await pending).json()).toMatchObject({ success: false, status: 'upstream_failure', errorCode: 'UPSTREAM_RECEIPT_INVALID' });
    expect(harness.state().rows).toHaveLength(0);
    expect(harness.mail).toHaveLength(0);
    expect(transport.posts).toHaveLength(1);
  });
});

it('cancels a late response body even when its fetch ignored cancellation', async () => {
  const lateResponse = Promise.withResolvers();
  const started = upstream(() => lateResponse.promise);
  const pending = sendToAppsScript({ formVersion: FORM_VERSION, submissionId: validIntakeRequest().submissionId }, env).catch(error => error);
  await started.started;
  await vi.advanceTimersByTimeAsync(35_000);
  expect(await pending).toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
  const cancelled = vi.fn();
  lateResponse.resolve(new Response(new ReadableStream({ cancel: cancelled }), { headers: { 'Content-Type': 'application/json' } }));
  await vi.advanceTimersByTimeAsync(0);
  expect(cancelled).toHaveBeenCalledOnce();
  expect(started.posts).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(0);
});
