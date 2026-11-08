# Kin — project brief for Claude

## What Kin is
A short daily check-in for aging parents that tracks mobility and speech against *their own* baseline, and tells the family in plain language when something has changed. Not a diagnostic tool — it flags drift, it doesn't diagnose.

Users:
- **Parent** — does a ~2-minute check-in (sit-to-stand test + 30s talk). May not be tech-comfortable, may not speak English.
- **Family member** — views trends and gets a "changed vs. normal" summary in English.

## Team
Two people. Split by ownership, not by task-of-the-day:
- **Person A — vision + frontend:** MediaPipe pose, sit-to-stand detection, check-in UI, dashboard.
- **Person B — speech + backend + AI:** recording/transcription, speech features, baseline/anomaly logic, API, LLM summaries, DB.
Shared contract: the `CheckIn` type below. Change it only together.

## Data contract
```ts
type CheckIn = {
  id: string;
  userId: string;
  createdAt: string;        // ISO
  sitToStandSec: number;    // time for 5 stands
  repsDetected: number;
  wpm: number;
  avgPauseMs: number;
  wordCount: number;
  transcript: string;
  language: string;         // BCP-47, e.g. "ta", "si", "en"
  flags: Flag[];            // computed server-side vs baseline
  summaryParent: string;    // parent's language
  summaryFamily: string;    // English
};
type Flag = { metric: string; direction: "up" | "down"; zScore: number };
```

## Stack
- Frontend: React + TypeScript + Vite, Tailwind, Recharts.
- Pose: `@mediapipe/tasks-vision` PoseLandmarker, runs in browser. No video ever leaves the device.
- Backend: FastAPI (Python). Endpoints: `POST /checkins`, `GET /checkins?userId=`, `GET /baseline?userId=`, `POST /alerts`.
- Speech: Whisper (API or local faster-whisper). Audio deleted after transcription.
- LLM: one call per check-in for both summaries; key stays server-side.
- DB: Supabase (Postgres + auth). Row-level security: a parent's data is visible only to them and linked family.

## Core logic
- **Sit-to-stand:** hip–knee–ankle angle; "standing" when knee angle > ~160°, "sitting" when < ~110°, with hysteresis + smoothing. Count 5 full cycles, time first-rise to fifth-stand. Fallback: manual tap per stand while skeleton still shows.
- **Baseline:** rolling median + MAD over the last 14 check-ins (min 5 before flagging). Flag when robust z-score > 2 for 2 consecutive check-ins — avoids one-off noise.
- **Summaries:** LLM gets only the numbers + flags, not raw audio. Tone: calm, non-alarming, no medical claims, suggests talking to a doctor only for sustained changes.

## Build phases
1. **MVP (demo-able):** check-in flow, sit-to-stand, speech features, seeded history, dashboard, summaries. localStorage allowed here.
2. **Real backend:** FastAPI + Supabase, auth, parent↔family linking, baseline/flag logic server-side, tests for the engine.
3. **Polish:** multi-language (Tamil, Sinhala first), accessibility (large text, voice prompts), weekly family digest.
4. **Watch mode (fall detection):** separate always-on mode on a dedicated device.
   - Detect: sudden hip drop + torso near-horizontal + no rise for ~10s (MediaPipe, on-device).
   - Check: speak "Are you okay? Say 'I'm okay'" in the parent's language, listen ~20s, ask once more.
   - Escalate: no answer → `POST /alerts` → Twilio call + SMS to the family contact with time and event report. Never auto-dial emergency services; family decides.
   - Only the event leaves the device, never video. Log every alert, including false alarms, for tuning.

## Repo layout
- `frontend/src/lib/pose/` — PoseLandmarker setup, sit-to-stand counter (A)
- `frontend/src/lib/speech/` — recording + speech features (B)
- `frontend/src/lib/watch/` — fall detector + voice check (A, Phase 4)
- `frontend/src/types/checkin.ts` — the shared contract (both)
- `backend/app/engine/` — baseline + flag math (B)
- `backend/app/services/` — Whisper, LLM, Twilio (B)
- `backend/tests/` — engine tests
- `supabase/migrations/` — schema + RLS

## Rules for Claude in this repo
- Keep the `CheckIn` contract stable; if a change is needed, say so explicitly instead of silently editing it.
- Write unit tests for sit-to-stand detection and baseline/flag math — these are the parts most likely to be quietly wrong.
- Never send video off-device; never store raw audio after transcription.
- No diagnostic language anywhere in UI or prompts.
- Prefer small PRs scoped to one owner's area.
