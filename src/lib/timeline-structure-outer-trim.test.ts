import { describe, expect, it } from "vitest";
import {
  clampOuterFirstDurationToChildHull,
  clampOuterLastDurationToChildHull,
} from "./timeline-structure-outer-trim";

describe("timeline-structure-outer-trim", () => {
  it("clamps last duration so the shared boundary does not cut into child hulls", () => {
    const newLast = clampOuterLastDurationToChildHull({
      desiredLastDur: 15,
      pairStartSec: 60,
      totalEndSec: 120,
      minD: 1,
      leftHullEndSec: 90,
      rightHullStartSec: 98,
    });

    expect(newLast).toBeCloseTo(22, 5);
  });

  it("clamps first duration so the shared boundary does not cut into child hulls", () => {
    const newFirst = clampOuterFirstDurationToChildHull({
      desiredFirstDur: 35,
      totalStartSec: 0,
      pairEndSec: 60,
      minD: 1,
      leftHullEndSec: 24,
      rightHullStartSec: 28,
    });

    expect(newFirst).toBeCloseTo(28, 5);
  });

  it("falls back to duration-only limits when no child hulls are provided", () => {
    const newLast = clampOuterLastDurationToChildHull({
      desiredLastDur: 5,
      pairStartSec: 20,
      totalEndSec: 40,
      minD: 3,
    });

    expect(newLast).toBeCloseTo(5, 5);
  });
});
