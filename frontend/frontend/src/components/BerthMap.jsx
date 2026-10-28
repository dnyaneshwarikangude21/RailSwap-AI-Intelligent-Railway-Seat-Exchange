import { Armchair, Info } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { BERTH_TYPES, berthLabel } from "../utils/formatters";

export default function BerthMap({
  coaches = [],
  selectedBerthId = null,
  onSelectBerth,
  selectable = false,
  selectionHint,
}) {
  const [activeCoachId, setActiveCoachId] = useState(coaches[0]?.id ?? null);
  const tabSetId = useId();

  useEffect(() => {
    if (!coaches.length) {
      setActiveCoachId(null);
      return;
    }
    const selectedCoach = coaches.find((coach) =>
      coach.berths?.some((berth) => berth.id === selectedBerthId)
    );
    setActiveCoachId((current) => {
      const candidate = selectedCoach?.id ?? current;
      return coaches.some((coach) => coach.id === candidate)
        ? candidate
        : coaches[0].id;
    });
  }, [coaches, selectedBerthId]);

  if (!coaches.length) {
    return (
      <div className="berth-map-empty">
        <Info size={18} aria-hidden="true" />
        No coach layout is available for this journey.
      </div>
    );
  }

  const activeCoach =
    coaches.find((coach) => coach.id === activeCoachId) || coaches[0];
  const berths = activeCoach.berths || [];
  const availableCount = berths.filter((berth) => berth.available !== false).length;

  return (
    <section className="berth-map" aria-label="Coach and berth layout">
      <div className="berth-map-toolbar">
        <div className="coach-tabs" role="tablist" aria-label="Coach selection">
          {coaches.map((coach) => {
            const isActive = coach.id === activeCoach.id;
            return (
              <button
                key={coach.id}
                type="button"
                role="tab"
                id={`${tabSetId}-tab-${coach.id}`}
                aria-selected={isActive}
                aria-controls={`${tabSetId}-panel`}
                className={`coach-tab ${isActive ? "coach-tab-active" : ""}`}
                onClick={() => setActiveCoachId(coach.id)}
              >
                <span>{coach.coach_number}</span>
                <small>{coach.coach_type}</small>
              </button>
            );
          })}
        </div>
        <div className="coach-availability">
          <Armchair size={16} aria-hidden="true" />
          {availableCount} of {berths.length} available
        </div>
      </div>

      <div
        className="berth-map-body"
        role="tabpanel"
        id={`${tabSetId}-panel`}
        aria-labelledby={`${tabSetId}-tab-${activeCoach.id}`}
      >
        <div className="berth-legend" aria-label="Berth type legend">
          {BERTH_TYPES.map((type) => (
            <span key={type} className="legend-item">
              <span
                className={`legend-swatch berth-swatch-${type.toLowerCase()}`}
                aria-hidden="true"
              />
              {berthLabel(type)}
            </span>
          ))}
          <span className="legend-item">
            <span className="legend-swatch legend-occupied" aria-hidden="true" />
            Occupied
          </span>
        </div>

        <div className="berth-grid">
          {berths.map((berth) => {
            const available = berth.available !== false;
            const isSelected = berth.id === selectedBerthId;
            const isMine = Boolean(berth.is_your_booking);
            const disabled = !selectable || !available;
            const statusText = isMine
              ? "Your berth"
              : available
                ? "Available"
                : "Occupied";
            return (
              <button
                key={berth.id}
                type="button"
                className={`berth-tile berth-${berth.berth_type.toLowerCase()} ${
                  isSelected ? "berth-selected" : ""
                } ${!available && !isMine ? "berth-occupied" : ""} ${
                  isMine ? "berth-mine" : ""
                }`}
                disabled={disabled}
                onClick={() => onSelectBerth?.(berth, activeCoach)}
                aria-pressed={isSelected}
                aria-label={`Coach ${activeCoach.coach_number}, berth ${berth.berth_number}, ${berthLabel(
                  berth.berth_type
                )}, ${statusText}`}
                title={`${berthLabel(berth.berth_type)} · ${statusText}`}
              >
                <span className="berth-number">{berth.berth_number}</span>
                <span className="berth-type-code">
                  {berth.berth_type.replace("_", " ")}
                </span>
                {isMine && <span className="berth-you">YOU</span>}
              </button>
            );
          })}
        </div>

        <p className="berth-map-hint">
          {selectionHint ||
            "Synthetic coach map. Berth availability is generated for demonstration only."}
        </p>
      </div>
    </section>
  );
}
