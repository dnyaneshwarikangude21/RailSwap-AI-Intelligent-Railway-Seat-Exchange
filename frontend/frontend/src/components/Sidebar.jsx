import {
  ArrowLeftRight,
  Bell,
  BrainCircuit,
  LayoutDashboard,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  TrainFront,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/trains", label: "Train discovery", icon: Search },
  { to: "/bookings", label: "My bookings", icon: Ticket },
  { to: "/matches", label: "Find matches", icon: ArrowLeftRight },
  { to: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { to: "/exchanges", label: "Exchange requests", icon: ArrowLeftRight },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/ml-analytics", label: "ML lab", icon: BrainCircuit },
];

export default function Sidebar({ open, onClose, isAdmin }) {
  const links = [...primaryLinks];
  if (isAdmin) {
    links.push({
      to: "/admin",
      label: "Admin console",
      icon: ShieldCheck,
    });
  }

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <TrainFront size={22} />
          </div>
          <div>
            <span className="brand-name">RailSwap AI</span>
            <span className="brand-subtitle">Berth exchange lab</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-demo-pill">
          <span className="status-dot" aria-hidden="true" />
          Synthetic demo environment
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <span className="nav-section-label">Workspace</span>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-info-card">
            <strong>Consent-first by design</strong>
            <p>
              Recommendations are application-level only. No railway reservation
              is modified.
            </p>
          </div>
          <p className="sidebar-version">RailSwap AI v1.0 · Academic prototype</p>
        </div>
      </aside>
      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}
    </>
  );
}
