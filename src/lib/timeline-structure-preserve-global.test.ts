import { describe, it, expect } from "vitest";
import { reprojectChildrenPctPreservingGlobal } from "./timeline-structure-preserve-global";

describe("reprojectChildrenPctPreservingGlobal", () => {
  it("maps one child global segment into parent 0..100s → 50..70%", () => {
    const frozen = { a: { startSec: 50, endSec: 70 } };
    const out = reprojectChildrenPctPreservingGlobal({
      parentStartSec: 0,
      parentEndSec: 100,
      childIdsInOrder: ["a"],
      frozen,
    });
    expect(out.a.pct_from).toBeCloseTo(50, 5);
    expect(out.a.pct_to).toBeCloseTo(70, 5);
  });

  it("shifts when parent moves on timeline (40–140 → child 90–110 still 50–70%)", () => {
    const frozen = { a: { startSec: 90, endSec: 110 } };
    const out = reprojectChildrenPctPreservingGlobal({
      parentStartSec: 40,
      parentEndSec: 140,
      childIdsInOrder: ["a"],
      frozen,
    });
    expect(out.a.pct_from).toBeCloseTo(50, 5);
    expect(out.a.pct_to).toBeCloseTo(70, 5);
  });

  it("clamps to 0–100 when child extends past parent span", () => {
    const frozen = { a: { startSec: -10, endSec: 200 } };
    const out = reprojectChildrenPctPreservingGlobal({
      parentStartSec: 0,
      parentEndSec: 100,
      childIdsInOrder: ["a"],
      frozen,
    });
    expect(out.a.pct_from).toBe(0);
    expect(out.a.pct_to).toBe(100);
  });
});
