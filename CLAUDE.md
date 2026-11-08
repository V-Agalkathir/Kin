# kin — project brief for Claude

## What kin is
A personal health companion for an aging parent who lives far from their family. It combines:
- a **daily 2-minute check-in** (sit-to-stand test + 30 s talk) measuring mobility and speech,
- **wearable data** (resting heart rate, blood pressure, steps, sleep), the kind a watch syncs to a health app,
- the **care plan from the parent's doctor's report**, with progress measured from the data above.

Everything is compared against the parent's *own* usual, and the family gets a plain-language "what changed, what's steady" report. Not a diagnostic tool: it flags drift, it never diagnoses, and it never writes medical advice (care-plan text is copied from the doctor).

The brand is written lowercase: **kin**.

Users:
- **Parent**: does the check-in, sees a simple home screen with today's goal from their doctor. Older adult, may not be tech-comfortable.
- **Family member** (far away): sees the health report, the parent's profile and local time, and can call them in one tap.

## Team and ownership
Two people, split by ownership:
- **Person A, vision + frontend:** MediaPipe pose, sit-to-stand detection, fall detection, all UI.
- **Person B, speech + backend + AI:** transcription, speech features, baseline/anomaly logic, API, LLM summaries, DB, Twilio, health-data and report ingestion.

**Claude's scope right now: frontend UI only.** The team builds the backend and the MediaPipe integration themselves. Do not edit these unless explicitly asked:
- `backend/` (anything) and `supabase/`
- `frontend/src/components/PoseCamera.tsx` and `frontend/src/lib/pose/landmarker.ts` (MediaPipe setup + camera loop)
- Fall-detection thresholds in `frontend/src/lib/watch/fallDetector.ts`

Pages may *use* `PoseCamera` and the pure pose/watch helpers, but treat their interfaces as given.

## Data contract (shared with the backend)
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
  language: string;         // BCP-47, e.g. "en", "es"
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

### Frontend-only health types (not in the contract yet)
`frontend/src/types/health.ts` holds `ParentProfile`, `FamilyContact`, `DailyVitals` (date, restingHr, bpSystolic, bpDiastolic, steps, sleepMin), `CareReport` and `CareRecommendation` (text, `isNew`, optional `track`: `stepsPerDay` | `bpBelow` | `sleepAtLeast` | `dailyCheckIn`). These are mock-backed. Before the backend serves them, agree the shapes with Person B and move them into the contract.

## Stack
- Frontend: React 18 + TypeScript + Vite, Tailwind 3, Recharts, react-router 6. Tests: Vitest.
- Pose: `@mediapipe/tasks-vision` PoseLandmarker (lite model, GPU, VIDEO mode), in the browser. No video ever leaves the device.
- Backend: FastAPI (Python), pytest.
- Speech: OpenAI Whisper API (`whisper-1`, word timestamps); local faster-whisper is an option. Audio deleted right after transcription.
- LLM: one call per check-in returns both summaries as JSON; the key stays server-side. **Provider not chosen yet.**
- DB: Supabase (Postgres + auth). RLS: a parent's data is visible only to them and linked family.
- Alerts: Twilio SMS + voice call to the family alert contact.
- Wearables (planned): a web app **cannot read Apple Health/HealthKit directly**. Real data needs a phone companion app or a health-platform integration that syncs to the backend.

## Mock mode (Phase 1)
The frontend runs without the backend. `VITE_USE_MOCK` (default on; set `false` in `frontend/.env` to use the real API) switches `lib/api.ts`:
- `submitCheckIn` → `lib/mock/mockApi.ts`: discards audio, uses **placeholder** speech numbers (no transcription), computes flags, saves to localStorage `kin.checkins.v1`.
- `getCheckIns` → deterministic 21-day seed (`lib/seed.ts`, drift in the last week, ends yesterday) with flags, merged with localStorage check-ins, oldest first.
- `sendAlert` → logs to localStorage `kin.alerts.v1` (every alert, including "I'm okay" responses) and returns `{logged, escalated}`.
- `getVitals` → `lib/mock/wearable.ts`, **always mocked** (no backend endpoint): 21 days ending today. Last week drifts: fewer steps, slightly less sleep, resting HR up; BP steady.
- `getCareReport` → `lib/mock/careplan.ts`, **always mocked**: Dr. Sarah Chen, Primary care, report 24 days ago, 6 recommendations (3 new), next appointment in ~46 days.
- `lib/mock/baseline.ts` is a **TypeScript copy of `backend/app/engine/baseline.py`** for the mock (and reused for vitals flags). The backend stays the source of truth for check-ins.
- No auth: `lib/demoUser.ts` has `DEMO_USER` (Margaret Ellis, "Mom", 78, Portland, Oregon, `America/Los_Angeles`, "1,240 miles away", fictional 555 phone number, `en`) and `DEMO_FAMILY_CONTACT` (Daniel, Son).

To reset demo data, clear the two localStorage keys.

## API (backend, owned by the team)
Frontend calls `/api/*`; Vite proxies to `http://localhost:8000` and strips `/api`. Backend CORS allows `http://localhost:5173`.

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | done | `{ok: true}` |
| `POST /checkins` | done (in-memory) | multipart: `audio`, `sitToStandSec`, `repsDetected`, `userId`, `language` → `CheckIn` |
| `GET /checkins?userId=` | done (in-memory) | list for one user |
| `POST /alerts` | logs only | JSON `FallAlert` → `{logged, escalated}`. Twilio not wired |
| `GET /baseline?userId=` | not built | planned: current median/MAD per metric |
| vitals, care report | not built | frontend uses mocks via `getVitals` / `getCareReport` |

## Core logic
- **Knee angle** (`lib/pose/geometry.ts` `kneeAngleDeg`): hip–knee–ankle angle averaged over both legs; uses one leg if the other's landmarks are < 0.5 visibility; null if neither.
- **Sit-to-stand** (`lib/pose/sitToStand.ts`): pure state machine. Smoothing α = 0.4; "sitting" < 110°, "standing" > 160° after sitting. A rep counts on each sit→stand; time = first rise to 5th stand. `tapRep` is the manual "I stood up" fallback; it is ignored within 1 s of a counted rep.
- **Speech features** (backend): wpm, avg pause (gaps ≥ 250 ms), word count from word timestamps.
- **Baseline** (backend, mirrored in mock): robust z = (x − median) / (MAD × 1.4826) over the last 14 points; needs 5. Flag when |z| > 2 for 2 consecutive points in the same direction. A user needs ≥ 6 prior check-ins before anything can flag.
- **Vitals flags** (`lib/vitals.ts` `vitalFlags`): the same rule per day for resting HR, blood pressure (systolic), steps and sleep. `usualOf` = median of the 14 days before the latest.
- **Care-plan progress** (`lib/careplan.ts` `careProgress`): over the last 7 calendar days. Steps goal: days met (met if ≥ 70% of days). BP target: weekly average below both numbers. Sleep target: average ≥ target. Daily check-in: distinct days (met if ≥ 5). Untracked advice: no progress shown.
- **Report text** (Family page): names each changed item in plain words, then lists the steady ones ("… are in her usual range").
- **Summaries:** the LLM gets only numbers + flags, never audio/transcript. Calm, no medical terms; mention a doctor only for sustained changes. Mock uses fixed templates. Later the backend summary should also cover vitals.
- **Fall detection** (`lib/watch/fallDetector.ts`): hip drop > 1.2 image-heights/s with torso > 60° from vertical starts a timer; fallen after 10 s without torso < 30°. Untuned, not wired to a camera yet.

## Visual design
Dark, calm and minimal, like **Apple Health's dark mode**: near-black canvas, raised charcoal cards, coloured category icons, serif display numbers, lots of space. Warm, not techy.

- **Tokens** live in `frontend/tailwind.config.js`. Use them; don't hard-code new hex colours in components (Recharts needs hex, so it uses the values in `lib/metrics.ts` / `lib/vitals.ts`).
  - Surfaces: `canvas` #0A0A0B page, `card` #161618, `raised` #222225 (controls, selected tiles), `hairline` dividers.
  - Text: `ink` #F5F5F7, `ink-2` secondary, `ink-3` tertiary.
  - `accent` #FF7A4D (warm coral) is the **only** colour for primary actions, active tabs and links. Text on it is dark (`accent-ink`); `accent-soft` is for tinted backgrounds.
  - Status: `good` green, `notice` amber, `alert` red, each with a `-soft` dark tint.
  - Categories: `heart` red, `pressure` pink, `steps` orange, `sleep` cyan, `mobility` yellow, `speech` blue, `pauses` mint.
- **Don't:** gradients, purple/indigo, neon, glassy "AI" looks, light theme, heavy shadows.
- **Type:** `font-display` = Instrument Serif for page titles (`.large-title`) and big numbers (`.display-num`); Inter for everything else (Google Fonts in `index.html`). 20px base. `.eyebrow` = small uppercase label above titles.
- **Logo:** `components/Logo.tsx`: two overlapping rings (coral + white) and a lowercase serif "kin". Always lowercase in UI copy.
- **Building blocks:** `.card` (24px radius), `.focus-ring`, `BigButton` (primary coral / secondary charcoal / success green, dark text on bright fills), `Reveal` (list row with chevron), `Ring` (activity-style progress ring), `Icon` + `CategoryLabel` (coloured icon + label like Health headers), `Logo`. Lists are one card with inset hairline dividers.
- **Layout:** single column, max width `2xl`. Bottom tab bar under 640px; segmented control in the top bar above that.
- **Charts:** rounded bars in the category colour, 32% opacity normally and solid on flagged days, dashed grey "usual" line, small axis labels on the right, dark tooltip.

## Frontend UI (built)
**Principle: the report first, detail on request.** Lead each screen with a headline and one plain sentence. Grids show one number and one status per tile; charts, history and explanations open on tap (`Reveal` or tile selection).

- **App shell** (`App.tsx`): sticky translucent top bar with the logo; nav (Check-in `/`, Family `/dashboard`, Watch `/watch`); skip link; 404.
- **Check-in** (`pages/CheckInPage.tsx`, parent):
  - Home: date eyebrow, "Good morning, Margaret", a "Today's check-in" card with Start. **Today's walk** card: steps so far vs the doctor's step goal, with a progress bar. *Reveal:* how it works.
  - Step 1 of 2: PoseCamera; a yellow ring with "x of 5 stands" that turns green when done (time measured, not shown); "I stood up" fallback; legs-not-visible hint; restart.
  - Step 2 of 2: one-line prompt; a blue ring fills during the 30 s countdown; mic-error retry.
  - Done: tick, "All done", `summaryParent`, Finish. *Reveal:* "See my results".
- **Family** (`pages/DashboardPage.tsx`, family member): "Health report" title, then:
  1. **Profile card:** initials avatar, "Mom", full name + age, city + distance, local time there + last check-in, green **call** button (`tel:` link).
  2. **Today card:** "N changes worth a look" or "All in a usual range", plus the specific sentence.
  3. **Vitals & check-ins grid** (2 columns): resting HR, blood pressure, steps, sleep, sit-to-stand, speech (pace; its detail also shows pauses). Each tile shows its value and a Usual/Changed dot. Tapping a tile opens a two-week chart under the grid that scrolls into view.
  4. **Care plan:** "From Dr. Sarah Chen's report", date and count of new items. Each recommendation is the doctor's text with a NEW badge and progress ("5 of 7 days this week", "Average 129/80 this week") shown with a green tick or an amber marker. Footer: next appointment, plus "kin tracks progress; it doesn't give medical advice."
  5. *Reveal:* past check-ins. "Demo data · watch readings are simulated" note.
- **Watch** (`pages/WatchPage.tsx`): "Turn on" card → watching (pulsing shield) → "Are you okay?" (spoken twice, huge green button, each ask waits the full 20 s) → okay / contacting Daniel / alerted or couldn't reach. *Reveals:* how it works, recent events. "Simulate a fall (demo)" stands in for detection; the hook point is `onFall()`.
- **Accessibility:** 20px base, large buttons, `aria-expanded` / `aria-pressed` / `aria-live`, progressbar roles, reduced-motion respected, text alongside every colour.

## Current status
Done:
- Frontend UI above, fully on mocks. Vitest: geometry, sit-to-stand + tap, mock baseline, vitals flags + care-plan progress (27 tests). `tsc` and `vite build` clean.
- Backend scaffold: check-in pipeline, baseline + speech engines with tests, Whisper, Twilio helper, Supabase schema + read RLS.

Team TODO (not Claude's scope unless asked):
- MediaPipe: `PoseCamera` has no error/ready callbacks (camera denial is an uncaught promise; the page relies on the tap button) and draws dots only.
- Watch: mount `PoseCamera` + `stepFall` in `WatchPage` and call `onFall()`; tune thresholds; `voiceCheck` accepts any speech.
- Backend: LLM in `summarize()` (include vitals), Supabase storage, `/alerts` escalation, `GET /baseline`, auth, RLS gaps.
- Wearables: companion app / health-platform sync → vitals endpoint. Doctor's report: upload + extraction → care-report endpoint (keep the doctor's wording; mark new items vs the previous report).

Frontend follow-ups:
- Replace `DEMO_USER` with the signed-in profile; parent ↔ family linking UI; editable profile (city, phone).
- Report upload screen once the backend can extract recommendations.
- Calls are a plain `tel:` link. Analysing call audio for speech would need explicit consent from both people plus backend work; not built.
- Phase 3: localized UI + prompts, spoken step instructions, weekly digest.
- Bundle is ~720 kB (Recharts + MediaPipe); consider lazy-loading pages.

## Commands
Frontend (`frontend/`): `npm install`, `npm run dev` (5173), `npm test` (Vitest, watch) / `npx vitest run`, `npx tsc -p .`, `npm run build`. After changing `tailwind.config.js`, restart the dev server.
Backend (`backend/`): venv + `pip install -r requirements.txt`, `.env` from `.env.example`, `uvicorn app.main:app --reload` (8000), `pytest`.
Env: frontend `VITE_USE_MOCK` (default true), `VITE_SUPABASE_*` reserved for auth. Backend `OPENAI_API_KEY` for transcription; `LLM_API_KEY`, `SUPABASE_*`, `TWILIO_*` once wired.

## Build phases
1. **MVP (demo-able):** check-in flow, sit-to-stand, speech features, seeded history, health report, summaries. localStorage / in-memory allowed. ← *frontend done on mocks; backend + MediaPipe in progress*
2. **Real backend:** FastAPI + Supabase, auth, parent↔family linking, baseline/flag logic server-side, engine tests; wearable sync and doctor's-report ingestion.
3. **Polish:** multi-language, accessibility (voice prompts), weekly family digest.
4. **Watch mode (fall detection):** always-on mode on a dedicated device.
   - Detect: sudden hip drop + torso near-horizontal + no rise for ~10 s (MediaPipe, on-device).
   - Check: speak "Are you okay? Say 'I'm okay'" in the parent's language, listen ~20 s, ask once more.
   - Escalate: no answer → `POST /alerts` → Twilio call + SMS to the family contact. Never auto-dial emergency services; family decides.
   - Only the event leaves the device, never video. Log every alert, including false alarms.

## Repo layout
- `frontend/src/types/checkin.ts`: shared contract; `types/health.ts`: frontend-only health types
- `frontend/src/App.tsx`, `main.tsx`, `index.css`: shell, routing, global styles
- `frontend/src/pages/`: `CheckInPage`, `DashboardPage`, `WatchPage`
- `frontend/src/components/`: `BigButton`, `Reveal`, `Ring`, `Icon` (+ `CategoryLabel`), `Logo`, `PoseCamera` (team-owned)
- `frontend/tailwind.config.js`: design tokens (colours, radii, fonts)
- `frontend/src/lib/api.ts`: API client with mock switch, plus `getVitals` / `getCareReport`
- `frontend/src/lib/mock/`: `mockApi.ts` (localStorage check-ins + alerts), `baseline.ts` (+ test), `wearable.ts`, `careplan.ts`
- `frontend/src/lib/`: `vitals.ts`, `careplan.ts` (+ `vitals.test.ts`), `metrics.ts`, `seed.ts`, `demoUser.ts`
- `frontend/src/lib/pose/`: `geometry.ts` (+ test), `sitToStand.ts` (+ test), `landmarker.ts` (team-owned)
- `frontend/src/lib/speech/recorder.ts`: 30 s mic recorder
- `frontend/src/lib/watch/`: `fallDetector.ts`, `voiceCheck.ts`
- `backend/app/`: `main.py`, `models.py`, `routes/`, `engine/`, `services/`; `backend/tests/`
- `supabase/migrations/`: schema + RLS
- `docs/demo-script.md`: demo walkthrough

## Rules for Claude in this repo
- Stay in frontend UI unless asked; see "Team and ownership" for files not to touch.
- Keep the `CheckIn` contract stable; if a change is needed, say so instead of silently editing it. New health shapes go in `types/health.ts` until agreed.
- Keep detection/engine/report logic pure (no camera, network, DB) so it's unit-testable; I/O lives in components, pages, routes, services.
- Unit-test anything that computes: sit-to-stand, fall detection, baseline/flag math, vitals flags, care-plan progress.
- Older adults first: large text, `BigButton` for actions, plain words, one task per screen, text alongside colour.
- Keep the dark Apple Health–style look in "Visual design": tokens and building blocks, coral as the only action colour, serif for titles and numbers, no gradients or purple.
- Report first, detail on request: headline + one sentence; charts, history and explanations open on tap.
- Care-plan text is the doctor's own; kin measures progress but never writes or changes medical advice.
- Never send video off-device; never store raw audio; never send audio or transcripts to the LLM.
- No diagnostic language anywhere in UI, summaries or prompts. Never auto-dial emergency services.
- Run `npx vitest run` and `npx tsc -p .` before finishing. Small commits, one area each. Update "Current status" when things move.
