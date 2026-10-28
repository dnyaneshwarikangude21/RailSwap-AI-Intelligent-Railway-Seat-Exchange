import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BrainCircuit,
  CheckCircle2,
  Info,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  bookingsApi,
  exchangesApi,
  matchingApi,
} from "../api/client";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScoreBreakdown from "../components/ScoreBreakdown";
import {
  berthLabel,
  formatDate,
  formatProbability,
  formatScore,
  scoreTier,
} from "../utils/formatters";

export default function MatchDetails() {
  const { candidateBookingId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (!bookingId) {
      setError("A requester booking ID is required to review this match.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [matchPayload, bookingPayload] = await Promise.all([
        matchingApi.explanation(candidateBookingId, bookingId),
        bookingsApi.detail(bookingId),
      ]);
      setMatch(matchPayload.match);
      setBooking(bookingPayload.booking);
    } catch (err) {
      setError(err.message || "Match analysis could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [candidateBookingId, bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function requestExchange() {
    const confirmed = window.confirm(
      "Send this consent-based exchange request? The selected co-passenger must accept before the application marks it agreed by both users. No official railway reservation will be changed."
    );
    if (!confirmed) return;
    setActionError("");
    setRequesting(true);
    try {
      await exchangesApi.create({
        requester_booking_id: booking.id,
        recipient_booking_id: match.candidate_booking_id,
      });
      navigate("/exchanges", {
        state: {
          flash:
            "Exchange request sent. It is pending the recipient's response and is not an official railway change.",
        },
      });
    } catch (err) {
      setActionError(err.message || "The exchange request could not be created.");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <LoadingState label="Loading match analysis..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!match || !booking) return null;

  const eligible = match.eligibility?.eligible;
  const tier = scoreTier(match.compatibility_score);
  const failedChecks =
    match.eligibility?.checks?.filter((check) => !check.passed) || [];

  return (
    <div className="page-stack">
      <Link
        to={`/matches?bookingId=${booking.id}`}
        className="back-link"
      >
        <ArrowLeft size={15} />
        Back to matching
      </Link>

      <header className="match-detail-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Explainable match analysis
          </span>
          <h2>{match.candidate_display_name}</h2>
          <p>
            {match.journey.train_number} · {match.journey.train_name} ·{" "}
            {formatDate(match.journey.journey_date)}
          </p>
        </div>
        <div className={`match-detail-score tone-${tier.tone}`}>
          <span>Compatibility</span>
          <strong>{formatScore(match.compatibility_score)}</strong>
          <small>/ 100 · {tier.label}</small>
        </div>
      </header>

      {!eligible && (
        <div className="inline-notice inline-notice-danger" role="alert">
          <AlertTriangle size={17} aria-hidden="true" />
          This pair is no longer eligible. You can inspect the explanation, but a
          request cannot be sent until all hard checks pass.
        </div>
      )}
      {actionError && (
        <div className="inline-notice inline-notice-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="match-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">
                <ArrowLeftRight size={14} aria-hidden="true" />
                Reciprocal exchange
              </span>
              <h2>Berth compatibility</h2>
            </div>
            <span className="badge badge-success">
              <ShieldCheck size={13} aria-hidden="true" />
              Application-level only
            </span>
          </div>

          <div className="exchange-visual">
            <div className="exchange-side">
              <span className="exchange-person">You</span>
              <strong>{berthLabel(booking.berth?.berth_type)}</strong>
              <span>
                Coach {booking.coach?.coach_number} · Berth{" "}
                {booking.berth?.berth_number}
              </span>
              <div className="exchange-desire">
                Wants {berthLabel(booking.preference?.desired_berth_type)}
              </div>
            </div>
            <div className="exchange-swap" aria-hidden="true">
              <ArrowLeftRight size={22} />
            </div>
            <div className="exchange-side">
              <span className="exchange-person">{match.candidate_display_name}</span>
              <strong>{berthLabel(match.current_berth_type)}</strong>
              <span>
                Coach {match.candidate_coach_number} · Berth{" "}
                {match.candidate_berth_number}
              </span>
              <div className="exchange-desire">
                Wants {berthLabel(match.desired_berth_type)}
              </div>
            </div>
          </div>

          <div className="match-meta-grid">
            <div>
              <MapPin size={15} aria-hidden="true" />
              <span>Coach relationship</span>
              <strong>{match.same_coach ? "Same coach" : "Different coaches"}</strong>
            </div>
            <div>
              <UsersRound size={15} aria-hidden="true" />
              <span>Eligibility</span>
              <strong>{eligible ? "All hard checks passed" : "Blocked"}</strong>
            </div>
            <div>
              <BrainCircuit size={15} aria-hidden="true" />
              <span>ML support</span>
              <strong>
                {match.ml?.available
                  ? `Synthetic confidence ${formatProbability(match.ml.score)}`
                  : "Rule-based fallback"}
              </strong>
            </div>
          </div>

          <p className="explanation-summary">{match.explanation?.summary}</p>

          <div className="explanation-factor-list">
            {match.explanation?.factors?.map((factor) => (
              <div key={factor.feature} className="explanation-factor">
                <span>{factor.label}</span>
                <p>{factor.message}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel">
          <ScoreBreakdown breakdown={match.score_breakdown} />
        </aside>
      </div>

      <div className="match-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Hard eligibility gate</span>
              <h2>Rule-by-rule checks</h2>
            </div>
            <span className="badge badge-soft">
              {match.eligibility?.checks?.length || 0} checks
            </span>
          </div>
          <ul className="eligibility-list">
            {match.eligibility?.checks?.map((check) => (
              <li
                key={check.code}
                className={check.passed ? "eligibility-pass" : "eligibility-fail"}
              >
                {check.passed ? (
                  <CheckCircle2 size={17} aria-label="Passed" />
                ) : (
                  <XCircle size={17} aria-label="Failed" />
                )}
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {failedChecks.length > 0 && (
            <div className="inline-notice inline-notice-warning">
              {failedChecks.length} check(s) failed. High scores cannot override
              these constraints.
            </div>
          )}
        </section>

        <aside className="panel match-action-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Consent workflow</span>
              <h2>Send exchange request</h2>
            </div>
          </div>
          <p>
            The co-passenger will receive an in-app notification and must explicitly
            accept or decline. Only then can the application-level status advance.
          </p>
          <ol className="consent-steps">
            <li>
              <span>1</span> You submit a request (pending).
            </li>
            <li>
              <span>2</span> Recipient accepts or declines.
            </li>
            <li>
              <span>3</span> Accepted-by-both remains distinct from official railway
              authorization.
            </li>
          </ol>
          {!eligible && (
            <div className="inline-notice inline-notice-warning compact-notice">
              Request disabled until the failed eligibility checks are resolved.
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={requestExchange}
            disabled={!eligible || requesting}
          >
            <Send size={16} />
            {requesting ? "Sending request..." : "Send consent request"}
          </button>
          <p className="field-hint">
            This action does not buy, sell, or transfer a reserved railway seat.
          </p>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              <Info size={14} aria-hidden="true" />
              Transparency
            </span>
            <h2>Limitations and interpretation</h2>
          </div>
        </div>
        <ul className="limitations-list">
          {match.explanation?.limitations?.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
          {match.limitations?.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p className="panel-note">{match.explanation?.score_interpretation}</p>
      </section>
    </div>
  );
}
