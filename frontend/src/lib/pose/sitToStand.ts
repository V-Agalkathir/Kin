// Pure state machine: feed knee angles over time, get reps + time.
// Kept free of camera/MediaPipe so it can be unit-tested.

export const STAND_DEG = 160;
export const SIT_DEG = 110;
export const TARGET_REPS = 5;

export type StsState = {
  phase: "sitting" | "standing" | "unknown";
  reps: number;
  firstRiseMs: number | null;
  doneMs: number | null;
  smoothed: number | null;
};

export const initialStsState = (): StsState => ({
  phase: "unknown", reps: 0, firstRiseMs: null, doneMs: null, smoothed: null,
});

const ALPHA = 0.4; // exponential smoothing

export function stepSts(s: StsState, kneeDeg: number, tMs: number): StsState {
  if (s.doneMs !== null) return s;
  const smoothed = s.smoothed === null ? kneeDeg : ALPHA * kneeDeg + (1 - ALPHA) * s.smoothed;
  const next = { ...s, smoothed };

  if (smoothed < SIT_DEG && s.phase !== "sitting") {
    next.phase = "sitting";
  } else if (smoothed > STAND_DEG && s.phase === "sitting") {
    next.phase = "standing";
    next.reps = s.reps + 1;
    if (s.firstRiseMs === null) next.firstRiseMs = tMs;
    if (next.reps >= TARGET_REPS) next.doneMs = tMs;
  }
  return next;
}

export function stsSeconds(s: StsState): number | null {
  if (s.firstRiseMs === null || s.doneMs === null) return null;
  return (s.doneMs - s.firstRiseMs) / 1000;
}
