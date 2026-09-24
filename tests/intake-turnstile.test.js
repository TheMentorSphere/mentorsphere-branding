import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIntakeTurnstile } from '../docs/assets/js/intake-turnstile.js';
import { TURNSTILE_TOKEN_MAX_AGE_MS as AGE } from '../docs/assets/js/intake-submission-contract.js';

function element() {
  return { hidden: false, disabled: false, textContent: '', listeners: {},
    addEventListener(event, callback) { this.listeners[event] = callback; },
    after(child) { this.next = child; }, remove: vi.fn() };
}

describe('shared intake verification lifecycle', () => {
  let security, status, submitButton, api, callbacks, scripts, config, onVerified;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T12:00:00Z'));
    scripts = [];
    callbacks = [];
    config = { enabled: true, siteKey: 'test', action: 'test' };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(config)));
    vi.stubGlobal('document', { createElement: element, head: { append: script => scripts.push(script) } });
    api = {
      render: vi.fn((_container, options) => { callbacks.push(options); return callbacks.length; }),
      execute: vi.fn(), reset: vi.fn(), remove: vi.fn(), isExpired: vi.fn(() => false),
    };
    vi.stubGlobal('window', { turnstile: api });
    status = element(); submitButton = element(); onVerified = vi.fn();
    security = createIntakeTurnstile({ configEndpoint: '/config', container: element(), status, submitButton, onVerified });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  async function review() { await security.load(); security.setReview(true); }
  async function verified() { await review(); callbacks.at(-1).callback('fresh'); }

  it('loads configuration early without rendering, executing or enabling Submit', async () => {
    await security.load();
    await vi.advanceTimersByTimeAsync(AGE * 3);
    expect(api.render).not.toHaveBeenCalled();
    expect(api.execute).not.toHaveBeenCalled();
    expect(security.token).toBe('');
    expect(submitButton.disabled).toBe(true);
    security.setReview(true);
    expect(api.execute).toHaveBeenCalledTimes(1);
  });
  it('loads the real SDK callback before Review without obtaining a token', async () => {
    delete window.turnstile;
    const loaded = security.load();
    await vi.advanceTimersByTimeAsync(0);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain('render=explicit');
    window.turnstile = api;
    window.mentorSphereIntakeTurnstileReady();
    await loaded;
    expect(api.execute).not.toHaveBeenCalled();
    expect(security.token).toBe('');
  });
  it('handles Review reached before the script is ready', async () => {
    delete window.turnstile;
    const loaded = security.load();
    security.setReview(true);
    await vi.advanceTimersByTimeAsync(0);
    window.turnstile = api;
    window.mentorSphereIntakeTurnstileReady();
    await loaded;
    expect(api.execute).toHaveBeenCalledTimes(1);
  });
  it('uses supported deferred execution with one refresh owner', async () => {
    await review();
    expect(callbacks[0]).toMatchObject({ execution: 'execute', appearance: 'execute', size: 'compact', retry: 'never', 'refresh-expired': 'never', 'refresh-timeout': 'never' });
    expect(security.ensureReady()).toBe(false);
    expect(api.execute).toHaveBeenCalledTimes(1);
  });
  it('stores only a fresh successful callback and enables submission', async () => {
    await verified();
    expect(security.token).toBe('fresh');
    expect(security.ensureReady()).toBe(true);
    expect(submitButton.disabled).toBe(false);
    expect(onVerified).toHaveBeenCalledTimes(1);
  });
  it('automatically replaces tokens at the unchanged four-minute boundary', async () => {
    await verified();
    await vi.advanceTimersByTimeAsync(AGE);
    expect(security.token).toBe('');
    expect(submitButton.disabled).toBe(true);
    expect(api.reset).toHaveBeenCalledTimes(1);
    expect(api.execute).toHaveBeenCalledTimes(2);
    callbacks[0].callback('replacement');
    expect(security.ensureReady()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1); // Configuration only; helper cannot POST.
  });
  it.each(['stale', 'clock rollback', 'SDK expired'])('rejects %s even if timers were suspended and refreshes once', async reason => {
    await verified();
    if (reason === 'stale') vi.setSystemTime(Date.now() + AGE);
    if (reason === 'clock rollback') vi.setSystemTime(Date.now() - 1);
    if (reason === 'SDK expired') api.isExpired.mockReturnValue(true);
    expect(security.ensureReady()).toBe(false);
    expect(security.ensureReady()).toBe(false);
    expect(security.token).toBe('');
    expect(api.execute).toHaveBeenCalledTimes(2);
  });
  it('ignores a second expiry event during the same refresh', async () => {
    await verified();
    callbacks[0]['expired-callback']();
    callbacks[0]['expired-callback']();
    expect(security.token).toBe('');
    expect(api.execute).toHaveBeenCalledTimes(2);
  });
  it.each(['timeout-callback', 'error-callback'])('%s allows an intentional recovery without claiming receipt', async event => {
    await review();
    callbacks[0][event]();
    expect(security.token).toBe('');
    expect(status.textContent).toContain('needs retrying');
    expect(status.next.hidden).toBe(false);
    status.next.listeners.click();
    expect(api.execute).toHaveBeenCalledTimes(2);
    callbacks[0].callback('retried');
    expect(security.ensureReady()).toBe(true);
  });
  it('offers recovery when the SDK never responds', async () => {
    await review();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(status.next.hidden).toBe(false);
    expect(submitButton.disabled).toBe(true);
    callbacks[0].callback('too late');
    expect(security.token).toBe('');
  });
  it('leaves interactive challenge timing to Cloudflare', async () => {
    await review();
    callbacks[0]['before-interactive-callback']();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(status.next.hidden).toBe(true);
    callbacks[0].callback('interactive');
    expect(security.ensureReady()).toBe(true);
  });
  it('discards tokens on leaving Review and ignores removed-widget callbacks', async () => {
    await verified();
    security.setReview(false);
    await vi.advanceTimersByTimeAsync(AGE * 2);
    callbacks[0].callback('old');
    callbacks[0]['expired-callback']();
    expect(security.token).toBe('');
    expect(api.execute).toHaveBeenCalledTimes(1);
    security.setReview(true);
    callbacks[0].callback('old again');
    expect(security.token).toBe('');
    callbacks[1].callback('new');
    expect(security.token).toBe('new');
  });
  it('does not execute during a request, including navigation or SDK callbacks', async () => {
    await verified();
    security.beginSubmission();
    callbacks[0]['expired-callback']();
    callbacks[0]['error-callback']();
    security.setReview(false); security.setReview(true);
    await vi.advanceTimersByTimeAsync(AGE * 2);
    expect(security.ensureReady()).toBe(false);
    expect(api.execute).toHaveBeenCalledTimes(1);
    expect(security.token).toBe('');
  });
  it('a server failure obtains a fresh single-use token for a deliberate retry', async () => {
    await verified(); security.beginSubmission(); security.finishSubmission(false);
    expect(submitButton.disabled).toBe(true);
    expect(api.execute).toHaveBeenCalledTimes(2);
    callbacks[1].callback('retry');
    expect(security.ensureReady()).toBe(true);
  });
  it('a failure while editing waits until Review to execute again', async () => {
    await verified(); security.beginSubmission(); security.setReview(false); security.finishSubmission(false);
    expect(api.execute).toHaveBeenCalledTimes(1);
    security.setReview(true);
    expect(api.execute).toHaveBeenCalledTimes(2);
  });
  it('completion permanently stops token execution and ignores late callbacks', async () => {
    await verified(); security.beginSubmission(); security.finishSubmission(true);
    callbacks[0].callback('late'); callbacks[0]['expired-callback']();
    await vi.advanceTimersByTimeAsync(AGE * 3);
    security.setReview(false); security.setReview(true);
    expect(security.ensureReady()).toBe(false);
    expect(api.execute).toHaveBeenCalledTimes(1);
    expect(submitButton.disabled).toBe(true);
  });
  it('disabled configuration cannot submit or execute even through synthetic events', async () => {
    config.enabled = false;
    await review(); status.next.listeners.click();
    expect(security.ensureReady()).toBe(false);
    expect(api.execute).not.toHaveBeenCalled();
    expect(submitButton.disabled).toBe(true);
  });
  it.each(['config', 'script error', 'script timeout'])('recovers from an early %s failure on Review', async reason => {
    if (reason === 'config') fetch.mockRejectedValueOnce(new Error('offline'));
    else delete window.turnstile;
    const loaded = security.load();
    await vi.advanceTimersByTimeAsync(0);
    if (reason === 'script error') scripts[0].listeners.error();
    if (reason === 'script timeout') await vi.advanceTimersByTimeAsync(15_000);
    await loaded;
    security.setReview(true);
    expect(status.next.hidden).toBe(false);
    window.turnstile = api;
    status.next.listeners.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.execute).toHaveBeenCalledTimes(1);
  });
});
