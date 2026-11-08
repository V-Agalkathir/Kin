# Kin — project brief for Claude

## What Kin is
A short daily check-in for aging parents that tracks mobility and speech against *their own* baseline, and tells the family in plain language when something has changed. Not a diagnostic tool — it flags drift, it doesn't diagnose.

Users:
- **Parent** — does a ~2-minute check-in (sit-to-stand test + 30s talk). May not be tech-comfortable, may not speak English.
- **Family member** — views trends and gets a "changed vs. normal" summary in English.

## Team
Two people. Split by ownership, not by task-of-the-day:
- **Person A — vision + frontend:** MediaPipe pose, sit-to-stand detection, check-in UI, dashboard, watch-mode UI.
- **Person B — speech + backend + AI:** recording/transcription, speech features, baseline/anomaly logic, API, LLM summaries, DB, Twilio.
Shared contract: the types below. Change them only together.

## Data contract
Source of truth: `frontend/src/types/checkin.ts`, mirrored in `backend/app/models.py` (Pydantic). Both files must change in the same PR.
```ts
type CheckIn = {
  id: string;
  userId: string;
  createdAt: string;        // ISO
  sitToStandSec: number;    // time from first rise to fifth stand
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

// Watch mode (Phase 4)
type FallAlert = {
  userId: string;
  detectedAt: string;       // ISO
  respondedOk: boolean;     // parent answered the voice check
  secondsDown: number;
};
```
DB columns in `supabase/migrations/0001_init.sql` are the snake_case equivalents.

## Stack
- Frontend: React 18 + TypeScript + Vite, Tailwind, Recharts, react-router. Tests: Vitest.
- Pose: `@mediapipe/tasks-vision` PoseLandmarker (lite model, GPU delegate, VIDEO mode), runs in browser. No video ever leaves the device.
- Backend: FastAPI (Python). Tests: pytest.
- Speech: OpenAI Whisper API (`whisper-1`, word timestamps). Option to swap to local faster-whisper. Audio deleted right after transcription.
- LLM: one call per check-in returns both summaries as JSON; key stays server-side. **Provider not chosen yet.**
- DB: Supabase (Postgres + auth). Row-level security: a parent's data is visible only to them and linked family.
- Alerts: Twilio SMS + voice call to the family alert contact.

## API
Frontend calls `/api/*`; Vite proxies to `http://localhost:8000` and strips the `/api` prefix. Backend CORS allows `http://localhost:5173`.

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | done | `{ok: true}` |
| `POST /checkins` | done (in-memory) | multipart: `audio`, `sitToStandSec`, `repsDetected`, `userId`, `language` → transcribe → features → flags → summaries → `CheckIn` |
| `GET /checkins?userId=` | done (in-memory) | list for one user |
| `POST /alerts` | logs only | JSON `FallAlert`; returns `{logged, escalated}`. Twilio call not wired |
| `GET /baseline?userId=` | **not built** | planned: current median/MAD per metric |

## Core logic
- **Sit-to-stand** (`frontend/src/lib/pose/sitToStand.ts`): pure state machine fed knee angles. Exponential smoothing (α = 0.4); "sitting" when < 110°, "standing" when > 160° after sitting (hysteresis). Rep counted on each sit→stand; time = first rise to 5th stand. Planned fallback: manual tap per stand while skeleton still shows.
- **Speech features** (`backend/app/engine/speech_features.py`): from word timestamps — wpm, avg pause (gaps ≥ 250 ms only), word count.
- **Baseline** (`backend/app/engine/baseline.py`): robust z = (x − median) / (MAD × 1.4826) over the last 14 check-ins; no z until 5 points of history. Flag when |z| > 2 for 2 consecutive check-ins in the same direction. Metrics flagged: `sitToStandSec`, `wpm`, `avgPauseMs`.
- **Summaries** (`backend/app/services/summarize.py`): LLM gets only numbers + flags, never audio or transcript. Calm, non-alarming, no medical terms; mention a doctor only for sustained changes.
- **Fall detection** (`frontend/src/lib/watch/fallDetector.ts`): hip drop velocity > 1.2 image-heights/s with torso > 60° from vertical starts a "down" timer; fallen after 10 s without torso returning < 30°. Thresholds untuned.

## Current status (as of the scaffold commit)
Done:
- Sit-to-stand state machine + Vitest tests; angle geometry; PoseLandmarker setup; `PoseCamera` component (webcam + landmark dots).
- 30s audio recorder; API client (`lib/api.ts`).
- Dashboard with Recharts lines over **seeded** data (`lib/seed.ts`: 21 days, decline in last week).
- Backend: check-in pipeline, baseline + speech engines with pytest tests, Whisper transcription, Twilio helper, Supabase schema + read RLS.
- Watch mode pure logic: `fallDetector.ts`, `voiceCheck.ts` (TTS + Web Speech recognition).

Stubbed / TODO:
- `CheckInPage` — only a Start button; needs intro → sit-to-stand → talk → submit → summary flow, plus tap fallback (A).
- `DashboardPage` — swap seed data for `getCheckIns()`, show flags + `summaryFamily` (A).
- `WatchPage` — placeholder; wire PoseCamera → `stepFall` → `voiceCheck` ×2 → `sendAlert` (A).
- `summarize()` returns placeholder text; pick provider and wire the LLM call (B).
- Storage is an in-memory dict in `routes/checkins.py`; move to Supabase (B, Phase 2).
- `/alerts` doesn't escalate; look up `family_links.is_alert_contact` and call `notify.alert_family` (B, Phase 4).
- `GET /baseline` endpoint (B).
- Supabase: no RLS on `profiles`/`family_links`, no insert/update policies yet; auth not wired in either app.
- `voiceCheck` accepts any speech as "okay" and prompt isn't localized.

## Commands
Frontend (`frontend/`): `npm install`, `npm run dev` (port 5173), `npm test` (Vitest), `npm run build`.
Backend (`backend/`): venv + `pip install -r requirements.txt`, copy `.env.example` → `.env`, `uvicorn app.main:app --reload` (port 8000), `pytest`.
Env: backend needs `OPENAI_API_KEY` for transcription; `LLM_API_KEY`, `SUPABASE_*`, `TWILIO_*` once those are wired. Frontend `VITE_SUPABASE_*` reserved for Phase 2 auth.

## Build phases
1. **MVP (demo-able):** check-in flow, sit-to-stand, speech features, seeded history, dashboard, summaries. localStorage / in-memory allowed here. ← *current*
2. **Real backend:** FastAPI + Supabase, auth, parent↔family linking, baseline/flag logic server-side, tests for the engine.
3. **Polish:** multi-language (Tamil, Sinhala first), accessibility (large text, voice prompts), weekly family digest.
4. **Watch mode (fall detection):** separate always-on mode on a dedicated device.
   - Detect: sudden hip drop + torso near-horizontal + no rise for ~10s (MediaPipe, on-device).
   - Check: speak "Are you okay? Say 'I'm okay'" in the parent's language, listen ~20s, ask once more.
   - Escalate: no answer → `POST /alerts` → Twilio call + SMS to the family contact with time and event report. Never auto-dial emergency services; family decides.
   - Only the event leaves the device, never video. Log every alert, including false alarms, for tuning.

## Repo layout
- `frontend/src/types/checkin.ts` — the shared contract (both)
- `frontend/src/lib/pose/` — PoseLandmarker setup, geometry, sit-to-stand counter + tests (A)
- `frontend/src/lib/speech/` — audio recorder (B)
- `frontend/src/lib/watch/` — fall detector + voice check (A, Phase 4)
- `frontend/src/lib/api.ts` — backend client; `lib/seed.ts` — demo history
- `frontend/src/components/PoseCamera.tsx` — webcam + skeleton overlay (A)
- `frontend/src/pages/` — `CheckInPage` (`/`), `DashboardPage` (`/dashboard`), `WatchPage` (`/watch`) (A)
- `backend/app/main.py` — app, CORS, routers
- `backend/app/models.py` — Pydantic mirror of the contract (both)
- `backend/app/routes/` — `checkins.py`, `alerts.py` (B)
- `backend/app/engine/` — baseline + speech-feature math (B)
- `backend/app/services/` — Whisper (`transcribe`), LLM (`summarize`), Twilio (`notify`) (B)
- `backend/tests/` — engine tests
- `supabase/migrations/` — schema + RLS
- `docs/demo-script.md` — demo walkthrough

## Rules for Claude in this repo
- Keep the contract stable; if a change is needed, say so explicitly instead of silently editing it. When it does change, update `checkin.ts`, `models.py` and the migration together.
- Keep detection/engine code pure (no camera, network or DB) so it stays unit-testable; I/O lives in components, routes and services.
- Write unit tests for sit-to-stand, fall detection and baseline/flag math — these are the parts most likely to be quietly wrong.
- Never send video off-device; never store raw audio after transcription; never send audio or transcripts to the LLM.
- No diagnostic language anywhere in UI or prompts.
- Never auto-dial emergency services.
- Prefer small PRs scoped to one owner's area. Update the "Current status" section above when something moves from TODO to done.
