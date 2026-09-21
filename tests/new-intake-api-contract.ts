import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleIntakeApi, type IntakeDefinition } from "../src/worker";
import type { IntakeBindings } from "../src/intake/submission";
export function newIntakeApiContract(definition: IntakeDefinition, fixture: () => Record<string, unknown>) {
    const origin = "https://www.thementorsphere.co.uk", url = origin + definition.apiPath;
    const env: IntakeBindings = { FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "true", TURNSTILE_SITE_KEY: "fictional-site-key", TURNSTILE_SECRET_KEY: "fictional-secret", TURNSTILE_EXPECTED_HOSTNAMES: "www.thementorsphere.co.uk", TURNSTILE_TEST_MODE: "false", INTAKE_APPS_SCRIPT_URL: "https://script.google.test/macros/s/isolated/exec", INTAKE_HMAC_SECRET: "fictional-isolated-hmac-secret" };
    function request(body: unknown, headers: Record<string, string> = {}) { return new Request(url, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }); }
    function success() { return Response.json({ success: true, hostname: "www.thementorsphere.co.uk", action: definition.action }); }
    beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => { }); });
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
    it.each(["wrong-version", "invalid-id", "missing-token", "honeypot", "wrong-content-type", "wrong-origin"])("rejects %s without forwarding", async (scenario) => {
        const body = fixture();
        const headers: Record<string, string> = {};
        if (scenario === "wrong-version")
            body.formVersion = "primary-learner-profile-v5";
        if (scenario === "invalid-id")
            body.submissionId = "invalid";
        if (scenario === "missing-token")
            body.turnstileToken = "";
        if (scenario === "honeypot")
            body.honeypot = "spam";
        if (scenario === "wrong-content-type")
            headers["Content-Type"] = "text/plain";
        if (scenario === "wrong-origin")
            headers.Origin = "https://example.test";
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const response = await handleIntakeApi(request(body, headers), env, definition);
        expect(response.status).toBe(scenario === "honeypot" ? 202 : 400);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(await response.json()).toMatchObject({ success: false, stored: false, status: "rejected" });
    });
    it.each(["{", "null", "[]"])("rejects invalid JSON/object %s", async (body) => { vi.stubGlobal("fetch", vi.fn()); const response = await handleIntakeApi(new Request(url, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body }), env, definition); expect(response.status).toBe(400); });
    it.each(["hostname", "action", "expired-token", "malformed-turnstile", "verification-timeout"])("rejects %s with safe diagnostics", async (scenario) => {
        const result: Record<string, unknown> = { success: true, hostname: "www.thementorsphere.co.uk", action: definition.action };
        if (scenario === "hostname")
            result.hostname = "example.test";
        if (scenario === "action")
            result.action = "primary_learner_profile";
        if (scenario === "expired-token") {
            result.success = false;
            result["error-codes"] = ["timeout-or-duplicate"];
        }
        if (scenario === "malformed-turnstile")
            delete result.success;
        const fetchMock = vi.fn(async () => { if (scenario === "verification-timeout")
            throw new Error("timeout secret answer"); return Response.json(result); });
        vi.stubGlobal("fetch", fetchMock);
        const response = await handleIntakeApi(request(fixture()), env, definition);
        expect(response.status).toBe(400);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
        expect(logs).not.toMatch(/alex@example|Alex|Sam|fictional-secret|fictional-turnstile-token|secret answer/u);
        expect(logs).toContain("intake_preforward_rejection");
        expect(response.headers.get("X-MentorSphere-Request-ID")).toMatch(/^[0-9a-f-]{36}$/u);
    });
    it.each([true, false])("accepts durable created with notificationSent=%s", async (notificationSent) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(success()).mockResolvedValueOnce(Response.json({ success: true, stored: true, status: "created", notificationSent })));
        const response = await handleIntakeApi(request(fixture()), env, definition);
        expect(response.status).toBe(201);
        expect(await response.json()).toMatchObject({ success: true, stored: true, status: "created", notificationSent });
    });
    it("accepts only a verified durable duplicate", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(success()).mockResolvedValueOnce(Response.json({ success: true, stored: false, status: "duplicate", existingRecordVerified: true }))); const response = await handleIntakeApi(request(fixture()), env, definition); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ status: "duplicate", existingRecordVerified: true }); });
    it.each(["stale-duplicate", "unverified-duplicate", "malformed-json", "wrong-type", "no-contract", "upstream-timeout", "oversized-response"])("preserves retryable failure on %s", async (scenario) => {
        const fetchMock = vi.fn().mockResolvedValueOnce(success()).mockImplementationOnce(async () => {
            if (scenario === "upstream-timeout")
                throw new Error("timeout");
            if (scenario === "malformed-json")
                return new Response("{", { headers: { "Content-Type": "application/json" } });
            if (scenario === "wrong-type")
                return new Response("<html>Unexpected sign-in page</html>");
            if (scenario === "oversized-response")
                return new Response(" ".repeat(16385), { headers: { "Content-Type": "application/json" } });
            return Response.json(scenario === "stale-duplicate" ? { success: false, stored: false, status: "duplicate_without_record" } : scenario === "unverified-duplicate" ? { success: true, stored: false, status: "duplicate" } : { success: true });
        });
        vi.stubGlobal("fetch", fetchMock);
        const response = await handleIntakeApi(request(fixture()), env, definition);
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ success: false, stored: false, status: "upstream_failure" });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it("uses its own Turnstile action in config", async () => { const response = await handleIntakeApi(new Request(url + "/config"), env, definition); expect(await response.json()).toMatchObject({ action: definition.action, enabled: true }); });
    it.each(["FORM_PAGE_ENABLED", "FORM_SUBMISSIONS_ENABLED"])("fails closed behind %s", async (flag) => { const response = await handleIntakeApi(request(fixture()), { ...env, [flag]: "false" }, definition); expect(response.status).toBe(503); });
    it("rejects oversized request before parsing", async () => { const body = fixture(); body.unknown = "x".repeat(32768); const response = await handleIntakeApi(request(body), env, definition); expect(response.status).toBe(413); });
}
