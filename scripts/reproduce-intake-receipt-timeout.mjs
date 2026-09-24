// Local incident reproduction: no production URL, credentials, data or email.
// Run: node scripts/reproduce-intake-receipt-timeout.mjs
// The pinned pre-fix source is intentional: later working-tree edits cannot
// silently turn this baseline reproduction into a test of the corrected code.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SOURCE_REF = "a1a4aa4716c375c5e96c8f00e8becbdba3217067";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = await mkdtemp(path.join(tmpdir(), "intake-receipt-baseline-"));
const originalFetch = globalThis.fetch;
const cases = [
  { label: "fast", delayMs: 100 },
  { label: "13_seconds", delayMs: 13_000 },
  { label: "20_seconds", delayMs: 20_000 },
].map((item) => ({ ...item, rows: 0, notifications: 0, posts: 0, completed: false }));

function git(...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" });
}

// Compile the actual incident Worker and its imports, plus a fictional fixture.
// Native HTTP and AbortSignal timers remain real; no fake timers are involved.
const sourceFiles = git("ls-tree", "-r", "--name-only", SOURCE_REF, "src")
  .trim().split(/\r?\n/u).filter((name) => name.endsWith(".ts"));
sourceFiles.push("tests/fixtures.ts");
let server;
let watchdog;
try {
  for (const filename of sourceFiles) {
    const source = git("show", `${SOURCE_REF}:${filename}`);
    if (filename === "src/intake/submission.ts") {
      assert.match(source, /AbortSignal\.timeout\(12_000\)/u);
    }
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from (["'])(\.{1,2}\/[^"']+)\1/gu, 'from "$2.mjs"');
    const destination = path.join(snapshot, filename.replace(/\.ts$/u, ".mjs"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }

  const { handleIntakeApi } = await import(pathToFileURL(path.join(snapshot, "src/worker.mjs")));
  const { sendToAppsScript } = await import(pathToFileURL(path.join(snapshot, "src/intake/submission.mjs")));
  const { validIntakeRequest } = await import(pathToFileURL(path.join(snapshot, "tests/fixtures.mjs")));

  server = createServer(async (request, response) => {
    const item = cases.find((candidate) => request.url === `/${candidate.label}`);
    if (!item || request.method !== "POST") {
      response.writeHead(404).end();
      return;
    }
    item.posts += 1;
    for await (const _chunk of request) { /* Consume synthetic request without logging it. */ }
    // Simulated durable commit precedes slow post-storage work. The receiver
    // deliberately keeps running when its caller closes the HTTP transport.
    item.rows += 1;
    item.committedAtMs = Math.round(performance.now() - item.startedAt);
    response.on("close", () => {
      item.transportClosedAtMs = Math.round(performance.now() - item.startedAt);
      item.transportClosedBeforeReceiverCompleted = !item.completed;
    });
    await new Promise((resolve) => setTimeout(resolve, item.delayMs));
    item.notifications += 1; // Counter only: never calls a mail service.
    item.completed = true;
    item.receiverCompletedAtMs = Math.round(performance.now() - item.startedAt);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: true, stored: true, status: "created", notificationSent: true }));
    item.resolveCompleted();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const receiverOrigin = `http://127.0.0.1:${server.address().port}`;

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      return Promise.resolve(Response.json({ success: true }));
    }
    assert.equal(new URL(url).origin, receiverOrigin, "Harness permits loopback receiver requests only");
    return originalFetch(input, init);
  };
  watchdog = setTimeout(() => {
    server.closeAllConnections();
    throw new Error("Local reproduction exceeded its 25-second harness budget");
  }, 25_000);

  await Promise.all(cases.map(async (item) => {
    const completed = new Promise((resolve) => { item.resolveCompleted = resolve; });
    const env = {
      FORM_PAGE_ENABLED: "true",
      FORM_SUBMISSIONS_ENABLED: "true",
      TURNSTILE_SITE_KEY: "isolated-test-site-key",
      TURNSTILE_SECRET_KEY: "isolated-test-secret",
      TURNSTILE_EXPECTED_HOSTNAMES: "isolated.example.test",
      TURNSTILE_TEST_MODE: "true",
      INTAKE_APPS_SCRIPT_URL: `${receiverOrigin}/${item.label}`,
      INTAKE_HMAC_SECRET: "local-synthetic-secret-only",
    };
    item.startedAt = performance.now();
    const response = await handleIntakeApi(new Request("https://isolated.example.test/api/forms/primary-learner-profile", {
      method: "POST",
      headers: { Origin: "https://isolated.example.test", "Content-Type": "application/json" },
      body: JSON.stringify(validIntakeRequest()),
    }), env, undefined, async (submission, bindings) => {
      try {
        return await sendToAppsScript(submission, bindings);
      } catch (error) {
        item.transportError = error.name;
        throw error;
      }
    });
    item.workerReturnedAtMs = Math.round(performance.now() - item.startedAt);
    item.httpStatus = response.status;
    const receipt = await response.json();
    item.receiptStatus = receipt.status;
    item.receiptStored = receipt.stored;
    item.receiptSuccess = receipt.success;
    await completed;
  }));

  for (const item of cases) {
    assert.equal(item.posts, 1);
    assert.equal(item.rows, 1);
    assert.equal(item.notifications, 1);
    if (item.delayMs < 12_000) {
      assert.equal(item.httpStatus, 201);
      assert.equal(item.receiptStatus, "created");
      assert.equal(item.receiptStored, true);
      assert.ok(item.workerReturnedAtMs < 12_000);
    } else {
      assert.equal(item.httpStatus, 503);
      assert.equal(item.receiptStatus, "upstream_failure");
      assert.equal(item.receiptStored, false);
      assert.equal(item.transportError, "TimeoutError");
      assert.ok(item.workerReturnedAtMs >= 12_000 && item.workerReturnedAtMs < 13_000);
      assert.equal(item.transportClosedBeforeReceiverCompleted, true);
      assert.ok(item.receiverCompletedAtMs > item.workerReturnedAtMs);
    }
  }
  console.log(JSON.stringify({
    sourceRef: SOURCE_REF,
    transport: "real loopback HTTP; Siteverify stubbed; wall-clock timers",
    storage: "simulated commit; in-memory synthetic row and notification counters",
    cases: cases.map(({ startedAt, resolveCompleted, ...safeResult }) => safeResult),
  }, null, 2));
} finally {
  clearTimeout(watchdog);
  globalThis.fetch = originalFetch;
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  // Only remove the fresh temporary snapshot created by this invocation.
  assert.equal(path.dirname(path.resolve(snapshot)), path.resolve(tmpdir()));
  assert.ok(path.basename(snapshot).startsWith("intake-receipt-baseline-"));
  await rm(snapshot, { recursive: true, force: true });
}
