import type { CheckIn } from "../types/checkin";

// 21 days of fake history for the demo, with a gentle decline in the last week.
export function seedHistory(userId = "demo-parent"): CheckIn[] {
  return Array.from({ length: 21 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (20 - i));
    const drift = i > 14 ? (i - 14) * 0.6 : 0;
    return {
      id: `seed-${i}`, userId, createdAt: d.toISOString(),
      sitToStandSec: +(11 + Math.random() * 1.2 + drift).toFixed(1), repsDetected: 5,
      wpm: Math.round(128 + Math.random() * 10 - drift * 3), avgPauseMs: Math.round(450 + Math.random() * 80 + drift * 40),
      wordCount: 60, transcript: "", language: "ta", flags: [], summaryParent: "", summaryFamily: "",
    };
  });
}
