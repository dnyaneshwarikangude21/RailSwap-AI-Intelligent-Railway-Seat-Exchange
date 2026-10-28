import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { notificationsApi } from "../api/client";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        const payload = await notificationsApi.list({ unread: "true", limit: 1 });
        if (active) setUnreadCount(payload.unread_count || 0);
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    loadUnread();
    const interval = window.setInterval(loadUnread, 30000);
    const handleChange = () => loadUnread();
    window.addEventListener("railswap:notifications-changed", handleChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("railswap:notifications-changed", handleChange);
    };
  }, []);

  return (
    <Link
      to="/notifications"
      className="icon-button notification-button"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      title="Notifications"
    >
      <Bell size={19} />
      {unreadCount > 0 && (
        <span className="notification-count" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
