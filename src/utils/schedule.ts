import type { RecordItem } from "../types/app";

export const appsScriptUrl =
  "https://script.google.com/macros/s/AKfycbzGxaIA4k29Nhn4hELrc-tNvAxxNUe9uJ7VzlbV1PX3Dl_XzvVi6Z61laFH1T-9I2Ic/exec";

export const mainSpreadsheetId = "1Wa3AUT9JsQOf6gMaNqWvIDBoucqJQ0ZN3A4K4C7nQW8";

export const mapelHeadersExpected = ["Mapel", "Kode_Mapel"];
export const sesiHeaders = Array.from({ length: 10 }, (_, index) => `Sesi ${index + 1}`);

export const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const mapMapelRecord = (record: Record<string, string>) => {
  const normalized: Record<string, string> = {};
  Object.entries(record).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });

  const getValue = (aliases: string[]) => {
    for (const alias of aliases) {
      const match = normalized[normalizeHeader(alias)];
      if (match !== undefined) {
        return match;
      }
    }
    return "";
  };

  return {
    Mapel: getValue(["Mapel", "Mata Pelajaran", "Nama Mapel"]),
    Kode_Mapel: getValue(["Kode_Mapel", "Kode Mapel", "Singkatan"]),
  };
};

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthNamesShortId = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mei",
  "jun",
  "jul",
  "agu",
  "sep",
  "okt",
  "nov",
  "des",
];

export const formatScheduleLabel = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = monthNamesShortId[date.getMonth()] ?? "";
  return `${day} ${month} ${date.getFullYear()}`;
};

export const formatScheduleLabelWithDay = (date: Date) => {
  const weekday = date.toLocaleDateString("id-ID", { weekday: "long" });
  return `${weekday}, ${formatScheduleLabel(date)}`;
};

export const parseFlexibleDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }

  const labelMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z\.]+)\s+(\d{4})$/);
  if (labelMatch) {
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      mei: 4,
      jun: 5,
      jul: 6,
      agu: 7,
      ags: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      des: 11,
    };
    const monthKey = labelMatch[2].replace(".", "").toLowerCase();
    const monthIndex = monthMap[monthKey];
    if (monthIndex !== undefined) {
      return new Date(Number(labelMatch[3]), monthIndex, Number(labelMatch[1]));
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
};

export const formatSessionParts = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.includes("/")) {
    return [];
  }

  return trimmed
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
};

export const buildMonthScheduleDates = (baseDate: Date = new Date()) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const dayBuckets = dayOrder.map((label) => ({ label, dates: [] as Date[] }));

  for (const cursor = new Date(year, month, 1); cursor.getMonth() === month; cursor.setDate(cursor.getDate() + 1)) {
    const weekdayIndex = (cursor.getDay() + 6) % 7;
    dayBuckets[weekdayIndex].dates.push(new Date(cursor));
  }

  const scheduleDates = dayBuckets.flatMap((bucket) =>
    bucket.dates.map((date) => ({
      date: formatLocalDate(date),
      label: formatScheduleLabel(date),
    }))
  );

  const dayGroups = dayBuckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.dates.length,
  }));

  return {
    scheduleDates,
    dayGroups,
    columnsPerDay: Math.max(...dayGroups.map((group) => group.count), 0),
  };
};

export const buildRollingScheduleDates = (
  daysAhead: number = 30,
  baseDate: Date = new Date()
) => {
  const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Math.max(0, daysAhead));

  const scheduleDates: { date: string; label: string }[] = [];
  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    scheduleDates.push({
      date: formatLocalDate(cursor),
      label: formatScheduleLabel(cursor),
    });
  }

  return {
    scheduleDates,
    dayGroups: [],
    columnsPerDay: 0,
  };
};

export const parseTimeValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(".", ":");
  const parts = normalized.split(":");
  if (parts.length < 2) {
    return null;
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

export const formatTimeHHMM = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  // Excel time-only cells can be read as fractions of a day (for example 0.4166667 => 10:00).
  const numericValue = Number(trimmed.replace(",", "."));
  if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
    if (numericValue >= 0 && numericValue < 24 && !trimmed.includes(":") && !trimmed.includes(".")) {
      return `${String(Math.floor(numericValue)).padStart(2, "0")}:00`;
    }

    if (numericValue >= 0) {
      const dayFraction = numericValue >= 1 ? numericValue - Math.floor(numericValue) : numericValue;
      const minutesInDay = 24 * 60;
      const totalMinutes = Math.round(dayFraction * minutesInDay) % minutesInDay;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const directMatch = trimmed.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (directMatch) {
    const hours = directMatch[1].padStart(2, "0");
    const minutes = directMatch[2];
    return `${hours}:${minutes}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  }

  return trimmed;
};

export const parseRangeFromString = (value: string) => {
  const parts = value.split("-").map((part) => part.trim());
  if (parts.length < 2) {
    return null;
  }
  const start = parseTimeValue(parts[0]);
  const end = parseTimeValue(parts[1]);
  if (start === null || end === null) {
    return null;
  }
  return { start, end };
};

export const normalizeEntryList = (rows: Record<string, unknown>[]) => {
  return rows.reduce<RecordItem[]>((acc, row, index) => {
    const normalizedEntries = Object.entries(row).reduce<Record<string, unknown>>((map, [key, value]) => {
      map[normalizeHeader(key)] = value;
      return map;
    }, {});
    const read = (keys: string[]) => {
      for (const key of keys) {
        const value = normalizedEntries[normalizeHeader(key)];
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }
      return "";
    };

    const cabang = read(["Cabang"]);
    const kelas = read(["Kelas"]);
    const tanggalRaw = read(["Tanggal", "Date"]);
    const mapel = read(["Mapel", "Mata Pelajaran", "Pelajaran"]);
    const pengajar = read(["Pengajar", "Guru", "Pengampu"]);
    const waktu = read(["Waktu", "Jam"]);

    if (!cabang && !kelas && !tanggalRaw && !mapel && !pengajar && !waktu) {
      return acc;
    }

    acc.push({
      id: `appscript-${index}-${Date.now()}`,
      cabang,
      kelas,
      tanggal: tanggalRaw,
      tanggalSheet: tanggalRaw,
      mapel,
      pengajar,
      waktu,
      catatan: "",
    });
    return acc;
  }, []);
};