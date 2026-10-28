import { statusLabel, statusTone } from "../utils/formatters";

export default function ExchangeStatus({ status, withDot = true }) {
  const tone = statusTone(status);
  return (
    <span className={`status-badge status-${tone}`}>
      {withDot && <span className="status-dot" aria-hidden="true" />}
      {statusLabel(status)}
    </span>
  );
}
