// Wearable vitals: labels, formatting, and "changed vs. usual" using the same rule as check-ins
// (robust z > 2 for two days in a row, vs the person's own last 14 days). Describes change; never diagnoses.
import type { DailyVitals, VitalKey } from "../types/health";
import type { IconName } from "../components/Icon";
import { robustZ, shouldFlag } from "./mock/baseline";

export type VitalFlag = { key: VitalKey; direction: "up" | "down" };

type VitalInfo = {
  label: string;
  icon: IconName;
  color: string;
  unit: string;
  /** Series used for "vs usual" (blood pressure uses systolic). */
  value: (d: DailyVitals) => number;
  display: (d: DailyVitals) => string;
  up: string;
  down: string;
};

export const fmtSleep = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;

// Colours match tailwind.config.js category tokens.
export const VITAL_INFO: Record<VitalKey, VitalInfo> = {
  restingHr: {
    label: "Resting heart rate", icon: "heart", color: "#FF5A52", unit: "bpm",
    value: (d) => d.restingHr, display: (d) => String(d.restingHr),
    up: "higher than usual", down: "lower than usual",
  },
  bloodPressure: {
    label: "Blood pressure", icon: "gauge", color: "#FF7AB2", unit: "mmHg",
    value: (d) => d.bpSystolic, display: (d) => `${d.bpSystolic}/${d.bpDiastolic}`,
    up: "higher than usual", down: "lower than usual",
  },
  steps: {
    label: "Steps", icon: "steps", color: "#FF9F0A", unit: "steps",
    value: (d) => d.steps, display: (d) => d.steps.toLocaleString(),
    up: "more than usual", down: "fewer than usual",
  },
  sleepMin: {
    label: "Sleep", icon: "moon", color: "#64D2FF", unit: "",
    value: (d) => d.sleepMin, display: (d) => fmtSleep(d.sleepMin),
    up: "longer than usual", down: "shorter than usual",
  },
};

export const VITAL_KEYS = Object.keys(VITAL_INFO) as VitalKey[];

/** Flags for the latest day vs earlier days (oldest first). */
export function vitalFlags(history: DailyVitals[]): VitalFlag[] {
  if (history.length < 2) return [];
  const flags: VitalFlag[] = [];
  for (const key of VITAL_KEYS) {
    const series = history.map(VITAL_INFO[key].value);
    const zNow = robustZ(series[series.length - 1], series.slice(0, -1));
    const zPrev = robustZ(series[series.length - 2], series.slice(0, -2));
    if (zNow !== null && shouldFlag(zNow, zPrev)) flags.push({ key, direction: zNow > 0 ? "up" : "down" });
  }
  return flags;
}

export function describeVitalFlag(f: VitalFlag): string {
  const info = VITAL_INFO[f.key];
  const verb = f.key === "steps" ? "were" : "was";
  return `${info.label} ${verb} ${f.direction === "up" ? info.up : info.down}`;
}

/** Median of the 14 days before the latest, for the "usual" line. */
export function usualOf(series: number[]): number | null {
  const w = series.slice(-15, -1);
  if (!w.length) return null;
  const s = [...w].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
