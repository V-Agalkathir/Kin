// MOCK ONLY — stands in for wearable data (heart rate, blood pressure, steps, sleep) that would be
// synced from a watch / health platform. A web app can't read Apple Health directly; real data needs
// a phone companion app or a health-platform integration on the backend.
import type { DailyVitals } from "../../types/health";

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 21 days ending today. Last week drifts: fewer steps, a little less sleep, resting HR slightly up. BP steady. */
export function mockVitals(): DailyVitals[] {
  const random = mulberry32(7);
  return Array.from({ length: 21 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (20 - i));
    const drift = i > 14 ? (i - 14) / 6 : 0; // 0 → 1 over the last week
    return {
      date: d.toISOString().slice(0, 10),
      restingHr: Math.round(66 + random() * 4 + drift * 6),
      bpSystolic: Math.round(124 + random() * 8),
      bpDiastolic: Math.round(78 + random() * 5),
      steps: Math.round(5600 + random() * 1400 - drift * 2600),
      sleepMin: Math.round(440 + random() * 35 - drift * 45),
    };
  });
}
