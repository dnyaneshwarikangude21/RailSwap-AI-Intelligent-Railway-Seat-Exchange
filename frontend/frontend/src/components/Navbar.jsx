import { LogOut, Menu, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { initials } from "../utils/formatters";
import NotificationBell from "./NotificationBell";

export default function Navbar({ pageTitle, onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="icon-button mobile-menu-button"
          onClick={onMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={21} />
        </button>
        <div>
          <p className="navbar-eyebrow">RailSwap AI</p>
          <h1 className="navbar-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="navbar-actions">
        <span className="demo-label desktop-only">Demo data only</span>
        <NotificationBell />
        <Link
          to="/profile"
          className="navbar-profile"
          aria-label="Open profile and privacy settings"
        >
          <span className="avatar">{initials(user?.display_name)}</span>
          <span className="navbar-profile-copy">
            <strong>{user?.display_name}</strong>
            <small>{user?.role === "admin" ? "Administrator" : "Passenger"}</small>
          </span>
        </Link>
        <Link
          to="/profile"
          className="icon-button profile-shortcut"
          aria-label="Profile"
        >
          <UserRound size={19} />
        </Link>
        <button
          type="button"
          className="icon-button logout-button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
