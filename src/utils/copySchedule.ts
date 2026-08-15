import { formatLocalDate, formatScheduleLabel } from "./schedule";
import type { RecordItem } from "../types/app";

/**
 * Copy jadwal dari bulan tertentu ke bulan berikutnya
 * Menyesuaikan tanggal untuk bulan tujuan
 */
export const copyScheduleToNextMonth = (
  scheduleRecords: RecordItem[],
  sourceMonthKey: string,
  targetMonthKey: string
): RecordItem[] => {
  const [sourceYear, sourceMonth] = sourceMonthKey.split("-").map(Number);
  const [targetYear, targetMonth] = targetMonthKey.split("-").map(Number);

  if (!sourceYear || !sourceMonth || !targetYear || !targetMonth) {
    throw new Error("Format month key tidak valid");
  }

  // Get day of month from schedule dates and map to target month
  const dayMapping: Record<number, number> = {};

  // Get day names untuk bulan sumber dan target
  const sourceDaysByName: Record<string, number[]> = {
    Senin: [],
    Selasa: [],
    Rabu: [],
    Kamis: [],
    Jumat: [],
    Sabtu: [],
    Minggu: [],
  };

  const targetDaysByName: Record<string, number[]> = {
    Senin: [],
    Selasa: [],
    Rabu: [],
    Kamis: [],
    Jumat: [],
    Sabtu: [],
    Minggu: [],
  };

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Collect dates by day name for source month
  for (let day = 1; day <= 31; day++) {
    const date = new Date(sourceYear, sourceMonth - 1, day);
    if (date.getMonth() !== sourceMonth - 1) break;
    const dayName = dayNames[date.getDay()];
    sourceDaysByName[dayName].push(day);
  }

  // Collect dates by day name for target month
  for (let day = 1; day <= 31; day++) {
    const date = new Date(targetYear, targetMonth - 1, day);
    if (date.getMonth() !== targetMonth - 1) break;
    const dayName = dayNames[date.getDay()];
    targetDaysByName[dayName].push(day);
  }

  // Create day mapping (e.g., first Senin of source to first Senin of target)
  for (const dayName of Object.keys(sourceDaysByName)) {
    const sourceDays = sourceDaysByName[dayName];
    const targetDays = targetDaysByName[dayName];

    for (let i = 0; i < sourceDays.length && i < targetDays.length; i++) {
      dayMapping[sourceDays[i]] = targetDays[i];
    }
  }

  // Copy records dengan tanggal yang sudah dipetakan
  const copiedRecords: RecordItem[] = [];
  
  scheduleRecords.forEach((record) => {
    // Extract tanggal field - could be Tanggal (uppercase) or tanggal (lowercase)
    const tanggalStr = (record.Tanggal as string | undefined) || (record.tanggal as string | undefined) || "";
    const [year, month, day] = tanggalStr.split("-").map(Number);

    // Check if this record belongs to the source month
    if (year !== sourceYear || month !== sourceMonth) {
      return; // Skip records not from source month
    }

    // Map the day to target month
    const mappedDay = dayMapping[day];
    if (!mappedDay) {
      return; // Skip if no mapping found
    }

    // Create new record with updated date
    const newDate = new Date(targetYear, targetMonth - 1, mappedDay);
    const newTanggal = formatLocalDate(newDate);
    const newTanggalSheet = formatScheduleLabel(newDate);

    const copiedRecord: RecordItem = {
      ...record,
      id: `${record.id}-copy-${Date.now()}`,
      Tanggal: newTanggal,
      tanggal: newTanggal,
      tanggalSheet: newTanggalSheet,
    };
    
    copiedRecords.push(copiedRecord);
  });

  return copiedRecords;
};

/**
 * Filter jadwal untuk bulan tertentu
 */
export const filterScheduleByMonth = (
  scheduleRecords: RecordItem[],
  monthKey: string
): RecordItem[] => {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) {
    return [];
  }

  return scheduleRecords.filter((record) => {
    // Check both possible field names
    const tanggalStr = (record.Tanggal as string | undefined) || (record.tanggal as string | undefined) || "";
    const [recordYear, recordMonth] = tanggalStr.split("-").map(Number);
    return recordYear === year && recordMonth === month;
  });
};

/**
 * Get month key for next month
 */
export const getNextMonthKey = (currentMonthKey: string): string => {
  const [year, month] = currentMonthKey.split("-").map(Number);

  if (!year || !month) {
    throw new Error("Format month key tidak valid");
  }

  let nextYear = year;
  let nextMonth = month + 1;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};

/**
 * Get previous month key
 */
export const getPreviousMonthKey = (currentMonthKey: string): string => {
  const [year, month] = currentMonthKey.split("-").map(Number);

  if (!year || !month) {
    throw new Error("Format month key tidak valid");
  }

  let prevYear = year;
  let prevMonth = month - 1;

  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
};
