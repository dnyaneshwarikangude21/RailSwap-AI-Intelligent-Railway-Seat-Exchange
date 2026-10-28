import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Download,
  Inbox,
  Info,
  MapPin,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { exchangesApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import ExchangeStatus from "../components/ExchangeStatus";
import LoadingState from "../components/LoadingState";
import {
  berthLabel,
  formatDate,
  formatDateTime,
  formatScore,
  relativeTime,
} from "../utils/formatters";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "active", label: "Active" },
];

export default function ExchangeRequests() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [actionError, setActionError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await exchangesApi.list();
      setItems(payload.items || []);
    } catch (err) {
      setError(err.message || "Exchange requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
    }
  }, [location.state]);

  const filtered = useMemo(() => {
    if (filter === "incoming") {
      return items.filter((item) => item.direction === "INCOMING");
    }
    if (filter === "outgoing") {
      return items.filter((item) => item.direction === "OUTGOING");
    }
    if (filter === "active") {
      return items.filter((item) => item.can_cancel);
    }
    return items;
  }, [items, filter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      incoming: items.filter((item) => item.direction === "INCOMING").length,
      outgoing: items.filter((item) => item.direction === "OUTGOING").length,
      active: items.filter((item) => item.can_cancel).length,
    }),
    [items]
  );

  async function performAction(exchange, action) {
    const prompts = {
      accept: "Accept this application-level exchange request? The other passenger will be notified. This is not an official railway authorization.",
      decline: "Decline this exchange request? This decision is final for this request.",
      cancel: "Cancel this exchange request? No berth will be changed.",
    };
    if (!window.confirm(prompts[action])) return;
    setActionError("");
    setFlash("");
    setActionKey(`${exchange.id}:${action}`);
    try {
      const payload = await exchangesApi[action](exchange.id);
      setItems((current) =>
        current.map((item) =>
          item.id === exchange.id ? payload.exchange : item
        )
      );
      setFlash(
        action === "accept"
          ? "Request accepted by both application users. It remains separate from official railway authorization."
          : action === "decline"
            ? "Request declined. No berth was changed."
            : "Request cancelled. No berth was changed."
      );
      window.dispatchEvent(new Event("railswap:notifications-changed"));
    } catch (err) {
      setActionError(err.message || "The request could not be updated.");
    } finally {
      setActionKey("");
    }
  }

  async function exportSummary() {
    setExporting(true);
    setActionError("");
    try {
      const { blob, filename } = await exchangesApi.export();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err.message || "The summary could not be exported.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <ArrowLeftRight size={14} aria-hidden="true" />
            Two-sided consent workflow
          </span>
          <h2>Exchange requests</h2>
          <p>
            Track application-level agreements. Accepted by both users is not an
            official reservation modification.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={exportSummary}
          disabled={exporting || items.length === 0}
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export summary"}
        </button>
      </header>

      {flash && (
        <div className="inline-notice inline-notice-success" role="status">
          <Check size={17} aria-hidden="true" />
          {flash}
        </div>
      )}
      {actionError && (
        <div className="inline-notice inline-notice-danger" role="alert">
          {actionError}
        </div>
      )}
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="request-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Filter requests">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={filter === option.id}
              className={`filter-tab ${filter === option.id ? "filter-tab-active" : ""}`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span>{counts[option.id]}</span>
            </button>
          ))}
        </div>
        <span className="badge badge-soft">
          <Info size={13} aria-hidden="true" />
          Local consent only
        </span>
      </div>

      {loading ? (
        <LoadingState label="Loading exchange requests..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            items.length === 0
              ? "No exchange requests yet"
              : `No ${filter === "all" ? "" : filter} requests`
          }
          description={
            items.length === 0
              ? "Find a reciprocal match and send a consent request to start a workflow."
              : "Try another filter to view your other requests."
          }
          action={
            items.length === 0 ? (
              <Link to="/matches" className="btn btn-primary btn-small">
                Find matches
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="exchange-list">
          {filtered.map((exchange) => {
            const you =
              exchange.direction === "OUTGOING"
                ? exchange.requester
                : exchange.recipient;
            const them =
              exchange.direction === "OUTGOING"
                ? exchange.recipient
                : exchange.requester;
            const busy = actionKey.startsWith(`${exchange.id}:`);
            const showCancel =
              exchange.can_cancel &&
              (exchange.direction === "OUTGOING" ||
                exchange.status !== "PENDING");
            return (
              <article className="exchange-card" key={exchange.id}>
                <div className="exchange-card-head">
                  <div className="exchange-direction">
                    <span
                      className={`direction-icon ${
                        exchange.direction === "INCOMING"
                          ? "direction-incoming"
                          : "direction-outgoing"
                      }`}
                      aria-hidden="true"
                    >
                      {exchange.direction === "INCOMING" ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <div>
                      <span className="section-kicker">
                        Request #{exchange.id} ·{" "}
                        {exchange.direction === "INCOMING"
                          ? "Incoming to you"
                          : "Sent by you"}
                      </span>
                      <h3>
                        {exchange.journey.train_number} ·{" "}
                        {exchange.journey.train_name}
                      </h3>
                      <p>
                        <MapPin size={13} aria-hidden="true" />
                        {exchange.journey.source} → {exchange.journey.destination} ·{" "}
                        {formatDate(exchange.journey.journey_date)}
                      </p>
                    </div>
                  </div>
                  <div className="exchange-card-status">
                    <ExchangeStatus status={exchange.status} />
                    <span className="exchange-score">
                      Score {formatScore(exchange.compatibility_score)}
                    </span>
                  </div>
                </div>

                <div className="exchange-parties">
                  <div className="exchange-party">
                    <span>You</span>
                    <strong>{berthLabel(you.berth_type)}</strong>
                    <small>
                      Coach {you.coach_number} · Berth {you.berth_number}
                    </small>
                    <p>Want {berthLabel(you.desired_berth_type)}</p>
                  </div>
                  <span className="exchange-party-arrow" aria-hidden="true">
                    <ArrowLeftRight size={19} />
                  </span>
                  <div className="exchange-party">
                    <span>{them.display_name}</span>
                    <strong>{berthLabel(them.berth_type)}</strong>
                    <small>
                      Coach {them.coach_number} · Berth {them.berth_number}
                    </small>
                    <p>Wants {berthLabel(them.desired_berth_type)}</p>
                  </div>
                </div>

                <div className="exchange-card-note">
                  <Info size={15} aria-hidden="true" />
                  {exchange.notice}
                </div>

                <div className="exchange-card-footer">
                  <div className="exchange-timestamps">
                    <span>Updated {relativeTime(exchange.updated_at)}</span>
                    <span>Created {formatDateTime(exchange.created_at)}</span>
                  </div>
                  <div className="exchange-actions">
                    {exchange.can_accept && (
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => performAction(exchange, "accept")}
                        disabled={busy}
                      >
                        <Check size={15} />
                        {busy ? "Working..." : "Accept"}
                      </button>
                    )}
                    {exchange.can_decline && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => performAction(exchange, "decline")}
                        disabled={busy}
                      >
                        <XCircle size={15} />
                        Decline
                      </button>
                    )}
                    {showCancel && (
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-small"
                        onClick={() => performAction(exchange, "cancel")}
                        disabled={busy}
                      >
                        <X size={15} />
                        {exchange.direction === "OUTGOING" &&
                        exchange.status === "PENDING"
                          ? "Withdraw"
                          : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>

                {exchange.events?.length > 0 && (
                  <details className="exchange-history">
                    <summary>Status history</summary>
                    <ol>
                      {exchange.events.map((event, index) => (
                        <li key={`${event.event_type}-${index}`}>
                          <span>{event.label}</span>
                          <small>
                            {event.actor} · {formatDateTime(event.created_at)}
                          </small>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="page-footnote">
        <Send size={13} aria-hidden="true" /> Export includes only non-sensitive
        exchange state and journey summary. It excludes passenger names, emails,
        booking references, and ticket details.
      </div>
    </div>
  );
}
