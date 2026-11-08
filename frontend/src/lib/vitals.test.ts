import { describe, expect, it } from "vitest";
import type { CheckIn } from "../types/checkin";
import type { DailyVitals } from "../types/health";
import { careProgress } from "./careplan";
import { fmtSleep, usualOf, vitalFlags } from "./vitals";

const day = (i: number, over: Partial<DailyVitals> = {}): DailyVitals => ({
  date: new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10),
  restingHr: 66 + (i % 3), bpSystolic: 126 + (i % 4), bpDiastolic: 80 + (i % 2),
  steps: 6000 + (i % 5) * 100, sleepMin: 450 + (i % 3) * 5, ...over,
});

describe("vitalFlags", () => {
  const steady = Array.from({ length: 14 }, (_, i) => day(i));

  it("flags nothing for a steady history", () => {
    expect(vitalFlags(steady)).toEqual([]);
  });

  it("does not flag a single low-step day", () => {
    expect(vitalFlags([...steady, day(14, { steps: 1500 })])).toEqual([]);
  });

  it("flags two low-step days in a row", () => {
    const flags = vitalFlags([...steady, day(14, { steps: 1500 }), day(15, { steps: 1400 })]);
    expect(flags).toEqual([{ key: "steps", direction: "down" }]);
  });
});

describe("helpers", () => {
  it("formats sleep", () => expect(fmtSleep(415)).toBe("6h 55m"));
  it("usual is the median of the 14 days before the latest", () => {
    expect(usualOf([1, 2, 3, 100])).toBe(2);
  });
});

describe("careProgress", () => {
  const now = new Date("2026-11-08T18:00:00Z");
  const week = Array.from({ length: 7 }, (_, i) => ({
    ...day(0), date: new Date(now.getTime() - (6 - i) * 86_400_000).toISOString().slice(0, 10),
    steps: i < 4 ? 6000 : 3000, sleepMin: 400, bpSystolic: 128, bpDiastolic: 80,
  }));

  it("counts days meeting a step goal", () => {
    const p = careProgress({ id: "s", text: "", isNew: true, track: { kind: "stepsPerDay", target: 5000 } }, week, [], now);
    expect(p).toEqual({ label: "4 of 7 days this week", met: false });
  });

  it("averages blood pressure against the doctor's target", () => {
    const p = careProgress({ id: "b", text: "", isNew: false, track: { kind: "bpBelow", systolic: 135, diastolic: 85 } }, week, [], now);
    expect(p).toEqual({ label: "Average 128/80 this week", met: true });
  });

  it("averages sleep", () => {
    const p = careProgress({ id: "z", text: "", isNew: false, track: { kind: "sleepAtLeast", minutes: 420 } }, week, [], now);
    expect(p?.met).toBe(false);
    expect(p?.label).toBe("Average 6h 40m this week");
  });

  it("counts distinct check-in days", () => {
    const c = (iso: string) => ({ createdAt: iso }) as CheckIn;
    const checkIns = [c("2026-11-08T09:00:00Z"), c("2026-11-08T15:00:00Z"), c("2026-11-06T09:00:00Z")];
    const p = careProgress({ id: "c", text: "", isNew: true, track: { kind: "dailyCheckIn" } }, [], checkIns, now);
    expect(p).toEqual({ label: "2 of 7 days this week", met: false });
  });

  it("uses exactly the last 7 calendar days, even with older data", () => {
    const older = { ...week[0], date: new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10), steps: 9000 };
    const p = careProgress({ id: "s", text: "", isNew: true, track: { kind: "stepsPerDay", target: 5000 } }, [older, ...week], [], now);
    expect(p?.label).toBe("4 of 7 days this week");
  });

  it("returns null for untracked advice", () => {
    expect(careProgress({ id: "w", text: "", isNew: false }, week, [], now)).toBeNull();
  });
});
