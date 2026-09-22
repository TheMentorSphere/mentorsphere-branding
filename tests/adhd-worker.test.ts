import { describe, expect, it, vi } from "vitest";
import { adhdDefinition, adhdBindings } from "../src/intake/adhd";
import { handleIntakeApi, handleWorkerRequest, type WorkerBindings } from "../src/worker";
import type { IntakeBindings } from "../src/intake/submission";
import { section } from "./secondary-fixtures";
import { newIntakeApiContract } from "./new-intake-api-contract";
import { validAdhdRequest } from "./adhd-fixtures";
describe("ADHD API security contract", () => newIntakeApiContract(adhdDefinition, validAdhdRequest));

describe('ADHD API service boundary', () => {
    for (const route of ['child', 'combined']) {
        it.each(['9', '18'])(`${route} rejects age %s before Turnstile or forwarding`, async age => {
            const payload = validAdhdRequest(route);
            section(payload, 'child').age = age;
            const fetchMock = vi.fn();
            const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.stubGlobal('fetch', fetchMock);
            try {
                const origin = 'https://example.test';
                const request = new Request(origin + adhdDefinition.apiPath, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const env = { FORM_PAGE_ENABLED: 'true', FORM_SUBMISSIONS_ENABLED: 'true', TURNSTILE_SECRET_KEY: 'fictional-key', INTAKE_APPS_SCRIPT_URL: 'https://script.google.test/exec', INTAKE_HMAC_SECRET: 'fictional-secret' } as IntakeBindings;
                const response = await handleIntakeApi(request, env, adhdDefinition);
                expect(response.status).toBe(400);
                expect(await response.json()).toMatchObject({ fieldErrors: { 'child.age': expect.any(String) } });
                expect(fetchMock).not.toHaveBeenCalled();
            } finally { vi.unstubAllGlobals(); warning.mockRestore(); }
        });
    }
});
describe("ADHD isolation", () => {
    const env: WorkerBindings = { TURNSTILE_SITE_KEY: "primary-key", TURNSTILE_SECRET_KEY: "primary-secret", TURNSTILE_EXPECTED_HOSTNAMES: "www.thementorsphere.co.uk", TURNSTILE_TEST_MODE: "false", FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "true", INTAKE_APPS_SCRIPT_URL: "https://primary.example.test/exec", INTAKE_HMAC_SECRET: "primary-secret", ADHD_INTAKE_PAGE_ENABLED: "true", ADHD_INTAKE_SUBMISSIONS_ENABLED: "true", ADHD_APPS_SCRIPT_URL: "https://adhd.example.test/exec", ADHD_HMAC_SECRET: "adhd-secret", ADHD_TURNSTILE_SECRET_KEY: "adhd-turnstile", ASSETS: { fetch: async () => new Response("asset") } };
    it("maps only dedicated credentials", () => { expect(adhdBindings(env)).toMatchObject({ INTAKE_APPS_SCRIPT_URL: "https://adhd.example.test/exec", INTAKE_HMAC_SECRET: "adhd-secret", TURNSTILE_SECRET_KEY: "adhd-turnstile", FORM_SUBMISSIONS_ENABLED: "true" }); });
    it("fails closed when credentials are missing or reused", () => { for (const changes of [{ ADHD_HMAC_SECRET: "" }, { ADHD_HMAC_SECRET: "primary-secret" }, { ADHD_APPS_SCRIPT_URL: env.INTAKE_APPS_SCRIPT_URL }, { SECONDARY_APPS_SCRIPT_URL: env.ADHD_APPS_SCRIPT_URL }])
        expect(adhdBindings({ ...env, ...changes }).FORM_SUBMISSIONS_ENABLED).toBe("false"); });
    it("does not borrow the Primary page flag", async () => { expect((await handleWorkerRequest(new Request("https://www.thementorsphere.co.uk/forms/adhd-coaching-intake/"), { ...env, ADHD_INTAKE_PAGE_ENABLED: "false" })).status).toBe(404); });
});
