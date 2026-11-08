# Kin

Daily 2-minute check-in for aging parents: a sit-to-stand test and a 30-second talk, compared against their own baseline. Family get a plain-language "changed vs. normal" summary. Watch mode adds fall detection with a voice check and caregiver alert.

## Run it

**Frontend** (Person A)
```bash
cd frontend
npm install
npm run dev
```

**Backend** (Person B)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
copy .env.example .env         # then fill in keys
uvicorn app.main:app --reload
pytest
```

See `CLAUDE.md` for the brief, data contract and rules. Start Claude Code in the repo root.
