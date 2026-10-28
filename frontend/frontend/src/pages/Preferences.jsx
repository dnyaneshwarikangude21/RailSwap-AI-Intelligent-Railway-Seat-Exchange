import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { bookingsApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import PreferenceEditor from "../components/PreferenceEditor";
import {
  berthLabel,
  formatDate,
} from "../utils/formatters";

export default function Preferences() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bookingsApi.list();
      setBookings(payload.items || []);
    } catch (err) {
      setError(err.message || "Preferences could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(bookingId, preference) {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, preference } : booking
      )
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Preference workspace
          </span>
          <h2>Berth and coach preferences</h2>
          <p>
            Your preference is half of a reciprocal match. The candidate must also
            want the berth you currently hold.
          </p>
        </div>
        <Link to="/matches" className="btn btn-primary">
          Find matches
          <ArrowRight size={16} />
        </Link>
      </header>

      <div className="inline-notice inline-notice-info">
        <Info size={17} aria-hidden="true" />
        Preferences are locked while a booking has an active exchange request. This
        keeps every consent decision based on stable, known berth data.
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <LoadingState label="Loading preference workspace..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No bookings to configure"
          description="Add a synthetic booking first, then return here to set a berth preference."
          action={
            <Link to="/trains" className="btn btn-primary btn-small">
              Explore demo trains
            </Link>
          }
        />
      ) : (
        <div className="preference-page-grid">
          {bookings.map((booking) => (
            <section className="panel preference-booking-panel" key={booking.id}>
              <div className="preference-booking-head">
                <div>
                  <span className="section-kicker">
                    <Ticket size={14} aria-hidden="true" />
                    {booking.journey?.train?.train_number} ·{" "}
                    {formatDate(booking.journey?.journey_date)}
                  </span>
                  <h2>{booking.journey?.train?.train_name}</h2>
                  <p>
                    Coach {booking.coach?.coach_number} · Berth{" "}
                    {booking.berth?.berth_number} · {berthLabel(booking.berth?.berth_type)}
                  </p>
                </div>
                <Link
                  to={`/bookings/${booking.id}`}
                  className="text-link"
                  aria-label={`Open booking ${booking.demo_booking_reference}`}
                >
                  Details <ArrowRight size={14} />
                </Link>
              </div>

              <PreferenceEditor
                key={booking.preference?.id || booking.id}
                booking={booking}
                onSaved={(preference) => handleSaved(booking.id, preference)}
              />

              {booking.preference && (
                <div className="preference-saved-strip">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Preference saved.{" "}
                  <Link to={`/matches?bookingId=${booking.id}`}>
                    Search matches <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
