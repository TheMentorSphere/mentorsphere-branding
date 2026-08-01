import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifySubmissionResponse,
  requestReferenceText,
  requestSubmission,
  submissionUiState,
} from '../docs/assets/js/intake-submission-contract.js';

const endpoint = 'https://www.thementorsphere.co.uk/api/forms/primary-learner-profile';

afterEach(() => {
  vi.useRealTimers();
});

describe('browser submission contract', () => {
  it('shows success only for a complete created-and-stored response', () => {
    expect(classifySubmissionResponse(true, 'application/json; charset=utf-8', {
      success: true,
      stored: true,
      status: 'created',
      notificationSent: false,
    })).toEqual({ kind: 'created', notificationSent: false });

    for (const payload of [
      { success: true, status: 'created', notificationSent: true },
      { success: true, stored: false, status: 'created', notificationSent: true },
      { success: true, stored: true, status: 'unknown', notificationSent: true },
      { success: true, stored: true, status: 'created' },
      { success: false, stored: true, status: 'created', notificationSent: true },
    ]) {
      expect(classifySubmissionResponse(true, 'application/json', payload).kind).toBe('failure');
    }
  });

  it('changes a genuine success button to Submitted and finalises progress', () => {
    expect(submissionUiState({ kind: 'created', notificationSent: true })).toMatchObject({
      buttonText: 'Submitted',
      buttonDisabled: true,
      completed: true,
      resetTurnstile: false,
    });
  });

  it('distinguishes verified and unverified duplicates', () => {
    const verified = classifySubmissionResponse(true, 'application/json', {
      success: true,
      stored: false,
      status: 'duplicate',
      existingRecordVerified: true,
    });
    expect(verified).toEqual({ kind: 'duplicate' });
    expect(submissionUiState(verified)).toMatchObject({
      buttonText: 'Already received',
      buttonDisabled: true,
      completed: true,
    });

    expect(classifySubmissionResponse(true, 'application/json', {
      success: true,
      stored: false,
      status: 'duplicate',
      existingRecordVerified: false,
    }).kind).toBe('failure');
    expect(classifySubmissionResponse(true, 'application/json', {
      success: false,
      stored: false,
      status: 'duplicate_without_record',
    }).kind).toBe('failure');
  });

  it.each([
    ['HTTP error', () => Response.json({ success: false }, { status: 503 })],
    ['invalid JSON', () => new Response('{', { headers: { 'Content-Type': 'application/json' } })],
    ['unexpected content type', () => new Response('ok', { headers: { 'Content-Type': 'text/plain' } })],
    ['missing fields', () => Response.json({ success: true })],
  ])('restores the normal button after %s without changing answers', async (_name, makeResponse) => {
    const payload = {
      submissionId: '123e4567-e89b-42d3-a456-426614174000',
      answers: { fictional: 'Answer remains present' },
    };
    const before = structuredClone(payload);
    const fetchMock = vi.fn().mockResolvedValue(makeResponse());
    const outcome = await requestSubmission(fetchMock, endpoint, payload, 100);
    const state = submissionUiState(outcome);

    expect(outcome.kind).toBe('failure');
    expect(state).toMatchObject({
      buttonText: 'Submit learner profile',
      buttonDisabled: false,
      resetTurnstile: true,
      completed: false,
    });
    expect(payload).toEqual(before);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).submissionId).toBe(payload.submissionId);
    expect(fetchMock.mock.calls[0][1].headers['X-MentorSphere-Request-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
  });

  it('times out once, restores the button and does not retry or replace the submission ID', async () => {
    vi.useFakeTimers();
    const payload = {
      submissionId: '123e4567-e89b-42d3-a456-426614174000',
      answers: { fictional: 'Answer remains present' },
    };
    const before = structuredClone(payload);
    const fetchMock = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));

    const pending = requestSubmission(fetchMock, endpoint, payload, 30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    const outcome = await pending;

    expect(outcome).toMatchObject({ kind: 'failure', reason: 'timeout' });
    expect(submissionUiState(outcome)).toMatchObject({
      buttonText: 'Submit learner profile',
      buttonDisabled: false,
      resetTurnstile: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload).toEqual(before);
  });

  it('keeps a per-request diagnostic reference without displaying the technical code', async () => {
    const requestId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      success: false,
      stored: false,
      status: 'rejected',
      errorCode: 'TURNSTILE_HOSTNAME_MISMATCH',
      requestId,
    }, {
      status: 400,
      headers: { 'X-MentorSphere-Request-ID': requestId },
    }));

    const outcome = await requestSubmission(fetchMock, endpoint, { fictional: 'Answer remains present' }, 100);
    const state = submissionUiState(outcome);

    expect(outcome).toMatchObject({
      kind: 'failure',
      reason: 'http',
      errorCode: 'TURNSTILE_HOSTNAME_MISMATCH',
      requestId,
    });
    expect(state.message).toBe(
      'We could not confirm that your profile was received. Your answers are still on this page. Please try again or contact Luke.',
    );
    expect(state.referenceText).toBe(`Reference: ${requestId}`);
    expect(state.message).not.toContain('TURNSTILE');
    expect(requestReferenceText('not-a-uuid')).toBe('');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the generated client request ID when an invalid response ID is returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      success: false,
      stored: false,
      status: 'rejected',
      errorCode: 'INVALID_JSON',
      requestId: 'private-or-invalid-value',
    }, {
      status: 400,
      headers: { 'X-MentorSphere-Request-ID': 'also-invalid' },
    }));

    const outcome = await requestSubmission(fetchMock, endpoint, {}, 100);
    const sentRequestId = fetchMock.mock.calls[0][1].headers['X-MentorSphere-Request-ID'];
    expect(outcome.requestId).toBe(sentRequestId);
    expect(outcome.requestId).toMatch(/^[0-9a-f-]{36}$/iu);
  });
});
