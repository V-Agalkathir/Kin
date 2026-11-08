import { Link, Route, Routes } from "react-router-dom";
import CheckInPage from "./pages/CheckInPage";
import DashboardPage from "./pages/DashboardPage";
import WatchPage from "./pages/WatchPage";

export default function App() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <nav className="flex gap-4 mb-6 font-semibold">
        <span className="mr-auto">Kin</span>
        <Link to="/">Check-in</Link>
        <Link to="/dashboard">Family</Link>
        <Link to="/watch">Watch</Link>
      </nav>
      <Routes>
        <Route path="/" element={<CheckInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/watch" element={<WatchPage />} />
      </Routes>
    </div>
  );
}
