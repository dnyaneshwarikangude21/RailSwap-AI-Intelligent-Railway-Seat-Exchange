import { useEffect, useState } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute, { PublicOnlyRoute } from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./hooks/useAuth";
import AdminDashboard from "./pages/AdminDashboard";
import BookingDetails from "./pages/BookingDetails";
import Dashboard from "./pages/Dashboard";
import ExchangeRequests from "./pages/ExchangeRequests";
import FindMatches from "./pages/FindMatches";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import MatchDetails from "./pages/MatchDetails";
import MLAnalytics from "./pages/MLAnalytics";
import MyBookings from "./pages/MyBookings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Preferences from "./pages/Preferences";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import TrainDetails from "./pages/TrainDetails";
import TrainSearch from "./pages/TrainSearch";

const PAGE_TITLES = [
  ["/dashboard", "Operations overview"],
  ["/trains/", "Journey workspace"],
  ["/trains", "Train discovery"],
  ["/bookings/", "Booking details"],
  ["/bookings", "My bookings"],
  ["/matches/", "Match analysis"],
  ["/matches", "Find matches"],
  ["/preferences", "Berth preferences"],
  ["/exchanges", "Exchange requests"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile & privacy"],
  ["/ml-analytics", "Machine learning lab"],
  ["/admin", "Administrator console"],
];

function titleForPath(pathname) {
  const match = PAGE_TITLES.find(([path]) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  );
  return match?.[1] || "RailSwap AI";
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
      />
      <div className="app-main">
        <Navbar
          pageTitle={titleForPath(location.pathname)}
          onMenu={() => setSidebarOpen(true)}
        />
        <main className="app-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>RailSwap AI · Consent-first berth exchange prototype</span>
          <span>Synthetic data · Not affiliated with Indian Railways</span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trains" element={<TrainSearch />} />
          <Route path="/trains/:trainId" element={<TrainDetails />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/bookings/:bookingId" element={<BookingDetails />} />
          <Route path="/matches" element={<FindMatches />} />
          <Route
            path="/matches/:candidateBookingId"
            element={<MatchDetails />}
          />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/exchanges" element={<ExchangeRequests />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ml-analytics" element={<MLAnalytics />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
