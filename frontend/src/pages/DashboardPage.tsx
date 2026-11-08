import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon, { CategoryLabel } from "../components/Icon";
import Reveal from "../components/Reveal";
import { getCheckIns, USE_MOCK } from "../lib/api";
import { DEMO_USER } from "../lib/demoUser";
import { describeFlag, METRIC_INFO } from "../lib/metrics";
import type { CheckIn } from "../types/checkin";

const CHART_METRICS = ["sitToStandSec", "wpm", "avgPauseMs"] as const;
type Metric = (typeof CHART_METRICS)[number];

const todayEyebrow = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

function whenLabel(iso: string): string {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
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

  if (error) return <Empty text="We couldn't load check-ins. Please refresh the page." />;
  if (!checkIns) return <Empty text="Loading…" />;
  if (!checkIns.length) return <Empty text="No check-ins yet." />;

  const latest = checkIns[checkIns.length - 1];
  const flagged = latest.flags.length > 0;

  return (
    <section className="space-y-7">
      <header>
        <p className="eyebrow">{todayEyebrow()}</p>
        <h1 className="large-title">Summary</h1>
      </header>

      <article className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <CategoryLabel icon="heart" label={DEMO_USER.name} color={flagged ? "#E8890C" : "#30A46C"} />
          <span className="text-base text-ink-3">{whenLabel(latest.createdAt)}</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{flagged ? "Something has changed" : "Doing well"}</h2>
        <p className="text-xl leading-relaxed text-ink-2">{latest.summaryFamily || "Check-in completed."}</p>
      </article>

      <Reveal label="Show trends" hideLabel="Hide trends">
        {CHART_METRICS.map((m) => <MetricCard key={m} metric={m} checkIns={checkIns} />)}
        <p className="px-2 text-base text-ink-2">
          Compared with {DEMO_USER.name}'s own usual. A change is flagged only after two check-ins in a row. Kin notices change; it doesn't diagnose.
        </p>
      </Reveal>

      <Reveal label="Show past check-ins" hideLabel="Hide past check-ins">
        <PastCheckIns checkIns={checkIns} />
      </Reveal>

      {USE_MOCK && <p className="text-center text-base text-ink-3">Demo data</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-20 text-center text-xl text-ink-2" role="status">{text}</p>;
}

function PastCheckIns({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <ul className="card overflow-hidden">
      {checkIns.slice(-7).reverse().map((c, i) => (
        <li key={c.id} className="relative px-5 py-4">
          {i > 0 && <span className="absolute top-0 left-5 right-0 border-t border-hairline" aria-hidden />}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xl font-medium">{whenLabel(c.createdAt)}</span>
            <span className={`inline-flex items-center gap-2 text-lg ${c.flags.length ? "text-notice" : "text-good"}`}>
              <Icon name={c.flags.length ? "alert" : "check"} className="h-5 w-5" strokeWidth={2.4} />
              {c.flags.length ? "Changed" : "Usual"}
            </span>
          </div>
          {c.flags.map((f) => <p key={f.metric} className="mt-1 text-base text-ink-2">{describeFlag(f)}</p>)}
        </li>
      ))}
    </ul>
  );
}

function MetricCard({ metric, checkIns }: { metric: Metric; checkIns: CheckIn[] }) {
  const info = METRIC_INFO[metric];
  const data = useMemo(
    () => checkIns.slice(-14).map((c) => ({
      day: new Date(c.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: c[metric],
      flagged: c.flags.some((f) => f.metric === metric),
    })),
    [checkIns, metric],
  );
  const latest = checkIns[checkIns.length - 1];
  // "Usual" = median of the 14 check-ins before the latest, matching the baseline window.
  const usual = median(checkIns.slice(-15, -1).map((c) => c[metric]));

  return (
    <figure className="card p-5 space-y-3">
      <figcaption className="flex items-center justify-between">
        <CategoryLabel icon={info.icon} label={info.label} color={info.color} />
        <span className="text-base text-ink-3">Last 2 weeks</span>
      </figcaption>
      <p>
        <span className="text-4xl font-bold tracking-tight tabular-nums">{latest[metric].toFixed(info.decimals)}</span>
        <span className="ml-1.5 text-xl font-medium text-ink-2">{info.shortUnit}</span>
        {usual !== null && <span className="ml-3 text-base text-ink-3">usual {usual.toFixed(info.decimals)}</span>}
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
          <XAxis dataKey="day" tick={{ fontSize: 14, fill: "#AEAEB2" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
          <YAxis orientation="right" tick={{ fontSize: 14, fill: "#AEAEB2" }} tickLine={false} axisLine={false} width={44}
            domain={[(min: number) => Math.floor(min * 0.85), (max: number) => Math.ceil(max * 1.02)]} allowDecimals={false} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ fontSize: 16, borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
            formatter={(v: number) => [`${v} ${info.shortUnit}`, info.label]} />
          {usual !== null && <ReferenceLine y={usual} stroke="#AEAEB2" strokeDasharray="4 4" />}
          <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={info.color} fillOpacity={d.flagged ? 1 : 0.35} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-base text-ink-3">Solid bars mark check-ins that changed from usual.</p>
    </figure>
  );
}
