import {
  CalendarDays,
  Check,
  Download,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { formatDate, initials } from "../utils/formatters";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [profileValues, setProfileValues] = useState({
    display_name: user?.display_name || "",
    share_display_name: user?.share_display_name ?? true,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  async function saveProfile(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    if (!profileValues.display_name.trim()) {
      setProfileError("Display name is required.");
      return;
    }
    if (profileValues.display_name.trim().length < 2) {
      setProfileError("Display name must contain at least 2 characters.");
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        display_name: profileValues.display_name.trim(),
        share_display_name: profileValues.share_display_name,
      });
      setProfileMessage("Profile and privacy settings saved.");
    } catch (err) {
      setProfileError(err.message || "The profile could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (!passwords.current_password) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (passwords.new_password.length < 8) {
      setPasswordError("The new password must be at least 8 characters.");
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await updateProfile({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setPasswordMessage("Password updated successfully.");
    } catch (err) {
      setPasswordError(err.message || "The password could not be updated.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header profile-hero">
        <div className="profile-identity">
          <span className="avatar avatar-large">{initials(user?.display_name)}</span>
          <div>
            <span className="eyebrow">
              <UserRound size={14} aria-hidden="true" />
              Passenger profile
            </span>
            <h2>{user?.display_name}</h2>
            <p>{user?.email}</p>
          </div>
        </div>
        <span className="badge badge-success">
          <ShieldCheck size={13} aria-hidden="true" />
          {user?.role === "admin" ? "Administrator" : "Demo passenger"}
        </span>
      </header>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Account identity</span>
              <h2>Profile details</h2>
            </div>
          </div>
          <form onSubmit={saveProfile}>
            <div className="field">
              <label htmlFor="profile-name">Display name</label>
              <input
                id="profile-name"
                value={profileValues.display_name}
                onChange={(event) =>
                  setProfileValues((current) => ({
                    ...current,
                    display_name: event.target.value,
                  }))
                }
                disabled={profileSaving}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-email">Email address</label>
              <div className="input-with-icon">
                <Mail size={16} aria-hidden="true" />
                <input
                  id="profile-email"
                  value={user?.email || ""}
                  disabled
                  aria-describedby="email-help"
                />
              </div>
              <p id="email-help" className="field-hint">
                Email changes are disabled in the prototype to keep demo records
                stable.
              </p>
            </div>
            {profileError && (
              <p className="form-error" role="alert">
                {profileError}
              </p>
            )}
            {profileMessage && (
              <p className="form-success" role="status">
                <Check size={15} aria-hidden="true" /> {profileMessage}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileSaving}
            >
              <Save size={16} />
              {profileSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Privacy controls</span>
              <h2>Matching visibility</h2>
            </div>
          </div>
          <label className="toggle-row">
            <span className="toggle-copy">
              {profileValues.share_display_name ? (
                <Eye size={19} aria-hidden="true" />
              ) : (
                <EyeOff size={19} aria-hidden="true" />
              )}
              <span>
                <strong>Show my display name to matched passengers</strong>
                <small>
                  When disabled, eligible matches show “Demo passenger” instead of
                  your name. Berth and journey compatibility still work.
                </small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={profileValues.share_display_name}
              onChange={(event) =>
                setProfileValues((current) => ({
                  ...current,
                  share_display_name: event.target.checked,
                }))
              }
              disabled={profileSaving}
            />
          </label>

          <div className="privacy-facts">
            <div>
              <ShieldCheck size={17} aria-hidden="true" />
              <div>
                <strong>Minimal data</strong>
                <p>
                  No government ID, payment data, ticket image, or live railway
                  account is collected.
                </p>
              </div>
            </div>
            <div>
              <EyeOff size={17} aria-hidden="true" />
              <div>
                <strong>Private matching</strong>
                <p>
                  Candidate results exclude emails, booking references, and other
                  passengers' private ticket details.
                </p>
              </div>
            </div>
            <div>
              <LockKeyhole size={17} aria-hidden="true" />
              <div>
                <strong>Ownership controls</strong>
                <p>
                  Booking, preference, notification, and exchange APIs enforce
                  account ownership on the server.
                </p>
              </div>
            </div>
          </div>

          <Link to="/exchanges" className="btn btn-secondary btn-block">
            <Download size={16} />
            Export exchange summary
          </Link>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Security</span>
              <h2>Change password</h2>
            </div>
          </div>
          <form onSubmit={changePassword}>
            <div className="field">
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwords.current_password}
                onChange={(event) =>
                  setPasswords((current) => ({
                    ...current,
                    current_password: event.target.value,
                  }))
                }
                disabled={passwordSaving}
              />
            </div>
            <div className="form-grid two-column">
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.new_password}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      new_password: event.target.value,
                    }))
                  }
                  disabled={passwordSaving}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirm_password}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      confirm_password: event.target.value,
                    }))
                  }
                  disabled={passwordSaving}
                />
              </div>
            </div>
            {passwordError && (
              <p className="form-error" role="alert">
                {passwordError}
              </p>
            )}
            {passwordMessage && (
              <p className="form-success" role="status">
                <Check size={15} aria-hidden="true" /> {passwordMessage}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordSaving}
            >
              <LockKeyhole size={16} />
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>

        <aside className="panel account-facts">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Account facts</span>
              <h2>Demo membership</h2>
            </div>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Role</dt>
              <dd>{user?.role === "admin" ? "Administrator" : "Passenger"}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>
                <CalendarDays size={14} aria-hidden="true" />
                {formatDate(user?.created_at?.slice(0, 10))}
              </dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>Synthetic demonstration</dd>
            </div>
            <div>
              <dt>Official railway status</dt>
              <dd>Not connected</dd>
            </div>
          </dl>
          <div className="inline-notice inline-notice-info">
            {user?.role === "admin"
              ? "Administrators receive aggregate and exchange-state information only. Passenger identity and ticket references remain redacted."
              : "RailSwap AI does not buy, sell, or coercively transfer reserved seats. Every exchange requires consent."}
          </div>
        </aside>
      </div>
    </div>
  );
}
