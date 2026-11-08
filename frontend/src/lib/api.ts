import type { CheckIn, FallAlert } from "../types/checkin";
import { mockGetCheckIns, mockSendAlert, mockSubmitCheckIn } from "./mock/mockApi";

/** Phase 1: use the local mock until the backend is ready. Set VITE_USE_MOCK=false to hit /api. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export async function submitCheckIn(audio: Blob, sitToStandSec: number, repsDetected: number, userId: string, language: string): Promise<CheckIn> {
  if (USE_MOCK) return mockSubmitCheckIn(audio, sitToStandSec, repsDetected, userId, language);
  const form = new FormData();
  form.append("audio", audio);
  form.append("sitToStandSec", String(sitToStandSec));
  form.append("repsDetected", String(repsDetected));
  form.append("userId", userId);
  form.append("language", language);
  const res = await fetch("/api/checkins", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCheckIns(userId: string): Promise<CheckIn[]> {
  if (USE_MOCK) return mockGetCheckIns(userId);
  const res = await fetch(`/api/checkins?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendAlert(alert: FallAlert): Promise<{ logged: boolean; escalated: boolean }> {
  if (USE_MOCK) return mockSendAlert(alert);
  const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(alert) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
