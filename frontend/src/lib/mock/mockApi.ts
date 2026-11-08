// MOCK ONLY — stands in for the backend until it's ready (VITE_USE_MOCK, default on).
// Check-ins are saved to this browser's localStorage. Audio is discarded, never stored.
import type { CheckIn } from "../../types/checkin";
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
  if (flags.length === 0) return "Check-in completed. Everything was in line with their usual pattern.";
  return `Check-in completed. Compared with their usual: ${flags.map((f) => describeFlag(f).toLowerCase()).join("; ")}. This has shown up two check-ins in a row, so it may be worth a gentle chat.`;
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
