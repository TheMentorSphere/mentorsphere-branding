import { APPS_SCRIPT_RECEIPT_TIMEOUT_MS, Deadline, DeadlineExceeded, TURNSTILE_VERIFY_TIMEOUT_MS } from "./deadline";
import { ReceiptFailure, type ReceiptStage } from "./diagnostics";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "primary_learner_profile";
const UPSTREAM_RESPONSE_LIMIT = 16_384;
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;|$)/iu;

export interface IntakeBindings {
  FORM_PAGE_ENABLED: string;
  FORM_SUBMISSIONS_ENABLED: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAMES: string;
  TURNSTILE_TEST_MODE: string;
  INTAKE_APPS_SCRIPT_URL: string;
  INTAKE_HMAC_SECRET: string;
}

export type TurnstileFailureCode =
  | "TURNSTILE_RESPONSE_INVALID"
  | "TURNSTILE_VERIFICATION_FAILED"
  | "TURNSTILE_HOSTNAME_MISMATCH"
  | "TURNSTILE_ACTION_MISMATCH"
  | "TURNSTILE_INTERNAL_ERROR";

export type TurnstileVerificationResult =
  | {
    ok: true;
    returnedSuccess: true;
    errorCodes: string;
    hostnameComparisonPassed: boolean | null;
    actionComparisonPassed: boolean | null;
  }
  | {
    ok: false;
    errorCode: TurnstileFailureCode;
    returnedSuccess: boolean | null;
    errorCodes: string;
    hostnameComparisonPassed: boolean | null;
    actionComparisonPassed: boolean | null;
  };

const TURNSTILE_ERROR_CODE_ALLOWLIST = new Set([
  "missing-input-secret",
  "invalid-input-secret",
  "missing-input-response",
  "invalid-input-response",
  "bad-request",
  "timeout-or-duplicate",
  "internal-error",
]);

export type IntakeCreatedResponse = {
  success: true;
  stored: true;
  status: "created";
  notificationSent: boolean;
};

export type IntakeDuplicateResponse = {
  success: true;
  stored: false;
  status: "duplicate";
  existingRecordVerified: true;
};

export type IntakeAcceptedResponse = IntakeCreatedResponse | IntakeDuplicateResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

async function signBody(body: string, secret: string, deadline: Deadline): Promise<string> {
  const encoder = new TextEncoder();
  deadline.check();
  const key = await deadline.wait(crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  ));
  const signature = await deadline.wait(crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return base64Url(new Uint8Array(signature));
}

async function readLimitedText(body: ReadableStream<Uint8Array> | null, limit: number, deadline: Deadline): Promise<string> {
  deadline.check();
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const result = await deadline.wait(reader.read());
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) throw new ReceiptFailure("UPSTREAM_RESPONSE_TOO_LARGE", "upstream_body");
      text += decoder.decode(result.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    // Cancellation is best effort; a misbehaving source cannot extend the budget.
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function sanitisedTurnstileErrorCodes(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const recognised = value.filter(
    (code): code is string => typeof code === "string" && TURNSTILE_ERROR_CODE_ALLOWLIST.has(code),
  );
  if (recognised.length > 0) return [...new Set(recognised)].join(",");
  return value.length > 0 ? "unrecognised" : "";
}

export async function verifyTurnstile(
  token: string,
  submissionId: string,
  remoteIp: string,
  env: IntakeBindings,
  expectedAction: string = TURNSTILE_ACTION,
  parentSignal?: AbortSignal,
): Promise<TurnstileVerificationResult> {
  const deadline = new Deadline(TURNSTILE_VERIFY_TIMEOUT_MS, "TURNSTILE_TIMEOUT", parentSignal);
  try {
    return await verifyTurnstileWithinDeadline(token, submissionId, remoteIp, env, expectedAction, deadline);
  } finally {
    deadline.dispose();
  }
}

async function fetchWithinDeadline(url: string, init: RequestInit, deadline: Deadline): Promise<Response> {
  deadline.check();
  return deadline.wait(fetch(url, { ...init, signal: deadline.signal }).then(response => {
    // Also dispose of a late response from a transport that ignored cancellation.
    if (deadline.signal.aborted) {
      void response.body?.cancel().catch(() => undefined);
      deadline.check();
    }
    return response;
  }));
}

async function verifyTurnstileWithinDeadline(
  token: string,
  submissionId: string,
  remoteIp: string,
  env: IntakeBindings,
  expectedAction: string,
  deadline: Deadline,
): Promise<TurnstileVerificationResult> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    idempotency_key: submissionId,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    deadline.check();
    response = await fetchWithinDeadline(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }, deadline);
  } catch {
    return {
      ok: false,
      errorCode: "TURNSTILE_INTERNAL_ERROR",
      returnedSuccess: null,
      errorCodes: "",
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    return {
      ok: false,
      errorCode: "TURNSTILE_VERIFICATION_FAILED",
      returnedSuccess: null,
      errorCodes: "",
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }

  let result: unknown;
  try {
    result = JSON.parse(await readLimitedText(response.body, UPSTREAM_RESPONSE_LIMIT, deadline)) as unknown;
  } catch {
    return {
      ok: false,
      errorCode: "TURNSTILE_RESPONSE_INVALID",
      returnedSuccess: null,
      errorCodes: "",
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }
  if (!isRecord(result) || typeof result.success !== "boolean") {
    return {
      ok: false,
      errorCode: "TURNSTILE_RESPONSE_INVALID",
      returnedSuccess: null,
      errorCodes: "",
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }

  const errorCodes = sanitisedTurnstileErrorCodes(result["error-codes"]);
  if (!result.success) {
    return {
      ok: false,
      errorCode: "TURNSTILE_VERIFICATION_FAILED",
      returnedSuccess: false,
      errorCodes,
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }

  if (env.TURNSTILE_TEST_MODE === "true") {
    return {
      ok: true,
      returnedSuccess: true,
      errorCodes,
      hostnameComparisonPassed: null,
      actionComparisonPassed: null,
    };
  }

  if (typeof result.action !== "string" || typeof result.hostname !== "string") {
    return {
      ok: false,
      errorCode: "TURNSTILE_RESPONSE_INVALID",
      returnedSuccess: true,
      errorCodes,
      hostnameComparisonPassed: typeof result.hostname === "string" ? null : false,
      actionComparisonPassed: typeof result.action === "string" ? null : false,
    };
  }

  const actionComparisonPassed = result.action === expectedAction;
  if (!actionComparisonPassed) {
    return {
      ok: false,
      errorCode: "TURNSTILE_ACTION_MISMATCH",
      returnedSuccess: true,
      errorCodes,
      hostnameComparisonPassed: null,
      actionComparisonPassed,
    };
  }

  const hostnames = new Set(
    env.TURNSTILE_EXPECTED_HOSTNAMES.split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  const hostnameComparisonPassed = hostnames.has(result.hostname.toLowerCase());
  if (!hostnameComparisonPassed) {
    return {
      ok: false,
      errorCode: "TURNSTILE_HOSTNAME_MISMATCH",
      returnedSuccess: true,
      errorCodes,
      hostnameComparisonPassed,
      actionComparisonPassed,
    };
  }
  return {
    ok: true,
    returnedSuccess: true,
    errorCodes,
    hostnameComparisonPassed,
    actionComparisonPassed,
  };
}

export async function sendToAppsScript(
  submission: { formVersion: string; submissionId: string },
  env: IntakeBindings,
  parentSignal?: AbortSignal,
): Promise<IntakeAcceptedResponse> {
  const deadline = new Deadline(APPS_SCRIPT_RECEIPT_TIMEOUT_MS, "UPSTREAM_TIMEOUT", parentSignal);
  let stage: ReceiptStage = "upstream_signing";
  let response: Response | undefined;
  try {
    deadline.check();
    const body = JSON.stringify({
      issuedAt: new Date().toISOString(),
      payload: submission,
    });
    const signature = await signBody(body, env.INTAKE_HMAC_SECRET, deadline);
    deadline.check();
    stage = "upstream_fetch";
    response = await fetchWithinDeadline(env.INTAKE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ body, signature }),
      redirect: "follow",
    }, deadline);
    if (!response.ok) throw new ReceiptFailure("UPSTREAM_HTTP_FAILURE", stage);
    const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
    if (!JSON_CONTENT_TYPE.test(contentType)) throw new ReceiptFailure("UPSTREAM_CONTENT_TYPE_INVALID", stage);
    stage = "upstream_body";
    const responseText = await readLimitedText(response.body, UPSTREAM_RESPONSE_LIMIT, deadline);
    let result: unknown;
    try {
      result = JSON.parse(responseText) as unknown;
    } catch {
      throw new ReceiptFailure("UPSTREAM_JSON_INVALID", stage);
    }
    stage = "upstream_receipt";
    deadline.check();
    if (!isRecord(result)) throw new ReceiptFailure("UPSTREAM_RECEIPT_INVALID", stage);
    if (
      result.success === true &&
      result.stored === true &&
      result.status === "created" &&
      typeof result.notificationSent === "boolean"
    ) {
      return {
        success: true,
        stored: true,
        status: "created",
        notificationSent: result.notificationSent,
      };
    }
    if (
      result.success === true &&
      result.stored === false &&
      result.status === "duplicate" &&
      result.existingRecordVerified === true
    ) {
      return {
        success: true,
        stored: false,
        status: "duplicate",
        existingRecordVerified: true,
      };
    }
    throw new ReceiptFailure("UPSTREAM_RECEIPT_INVALID", stage);
  } catch (error) {
    if (error instanceof ReceiptFailure) throw error;
    if (error instanceof DeadlineExceeded) {
      throw new ReceiptFailure(error.code === "WORKER_RECEIPT_TIMEOUT" ? error.code : "UPSTREAM_TIMEOUT", stage);
    }
    throw new ReceiptFailure(stage === "upstream_signing" ? "UPSTREAM_SIGNING_FAILURE" : "UPSTREAM_TRANSPORT_FAILURE", stage);
  } finally {
    deadline.dispose();
    if (response?.body && !response.body.locked) void response.body.cancel().catch(() => undefined);
  }
}

export const turnstileAction = TURNSTILE_ACTION;
