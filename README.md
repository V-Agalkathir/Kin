# kin

A personal health companion for an aging parent who lives far from family. kin combines a daily 2-minute check-in (sit-to-stand test + 30-second talk), watch-style health data (resting heart rate, blood pressure, steps, sleep) and the care plan from the parent's doctor. It compares everything with the parent's *own* usual and gives the family a plain-language report of what changed and what's steady.

kin flags change; it does not diagnose, and it never writes medical advice: care-plan items are the doctor's own words. Video never leaves the device, and audio is deleted after transcription.

## What's in the app

| Page | Route | For | What it shows |
|---|---|---|---|
| Check-in | `/` | Parent | Greeting, "Today's check-in" with Start, today's walk vs the doctor's step goal → stand up 5 times (camera, progress ring, "I stood up" fallback) → talk for 30 s → "All done" |
| Family | `/dashboard` | Family | **Health report**: profile card (age, city, distance, local time, one-tap call), today's summary of what changed, vitals and check-in tiles that open two-week charts, and the doctor's care plan with new items and progress |
| Watch | `/watch` | Parent's device | After a fall it asks "Are you okay?" out loud (twice) with a huge "I'm okay" button; no answer → family is called and texted |

**Look:** dark and calm, like Apple Health's dark mode. Near-black background, charcoal cards, a single warm coral accent, a colour per category, serif titles and numbers (Instrument Serif) with Inter for text. Built for older adults: 20px base text, big buttons, plain words.

## Run it

**Frontend** at http://localhost:5173
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

The frontend works **on its own** in mock mode (the default):
- **Check-ins** and Watch alerts are saved in the browser's localStorage; the Family page adds 3 weeks of sample history.
- **Watch readings** (heart rate, blood pressure, steps, sleep) and the **doctor's care plan** are simulated. A web app can't read Apple Health directly; real data will need a phone companion app or a health-platform sync on the backend.
- **Demo people:** Margaret Ellis ("Mom", 78, Portland) and her son Daniel. The phone number is a fictional 555 number.

To use the real backend for check-ins, create `frontend/.env` with `VITE_USE_MOCK=false`; `/api/*` is proxied to port 8000. To reset demo data, clear the `kin.checkins.v1` and `kin.alerts.v1` localStorage keys.

Camera and microphone need a real browser (Chrome or Edge) on `localhost`. Without a camera, the "I stood up" button still completes the test.

**Backend** at http://localhost:8000
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

- **Frontend UI:** check-in, health report with vitals and care plan, and Watch mode, all running on mocks.
- **In progress (team):** MediaPipe wiring, backend (LLM summaries, Supabase, Twilio alerts, auth), wearable sync, and doctor's-report ingestion.

Full details, file ownership, the data contract and the TODO list are in `CLAUDE.md`. Start Claude Code in the repo root.
