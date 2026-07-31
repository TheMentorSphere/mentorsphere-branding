import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 8790;
const secret = process.env.INTAKE_HMAC_SECRET;
const seenSubmissionIds = new Set();

if (!secret) {
  throw new Error("INTAKE_HMAC_SECRET is required for the local mock.");
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/") {
    sendJson(response, 404, { ok: false });
    return;
  }

  const chunks = [];
  let size = 0;

  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > 32_768) {
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });

  request.on("end", () => {
    try {
      const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const supplied = Buffer.from(String(envelope.signature || ""), "base64url");
      const expected = createHmac("sha256", secret).update(String(envelope.body || "")).digest();

      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        sendJson(response, 401, { ok: false });
        return;
      }

      const payload = JSON.parse(envelope.body).payload;
      const duplicate = seenSubmissionIds.has(payload.submissionId);
      seenSubmissionIds.add(payload.submissionId);
      sendJson(response, 200, { ok: true, status: duplicate ? "duplicate" : "created" });
    } catch {
      sendJson(response, 400, { ok: false });
    }
  });
}).listen(port, host, () => {
  process.stdout.write(`Local Apps Script mock ready at http://${host}:${port}\n`);
});
