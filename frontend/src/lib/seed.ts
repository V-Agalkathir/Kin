import type { CheckIn } from "../types/checkin";

// Small seeded PRNG so the demo history looks the same on every load.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 21 days of fake history for the demo, ending yesterday, with a gentle decline in the last week.
export function seedHistory(userId = "demo-parent"): CheckIn[] {
  const random = mulberry32(42);
  return Array.from({ length: 21 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (21 - i)); d.setHours(9, 0, 0, 0);
    const drift = i > 14 ? (i - 14) * 0.6 : 0;
    return {
      id: `seed-${i}`, userId, createdAt: d.toISOString(),
      sitToStandSec: +(11 + random() * 1.2 + drift).toFixed(1), repsDetected: 5,
      wpm: Math.round(128 + random() * 10 - drift * 3), avgPauseMs: Math.round(450 + random() * 80 + drift * 40),
      wordCount: 60, transcript: "", language: "en", flags: [], summaryParent: "", summaryFamily: "",
    };
  });
}
