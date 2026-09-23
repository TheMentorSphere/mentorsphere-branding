import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { createDiskBackedScript, FICTIONAL_HMAC_SECRET } from "./isolated-apps-script-harness";
import { validSecondaryRequest, section } from "./secondary-fixtures";
import { validAdhdRequest } from "./adhd-fixtures";

for (const [slug, fixture, columns] of [
    ["secondary-learner-profile", validSecondaryRequest, 52],
    ["adhd-coaching-intake", validAdhdRequest, 54],
] as const) describe(`${slug}: verified storage commit point`, () => {
    let harness: ReturnType<typeof createDiskBackedScript>;
    function setup(properties: Record<string, string> = {}) {
        harness = createDiskBackedScript(slug, { TEST_MODE: "false", ...properties });
        return fixture();
    }
    function send(payload: Record<string, unknown>) {
        const body = JSON.stringify({ issuedAt: new Date().toISOString(), payload });
        const signature = createHmac("sha256", FICTIONAL_HMAC_SECRET).update(body).digest("base64url");
        return JSON.parse(harness.open().doPost({ postData: { contents: JSON.stringify({ body, signature }) } }).value);
    }
    function cell(heading: string) {
        const { rows } = harness.state();
        return rows[1]?.[rows[0]!.indexOf(heading)];
    }
    function created(notificationSent: boolean) {
        return { success: true, stored: true, status: "created", notificationSent };
    }
    const duplicate = { success: true, stored: false, status: "duplicate", existingRecordVerified: true };
    afterEach(() => {
        harness?.cleanup();
        if (harness) expect(existsSync(harness.directory)).toBe(false);
    });

    it("confirms one complete row, sends minimal mail and records Sent only after verification", () => {
        const input = setup();
        expect(send(input)).toEqual(created(true));
        expect(harness.state().rows.map(row => row.length)).toEqual([columns, columns]);
        expect(cell("Form version")).toBe(`${slug}-v1`);
        expect(cell("Notification status")).toBe("Sent");
        expect(cell("Notification sent at (UTC)")).toMatch(/^\d{4}-\d\d-\d\dT/u);
        expect(harness.events).toEqual([
            "cache-open", "cache-get", "append", "flush", "readback", "readback",
            "cache-put", "release", "mail", "status-write", "status-write", "flush",
        ]);
        expect(harness.mail).toHaveLength(1);
        expect(JSON.stringify(harness.mail)).not.toMatch(/Alex|alex@example.test|Sam Example/u);
        expect(send(input)).toEqual(duplicate);
        expect(harness.mail).toHaveLength(1);
        expect(harness.state().rows).toHaveLength(2);
    });

    it("keeps failed mail separate from receipt and never retries mail on an exact retry", () => {
        const input = setup({ MAIL_FAILURE: "true" });
        expect(send(input)).toEqual(created(false));
        expect(cell("Notification status")).toBe("Failed: review Apps Script executions");
        expect(cell("Notification sent at (UTC)")).toBe("");
        harness.properties.MAIL_FAILURE = "false";
        expect(send(input)).toEqual(duplicate);
        expect(harness.state().rows).toHaveLength(2);
        expect(harness.events.filter(event => event === "mail")).toHaveLength(1);
        expect(harness.mail).toHaveLength(0);
    });

    it("ignores cache.put failures for both a new verified row and its exact retry", () => {
        const input = setup({ CACHE_PUT_FAILURE: "true" });
        expect(send(input)).toEqual(created(true));
        expect(harness.state().cache).toEqual({});
        expect(send(input)).toEqual(duplicate);
        expect(harness.events.filter(event => event === "cache-put")).toHaveLength(2);
        expect(harness.state().rows).toHaveLength(2);
        expect(harness.mail).toHaveLength(1);
    });

    it.each(["STATUS_WRITE_FAILURE", "STATUS_FLUSH_FAILURE", "RELEASE_FAILURE"])(
        "preserves receipt after %s with successful or failed mail", fault => {
            const input = setup({ [fault]: "true" });
            expect(send(input)).toEqual(created(true));
            expect(send(input)).toEqual(duplicate);
            expect(harness.mail).toHaveLength(1);
            harness.properties.MAIL_FAILURE = "true";
            const another = fixture();
            another.submissionId = "123e4567-e89b-42d3-a456-426614174001";
            expect(send(another)).toEqual(created(false));
            expect(send(another)).toEqual(duplicate);
            expect(harness.state().rows).toHaveLength(3);
            expect(harness.events.filter(event => event === "mail")).toHaveLength(2);
        },
    );

    it("rejects a cached receipt when its Sheet row is missing, without rewriting or mailing", () => {
        const input = setup();
        expect(send(input)).toEqual(created(true));
        harness.removeStoredRows();
        expect(send(input)).toEqual({ success: false, stored: false, status: "duplicate_without_record" });
        expect(harness.state().rows).toHaveLength(1);
        expect(harness.mail).toHaveLength(1);
    });

    it.each(["CACHE_OPEN_FAILURE", "CACHE_GET_FAILURE"])(
        "verifies existing rows despite %s, but fails closed if a missing-row marker cannot be checked", fault => {
            const input = setup();
            expect(send(input)).toEqual(created(true));
            harness.properties[fault] = "true";
            expect(send(input)).toEqual(duplicate);
            harness.removeStoredRows();
            expect(send(input)).toEqual({ success: false, stored: false, status: "rejected" });
            expect(harness.state().rows).toHaveLength(1);
            expect(harness.mail).toHaveLength(1);
        },
    );

    it.each(["APPEND_FAILURE", "STORAGE_FLUSH_FAILURE", "READBACK_FAILURE"])(
        "fails closed before the commit point on %s and does not cache or notify", fault => {
            const input = setup({ [fault]: "true" });
            expect(send(input)).toEqual({ success: false, stored: false, status: "rejected" });
            expect(harness.mail).toHaveLength(0);
            expect(harness.events).not.toContain("cache-put");
            expect(harness.state().rows).toHaveLength(fault === "READBACK_FAILURE" ? 2 : 0);
            expect(harness.events).toContain("release");
        },
    );

    it.each(["=FICTIONAL()", "+FICTIONAL()", "-FICTIONAL()", "@FICTIONAL()", "'=FICTIONAL()", "''literal"])(
        "verifies literal readback for %s and preserves distinct leading apostrophes", answer => {
            const input = setup();
            section(input, "respondent").firstName = answer;
            expect(send(input)).toEqual(created(true));
            expect(cell("Respondent first name")).toBe(answer);
            expect(send(input)).toEqual(duplicate);
            section(input, "respondent").firstName = `'${answer}`;
            expect(send(input)).toEqual({ success: false, stored: false, status: "duplicate_conflict" });
            expect(harness.state().rows).toHaveLength(2);
            expect(harness.mail).toHaveLength(1);
        },
    );

    it("rejects an actual formula even if its effective value equals the original answer", () => {
        const input = setup();
        expect(send(input)).toEqual(created(true));
        const { rows } = harness.state();
        const formulas = Array<string>(columns).fill("");
        formulas[rows[0]!.indexOf("Respondent first name")] = '=CONCAT("Al","ex")';
        const sheet = { getRange: () => ({ getValues: () => [rows[1]], getFormulas: () => [formulas] }) };
        expect(harness.open().verifyStoredPayload_(sheet, 2, { issuedAt: new Date().toISOString(), payload: input })).toBe(false);
    });
});
