import {
  ArrowRight,
  ArrowLeftRight,
  Bell,
  BellRing,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Gauge,
  Inbox,
  Search,
  Sparkles,
  Ticket,
  TrainFront,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { analyticsApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import ExchangeStatus from "../components/ExchangeStatus";
import LoadingState from "../components/LoadingState";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import {
  berthLabel,
  formatDate,
  formatScore,
  relativeTime,
} from "../utils/formatters";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await analyticsApi.dashboard();
      setData(payload);
    } catch (err) {
      setError(err.message || "Dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.stats || {};
  const matching = data?.matching_stats || {};
  const journeys = data?.journeys || [];
  const exchanges = data?.recent_exchanges || [];
  const activity = data?.recent_activity || [];
  const hasBookings = (stats.total_bookings || 0) > 0;

  return (
    <div className="page-stack">
      <header className="page-header dashboard-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Consent-first berth exchange
          </span>
          <h2>Welcome back, {user?.display_name?.split(" ")[0]}.</h2>
          <p>
            Review your synthetic journeys, reciprocal matches, and exchange
            requests from one focused workspace.
          </p>
        </div>
        <div className="quick-actions-inline">
          <Link to="/matches" className="btn btn-primary">
            <Search size={17} />
            Find matches
          </Link>
          <Link to="/trains" className="btn btn-secondary">
            <TrainFront size={17} />
            Add demo booking
          </Link>
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={load} />}

      <section className="stats-grid" aria-label="Account statistics">
        <StatCard
          icon={Ticket}
          label="Demo bookings"
          value={stats.total_bookings ?? 0}
          hint="Synthetic journeys only"
          loading={loading}
        />
        <StatCard
          icon={UsersRound}
          label="Compatible matches"
          value={stats.compatible_matches ?? 0}
          hint="Reciprocal eligible candidates"
          tone="teal"
          loading={loading}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Active exchanges"
          value={stats.active_exchanges ?? 0}
          hint="Awaiting or accepted"
          tone="violet"
          loading={loading}
        />
        <StatCard
          icon={BellRing}
          label="Pending responses"
          value={stats.pending_responses ?? 0}
          hint="Incoming requests to review"
          tone="warning"
          loading={loading}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-journeys">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <CalendarDays size={14} aria-hidden="true" />
                Journey summary
              </span>
              <h2>Your demo journeys</h2>
            </div>
            <Link to="/bookings" className="text-link">
              All bookings <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Loading journeys..." compact />
          ) : journeys.length === 0 ? (
            <EmptyState
              icon={TrainFront}
              title="No demo bookings yet"
              description="Explore the fictional timetable and reserve a synthetic berth to begin."
              action={
                <Link to="/trains" className="btn btn-primary btn-small">
                  Browse trains
                </Link>
              }
            />
          ) : (
            <div className="journey-list">
              {journeys.slice(0, 4).map((journey) => (
                <Link
                  to={`/bookings/${journey.booking_id}`}
                  key={journey.booking_id}
                  className="journey-row"
                >
                  <div className="journey-date-block">
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>{formatDate(journey.journey_date, { year: undefined })}</span>
                  </div>
                  <div className="journey-row-main">
                    <strong>
                      {journey.train_number} · {journey.train_name}
                    </strong>
                    <span>
                      {journey.source} → {journey.destination}
                    </span>
                    <small>
                      Coach {journey.coach_number} · Berth {journey.berth_number} ·{" "}
                      {berthLabel(journey.berth_type)} →{" "}
                      {berthLabel(journey.desired_berth_type)}
                    </small>
                  </div>
                  <div className="journey-row-side">
                    {journey.has_active_exchange ? (
                      <span className="badge badge-warning">Active request</span>
                    ) : journey.desired_berth_type ? (
                      <span className="badge badge-soft">Preference set</span>
                    ) : (
                      <span className="badge badge-soft">Set preference</span>
                    )}
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </Link>
              ))}
              {journeys.length === 0 && <p className="muted">No journeys to show.</p>}
            </div>
          )}
        </section>

        <aside className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <Compass size={14} aria-hidden="true" />
                Quick actions
              </span>
              <h2>Continue your flow</h2>
            </div>
          </div>
          <div className="quick-action-list">
            <Link to="/matches" className="quick-action">
              <span className="quick-action-icon">
                <ArrowLeftRight size={19} />
              </span>
              <span>
                <strong>Find reciprocal peers</strong>
                <small>Search eligible demo candidates</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/exchanges" className="quick-action">
              <span className="quick-action-icon">
                <Inbox size={19} />
              </span>
              <span>
                <strong>Review requests</strong>
                <small>Accept, decline, or cancel</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/preferences" className="quick-action">
              <span className="quick-action-icon">
                <BookOpenCheck size={19} />
              </span>
              <span>
                <strong>Update preferences</strong>
                <small>Set berth and coach scope</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/ml-analytics" className="quick-action">
              <span className="quick-action-icon">
                <BrainCircuit size={19} />
              </span>
              <span>
                <strong>Inspect ML results</strong>
                <small>Actual synthetic evaluation</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <Gauge size={14} aria-hidden="true" />
                Matching signal
              </span>
              <h2>Eligibility engine</h2>
            </div>
            <span className={`badge ${matching.engine_mode === "ml" ? "badge-violet" : "badge-soft"}`}>
              <BrainCircuit size={13} aria-hidden="true" />
              {matching.engine_mode === "ml" ? "ML-assisted" : "Rule fallback"}
            </span>
          </div>
          <div className="matching-stats">
            <div>
              <span>Average compatibility</span>
              <strong>
                {matching.average_compatibility_score !== null &&
                matching.average_compatibility_score !== undefined
                  ? `${formatScore(matching.average_compatibility_score)} / 100`
                  : "No eligible matches yet"}
              </strong>
            </div>
            <div>
              <span>Bookings with preferences</span>
              <strong>{matching.bookings_with_preferences ?? 0}</strong>
            </div>
            <div>
              <span>Eligible candidate pool</span>
              <strong>{matching.eligible_candidates ?? 0}</strong>
            </div>
          </div>
          <p className="panel-note">
            RailSwap AI applies hard reciprocal and coach-scope rules before
            scoring. Scores rank suggestions; they are not probabilities of real
            passenger acceptance.
          </p>
          {matching.limitations?.length > 0 && (
            <ul className="compact-list">
              {matching.limitations.slice(0, 2).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <ArrowLeftRight size={14} aria-hidden="true" />
                Requests
              </span>
              <h2>Recent exchange activity</h2>
            </div>
            <Link to="/exchanges" className="text-link">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <LoadingState label="Loading requests..." compact />
          ) : exchanges.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No exchange requests"
              description="Once you or a co-passenger sends a consent request, it will appear here."
            />
          ) : (
            <div className="mini-request-list">
              {exchanges.map((exchange) => (
                <div className="mini-request" key={exchange.id}>
                  <div>
                    <strong>{exchange.other_display_name}</strong>
                    <span>
                      {exchange.train_number} · {formatDate(exchange.journey_date)} ·{" "}
                      {exchange.direction === "INCOMING" ? "incoming" : "outgoing"}
                    </span>
                  </div>
                  <div className="mini-request-side">
                    <ExchangeStatus status={exchange.status} />
                    <small>{relativeTime(exchange.updated_at)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <Clock3 size={14} aria-hidden="true" />
                Timeline
              </span>
              <h2>Recent activity</h2>
            </div>
          </div>
          {loading ? (
            <LoadingState label="Loading activity..." compact />
          ) : activity.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Activity will appear here"
              description="Exchange notifications and workflow updates are collected here."
            />
          ) : (
            <ol className="activity-feed">
              {activity.map((item) => (
                <li key={item.id}>
                  <span className="activity-dot" aria-hidden="true">
                    <CheckCircle2 size={13} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{relativeTime(item.created_at)}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {!loading && !hasBookings && (
        <div className="dashboard-onboarding">
          <div>
            <span className="eyebrow">Getting started</span>
            <h2>Add a synthetic journey to unlock matching.</h2>
            <p>
              Choose a fictional train, pick an available berth, then set the berth
              type you would prefer. Matches appear only when another demo
              passenger has reciprocal preferences.
            </p>
          </div>
          <Link to="/trains" className="btn btn-primary">
            Explore demo trains
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
