import { afterEach, describe, expect, it, vi } from "vitest";
import { handleIntakeApi, handleWorkerRequest, type WorkerBindings } from "../src/worker";
import type { IntakeBindings } from "../src/intake/submission";
import { validIntakeRequest } from "./fixtures";

const API_URL = "https://www.thementorsphere.co.uk/api/forms/primary-learner-profile";
const LEARNER_CANNOT_CONSENT =
  "The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.";
const LEARNER_AUTHORISED =
  "The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.";

function bindings(overrides: Partial<IntakeBindings> = {}): IntakeBindings {
  return {
    FORM_PAGE_ENABLED: "true",
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

function workerBindings(overrides: Partial<IntakeBindings> = {}): WorkerBindings {
  return {
    ...bindings(overrides),
    ASSETS: {
      async fetch(input: Request): Promise<Response> {
        const pathname = new URL(input.url).pathname;
        if (pathname === "/404.html" || pathname === "/missing/") {
          return new Response("<h1>Page not found</h1>", {
            status: pathname === "/404.html" ? 200 : 404,
            headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" },
          });
        }
        if (pathname === "/forms/primary-learner-profile" || pathname === "/forms/primary-learner-profile/") {
          return new Response("<h1>Learner Profile: Primary Years</h1>", {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        if (pathname === "/") return new Response("<h1>The MentorSphere</h1>", { status: 200 });
        return new Response("asset", { status: 200 });
      },
    },
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
      return appsStatus === "created"
        ? Response.json({ success: true, stored: true, status: "created", notificationSent: true })
        : Response.json({ success: true, stored: false, status: "duplicate", existingRecordVerified: true });
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

  it("rejects a crafted narrative answer when special-category information is declined", async () => {
    const body = validIntakeRequest();
    (body.supportProfile as Record<string, unknown>).supportNeeds = "Crafted fictional detail";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleIntakeApi(request(body), bindings());
    const result = await response.json() as { fieldErrors?: Record<string, string> };

    expect(response.status).toBe(400);
    expect(result.fieldErrors?.["supportProfile.specialCategoryProvided"]).toContain("complete the Part 3 consent controls");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([LEARNER_CANNOT_CONSENT, LEARNER_AUTHORISED])(
    "forwards the permitted learner consent route",
    async (learnerConsentRoute) => {
      const body = validIntakeRequest();
      (body.supportProfile as Record<string, unknown>).specialCategoryProvided = true;
      (body.confirmations as Record<string, unknown>).specialCategoryConsent = true;
      (body.confirmations as Record<string, unknown>).specialCategoryAuthority = true;
      (body.confirmations as Record<string, unknown>).learnerConsentRoute = learnerConsentRoute;
      const fetchSpy = mockSuccessfulUpstreams();

      const response = await handleIntakeApi(request(body), bindings());

      expect(response.status).toBe(201);
      const appsCall = fetchSpy.mock.calls.find(([input, init]) => new Request(input, init).url.includes("script.google.test"));
      if (!appsCall) throw new Error("Expected an Apps Script request");
      const envelope = await new Request(appsCall[0], appsCall[1]).json() as { body: string };
      expect(JSON.parse(envelope.body)).toMatchObject({ payload: { confirmations: { learnerConsentRoute } } });
    },
  );

  it("silently accepts a filled honeypot without forwarding the response", async () => {
    const body = validIntakeRequest();
    body.honeypot = "bot value";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleIntakeApi(request(body), bindings());
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: false, stored: false, status: "rejected" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates Turnstile and sends an HMAC-signed request to Apps Script", async () => {
    const fetchSpy = mockSuccessfulUpstreams();
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      stored: true,
      status: "created",
      notificationSent: true,
    });
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

  it("returns a distinct verified duplicate response", async () => {
    mockSuccessfulUpstreams("duplicate");
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      stored: false,
      status: "duplicate",
      existingRecordVerified: true,
    });
  });

  it.each([
    {
      name: "an unverified duplicate",
      response: () => Response.json({ success: true, stored: false, status: "duplicate" }),
    },
    {
      name: "a stale duplicate marker",
      response: () => Response.json({ success: false, stored: false, status: "duplicate_without_record" }),
    },
    {
      name: "invalid JSON",
      response: () => new Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } }),
    },
    {
      name: "an unexpected content type",
      response: () => new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } }),
    },
    {
      name: "a misleading JSON content-type prefix",
      response: () => new Response(
        JSON.stringify({ success: true, stored: true, status: "created", notificationSent: true }),
        { status: 200, headers: { "Content-Type": "application/jsonp" } },
      ),
    },
    {
      name: "missing contract fields",
      response: () => Response.json({ success: true }),
    },
    {
      name: "an upstream HTTP error",
      response: () => Response.json({ success: false }, { status: 500 }),
    },
  ])("fails safely when Apps Script returns $name", async ({ response: appsResponse }) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const outbound = new Request(input, init);
      if (outbound.url.includes("challenges.cloudflare.com")) {
        return Response.json({
          success: true,
          action: "primary_learner_profile",
          hostname: "www.thementorsphere.co.uk",
        });
      }
      return appsResponse();
    });

    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      stored: false,
      status: "upstream_failure",
    });
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
        return Response.json({ success: true, hostname: "localhost", action: "test" });
      }
      return Response.json({ success: true, stored: true, status: "created", notificationSent: false });
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
      Response.json({ success: true, hostname: "localhost", action: "test" }),
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
      return Response.json({ success: false, stored: false, status: "rejected" });
    });
    const response = await handleIntakeApi(request(validIntakeRequest()), bindings());
    expect(response.status).toBe(503);
    const result = await response.json() as { error?: string };
    expect(result.error).toContain("could not confirm");
    expect(JSON.stringify(result)).not.toContain("Sam");
  });

  it("rejects bodies over the configured size limit", async () => {
    const oversized = { ...validIntakeRequest(), padding: "x".repeat(40_000) };
    const response = await handleIntakeApi(request(oversized), bindings());
    expect(response.status).toBe(413);
  });
});

describe("primary learner profile page release control", () => {
  it.each([
    "/forms/primary-learner-profile",
    "/forms/primary-learner-profile/",
    "/forms/primary-learner-profile/nested-test-path",
  ])("returns the normal 404 response for %s when the page is disabled", async (pathname) => {
    const env = workerBindings({ FORM_PAGE_ENABLED: "false", FORM_SUBMISSIONS_ENABLED: "false" });
    const gated = await handleWorkerRequest(new Request(`https://www.thementorsphere.co.uk${pathname}`), env);
    const normalMissing = await handleWorkerRequest(new Request("https://www.thementorsphere.co.uk/missing/"), env);

    expect(gated.status).toBe(404);
    expect(await gated.text()).toBe(await normalMissing.text());
    expect(gated.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("loads the form page when the page is enabled", async () => {
    const response = await handleWorkerRequest(
      new Request("https://www.thementorsphere.co.uk/forms/primary-learner-profile/"),
      workerBindings({ FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "false" }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Learner Profile: Primary Years");
  });

  it("keeps the API unavailable when submissions are disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await handleIntakeApi(
      request(validIntakeRequest()),
      bindings({ FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "false" }),
    );

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats page-disabled with submissions-enabled as an invalid disabled configuration", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const invalid = bindings({ FORM_PAGE_ENABLED: "false", FORM_SUBMISSIONS_ENABLED: "true" });
    const configResponse = await handleIntakeApi(new Request(`${API_URL}/config`), invalid);
    const submissionResponse = await handleIntakeApi(request(validIntakeRequest()), invalid);

    await expect(configResponse.json()).resolves.toMatchObject({ enabled: false });
    expect(submissionResponse.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("continues to serve existing pages and the custom 404", async () => {
    const env = workerBindings({ FORM_PAGE_ENABLED: "false", FORM_SUBMISSIONS_ENABLED: "false" });
    const homepage = await handleWorkerRequest(new Request("https://www.thementorsphere.co.uk/"), env);
    const missing = await handleWorkerRequest(new Request("https://www.thementorsphere.co.uk/missing/"), env);

    expect(homepage.status).toBe(200);
    expect(await homepage.text()).toContain("The MentorSphere");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("Page not found");
  });
});
