// MOCK ONLY — a TypeScript copy of backend/app/engine/baseline.py so the Phase 1
// demo can show flags without the backend. The backend is the source of truth;
// delete this once VITE_USE_MOCK is off for good.
import type { CheckIn, Flag } from "../../types/checkin";

export const WINDOW = 14;
export const MIN_HISTORY = 5;
export const Z_THRESHOLD = 2.0;
const MAD_SCALE = 1.4826;

export const FLAG_METRICS = ["sitToStandSec", "wpm", "avgPauseMs"] as const;
export type FlagMetric = (typeof FLAG_METRICS)[number];

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function robustZ(value: number, history: number[]): number | null {
  const window = history.slice(-WINDOW);
  if (window.length < MIN_HISTORY) return null;
  const med = median(window);
  const mad = median(window.map((x) => Math.abs(x - med))) * MAD_SCALE;
  if (mad === 0) return 0;
  return (value - med) / mad;
}

export function shouldFlag(zNow: number | null, zPrev: number | null): boolean {
  if (zNow === null || zPrev === null) return false;
  return Math.abs(zNow) > Z_THRESHOLD && Math.abs(zPrev) > Z_THRESHOLD && zNow > 0 === zPrev > 0;
}

/** Flags for `current` against earlier check-ins (oldest first), same rule as the backend. */
export function computeFlags(current: Pick<CheckIn, FlagMetric>, history: Pick<CheckIn, FlagMetric>[]): Flag[] {
  const flags: Flag[] = [];
  for (const m of FLAG_METRICS) {
    const series = history.map((c) => c[m]);
    const zNow = robustZ(current[m], series);
    const zPrev = series.length ? robustZ(series[series.length - 1], series.slice(0, -1)) : null;
    if (zNow !== null && shouldFlag(zNow, zPrev)) {
      flags.push({ metric: m, direction: zNow > 0 ? "up" : "down", zScore: Math.round(zNow * 100) / 100 });
    }
  }
  return flags;
}
