import {
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  MapPin,
  Plus,
  Search,
  Ticket,
  Trash2,
  TrainFront,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { bookingsApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import {
  berthLabel,
  coachScopeLabel,
  formatDate,
} from "../utils/formatters";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bookingsApi.list();
      setBookings(payload.items || []);
    } catch (err) {
      setError(err.message || "Bookings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(booking) {
    const confirmed = window.confirm(
      `Remove demo booking ${booking.demo_booking_reference}? This cannot be undone.`
    );
    if (!confirmed) return;
    setActionError("");
    setDeletingId(booking.id);
    try {
      await bookingsApi.remove(booking.id);
      setBookings((current) => current.filter((item) => item.id !== booking.id));
    } catch (err) {
      setActionError(err.message || "The booking could not be removed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <Ticket size={14} aria-hidden="true" />
            Your synthetic inventory
          </span>
          <h2>My demo bookings</h2>
          <p>
            Manage your fictional bookings, set preferences, and open reciprocal
            matching. No real reservation is attached.
          </p>
        </div>
        <Link to="/trains" className="btn btn-primary">
          <Plus size={17} />
          Add demo booking
        </Link>
      </header>

      {error && <ErrorState message={error} onRetry={load} />}
      {actionError && (
        <div className="inline-notice inline-notice-danger" role="alert">
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading your demo bookings..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No demo bookings yet"
          description="Browse a fictional train and choose an available berth to get started."
          action={
            <Link to="/trains" className="btn btn-primary btn-small">
              Explore trains
            </Link>
          }
        />
      ) : (
        <div className="booking-grid">
          {bookings.map((booking) => {
            const journey = booking.journey;
            const train = journey?.train;
            return (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-top">
                  <span className="train-number-badge">
                    <TrainFront size={15} aria-hidden="true" />
                    {train?.train_number}
                  </span>
                  <span className="badge badge-success">
                    {booking.verification_status === "SIMULATED_VERIFIED"
                      ? "Simulated verified"
                      : booking.verification_status}
                  </span>
                </div>
                <h3>{train?.train_name}</h3>
                <div className="booking-route">
                  <MapPin size={14} aria-hidden="true" />
                  {train?.source} → {train?.destination}
                </div>
                <div className="booking-trip">
                  <div>
                    <span>Journey</span>
                    <strong>
                      <CalendarDays size={14} aria-hidden="true" />
                      {formatDate(journey?.journey_date)}
                    </strong>
                  </div>
                  <div>
                    <span>Berth</span>
                    <strong>
                      Coach {booking.coach?.coach_number} · {booking.berth?.berth_number}
                    </strong>
                  </div>
                  <div>
                    <span>Type</span>
                    <strong>{berthLabel(booking.berth?.berth_type)}</strong>
                  </div>
                </div>
                <div className="booking-preference">
                  {booking.preference ? (
                    <>
                      <span>Preferred</span>
                      <strong>{berthLabel(booking.preference.desired_berth_type)}</strong>
                      <small>{coachScopeLabel(booking.preference.coach_scope)}</small>
                    </>
                  ) : (
                    <>
                      <span>Preference</span>
                      <strong>Not configured</strong>
                      <small>Set it before searching</small>
                    </>
                  )}
                </div>
                {booking.has_active_exchange && (
                  <div className="inline-notice inline-notice-warning compact-notice">
                    An active exchange request involves this booking.
                  </div>
                )}
                <div className="booking-card-footer">
                  <Link
                    to={`/bookings/${booking.id}`}
                    className="btn btn-secondary btn-small"
                  >
                    Details
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/matches?bookingId=${booking.id}`}
                    className="btn btn-ghost btn-small"
                  >
                    <Search size={14} />
                    Find matches
                  </Link>
                  <button
                    type="button"
                    className="icon-button danger-icon-button"
                    onClick={() => handleDelete(booking)}
                    disabled={deletingId === booking.id}
                    aria-label={`Delete demo booking ${booking.demo_booking_reference}`}
                    title="Delete demo booking"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="page-footnote">
        Demo references are synthetic and stored only in the local project database.
        Delete is blocked once a booking has exchange history.
      </div>
    </div>
  );
}
