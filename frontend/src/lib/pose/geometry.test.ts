import { describe, expect, it } from "vitest";
import { angleDeg, kneeAngleDeg, LM, type Landmark } from "./geometry";

function pose(left: [Landmark, Landmark, Landmark], right: [Landmark, Landmark, Landmark]): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  [lm[LM.L_HIP], lm[LM.L_KNEE], lm[LM.L_ANKLE]] = left;
  [lm[LM.R_HIP], lm[LM.R_KNEE], lm[LM.R_ANKLE]] = right;
  return lm;
}

const v = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });
const straight: [Landmark, Landmark, Landmark] = [v(0, 0), v(0, 1), v(0, 2)]; // 180°
const bent: [Landmark, Landmark, Landmark] = [v(1, 1), v(0, 1), v(0, 2)];     // 90°

describe("angleDeg", () => {
  it("measures right and straight angles", () => {
    expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180);
  });
});

describe("kneeAngleDeg", () => {
  it("averages both legs when both are visible", () => {
    expect(kneeAngleDeg(pose(straight, bent))).toBeCloseTo(135);
  });

  it("uses the visible leg when the other is hidden", () => {
    const hidden: [Landmark, Landmark, Landmark] = [v(1, 1, 0.1), v(0, 1, 0.1), v(0, 2, 0.1)];
    expect(kneeAngleDeg(pose(straight, hidden))).toBeCloseTo(180);
  });

  it("returns null when no leg is visible", () => {
    const hidden: [Landmark, Landmark, Landmark] = [v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)];
    expect(kneeAngleDeg(pose(hidden, hidden))).toBeNull();
  });
});
