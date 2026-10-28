export default function LoadingState({
  label = "Loading...",
  full = false,
  compact = false,
}) {
  return (
    <div
      className={`loading-state ${full ? "loading-state-full" : ""} ${
        compact ? "loading-state-compact" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
