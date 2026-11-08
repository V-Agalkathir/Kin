# Demo script

Before: `npm run dev` in `frontend/` (mock mode works without the backend). Use Chrome or Edge, allow camera + mic, chair placed side-on to the camera with the whole body in frame. Clear localStorage `kin.checkins.v1` / `kin.alerts.v1` for a clean run.

Story: Daniel lives 1,240 miles from his mom, Margaret (78, Portland). kin is how he keeps up between calls.

1. **Family → Health report** (`/dashboard`):
   - Profile card: Mom, her local time, when she last checked in, green call button.
   - Today card: "4 changes worth a look". Resting heart rate up, fewer steps, slower sit-to-stand, longer pauses; blood pressure and sleep steady.
   - Tap **Steps**: two weeks of bars, the last days bright and below the dashed "usual" line.
   - **Care plan** from Dr. Chen's report: "Walk at least 5,000 steps a day" (NEW) shows it's being missed this week, while blood pressure is on target. kin tracks; the advice is the doctor's.
2. **Parent → Check-in** (`/`): "Good morning, Margaret" and today's walk toward her doctor's step goal. Start → stand up 5 times (ring fills, "I stood up" if a stand is missed) → 30 s talk → "All done".
3. **Back to Family:** her new check-in is the latest entry under "Past check-ins".
4. **Watch** (`/watch`): Turn on → "Simulate a fall (demo)" → "Are you okay?" spoken twice → stay silent → "We've let Daniel know". Or tap "I'm okay" to show the false-alarm path.

Talking points: her own baseline (not population norms); the two-days-in-a-row rule avoids one-off noise; watch data + check-in + doctor's plan in one calm report; no video off-device; no diagnosis and no medical advice from kin; family decides, and it never auto-dials emergency services.

Not real yet: watch readings and the care plan are simulated (needs a health-platform sync + report extraction); real summaries need the backend LLM; real fall detection and phone calls need the team's MediaPipe + Twilio work.
