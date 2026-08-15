import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { categories, initialRecords } from "./config/categories";
import { SidebarMenu } from "./components/layout/SidebarMenu";
import { LoginScreen } from "./components/layout/LoginScreen";
import { ClassModal } from "./components/modals/ClassModal";
import { EditScheduleModal } from "./components/modals/EditScheduleModal";
import { MapelModal } from "./components/modals/MapelModal";
import { PengajarModal, type PengajarDraft } from "./components/modals/PengajarModal";
import {
  PenempatanPengajarModal,
  type PenempatanDraft,
} from "./components/modals/PenempatanPengajarModal";
import {
  IzinPengajarModal,
  type IzinPengajarDraft,
} from "./components/modals/IzinPengajarModal";
import { AccountsCabangModal } from "./components/modals/AccountsCabangModal";
import {
  PermintaanPengajarModal,
  type PermintaanDraft,
} from "./components/modals/PermintaanPengajarModal";
import { TopToolbar } from "./components/views/TopToolbar";
import { DashboardView } from "./components/views/DashboardView";
import { ScheduleTableView } from "./components/views/ScheduleTableView";
import { MonitoringKelasView } from "./components/views/MonitoringKelasView";
import { MapelTableView } from "./components/views/MapelTableView";
import { PengajarTableView } from "./components/views/PengajarTableView";
import { AccountsCabangView } from "./components/views/AccountsCabangView";
import { PenempatanPengajarView } from "./components/views/PenempatanPengajarView";
import { IzinPengajarView } from "./components/views/IzinPengajarView";
import { PermintaanPengajarView } from "./components/views/PermintaanPengajarView";
import { SuratTugasView } from "./components/views/SuratTugasView";
import { PrintJadwalView } from "./components/views/PrintJadwalView";
import { HapusJadwalView } from "./components/views/HapusJadwalView";
import { HolidaysAdminView } from "./components/views/HolidaysAdminView";
import { SettingsView } from "./components/views/SettingsView";
import { LoadingOverlay } from "./components/feedback/LoadingOverlay";
import { ConfirmDialog } from "./components/feedback/ConfirmDialog";
import { ToastStack } from "./components/feedback/ToastStack";
import { authStorageKey, loginAccounts } from "./config/auth";
import type {
  AppToast,
  AuthSession,
  EditingSlot,
  RecordItem,
  ToastType,
} from "./types/app";
import {
  buildRollingScheduleDates,
  buildMonthScheduleDates,
  formatLocalDate,
  formatScheduleLabel,
  formatTimeHHMM,
  mapelHeadersExpected,
  mapMapelRecord,
  normalizeHeader,
  parseFlexibleDate,
  parseRangeFromString,
  parseTimeValue,
} from "./utils/schedule";
// copySchedule feature removed
import { setNationalHolidays as setLocalNationalHolidays } from "./config/holidays";
import {
  decodeId,
  deleteRowsByIds,
  insertRow,
  listRows,
  replaceBucketRows,
  updateRow,
  type DbRow,
} from "./lib/database";
import { checkDatabaseConnection } from "./lib/api";

export function App() {
  const getMonthKey = (date: Date) =>
    formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const normalizeValueKey = (value: string) =>
    normalizeText(String(value || "")).replace(/[^a-z0-9]+/g, "");
  const toRecord = (row: DbRow) => row.data;

  const scheduleSheetByKey = {
    bulanIni: "Jadwal Bulan ini",
    jadwalTambahanPelayanan: "Jadwal Khusus",
  } as const;
  type ScheduleMenuKey = keyof typeof scheduleSheetByKey;
  const dataBucket = {
    "Jadwal Bulan ini": "jadwal_kbm",
    "Jadwal Khusus": "jadwal_kbm",
    "Mata Pelajaran": "mata_pelajaran",
    "Data Pengajar": "pengajar",
    "Surat Tugas Pengajar": "surat_tugas",
    "Penempatan Pengajar": "penempatan_pengajar_dicabang",
    "Izin Pengajar": "izin_pengajar",
    "Permintaan Pengajar Antar Cabang": "permintaan_pengajar",
    "accounts_cabang": "accounts_cabang",
  } as const;

  const matchByFields = (
    source: Record<string, string>,
    target: Record<string, string>,
    fields: string[]
  ) =>
    fields.every((field) => {
      const sRaw = String(source[field] ?? "").trim();
      const tRaw = String(target[field] ?? "").trim();
      if (field.toLowerCase().includes("tanggal")) {
        if (!sRaw || !tRaw) {
          return false;
        }
        const sDate = parseFlexibleDate(sRaw);
        const tDate = parseFlexibleDate(tRaw);
        if (sDate && tDate) {
          return formatLocalDate(sDate) === formatLocalDate(tDate);
        }
        return normalizeValueKey(sRaw) === normalizeValueKey(tRaw);
      }
      return normalizeValueKey(sRaw) === normalizeValueKey(tRaw);
    });

  const getScheduleJenis = (scheduleKey: ScheduleMenuKey) =>
    scheduleKey === "bulanIni" ? "Reguler" : "Khusus";

  const isMatchingScheduleJenis = (row: DbRow, scheduleKey: ScheduleMenuKey) => {
    const jenis = String(row.data["Jenis KBM"] || row.data.jenis_kbm || "");
    return normalizeValueKey(jenis) === normalizeValueKey(getScheduleJenis(scheduleKey));
  };

  const [activeKey, setActiveKey] = useState(categories[0].key);
  const [records, setRecords] = useState<Record<string, RecordItem[]>>(initialRecords);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [draft, setDraft] = useState({
    mapel: "",
    pengajar: "",
    waktuMulai: "",
    waktuSelesai: "",
  });
  const [copyTargetDates, setCopyTargetDates] = useState<string[]>([]);
  useEffect(() => {
    const allowedSearchKeys = new Set(["mataPelajaran", "pengajar", "penempatanPengajar"]);
    if (!allowedSearchKeys.has(activeKey)) {
      setQuery("");
    }
  }, [activeKey]);
  const [query, setQuery] = useState("");
  const [sheetStatus, setSheetStatus] = useState({
    loading: false,
    saving: false,
    error: "",
    lastSync: "",
  });
  const sheetStatusErrorTimeoutRef = useRef<number | null>(null);

  const setSheetStatusError = (error: string) => {
    setSheetStatus((prev) => ({ ...prev, error }));
    if (sheetStatusErrorTimeoutRef.current) {
      window.clearTimeout(sheetStatusErrorTimeoutRef.current);
    }
    if (error) {
      sheetStatusErrorTimeoutRef.current = window.setTimeout(() => {
        setSheetStatus((prev) => ({ ...prev, error: "" }));
        sheetStatusErrorTimeoutRef.current = null;
      }, 3200);
    }
  };
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
  const [penempatanStatus, setPenempatanStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [penempatanRecords, setPenempatanRecords] = useState<Record<string, string>[]>([]);
  const [izinStatus, setIzinStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [izinRecords, setIzinRecords] = useState<Record<string, string>[]>([]);
  const [permintaanStatus, setPermintaanStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [permintaanRecords, setPermintaanRecords] = useState<Record<string, string>[]>([]);
  const [accountsCabangRecords, setAccountsCabangRecords] = useState<Record<string, string>[]>([]);
  const [accountsCabangStatus, setAccountsCabangStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [accountsCabangHeaders] = useState<string[]>([
    "Username",
    "Password",
    "Roll",
    "Cabang",
    "Created At",
    "Updated At",
  ]);
  const [isAccountsCabangModalOpen, setIsAccountsCabangModalOpen] = useState(false);
  const [accountsCabangDraft, setAccountsCabangDraft] = useState({
    Username: "",
    Password: "",
    Roll: "cabang",
    Cabang: "",
  });
  const [editingAccountsCabangId, setEditingAccountsCabangId] = useState<string | null>(null);
  const [accountsCabangError, setAccountsCabangError] = useState("");
  const [selectedSuratTugasMonthKey, setSelectedSuratTugasMonthKey] = useState("");
  const [selectedSuratTugasKode, setSelectedSuratTugasKode] = useState("");
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classDraft, setClassDraft] = useState({ cabang: "", kelas: "", sekolah: "", jenjang: "" });
  const [isClassEditing, setIsClassEditing] = useState(false);
  const [editingClassGroup, setEditingClassGroup] = useState<
    { cabang: string; kelas: string; sekolah?: string } | null
  >(null);
  const [classError, setClassError] = useState("");
  const [groupDisplayOrder, setGroupDisplayOrder] = useState<Record<string, number>>({});
  const [conflictError, setConflictError] = useState("");
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [mapelDraft, setMapelDraft] = useState({ Mapel: "", Kode_Mapel: "" });
  const [gabungEnabled, setGabungEnabled] = useState(false);
  const [gabungClassKeys, setGabungClassKeys] = useState<string[]>([]);
  const [gabungOptions, setGabungOptions] = useState<{ value: string; label: string }[]>([]);
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
  const [isPenempatanModalOpen, setIsPenempatanModalOpen] = useState(false);
  const [penempatanDraft, setPenempatanDraft] = useState<PenempatanDraft>({
    kodePengajar: "",
    namaPengajar: "",
    domisili: "",
    availabilityList: [],
  });
  const [penempatanOldRecord] = useState<Record<string, string> | null>(null);
  const [penempatanError, setPenempatanError] = useState("");
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinDraft, setIzinDraft] = useState<IzinPengajarDraft>({
    kodePengajar: "",
    namaPengajar: "",
    domisili: "",
    cabangTarget: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    keterangan: "",
  });
  const [editingIzinId, setEditingIzinId] = useState<string | null>(null);
  const [izinError, setIzinError] = useState("");
  const [isPermintaanModalOpen, setIsPermintaanModalOpen] = useState(false);
  const [permintaanDraft, setPermintaanDraft] = useState<PermintaanDraft>({
    id: "",
    kodePengajar: "",
    namaPengajar: "",
    cabangPeminta: "",
    dariCabang: "",
    tanggalDiminta: "",
    jamMulai: "",
    jamSelesai: "",
    catatan: "",
  });
  const [permintaanError, setPermintaanError] = useState("");

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const sidebarCollapsed = sidebarWidth <= 220;
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [, setMonthAnchor] = useState(() => new Date());
  const [lastCacheCleanedAt, setLastCacheCleanedAt] = useState<string | undefined>(undefined);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedMonthKey");
      if (saved) return saved;
    } catch (_e) {
      // ignore
    }
    return getMonthKey(new Date());
  });
  const [printScheduleType, setPrintScheduleType] = useState<"reguler" | "tambahan">("reguler");
  const [printSelectedClassKey, setPrintSelectedClassKey] = useState("");
  const [printCopies, setPrintCopies] = useState(5);
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");
  const [deleteScheduleType, setDeleteScheduleType] = useState<"bulanIni" | "jadwalTambahanPelayanan">(
    "bulanIni"
  );
  // Minimum required gap (in minutes) between classes in different branches for the same teacher
  const INTER_BRANCH_MIN_GAP_MINUTES = 45;
  const [deleteMonthKey, setDeleteMonthKey] = useState(() => getMonthKey(new Date()));
  const [isDeletingByMonth, setIsDeletingByMonth] = useState(false);
  const [scheduleCabangView, setScheduleCabangView] = useState<Record<ScheduleMenuKey, string>>({
    bulanIni: "",
    jadwalTambahanPelayanan: "",
  });
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [dbConnectionError, setDbConnectionError] = useState("");
  const [databaseAccounts, setDatabaseAccounts] = useState<LoginAccount[]>([]);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toasts, setToasts] = useState<AppToast[]>([]);

  // On app start, try to load holidays from DB and populate localStorage so UI syncs
  useEffect(() => {
    let mounted = true;
    const loadHolidaysFromDb = async () => {
      try {
        const rows = await listRows("libur_nasional");
        if (!mounted) return;
        const items = rows.map((r) => ({ date: r.data.Tanggal || r.data.tanggal || "", label: r.data.Keterangan || r.data.keterangan_libur || "" }));
        setLocalNationalHolidays(items.filter((it) => it.date));
      } catch (_e) {
        // ignore DB read errors; keep localStorage defaults
      }
    };
    void loadHolidaysFromDb();
    return () => {
      mounted = false;
    };
  }, []);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    loading: boolean;
    onConfirm: null | (() => Promise<void> | void);
  }>({
    open: false,
    title: "Konfirmasi",
    message: "",
    confirmLabel: "Ya, Lanjutkan",
    loading: false,
    onConfirm: null,
  });

  const normalizeCabangValue = (value: string) => {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "");
  };
  const isCabangMatch = (left: string, right: string) => {
    const leftKey = normalizeCabangValue(left);
    const rightKey = normalizeCabangValue(right);
    return Boolean(leftKey && rightKey && leftKey === rightKey);
  };
  const buildClassGroupKey = (cabang: string, kelas: string, sekolah = "") =>
    `${normalizeText(cabang)}||${normalizeText(kelas)}||${normalizeText(sekolah)}`;
  const parseClassOrder = (value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const titleCase = (value: string) =>
    value ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}` : value;
  const splitDelimitedList = (value: string) =>
    value
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseCabangPenempatan = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return [] as string[];
    }
    if (normalized === "semua cabang" || normalized === "semuacabang") {
      return [...cabangOptions];
    }
    return splitDelimitedList(value);
  };
  const parseHariPenempatan = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return [] as string[];
    }
    if (normalized === "semuahari" || normalized === "semua hari") {
      return ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    }
    return splitDelimitedList(value).map((item) => titleCase(item));
  };
  type PenempatanAvailabilityEntry = {
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    cabangList: string[];
  };
  const getPenempatanFieldValue = (record: Record<string, string>, aliases: string[]) => {
    for (const alias of aliases) {
      const value = record[alias];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };
  const normalizePenempatanAvailability = (value: unknown): PenempatanAvailabilityEntry[] => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const item = entry as Record<string, unknown>;
          const hari = String(item.hari ?? item.Hari ?? "").trim();
          if (!hari) {
            return null;
          }
          const jamMulai = String(item.jamMulai ?? item.jam_mulai ?? "").trim();
          const jamSelesai = String(item.jamSelesai ?? item.jam_selesai ?? "").trim();
          const cabangList = Array.isArray(item.cabangList)
            ? item.cabangList.map((cabang) => String(cabang ?? "").trim()).filter(Boolean)
            : String(item.cabangList ?? item.cabang_penempatan ?? "")
                .split(",")
                .map((cabang) => cabang.trim())
                .filter(Boolean);
          return {
            hari: titleCase(hari),
            jamMulai,
            jamSelesai,
            cabangList,
          };
        })
        .filter((item): item is PenempatanAvailabilityEntry => Boolean(item));
    }
    if (typeof value === "string") {
      try {
        return normalizePenempatanAvailability(JSON.parse(value));
      } catch (_error) {
        return [];
      }
    }
    return [];
  };
  const getPenempatanAvailabilityEntries = (record: Record<string, string>): PenempatanAvailabilityEntry[] => {
    const availabilityEntries = normalizePenempatanAvailability(record["__availability_json"] || "");
    if (availabilityEntries.length > 0) {
      return availabilityEntries;
    }

    const hariList = parseHariPenempatan(getPenempatanFieldValue(record, ["Hari", "hari_tersedia"]));
    if (hariList.length === 0) {
      return [];
    }

    const jamMulai = formatTimeHHMM(getPenempatanFieldValue(record, ["Jam Mulai", "jam_mulai"]) || "");
    const jamSelesai = formatTimeHHMM(getPenempatanFieldValue(record, ["Jam Selesai", "jam_selesai"]) || "");
    const cabangList = parseCabangPenempatan(
      getPenempatanFieldValue(record, ["Cabang Penempatan", "cabang_penempatan", "bersedia_mengajar_dicabang"])
    );

    return hariList.map((hari) => ({ hari, jamMulai, jamSelesai, cabangList }));
  };

  const buildPenempatanPayload = (draftValue: PenempatanDraft, idPengajar = "") => {
    const selectedAvailabilities = draftValue.availabilityList
      .filter((item) => item.enabled)
      .map((item) => ({
        hari: titleCase(item.hari),
        jamMulai: item.jamMulai.trim(),
        jamSelesai: item.jamSelesai.trim(),
        cabangList: Array.from(
          new Set(
            (restrictedCabang ? [restrictedCabang] : item.cabangList)
              .map((cabang) => cabang.trim())
              .filter(Boolean)
          )
        ),
      }));

    const earliestStart = selectedAvailabilities.reduce((acc, item) => {
      if (!item.jamMulai) {
        return acc;
      }
      return !acc || item.jamMulai < acc ? item.jamMulai : acc;
    }, "");
    const latestEnd = selectedAvailabilities.reduce((acc, item) => {
      if (!item.jamSelesai) {
        return acc;
      }
      return !acc || item.jamSelesai > acc ? item.jamSelesai : acc;
    }, "");

    return {
      "Kode Pengajar": draftValue.kodePengajar,
      "Nama Pengajar": draftValue.namaPengajar,
      Domisili: draftValue.domisili,
      Hari: selectedAvailabilities.map((item) => item.hari).join(", "),
      "Jam Mulai": earliestStart,
      "Jam Selesai": latestEnd,
      "Cabang Penempatan": Array.from(new Set(selectedAvailabilities.flatMap((item) => item.cabangList))).join(", "),
      __availability_json: JSON.stringify(selectedAvailabilities),
      "__id_pengajar": idPengajar,
    };
  };
  const parsePermintaanTanggalKhusus = (value: string) => {
    if (!value.trim()) {
      return [] as string[];
    }
    const parsed = value
      .split(/[\n,;|]+/)
      .map((item) => parseFlexibleDate(item.trim()))
      .filter((item): item is Date => Boolean(item))
      .map((item) => formatScheduleLabel(item));
    return Array.from(new Set(parsed));
  };
  const isScheduleMenuKey = (value: string): value is ScheduleMenuKey =>
    value === "bulanIni" || value === "jadwalTambahanPelayanan";
  const activeScheduleKey: ScheduleMenuKey = isScheduleMenuKey(activeKey)
    ? activeKey
    : "bulanIni";
  const isAdmin = normalizeText(authSession?.roll || "") === "admin";
  const restrictedCabang = !isAdmin ? (authSession?.cabang || "") : "";
  const selectedScheduleCabang = scheduleCabangView[activeScheduleKey] || restrictedCabang || "";
  const isScheduleReadOnly = Boolean(
    restrictedCabang &&
      selectedScheduleCabang &&
      normalizeText(selectedScheduleCabang) !== normalizeText(restrictedCabang)
  );

  const scheduleTopToolbarMessage = useMemo(() => {
    if (!isScheduleMenuKey(activeKey)) {
      return "";
    }
    return isScheduleReadOnly
      ? "Mode lihat cabang lain aktif. Anda hanya dapat melihat jadwal tanpa mengubah data."
      : "Klik sel untuk edit jadwal. Gunakan ikon panah di kolom aksi untuk menggeser urutan kelas.";
  }, [activeKey, isScheduleReadOnly]);

  const toastTimeoutsRef = useRef<Record<string, number>>({});

  const pushToast = (message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete toastTimeoutsRef.current[id];
    }, 3200);

    toastTimeoutsRef.current[id] = timeoutId;
  };

  const dismissToast = (id: string) => {
    if (toastTimeoutsRef.current[id]) {
      window.clearTimeout(toastTimeoutsRef.current[id]);
      delete toastTimeoutsRef.current[id];
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const openConfirmDialog = (
    message: string,
    onConfirm: () => Promise<void> | void,
    options?: { title?: string; confirmLabel?: string }
  ) => {
    setConfirmDialog({
      open: true,
      title: options?.title || "Konfirmasi",
      message,
      confirmLabel: options?.confirmLabel || "Ya, Lanjutkan",
      loading: false,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) =>
      prev.loading
        ? prev
        : { ...prev, open: false, message: "", onConfirm: null, confirmLabel: "Ya, Lanjutkan" }
    );
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialog.onConfirm) {
      closeConfirmDialog();
      return;
    }
    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null, message: "" }));
    } catch (_error) {
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const mapelOptions = useMemo(() => {
    return mapelRecords.map((record) => ({
      value: record["Mapel"] || record["Mata Pelajaran"] || "",
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

  const mapelKodeByName = useMemo(() => {
    return mapelRecords.reduce<Record<string, string>>((acc, record) => {
      const kode = (record["Kode_Mapel"] || record["Singkatan"] || "").trim();
      const nama = (record["Mapel"] || record["Mata Pelajaran"] || "").trim();
      if (!kode || !nama) {
        return acc;
      }
      acc[nama.toLowerCase()] = kode;
      return acc;
    }, {});
  }, [mapelRecords]);

  const buildPengajarOption = (record: Record<string, string>) => {
    const kode = (record["Kode Pengajar"] || record["kode_pengajar"] || "").trim();
    const nama = (
      (record["Nama"] || record["nama"] || record["Nama Pengajar"] || record["nama_pengajar"] || "")
    ).trim();
    if (!kode) {
      return null;
    }
    return {
      value: kode,
      label: nama ? `${kode} - ${nama}` : kode,
    } satisfies { value: string; label: string };
  };

  const pengajarOptions = useMemo(() => {
    return pengajarRecords
      .map(buildPengajarOption)
      .filter((option): option is { value: string; label: string } => Boolean(option));
  }, [pengajarRecords]);

  const pengajarByKode = useMemo(() => {
    return pengajarRecords.reduce<Record<string, Record<string, string>>>((acc, record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      if (kode) {
        acc[kode] = record;
      }
      return acc;
    }, {});
  }, [pengajarRecords]);

  const pengajarIzinOptions = useMemo(() => {
    const source = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    return source
      .map((record) => ({
        value: (record["Kode Pengajar"] || "").trim().toLowerCase(),
        label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`,
      }))
      .filter((option) => option.value);
  }, [pengajarRecords, restrictedCabang]);

  const normalizeToken = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const approvedPermintaanRecords = useMemo(
    () =>
      permintaanRecords.filter(
        (record) => normalizeText(record.Status || "") === "disetujui"
      ),
    [permintaanRecords]
  );

  const isPengajarAvailableForScheduleSlot = (
    kodePengajar: string,
    cabang: string,
    tanggal: string,
    waktuMulai?: string,
    waktuSelesai?: string
  ) => {
    const kodeKey = normalizeText(kodePengajar);
    const cabangKey = normalizeText(cabang);
    const parsedDate = parseFlexibleDate(tanggal);
    if (!kodeKey || !cabangKey || !parsedDate) {
      return false;
    }

    const dayName = titleCase(
      parsedDate.toLocaleDateString("id-ID", { weekday: "long" })
    );

    const pengajarPenempatan = penempatanRecords.filter(
      (record) => normalizeText(record["Kode Pengajar"] || "") === kodeKey
    );

    const cabangMatchedRecords = pengajarPenempatan.filter((record) => {
      const availabilityEntries = getPenempatanAvailabilityEntries(record);
      return availabilityEntries.some((entry) =>
        entry.cabangList.some((item) => isCabangMatch(item, cabangKey))
      );
    });

    const approvedByPengajar = getApprovedPermintaanForCabang(
      kodePengajar,
      cabang,
      tanggal
    );

    if (cabangMatchedRecords.length === 0 && approvedByPengajar.length === 0) {
      return false;
    }

    const availabilityRecords = ([
      ...cabangMatchedRecords.map((record) => ({
        ...record,
        __availabilityEntries: getPenempatanAvailabilityEntries(record),
      })),
      ...approvedByPengajar.map((record) => ({
        ...record,
        "Cabang Penempatan": record["Cabang Peminta"] || "",
        __availabilityEntries: [{
          hari: dayName,
          jamMulai: record["Jam Mulai"] || "",
          jamSelesai: record["Jam Selesai"] || "",
          cabangList: [record["Cabang Peminta"] || ""],
        }],
      })),
    ] as Array<Record<string, string> & { __availabilityEntries?: PenempatanAvailabilityEntry[] }>);

    const dayMatchedRecords = availabilityRecords.filter((record) => {
      if (record["Cabang Peminta"] !== undefined) {
        const requestedDays = parseHariPenempatan(record["Hari"] || "");
        return requestedDays.length === 0 || requestedDays.includes(dayName);
      }
      const availabilityEntries = record.__availabilityEntries || [];
      if (availabilityEntries.length > 0) {
        return availabilityEntries.some((entry) => entry.hari === dayName);
      }
      return parseHariPenempatan(record["Hari"] || "").includes(dayName);
    });

    if (dayMatchedRecords.length === 0) {
      return false;
    }

    const startTime = parseTimeValue(waktuMulai || "");
    const endTime = parseTimeValue(waktuSelesai || "");
    if (startTime === null || endTime === null || startTime >= endTime) {
      return true;
    }

    return dayMatchedRecords.some((record) => {
      const availabilityEntries = record.__availabilityEntries || [];
      if (availabilityEntries.length > 0) {
        return availabilityEntries.some((entry) => {
          if (entry.hari !== dayName) {
            return false;
          }
          const placementStart = parseTimeValue(entry.jamMulai || "");
          const placementEnd = parseTimeValue(entry.jamSelesai || "");
          if (placementStart === null || placementEnd === null) {
            return true;
          }
          return startTime >= placementStart && endTime <= placementEnd;
        });
      }

      const placementStart = parseTimeValue(record["Jam Mulai"] || "");
      const placementEnd = parseTimeValue(record["Jam Selesai"] || "");
      if (placementStart === null || placementEnd === null) {
        return true;
      }
      return startTime >= placementStart && endTime <= placementEnd;
    });
  };

  const filteredPengajarOptions = useMemo(() => {
    const selectedMapelValue = draft.mapel.trim();
    if (!selectedMapelValue) {
      return pengajarOptions;
    }

    const selectedMapelName = mapelNameByKode[selectedMapelValue.toLowerCase()] || "";
    const selectedMapelKode = selectedMapelValue;
    const targetKode = normalizeToken(selectedMapelKode);
    const targetName = normalizeToken(selectedMapelName);
    const targetNameFromLabel = normalizeToken(mapelKodeByName[selectedMapelValue.toLowerCase()] || "");

    const baseOptions = pengajarRecords
      .filter((record) => {
        const bidangStudi = (record["Bidang Studi"] || "").trim();
        if (!bidangStudi) {
          return false;
        }

        const tokens = bidangStudi
          .split(/[,;/|]+/)
          .map((token) => normalizeToken(token))
          .filter(Boolean);

        if (tokens.includes(targetKode)) {
          return true;
        }
        if (targetName && tokens.includes(targetName)) {
          return true;
        }
        if (targetNameFromLabel && tokens.includes(targetNameFromLabel)) {
          return true;
        }

        const bidangNormalized = normalizeToken(bidangStudi);
        return Boolean(
          (targetKode && bidangNormalized.includes(targetKode)) ||
          (targetName && bidangNormalized.includes(targetName)) ||
          (targetNameFromLabel && bidangNormalized.includes(targetNameFromLabel))
        );
      })
      .map((record) => ({
        value: record["Kode Pengajar"] || "",
        label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`,
      }))
      .filter((option) => option.value);

    if (!editingSlot) {
      return baseOptions;
    }

    return baseOptions.filter((option) =>
      isPengajarAvailableForScheduleSlot(
        option.value,
        editingSlot.cabang,
        editingSlot.tanggal,
        draft.waktuMulai,
        draft.waktuSelesai
      )
    );
  }, [
    draft.mapel,
    draft.waktuMulai,
    draft.waktuSelesai,
    editingSlot,
    mapelNameByKode,
    pengajarOptions,
    pengajarRecords,
    penempatanRecords,
  ]);

  const cabangOptions = useMemo(() => {
    const accountsToUse = databaseAccounts.length > 0 ? databaseAccounts : loginAccounts;
    const set = new Set<string>();
    accountsToUse.forEach((account) => {
      if (account.cabang) {
        set.add(account.cabang);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [databaseAccounts]);

  const activeScheduleCabangOptions = useMemo(() => {
    const set = new Set<string>();
    (records[activeScheduleKey] ?? []).forEach((entry) => {
      const cabang = (entry.cabang || "").trim();
      if (cabang) {
        set.add(cabang);
      }
    });
    cabangOptions.forEach((cabang) => set.add(cabang));
    if (restrictedCabang) {
      set.add(restrictedCabang);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeScheduleKey, cabangOptions, records, restrictedCabang]);

  const pengajarPenempatanOptions = useMemo(() => {
    const branchMatches = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || record["domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    const source = branchMatches.length > 0 ? branchMatches : pengajarRecords;

    return source
      .map(buildPengajarOption)
      .filter((option): option is { value: string; label: string } => Boolean(option));
  }, [pengajarRecords, restrictedCabang]);

  const pengajarPermintaanOptions = useMemo(() => {
    return pengajarRecords
      .filter((record) => {
        if (!restrictedCabang) {
          return true;
        }
        return normalizeText(record["Domisili"] || "") !== normalizeText(restrictedCabang);
      })
      .map((record) => {
        const kode = (record["Kode Pengajar"] || "").trim();
        const nama = (record["Nama"] || "").trim();
        const domisili = (record["Domisili"] || "").trim();
        return {
          value: kode,
          label: `${kode} - ${nama} - ${domisili}`,
        };
      })
      .filter((option) => option.value);
  }, [pengajarRecords, restrictedCabang]);

  const sanitizeWhatsappDigits = (value: string) => {
    let digits = value.replace(/\D/g, "");
    while (digits.startsWith("62")) {
      digits = digits.slice(2);
    }
    while (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  };

  const sanitizePasswordInput = (value: string) =>
    value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let output = "";
    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      output += chars[randomIndex];
    }
    return output;
  };

  const generateUniqueKodePengajar = (nama: string, oldKode?: string | null) => {
    const compact = nama
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim();
    if (!compact) {
      return "";
    }

    const words = compact.split(/\s+/).filter(Boolean);
    const letters = compact.replace(/\s+/g, "");
    const candidates: string[] = [];

    if (words.length >= 2) {
      candidates.push(`${words[0][0]}${words[1][0]}`);
      candidates.push(words.slice(0, 3).map((word) => word[0]).join(""));
    }

    if (letters.length >= 2) {
      candidates.push(letters.slice(0, 2));
    }
    if (letters.length >= 3) {
      candidates.push(letters.slice(0, 3));
    }

    for (let index = 0; index < Math.max(0, letters.length - 2); index += 1) {
      candidates.push(letters.slice(index, index + 3));
    }

    const usedCodes = new Set(
      pengajarRecords
        .map((record) => (record["Kode Pengajar"] || "").trim().toLowerCase())
        .filter((code) => code && (!oldKode || code !== oldKode.trim().toLowerCase()))
    );

    const uniqueCandidates = Array.from(new Set(candidates.filter((candidate) => candidate.length >= 2)));
    for (const candidate of uniqueCandidates) {
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
    }

    const fallback = uniqueCandidates[0] || letters.slice(0, 3) || "pg";
    let counter = 1;
    let attempt = fallback;
    while (usedCodes.has(attempt)) {
      attempt = `${fallback.slice(0, 3)}${counter}`;
      counter += 1;
    }
    return attempt;
  };

  const monthOptions = useMemo(() => {
    const monthKeys = new Set<string>();
    const addMonthsFromRecords = (items?: RecordItem[]) => {
      (items || []).forEach((item) => {
        const tanggal = String(item.tanggal || item.Tanggal || "").trim();
        if (tanggal) {
          monthKeys.add(tanggal.slice(0, 7));
        }
      });
    };

    addMonthsFromRecords(records.bulanIni);
    addMonthsFromRecords(records.jadwalTambahanPelayanan);

    const currentKey = getMonthKey(new Date());
    monthKeys.add(currentKey);
    const nextMonthKey = getMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    monthKeys.add(nextMonthKey);

    return Array.from(monthKeys)
      .sort((a, b) => {
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);
        if (ay !== by) return ay - by;
        return am - bm;
      })
      .map((value) => {
        const [year, month] = value.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          value,
          label: date.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          }),
        };
      });
  }, [records]);

  useEffect(() => {
    const syncMonthAnchor = () => {
      const now = new Date();
      const nowKey = getMonthKey(now);
      setMonthAnchor((prev) => (getMonthKey(prev) === nowKey ? prev : new Date(now.getFullYear(), now.getMonth(), 1)));
    };

    syncMonthAnchor();
    const intervalId = window.setInterval(syncMonthAnchor, 60 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const availableMonthKeys = new Set(monthOptions.map((option) => option.value));
    const currentMonthKey = getMonthKey(new Date());

    if (!availableMonthKeys.has(selectedMonthKey)) {
      setSelectedMonthKey(currentMonthKey);
    }

    if (!availableMonthKeys.has(deleteMonthKey)) {
      setDeleteMonthKey(currentMonthKey);
    }

    if (selectedSuratTugasMonthKey && !availableMonthKeys.has(selectedSuratTugasMonthKey)) {
      setSelectedSuratTugasMonthKey("");
      setSelectedSuratTugasKode("");
    }
  }, [deleteMonthKey, monthOptions, selectedMonthKey, selectedSuratTugasMonthKey]);

  const selectedMonth = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedMonthKey]);

  useEffect(() => {
    try {
      localStorage.setItem("selectedMonthKey", selectedMonthKey);
    } catch (_e) {
      // ignore
    }
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

  const copyDateOptions = useMemo(() => {
    if (!editingSlot) {
      return [] as { value: string; label: string }[];
    }
    return activeScheduleDates
      .filter((slot) => slot.date !== editingSlot.tanggal)
      .map((slot) => ({ value: slot.date, label: slot.label }));
  }, [activeScheduleDates, editingSlot]);

  const suratTugasCalendar = useMemo(() => {
    if (!selectedSuratTugasMonthDate) {
      return { dayRows: [], dateKeys: new Set<string>() };
    }
    const { scheduleDates, dayGroups: suratDayGroups } = buildMonthScheduleDates(selectedSuratTugasMonthDate);
    let offset = 0;
    const dayRows = suratDayGroups.map((group) => {
      const dates = scheduleDates.slice(offset, offset + group.count);
      offset += group.count;
      return {
        dayLabel: group.label.toUpperCase(),
        dates,
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
        const classOrderRaw = getEntryValue(row, ["Urutan Kelas", "Urutan", "Class Order"]);
        const waktu = waktuFromWaktu || [waktuMulai, waktuSelesai].filter(Boolean).join("-");
        const tanggal = normalizeDateValue(tanggalRaw);
        const tanggalSheet = resolveSheetTanggal(tanggalRaw, tanggal);
        const classOrder = parseClassOrder(classOrderRaw);
        const gabungWith = getEntryValue(row, ["Gabung"]);
        const isGabungRaw = getEntryValue(row, ["IsGabung"]);
        const isGabung =
          ["true", "1", "ya", "yes"].includes(normalizeValueKey(isGabungRaw)) || Boolean(gabungWith);

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
          classOrder: classOrder === null ? "" : String(classOrder),
          catatan: "",
          isGabung,
          gabungWith,
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
            classOrder: "",
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

  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (
          category.key === "hapusJadwal" ||
          category.key === "liburNasional" ||
          category.key === "accounts_cabang"
        ) {
          return isAdmin;
        }
        return true;
      }),
    [isAdmin]
  );

  const activeConfig = useMemo(
    () => visibleCategories.find((category) => category.key === activeKey) ?? visibleCategories[0],
    [activeKey, visibleCategories]
  );


  const hasScheduleContent = (entry?: RecordItem) =>
    Boolean(entry && ((entry.mapel || "").trim() || (entry.pengajar || "").trim() || (entry.waktu || "").trim()));

  const buildScheduleGroups = (
    sourceRecords: RecordItem[],
    cabangFilter: string,
    searchText: string
  ) => {
    const getGroupOrderKey = (groupKey: string) => `${activeScheduleKey}:${selectedMonthKey}:${selectedScheduleCabang}:${groupKey}`;
    const entries = cabangFilter
      ? sourceRecords.filter(
          (entry) => normalizeText(entry.cabang || "") === normalizeText(cabangFilter)
        )
      : sourceRecords;
    const grouped = new Map<
      string,
      { cabang: string; kelas: string; sekolah: string; jenjang?: string; classOrder: number; entriesByDate: Record<string, RecordItem[]> }
    >();
    let fallbackOrder = 1;

    entries.forEach((entry) => {
      const cabang = entry.cabang || "";
      const kelas = entry.kelas || "";
      const sekolah = entry.sekolah || "";
      const key = buildClassGroupKey(cabang, kelas, sekolah);
      const parsedOrder = parseClassOrder(entry.classOrder);
      const overrideOrder = groupDisplayOrder[getGroupOrderKey(key)];
      const initialOrder = overrideOrder ?? (parsedOrder ?? fallbackOrder);

      if (!grouped.has(key)) {
        grouped.set(key, {
          cabang,
          kelas,
          sekolah,
          jenjang: entry.jenjang || "",
          classOrder: initialOrder,
          entriesByDate: {},
        });
        fallbackOrder += 1;
      } else {
        const group = grouped.get(key)!;
        const currentOrder = group.classOrder;
        const nextOrder = overrideOrder ?? (parsedOrder !== null ? Math.min(currentOrder, parsedOrder) : currentOrder);
        group.classOrder = nextOrder;
        if (!group.jenjang && entry.jenjang) {
          group.jenjang = entry.jenjang;
        }
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

    const groups = Array.from(grouped.values()).sort((a, b) => {
      if (a.classOrder !== b.classOrder) {
        return a.classOrder - b.classOrder;
      }
      return a.kelas.localeCompare(b.kelas, "id");
    });

    if (!searchText.trim()) {
      return groups;
    }

    const lowered = searchText.toLowerCase();
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
  };

  const monthScheduleGroupsAll = useMemo(
    () => {
      const source = records[activeScheduleKey] ?? [];
      if (isJadwalTambahanMenu) {
        return buildScheduleGroups(source, selectedScheduleCabang, "");
      }
      const filtered = source.filter((item) => {
        const tanggal = (item.tanggal as string) || (item.Tanggal as string) || "";
        return tanggal.slice(0, 7) === selectedMonthKey;
      });
      return buildScheduleGroups(filtered, selectedScheduleCabang, "");
    },
    [activeScheduleKey, records, selectedScheduleCabang, isJadwalTambahanMenu, selectedMonthKey]
  );

  const monthScheduleGroups = useMemo(() => {
    const source = records[activeScheduleKey] ?? [];
    if (isJadwalTambahanMenu) {
      return buildScheduleGroups(source, selectedScheduleCabang, query);
    }
    const filtered = source.filter((item) => {
      const tanggal = (item.tanggal as string) || (item.Tanggal as string) || "";
      return tanggal.slice(0, 7) === selectedMonthKey;
    });
    return buildScheduleGroups(filtered, selectedScheduleCabang, query);
  }, [activeScheduleKey, query, records, selectedScheduleCabang, isJadwalTambahanMenu, selectedMonthKey]);

  const tambahanPrintGroups = useMemo(() => {
    return buildScheduleGroups(records.jadwalTambahanPelayanan ?? [], restrictedCabang, "");
  }, [records.jadwalTambahanPelayanan, restrictedCabang]);

  const allScheduleEntries = useMemo(
    () => [
      ...(records.bulanIni ?? []),
      ...(records.jadwalTambahanPelayanan ?? []),
    ],
    [records]
  );

  const conflictingScheduleEntryIds = useMemo(() => {
    const groupedByPengajarTanggal = new Map<string, RecordItem[]>();

    allScheduleEntries.forEach((entry) => {
      if (!hasScheduleContent(entry)) {
        return;
      }
      const pengajarKey = normalizeText(entry.pengajar || "");
      const tanggalKey = (entry.tanggal || "").trim();
      if (!pengajarKey || !tanggalKey) {
        return;
      }
      const groupKey = `${pengajarKey}||${tanggalKey}`;
      const existing = groupedByPengajarTanggal.get(groupKey) ?? [];
      groupedByPengajarTanggal.set(groupKey, [...existing, entry]);
    });

    const conflictIds = new Set<string>();

    groupedByPengajarTanggal.forEach((entries) => {
      for (let i = 0; i < entries.length; i += 1) {
        const current = entries[i];
        const currentRange = parseRangeFromString(current.waktu || "");
        if (!currentRange) {
          continue;
        }
        for (let j = i + 1; j < entries.length; j += 1) {
          const target = entries[j];
          const currentCabang = normalizeText(current.cabang || "");
          const targetCabang = normalizeText(target.cabang || "");
          if (!currentCabang || !targetCabang || currentCabang === targetCabang) {
            continue;
          }

          const targetRange = parseRangeFromString(target.waktu || "");
          if (!targetRange) {
            continue;
          }

          const isOverlap = currentRange.start < targetRange.end && targetRange.start < currentRange.end;
          if (isOverlap) {
            conflictIds.add(current.id);
            conflictIds.add(target.id);
          }
        }
      }
    });

    return conflictIds;
  }, [allScheduleEntries]);

  function getApprovedPermintaanForCabang(
    kodePengajar: string,
    cabang: string,
    tanggal?: string
  ) {
    const kodeKey = normalizeText(kodePengajar);
    const cabangKey = normalizeText(cabang);
    if (!kodeKey || !cabangKey) {
      return [] as Record<string, string>[];
    }
    const targetDate = tanggal ? parseFlexibleDate(tanggal) : null;
    return approvedPermintaanRecords.filter((record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      const cabangPeminta = normalizeText(record["Cabang Peminta"] || "");
      if (!(kode === kodeKey && isCabangMatch(cabangPeminta, cabangKey))) {
        return false;
      }

      if (!targetDate) {
        return true;
      }

      const tanggalDimitaRaw = (record["Tanggal Diminta"] || "").trim();
      if (!tanggalDimitaRaw) {
        return true;
      }

      const requestDate = parseFlexibleDate(tanggalDimitaRaw);
      if (!requestDate) {
        return true;
      }

      const targetLabel = formatScheduleLabel(targetDate);
      const requestLabel = formatScheduleLabel(requestDate);
      return targetLabel === requestLabel;
    });
  }

  const hasPengajarAccessInCabang = (kodePengajar: string, cabang: string, tanggal?: string) => {
    const kodeKey = normalizeText(kodePengajar);
    const cabangKey = normalizeText(cabang);
    if (!kodeKey || !cabangKey) {
      return false;
    }

    const hasPenempatan = penempatanRecords.some((record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      if (kode !== kodeKey) {
        return false;
      }
      return parseCabangPenempatan(record["Cabang Penempatan"] || "").some((item) =>
        isCabangMatch(item, cabangKey)
      );
    });

    if (hasPenempatan) {
      return true;
    }

    return getApprovedPermintaanForCabang(kodePengajar, cabang, tanggal).length > 0;
  };

  const getPengajarIzinOnDate = (kodePengajar: string, tanggal: string) => {
    const kodeKey = normalizeText(kodePengajar);
    const targetDate = parseFlexibleDate(tanggal);
    if (!kodeKey || !targetDate) {
      return null;
    }

    return izinRecords.find((record) => {
      if (normalizeText(record["Kode Pengajar"] || "") !== kodeKey) {
        return false;
      }
      const startDate = parseFlexibleDate(record["Tanggal Mulai"] || "");
      const endDate = parseFlexibleDate(record["Tanggal Selesai"] || "");
      if (!startDate || !endDate) {
        return false;
      }
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const pengajarAvailabilityInfo = useMemo(() => {
    const defaultResult = {
      warning: "",
      availableDateLabels: [] as string[],
    };

    if (!editingSlot || !draft.pengajar.trim()) {
      return defaultResult;
    }

    const pengajarKey = draft.pengajar.trim().toLowerCase();
    const occupiedDates = new Set(
      allScheduleEntries
        .filter((entry) => (entry.pengajar || "").trim().toLowerCase() === pengajarKey)
        .map((entry) => entry.tanggal)
        .filter(Boolean)
    );
    const izinDateLabels = new Set(
      izinRecords
        .filter((record) => normalizeText(record["Kode Pengajar"] || "") === normalizeText(draft.pengajar))
        .flatMap((record) => {
          const start = parseFlexibleDate(record["Tanggal Mulai"] || "");
          const end = parseFlexibleDate(record["Tanggal Selesai"] || "");
          if (!start || !end) {
            return [];
          }
          const dates: string[] = [];
          const cursor = new Date(start.getTime());
          while (cursor <= end) {
            dates.push(formatLocalDate(cursor));
            cursor.setDate(cursor.getDate() + 1);
          }
          return dates;
        })
    );
    const availableDateLabels = activeScheduleDates
      .filter((slot) => !occupiedDates.has(slot.date) && !izinDateLabels.has(slot.date))
      .map((slot) => slot.label);

    const izinMatch = getPengajarIzinOnDate(draft.pengajar, editingSlot.tanggal);
    if (izinMatch) {
      const startLabel = izinMatch["Tanggal Mulai"] || "";
      const endLabel = izinMatch["Tanggal Selesai"] || "";
      const reason = (izinMatch.Keterangan || "").trim();
      return {
        warning: `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`,
        availableDateLabels,
      };
    }

    const penempatanByPengajar = penempatanRecords.filter(
      (record) => (record["Kode Pengajar"] || "").trim().toLowerCase() === pengajarKey
    );
    const approvedByPengajar = getApprovedPermintaanForCabang(
      draft.pengajar,
      editingSlot.cabang,
      editingSlot.tanggal
    );

    if (penempatanByPengajar.length === 0 && approvedByPengajar.length === 0) {
      return {
        warning:
          "Pengajar belum memiliki data penempatan atau permintaan yang disetujui untuk cabang ini, silakan hubungi cabang domisili.",
        availableDateLabels,
      };
    }

    const cabangMatchedRecords = penempatanByPengajar.filter((record) =>
      parseCabangPenempatan(record["Cabang Penempatan"] || "").some((cabang) =>
        isCabangMatch(cabang, editingSlot.cabang)
      )
    );
    const approvedAvailabilityRecords: Record<string, string>[] = approvedByPengajar.map((record) => ({
      ...record,
      "Cabang Penempatan": record["Cabang Peminta"] || "",
    }));
    const availabilityRecords: Record<string, string>[] = [
      ...cabangMatchedRecords,
      ...approvedAvailabilityRecords,
    ];

    if (availabilityRecords.length === 0) {
      return {
        warning:
          "Pengajar tidak tersedia di cabang ini, silakan hubungi cabang domisili.",
        availableDateLabels,
      };
    }

    const parsedDate = parseFlexibleDate(editingSlot.tanggal);
    if (!parsedDate) {
      return { warning: "", availableDateLabels };
    }

    const dayName = titleCase(
      parsedDate.toLocaleDateString("id-ID", { weekday: "long" })
    );
    const dayMatchedRecords = availabilityRecords.filter((record) =>
      parseHariPenempatan(record["Hari"] || "").includes(dayName)
    );

    if (dayMatchedRecords.length === 0) {
      return {
        warning: `Pengajar tidak tersedia pada hari ${dayName} di cabang ini, silakan hubungi cabang domisili.`,
        availableDateLabels,
      };
    }

    const startTime = parseTimeValue(draft.waktuMulai);
    const endTime = parseTimeValue(draft.waktuSelesai);
    if (startTime !== null && endTime !== null && startTime < endTime) {
      const hasMatchingTime = dayMatchedRecords.some((record) => {
        const placementStart = parseTimeValue(record["Jam Mulai"] || "");
        const placementEnd = parseTimeValue(record["Jam Selesai"] || "");
        if (placementStart === null || placementEnd === null) {
          return true;
        }
        return startTime >= placementStart && endTime <= placementEnd;
      });

      if (!hasMatchingTime) {
        return {
          warning:
            "Pengajar tidak tersedia pada rentang jam tersebut di cabang ini.",
          availableDateLabels,
        };
      }
    }

    return { warning: "", availableDateLabels };
  }, [
    activeScheduleDates,
    allScheduleEntries,
    draft.pengajar,
    draft.waktuMulai,
    draft.waktuSelesai,
    editingSlot,
    izinRecords,
    approvedPermintaanRecords,
    penempatanRecords,
  ]);

  const monitoringRows = useMemo(() => {
    const allowedDates = new Set(monthScheduleDates.map((slot) => slot.date));
    return monthScheduleGroups.map((group) => {
      const mapelCounter = new Map<string, number>();
      const mapelCountByKode = new Map<string, number>();
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
          mapelCountByKode.set(mapel, (mapelCountByKode.get(mapel) || 0) + 1);
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
        mapelCountByKode: Object.fromEntries(mapelCountByKode),
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

  const filteredPengajarRecords = useMemo(() => {
    const source = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    if (!query.trim()) {
      return source;
    }

    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [pengajarRecords, query, restrictedCabang]);

  const filteredPenempatanRecords = useMemo(() => {
    const source = restrictedCabang
      ? penempatanRecords.filter(
          (record) => normalizeText(record.Domisili || "") === normalizeText(restrictedCabang)
        )
      : penempatanRecords;
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [penempatanRecords, query, restrictedCabang]);

  const filteredIzinRecords = useMemo(() => {
    const source = izinRecords.filter((record) => {
      if (!restrictedCabang) {
        return true;
      }
      const cabangTarget = normalizeText(record["Cabang Target"] || "");
      const cabangKey = normalizeText(restrictedCabang);
      return cabangTarget === cabangKey;
    });
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [izinRecords, query, restrictedCabang]);

  const filteredPermintaanRecords = useMemo(() => {
    const source = permintaanRecords.filter((record) => {
      if (!restrictedCabang) {
        return true;
      }
      const cabangPeminta = normalizeText(record["Cabang Peminta"] || "");
      const dariCabang = normalizeText(record["Dari Cabang"] || "");
      const cabangKey = normalizeText(restrictedCabang);
      return cabangPeminta === cabangKey || dariCabang === cabangKey;
    });
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [permintaanRecords, query, restrictedCabang]);

  const dashboardPendingRequests = useMemo(() => {
    return filteredPermintaanRecords
      .filter((record) => normalizeText(record.Status || "") === "menunggu")
      .map((record) => ({
        id: record.ID || `${record["Kode Pengajar"] || ""}-${record["Cabang Peminta"] || ""}`,
        kodePengajar: record["Kode Pengajar"] || "",
        namaPengajar: record["Nama Pengajar"] || "",
        cabangPeminta: record["Cabang Peminta"] || "",
        cabangDomisili: record["Dari Cabang"] || "",
        status: record.Status || "Menunggu",
      }));
  }, [filteredPermintaanRecords]);

  const dashboardScheduleItems = useMemo(() => {
    const scheduleItems: Array<RecordItem & { sourceLabel: string }> = [
      ...(records.bulanIni ?? []).map((item) => ({ ...item, sourceLabel: "Jadwal Reguler" })),
      ...(records.jadwalTambahanPelayanan ?? []).map((item) => ({ ...item, sourceLabel: "Jadwal Tambahan & Pelayanan" })),
    ];

    return scheduleItems
      .filter((item) => {
        const parsedDate = parseFlexibleDate(item["tanggalSheet"] || item["tanggal"] || "");
        if (!parsedDate) {
          return false;
        }
        if (!(item["mapel"] || "").trim() && !(item["pengajar"] || "").trim() && !(item["waktu"] || "").trim()) {
          return false;
        }
        if (restrictedCabang && normalizeText(item["cabang"] || "") !== normalizeText(restrictedCabang)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aStart = parseRangeFromString(a["waktu"] || "")?.start ?? Number.MAX_SAFE_INTEGER;
        const bStart = parseRangeFromString(b["waktu"] || "")?.start ?? Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      })
      .map((item, index) => ({
        id: item.id || `${item.sourceLabel}-${index}`,
        tanggal: item["tanggalSheet"] || item["tanggal"] || "",
        waktu: item["waktu"] || "",
        mapel: item["mapel"] || "",
        pengajar: item["pengajar"] || "",
        kelas: [item["kelas"] || "", item["sekolah"] || ""].filter(Boolean).join("\n"),
        cabang: item["cabang"] || "",
        sourceLabel: item.sourceLabel,
      }));
  }, [records.bulanIni, records.jadwalTambahanPelayanan, restrictedCabang]);

  const dashboardIzinRequests = useMemo(() => {
    return filteredIzinRecords
      .map((record, index) => {
        const status =
          (record["Keterangan Status"] || record.Status || "Menunggu").trim() || "Menunggu";
        return {
          id: record._id || `${record["Kode Pengajar"] || "izin"}-${index}`,
          namaPengajar: record["Nama Pengajar"] || "",
          domisili: record.Domisili || "",
          tanggalMulai: record["Tanggal Mulai"] || "",
          tanggalSelesai: record["Tanggal Selesai"] || "",
          keterangan: record.Keterangan || "",
          status,
          diputuskanOleh: record["Diputuskan Oleh"] || "",
          diputuskanPada: record["Diputuskan Pada"] || "",
        };
      })
      .sort((a, b) => {
        const aDate = parseFlexibleDate(a.tanggalMulai)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDate = parseFlexibleDate(b.tanggalMulai)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
  }, [filteredIzinRecords]);

  const handleUpdateIzinStatus = async (
    item: { id: string; namaPengajar: string },
    status: "Disetujui" | "Ditolak"
  ) => {
    if (!item.id) {
      pushToast("ID izin tidak ditemukan.", "error");
      return;
    }
    setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const selectedIzin = izinRecords.find((record) => record._id === item.id);
      const decidedBy = authSession?.roll === "admin" ? "Admin" : authSession?.cabang || "";
      const decidedAt = new Date().toISOString();
      await updateRow(item.id, {
        ...(selectedIzin || {}),
        "Keterangan Status": status,
        Status: status,
        "Diputuskan Oleh": decidedBy,
        "Diputuskan Pada": decidedAt,
      });

      if (status === "Disetujui" && selectedIzin) {
        const startDate = parseFlexibleDate(selectedIzin["Tanggal Mulai"] || "");
        const endDate = parseFlexibleDate(selectedIzin["Tanggal Selesai"] || "");
        const targetKode = normalizeText((selectedIzin["Kode Pengajar"] || "").trim().toLowerCase());
        const targetNama = normalizeText((selectedIzin["Nama Pengajar"] || "").trim());
        const targetCabangValues = (selectedIzin["Cabang Target"] || "")
          .split(",")
          .map((value) => normalizeText(value))
          .filter(Boolean);

        if (startDate && endDate && targetKode && targetCabangValues.length > 0) {
          const startKey = formatLocalDate(startDate);
          const endKey = formatLocalDate(endDate);
          const scheduleKeys: ScheduleMenuKey[] = ["bulanIni", "jadwalTambahanPelayanan"];
          const deletedIdsBySchedule: Record<ScheduleMenuKey, string[]> = {
            bulanIni: [],
            jadwalTambahanPelayanan: [],
          };

          for (const scheduleKey of scheduleKeys) {
            const matchingItems = (records[scheduleKey] ?? []).filter((scheduleItem) => {
              const scheduleDate = parseFlexibleDate(scheduleItem.tanggalSheet || scheduleItem.tanggal || "");
              if (!scheduleDate) {
                return false;
              }
              const scheduleDateKey = formatLocalDate(scheduleDate);
              if (scheduleDateKey < startKey || scheduleDateKey > endKey) {
                return false;
              }
              const schedulePengajar = normalizeText(scheduleItem.pengajar || "");
              if (schedulePengajar !== targetKode && schedulePengajar !== targetNama) {
                return false;
              }
              const scheduleCabang = normalizeText(scheduleItem.cabang || "");
              return targetCabangValues.includes(scheduleCabang);
            });

            const idsToDelete = matchingItems
              .map((scheduleItem) => scheduleItem.id)
              .filter((id): id is string => Boolean(id));

            if (idsToDelete.length > 0) {
              await deleteRowsByIds(idsToDelete);
              deletedIdsBySchedule[scheduleKey] = idsToDelete;
            }
          }

          const totalDeleted = Object.values(deletedIdsBySchedule).reduce(
            (sum, ids) => sum + ids.length,
            0
          );

          if (totalDeleted > 0) {
            setRecords((prev) => ({
              ...prev,
              bulanIni: (prev.bulanIni ?? []).filter(
                (item) => !deletedIdsBySchedule.bulanIni.includes(item.id)
              ),
              jadwalTambahanPelayanan: (prev.jadwalTambahanPelayanan ?? []).filter(
                (item) => !deletedIdsBySchedule.jadwalTambahanPelayanan.includes(item.id)
              ),
            }));
            pushToast(
              `${totalDeleted} jadwal pengajar pada rentang izin berhasil dihapus.`,
              "success"
            );
          }
        }
      }

      await handleLoadIzinPengajar();
      await Promise.all([
        handleLoadFromSheet("bulanIni", { preserveUiState: true }),
        handleLoadFromSheet("jadwalTambahanPelayanan", { preserveUiState: true }),
      ]);
      pushToast(`Status izin ${item.namaPengajar || "pengajar"} diperbarui ke ${status}.`, "success");
    } catch (error) {
      setIzinStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memperbarui status izin.",
      }));
      pushToast("Gagal memperbarui status izin.", "error");
    }
  };

  const suratTugasRecords = useMemo(() => {
    // Compute surat tugas records from jadwal reguler and jadwal khusus
    try {
      const regulerItems = records.bulanIni ?? [];
      const khususItems = records.jadwalTambahanPelayanan ?? [];
      const allItems = [...regulerItems, ...khususItems];

      const formatUpdatedLabel = (timestamp?: string) => {
        // Format: "Update-27 Apr 2026 14:19"
        if (!timestamp) {
          return "";
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
          return "";
        }
        const day = date.getDate();
        const month = date.toLocaleDateString("id-ID", { month: "short" });
        const year = date.getFullYear();
        const time = date.toLocaleTimeString("en-GB", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        return `Update-${day} ${month} ${year} ${time}`;
      };

      const grouped = new Map<string, Array<{ text: string; timestamp?: string }>>();
      allItems.forEach((item: any) => {
        const kodePengajar = (item.pengajar || "").trim();
        const mapel = (item.mapel || "").trim();
        const waktu = (item.waktu || "").trim();
        const cabang = (item.cabang || "").trim();
        const kelas = (item.kelas || "").trim();
        const sekolah = (item.sekolah || "").trim();
        const tanggalLabel = formatSheetTanggal(item.tanggal || "");
        if (!kodePengajar || !tanggalLabel || !mapel || !waktu) {
          return;
        }
        const kelasBaseLabel = [kelas, sekolah].filter(Boolean).join(" ");
        // Do not include raw gabungWith payload in the sesi text. Gabung classes
        // are handled and merged in the SuratTugas view so keep the base label only.
        const kelasLabel = kelasBaseLabel;
        const updateLabel = formatUpdatedLabel(item.updatedAt || item.createdAt);
        const sesiText = `${waktu}/${mapel}-${kelasLabel}/${cabang}${
          updateLabel ? ` ${updateLabel}` : ""
        }`;
        const key = `${normalizeValueKey(kodePengajar)}||${normalizeValueKey(tanggalLabel)}`;
        const list = grouped.get(key) ?? [];
        list.push({ text: sesiText, timestamp: item.updatedAt || item.createdAt });
        grouped.set(key, list);
      });

      const suratRows = Array.from(grouped.entries()).map(([key, sesiList]) => {
        const [kodeKey, tanggalKey] = key.split("||");
        const template = allItems.find(
          (item: any) =>
            normalizeValueKey(item.pengajar || "") === kodeKey &&
            normalizeValueKey(formatSheetTanggal(item.tanggal || "")) === tanggalKey
        );
        const tanggalLabel = template ? formatSheetTanggal(template.tanggal || "") : "";
        const row: Record<string, string> = {
          "Kode Pengajar": template?.pengajar || "",
          Tanggal: tanggalLabel,
        };
        for (let index = 0; index < 10; index += 1) {
          row[`Sesi ${index + 1}`] = sesiList[index]?.text || "";
        }
        return row;
      });

      return suratRows;
    } catch (error) {
      console.error("Error computing surat tugas records:", error);
      return [];
    }
  }, [records.bulanIni, records.jadwalTambahanPelayanan]);

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
    setCopyTargetDates([]);
    setConflictError("");
  };

  const handleLoadFromSheet = async (
    scheduleKey: ScheduleMenuKey = "bulanIni",
    options?: { preserveUiState?: boolean }
  ) => {
    setSheetStatus((prev) => ({ ...prev, loading: true }));
    setSheetStatusError("");
    try {
      const targetSheet = scheduleSheetByKey[scheduleKey];
      const bucket = dataBucket[targetSheet];
      const rows = (await listRows(bucket)).filter((row) => isMatchingScheduleJenis(row, scheduleKey));
      // If loading jadwal tambahan, cleanup any rows with dates in the past
      if (scheduleKey === "jadwalTambahanPelayanan") {
        const todayKey = formatLocalDate(new Date());
        const expiredIds: string[] = [];
        rows.forEach((row) => {
          const raw = toRecord(row);
          const tanggalStr = (raw.Tanggal as string) || (raw.tanggal as string) || "";
          const parsed = parseFlexibleDate(tanggalStr);
          if (parsed) {
            const parsedKey = formatLocalDate(parsed);
            if (parsedKey < todayKey) {
              expiredIds.push(row.id);
            }
          }
        });
        if (expiredIds.length > 0) {
          try {
            await deleteRowsByIds(expiredIds);
            // remove deleted rows from fetched list
            for (const id of expiredIds) {
              const idx = rows.findIndex((r) => r.id === id);
              if (idx >= 0) rows.splice(idx, 1);
            }
            pushToast(`${expiredIds.length} jadwal Tambahan kedaluwarsa telah dihapus.`, "info");
          } catch (err) {
            console.error("Failed to cleanup expired tambahan rows:", err);
          }
        }
      }
      const parsedRecords = rows.map((row, index) => {
        const item = parseAppsScriptRecords([toRecord(row)])[0];
        return {
          ...(item || {
            id: `${bucket}-${index}-${Date.now()}`,
            cabang: "",
            kelas: "",
            sekolah: "",
            tanggal: "",
            tanggalSheet: "",
            mapel: "",
            pengajar: "",
            waktu: "",
            classOrder: "",
            catatan: "",
          }),
          id: row.id,
          updatedAt: row.updatedAt || row.createdAt,
          createdAt: row.createdAt,
        } as RecordItem & { updatedAt?: string; createdAt?: string };
      });
      setRecords((prev) => ({
        ...prev,
        [scheduleKey]: parsedRecords,
      }));
      if (!options?.preserveUiState) {
        clearEditing();
        setQuery("");
      }
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
        error: "Gagal memuat data dari database.",
      }));
      pushToast("Gagal memuat data jadwal dari database.", "error");
    }
  };

  const handleLoadMapel = async () => {
    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Mata Pelajaran"]);
      const parsed = rows.map((row) => toRecord(row));
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
        error: "Gagal memuat data mata pelajaran dari database.",
      }));
      pushToast("Gagal memuat data mata pelajaran.", "error");
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
      const bucket = dataBucket["Mata Pelajaran"];
      const rows = await listRows(bucket);
      const existing = rows.find((row) => {
        const value = row.data.Mapel || "";
        return normalizeValueKey(value) === normalizeValueKey(editingMapelOldName || mapel);
      });

      if (existing) {
        await updateRow(existing.id, { Mapel: mapel, Kode_Mapel: kode });
      } else {
        await insertRow(bucket, { Mapel: mapel, Kode_Mapel: kode });
      }

      setIsMapelModalOpen(false);
      handleLoadMapel();
      pushToast("Data mata pelajaran berhasil disimpan.", "success");
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan mata pelajaran."
      }));
      pushToast("Gagal menyimpan mata pelajaran.", "error");
    }
  };

  const handleDeleteMapel = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus mata pelajaran ${record.Mapel}?`,
      async () => {
        setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["Mata Pelajaran"]);
          const targetIds = rows
            .filter((row) => normalizeValueKey(row.data.Mapel) === normalizeValueKey(record.Mapel))
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);

          handleLoadMapel();
          pushToast("Data mata pelajaran berhasil dihapus.", "success");
        } catch (error) {
          setMapelStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus mata pelajaran."
          }));
          pushToast("Gagal menghapus mata pelajaran.", "error");
        }
      },
      { title: "Hapus Mata Pelajaran", confirmLabel: "Hapus" }
    );
  };

  const handleLoadPengajar = async () => {
    setPengajarStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Data Pengajar"]);
      const expectedHeaders = ["Kode Pengajar", "Nama", "Bidang Studi", "Email", "No.WhatsApp", "Domisili", "Username", "Password"];

      const records = rows
        .map((row) => toRecord(row))
        .filter((record) => {
          const candidateKeys = ["Kode Pengajar", "kode_pengajar", "Kode", "kode", "Nama", "nama"];
          return candidateKeys.some((key) => (record[key] || "").trim());
        })
        .map((record) => {
          const normalized: Record<string, string> = {};
          expectedHeaders.forEach((header) => {
            const matchedKey = Object.keys(record).find((key) => normalizeHeader(key) === normalizeHeader(header));
            normalized[header] = matchedKey ? String(record[matchedKey] ?? "") : "";
          });

          if (!normalized["Kode Pengajar"] && record.kode_pengajar) {
            normalized["Kode Pengajar"] = String(record.kode_pengajar);
          }
          if (!normalized["Nama"] && record.nama) {
            normalized["Nama"] = String(record.nama);
          }
          if (!normalized["Domisili"] && record.domisili) {
            normalized["Domisili"] = String(record.domisili);
          }
          if (!normalized["Bidang Studi"] && record.bidang_studi) {
            normalized["Bidang Studi"] = String(record.bidang_studi);
          }
          if (!normalized["Email"] && record.email) {
            normalized["Email"] = String(record.email);
          }
          if (!normalized["No.WhatsApp"] && record.no_whatsapp) {
            normalized["No.WhatsApp"] = String(record.no_whatsapp);
          }
          if (!normalized["Username"] && record.username) {
            normalized["Username"] = String(record.username);
          }
          if (!normalized["Password"] && record.password) {
            normalized["Password"] = String(record.password);
          }

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
      pushToast("Gagal memuat data pengajar.", "error");
    }
  };

  const handleOpenPengajarModal = (record?: Record<string, string>) => {
    if (record) {
      const existingNama = record["Nama"] || "";
      const existingKode = (record["Kode Pengajar"] || "").trim();
      const existingWhatsapp = record["No.WhatsApp"] || "";
      const computedUsername = sanitizeWhatsappDigits(existingWhatsapp);
      setPengajarDraft({
        "Kode Pengajar": existingKode || generateUniqueKodePengajar(existingNama),
        "Nama": existingNama,
        "Bidang Studi": record["Bidang Studi"] || "",
        "Email": record["Email"] || "",
        "No.WhatsApp": existingWhatsapp,
        "Domisili": restrictedCabang || record["Domisili"] || "",
        "Username": computedUsername || record["Username"] || "",
        "Password": sanitizePasswordInput(record["Password"] || ""),
      });
      setEditingPengajarOldKode(record["Kode Pengajar"]);
    } else {
      const defaultCabang = restrictedCabang || authSession?.cabang || "";
      setPengajarDraft({
        "Kode Pengajar": "",
        "Nama": "",
        "Bidang Studi": "",
        "Email": "",
        "No.WhatsApp": "",
        "Domisili": defaultCabang,
        "Username": "",
        "Password": generatePassword(),
      });
      setEditingPengajarOldKode(null);
    }
    setPengajarError("");
    setIsPengajarModalOpen(true);
  };

  const handlePengajarDraftChange = (field: keyof PengajarDraft, value: string) => {
    if (field === "Kode Pengajar" || field === "Username") {
      return;
    }

    if (field === "Domisili" && restrictedCabang) {
      return;
    }

    if (field === "Nama") {
      const nama = value;
      const autoKode = generateUniqueKodePengajar(nama, editingPengajarOldKode);
      setPengajarDraft((prev) => ({
        ...prev,
        Nama: nama,
        "Kode Pengajar": autoKode,
      }));
      return;
    }

    if (field === "No.WhatsApp") {
      const sanitizedUsername = sanitizeWhatsappDigits(value);
      setPengajarDraft((prev) => ({
        ...prev,
        "No.WhatsApp": value,
        Username: sanitizedUsername,
      }));
      return;
    }

    if (field === "Password") {
      setPengajarDraft((prev) => ({ ...prev, Password: sanitizePasswordInput(value) }));
      return;
    }

    setPengajarDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleBidangStudiChange = (values: string[]) => {
    const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
    setPengajarDraft((prev) => ({
      ...prev,
      "Bidang Studi": uniqueValues.join(", "),
    }));
  };

  const handleGeneratePengajarPassword = () => {
    setPengajarDraft((prev) => ({ ...prev, Password: generatePassword() }));
  };

  const handleLoadSuratTugas = async () => {
    setSuratTugasStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      // Data is now computed automatically from jadwal_reguler and jadwal_khusus
      // No need to load from database, just update the sync status
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async
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
      pushToast("Gagal memuat data surat tugas.", "error");
    }
  };

  const handleSavePengajar = async () => {
    if (!pengajarDraft["Kode Pengajar"] || !pengajarDraft["Nama"]) {
      setPengajarError("Nama wajib diisi agar Kode Pengajar terisi otomatis.");
      return;
    }
    if (!pengajarDraft.Domisili) {
      setPengajarError("Domisili belum terdeteksi dari akun login. Silakan login ulang dengan akun cabang.");
      return;
    }
    if (!pengajarDraft.Username) {
      setPengajarError("No.WhatsApp wajib diisi agar Username terisi otomatis.");
      return;
    }
    if (!pengajarDraft["Bidang Studi"].trim()) {
      setPengajarError("Bidang Studi wajib dipilih minimal satu mata pelajaran.");
      return;
    }
    if (!pengajarDraft.Password || pengajarDraft.Password.length > 6) {
      setPengajarError("Password wajib diisi dengan kombinasi huruf/angka maksimal 6 karakter.");
      return;
    }
    const normalizedRecord: PengajarDraft = {
      ...pengajarDraft,
      "Kode Pengajar": pengajarDraft["Kode Pengajar"].trim().toLowerCase(),
      Nama: pengajarDraft.Nama.trim(),
      "Bidang Studi": pengajarDraft["Bidang Studi"].trim(),
      Email: pengajarDraft.Email.trim(),
      "No.WhatsApp": pengajarDraft["No.WhatsApp"].trim(),
      Domisili: (restrictedCabang || authSession?.cabang || pengajarDraft.Domisili).trim(),
      Username: sanitizeWhatsappDigits(pengajarDraft["No.WhatsApp"] || pengajarDraft.Username),
      Password: sanitizePasswordInput(pengajarDraft.Password),
    };

    if (!normalizedRecord.Username) {
      setPengajarError("No.WhatsApp tidak valid. Username otomatis tidak boleh kosong.");
      return;
    }

    setPengajarStatus((prev) => ({ ...prev, loading: true }));
    try {
      const bucket = dataBucket["Data Pengajar"];
      const rows = await listRows(bucket);
      const existing = rows.find(
        (row) =>
          normalizeValueKey(row.data["Kode Pengajar"]) ===
          normalizeValueKey(editingPengajarOldKode || normalizedRecord["Kode Pengajar"])
      );
      if (existing) {
        await updateRow(existing.id, normalizedRecord);
      } else {
        await insertRow(bucket, normalizedRecord);
      }

      setIsPengajarModalOpen(false);
      handleLoadPengajar();
      pushToast("Data pengajar berhasil disimpan.", "success");
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan pengajar.",
      }));
      pushToast("Gagal menyimpan data pengajar.", "error");
    }
  };

  const handleDeletePengajar = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus pengajar ${record["Nama"]}?`,
      async () => {
        setPengajarStatus((prev) => ({ ...prev, loading: true }));
        try {
          const rows = await listRows(dataBucket["Data Pengajar"]);
          const targetIds = rows
            .filter(
              (row) =>
                normalizeValueKey(row.data["Kode Pengajar"]) ===
                normalizeValueKey(record["Kode Pengajar"])
            )
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);

          handleLoadPengajar();
          pushToast("Data pengajar berhasil dihapus.", "success");
        } catch (error) {
          setPengajarStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus pengajar.",
          }));
          pushToast("Gagal menghapus data pengajar.", "error");
        }
      },
      { title: "Hapus Pengajar", confirmLabel: "Hapus" }
    );
  };

  const getPenempatanDomisili = (record: Record<string, string>) => {
    const kode = normalizeText(record["Kode Pengajar"] || record["kode pengajar"] || "");
    if (kode) {
      const matchedPengajar = pengajarByKode[kode];
      const pengajarDomisili = matchedPengajar?.["Domisili"] || "";
      if (pengajarDomisili.trim()) {
        return pengajarDomisili.trim();
      }
    }
    return record["Domisili"] || "";
  };

  const normalizePenempatanRecord = (record: Record<string, string>) => {
    const domisili = getPenempatanDomisili(record);
    
    return {
      "Kode Pengajar": record["Kode Pengajar"] || "",
      "Nama Pengajar": record["Nama Pengajar"] || record["Nama"] || "",
      Domisili: domisili,
      Hari: record.Hari || "",
      "Jam Mulai": record["Jam Mulai"] || "",
      "Jam Selesai": record["Jam Selesai"] || "",
      "Cabang Penempatan": record["Cabang Penempatan"] || "",
    };
  };

  const handleLoadPenempatanPengajar = async () => {
    setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Penempatan Pengajar"]);
      
      // Display each database row as-is without merging
      const normalized = rows.map((row) => {
        const record = toRecord(row);
        return normalizePenempatanRecord({
          "Kode Pengajar": record["Kode Pengajar"] || "",
          "Nama Pengajar": record["Nama Pengajar"] || record["Nama"] || "",
          Domisili: record.Domisili || "",
          Hari: record.Hari || record.hari_tersedia || "",
          "Jam Mulai": record["Jam Mulai"] || record.jam_mulai || "",
          "Jam Selesai": record["Jam Selesai"] || record.jam_selesai || "",
          "Cabang Penempatan": record["Cabang Penempatan"] || record.bersedia_mengajar_dicabang || "",
        });
      });

      setPenempatanRecords(normalized);
      setPenempatanStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setPenempatanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data penempatan pengajar dari database.",
      }));
      pushToast("Gagal memuat data penempatan pengajar.", "error");
    }
  };

  const handlePenempatanDraftChange = (next: PenempatanDraft) => {
    const selectedKode = normalizeText(next.kodePengajar || "");
    const prevKode = normalizeText(penempatanDraft.kodePengajar || "");
    const selectedPengajar = selectedKode ? pengajarByKode[selectedKode] : null;

    const resolvedDraft: PenempatanDraft = {
      ...next,
      namaPengajar: selectedPengajar
        ? selectedPengajar["Nama"] || next.namaPengajar
        : next.namaPengajar,
      domisili: selectedPengajar
        ? selectedPengajar["Domisili"] || next.domisili
        : next.domisili,
    };

    if (!selectedKode) {
      resolvedDraft.namaPengajar = "";
      resolvedDraft.domisili = restrictedCabang || "";
    }

    if (selectedKode !== prevKode) {
      setPenempatanError("");
    }

    setPenempatanDraft(resolvedDraft);
  };

    const handleSavePenempatanDay = async (item: { hari: string; jamMulai: string; jamSelesai: string; cabangList: string[] }) => {
      const canManagePenempatan = isAdmin || (restrictedCabang && normalizeText(penempatanDraft.domisili || "") === normalizeText(restrictedCabang));
      
      if (!canManagePenempatan) {
        pushToast("Anda hanya dapat menyimpan data penempatan pengajar dari cabang domisili Anda.", "error");
        return;
      }

      const draftValue = {
        ...penempatanDraft,
        kodePengajar: penempatanDraft.kodePengajar.trim(),
        namaPengajar: penempatanDraft.namaPengajar.trim(),
        domisili: penempatanDraft.domisili.trim(),
        availabilityList: [
          {
            hari: titleCase(item.hari),
            enabled: true,
            jamMulai: item.jamMulai.trim(),
            jamSelesai: item.jamSelesai.trim(),
            cabangList: (item.cabangList || []).map((c) => String(c || "").trim()).filter(Boolean),
          },
        ],
      } as PenempatanDraft;

      if (!draftValue.kodePengajar || !draftValue.namaPengajar) {
        setPenempatanError("Pengajar wajib dipilih.");
        return;
      }
      if (!draftValue.domisili) {
        setPenempatanError("Domisili wajib diisi.");
        return;
      }

      const av = draftValue.availabilityList[0];
      if (!av.jamMulai || !av.jamSelesai || parseTimeValue(av.jamMulai) === null || parseTimeValue(av.jamSelesai) === null) {
        setPenempatanError(`Jam mulai dan selesai wajib diisi untuk hari ${av.hari}.`);
        return;
      }
      if (av.jamMulai >= av.jamSelesai) {
        setPenempatanError(`Jam mulai harus lebih awal dari jam selesai untuk hari ${av.hari}.`);
        return;
      }
      if (av.cabangList.length === 0) {
        setPenempatanError(`Pilih minimal satu cabang penempatan untuk hari ${av.hari}.`);
        return;
      }

      const pengajarRows = await listRows(dataBucket["Data Pengajar"]);
      const matchingPengajar = pengajarRows.find(
        (row) => normalizeValueKey(row.data["Kode Pengajar"]) === normalizeValueKey(draftValue.kodePengajar)
      );
      const resolvedPengajarId = matchingPengajar ? decodeId(matchingPengajar.id).id : "";

      if (!resolvedPengajarId) {
        setPenempatanError("Tidak dapat menemukan ID pengajar yang sesuai untuk data penempatan ini.");
        return;
      }

      const payload = {
        ...buildPenempatanPayload(draftValue, resolvedPengajarId),
        Hari: av.hari,
        "Jam Mulai": av.jamMulai,
        "Jam Selesai": av.jamSelesai,
        "Cabang Penempatan": av.cabangList.join(", "),
        __availability_json: JSON.stringify([av]),
      };

      setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const bucket = dataBucket["Penempatan Pengajar"];
        const rows = await listRows(bucket);
        const targetKode = normalizeValueKey(draftValue.kodePengajar);
        const targetIds = rows
          .filter((row) => normalizeValueKey(row.data["Kode Pengajar"]) === targetKode)
          .map((row) => row.id);
        await deleteRowsByIds(targetIds);
        await insertRow(bucket, payload);
        await handleLoadPenempatanPengajar();
        pushToast(`Penempatan hari ${av.hari} berhasil disimpan.`, "success");
      } catch (error) {
        setPenempatanStatus((prev) => ({
          ...prev,
          loading: false,
          error: "Gagal menyimpan penempatan pengajar.",
        }));
        pushToast("Gagal menyimpan penempatan pengajar.", "error");
      }
    };

  const handleSavePenempatanPengajar = async () => {
    const canManagePenempatan = isAdmin || (restrictedCabang && normalizeText(penempatanDraft.domisili || "") === normalizeText(restrictedCabang));
    
    if (!canManagePenempatan) {
      setPenempatanError("Anda hanya dapat menyimpan data penempatan pengajar dari cabang domisili Anda.");
      return;
    }

    const draftValue = {
      ...penempatanDraft,
      kodePengajar: penempatanDraft.kodePengajar.trim(),
      namaPengajar: penempatanDraft.namaPengajar.trim(),
      domisili: penempatanDraft.domisili.trim(),
      availabilityList: penempatanDraft.availabilityList
        .filter((item) => item.enabled)
        .map((item) => ({
          ...item,
          hari: titleCase(item.hari),
          jamMulai: item.jamMulai.trim(),
          jamSelesai: item.jamSelesai.trim(),
          cabangList: Array.from(
            new Set(
              (restrictedCabang ? [restrictedCabang] : item.cabangList)
                .map((cabang) => cabang.trim())
                .filter(Boolean)
            )
          ),
        })),
    };

    if (!draftValue.kodePengajar || !draftValue.namaPengajar) {
      setPenempatanError("Pengajar wajib dipilih.");
      return;
    }
    if (!draftValue.domisili) {
      setPenempatanError("Domisili wajib diisi.");
      return;
    }
    if (draftValue.availabilityList.length === 0) {
      setPenempatanError("Pilih minimal satu hari tersedia.");
      return;
    }
    const invalidAvailability = draftValue.availabilityList.find(
      (item) =>
        !item.jamMulai || !item.jamSelesai || parseTimeValue(item.jamMulai) === null || parseTimeValue(item.jamSelesai) === null
    );
    if (invalidAvailability) {
      setPenempatanError(`Jam mulai dan selesai wajib diisi untuk hari ${invalidAvailability.hari}.`);
      return;
    }
    const invalidOrder = draftValue.availabilityList.find((item) => item.jamMulai >= item.jamSelesai);
    if (invalidOrder) {
      setPenempatanError(`Jam mulai harus lebih awal dari jam selesai untuk hari ${invalidOrder.hari || "(kosong)"}.`);
      return;
    }
    const missingHari = draftValue.availabilityList.find((item) => !item.hari.trim());
    if (missingHari) {
      setPenempatanError("Pilih hari untuk semua baris penempatan.");
      return;
    }
    const missingCabangAvailability = draftValue.availabilityList.find(
      (item) => item.cabangList.length === 0
    );
    if (missingCabangAvailability) {
      setPenempatanError(`Pilih minimal satu cabang penempatan untuk hari ${missingCabangAvailability.hari}.`);
      return;
    }

    const pengajarRows = await listRows(dataBucket["Data Pengajar"]);
    const matchingPengajar = pengajarRows.find(
      (row) => normalizeValueKey(row.data["Kode Pengajar"]) === normalizeValueKey(draftValue.kodePengajar)
    );
    const resolvedPengajarId = matchingPengajar ? decodeId(matchingPengajar.id).id : "";

    if (!resolvedPengajarId) {
      setPenempatanError("Tidak dapat menemukan ID pengajar yang sesuai untuk data penempatan ini.");
      return;
    }

    setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Penempatan Pengajar"];
      const rows = await listRows(bucket);
      const targetKode = normalizeValueKey(draftValue.kodePengajar);
      const targetIds = rows
        .filter((row) => normalizeValueKey(row.data["Kode Pengajar"]) === targetKode)
        .map((row) => row.id);
      await deleteRowsByIds(targetIds);
      
      // Create separate rows for each enabled availability entry (each day)
      const enabledAvailabilities = draftValue.availabilityList.filter((item) => item.enabled);
      for (const availability of enabledAvailabilities) {
        // For each cabang in this day's cabangList, create a separate row
        const cabangsForDay = availability.cabangList.length > 0 ? availability.cabangList : [""];
        for (const cabang of cabangsForDay) {
          const rowPayload = {
            "Kode Pengajar": draftValue.kodePengajar,
            "Nama Pengajar": draftValue.namaPengajar,
            Domisili: draftValue.domisili,
            Hari: availability.hari,
            "Jam Mulai": availability.jamMulai,
            "Jam Selesai": availability.jamSelesai,
            "Cabang Penempatan": cabang,
            "__id_pengajar": resolvedPengajarId,
          };
          await insertRow(bucket, rowPayload);
        }
      }
      
      setIsPenempatanModalOpen(false);
      setPenempatanError("");
      await handleLoadPenempatanPengajar();
      pushToast("Penempatan pengajar berhasil disimpan.", "success");
    } catch (error) {
      setPenempatanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan penempatan pengajar.",
      }));
      pushToast("Gagal menyimpan penempatan pengajar.", "error");
    }
  };

  const normalizeIzinRecord = (record: Record<string, string>) => {
    const startDate = parseFlexibleDate(record["Tanggal Mulai"] || "");
    const endDate = parseFlexibleDate(record["Tanggal Selesai"] || "");
    const decidedAtRaw =
      record["Diputuskan Pada"] || record["diputuskan_pada"] || "";
    const decidedAtDate = decidedAtRaw ? new Date(decidedAtRaw) : null;
    const decidedAt =
      decidedAtDate && !Number.isNaN(decidedAtDate.getTime())
        ? decidedAtDate.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        : decidedAtRaw;
    return {
      // Keep encoded row id from database for reliable update/delete.
      _id: record._id || record.ID || record.Id || record.id || "",
      "Kode Pengajar": (record["Kode Pengajar"] || "").trim().toLowerCase(),
      "Nama Pengajar": record["Nama Pengajar"] || record.Nama || "",
      Domisili: record.Domisili || "",
      "Cabang Target": record["Cabang Target"] || record["cabang_target"] || "",
      "Tanggal Mulai": startDate ? formatScheduleLabel(startDate) : "",
      "Tanggal Selesai": endDate ? formatScheduleLabel(endDate) : "",
      Keterangan: record.Keterangan || "",
      "Keterangan Status": record["Keterangan Status"] || record.Status || "Menunggu",
      "Diputuskan Oleh": record["Diputuskan Oleh"] || record["diputuskan_oleh"] || "",
      "Diputuskan Pada": decidedAt,
      "Diputuskan Pada Raw": decidedAtRaw,
    };
  };

  const handleLoadIzinPengajar = async () => {
    setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Izin Pengajar"]);
      console.debug("[debug] loaded izin rows count:", rows.length);
      const normalized = rows
        .map((row) => ({ ...toRecord(row), _id: row.id }))
        .map((record) => normalizeIzinRecord(record));
      console.debug("[debug] normalized izin records count:", normalized.length);
      setIzinRecords(normalized);
      setIzinStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setIzinStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data izin pengajar.",
      }));
      pushToast("Gagal memuat data izin pengajar.", "error");
    }
  };

  const canManageIzinRecord = (record: Record<string, string>) => {
    if (authSession?.roll === "admin") {
      return true;
    }
    const currentCabangKey = normalizeText(restrictedCabang || authSession?.cabang || "");
    if (!currentCabangKey) {
      return true;
    }
    return normalizeText(record.Domisili || "") === currentCabangKey;
  };

  const handleOpenIzinModal = (record?: Record<string, string>) => {
    if (record) {
      if (!canManageIzinRecord(record)) {
        pushToast("Hanya cabang domisili yang dapat mengedit izin ini.", "error");
        return;
      }
      setIzinDraft({
        kodePengajar: (record["Kode Pengajar"] || "").trim().toLowerCase(),
        namaPengajar: record["Nama Pengajar"] || "",
        domisili: restrictedCabang || record.Domisili || "",
        cabangTarget: record["Cabang Target"] || "",
        tanggalMulai: formatLocalDate(parseFlexibleDate(record["Tanggal Mulai"] || "") || new Date()),
        tanggalSelesai: formatLocalDate(parseFlexibleDate(record["Tanggal Selesai"] || "") || new Date()),
        keterangan: record.Keterangan || "",
      });
      setEditingIzinId(record._id || null);
    } else {
      const defaultDomisili = restrictedCabang || authSession?.cabang || "";
      const today = formatLocalDate(new Date());
      setIzinDraft({
        kodePengajar: "",
        namaPengajar: "",
        domisili: defaultDomisili,
        cabangTarget: "",
        tanggalMulai: today,
        tanggalSelesai: today,
        keterangan: "",
      });
      setEditingIzinId(null);
    }
    setIzinError("");
    setIsIzinModalOpen(true);
  };

  const handleSaveIzinPengajar = async () => {
    const normalized = {
      ...izinDraft,
      kodePengajar: izinDraft.kodePengajar.trim().toLowerCase(),
      namaPengajar: izinDraft.namaPengajar.trim(),
      domisili: (restrictedCabang || izinDraft.domisili).trim(),
      cabangTarget: izinDraft.cabangTarget.trim(),
      tanggalMulai: izinDraft.tanggalMulai.trim(),
      tanggalSelesai: izinDraft.tanggalSelesai.trim(),
      keterangan: izinDraft.keterangan.trim(),
    };

    if (!normalized.kodePengajar || !normalized.namaPengajar) {
      setIzinError("Pengajar wajib dipilih.");
      return;
    }
    if (!normalized.cabangTarget) {
      setIzinError("Cabang Target wajib diisi.");
      return;
    }
    const startDate = parseFlexibleDate(normalized.tanggalMulai);
    const endDate = parseFlexibleDate(normalized.tanggalSelesai);
    if (!startDate || !endDate) {
      setIzinError("Tanggal mulai dan selesai wajib diisi.");
      return;
    }
    if (startDate > endDate) {
      setIzinError("Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.");
      return;
    }

    const record = {
      "Kode Pengajar": normalized.kodePengajar,
      "Nama Pengajar": normalized.namaPengajar,
      Domisili: normalized.domisili,
      "Cabang Target": normalized.cabangTarget,
      "Tanggal Mulai": formatScheduleLabel(startDate),
      "Tanggal Selesai": formatScheduleLabel(endDate),
      Keterangan: normalized.keterangan,
      "Keterangan Status":
        (editingIzinId
          ? izinRecords.find((item) => item._id === editingIzinId)?.["Keterangan Status"]
          : "") || "Menunggu",
      "Diputuskan Oleh":
        (editingIzinId
          ? izinRecords.find((item) => item._id === editingIzinId)?.["Diputuskan Oleh"]
          : "") || "",
      "Diputuskan Pada":
        (editingIzinId
          ? izinRecords.find((item) => item._id === editingIzinId)?.["Diputuskan Pada"]
          : "") || "",
      "Diputuskan Pada Raw":
        (editingIzinId
          ? izinRecords.find((item) => item._id === editingIzinId)?.["Diputuskan Pada Raw"]
          : "") || "",
    };

    setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Izin Pengajar"];
      if (editingIzinId) {
        await updateRow(editingIzinId, record);
      } else {
        await insertRow(bucket, record);
      }
      setIsIzinModalOpen(false);
      setIzinError("");
      await handleLoadIzinPengajar();
      pushToast("Izin pengajar berhasil disimpan.", "success");
    } catch (error) {
      setIzinStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan izin pengajar.",
      }));
      pushToast("Gagal menyimpan izin pengajar.", "error");
    }
  };

  const handleDeleteIzinPengajar = (record: Record<string, string>) => {
    if (!canManageIzinRecord(record)) {
      pushToast("Hanya cabang domisili yang dapat menghapus izin ini.", "error");
      return;
    }
    openConfirmDialog(
      `Hapus izin untuk ${record["Nama Pengajar"] || record["Kode Pengajar"]}?`,
      async () => {
        setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const targetId = record._id;
          if (targetId) {
            await deleteRowsByIds([targetId]);
          }
          await handleLoadIzinPengajar();
          pushToast("Izin pengajar berhasil dihapus.", "success");
        } catch (error) {
          setIzinStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus izin pengajar.",
          }));
          pushToast("Gagal menghapus izin pengajar.", "error");
        }
      },
      { title: "Hapus Izin", confirmLabel: "Hapus" }
    );
  };

  const normalizePermintaanRecord = (record: Record<string, string>) => {
    const jamMulai = formatTimeHHMM(record["Jam Mulai"] || "");
    const jamSelesai = formatTimeHHMM(record["Jam Selesai"] || "");
    
    // Support both old and new schema
    const tanggalDimitaRaw = String(record["Tanggal Diminta"] || record["TanggalDiminta"] || "").trim();
    const tanggalDimitaParsed = parseFlexibleDate(tanggalDimitaRaw);
    
    return {
      ID: record.ID || record.Id || record.id || `REQ-${Date.now()}`,
      "Kode Pengajar": record["Kode Pengajar"] || "",
      "Nama Pengajar": record["Nama Pengajar"] || "",
      "Dari Cabang": record["Dari Cabang"] || "",
      "Cabang Peminta": record["Cabang Peminta"] || "",
      "Tanggal Diminta": tanggalDimitaParsed ? formatScheduleLabel(tanggalDimitaParsed) : "",
      "Jam Mulai": jamMulai,
      "Jam Selesai": jamSelesai,
      Status: record.Status || "Menunggu",
      Catatan: record.Catatan || "",
    };
  };

  const handleLoadPermintaanPengajar = async () => {
    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
      console.debug("[debug] loaded permintaan rows count:", rows.length);
      const normalized = rows
        .map((row) => toRecord(row))
        .map((record) => normalizePermintaanRecord(record));
      console.debug("[debug] normalized permintaan records count:", normalized.length, "restrictedCabang=", restrictedCabang);
      setPermintaanRecords(normalized);
      setPermintaanStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data permintaan pengajar antar cabang.",
      }));
      pushToast("Gagal memuat permintaan pengajar antar cabang.", "error");
    }
  };

  const handleLoadAccountsCabang = async () => {
    setAccountsCabangStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["accounts_cabang"]);
      const normalized = rows.map((row) => ({
        ...toRecord(row),
        id: row.id,
      }));
      setAccountsCabangRecords(normalized);
      setAccountsCabangStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setAccountsCabangStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data accounts_cabang.",
      }));
      pushToast("Gagal memuat data accounts_cabang.", "error");
    }
  };

  const handleOpenAccountsCabangModal = (record?: Record<string, string>) => {
    if (record) {
      setAccountsCabangDraft({
        Username: record.Username || "",
        Password: record.Password || "",
        Roll: record.Roll || "cabang",
        Cabang: record.Cabang || "",
      });
      setEditingAccountsCabangId(record.id || null);
    } else {
      setAccountsCabangDraft({
        Username: "",
        Password: "",
        Roll: "cabang",
        Cabang: "",
      });
      setEditingAccountsCabangId(null);
    }
    setAccountsCabangError("");
    setIsAccountsCabangModalOpen(true);
  };

  const handleAccountsCabangDraftChange = (field: keyof typeof accountsCabangDraft, value: string) => {
    setAccountsCabangDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAccountsCabang = async () => {
    const normalized = {
      Username: accountsCabangDraft.Username.trim(),
      Password: accountsCabangDraft.Password.trim(),
      Roll: (accountsCabangDraft.Roll.trim() || "cabang").trim(),
      Cabang: accountsCabangDraft.Cabang.trim(),
    };

    if (!normalized.Username) {
      setAccountsCabangError("Username wajib diisi.");
      return;
    }

    if (!normalized.Password) {
      setAccountsCabangError("Password wajib diisi.");
      return;
    }

    try {
      const rows = await listRows(dataBucket["accounts_cabang"]);
      const usernameConflict = rows.find((row) => {
        const currentId = editingAccountsCabangId ? decodeId(editingAccountsCabangId).id : null;
        return (
          normalizeValueKey(row.data.Username) === normalizeValueKey(normalized.Username) &&
          (!currentId || decodeId(row.id).id !== currentId)
        );
      });

      if (usernameConflict) {
        setAccountsCabangError("Username sudah digunakan oleh akun lain.");
        return;
      }

      if (editingAccountsCabangId) {
        await updateRow(editingAccountsCabangId, normalized);
        pushToast("Akun cabang berhasil diperbarui.", "success");
      } else {
        await insertRow(dataBucket["accounts_cabang"], normalized);
        pushToast("Akun cabang berhasil ditambahkan.", "success");
      }

      setIsAccountsCabangModalOpen(false);
      await handleLoadAccountsCabang();
    } catch (error) {
      setAccountsCabangError("Gagal menyimpan data accounts_cabang.");
      pushToast("Gagal menyimpan data accounts_cabang.", "error");
    }
  };

  const handleDeleteAccountsCabang = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus akun cabang ${record.Username || record.Cabang || "?"}?`,
      async () => {
        setAccountsCabangStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["accounts_cabang"]);
          const targetIds = rows
            .filter((row) => normalizeValueKey(row.data.Username) === normalizeValueKey(record.Username || ""))
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);
          await handleLoadAccountsCabang();
          pushToast("Akun cabang berhasil dihapus.", "success");
        } catch (error) {
          setAccountsCabangStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus akun cabang.",
          }));
          pushToast("Gagal menghapus akun cabang.", "error");
        }
      },
      { title: "Hapus Akun Cabang", confirmLabel: "Hapus" }
    );
  };

  const refreshAllData = async (showToast = false) => {
    if (!authSession || isRefreshingAll) {
      return;
    }
    setIsRefreshingAll(true);
    try {
      await Promise.all([
        handleLoadFromSheet("bulanIni", { preserveUiState: true }),
        handleLoadFromSheet("jadwalTambahanPelayanan", { preserveUiState: true }),
        handleLoadMapel(),
        handleLoadPengajar(),
        handleLoadSuratTugas(),
        handleLoadPenempatanPengajar(),
        handleLoadIzinPengajar(),
        handleLoadPermintaanPengajar(),
        handleLoadAccountsCabang(),
      ]);
      if (showToast) {
        pushToast("Semua data berhasil direfresh.", "success");
      }
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleRefreshAllData = async () => {
    await refreshAllData(true);
  };

  type ImportMode =
    | "schedule"
    | "mapel"
    | "pengajar"
    | "penempatan"
    | "suratTugas"
    | "permintaan"
    | "accountsCabang";

  const importTargetByMenu = {
    bulanIni: {
      bucket: dataBucket["Jadwal Bulan ini"],
      label: "Jadwal Reguler",
      mode: "schedule",
    },
    jadwalTambahanPelayanan: {
      bucket: dataBucket["Jadwal Khusus"],
      label: "Jadwal Tambahan & Pelayanan",
      mode: "schedule",
    },
    mataPelajaran: {
      bucket: dataBucket["Mata Pelajaran"],
      label: "Mata Pelajaran",
      mode: "mapel",
    },
    pengajar: {
      bucket: dataBucket["Data Pengajar"],
      label: "Pengajar",
      mode: "pengajar",
    },
    penempatanPengajar: {
      bucket: dataBucket["Penempatan Pengajar"],
      label: "Penempatan Pengajar",
      mode: "penempatan",
    },
    accounts_cabang: {
      bucket: dataBucket["accounts_cabang"],
      label: "accounts_cabang",
      mode: "accountsCabang",
    },
  } as const;

  const templateHeadersByMenu = {
    bulanIni: ["Cabang", "Kelas", "Tanggal", "Mapel", "Pengajar", "Waktu", "Urutan Kelas"],
    jadwalTambahanPelayanan: [
      "Cabang",
      "Kelas",
      "Sekolah",
      "Tanggal",
      "Mapel",
      "Pengajar",
      "Waktu",
      "Urutan Kelas",
    ],
    mataPelajaran: ["Mapel", "Kode_Mapel"],
    pengajar: [
      "Kode Pengajar",
      "Nama",
      "Bidang Studi",
      "Email",
      "No.WhatsApp",
      "Domisili",
      "Username",
      "Password",
    ],
    penempatanPengajar: [
      "Kode Pengajar",
      "Nama Pengajar",
      "Domisili",
      "Hari",
      "Jam Mulai",
      "Jam Selesai",
      "Bersedia Mengajar di Cabang",
    ],
    accounts_cabang: ["Username", "Password", "Roll", "Cabang"],
  } as const;

  const normalizeImportRows = (
    rows: Record<string, unknown>[],
    mode: ImportMode
  ): Record<string, string>[] => {
    if (mode === "schedule") {
      return rows
        .map((row) => {
          const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
          const parsedTanggal = parseFlexibleDate(tanggalRaw);
          return {
            Cabang: getEntryValue(row, ["Cabang"]).trim(),
            Kelas: getEntryValue(row, ["Kelas"]).trim(),
            Sekolah: getEntryValue(row, ["Sekolah"]).trim(),
            Tanggal: parsedTanggal ? formatScheduleLabel(parsedTanggal) : tanggalRaw.trim(),
            Mapel: getEntryValue(row, ["Mapel", "Mata Pelajaran"]).trim(),
            Pengajar: getEntryValue(row, ["Pengajar", "Guru"]).trim(),
            Waktu: getEntryValue(row, ["Waktu", "Jam"]).trim(),
            "Urutan Kelas": getEntryValue(row, ["Urutan Kelas", "Urutan", "Class Order"]).trim(),
          };
        })
        .filter(
          (row) =>
            (row.Cabang || row.Kelas || row.Sekolah) &&
            (row.Tanggal || row.Mapel || row.Pengajar || row.Waktu)
        );
    }

    if (mode === "mapel") {
      return rows
        .map((row) => ({
          Mapel: getEntryValue(row, ["Mapel", "Mata Pelajaran"]).trim(),
          Kode_Mapel: getEntryValue(row, ["Kode_Mapel", "Kode Mapel", "Singkatan"]).trim(),
        }))
        .filter((row) => row.Mapel || row.Kode_Mapel);
    }

    if (mode === "pengajar") {
      return rows
        .map((row) => ({
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          Nama: getEntryValue(row, ["Nama"]).trim(),
          "Bidang Studi": getEntryValue(row, ["Bidang Studi"]).trim(),
          Email: getEntryValue(row, ["Email"]).trim(),
          "No.WhatsApp": getEntryValue(row, ["No.WhatsApp", "No WhatsApp", "No WA"]).trim(),
          Domisili: getEntryValue(row, ["Domisili", "Cabang"]).trim(),
          Username: getEntryValue(row, ["Username"]).trim(),
          Password: getEntryValue(row, ["Password"]).trim(),
        }))
        .filter((row) => row["Kode Pengajar"] || row.Nama);
    }

    if (mode === "suratTugas") {
      return rows
        .map((row) => {
          const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
          const parsedTanggal = parseFlexibleDate(tanggalRaw);
          const payload: Record<string, string> = {
            "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
            Tanggal: parsedTanggal ? formatScheduleLabel(parsedTanggal) : tanggalRaw.trim(),
          };
          for (let index = 1; index <= 10; index += 1) {
            payload[`Sesi ${index}`] = getEntryValue(row, [`Sesi ${index}`]).trim();
          }
          return payload;
        })
        .filter((row) => row["Kode Pengajar"] || row.Tanggal);
    }

    if (mode === "penempatan") {
      return rows
        .map((row) => ({
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          "Nama Pengajar": getEntryValue(row, ["Nama Pengajar", "Nama"]).trim(),
          Domisili: getEntryValue(row, ["Domisili"]).trim(),
          Hari: getEntryValue(row, ["Hari", "Hari Tersedia"]).trim(),
          "Jam Mulai": formatTimeHHMM(getEntryValue(row, ["Jam Mulai", "Mulai"])),
          "Jam Selesai": formatTimeHHMM(getEntryValue(row, ["Jam Selesai", "Selesai"])),
          "Cabang Penempatan": getEntryValue(row, [
            "Cabang Penempatan",
            "Bersedia Mengajar di Cabang",
            "Bersedia Mengajar Dicabang",
            "bersedia_mengajar_dicabang",
          ]).trim(),
        }))
        .filter((row) => row["Kode Pengajar"] || row["Nama Pengajar"]);
    }

    if (mode === "accountsCabang") {
      return rows
        .map((row) => ({
          Username: getEntryValue(row, ["Username"]).trim(),
          Password: getEntryValue(row, ["Password"]).trim(),
          Roll: getEntryValue(row, ["Roll", "roll", "Role", "role"]).trim() || "cabang",
          Cabang: getEntryValue(row, ["Cabang"]).trim(),
        }))
        .filter((row) => row.Username || row.Cabang);
    }

    return rows
      .map((row) => {
        const tanggalMulaiRaw = getEntryValue(row, ["Tanggal Mulai"]);
        const tanggalSelesaiRaw = getEntryValue(row, ["Tanggal Selesai"]);
        const tanggalMulai = parseFlexibleDate(tanggalMulaiRaw);
        const tanggalSelesai = parseFlexibleDate(tanggalSelesaiRaw);
        return {
          ID: getEntryValue(row, ["ID"]).trim() || `REQ-${Date.now()}-${Math.round(Math.random() * 1000)}`,
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          "Nama Pengajar": getEntryValue(row, ["Nama Pengajar", "Nama"]).trim(),
          "Cabang Peminta": getEntryValue(row, ["Cabang Peminta"]).trim(),
          "Cabang Domisili": getEntryValue(row, ["Cabang Domisili"]).trim(),
          "Tanggal Mulai": tanggalMulai ? formatScheduleLabel(tanggalMulai) : tanggalMulaiRaw.trim(),
          "Tanggal Selesai": tanggalSelesai ? formatScheduleLabel(tanggalSelesai) : tanggalSelesaiRaw.trim(),
          "Tanggal Khusus": getEntryValue(row, ["Tanggal Khusus"]).trim(),
          Hari: getEntryValue(row, ["Hari", "Hari Tersedia"]).trim(),
          "Jam Mulai": formatTimeHHMM(getEntryValue(row, ["Jam Mulai"])),
          "Jam Selesai": formatTimeHHMM(getEntryValue(row, ["Jam Selesai"])),
          Status: getEntryValue(row, ["Status"]).trim() || "Menunggu",
          Catatan: getEntryValue(row, ["Catatan"]).trim(),
        };
      })
      .filter((row) => row["Kode Pengajar"] || row["Nama Pengajar"]);
  };

  const handleOpenExcelImport = () => {
    const canImport = isAdmin;
    if (!canImport) {
      pushToast("Import data Excel hanya tersedia untuk Admin.", "error");
      return;
    }
    importInputRef.current?.click();
  };

  const handleDownloadExcelTemplate = () => {
    const canDownloadTemplate = isAdmin;
    if (!canDownloadTemplate) {
      pushToast("Template Excel hanya tersedia untuk Admin.", "error");
      return;
    }

    const target = importTargetByMenu[activeKey as keyof typeof importTargetByMenu];
    const headers = templateHeadersByMenu[activeKey as keyof typeof templateHeadersByMenu];
    if (!target || !headers?.length) {
      pushToast("Template belum tersedia untuk menu ini.", "error");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([[...headers]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    const filename = `template-${target.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`;
    XLSX.writeFile(workbook, filename);
    pushToast(`Template ${target.label} berhasil diunduh.`, "success");
  };

  const handleExcelImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const target = importTargetByMenu[activeKey as keyof typeof importTargetByMenu];
    if (!target) {
      pushToast("Menu ini belum mendukung import Excel.", "error");
      return;
    }

    const canImport = isAdmin;
    if (!canImport) {
      pushToast("Import data Excel hanya tersedia untuk Admin.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        throw new Error("Sheet Excel tidak ditemukan.");
      }
      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });
      const normalizedRows = normalizeImportRows(rows, target.mode);
      if (normalizedRows.length === 0) {
        throw new Error("Data Excel kosong atau header tidak sesuai.");
      }

      const rowsToSave =
        target.mode === "penempatan"
          ? await Promise.all(
              normalizedRows.map(async (row) => {
                const kodePengajar = normalizeValueKey(String(row["Kode Pengajar"] || ""));
                if (!kodePengajar) {
                  throw new Error("Impor penempatan gagal: Kode Pengajar tidak boleh kosong.");
                }

                const pengajarRows = await listRows(dataBucket["Data Pengajar"]);
                const matchingPengajar = pengajarRows.find(
                  (pengajar) => normalizeValueKey(pengajar.data["Kode Pengajar"]) === kodePengajar
                );
                if (!matchingPengajar) {
                  throw new Error(`Impor penempatan gagal: pengajar dengan kode '${row["Kode Pengajar"]}' tidak ditemukan.`);
                }

                return {
                  ...row,
                  __id_pengajar: decodeId(matchingPengajar.id).id,
                };
              })
            )
          : normalizedRows;

      await replaceBucketRows(target.bucket, rowsToSave);
      await refreshAllData(false);
      pushToast(`Import ${target.label} berhasil (${rowsToSave.length} baris).`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Import Excel gagal diproses.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenPermintaanModal = () => {
    const initialCabang = restrictedCabang || authSession?.cabang || "";
    setPermintaanDraft({
      id: `REQ-${Date.now()}`,
      kodePengajar: "",
      namaPengajar: "",
      cabangPeminta: initialCabang,
      dariCabang: "",
      tanggalDiminta: "",
      jamMulai: "",
      jamSelesai: "",
      catatan: "",
    });
    setPermintaanError("");
    setIsPermintaanModalOpen(true);
  };

  const handleSavePermintaanPengajar = async () => {
    const normalizedDraft = {
      ...permintaanDraft,
      kodePengajar: permintaanDraft.kodePengajar.trim().toLowerCase(),
      namaPengajar: permintaanDraft.namaPengajar.trim(),
      cabangPeminta: (restrictedCabang || permintaanDraft.cabangPeminta).trim(),
      dariCabang: permintaanDraft.dariCabang.trim(),
      tanggalDiminta: permintaanDraft.tanggalDiminta.trim(),
      jamMulai: permintaanDraft.jamMulai.trim(),
      jamSelesai: permintaanDraft.jamSelesai.trim(),
      catatan: permintaanDraft.catatan.trim(),
    };

    if (!normalizedDraft.kodePengajar || !normalizedDraft.namaPengajar) {
      setPermintaanError("Pengajar wajib dipilih.");
      return;
    }
    if (!normalizedDraft.cabangPeminta || !normalizedDraft.dariCabang) {
      setPermintaanError("Cabang peminta dan cabang domisili wajib tersedia.");
      return;
    }
    if (normalizeText(normalizedDraft.cabangPeminta) === normalizeText(normalizedDraft.dariCabang)) {
      setPermintaanError("Permintaan antar cabang hanya untuk pengajar dari cabang lain.");
      return;
    }
    if (!normalizedDraft.tanggalDiminta) {
      setPermintaanError("Tanggal diminta wajib diisi.");
      return;
    }

    const startTime = parseTimeValue(normalizedDraft.jamMulai);
    const endTime = parseTimeValue(normalizedDraft.jamSelesai);
    if (startTime === null || endTime === null || startTime >= endTime) {
      setPermintaanError("Rentang jam tidak valid.");
      return;
    }

    const requestDate = parseFlexibleDate(normalizedDraft.tanggalDiminta);
    if (!requestDate) {
      setPermintaanError("Format tanggal tidak valid.");
      return;
    }

    const existingRequest = [...permintaanRecords]
      .reverse()
      .find(
        (item) =>
          normalizeText(item["Kode Pengajar"] || "") === normalizeText(normalizedDraft.kodePengajar)
      );

    const resolvedRequestId = String(existingRequest?.ID || normalizedDraft.id || "").trim();

    const record = {
      ID: resolvedRequestId,
      "Kode Pengajar": normalizedDraft.kodePengajar,
      "Nama Pengajar": normalizedDraft.namaPengajar,
      "Cabang Peminta": normalizedDraft.cabangPeminta,
      "Dari Cabang": normalizedDraft.dariCabang,
      "Tanggal Diminta": formatScheduleLabel(requestDate),
      "Jam Mulai": normalizedDraft.jamMulai,
      "Jam Selesai": normalizedDraft.jamSelesai,
      Status: "Menunggu",
      Catatan: normalizedDraft.catatan,
    };

    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Permintaan Pengajar Antar Cabang"];
      const rows = await listRows(bucket);
      const existing = rows.find(
        (row) =>
          normalizeValueKey(row.data.ID) === normalizeValueKey(record.ID) ||
          normalizeValueKey(row.data["Kode Pengajar"]) === normalizeValueKey(record["Kode Pengajar"])
      );
      if (existing) {
        await updateRow(existing.id, record);
      } else {
        await insertRow(bucket, record);
      }
      setIsPermintaanModalOpen(false);
      setPermintaanError("");
      await handleLoadPermintaanPengajar();
      pushToast(
        existingRequest
          ? "Permintaan sebelumnya untuk pengajar ini diperbarui otomatis."
          : "Permintaan pengajar berhasil dibuat.",
        "success"
      );
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan permintaan pengajar.",
      }));
      pushToast("Gagal menyimpan permintaan pengajar.", "error");
    }
  };

  const handleDeletePermintaanPengajar = (record: Record<string, string>) => {
    const cabangDomisiliKey = normalizeText(record["Cabang Domisili"] || "");
    const userCabangKey = normalizeText(restrictedCabang || authSession?.cabang || "");
    const canDelete = isAdmin || cabangDomisiliKey === userCabangKey;

    if (!canDelete) {
      pushToast("Hanya Admin atau Cabang Domisili yang dapat menghapus permintaan.", "error");
      return;
    }

    openConfirmDialog(
      "Hapus permintaan pengajar ini?",
      async () => {
        setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
          const targetIds = rows
            .filter((row) => normalizeValueKey(row.data.ID) === normalizeValueKey(record.ID))
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);
          await Promise.all([
            handleLoadPermintaanPengajar(),
            handleLoadFromSheet("bulanIni"),
            handleLoadFromSheet("jadwalTambahanPelayanan"),
            handleLoadSuratTugas(),
          ]);
          pushToast("Permintaan pengajar berhasil dihapus.", "success");
        } catch (error) {
          setPermintaanStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus permintaan pengajar.",
          }));
          pushToast("Gagal menghapus permintaan pengajar.", "error");
        }
      },
      { title: "Hapus Permintaan", confirmLabel: "Hapus" }
    );
  };

  const handleUpdatePermintaanStatus = async (
    record: Record<string, string> | { id?: string; ID?: string; kodePengajar?: string; [key: string]: unknown },
    status: "Disetujui" | "Ditolak"
  ) => {
    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const requestId = String(record.ID || record.id || "").trim();
      const kodePengajar = String(record["Kode Pengajar"] || record.kodePengajar || "").trim().toLowerCase();

      const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
      const existing = rows.find((row) => {
        if (requestId && normalizeValueKey(row.data.ID) === normalizeValueKey(requestId)) {
          return true;
        }
        if (kodePengajar && normalizeValueKey(row.data["Kode Pengajar"]) === kodePengajar) {
          return true;
        }
        return false;
      });

      if (!existing) {
        throw new Error("Permintaan tidak ditemukan.");
      }

      // Permission check: only dari_cabang (providing branch) can approve/reject
      if (!isAdmin && restrictedCabang) {
        const dariCabang = normalizeText(existing.data["Dari Cabang"] || "");
        const userCabangKey = normalizeText(restrictedCabang);
        if (dariCabang !== userCabangKey) {
          throw new Error("Anda tidak memiliki izin untuk mengubah status permintaan ini. Hanya cabang yang diminta yang dapat menyetujui atau menolak.");
        }
      }

      await updateRow(existing.id, {
        ...existing.data,
        Status: status,
      });

      await Promise.all([
        handleLoadPermintaanPengajar(),
        handleLoadFromSheet("bulanIni", { preserveUiState: true }),
        handleLoadFromSheet("jadwalTambahanPelayanan", { preserveUiState: true }),
        handleLoadSuratTugas(),
      ]);
      pushToast(`Permintaan pengajar ${status.toLowerCase()}.`, "success");
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memperbarui status permintaan.",
      }));
      pushToast("Gagal memperbarui status permintaan.", "error");
    }
  };

  const normalizeLoginValue = (value: string) => String(value ?? "").trim().toLowerCase();

  const handleLogin = () => {
    const username = normalizeLoginValue(loginUsername);
    const password = String(loginPassword ?? "").trim();
    const accountsToUse = databaseAccounts.length > 0 ? databaseAccounts : loginAccounts;
    const matched = accountsToUse.find(
      (account) => normalizeLoginValue(account.username) === username && String(account.password ?? "").trim() === password
    );

    if (!matched) {
      setLoginError("Username atau password tidak sesuai.");
      pushToast("Login gagal. Periksa username dan password.", "error");
      return;
    }

    const nextSession: AuthSession = {
      username: matched.username,
      roll: matched.roll,
      cabang: matched.cabang,
    };

    localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setAuthSession(nextSession);
    setLoginError("");
    setLoginPassword("");
    pushToast(`Selamat datang, ${nextSession.username}.`, "success");
  };

  const LOCAL_CACHE_CLEANUP_KEY = "appCacheLastCleanedAt";
  const CACHE_CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

  const updateLastCacheCleanedAt = () => {
    try {
      setLastCacheCleanedAt(localStorage.getItem(LOCAL_CACHE_CLEANUP_KEY) ?? undefined);
    } catch (_error) {
      setLastCacheCleanedAt(undefined);
    }
  };

  const clearAppCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_error) {
      // ignore storage clear failures
    }
  };

  const clearLocalCache = (force = false) => {
    try {
      const lastClearedItem = localStorage.getItem(LOCAL_CACHE_CLEANUP_KEY);
      const lastCleared = Number(lastClearedItem ?? "0");
      const now = Date.now();
      if (!force) {
        if (!lastClearedItem) {
          localStorage.setItem(LOCAL_CACHE_CLEANUP_KEY, String(now));
          setLastCacheCleanedAt(String(now));
          return false;
        }
        if (now - lastCleared < CACHE_CLEANUP_INTERVAL_MS) {
          return false;
        }
      }

      const preservedAuth = localStorage.getItem(authStorageKey);
      const preservedKeys = new Set([authStorageKey, LOCAL_CACHE_CLEANUP_KEY]);
      const keysToRemove: string[] = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && !preservedKeys.has(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      if (preservedAuth) {
        localStorage.setItem(authStorageKey, preservedAuth);
      }
      localStorage.setItem(LOCAL_CACHE_CLEANUP_KEY, String(now));
      sessionStorage.clear();
      setLastCacheCleanedAt(String(now));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const clearStaleLocalCache = () => {
    clearLocalCache(false);
  };

  const handleClearCacheNow = async () => {
    setIsClearingCache(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const cleared = clearLocalCache(true);
      if (cleared) {
        setLastCacheCleanedAt(Date.now().toString());
        pushToast("Cache lokal berhasil dibersihkan.", "success");
      } else {
        pushToast("Gagal membersihkan cache.", "error");
      }
    } catch (_error) {
      pushToast("Terjadi kesalahan saat membersihkan cache.", "error");
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      pushToast("Pemeriksaan pembaruan selesai. Aplikasi sudah terbaru.", "success");
    } catch (_error) {
      pushToast("Gagal memeriksa pembaruan.", "error");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleLogout = () => {
    clearAppCache();
    setAuthSession(null);
    setSidebarMobileOpen(false);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    pushToast("Anda telah logout dari aplikasi.", "info");
  };

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        await checkDatabaseConnection();
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setDbConnectionError(
          error instanceof Error
            ? error.message
            : "Aplikasi tidak dapat terhubung ke database. Pastikan server D1 sudah aktif."
        );
        setIsAppInitializing(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      clearStaleLocalCache();
      updateLastCacheCleanedAt();

      const storedSession = localStorage.getItem(authStorageKey);
      if (!storedSession) {
        setIsAppInitializing(false);
        return;
      }

      try {
        const parsed = JSON.parse(storedSession) as AuthSession;
        const accountsToUse = databaseAccounts.length > 0 ? databaseAccounts : loginAccounts;
        const matched = accountsToUse.find(
          (account) => normalizeLoginValue(account.username) === normalizeLoginValue(parsed.username || "")
        );
        if (!matched) {
          localStorage.removeItem(authStorageKey);
          setIsAppInitializing(false);
          return;
        }

        setAuthSession({
          username: matched.username,
          roll: matched.roll,
          cabang: matched.cabang,
        });
      } catch (_error) {
        localStorage.removeItem(authStorageKey);
      } finally {
        setIsAppInitializing(false);
      }
    };

    void initializeApp();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAccountsFromDb = async () => {
      try {
        const rows = await listRows("accounts_cabang");
        if (!mounted) return;
        const accounts: LoginAccount[] = rows.map((r) => ({
          id: r.id,
          username: r.data.Username || r.data.username || "",
          password: r.data.Password || r.data.password || "",
          roll: r.data.Roll || r.data.roll || "cabang",
          cabang: r.data.Cabang || r.data.cabang || "",
        }));
        setDatabaseAccounts(accounts.filter((a) => a.username && a.password));
      } catch (_e) {
        // Fallback to local loginAccounts if DB fails
      }
    };
    void loadAccountsFromDb();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    setScheduleCabangView({
      bulanIni: restrictedCabang || "",
      jadwalTambahanPelayanan: restrictedCabang || "",
    });
    void refreshAllData();
  }, [authSession, restrictedCabang]);

  useEffect(() => {
    const hasActive = visibleCategories.some((category) => category.key === activeKey);
    if (!hasActive && visibleCategories[0]) {
      setActiveKey(visibleCategories[0].key);
    }
  }, [activeKey, visibleCategories]);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    const refreshInterval = window.setInterval(() => {
      void refreshAllData();
    }, 30 * 60 * 1000);
    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [authSession, restrictedCabang]);

  useEffect(() => {
    if (!sidebarMobileOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [sidebarMobileOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setSidebarMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleDraftChange = (
    fieldKey: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai",
    value: string,
  ) => {
    setDraft((prev) => {
      if (fieldKey === "mapel") {
        setConflictError("");
        return { ...prev, mapel: value, pengajar: "" };
      }
      if (fieldKey === "pengajar") {
        const nextPengajar = value.trim();
        if (!nextPengajar) {
          setConflictError("");
          return { ...prev, pengajar: "" };
        }
        if (editingSlot) {
          const hasPlacementInCabang = hasPengajarAccessInCabang(
            nextPengajar,
            editingSlot.cabang,
            editingSlot.tanggal
          );
          if (!hasPlacementInCabang) {
            setConflictError(
              "Pengajar tidak tersedia di cabang ini, silakan hubungi cabang domisili."
            );
            return { ...prev, pengajar: "" };
          }
          const izinMatch = getPengajarIzinOnDate(nextPengajar, editingSlot.tanggal);
          if (izinMatch) {
            const startLabel = izinMatch["Tanggal Mulai"] || "";
            const endLabel = izinMatch["Tanggal Selesai"] || "";
            const reason = (izinMatch.Keterangan || "").trim();
            setConflictError(
              `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`
            );
            return { ...prev, pengajar: "" };
          }
        }
        setConflictError("");
        return { ...prev, pengajar: nextPengajar };
      }
      return { ...prev, [fieldKey]: value };
    });
  };

  const handleOpenClassModal = () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menambah kelas.", "error");
      return;
    }
    setClassDraft({ cabang: restrictedCabang || "", kelas: "", sekolah: "", jenjang: "" });
    setIsClassEditing(false);
    setEditingClassGroup(null);
    setClassError("");
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (group: { cabang: string; kelas: string; sekolah: string; jenjang?: string; entriesByDate?: Record<string, RecordItem[]> }) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengubah kelas.", "error");
      return;
    }
    // prefer group-level jenjang, fallback to any entry in the group
    const anyEntry = Object.values(group.entriesByDate || {}).flat()[0] as RecordItem | undefined;
    const jenjang = group.jenjang || anyEntry?.jenjang || "";
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

  const handleInlineSaveClassInternal = async (
    group: { cabang: string; kelas: string; sekolah?: string },
    nextKelasValue: string,
    nextSekolahValue: string,
    nextJenjangValue?: string
  ) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengubah kelas.", "error");
      return false;
    }
    const cabang = group.cabang;
    const kelas = nextKelasValue.trim();
    const sekolah = (activeScheduleKey === "jadwalTambahanPelayanan"
      ? nextSekolahValue
      : group.sekolah || "").trim();
    const shouldRequireSekolah = activeScheduleKey === "jadwalTambahanPelayanan";

    if (!kelas || (shouldRequireSekolah && !sekolah)) {
      pushToast(
        shouldRequireSekolah
          ? "Kelas dan Sekolah wajib diisi untuk jadwal tambahan."
          : "Nama kelas wajib diisi.",
        "error"
      );
      return false;
    }

    const hasDuplicate = (records[activeScheduleKey] ?? []).some((item) => {
      if (activeScheduleKey !== "jadwalTambahanPelayanan") {
        const tanggal = (item.tanggal as string) || (item.Tanggal as string) || "";
        if (tanggal.slice(0, 7) !== selectedMonthKey) {
          return false;
        }
      }
      const isCurrentClass =
        item.cabang === group.cabang &&
        item.kelas === group.kelas &&
        (item.sekolah || "") === (group.sekolah || "");
      if (isCurrentClass) {
        return false;
      }
      const isTargetClass =
        item.cabang === cabang &&
        item.kelas === kelas &&
        (shouldRequireSekolah ? (item.sekolah || "") === sekolah : true);
      return isTargetClass;
    });

    if (hasDuplicate) {
      pushToast("Nama kelas tersebut sudah ada.", "error");
      return false;
    }

    const sourceItems = records[activeScheduleKey] ?? [];
    const matchingItems = sourceItems.filter((item) => {
      const itemMonth = ((item.tanggal as string) || (item.Tanggal as string) || "").slice(0, 7);
      const isSameClass =
        item.cabang === group.cabang &&
        item.kelas === group.kelas &&
        (item.sekolah || "") === (group.sekolah || "");
      const isSameMonth =
        activeScheduleKey === "jadwalTambahanPelayanan" ||
        itemMonth === selectedMonthKey;
      return isSameClass && isSameMonth;
    });
    if (matchingItems.length === 0) {
      pushToast("Data kelas tidak ditemukan.", "error");
      return false;
    }

    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).map((item) => {
        const itemMonth = ((item.tanggal as string) || (item.Tanggal as string) || "").slice(0, 7);
        const shouldUpdate =
          item.cabang === group.cabang &&
          item.kelas === group.kelas &&
          (item.sekolah || "") === (group.sekolah || "") &&
          (activeScheduleKey === "jadwalTambahanPelayanan" || itemMonth === selectedMonthKey);
        if (shouldUpdate) {
          return {
            ...item,
            cabang,
            kelas,
            sekolah,
            jenjang: nextJenjangValue !== "" ? nextJenjangValue : item.jenjang || "",
          };
        }
        return item;
      }),
    }));

    await Promise.all(
      matchingItems.map((item) => {
        const oldTanggal = resolveSheetTanggal(item.tanggalSheet || "", item.tanggal || "");
        const scheduleJenis = getScheduleJenis(activeScheduleKey);
        const oldRecord = buildSheetRecord(
          group.cabang,
          group.kelas,
          oldTanggal,
          item.mapel || "",
          item.pengajar || "",
          item.waktu || "",
          item.jenjang || "",
          group.sekolah || "",
          item.classOrder || "",
          scheduleJenis
        );
        const newJenjang = nextJenjangValue !== undefined && nextJenjangValue !== "" ? nextJenjangValue : item.jenjang || "";
        const newRecord = buildSheetRecord(
          cabang,
          kelas,
          oldTanggal,
          item.mapel || "",
          item.pengajar || "",
          item.waktu || "",
          newJenjang,
          sekolah,
          item.classOrder || "",
          scheduleJenis
        );
        return postToSheet({ action: "upsert", record: newRecord, oldRecord });
      })
    );

    pushToast("Nama kelas berhasil diperbarui.", "success");
    return true;
  };

  const handleInlineSaveClass = async (
    group: { cabang: string; kelas: string; sekolah?: string },
    nextKelasValue: string,
    nextSekolahValue: string
  ) => {
    return handleInlineSaveClassInternal(group, nextKelasValue, nextSekolahValue, "");
  };

  const handleSaveNewClass = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menambah kelas.", "error");
      return;
    }
    if (isClassEditing && editingClassGroup) {
      // perform edit flow using existing inline save logic
      const success = await handleInlineSaveClassInternal(
        editingClassGroup,
        classDraft.kelas.trim(),
        classDraft.sekolah.trim(),
        classDraft.jenjang.trim()
      );
      if (success) {
        setIsClassModalOpen(false);
        setIsClassEditing(false);
        setEditingClassGroup(null);
        setClassDraft({ cabang: "", kelas: "", sekolah: "", jenjang: "" });
        setClassError("");
      }
      return;
    }
    const cabang = restrictedCabang || classDraft.cabang.trim();
    const kelas = classDraft.kelas.trim();
    const sekolah = classDraft.sekolah.trim();
    const jenjang = (classDraft.jenjang || "").trim();
    const shouldRequireSekolah = activeScheduleKey === "jadwalTambahanPelayanan";
    if (!cabang || !kelas || !jenjang || (shouldRequireSekolah && !sekolah)) {
      setClassError(
        shouldRequireSekolah
          ? "Cabang, Kelas, Jenjang Studi, dan Sekolah wajib diisi."
          : "Cabang, Kelas, dan Jenjang Studi wajib diisi."
      );
      return;
    }

    const existing = (records[activeScheduleKey] ?? [])
      .filter((item) => {
        if (activeScheduleKey === "jadwalTambahanPelayanan") {
          return true;
        }
        const tanggal = (item.tanggal as string) || (item.Tanggal as string) || "";
        return tanggal.slice(0, 7) === selectedMonthKey;
      })
      .some(
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
    const classOrders = (records[activeScheduleKey] ?? [])
      .filter((item) => {
        if (activeScheduleKey !== "jadwalTambahanPelayanan") {
          const tanggal = (item.tanggal as string) || (item.Tanggal as string) || "";
          if (tanggal.slice(0, 7) !== selectedMonthKey) {
            return false;
          }
        }
        return normalizeText(item.cabang || "") === normalizeText(cabang);
      })
      .map((item) => parseClassOrder(item.classOrder))
      .filter((value): value is number => value !== null);
    const nextClassOrder = (classOrders.length > 0 ? Math.max(...classOrders) : 0) + 1;
    const sheetRecord = buildSheetRecord(
      cabang,
      kelas,
      firstSlot.label,
      "",
      "",
      "",
      jenjang,
      sekolah,
      String(nextClassOrder),
      getScheduleJenis(activeScheduleKey)
    );
    const newItem: RecordItem = {
      id: `kelas-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      cabang,
      kelas,
      sekolah,
      jenjang,
      classOrder: String(nextClassOrder),
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
    pushToast("Kelas baru berhasil ditambahkan.", "success");
    await persistRecordToSheet(sheetRecord);
  };

  const handleDeleteClass = (group: {
    cabang: string;
    kelas: string;
    sekolah: string;
    entriesByDate: Record<string, RecordItem[]>;
  }) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menghapus kelas.", "error");
      return;
    }
    openConfirmDialog(
      `Hapus seluruh jadwal untuk ${group.kelas} (${group.cabang})? Tindakan ini akan menghapus semua data terkait di Surat Tugas Pengajar.`,
      async () => {
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
        pushToast("Kelas dan seluruh jadwalnya berhasil dihapus.", "success");
      },
      { title: "Hapus Kelas", confirmLabel: "Hapus" }
    );
  };

  const handleMoveClass = async (group: { cabang: string; kelas: string; sekolah: string }, direction: -1 | 1) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengatur urutan kelas.", "error");
      return;
    }

    const key = buildClassGroupKey(group.cabang, group.kelas, group.sekolah || "");
    const currentIndex = monthScheduleGroupsAll.findIndex(
      (item) => buildClassGroupKey(item.cabang, item.kelas, item.sekolah || "") === key
    );
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= monthScheduleGroupsAll.length) {
      return;
    }

    const currentGroup = monthScheduleGroupsAll[currentIndex];
    const targetGroup = monthScheduleGroupsAll[nextIndex];
    const currentOrder = currentGroup.classOrder;
    const targetOrder = targetGroup.classOrder;

    const currentKey = buildClassGroupKey(currentGroup.cabang, currentGroup.kelas, currentGroup.sekolah || "");
    const targetKey = buildClassGroupKey(targetGroup.cabang, targetGroup.kelas, targetGroup.sekolah || "");
    const currentViewKey = `${activeScheduleKey}:${selectedMonthKey}:${selectedScheduleCabang}:${currentKey}`;
    const targetViewKey = `${activeScheduleKey}:${selectedMonthKey}:${selectedScheduleCabang}:${targetKey}`;

    setGroupDisplayOrder((prev) => ({
      ...prev,
      [currentViewKey]: nextIndex,
      [targetViewKey]: currentIndex,
    }));

    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).map((item) => {
        const itemMonth = ((item.tanggal as string) || (item.Tanggal as string) || "").slice(0, 7);
        const isSameMonth =
          activeScheduleKey === "jadwalTambahanPelayanan" || itemMonth === selectedMonthKey;
        if (!isSameMonth) {
          return item;
        }
        const itemKey = buildClassGroupKey(item.cabang || "", item.kelas || "", item.sekolah || "");
        if (itemKey === currentKey) {
          return { ...item, classOrder: String(targetOrder) };
        }
        if (itemKey === targetKey) {
          return { ...item, classOrder: String(currentOrder) };
        }
        return item;
      }),
    }));

    await Promise.all([
      postToSheet(
        {
          action: "reorderClass",
          cabang: currentGroup.cabang,
          kelas: currentGroup.kelas,
          sekolah: currentGroup.sekolah || "",
          classOrder: String(targetOrder),
          ...(activeScheduleKey === "jadwalTambahanPelayanan"
            ? {}
            : { monthKey: selectedMonthKey }),
        },
        activeScheduleKey
      ),
      postToSheet(
        {
          action: "reorderClass",
          cabang: targetGroup.cabang,
          kelas: targetGroup.kelas,
          sekolah: targetGroup.sekolah || "",
          classOrder: String(currentOrder),
          ...(activeScheduleKey === "jadwalTambahanPelayanan"
            ? {}
            : { monthKey: selectedMonthKey }),
        },
        activeScheduleKey
      ),
    ]);
    pushToast("Urutan kelas berhasil diperbarui.", "success");
  };

  const buildSheetRecord = (
    cabang: string,
    kelas: string,
    tanggalSheet: string,
    mapel: string,
    pengajar: string,
    waktu: string,
    jenjang = "",
    sekolah = "",
    classOrder = "",
    jenisKbm: "Reguler" | "Khusus" = "Reguler",
    namaPengajar = ""
  ) => {
    const tanggalValue = ((): string => {
      const parsed = parseFlexibleDate(tanggalSheet || "");
      if (parsed) return formatLocalDate(parsed);
      const parsedLabel = parseFlexibleDate(formatSheetTanggal(tanggalSheet));
      if (parsedLabel) return formatLocalDate(parsedLabel);
      return formatSheetTanggal(tanggalSheet);
    })();
    const kodePengajar = pengajar.trim();
    const resolvedNamaPengajar =
      namaPengajar.trim() ||
      (kodePengajar && pengajarByKode[normalizeText(kodePengajar)]
        ?
            pengajarByKode[normalizeText(kodePengajar)]["Nama"] ||
            pengajarByKode[normalizeText(kodePengajar)]["Nama Pengajar"] ||
            pengajarByKode[normalizeText(kodePengajar)]["nama_pengajar"] ||
            ""
        : "");
    return {
      Cabang: cabang,
      Kelas: kelas,
      ...(jenjang ? { "Jenjang Studi": jenjang } : {}),
      ...(sekolah ? { Sekolah: sekolah } : {}),
      ...(String(classOrder).trim() ? { "Urutan Kelas": String(classOrder).trim() } : {}),
      Tanggal: tanggalValue,
      Bulan: tanggalValue.slice(0, 7),
      Mapel: mapel,
      Pengajar: kodePengajar,
      "Kode Pengajar": kodePengajar,
      ...(resolvedNamaPengajar ? { "Nama Pengajar": resolvedNamaPengajar } : {}),
      Waktu: waktu,
      "Jenis KBM": jenisKbm,
    };
  };

  const rebuildSuratTugasBucket = async () => {
    // No need to save to database anymore - surat tugas is computed automatically
    // from jadwal_reguler and jadwal_khusus. This function is kept for compatibility
    // and to trigger UI refresh if needed.
    return Promise.resolve();
  };

  // copy-to-next-month feature removed

  const postToSheet = async (
    payload: Record<string, unknown>,
    scheduleKey: ScheduleMenuKey = activeScheduleKey
  ) => {
    setSheetStatus((prev) => ({ ...prev, saving: true }));
    setSheetStatusError("");
    const bucket = dataBucket[scheduleSheetByKey[scheduleKey]];

    const mutateScheduleBucket = async () => {
      const action = String(payload.action || "");
      const record = (payload.record as Record<string, string> | undefined) ?? null;
      const oldRecord = (payload.oldRecord as Record<string, string> | undefined) ?? null;
      const rows = await listRows(bucket);
      const sessionFields = ["Cabang", "Kelas", "Sekolah", "Tanggal", "Mapel", "Pengajar", "Waktu"];

      if (action === "append" && record) {
        await insertRow(bucket, record);
        return;
      }

      if (action === "appendMany") {
        const recordsToAppend = ((payload.records as Record<string, string>[] | undefined) || []).filter(
          (item) => item && Object.keys(item).length > 0
        );
        for (const item of recordsToAppend) {
          await insertRow(bucket, item);
        }
        return;
      }

      if (action === "upsert" && record) {
        const target = rows.find((row) => {
          if (oldRecord) {
            return matchByFields(row.data, oldRecord, sessionFields);
          }
          return matchByFields(row.data, record, ["Cabang", "Kelas", "Sekolah", "Tanggal"]);
        });
        if (target) {
          await updateRow(target.id, record);
        } else {
          await insertRow(bucket, record);
        }
        return;
      }

      if (action === "deleteSession" && record) {
        const targetIds = rows
          .filter((row) => matchByFields(row.data, record, sessionFields))
          .map((row) => row.id);
        await deleteRowsByIds(targetIds);
        return;
      }

      if (action === "deleteClass") {
        const cabang = String(payload.cabang ?? "");
        const kelas = String(payload.kelas ?? "");
        const sekolah = String(payload.sekolah ?? "");
        const targetIds = rows
          .filter(
            (row) =>
              normalizeValueKey(row.data.Cabang) === normalizeValueKey(cabang) &&
              normalizeValueKey(row.data.Kelas) === normalizeValueKey(kelas) &&
              normalizeValueKey(row.data.Sekolah || "") === normalizeValueKey(sekolah)
          )
          .map((row) => row.id);
        await deleteRowsByIds(targetIds);
        return;
      }

      if (action === "reorderClass") {
        const cabang = String(payload.cabang ?? "");
        const kelas = String(payload.kelas ?? "");
        const sekolah = String(payload.sekolah ?? "");
        const classOrder = String(payload.classOrder ?? "");
        const monthKey = String(payload.monthKey ?? "");
        const targets = rows.filter((row) => {
          if (
            normalizeValueKey(row.data.Cabang) !== normalizeValueKey(cabang) ||
            normalizeValueKey(row.data.Kelas) !== normalizeValueKey(kelas) ||
            normalizeValueKey(row.data.Sekolah || "") !== normalizeValueKey(sekolah)
          ) {
            return false;
          }
          if (!monthKey || scheduleKey === "jadwalTambahanPelayanan") {
            return true;
          }
          const rawTanggal = String(row.data.Tanggal || row.data.tanggal || row.data.tanggalSheet || "");
          const parsedTanggal = parseFlexibleDate(rawTanggal);
          return parsedTanggal ? formatLocalDate(parsedTanggal).slice(0, 7) === monthKey : false;
        });
        for (const row of targets) {
          await updateRow(row.id, {
            ...row.data,
            "Urutan Kelas": classOrder,
          });
        }
      }
    };

    const finalizeSuccess = () => {
      setSheetStatus((prev) => ({
        ...prev,
        saving: false,
        lastSync: new Date().toLocaleString("id-ID"),
      }));
      // Keep Surat Tugas view in sync right after any jadwal save/delete.
      handleLoadSuratTugas();
      pushToast("Perubahan jadwal berhasil disimpan.", "success");
      return true;
    };

    try {
      await mutateScheduleBucket();
      await rebuildSuratTugasBucket();
      return finalizeSuccess();
    } catch (error) {
      setSheetStatus((prev) => ({
        ...prev,
        saving: false,
        error: "Gagal menyimpan ke database.",
      }));
      pushToast("Gagal menyimpan ke database.", "error");
      return false;
    }
  };

  const persistRecordToSheet = async (record: Record<string, string>) => {
    return postToSheet({ action: "upsert", record }, activeScheduleKey);
  };

  const handleDeleteScheduleByMonth = () => {
    if (!isAdmin) {
      pushToast("Menu ini hanya untuk Admin.", "error");
      return;
    }
    const scheduleLabel =
      deleteScheduleType === "bulanIni" ? "Jadwal Reguler" : "Jadwal Tambahan & Pelayanan";
    const monthLabel =
      monthOptions.find((option) => option.value === deleteMonthKey)?.label || deleteMonthKey;

    openConfirmDialog(
      `Hapus semua data ${scheduleLabel} pada ${monthLabel}? Data Surat Tugas Mengajar akan ikut disinkronkan.`,
      async () => {
        setIsDeletingByMonth(true);
        setSheetStatusError("");
        try {
          const targetBucket = dataBucket[scheduleSheetByKey[deleteScheduleType]];
          const rows = (await listRows(targetBucket)).filter((row) => isMatchingScheduleJenis(row, deleteScheduleType));
          const targetIds = rows
            .filter((row) => {
              const raw = row.data || {};
              const tanggalStr = (raw.Tanggal as string) || (raw.tanggal as string) || (raw.tanggalSheet as string) || "";
              const parsed = parseFlexibleDate(tanggalStr || "");
              if (!parsed) {
                return false;
              }
              return formatLocalDate(parsed).slice(0, 7) === deleteMonthKey;
            })
            .map((row) => row.id);

          if (targetIds.length === 0) {
            pushToast(`Tidak ada data ${scheduleLabel} pada ${monthLabel}.`, "info");
            return;
          }

          await deleteRowsByIds(targetIds);
          await rebuildSuratTugasBucket();
          await Promise.all([
            handleLoadFromSheet(deleteScheduleType, { preserveUiState: true }),
            handleLoadSuratTugas(),
          ]);
          setSheetStatus((prev) => ({
            ...prev,
            lastSync: new Date().toLocaleString("id-ID"),
          }));
          pushToast(
            `${targetIds.length} data ${scheduleLabel} pada ${monthLabel} berhasil dihapus.`,
            "success"
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Gagal menghapus jadwal berdasarkan bulan:", error);
          setSheetStatus((prev) => ({
            ...prev,
            error: `Gagal menghapus jadwal berdasarkan bulan: ${message}`,
          }));
          pushToast(`Gagal menghapus jadwal berdasarkan bulan: ${message}`, "error");
        } finally {
          setIsDeletingByMonth(false);
        }
      },
      { title: "Hapus Jadwal Bulanan", confirmLabel: "Hapus Semua" }
    );
  };

  const handleSelectBulanIniSlot = (
    group: { cabang: string; kelas: string; sekolah: string; entriesByDate: Record<string, RecordItem[]> },
    slot: { date: string; label: string },
    entry?: RecordItem
  ) => {
    if (isScheduleReadOnly) {
      return;
    }
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
    const waktuParts = targetEntry?.waktu ? targetEntry.waktu.split("-").map((part: string) => part.trim()) : [];
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
    setCopyTargetDates([]);
    setConflictError("");
    // prepare gabung options (classes from same cabang)
    const options = monthScheduleGroups
      .filter((g) => (g.cabang || "") === group.cabang)
      .map((g) => ({
        value: buildClassGroupKey(g.cabang || "", g.kelas || "", g.sekolah || ""),
        label: `${g.kelas}${g.sekolah ? ` • ${g.sekolah}` : ""}`,
      }));
    const initialGabungKeys = (targetEntry?.isGabung && targetEntry?.gabungWith)
      ? String(targetEntry.gabungWith)
          .split(";")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => {
            const matchedByValue = options.find((opt) => opt.value === value);
            if (matchedByValue) {
              return matchedByValue.value;
            }
            const matchedByLabel = options.find((opt) => normalizeText(opt.label) === normalizeText(value));
            return matchedByLabel ? matchedByLabel.value : value;
          })
      : [];

    setGabungOptions(options);
    setGabungEnabled(initialGabungKeys.length > 0);
    setGabungClassKeys(initialGabungKeys);
  };

  const handleSaveSlot = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengubah jadwal.", "error");
      return;
    }
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
    if (nextValues.pengajar && pengajarAvailabilityInfo.warning) {
      setConflictError(pengajarAvailabilityInfo.warning);
      return;
    }
    if (nextValues.pengajar) {
      const izinMatch = getPengajarIzinOnDate(nextValues.pengajar, tanggal);
      if (izinMatch) {
        const startLabel = izinMatch["Tanggal Mulai"] || "";
        const endLabel = izinMatch["Tanggal Selesai"] || "";
        const reason = (izinMatch.Keterangan || "").trim();
        setConflictError(
          `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`
        );
        return;
      }
    }
    const pengajarKey = nextValues.pengajar.toLowerCase();
    const startTime = parseTimeValue(waktuMulai);
    const endTime = parseTimeValue(waktuSelesai);
    if (nextValues.pengajar && startTime !== null && endTime !== null) {
      if (startTime >= endTime) {
        setConflictError("Jam mulai harus lebih awal daripada jam selesai.");
        return;
      }
      const selectedGabungKeySet = new Set(gabungClassKeys);
      const keptGabungLabelSet = new Set(
        gabungOptions
          .filter((opt) => gabungClassKeys.includes(opt.value))
          .map((opt) => normalizeText(opt.label))
      );
      const currentClassKey = buildClassGroupKey(cabang, kelas, sekolahValue);
      const currentClassLabel = normalizeText(`${kelas}${sekolahValue ? ` • ${sekolahValue}` : ""}`);
      const ignoreClassKeySet = new Set([...selectedGabungKeySet, currentClassKey]);
      const ignoreLabelSet = new Set([...keptGabungLabelSet, currentClassLabel]);
      const otherEntries = allScheduleEntries.filter((item) => {
        if (item.id === entryId) return false;
        if (item.tanggal !== tanggal) return false;
        if ((item.pengajar || "").toLowerCase() !== pengajarKey) return false;
        if (gabungEnabled && ignoreClassKeySet.size > 0) {
          const itemKey = buildClassGroupKey(item.cabang || "", item.kelas || "", item.sekolah || "");
          if (ignoreClassKeySet.has(itemKey)) return false;
          const itemGabungParts = String(item.gabungWith || "")
            .split(";")
            .map((value) => normalizeText(value))
            .filter(Boolean);
          if (
            itemGabungParts.some(
              (value) => ignoreClassKeySet.has(value) || ignoreLabelSet.has(value)
            )
          ) {
            return false;
          }
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
          const hasGap = startTime >= range.end + INTER_BRANCH_MIN_GAP_MINUTES || range.start >= endTime + INTER_BRANCH_MIN_GAP_MINUTES;
          if (!hasGap) {
            const tanggalLabel = getSlotLabelByDate(entry.tanggal ?? tanggal);
            const cabangLabel = entry.cabang || "Cabang tidak diketahui";
            const kelasLabel = entry.kelas || "Kelas tidak diketahui";
            const waktuLabel = entry.waktu || "jam tidak diketahui";
            setConflictError(
              `Pengajar sudah mengajar di ${cabangLabel} (${kelasLabel}) pada ${tanggalLabel} pukul ${waktuLabel}. Antar cabang wajib jeda minimal ${INTER_BRANCH_MIN_GAP_MINUTES} menit.`
            );
            return;
          }
        }
      }
    }

    const existingEntry = entryId
      ? (records[activeScheduleKey] ?? []).find((item) => item.id === entryId)
      : undefined;
    const classOrderValue =
      existingEntry?.classOrder ||
      (records[activeScheduleKey] ?? []).find(
        (item) =>
          item.cabang === cabang &&
          item.kelas === kelas &&
          (item.sekolah || "") === sekolahValue
      )?.classOrder ||
      "";

    const dateLabelByKey = new Map(activeScheduleDates.map((slot) => [slot.date, slot.label]));
    const currentEntries = records[activeScheduleKey] ?? [];
    const sheetJenjang =
      existingEntry?.jenjang ||
      currentEntries.find(
        (item) =>
          item.cabang === cabang &&
          item.kelas === kelas &&
          (item.sekolah || "") === sekolahValue
      )?.jenjang ||
      "";
    const nextPengajarKode = nextValues.pengajar.trim();
    const nextPengajarNama =
      nextPengajarKode && pengajarByKode[normalizeText(nextPengajarKode)]
        ?
            pengajarByKode[normalizeText(nextPengajarKode)]["Nama"] ||
            pengajarByKode[normalizeText(nextPengajarKode)]["Nama Pengajar"] ||
            pengajarByKode[normalizeText(nextPengajarKode)]["nama_pengajar"] ||
            ""
        : "";
    const sanitizedCopyDates = Array.from(
      new Set(
        copyTargetDates.filter(
          (dateKey) => dateKey !== tanggal && dateLabelByKey.has(dateKey)
        )
      )
    );
    const validCopyDates: string[] = [];
    const skippedCopyLabels: string[] = [];

    if (sanitizedCopyDates.length > 0 && (nextValues.mapel || nextValues.pengajar || nextValues.waktu)) {
      for (const targetDate of sanitizedCopyDates) {
        const dateLabel = dateLabelByKey.get(targetDate) || targetDate;
        const duplicatedInClass = currentEntries.some(
          (item) =>
            item.id !== entryId &&
            item.cabang === cabang &&
            item.kelas === kelas &&
            (item.sekolah || "") === sekolahValue &&
            item.tanggal === targetDate &&
            (item.mapel || "") === nextValues.mapel &&
            (item.pengajar || "") === nextValues.pengajar &&
            (item.waktu || "") === nextValues.waktu
        );
        if (duplicatedInClass) {
          skippedCopyLabels.push(`${dateLabel} (sudah ada)`);
          continue;
        }

        if (nextValues.pengajar && startTime !== null && endTime !== null) {
          const izinAtTargetDate = getPengajarIzinOnDate(nextValues.pengajar, targetDate);
          if (izinAtTargetDate) {
            skippedCopyLabels.push(`${dateLabel} (pengajar izin)`);
            continue;
          }
          const copyDateEntries = allScheduleEntries.filter(
            (item) =>
              item.id !== entryId &&
              item.tanggal === targetDate &&
              item.pengajar?.toLowerCase() === pengajarKey
          );
          let conflictFound = false;
          for (const entry of copyDateEntries) {
            const range = parseRangeFromString(entry.waktu || "");
            if (!range) {
              continue;
            }
            const overlap = startTime < range.end && endTime > range.start;
            if (overlap) {
              conflictFound = true;
              break;
            }
            if (entry.cabang !== cabang) {
              const hasGap = startTime >= range.end + INTER_BRANCH_MIN_GAP_MINUTES || range.start >= endTime + INTER_BRANCH_MIN_GAP_MINUTES;
              if (!hasGap) {
                conflictFound = true;
                break;
              }
            }
          }
          if (conflictFound) {
            skippedCopyLabels.push(`${dateLabel} (bentrok pengajar)`);
            continue;
          }
        }

        validCopyDates.push(targetDate);
      }
    }

    const joinedGabungWithValue = gabungEnabled && gabungClassKeys.length > 0 ? gabungClassKeys.join("; ") : "";

    const copiedItems: RecordItem[] = validCopyDates.map((dateKey, index) => ({
      id: `${activeScheduleKey}-${Date.now()}-${index + 1000}`,
      cabang,
      kelas,
      sekolah: sekolahValue,
      classOrder: classOrderValue,
      tanggal: dateKey,
      tanggalSheet: dateLabelByKey.get(dateKey) || dateKey,
      jenjang: sheetJenjang,
      ...nextValues,
      catatan: "",
      ...(joinedGabungWithValue ? { isGabung: true, gabungWith: joinedGabungWithValue } : {}),
    }));
    const copiedSheetRecords = validCopyDates.map((dateKey) =>
      ({
        ...buildSheetRecord(
          cabang,
          kelas,
          resolveSheetTanggal(dateLabelByKey.get(dateKey) || dateKey, dateKey),
          nextValues.mapel,
          nextValues.pengajar,
          nextValues.waktu,
          sheetJenjang,
          sekolahValue,
          classOrderValue,
          getScheduleJenis(activeScheduleKey),
          nextPengajarNama
        ),
        Gabung: joinedGabungWithValue,
        IsGabung: gabungEnabled ? "true" : "false",
      })
    );

    const sheetRecord = buildSheetRecord(
      cabang,
      kelas,
      resolveSheetTanggal(tanggalSheet, tanggal),
      nextValues.mapel,
      nextValues.pengajar,
      nextValues.waktu,
      sheetJenjang,
      sekolahValue,
      classOrderValue,
      getScheduleJenis(activeScheduleKey),
      nextPengajarNama
    );
    // Attach gabung info so DB mapping can persist it
    (sheetRecord as any).Gabung = joinedGabungWithValue;
    (sheetRecord as any).IsGabung = gabungEnabled ? "true" : "false";

    const oldSheetRecord = existingEntry
      ? buildSheetRecord(
          existingEntry.cabang || cabang,
          existingEntry.kelas || kelas,
          resolveSheetTanggal(existingEntry.tanggalSheet || existingEntry.tanggal || tanggalSheet, existingEntry.tanggal || tanggal),
          existingEntry.mapel || "",
          existingEntry.pengajar || "",
          existingEntry.waktu || "",
          existingEntry.jenjang || "",
          existingEntry.sekolah || sekolahValue,
          existingEntry.classOrder || classOrderValue,
          getScheduleJenis(activeScheduleKey),
          existingEntry["Nama Pengajar"] || existingEntry.namaPengajar || ""
        )
      : null;

    setRecords((prev) => {
      const current = prev[activeScheduleKey] ?? [];
      if (entryId) {
        return {
          ...prev,
          [activeScheduleKey]: [
            ...current.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    ...nextValues,
                    cabang,
                    kelas,
                    sekolah: sekolahValue,
                    classOrder: classOrderValue,
                    tanggal,
                    tanggalSheet: sheetRecord.Tanggal,
                    ...(joinedGabungWithValue ? { isGabung: true, gabungWith: joinedGabungWithValue } : { isGabung: false, gabungWith: "" }),
                  }
                : item
            ),
            ...copiedItems,
          ],
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
        classOrder: classOrderValue,
        tanggal,
        tanggalSheet: sheetRecord.Tanggal,
        jenjang: sheetJenjang,
        ...nextValues,
        catatan: "",
        ...(joinedGabungWithValue ? { isGabung: true, gabungWith: joinedGabungWithValue } : {}),
      };
      return {
        ...prev,
        [activeScheduleKey]: [...current, newItem, ...copiedItems],
      };
    });
    clearEditing();

    if (skippedCopyLabels.length > 0) {
      pushToast(
        `Sebagian tanggal salinan dilewati: ${skippedCopyLabels.join(", ")}.`,
        "info"
      );
    }

    if (entryId) {
      await postToSheet({ action: "upsert", record: sheetRecord, oldRecord: oldSheetRecord });
      if (copiedSheetRecords.length > 0) {
        await postToSheet({ action: "appendMany", records: copiedSheetRecords });
      }
      return;
    }
    if (copiedSheetRecords.length > 0) {
      await postToSheet({ action: "appendMany", records: [sheetRecord, ...copiedSheetRecords] });
      return;
    }
    await postToSheet({ action: "append", record: sheetRecord });
  };

  const handleDeleteSlot = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menghapus jadwal.", "error");
      return;
    }
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
      existingEntry?.sekolah || editingSlot.sekolah || "",
      existingEntry?.classOrder || "",
      getScheduleJenis(activeScheduleKey)
    );
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).filter((item) => item.id !== editingSlot.entryId),
    }));
    clearEditing();
    await postToSheet({ action: "deleteSession", record: sheetRecord });
  };

  const isBusy =
    isImporting ||
    sheetStatus.loading ||
    sheetStatus.saving ||
    mapelStatus.loading ||
    pengajarStatus.loading ||
    suratTugasStatus.loading ||
    penempatanStatus.loading ||
    izinStatus.loading ||
    permintaanStatus.loading;

  const busyMessage = sheetStatus.saving
    ? "Menyimpan perubahan ke database..."
    : "Memuat data terbaru...";

  if (isAppInitializing) {
    return (
      <div className="app-shell">
        <LoadingOverlay show={true} message="Menyambungkan ke database..." />
      </div>
    );
  }

  if (dbConnectionError) {
    return (
      <div className="app-shell d-flex align-items-center justify-content-center px-3">
        <div className="card shadow-sm border-danger w-100" style={{ maxWidth: 520 }}>
          <div className="card-body p-4">
            <div className="text-danger fw-bold mb-2">Koneksi database gagal</div>
            <p className="mb-3 text-muted">{dbConnectionError}</p>
            <div className="small text-muted">
              Pastikan URL database di <strong>.env</strong> sudah benar dan worker D1 sudah aktif.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authSession) {
    return (
      <div className="app-shell">
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
        <ToastStack toasts={toasts} onClose={dismissToast} />
      </div>
    );
  }


  return (
    <div className="min-vh-100 app-font-10 app-shell">
      <div className="container-fluid py-4">
        <div className="row g-4">
          <div className="d-none d-lg-flex col-auto">
            <div style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: 320 }}>
              <SidebarMenu
                categories={visibleCategories}
                activeKey={activeKey}
                sidebarCollapsed={sidebarCollapsed}
                onToggle={() => setSidebarWidth(sidebarCollapsed ? 240 : 80)}
                onResize={(width) => setSidebarWidth(Math.max(80, Math.min(320, width)))}
                onSelect={(key) => {
                  setActiveKey(key);
                  clearEditing();
                  setIsClassModalOpen(false);
                  setIsPenempatanModalOpen(false);
                  setIsIzinModalOpen(false);
                  setIsPermintaanModalOpen(false);
                }}
              />
            </div>
          </div>

          <div className="col d-flex flex-column">
            <div className="card shadow-sm mb-4 surface-panel app-header-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm d-lg-none"
                      onClick={() => setSidebarMobileOpen(true)}
                      aria-label="Buka menu"
                    >
                      <i className="bi bi-list" />
                    </button>
                    <div>
                    <h2 className="h4 mb-0">{activeConfig.name}</h2>
                    <div className="text-muted small mt-1">
                      Login sebagai: {authSession.username}
                      {authSession.cabang ? ` (${authSession.cabang})` : ""}
                    </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {isAdmin &&
                    importTargetByMenu[activeKey as keyof typeof importTargetByMenu] ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        title="Import data Excel"
                        onClick={handleOpenExcelImport}
                        disabled={isImporting || isBusy}
                      >
                        {isImporting ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ) : (
                          <>
                            <i className="bi bi-file-earmark-arrow-up me-1" />
                            Import Excel
                          </>
                        )}
                      </button>
                    ) : null}
                    {isAdmin &&
                    templateHeadersByMenu[activeKey as keyof typeof templateHeadersByMenu] ? (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        title="Unduh template Excel"
                        onClick={handleDownloadExcelTemplate}
                        disabled={isImporting || isBusy}
                      >
                        <i className="bi bi-download me-1" />
                        Template
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      title="Refresh semua data"
                      aria-label="Refresh semua data"
                      onClick={() => {
                        void handleRefreshAllData();
                      }}
                      disabled={isRefreshingAll || isBusy}
                    >
                      {isRefreshingAll ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      ) : (
                        <i className="bi bi-arrow-clockwise" />
                      )}
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>

             <div className="card shadow-sm surface-panel">
              <div className="card-body">
                <TopToolbar
                  activeKey={activeKey}
                  activeName={activeConfig.name}
                  query={query}
                  scheduleCabangOptions={activeScheduleCabangOptions}
                  selectedScheduleCabang={selectedScheduleCabang}
                  allowAllCabang={!restrictedCabang}
                  monthOptions={monthOptions}
                  selectedMonthKey={selectedMonthKey}
                  selectedSuratTugasMonthKey={selectedSuratTugasMonthKey}
                  selectedSuratTugasKode={selectedSuratTugasKode}
                  suratTugasPengajarOptions={suratTugasPengajarOptions}
                  sheetStatus={sheetStatus}
                  mapelStatus={mapelStatus}
                  pengajarStatus={pengajarStatus}
                  suratTugasStatus={suratTugasStatus}
                  penempatanStatus={penempatanStatus}
                  izinStatus={izinStatus}
                  permintaanStatus={permintaanStatus}
                  topToolbarMessage={scheduleTopToolbarMessage}
                  onQueryChange={setQuery}
                  onScheduleCabangChange={(nextCabang) => {
                    if (!isScheduleMenuKey(activeKey)) {
                      return;
                    }
                    setScheduleCabangView((prev) => ({
                      ...prev,
                      [activeKey]: nextCabang,
                    }));
                    clearEditing();
                  }}
                  onMonthChange={(nextMonth) => {
                    setSelectedMonthKey(nextMonth);
                  }}
                  onSuratMonthChange={(nextMonth) => {
                    setSelectedSuratTugasMonthKey(nextMonth);
                    setSelectedSuratTugasKode("");
                  }}
                  onSuratKodeChange={setSelectedSuratTugasKode}
                />
                {(activeKey === "bulanIni" ||
                  activeKey === "jadwalTambahanPelayanan" ||
                  activeKey === "monitoringKelas" ||
                  activeKey === "printJadwal" ||
                  activeKey === "hapusJadwal" ||
                  activeKey === "dashboard") &&
                  sheetStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {sheetStatus.error}
                  </div>
                )}
                {activeKey === "dashboard" && (permintaanStatus.error || izinStatus.error) && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {[permintaanStatus.error, izinStatus.error].filter(Boolean).join(" ")}
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

                {activeKey === "penempatanPengajar" && penempatanStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {penempatanStatus.error}
                  </div>
                )}

                {activeKey === "izinPengajar" && izinStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {izinStatus.error}
                  </div>
                )}

                {activeKey === "permintaanPengajarAntarCabang" && permintaanStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {permintaanStatus.error}
                  </div>
                )}

                {activeKey === "dashboard" ? (
                  <DashboardView
                    loading={sheetStatus.loading || permintaanStatus.loading || izinStatus.loading}
                    pendingRequests={dashboardPendingRequests}
                    dashboardSchedules={dashboardScheduleItems}
                    izinRequests={dashboardIzinRequests}
                    canManageIzin={Boolean(authSession)}
                    canManagePermintaan={Boolean(authSession)}
                    userCabang={restrictedCabang}
                    isAdmin={isAdmin}
                    onApproveIzin={(item) => handleUpdateIzinStatus(item, "Disetujui")}
                    onRejectIzin={(item) => handleUpdateIzinStatus(item, "Ditolak")}
                    onApprovePermintaan={(item) => handleUpdatePermintaanStatus(item, "Disetujui")}
                    onRejectPermintaan={(item) => handleUpdatePermintaanStatus(item, "Ditolak")}
                  />
                ) : activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan" ? (
                  <ScheduleTableView
                    isJadwalTambahanMenu={isJadwalTambahanMenu}
                    readOnly={isScheduleReadOnly}
                    activeScheduleDates={activeScheduleDates}
                    activeDayGroups={activeDayGroups}
                    activeDayStartIndexes={activeDayStartIndexes}
                    monthScheduleGroups={monthScheduleGroups}
                    conflictEntryIds={conflictingScheduleEntryIds}
                    editingSlot={editingSlot}
                    saving={sheetStatus.saving}
                    onInlineSaveClass={handleInlineSaveClass}
                    onDeleteClass={handleDeleteClass}
                    onMoveClass={handleMoveClass}
                    onSelectSlot={handleSelectBulanIniSlot}
                    mapelRecords={mapelRecords}
                    onOpenClassModal={handleOpenClassModal}
                    onOpenEditClass={handleOpenEditClass}
                  />
                ) : activeKey === "monitoringKelas" ? (
                  <MonitoringKelasView loading={sheetStatus.loading} rows={monitoringRows} mapelNameByKode={mapelNameByKode} />
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
                    records={filteredPengajarRecords}
                    query=""
                    onAdd={() => handleOpenPengajarModal()}
                    onEdit={handleOpenPengajarModal}
                    onDelete={handleDeletePengajar}
                  />
                ) : activeKey === "penempatanPengajar" ? (
                  <PenempatanPengajarView
                    loading={penempatanStatus.loading}
                    records={filteredPenempatanRecords}
                    query={query}
                  />
                ) : activeKey === "liburNasional" ? (
                    isAdmin ? (
                      <HolidaysAdminView />
                    ) : (
                      <div className="alert alert-warning">Anda tidak memiliki izin untuk mengakses halaman ini.</div>
                    )
                ) : activeKey === "izinPengajar" ? (
                  <IzinPengajarView
                    loading={izinStatus.loading}
                    records={filteredIzinRecords}
                    onAdd={() => handleOpenIzinModal()}
                    onEdit={handleOpenIzinModal}
                    onDelete={handleDeleteIzinPengajar}
                    canManageRecord={canManageIzinRecord}
                  />
                ) : activeKey === "permintaanPengajarAntarCabang" ? (
                  <PermintaanPengajarView
                    loading={permintaanStatus.loading}
                    records={filteredPermintaanRecords}
                    query={query}
                    isAdmin={isAdmin}
                    userCabang={restrictedCabang}
                    onAdd={handleOpenPermintaanModal}
                    onDelete={handleDeletePermintaanPengajar}
                    onApprove={(record) => handleUpdatePermintaanStatus(record, "Disetujui")}
                    onReject={(record) => handleUpdatePermintaanStatus(record, "Ditolak")}
                  />
                ) : activeKey === "accounts_cabang" ? (
                  <AccountsCabangView
                    headers={accountsCabangHeaders}
                    loading={accountsCabangStatus.loading}
                    records={accountsCabangRecords}
                    onAdd={() => handleOpenAccountsCabangModal()}
                    onEdit={handleOpenAccountsCabangModal}
                    onDelete={handleDeleteAccountsCabang}
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
                ) : activeKey === "settings" ? (
                  <SettingsView
                    lastCacheCleanedAt={lastCacheCleanedAt}
                    onClearCache={handleClearCacheNow}
                    onCheckUpdates={handleCheckUpdates}
                    isClearingCache={isClearingCache}
                    isCheckingUpdates={isCheckingUpdates}
                  />
                ) : activeKey === "printJadwal" ? (
                  <PrintJadwalView
                    monthOptions={monthOptions}
                    selectedMonthKey={selectedMonthKey}
                    onMonthChange={setSelectedMonthKey}
                    selectedScheduleType={printScheduleType}
                    onScheduleTypeChange={setPrintScheduleType}
                    selectedClassKey={printSelectedClassKey}
                    onClassKeyChange={setPrintSelectedClassKey}
                    printCopies={printCopies}
                    onPrintCopiesChange={setPrintCopies}
                    printOrientation={printOrientation}
                    onPrintOrientationChange={setPrintOrientation}
                    regulerDates={monthScheduleDates}
                    regulerDayGroups={monthDayGroups}
                    regulerGroups={monthScheduleGroups}
                    tambahanGroups={tambahanPrintGroups}
                    mapelNameByKode={mapelNameByKode}
                  />
                ) : activeKey === "hapusJadwal" ? (
                  <HapusJadwalView
                    scheduleType={deleteScheduleType}
                    monthOptions={monthOptions}
                    selectedMonthKey={deleteMonthKey}
                    deleting={isDeletingByMonth}
                    onTypeChange={setDeleteScheduleType}
                    onMonthChange={setDeleteMonthKey}
                    onDelete={handleDeleteScheduleByMonth}
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
          setClassError("");
        }}
        onDraftChange={handleClassDraftChange}
        onSave={handleSaveNewClass}
      />

      <EditScheduleModal
        editingSlot={editingSlot}
        dateLabel={activeScheduleDates.find((slot) => slot.date === editingSlot?.tanggal)?.label || ""}
        draft={draft}
        mapelOptions={mapelOptions}
        pengajarOptions={filteredPengajarOptions}
        copyDateOptions={copyDateOptions}
        selectedCopyDates={copyTargetDates}
        pengajarAvailabilityWarning={pengajarAvailabilityInfo.warning}
        pengajarAvailableDateLabels={pengajarAvailabilityInfo.availableDateLabels}
        conflictError={conflictError}
        saving={sheetStatus.saving}
        onClose={() => {
          clearEditing();
          setGabungEnabled(false);
          setGabungClassKeys([]);
          setGabungOptions([]);
        }}
        onDraftChange={handleDraftChange}
        onCopyDatesChange={setCopyTargetDates}
        onDelete={handleDeleteSlot}
        onSave={handleSaveSlot}
        gabung={gabungEnabled}
        gabungOptions={gabungOptions}
        selectedGabung={gabungClassKeys}
        onToggleGabung={(next) => setGabungEnabled(next)}
        onGabungChange={(next) => setGabungClassKeys(next)}
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
        cabangLabel={restrictedCabang || authSession?.cabang || pengajarDraft.Domisili || "-"}
        isDomisiliLocked={Boolean(restrictedCabang)}
        domisiliOptions={cabangOptions}
        bidangStudiOptions={mapelOptions}
        error={pengajarError}
        loading={pengajarStatus.loading}
        onClose={() => setIsPengajarModalOpen(false)}
        onChange={handlePengajarDraftChange}
        onBidangStudiChange={handleBidangStudiChange}
        onGeneratePassword={handleGeneratePengajarPassword}
        onSave={handleSavePengajar}
      />

      <PenempatanPengajarModal
        isOpen={isPenempatanModalOpen}
        isEditing={Boolean(penempatanOldRecord)}
        loading={penempatanStatus.loading}
        error={penempatanError}
        draft={penempatanDraft}
        pengajarOptions={pengajarPenempatanOptions}
        cabangOptions={cabangOptions}
        isDomisiliLocked={Boolean(restrictedCabang)}
        onClose={() => {
          setIsPenempatanModalOpen(false);
          setPenempatanError("");
        }}
        onDraftChange={handlePenempatanDraftChange}
        onSave={handleSavePenempatanPengajar}
        onSaveDay={handleSavePenempatanDay}
      />

      <IzinPengajarModal
        isOpen={isIzinModalOpen}
        isEditing={Boolean(editingIzinId)}
        loading={izinStatus.loading}
        error={izinError}
        draft={izinDraft}
        pengajarOptions={pengajarIzinOptions}
        cabangOptions={cabangOptions}
        isDomisiliLocked={Boolean(restrictedCabang)}
        onClose={() => {
          setIsIzinModalOpen(false);
          setIzinError("");
        }}
        onDraftChange={setIzinDraft}
        onSave={handleSaveIzinPengajar}
      />

      <PermintaanPengajarModal
        isOpen={isPermintaanModalOpen}
        loading={permintaanStatus.loading}
        error={permintaanError}
        isAdmin={isAdmin}
        draft={permintaanDraft}
        pengajarOptions={pengajarPermintaanOptions}
        onClose={() => {
          setIsPermintaanModalOpen(false);
          setPermintaanError("");
        }}
        onDraftChange={setPermintaanDraft}
        onSave={handleSavePermintaanPengajar}
      />

      <AccountsCabangModal
        isOpen={isAccountsCabangModalOpen}
        isEditing={Boolean(editingAccountsCabangId)}
        draft={accountsCabangDraft}
        error={accountsCabangError}
        loading={accountsCabangStatus.loading}
        onClose={() => setIsAccountsCabangModalOpen(false)}
        onChange={handleAccountsCabangDraftChange}
        onSave={handleSaveAccountsCabang}
      />

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmDialog.loading}
        onCancel={closeConfirmDialog}
        onConfirm={() => {
          void handleConfirmDialogAction();
        }}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="d-none"
        onChange={(event) => {
          void handleExcelImportChange(event);
        }}
      />

      <LoadingOverlay show={isBusy} message={busyMessage} />
      <ToastStack toasts={toasts} onClose={dismissToast} />

      <div
        className={`sidebar-mobile-backdrop d-lg-none ${sidebarMobileOpen ? "show" : ""}`}
        onClick={() => setSidebarMobileOpen(false)}
        aria-hidden={!sidebarMobileOpen}
      />
      <div className={`sidebar-mobile d-lg-none ${sidebarMobileOpen ? "show" : ""}`}>
        <SidebarMenu
          categories={visibleCategories}
          activeKey={activeKey}
          sidebarCollapsed={false}
          isMobile
          onCloseMobile={() => setSidebarMobileOpen(false)}
          onToggle={() => {
            // Desktop collapse is not used in mobile drawer.
          }}
          onResize={() => {
            // No resize for mobile drawer.
          }}
          onSelect={(key) => {
            setActiveKey(key);
            clearEditing();
            setIsClassModalOpen(false);
            setIsPenempatanModalOpen(false);
            setIsIzinModalOpen(false);
            setIsPermintaanModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
