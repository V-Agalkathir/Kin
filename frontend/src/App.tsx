import { Link, NavLink, Route, Routes } from "react-router-dom";
import Icon from "./components/Icon";
import Logo from "./components/Logo";
import CheckInPage from "./pages/CheckInPage";
import DashboardPage from "./pages/DashboardPage";
import WatchPage from "./pages/WatchPage";

const NAV = [
  { to: "/", label: "Check-in", icon: "home" as const },
  { to: "/dashboard", label: "Family", icon: "heart" as const },
  { to: "/watch", label: "Watch", icon: "shield" as const },
];

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-xl focus:bg-raised focus:p-3">
        Skip to content
      </a>

      {/* Top bar: wordmark + segmented control (tablet/desktop) */}
      <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl border-b border-hairline">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" aria-label="kin home" className="focus-ring rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden sm:flex rounded-[12px] bg-card p-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end
                className={({ isActive }) =>
                  `px-5 py-2 rounded-[9px] text-lg font-medium transition focus-ring ${isActive ? "bg-raised text-ink" : "text-ink-2 hover:text-ink"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="max-w-2xl mx-auto px-5 pt-6 pb-32 sm:pb-12">
        <Routes>
          <Route path="/" element={<CheckInPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Bottom tab bar (phones), like iOS */}
      <nav aria-label="Main" className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-canvas/85 backdrop-blur-xl border-t border-hairline pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-base font-medium focus-ring ${isActive ? "text-accent" : "text-ink-3"}`}>
              <Icon name={n.icon} className="h-7 w-7" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

function NotFound() {
  return (
    <section className="space-y-6 py-16 text-center">
      <h1 className="large-title">Page not found</h1>
      <Link to="/" className="inline-block rounded-control bg-accent px-6 py-4 text-xl font-semibold text-accent-ink focus-ring">
        Go to today's check-in
      </Link>
    </section>
  );
}
