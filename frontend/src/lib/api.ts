import type { CheckIn, FallAlert } from "../types/checkin";

export async function submitCheckIn(audio: Blob, sitToStandSec: number, repsDetected: number, userId: string, language: string): Promise<CheckIn> {
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
  const res = await fetch(`/api/checkins?userId=${encodeURIComponent(userId)}`);
  return res.json();
}

export async function sendAlert(alert: FallAlert): Promise<void> {
  await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(alert) });
}
