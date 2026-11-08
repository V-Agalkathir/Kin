# Kin

Daily 2-minute check-in for aging parents: a sit-to-stand test and a 30-second talk, compared against their own baseline. Family get a plain-language "changed vs. normal" summary. Watch mode adds fall detection with a voice check and caregiver alert.

Kin flags change; it does not diagnose. Video never leaves the device, and audio is deleted after transcription.

## Run it

**Frontend** (Person A) — http://localhost:5173
```bash
cd frontend
npm install
npm run dev
npm test          # Vitest
```

**Backend** (Person B) — http://localhost:8000
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
copy .env.example .env         # then fill in keys (OPENAI_API_KEY is needed for check-ins)
uvicorn app.main:app --reload
pytest
```

The frontend proxies `/api/*` to the backend, so run both for the full check-in flow. The dashboard currently shows seeded demo data and works without the backend.

## Status

Phase 1 (MVP) in progress. Engines (sit-to-stand, speech features, baseline/flags) are built and tested; the check-in page, live dashboard data, LLM summaries, Supabase storage and Watch mode are still to wire up. The full TODO list is in `CLAUDE.md` under "Current status".

See `CLAUDE.md` for the brief, data contract, API and rules. Start Claude Code in the repo root.
