import { sendToAppsScript, turnstileAction, verifyTurnstile, type IntakeBindings } from "./intake/submission";
import {
  logPreForwardDiagnostic,
  logReceiptDiagnostic,
  ReceiptFailure,
  type ReceiptStage,
  type PreForwardErrorCode,
  type PreForwardStage,
} from "./intake/diagnostics";
import { Deadline, DeadlineExceeded, WORKER_RECEIPT_TIMEOUT_MS } from "./intake/deadline";
import { FORM_VERSION, validateIntakeRequest } from "./intake/validation";

import { secondaryDefinition, secondaryBindings } from "./intake/secondary";
import { adhdDefinition, adhdBindings } from "./intake/adhd";

export type IntakeValidation = { ok: true; request: { submission: { formVersion: string; submissionId: string }; turnstileToken: string; honeypot: string } } | { ok: false; errors: Record<string, string> };
export interface IntakeDefinition { apiPath: string; formPath: string; formVersion: string; action: string; validate(input: unknown): IntakeValidation }

const API_PATH = "/api/forms/primary-learner-profile";

const FORM_PATH = "/forms/primary-learner-profile";
const PRIMARY_DEFINITION: IntakeDefinition = { apiPath: API_PATH, formPath: FORM_PATH, formVersion: FORM_VERSION, action: turnstileAction, validate: validateIntakeRequest };
const MAX_REQUEST_BYTES = 32_768;
const DIAGNOSTIC_REQUEST_HEADER = "X-MentorSphere-Request-ID";
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type BodyReadErrorCode = "REQUEST_TOO_LARGE" | "REQUEST_BODY_UNREADABLE" | "INVALID_JSON";

class BodyReadError extends Error {
  constructor(
    readonly code: BodyReadErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}

export interface WorkerBindings extends IntakeBindings {
  SECONDARY_FORM_PAGE_ENABLED?: string;
  SECONDARY_FORM_SUBMISSIONS_ENABLED?: string;
  SECONDARY_TURNSTILE_SITE_KEY?: string;
  SECONDARY_TURNSTILE_SECRET_KEY?: string;
  SECONDARY_TURNSTILE_EXPECTED_HOSTNAMES?: string;
  SECONDARY_TURNSTILE_TEST_MODE?: string;
  SECONDARY_APPS_SCRIPT_URL?: string;
  SECONDARY_HMAC_SECRET?: string;
  ADHD_INTAKE_PAGE_ENABLED?: string;
  ADHD_INTAKE_SUBMISSIONS_ENABLED?: string;
  ADHD_TURNSTILE_SITE_KEY?: string;
  ADHD_TURNSTILE_SECRET_KEY?: string;
  ADHD_TURNSTILE_EXPECTED_HOSTNAMES?: string;
  ADHD_TURNSTILE_TEST_MODE?: string;
  ADHD_APPS_SCRIPT_URL?: string;
  ADHD_HMAC_SECRET?: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function apiHeaders(requestId: string): Headers {
  return new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    [DIAGNOSTIC_REQUEST_HEADER]: requestId,
    "X-Request-ID": requestId,
  });
}

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  const responseBody = isRecord(body) ? { ...body, requestId } : { result: body, requestId };
  return new Response(JSON.stringify(responseBody), { status, headers: apiHeaders(requestId) });
}

async function readLimitedJson(request: Request, deadline: Deadline): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) throw new BodyReadError("REQUEST_TOO_LARGE", 413);
  if (!request.body) throw new BodyReadError("REQUEST_BODY_UNREADABLE", 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const result = await deadline.wait(reader.read());
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_REQUEST_BYTES) throw new BodyReadError("REQUEST_TOO_LARGE", 413);
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    if (error instanceof DeadlineExceeded) throw error;
    if (error instanceof BodyReadError) throw error;
    throw new BodyReadError("REQUEST_BODY_UNREADABLE", 400);
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BodyReadError("INVALID_JSON", 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnosticRequestId(request: Request): string {
  const candidate = request.headers.get(DIAGNOSTIC_REQUEST_HEADER)?.trim() ?? "";
  return UUID_V4_PATTERN.test(candidate) ? candidate : crypto.randomUUID();
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function isJson(request: Request): boolean {
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  return /^application\/(?:[a-z0-9.!#$&^_-]+\+)?json(?:\s*;|$)/iu.test(contentType);
}

function validationErrorCode(body: unknown, validation: IntakeValidation, formVersion: string): PreForwardErrorCode {
  if (!isRecord(body)) return "PAYLOAD_NOT_OBJECT";
  if (body.formVersion !== formVersion) return "INVALID_FORM_VERSION";
  if (typeof body.submissionId !== "string" || !UUID_V4_PATTERN.test(body.submissionId.trim())) {
    return "INVALID_SUBMISSION_ID";
  }
  if (typeof body.turnstileToken !== "string" || body.turnstileToken.trim().length === 0) {
    return "TURNSTILE_TOKEN_MISSING";
  }
  return validation.ok ? "UNKNOWN_PREFORWARD_REJECTION" : "PAYLOAD_VALIDATION_FAILED";
}

type DiagnosticState = {
  requestParsingCompleted: boolean;
  schemaValidationCompleted: boolean;
  turnstileAttempted: boolean;
  turnstileReturnedSuccess: boolean | null;
  turnstileErrorCodes: string;
  hostnameComparisonPassed: boolean | null;
  actionComparisonPassed: boolean | null;
};

function preForwardRejection(
  requestId: string,
  errorCode: PreForwardErrorCode,
  stage: PreForwardStage,
  status: number,
  state: DiagnosticState,
  extra: Record<string, unknown> = {},
): Response {
  logPreForwardDiagnostic(
    requestId,
    errorCode,
    stage,
    status,
    new Date().toISOString(),
    state.requestParsingCompleted,
    state.schemaValidationCompleted,
    state.turnstileAttempted,
    state.turnstileReturnedSuccess,
    state.turnstileErrorCodes,
    state.hostnameComparisonPassed,
    state.actionComparisonPassed,
    false,
  );
  return jsonResponse(
    {
      success: false,
      stored: false,
      status: "rejected",
      errorCode,
      ...extra,
    },
    status,
    requestId,
  );
}

const INITIAL_DIAGNOSTIC_STATE: DiagnosticState = {
  requestParsingCompleted: false,
  schemaValidationCompleted: false,
  turnstileAttempted: false,
  turnstileReturnedSuccess: null,
  turnstileErrorCodes: "",
  hostnameComparisonPassed: null,
  actionComparisonPassed: null,
};

function isPageEnabled(env: IntakeBindings): boolean {
  return env.FORM_PAGE_ENABLED === "true";
}

function areSubmissionsEnabled(env: IntakeBindings): boolean {
  return isPageEnabled(env) && env.FORM_SUBMISSIONS_ENABLED === "true";
}

function isFormPath(pathname: string): boolean {
  return pathname === FORM_PATH || pathname.startsWith(`${FORM_PATH}/`);
}

async function formNotFound(request: Request, env: WorkerBindings): Promise<Response> {
  const notFoundUrl = new URL("/404.html", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(notFoundUrl, { method: "GET" }));
  const headers = new Headers(assetResponse.headers);
  headers.delete("Content-Length");
  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: 404,
    headers,
  });
}

export async function handleIntakeApi(request: Request, env: IntakeBindings, definition: IntakeDefinition = PRIMARY_DEFINITION, forward: typeof sendToAppsScript = sendToAppsScript): Promise<Response> {
  const requestId = diagnosticRequestId(request);
  const url = new URL(request.url);

  if (url.pathname === `${definition.apiPath}/config` && request.method === "GET") {
    const configuredSiteKey = env.TURNSTILE_SITE_KEY !== "CONFIGURE_BEFORE_PRODUCTION_LAUNCH";
    return jsonResponse(
      {
        enabled: areSubmissionsEnabled(env) && configuredSiteKey,
        siteKey: configuredSiteKey ? env.TURNSTILE_SITE_KEY : "",
        action: definition.action,
      },
      200,
      requestId,
    );
  }

  if (url.pathname !== definition.apiPath) return jsonResponse({ error: "Not found." }, 404, requestId);
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, requestId);
  if (!areSubmissionsEnabled(env)) {
    return preForwardRejection(requestId, "SUBMISSIONS_DISABLED", "release_gate", 503, INITIAL_DIAGNOSTIC_STATE, {
      error: "This form is not accepting submissions yet.",
    });
  }
  if (!isSameOrigin(request)) {
    return preForwardRejection(requestId, "INVALID_ORIGIN", "origin_validation", 400, INITIAL_DIAGNOSTIC_STATE, {
      error: "Invalid request.",
    });
  }
  if (!isJson(request)) {
    return preForwardRejection(
      requestId,
      "INVALID_CONTENT_TYPE",
      "content_type_validation",
      400,
      INITIAL_DIAGNOSTIC_STATE,
      { error: "Invalid request." },
    );
  }

  const startedAt = Date.now();
  const deadline = new Deadline(WORKER_RECEIPT_TIMEOUT_MS, "WORKER_RECEIPT_TIMEOUT");
  const progress: { stage: ReceiptStage } = { stage: "request_reading" };
  try {
    return await deadline.wait(handleIntakeSubmission(request, env, definition, forward, requestId, deadline, progress));
  } catch (error) {
    const failure = error instanceof ReceiptFailure ? error : new ReceiptFailure(
      error instanceof DeadlineExceeded ? "WORKER_RECEIPT_TIMEOUT" : "UPSTREAM_TRANSPORT_FAILURE",
      progress.stage,
    );
    logReceiptDiagnostic(requestId, failure.code, failure.stage, Date.now() - startedAt);
    return jsonResponse(
      {
        success: false,
        stored: false,
        status: "upstream_failure",
        errorCode: failure.code,
        error: "We could not confirm that your profile was received. Your answers remain on this page. Please try again or contact Luke.",
      },
      503,
      requestId,
    );
  } finally {
    deadline.dispose();
  }
}

async function handleIntakeSubmission(
  request: Request,
  env: IntakeBindings,
  definition: IntakeDefinition,
  forward: typeof sendToAppsScript,
  requestId: string,
  deadline: Deadline,
  progress: { stage: ReceiptStage },
): Promise<Response> {
  let body: unknown;
  try {
    body = await readLimitedJson(request, deadline);
  } catch (error) {
    if (error instanceof DeadlineExceeded) throw error;
    if (error instanceof BodyReadError) {
      return preForwardRejection(
        requestId,
        error.code,
        error.code === "INVALID_JSON" ? "json_parsing" : "request_reading",
        error.status,
        INITIAL_DIAGNOSTIC_STATE,
        { error: error.status === 413 ? "The form data is too large." : "Invalid request." },
      );
    }
    return preForwardRejection(
      requestId,
      "UNKNOWN_PREFORWARD_REJECTION",
      "unknown_preforward",
      400,
      INITIAL_DIAGNOSTIC_STATE,
      { error: "Invalid request." },
    );
  }

  let validation: IntakeValidation;
  try {
    validation = definition.validate(body);
  } catch {
    return preForwardRejection(
      requestId,
      "UNKNOWN_PREFORWARD_REJECTION",
      "unknown_preforward",
      400,
      { ...INITIAL_DIAGNOSTIC_STATE, requestParsingCompleted: true },
      { error: "Invalid request." },
    );
  }
  if (!validation.ok) {
    const errorCode = validationErrorCode(body, validation, definition.formVersion);
    return preForwardRejection(
      requestId,
      errorCode,
      "payload_validation",
      400,
      {
        ...INITIAL_DIAGNOSTIC_STATE,
        requestParsingCompleted: true,
        schemaValidationCompleted: true,
      },
      { error: "Some information is missing or invalid.", fieldErrors: validation.errors },
    );
  }

  if (validation.request.honeypot) {
    return preForwardRejection(
      requestId,
      "HONEYPOT_REJECTED",
      "honeypot_validation",
      202,
      {
        ...INITIAL_DIAGNOSTIC_STATE,
        requestParsingCompleted: true,
        schemaValidationCompleted: true,
      },
    );
  }

  deadline.check();
  progress.stage = "turnstile_verification";
  const turnstileResult = await verifyTurnstile(
    validation.request.turnstileToken,
    validation.request.submission.submissionId,
    request.headers.get("CF-Connecting-IP") ?? "",
    env,
    definition.action,
    deadline.signal,
  );
  deadline.check();
  if (!turnstileResult.ok) {
    const stage: PreForwardStage = turnstileResult.errorCode === "TURNSTILE_ACTION_MISMATCH"
      ? "turnstile_action_validation"
      : turnstileResult.errorCode === "TURNSTILE_HOSTNAME_MISMATCH"
        ? "turnstile_hostname_validation"
        : turnstileResult.errorCode === "TURNSTILE_RESPONSE_INVALID"
          ? "turnstile_response_validation"
          : "turnstile_verification";
    return preForwardRejection(
      requestId,
      turnstileResult.errorCode,
      stage,
      400,
      {
        requestParsingCompleted: true,
        schemaValidationCompleted: true,
        turnstileAttempted: true,
        turnstileReturnedSuccess: turnstileResult.returnedSuccess,
        turnstileErrorCodes: turnstileResult.errorCodes,
        hostnameComparisonPassed: turnstileResult.hostnameComparisonPassed,
        actionComparisonPassed: turnstileResult.actionComparisonPassed,
      },
      { error: "Complete the security check again and retry." },
    );
  }

  progress.stage = "upstream_forward";
  const accepted = await deadline.wait(forward(validation.request.submission, env, deadline.signal));
  return jsonResponse(accepted, accepted.status === "created" ? 201 : 200, requestId);
}

export async function handleWorkerRequest(request: Request, env: WorkerBindings): Promise<Response> {
  const url = new URL(request.url);
  const redirects: Record<string, string> = {
    "/support-services/": "/education-send-support/",
    "/support-services/ehcp-support/": "/education-send-support/send-ehcp/",
    "/support-services/private-exams/": "/education-send-support/private-exams-access-arrangements/",
  };
  const redirectTarget = redirects[url.pathname];
  if (redirectTarget) return Response.redirect(new URL(redirectTarget, url).toString(), 301);
  for (const [definition, isolatedEnv] of [
    [secondaryDefinition, secondaryBindings(env)],
    [adhdDefinition, adhdBindings(env)],
  ] as const) {
    if (url.pathname === definition.apiPath || url.pathname.startsWith(definition.apiPath + "/")) return handleIntakeApi(request, isolatedEnv, definition);
    if ((url.pathname === definition.formPath || url.pathname.startsWith(definition.formPath + "/")) && !isPageEnabled(isolatedEnv)) return formNotFound(request, env);
  }
  if (url.pathname.startsWith("/api/forms/")) return handleIntakeApi(request, env);
  if (isFormPath(url.pathname) && !isPageEnabled(env)) return formNotFound(request, env);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
