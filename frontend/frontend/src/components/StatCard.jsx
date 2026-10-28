export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "accent",
  loading = false,
}) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className="stat-card-icon" aria-hidden="true">
            <Icon size={19} />
          </span>
        )}
      </div>
      <div className="stat-card-value">
        {loading ? <span className="skeleton skeleton-number" /> : value ?? "0"}
      </div>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </article>
  );
}
