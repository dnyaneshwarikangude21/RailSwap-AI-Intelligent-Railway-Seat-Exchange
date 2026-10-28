const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const TOKEN_KEY = "railswap.accessToken";

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function notifyUnauthorized() {
  window.dispatchEvent(new CustomEvent("railswap:unauthorized"));
}

function extractError(payload, fallback) {
  if (payload?.error?.message) {
    return {
      message: payload.error.message,
      code: payload.error.code,
      details: payload.error.details,
    };
  }
  return { message: fallback, code: "REQUEST_FAILED", details: null };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    auth = true,
    signal,
    headers: extraHeaders,
  } = options;
  const token = getToken();
  const headers = { ...extraHeaders };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Could not reach the RailSwap AI server. Check that the backend is running.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const extracted = extractError(
      payload,
      `Request failed with status ${response.status}.`
    );
    if (response.status === 401 && token) {
      clearToken();
      notifyUnauthorized();
    }
    throw new ApiError(
      extracted.message,
      response.status,
      extracted.code,
      extracted.details
    );
  }
  return payload;
}

async function download(path) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(
      "Could not reach the RailSwap AI server.",
      0,
      "NETWORK_ERROR"
    );
  }
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const extracted = extractError(payload, "The export could not be created.");
    if (response.status === 401) {
      clearToken();
      notifyUnauthorized();
    }
    throw new ApiError(extracted.message, response.status, extracted.code);
  }
  const disposition = response.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  return {
    blob: await response.blob(),
    filename: filenameMatch ? filenameMatch[1] : "railswap-export.json",
  };
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "";
}

export const authApi = {
  register: (data) =>
    request("/auth/register", { method: "POST", body: data, auth: false }),
  login: (data) =>
    request("/auth/login", { method: "POST", body: data, auth: false }),
  me: () => request("/auth/me"),
  updateMe: (data) => request("/auth/me", { method: "PUT", body: data }),
};

export const trainsApi = {
  list: (filters = {}) => request(`/trains${queryString(filters)}`),
  detail: (trainId) => request(`/trains/${trainId}`),
  journeys: (filters = {}) => request(`/journeys${queryString(filters)}`),
  journey: (journeyId) => request(`/journeys/${journeyId}`),
};

export const bookingsApi = {
  list: () => request("/bookings"),
  detail: (bookingId) => request(`/bookings/${bookingId}`),
  create: (data) => request("/bookings", { method: "POST", body: data }),
  update: (bookingId, data) =>
    request(`/bookings/${bookingId}`, { method: "PUT", body: data }),
  remove: (bookingId) =>
    request(`/bookings/${bookingId}`, { method: "DELETE" }),
};

export const preferencesApi = {
  list: (bookingId) =>
    request(`/preferences${queryString({ booking_id: bookingId })}`),
  create: (data) => request("/preferences", { method: "POST", body: data }),
  update: (preferenceId, data) =>
    request(`/preferences/${preferenceId}`, {
      method: "PUT",
      body: data,
    }),
};

export const matchingApi = {
  search: (bookingId) =>
    request("/matching/search", {
      method: "POST",
      body: { booking_id: bookingId },
    }),
  explanation: (candidateBookingId, bookingId) =>
    request(
      `/matching/${candidateBookingId}/explanation${queryString({
        booking_id: bookingId,
      })}`
    ),
};

export const exchangesApi = {
  list: (filters = {}) => request(`/exchanges${queryString(filters)}`),
  detail: (exchangeId) => request(`/exchanges/${exchangeId}`),
  create: (data) => request("/exchanges", { method: "POST", body: data }),
  accept: (exchangeId) =>
    request(`/exchanges/${exchangeId}/accept`, { method: "POST" }),
  decline: (exchangeId) =>
    request(`/exchanges/${exchangeId}/decline`, { method: "POST" }),
  cancel: (exchangeId) =>
    request(`/exchanges/${exchangeId}/cancel`, { method: "POST" }),
  export: () => download("/exchanges/export"),
};

export const notificationsApi = {
  list: (params = {}) => request(`/notifications${queryString(params)}`),
  markRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, { method: "POST" }),
  markAllRead: () =>
    request("/notifications/read-all", { method: "POST" }),
};

export const analyticsApi = {
  dashboard: () => request("/analytics/dashboard"),
  mlMetrics: () => request("/analytics/ml-metrics"),
};

export const adminApi = {
  overview: () => request("/admin/overview"),
  exchanges: (filters = {}) =>
    request(`/admin/exchanges${queryString(filters)}`),
  advance: (exchangeId, targetStatus) =>
    request(`/admin/exchanges/${exchangeId}/advance`, {
      method: "POST",
      body: { target_status: targetStatus },
    }),
};
