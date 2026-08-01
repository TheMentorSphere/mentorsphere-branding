import { sendToAppsScript, turnstileAction, verifyTurnstile, type IntakeBindings } from "./intake/submission";
import { validateIntakeRequest } from "./intake/validation";

const API_PATH = "/api/forms/primary-learner-profile";
const CONFIG_PATH = `${API_PATH}/config`;
const FORM_PATH = "/forms/primary-learner-profile";
const MAX_REQUEST_BYTES = 32_768;

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
    "X-Request-ID": requestId,
  });
}

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return new Response(JSON.stringify(body), { status, headers: apiHeaders(requestId) });
}

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) throw new RangeError("Request too large");
  if (!request.body) throw new SyntaxError("Missing body");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_REQUEST_BYTES) throw new RangeError("Request too large");
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text) as unknown;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function isJson(request: Request): boolean {
  return request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json") ?? false;
}

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
  const requestId = crypto.randomUUID();
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
    return jsonResponse({ error: "This form is not accepting submissions yet." }, 503, requestId);
  }
  if (!isSameOrigin(request) || !isJson(request)) {
    return jsonResponse({ error: "Invalid request." }, 400, requestId);
  }

  let body: unknown;
  try {
    body = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: "The form data is too large." }, 413, requestId);
    return jsonResponse({ error: "Invalid request." }, 400, requestId);
  }

  const validation = validateIntakeRequest(body);
  if (!validation.ok) {
    return jsonResponse(
      { error: "Some information is missing or invalid.", fieldErrors: validation.errors },
      400,
      requestId,
    );
  }

  if (validation.request.honeypot) {
    return jsonResponse({ success: false, stored: false, status: "rejected" }, 202, requestId);
  }

  let turnstileValid = false;
  try {
    turnstileValid = await verifyTurnstile(
      validation.request.turnstileToken,
      validation.request.submission.submissionId,
      request.headers.get("CF-Connecting-IP") ?? "",
      env,
    );
  } catch {
    turnstileValid = false;
  }
  if (!turnstileValid) {
    return jsonResponse({ error: "Complete the security check again and retry." }, 400, requestId);
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
  if (url.pathname.startsWith("/api/forms/")) return handleIntakeApi(request, env);
  if (isFormPath(url.pathname) && !isPageEnabled(env)) return formNotFound(request, env);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleWorkerRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
