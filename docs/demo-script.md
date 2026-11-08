# Demo script

Before: start backend (`uvicorn app.main:app --reload`) and frontend (`npm run dev`), allow camera + mic, chair placed side-on to the camera with full body in frame.

1. **Family view** (`/dashboard`): 3 weeks of trends; point out the last week drifting (slower sit-to-stand, lower wpm, longer pauses). *Needs:* seeded data (done).
2. **Live check-in** (`/`): sit-to-stand with skeleton on screen, rep counter ticking to 5, then 30s talk. *Needs:* CheckInPage flow (TODO A).
3. **Result:** new check-in appears with a "changed vs. normal" flag and both summaries (parent's language + English). *Needs:* dashboard on `getCheckIns()` (TODO A), LLM summaries (TODO B). Flags need ≥ 6 prior check-ins for that user on the backend — seed the backend or demo with the pre-drifted history.
4. **(Phase 4) Watch mode** (`/watch`): staged fall on a mat → "Are you okay?" voice check, no answer → family phone rings + SMS. *Needs:* WatchPage wiring (TODO A), `/alerts` escalation via Twilio (TODO B).

Talking points: own-baseline (not population norms), two-in-a-row rule to avoid one-off noise, no video off-device, no diagnosis, family decides — never auto-dials emergency services.
