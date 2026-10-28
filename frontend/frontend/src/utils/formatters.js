export const BERTH_TYPES = [
  "LOWER",
  "MIDDLE",
  "UPPER",
  "SIDE_LOWER",
  "SIDE_UPPER",
];

export const BERTH_LABELS = {
  LOWER: "Lower",
  MIDDLE: "Middle",
  UPPER: "Upper",
  SIDE_LOWER: "Side Lower",
  SIDE_UPPER: "Side Upper",
};

export const COACH_SCOPE_LABELS = {
  ANY: "Any coach",
  SAME_COACH: "Same coach only",
};

export const STATUS_LABELS = {
  PENDING: "Awaiting response",
  ACCEPTED_BY_BOTH: "Accepted by both",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  AWAITING_EXTERNAL_AUTHORIZATION: "Simulated authorization",
  COMPLETED: "Simulated complete",
  EXPIRED: "Expired",
};

export function berthLabel(type) {
  if (!type) return "Not set";
  return BERTH_LABELS[type] || type.replaceAll("_", " ");
}

export function coachScopeLabel(scope) {
  return COACH_SCOPE_LABELS[scope] || scope || "Not set";
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Unknown";
}

export function statusTone(status) {
  if (status === "COMPLETED") return "success";
  if (status === "ACCEPTED_BY_BOTH") return "accent";
  if (status === "PENDING") return "warning";
  if (status === "AWAITING_EXTERNAL_AUTHORIZATION") return "violet";
  if (status === "DECLINED" || status === "CANCELLED" || status === "EXPIRED") {
    return "danger";
  }
  return "neutral";
}

export function scoreTier(score) {
  if (score === null || score === undefined) {
    return { label: "Not scored", tone: "neutral" };
  }
  if (score >= 90) return { label: "Very strong", tone: "success" };
  if (score >= 80) return { label: "Strong", tone: "accent" };
  if (score >= 70) return { label: "Moderate", tone: "warning" };
  return { label: "Lower", tone: "danger" };
}

export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value, options = {}) {
  const parsed = parseLocalDate(value);
  if (!parsed) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(parsed);
}

export function formatDateTime(value) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function relativeTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const diffSeconds = Math.round((parsed.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "just now";
}

export function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return "—";
  }
  return Number(score).toFixed(1);
}

export function formatProbability(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(4);
}

export function initials(name) {
  if (!name) return "RS";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}
