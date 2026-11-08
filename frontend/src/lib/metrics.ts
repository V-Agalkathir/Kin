// Plain-language labels for metrics and flags. Describes change only — never a diagnosis.
import type { Flag } from "../types/checkin";

export type MetricInfo = {
  label: string; unit: string; shortUnit: string; up: string; down: string;
  icon: "stand" | "speech" | "pause"; color: string; decimals: number;
};

// Colours match the category tokens in tailwind.config.js.
export const METRIC_INFO: Record<string, MetricInfo> = {
  sitToStandSec: { label: "Sit-to-stand", unit: "seconds", shortUnit: "sec", up: "took longer than usual", down: "was quicker than usual", icon: "stand", color: "#F2711C", decimals: 1 },
  wpm: { label: "Speaking pace", unit: "words per minute", shortUnit: "wpm", up: "was faster than usual", down: "was slower than usual", icon: "speech", color: "#0A84FF", decimals: 0 },
  avgPauseMs: { label: "Pauses", unit: "milliseconds", shortUnit: "ms", up: "were longer than usual", down: "were shorter than usual", icon: "pause", color: "#14A3A3", decimals: 0 },
};

export function describeFlag(f: Flag): string {
  const info = METRIC_INFO[f.metric];
  if (!info) return `${f.metric} changed from usual`;
  const label = f.metric === "avgPauseMs" ? "Pauses while talking" : f.metric === "sitToStandSec" ? "Sit-to-stand time" : info.label;
  return `${label} ${f.direction === "up" ? info.up : info.down}`;
}
