# Kin — project brief for Claude

## What Kin is
A short daily check-in for aging parents that tracks mobility and speech against *their own* baseline, and tells the family in plain language when something has changed. Not a diagnostic tool — it flags drift, it doesn't diagnose.

Users:
- **Parent** — does a ~2-minute check-in (sit-to-stand test + 30s talk). Older adult, may not be tech-comfortable, may not speak English.
- **Family member** — views trends and gets a "changed vs. normal" summary in English.

## Team and ownership
Two people, split by ownership:
- **Person A — vision + frontend:** MediaPipe pose, sit-to-stand detection, fall detection, all UI.
- **Person B — speech + backend + AI:** transcription, speech features, baseline/anomaly logic, API, LLM summaries, DB, Twilio.

**Claude's scope right now: frontend UI only.** The team builds the backend and the MediaPipe integration themselves. Do not edit, unless explicitly asked:
- `backend/` (anything) and `supabase/`
- `frontend/src/components/PoseCamera.tsx`, `frontend/src/lib/pose/landmarker.ts` (MediaPipe setup + camera loop)
- Fall-detection thresholds in `frontend/src/lib/watch/fallDetector.ts`

Pages may *use* `PoseCamera` and the pure pose/watch helpers, but treat their interfaces as given.

## Data contract
Source of truth: `frontend/src/types/checkin.ts`, mirrored in `backend/app/models.py` (Pydantic). Both must change in the same PR, together with the migration.
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
- Frontend: React 18 + TypeScript + Vite, Tailwind 3, Recharts, react-router 6. Tests: Vitest.
- Pose: `@mediapipe/tasks-vision` PoseLandmarker (lite model, GPU, VIDEO mode), in browser. No video ever leaves the device.
- Backend: FastAPI (Python), pytest.
- Speech: OpenAI Whisper API (`whisper-1`, word timestamps); local faster-whisper is an option. Audio deleted right after transcription.
- LLM: one call per check-in returns both summaries as JSON; key stays server-side. **Provider not chosen yet.**
- DB: Supabase (Postgres + auth). RLS: a parent's data is visible only to them and linked family.
- Alerts: Twilio SMS + voice call to the family alert contact.

## Mock mode (Phase 1)
The frontend runs without the backend. `VITE_USE_MOCK` (default on; set `false` in `frontend/.env` to use the real API) switches `lib/api.ts`:
- `submitCheckIn` → `lib/mock/mockApi.ts`: discards audio, uses **placeholder** speech numbers (no transcription), computes flags, writes the check-in to localStorage `kin.checkins.v1`.
- `getCheckIns` → deterministic 21-day seed (`lib/seed.ts`, drift in the last week, ends yesterday) with flags computed, merged with localStorage check-ins, oldest first.
- `sendAlert` → logs to localStorage `kin.alerts.v1` (every alert, including "I'm okay" responses) and returns `{logged, escalated}`.
- `lib/mock/baseline.ts` is a **TypeScript copy of `backend/app/engine/baseline.py`** for the mock only. The backend stays the source of truth; delete the copy when the mock goes away.
- No auth: everyone is `DEMO_USER` ("Amma", `demo-parent`, `en`) with family contact "Priya" — `lib/demoUser.ts`.

To reset demo data, clear those two localStorage keys.

## API (backend, owned by the team)
Frontend calls `/api/*`; Vite proxies to `http://localhost:8000` and strips `/api`. Backend CORS allows `http://localhost:5173`.

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | done | `{ok: true}` |
| `POST /checkins` | done (in-memory) | multipart: `audio`, `sitToStandSec`, `repsDetected`, `userId`, `language` → `CheckIn` |
| `GET /checkins?userId=` | done (in-memory) | list for one user |
| `POST /alerts` | logs only | JSON `FallAlert` → `{logged, escalated}`. Twilio not wired |
| `GET /baseline?userId=` | not built | planned: current median/MAD per metric |

## Core logic
- **Knee angle** (`lib/pose/geometry.ts` `kneeAngleDeg`): hip–knee–ankle angle averaged over both legs; uses one leg if the other's landmarks are < 0.5 visibility; null if neither.
- **Sit-to-stand** (`lib/pose/sitToStand.ts`): pure state machine. Smoothing α = 0.4; "sitting" < 110°, "standing" > 160° after sitting. Rep on each sit→stand; time = first rise to 5th stand. `tapRep` is the manual "I stood up" fallback: counts a rep and marks standing so detection waits for a sit; ignored within 1 s of a counted rep to avoid double counting.
- **Speech features** (backend): wpm, avg pause (gaps ≥ 250 ms), word count from word timestamps.
- **Baseline** (backend, mirrored in mock): robust z = (x − median) / (MAD × 1.4826) over last 14 check-ins; needs 5 points. Flag when |z| > 2 for 2 consecutive check-ins in the same direction. Metrics: `sitToStandSec`, `wpm`, `avgPauseMs`. So a user needs ≥ 6 prior check-ins before anything can flag.
- **Summaries:** LLM gets only numbers + flags, never audio/transcript. Calm, no medical terms; doctor only for sustained changes. Mock uses fixed templates.
- **Fall detection** (`lib/watch/fallDetector.ts`): hip drop > 1.2 image-heights/s with torso > 60° from vertical starts a timer; fallen after 10 s without torso < 30°. Untuned, not wired to a camera yet.

## Visual design
Calm, minimal, **Apple Health–style**: grouped light-grey background, white rounded cards, big bold titles, coloured category icons, lots of space. Warm and friendly, not techy.

- **Tokens** live in `frontend/tailwind.config.js`. Use them; don't hard-code new hex colours in components.
  - Surfaces: `canvas` #F2F2F7 page, `card` white, `hairline` dividers, `fill` quiet controls.
  - Text: `ink` #1C1C1E, `ink-2` secondary, `ink-3` tertiary.
  - `accent` #D9663F (warm clay): the **only** colour for primary actions, active tabs, links.
  - Status: `good` green, `notice` orange, `alert` red, each with a `-soft` tint for icon circles.
  - Categories (icons, charts, rings): `mobility` orange, `speech` blue, `pauses` teal, `watch` red. Hex values are also in `lib/metrics.ts` for Recharts.
- **Don't:** gradients, purple/indigo, dark/black themes, neon, glassy "AI" looks, heavy shadows, borders around cards.
- **Type:** system font (SF on Apple devices), with Inter as the fallback from Google Fonts in `index.html`. 20px base. Classes `.large-title` (page title), `.eyebrow` (small uppercase date/section above the title).
- **Building blocks** (`index.css` + components): `.card` (white, 22px radius, faint shadow), `.focus-ring`, `BigButton` (primary clay / secondary white / success green, 16px radius), `Reveal` (list row with chevron), `Ring` (activity-style progress ring), `Icon` + `CategoryLabel` (stroke icons; coloured icon + label like Health headers). Lists are one card with inset hairline dividers.
- **Layout:** single column, max width `2xl`. Bottom tab bar (icons + labels) under 640px; segmented control in the top bar above that.
- **Charts:** Health-style rounded bars in the category colour, 35% opacity normally and solid for flagged check-ins, dashed grey "usual" line, light axis labels on the right, no grid.

## Frontend UI (built)
**Design principle: summary first, details only on request.** Each screen shows one headline, one short sentence and one main action. Anything more (numbers, charts, history, explanations) sits behind a `Reveal` toggle ("See trends", "See my results", "How does it work?"). Don't add always-visible stats, metric tiles or extra explanatory text; put new detail behind a `Reveal`.

- **App shell** (`App.tsx`): sticky translucent top bar with the Kin mark; nav (Check-in `/`, Family `/dashboard`, Watch `/watch`) as a segmented control on wide screens and a bottom tab bar on phones; skip link; 404.
- **Check-in** (`pages/CheckInPage.tsx`):
  - Intro: greeting, "about 2 minutes", Start. *Reveal:* how it works and chair/privacy tips.
  - Step 1 of 2, sit-to-stand: PoseCamera, an orange progress ring with "x of 5 stands" (turns green when done; time is measured but not shown), "I stood up" fallback button, legs-not-visible hint, "start this step again".
  - Step 2 of 2, talk: one-line prompt, mic icon in a blue ring that fills during the 30 s countdown. Mic-error retry.
  - Saving → done: tick, "All done — thank you!", `summaryParent`, Finish. *Reveal:* "See my results" (stands + time, words spoken).
  - Error screen with retry if submit fails.
- **Family** (`pages/DashboardPage.tsx`): date eyebrow + "Summary" title, then one highlight card: the parent's name with a coloured heart, "Today/Yesterday", "Doing well" or "Something has changed", and the latest `summaryFamily`. *Reveals:* "Show trends" (a card per metric with the latest value, "usual", and a two-week bar chart; "usual" is the median of the previous 14) and "Show past check-ins" (last 7, Usual/Changed with plain-language flags). Small "Demo data" note in mock mode.
- **Watch** (`pages/WatchPage.tsx`): intro line + "Turn on Watch mode". *Reveal:* how it works and privacy. Then watching → "Are you okay?" (spoken prompt + huge green "I'm okay" button, asked twice, each ask always waits the full 20 s unless an answer is heard) → okay, or "contacting family" → alerted ("couldn't reach" on failure). *Reveal:* "See recent events". **"Simulate a fall (demo)" stands in for detection**; the hook point is `onFall()` (TODO at top of file).
- **Accessibility:** base font 20px (all Tailwind rem sizes scale), `BigButton` (min 80px tall, variants primary/secondary/success, amber focus ring), `Reveal` toggles with `aria-expanded`, large nav targets, `aria-live` on counters, reduced-motion respected, no colour-only status.
- **Shared bits:** `components/BigButton.tsx`, `components/Reveal.tsx`, `lib/metrics.ts` (plain-language metric labels + `describeFlag`), `lib/demoUser.ts`.

## Current status
Done:
- Frontend UI above, running fully on mock mode. Vitest: geometry, sit-to-stand + tap fallback, mock baseline (16 tests). `tsc` and `vite build` clean.
- Backend scaffold: check-in pipeline, baseline + speech engines with tests, Whisper, Twilio helper, Supabase schema + read RLS.

Team TODO (not Claude's scope unless asked):
- MediaPipe: `PoseCamera` has no error/ready callbacks (camera denial is an uncaught promise; the page just keeps "Starting camera…" and relies on the tap button), draws dots only, restarts if `onLandmarks` identity changes (pages pass a stable callback).
- Watch: mount `PoseCamera` + `stepFall` in `WatchPage` and call `onFall()`; tune thresholds; `voiceCheck` accepts any speech and starts listening while still speaking.
- Backend: LLM in `summarize()`, Supabase storage, `/alerts` escalation via `family_links.is_alert_contact`, `GET /baseline`, insert/update RLS + RLS on `profiles`/`family_links`, auth.

Frontend follow-ups:
- Swap `DEMO_USER` for the signed-in profile once auth exists; parent ↔ family linking UI.
- Phase 3: localized UI + prompts (Tamil, Sinhala), spoken step instructions, weekly digest.
- Bundle is ~720 kB (Recharts + MediaPipe); consider lazy-loading pages.

## Commands
Frontend (`frontend/`): `npm install`, `npm run dev` (5173), `npm test` (Vitest, watch) / `npx vitest run`, `npx tsc -p .`, `npm run build`.
Backend (`backend/`): venv + `pip install -r requirements.txt`, `.env` from `.env.example`, `uvicorn app.main:app --reload` (8000), `pytest`.
Env: frontend `VITE_USE_MOCK` (default true), `VITE_SUPABASE_*` reserved for auth. Backend `OPENAI_API_KEY` for transcription; `LLM_API_KEY`, `SUPABASE_*`, `TWILIO_*` once wired.

## Build phases
1. **MVP (demo-able):** check-in flow, sit-to-stand, speech features, seeded history, dashboard, summaries. localStorage / in-memory allowed. ← *frontend done on mocks; backend + MediaPipe in progress*
2. **Real backend:** FastAPI + Supabase, auth, parent↔family linking, baseline/flag logic server-side, tests for the engine.
3. **Polish:** multi-language (Tamil, Sinhala first), accessibility (large text, voice prompts), weekly family digest.
4. **Watch mode (fall detection):** always-on mode on a dedicated device.
   - Detect: sudden hip drop + torso near-horizontal + no rise for ~10s (MediaPipe, on-device).
   - Check: speak "Are you okay? Say 'I'm okay'" in the parent's language, listen ~20s, ask once more.
   - Escalate: no answer → `POST /alerts` → Twilio call + SMS to the family contact. Never auto-dial emergency services; family decides.
   - Only the event leaves the device, never video. Log every alert, including false alarms.

## Repo layout
- `frontend/src/types/checkin.ts` — shared contract
- `frontend/src/App.tsx`, `main.tsx`, `index.css` — shell, routing, global styles
- `frontend/src/pages/` — `CheckInPage`, `DashboardPage`, `WatchPage`
- `frontend/src/components/` — `BigButton`, `Reveal`, `Ring`, `Icon` (+ `CategoryLabel`), `PoseCamera` (team-owned)
- `frontend/tailwind.config.js` — design tokens (colours, radii, font)
- `frontend/src/lib/api.ts` — API client with mock switch
- `frontend/src/lib/mock/` — `mockApi.ts` (localStorage check-ins + alerts), `baseline.ts` (+ test)
- `frontend/src/lib/pose/` — `geometry.ts` (+ test), `sitToStand.ts` (+ test), `landmarker.ts` (team-owned)
- `frontend/src/lib/speech/recorder.ts` — 30s mic recorder
- `frontend/src/lib/watch/` — `fallDetector.ts`, `voiceCheck.ts`
- `frontend/src/lib/` — `seed.ts`, `metrics.ts`, `demoUser.ts`
- `backend/app/` — `main.py`, `models.py`, `routes/`, `engine/`, `services/`; `backend/tests/`
- `supabase/migrations/` — schema + RLS
- `docs/demo-script.md` — demo walkthrough

## Rules for Claude in this repo
- Stay in frontend UI unless asked; see "Team and ownership" for files not to touch.
- Keep the contract stable; if a change is needed, say so instead of silently editing it.
- Keep detection/engine code pure (no camera, network, DB) so it's unit-testable; I/O lives in components, pages, routes, services.
- Unit-test anything that computes: sit-to-stand, fall detection, baseline/flag math.
- Older adults first: large text, `BigButton` for actions, plain words, one task per screen, text alongside colour.
- Keep the Apple Health–style look in "Visual design": use the tokens and building blocks, with clay as the only action colour; no gradients, purple or dark themes.
- Summary first: show the headline and one sentence; numbers, charts, history and explanations go behind a `Reveal` so they appear only when the person asks.
- Never send video off-device; never store raw audio; never send audio or transcripts to the LLM.
- No diagnostic language anywhere in UI, summaries or prompts. Never auto-dial emergency services.
- Run `npx vitest run` and `npx tsc -p .` before finishing. Small commits, one area each. Update "Current status" when things move.
