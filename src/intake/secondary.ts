import type { IntakeDefinition, WorkerBindings } from "../worker";
import type { IntakeBindings } from "./submission";
import { validateSecondaryRequest } from "./secondary-validation";
export const secondaryDefinition: IntakeDefinition = {
    apiPath: "/api/forms/secondary-learner-profile", formPath: "/forms/secondary-learner-profile",
    formVersion: "secondary-learner-profile-v1", action: "secondary_learner_profile", validate: validateSecondaryRequest,
};
// Every missing value fails closed. Never fall back to Primary credentials or release flags.
export function secondaryBindings(env: WorkerBindings): IntakeBindings {
    const endpoint = env.SECONDARY_APPS_SCRIPT_URL ?? "";
    const secret = env.SECONDARY_HMAC_SECRET ?? "";
    const isolated = Boolean(endpoint && secret && env.SECONDARY_TURNSTILE_SECRET_KEY) &&
        endpoint !== env.INTAKE_APPS_SCRIPT_URL && endpoint !== env.ADHD_APPS_SCRIPT_URL &&
        secret !== env.INTAKE_HMAC_SECRET && secret !== env.ADHD_HMAC_SECRET;
    return {
        FORM_PAGE_ENABLED: env.SECONDARY_FORM_PAGE_ENABLED ?? "false",
        FORM_SUBMISSIONS_ENABLED: isolated ? env.SECONDARY_FORM_SUBMISSIONS_ENABLED ?? "false" : "false",
        TURNSTILE_SITE_KEY: env.SECONDARY_TURNSTILE_SITE_KEY ?? "CONFIGURE_BEFORE_PRODUCTION_LAUNCH",
        TURNSTILE_SECRET_KEY: env.SECONDARY_TURNSTILE_SECRET_KEY ?? "",
        TURNSTILE_EXPECTED_HOSTNAMES: env.SECONDARY_TURNSTILE_EXPECTED_HOSTNAMES ?? "www.thementorsphere.co.uk",
        TURNSTILE_TEST_MODE: env.SECONDARY_TURNSTILE_TEST_MODE ?? "false",
        INTAKE_APPS_SCRIPT_URL: env.SECONDARY_APPS_SCRIPT_URL ?? "",
        INTAKE_HMAC_SECRET: env.SECONDARY_HMAC_SECRET ?? "",
    };
}
