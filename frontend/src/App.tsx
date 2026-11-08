import { Link, NavLink, Route, Routes } from "react-router-dom";
import CheckInPage from "./pages/CheckInPage";
import DashboardPage from "./pages/DashboardPage";
import WatchPage from "./pages/WatchPage";

const NAV = [
  { to: "/", label: "Check-in" },
  { to: "/dashboard", label: "Family" },
  { to: "/watch", label: "Watch" },
];

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded-lg focus:bg-white focus:p-3">
        Skip to content
      </a>
      <header className="bg-white border-b border-stone-200">
        <nav className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2" aria-label="Main">
          <Link to="/" className="mr-auto text-3xl font-extrabold text-sky-800 py-2">Kin</Link>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                `min-h-14 px-5 py-3 rounded-xl text-xl font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  isActive ? "bg-sky-700 text-white" : "text-sky-900 hover:bg-sky-50"
                }`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main" className="max-w-3xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<CheckInPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <section className="space-y-6 py-12 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <Link to="/" className="inline-block min-h-20 px-8 py-5 text-2xl font-bold rounded-2xl bg-sky-700 text-white">
        Go to today's check-in
      </Link>
    </section>
  );
}
