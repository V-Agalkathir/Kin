import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCheckIns, USE_MOCK } from "../lib/api";
import { DEMO_USER } from "../lib/demoUser";
import { describeFlag, METRIC_INFO } from "../lib/metrics";
import type { CheckIn } from "../types/checkin";

const CHART_METRICS = ["sitToStandSec", "wpm", "avgPauseMs"] as const;
type Metric = (typeof CHART_METRICS)[number];

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

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
  const recent = checkIns.slice(-7).reverse();

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold">How {DEMO_USER.name} is doing</h1>
        <p className="text-xl text-stone-700">
          Each check-in is compared with {DEMO_USER.name}'s own usual pattern, not with other people.
          A change is only flagged after it shows up two check-ins in a row.
        </p>
        {USE_MOCK && (
          <p className="inline-block rounded-lg bg-stone-200 px-3 py-1 text-lg text-stone-700">
            Demo mode: 3 weeks of sample history plus check-ins saved in this browser.
          </p>
        )}
      </header>

      <LatestCard checkIn={latest} />
      <Regularity checkIns={checkIns} />

      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Trends</h2>
        {CHART_METRICS.map((m) => <TrendChart key={m} metric={m} checkIns={checkIns} />)}
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Recent check-ins</h2>
        <ul className="space-y-4">
          {recent.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white p-5 shadow-sm space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xl font-semibold">{fullDate(c.createdAt)}</span>
                <StatusBadge flagged={c.flags.length > 0} />
              </div>
              {c.summaryFamily && <p className="text-xl leading-relaxed">{c.summaryFamily}</p>}
              <p className="text-lg text-stone-600">
                {c.repsDetected} stands in {c.sitToStandSec.toFixed(1)} s · {Math.round(c.wpm)} words/min · pauses {Math.round(c.avgPauseMs)} ms
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatusBadge({ flagged }: { flagged: boolean }) {
  return flagged ? (
    <span className="rounded-full bg-amber-100 px-4 py-1 text-lg font-semibold text-amber-950">Changed from usual</span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-4 py-1 text-lg font-semibold text-emerald-900">In line with usual</span>
  );
}

function LatestCard({ checkIn }: { checkIn: CheckIn }) {
  const flagged = checkIn.flags.length > 0;
  return (
    <article className={`rounded-2xl p-6 shadow-sm space-y-4 border-l-8 ${flagged ? "bg-amber-50 border-amber-500" : "bg-white border-emerald-500"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold">Latest check-in</h2>
        <StatusBadge flagged={flagged} />
      </div>
      <p className="text-lg text-stone-600">{fullDate(checkIn.createdAt)}</p>
      <p className="text-2xl leading-relaxed">{checkIn.summaryFamily || "Check-in completed."}</p>
      {flagged && (
        <ul className="space-y-2">
          {checkIn.flags.map((f) => (
            <li key={f.metric} className="flex items-center gap-3 text-xl">
              <span className="h-3 w-3 rounded-full bg-amber-500" aria-hidden />
              {describeFlag(f)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-lg text-stone-600">Kin notices changes; it doesn't diagnose. If a change continues, a chat with their doctor can help.</p>
    </article>
  );
}

function Regularity({ checkIns }: { checkIns: CheckIn[] }) {
  const days = new Set(
    checkIns.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 7 * 86_400_000).map((c) => c.createdAt.slice(0, 10)),
  );
  return (
    <p className="text-2xl">
      Checked in on <strong>{days.size} of the last 7 days</strong>.
    </p>
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
  const flaggedNow = data[data.length - 1]?.flagged;

  return (
    <figure className="rounded-2xl bg-white p-5 shadow-sm space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold">{info.label}</span>
        <span className="text-lg text-stone-600">{info.unit}{usual !== null && ` · usual ≈ ${Math.round(usual * 10) / 10}`}</span>
      </figcaption>
      {flaggedNow && <p className="text-lg font-semibold text-amber-900">Changed recently. Orange dots mark flagged check-ins.</p>}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 16 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 16 }} width={56} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ fontSize: 18 }} formatter={(v: number) => [`${v} ${info.unit}`, info.label]} />
          {usual !== null && (
            <ReferenceLine y={usual} stroke="#78716c" strokeDasharray="6 6" label={{ value: "usual", position: "insideTopLeft", fontSize: 16, fill: "#57534e" }} />
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
