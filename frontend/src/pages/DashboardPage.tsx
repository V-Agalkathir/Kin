import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { seedHistory } from "../lib/seed";

// TODO(A): swap seed data for getCheckIns(); show flags and summaryFamily.
export default function DashboardPage() {
  const data = seedHistory().map((c) => ({ ...c, day: c.createdAt.slice(5, 10) }));
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Family view</h1>
      {(["sitToStandSec", "wpm", "avgPauseMs"] as const).map((k) => (
        <div key={k} className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2">{k}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey={k} stroke="#0284c7" dot={false} /></LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </section>
  );
}
