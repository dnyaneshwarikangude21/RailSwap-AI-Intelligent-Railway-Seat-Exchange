import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  TrainFront,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { bookingsApi, trainsApi } from "../api/client";
import BerthMap from "../components/BerthMap";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PreferenceEditor from "../components/PreferenceEditor";
import {
  berthLabel,
  coachScopeLabel,
  formatDate,
} from "../utils/formatters";

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const bookingPayload = await bookingsApi.detail(bookingId);
      const currentBooking = bookingPayload.booking;
      const journeyPayload = await trainsApi.journey(currentBooking.journey_id);
      setBooking(currentBooking);
      setJourney(journeyPayload.journey);
    } catch (err) {
      setError(err.message || "Booking details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePreferenceSaved(preference) {
    setBooking((current) =>
      current
        ? {
            ...current,
            preference,
          }
        : current
    );
  }

  async function handleDelete() {
    if (!booking) return;
    const confirmed = window.confirm(
      "Remove this demo booking? This cannot be undone."
    );
    if (!confirmed) return;
    setActionError("");
    setDeleting(true);
    try {
      await bookingsApi.remove(booking.id);
      navigate("/bookings", { replace: true });
    } catch (err) {
      setActionError(err.message || "The booking could not be removed.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState label="Loading booking details..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!booking) return null;

  const train = booking.journey?.train;

  return (
    <div className="page-stack">
      <Link to="/bookings" className="back-link">
        <ArrowLeft size={15} />
        Back to my bookings
      </Link>

      <header className="booking-detail-hero">
        <div>
          <span className="eyebrow">
            <Ticket size={14} aria-hidden="true" />
            Demo reference {booking.demo_booking_reference}
          </span>
          <h2>{train?.train_name}</h2>
          <div className="train-route-large">
            <span>
              <MapPin size={16} aria-hidden="true" />
              {train?.source}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
            <span>{train?.destination}</span>
          </div>
          <p>
            {formatDate(booking.journey?.journey_date)} ·{" "}
            {booking.journey?.departure_time} → {booking.journey?.arrival_time}
          </p>
        </div>
        <div className="booking-detail-badges">
          <span className="badge badge-success">
            <ShieldCheck size={13} aria-hidden="true" />
            Simulated verification
          </span>
          {booking.has_active_exchange ? (
            <span className="badge badge-warning">
              <Clock3 size={13} aria-hidden="true" />
              Active exchange
            </span>
          ) : (
            <span className="badge badge-soft">Available for matching</span>
          )}
        </div>
      </header>

      {actionError && (
        <div className="inline-notice inline-notice-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="booking-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Current reservation</span>
              <h2>Berth snapshot</h2>
            </div>
          </div>
          <div className="berth-summary-large">
            <div className="berth-current">
              <span className="berth-current-label">Allocated demo berth</span>
              <strong>{berthLabel(booking.berth?.berth_type)}</strong>
              <span>
                Coach {booking.coach?.coach_number} · Berth{" "}
                {booking.berth?.berth_number}
              </span>
            </div>
            <div className="berth-preference-summary">
              <span className="berth-current-label">Desired berth</span>
              <strong>
                {booking.preference
                  ? berthLabel(booking.preference.desired_berth_type)
                  : "Not set"}
              </strong>
              <span>
                {booking.preference
                  ? coachScopeLabel(booking.preference.coach_scope)
                  : "Set a preference below"}
              </span>
            </div>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Journey</dt>
              <dd>{formatDate(booking.journey?.journey_date)}</dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>
                <CalendarDays size={14} aria-hidden="true" />
                {booking.journey?.departure_time}
              </dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>Simulation only</dd>
            </div>
            <div>
              <dt>Data mode</dt>
              <dd>Synthetic demonstration</dd>
            </div>
          </dl>

          <div className="inline-notice inline-notice-info">
            <AlertTriangle size={16} aria-hidden="true" />
            This booking is fictitious. Accepting an application-level exchange
            never changes an official railway reservation.
          </div>

          <div className="booking-detail-actions">
            <Link
              to={`/matches?bookingId=${booking.id}`}
              className="btn btn-primary"
            >
              <Search size={16} />
              Find reciprocal matches
            </Link>
            <Link to="/preferences" className="btn btn-secondary">
              Manage all preferences
            </Link>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={15} />
              {deleting ? "Removing..." : "Remove demo booking"}
            </button>
          </div>
        </section>

        <section className="panel">
          <PreferenceEditor
            key={booking.preference?.id || booking.id}
            booking={booking}
            onSaved={handlePreferenceSaved}
          />
          <div className="preference-tip">
            <CheckCircle2 size={17} aria-hidden="true" />
            <p>
              Matching requires <strong>both</strong> passengers to want each
              other's current berth. A one-sided preference is never shown as a
              valid match.
            </p>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              <TrainFront size={14} aria-hidden="true" />
              Coach layout
            </span>
            <h2>Your place on the synthetic coach</h2>
          </div>
          <span className="badge badge-soft">Read-only</span>
        </div>
        <BerthMap
          coaches={journey?.coaches || []}
          selectedBerthId={booking.berth_id}
          selectable={false}
          selectionHint="Your current berth is highlighted. Occupied demo berths are not selectable."
        />
      </section>
    </div>
  );
}
