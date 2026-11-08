// How the parent is doing against each doctor's recommendation, from data Kin already records.
// Kin only measures; the recommendation text is the doctor's own.
import type { CheckIn } from "../types/checkin";
import type { CareRecommendation, DailyVitals } from "../types/health";
import { fmtSleep } from "./vitals";

export type CareProgress = { label: string; met: boolean };

const DAY = 86_400_000;
/** True if the ISO date/time falls on one of the 7 calendar days ending today (UTC dates, like the data). */
const inLastWeek = (iso: string, now: Date) => {
  const day = iso.slice(0, 10);
  return day >= new Date(now.getTime() - 6 * DAY).toISOString().slice(0, 10) && day <= now.toISOString().slice(0, 10);
};

export function careProgress(
  rec: CareRecommendation, vitals: DailyVitals[], checkIns: CheckIn[], now = new Date(),
): CareProgress | null {
  const t = rec.track;
  if (!t) return null;
  const week = vitals.filter((v) => inLastWeek(v.date, now));
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

  switch (t.kind) {
    case "stepsPerDay": {
      const days = week.filter((v) => v.steps >= t.target).length;
      return { label: `${days} of ${week.length} days this week`, met: days >= Math.ceil(week.length * 0.7) };
    }
    case "bpBelow": {
      const sys = Math.round(avg(week.map((v) => v.bpSystolic)));
      const dia = Math.round(avg(week.map((v) => v.bpDiastolic)));
      return { label: `Average ${sys}/${dia} this week`, met: sys < t.systolic && dia < t.diastolic };
    }
    case "sleepAtLeast": {
      const mins = avg(week.map((v) => v.sleepMin));
      return { label: `Average ${fmtSleep(mins)} this week`, met: mins >= t.minutes };
    }
    case "dailyCheckIn": {
      const days = new Set(checkIns.filter((c) => inLastWeek(c.createdAt, now)).map((c) => c.createdAt.slice(0, 10))).size;
      return { label: `${days} of 7 days this week`, met: days >= 5 };
    }
  }
}
