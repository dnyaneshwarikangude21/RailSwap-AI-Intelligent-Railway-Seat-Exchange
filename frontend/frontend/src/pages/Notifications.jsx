import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  RefreshCcw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { notificationsApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { formatDateTime } from "../utils/formatters";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [marking, setMarking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await notificationsApi.list({ limit: 100 });
      setItems(payload.items || []);
      setUnreadCount(payload.unread_count || 0);
    } catch (err) {
      setError(err.message || "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function announceChange() {
    window.dispatchEvent(new Event("railswap:notifications-changed"));
  }

  async function markRead(notification) {
    if (notification.read) return;
    setActionError("");
    setMarking(notification.id);
    try {
      const payload = await notificationsApi.markRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? payload.notification : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      announceChange();
    } catch (err) {
      setActionError(err.message || "The notification could not be updated.");
    } finally {
      setMarking(null);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setActionError("");
    setMarking("all");
    try {
      await notificationsApi.markAllRead();
      setItems((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      announceChange();
    } catch (err) {
      setActionError(err.message || "Notifications could not be marked as read.");
    } finally {
      setMarking(null);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <BellRing size={14} aria-hidden="true" />
            In-app events
          </span>
          <h2>Notifications</h2>
          <p>
            Updates for exchange requests, consent decisions, and simulated
            authorization steps. This inbox is local to the prototype.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={markAllRead}
            disabled={unreadCount === 0 || marking === "all"}
          >
            <CheckCheck size={16} />
            {marking === "all" ? "Updating..." : "Mark all read"}
          </button>
        </div>
      </header>

      {actionError && (
        <div className="inline-notice inline-notice-danger" role="alert">
          {actionError}
        </div>
      )}
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="notifications-summary">
        <div>
          <span className="section-kicker">
            <Bell size={14} aria-hidden="true" />
            Unread inbox
          </span>
          <strong>{unreadCount}</strong>
          <small>{unreadCount === 1 ? "notification needs review" : "notifications need review"}</small>
        </div>
        <span className="badge badge-soft">Demo notifications</span>
      </div>

      {loading ? (
        <LoadingState label="Loading notifications..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Your inbox is clear"
          description="Exchange request updates and consent decisions will appear here."
        />
      ) : (
        <div className="notification-list">
          {items.map((notification) => (
            <article
              key={notification.id}
              className={`notification-card ${notification.read ? "notification-read" : "notification-unread"}`}
            >
              <span className="notification-icon" aria-hidden="true">
                {notification.read ? <Check size={18} /> : <BellRing size={18} />}
              </span>
              <div className="notification-copy">
                <div className="notification-heading">
                  <h3>{notification.title}</h3>
                  {!notification.read && (
                    <span className="badge badge-accent">New</span>
                  )}
                </div>
                <p>{notification.message}</p>
                <span>{formatDateTime(notification.created_at)}</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => markRead(notification)}
                disabled={notification.read || marking === notification.id}
              >
                {notification.read ? (
                  "Read"
                ) : marking === notification.id ? (
                  "Saving..."
                ) : (
                  "Mark read"
                )}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
