// Phase 4 — fall detection. Pure logic, fed with hip height + torso angle per frame.
// TODO(A): tune thresholds on recorded clips (sitting on floor, bending, real falls on a mat).

export type FallState = { lastHipY: number | null; lastT: number | null; downSince: number | null; fallen: boolean };

export const initialFallState = (): FallState => ({ lastHipY: null, lastT: null, downSince: null, fallen: false });

const DROP_VELOCITY = 1.2;   // normalized image heights per second
const HORIZONTAL_DEG = 60;   // torso angle from vertical
const DOWN_MS = 10_000;

export function stepFall(s: FallState, hipY: number, torsoFromVerticalDeg: number, tMs: number): FallState {
  const next = { ...s, lastHipY: hipY, lastT: tMs };
  if (s.lastHipY !== null && s.lastT !== null) {
    const v = (hipY - s.lastHipY) / ((tMs - s.lastT) / 1000); // y grows downward
    if (v > DROP_VELOCITY && torsoFromVerticalDeg > HORIZONTAL_DEG && s.downSince === null) next.downSince = tMs;
  }
  if (next.downSince !== null) {
    if (torsoFromVerticalDeg < HORIZONTAL_DEG / 2) next.downSince = null; // got up
    else if (tMs - next.downSince > DOWN_MS) next.fallen = true;
  }
  return next;
}
