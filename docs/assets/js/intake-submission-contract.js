export const SUBMISSION_TIMEOUT_MS = 30_000;

const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9.!#$&^_-]+\+)?json(?:\s*;|$)/iu;

export function classifySubmissionResponse(responseOk, contentType, payload) {
  if (!responseOk) return { kind: 'failure', reason: 'http' };
  if (typeof contentType !== 'string' || !JSON_CONTENT_TYPE.test(contentType)) {
    return { kind: 'failure', reason: 'content_type' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { kind: 'failure', reason: 'invalid_json' };
  }
  if (
    payload.success === true &&
    payload.stored === true &&
    payload.status === 'created' &&
    typeof payload.notificationSent === 'boolean'
  ) {
    return { kind: 'created', notificationSent: payload.notificationSent };
  }
  if (
    payload.success === true &&
    payload.stored === false &&
    payload.status === 'duplicate' &&
    payload.existingRecordVerified === true
  ) {
    return { kind: 'duplicate' };
  }
  return { kind: 'failure', reason: 'contract' };
}

export async function requestSubmission(fetchImplementation, endpoint, payload, timeoutMs = SUBMISSION_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const contentType = response.headers.get('Content-Type') || '';
    if (!response.ok || !JSON_CONTENT_TYPE.test(contentType)) {
      return classifySubmissionResponse(response.ok, contentType, null);
    }
    const text = await response.text();
    let responsePayload;
    try {
      responsePayload = JSON.parse(text);
    } catch {
      return { kind: 'failure', reason: 'invalid_json' };
    }
    return classifySubmissionResponse(response.ok, contentType, responsePayload);
  } catch (error) {
    return { kind: 'failure', reason: controller.signal.aborted ? 'timeout' : 'network', error };
  } finally {
    clearTimeout(timeout);
  }
}

export function submissionUiState(outcome) {
  if (outcome.kind === 'created') {
    return {
      message: 'Thank you. The learner profile has been submitted. Luke will review it and follow up using your preferred contact methods.',
      messageKind: 'success',
      buttonText: 'Submitted',
      buttonDisabled: true,
      resetTurnstile: false,
      completed: true,
    };
  }
  if (outcome.kind === 'duplicate') {
    return {
      message: 'This response has already been received. You do not need to submit it again.',
      messageKind: 'success',
      buttonText: 'Already received',
      buttonDisabled: true,
      resetTurnstile: false,
      completed: true,
    };
  }
  return {
    message: 'We could not confirm that your profile was received. Your answers are still on this page. Please try again or contact Luke.',
    messageKind: 'error',
    buttonText: 'Submit learner profile',
    buttonDisabled: false,
    resetTurnstile: true,
    completed: false,
  };
}
