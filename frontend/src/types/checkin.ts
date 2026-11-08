// Shared contract — change only with both teammates agreeing (see CLAUDE.md).
export type Flag = { metric: string; direction: "up" | "down"; zScore: number };

export type CheckIn = {
  id: string;
  userId: string;
  createdAt: string;
  sitToStandSec: number;
  repsDetected: number;
  wpm: number;
  avgPauseMs: number;
  wordCount: number;
  transcript: string;
  language: string;
  flags: Flag[];
  summaryParent: string;
  summaryFamily: string;
};

export type FallAlert = {
  userId: string;
  detectedAt: string;
  respondedOk: boolean;
  secondsDown: number;
};
