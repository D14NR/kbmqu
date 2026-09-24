import { useMemo, useState } from "react";
import type { MonitoringRow } from "../../types/app";

type MonitoringKelasViewProps = {
  loading: boolean;
  rows: MonitoringRow[];
  mapelNameByKode?: Record<string, string>;
  mapelCategoryByKode?: Record<string, string>;
};

type ViewMode = "matrix" | "cards" | "distribution";
type SubjectCategoryFilter = "ALL" | string;
type SessionStatusFilter = "ALL" | "HEAVY" | "MODERATE" | "EMPTY";
type SortOption = "name_asc" | "name_desc" | "sessions_desc" | "sessions_asc" | "subjects_desc";

const SUBJECT_GROUPS_CONFIG = [
  {
    label: "UMUM",
    name: "Mata Pelajaran Umum",
    color: "#2563eb",
    bgSoft: "#eff6ff",
    borderSoft: "#bfdbfe",
    badgeClass: "bg-blue-subtle text-blue",
    codes: [
      "MTK",
      "FIS",
      "KIM",
      "BIO",
      "EKO",
      "GEO",
      "SEJ",
      "SOS",
      "IND",
      "ING",
      "IPA",
      "IPS",
      "IPAS",
    ],
  },
  {
    label: "SNBT-UTBK",
    name: "Materi Seleksi Masuk PTN",
    color: "#7e22ce",
    bgSoft: "#faf5ff",
    borderSoft: "#e9d5ff",
    badgeClass: "bg-purple-subtle text-purple",
    codes: ["PU", "PPU", "PBM", "PK", "L.IND", "L.ING", "P.MTK", "L.IPA", "L.IPS"],
  },
  {
    label: "TKA",
    name: "Tes Kemampuan Akademik",
    color: "#c2410c",
    bgSoft: "#fff7ed",
    borderSoft: "#fed7aa",
    badgeClass: "bg-orange-subtle text-orange",
    codes: [
      "TKA-MTK",
      "TKA-MTK TL",
      "TKA-MTK W",
      "TKA-FIS",
      "TKA-KIM",
      "TKA-BIO",
      "TKA-EKO",
      "TKA-GEO",
      "TKA-SEJ",
      "TKA-SOS",
      "TKA-IND",
      "TKA-ING",
      "TKA-IND TL",
      "TKA-ING TL",
      "PP",
      "PKWU",
      "ANTRO",
    ],
  },
];

export function MonitoringKelasView({ loading, rows, mapelNameByKode, mapelCategoryByKode }: MonitoringKelasViewProps) {
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategoryFilter>("ALL");
  const [sessionStatus, setSessionStatus] = useState<SessionStatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [highlightCount, setHighlightCount] = useState<number | null>(null);
  const [detailModalRow, setDetailModalRow] = useState<MonitoringRow | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const normalizeRawKode = (raw: string) => (raw || "").trim().toUpperCase();

  const getDisplayMapelKode = (value: string, mapelNameMap?: Record<string, string>) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";

    const lower = trimmed.toLowerCase();
    if (mapelNameMap && mapelNameMap[lower]) {
      return normalizeRawKode(trimmed);
    }

    if (mapelNameMap) {
      for (const [kode, nama] of Object.entries(mapelNameMap)) {
        if ((nama || "").trim().toLowerCase() === lower) return normalizeRawKode(kode);
      }
    }

    const normalized = normalizeRawKode(trimmed).replace(/\s+/g, " ");
    if (normalized.includes("TKA ") || normalized.includes("TKA-")) {
      return normalized.replace(/\s+/g, "-");
    }
    if (normalized.includes("SNBT") || normalized.includes("UTBK")) {
      return normalized.replace(/\s+/g, "-");
    }
    return normalized;
  };

  const getFullSubjectName = (code: string) => {
    if (!mapelNameByKode) return code;
    const lower = code.toLowerCase();
    if (mapelNameByKode[lower]) return mapelNameByKode[lower];
    // Reverse lookup
    for (const [k, v] of Object.entries(mapelNameByKode)) {
      if (k.toLowerCase() === lower || v.toLowerCase() === lower) return v;
    }
    return code;
  };

  // Extract all unique cabang options
  const cabangOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.cabang) set.add(r.cabang);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Extract all unique subject codes across all rows
  const allMapelKodes = useMemo(() => {
    return Array.from(
      new Set(
        rows.flatMap((row) =>
          Object.keys(row.mapelCountByKode).map((k) => getDisplayMapelKode(k, mapelNameByKode))
        )
      )
    )
      .filter(Boolean)
      .sort();
  }, [rows, mapelNameByKode]);

  // Group subject codes
  const { visibleGroups, orderedCodes, codeToCategoryMap } = useMemo(() => {
    // Dynamic grouping based on passed category map
    if (mapelCategoryByKode) {
      const allCategories = Array.from(new Set(Object.values(mapelCategoryByKode)));
      
      const dynamicGroups = allCategories.map(cat => ({
        label: cat,
        name: cat,
        color: "#2563eb",
        bgSoft: "#eff6ff",
        borderSoft: "#bfdbfe",
        badgeClass: "bg-blue-subtle text-blue",
        codes: allMapelKodes.filter(code => (mapelCategoryByKode[code.toLowerCase()] || "UMUM") === cat)
      }));

      const ordered = dynamicGroups.flatMap((group) => group.codes.filter(Boolean));
      
      const map = new Map<string, string>();
      dynamicGroups.forEach((g) => {
        g.codes.forEach((c) => {
          map.set(normalizeRawKode(c), g.label);
        });
      });
      
      return {
        visibleGroups: dynamicGroups,
        orderedCodes: ordered,
        codeToCategoryMap: map
      };
    }

    const groups = SUBJECT_GROUPS_CONFIG.map((g) => ({
      label: g.label,
      name: g.name,
      color: g.color,
      bgSoft: g.bgSoft,
      borderSoft: g.borderSoft,
      badgeClass: g.badgeClass,
      codes: g.codes,
    }));

    const otherGroup = {
      label: "LAINNYA",
      name: "Mata Pelajaran Lainnya",
      color: "#475569",
      bgSoft: "#f8fafc",
      borderSoft: "#cbd5e1",
      badgeClass: "bg-secondary-subtle text-secondary",
      codes: [] as string[],
    };

    const groupedCodes = new Set<string>();
    for (const group of groups) {
      for (const code of group.codes) {
        groupedCodes.add(normalizeRawKode(code));
      }
    }

    const ungroupedCodes = allMapelKodes.filter((kode) => !groupedCodes.has(normalizeRawKode(kode)));
    if (ungroupedCodes.length > 0) {
      otherGroup.codes = ungroupedCodes;
    }

    const allGroups = otherGroup.codes.length > 0 ? [...groups, otherGroup] : groups;

    // Filter groups based on selected category tab
    const filteredGroups = selectedCategory === "ALL"
      ? allGroups
      : allGroups.filter((g) => g.label === selectedCategory);

    const ordered = filteredGroups.flatMap((group) => group.codes.filter(Boolean));

    const map = new Map<string, string>();
    allGroups.forEach((g) => {
      g.codes.forEach((c) => {
        map.set(normalizeRawKode(c), g.label);
      });
    });

    return {
      visibleGroups: filteredGroups,
      orderedCodes: ordered,
      codeToCategoryMap: map,
    };
  }, [allMapelKodes, selectedCategory, mapelCategoryByKode]);

  // Helper to extract session count for a specific subject in a row
  const getSubjectCountInRow = (row: MonitoringRow, kode: string) => {
    const normalizedKode = normalizeRawKode(kode);
    if (row.mapelCountByKode[normalizedKode] != null) {
      return row.mapelCountByKode[normalizedKode];
    }
    for (const [rawKey, val] of Object.entries(row.mapelCountByKode)) {
      if (getDisplayMapelKode(rawKey, mapelNameByKode) === normalizedKode) {
        return val;
      }
    }
    return 0;
  };

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        // Cabang filter
        if (selectedCabang !== "ALL" && row.cabang !== selectedCabang) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchKelas = (row.kelas || "").toLowerCase().includes(q);
          const matchCabang = (row.cabang || "").toLowerCase().includes(q);
          const matchMapel = row.mapelList.some((m) => m.toLowerCase().includes(q));
          if (!matchKelas && !matchCabang && !matchMapel) {
            return false;
          }
        }

        // Session status filter
        if (sessionStatus === "HEAVY" && row.totalSesi < 10) return false;
        if (sessionStatus === "MODERATE" && (row.totalSesi === 0 || row.totalSesi >= 10)) return false;
        if (sessionStatus === "EMPTY" && row.totalSesi > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
        if (sortBy === "name_desc") return b.kelas.localeCompare(a.kelas, undefined, { numeric: true });
        if (sortBy === "sessions_desc") return b.totalSesi - a.totalSesi;
        if (sortBy === "sessions_asc") return a.totalSesi - b.totalSesi;
        if (sortBy === "subjects_desc") return b.jumlahMapel - a.jumlahMapel;
        return 0;
      });
  }, [rows, selectedCabang, searchQuery, sessionStatus, sortBy]);

  // Executive KPI stats calculation
  const stats = useMemo(() => {
    const totalMonitoredClasses = rows.length;
    const activeClasses = rows.filter((r) => r.totalSesi > 0).length;
    const totalSessions = rows.reduce((acc, r) => acc + r.totalSesi, 0);
    const avgSessionsPerClass = totalMonitoredClasses > 0 ? (totalSessions / totalMonitoredClasses).toFixed(1) : "0";

    // Top subjects across all rows
    const subjectSessionTotals = new Map<string, number>();
    rows.forEach((r) => {
      allMapelKodes.forEach((kode) => {
        const count = getSubjectCountInRow(r, kode);
        if (count > 0) {
          subjectSessionTotals.set(kode, (subjectSessionTotals.get(kode) || 0) + count);
        }
      });
    });

    let topSubject = "-";
    let topSubjectCount = 0;
    subjectSessionTotals.forEach((count, code) => {
      if (count > topSubjectCount) {
        topSubjectCount = count;
        topSubject = code;
      }
    });

    const fullnessPercentage = totalMonitoredClasses > 0
      ? Math.round((activeClasses / totalMonitoredClasses) * 100)
      : 0;

    return {
      totalMonitoredClasses,
      activeClasses,
      emptyClasses: totalMonitoredClasses - activeClasses,
      totalSessions,
      avgSessionsPerClass,
      totalUniqueSubjects: allMapelKodes.length,
      topSubject,
      topSubjectFullName: getFullSubjectName(topSubject),
      topSubjectCount,
      fullnessPercentage,
      subjectSessionTotals,
    };
  }, [rows, allMapelKodes]);

  // Column totals for the matrix summary footer
  const columnTotals = useMemo(() => {
    const map = new Map<string, number>();
    orderedCodes.forEach((kode) => {
      let sum = 0;
      filteredRows.forEach((row) => {
        sum += getSubjectCountInRow(row, kode);
      });
      map.set(kode, sum);
    });
    return map;
  }, [filteredRows, orderedCodes]);

  // Subject Ranking List for Distribution View
  const subjectRankings = useMemo(() => {
    return allMapelKodes
      .map((kode) => {
        let totalSessions = 0;
        let classCount = 0;
        rows.forEach((r) => {
          const count = getSubjectCountInRow(r, kode);
          if (count > 0) {
            totalSessions += count;
            classCount += 1;
          }
        });
        const category = codeToCategoryMap.get(normalizeRawKode(kode)) || "LAINNYA";
        const percentage = stats.totalSessions > 0
          ? ((totalSessions / stats.totalSessions) * 100).toFixed(1)
          : "0";

        return {
          kode,
          fullName: getFullSubjectName(kode),
          category,
          totalSessions,
          classCount,
          percentage: Number(percentage),
        };
      })
      .sort((a, b) => b.totalSessions - a.totalSessions);
  }, [allMapelKodes, rows, codeToCategoryMap, stats.totalSessions]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = ["No", "Cabang", "Kelas", "Total Sesi", "Jumlah Mapel", ...orderedCodes];
    const csvRows = [headers.join(",")];

    filteredRows.forEach((row, idx) => {
      const counts = orderedCodes.map((code) => getSubjectCountInRow(row, code));
      const rowData = [
        idx + 1,
        `"${row.cabang.replace(/"/g, '""')}"`,
        `"${row.kelas.replace(/"/g, '""')}"`,
        row.totalSesi,
        row.jumlahMapel,
        ...counts,
      ];
      csvRows.push(rowData.join(","));
    });

    // Add footer totals
    const footerTotals = orderedCodes.map((code) => columnTotals.get(code) || 0);
    const footerRow = ["", '"TOTAL KESELURUHAN"', '""', filteredRows.reduce((a, b) => a + b.totalSesi, 0), "", ...footerTotals];
    csvRows.push(footerRow.join(","));

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Monitoring_Kelas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Executive WhatsApp Report
  const handleCopyWhatsAppSummary = () => {
    let text = `📊 *LAPORAN MONITORING KBM & ALOKASI MAPEL PER KELAS*\n`;
    text += `🏢 Cabang: ${selectedCabang === "ALL" ? "Semua Cabang" : selectedCabang}\n`;
    text += `📅 Tanggal Laporan: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}\n`;
    text += `------------------------------------\n`;
    text += `📈 *Ringkasan Eksekutif:*\n`;
    text += `• Total Kelas Terpantau: *${stats.totalMonitoredClasses} Kelas* (${stats.activeClasses} Aktif, ${stats.emptyClasses} Belum Terisi)\n`;
    text += `• Total Sesi Terjadwal: *${stats.totalSessions} Pertemuan*\n`;
    text += `• Rata-rata Sesi / Kelas: *${stats.avgSessionsPerClass} Sesi*\n`;
    text += `• Mapel Terbanyak: *${stats.topSubject}* (${stats.topSubjectFullName}) - ${stats.topSubjectCount} sesi\n`;
    text += `• Tingkat Keterisian: *${stats.fullnessPercentage}%*\n\n`;

    text += `📋 *Rincian Alokasi per Kelas:*\n`;
    filteredRows.slice(0, 15).forEach((r, i) => {
      text += `${i + 1}. *${r.kelas}* (${r.cabang}): ${r.totalSesi} Sesi | ${r.jumlahMapel} Mapel\n`;
      if (r.mapelList.length > 0) {
        text += `   ↳ ${r.mapelList.slice(0, 5).join(", ")}${r.mapelList.length > 5 ? "..." : ""}\n`;
      }
    });

    if (filteredRows.length > 15) {
      text += `\n...dan ${filteredRows.length - 15} kelas lainnya.\n`;
    }

    text += `\nSistem Manajemen Jadwal KBM Terpadu • Neutron Yogyakarta`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    });
  };

  // Native Print Table
  const handlePrintMonitoring = () => {
    window.print();
  };

  return (
    <div className="monitoring-kelas-view-container mt-3">
      {/* 1. Executive Hero Header */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
        <div className="p-3 p-md-4 bg-gradient-primary-soft border-bottom d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{ width: 48, height: 48 }}
            >
              <i className="bi bi-speedometer2 fs-4" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="fw-bold mb-0 text-dark">Dashboard Monitoring KBM & Alokasi Mapel</h5>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-0.5 text-xxs font-monospace">
                  Live Matrix Analytics
                </span>
                <span className="badge bg-success-subtle text-success rounded-pill px-2 py-0.5 text-xxs">
                  {stats.fullnessPercentage}% Terjadwal
                </span>
              </div>
              <p className="text-muted text-xs mb-0 mt-1">
                Pantau frekuensi pertemuan, keseimbangan kurikulum (Umum, SNBT, TKA), dan distribusi jam mengajar per kelas secara *real-time*.
              </p>
            </div>
          </div>

          {/* Quick Action Station */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
              onClick={handleCopyWhatsAppSummary}
              title="Salin ringkasan monitoring untuk WhatsApp"
            >
              <i className={`bi ${copiedNotice ? "bi-check2-all text-success" : "bi-whatsapp text-success"}`} />
              <span>{copiedNotice ? "Tersalin!" : "Salin Laporan WA"}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              title="Ekspor matriks data lengkap ke file CSV Excel"
            >
              <i className="bi bi-file-earmark-excel-fill text-success" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
              onClick={handlePrintMonitoring}
              title="Cetak lembar laporan monitoring"
            >
              <i className="bi bi-printer" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Metric KPIs (5 Bento Cards) */}
        <div className="p-3 p-md-4 border-bottom bg-light-subtle">
          <div className="row g-3">
            {/* KPI 1: Monitored Classes */}
            <div className="col-6 col-md-4 col-xl">
              <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted text-xxs fw-bold text-uppercase">Total Kelas</span>
                  <div className="rounded-2 p-1.5 bg-blue-subtle text-primary">
                    <i className="bi bi-mortarboard-fill fs-6" />
                  </div>
                </div>
                <div className="h4 fw-bold text-dark mb-1">{stats.totalMonitoredClasses}</div>
                <div className="text-xxs text-muted d-flex align-items-center gap-1">
                  <span className="text-success fw-bold">● {stats.activeClasses} Aktif</span>
                  <span className="text-muted">|</span>
                  <span className="text-secondary">{stats.emptyClasses} Belum Terisi</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Total Sessions */}
            <div className="col-6 col-md-4 col-xl">
              <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted text-xxs fw-bold text-uppercase">Total Sesi KBM</span>
                  <div className="rounded-2 p-1.5 bg-emerald-subtle text-success">
                    <i className="bi bi-calendar-check-fill fs-6" />
                  </div>
                </div>
                <div className="h4 fw-bold text-success mb-1">{stats.totalSessions}</div>
                <div className="text-xxs text-muted">
                  Akumulasi seluruh sesi terjadwal
                </div>
              </div>
            </div>

            {/* KPI 3: Average Sessions / Class */}
            <div className="col-6 col-md-4 col-xl">
              <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted text-xxs fw-bold text-uppercase">Rata-rata / Kelas</span>
                  <div className="rounded-2 p-1.5 bg-indigo-subtle text-indigo">
                    <i className="bi bi-pie-chart-fill fs-6" />
                  </div>
                </div>
                <div className="h4 fw-bold text-dark mb-1">{stats.avgSessionsPerClass} <span className="text-xs fw-normal text-muted">Sesi</span></div>
                <div className="text-xxs text-muted">
                  Beban rata-rata per rombel
                </div>
              </div>
            </div>

            {/* KPI 4: Subject Variety */}
            <div className="col-6 col-md-6 col-xl">
              <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted text-xxs fw-bold text-uppercase">Mata Pelajaran</span>
                  <div className="rounded-2 p-1.5 bg-purple-subtle text-purple">
                    <i className="bi bi-book-half fs-6" />
                  </div>
                </div>
                <div className="h4 fw-bold text-purple mb-1">{stats.totalUniqueSubjects} <span className="text-xs fw-normal text-muted">Mapel</span></div>
                <div className="text-xxs text-muted">
                  3 Kategori (Umum, SNBT, TKA)
                </div>
              </div>
            </div>

            {/* KPI 5: Top Subject */}
            <div className="col-12 col-md-6 col-xl">
              <div className="card h-100 border rounded-3 p-3 bg-white shadow-2xs">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted text-xxs fw-bold text-uppercase">Mapel Terbanyak</span>
                  <div className="rounded-2 p-1.5 bg-warning-subtle text-warning-emphasis">
                    <i className="bi bi-trophy-fill fs-6" />
                  </div>
                </div>
                <div className="h5 fw-bold text-dark mb-1 text-truncate">
                  {stats.topSubject} <span className="text-xs fw-semibold text-muted">({stats.topSubjectCount} Sesi)</span>
                </div>
                <div className="text-xxs text-muted text-truncate" title={stats.topSubjectFullName}>
                  {stats.topSubjectFullName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Smart Filter Command Center */}
        <div className="p-3 p-md-4">
          <div className="row g-3 align-items-end">
            {/* View Mode Toggle */}
            <div className="col-12 col-lg-4">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-grid-fill text-primary" />
                Mode Tampilan
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
                  Matriks Heatmap
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "cards" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("cards")}
                >
                  <i className="bi bi-card-checklist me-1" />
                  Kartu Kelas
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    viewMode === "distribution" ? "btn-white text-primary shadow-xs" : "text-muted"
                  }`}
                  onClick={() => setViewMode("distribution")}
                >
                  <i className="bi bi-bar-chart-fill me-1" />
                  Distribusi Mapel
                </button>
              </div>
            </div>

            {/* Cabang Selector */}
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-building text-primary" />
                Cabang
              </label>
              <select
                className="form-select form-select-sm fw-semibold"
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
              >
                <option value="ALL">Semua Cabang ({cabangOptions.length})</option>
                {cabangOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-search text-primary" />
                Cari Kelas / Mapel
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm border-start-0"
                  placeholder="Ketik nama kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    type="button"
                    onClick={() => setSearchQuery("")}
                  >
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5">
                Urutkan Data
              </label>
              <select
                className="form-select form-select-sm text-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="name_asc">Kelas (A-Z)</option>
                <option value="name_desc">Kelas (Z-A)</option>
                <option value="sessions_desc">Sesi Terbanyak</option>
                <option value="sessions_asc">Sesi Tersedikit</option>
                <option value="subjects_desc">Variasi Mapel</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Badges: Subject Categories & Status */}
          <div className="mt-3 pt-3 border-top d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Subject Category Filter Tabs */}
            <div className="d-flex align-items-center gap-1.5 flex-wrap">
              <span className="text-xxs fw-bold text-muted text-uppercase me-1">Kategori Kolom:</span>
              <button
                type="button"
                className={`btn btn-xs rounded-pill px-2.5 py-1 ${
                  selectedCategory === "ALL"
                    ? "btn-dark text-white fw-bold shadow-2xs"
                    : "btn-outline-secondary"
                }`}
                onClick={() => setSelectedCategory("ALL")}
              >
                Semua Kategori ({allMapelKodes.length})
              </button>
              {SUBJECT_GROUPS_CONFIG.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  className={`btn btn-xs rounded-pill px-2.5 py-1 ${
                    selectedCategory === g.label
                      ? "btn-primary text-white fw-bold shadow-2xs"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => setSelectedCategory(g.label as SubjectCategoryFilter)}
                >
                  {g.label} ({g.codes.filter((c) => allMapelKodes.includes(c)).length})
                </button>
              ))}
            </div>

            {/* Session Status Filter */}
            <div className="d-flex align-items-center gap-1.5 flex-wrap">
              <span className="text-xxs fw-bold text-muted text-uppercase me-1">Status Sesi:</span>
              <button
                type="button"
                className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                  sessionStatus === "ALL" ? "btn-secondary text-white fw-bold" : "btn-light text-muted border"
                }`}
                onClick={() => setSessionStatus("ALL")}
              >
                Semua ({rows.length})
              </button>
              <button
                type="button"
                className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                  sessionStatus === "HEAVY" ? "btn-success text-white fw-bold" : "btn-light text-muted border"
                }`}
                onClick={() => setSessionStatus("HEAVY")}
              >
                🟢 Padat (&ge;10 Sesi)
              </button>
              <button
                type="button"
                className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                  sessionStatus === "MODERATE" ? "btn-warning text-dark fw-bold" : "btn-light text-muted border"
                }`}
                onClick={() => setSessionStatus("MODERATE")}
              >
                🟡 Sedang (1-9 Sesi)
              </button>
              <button
                type="button"
                className={`btn btn-xs rounded-pill px-2 py-0.5 ${
                  sessionStatus === "EMPTY" ? "btn-danger text-white fw-bold" : "btn-light text-muted border"
                }`}
                onClick={() => setSessionStatus("EMPTY")}
              >
                🔴 Kosong (0 Sesi)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEWS */}
      {viewMode === "matrix" && (
        <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
          {/* Matrix Header Legend Bar */}
          <div className="p-3 bg-light border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-xs text-dark d-flex align-items-center gap-1.5">
                <i className="bi bi-grid text-primary" />
                Matriks Sebaran Frekuensi Mapel
              </span>
              <span className="badge bg-white text-muted border rounded-pill px-2 py-0.5 text-xxs">
                Menampilkan {filteredRows.length} dari {rows.length} Kelas • {orderedCodes.length} Mapel
              </span>
            </div>

            {/* Interactive Heatmap Legend */}
            <div className="d-flex align-items-center gap-1.5 text-xxs text-muted flex-wrap">
              <span className="fw-bold text-uppercase">Intensitas:</span>
              <span
                className={`badge px-2 py-1 cursor-pointer transition-all ${
                  highlightCount === 0 ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}
                onClick={() => setHighlightCount(highlightCount === 0 ? null : 0)}
                title="Klik untuk sorot sel 0 sesi"
              >
                - (0x)
              </span>
              <span
                className={`badge px-2 py-1 cursor-pointer transition-all ${
                  highlightCount === 1 ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}
                onClick={() => setHighlightCount(highlightCount === 1 ? null : 1)}
                title="Klik untuk sorot 1 sesi"
              >
                1x Pertemuan
              </span>
              <span
                className={`badge px-2 py-1 cursor-pointer transition-all ${
                  highlightCount === 2 ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: "#bbf7d0", color: "#14532d", border: "1px solid #86efac" }}
                onClick={() => setHighlightCount(highlightCount === 2 ? null : 2)}
                title="Klik untuk sorot 2 sesi"
              >
                2x Pertemuan
              </span>
              <span
                className={`badge px-2 py-1 cursor-pointer transition-all ${
                  highlightCount === 3 ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: "#86efac", color: "#052e16", border: "1px solid #4ade80" }}
                onClick={() => setHighlightCount(highlightCount === 3 ? null : 3)}
                title="Klik untuk sorot 3 sesi"
              >
                3x Pertemuan
              </span>
              <span
                className={`badge px-2 py-1 cursor-pointer transition-all ${
                  highlightCount === 4 ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: "#3b82f6", color: "#ffffff", border: "1px solid #2563eb" }}
                onClick={() => setHighlightCount(highlightCount === 4 ? null : 4)}
                title="Klik untuk sorot 4+ sesi"
              >
                &ge;4x Intensif
              </span>
              {highlightCount !== null && (
                <button
                  type="button"
                  className="btn btn-link btn-xs text-danger p-0 ms-1"
                  onClick={() => setHighlightCount(null)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Precision Heatmap Table */}
          <div className="table-responsive" style={{ maxHeight: "calc(100vh - 280px)", minHeight: 380 }}>
            <table className="table table-bordered table-hover align-middle mb-0 monitoring-modern-table">
              <thead className="sticky-top bg-white" style={{ zIndex: 20 }}>
                {/* Row 1: Group Categories */}
                <tr className="border-bottom">
                  <th
                    className="sticky-col-left bg-light-subtle text-start py-2.5 px-3"
                    style={{ minWidth: 160, zIndex: 25 }}
                    rowSpan={2}
                  >
                    <div className="fw-bold text-dark text-xs">Identitas Kelas</div>
                    <div className="text-xxs text-muted fw-normal">Rombel & Cabang</div>
                  </th>
                  <th
                    className="bg-light text-center py-2 px-2"
                    style={{ minWidth: 85, zIndex: 22 }}
                    rowSpan={2}
                  >
                    <div className="fw-bold text-primary text-xs">Total Sesi</div>
                    <div className="text-xxs text-muted">Akumulasi</div>
                  </th>
                  <th
                    className="bg-light text-center py-2 px-2"
                    style={{ minWidth: 75, zIndex: 22 }}
                    rowSpan={2}
                  >
                    <div className="fw-bold text-dark text-xs">Variasi</div>
                    <div className="text-xxs text-muted">Mapel</div>
                  </th>

                  {visibleGroups.map((group) => (
                    <th
                      key={`grp-${group.label}`}
                      colSpan={group.codes.length}
                      className="text-center py-1.5 px-2"
                      style={{
                        backgroundColor: group.bgSoft,
                        borderColor: group.borderSoft,
                        color: group.color,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-center gap-1.5">
                        <span>{group.label}</span>
                        <span className="badge rounded-pill bg-white text-dark border px-1.5 py-0.5 text-xxs font-normal">
                          {group.codes.length} Mapel
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Row 2: Individual Subject Codes */}
                <tr className="border-bottom">
                  {visibleGroups.map((group) =>
                    group.codes.map((kode) => {
                      const fullName = getFullSubjectName(kode);
                      return (
                        <th
                          key={`th-${group.label}-${kode}`}
                          className="text-center py-2 px-1 text-truncate"
                          style={{
                            minWidth: 46,
                            maxWidth: 58,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor: group.bgSoft,
                            color: group.color,
                          }}
                          title={`${kode}: ${fullName}`}
                        >
                          {kode}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={orderedCodes.length + 3} className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                      <span className="text-muted small">Memuat dan menganalisis data alokasi kelas...</span>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={orderedCodes.length + 3} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-2 text-secondary opacity-50 d-block mb-2" />
                      <div className="fw-semibold text-dark">Tidak ada kelas yang cocok dengan filter</div>
                      <div className="small text-muted">Coba ubah kata kunci pencarian atau ganti filter cabang.</div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isZero = row.totalSesi === 0;
                    return (
                      <tr key={`${row.cabang}-${row.kelas}`} className={isZero ? "bg-light-subtle opacity-75" : ""}>
                        {/* Class Identity Sticky Cell */}
                        <td
                          className="sticky-col-left bg-white px-3 py-2 cursor-pointer hover-bg-light"
                          onClick={() => setDetailModalRow(row)}
                          title="Klik untuk melihat rincian lengkap kelas ini"
                        >
                          <div className="d-flex align-items-center justify-content-between gap-1">
                            <span className="fw-bold text-dark text-xs text-truncate">
                              {row.kelas}
                            </span>
                            <i className="bi bi-chevron-right text-muted text-xxs" />
                          </div>
                          <div className="d-flex align-items-center gap-1.5 mt-0.5">
                            <span className="badge bg-secondary-subtle text-secondary rounded-pill px-1.5 py-0.2 text-xxs">
                              {row.cabang}
                            </span>
                          </div>
                        </td>

                        {/* Total Sesi Badge */}
                        <td className="text-center py-2 px-1">
                          <span
                            className={`badge rounded-pill px-2.5 py-1 text-xs fw-bold ${
                              row.totalSesi >= 10
                                ? "bg-success text-white shadow-2xs"
                                : row.totalSesi > 0
                                ? "bg-primary-subtle text-primary"
                                : "bg-light text-muted border"
                            }`}
                          >
                            {row.totalSesi} Sesi
                          </span>
                        </td>

                        {/* Unique Subjects Count */}
                        <td className="text-center py-2 px-1">
                          <span className="badge bg-light text-dark border rounded-pill px-2 py-0.5 text-xxs fw-semibold">
                            {row.jumlahMapel} Mapel
                          </span>
                        </td>

                        {/* Subject Heatmap Cells */}
                        {orderedCodes.map((kode) => {
                          const count = getSubjectCountInRow(row, kode);
                          const isHighlighted = highlightCount !== null && (highlightCount === 4 ? count >= 4 : count === highlightCount);

                          // Style logic for cell
                          let cellBg = "transparent";
                          let badgeBg = "#f8fafc";
                          let badgeColor = "#94a3b8";
                          let badgeBorder = "#e2e8f0";

                          if (count === 1) {
                            badgeBg = "#dcfce7";
                            badgeColor = "#15803d";
                            badgeBorder = "#bbf7d0";
                          } else if (count === 2) {
                            badgeBg = "#bbf7d0";
                            badgeColor = "#166534";
                            badgeBorder = "#86efac";
                          } else if (count === 3) {
                            badgeBg = "#86efac";
                            badgeColor = "#052e16";
                            badgeBorder = "#4ade80";
                          } else if (count >= 4) {
                            badgeBg = "#2563eb";
                            badgeColor = "#ffffff";
                            badgeBorder = "#1d4ed8";
                          }

                          if (isHighlighted) {
                            cellBg = "rgba(59, 130, 246, 0.15)";
                          }

                          const subjectFullName = getFullSubjectName(kode);

                          return (
                            <td
                              key={`${row.cabang}-${row.kelas}-${kode}`}
                              className="text-center p-1 monitoring-cell"
                              style={{ backgroundColor: cellBg }}
                              title={`${row.kelas} • ${kode} (${subjectFullName}): ${count > 0 ? `${count} Sesi Pertemuan` : "Belum terisi"}`}
                            >
                              {count > 0 ? (
                                <div
                                  className="d-inline-flex align-items-center justify-content-center rounded-2 fw-bold"
                                  style={{
                                    width: 28,
                                    height: 24,
                                    fontSize: "0.78rem",
                                    backgroundColor: badgeBg,
                                    color: badgeColor,
                                    border: `1px solid ${badgeBorder}`,
                                    boxShadow: count >= 3 ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                                  }}
                                >
                                  {count}
                                </div>
                              ) : (
                                <span className="text-muted opacity-40 text-xxs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Sticky Footer */}
              {filteredRows.length > 0 && (
                <tfoot className="sticky-bottom bg-white border-top-2" style={{ zIndex: 18 }}>
                  <tr className="bg-light-subtle fw-bold">
                    <td className="sticky-col-left bg-light-subtle px-3 py-2 text-dark text-xs font-monospace">
                      ∑ TOTAL SELURUH KELAS
                    </td>
                    <td className="text-center py-2 px-1 text-primary text-xs">
                      {filteredRows.reduce((a, b) => a + b.totalSesi, 0)} Sesi
                    </td>
                    <td className="text-center py-2 px-1 text-muted text-xxs">
                      {stats.totalUniqueSubjects} Mapel
                    </td>
                    {orderedCodes.map((kode) => {
                      const sum = columnTotals.get(kode) || 0;
                      const isHigh = sum > 0 && sum >= Math.max(...Array.from(columnTotals.values())) * 0.7;
                      return (
                        <td
                          key={`foot-${kode}`}
                          className="text-center py-1.5 px-0.5"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            backgroundColor: isHigh ? "#eff6ff" : "transparent",
                            color: isHigh ? "#1d4ed8" : "#334155",
                          }}
                          title={`Total seluruh sesi untuk ${kode}: ${sum} pertemuan`}
                        >
                          {sum > 0 ? sum : "-"}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE 2: CLASS BENTO CARDS */}
      {viewMode === "cards" && (
        <div className="row g-3 mb-4">
          {loading ? (
            <div className="col-12 text-center py-5">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              <span className="text-muted small">Memuat kartu analitik kelas...</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="col-12 text-center py-5 text-muted bg-white rounded-4 border">
              <i className="bi bi-inbox fs-2 text-secondary opacity-50 d-block mb-2" />
              <div className="fw-semibold text-dark">Tidak ada kelas yang cocok dengan kriteria</div>
            </div>
          ) : (
            filteredRows.map((row) => {
              const umumCount = SUBJECT_GROUPS_CONFIG[0].codes.reduce(
                (sum, c) => sum + getSubjectCountInRow(row, c),
                0
              );
              const snbtCount = SUBJECT_GROUPS_CONFIG[1].codes.reduce(
                (sum, c) => sum + getSubjectCountInRow(row, c),
                0
              );
              const tkaCount = SUBJECT_GROUPS_CONFIG[2].codes.reduce(
                (sum, c) => sum + getSubjectCountInRow(row, c),
                0
              );

              return (
                <div key={`card-${row.cabang}-${row.kelas}`} className="col-12 col-md-6 col-xl-4">
                  <div className="card h-100 border-0 rounded-4 shadow-sm bg-white overflow-hidden hover-shadow-md transition-all">
                    {/* Card Header */}
                    <div className="p-3 border-bottom bg-gradient-primary-soft d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-bold text-dark text-sm mb-0.5">{row.kelas}</div>
                        <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5 text-xxs">
                          <i className="bi bi-building me-1" />
                          {row.cabang}
                        </span>
                      </div>
                      <div className="text-end">
                        <div className="h5 fw-bold text-primary mb-0">{row.totalSesi}</div>
                        <div className="text-xxs text-muted fw-semibold">Total Sesi</div>
                      </div>
                    </div>

                    {/* Card Body: Curriculum Breakdown */}
                    <div className="p-3">
                      {/* Distribution Mini Progress */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between text-xxs fw-bold mb-1">
                          <span className="text-muted">Komposisi Kurikulum</span>
                          <span className="text-dark">{row.jumlahMapel} Variasi Mapel</span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          {row.totalSesi > 0 ? (
                            <>
                              <div
                                className="progress-bar bg-primary"
                                style={{ width: `${(umumCount / row.totalSesi) * 100}%` }}
                                title={`Umum: ${umumCount} sesi`}
                              />
                              <div
                                className="progress-bar bg-purple"
                                style={{
                                  backgroundColor: "#9333ea",
                                  width: `${(snbtCount / row.totalSesi) * 100}%`,
                                }}
                                title={`SNBT: ${snbtCount} sesi`}
                              />
                              <div
                                className="progress-bar bg-warning"
                                style={{
                                  backgroundColor: "#f97316",
                                  width: `${(tkaCount / row.totalSesi) * 100}%`,
                                }}
                                title={`TKA: ${tkaCount} sesi`}
                              />
                            </>
                          ) : (
                            <div className="progress-bar bg-light text-muted" style={{ width: "100%" }} />
                          )}
                        </div>
                        <div className="d-flex justify-content-between text-xxs text-muted mt-1">
                          <span>🔵 Umum: <strong>{umumCount}</strong></span>
                          <span>🟣 SNBT: <strong>{snbtCount}</strong></span>
                          <span>🟠 TKA: <strong>{tkaCount}</strong></span>
                        </div>
                      </div>

                      {/* Subject Chips Tag List */}
                      <div>
                        <div className="text-xxs fw-bold text-muted text-uppercase mb-1.5">
                          Alokasi Mata Pelajaran Terisi:
                        </div>
                        <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: "auto" }}>
                          {row.mapelList.length > 0 ? (
                            row.mapelList.map((item, idx) => {
                              const [codeOnly] = item.split(" ");
                              const countMatch = item.match(/\((\d+)x\)/);
                              const countNum = countMatch ? Number(countMatch[1]) : 1;
                              const category = codeToCategoryMap.get(normalizeRawKode(codeOnly)) || "LAINNYA";

                              let chipBadgeClass = "bg-blue-subtle text-primary border-blue-subtle";
                              if (category === "SNBT-UTBK") chipBadgeClass = "bg-purple-subtle text-purple border-purple-subtle";
                              if (category === "TKA") chipBadgeClass = "bg-orange-subtle text-orange border-orange-subtle";

                              return (
                                <span
                                  key={idx}
                                  className={`badge border rounded-pill px-2 py-1 text-xxs fw-semibold ${chipBadgeClass}`}
                                  title={`${getFullSubjectName(codeOnly)} (${countNum}x Pertemuan)`}
                                >
                                  {codeOnly} <strong className="ms-1">({countNum}x)</strong>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-muted text-xs fst-italic">Belum ada sesi mapel terisi</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="p-2.5 px-3 bg-light border-top d-flex justify-content-between align-items-center">
                      <span className="text-xxs text-muted">
                        Status: <strong className={row.totalSesi > 0 ? "text-success" : "text-danger"}>
                          {row.totalSesi > 0 ? "● Terjadwal" : "○ Belum Ada Jadwal"}
                        </strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-xs px-2.5 py-1 rounded-pill fw-semibold"
                        onClick={() => setDetailModalRow(row)}
                      >
                        Detail & Rincian <i className="bi bi-arrow-right ms-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. VIEW MODE 3: SUBJECT DEMAND & DISTRIBUTION RANKING */}
      {viewMode === "distribution" && (
        <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
          <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">
            <div>
              <h6 className="fw-bold text-dark mb-0.5">Peringkat & Distribusi Jam Mata Pelajaran</h6>
              <p className="text-muted text-xs mb-0">
                Analisis frekuensi dan proporsi pengajaran mata pelajaran di seluruh kelas bimbingan.
              </p>
            </div>
            <span className="badge bg-primary text-white rounded-pill px-3 py-1 text-xs">
              Total {stats.totalSessions} Sesi Terjadwal
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light-subtle">
                <tr>
                  <th className="py-2.5 px-3 text-center" style={{ width: 50 }}>#</th>
                  <th className="py-2.5 px-3" style={{ minWidth: 140 }}>Kode & Nama Mata Pelajaran</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: 130 }}>Kategori</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: 130 }}>Kelas Diajar</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: 130 }}>Total Sesi KBM</th>
                  <th className="py-2.5 px-3" style={{ minWidth: 200 }}>Proporsi Beban Sesi</th>
                </tr>
              </thead>
              <tbody>
                {subjectRankings.map((sub, index) => {
                  let badgeCategoryClass = "bg-blue-subtle text-primary border border-blue-subtle";
                  if (sub.category === "SNBT-UTBK") badgeCategoryClass = "bg-purple-subtle text-purple border border-purple-subtle";
                  if (sub.category === "TKA") badgeCategoryClass = "bg-orange-subtle text-orange border border-orange-subtle";
                  if (sub.category === "LAINNYA") badgeCategoryClass = "bg-secondary-subtle text-secondary border";

                  const isTop3 = index < 3 && sub.totalSessions > 0;

                  return (
                    <tr key={sub.kode}>
                      <td className="text-center fw-bold">
                        {isTop3 ? (
                          <span className="badge bg-warning text-dark rounded-circle p-1.5" style={{ width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-muted">{index + 1}</span>
                        )}
                      </td>
                      <td className="px-3">
                        <div className="fw-bold text-dark text-xs">{sub.kode}</div>
                        <div className="text-xxs text-muted">{sub.fullName}</div>
                      </td>
                      <td className="text-center">
                        <span className={`badge rounded-pill px-2 py-0.5 text-xxs font-monospace ${badgeCategoryClass}`}>
                          {sub.category}
                        </span>
                      </td>
                      <td className="text-center fw-semibold text-xs">
                        {sub.classCount} <span className="text-muted fw-normal">Kelas</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 text-xs fw-bold">
                          {sub.totalSessions} Sesi
                        </span>
                      </td>
                      <td className="px-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: 8 }}>
                            <div
                              className="progress-bar bg-gradient-primary rounded-pill"
                              style={{ width: `${Math.min(100, sub.percentage * 4)}%` }}
                            />
                          </div>
                          <span className="text-xs fw-bold text-muted font-monospace" style={{ minWidth: 45 }}>
                            {sub.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. MODAL DETAIL KELAS */}
      {detailModalRow && (
        <div className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
          <div className="card shadow-lg border-0 rounded-4 overflow-hidden modal-content-card" style={{ maxWidth: 540, width: "100%" }}>
            {/* Modal Header */}
            <div className="p-3 bg-gradient-primary text-white d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-bold mb-0 text-white d-flex align-items-center gap-2">
                  <i className="bi bi-mortarboard-fill" />
                  Rincian KBM: {detailModalRow.kelas}
                </h6>
                <div className="text-white-50 text-xxs mt-0.5">
                  Cabang: <strong>{detailModalRow.cabang}</strong> • Terjadwal: <strong>{detailModalRow.totalSesi} Sesi</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setDetailModalRow(null)}
              />
            </div>

            {/* Modal Body */}
            <div className="p-3 p-md-4 bg-white" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* Quick Summary Grid */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-2.5 bg-light rounded-3 border text-center">
                    <span className="text-xxs text-muted text-uppercase fw-bold d-block">Total Pertemuan</span>
                    <span className="h4 fw-bold text-primary mb-0">{detailModalRow.totalSesi}</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2.5 bg-light rounded-3 border text-center">
                    <span className="text-xxs text-muted text-uppercase fw-bold d-block">Variasi Mapel</span>
                    <span className="h4 fw-bold text-purple mb-0">{detailModalRow.jumlahMapel}</span>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown List */}
              <div className="mb-2">
                <h6 className="fw-bold text-dark text-xs text-uppercase mb-2 d-flex align-items-center gap-1">
                  <i className="bi bi-list-check text-primary" />
                  Daftar Alokasi Mata Pelajaran
                </h6>

                {detailModalRow.mapelList.length === 0 ? (
                  <div className="p-3 text-center text-muted bg-light rounded-3 border small">
                    Belum ada mata pelajaran teralokasi pada kelas ini.
                  </div>
                ) : (
                  <div className="list-group list-group-flush rounded-3 border">
                    {detailModalRow.mapelList.map((item, idx) => {
                      const [codeOnly] = item.split(" ");
                      const countMatch = item.match(/\((\d+)x\)/);
                      const countNum = countMatch ? Number(countMatch[1]) : 1;
                      const fullName = getFullSubjectName(codeOnly);
                      const category = codeToCategoryMap.get(normalizeRawKode(codeOnly)) || "LAINNYA";

                      return (
                        <div
                          key={idx}
                          className="list-group-item d-flex align-items-center justify-content-between py-2 px-3 hover-bg-light"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-light text-dark border font-monospace text-xs px-2 py-1">
                              {codeOnly}
                            </span>
                            <div>
                              <div className="fw-semibold text-xs text-dark">{fullName}</div>
                              <span className="text-xxs text-muted">{category}</span>
                            </div>
                          </div>
                          <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 text-xs fw-bold">
                            {countNum} Pertemuan
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-light border-top d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary btn-sm px-4 rounded-3 fw-semibold"
                onClick={() => setDetailModalRow(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
