import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Reveal from "../components/Reveal";
import { getCheckIns, USE_MOCK } from "../lib/api";
import { DEMO_USER } from "../lib/demoUser";
import { describeFlag, METRIC_INFO } from "../lib/metrics";
import type { CheckIn } from "../types/checkin";

const CHART_METRICS = ["sitToStandSec", "wpm", "avgPauseMs"] as const;
type Metric = (typeof CHART_METRICS)[number];

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Summary first. Everything else stays hidden until the family member asks for it.
export default function DashboardPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCheckIns(DEMO_USER.id).then(setCheckIns).catch(() => setError(true));
  }, []);

  if (error) return <p className="text-2xl py-12 text-center">We couldn't load check-ins. Please refresh the page.</p>;
  if (!checkIns) return <p className="text-2xl py-12 text-center" role="status">Loading…</p>;
  if (!checkIns.length) return <p className="text-2xl py-12 text-center">No check-ins yet.</p>;

  const latest = checkIns[checkIns.length - 1];
  const flagged = latest.flags.length > 0;

  return (
    <section className="space-y-6">
      <article className="rounded-3xl bg-white p-8 shadow-sm space-y-4 text-center">
        <span
          aria-hidden
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl ${flagged ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
        >
          {flagged ? "!" : "✓"}
        </span>
        <h1 className="text-4xl font-bold">
          {flagged ? `Something has changed for ${DEMO_USER.name}` : `${DEMO_USER.name} is doing well`}
        </h1>
        <p className="text-2xl leading-relaxed text-stone-700">{latest.summaryFamily || "Check-in completed."}</p>
        <p className="text-lg text-stone-500">Last check-in {whenLabel(latest.createdAt)}</p>
      </article>

      <Reveal label="See trends" hideLabel="Hide trends">
        <p className="text-lg text-stone-600">
          Compared with {DEMO_USER.name}'s own usual pattern. A change is flagged only after two check-ins in a row.
          Kin notices changes; it doesn't diagnose.
        </p>
        {CHART_METRICS.map((m) => <TrendChart key={m} metric={m} checkIns={checkIns} />)}
      </Reveal>

      <Reveal label="See past check-ins" hideLabel="Hide past check-ins">
        <PastCheckIns checkIns={checkIns} />
      </Reveal>

      {USE_MOCK && <p className="text-center text-base text-stone-500">Demo data</p>}
    </section>
  );
}

function PastCheckIns({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <ul className="divide-y divide-stone-200 rounded-2xl bg-white shadow-sm">
      {checkIns.slice(-7).reverse().map((c) => (
        <li key={c.id} className="p-5 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xl font-semibold capitalize">{whenLabel(c.createdAt)}</span>
            <span className={`text-lg font-semibold ${c.flags.length ? "text-amber-800" : "text-emerald-800"}`}>
              {c.flags.length ? "Changed" : "Usual"}
            </span>
          </div>
          {c.flags.map((f) => <p key={f.metric} className="text-lg text-stone-700">{describeFlag(f)}</p>)}
        </li>
      ))}
    </ul>
  );
}

function TrendChart({ metric, checkIns }: { metric: Metric; checkIns: CheckIn[] }) {
  const info = METRIC_INFO[metric];
  const data = useMemo(
    () => checkIns.map((c) => ({ day: dayLabel(c.createdAt), value: c[metric], flagged: c.flags.some((f) => f.metric === metric) })),
    [checkIns, metric],
  );
  // "Usual" = median of the 14 check-ins before the latest, matching the baseline window.
  const usual = median(checkIns.slice(-15, -1).map((c) => c[metric]));

  return (
    <figure className="rounded-2xl bg-white p-5 shadow-sm space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold">{info.label}</span>
        <span className="text-lg text-stone-500">{info.unit}</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 16 }} interval="preserveStartEnd" minTickGap={32} />
          <YAxis tick={{ fontSize: 16 }} width={56} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ fontSize: 18 }} formatter={(v: number) => [`${v} ${info.unit}`, info.label]} />
          {usual !== null && (
            <ReferenceLine y={usual} stroke="#a8a29e" strokeDasharray="6 6" label={{ value: "usual", position: "insideTopLeft", fontSize: 16, fill: "#78716c" }} />
          )}
          <Line
            dataKey="value" stroke="#0369a1" strokeWidth={3} isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number; payload?: { flagged: boolean } }) =>
              p.payload?.flagged
                ? <circle key={p.index} cx={p.cx} cy={p.cy} r={7} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                : <circle key={p.index} cx={p.cx} cy={p.cy} r={0} />}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
