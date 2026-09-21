import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createHmac } from "node:crypto";
export const FICTIONAL_HMAC_SECRET = "fictional-isolated-intake-test-secret-at-least-32-characters";
export interface ScriptExports {
    SHEET_COLUMNS: string[];
    doPost(event: {
        postData: {
            contents: string;
        };
    }): {
        value: string;
    };
    hasValidShape_(request: unknown): boolean;
    rowFor_(request: {
        issuedAt: string;
        payload: Record<string, unknown>;
    }, receivedAt: string): string[];
}
// A test adapter for Apps Script services, backed by a real temporary file. Each open()
// creates a fresh VM and reopens the file; this is not a Google-hosted deployment.
export function createDiskBackedScript(slug: string, initialProperties: Record<string, string> = {}) {
    const directory = mkdtempSync(path.join(tmpdir(), "mentorsphere-fictional-intake-"));
    const storagePath = path.join(directory, "isolated-sheet.json");
    writeFileSync(storagePath, JSON.stringify({ rows: [], cache: {} }));
    const mail: Record<string, unknown>[] = [];
    const properties: Record<string, string> = { HMAC_SECRET: FICTIONAL_HMAC_SECRET, SPREADSHEET_ID: "fictional-dedicated-sheet", SHEET_NAME: "Fictional responses", TEST_MODE: "true", NOTIFICATION_EMAIL: "owner@example.test", PRIVATE_SHEET_URL: "https://example.test/private-fictional-sheet", ...initialProperties };
    const source = readFileSync(path.join(process.cwd(), "integrations/google-apps-script", slug, "Code.gs"), "utf8");
    function state(): {
        rows: string[][];
        cache: Record<string, string>;
    } { return JSON.parse(readFileSync(storagePath, "utf8")); }
    function open(): ScriptExports {
        let data = state();
        const persist = () => { writeFileSync(storagePath, JSON.stringify(data)); data = state(); };
        const sheet = {
            getLastRow: () => data.rows.length,
            setFrozenRows: () => { },
            getRange: (row: number, column: number, height = 1, width = 1) => {
                const range = {
                    setNumberFormat: () => range,
                    setFontWeight: () => range,
                    getValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => data.rows[row - 1 + y]?.[column - 1 + x] ?? "")),
                    getDisplayValues: () => range.getValues(),
                    setValues: (values: string[][]) => { for (let y = 0; y < height; y++) {
                        const current = data.rows[row - 1 + y] ?? [];
                        for (let x = 0; x < width; x++)
                            current[column - 1 + x] = values[y]?.[x] ?? "";
                        data.rows[row - 1 + y] = current;
                    } return range; },
                    setValue: (value: string) => range.setValues([[value]]),
                    createTextFinder: (text: string) => {
                        const finder = { matchEntireCell: () => finder, findNext: () => { const index = data.rows.findIndex((values, i) => i >= row - 1 && i < row - 1 + height && values[column - 1] === text); return index < 0 ? null : { getRow: () => index + 1 }; } };
                        return finder;
                    },
                };
                return range;
            },
        };
        const sandbox: Record<string, unknown> = {
            ContentService: { MimeType: { JSON: "application/json" }, createTextOutput: (value: string) => ({ value, setMimeType() { return this; } }) },
            Utilities: { Charset: { UTF_8: "utf8" }, computeHmacSha256Signature: (body: string, secret: string) => createHmac("sha256", secret).update(body).digest(), base64EncodeWebSafe: (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url") },
            PropertiesService: { getScriptProperties: () => ({ getProperty: (name: string) => properties[name] ?? null }) },
            SpreadsheetApp: { openById: (id: string) => { if (id !== "fictional-dedicated-sheet")
                    throw new Error("Unexpected Sheet"); return { getSheetByName: () => sheet }; }, flush: persist },
            LockService: { getScriptLock: () => ({ tryLock: () => properties.LOCK_FAILURE !== "true", releaseLock: () => { } }) },
            CacheService: { getScriptCache: () => ({ get: (key: string) => data.cache[key] ?? null, put: (key: string, value: string) => { data.cache[key] = value; persist(); } }) },
            MailApp: { sendEmail: (message: Record<string, unknown>) => { if (properties.MAIL_FAILURE === "true")
                    throw new Error("Fictional mail failure"); mail.push(message); } },
        };
        vm.runInNewContext(source + "\nglobalThis.__exports={SHEET_COLUMNS,doPost,hasValidShape_,rowFor_};", sandbox);
        return sandbox.__exports as ScriptExports;
    }
    function cleanup() {
        const target = path.resolve(directory);
        if (path.dirname(target) !== path.resolve(tmpdir()) || !path.basename(target).startsWith("mentorsphere-fictional-intake-"))
            throw new Error("Unexpected temporary storage cleanup path");
        rmSync(target, { recursive: true, force: true });
        if (existsSync(target))
            throw new Error("Temporary intake test storage remains");
    }
    return { directory, storagePath, properties, mail, state, open, cleanup, removeStoredRows: () => { const data = state(); data.rows = data.rows.slice(0, 1); writeFileSync(storagePath, JSON.stringify(data)); } };
}
