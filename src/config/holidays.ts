const DEFAULT_HOLIDAYS = [
  // Format: YYYY-MM-DD
  // Example entries for 2026 - edit via Admin UI
  "2026-01-01",
  "2026-05-01",
  "2026-05-02",
  "2026-12-25",
];

const STORAGE_KEY = "nationalHolidays";

let nationalHolidays = DEFAULT_HOLIDAYS.map((date) => ({ date }));

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {}
}

export const getNationalHolidays = (): { date: string; label?: string }[] => {
  return nationalHolidays.map((item) => ({ ...item }));
};

export const setNationalHolidays = (items: { date: string; label?: string }[]) => {
  nationalHolidays = items
    .filter((item) => Boolean(item.date))
    .map((item) => ({ ...item }));
};

export const isNationalHoliday = (dateKey: string) => {
  const list = getNationalHolidays().map((it) => it.date);
  return list.includes(dateKey);
};

export const getNationalHolidayName = (dateKey: string): string | null => {
  const found = getNationalHolidays().find((it) => it.date === dateKey);
  return found?.label || (found ? "Hari Libur Nasional" : null);
};
