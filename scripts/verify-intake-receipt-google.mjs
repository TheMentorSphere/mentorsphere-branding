// Run once against a NEW isolated fixture deployment and empty temporary Sheet:
// node scripts/verify-intake-receipt-google.mjs --isolated-url https://script.google.com/macros/s/ISOLATED_ID/exec --include-old-timeout
// The endpoint is never stored in the repository or printed in the report.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const args = process.argv.slice(2);
assert.equal(args[0], "--isolated-url", "An explicit isolated fixture URL is required");
assert.ok(args.length === 2 || (args.length === 3 && args[2] === "--include-old-timeout"));
const endpoint = new URL(args[1]);
assert.equal(endpoint.origin, "https://script.google.com");
assert.match(endpoint.pathname, /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/u);
assert.equal(endpoint.search, "");
assert.equal(endpoint.hash, "");
const MARKER = "mentorsphere-isolated-receipt-test-v1";
const SECRET = "FICTIONAL-RECEIPT-TEST-ONLY-NO-CLIENT-DATA";
const BASELINE = "a1a4aa4716c375c5e96c8f00e8becbdba3217067";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(tmpdir(), "intake-receipt-google-"));
const knownIds = [1, 2, 3, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
const report = { fixture: MARKER, notificationsDisabled: true, cases: [] };
const env = { INTAKE_APPS_SCRIPT_URL: endpoint.href, INTAKE_HMAC_SECRET: SECRET };

async function stats() {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.fixture, MARKER, "Refusing POST: endpoint is not the isolated receipt fixture");
  assert.equal(value.notificationsDisabled, true);
  assert.ok(Array.isArray(value.ids) && value.ids.every(id => knownIds.includes(id)));
  assert.equal(value.rowCount, value.ids.length);
  assert.equal(new Set(value.ids).size, value.ids.length, "Duplicate durable rows");
  return value;
}
async function compileTree(directory = "src") {
  for (const entry of await readdir(path.join(repo, directory), { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await compileTree(filename); continue; }
    if (!filename.endsWith(".ts")) continue;
    const source = await readFile(path.join(repo, filename), "utf8");
    await compile(filename, source);
  }
}
async function compile(filename, source) {
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from (["'])(\.{1,2}\/[^"']+)\1/gu, 'from "$2.mjs"');
  const destination = path.join(temporary, filename.replace(/\.ts$/u, ".mjs"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, code);
  return destination;
}

try {
  assert.equal((await stats()).rowCount, 0, "Use a fresh isolated fixture and empty Sheet");
  await compileTree();
  const { sendToAppsScript } = await import(pathToFileURL(path.join(temporary, "src/intake/submission.mjs")));
  const cases = [
    { formVersion: "receipt-test-fast", submissionId: knownIds[0], minimumMs: 0 },
    { formVersion: "receipt-test-13s", submissionId: knownIds[1], minimumMs: 13_000 },
    { formVersion: "receipt-test-20s", submissionId: knownIds[2], minimumMs: 20_000 },
  ];
  for (const [index, { formVersion, submissionId, minimumMs }] of cases.entries()) {
    const payload = { formVersion, submissionId };
    const startedAt = performance.now();
    const receipt = await sendToAppsScript(payload, env);
    const elapsedMs = Math.round(performance.now() - startedAt);
    assert.deepEqual(receipt, { success: true, stored: true, status: "created", notificationSent: false });
    assert.ok(elapsedMs >= minimumMs);
    const duplicateStartedAt = performance.now();
    const duplicate = await sendToAppsScript(payload, env);
    assert.deepEqual(duplicate, { success: true, stored: false, status: "duplicate", existingRecordVerified: true });
    const duplicateElapsedMs = Math.round(performance.now() - duplicateStartedAt);
    const state = await stats();
    assert.equal(state.rowCount, index + 1);
    assert.deepEqual([...state.ids].sort(), knownIds.slice(0, index + 1));
    const result = { formVersion, elapsedMs, receipt, duplicateElapsedMs, duplicate, rowCount: state.rowCount };
    report.cases.push(result);
    console.log(JSON.stringify(result));
  }
  if (args.includes("--include-old-timeout")) {
    const source = execFileSync("git", ["show", `${BASELINE}:src/intake/submission.ts`], { cwd: repo, encoding: "utf8" });
    assert.match(source, /AbortSignal\.timeout\(12_000\)/u);
    const filename = await compile("baseline-submission.ts", source);
    const { sendToAppsScript: baselineSend } = await import(pathToFileURL(filename));
    const payload = { formVersion: "receipt-test-old-13s", submissionId: knownIds[3] };
    const startedAt = performance.now();
    await assert.rejects(baselineSend(payload, env), { name: "TimeoutError" });
    const timeoutAtMs = Math.round(performance.now() - startedAt);
    assert.ok(timeoutAtMs >= 12_000 && timeoutAtMs < 14_000);
    // This explicit, single test retry uses the identical synthetic submission.
    // It may wait on the original execution's lock, then verifies the saved row.
    const duplicate = await sendToAppsScript(payload, env);
    assert.deepEqual(duplicate, { success: true, stored: false, status: "duplicate", existingRecordVerified: true });
    const state = await stats();
    assert.equal(state.rowCount, 4);
    const result = { formVersion: payload.formVersion, baseline: BASELINE, timeoutAtMs, duplicate, rowCount: state.rowCount };
    report.cases.push(result);
    console.log(JSON.stringify(result));
  }
  report.finalState = await stats();
  console.log(JSON.stringify(report, null, 2));
} finally {
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(tmpdir()));
  assert.ok(path.basename(temporary).startsWith("intake-receipt-google-"));
  await rm(temporary, { recursive: true, force: true });
}
