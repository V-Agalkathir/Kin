// MOCK ONLY — stands in for the backend until it's ready (VITE_USE_MOCK, default on).
// Check-ins are saved to this browser's localStorage. Audio is discarded, never stored.
import type { CheckIn, FallAlert } from "../../types/checkin";
import { describeFlag } from "../metrics";
import { seedHistory } from "../seed";
import { computeFlags } from "./baseline";

const STORAGE_KEY = "kin.checkins.v1";

function readAll(): CheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(all: CheckIn[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked or full — the check-in still shows on screen, it just won't persist.
  }
}

export function loadLocalCheckIns(userId: string): CheckIn[] {
  return readAll().filter((c) => c.userId === userId);
}

export function clearLocalCheckIns(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function familySummary(flags: CheckIn["flags"]): string {
  if (flags.length === 0) return "Today's check-in looked like their usual.";
  const changes = flags.map((f) => describeFlag(f).toLowerCase());
  const list = changes.length > 1 ? `${changes.slice(0, -1).join(", ")} and ${changes[changes.length - 1]}` : changes[0];
  return `${list[0].toUpperCase()}${list.slice(1)}, two check-ins in a row. A gentle chat may help.`;
}

/** Seed history (with flags computed the same way the backend would) + this browser's saved check-ins, oldest first. */
export function mockGetCheckIns(userId: string): CheckIn[] {
  const seeded: CheckIn[] = [];
  for (const c of seedHistory(userId)) {
    const flags = computeFlags(c, seeded);
    seeded.push({ ...c, flags, summaryFamily: familySummary(flags) });
  }
  return [...seeded, ...loadLocalCheckIns(userId)].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Without the backend there's no transcription, so speech numbers are placeholders near the demo baseline.
function placeholderSpeech(random = Math.random) {
  const wpm = Math.round(126 + random() * 12);
  return { wpm, avgPauseMs: Math.round(450 + random() * 80), wordCount: Math.round(wpm / 2) };
}

export async function mockSubmitCheckIn(
  _audio: Blob, sitToStandSec: number, repsDetected: number, userId: string, language: string,
): Promise<CheckIn> {
  await new Promise((r) => setTimeout(r, 800)); // feel like a network call
  const history = mockGetCheckIns(userId);
  const metrics = { sitToStandSec, ...placeholderSpeech() };
  const flags = computeFlags(metrics, history);
  const checkIn: CheckIn = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    repsDetected,
    ...metrics,
    transcript: "",
    language,
    flags,
    summaryParent: "Thank you for checking in today. See you tomorrow!",
    summaryFamily: familySummary(flags),
  };
  writeAll([...readAll(), checkIn]);
  return checkIn;
}

// ---- Watch mode alerts ----
// Every alert is logged, including false alarms, so detection can be tuned (same as the backend).
const ALERTS_KEY = "kin.alerts.v1";
export type LoggedAlert = FallAlert & { escalated: boolean };

export function loadAlerts(userId: string): LoggedAlert[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ALERTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((a: LoggedAlert) => a.userId === userId) : [];
  } catch {
    return [];
  }
}

export async function mockSendAlert(alert: FallAlert): Promise<{ logged: boolean; escalated: boolean }> {
  const escalated = !alert.respondedOk; // backend would call + text the family alert contact here
  try {
    const all = JSON.parse(localStorage.getItem(ALERTS_KEY) ?? "[]");
    localStorage.setItem(ALERTS_KEY, JSON.stringify([...(Array.isArray(all) ? all : []), { ...alert, escalated }]));
  } catch { /* storage blocked */ }
  return { logged: true, escalated };
}
