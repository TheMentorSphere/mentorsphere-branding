import { afterEach, describe, expect, it, vi } from "vitest";
import preview from "../src/preview/secondary-preview";
import { validSecondaryRequest } from "./secondary-fixtures";
import { readFile } from "node:fs/promises";
const assets = { fetch: vi.fn(async () => new Response("preview asset")) };
const env = { ASSETS: assets };
const base = "https://preview.example.workers.dev";
const api = "/api/forms/secondary-learner-profile";
const request = (scenario: string) => new Request(base + api, { method: "POST", headers: { Origin: base, "Content-Type": "application/json", "X-MentorSphere-Preview-Scenario": scenario }, body: JSON.stringify(validSecondaryRequest()) });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); assets.fetch.mockClear(); });
describe("isolated owner preview", () => {
    it("rejects custom production hostnames and never serves Primary or the other form", async () => {
        expect((await preview.fetch(new Request("https://www.thementorsphere.co.uk/forms/secondary-learner-profile/"), env)).status).toBe(404);
        for (const path of ["/forms/primary-learner-profile/", "/api/forms/primary-learner-profile", "/forms/adhd-coaching-intake/"])
            expect((await preview.fetch(new Request(base + path), env)).status).toBe(404);
        expect(assets.fetch).not.toHaveBeenCalled();
    });
    it("only publishes the test site key and separate action", async () => {
        const response = await preview.fetch(new Request(base + api + "/config"), env);
        expect(await response.json()).toMatchObject({ enabled: true, siteKey: "1x00000000000000000000AA", action: "secondary_learner_profile" });
        expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
    it.each(["created", "duplicate", "failure", "malformed", "stale-duplicate"])("simulates %s after real validation and verification without forwarding answers", async (scenario) => {
        const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({ success: true }));
        vi.stubGlobal("fetch", fetchMock);
        const response = await preview.fetch(request(scenario), env);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
        const options = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
        expect(String(options?.body)).not.toContain("respondent");
        if (scenario === "malformed")
            await expect(response.json()).rejects.toThrow();
        else if (scenario === "failure")
            expect(response.status).toBe(503);
        else
            expect(await response.json()).toMatchObject({ status: scenario === "stale-duplicate" ? "duplicate" : scenario });
    });
    it("rejects invalid payloads before any simulated success", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const response = await preview.fetch(new Request(base + api, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: "{}" }), env);
        expect(response.status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it("keeps deployment configuration isolated with invocation logging disabled", async () => {
        const config = JSON.parse(await readFile("wrangler.secondary-preview.jsonc", "utf8"));
        expect(config.routes).toEqual([]);
        expect(config.workers_dev).toBe(true);
        expect(config.secrets).toBeUndefined();
        expect(config.observability.logs.invocation_logs).toBe(false);
    });
});
