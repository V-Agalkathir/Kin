// Phase 4 — Watch mode UI. Fall *detection* (PoseCamera → stepFall) is owned by the vision work:
// TODO(vision): mount <PoseCamera> while watching, feed lib/watch/fallDetector.ts, and call
// `onFall()` when it reports `fallen`. Until then, "Simulate a fall" drives the same flow.
import { useCallback, useEffect, useRef, useState } from "react";
import BigButton from "../components/BigButton";
import Icon from "../components/Icon";
import Reveal from "../components/Reveal";
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
    <section className="space-y-7">
      {state.name === "off" && (
        <div className="space-y-7">
          <header>
            <p className="eyebrow">Fall safety</p>
            <h1 className="large-title">Watch mode</h1>
          </header>
          <article className="card p-6 space-y-5">
            <div className="flex items-start gap-4">
              <IconTile name="shield" color="#E5484D" />
              <p className="text-xl leading-relaxed text-ink-2">If you fall, kin checks on you and lets {DEMO_FAMILY_CONTACT.name} know.</p>
            </div>
            <BigButton onClick={() => setState({ name: "watching" })}>Turn on</BigButton>
          </article>
          <Reveal label="How does it work?">
            <div className="card p-5 space-y-3 text-lg leading-relaxed">
              <p>After a fall, kin asks out loud if you're okay. If there's no answer, it calls and texts {DEMO_FAMILY_CONTACT.name}.</p>
              <p className="text-ink-2">Video stays on this device. kin never calls emergency services by itself; your family decides.</p>
            </div>
          </Reveal>
        </div>
      )}

      {state.name === "watching" && (
        <div className="space-y-6">
          <div className="card p-8 text-center space-y-4" role="status">
            <span className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-good-soft text-good">
              <span className="absolute inset-0 rounded-full bg-good/20 animate-ping [animation-duration:2.4s]" aria-hidden />
              <Icon name="shield" className="relative h-11 w-11" />
            </span>
            <h1 className="large-title">Watching</h1>
            <p className="text-xl text-ink-2">If you fall, kin will ask if you're okay.</p>
          </div>
          <BigButton variant="secondary" onClick={onFall}>Simulate a fall (demo)</BigButton>
          <button type="button" onClick={turnOff} className="mx-auto block rounded-lg px-4 py-2 text-lg font-medium text-accent focus-ring">
            Turn off Watch mode
          </button>
        </div>
      )}

      {state.name === "checking" && (
        <div className="card p-8 space-y-7 text-center" role="alertdialog" aria-labelledby="ask">
          <h1 id="ask" className="text-5xl font-bold tracking-tight">Are you okay?</h1>
          <p className="text-2xl text-ink-2">Say "I'm okay" or tap the button.</p>
          <BigButton variant="success" className="min-h-[9rem] text-5xl rounded-card" onClick={pressedOkay}>I'm okay</BigButton>
          <p className="text-lg text-ink-3" aria-live="polite">
            {canListen ? "Listening" : "Waiting"} · asking {state.attempt} of {ATTEMPTS}
          </p>
        </div>
      )}

      {state.name === "alerting" && (
        <Status icon="bell" tone="notice" title={`Contacting ${DEMO_FAMILY_CONTACT.name}…`} />
      )}

      {state.name === "ok" && (
        <Status icon="check" tone="good" title="Glad you're okay" body="We won't contact anyone. Take your time getting up.">
          <BigButton onClick={() => setState({ name: "watching" })}>Keep watching</BigButton>
        </Status>
      )}

      {state.name === "alerted" && (
        state.failed ? (
          <Status icon="alert" tone="alert" title={`We couldn't reach ${DEMO_FAMILY_CONTACT.name}`} body="Please call someone for help if you can.">
            <BigButton onClick={() => setState({ name: "watching" })}>Back to watching</BigButton>
          </Status>
        ) : (
          <Status icon="bell" tone="notice" title={`We've let ${DEMO_FAMILY_CONTACT.name} know`}
            body={`They're getting a call and a text${USE_MOCK ? " (demo: nothing was sent)" : ""}. Stay where you are if you're hurt.`}>
            <BigButton onClick={() => setState({ name: "watching" })}>I'm okay now</BigButton>
          </Status>
        )
      )}

      {(state.name === "off" || state.name === "watching") && log.length > 0 && <AlertLog log={log} />}
    </section>
  );
}

const TONES = {
  good: "bg-good-soft text-good",
  notice: "bg-notice-soft text-notice",
  alert: "bg-alert-soft text-alert",
};

function Status({ icon, tone, title, body, children }: {
  icon: "check" | "bell" | "alert"; tone: keyof typeof TONES; title: string; body?: string; children?: React.ReactNode;
}) {
  return (
    <div className="card p-8 space-y-5 text-center" role="status">
      <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${TONES[tone]}`}>
        <Icon name={icon} className="h-10 w-10" strokeWidth={2.4} />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {body && <p className="text-xl leading-relaxed text-ink-2">{body}</p>}
      {children}
    </div>
  );
}

function IconTile({ name, color }: { name: "shield"; color: string }) {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-white" style={{ background: color }}>
      <Icon name={name} className="h-7 w-7" />
    </span>
  );
}

function AlertLog({ log }: { log: LoggedAlert[] }) {
  return (
    <Reveal label="Recent events" hideLabel="Hide recent events">
      <ul className="card overflow-hidden">
        {[...log].reverse().slice(0, 5).map((a, i) => (
          <li key={a.detectedAt} className="relative flex items-center justify-between gap-3 px-5 py-4">
            {i > 0 && <span className="absolute top-0 left-5 right-0 border-t border-hairline" aria-hidden />}
            <span className="text-xl">{new Date(a.detectedAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
            <span className={`text-lg ${a.respondedOk ? "text-good" : "text-notice font-medium"}`}>
              {a.respondedOk ? "Said they were okay" : "Family contacted"}
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
