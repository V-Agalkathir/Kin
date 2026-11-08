import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import BigButton from "../components/BigButton";
import Icon from "../components/Icon";
import PoseCamera from "../components/PoseCamera";
import Reveal from "../components/Reveal";
import Ring from "../components/Ring";
import { getCareReport, getVitals, submitCheckIn } from "../lib/api";
import { DEMO_USER } from "../lib/demoUser";
import { METRIC_INFO } from "../lib/metrics";
import { kneeAngleDeg } from "../lib/pose/geometry";
import { initialStsState, stepSts, stsSeconds, tapRep, TARGET_REPS, type StsState } from "../lib/pose/sitToStand";
import { recordAudio } from "../lib/speech/recorder";
import type { CheckIn } from "../types/checkin";
import type { CareReport, DailyVitals } from "../types/health";

const TALK_SECONDS = 30;
const MOBILITY = METRIC_INFO.sitToStandSec.color;
const SPEECH = METRIC_INFO.wpm.color;

type Step =
  | { name: "intro" }
  | { name: "stand" }
  | { name: "talk"; sitToStandSec: number; reps: number }
  | { name: "submitting" }
  | { name: "done"; checkIn: CheckIn }
  | { name: "error"; message: string; retry: () => void };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

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
    <section className="space-y-7">
      {step.name === "intro" && <Intro onStart={() => setStep({ name: "stand" })} />}
      {step.name === "stand" && (
        <StandStep onDone={(sitToStandSec, reps) => setStep({ name: "talk", sitToStandSec, reps })} />
      )}
      {step.name === "talk" && (
        <TalkStep onRecorded={(audio) => submit(audio, step.sitToStandSec, step.reps)} />
      )}
      {step.name === "submitting" && <Status title="Saving…" />}
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

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <header className="space-y-1">
      <p className="eyebrow">Step {n} of 2</p>
      <h1 className="large-title">{title}</h1>
      <p className="text-xl text-ink-2">{subtitle}</p>
    </header>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="large-title">{greeting()}, {DEMO_USER.firstName}</h1>
      </header>

      <article className="card p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Today's check-in</h2>
          <p className="text-xl text-ink-2">About 2 minutes</p>
        </div>
        <BigButton onClick={onStart}>Start</BigButton>
      </article>

      <StepGoal />

      <Reveal label="How does it work?">
        <ul className="card overflow-hidden">
          <InfoRow icon="stand" color={MOBILITY} title={`Stand up ${TARGET_REPS} times`} text="From a sturdy chair without wheels." />
          <InfoRow icon="speech" color={SPEECH} title={`Talk for ${TALK_SECONDS} seconds`} text="About anything you like." divider />
          <InfoRow icon="shield" color="#32D74B" title="Private" text="The video stays on this device." divider />
        </ul>
      </Reveal>
    </div>
  );
}

/** The parent's own goal from the doctor's report, with today's progress from the watch. */
function StepGoal() {
  const [goal, setGoal] = useState<{ care: CareReport; today: DailyVitals } | null>(null);
  useEffect(() => {
    Promise.all([getCareReport(DEMO_USER.id), getVitals(DEMO_USER.id)])
      .then(([care, vitals]) => setGoal({ care, today: vitals[vitals.length - 1] }))
      .catch(() => {});
  }, []);
  const rec = goal?.care.recommendations.find((r) => r.track?.kind === "stepsPerDay");
  if (!goal || !rec || rec.track?.kind !== "stepsPerDay") return null;
  const target = rec.track.target;
  const pct = Math.min(1, goal.today.steps / target);
  return (
    <article className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[0.9rem] font-semibold text-steps">
          <Icon name="steps" className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.4} /> Today's walk
        </span>
        <span className="text-sm text-ink-3">Goal from {goal.care.doctor}</span>
      </div>
      <p className="leading-none">
        <span className="display-num text-[2.4rem]">{goal.today.steps.toLocaleString()}</span>
        <span className="ml-1.5 text-lg text-ink-2">of {target.toLocaleString()} steps</span>
      </p>
      <div className="h-2.5 rounded-full bg-raised overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={goal.today.steps}>
        <div className="h-full rounded-full bg-steps" style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="text-base text-ink-2">{pct >= 1 ? "Goal reached today. Well done!" : "A short walk later would help you get there."}</p>
    </article>
  );
}

function InfoRow({ icon, color, title, text, divider }: { icon: "stand" | "speech" | "shield"; color: string; title: string; text: string; divider?: boolean }) {
  return (
    <li className="relative flex items-start gap-4 px-5 py-4">
      {divider && <span className="absolute top-0 left-[4.25rem] right-0 border-t border-hairline" aria-hidden />}
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-white" style={{ background: color }}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span>
        <span className="block text-xl font-semibold">{title}</span>
        <span className="block text-lg text-ink-2">{text}</span>
      </span>
    </li>
  );
}

function StandStep({ onDone }: { onDone: (sitToStandSec: number, reps: number) => void }) {
  const sts = useRef<StsState>(initialStsState());
  const [view, setView] = useState({ reps: 0, doneMs: null as number | null });
  const [legsVisible, setLegsVisible] = useState(false);
  // PoseCamera (owned by the vision work) only reports landmarks, so the first frame = camera ready.
  const [seenPerson, setSeenPerson] = useState(false);

  const sync = () => {
    const s = sts.current;
    setView((v) => (v.reps === s.reps && v.doneMs === s.doneMs ? v : { reps: s.reps, doneMs: s.doneMs }));
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
    <div className="space-y-6">
      <StepHeader n={1} title={`Stand up ${TARGET_REPS} times`} subtitle="At your own pace. Hold the chair if you need to." />

      <div className="relative overflow-hidden rounded-card bg-ink">
        <PoseCamera onLandmarks={onLandmarks} />
        {!seenPerson && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-xl text-white/90">
            Starting camera…<br />If it doesn't start, tap "I stood up" each time.
          </p>
        )}
        {seenPerson && !legsVisible && !finished && (
          <p className="absolute bottom-4 inset-x-4 rounded-control bg-white/90 backdrop-blur p-3 text-center text-lg font-medium">
            Step back so we can see your legs and feet.
          </p>
        )}
      </div>

      <div className="card p-6 space-y-6">
        <Ring progress={view.reps / TARGET_REPS} color={finished ? "#32D74B" : MOBILITY} size={200} stroke={20}>
          <div aria-live="polite">
            <div className="text-6xl font-bold tracking-tight tabular-nums">{view.reps}</div>
            <div className="text-lg text-ink-2">of {TARGET_REPS} stands</div>
          </div>
        </Ring>

        {finished ? (
          <div className="space-y-4 text-center">
            <p className="text-2xl font-semibold text-good">Well done! Sit and rest.</p>
            <BigButton onClick={() => onDone(stsSeconds(sts.current) ?? 0, sts.current.reps)}>Next</BigButton>
          </div>
        ) : (
          <div className="space-y-2">
            <BigButton variant="secondary" className="!bg-accent-soft !text-accent text-2xl min-h-[4.5rem]" onClick={onTap}>I stood up</BigButton>
            <p className="text-center text-base text-ink-3">Tap if a stand isn't counted.</p>
          </div>
        )}
      </div>

      {view.reps > 0 && (
        <button type="button" onClick={restart} className="mx-auto block rounded-lg px-4 py-2 text-lg font-medium text-accent focus-ring">
          Start this step again
        </button>
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
      <StepHeader n={2} title="Tell us about your day" subtitle="Anything you like, such as what you ate today." />

      <div className="card p-6 space-y-6">
        <Ring progress={state === "recording" ? (TALK_SECONDS - left) / TALK_SECONDS : 0} color={SPEECH} size={200} stroke={20}>
          {state === "recording" ? (
            <div aria-live="polite">
              <div className="text-6xl font-bold tracking-tight tabular-nums">{left}</div>
              <div className="text-lg text-ink-2">seconds left</div>
            </div>
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full" style={{ background: `${SPEECH}1A`, color: SPEECH }}>
              <Icon name="mic" className="h-10 w-10" />
            </span>
          )}
        </Ring>

        {state === "recording" ? (
          <p className="flex items-center justify-center gap-2 text-xl font-medium text-ink-2">
            <span className="h-3 w-3 rounded-full bg-alert animate-pulse" aria-hidden /> Listening
          </p>
        ) : (
          <div className="space-y-3">
            {state === "failed" && (
              <p className="rounded-control bg-notice-soft p-4 text-lg text-ink">
                We couldn't use the microphone. Please allow microphone access and try again.
              </p>
            )}
            <BigButton onClick={start}>{state === "failed" ? "Try again" : "Start talking"}</BigButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ title, body }: { title: string; body?: string }) {
  return (
    <div className="py-16 text-center space-y-3" role="status">
      <h1 className="large-title">{title}</h1>
      {body && <p className="text-xl text-ink-2">{body}</p>}
    </div>
  );
}

function Done({ checkIn, onAgain }: { checkIn: CheckIn; onAgain: () => void }) {
  return (
    <div className="space-y-7">
      <div className="card p-8 space-y-5 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-good-soft text-good">
          <Icon name="check" className="h-10 w-10" strokeWidth={2.6} />
        </span>
        <h1 className="large-title">All done</h1>
        <p className="text-xl leading-relaxed text-ink-2">{checkIn.summaryParent}</p>
        <BigButton onClick={onAgain}>Finish</BigButton>
      </div>
      <Reveal label="See my results" hideLabel="Hide my results">
        <dl className="card overflow-hidden">
          <ResultRow icon="stand" color={MOBILITY} label="Stands" value={`${checkIn.repsDetected} in ${checkIn.sitToStandSec.toFixed(1)} sec`} />
          <ResultRow icon="speech" color={SPEECH} label="Words spoken" value={String(checkIn.wordCount)} divider />
        </dl>
      </Reveal>
    </div>
  );
}

function ResultRow({ icon, color, label, value, divider }: { icon: "stand" | "speech"; color: string; label: string; value: string; divider?: boolean }) {
  return (
    <div className="relative flex items-center justify-between gap-4 px-5 py-4">
      {divider && <span className="absolute top-0 left-5 right-0 border-t border-hairline" aria-hidden />}
      <dt className="flex items-center gap-3 text-xl">
        <span style={{ color }}><Icon name={icon} className="h-6 w-6" /></span>{label}
      </dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
