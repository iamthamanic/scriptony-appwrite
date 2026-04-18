import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReconnectManager, backoffDelay } from "../src/backoff.js";

describe("backoffDelay", () => {
  it("calculates exponential delay", () => {
    expect(backoffDelay(0, 1_000, 60_000)).toBe(1_000);
    expect(backoffDelay(1, 1_000, 60_000)).toBe(2_000);
    expect(backoffDelay(2, 1_000, 60_000)).toBe(4_000);
    expect(backoffDelay(3, 1_000, 60_000)).toBe(8_000);
  });

  it("caps at maxDelayMs", () => {
    expect(backoffDelay(10, 1_000, 5_000)).toBe(5_000);
    expect(backoffDelay(20, 1_000, 10_000)).toBe(10_000);
  });
});

describe("ReconnectManager", () => {
  let rm: ReconnectManager;

  beforeEach(() => {
    vi.useFakeTimers();
    rm = new ReconnectManager({ baseDelayMs: 100, maxDelayMs: 1_000, context: "test" });
  });

  it("starts with 0 attempts", () => {
    expect(rm.attempts).toBe(0);
    expect(rm.shuttingDown).toBe(false);
  });

  it("increments attempts on nextDelay", () => {
    const d1 = rm.nextDelay();
    expect(d1).toBe(100);
    expect(rm.attempts).toBe(1);

    const d2 = rm.nextDelay();
    expect(d2).toBe(200);
    expect(rm.attempts).toBe(2);
  });

  it("caps delay at maxDelayMs", () => {
    rm.nextDelay(); // 100
    rm.nextDelay(); // 200
    rm.nextDelay(); // 400
    rm.nextDelay(); // 800
    const d = rm.nextDelay(); // would be 1600, capped at 1000
    expect(d).toBe(1_000);
  });

  it("schedule returns null after shutdown", () => {
    rm.shutdown();
    const result = rm.schedule(() => {});
    expect(result).toBeNull();
  });

  it("schedule returns delay and calls action after timeout", () => {
    const action = vi.fn();
    const delay = rm.schedule(action);
    expect(delay).toBe(100);
    expect(action).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not call action after shutdown during wait", () => {
    const action = vi.fn();
    rm.schedule(action);
    rm.shutdown();

    vi.advanceTimersByTime(200);
    expect(action).not.toHaveBeenCalled();
  });

  it("reset sets attempts back to 0", () => {
    rm.nextDelay();
    rm.nextDelay();
    expect(rm.attempts).toBe(2);
    rm.reset();
    expect(rm.attempts).toBe(0);
  });

  it("shutdown prevents further scheduling", () => {
    rm.shutdown();
    expect(rm.shuttingDown).toBe(true);
    expect(rm.schedule(() => {})).toBeNull();
  });
});