const normalizeApiBaseUrl = () => {
  const raw = String(import.meta.env.VITE_API_URL || "").trim();
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }

  if (/^localhost(?::\d+)?$/i.test(raw) || /^127\.0\.0\.1(?::\d+)?$/i.test(raw)) {
    return `http://${raw}`;
  }

  return `https://${raw}`;
};

const apiBaseUrl = normalizeApiBaseUrl();

const normalizeUrl = (path: string) => {
  const base = apiBaseUrl;
  return base ? `${base}${path}` : path;
};

const defaultHeaders = {
  "Content-Type": "application/json",
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message = payload?.message || response.statusText || "API request gagal.";
    throw new Error(message);
  }

  return payload;
};

const unwrapApiPayload = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const typed = payload as Record<string, unknown>;
    if (typeof typed.success === "boolean") {
      if (!typed.success) {
        throw new Error(String(typed.message || "API request gagal."));
      }
      return (typed.data ?? payload) as T;
    }
  }
  return payload as T;
};

export const apiFetch = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(normalizeUrl(path), {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers || {}),
    },
  });
  const payload = await parseResponse(response);
  return unwrapApiPayload<T>(payload);
};

export const checkDatabaseConnection = async () => {
  const response = await fetch(`${apiBaseUrl}/db/accounts_cabang`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Aplikasi tidak dapat terhubung ke database.");
  }

  const payload = await response.json().catch(() => null);
  const isValidPayload =
    payload &&
    typeof payload === "object" &&
    (payload.success !== false || Array.isArray(payload));

  if (!isValidPayload) {
    throw new Error("Database merespons tidak valid.");
  }
};
