const apiBaseUrl = String(import.meta.env.VITE_API_URL || "").trim();

const normalizeUrl = (path: string) => {
  const base = apiBaseUrl;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
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
