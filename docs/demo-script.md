# Demo script

Before: `npm run dev` in `frontend/` (mock mode works without the backend). Use Chrome or Edge, allow camera + mic, chair placed side-on to the camera with the whole body in frame. Clear localStorage `kin.checkins.v1` / `kin.alerts.v1` for a clean run.

1. **Family view** (`/dashboard`): latest check-in shows "Changed from usual" for sit-to-stand time and pauses; the trend charts show the last week drifting above the dashed "usual" line, with orange dots on flagged days. *Ready.*
2. **Live check-in** (`/`): stand up and sit down with the skeleton on screen, stands counting to 5 with a timer; "I stood up" button if a stand is missed. Then the 30 s talk with the countdown. *Ready (counting depends on PoseCamera/MediaPipe on the demo machine).*
3. **Result:** thank-you summary for the parent, then back to `/dashboard`, where the new check-in is at the top. *Ready on mocks. Real summaries need the backend LLM; real speech numbers need transcription.* Flags need ≥ 6 earlier check-ins (the seed history covers this).
4. **Watch mode** (`/watch`): turn it on and press "Simulate a fall (demo)" → "Are you okay?" spoken twice → stay silent → "We've let Priya know". Or press "I'm okay" to show the false-alarm path. Both appear in Recent events. *UI ready. Real fall detection and the actual phone call/SMS need the team's MediaPipe + Twilio work.*

Talking points: own baseline (not population norms), two-in-a-row rule to avoid one-off noise, no video off-device, no diagnosis, family decides and it never auto-dials emergency services, big-text UI built for older adults.
