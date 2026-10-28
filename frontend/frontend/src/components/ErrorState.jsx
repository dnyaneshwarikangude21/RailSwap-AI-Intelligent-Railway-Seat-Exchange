import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorState({
  title = "Something went wrong",
  message = "The request could not be completed.",
  onRetry,
  details,
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </div>
      <div className="error-state-copy">
        <strong>{title}</strong>
        <p>{message}</p>
        {details && <p className="muted small">{details}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>
          <RefreshCcw size={15} />
          Retry
        </button>
      )}
    </div>
  );
}
