import { describe, expect, it } from "vitest";
import { secondaryDefinition, secondaryBindings } from "../src/intake/secondary";
import { handleWorkerRequest, type WorkerBindings } from "../src/worker";
import { newIntakeApiContract } from "./new-intake-api-contract";
import { validSecondaryRequest } from "./secondary-fixtures";
describe("Secondary API security contract", () => newIntakeApiContract(secondaryDefinition, validSecondaryRequest));
describe("Secondary isolation", () => {
    const env: WorkerBindings = { TURNSTILE_SITE_KEY: "primary-key", TURNSTILE_SECRET_KEY: "primary-secret", TURNSTILE_EXPECTED_HOSTNAMES: "www.thementorsphere.co.uk", TURNSTILE_TEST_MODE: "false", FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "true", INTAKE_APPS_SCRIPT_URL: "https://primary.example.test/exec", INTAKE_HMAC_SECRET: "primary-secret", SECONDARY_FORM_PAGE_ENABLED: "true", SECONDARY_FORM_SUBMISSIONS_ENABLED: "true", SECONDARY_APPS_SCRIPT_URL: "https://secondary.example.test/exec", SECONDARY_HMAC_SECRET: "secondary-secret", SECONDARY_TURNSTILE_SECRET_KEY: "secondary-turnstile", ASSETS: { fetch: async () => new Response("asset") } };
    it("maps only dedicated credentials", () => { expect(secondaryBindings(env)).toMatchObject({ INTAKE_APPS_SCRIPT_URL: "https://secondary.example.test/exec", INTAKE_HMAC_SECRET: "secondary-secret", TURNSTILE_SECRET_KEY: "secondary-turnstile", FORM_SUBMISSIONS_ENABLED: "true" }); });
    it("fails closed when credentials are missing or reused", () => { for (const changes of [{ SECONDARY_HMAC_SECRET: "" }, { SECONDARY_HMAC_SECRET: "primary-secret" }, { SECONDARY_APPS_SCRIPT_URL: env.INTAKE_APPS_SCRIPT_URL }, { ADHD_APPS_SCRIPT_URL: env.SECONDARY_APPS_SCRIPT_URL }])
        expect(secondaryBindings({ ...env, ...changes }).FORM_SUBMISSIONS_ENABLED).toBe("false"); });
    it("does not borrow the Primary page flag", async () => { expect((await handleWorkerRequest(new Request("https://www.thementorsphere.co.uk/forms/secondary-learner-profile/"), { ...env, SECONDARY_FORM_PAGE_ENABLED: "false" })).status).toBe(404); });
});
