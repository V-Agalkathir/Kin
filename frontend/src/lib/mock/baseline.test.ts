import { describe, expect, it } from "vitest";
import { computeFlags, robustZ, shouldFlag } from "./baseline";

const row = (sitToStandSec: number, wpm = 130, avgPauseMs = 450) => ({ sitToStandSec, wpm, avgPauseMs });

describe("robustZ", () => {
  it("needs at least 5 points", () => {
    expect(robustZ(10, [1, 2, 3, 4])).toBeNull();
    expect(robustZ(10, [1, 2, 3, 4, 5])).not.toBeNull();
  });

  it("is 0 for a flat history", () => {
    expect(robustZ(99, [5, 5, 5, 5, 5])).toBe(0);
  });
});

describe("shouldFlag", () => {
  it("needs two consecutive out-of-range values in the same direction", () => {
    expect(shouldFlag(3, 3)).toBe(true);
    expect(shouldFlag(3, 1)).toBe(false);
    expect(shouldFlag(3, -3)).toBe(false);
    expect(shouldFlag(3, null)).toBe(false);
  });
});

describe("computeFlags", () => {
  const steady = [11, 11.4, 10.8, 11.2, 11.1, 10.9, 11.3].map((s) => row(s));

  it("does not flag a single slow day", () => {
    expect(computeFlags(row(16), steady)).toEqual([]);
  });

  it("flags a second slow day in a row", () => {
    const flags = computeFlags(row(16), [...steady, row(16)]);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ metric: "sitToStandSec", direction: "up" });
  });
});
