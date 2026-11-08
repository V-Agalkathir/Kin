import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import BigButton from "../components/BigButton";
import PoseCamera from "../components/PoseCamera";
import Reveal from "../components/Reveal";
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
  const n = step === "stand" ? 1 : step === "talk" ? 2 : null;
  if (n === null) return null;
  return <p className="text-xl font-semibold text-stone-500">Step {n} of 2</p>;
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8 py-6 text-center">
      <h1 className="text-5xl font-bold">Good to see you, {DEMO_USER.name}</h1>
      <p className="text-2xl text-stone-700">Your check-in takes about 2 minutes.</p>
      <BigButton onClick={onStart}>Start check-in</BigButton>
      <Reveal label="How does it work?">
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3 text-left text-xl leading-relaxed">
          <p>1. Stand up and sit down {TARGET_REPS} times from a chair.</p>
          <p>2. Talk about your day for {TALK_SECONDS} seconds.</p>
          <p className="text-stone-600">Use a sturdy chair without wheels, with your whole body in view. The video stays on this device.</p>
        </div>
      </Reveal>
    </div>
  );
}

function StandStep({ onDone }: { onDone: (sitToStandSec: number, reps: number) => void }) {
  const sts = useRef<StsState>(initialStsState());
  const [view, setView] = useState({ reps: 0, firstRiseMs: null as number | null, doneMs: null as number | null });
  const [legsVisible, setLegsVisible] = useState(false);
  // PoseCamera (owned by the vision work) only reports landmarks, so the first frame = camera ready.
  const [seenPerson, setSeenPerson] = useState(false);

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

  const finished = view.doneMs !== null;

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-bold">Stand up and sit down {TARGET_REPS} times</h1>
      <p className="text-2xl text-stone-700">At your own pace. Hold the chair if you need to.</p>

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

      <p className="text-center text-7xl font-bold tabular-nums" aria-live="polite">
        {view.reps} <span className="text-4xl text-stone-500">of {TARGET_REPS}</span>
      </p>

      {finished ? (
        <div className="space-y-4">
          <p className="text-3xl font-bold text-emerald-800 text-center">Well done! Sit and rest.</p>
          <BigButton onClick={() => onDone(stsSeconds(sts.current) ?? 0, sts.current.reps)}>Next</BigButton>
        </div>
      ) : (
        <div className="space-y-4">
          <BigButton variant="secondary" className="min-h-28 text-3xl" onClick={onTap}>I stood up</BigButton>
          <p className="text-lg text-stone-500 text-center">Press if a stand isn't counted.</p>
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
      <p className="text-2xl text-stone-700">Talk for {TALK_SECONDS} seconds about anything, like what you ate today.</p>

      {state === "recording" ? (
        <div className="text-center space-y-3" aria-live="polite">
          <div className="flex items-center justify-center gap-3 text-2xl font-semibold text-red-700">
            <span className="h-5 w-5 rounded-full bg-red-600 animate-pulse" aria-hidden /> Listening…
          </div>
          <div className="text-8xl font-bold tabular-nums">{left}</div>
          <div className="text-xl text-stone-500">seconds left</div>
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
    <div className="space-y-8 py-6 text-center">
      <span aria-hidden className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-4xl text-emerald-800">✓</span>
      <h1 className="text-5xl font-bold">All done — thank you!</h1>
      <p className="text-2xl leading-relaxed text-stone-700">{checkIn.summaryParent}</p>
      <BigButton onClick={onAgain}>Finish</BigButton>
      <Reveal label="See my results" hideLabel="Hide my results">
        <dl className="rounded-2xl bg-white p-6 shadow-sm space-y-3 text-left text-xl">
          <div className="flex justify-between gap-4"><dt>Stands</dt><dd className="font-semibold">{checkIn.repsDetected} in {checkIn.sitToStandSec.toFixed(1)} seconds</dd></div>
          <div className="flex justify-between gap-4"><dt>Words spoken</dt><dd className="font-semibold">{checkIn.wordCount}</dd></div>
        </dl>
      </Reveal>
    </div>
  );
}
