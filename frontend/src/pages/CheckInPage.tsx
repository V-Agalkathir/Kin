// TODO(A): step flow — intro → sit-to-stand (PoseCamera + stepSts) → 30s talk (recordAudio) → submitCheckIn → summary.
// Fallback: a big "I stood up" tap button that still counts reps if angle detection is flaky.
export default function CheckInPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Today's check-in</h1>
      <p>Stand up and sit down 5 times, then tell us about your day.</p>
      <button className="px-6 py-4 text-xl rounded-xl bg-sky-600 text-white">Start</button>
    </section>
  );
}
