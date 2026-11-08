import { describe, expect, it } from "vitest";
import { initialStsState, stepSts, stsSeconds, tapRep, type StsState } from "./sitToStand";

function hold(s: StsState, deg: number, frames: number, t: { now: number }): StsState {
  for (let i = 0; i < frames; i++) s = stepSts(s, deg, (t.now += 100));
  return s;
}

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

  it("does not count a stand without first sitting", () => {
    const t = { now: 0 };
    const s = hold(initialStsState(), 175, 20, t);
    expect(s.reps).toBe(0);
  });

  it("stops counting after the target", () => {
    const t = { now: 0 };
    let s = initialStsState();
    for (let rep = 0; rep < 7; rep++) s = hold(hold(s, 90, 10, t), 175, 10, t);
    expect(s.reps).toBe(5);
  });
});

describe("tap fallback", () => {
  it("counts taps and times from the first tap to the fifth", () => {
    let s = initialStsState();
    for (let i = 0; i < 5; i++) s = tapRep(s, 1000 + i * 2000);
    expect(s.reps).toBe(5);
    expect(stsSeconds(s)).toBe(8);
  });

  it("ignores a tap right after a detected rep (same stand)", () => {
    const t = { now: 0 };
    let s = hold(hold(initialStsState(), 90, 10, t), 175, 4, t); // smoothing crosses 160° on the 4th frame
    expect(s.reps).toBe(1);
    s = tapRep(s, t.now + 300);
    expect(s.reps).toBe(1);
  });

  it("does not double count when detection sees the stand after a tap", () => {
    const t = { now: 0 };
    let s = hold(initialStsState(), 90, 10, t);
    s = tapRep(s, (t.now += 100));
    s = hold(s, 175, 10, t);
    expect(s.reps).toBe(1);
    s = hold(hold(s, 90, 10, t), 175, 10, t);
    expect(s.reps).toBe(2);
  });
});
