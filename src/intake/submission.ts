import type { ValidatedIntakeSubmission } from "./validation";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "primary_learner_profile";
const UPSTREAM_RESPONSE_LIMIT = 16_384;

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

interface TurnstileResult {
  success?: boolean;
  action?: string;
  hostname?: string;
}

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

async function signBody(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return base64Url(new Uint8Array(signature));
}

async function readLimitedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) throw new Error("Response too large");
      text += decoder.decode(result.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function verifyTurnstile(
  token: string,
  submissionId: string,
  remoteIp: string,
  env: IntakeBindings,
): Promise<boolean> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    idempotency_key: submissionId,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResult;
  const hostnames = new Set(
    env.TURNSTILE_EXPECTED_HOSTNAMES.split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
  if (env.TURNSTILE_TEST_MODE === "true") {
    return result.success === true;
  }
  return (
    result.success === true &&
    result.action === TURNSTILE_ACTION &&
    typeof result.hostname === "string" &&
    hostnames.has(result.hostname.toLowerCase())
  );
}

export async function sendToAppsScript(
  submission: ValidatedIntakeSubmission,
  env: IntakeBindings,
): Promise<IntakeAcceptedResponse> {
  const body = JSON.stringify({
    issuedAt: new Date().toISOString(),
    payload: submission,
  });
  const signature = await signBody(body, env.INTAKE_HMAC_SECRET);
  const response = await fetch(env.INTAKE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ body, signature }),
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Submission destination returned an HTTP error");
  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) throw new Error("Submission destination returned an unexpected content type");
  const responseText = await readLimitedText(response.body, UPSTREAM_RESPONSE_LIMIT);
  let result: unknown;
  try {
    result = JSON.parse(responseText) as unknown;
  } catch {
    throw new Error("Submission destination returned invalid JSON");
  }
  if (!isRecord(result)) throw new Error("Submission destination returned an invalid response");
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
  throw new Error("Submission destination did not confirm durable storage");
}

export const turnstileAction = TURNSTILE_ACTION;
