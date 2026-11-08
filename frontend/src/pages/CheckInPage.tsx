import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import BigButton from "../components/BigButton";
import PoseCamera from "../components/PoseCamera";
import { submitCheckIn } from "../lib/api";
import { DEMO_USER } from "../lib/demoUser";
import { kneeAngleDeg } from "../lib/pose/geometry";
import { initialStsState, stepSts, stsSeconds, tapRep, TARGET_REPS, type StsState } from "../lib/pose/sitToStand";
import { recordAudio } from "../lib/speech/recorder";
import type { CheckIn } from "../types/checkin";

const TALK_SECONDS = 30;

type Step =
  | { name: "intro" }
  | { name: "stand" }
  | { name: "talk"; sitToStandSec: number; reps: number }
  | { name: "submitting" }
  | { name: "done"; checkIn: CheckIn }
  | { name: "error"; message: string; retry: () => void };

export default function CheckInPage() {
  const [step, setStep] = useState<Step>({ name: "intro" });

  const submit = useCallback(async (audio: Blob, sitToStandSec: number, reps: number) => {
    setStep({ name: "submitting" });
    try {
      const checkIn = await submitCheckIn(audio, sitToStandSec, reps, DEMO_USER.id, DEMO_USER.language);
      setStep({ name: "done", checkIn });
    } catch {
      setStep({
        name: "error",
        message: "We couldn't save your check-in. Please try again.",
        retry: () => submit(audio, sitToStandSec, reps),
      });
    }
  }, []);

  return (
    <section className="space-y-6">
      <StepDots step={step.name} />
      {step.name === "intro" && <Intro onStart={() => setStep({ name: "stand" })} />}
      {step.name === "stand" && (
        <StandStep onDone={(sitToStandSec, reps) => setStep({ name: "talk", sitToStandSec, reps })} />
      )}
      {step.name === "talk" && (
        <TalkStep onRecorded={(audio) => submit(audio, step.sitToStandSec, step.reps)} />
      )}
      {step.name === "submitting" && <Status title="Saving your check-in…" />}
      {step.name === "done" && <Done checkIn={step.checkIn} onAgain={() => setStep({ name: "intro" })} />}
      {step.name === "error" && (
        <div className="space-y-6">
          <Status title="Something went wrong" body={step.message} />
          <BigButton onClick={step.retry}>Try again</BigButton>
        </div>
      )}
    </section>
  );
}

function StepDots({ step }: { step: Step["name"] }) {
  const order = ["stand", "talk", "done"] as const;
  const labels = { stand: "Stand up", talk: "Talk", done: "Finished" };
  const current = step === "submitting" || step === "error" ? "done" : step;
  if (current === "intro") return null;
  const idx = order.indexOf(current);
  return (
    <ol className="flex gap-3 text-lg" aria-label="Check-in progress">
      {order.map((s, i) => (
        <li key={s} aria-current={i === idx ? "step" : undefined}
          className={`flex-1 rounded-full px-4 py-2 text-center font-semibold ${
            i < idx ? "bg-sky-100 text-sky-900" : i === idx ? "bg-sky-700 text-white" : "bg-stone-200 text-stone-600"
          }`}>
          {i + 1}. {labels[s]}
        </li>
      ))}
    </ol>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Good to see you, {DEMO_USER.name}</h1>
      <p className="text-2xl leading-relaxed">Today's check-in takes about 2 minutes:</p>
      <ol className="space-y-3 text-2xl leading-relaxed list-decimal pl-8">
        <li>Stand up and sit down <strong>{TARGET_REPS} times</strong> from a chair.</li>
        <li>Talk to us about your day for <strong>{TALK_SECONDS} seconds</strong>.</li>
      </ol>
      <p className="text-xl text-stone-700">
        Use a sturdy chair without wheels. Place the screen so your whole body, from head to feet, is visible.
        The video stays on this device.
      </p>
      <BigButton onClick={onStart}>Start check-in</BigButton>
    </div>
  );
}

function StandStep({ onDone }: { onDone: (sitToStandSec: number, reps: number) => void }) {
  const sts = useRef<StsState>(initialStsState());
  const [view, setView] = useState({ reps: 0, firstRiseMs: null as number | null, doneMs: null as number | null });
  const [legsVisible, setLegsVisible] = useState(false);
  // PoseCamera (owned by the vision work) only reports landmarks, so the first frame = camera ready.
  const [seenPerson, setSeenPerson] = useState(false);
  const [now, setNow] = useState(() => performance.now());

  const sync = () => {
    const s = sts.current;
    setView((v) => (v.reps === s.reps && v.doneMs === s.doneMs ? v : { reps: s.reps, firstRiseMs: s.firstRiseMs, doneMs: s.doneMs }));
  };

  const onLandmarks = useCallback((lm: NormalizedLandmark[], tMs: number) => {
    const angle = kneeAngleDeg(lm);
    setSeenPerson(true);
    setLegsVisible(angle !== null);
    if (angle === null) return;
    sts.current = stepSts(sts.current, angle, tMs);
    sync();
  }, []);

  const onTap = () => {
    sts.current = tapRep(sts.current, performance.now());
    sync();
  };

  const restart = () => {
    sts.current = initialStsState();
    sync();
  };

  // Tick the on-screen timer while the test is running.
  useEffect(() => {
    if (view.firstRiseMs === null || view.doneMs !== null) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [view.firstRiseMs, view.doneMs]);

  const finished = view.doneMs !== null;
  const elapsedSec = view.firstRiseMs === null ? 0 : ((view.doneMs ?? now) - view.firstRiseMs) / 1000;

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-bold">Stand up and sit down {TARGET_REPS} times</h1>
      <p className="text-2xl">Go at a comfortable, steady pace. Hold the chair if you need to.</p>

      <div className="relative">
        <PoseCamera onLandmarks={onLandmarks} />
        {!seenPerson && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-2xl text-white">
            Starting camera… If the camera doesn't start, press the big button each time you stand up.
          </p>
        )}
        {seenPerson && !legsVisible && !finished && (
          <p className="absolute bottom-3 inset-x-3 rounded-xl bg-amber-100 text-amber-950 text-xl font-semibold p-3 text-center">
            Step back so we can see your legs and feet.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-center" aria-live="polite">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xl text-stone-600">Stands</div>
          <div className="text-6xl font-bold tabular-nums">{view.reps} <span className="text-3xl text-stone-500">/ {TARGET_REPS}</span></div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xl text-stone-600">Time</div>
          <div className="text-6xl font-bold tabular-nums">{elapsedSec.toFixed(1)}<span className="text-3xl text-stone-500"> s</span></div>
        </div>
      </div>

      {finished ? (
        <div className="space-y-4">
          <p className="text-3xl font-bold text-emerald-800 text-center">Well done! You can sit and rest.</p>
          <BigButton onClick={() => onDone(stsSeconds(sts.current) ?? elapsedSec, sts.current.reps)}>Next: talk to us</BigButton>
        </div>
      ) : (
        <div className="space-y-4">
          <BigButton variant="secondary" className="min-h-28 text-3xl" onClick={onTap}>I stood up</BigButton>
          <p className="text-lg text-stone-600 text-center">Press this if a stand isn't counted.</p>
        </div>
      )}
      {view.reps > 0 && (
        <button type="button" onClick={restart} className="w-full py-3 text-xl underline text-stone-700">Start this step again</button>
      )}
    </div>
  );
}

function TalkStep({ onRecorded }: { onRecorded: (audio: Blob) => void }) {
  const [state, setState] = useState<"ready" | "recording" | "failed">("ready");
  const [left, setLeft] = useState(TALK_SECONDS);

  useEffect(() => {
    if (state !== "recording") return;
    const started = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, TALK_SECONDS - Math.floor((Date.now() - started) / 1000))), 250);
    return () => clearInterval(id);
  }, [state]);

  const start = async () => {
    setLeft(TALK_SECONDS);
    setState("recording");
    try {
      const audio = await recordAudio(TALK_SECONDS * 1000);
      onRecorded(audio);
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Tell us about your day</h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-2 text-2xl leading-relaxed">
        <p>Talk for {TALK_SECONDS} seconds about anything you like, for example:</p>
        <ul className="list-disc pl-8 text-stone-700">
          <li>What did you eat today?</li>
          <li>Who did you talk to?</li>
          <li>What are you planning for tomorrow?</li>
        </ul>
      </div>

      {state === "recording" ? (
        <div className="text-center space-y-3" aria-live="polite">
          <div className="flex items-center justify-center gap-3 text-2xl font-semibold text-red-700">
            <span className="h-5 w-5 rounded-full bg-red-600 animate-pulse" aria-hidden /> Listening…
          </div>
          <div className="text-8xl font-bold tabular-nums">{left}</div>
          <div className="text-xl text-stone-600">seconds left</div>
          <div className="h-4 rounded-full bg-stone-200 overflow-hidden">
            <div className="h-full bg-sky-700 transition-all duration-300" style={{ width: `${((TALK_SECONDS - left) / TALK_SECONDS) * 100}%` }} />
          </div>
        </div>
      ) : (
        <>
          {state === "failed" && (
            <p className="rounded-xl bg-amber-100 text-amber-950 text-xl p-4">
              We couldn't use the microphone. Please allow microphone access and try again.
            </p>
          )}
          <BigButton onClick={start}>{state === "failed" ? "Try again" : "Start talking"}</BigButton>
        </>
      )}
    </div>
  );
}

function Status({ title, body }: { title: string; body?: string }) {
  return (
    <div className="py-12 text-center space-y-3" role="status">
      <h1 className="text-4xl font-bold">{title}</h1>
      {body && <p className="text-2xl">{body}</p>}
    </div>
  );
}

function Done({ checkIn, onAgain }: { checkIn: CheckIn; onAgain: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">All done — thank you!</h1>
      <p className="text-3xl leading-relaxed rounded-2xl bg-white p-6 shadow-sm">{checkIn.summaryParent}</p>
      <dl className="grid grid-cols-2 gap-4 text-center">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-xl text-stone-600">{checkIn.repsDetected} stands in</dt>
          <dd className="text-5xl font-bold tabular-nums">{checkIn.sitToStandSec.toFixed(1)} s</dd>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-xl text-stone-600">Words spoken</dt>
          <dd className="text-5xl font-bold tabular-nums">{checkIn.wordCount}</dd>
        </div>
      </dl>
      <p className="text-xl text-stone-700">Your family can see today's check-in.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/dashboard" className="block w-full min-h-20 px-8 py-5 text-2xl font-bold rounded-2xl text-center bg-sky-700 text-white hover:bg-sky-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400">
          See family view
        </Link>
        <BigButton variant="secondary" onClick={onAgain}>Back to start</BigButton>
      </div>
    </div>
  );
}
