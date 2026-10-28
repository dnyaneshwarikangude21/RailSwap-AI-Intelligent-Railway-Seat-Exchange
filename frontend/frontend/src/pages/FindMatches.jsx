import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Info,
  Search,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { bookingsApi, matchingApi, preferencesApi } from "../api/client";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import MatchCard from "../components/MatchCard";
import {
  BERTH_TYPES,
  berthLabel,
  coachScopeLabel,
  formatDate,
} from "../utils/formatters";
import { hasErrors, validatePreference } from "../utils/validators";

export default function FindMatches() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [desired, setDesired] = useState("LOWER");
  const [coachScope, setCoachScope] = useState("ANY");
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setInitialLoading(true);
      setInitialError("");
      try {
        const payload = await bookingsApi.list();
        if (!active) return;
        const items = payload.items || [];
        setBookings(items);
        const requested = Number(searchParams.get("bookingId"));
        const requestedBooking = items.find((booking) => booking.id === requested);
        const fallback =
          items.find((booking) => booking.preference) || items[0] || null;
        const initial = requestedBooking || fallback;
        setSelectedBookingId(initial?.id || "");
        if (initial) {
          setDesired(
            initial.preference?.desired_berth_type ||
              BERTH_TYPES.find((type) => type !== initial.berth?.berth_type) ||
              "LOWER"
          );
          setCoachScope(initial.preference?.coach_scope || "ANY");
        }
      } catch (err) {
        if (active) setInitialError(err.message || "Bookings could not be loaded.");
      } finally {
        if (active) setInitialLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === Number(selectedBookingId)),
    [bookings, selectedBookingId]
  );

  function handleBookingChange(event) {
    const nextId = Number(event.target.value);
    setSelectedBookingId(nextId);
    const booking = bookings.find((item) => item.id === nextId);
    if (booking) {
      setDesired(
        booking.preference?.desired_berth_type ||
          BERTH_TYPES.find((type) => type !== booking.berth?.berth_type) ||
          "LOWER"
      );
      setCoachScope(booking.preference?.coach_scope || "ANY");
    }
    setResult(null);
    setHasSearched(false);
    setSearchError("");
    setFormError("");
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchError("");
    setFormError("");
    if (!selectedBooking) {
      setFormError("Choose one of your demo bookings first.");
      return;
    }
    const errors = validatePreference({
      desired_berth_type: desired,
      coach_scope: coachScope,
    });
    if (hasErrors(errors)) {
      setFormError(Object.values(errors)[0]);
      return;
    }

    const preferenceValues = {
      desired_berth_type: desired,
      coach_scope: coachScope,
    };
    const preferenceChanged =
      !selectedBooking.preference ||
      selectedBooking.preference.desired_berth_type !== desired ||
      selectedBooking.preference.coach_scope !== coachScope;

    if (selectedBooking.has_active_exchange && preferenceChanged) {
      setSearchError(
        "This booking is already part of an active exchange. Resolve it before changing preferences."
      );
      return;
    }

    setSearching(true);
    setResult(null);
    setHasSearched(false);
    try {
      let preference = selectedBooking.preference;
      if (preferenceChanged) {
        const preferencePayload = preference
          ? await preferencesApi.update(preference.id, preferenceValues)
          : await preferencesApi.create({
              booking_id: selectedBooking.id,
              ...preferenceValues,
            });
        preference = preferencePayload.preference;
        setBookings((current) =>
          current.map((booking) =>
            booking.id === selectedBooking.id
              ? { ...booking, preference }
              : booking
          )
        );
      }
      const payload = await matchingApi.search(selectedBooking.id);
      setResult(payload);
      setHasSearched(true);
    } catch (err) {
      setSearchError(err.message || "Matching could not be completed.");
      setHasSearched(false);
    } finally {
      setSearching(false);
    }
  }

  if (initialLoading) return <LoadingState label="Preparing match workspace..." />;
  if (initialError) {
    return <ErrorState message={initialError} onRetry={() => window.location.reload()} />;
  }

  const matches = result?.items || [];
  const meta = result?.meta;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            <ArrowLeftRight size={14} aria-hidden="true" />
            Reciprocal matching engine
          </span>
          <h2>Find compatible passengers</h2>
          <p>
            Only candidates satisfying both directional preferences, coach scope,
            journey, and active-request rules are returned.
          </p>
        </div>
        {selectedBooking && (
          <Link
            to={`/bookings/${selectedBooking.id}`}
            className="btn btn-secondary"
          >
            <Ticket size={16} />
            Booking details
          </Link>
        )}
      </header>

      {bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Add a demo booking first"
          description="You need a synthetic booking with a berth before matching can begin."
          action={
            <Link to="/trains" className="btn btn-primary btn-small">
              Explore demo trains
            </Link>
          }
        />
      ) : (
        <>
          <section className="match-workspace">
            <div className="match-form-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    <SlidersHorizontal size={14} aria-hidden="true" />
                    Search setup
                  </span>
                  <h2>Your exchange profile</h2>
                </div>
              </div>

              <form onSubmit={handleSearch}>
                <div className="field">
                  <label htmlFor="match-booking">Demo booking</label>
                  <select
                    id="match-booking"
                    value={selectedBookingId}
                    onChange={handleBookingChange}
                    disabled={searching}
                  >
                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.journey?.train?.train_number} ·{" "}
                        {booking.journey?.train?.train_name} · Coach{" "}
                        {booking.coach?.coach_number} Berth{" "}
                        {booking.berth?.berth_number}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBooking && (
                  <>
                    <div className="current-journey-card">
                      <span className="current-journey-label">On this journey</span>
                      <strong>{selectedBooking.journey?.train?.train_name}</strong>
                      <p>
                        {formatDate(selectedBooking.journey?.journey_date)} ·{" "}
                        {selectedBooking.journey?.train?.source} →{" "}
                        {selectedBooking.journey?.train?.destination}
                      </p>
                      <div className="berth-chip-row">
                        <span className="berth-chip berth-chip-current">
                          Current: {berthLabel(selectedBooking.berth?.berth_type)}
                        </span>
                        <span className="berth-chip">
                          Coach {selectedBooking.coach?.coach_number} · Berth{" "}
                          {selectedBooking.berth?.berth_number}
                        </span>
                      </div>
                    </div>

                    {selectedBooking.has_active_exchange && (
                      <div className="inline-notice inline-notice-warning">
                        This booking already has an active exchange request. Resolve
                        it before searching for a new match.
                      </div>
                    )}

                    <div className="form-grid two-column">
                      <div className="field">
                        <label htmlFor="desired-berth">Preferred berth type</label>
                        <select
                          id="desired-berth"
                          value={desired}
                          onChange={(event) => setDesired(event.target.value)}
                          disabled={searching}
                        >
                          {BERTH_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {berthLabel(type)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="coach-scope">Coach scope</label>
                        <select
                          id="coach-scope"
                          value={coachScope}
                          onChange={(event) => setCoachScope(event.target.value)}
                          disabled={searching}
                        >
                          <option value="ANY">Any coach</option>
                          <option value="SAME_COACH">Same coach only</option>
                        </select>
                      </div>
                    </div>

                    {desired === selectedBooking.berth?.berth_type && (
                      <p className="field-hint warning-text">
                        This equals your current berth type, so useful reciprocal
                        matches are unlikely.
                      </p>
                    )}

                    <p className="field-hint">
                      Saved scope: {coachScopeLabel(coachScope)}. Searching saves the
                      preference before evaluating candidates.
                    </p>
                  </>
                )}

                {(formError || searchError) && (
                  <div className="inline-notice inline-notice-danger" role="alert">
                    {formError || searchError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={searching || !selectedBooking}
                >
                  <Search size={17} />
                  {searching ? "Evaluating reciprocal pairs..." : "Run compatibility search"}
                </button>
              </form>
            </div>

            <aside className="match-explainer">
              <span className="match-explainer-icon" aria-hidden="true">
                <Sparkles size={22} />
              </span>
              <h2>How eligibility works</h2>
              <ol>
                <li>
                  <strong>Hard filter first.</strong> Journey, date, berth data,
                  reciprocal preferences, coach scope, and active-request conflicts
                  must all pass.
                </li>
                <li>
                  <strong>Both directions.</strong> Your preferred type must match
                  their current berth, and their preferred type must match yours.
                </li>
                <li>
                  <strong>Then ranking.</strong> Eligible pairs receive a
                  reproducible weighted score, with lower booking ID as the tie-break.
                </li>
              </ol>
              <div className="inline-notice inline-notice-info compact-notice">
                <Info size={15} aria-hidden="true" />
                A high score never overrides a failed eligibility rule.
              </div>
            </aside>
          </section>

          {searching && (
            <LoadingState label="Running hard eligibility checks and scoring..." />
          )}

          {!searching && result && (
            <section className="match-results">
              <div className="results-heading">
                <div>
                  <span className="section-kicker">
                    <UsersRound size={14} aria-hidden="true" />
                    Ranked valid candidates
                  </span>
                  <h3>
                    {matches.length} reciprocal {matches.length === 1 ? "match" : "matches"}
                  </h3>
                </div>
                <div className="match-engine-badges">
                  <span
                    className={`badge ${
                      meta?.ml?.mode === "ml" ? "badge-violet" : "badge-soft"
                    }`}
                  >
                    <BrainCircuit size={13} aria-hidden="true" />
                    {meta?.ml?.mode === "ml" ? "ML inference active" : "Rule fallback"}
                  </span>
                  <span className="badge badge-soft">
                    {meta?.excluded_count ?? 0} excluded by hard rules
                  </span>
                </div>
              </div>

              {meta?.requester_has_active_exchange && (
                <div className="inline-notice inline-notice-warning">
                  Matching returned no candidates because this booking is already
                  part of an active exchange.
                </div>
              )}

              {meta?.ml?.fallback_reason && (
                <div className="inline-notice inline-notice-info">
                  <Info size={16} aria-hidden="true" />
                  {meta.ml.fallback_reason} The deterministic engine remains fully
                  functional.
                </div>
              )}

              {matches.length === 0 ? (
                <EmptyState
                  icon={ArrowLeftRight}
                  title="No eligible reciprocal matches"
                  description="No other synthetic passenger currently satisfies both directional preferences and all coach-scope and request-state rules. Try any-coach scope or a different berth preference."
                />
              ) : (
                <div className="match-list">
                  {matches.map((match) => (
                    <MatchCard
                      key={match.candidate_booking_id}
                      match={match}
                      onView={(item) =>
                        navigate(
                          `/matches/${item.candidate_booking_id}?bookingId=${selectedBookingId}`
                        )
                      }
                    />
                  ))}
                </div>
              )}

              <div className="page-footnote">
                Ranked scores are heuristic values from an illustrative weighted
                formula. They are not probabilities of real-world passenger
                acceptance. Application-level consent is not official railway
                authorization.
              </div>
            </section>
          )}

          {!hasSearched && !searching && (
            <div className="match-guidance-grid">
              <div className="guidance-card">
                <ArrowLeftRight size={19} aria-hidden="true" />
                <strong>Reciprocal only</strong>
                <p>One-sided desirable berths are excluded before scoring.</p>
              </div>
              <div className="guidance-card">
                <SlidersHorizontal size={19} aria-hidden="true" />
                <strong>Respect coach scope</strong>
                <p>Both passengers' coach constraints must be satisfied.</p>
              </div>
              <div className="guidance-card">
                <Info size={19} aria-hidden="true" />
                <strong>Consent required</strong>
                <p>Submitting a match creates a request, never a seat change.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
