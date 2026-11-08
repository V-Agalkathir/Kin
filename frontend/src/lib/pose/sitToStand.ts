// Pure state machine: feed knee angles over time, get reps + time.
// Kept free of camera/MediaPipe so it can be unit-tested.

export const STAND_DEG = 160;
export const SIT_DEG = 110;
export const TARGET_REPS = 5;
/** A manual tap this soon after a counted rep is treated as the same stand. */
export const TAP_DEBOUNCE_MS = 1000;

export type StsState = {
  phase: "sitting" | "standing" | "unknown";
  reps: number;
  firstRiseMs: number | null;
  lastRepMs: number | null;
  doneMs: number | null;
  smoothed: number | null;
};

export const initialStsState = (): StsState => ({
  phase: "unknown", reps: 0, firstRiseMs: null, lastRepMs: null, doneMs: null, smoothed: null,
});

const ALPHA = 0.4; // exponential smoothing

function countRep(s: StsState, tMs: number): StsState {
  const reps = s.reps + 1;
  return {
    ...s,
    phase: "standing",
    reps,
    firstRiseMs: s.firstRiseMs ?? tMs,
    lastRepMs: tMs,
    doneMs: reps >= TARGET_REPS ? tMs : null,
  };
}

export function stepSts(s: StsState, kneeDeg: number, tMs: number): StsState {
  if (s.doneMs !== null) return s;
  const smoothed = s.smoothed === null ? kneeDeg : ALPHA * kneeDeg + (1 - ALPHA) * s.smoothed;
  const next = { ...s, smoothed };

  if (smoothed < SIT_DEG && s.phase !== "sitting") {
    next.phase = "sitting";
  } else if (smoothed > STAND_DEG && s.phase === "sitting") {
    return countRep(next, tMs);
  }
  return next;
}

/**
 * Manual "I stood up" fallback for when angle detection is flaky.
 * Marks the person as standing, so detection waits for a sit before counting again.
 */
export function tapRep(s: StsState, tMs: number): StsState {
  if (s.doneMs !== null) return s;
  if (s.lastRepMs !== null && tMs - s.lastRepMs < TAP_DEBOUNCE_MS) return s;
  return countRep(s, tMs);
}

export function stsSeconds(s: StsState): number | null {
  if (s.firstRiseMs === null || s.doneMs === null) return null;
  return (s.doneMs - s.firstRiseMs) / 1000;
}
