import {
  ArrowRight,
  BrainCircuit,
  MapPin,
  Sparkles,
  UsersRound,
} from "lucide-react";

import {
  berthLabel,
  formatScore,
  scoreTier,
} from "../utils/formatters";

export default function MatchCard({ match, onView }) {
  const tier = scoreTier(match.compatibility_score);
  return (
    <article className="match-card">
      <div className="match-rank">#{match.rank}</div>
      <div className="match-card-main">
        <div className="match-card-top">
          <div>
            <span className="section-kicker">
              <UsersRound size={14} aria-hidden="true" />
              Reciprocal candidate
            </span>
            <h3>{match.candidate_display_name}</h3>
          </div>
          <div
            className={`match-score tone-${tier.tone}`}
            aria-label={`Compatibility score ${formatScore(match.compatibility_score)} out of 100`}
          >
            <strong>{formatScore(match.compatibility_score)}</strong>
            <span>{tier.label}</span>
          </div>
        </div>

        <div className="match-berth-flow">
          <div>
            <span>Their berth</span>
            <strong>{berthLabel(match.current_berth_type)}</strong>
            <small>
              Coach {match.candidate_coach_number} · Berth{" "}
              {match.candidate_berth_number}
            </small>
          </div>
          <span className="match-arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </span>
          <div>
            <span>They prefer</span>
            <strong>{berthLabel(match.desired_berth_type)}</strong>
            <small>
              {match.same_coach ? "Same coach as you" : "Different coach"}
            </small>
          </div>
        </div>

        <p className="match-summary">{match.explanation?.summary}</p>

        <div className="match-footer">
          <div className="match-chips">
            <span className="badge badge-soft">
              <MapPin size={13} aria-hidden="true" />
              Coach {match.candidate_coach_number}
            </span>
            <span className={`badge badge-soft ${match.ml?.available ? "badge-violet" : ""}`}>
              <BrainCircuit size={13} aria-hidden="true" />
              {match.ml?.available ? "ML support available" : "Rule fallback"}
            </span>
            <span className="badge badge-success">
              <Sparkles size={13} aria-hidden="true" />
              Both directions verified
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => onView?.(match)}
          >
            Review match
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
