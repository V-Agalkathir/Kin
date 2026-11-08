// Phase 4 — Watch mode UI. Fall *detection* (PoseCamera → stepFall) is owned by the vision work:
// TODO(vision): mount <PoseCamera> while watching, feed lib/watch/fallDetector.ts, and call
// `onFall()` when it reports `fallen`. Until then, "Simulate a fall" drives the same flow.
import { useCallback, useEffect, useRef, useState } from "react";
import BigButton from "../components/BigButton";
import { sendAlert, USE_MOCK } from "../lib/api";
import { DEMO_FAMILY_CONTACT, DEMO_USER } from "../lib/demoUser";
import { loadAlerts, type LoggedAlert } from "../lib/mock/mockApi";
import { voiceCheck } from "../lib/watch/voiceCheck";

const PROMPT = "Are you okay? Say: I'm okay.";
const ATTEMPTS = 2;
const LISTEN_MS = 20_000;
const canListen = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

/**
 * Ask once. Always gives the full listening window before returning "no answer": speech recognition
 * can end early (mic blocked, network error, unsupported browser) and must not fast-track an alert
 * before the person has had time to press the on-screen button.
 */
async function askOnce(): Promise<boolean> {
  const started = Date.now();
  let heard = false;
  if (canListen) {
    heard = await voiceCheck(PROMPT, DEMO_USER.speechLang, LISTEN_MS).catch(() => false);
  } else {
    speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(PROMPT), { lang: DEMO_USER.speechLang }));
  }
  if (heard) return true;
  const left = LISTEN_MS - (Date.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
  return false;
}

type State =
  | { name: "off" }
  | { name: "watching" }
  | { name: "checking"; attempt: number; detectedAt: string }
  | { name: "ok" }
  | { name: "alerting" }
  | { name: "alerted"; at: string; failed: boolean };

export default function WatchPage() {
  const [state, setState] = useState<State>({ name: "off" });
  const [log, setLog] = useState<LoggedAlert[]>(() => loadAlerts(DEMO_USER.id));
  const run = useRef(0); // bumps on every new fall / cancel so stale voice checks are ignored

  const finish = useCallback(async (detectedAtIso: string, startedMs: number, respondedOk: boolean) => {
    const alert = {
      userId: DEMO_USER.id,
      detectedAt: detectedAtIso,
      respondedOk,
      secondsDown: Math.round((Date.now() - startedMs) / 100) / 10,
    };
    if (!respondedOk) setState({ name: "alerting" });
    let failed = false;
    try {
      await sendAlert(alert);
    } catch {
      failed = true;
    }
    if (USE_MOCK) setLog(loadAlerts(DEMO_USER.id));
    setState(respondedOk ? { name: "ok" } : { name: "alerted", at: new Date().toISOString(), failed });
  }, []);

  const onFall = useCallback(async () => {
    const id = ++run.current;
    const startedMs = Date.now();
    const detectedAt = new Date(startedMs).toISOString();
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      setState({ name: "checking", attempt, detectedAt });
      const answered = await askOnce();
      if (run.current !== id) return; // the person pressed "I'm okay" or turned watch mode off
      if (answered) return finish(detectedAt, startedMs, true);
    }
    finish(detectedAt, startedMs, false);
  }, [finish]);

  const pressedOkay = () => {
    if (state.name !== "checking") return;
    run.current++;
    speechSynthesis.cancel();
    finish(state.detectedAt, new Date(state.detectedAt).getTime(), true);
  };

  const turnOff = () => {
    run.current++;
    speechSynthesis.cancel();
    setState({ name: "off" });
  };

  // Stop speaking if the page is left mid-check.
  useEffect(() => () => { run.current++; speechSynthesis.cancel(); }, []);

  return (
    <section className="space-y-8">
      {state.name === "off" && (
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">Watch mode</h1>
          <p className="text-2xl leading-relaxed">
            For a device left on in one room. If it sees a fall, it asks out loud whether you're okay.
            If there's no answer, it calls and texts {DEMO_FAMILY_CONTACT.name}.
          </p>
          <ul className="space-y-2 text-xl list-disc pl-8 text-stone-700">
            <li>Video stays on this device. Only the alert is sent.</li>
            <li>It never calls emergency services by itself. Your family decides what to do.</li>
          </ul>
          <BigButton onClick={() => setState({ name: "watching" })}>Turn on Watch mode</BigButton>
        </div>
      )}

      {state.name === "watching" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-emerald-50 border-4 border-emerald-600 p-8 text-center space-y-3" role="status">
            <div className="flex items-center justify-center gap-3 text-3xl font-bold text-emerald-900">
              <span className="h-5 w-5 rounded-full bg-emerald-600 animate-pulse" aria-hidden /> Watching
            </div>
            <p className="text-2xl">If you fall, Kin will ask if you're okay.</p>
          </div>
          <BigButton variant="secondary" onClick={onFall}>Simulate a fall (demo)</BigButton>
          <BigButton variant="secondary" onClick={turnOff}>Turn off Watch mode</BigButton>
        </div>
      )}

      {state.name === "checking" && (
        <div className="space-y-8 text-center" role="alertdialog" aria-labelledby="ask">
          <h1 id="ask" className="text-6xl font-bold">Are you okay?</h1>
          <p className="text-3xl">Say <strong>"I'm okay"</strong> or press the button.</p>
          <BigButton variant="success" className="min-h-40 text-5xl" onClick={pressedOkay}>I'm okay</BigButton>
          <p className="text-xl text-stone-600" aria-live="polite">
            {canListen ? "Listening…" : "Waiting…"} (asking {state.attempt} of {ATTEMPTS}). If there's no answer we'll contact {DEMO_FAMILY_CONTACT.name}.
          </p>
        </div>
      )}

      {state.name === "alerting" && (
        <p className="py-12 text-center text-4xl font-bold" role="status">Contacting {DEMO_FAMILY_CONTACT.name}…</p>
      )}

      {state.name === "ok" && (
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold">Glad you're okay</h1>
          <p className="text-2xl">We won't contact anyone. Take your time getting up.</p>
          <BigButton onClick={() => setState({ name: "watching" })}>Keep watching</BigButton>
        </div>
      )}

      {state.name === "alerted" && (
        <div className="space-y-6 text-center">
          {state.failed ? (
            <>
              <h1 className="text-4xl font-bold text-red-800">We couldn't reach {DEMO_FAMILY_CONTACT.name}</h1>
              <p className="text-2xl">Please call someone for help if you can.</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold">We've let {DEMO_FAMILY_CONTACT.name} know</h1>
              <p className="text-2xl">
                They're getting a call and a text message{USE_MOCK && " (demo: nothing was actually sent)"}.
                Stay where you are if you're hurt.
              </p>
            </>
          )}
          <BigButton onClick={() => setState({ name: "watching" })}>I'm okay now — keep watching</BigButton>
        </div>
      )}

      {(state.name === "off" || state.name === "watching") && log.length > 0 && <AlertLog log={log} />}
    </section>
  );
}

function AlertLog({ log }: { log: LoggedAlert[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">Recent events</h2>
      <ul className="space-y-2">
        {[...log].reverse().slice(0, 5).map((a) => (
          <li key={a.detectedAt} className="rounded-xl bg-white p-4 shadow-sm text-xl flex flex-wrap justify-between gap-2">
            <span>{new Date(a.detectedAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
            <span className={a.respondedOk ? "text-emerald-800" : "text-amber-900 font-semibold"}>
              {a.respondedOk ? "Said they were okay" : "No answer — family contacted"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
