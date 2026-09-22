import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createDiskBackedScript, FICTIONAL_HMAC_SECRET } from "./isolated-apps-script-harness";
import { isolatedStorageTests } from "./isolated-storage-contract";
import { validAdhdRequest } from "./adhd-fixtures";
import { section } from "./secondary-fixtures";
describe("ADHD isolated Apps Script durable storage", () => isolatedStorageTests("adhd-coaching-intake", validAdhdRequest, 54, input => {
    section(input, "confirmations").adultSpecialCategoryConsent = true;
    section(input, "adult").adhdStatus = "Self-identified / suspected";
}));

describe('ADHD age in the generated storage contract', () => {
    it.each(['child', 'combined'])('stores completed years for %s and rejects an altered-age duplicate', route => {
        const harness = createDiskBackedScript('adhd-coaching-intake');
        const payload = validAdhdRequest(route);
        const send = () => {
            const body = JSON.stringify({ issuedAt: new Date().toISOString(), payload });
            const signature = createHmac('sha256', FICTIONAL_HMAC_SECRET).update(body).digest('base64url');
            return JSON.parse(harness.open().doPost({ postData: { contents: JSON.stringify({ body, signature }) } }).value);
        };
        try {
            expect(send().status).toBe('created');
            const { rows } = harness.state();
            expect(rows[0]).toHaveLength(54);
            expect(rows[1]?.[rows[0]!.indexOf('Child age in completed years')]).toBe('12');
            expect(send().status).toBe('duplicate');
            section(payload, 'child').age = '13';
            expect(send().status).toBe('duplicate_conflict');
        } finally { harness.cleanup(); }
    });
    it.each(['9', '18', '', '10.5'])('generated receiver rejects ineligible or invalid age %s', age => {
        const harness = createDiskBackedScript('adhd-coaching-intake');
        try {
            const payload = validAdhdRequest('child');
            section(payload, 'child').age = age;
            expect(harness.open().hasValidShape_({ issuedAt: new Date().toISOString(), payload })).toBe(false);
            expect(harness.state().rows).toHaveLength(0);
        } finally { harness.cleanup(); }
    });
});
