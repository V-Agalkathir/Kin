import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon, { CategoryLabel, type IconName } from "../components/Icon";
import Reveal from "../components/Reveal";
import { getCareReport, getCheckIns, getVitals, USE_MOCK } from "../lib/api";
import { careProgress } from "../lib/careplan";
import { DEMO_USER } from "../lib/demoUser";
import { describeFlag, METRIC_INFO } from "../lib/metrics";
import { describeVitalFlag, usualOf, VITAL_INFO, VITAL_KEYS, vitalFlags } from "../lib/vitals";
import type { CheckIn } from "../types/checkin";
import type { CareReport, DailyVitals } from "../types/health";

const P = DEMO_USER;
const her = P.pronoun === "she" ? "her" : P.pronoun === "he" ? "his" : "their";

type Data = { checkIns: CheckIn[]; vitals: DailyVitals[]; care: CareReport };

/** One tile in the vitals grid, with what its detail chart needs. */
type Tile = {
  id: string; label: string; icon: IconName; color: string; source: "Watch" | "Daily check-in";
  value: string; unit: string; changed: string | null;
  series: { day: string; value: number; flagged: boolean }[];
  usual: number | null; tooltipUnit: string; extra?: Tile;
};

const shortDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });

function whenLabel(iso: string): string {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getCheckIns(P.id), getVitals(P.id), getCareReport(P.id)])
      .then(([checkIns, vitals, care]) => setData({ checkIns, vitals, care }))
      .catch(() => setError(true));
  }, []);

  if (error) return <Empty text="We couldn't load the report. Please refresh the page." />;
  if (!data) return <Empty text="Loading…" />;

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="large-title">Health report</h1>
      </header>

      <ProfileCard lastCheckIn={data.checkIns[data.checkIns.length - 1]?.createdAt} />
      <Report data={data} />
      <CarePlan data={data} />

      <Reveal label="Past check-ins" hideLabel="Hide past check-ins">
        <PastCheckIns checkIns={data.checkIns} />
      </Reveal>

      {USE_MOCK && <p className="text-center text-sm text-ink-3">Demo data · watch readings are simulated</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-20 text-center text-xl text-ink-2" role="status">{text}</p>;
}

// ---- Who you're caring for ---------------------------------------------------------------

function ProfileCard({ lastCheckIn }: { lastCheckIn?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  const localTime = new Intl.DateTimeFormat(undefined, { timeZone: P.timeZone, hour: "numeric", minute: "2-digit" }).format(now);
  const initials = P.fullName.split(" ").map((w) => w[0]).join("");

  return (
    <article className="card p-5 flex items-center gap-4">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-3xl text-accent" aria-hidden>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold leading-tight">{P.relation}</h2>
        <p className="text-base text-ink-2">{P.fullName}, {P.age}</p>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-3">
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" /> {P.city} · {P.distanceLabel}
        </p>
        <p className="flex items-start gap-1.5 text-sm text-ink-3">
          <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" /> {localTime} there{lastCheckIn && ` · checked in ${whenLabel(lastCheckIn).toLowerCase()}`}
        </p>
      </div>
      <a href={`tel:${P.phone}`} aria-label={`Call ${P.relation}`} title={`Call ${P.relation}`}
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-good text-[#06200D] transition active:scale-95 focus-ring">
        <Icon name="phone" className="h-6 w-6" strokeWidth={2.2} />
      </a>
    </article>
  );
}

// ---- Today's report + vitals ------------------------------------------------------------

function useTiles({ checkIns, vitals }: Data): Tile[] {
  return useMemo(() => {
    const vitalTiles: Tile[] = VITAL_KEYS.map((key) => {
      const info = VITAL_INFO[key];
      const last14 = vitals.slice(-14);
      const flagsByDay = last14.map((_, i) => vitalFlags(vitals.slice(0, vitals.length - 14 + i + 1)).some((f) => f.key === key));
      const latestFlag = vitalFlags(vitals).find((f) => f.key === key);
      return {
        id: key, label: info.label, icon: info.icon, color: info.color, source: "Watch",
        value: info.display(vitals[vitals.length - 1]), unit: info.unit,
        changed: latestFlag ? describeVitalFlag(latestFlag) : null,
        series: last14.map((d, i) => ({ day: shortDay(`${d.date}T12:00:00`), value: info.value(d), flagged: flagsByDay[i] })),
        usual: usualOf(vitals.map(info.value)), tooltipUnit: key === "bloodPressure" ? "mmHg systolic" : key === "sleepMin" ? "min" : info.unit,
      };
    });

    const latest = checkIns[checkIns.length - 1];
    const checkInTile = (metric: "sitToStandSec" | "wpm" | "avgPauseMs"): Tile => {
      const info = METRIC_INFO[metric];
      const flag = latest?.flags.find((f) => f.metric === metric);
      return {
        id: metric, label: info.label, icon: info.icon, color: info.color, source: "Daily check-in",
        value: latest ? latest[metric].toFixed(info.decimals) : "–", unit: info.shortUnit,
        changed: flag ? describeFlag(flag) : null,
        series: checkIns.slice(-14).map((c) => ({ day: shortDay(c.createdAt), value: c[metric], flagged: c.flags.some((f) => f.metric === metric) })),
        usual: usualOf(checkIns.map((c) => c[metric])), tooltipUnit: info.shortUnit,
      };
    };
    const speech = checkInTile("wpm");
    const pauses = checkInTile("avgPauseMs");
    // Speech tile covers pace + pauses; show it as changed if either changed.
    speech.extra = pauses;
    speech.label = "Speech";
    if (!speech.changed && pauses.changed) speech.changed = pauses.changed;

    return [...vitalTiles, checkInTile("sitToStandSec"), speech];
  }, [checkIns, vitals]);
}

function Report({ data }: { data: Data }) {
  const tiles = useTiles(data);
  const [selected, setSelected] = useState<string | null>(null);
  const changed = tiles.filter((t) => t.changed);
  const steady = tiles.filter((t) => !t.changed).map((t) => t.label.toLowerCase());
  const sel = tiles.find((t) => t.id === selected) ?? null;

  const sentence = changed.length
    ? `${changed.map((t) => t.changed).join(". ")}.${steady.length ? ` ${cap(listJoin(steady))} ${steady.length === 1 ? "is" : "are"} in ${her} usual range.` : ""}`
    : `Heart rate, blood pressure, activity, sleep, movement and speech are all in ${her} usual range.`;

  return (
    <>
      <article className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <CategoryLabel icon="sparkle" label="Today" color={changed.length ? "#FFB340" : "#32D74B"} />
          <span className="text-sm text-ink-3">Watch + daily check-in</span>
        </div>
        <h2 className="font-display text-[2.1rem] leading-tight">
          {changed.length === 0 ? "All in a usual range" : `${changed.length} ${changed.length === 1 ? "change" : "changes"} worth a look`}
        </h2>
        <p className="text-lg leading-relaxed text-ink-2">{sentence}</p>
        {changed.length > 0 && <p className="text-base text-ink-3">Flagged after two days in a row. kin notices changes; it doesn't diagnose.</p>}
      </article>

      <div>
        <h3 className="mb-3 px-1 text-lg font-semibold">Vitals & check-ins</h3>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <button key={t.id} type="button" onClick={() => setSelected(selected === t.id ? null : t.id)} aria-pressed={selected === t.id}
              className={`card p-4 text-left space-y-2 transition focus-ring ${selected === t.id ? "bg-raised ring-1 ring-hairline" : "hover:bg-raised"}`}>
              <CategoryLabel icon={t.icon} label={t.label} color={t.color} />
              <p className="leading-none">
                <span className="display-num text-[2.3rem]">{t.value}</span>
                {t.unit && <span className="ml-1 text-base text-ink-2">{t.unit}</span>}
              </p>
              <p className={`flex items-center gap-1.5 text-sm ${t.changed ? "text-notice" : "text-ink-3"}`}>
                <span className={`h-2 w-2 rounded-full ${t.changed ? "bg-notice" : "bg-good"}`} aria-hidden />
                {t.changed ? "Changed" : "Usual"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {sel && <TileDetail tile={sel} onClose={() => setSelected(null)} />}
    </>
  );
}

function TileDetail({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [tile.id]);
  return (
    <article ref={ref} className="card p-5 space-y-4 scroll-mb-28" aria-label={`${tile.label} details`}>
      <div className="flex items-center justify-between">
        <CategoryLabel icon={tile.icon} label={tile.label} color={tile.color} />
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-base font-medium text-accent focus-ring">Done</button>
      </div>
      <p className={`text-lg ${tile.changed ? "text-notice" : "text-ink-2"}`}>{tile.changed ?? `In ${her} usual range.`}</p>
      <MiniChart tile={tile} />
      {tile.extra && (
        <div className="space-y-2 border-t border-hairline pt-4">
          <CategoryLabel icon={tile.extra.icon} label={`${tile.extra.label} · ${tile.extra.value} ${tile.extra.unit}`} color={tile.extra.color} />
          <MiniChart tile={tile.extra} />
        </div>
      )}
      <p className="text-sm text-ink-3">Last 2 weeks · from {tile.source.toLowerCase()} · dashed line is {her} usual · bright bars changed from usual</p>
    </article>
  );
}

function MiniChart({ tile }: { tile: Tile }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={tile.series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
        <XAxis dataKey="day" tick={{ fontSize: 13, fill: "#6E6E73" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
        <YAxis orientation="right" tick={{ fontSize: 13, fill: "#6E6E73" }} tickLine={false} axisLine={false} width={48} allowDecimals={false}
          domain={[(min: number) => Math.floor(min * 0.85), (max: number) => Math.ceil(max * 1.02)]} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{ fontSize: 15, borderRadius: 12, border: "none", background: "#222225", color: "#F5F5F7" }}
          formatter={(v: number) => [`${v} ${tile.tooltipUnit}`, tile.label]} />
        {tile.usual !== null && <ReferenceLine y={tile.usual} stroke="#6E6E73" strokeDasharray="4 4" />}
        <Bar dataKey="value" radius={[5, 5, 5, 5]} isAnimationActive={false}>
          {tile.series.map((d, i) => <Cell key={i} fill={tile.color} fillOpacity={d.flagged ? 1 : 0.32} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Doctor's recommendations ------------------------------------------------------------

function CarePlan({ data }: { data: Data }) {
  const { care } = data;
  const recs = [...care.recommendations].sort((a, b) => Number(b.isNew) - Number(a.isNew));
  const newCount = recs.filter((r) => r.isNew).length;

  return (
    <article className="card overflow-hidden">
      <div className="p-5 pb-3 space-y-1">
        <CategoryLabel icon="clipboard" label="Care plan" color="#FF7A4D" />
        <h3 className="text-xl font-semibold">From {care.doctor}'s report</h3>
        <p className="text-base text-ink-2">
          {care.role} · {longDate(care.date)}{newCount > 0 && ` · ${newCount} new since the last visit`}
        </p>
      </div>
      <ul>
        {recs.map((r) => {
          const p = careProgress(r, data.vitals, data.checkIns);
          return (
            <li key={r.id} className="relative flex gap-3 px-5 py-3.5">
              <span className="absolute top-0 left-5 right-0 border-t border-hairline" aria-hidden />
              <span className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full ${p ? (p.met ? "bg-good-soft text-good" : "bg-notice-soft text-notice") : "bg-raised text-ink-3"}`}>
                <Icon name={p ? (p.met ? "check" : "alert") : "clipboard"} className="h-3.5 w-3.5" strokeWidth={2.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg leading-snug">
                  {r.text}
                  {r.isNew && <span className="ml-2 align-middle rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">New</span>}
                </p>
                {p && <p className={`text-base ${p.met ? "text-ink-2" : "text-notice"}`}>{p.label}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-hairline px-5 py-3 text-sm text-ink-3">
        {care.nextAppointment && `Next appointment ${longDate(care.nextAppointment)} · `}
        Copied from the doctor's report. kin tracks progress; it doesn't give medical advice.
      </p>
    </article>
  );
}

// ---- History -----------------------------------------------------------------------------

function PastCheckIns({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <ul className="card overflow-hidden">
      {checkIns.slice(-7).reverse().map((c, i) => (
        <li key={c.id} className="relative px-5 py-4">
          {i > 0 && <span className="absolute top-0 left-5 right-0 border-t border-hairline" aria-hidden />}
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-medium">{whenLabel(c.createdAt)}</span>
            <span className={`inline-flex items-center gap-2 text-base ${c.flags.length ? "text-notice" : "text-good"}`}>
              <Icon name={c.flags.length ? "alert" : "check"} className="h-4 w-4" strokeWidth={2.4} />
              {c.flags.length ? "Changed" : "Usual"}
            </span>
          </div>
          {c.flags.map((f) => <p key={f.metric} className="mt-1 text-base text-ink-2">{describeFlag(f)}</p>)}
        </li>
      ))}
    </ul>
  );
}

function cap(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function listJoin(xs: string[]) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
