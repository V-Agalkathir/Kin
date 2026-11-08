# Kin

Daily 2-minute check-in for aging parents: a sit-to-stand test and a 30-second talk, compared against their own baseline. Family get a plain-language "changed vs. normal" summary. Watch mode adds fall detection with a voice check and caregiver alert.

Kin flags change; it does not diagnose. Video never leaves the device, and audio is deleted after transcription.

## What's in the app

| Page | Route | What it does |
|---|---|---|
| Check-in | `/` | Intro → stand up and sit down 5 times (camera skeleton, live count + timer, big "I stood up" button as a fallback) → talk for 30 s with a countdown → summary |
| Family | `/dashboard` | Latest check-in with "changed from usual" flags and family summary, days checked in, trend charts with a "usual" line, recent check-ins |
| Watch | `/watch` | Always-on mode: after a fall it asks "Are you okay?" out loud (twice) with a huge "I'm okay" button; no answer → family is called and texted. Event log |

The whole UI is built for older adults: 20px base text, big high-contrast buttons, one task per screen, plain words.

## Run it

**Frontend** — http://localhost:5173
```bash
cd frontend
npm install
npm run dev
```

Checks:
```bash
npx vitest run
```
```bash
npx tsc -p .
```

The frontend works **on its own** in mock mode (the default): check-ins and Watch alerts are saved in the browser's localStorage, and the Family page shows 3 weeks of sample history plus your saved check-ins. Speech numbers are placeholders until the backend transcribes audio. To use the real backend, create `frontend/.env` with `VITE_USE_MOCK=false`; `/api/*` is proxied to port 8000. To reset demo data, clear the `kin.checkins.v1` and `kin.alerts.v1` localStorage keys.

Camera and microphone need a real browser (Chrome or Edge) on `localhost`. Without a camera, the "I stood up" button still completes the test.

**Backend** — http://localhost:8000
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
copy .env.example .env         # then fill in keys (OPENAI_API_KEY is needed for check-ins)
uvicorn app.main:app --reload
pytest
```

## Status

- **Frontend UI:** done for Phase 1 and the Watch mode screens, running on mocks.
- **In progress (team):** MediaPipe wiring (camera error handling, fall detection → `WatchPage`'s `onFall()`), backend (LLM summaries, Supabase storage, alert escalation via Twilio, auth).

Full details, file ownership, the data contract and the TODO list are in `CLAUDE.md`. Start Claude Code in the repo root.
