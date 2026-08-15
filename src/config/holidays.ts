const DEFAULT_HOLIDAYS = [
  // Format: YYYY-MM-DD
  // Example entries for 2026 - edit via Admin UI
  "2026-01-01",
  "2026-05-01",
  "2026-05-02",
  "2026-12-25",
];

const STORAGE_KEY = "nationalHolidays";

const readFromStorage = (): string[] => {
  try {
    if (typeof window === "undefined") return DEFAULT_HOLIDAYS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOLIDAYS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_HOLIDAYS;
    return parsed.map(String);
  } catch (_e) {
    return DEFAULT_HOLIDAYS;
  }
};

const writeToStorage = (list: string[]) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_e) {
    // ignore
  }
};

export const getNationalHolidays = (): { date: string; label?: string }[] => {
  const raw = readFromStorage();
  // Stored format: either plain date strings or objects JSON-serialized
  try {
    return raw.map((item) => {
      try {
        const parsed = JSON.parse(item);
        if (parsed && parsed.date) return { date: String(parsed.date), label: parsed.label };
      } catch (_e) {
        // not JSON object, treat as date string
      }
      return { date: item };
    });
  } catch (_e) {
    return raw.map((d) => ({ date: d }));
  }
};

export const setNationalHolidays = (items: { date: string; label?: string }[]) => {
  const serialized = items.map((it) => (it.label ? JSON.stringify(it) : it.date));
  writeToStorage(serialized);
};

export const isNationalHoliday = (dateKey: string) => {
  const list = getNationalHolidays().map((it) => it.date);
  return list.includes(dateKey);
};
