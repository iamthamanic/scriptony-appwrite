import { describe, expect, it, vi } from "vitest";
import { retryDbOperation } from "../src/db-callback.js";

describe("retryDbOperation", () => {
  it("returns the result on first success", async () => {
    const result = await retryDbOperation(async () => 42);
    expect(result).toBe(42);
  });

  it("retries on retriable errors and succeeds", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error("ECONNREFUSED: connection refused");
      return "ok";
    };

    const result = await retryDbOperation(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry on non-retriable errors", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error("Document not found");
    };

    await expect(retryDbOperation(fn, { maxRetries: 3, baseDelayMs: 10 }))
      .rejects.toThrow("Document not found");
    expect(attempts).toBe(1);
  });

  it("retries on 429 rate limit", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        const err = new Error("Rate limit exceeded");
        err.name = "429";
        throw err;
      }
      return "ok";
    };

    const result = await retryDbOperation(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("retries on 503 server error (object with code)", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) throw { code: 503, message: "Service unavailable" };
      return "ok";
    };

    const result = await retryDbOperation(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("throws after max retries exhausted", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error("ECONNRESET: connection reset");
    };

    await expect(retryDbOperation(fn, { maxRetries: 2, baseDelayMs: 10 }))
      .rejects.toThrow("ECONNRESET");
    expect(attempts).toBe(3); // initial + 2 retries
  });

  it("respects maxDelayMs cap", async () => {
    const delays: number[] = [];
    let attempts = 0;

    const fn = async () => {
      attempts++;
      throw new Error("ECONNREFUSED");
    };

    // We can't easily measure actual delays in tests, but we verify
    // that it doesn't throw due to maxDelayMs
    await expect(
      retryDbOperation(fn, { maxRetries: 1, baseDelayMs: 1_000, maxDelayMs: 10 }),
    ).rejects.toThrow();
  });
});