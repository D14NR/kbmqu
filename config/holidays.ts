export const nationalHolidays = new Set<string>([
  // Root-level config for tools/components outside `src` copy
  "2026-01-01",
  "2026-05-01",
  "2026-05-02",
  "2026-12-25",
]);

export const isNationalHoliday = (dateKey: string) => nationalHolidays.has(dateKey);
