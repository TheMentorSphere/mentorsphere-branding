import { sendToAppsScript, turnstileAction, verifyTurnstile, type IntakeBindings } from "./intake/submission";
import {
  logPreForwardDiagnostic,
  type PreForwardErrorCode,
  type PreForwardStage,
} from "./intake/diagnostics";
import { FORM_VERSION, validateIntakeRequest, type ValidationResult } from "./intake/validation";

const API_PATH = "/api/forms/primary-learner-profile";
const CONFIG_PATH = `${API_PATH}/config`;
const FORM_PATH = "/forms/primary-learner-profile";
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

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) throw new BodyReadError("REQUEST_TOO_LARGE", 413);
  if (!request.body) throw new BodyReadError("REQUEST_BODY_UNREADABLE", 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_REQUEST_BYTES) throw new BodyReadError("REQUEST_TOO_LARGE", 413);
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
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

function validationErrorCode(body: unknown, validation: ValidationResult): PreForwardErrorCode {
  if (!isRecord(body)) return "PAYLOAD_NOT_OBJECT";
  if (body.formVersion !== FORM_VERSION) return "INVALID_FORM_VERSION";
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

export async function handleIntakeApi(request: Request, env: IntakeBindings): Promise<Response> {
  const requestId = diagnosticRequestId(request);
  const url = new URL(request.url);

  if (url.pathname === CONFIG_PATH && request.method === "GET") {
    const configuredSiteKey = env.TURNSTILE_SITE_KEY !== "CONFIGURE_BEFORE_PRODUCTION_LAUNCH";
    return jsonResponse(
      {
        enabled: areSubmissionsEnabled(env) && configuredSiteKey,
        siteKey: configuredSiteKey ? env.TURNSTILE_SITE_KEY : "",
        action: turnstileAction,
      },
      200,
      requestId,
    );
  }

  if (url.pathname !== API_PATH) return jsonResponse({ error: "Not found." }, 404, requestId);
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

  let body: unknown;
  try {
    body = await readLimitedJson(request);
  } catch (error) {
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

  let validation: ValidationResult;
  try {
    validation = validateIntakeRequest(body);
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
    const errorCode = validationErrorCode(body, validation);
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

  const turnstileResult = await verifyTurnstile(
    validation.request.turnstileToken,
    validation.request.submission.submissionId,
    request.headers.get("CF-Connecting-IP") ?? "",
    env,
  );
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

  try {
    const accepted = await sendToAppsScript(validation.request.submission, env);
    return jsonResponse(accepted, accepted.status === "created" ? 201 : 200, requestId);
  } catch {
    return jsonResponse(
      {
        success: false,
        stored: false,
        status: "upstream_failure",
        error: "We could not confirm that your profile was received. Your answers remain on this page. Please try again or contact Luke.",
      },
      503,
      requestId,
    );
  }
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
  if (url.pathname.startsWith("/api/forms/")) return handleIntakeApi(request, env);
  if (isFormPath(url.pathname) && !isPageEnabled(env)) return formNotFound(request, env);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
