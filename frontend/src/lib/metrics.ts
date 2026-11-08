// Plain-language labels for metrics and flags. Describes change only — never a diagnosis.
import type { Flag } from "../types/checkin";

export const METRIC_INFO: Record<string, { label: string; unit: string; up: string; down: string }> = {
  sitToStandSec: { label: "Sit-to-stand time", unit: "seconds", up: "took longer than usual", down: "was quicker than usual" },
  wpm: { label: "Speaking pace", unit: "words per minute", up: "was faster than usual", down: "was slower than usual" },
  avgPauseMs: { label: "Pauses while talking", unit: "milliseconds", up: "were longer than usual", down: "were shorter than usual" },
};

export function describeFlag(f: Flag): string {
  const info = METRIC_INFO[f.metric];
  if (!info) return `${f.metric} changed from usual`;
  return `${info.label} ${f.direction === "up" ? info.up : info.down}`;
}
