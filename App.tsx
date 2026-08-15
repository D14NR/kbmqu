import { useEffect, useMemo, useState } from "react";
import { categories, initialRecords } from "./config/categories";
import { SidebarMenu } from "./components/layout/SidebarMenu";
import { LoginScreen } from "./components/layout/LoginScreen";
import { ClassModal } from "./components/modals/ClassModal";
import { EditScheduleModal } from "./components/modals/EditScheduleModal";
import { MapelModal } from "./components/modals/MapelModal";
import { PengajarModal, type PengajarDraft } from "./components/modals/PengajarModal";
import { TopToolbar } from "./components/views/TopToolbar";
import { ScheduleTableView } from "./components/views/ScheduleTableView";
import { MonitoringKelasView } from "./components/views/MonitoringKelasView";
import { MapelTableView } from "./components/views/MapelTableView";
import { PengajarTableView } from "./components/views/PengajarTableView";
import { SuratTugasView } from "./components/views/SuratTugasView";
import { PrintJadwalView } from "./components/views/PrintJadwalView";
import { authStorageKey, loginAccounts } from "./config/auth";
import type {
  AuthSession,
  EditingSlot,
  RecordItem,
} from "./types/app";
import {
  appsScriptUrl,
  buildRollingScheduleDates,
  buildMonthScheduleDates,
  formatLocalDate,
  formatScheduleLabel,
  mainSpreadsheetId,
  mapelHeadersExpected,
  mapMapelRecord,
  normalizeHeader,
  parseFlexibleDate,
  parseRangeFromString,
  parseTimeValue,
} from "./utils/schedule";

export function App() {
  const scheduleSheetByKey = {
    bulanIni: "Jadwal Bulan ini",
    jadwalTambahanPelayanan: "Jadwal Khusus",
  } as const;
  type ScheduleMenuKey = keyof typeof scheduleSheetByKey;

  const [activeKey, setActiveKey] = useState(categories[0].key);
  const [records, setRecords] = useState<Record<string, RecordItem[]>>(initialRecords);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [draft, setDraft] = useState({
    mapel: "",
    pengajar: "",
    waktuMulai: "",
    waktuSelesai: "",
  });
  const [query, setQuery] = useState("");
  const [sheetStatus, setSheetStatus] = useState({
    loading: false,
    saving: false,
    error: "",
    lastSync: "",
  });
  const [mapelStatus, setMapelStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [mapelHeaders, setMapelHeaders] = useState<string[]>([]);
  const [mapelRecords, setMapelRecords] = useState<Record<string, string>[]>([]);
  const [pengajarStatus, setPengajarStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [pengajarHeaders, setPengajarHeaders] = useState<string[]>([]);
  const [pengajarRecords, setPengajarRecords] = useState<Record<string, string>[]>([]);
  const [suratTugasStatus, setSuratTugasStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [suratTugasRecords, setSuratTugasRecords] = useState<Record<string, string>[]>([]);
  const [selectedSuratTugasMonthKey, setSelectedSuratTugasMonthKey] = useState("");
  const [selectedSuratTugasKode, setSelectedSuratTugasKode] = useState("");
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classDraft, setClassDraft] = useState({ cabang: "", kelas: "", sekolah: "", jenjang: "" });
  const [isClassEditing, setIsClassEditing] = useState(false);
  const [editingClassGroup, setEditingClassGroup] = useState<{ cabang: string; kelas: string; sekolah?: string } | null>(null);
  const [classError, setClassError] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [gabungEnabled, setGabungEnabled] = useState(false);
  const [gabungClassKey, setGabungClassKey] = useState("");
  const [gabungOptions, setGabungOptions] = useState<{ value: string; label: string }[]>([]);
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [mapelDraft, setMapelDraft] = useState({ Mapel: "", Kode_Mapel: "" });
  const [editingMapelOldName, setEditingMapelOldName] = useState<string | null>(null);
  const [mapelError, setMapelError] = useState("");
  
  const [isPengajarModalOpen, setIsPengajarModalOpen] = useState(false);
  const [pengajarDraft, setPengajarDraft] = useState<PengajarDraft>({
    "Kode Pengajar": "",
    "Nama": "",
    "Bidang Studi": "",
    "Email": "",
    "No.WhatsApp": "",
    "Domisili": "",
    "Username": "",
    "Password": ""
  });
  const [editingPengajarOldKode, setEditingPengajarOldKode] = useState<string | null>(null);
  const [pengajarError, setPengajarError] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    formatLocalDate(new Date()).slice(0, 7)
  );
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const isScheduleMenuKey = (value: string): value is ScheduleMenuKey =>
    value === "bulanIni" || value === "jadwalTambahanPelayanan";
  const activeScheduleKey: ScheduleMenuKey = isScheduleMenuKey(activeKey)
    ? activeKey
    : "bulanIni";
  const isAdmin = normalizeText(authSession?.role || "") === "admin";
  const restrictedCabang = !isAdmin ? (authSession?.cabang || "") : "";

  const mapelOptions = useMemo(() => {
    return mapelRecords.map((record) => ({
      value: record["Kode_Mapel"] || record["Singkatan"] || "",
      label: `${record["Kode_Mapel"] || record["Singkatan"] || ""} - ${record["Mapel"] || record["Mata Pelajaran"] || ""}`
    })).filter(opt => opt.value);
  }, [mapelRecords]);

  const mapelNameByKode = useMemo(() => {
    return mapelRecords.reduce<Record<string, string>>((acc, record) => {
      const kode = (record["Kode_Mapel"] || record["Singkatan"] || "").trim();
      const nama = (record["Mapel"] || record["Mata Pelajaran"] || "").trim();
      if (!kode || !nama) {
        return acc;
      }
      acc[kode.toLowerCase()] = nama;
      return acc;
    }, {});
  }, [mapelRecords]);

  const pengajarOptions = useMemo(() => {
    return pengajarRecords.map((record) => ({
      value: record["Kode Pengajar"] || "",
      label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`
    })).filter(opt => opt.value);
  }, [pengajarRecords]);

  const monthOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentYear, index, 1);
      return {
        value: formatLocalDate(date).slice(0, 7),
        label: date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, []);

  const selectedMonth = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedMonthKey]);

  const selectedSuratTugasMonthDate = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return null;
    }
    const [year, month] = selectedSuratTugasMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedSuratTugasMonthKey]);

  const { scheduleDates: monthScheduleDates, dayGroups: monthDayGroups } = useMemo(
    () => buildMonthScheduleDates(selectedMonth),
    [selectedMonth]
  );

  const { scheduleDates: tambahanScheduleDates, dayGroups: tambahanDayGroups } = useMemo(
    () => buildRollingScheduleDates(30),
    []
  );

  const isJadwalTambahanMenu = activeKey === "jadwalTambahanPelayanan";
  const activeScheduleDates = isJadwalTambahanMenu ? tambahanScheduleDates : monthScheduleDates;
  const activeDayGroups = isJadwalTambahanMenu ? tambahanDayGroups : monthDayGroups;
  const activeDayStartIndexes = useMemo(() => {
    const indexes: number[] = [];
    let offset = 0;
    activeDayGroups.forEach((group) => {
      indexes.push(offset);
      offset += group.count;
    });
    return new Set(indexes);
  }, [activeDayGroups]);

  const suratTugasCalendar = useMemo(() => {
    if (!selectedSuratTugasMonthDate) {
      return { dayRows: [], dateKeys: new Set<string>() };
    }
    const { scheduleDates, dayGroups: suratDayGroups } = buildMonthScheduleDates(selectedSuratTugasMonthDate);
    const dayRows = suratDayGroups.map((group, dayIndex) => {
      const startIndex = dayIndex * group.count;
      return {
        dayLabel: group.label.toUpperCase(),
        dates: scheduleDates.slice(startIndex, startIndex + group.count),
      };
    });
    const dateKeys = new Set(scheduleDates.map((slot) => slot.date));
    return { dayRows, dateKeys };
  }, [selectedSuratTugasMonthDate]);

  const normalizeDateValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    const matchByLabel = monthScheduleDates.find(
      (slot) => slot.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchByLabel) {
      return matchByLabel.date;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }
    return trimmed;
  };

  const getSlotLabelByDate = (date: string) => {
    return monthScheduleDates.find((slot) => slot.date === date)?.label ?? date;
  };

  const formatSheetTanggal = (value: string) => {
    const trimmed = value?.toString().trim();
    if (!trimmed) {
      return "";
    }
    const labelMatch = monthScheduleDates.find(
      (slot) => slot.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (labelMatch) {
      return labelMatch.label;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatScheduleLabel(parsed);
    }
    return trimmed;
  };

  const resolveSheetTanggal = (rawValue: string, normalizedDate: string) => {
    const trimmed = rawValue?.toString().trim();
    if (trimmed) {
      return formatSheetTanggal(trimmed);
    }
    return normalizedDate ? getSlotLabelByDate(normalizedDate) : "";
  };

  const getEntryValue = (entry: Record<string, unknown>, candidates: string[]) => {
    const normalizedEntries = Object.entries(entry).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        acc[normalizeHeader(key)] = value;
        return acc;
      },
      {}
    );
    const match = candidates.find(
      (candidate) => normalizeHeader(candidate) in normalizedEntries
    );
    if (!match) {
      return "";
    }
    const value = normalizedEntries[normalizeHeader(match)];
    return value === undefined || value === null ? "" : String(value);
  };

  const parseAppsScriptRecords = (payload: unknown) => {
    const normalizeObjectRows = (rows: Record<string, unknown>[]) => {
      return rows.reduce<RecordItem[]>((acc, row, index) => {
        const cabang = getEntryValue(row, ["Cabang"]);
        const kelas = getEntryValue(row, ["Kelas"]);
        const sekolah = getEntryValue(row, ["Sekolah"]);
        const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
        const mapel = getEntryValue(row, ["Mapel", "Mata Pelajaran", "Pelajaran"]);
        const pengajar = getEntryValue(row, ["Pengajar", "Guru", "Pengampu"]);
        const jenjang = getEntryValue(row, ["Jenjang Studi", "Jenjang", "jenjang_studi"]);
        const waktuFromWaktu = getEntryValue(row, ["Waktu", "Jam"]);
        const waktuMulai = getEntryValue(row, ["Jam Mulai", "Mulai"]);
        const waktuSelesai = getEntryValue(row, ["Jam Selesai", "Selesai"]);
        const waktu = waktuFromWaktu || [waktuMulai, waktuSelesai].filter(Boolean).join("-");
        const tanggal = normalizeDateValue(tanggalRaw);
        const tanggalSheet = resolveSheetTanggal(tanggalRaw, tanggal);

        if (!cabang && !kelas && !sekolah && !tanggal && !mapel && !pengajar && !waktu) {
          return acc;
        }

        acc.push({
          id: `appscript-${index}-${Date.now()}`,
          cabang,
          kelas,
          jenjang,
          sekolah,
          tanggal,
          tanggalSheet,
          mapel,
          pengajar,
          waktu,
          catatan: "",
        });

        return acc;
      }, []);
    };

    const normalizeMatrixRows = (rows: unknown[][]) => {
      const headerRow = rows[0]?.map((value) => String(value ?? "")) ?? [];
      const normalizedHeaders = headerRow.map(normalizeHeader);
      const hasTanggalColumn = normalizedHeaders.includes("tanggal");
      if (hasTanggalColumn) {
        const mappedRows = rows.slice(1).map((row) => {
          const result: Record<string, unknown> = {};
          headerRow.forEach((header, index) => {
            result[header] = row?.[index];
          });
          return result;
        });
        return normalizeObjectRows(mappedRows);
      }

      const dateColumns = headerRow.slice(2).map((value) => value.trim());
      const entries: RecordItem[] = [];
      let rowIndex = 1;
      while (rowIndex < rows.length) {
        const mapelRow = rows[rowIndex] ?? [];
        const cabang = String(mapelRow[0] ?? "").trim();
        const kelas = String(mapelRow[1] ?? "").trim();
        if (!cabang && !kelas) {
          rowIndex += 1;
          continue;
        }
        const pengajarRow = rows[rowIndex + 1] ?? [];
        const waktuRow = rows[rowIndex + 2] ?? [];

        dateColumns.forEach((label, index) => {
          const columnIndex = index + 2;
          const mapel = String(mapelRow[columnIndex] ?? "").trim();
          const pengajar = String(pengajarRow[columnIndex] ?? "").trim();
          const waktu = String(waktuRow[columnIndex] ?? "").trim();
          if (!label || (!mapel && !pengajar && !waktu)) {
            return;
          }
          const tanggal = normalizeDateValue(label);
          entries.push({
            id: `appscript-matrix-${rowIndex}-${columnIndex}-${Date.now()}`,
            cabang,
            kelas,
            sekolah: "",
            jenjang: "",
            tanggal,
            tanggalSheet: resolveSheetTanggal(label, tanggal),
            mapel,
            pengajar,
            waktu,
            catatan: "",
          });
        });

        rowIndex += 3;
      }
      return entries;
    };

    if (payload && typeof payload === "object") {
      const recordPayload = payload as {
        success?: boolean;
        message?: string;
        data?: Record<string, unknown>[];
        records?: Record<string, unknown>[];
        values?: unknown[][];
      };
      if (recordPayload.success === false) {
        throw new Error(recordPayload.message || "Gagal memuat data dari Apps Script.");
      }
      if (Array.isArray(recordPayload.data)) {
        return normalizeObjectRows(recordPayload.data);
      }
      if (Array.isArray(recordPayload.records)) {
        return normalizeObjectRows(recordPayload.records);
      }
      if (Array.isArray(recordPayload.values)) {
        return normalizeMatrixRows(recordPayload.values);
      }
    }

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return [];
      }
      if (typeof payload[0] === "object" && !Array.isArray(payload[0])) {
        return normalizeObjectRows(payload as Record<string, unknown>[]);
      }
      if (Array.isArray(payload[0])) {
        return normalizeMatrixRows(payload as unknown[][]);
      }
    }

    return [];
  };

  const parseGenericSheet = (payload: unknown) => {
    if (payload && typeof payload === "object") {
      const recordPayload = payload as {
        success?: boolean;
        message?: string;
        data?: Record<string, unknown>[];
        records?: Record<string, unknown>[];
        values?: unknown[][];
        headers?: string[];
      };
      if (recordPayload.success === false) {
        throw new Error(recordPayload.message || "Gagal memuat data dari Apps Script.");
      }
      if (Array.isArray(recordPayload.data) || Array.isArray(recordPayload.records)) {
        const rows = (recordPayload.data || recordPayload.records || []) as Record<string, unknown>[];
        const headers =
          recordPayload.headers && recordPayload.headers.length > 0
            ? recordPayload.headers
            : Object.keys(rows[0] || {});
        const records = rows.map((row) => {
          const normalized: Record<string, string> = {};
          headers.forEach((header) => {
            const value = row[header];
            normalized[header] = value === undefined || value === null ? "" : String(value);
          });
          return normalized;
        });
        return { headers, records };
      }
      if (Array.isArray(recordPayload.values)) {
        const headerRow = recordPayload.values[0]?.map((value) => String(value ?? "")) ?? [];
        const records = recordPayload.values.slice(1).map((row) => {
          const normalized: Record<string, string> = {};
          headerRow.forEach((header, index) => {
            normalized[header] = row?.[index] === undefined ? "" : String(row?.[index] ?? "");
          });
          return normalized;
        });
        return { headers: headerRow, records };
      }
    }

    if (Array.isArray(payload) && payload.length > 0 && Array.isArray(payload[0])) {
      const headerRow = (payload[0] as unknown[]).map((value) => String(value ?? ""));
      const records = (payload as unknown[][]).slice(1).map((row) => {
        const normalized: Record<string, string> = {};
        headerRow.forEach((header, index) => {
          normalized[header] = row?.[index] === undefined ? "" : String(row?.[index] ?? "");
        });
        return normalized;
      });
      return { headers: headerRow, records };
    }

    return { headers: [], records: [] };
  };

  const activeConfig = useMemo(
    () => categories.find((category) => category.key === activeKey) ?? categories[0],
    [activeKey]
  );


  const hasScheduleContent = (entry?: RecordItem) =>
    Boolean(entry && ((entry.mapel || "").trim() || (entry.pengajar || "").trim() || (entry.waktu || "").trim()));

  const monthScheduleGroups = useMemo(() => {
    const sourceRecords = records[activeScheduleKey] ?? [];
    const entries =
      restrictedCabang
        ? sourceRecords.filter(
            (entry) => normalizeText(entry.cabang || "") === normalizeText(restrictedCabang)
          )
        : sourceRecords;
    const grouped = new Map<
      string,
      { cabang: string; kelas: string; sekolah: string; entriesByDate: Record<string, RecordItem[]> }
    >();

    entries.forEach((entry) => {
      const cabang = entry.cabang || "-";
      const kelas = entry.kelas || "-";
      const sekolah = entry.sekolah || "";
      const key = `${cabang}||${kelas}||${sekolah}`;
      if (!grouped.has(key)) {
        grouped.set(key, { cabang, kelas, sekolah, entriesByDate: {} });
      }
      if (!hasScheduleContent(entry)) {
        return;
      }
      const existingEntries = grouped.get(key)!.entriesByDate[entry.tanggal] ?? [];
      grouped.get(key)!.entriesByDate[entry.tanggal] = [...existingEntries, entry];
    });

    grouped.forEach((group) => {
      Object.keys(group.entriesByDate).forEach((dateKey) => {
        group.entriesByDate[dateKey] = [...group.entriesByDate[dateKey]].sort((a, b) => {
          const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        });
      });
    });

    const groups = Array.from(grouped.values());
    if (!query.trim()) {
      return groups;
    }
    const lowered = query.toLowerCase();
    return groups.filter((group) => {
      if (
        group.cabang.toLowerCase().includes(lowered) ||
        group.kelas.toLowerCase().includes(lowered) ||
        group.sekolah.toLowerCase().includes(lowered)
      ) {
        return true;
      }
      return Object.values(group.entriesByDate).some((entryList) =>
        entryList.some((entry) =>
          ["mapel", "pengajar", "waktu", "tanggal"].some((key) =>
            entry[key]?.toLowerCase().includes(lowered)
          )
        )
      );
    });
  }, [activeScheduleKey, query, records, restrictedCabang]);

  const tambahanPrintGroups = useMemo(() => {
    const sourceRecords = records.jadwalTambahanPelayanan ?? [];
    const entries =
      restrictedCabang
        ? sourceRecords.filter(
            (entry) => normalizeText(entry.cabang || "") === normalizeText(restrictedCabang)
          )
        : sourceRecords;

    const grouped = new Map<
      string,
      { cabang: string; kelas: string; sekolah: string; entriesByDate: Record<string, RecordItem[]> }
    >();

    entries.forEach((entry) => {
      const cabang = entry.cabang || "-";
      const kelas = entry.kelas || "-";
      const sekolah = entry.sekolah || "";
      const key = `${cabang}||${kelas}||${sekolah}`;
      if (!grouped.has(key)) {
        grouped.set(key, { cabang, kelas, sekolah, entriesByDate: {} });
      }
      if (!hasScheduleContent(entry)) {
        return;
      }
      const existingEntries = grouped.get(key)!.entriesByDate[entry.tanggal] ?? [];
      grouped.get(key)!.entriesByDate[entry.tanggal] = [...existingEntries, entry];
    });

    grouped.forEach((group) => {
      Object.keys(group.entriesByDate).forEach((dateKey) => {
        group.entriesByDate[dateKey] = [...group.entriesByDate[dateKey]].sort((a, b) => {
          const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        });
      });
    });

    return Array.from(grouped.values());
  }, [records.jadwalTambahanPelayanan, restrictedCabang]);

  const allScheduleEntries = useMemo(
    () => [
      ...(records.bulanIni ?? []),
      ...(records.jadwalTambahanPelayanan ?? []),
    ],
    [records]
  );

  const monitoringRows = useMemo(() => {
    const allowedDates = new Set(monthScheduleDates.map((slot) => slot.date));
    return monthScheduleGroups.map((group) => {
      const mapelCounter = new Map<string, number>();
      let totalSesi = 0;

      Object.entries(group.entriesByDate).forEach(([dateKey, entries]) => {
        if (!allowedDates.has(dateKey)) {
          return;
        }
        entries.forEach((entry) => {
          const mapel = (entry.mapel || "").trim();
          if (!mapel) {
            return;
          }
          totalSesi += 1;
          mapelCounter.set(mapel, (mapelCounter.get(mapel) || 0) + 1);
        });
      });

      const mapelList = Array.from(mapelCounter.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mapel, count]) => `${mapel} (${count}x)`);

      return {
        cabang: group.cabang,
        kelas: group.kelas,
        mapelList,
        jumlahMapel: mapelCounter.size,
        totalSesi,
      };
    });
  }, [monthScheduleDates, monthScheduleGroups]);

  const filteredMapelRecords = useMemo(() => {
    if (!query.trim()) {
      return mapelRecords;
    }
    const lowered = query.toLowerCase();
    return mapelRecords.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [mapelRecords, query]);

  const suratTugasRecordsByMonth = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return [];
    }
    const allowedDateKeys = suratTugasCalendar.dateKeys;
    return suratTugasRecords.filter(
      (record) => {
        const parsed = parseFlexibleDate(record["Tanggal"] || "");
        if (!parsed) {
          return false;
        }
        return allowedDateKeys.has(formatLocalDate(parsed));
      }
    );
  }, [selectedSuratTugasMonthKey, suratTugasCalendar.dateKeys, suratTugasRecords]);

  const suratTugasPengajarOptions = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return [];
    }

    const optionMap = new Map<string, { value: string; label: string }>();
    const optionKeyMap = new Map<string, string>();

    pengajarRecords.forEach((record) => {
      const kode = (record["Kode Pengajar"] || "").trim();
      const nama = (record["Nama"] || "").trim();
      if (!kode) {
        return;
      }
      const key = kode.toLowerCase();
      optionKeyMap.set(key, kode);
      optionMap.set(kode, {
        value: kode,
        label: nama ? `${nama} (${kode})` : kode,
      });
    });

    suratTugasRecordsByMonth.forEach((record) => {
      const kode = (record["Kode Pengajar"] || "").trim();
      const key = kode.toLowerCase();
      if (!kode || optionKeyMap.has(key)) {
        return;
      }
      optionKeyMap.set(key, kode);
      optionMap.set(kode, { value: kode, label: kode });
    });

    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [pengajarRecords, selectedSuratTugasMonthKey, suratTugasRecordsByMonth]);

  const filteredSuratTugasRecords = useMemo(() => {
    return suratTugasRecordsByMonth.filter((record) => {
      const selectedKode = selectedSuratTugasKode.trim().toLowerCase();
      const currentKode = (record["Kode Pengajar"] || "").trim().toLowerCase();
      const matchPengajar =
        !selectedKode || currentKode === selectedKode;
      if (!matchPengajar) {
        return false;
      }
      return true;
    });
  }, [selectedSuratTugasKode, suratTugasRecordsByMonth]);

  const suratTugasRecordsByDate = useMemo(() => {
    const grouped = new Map<string, Record<string, string>[]>();
    filteredSuratTugasRecords.forEach((record) => {
      const parsed = parseFlexibleDate(record["Tanggal"] || "");
      if (!parsed) {
        return;
      }
      const dateKey = formatLocalDate(parsed);
      const list = grouped.get(dateKey) ?? [];
      list.push(record);
      grouped.set(dateKey, list);
    });
    return grouped;
  }, [filteredSuratTugasRecords]);

  const selectedSuratTugasPengajar = useMemo(() => {
    if (!selectedSuratTugasKode) {
      return null;
    }
    const selectedKode = selectedSuratTugasKode.trim().toLowerCase();
    return (
      pengajarRecords.find(
        (record) => (record["Kode Pengajar"] || "").trim().toLowerCase() === selectedKode
      ) ||
      null
    );
  }, [pengajarRecords, selectedSuratTugasKode]);

  const selectedSuratTugasSessionCount = useMemo(() => {
    if (!selectedSuratTugasKode) {
      return 0;
    }
    return filteredSuratTugasRecords.reduce((total, record) => {
      let rowCount = 0;
      for (let index = 1; index <= 10; index += 1) {
        if ((record[`Sesi ${index}`] || "").trim()) {
          rowCount += 1;
        }
      }
      return total + rowCount;
    }, 0);
  }, [filteredSuratTugasRecords, selectedSuratTugasKode]);

  const clearEditing = () => {
    setEditingSlot(null);
    setDraft({ mapel: "", pengajar: "", waktuMulai: "", waktuSelesai: "" });
    setConflictError("");
    setGabungEnabled(false);
    setGabungClassKey("");
    setGabungOptions([]);
  };

  const handleLoadFromSheet = async (scheduleKey: ScheduleMenuKey = "bulanIni") => {
    setSheetStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const targetSheet = scheduleSheetByKey[scheduleKey];
      const response = await fetch(
        `${appsScriptUrl}?sheet=${encodeURIComponent(targetSheet)}&spreadsheetId=${encodeURIComponent(mainSpreadsheetId)}`
      );
      if (!response.ok) {
        throw new Error("Gagal memuat Apps Script.");
      }
      const payload = await response.json();
      const parsedRecords = parseAppsScriptRecords(payload);
      setRecords((prev) => ({
        ...prev,
        [scheduleKey]: parsedRecords,
      }));
      clearEditing();
      setQuery("");
      setSheetStatus({
        loading: false,
        saving: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setSheetStatus((prev) => ({
        ...prev,
        loading: false,
        saving: false,
        error: "Gagal memuat data dari Apps Script. Periksa hak akses atau format kolom.",
      }));
    }
  };

  const handleLoadMapel = async () => {
    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const response = await fetch(
        `${appsScriptUrl}?sheet=${encodeURIComponent("Mata Pelajaran")}&spreadsheetId=${encodeURIComponent(mainSpreadsheetId)}`
      );
      if (!response.ok) {
        throw new Error("Gagal memuat Apps Script.");
      }
      const payload = await response.json();
      const { records: parsed } = parseGenericSheet(payload);
      const normalized = parsed.map((row) => mapMapelRecord(row));
      setMapelHeaders(mapelHeadersExpected);
      setMapelRecords(normalized);
      setMapelStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data mata pelajaran dari Apps Script.",
      }));
    }
  };

  const handleOpenMapelModal = (record?: Record<string, string>) => {
    if (record) {
      setMapelDraft({ Mapel: record.Mapel || "", Kode_Mapel: record.Kode_Mapel || "" });
      setEditingMapelOldName(record.Mapel || "");
    } else {
      setMapelDraft({ Mapel: "", Kode_Mapel: "" });
      setEditingMapelOldName(null);
    }
    setMapelError("");
    setIsMapelModalOpen(true);
  };

  const handleSaveMapel = async () => {
    const mapel = mapelDraft.Mapel.trim();
    const kode = mapelDraft.Kode_Mapel.trim();
    if (!mapel || !kode) {
      setMapelError("Mata Pelajaran dan Singkatan wajib diisi.");
      return;
    }

    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const payload = {
        action: "saveMapel",
        sheetName: "Mata Pelajaran",
        oldMapel: editingMapelOldName,
        record: {
          Mapel: mapel,
          Kode_Mapel: kode
        }
      };

      await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      });

      setIsMapelModalOpen(false);
      handleLoadMapel();
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan mata pelajaran."
      }));
    }
  };

  const handleDeleteMapel = async (record: Record<string, string>) => {
    if (!window.confirm(`Hapus mata pelajaran ${record.Mapel}?`)) return;
    
    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const payload = {
        action: "deleteMapel",
        sheetName: "Mata Pelajaran",
        record: {
          Mapel: record.Mapel
        }
      };

      await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      });

      handleLoadMapel();
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menghapus mata pelajaran."
      }));
    }
  };

  const handleLoadPengajar = async () => {
    setPengajarStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const targetUrl = `${appsScriptUrl}?sheet=${encodeURIComponent("Data Pengajar")}&spreadsheetId=${encodeURIComponent(mainSpreadsheetId)}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error("Gagal memuat data pengajar.");
      }
      const data = await response.json();
      const parsed = parseGenericSheet(data);
      
      const expectedHeaders = ["Kode Pengajar", "Nama", "Bidang Studi", "Email", "No.WhatsApp", "Domisili", "Username", "Password"];
      
      const records = parsed.records.filter((rec) => rec["Kode Pengajar"] || rec["Nama"]).map((record) => {
        const normalized: Record<string, string> = {};
        expectedHeaders.forEach((h) => {
          const matchedKey = Object.keys(record).find(k => normalizeHeader(k) === normalizeHeader(h));
          normalized[h] = matchedKey ? record[matchedKey] : "";
        });
        return normalized;
      });

      setPengajarHeaders(expectedHeaders);
      setPengajarRecords(records);
      setPengajarStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal memuat data pengajar.",
      }));
    }
  };

  const handleOpenPengajarModal = (record?: Record<string, string>) => {
    if (record) {
      setPengajarDraft({
        "Kode Pengajar": record["Kode Pengajar"] || "",
        "Nama": record["Nama"] || "",
        "Bidang Studi": record["Bidang Studi"] || "",
        "Email": record["Email"] || "",
        "No.WhatsApp": record["No.WhatsApp"] || "",
        "Domisili": record["Domisili"] || "",
        "Username": record["Username"] || "",
        "Password": record["Password"] || "",
      });
      setEditingPengajarOldKode(record["Kode Pengajar"]);
    } else {
      setPengajarDraft({
        "Kode Pengajar": "",
        "Nama": "",
        "Bidang Studi": "",
        "Email": "",
        "No.WhatsApp": "",
        "Domisili": "",
        "Username": "",
        "Password": ""
      });
      setEditingPengajarOldKode(null);
    }
    setPengajarError("");
    setIsPengajarModalOpen(true);
  };

  const handleLoadSuratTugas = async () => {
    setSuratTugasStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const targetUrl = `${appsScriptUrl}?sheet=${encodeURIComponent("Surat Tugas Pengajar")}&spreadsheetId=${encodeURIComponent(mainSpreadsheetId)}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error("Gagal memuat Surat Tugas Mengajar.");
      }
      const data = await response.json();
      const parsed = parseGenericSheet(data);
      
      const expectedHeaders = ["Kode Pengajar", "Tanggal", "Sesi 1", "Sesi 2", "Sesi 3", "Sesi 4", "Sesi 5", "Sesi 6", "Sesi 7", "Sesi 8", "Sesi 9", "Sesi 10"];

      const records = parsed.records.filter((rec) => rec["Kode Pengajar"] || rec["Tanggal"]).map((record) => {
        const normalized: Record<string, string> = {};
        expectedHeaders.forEach((h) => {
          const matchedKey = Object.keys(record).find(k => normalizeHeader(k) === normalizeHeader(h));
          normalized[h] = matchedKey ? record[matchedKey] : "";
        });
        return normalized;
      });

      setSuratTugasRecords(records);
      setSuratTugasStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setSuratTugasStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data Surat Tugas.",
      }));
    }
  };

  const handleSavePengajar = async () => {
    if (!pengajarDraft["Kode Pengajar"] || !pengajarDraft["Nama"]) {
      setPengajarError("Kode Pengajar dan Nama wajib diisi.");
      return;
    }
    setPengajarStatus((prev) => ({ ...prev, loading: true }));
    try {
      const payload = {
        action: "savePengajar",
        sheetName: "Data Pengajar",
        spreadsheetId: mainSpreadsheetId,
        oldKode: editingPengajarOldKode,
        record: pengajarDraft,
      };

      await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setIsPengajarModalOpen(false);
      handleLoadPengajar();
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan pengajar.",
      }));
    }
  };

  const handleDeletePengajar = async (record: Record<string, string>) => {
    if (!window.confirm(`Hapus pengajar ${record["Nama"]}?`)) return;
    
    setPengajarStatus((prev) => ({ ...prev, loading: true }));
    try {
      const payload = {
        action: "deletePengajar",
        sheetName: "Data Pengajar",
        spreadsheetId: mainSpreadsheetId,
        record: record,
      };

      await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      handleLoadPengajar();
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menghapus pengajar.",
      }));
    }
  };

  const handleLogin = () => {
    const username = loginUsername.trim();
    const password = loginPassword;
    const matched = loginAccounts.find(
      (account) => account.username === username && account.password === password
    );

    if (!matched) {
      setLoginError("Username atau password tidak sesuai.");
      return;
    }

    const nextSession: AuthSession = {
      username: matched.username,
      role: matched.role,
      cabang: matched.cabang,
    };

    localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setAuthSession(nextSession);
    setLoginError("");
    setLoginPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem(authStorageKey);
    setAuthSession(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  };

  useEffect(() => {
    const storedSession = localStorage.getItem(authStorageKey);
    if (!storedSession) {
      return;
    }

    try {
      const parsed = JSON.parse(storedSession) as AuthSession;
      const matched = loginAccounts.find((account) => account.username === parsed.username);
      if (!matched) {
        localStorage.removeItem(authStorageKey);
        return;
      }

      setAuthSession({
        username: matched.username,
        role: matched.role,
        cabang: matched.cabang,
      });
    } catch (error) {
      localStorage.removeItem(authStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    handleLoadFromSheet("bulanIni");
    handleLoadFromSheet("jadwalTambahanPelayanan");
    handleLoadMapel();
    handleLoadPengajar();
    handleLoadSuratTugas();
  }, [authSession]);

  const handleDraftChange = (
    fieldKey: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai",
    value: string,
  ) => {
    setDraft((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleOpenClassModal = () => {
    setClassDraft({ cabang: restrictedCabang || "", kelas: "", sekolah: "", jenjang: "" });
    setIsClassEditing(false);
    setEditingClassGroup(null);
    setClassError("");
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (group: { cabang: string; kelas: string; sekolah: string; entriesByDate?: Record<string, RecordItem[]> }) => {
    const anyEntry = Object.values(group.entriesByDate || {}).flat()[0] as RecordItem | undefined;
    const jenjang = anyEntry?.jenjang || "";
    setClassDraft({ cabang: group.cabang || "", kelas: group.kelas || "", sekolah: group.sekolah || "", jenjang });
    setIsClassEditing(true);
    setEditingClassGroup({ cabang: group.cabang, kelas: group.kelas, sekolah: group.sekolah });
    setClassError("");
    setIsClassModalOpen(true);
  };

  const handleClassDraftChange = (key: "cabang" | "kelas" | "sekolah" | "jenjang", value: string) => {
    if (key === "cabang" && restrictedCabang) {
      return;
    }
    setClassDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveNewClass = async () => {
    const cabang = restrictedCabang || classDraft.cabang.trim();
    const kelas = classDraft.kelas.trim();
    const sekolah = classDraft.sekolah.trim();
    const jenjang = (classDraft.jenjang || "").trim();
    const shouldRequireSekolah = activeScheduleKey === "jadwalTambahanPelayanan";
    if (!cabang || !kelas || (shouldRequireSekolah && !sekolah)) {
      setClassError(
        shouldRequireSekolah
          ? "Cabang, Kelas, dan Sekolah wajib diisi."
          : "Cabang dan Kelas wajib diisi."
      );
      return;
    }

    if (isClassEditing && editingClassGroup) {
      const success = await handleInlineSaveClass(editingClassGroup, kelas, sekolah);
      if (success) {
        setIsClassModalOpen(false);
        setIsClassEditing(false);
        setEditingClassGroup(null);
        setClassDraft({ cabang: "", kelas: "", sekolah: "", jenjang: "" });
        setClassError("");
      }
      return;
    }
    const existing = (records[activeScheduleKey] ?? []).some(
      (item) =>
        item.cabang === cabang &&
        item.kelas === kelas &&
        (shouldRequireSekolah ? (item.sekolah || "") === sekolah : true)
    );
    if (existing) {
      setClassError("Kelas tersebut sudah ada di jadwal.");
      return;
    }
    const firstSlot = activeScheduleDates[0];
    if (!firstSlot) {
      setClassError("Tanggal jadwal belum tersedia.");
      return;
    }
    const sheetRecord = buildSheetRecord(cabang, kelas, firstSlot.label, "", "", "", jenjang, sekolah);
    const newItem: RecordItem = {
      id: `kelas-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      cabang,
      kelas,
      sekolah,
      jenjang,
      tanggal: firstSlot.date,
      tanggalSheet: sheetRecord.Tanggal,
      mapel: "",
      pengajar: "",
      waktu: "",
      catatan: "",
    };
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: [...(prev[activeScheduleKey] ?? []), newItem],
    }));
    setIsClassModalOpen(false);
    setClassDraft({ cabang: "", kelas: "", sekolah: "", jenjang: "" });
    setClassError("");
    await persistRecordToSheet(sheetRecord);
  };

  const handleDeleteClass = async (group: {
    cabang: string;
    kelas: string;
    sekolah: string;
    entriesByDate: Record<string, RecordItem[]>;
  }) => {
    const confirmation = window.confirm(
      `Hapus seluruh jadwal untuk ${group.kelas} (${group.cabang})? Tindakan ini akan menghapus semua data terkait di Surat Tugas Pengajar.`
    );
    if (!confirmation) {
      return;
    }
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).filter(
        (item) =>
          item.cabang !== group.cabang ||
          item.kelas !== group.kelas ||
          (item.sekolah || "") !== (group.sekolah || "")
      ),
    }));
    if (
      editingSlot &&
      editingSlot.cabang === group.cabang &&
      editingSlot.kelas === group.kelas &&
      (editingSlot.sekolah || "") === (group.sekolah || "")
    ) {
      clearEditing();
    }
    await postToSheet({
      action: "deleteClass",
      cabang: group.cabang,
      kelas: group.kelas,
      sekolah: group.sekolah || "",
    });
  };

  const buildSheetRecord = (
    cabang: string,
    kelas: string,
    tanggalSheet: string,
    mapel: string,
    pengajar: string,
    waktu: string,
    jenjang = "",
    sekolah = ""
  ) => ({
    Cabang: cabang,
    Kelas: kelas,
    ...(jenjang ? { "Jenjang Studi": jenjang } : {}),
    ...(sekolah ? { Sekolah: sekolah } : {}),
    Tanggal: formatSheetTanggal(tanggalSheet),
    Mapel: mapel,
    Pengajar: pengajar,
    Waktu: waktu,
  });

  const postToSheet = async (
    payload: Record<string, unknown>,
    scheduleKey: ScheduleMenuKey = activeScheduleKey
  ) => {
    setSheetStatus((prev) => ({ ...prev, saving: true, error: "" }));
    const payloadWithSpreadsheet = {
      spreadsheetId: mainSpreadsheetId,
      sheetName: scheduleSheetByKey[scheduleKey],
      ...payload,
    };

    const attemptJsonRequest = async () => {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        body: JSON.stringify(payloadWithSpreadsheet),
      });

      const text = await response.text();
      let parsed: { success?: boolean; message?: string } | null = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (jsonError) {
        parsed = null;
      }

      if (!response.ok) {
        throw new Error(parsed?.message || text || "Gagal menyimpan data.");
      }
      if (parsed && parsed.success === false) {
        throw new Error(parsed.message || "Gagal menyimpan data.");
      }
      return true;
    };

    const finalizeSuccess = () => {
      setSheetStatus((prev) => ({
        ...prev,
        saving: false,
        lastSync: new Date().toLocaleString("id-ID"),
      }));
      // Keep Surat Tugas view in sync right after any jadwal save/delete.
      handleLoadSuratTugas();
      return true;
    };

    try {
      await attemptJsonRequest();
      return finalizeSuccess();
    } catch (error) {
      try {
        await fetch(appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify(payloadWithSpreadsheet),
        });
        return finalizeSuccess();
      } catch (fallbackError) {
        setSheetStatus((prev) => ({
          ...prev,
          saving: false,
          error:
            "Gagal menyimpan ke Google Sheet. Pastikan Apps Script sudah dipublikasikan dan akses publik diizinkan.",
        }));
        return false;
      }
    }
  };

  const persistRecordToSheet = async (record: Record<string, string>) => {
    return postToSheet({ action: "upsert", record }, activeScheduleKey);
  };

  const handleSelectBulanIniSlot = (
    group: { cabang: string; kelas: string; sekolah: string; entriesByDate: Record<string, RecordItem[]> },
    slot: { date: string; label: string },
    entry?: RecordItem
  ) => {
    const targetEntry = entry;
    if (
      editingSlot &&
      editingSlot.cabang === group.cabang &&
      editingSlot.kelas === group.kelas &&
      (editingSlot.sekolah || "") === (group.sekolah || "") &&
      editingSlot.tanggal === slot.date &&
      editingSlot.entryId === targetEntry?.id
    ) {
      return;
    }
    const waktuParts = targetEntry?.waktu ? targetEntry.waktu.split("-").map((part) => part.trim()) : [];
    setEditingSlot({
      cabang: group.cabang,
      kelas: group.kelas,
      sekolah: group.sekolah || "",
      tanggal: slot.date,
      tanggalSheet: targetEntry?.tanggalSheet || slot.label,
      entryId: targetEntry?.id,
    });
    setDraft({
      mapel: targetEntry?.mapel ?? "",
      pengajar: targetEntry?.pengajar ?? "",
      waktuMulai: waktuParts[0] ?? "",
      waktuSelesai: waktuParts[1] ?? "",
    });
    setConflictError("");
    // prepare gabung options (classes from same cabang)
    const options = monthScheduleGroups
      .filter((g) => (g.cabang || "") === group.cabang)
      .map((g) => ({
        value: `${g.cabang}||${g.kelas}||${g.sekolah || ""}`,
        label: `${g.kelas}${g.sekolah ? ` • ${g.sekolah}` : ""}`,
      }));
    setGabungOptions(options);
    setGabungEnabled(false);
    setGabungClassKey("");
  };

  const handleSaveSlot = async () => {
    if (!editingSlot) {
      return;
    }
    const { cabang, kelas, sekolah, tanggal, tanggalSheet, entryId } = editingSlot;
    const sekolahValue = sekolah || "";
    const waktuMulai = draft.waktuMulai.trim();
    const waktuSelesai = draft.waktuSelesai.trim();
    const waktuValue = [waktuMulai, waktuSelesai].filter(Boolean).join("-");
    const nextValues = {
      mapel: draft.mapel.trim(),
      pengajar: draft.pengajar.trim(),
      waktu: waktuValue,
    };

    setConflictError("");
    const pengajarKey = nextValues.pengajar.toLowerCase();
    const startTime = parseTimeValue(waktuMulai);
    const endTime = parseTimeValue(waktuSelesai);
    if (nextValues.pengajar && startTime !== null && endTime !== null) {
      if (startTime >= endTime) {
        setConflictError("Jam mulai harus lebih awal daripada jam selesai.");
        return;
      }
      const otherEntries = allScheduleEntries.filter((item) => {
        if (item.id === entryId) return false;
        if (item.tanggal !== tanggal) return false;
        if ((item.pengajar || "").toLowerCase() !== pengajarKey) return false;
        // if gabung enabled and selected class matches this entry, ignore it for conflict checks
        if (gabungEnabled && gabungClassKey) {
          const itemKey = `${item.cabang}||${item.kelas}||${item.sekolah || ""}`;
          if (itemKey === gabungClassKey) return false;
        }
        return true;
      });
      for (const entry of otherEntries) {
        if (!entry.waktu) {
          continue;
        }
        const range = parseRangeFromString(entry.waktu);
        if (!range) {
          continue;
        }
        const overlap = startTime < range.end && endTime > range.start;
        if (overlap) {
          const tanggalLabel = getSlotLabelByDate(entry.tanggal ?? tanggal);
          const cabangLabel = entry.cabang || "Cabang tidak diketahui";
          const kelasLabel = entry.kelas || "Kelas tidak diketahui";
          const waktuLabel = entry.waktu || "jam tidak diketahui";
          setConflictError(
            `Pengajar sudah mengajar di ${cabangLabel} (${kelasLabel}) pada ${tanggalLabel} pukul ${waktuLabel}.`
          );
          return;
        }
        if (entry.cabang !== cabang) {
          const hasGap = startTime >= range.end + 60 || range.start >= endTime + 60;
          if (!hasGap) {
            const tanggalLabel = getSlotLabelByDate(entry.tanggal ?? tanggal);
            const cabangLabel = entry.cabang || "Cabang tidak diketahui";
            const kelasLabel = entry.kelas || "Kelas tidak diketahui";
            const waktuLabel = entry.waktu || "jam tidak diketahui";
            setConflictError(
              `Pengajar sudah mengajar di ${cabangLabel} (${kelasLabel}) pada ${tanggalLabel} pukul ${waktuLabel}. Antar cabang wajib jeda minimal 1 jam.`
            );
            return;
          }
        }
      }
    }

    const existingEntry = entryId
      ? (records[activeScheduleKey] ?? []).find((item) => item.id === entryId)
      : undefined;

    const sheetRecord = buildSheetRecord(
      cabang,
      kelas,
      resolveSheetTanggal(tanggalSheet, tanggal),
      nextValues.mapel,
      nextValues.pengajar,
      nextValues.waktu,
      (nextValues as any).jenjang || "",
      sekolahValue
    );

    const oldSheetRecord = existingEntry
      ? buildSheetRecord(
          existingEntry.cabang || cabang,
          existingEntry.kelas || kelas,
          resolveSheetTanggal(existingEntry.tanggalSheet || existingEntry.tanggal || tanggalSheet, existingEntry.tanggal || tanggal),
          existingEntry.mapel || "",
          existingEntry.pengajar || "",
          existingEntry.waktu || "",
          existingEntry.jenjang || "",
          existingEntry.sekolah || sekolahValue
        )
      : null;

    setRecords((prev) => {
      const current = prev[activeScheduleKey] ?? [];
      if (entryId) {
        return {
          ...prev,
          [activeScheduleKey]: current.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  ...nextValues,
                  cabang,
                  kelas,
                  sekolah: sekolahValue,
                  tanggal,
                  tanggalSheet: sheetRecord.Tanggal,
                }
              : item
          ),
        };
      }
      if (!nextValues.mapel && !nextValues.pengajar && !nextValues.waktu) {
        return prev;
      }
      const newItem: RecordItem = {
        id: `${activeScheduleKey}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        cabang,
        kelas,
        sekolah: sekolahValue,
        tanggal,
        tanggalSheet: sheetRecord.Tanggal,
        ...nextValues,
        catatan: "",
      };
      return {
        ...prev,
        [activeScheduleKey]: [...current, newItem],
      };
    });
    clearEditing();
    if (entryId) {
      await postToSheet({ action: "upsert", record: sheetRecord, oldRecord: oldSheetRecord });
      return;
    }
    await postToSheet({ action: "append", record: sheetRecord });
  };

  const handleDeleteSlot = async () => {
    if (!editingSlot) {
      return;
    }
    if (!editingSlot.entryId) {
      clearEditing();
      return;
    }
    const existingEntry = (records[activeScheduleKey] ?? []).find((item) => item.id === editingSlot.entryId);
    const sheetRecord = buildSheetRecord(
      editingSlot.cabang,
      editingSlot.kelas,
      resolveSheetTanggal(editingSlot.tanggalSheet, editingSlot.tanggal),
      existingEntry?.mapel || "",
      existingEntry?.pengajar || "",
      existingEntry?.waktu || "",
      existingEntry?.jenjang || "",
      existingEntry?.sekolah || editingSlot.sekolah || ""
    );
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).filter((item) => item.id !== editingSlot.entryId),
    }));
    clearEditing();
    await postToSheet({ action: "deleteSession", record: sheetRecord });
  };

  if (!authSession) {
    return (
      <LoginScreen
        username={loginUsername}
        password={loginPassword}
        error={loginError}
        onUsernameChange={(value) => {
          setLoginUsername(value);
          if (loginError) {
            setLoginError("");
          }
        }}
        onPasswordChange={(value) => {
          setLoginPassword(value);
          if (loginError) {
            setLoginError("");
          }
        }}
        onSubmit={handleLogin}
      />
    );
  }


  return (
    <div className="min-vh-100 app-font-8">
      <div className="container-fluid py-4">
        <div className="row g-4">
          <div className={`col-12 ${sidebarCollapsed ? "col-lg-1" : "col-lg-2"}`}>
            <SidebarMenu
              categories={categories}
              activeKey={activeKey}
              sidebarCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((prev) => !prev)}
              onSelect={(key) => {
                setActiveKey(key);
                setQuery("");
                setSelectedSuratTugasKode("");
                clearEditing();
                setIsClassModalOpen(false);
              }}
            />
          </div>

          <div className={`col-12 ${sidebarCollapsed ? "col-lg-11" : "col-lg-10"}`}>
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <h2 className="h4 mb-0">{activeConfig.name}</h2>
                    <div className="text-muted small mt-1">
                      Login sebagai: {authSession.username}
                      {authSession.cabang ? ` (${authSession.cabang})` : ""}
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <TopToolbar
                  activeKey={activeKey}
                  activeName={activeConfig.name}
                  query={query}
                  monthOptions={monthOptions}
                  selectedMonthKey={selectedMonthKey}
                  selectedSuratTugasMonthKey={selectedSuratTugasMonthKey}
                  selectedSuratTugasKode={selectedSuratTugasKode}
                  suratTugasPengajarOptions={suratTugasPengajarOptions}
                  sheetStatus={sheetStatus}
                  mapelStatus={mapelStatus}
                  pengajarStatus={pengajarStatus}
                  suratTugasStatus={suratTugasStatus}
                  onQueryChange={setQuery}
                  onMonthChange={(nextMonth) => {
                    setSelectedMonthKey(nextMonth);
                    setSelectedSuratTugasMonthKey(nextMonth);
                  }}
                  onSuratMonthChange={(nextMonth) => {
                    setSelectedSuratTugasMonthKey(nextMonth);
                    if (nextMonth) {
                      setSelectedMonthKey(nextMonth);
                    }
                    setSelectedSuratTugasKode("");
                  }}
                  onSuratKodeChange={setSelectedSuratTugasKode}
                />
                {(activeKey === "bulanIni" ||
                  activeKey === "jadwalTambahanPelayanan" ||
                  activeKey === "monitoringKelas" ||
                  activeKey === "printJadwal") &&
                  sheetStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {sheetStatus.error}
                  </div>
                )}
                {activeKey === "mataPelajaran" && mapelStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {mapelStatus.error}
                  </div>
                )}
                
                {activeKey === "pengajar" && pengajarStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {pengajarStatus.error}
                  </div>
                )}

                {activeKey === "suratTugasMengajar" && suratTugasStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {suratTugasStatus.error}
                  </div>
                )}

                {activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan" ? (
                  <ScheduleTableView
                    isJadwalTambahanMenu={isJadwalTambahanMenu}
                    activeScheduleDates={activeScheduleDates}
                    activeDayGroups={activeDayGroups}
                    activeDayStartIndexes={activeDayStartIndexes}
                    monthScheduleGroups={monthScheduleGroups}
                    editingSlot={editingSlot}
                    onDeleteClass={handleDeleteClass}
                    onSelectSlot={handleSelectBulanIniSlot}
                    onOpenClassModal={handleOpenClassModal}
                    onOpenEditClass={handleOpenEditClass}
                  />
                ) : activeKey === "monitoringKelas" ? (
                  <MonitoringKelasView loading={sheetStatus.loading} rows={monitoringRows} />
                ) : activeKey === "mataPelajaran" ? (
                  <MapelTableView
                    headers={mapelHeaders}
                    loading={mapelStatus.loading}
                    records={filteredMapelRecords}
                    onAdd={() => handleOpenMapelModal()}
                    onEdit={handleOpenMapelModal}
                    onDelete={handleDeleteMapel}
                  />
                ) : activeKey === "pengajar" ? (
                  <PengajarTableView
                    headers={pengajarHeaders}
                    loading={pengajarStatus.loading}
                    records={pengajarRecords}
                    query={query}
                    onAdd={() => handleOpenPengajarModal()}
                    onEdit={handleOpenPengajarModal}
                    onDelete={handleDeletePengajar}
                  />
                ) : activeKey === "suratTugasMengajar" ? (
                  <SuratTugasView
                    loading={suratTugasStatus.loading}
                    selectedMonthKey={selectedSuratTugasMonthKey}
                    selectedPengajarKode={selectedSuratTugasKode}
                    selectedPengajar={selectedSuratTugasPengajar}
                    selectedSessionCount={selectedSuratTugasSessionCount}
                    dayRows={suratTugasCalendar.dayRows}
                    recordsByDate={suratTugasRecordsByDate}
                  />
                ) : activeKey === "printJadwal" ? (
                  <PrintJadwalView
                    monthOptions={monthOptions}
                    selectedMonthKey={selectedMonthKey}
                    onMonthChange={setSelectedMonthKey}
                    regulerDates={monthScheduleDates}
                    regulerDayGroups={monthDayGroups}
                    regulerGroups={monthScheduleGroups}
                    tambahanGroups={tambahanPrintGroups}
                    mapelNameByKode={mapelNameByKode}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClassModal
        isOpen={isClassModalOpen}
        isEditing={isClassEditing}
        classDraft={classDraft}
        fixedCabang={restrictedCabang || undefined}
        showSekolahField={activeScheduleKey === "jadwalTambahanPelayanan"}
        classError={classError}
        onClose={() => {
          setIsClassModalOpen(false);
          setIsClassEditing(false);
          setEditingClassGroup(null);
        }}
        onDraftChange={handleClassDraftChange}
        onSave={handleSaveNewClass}
      />

      <EditScheduleModal
        editingSlot={editingSlot}
        dateLabel={activeScheduleDates.find((slot) => slot.date === editingSlot?.tanggal)?.label || ""}
        draft={draft}
        mapelOptions={mapelOptions}
        pengajarOptions={pengajarOptions}
        conflictError={conflictError}
        saving={sheetStatus.saving}
        onClose={clearEditing}
        onDraftChange={handleDraftChange}
        onDelete={handleDeleteSlot}
        onSave={handleSaveSlot}
        gabung={gabungEnabled}
        gabungOptions={gabungOptions}
        selectedGabung={gabungClassKey}
        onToggleGabung={(next) => {
          console.log("App onToggleGabung", next);
          setGabungEnabled(next);
        }}
        onGabungChange={setGabungClassKey}
      />

      <MapelModal
        isOpen={isMapelModalOpen}
        editingMapelOldName={editingMapelOldName}
        mapelDraft={mapelDraft}
        mapelError={mapelError}
        loading={mapelStatus.loading}
        onClose={() => setIsMapelModalOpen(false)}
        onMapelChange={(value) => setMapelDraft((prev) => ({ ...prev, Mapel: value }))}
        onKodeMapelChange={(value) => setMapelDraft((prev) => ({ ...prev, Kode_Mapel: value }))}
        onSave={handleSaveMapel}
      />

      <PengajarModal
        isOpen={isPengajarModalOpen}
        isEditing={Boolean(editingPengajarOldKode)}
        draft={pengajarDraft}
        error={pengajarError}
        loading={pengajarStatus.loading}
        onClose={() => setIsPengajarModalOpen(false)}
        onChange={(field, value) => setPengajarDraft((prev) => ({ ...prev, [field]: value }))}
        onSave={handleSavePengajar}
      />
    </div>
  );
}
