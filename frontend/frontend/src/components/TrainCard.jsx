import { ArrowRight, CalendarDays, MapPin, TrainFront } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDate } from "../utils/formatters";

export default function TrainCard({ train }) {
  const next = train.next_journey;
  return (
    <article className="train-card">
      <div className="train-card-header">
        <span className="train-number-badge">
          <TrainFront size={15} aria-hidden="true" />
          {train.train_number}
        </span>
        <span className="badge badge-soft">Synthetic</span>
      </div>
      <h3>{train.train_name}</h3>
      <div className="route-line">
        <span>
          <MapPin size={14} aria-hidden="true" />
          {train.source}
        </span>
        <ArrowRight size={15} aria-hidden="true" />
        <span>{train.destination}</span>
      </div>
      <div className="train-card-meta">
        {next ? (
          <>
            <span>
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(next.journey_date)}
            </span>
            <span>
              {next.departure_time} → {next.arrival_time}
            </span>
          </>
        ) : (
          <span>No upcoming synthetic journeys</span>
        )}
      </div>
      <div className="train-card-footer">
        <span className="muted small">{train.journey_count ?? 0} upcoming journeys</span>
        <Link to={`/trains/${train.id}`} className="btn btn-secondary btn-small">
          View journeys
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
