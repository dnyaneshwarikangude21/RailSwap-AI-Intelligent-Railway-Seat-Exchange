import { Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { preferencesApi } from "../api/client";
import {
  BERTH_TYPES,
  berthLabel,
  coachScopeLabel,
} from "../utils/formatters";
import { hasErrors, validatePreference } from "../utils/validators";

export default function PreferenceEditor({ booking, onSaved }) {
  const idPrefix = useId();
  const initialDesired =
    booking.preference?.desired_berth_type ||
    BERTH_TYPES.find((type) => type !== booking.berth?.berth_type) ||
    "LOWER";
  const [desired, setDesired] = useState(initialDesired);
  const [coachScope, setCoachScope] = useState(
    booking.preference?.coach_scope || "ANY"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDesired(
      booking.preference?.desired_berth_type ||
        BERTH_TYPES.find((type) => type !== booking.berth?.berth_type) ||
        "LOWER"
    );
    setCoachScope(booking.preference?.coach_scope || "ANY");
    setError("");
    setMessage("");
  }, [booking.id, booking.preference?.id]);

  const activeExchange = Boolean(booking.has_active_exchange);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const values = { desired_berth_type: desired, coach_scope: coachScope };
    const errors = validatePreference(values);
    if (hasErrors(errors)) {
      setError(Object.values(errors)[0]);
      return;
    }
    setSaving(true);
    try {
      const payload = booking.preference
        ? await preferencesApi.update(booking.preference.id, values)
        : await preferencesApi.create({
            booking_id: booking.id,
            ...values,
          });
      setMessage("Preference saved. You can search for reciprocal matches now.");
      onSaved?.(payload.preference);
    } catch (err) {
      setError(err.message || "The preference could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="preference-editor" onSubmit={handleSubmit}>
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Exchange preference
          </span>
          <h3>Choose the berth you would accept</h3>
        </div>
        <span className="current-berth-chip">
          Current: {berthLabel(booking.berth?.berth_type)}
        </span>
      </div>

      {activeExchange && (
        <div className="inline-notice inline-notice-warning">
          An exchange request is active for this booking. Preferences are locked
          until it is resolved or cancelled.
        </div>
      )}

      <div className="form-grid two-column">
        <div className="field">
          <label htmlFor={`${idPrefix}-desired`}>Desired berth type</label>
          <select
            id={`${idPrefix}-desired`}
            value={desired}
            onChange={(event) => setDesired(event.target.value)}
            disabled={saving || activeExchange}
          >
            {BERTH_TYPES.map((type) => (
              <option key={type} value={type}>
                {berthLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-scope`}>Coach scope</label>
          <select
            id={`${idPrefix}-scope`}
            value={coachScope}
            onChange={(event) => setCoachScope(event.target.value)}
            disabled={saving || activeExchange}
          >
            <option value="ANY">Any coach</option>
            <option value="SAME_COACH">Same coach only</option>
          </select>
        </div>
      </div>

      {desired === booking.berth?.berth_type && (
        <p className="field-hint">
          This matches your current berth type, so reciprocal exchanges are
          unlikely. Choose a different type for useful recommendations.
        </p>
      )}
      <p className="field-hint">
        Current preference: <strong>{coachScopeLabel(coachScope)}</strong>. Both
        passengers must want each other's current berth for an eligible match.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={saving || activeExchange}
      >
        <Save size={16} />
        {saving ? "Saving..." : booking.preference ? "Update preference" : "Save preference"}
      </button>
    </form>
  );
}
