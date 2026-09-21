import { existsSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { expect, it, vi } from "vitest";
import { sendToAppsScript, type IntakeBindings } from "../src/intake/submission";
import { createDiskBackedScript, FICTIONAL_HMAC_SECRET } from "./isolated-apps-script-harness";
export function isolatedStorageTests(slug: string, fixture: () => Record<string, unknown>, columnCount: number, consentFixture: (input: Record<string, unknown>) => void) {
    it("persists an actual signed envelope, reopens the file, verifies duplicate and rejects stale duplicate; deletes temporary storage", async () => {
        const harness = createDiskBackedScript(slug);
        const input = fixture();
        consentFixture(input);
        (input.respondent as Record<string, unknown>).firstName = "=FICTIONAL_FORMULA()";
        const env = { INTAKE_HMAC_SECRET: FICTIONAL_HMAC_SECRET, INTAKE_APPS_SCRIPT_URL: "https://script.google.test/macros/s/isolated/exec" } as IntakeBindings;
        const outcomes: string[] = [];
        const fetchMock = vi.fn(async (_url: unknown, options: RequestInit) => {
            const output = harness.open().doPost({ postData: { contents: String(options.body) } });
            outcomes.push(JSON.parse(output.value).status);
            return new Response(output.value, { headers: { "Content-Type": "application/json" } });
        });
        vi.stubGlobal("fetch", fetchMock);
        try {
            const created = await sendToAppsScript(input as {
                formVersion: string;
                submissionId: string;
            }, env);
            expect(created).toEqual({ success: true, stored: true, status: "created", notificationSent: false });
            let persisted = harness.state();
            expect(persisted.rows).toHaveLength(2);
            expect(persisted.rows[0]).toHaveLength(columnCount);
            expect(persisted.rows[1]).toHaveLength(columnCount);
            const record = Object.fromEntries((persisted.rows[0] ?? []).map((key, index) => [key, persisted.rows[1]?.[index]]));
            expect(record["Respondent first name"]).toBe("'=FICTIONAL_FORMULA()");
            expect(record["Form version"]).toBe(slug + "-v1");
            expect(record["Notification status"]).toBe("Disabled: isolated test");
            expect(record["Google received at (UTC)"]).toMatch(/^\d{4}-\d\d-\d\dT/u);
            expect(harness.mail).toHaveLength(0);
            expect(Object.entries(record).filter(([key]) => key.includes("wording version")).some(([, value]) => value?.includes("2026-09-21"))).toBe(true);
            if (!persisted.rows[1] || !persisted.rows[0])
                throw new Error("Missing fictional persisted row");
            persisted.rows[1][persisted.rows[0].indexOf("Notification status")] = "Operational note";
            persisted.rows[1][persisted.rows[0].indexOf("Record status")] = "Active";
            writeFileSync(harness.storagePath, JSON.stringify(persisted));
            const duplicate = await sendToAppsScript(input as {
                formVersion: string;
                submissionId: string;
            }, env);
            expect(duplicate).toEqual({ success: true, stored: false, status: "duplicate", existingRecordVerified: true });
            expect(harness.state().rows).toHaveLength(2);
            const changed = structuredClone(input);
            (changed.respondent as Record<string, unknown>).firstName = "Changed fictional name";
            await expect(sendToAppsScript(changed as {
                formVersion: string;
                submissionId: string;
            }, env)).rejects.toThrow("durable storage");
            expect(outcomes.at(-1)).toBe("duplicate_conflict");
            const declined = fixture();
            declined.respondent = input.respondent;
            await expect(sendToAppsScript(declined as {
                formVersion: string;
                submissionId: string;
            }, env)).rejects.toThrow("durable storage");
            expect(outcomes.at(-1)).toBe("duplicate_conflict");
            expect(harness.state().rows).toHaveLength(2);
            expect(harness.state().rows[1]).toEqual(persisted.rows[1]);
            const corrupt = harness.state();
            if (!corrupt.rows[1])
                throw new Error("Missing fictional persisted row");
            corrupt.rows[1][3] = "wrong-form-version";
            writeFileSync(harness.storagePath, JSON.stringify(corrupt));
            await expect(sendToAppsScript(input as {
                formVersion: string;
                submissionId: string;
            }, env)).rejects.toThrow("durable storage");
            corrupt.rows[1] = [String(input.submissionId)];
            writeFileSync(harness.storagePath, JSON.stringify(corrupt));
            await expect(sendToAppsScript(input as {
                formVersion: string;
                submissionId: string;
            }, env)).rejects.toThrow("durable storage");
            harness.removeStoredRows();
            await expect(sendToAppsScript(input as {
                formVersion: string;
                submissionId: string;
            }, env)).rejects.toThrow("durable storage");
            persisted = harness.state();
            expect(persisted.rows).toHaveLength(1);
        }
        finally {
            vi.unstubAllGlobals();
            harness.cleanup();
            expect(existsSync(harness.directory)).toBe(false);
        }
    });
    it("acknowledges durable storage despite notification failure without including answers in mail", () => {
        const harness = createDiskBackedScript(slug, { TEST_MODE: "false", MAIL_FAILURE: "true" });
        try {
            const body = JSON.stringify({ issuedAt: new Date().toISOString(), payload: fixture() });
            const signature = createHmac("sha256", FICTIONAL_HMAC_SECRET).update(body).digest("base64url");
            const result = JSON.parse(harness.open().doPost({ postData: { contents: JSON.stringify({ body, signature }) } }).value);
            expect(result).toEqual({ success: true, stored: true, status: "created", notificationSent: false });
            const data = harness.state();
            expect(data.rows[1]?.[data.rows[0]?.indexOf("Notification status") ?? -1]).toBe("Failed: review Apps Script executions");
            harness.properties.MAIL_FAILURE = "false";
            const changed = fixture();
            changed.submissionId = "123e4567-e89b-42d3-a456-426614174001";
            const anotherBody = JSON.stringify({ issuedAt: new Date().toISOString(), payload: changed });
            const anotherSignature = createHmac("sha256", FICTIONAL_HMAC_SECRET).update(anotherBody).digest("base64url");
            harness.open().doPost({ postData: { contents: JSON.stringify({ body: anotherBody, signature: anotherSignature }) } });
            expect(harness.mail).toHaveLength(1);
            const mail = JSON.stringify(harness.mail);
            expect(mail).toContain("https://example.test/private-fictional-sheet");
            expect(mail).not.toContain("Alex");
            expect(mail).not.toContain("alex@example.test");
        }
        finally {
            harness.cleanup();
        }
    });
    it.each(["invalid-signature", "expired-envelope", "wrong-version", "missing-consent", "lock-failure"])("rejects %s before any row is stored", scenario => {
        const harness = createDiskBackedScript(slug);
        try {
            const input = fixture();
            if (scenario === "wrong-version")
                input.formVersion = "primary-learner-profile-v5";
            if (scenario === "missing-consent") {
                consentFixture(input);
                input.confirmations = { authorised: true, privacyAcknowledged: true };
            }
            if (scenario === "lock-failure")
                harness.properties.LOCK_FAILURE = "true";
            const body = JSON.stringify({ issuedAt: scenario === "expired-envelope" ? "2020-01-01T00:00:00Z" : new Date().toISOString(), payload: input });
            const signature = scenario === "invalid-signature" ? "invalid" : createHmac("sha256", FICTIONAL_HMAC_SECRET).update(body).digest("base64url");
            const result = JSON.parse(harness.open().doPost({ postData: { contents: JSON.stringify({ body, signature }) } }).value);
            expect(result).toEqual({ success: false, stored: false, status: "rejected" });
            expect(harness.state().rows).toHaveLength(0);
        }
        finally {
            harness.cleanup();
        }
    });
}
