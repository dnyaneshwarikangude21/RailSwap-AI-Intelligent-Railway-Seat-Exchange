import { Gauge } from "lucide-react";

import { formatScore } from "../utils/formatters";

export default function ScoreBreakdown({ breakdown, compact = false }) {
  if (!breakdown) {
    return (
      <div className="score-breakdown">
        <p className="muted">No score breakdown is available.</p>
      </div>
    );
  }
  const contributions = breakdown.contributions || [];
  return (
    <section className={`score-breakdown ${compact ? "score-breakdown-compact" : ""}`}>
      <div className="score-breakdown-head">
        <div className="score-total">
          <span className="score-total-icon" aria-hidden="true">
            <Gauge size={18} />
          </span>
          <div>
            <span className="section-kicker">Compatibility score</span>
            <strong>{formatScore(breakdown.score)}</strong>
            <small>/ 100 weighted baseline</small>
          </div>
        </div>
      </div>

      <div className="factor-list">
        {contributions.map((factor) => {
          const percent = Math.round((factor.value || 0) * 100);
          return (
            <div className="factor-row" key={factor.feature}>
              <div className="factor-row-label">
                <span>{factor.label}</span>
                <span className="factor-points">+{formatScore(factor.contribution)}</span>
              </div>
              <div
                className="factor-track"
                role="progressbar"
                aria-label={`${factor.label}: ${percent} percent`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span
                  className="factor-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="factor-meta">
                <span>{percent}% normalized value</span>
                <span>Weight {Math.round(factor.weight * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="score-note">{breakdown.note}</p>
    </section>
  );
}
