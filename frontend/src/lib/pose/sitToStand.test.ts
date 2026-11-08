import { describe, expect, it } from "vitest";
import { initialStsState, stepSts, stsSeconds } from "./sitToStand";

describe("sit-to-stand", () => {
  it("counts 5 reps and times them", () => {
    let s = initialStsState();
    let t = 0;
    for (let rep = 0; rep < 5; rep++) {
      for (let i = 0; i < 10; i++) s = stepSts(s, 90, (t += 100));
      for (let i = 0; i < 10; i++) s = stepSts(s, 175, (t += 100));
    }
    expect(s.reps).toBe(5);
    expect(stsSeconds(s)).toBeGreaterThan(0);
  });

  it("ignores jitter around the thresholds", () => {
    let s = initialStsState();
    for (let i = 0; i < 50; i++) s = stepSts(s, i % 2 ? 130 : 140, i * 50);
    expect(s.reps).toBe(0);
  });
});
