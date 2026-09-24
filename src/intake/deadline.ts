// The receiver has a 10s lock wait; the incident completed in ~20s. Allow a
// further 5s for signing, redirects and receipt transfer, within a 55s Worker
// budget. The browser reserves another 15s for transport (70s in its contract).
export const APPS_SCRIPT_RECEIPT_TIMEOUT_MS = 35_000;
export const WORKER_RECEIPT_TIMEOUT_MS = 55_000;
export const TURNSTILE_VERIFY_TIMEOUT_MS = 10_000;

export type DeadlineCode = "WORKER_RECEIPT_TIMEOUT" | "UPSTREAM_TIMEOUT" | "TURNSTILE_TIMEOUT";

export class DeadlineExceeded extends Error {
  constructor(readonly code: DeadlineCode) {
    super(code);
  }
}

// Each asynchronous step uses wait(), even if a transport does not honour
// AbortSignal. check() after each wait prevents an expired continuation from
// starting another operation, especially the durable Apps Script POST.
export class Deadline {
  private readonly controller = new AbortController();
  private readonly expiresAt: number;
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly abortFromParent: () => void;

  constructor(durationMs: number, private readonly code: DeadlineCode, private readonly parent?: AbortSignal) {
    this.expiresAt = Date.now() + durationMs;
    this.abortFromParent = () => this.controller.abort(
      parent?.reason instanceof DeadlineExceeded ? parent.reason : new DeadlineExceeded(code),
    );
    this.timer = setTimeout(() => this.controller.abort(new DeadlineExceeded(code)), durationMs);
    parent?.addEventListener("abort", this.abortFromParent, { once: true });
    if (parent?.aborted) this.abortFromParent();
  }

  get signal(): AbortSignal { return this.controller.signal; }

  check(): void {
    if (Date.now() >= this.expiresAt && !this.signal.aborted) this.controller.abort(new DeadlineExceeded(this.code));
    if (this.signal.aborted) throw this.signal.reason;
  }

  async wait<T>(operation: Promise<T>): Promise<T> {
    let onAbort: () => void = () => undefined;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(this.signal.reason);
      this.signal.addEventListener("abort", onAbort, { once: true });
      if (this.signal.aborted) onAbort();
    });
    try {
      const result = await Promise.race([operation, aborted]);
      this.check();
      return result;
    } finally {
      this.signal.removeEventListener("abort", onAbort);
    }
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.parent?.removeEventListener("abort", this.abortFromParent);
  }
}
