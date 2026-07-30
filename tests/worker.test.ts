import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Worker API surface", () => {
  it("reports the production feature flag as disabled", async () => {
    const response = await SELF.fetch("https://www.thementorsphere.co.uk/api/assistant/config");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({ enabled: false });
  });

  it("does not expose the disabled chat endpoint", async () => {
    const response = await SELF.fetch("https://www.thementorsphere.co.uk/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "b6cd1d32-c9a8-4f7f-bde2-d9f4957b9e41",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    expect(response.status).toBe(503);
  });
});
