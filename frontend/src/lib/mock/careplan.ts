// MOCK ONLY — recommendations as they'd be extracted from the doctor's latest report.
// Kin only repeats what the doctor wrote; it never writes or changes medical advice.
import type { CareReport } from "../../types/health";

export function mockCareReport(): CareReport {
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  return {
    doctor: "Dr. Sarah Chen",
    role: "Primary care",
    date: daysAgo(24),
    previousDate: daysAgo(200),
    nextAppointment: daysAgo(-46),
    recommendations: [
      { id: "steps", text: "Walk at least 5,000 steps a day.", isNew: true, track: { kind: "stepsPerDay", target: 5000 } },
      { id: "bp", text: "Check blood pressure each morning; aim to stay under 135/85.", isNew: false, track: { kind: "bpBelow", systolic: 135, diastolic: 85 } },
      { id: "legs", text: "Do the sit-to-stand exercise daily to keep leg strength.", isNew: true, track: { kind: "dailyCheckIn" } },
      { id: "sleep", text: "Keep a regular bedtime; aim for 7 hours of sleep.", isNew: false, track: { kind: "sleepAtLeast", minutes: 420 } },
      { id: "water", text: "Drink water through the day, especially when it's warm.", isNew: false },
      { id: "vision", text: "Book an eye exam before the next visit.", isNew: true },
    ],
  };
}
