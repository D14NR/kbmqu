import { useMemo, useState } from "react";
import Select from "react-select";
import { sesiHeaders, formatSessionParts, parseRangeFromString } from "../../utils/schedule";
import type { SelectOption } from "../../types/app";

export type SuratDayRow = {
  dayLabel: string;
  dates: Array<{ date: string; label: string }>;
};

export type SuratTugasViewProps = {
  loading: boolean;
  selectedMonthKey: string;
  selectedPengajarKode: string;
  selectedPengajar: Record<string, string> | null;
  selectedSessionCount: number;
  dayRows: SuratDayRow[];
  recordsByDate: Map<string, Record<string, string>[]>;
  monthOptions?: Array<{ value: string; label: string }>;
  onSelectMonthKey?: (monthKey: string) => void;
  onSelectPengajarKode?: (kode: string) => void;
  pengajarOptions?: SelectOption[];
  allPengajarRecords?: Record<string, string>[];
  allSuratRecordsByMonth?: Record<string, string>[];
  mapelNameByKode?: Record<string, string>;
  userCabang?: string;
  lastSync?: string;
  error?: string;
};

type ViewMode = "document" | "matrix" | "agenda" | "directory";

export type ParsedScheduleSession = {
  id: string;
  date: string;
  dateLabel: string;
  dayLabel: string;
  waktu: string;
  startTime: number;
  mapel: string;
  mapelFull: string;
  kelas: string;
  cabang: string;
  updateLabel?: string;
  rawText: string;
};

export function SuratTugasView({
  loading,
  selectedMonthKey,
  selectedPengajarKode,
  selectedPengajar,
  selectedSessionCount,
  dayRows,
  recordsByDate,
  monthOptions = [],
  onSelectMonthKey,
  onSelectPengajarKode,
  pengajarOptions = [],
  allPengajarRecords = [],
  allSuratRecordsByMonth = [],
  mapelNameByKode = {},
  userCabang = "",
  lastSync = "",
  error = "",
}: SuratTugasViewProps) {
  // UI State: Default to "matrix" (Matriks Jadwal) as primary view
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [docNotesEnabled, setDocNotesEnabled] = useState(true);
  const [docSignatureEnabled, setDocSignatureEnabled] = useState(true);
  const [customLetterNumber, setCustomLetterNumber] = useState("");

  const shouldShowSessions = Boolean(selectedPengajarKode);

  // Helper: Format subject name
  const getSubjectFullName = (code: string) => {
    if (!code) return "-";
    const lower = code.toLowerCase();
    if (mapelNameByKode[lower]) return mapelNameByKode[lower];
    for (const [k, v] of Object.entries(mapelNameByKode)) {
      if (k.toLowerCase() === lower || v.toLowerCase() === lower) return v;
    }
    return code;
  };

  // Month display label
  const monthDisplayLabel = useMemo(() => {
    if (!selectedMonthKey) return "";
    const matched = monthOptions.find((m) => m.value === selectedMonthKey);
    if (matched) return matched.label;
    const [year, month] = selectedMonthKey.split("-").map(Number);
    if (year && month) {
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    return selectedMonthKey;
  }, [selectedMonthKey, monthOptions]);

  // Generate Automatic Letter Reference Number
  const autoLetterNumber = useMemo(() => {
    if (!selectedMonthKey) return "ST/KBM-NY/--";
    const [year, month] = selectedMonthKey.split("-");
    const kode = (selectedPengajarKode || "ALL").toUpperCase();
    const monthPadded = String(month || "01").padStart(2, "0");
    return `ST/${monthPadded}/${year || "2026"}/KBM-NY/${kode}`;
  }, [selectedMonthKey, selectedPengajarKode]);

  const activeLetterNumber = customLetterNumber.trim() || autoLetterNumber;

  // Compute all structured sessions for the selected teacher
  const parsedSessions = useMemo<ParsedScheduleSession[]>(() => {
    if (!selectedPengajarKode) return [];

    const result: ParsedScheduleSession[] = [];
    const targetKode = selectedPengajarKode.trim().toLowerCase();

    dayRows.forEach((row) => {
      row.dates.forEach((slot) => {
        const rawDateRecords = recordsByDate.get(slot.date) ?? [];
        const dateRecords = rawDateRecords.filter((r) => {
          const kode = (r["Kode Pengajar"] || "").toString().trim().toLowerCase();
          return !targetKode || kode === targetKode;
        });

        // Collect and merge raw sessions for this date
        const rawValues = dateRecords.flatMap((record) =>
          sesiHeaders.map((h) => (record[h] || "").trim()).filter(Boolean)
        );

        const mergedMap = new Map<
          string,
          { waktu: string; mapel: string; kelasSet: Set<string>; cabang: string; tail?: string }
        >();

        rawValues.forEach((v) => {
          const parts = (v || "").split("/").map((p) => p.trim());
          const waktuPart = parts[0] || "";
          const second = parts[1] || "";
          const dashIndex = second.indexOf("-");
          const mapelPart = dashIndex >= 0 ? second.slice(0, dashIndex).trim() : second.trim();
          const kelasPart = dashIndex >= 0 ? second.slice(dashIndex + 1).trim() : "";
          const cabangTail = parts[2] || "";

          const cabangMatch = cabangTail.match(/^(.*?)(?:\s+Update-.*)?$/);
          const cabangPart = cabangMatch ? cabangMatch[1].trim() : cabangTail;

          const key = `${waktuPart}||${mapelPart}||${cabangPart}`;
          const entry = mergedMap.get(key);
          if (!entry) {
            const kelasSet = new Set<string>();
            if (kelasPart) kelasSet.add(kelasPart);
            mergedMap.set(key, { waktu: waktuPart, mapel: mapelPart, kelasSet, cabang: cabangPart, tail: cabangTail });
          } else {
            if (kelasPart) entry.kelasSet.add(kelasPart);
          }
        });

        Array.from(mergedMap.values()).forEach((e) => {
          const timeMatch = (e.waktu || "").match(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/);
          const range = parseRangeFromString(timeMatch ? timeMatch[0] : "");
          const startTime = range?.start ?? 9999;
          const kelasCombined = Array.from(e.kelasSet).filter(Boolean).join(" . ");

          result.push({
            id: `${slot.date}-${e.waktu}-${e.mapel}-${kelasCombined}`,
            date: slot.date,
            dateLabel: slot.label,
            dayLabel: row.dayLabel,
            waktu: e.waktu,
            startTime,
            mapel: e.mapel,
            mapelFull: getSubjectFullName(e.mapel),
            kelas: kelasCombined || "Kelas Belum Ditentukan",
            cabang: e.cabang || userCabang || "Neutron",
            updateLabel: e.tail,
            rawText: `${e.waktu}/${e.mapel}-${kelasCombined}/${e.cabang}`,
          });
        });
      });
    });

    // Chronological sort: by date, then by start time
    return result.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime - b.startTime;
    });
  }, [dayRows, recordsByDate, selectedPengajarKode, userCabang]);

  // Aggregate stats for the selected teacher
  const teacherStats = useMemo(() => {
    if (!selectedPengajarKode || parsedSessions.length === 0) {
      return {
        totalSessions: selectedSessionCount || 0,
        activeDaysCount: 0,
        classesCount: 0,
        subjectsCount: 0,
        classesList: [] as string[],
        subjectsList: [] as string[],
        cabangList: [] as string[],
      };
    }

    const activeDaysSet = new Set<string>();
    const classesSet = new Set<string>();
    const subjectsSet = new Set<string>();
    const cabangSet = new Set<string>();

    parsedSessions.forEach((s) => {
      activeDaysSet.add(s.date);
      if (s.kelas) classesSet.add(s.kelas);
      if (s.mapel) subjectsSet.add(s.mapel);
      if (s.cabang) cabangSet.add(s.cabang);
    });

    return {
      totalSessions: parsedSessions.length,
      activeDaysCount: activeDaysSet.size,
      classesCount: classesSet.size,
      subjectsCount: subjectsSet.size,
      classesList: Array.from(classesSet),
      subjectsList: Array.from(subjectsSet),
      cabangList: Array.from(cabangSet),
    };
  }, [parsedSessions, selectedPengajarKode, selectedSessionCount]);

  // Group parsed sessions by date for agenda view
  const sessionsGroupedByDate = useMemo(() => {
    const map = new Map<string, { date: string; dateLabel: string; dayLabel: string; sessions: ParsedScheduleSession[] }>();
    parsedSessions.forEach((s) => {
      if (!map.has(s.date)) {
        map.set(s.date, {
          date: s.date,
          dateLabel: s.dateLabel,
          dayLabel: s.dayLabel,
          sessions: [],
        });
      }
      map.get(s.date)!.sessions.push(s);
    });
    return Array.from(map.values());
  }, [parsedSessions]);

  // Directory of all teachers for this month
  const allTeachersSummary = useMemo(() => {
    if (!allSuratRecordsByMonth || allSuratRecordsByMonth.length === 0) {
      return [];
    }

    const teacherMap = new Map<
      string,
      {
        kode: string;
        nama: string;
        bidangStudi: string;
        domisili: string;
        totalSesi: number;
        activeDays: Set<string>;
        classes: Set<string>;
        mapels: Set<string>;
        cabangs: Set<string>;
      }
    >();

    allSuratRecordsByMonth.forEach((record) => {
      const kode = (record["Kode Pengajar"] || "").trim();
      if (!kode) return;
      const key = kode.toLowerCase();

      let info = teacherMap.get(key);
      if (!info) {
        // Find in master pengajar list
        const master = allPengajarRecords.find(
          (p) => (p["Kode Pengajar"] || "").trim().toLowerCase() === key
        );
        info = {
          kode,
          nama: master?.Nama || kode,
          bidangStudi: master?.["Bidang Studi"] || "-",
          domisili: master?.Domisili || "-",
          totalSesi: 0,
          activeDays: new Set<string>(),
          classes: new Set<string>(),
          mapels: new Set<string>(),
          cabangs: new Set<string>(),
        };
        teacherMap.set(key, info);
      }

      const tanggal = record["Tanggal"] || "";
      let hasSession = false;

      for (let i = 1; i <= 10; i += 1) {
        const val = (record[`Sesi ${i}`] || "").trim();
        if (val) {
          info.totalSesi += 1;
          hasSession = true;

          const parts = val.split("/").map((p) => p.trim());
          const second = parts[1] || "";
          const dashIndex = second.indexOf("-");
          const mapel = dashIndex >= 0 ? second.slice(0, dashIndex).trim() : second.trim();
          const kelas = dashIndex >= 0 ? second.slice(dashIndex + 1).trim() : "";
          const cabang = (parts[2] || "").replace(/\s+Update-.*$/, "").trim();

          if (mapel) info.mapels.add(mapel);
          if (kelas) info.classes.add(kelas);
          if (cabang) info.cabangs.add(cabang);
        }
      }

      if (hasSession && tanggal) {
        info.activeDays.add(tanggal);
      }
    });

    return Array.from(teacherMap.values()).sort((a, b) => b.totalSesi - a.totalSesi);
  }, [allSuratRecordsByMonth, allPengajarRecords]);

  // Filtered teachers list in directory
  const filteredTeachersDirectory = useMemo(() => {
    if (!searchTeacherQuery.trim()) return allTeachersSummary;
    const q = searchTeacherQuery.toLowerCase();
    return allTeachersSummary.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        t.kode.toLowerCase().includes(q) ||
        t.bidangStudi.toLowerCase().includes(q) ||
        t.domisili.toLowerCase().includes(q)
    );
  }, [allTeachersSummary, searchTeacherQuery]);

  // Executive Month KPIs
  const monthKpiStats = useMemo(() => {
    const totalTeachers = allTeachersSummary.length;
    const totalSessions = allTeachersSummary.reduce((acc, t) => acc + t.totalSesi, 0);
    const avgSessions = totalTeachers > 0 ? (totalSessions / totalTeachers).toFixed(1) : "0";
    const topTeacher = allTeachersSummary[0] || null;

    return {
      totalTeachers,
      totalSessions,
      avgSessions,
      topTeacher,
    };
  }, [allTeachersSummary]);

  // Action: Copy WhatsApp Message
  const handleCopyWhatsApp = () => {
    if (!selectedPengajarKode || parsedSessions.length === 0) return;

    const teacherName = selectedPengajar?.Nama || selectedPengajarKode;
    const bidangStudi = selectedPengajar?.["Bidang Studi"] || "-";

    let text = `📋 *SURAT PENUGASAN MENGAJAR KBM*\n`;
    text += `*BIMBEL NEUTRON YOGYAKARTA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Nomor Surat : \`${activeLetterNumber}\`\n`;
    text += `Bulan Periode : *${monthDisplayLabel}*\n\n`;
    text += `👤 *Identitas Pengajar:*\n`;
    text += `• Nama : *${teacherName}*\n`;
    text += `• Kode : *${selectedPengajarKode}*\n`;
    text += `• Bidang Studi : ${bidangStudi}\n`;
    text += `• Total Penugasan : *${teacherStats.totalSessions} Sesi* (${teacherStats.activeDaysCount} Hari Aktif)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📅 *RINCIAN JADWAL MENGAJAR:*\n`;

    sessionsGroupedByDate.forEach((grp, idx) => {
      text += `\n*${idx + 1}. ${grp.dayLabel}, ${grp.dateLabel}*\n`;
      grp.sessions.forEach((s) => {
        text += `   ⏰ ${s.waktu} WIB\n`;
        text += `   📚 *${s.mapel}* - ${s.kelas}\n`;
        text += `   📍 ${s.cabang}\n`;
      });
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 *Ketentuan & Tata Tertib KBM:*\n`;
    text += `1. Pengajar diharapkan hadir di kelas 15 menit sebelum sesi KBM dimulai.\n`;
    text += `2. Wajib mengisi jurnal mengajar dan presensi siswa setelah selesai KBM.\n`;
    text += `3. Pengajuan izin ketidakhadiran wajib dilaporkan minimal H-2 ke Koordinator KBM Cabang.\n\n`;
    text += `Selamat bertugas dan salam sukses KBM! ✨\n`;
    text += `_Koordinator KBM & Akademik Neutron Yogyakarta_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    });
  };

  // Action: Export CSV
  const handleExportCSV = () => {
    if (parsedSessions.length === 0) return;

    const teacherName = selectedPengajar?.Nama || selectedPengajarKode;
    const headers = ["No", "Hari", "Tanggal", "Jam Mulai", "Waktu Sesi", "Kode Mapel", "Nama Mata Pelajaran", "Kelas", "Lokasi Cabang"];
    const csvRows = [headers.join(",")];

    parsedSessions.forEach((s, idx) => {
      const rowData = [
        idx + 1,
        `"${s.dayLabel}"`,
        `"${s.dateLabel}"`,
        `"${s.startTime !== 9999 ? s.startTime : ""}"`,
        `"${s.waktu}"`,
        `"${s.mapel}"`,
        `"${s.mapelFull.replace(/"/g, '""')}"`,
        `"${s.kelas.replace(/"/g, '""')}"`,
        `"${s.cabang.replace(/"/g, '""')}"`,
      ];
      csvRows.push(rowData.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Surat_Tugas_${selectedPengajarKode}_${selectedMonthKey || "Bulan"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Action: Print Document
  const handlePrint = () => {
    window.print();
  };

  // Issued Date calculation (first day of month or today)
  const issuedDateLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  return (
    <div className="surat-tugas-container mt-3">
      {/* 1. HERO COMMAND HEADER */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden d-print-none">
        <div className="p-3 p-md-4 bg-gradient-primary-soft border-bottom d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{ width: 48, height: 48 }}
            >
              <i className="bi bi-file-earmark-person-fill fs-4" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="fw-bold mb-0 text-dark">Surat Tugas Mengajar KBM</h5>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-0.5 text-xxs font-monospace">
                  Official Assignment Portal
                </span>
                {monthDisplayLabel && (
                  <span className="badge bg-white text-dark border rounded-pill px-2.5 py-0.5 text-xxs fw-semibold">
                    <i className="bi bi-calendar3 me-1 text-primary" />
                    {monthDisplayLabel}
                  </span>
                )}
                {lastSync && (
                  <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill px-2.5 py-0.5 text-xxs">
                    <i className="bi bi-check2-circle me-1 text-success" />
                    Sinkron: {lastSync}
                  </span>
                )}
              </div>
              <p className="text-muted text-xs mb-0 mt-1">
                Penerbitan surat tugas resmi, penugasan sesi pengajar, jadwal matriks interaktif, dan lembar cetak siap pakai.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {shouldShowSessions && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
                  onClick={handleCopyWhatsApp}
                  title="Salin rincian tugas mengajar dalam format pesan WhatsApp"
                >
                  <i className={`bi ${copiedWhatsApp ? "bi-check2-all text-success" : "bi-whatsapp text-success"}`} />
                  <span>{copiedWhatsApp ? "Tersalin!" : "Salin WA"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
                  onClick={handleExportCSV}
                  disabled={parsedSessions.length === 0}
                  title="Unduh jadwal sesi mengajar ke file CSV Excel"
                >
                  <i className="bi bi-file-earmark-excel-fill text-success" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
                  onClick={handlePrint}
                  title="Cetak Surat Tugas Resmi atau Simpan ke PDF"
                >
                  <i className="bi bi-printer" />
                  <span>Cetak Surat</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. INTEGRATED MONTH & TEACHER SELECTOR BAR */}
        <div className="p-3 p-md-4 border-bottom bg-light-subtle">
          <div className="row g-3 align-items-center">
            {/* Month Selector */}
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-calendar-event text-primary" />
                Periode Bulan KBM
              </label>
              <select
                className="form-select form-select-sm fw-semibold"
                value={selectedMonthKey}
                onChange={(e) => onSelectMonthKey?.(e.target.value)}
              >
                <option value="">-- Pilih Bulan --</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Searchable Selector */}
            <div className="col-12 col-md-5 col-lg-4">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center justify-content-between">
                <span className="d-flex align-items-center gap-1">
                  <i className="bi bi-person-badge text-primary" />
                  Pilih Pengajar
                </span>
                {selectedPengajarKode && (
                  <button
                    type="button"
                    className="btn btn-link btn-xs text-muted p-0 text-decoration-none"
                    onClick={() => onSelectPengajarKode?.("")}
                  >
                    Reset Pilihan
                  </button>
                )}
              </label>
              <Select
                value={
                  selectedPengajarKode
                    ? pengajarOptions.find((opt) => opt.value === selectedPengajarKode) || null
                    : null
                }
                onChange={(opt) => onSelectPengajarKode?.(opt?.value || "")}
                options={pengajarOptions}
                placeholder={selectedMonthKey ? "Ketik nama / kode pengajar..." : "Pilih bulan terlebih dahulu"}
                isClearable
                isSearchable
                isDisabled={!selectedMonthKey}
                className="text-xs"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 34,
                    borderRadius: 8,
                    borderColor: "#cbd5e1",
                    fontSize: "0.82rem",
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              />
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="col-12 col-md-12 col-lg-5 ms-auto">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-layout-text-window-reverse text-primary" />
                Format Tampilan
              </label>
              <div className="btn-group w-100 p-1 bg-light rounded-3 border" role="group">
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "matrix" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("matrix")}
                >
                  <i className="bi bi-grid-3x3 me-1" />
                  Matriks Jadwal
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "document" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("document")}
                  disabled={!shouldShowSessions}
                >
                  <i className="bi bi-file-earmark-richtext me-1" />
                  Dokumen Resmi
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "agenda" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("agenda")}
                  disabled={!shouldShowSessions}
                >
                  <i className="bi bi-calendar2-check me-1" />
                  Linimasa Harian
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "directory" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("directory")}
                >
                  <i className="bi bi-people-fill me-1" />
                  Semua Pengajar
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 text-xs mb-0 mt-3 rounded-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-1.5" />
              {error}
            </div>
          )}
        </div>

        {/* 3. TEACHER PROFILE BENTO CARD (If teacher is selected) */}
        {shouldShowSessions && selectedPengajar && (
          <div className="p-3 p-md-4 bg-white border-bottom">
            <div className="row g-3 align-items-center">
              {/* Profile Identity */}
              <div className="col-12 col-md-5 col-xl-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-xs flex-shrink-0 fw-bold fs-5"
                    style={{ width: 52, height: 52 }}
                  >
                    {(selectedPengajar?.Nama || selectedPengajarKode).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h6 className="fw-bold text-dark mb-0 text-truncate">
                        {selectedPengajar?.Nama || selectedPengajarKode}
                      </h6>
                      <span className="badge bg-primary text-white font-monospace text-xxs">
                        {selectedPengajarKode}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 mt-1 flex-wrap text-xxs text-muted">
                      <span>
                        <i className="bi bi-book me-1 text-primary" />
                        {selectedPengajar?.["Bidang Studi"] || "Umum"}
                      </span>
                      <span>•</span>
                      <span>
                        <i className="bi bi-geo-alt me-1 text-secondary" />
                        {selectedPengajar?.Domisili || "Yogyakarta"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Bento Metrics */}
              <div className="col-12 col-md-7 col-xl-8">
                <div className="row g-2">
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-light border text-center">
                      <span className="text-xxs text-muted text-uppercase fw-bold d-block">Total Sesi</span>
                      <span className="h5 fw-bold text-primary mb-0">{teacherStats.totalSessions}</span>
                      <span className="text-xxs text-muted d-block">Pertemuan</span>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-light border text-center">
                      <span className="text-xxs text-muted text-uppercase fw-bold d-block">Hari Mengajar</span>
                      <span className="h5 fw-bold text-success mb-0">{teacherStats.activeDaysCount}</span>
                      <span className="text-xxs text-muted d-block">Hari Aktif</span>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-light border text-center">
                      <span className="text-xxs text-muted text-uppercase fw-bold d-block">Rombel / Kelas</span>
                      <span className="h5 fw-bold text-indigo mb-0">{teacherStats.classesCount}</span>
                      <span className="text-xxs text-muted d-block">Kelas Diajar</span>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-2.5 rounded-3 bg-light border text-center">
                      <span className="text-xxs text-muted text-uppercase fw-bold d-block">Variasi Mapel</span>
                      <span className="h5 fw-bold text-purple mb-0">{teacherStats.subjectsCount}</span>
                      <span className="text-xxs text-muted d-block">Mata Pelajaran</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN CONTENT AREA BASED ON VIEW MODE */}

      {/* STATE 0: NO MONTH SELECTED */}
      {!selectedMonthKey && (
        <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white my-4">
          <div
            className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-calendar-check fs-2" />
          </div>
          <h5 className="fw-bold text-dark mb-1">Pilih Periode Bulan KBM</h5>
          <p className="text-muted text-xs max-w-md mx-auto mb-4">
            Silakan pilih bulan pelaksanaan KBM pada pilihan di atas untuk memuat data penugasan, matriks sesi, dan surat tugas mengajar resmi.
          </p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            {monthOptions.slice(0, 4).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1.5 font-monospace text-xs"
                onClick={() => onSelectMonthKey?.(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STATE 1: VIEW MODE: OFFICIAL DOCUMENT (KOP SURAT RESMI) */}
      {selectedMonthKey && viewMode === "document" && (
        <>
          {!shouldShowSessions ? (
            /* If no teacher selected, guide user or show directory */
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-center mb-4">
              <i className="bi bi-person-x fs-2 text-muted opacity-50 d-block mb-2" />
              <h6 className="fw-bold text-dark">Belum Ada Pengajar yang Dipilih</h6>
              <p className="text-muted text-xs mb-3">
                Pilih salah satu nama pengajar di atas atau klik pengajar dari daftar di bawah ini untuk melihat Surat Tugas Resmi.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-3 px-4 mx-auto"
                onClick={() => setViewMode("directory")}
              >
                <i className="bi bi-people me-1.5" />
                Lihat Direktori Seluruh Pengajar ({allTeachersSummary.length})
              </button>
            </div>
          ) : (
            <div>
              {/* Document Customizer Bar (Screen only) */}
              <div className="card border-0 rounded-4 shadow-sm bg-white p-3 mb-3 d-print-none">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-dark text-white rounded-pill px-2.5 py-1 text-xxs">
                      Dokumen Surat Resmi
                    </span>
                    <span className="text-muted text-xs">
                      No: <strong>{activeLetterNumber}</strong>
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-3 text-xs flex-wrap">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input cursor-pointer"
                        type="checkbox"
                        id="switchNotes"
                        checked={docNotesEnabled}
                        onChange={(e) => setDocNotesEnabled(e.target.checked)}
                      />
                      <label className="form-check-label cursor-pointer text-xxs fw-semibold" htmlFor="switchNotes">
                        Tampilkan Ketentuan
                      </label>
                    </div>

                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input cursor-pointer"
                        type="checkbox"
                        id="switchSign"
                        checked={docSignatureEnabled}
                        onChange={(e) => setDocSignatureEnabled(e.target.checked)}
                      />
                      <label className="form-check-label cursor-pointer text-xxs fw-semibold" htmlFor="switchSign">
                        Kolom Tanda Tangan
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm rounded-3 px-3 shadow-2xs d-flex align-items-center gap-1.5"
                      onClick={handlePrint}
                    >
                      <i className="bi bi-printer-fill" />
                      <span>Cetak Surat Tugas (PDF)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* THE OFFICIAL LETTERHEAD PAPER (PRINT OPTIMIZED) */}
              <div className="surat-tugas-paper card shadow-md border rounded-4 bg-white p-4 p-md-5 mx-auto mb-5" style={{ maxWidth: 900 }}>
                {/* 1. KOP SURAT RESMI */}
                <div className="surat-kop-header text-center pb-3 mb-3 border-bottom-double">
                  <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
                    <div
                      className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-2xs"
                      style={{ width: 44, height: 44, fontSize: "1.2rem" }}
                    >
                      NY
                    </div>
                    <div className="text-start">
                      <h4 className="fw-black text-dark mb-0 letter-spacing-tight" style={{ fontWeight: 900, fontSize: "1.3rem" }}>
                        BIMBINGAN BELAJAR NEUTRON YOGYAKARTA
                      </h4>
                      <div className="text-xs text-muted fw-semibold">
                        PUSAT BIMBINGAN BELAJAR & KONSULTASI PENDIDIKAN TERBAIK
                      </div>
                    </div>
                  </div>
                  <div className="text-xxs text-muted">
                    Jl. C. Simanjuntak No. 42, Terban, Gondokusuman, Yogyakarta • Telp: (0274) 589888 • www.neutron.ac.id
                  </div>
                </div>

                {/* 2. JUDUL SURAT TUGAS & NOMOR */}
                <div className="text-center my-3">
                  <h5 className="fw-bold text-dark text-uppercase mb-1 text-decoration-underline" style={{ letterSpacing: "0.05em" }}>
                    SURAT PENUGASAN MENGAJAR KBM
                  </h5>
                  <div className="text-xs text-muted font-monospace">
                    Nomor: {activeLetterNumber}
                  </div>
                </div>

                {/* 3. PEMBUKA & DATA PENGAJAR */}
                <div className="text-xs text-dark mb-3 leading-relaxed">
                  <p className="mb-2">
                    Yang bertanda tangan di bawah ini, Koordinator Akademik & KBM Bimbel Neutron Yogyakarta, dengan ini memberikan tugas mengajar Kegiatan Belajar Mengajar (KBM) kepada:
                  </p>

                  <div className="card bg-light border p-3 rounded-3 mb-3">
                    <table className="table table-sm table-borderless mb-0 text-xs">
                      <tbody>
                        <tr>
                          <td style={{ width: 160 }} className="text-muted fw-semibold py-0.5">Nama Pengajar</td>
                          <td style={{ width: 10 }} className="py-0.5">:</td>
                          <td className="fw-bold text-dark py-0.5">{selectedPengajar?.Nama || selectedPengajarKode}</td>
                        </tr>
                        <tr>
                          <td className="text-muted fw-semibold py-0.5">Kode Pengajar</td>
                          <td className="py-0.5">:</td>
                          <td className="font-monospace fw-bold text-primary py-0.5">{selectedPengajarKode}</td>
                        </tr>
                        <tr>
                          <td className="text-muted fw-semibold py-0.5">Bidang Studi</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{selectedPengajar?.["Bidang Studi"] || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-muted fw-semibold py-0.5">Domisili</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{selectedPengajar?.Domisili || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-muted fw-semibold py-0.5">Periode Tugas</td>
                          <td className="py-0.5">:</td>
                          <td className="fw-semibold text-dark py-0.5">{monthDisplayLabel}</td>
                        </tr>
                        <tr>
                          <td className="text-muted fw-semibold py-0.5">Total Beban Mengajar</td>
                          <td className="py-0.5">:</td>
                          <td className="fw-bold text-success py-0.5">
                            {teacherStats.totalSessions} Sesi Pertemuan ({teacherStats.activeDaysCount} Hari Mengajar)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="mb-2">
                    Untuk melaksanakan kegiatan pembelajaran KBM dengan jadwal dan rincian alokasi sebagai berikut:
                  </p>
                </div>

                {/* 4. TABEL RINCIAN JADWAL SESI */}
                <div className="table-responsive mb-4">
                  <table className="table table-bordered table-sm align-middle text-xs mb-0 surat-doc-table">
                    <thead className="table-light text-center">
                      <tr className="fw-bold">
                        <th style={{ width: 40 }}>No</th>
                        <th style={{ width: 100 }}>Hari</th>
                        <th style={{ width: 120 }}>Tanggal</th>
                        <th style={{ width: 130 }}>Waktu / Jam</th>
                        <th style={{ width: 90 }}>Mapel</th>
                        <th>Kelas / Rombel</th>
                        <th style={{ width: 140 }}>Cabang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted">
                            Tidak ada jadwal mengajar yang ditemukan untuk pengajar ini pada periode {monthDisplayLabel}.
                          </td>
                        </tr>
                      ) : (
                        parsedSessions.map((s, idx) => (
                          <tr key={s.id}>
                            <td className="text-center text-muted">{idx + 1}</td>
                            <td className="fw-semibold">{s.dayLabel}</td>
                            <td>{s.dateLabel}</td>
                            <td className="font-monospace text-nowrap fw-semibold text-primary">{s.waktu}</td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark border font-monospace px-1.5">
                                {s.mapel}
                              </span>
                            </td>
                            <td className="fw-bold text-dark">{s.kelas}</td>
                            <td>
                              <span className="text-muted">{s.cabang}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {parsedSessions.length > 0 && (
                      <tfoot className="table-light fw-bold">
                        <tr>
                          <td colSpan={3} className="text-end text-dark">Total Alokasi Sesi:</td>
                          <td colSpan={4} className="text-primary font-monospace">
                            {parsedSessions.length} Sesi Pertemuan
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* 5. KETENTUAN DAN TATA TERTIB */}
                {docNotesEnabled && (
                  <div className="card bg-light-subtle border p-3 rounded-3 mb-4 text-xs">
                    <div className="fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                      <i className="bi bi-info-circle-fill text-primary" />
                      Ketentuan dan Tata Tertib Mengajar:
                    </div>
                    <ol className="mb-0 ps-3 text-muted leading-normal">
                      <li className="mb-1">Pengajar wajib hadir di ruang kelas minimal <strong>15 menit</strong> sebelum sesi KBM dimulai.</li>
                      <li className="mb-1">Melakukan presensi siswa dan mencatat materi yang diajarkan pada Jurnal KBM setelah sesi berakhir.</li>
                      <li className="mb-1">Apabila berhalangan hadir karena alasan darurat, wajib mengajukan izin paling lambat <strong>H-2</strong> kepada Koordinator KBM.</li>
                      <li className="mb-0">Mematuhi etika pengajaran, kode etik pendidik, dan menjaga standar kualitas pembelajaran Bimbel Neutron.</li>
                    </ol>
                  </div>
                )}

                {/* 6. LEMBAR PENGESAHAN DAN TANDA TANGAN */}
                {docSignatureEnabled && (
                  <div className="pt-3 mt-2">
                    <div className="d-flex justify-content-between align-items-start text-xs text-center px-4">
                      {/* Left: Pengajar */}
                      <div style={{ minWidth: 200 }}>
                        <div className="text-muted mb-1">Penerima Tugas,</div>
                        <div className="text-dark fw-semibold mb-5">Pengajar Yang Ditugaskan</div>
                        <div className="fw-bold text-dark text-decoration-underline">
                          {selectedPengajar?.Nama || selectedPengajarKode}
                        </div>
                        <div className="text-muted font-monospace text-xxs">
                          NIP/Kode: {selectedPengajarKode}
                        </div>
                      </div>

                      {/* Right: Koordinator Cabang */}
                      <div style={{ minWidth: 220 }}>
                        <div className="text-muted mb-1">Ditetapkan di: Yogyakarta</div>
                        <div className="text-muted mb-1">Pada tanggal: {issuedDateLabel}</div>
                        <div className="text-dark fw-semibold mb-5">Koordinator Akademik & KBM</div>
                        <div className="fw-bold text-dark text-decoration-underline">
                          Koordinator KBM Cabang
                        </div>
                        <div className="text-muted text-xxs">
                          Bimbel Neutron Yogyakarta
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* STATE 2: VIEW MODE: TIMETABLE MATRIX GRID */}
      {selectedMonthKey && viewMode === "matrix" && (
        <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
          <div className="p-3 bg-light border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-xs text-dark d-flex align-items-center gap-1.5">
                <i className="bi bi-grid-3x3 text-primary" />
                Matriks Jadwal Sesi Mengajar
              </span>
              <span className="badge bg-white text-muted border rounded-pill px-2 py-0.5 text-xxs">
                {shouldShowSessions
                  ? `Pengajar: ${selectedPengajar?.Nama || selectedPengajarKode} • ${teacherStats.totalSessions} Sesi`
                  : `Semua Pengajar (${allTeachersSummary.length})`}
              </span>
            </div>

            <div className="text-xxs text-muted">
              {shouldShowSessions ? (
                <span>Menampilkan jadwal khusus untuk <strong>{selectedPengajarKode}</strong></span>
              ) : (
                <span>Pilih pengajar untuk melihat slot sesi yang diampu</span>
              )}
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: "calc(100vh - 280px)", minHeight: 380 }}>
            <table className="table table-bordered table-hover align-middle mb-0 table-sticky">
              <thead className="table-light sticky-top" style={{ zIndex: 20 }}>
                <tr>
                  <th className="text-center py-2" style={{ width: 110 }}>
                    HARI
                  </th>
                  <th className="text-center text-nowrap py-2" style={{ width: 130 }}>
                    TANGGAL
                  </th>
                  {sesiHeaders.map((header) => (
                    <th key={header} className="text-center text-nowrap py-2" style={{ minWidth: 130 }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      <span>Memuat data surat tugas dan sesi mengajar...</span>
                    </td>
                  </tr>
                ) : !shouldShowSessions ? (
                  <tr>
                    <td colSpan={12} className="text-center py-4 px-3 bg-light-subtle">
                      <div className="max-w-xl mx-auto py-3">
                        <i className="bi bi-grid-3x3 fs-2 text-primary opacity-75 d-block mb-2" />
                        <div className="fw-bold text-dark fs-6 mb-1">Pilih Pengajar untuk Menampilkan Matriks Jadwal</div>
                        <div className="small text-muted mb-3">
                          Pilih pengajar melalui menu di atas atau klik salah satu nama pengajar di bawah:
                        </div>
                        {allTeachersSummary.length > 0 && (
                          <div className="d-flex flex-wrap justify-content-center gap-1.5 max-h-48 overflow-y-auto p-2 bg-white rounded-3 border">
                            {allTeachersSummary.map((t) => (
                              <button
                                key={t.kode}
                                type="button"
                                className="btn btn-outline-secondary btn-xs rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 text-xs"
                                onClick={() => onSelectPengajarKode?.(t.kode)}
                              >
                                <span className="fw-bold text-primary">{t.kode}</span>
                                <span className="text-truncate" style={{ maxWidth: 140 }}>
                                  {t.nama !== t.kode ? t.nama : ""}
                                </span>
                                <span className="badge bg-primary-subtle text-primary rounded-pill px-1.5 py-0.5">
                                  {t.totalSesi} sesi
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  dayRows.flatMap((row) =>
                    row.dates.map((slot, slotIndex) => {
                      const rawDateRecords = shouldShowSessions ? recordsByDate.get(slot.date) ?? [] : [];
                      const dateRecords = rawDateRecords.filter((r) => {
                        const kode = (r["Kode Pengajar"] || "").toString().trim().toLowerCase();
                        return !shouldShowSessions || (selectedPengajarKode || "").trim().toLowerCase() === kode;
                      });

                      const rawValues = dateRecords.flatMap((record) =>
                        sesiHeaders.map((h) => (record[h] || "").trim()).filter(Boolean)
                      );

                      const mergedMap = new Map<
                        string,
                        { waktu: string; mapel: string; kelasSet: Set<string>; tail?: string }
                      >();

                      rawValues.forEach((v) => {
                        const parts = (v || "").split("/").map((p) => p.trim());
                        const waktuPart = parts[0] || "";
                        const second = parts[1] || "";
                        const dashIndex = second.indexOf("-");
                        const mapelPart = dashIndex >= 0 ? second.slice(0, dashIndex).trim() : second.trim();
                        const kelasPart = dashIndex >= 0 ? second.slice(dashIndex + 1).trim() : "";
                        const tail = parts[2] || "";
                        const key = `${waktuPart}||${mapelPart}`;
                        const entry = mergedMap.get(key);
                        if (!entry) {
                          const kelasSet = new Set<string>();
                          if (kelasPart) kelasSet.add(kelasPart);
                          mergedMap.set(key, { waktu: waktuPart, mapel: mapelPart, kelasSet, tail });
                        } else {
                          if (kelasPart) entry.kelasSet.add(kelasPart);
                        }
                      });

                      const deduped = Array.from(mergedMap.values()).map((e) => {
                        const kelasCombined = Array.from(e.kelasSet).filter(Boolean).join(" . ");
                        const second = kelasCombined ? `${e.mapel}-${kelasCombined}` : e.mapel;
                        return `${e.waktu}/${second}/${e.tail || ""}`.trim();
                      });

                      const ordered = deduped
                        .map((v, i) => {
                          const timeMatch = (v || "").match(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/);
                          const range = parseRangeFromString(timeMatch ? timeMatch[0] : "");
                          return { v, start: range?.start ?? Infinity, idx: i };
                        })
                        .sort((a, b) => a.start - b.start || a.idx - b.idx)
                        .map((x) => x.v);

                      const dateColumns: string[][] = Array.from({ length: sesiHeaders.length }, () => []);
                      ordered.forEach((v, i) => {
                        if (i < dateColumns.length) {
                          dateColumns[i].push(v);
                        } else {
                          dateColumns[dateColumns.length - 1].push(v);
                        }
                      });

                      const hasAnySession = ordered.length > 0;

                      return (
                        <tr
                          key={`${row.dayLabel}-${slot.date}`}
                          className={`${slotIndex === 0 ? "surat-day-separator" : ""} ${
                            hasAnySession ? "bg-light-subtle" : ""
                          }`}
                        >
                          <td className="fw-bold text-dark text-xs">{slotIndex === 0 ? row.dayLabel : ""}</td>
                          <td className="text-xs font-monospace">{slot.label}</td>
                          {sesiHeaders.map((sessionHeader, sessionIndex) => {
                            const sessionValues = dateColumns[sessionIndex] ?? [];
                            return (
                              <td key={`${slot.date}-${sessionHeader}`} className="p-1">
                                {!shouldShowSessions ? null : sessionValues.length === 0 ? (
                                  <div className="text-center text-muted opacity-30 text-xxs">-</div>
                                ) : (
                                  <div className="d-flex flex-column gap-1">
                                    {sessionValues.map((sessionValue, valueIndex) => {
                                      const sessionParts = formatSessionParts(sessionValue);
                                      const waktu = sessionParts[0] || "";
                                      const mapelKelas = sessionParts[1] || "";
                                      const cabang = sessionParts[2] || "";

                                      return (
                                        <div
                                          key={`${sessionHeader}-${valueIndex}`}
                                          className="p-1.5 rounded-2 bg-white border border-primary-subtle shadow-2xs text-xxs"
                                        >
                                          <div className="fw-bold text-primary font-monospace">{waktu}</div>
                                          <div className="fw-semibold text-dark text-truncate">{mapelKelas}</div>
                                          {cabang && <div className="text-muted text-xxs text-truncate">{cabang}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATE 3: VIEW MODE: AGENDA / TIMELINE LIST */}
      {selectedMonthKey && viewMode === "agenda" && (
        <div className="mb-4">
          {!shouldShowSessions ? (
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-center">
              <i className="bi bi-calendar2-range fs-2 text-muted opacity-50 d-block mb-2" />
              <h6 className="fw-bold text-dark">Pilih Pengajar untuk Menampilkan Agenda</h6>
            </div>
          ) : sessionsGroupedByDate.length === 0 ? (
            <div className="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
              <i className="bi bi-calendar-x fs-2 text-secondary opacity-50 d-block mb-2" />
              <h6 className="fw-bold text-dark">Tidak Ada Agenda Mengajar Terjadwal</h6>
              <p className="text-muted text-xs mb-0">Pengajar ini belum memiliki jadwal sesi pada bulan {monthDisplayLabel}.</p>
            </div>
          ) : (
            <div className="row g-3">
              {sessionsGroupedByDate.map((day) => (
                <div key={day.date} className="col-12 col-lg-6">
                  <div className="card h-100 border-0 rounded-4 shadow-sm bg-white overflow-hidden">
                    {/* Day Header */}
                    <div className="p-3 bg-gradient-primary-soft border-bottom d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 text-xxs fw-bold">
                          {day.dayLabel}
                        </span>
                        <span className="fw-bold text-dark text-xs">{day.dateLabel}</span>
                      </div>
                      <span className="badge bg-white text-primary border rounded-pill px-2 py-0.5 text-xxs fw-semibold">
                        {day.sessions.length} Sesi
                      </span>
                    </div>

                    {/* Sessions list */}
                    <div className="p-3 d-flex flex-column gap-2">
                      {day.sessions.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          className="p-2.5 rounded-3 bg-light border d-flex align-items-center justify-content-between gap-2"
                        >
                          <div className="d-flex align-items-center gap-2.5 min-w-0">
                            <div className="rounded-2 bg-primary-subtle text-primary p-2 text-center flex-shrink-0" style={{ width: 50 }}>
                              <i className="bi bi-clock-history fs-6 d-block" />
                            </div>
                            <div className="min-w-0">
                              <div className="fw-bold text-primary font-monospace text-xs">{s.waktu} WIB</div>
                              <div className="fw-bold text-dark text-sm text-truncate">
                                {s.mapel} <span className="text-muted fw-normal">• {s.kelas}</span>
                              </div>
                              <div className="text-xxs text-muted d-flex align-items-center gap-1.5 mt-0.5">
                                <span><i className="bi bi-geo-alt me-0.5" />{s.cabang}</span>
                                <span>•</span>
                                <span>{s.mapelFull}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATE 4: VIEW MODE: TEACHER DIRECTORY & MONTH DASHBOARD */}
      {selectedMonthKey && viewMode === "directory" && (
        <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
          {/* Executive Overview Bento Cards */}
          <div className="p-3 p-md-4 border-bottom bg-gradient-primary-soft">
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted text-xxs fw-bold text-uppercase">Pengajar Terjadwal</span>
                    <i className="bi bi-people-fill text-primary" />
                  </div>
                  <div className="h4 fw-bold text-dark mb-0">{monthKpiStats.totalTeachers}</div>
                  <div className="text-xxs text-muted">Pengajar aktif bulan ini</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted text-xxs fw-bold text-uppercase">Total Sesi KBM</span>
                    <i className="bi bi-calendar-check-fill text-success" />
                  </div>
                  <div className="h4 fw-bold text-success mb-0">{monthKpiStats.totalSessions}</div>
                  <div className="text-xxs text-muted">Akumulasi seluruh sesi</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted text-xxs fw-bold text-uppercase">Rata-rata / Guru</span>
                    <i className="bi bi-pie-chart-fill text-indigo" />
                  </div>
                  <div className="h4 fw-bold text-dark mb-0">{monthKpiStats.avgSessions} <span className="text-xs fw-normal text-muted">Sesi</span></div>
                  <div className="text-xxs text-muted">Beban rata-rata mengajar</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted text-xxs fw-bold text-uppercase">Sesi Terbanyak</span>
                    <i className="bi bi-trophy-fill text-warning" />
                  </div>
                  <div className="h5 fw-bold text-dark mb-0 text-truncate">
                    {monthKpiStats.topTeacher?.nama || "-"}
                  </div>
                  <div className="text-xxs text-muted">
                    {monthKpiStats.topTeacher ? `${monthKpiStats.topTeacher.totalSesi} Sesi` : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar inside directory */}
          <div className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-xs text-dark">
                Direktori Surat Tugas Pengajar
              </span>
              <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5 text-xxs">
                {filteredTeachersDirectory.length} Pengajar
              </span>
            </div>

            <div className="input-group input-group-sm" style={{ maxWidth: 300 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder="Cari nama / kode / mapel..."
                value={searchTeacherQuery}
                onChange={(e) => setSearchTeacherQuery(e.target.value)}
              />
              {searchTeacherQuery && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => setSearchTeacherQuery("")}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>

          {/* Teachers Directory Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-xs">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 50 }} className="text-center">No</th>
                  <th>Pengajar</th>
                  <th>Bidang Studi</th>
                  <th>Domisili</th>
                  <th className="text-center" style={{ width: 110 }}>Hari Aktif</th>
                  <th className="text-center" style={{ width: 120 }}>Total Sesi</th>
                  <th>Mapel yang Diampu</th>
                  <th className="text-center" style={{ width: 130 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachersDirectory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-2 text-secondary opacity-50 d-block mb-2" />
                      <div>Tidak ada pengajar yang cocok dengan pencarian</div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachersDirectory.map((t, idx) => (
                    <tr
                      key={t.kode}
                      className={selectedPengajarKode === t.kode ? "table-primary" : ""}
                    >
                      <td className="text-center text-muted">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 32, height: 32, fontSize: "0.75rem" }}
                          >
                            {t.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{t.nama}</div>
                            <span className="badge bg-light text-muted border font-monospace text-xxs">
                              {t.kode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{t.bidangStudi}</td>
                      <td className="text-muted">{t.domisili}</td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark border rounded-pill px-2 py-0.5 text-xxs">
                          {t.activeDays.size} Hari
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 text-xs fw-bold">
                          {t.totalSesi} Sesi
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {Array.from(t.mapels).slice(0, 4).map((m) => (
                            <span key={m} className="badge bg-secondary-subtle text-secondary rounded-pill px-1.5 py-0.2 text-xxs">
                              {m}
                            </span>
                          ))}
                          {t.mapels.size > 4 && (
                            <span className="text-xxs text-muted">+{t.mapels.size - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-xs rounded-pill px-2.5 py-1"
                          onClick={() => {
                            onSelectPengajarKode?.(t.kode);
                            setViewMode("document");
                          }}
                        >
                          <i className="bi bi-file-earmark-text me-1" />
                          Surat Tugas
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
