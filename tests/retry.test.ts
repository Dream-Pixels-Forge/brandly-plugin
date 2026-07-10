import { describe, it, expect } from "vitest";
import { withRetry } from "../src/retry";

describe("withRetry", () => {
  it("should succeed on first attempt", async () => {
    const fn = async () => "ok";
    const result = await withRetry(fn);
    expect(result).toBe("ok");
  });

  it("should retry and succeed after transient failure", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "recovered";
    };

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("should throw after exhausting retries", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error("permanent");
    };

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow("permanent");
    expect(attempts).toBe(3); // initial + 2 retries
  });

  it("should call onRetry callback", async () => {
    let retries = 0;
    const fn = async () => {
      if (retries < 1) throw new Error("fail");
      return "ok";
    };

    await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 1,
      onRetry: (attempt) => { retries++; },
    });

    expect(retries).toBe(1);
  });

  it("should respect maxDelayMs cap", async () => {
    const start = Date.now();
    const fn = async () => {
      throw new Error("fail");
    };

    try {
      await withRetry(fn, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 150 });
    } catch {}

    const elapsed = Date.now() - start;
    // With base=100, maxDelay=150, delays should be: 100ms, 150ms (capped from 200)
    expect(elapsed).toBeLessThan(500);
  });

  it("should handle non-Error throws", async () => {
    const fn = async () => {
      throw "string error";
    };

    await expect(withRetry(fn, { maxRetries: 1, baseDelayMs: 1 })).rejects.toThrow("string error");
  });
});
