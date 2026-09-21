import type { IntakeDefinition, WorkerBindings } from "../worker";
import type { IntakeBindings } from "./submission";
import { validateAdhdRequest } from "./adhd-validation";
export const adhdDefinition: IntakeDefinition = {
    apiPath: "/api/forms/adhd-coaching-intake", formPath: "/forms/adhd-coaching-intake",
    formVersion: "adhd-coaching-intake-v1", action: "adhd_coaching_intake", validate: validateAdhdRequest,
};
// Every missing value fails closed. Never fall back to Primary credentials or release flags.
export function adhdBindings(env: WorkerBindings): IntakeBindings {
    const endpoint = env.ADHD_APPS_SCRIPT_URL ?? "";
    const secret = env.ADHD_HMAC_SECRET ?? "";
    const isolated = Boolean(endpoint && secret && env.ADHD_TURNSTILE_SECRET_KEY) &&
        endpoint !== env.INTAKE_APPS_SCRIPT_URL && endpoint !== env.SECONDARY_APPS_SCRIPT_URL &&
        secret !== env.INTAKE_HMAC_SECRET && secret !== env.SECONDARY_HMAC_SECRET;
    return {
        FORM_PAGE_ENABLED: env.ADHD_INTAKE_PAGE_ENABLED ?? "false",
        FORM_SUBMISSIONS_ENABLED: isolated ? env.ADHD_INTAKE_SUBMISSIONS_ENABLED ?? "false" : "false",
        TURNSTILE_SITE_KEY: env.ADHD_TURNSTILE_SITE_KEY ?? "CONFIGURE_BEFORE_PRODUCTION_LAUNCH",
        TURNSTILE_SECRET_KEY: env.ADHD_TURNSTILE_SECRET_KEY ?? "",
        TURNSTILE_EXPECTED_HOSTNAMES: env.ADHD_TURNSTILE_EXPECTED_HOSTNAMES ?? "www.thementorsphere.co.uk",
        TURNSTILE_TEST_MODE: env.ADHD_TURNSTILE_TEST_MODE ?? "false",
        INTAKE_APPS_SCRIPT_URL: env.ADHD_APPS_SCRIPT_URL ?? "",
        INTAKE_HMAC_SECRET: env.ADHD_HMAC_SECRET ?? "",
    };
}
