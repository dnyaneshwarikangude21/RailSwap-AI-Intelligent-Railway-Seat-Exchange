import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  TrainFront,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { bookingsApi, trainsApi } from "../api/client";
import BerthMap from "../components/BerthMap";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import {
  berthLabel,
  formatDate,
} from "../utils/formatters";

export default function TrainDetails() {
  const { trainId } = useParams();
  const navigate = useNavigate();
  const [train, setTrain] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [selectedBerth, setSelectedBerth] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [journeyError, setJourneyError] = useState("");
  const [bookingError, setBookingError] = useState("");

  const loadTrain = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await trainsApi.detail(trainId);
      setTrain(payload.train);
      setJourneys(payload.journeys || []);
      const first = payload.journeys?.[0]?.id ?? null;
      setSelectedJourneyId(first);
    } catch (err) {
      setError(err.message || "Train details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [trainId]);

  useEffect(() => {
    loadTrain();
  }, [loadTrain]);

  const loadJourney = useCallback(async (journeyId) => {
    if (!journeyId) return;
    setJourneyLoading(true);
    setJourneyError("");
    setSelectedBerth(null);
    setSelectedCoach(null);
    try {
      const payload = await trainsApi.journey(journeyId);
      setJourneyData(payload.journey);
    } catch (err) {
      setJourneyError(err.message || "The coach layout could not be loaded.");
    } finally {
      setJourneyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJourneyId) loadJourney(selectedJourneyId);
  }, [selectedJourneyId, loadJourney]);

  function handleSelectBerth(berth, coach) {
    setSelectedBerth(berth);
    setSelectedCoach(coach);
    setBookingError("");
  }

  async function addDemoBooking() {
    if (!selectedBerth || !selectedJourneyId) return;
    setBooking(true);
    setBookingError("");
    try {
      const payload = await bookingsApi.create({
        journey_id: selectedJourneyId,
        berth_id: selectedBerth.id,
      });
      navigate(`/bookings/${payload.booking.id}`);
    } catch (err) {
      setBookingError(err.message || "The demo booking could not be created.");
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <LoadingState label="Loading journey workspace..." />;
  if (error) return <ErrorState message={error} onRetry={loadTrain} />;
  if (!train) return null;

  return (
    <div className="page-stack">
      <Link to="/trains" className="back-link">
        <ArrowLeft size={15} />
        Back to train discovery
      </Link>

      <header className="train-detail-hero">
        <div className="train-detail-main">
          <span className="eyebrow">
            <TrainFront size={14} aria-hidden="true" />
            {train.train_number} · Synthetic service
          </span>
          <h2>{train.train_name}</h2>
          <div className="train-route-large">
            <span>
              <MapPin size={16} aria-hidden="true" />
              {train.source}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
            <span>{train.destination}</span>
          </div>
          <p>
            Select an upcoming fictional journey, choose an available demo berth,
            and add it to your account.
          </p>
        </div>
        <div className="train-detail-note">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Demonstration inventory</strong>
            <p>
              No real seat is reserved. Berth occupancy is local synthetic data and
              verification is simulated.
            </p>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              <CalendarDays size={14} aria-hidden="true" />
              Upcoming journeys
            </span>
            <h2>Choose a journey</h2>
          </div>
          <span className="badge badge-soft">Future dates</span>
        </div>

        {journeys.length === 0 ? (
          <div className="inline-notice inline-notice-warning">
            This train has no upcoming synthetic journeys. Reset the demo seed data
            or choose another train.
          </div>
        ) : (
          <div className="journey-selector" role="tablist" aria-label="Journey selection">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                type="button"
                role="tab"
                aria-selected={selectedJourneyId === journey.id}
                className={`journey-select-card ${
                  selectedJourneyId === journey.id ? "journey-select-active" : ""
                }`}
                onClick={() => setSelectedJourneyId(journey.id)}
              >
                <span className="journey-select-date">
                  <CalendarDays size={15} aria-hidden="true" />
                  {formatDate(journey.journey_date)}
                </span>
                <span className="journey-select-time">
                  <Clock3 size={14} aria-hidden="true" />
                  {journey.departure_time} → {journey.arrival_time}
                </span>
                <span className="journey-select-coaches">
                  {journey.coaches?.length || 0} demo coaches
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {journeyError && (
        <ErrorState
          message={journeyError}
          onRetry={() => loadJourney(selectedJourneyId)}
        />
      )}

      {journeyLoading ? (
        <LoadingState label="Loading coach and berth layout..." />
      ) : (
        journeyData && (
          <div className="train-layout-grid">
            <section className="panel coach-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Coach and berth map</span>
                  <h2>Select an available berth</h2>
                </div>
                <span className="badge badge-soft">
                  Journey {formatDate(journeyData.journey_date)}
                </span>
              </div>
              <BerthMap
                coaches={journeyData.coaches || []}
                selectedBerthId={selectedBerth?.id}
                onSelectBerth={handleSelectBerth}
                selectable
                selectionHint="Pick any available berth. Occupied and existing demo berths cannot be selected."
              />
            </section>

            <aside className="panel booking-summary">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Demo booking</span>
                  <h2>Your selection</h2>
                </div>
              </div>
              {selectedBerth ? (
                <>
                  <div className="selected-berth-card">
                    <span className="selected-berth-icon">
                      <CheckCircle2 size={20} />
                    </span>
                    <div>
                      <strong>
                        Coach {selectedCoach?.coach_number} · Berth{" "}
                        {selectedBerth.berth_number}
                      </strong>
                      <p>{berthLabel(selectedBerth.berth_type)}</p>
                    </div>
                  </div>
                  <dl className="summary-list">
                    <div>
                      <dt>Journey</dt>
                      <dd>{formatDate(journeyData.journey_date)}</dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{train.train_number}</dd>
                    </div>
                    <div>
                      <dt>Verification</dt>
                      <dd>Simulated demo verification</dd>
                    </div>
                  </dl>
                  {bookingError && (
                    <p className="form-error" role="alert">
                      {bookingError}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={addDemoBooking}
                    disabled={booking}
                  >
                    {booking ? "Adding booking..." : "Add demo booking"}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <div className="booking-empty">
                  <Info size={20} aria-hidden="true" />
                  <h3>Select a berth from the map</h3>
                  <p>
                    After adding the demo booking, set your preferred berth type to
                    start matching.
                  </p>
                </div>
              )}
              <div className="page-footnote compact">
                No ticket screenshot, government ID, or real passenger record is
                required.
              </div>
            </aside>
          </div>
        )
      )}
    </div>
  );
}
