export const SUBMISSION_TIMEOUT_MS = 30_000;
export const TURNSTILE_TOKEN_MAX_AGE_MS = 4 * 60 * 1_000;

const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9.!#$&^_-]+\+)?json(?:\s*;|$)/iu;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DIAGNOSTIC_REQUEST_HEADER = 'X-MentorSphere-Request-ID';

export function turnstileTokenIsStale(token, issuedAt, now = Date.now()) {
  if (!token || !Number.isFinite(issuedAt)) return true;
  const age = now - issuedAt;
  return age < 0 || age >= TURNSTILE_TOKEN_MAX_AGE_MS;
}

export function classifySubmissionResponse(responseOk, contentType, payload, requestId = '', errorCode = '') {
  if (!responseOk) return { kind: 'failure', reason: 'http', requestId, errorCode };
  if (typeof contentType !== 'string' || !JSON_CONTENT_TYPE.test(contentType)) {
    return { kind: 'failure', reason: 'content_type', requestId, errorCode };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { kind: 'failure', reason: 'invalid_json', requestId, errorCode };
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
  return { kind: 'failure', reason: 'contract', requestId, errorCode };
}

export async function requestSubmission(fetchImplementation, endpoint, payload, timeoutMs = SUBMISSION_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const clientRequestId = crypto.randomUUID();
  try {
    const response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        [DIAGNOSTIC_REQUEST_HEADER]: clientRequestId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const contentType = response.headers.get('Content-Type') || '';
    const responseRequestId = response.headers.get(DIAGNOSTIC_REQUEST_HEADER) || '';
    const requestId = UUID_V4_PATTERN.test(responseRequestId) ? responseRequestId : clientRequestId;
    if (!JSON_CONTENT_TYPE.test(contentType)) {
      return classifySubmissionResponse(response.ok, contentType, null, requestId);
    }
    const text = await response.text();
    let responsePayload;
    try {
      responsePayload = JSON.parse(text);
    } catch {
      return { kind: 'failure', reason: 'invalid_json', requestId, errorCode: '' };
    }
    const responseBodyRequestId = typeof responsePayload?.requestId === 'string' && UUID_V4_PATTERN.test(responsePayload.requestId)
      ? responsePayload.requestId
      : requestId;
    const errorCode = typeof responsePayload?.errorCode === 'string' ? responsePayload.errorCode : '';
    return classifySubmissionResponse(response.ok, contentType, responsePayload, responseBodyRequestId, errorCode);
  } catch (error) {
    return {
      kind: 'failure',
      reason: controller.signal.aborted ? 'timeout' : 'network',
      error,
      requestId: clientRequestId,
      errorCode: '',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function requestReferenceText(requestId) {
  return UUID_V4_PATTERN.test(requestId) ? `Reference: ${requestId}` : '';
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
    requestId: outcome.requestId || '',
    referenceText: requestReferenceText(outcome.requestId || ''),
    buttonText: 'Submit learner profile',
    buttonDisabled: false,
    resetTurnstile: true,
    completed: false,
  };
}
