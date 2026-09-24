// Owner-preview entrypoints only. This module is never imported by the production Worker.
import { handleIntakeApi, type IntakeDefinition } from "../worker";
import type { IntakeBindings, IntakeCreatedResponse } from "../intake/submission";
export interface PreviewBindings {
    ASSETS: {
        fetch(request: Request): Promise<Response>;
    };
}
const scenarios = new Set(["created", "duplicate", "failure", "malformed", "timeout", "stale-duplicate"]);
const created: IntakeCreatedResponse = { success: true, stored: true, status: "created", notificationSent: false };
// Preview-only browser timeout simulation. Production ends its Worker path at
// 55s; this adds transport delay outside that handler to exceed the 70s browser.
export const PREVIEW_BROWSER_TIMEOUT_DELAY_MS = 75_000;
function secure(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    headers.set("Cache-Control", "no-store");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; form-action 'self'");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return new Response(response.body, { status: response.status, headers });
}
export function createPreview(definition: IntakeDefinition) {
    return {
        async fetch(request: Request, env: PreviewBindings): Promise<Response> {
            const url = new URL(request.url);
            // No preview may be served on a production custom domain, even through accidental routing.
            if (!url.hostname.endsWith(".workers.dev") && !["localhost", "127.0.0.1"].includes(url.hostname)) {
                return secure(new Response("Owner preview is unavailable on this hostname.", { status: 404 }));
            }
            if (url.pathname === "/")
                return secure(Response.redirect(new URL(`${definition.formPath}/`, url), 302));
            const bindings: IntakeBindings = {
                FORM_PAGE_ENABLED: "true", FORM_SUBMISSIONS_ENABLED: "true",
                // Cloudflare's public always-pass testing keys. Never production credentials.
                TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
                TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
                TURNSTILE_EXPECTED_HOSTNAMES: "example.com", TURNSTILE_TEST_MODE: "true",
                INTAKE_APPS_SCRIPT_URL: "", INTAKE_HMAC_SECRET: "",
            };
            if (url.pathname === definition.apiPath || url.pathname === `${definition.apiPath}/config`) {
                const scenario = request.headers.get("X-MentorSphere-Preview-Scenario") || "created";
                if (!scenarios.has(scenario))
                    return secure(new Response("Invalid preview scenario", { status: 400 }));
                let reachedSimulation = false;
                const result = await handleIntakeApi(request, bindings, definition, async () => {
                    reachedSimulation = true;
                    if (scenario === "failure")
                        throw new Error("Simulated upstream failure");
                    if (scenario === "timeout") {
                        throw new Error("Simulated upstream timeout");
                    }
                    if (scenario === "duplicate")
                        return { success: true, stored: false, status: "duplicate", existingRecordVerified: true };
                    return created;
                });
                if (reachedSimulation && scenario === "timeout")
                    await new Promise(resolve => setTimeout(resolve, PREVIEW_BROWSER_TIMEOUT_DELAY_MS));
                if (reachedSimulation && scenario === "malformed")
                    return secure(new Response("{invalid preview JSON", { status: 201, headers: { "Content-Type": "application/json" } }));
                if (reachedSimulation && scenario === "stale-duplicate")
                    return secure(new Response(JSON.stringify({ success: true, stored: false, status: "duplicate" }), { headers: { "Content-Type": "application/json" } }));
                return secure(result);
            }
            // Only this form and its packaged assets are exposed. Primary is not uploaded or served.
            if (url.pathname === definition.formPath || url.pathname === `${definition.formPath}/` || url.pathname.startsWith("/assets/"))
                return secure(await env.ASSETS.fetch(request));
            return secure(new Response("Not found", { status: 404 }));
        },
    };
}
