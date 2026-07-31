import { afterEach, describe, expect, it, vi } from "vitest";
import { handleIntakeApi } from "../src/worker";
import type { IntakeBindings } from "../src/intake/submission";
import { validIntakeRequest } from "./fixtures";

const API_URL = "https://www.thementorsphere.co.uk/api/forms/primary-learner-profile";

function bindings(overrides: Partial<IntakeBindings> = {}): IntakeBindings {
  return {
    FORM_SUBMISSIONS_ENABLED: "true",
    TURNSTILE_SITE_KEY: "fictional-site-key",
    TURNSTILE_SECRET_KEY: "fictional-turnstile-secret",
    TURNSTILE_EXPECTED_HOSTNAMES: "www.thementorsphere.co.uk",
    TURNSTILE_TEST_MODE: "false",
    INTAKE_APPS_SCRIPT_URL: "https://script.google.test/macros/s/example/exec",
    INTAKE_HMAC_SECRET: "fictional-hmac-secret-with-enough-entropy",
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.thementorsphere.co.uk",
      "CF-Connecting-IP": "192.0.2.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function mockSuccessfulUpstreams(appsStatus: "created" | "duplicate" = "created") {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const outbound = new Request(input, init);
    if (outbound.url.includes("challenges.cloudflare.com")) {
      return Response.json({
        success: true,
        action: "primary_learner_profile",
        hostname: "www.thementorsphere.co.uk",
      });
    }
    if (outbound.url === "https://script.google.test/macros/s/example/exec") {
      return Response.json({ ok: true, status: appsStatus });
    }
    throw new Error(`Unexpected outbound request: ${outbound.url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("primary learner profile Worker", () => {
  it("keeps the public submission configuration disabled by default", async () => {
    const response = await handleIntakeApi(
      new Request(`${API_URL}/config`),
      bindings({ FORM_SUBMISSIONS_ENABLED: "false", TURNSTILE_SITE_KEY: "CONFIGURE_BEFORE_PRODUCTION_LAUNCH" }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ enabled: false, siteKey: "" });
  });

  it("rejects cross-origin submissions", async () => {
    const response = await handleIntakeApi(request(validIntakeRequest(), { Origin: "https://attacker.example" }), bindings());
    expect(response.status).toBe(400);
    expect(vi.spyOn(globalThis, "fetch")).not.toHaveBeenCalled();
  });

  it("returns field errors before calling any upstream service", async () => {
    const body = validIntakeRequest();
    const respondent = body.respondent as Record<string, unknown>;
    respondent.email = "invalid";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleIntakeApi(request(body), bindings());
    expect(response.status).toBe(400);
    const result = await response.json() as { fieldErrors?: Record<string, string> };
    expect(result.fieldErrors?.["respondent.email"]).toBe("Enter a valid email address.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("silently accepts a filled honeypot without forwarding the response", async () => {
    const body = validIntakeRequest();
    body.honeypot = "bot value";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleIntakeApi(request(body), bindings());
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates Turnstile and sends an HMAC-signed request to Apps Script", async () => {
    const fetchSpy = mockSuccessfulUpstreams();
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const appsCall = fetchSpy.mock.calls.find(([input, init]) => new Request(input, init).url.includes("script.google.test"));
    expect(appsCall).toBeDefined();
    if (!appsCall) throw new Error("Expected an Apps Script request");
    const appsRequest = new Request(appsCall[0], appsCall[1]);
    const envelope = await appsRequest.json() as { body: string; signature: string };
    expect(envelope.signature).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(JSON.parse(envelope.body)).toMatchObject({
      payload: { submissionId: "123e4567-e89b-42d3-a456-426614174000" },
    });
    expect(JSON.stringify(envelope)).not.toContain("fictional-hmac-secret-with-enough-entropy");
  });

  it("treats an Apps Script duplicate response as success", async () => {
    mockSuccessfulUpstreams("duplicate");
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(201);
  });

  it("rejects a failed Turnstile result without contacting Apps Script", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ success: false }));
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("accepts Cloudflare's published test-key response only in explicit test mode", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const outbound = new Request(input, init);
      if (outbound.url.includes("challenges.cloudflare.com")) {
        return Response.json({ success: true, hostname: "example.com", metadata: { result_with_testing_key: true } });
      }
      return Response.json({ ok: true, status: "created" });
    });
    const response = await handleIntakeApi(
      request(validIntakeRequest()),
      bindings({ TURNSTILE_TEST_MODE: "true" }),
    );
    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("rejects a test-key response when test mode is disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ success: true, hostname: "example.com", metadata: { result_with_testing_key: true } }),
    );
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns a generic retryable error when Apps Script fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const outbound = new Request(input, init);
      if (outbound.url.includes("challenges.cloudflare.com")) {
        return Response.json({ success: true, action: "primary_learner_profile", hostname: "www.thementorsphere.co.uk" });
      }
      return Response.json({ ok: false, status: "rejected" });
    });
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(503);
    const result = await response.json() as { error?: string };
    expect(result.error).toContain("could not be submitted");
    expect(JSON.stringify(result)).not.toContain("Sam");
  });

  it("rejects bodies over the configured size limit", async () => {
    const oversized = { ...validIntakeRequest(), padding: "x".repeat(40_000) };
    const response = await handleIntakeApi(request(oversized), bindings());
    expect(response.status).toBe(413);
  });
});
