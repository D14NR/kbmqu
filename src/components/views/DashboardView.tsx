import { useMemo, useState } from "react";
import { formatLocalDate, parseFlexibleDate, parseRangeFromString } from "../../utils/schedule";
import { getTagStyle } from "../../utils/tagColor";

type DashboardRequestItem = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  cabangDomisili: string;
  status: string;
};

type DashboardScheduleItem = {
  id: string;
  tanggal: string;
  waktu: string;
  mapel: string;
  pengajar: string;
  kelas: string;
  cabang: string;
  sourceLabel: string;
};

type DashboardIzinItem = {
  id: string;
  namaPengajar: string;
  domisili: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string;
  status: string;
  diputuskanOleh: string;
  diputuskanPada: string;
};

type DashboardViewProps = {
  loading: boolean;
  pendingRequests: DashboardRequestItem[];
  dashboardSchedules: DashboardScheduleItem[];
  izinRequests: DashboardIzinItem[];
  canManageIzin: boolean;
  canManagePermintaan: boolean;
  userCabang?: string;
  isAdmin?: boolean;
  onApproveIzin: (item: DashboardIzinItem) => void;
  onRejectIzin: (item: DashboardIzinItem) => void;
  onApprovePermintaan: (item: DashboardRequestItem) => void;
  onRejectPermintaan: (item: DashboardRequestItem) => void;
};

const normalizeText = (value: string) => (value || "").trim().toLowerCase();

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarBg = (name: string) => {
  if (!name) return "#4f46e5";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#2563eb", // blue
    "#059669", // emerald
    "#7c3aed", // violet
    "#d97706", // amber
    "#dc2626", // red
    "#0891b2", // cyan
    "#4f46e5", // indigo
    "#db2777", // pink
  ];
  return colors[Math.abs(hash) % colors.length];
};

export function DashboardView({
  loading,
  pendingRequests,
  dashboardSchedules,
  izinRequests,
  canManageIzin,
  canManagePermintaan,
  userCabang = "",
  isAdmin = false,
  onApproveIzin,
  onRejectIzin,
  onApprovePermintaan,
  onRejectPermintaan,
}: DashboardViewProps) {
  const todayKey = formatLocalDate(new Date());
  const tomorrowKey = formatLocalDate(new Date(Date.now() + 86400000));

  const [scheduleMode, setScheduleMode] = useState<"today" | "tomorrow" | "custom">("today");
  const [customScheduleDate, setCustomScheduleDate] = useState(todayKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "reguler" | "khusus">("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeApprovalTab, setActiveApprovalTab] = useState<"permintaan" | "izin">("permintaan");

  const selectedScheduleKey =
    scheduleMode === "today"
      ? todayKey
      : scheduleMode === "tomorrow"
      ? tomorrowKey
      : customScheduleDate;

  // Format Indonesian date
  const formattedFullDate = useMemo(() => {
    try {
      const parts = selectedScheduleKey.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return selectedScheduleKey;
  }, [selectedScheduleKey]);

  const scheduleLabel =
    scheduleMode === "today"
      ? "Hari Ini"
      : scheduleMode === "tomorrow"
      ? "Besok"
      : formattedFullDate;

  // Filter schedules by date
  const dateSchedules = useMemo(() => {
    return (dashboardSchedules || []).filter((item) => {
      if (!(item.pengajar || "").trim()) {
        return false;
      }
      const parsedDate = parseFlexibleDate(item.tanggal || "");
      return parsedDate && formatLocalDate(parsedDate) === selectedScheduleKey;
    });
  }, [dashboardSchedules, selectedScheduleKey]);

  // Filter by search & type
  const filteredSchedules = useMemo(() => {
    return dateSchedules.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (item.pengajar || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.mapel || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.kelas || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.cabang || "").toLowerCase().includes(searchQuery.toLowerCase());

      const sourceLabelLower = (item.sourceLabel || "").toLowerCase();
      const matchesType =
        filterType === "all" ||
        (filterType === "reguler" && sourceLabelLower.includes("reguler")) ||
        (filterType === "khusus" && (sourceLabelLower.includes("khusus") || sourceLabelLower.includes("tambahan")));

      return matchesSearch && matchesType;
    });
  }, [dateSchedules, searchQuery, filterType]);

  // Group schedules by teacher
  const scheduleGroups = useMemo(() => {
    const sorted = [...filteredSchedules].sort((a, b) => {
      const pa = (a.pengajar || "").toLowerCase();
      const pb = (b.pengajar || "").toLowerCase();
      if (pa !== pb) return pa.localeCompare(pb);
      const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    });

    const groups = new Map<string, typeof sorted>();
    sorted.forEach((s) => {
      const key = s.pengajar || "(Tanpa Pengajar)";
      if (!groups.has(key)) groups.set(key, [] as typeof sorted);
      groups.get(key)!.push(s);
    });
    return groups;
  }, [filteredSchedules]);

  // Chronological list for table view
  const chronologicalSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      if (aStart !== bStart) return aStart - bStart;
      return (a.pengajar || "").localeCompare(b.pengajar || "");
    });
  }, [filteredSchedules]);

  // Pending Izin & Permintaan
  const waitingIzinRequests = useMemo(() => {
    return (izinRequests || []).filter(
      (item) => normalizeText(item.status || "Menunggu") === "menunggu"
    );
  }, [izinRequests]);

  const showIzinSection = waitingIzinRequests.length > 0;
  const showPermintaanSection = pendingRequests.length > 0;
  const hasPendingApprovals = showIzinSection || showPermintaanSection;

  // Active Teachers count
  const uniqueTeachersCount = useMemo(() => {
    const teacherSet = new Set(dateSchedules.map((s) => (s.pengajar || "").trim()).filter(Boolean));
    return teacherSet.size;
  }, [dateSchedules]);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  return (
    <div className="container-fluid px-0">
      {/* 1. Header Banner */}
      <div className="card shadow-sm border rounded-3 mb-3 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <span className="badge bg-primary text-white px-2 py-1 rounded-pill">
                  <i className="bi bi-speedometer2 me-1" />
                  Dashboard Monitoring
                </span>
                {userCabang && (
                  <span className="badge bg-light text-dark border px-2 py-1 rounded-pill">
                    <i className="bi bi-geo-alt me-1 text-primary" />
                    Cabang: {userCabang}
                  </span>
                )}
                {isAdmin && (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill">
                    <i className="bi bi-shield-lock me-1" />
                    Administrator
                  </span>
                )}
              </div>
              <h4 className="fw-bold mb-1 text-dark">
                {greetingText}, Monitoring KBM-Qu
              </h4>
              <div className="text-muted small">
                Ikhtisar operasional kegiatan belajar mengajar, ketersediaan pengajar, dan persetujuan cabang.
              </div>
            </div>

            {/* Date Select Button Group */}
            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 bg-light p-1.5 rounded-3 border">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${scheduleMode === "today" ? "btn-primary shadow-sm fw-bold" : "btn-light text-secondary"}`}
                  onClick={() => setScheduleMode("today")}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  className={`btn ${scheduleMode === "tomorrow" ? "btn-primary shadow-sm fw-bold" : "btn-light text-secondary"}`}
                  onClick={() => setScheduleMode("tomorrow")}
                >
                  Besok
                </button>
                <button
                  type="button"
                  className={`btn ${scheduleMode === "custom" ? "btn-primary shadow-sm fw-bold" : "btn-light text-secondary"}`}
                  onClick={() => setScheduleMode("custom")}
                >
                  Pilih Tanggal
                </button>
              </div>

              {scheduleMode === "custom" && (
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={customScheduleDate}
                  onChange={(e) => setCustomScheduleDate(e.target.value)}
                  style={{ width: 145 }}
                />
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-top d-flex flex-wrap align-items-center justify-content-between small text-muted gap-2">
            <div>
              <i className="bi bi-calendar3 text-primary me-1" />
              Jadwal Aktif: <strong className="text-dark">{formattedFullDate}</strong>
            </div>
            <div className="d-flex gap-3">
              <span>Total: <strong className="text-primary">{dateSchedules.length} Sesi</strong></span>
              <span>•</span>
              <span>Pengajar: <strong className="text-success">{uniqueTeachersCount} Orang</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Stat Cards */}
      <div className="row g-3 mb-3">
        {/* KPI 1 */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border rounded-3 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted fw-semibold small text-uppercase">Sesi KBM Terjadwal</span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
                style={{ width: 38, height: 38 }}
              >
                <i className="bi bi-calendar-event fs-5" />
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-bold text-dark mb-0">{dateSchedules.length}</h2>
              <span className="text-muted small">Sesi Kelas</span>
            </div>
            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small text-muted">
              <span>{scheduleLabel}</span>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                Aktif
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border rounded-3 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted fw-semibold small text-uppercase">Pengajar Bertugas</span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
                style={{ width: 38, height: 38 }}
              >
                <i className="bi bi-person-check fs-5" />
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-bold text-dark mb-0">{uniqueTeachersCount}</h2>
              <span className="text-muted small">Pengajar</span>
            </div>
            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small text-muted">
              <span>{userCabang ? `Cabang ${userCabang}` : "Semua Cabang"}</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Siap Mengajar
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border rounded-3 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted fw-semibold small text-uppercase">Permintaan Antar Cabang</span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3 bg-warning-subtle text-warning"
                style={{ width: 38, height: 38 }}
              >
                <i className="bi bi-arrow-left-right fs-5" />
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-bold text-dark mb-0">{pendingRequests.length}</h2>
              <span className="text-muted small">Permintaan</span>
            </div>
            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small">
              {pendingRequests.length > 0 ? (
                <>
                  <span className="text-warning fw-semibold">Menunggu Respon</span>
                  <span className="badge bg-warning text-dark">Perlu Aksi</span>
                </>
              ) : (
                <>
                  <span className="text-muted">Tidak ada pending</span>
                  <span className="badge bg-light text-muted border">Clear</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border rounded-3 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted fw-semibold small text-uppercase">Izin Pengajar</span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3 bg-danger-subtle text-danger"
                style={{ width: 38, height: 38 }}
              >
                <i className="bi bi-calendar-x fs-5" />
              </div>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="fw-bold text-dark mb-0">{waitingIzinRequests.length}</h2>
              <span className="text-muted small">Pengajuan</span>
            </div>
            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small">
              {waitingIzinRequests.length > 0 ? (
                <>
                  <span className="text-danger fw-semibold">{waitingIzinRequests.length} Izin Menunggu</span>
                  <span className="badge bg-danger text-white">Verifikasi</span>
                </>
              ) : (
                <>
                  <span className="text-muted">Semua pengajar aktif</span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">Nihil</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Center Section (Jika ada persetujuan yang menunggu) */}
      {hasPendingApprovals && (
        <div className="card shadow-sm border rounded-3 mb-3 bg-white overflow-hidden">
          <div className="card-header bg-warning-subtle py-2.5 px-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon text-warning fs-5" />
              <strong className="text-dark">Pusat Persetujuan & Verifikasi</strong>
            </div>
            <div className="d-flex gap-2">
              {showPermintaanSection && (
                <button
                  type="button"
                  className={`btn btn-sm ${activeApprovalTab === "permintaan" ? "btn-warning text-dark fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setActiveApprovalTab("permintaan")}
                >
                  <i className="bi bi-arrow-left-right me-1" />
                  Antar Cabang ({pendingRequests.length})
                </button>
              )}
              {showIzinSection && (
                <button
                  type="button"
                  className={`btn btn-sm ${activeApprovalTab === "izin" ? "btn-primary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setActiveApprovalTab("izin")}
                >
                  <i className="bi bi-file-earmark-medical me-1" />
                  Izin Pengajar ({waitingIzinRequests.length})
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            {activeApprovalTab === "permintaan" && showPermintaanSection && (
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Pengajar</th>
                    <th>Cabang Peminta</th>
                    <th>Cabang Domisili</th>
                    <th>Status</th>
                    <th className="text-end pe-3" style={{ width: 170 }}>Aksi Keputusan</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((item) => {
                    const statusKey = normalizeText(item.status || "Menunggu");
                    const isFromDariCabang = isAdmin || normalizeText(userCabang) === normalizeText(item.cabangDomisili || "");
                    const canShowAction = canManagePermintaan && statusKey === "menunggu" && isFromDariCabang;

                    return (
                      <tr key={item.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="text-white fw-bold d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                              style={{ width: 32, height: 32, backgroundColor: getAvatarBg(item.namaPengajar), fontSize: "11px" }}
                            >
                              {getInitials(item.namaPengajar)}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">{item.namaPengajar || "-"}</div>
                              <div className="text-muted text-xxs">Kode: {item.kodePengajar || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {item.cabangPeminta || "-"}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {item.cabangDomisili || "-"}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {item.status || "Menunggu"}
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          {canShowAction ? (
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-success px-2 py-1"
                                onClick={() => onApprovePermintaan(item)}
                              >
                                <i className="bi bi-check-lg me-1" />
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger px-2 py-1"
                                onClick={() => onRejectPermintaan(item)}
                              >
                                <i className="bi bi-x-lg me-1" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted fst-italic small">Hanya cabang asal / Admin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeApprovalTab === "izin" && showIzinSection && (
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Nama Pengajar</th>
                    <th>Domisili</th>
                    <th>Periode Izin</th>
                    <th>Keterangan</th>
                    <th>Status</th>
                    <th className="text-end pe-3" style={{ width: 170 }}>Aksi Keputusan</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingIzinRequests.map((item) => {
                    const normalizedStatus = normalizeText(item.status || "Menunggu");
                    const canShowAction = canManageIzin && normalizedStatus === "menunggu";

                    return (
                      <tr key={item.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="text-white fw-bold d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                              style={{ width: 32, height: 32, backgroundColor: getAvatarBg(item.namaPengajar), fontSize: "11px" }}
                            >
                              {getInitials(item.namaPengajar)}
                            </div>
                            <span className="fw-semibold text-dark">{item.namaPengajar || "-"}</span>
                          </div>
                        </td>
                        <td>{item.domisili || "-"}</td>
                        <td>
                          {item.tanggalMulai} s.d. {item.tanggalSelesai}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 220 }} title={item.keterangan}>
                          {item.keterangan || "-"}
                        </td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {item.status || "Menunggu"}
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          {canShowAction ? (
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-success px-2 py-1"
                                onClick={() => onApproveIzin(item)}
                              >
                                <i className="bi bi-check-lg me-1" />
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger px-2 py-1"
                                onClick={() => onRejectIzin(item)}
                              >
                                <i className="bi bi-x-lg me-1" />
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted fst-italic small">Tidak diizinkan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. Main Schedules Explorer */}
      <div className="card shadow-sm border rounded-3 bg-white mb-4">
        {/* Header Toolbar */}
        <div className="card-header bg-white py-3 px-3 px-md-4 border-bottom">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-calendar2-week text-primary fs-5" />
                <h6 className="fw-bold mb-0 text-dark">
                  Jadwal KBM: {scheduleLabel}
                </h6>
              </div>
              <div className="text-muted small mt-0.5">
                Menampilkan <strong>{filteredSchedules.length}</strong> sesi dari <strong>{scheduleGroups.size}</strong> pengajar
              </div>
            </div>

            {/* Filter & Controls */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search */}
              <div className="input-group input-group-sm" style={{ width: 220 }}>
                <span className="input-group-text bg-light">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari pengajar, mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary bg-white"
                    onClick={() => setSearchQuery("")}
                  >
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>

              {/* Filter Type */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${filterType === "all" ? "btn-secondary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setFilterType("all")}
                >
                  Semua
                </button>
                <button
                  type="button"
                  className={`btn ${filterType === "reguler" ? "btn-secondary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setFilterType("reguler")}
                >
                  Reguler
                </button>
                <button
                  type="button"
                  className={`btn ${filterType === "khusus" ? "btn-secondary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setFilterType("khusus")}
                >
                  Khusus
                </button>
              </div>

              {/* View Toggle */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${viewMode === "cards" ? "btn-primary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setViewMode("cards")}
                >
                  <i className="bi bi-grid-fill me-1" />
                  Kartu
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === "table" ? "btn-primary fw-bold" : "btn-outline-secondary bg-white"}`}
                  onClick={() => setViewMode("table")}
                >
                  <i className="bi bi-list-ul me-1" />
                  Daftar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="card-body p-3 p-md-4 bg-light">
          {loading ? (
            <div className="py-5 text-center text-muted">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
              <span>Memuat data jadwal dashboard...</span>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="py-5 text-center bg-white rounded-3 border p-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light text-muted mb-2"
                style={{ width: 52, height: 52 }}
              >
                <i className="bi bi-calendar2-x fs-3" />
              </div>
              <h6 className="fw-bold text-dark mb-1">Tidak Ada Jadwal KBM</h6>
              <p className="text-muted small mb-3">
                {searchQuery
                  ? `Tidak ada jadwal yang cocok dengan kata kunci "${searchQuery}".`
                  : `Tidak ada sesi KBM yang dijadwalkan untuk ${scheduleLabel}.`}
              </p>
              {scheduleMode !== "today" && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary px-3"
                  onClick={() => setScheduleMode("today")}
                >
                  <i className="bi bi-arrow-return-left me-1" />
                  Kembali ke Hari Ini
                </button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            /* Cards View */
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
              {Array.from(scheduleGroups.entries()).map(([pengajar, items]) => {
                const avatarColor = getAvatarBg(pengajar);
                const initials = getInitials(pengajar);

                return (
                  <div key={pengajar} className="col">
                    <div className="card h-100 border shadow-sm rounded-3 bg-white">
                      {/* Teacher Header */}
                      <div className="card-header bg-white py-2.5 px-3 border-bottom d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2 text-truncate">
                          <div
                            className="text-white fw-bold d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                            style={{
                              width: 36,
                              height: 36,
                              minWidth: 36,
                              minHeight: 36,
                              backgroundColor: avatarColor,
                              fontSize: "12px",
                            }}
                          >
                            {initials}
                          </div>
                          <div className="text-truncate">
                            <div className="fw-bold text-dark text-truncate" title={pengajar}>
                              {pengajar}
                            </div>
                            <div className="text-muted text-xxs d-flex align-items-center gap-1">
                              <span><i className="bi bi-clock me-0.5" />{items.length} Sesi</span>
                              {items[0]?.cabang && (
                                <span>• <i className="bi bi-geo-alt me-0.5" />{items[0].cabang}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1">
                          {items.length} Sesi
                        </span>
                      </div>

                      {/* Sessions List */}
                      <div className="card-body p-2.5">
                        <div className="d-flex flex-column gap-2">
                          {items.map((item) => {
                            const tagStyle = getTagStyle(item.mapel || "default", "mapel");
                            const isReguler = (item.sourceLabel || "").toLowerCase().includes("reguler");

                            return (
                              <div
                                key={item.id}
                                className="p-2 rounded-2 border bg-light d-flex align-items-start justify-content-between gap-2"
                              >
                                <div className="d-flex align-items-start gap-2 flex-grow-1">
                                  {/* Jam Sesi */}
                                  <div
                                    className="px-2 py-1 bg-white border rounded text-dark font-monospace fw-semibold text-center flex-shrink-0 mt-1"
                                    style={{ fontSize: "11px", minWidth: 80 }}
                                  >
                                    <i className="bi bi-clock me-1 text-primary" />
                                    {item.waktu || "-"}
                                  </div>

                                  {/* Mapel & Kelas */}
                                  <div className="d-flex flex-wrap gap-1.5 flex-grow-1">
                                    <span
                                      className="badge px-2 py-1 rounded border fw-semibold text-wrap text-start"
                                      style={{
                                        backgroundColor: tagStyle.backgroundColor || "#e2e8f0",
                                        borderColor: tagStyle.borderColor || "#cbd5e1",
                                        color: tagStyle.color || "#1e293b",
                                        lineHeight: "1.3",
                                      }}
                                      title={item.mapel}
                                    >
                                      {item.mapel || "-"}
                                    </span>
                                    <span 
                                      className="badge bg-white text-dark border px-2 py-1 rounded text-wrap text-start"
                                      style={{ lineHeight: "1.3" }}
                                    >
                                      {item.kelas || "-"}
                                    </span>
                                  </div>
                                </div>

                                {/* Jenis KBM */}
                                <span
                                  className={`badge px-2 py-1 rounded-pill flex-shrink-0 mt-1 ${
                                    isReguler
                                      ? "bg-secondary-subtle text-secondary border border-secondary-subtle"
                                      : "bg-info-subtle text-info border border-info-subtle"
                                  }`}
                                >
                                  {item.sourceLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="table-responsive bg-white rounded-3 border">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3" style={{ width: 120 }}>Waktu</th>
                    <th>Mata Pelajaran</th>
                    <th>Kelas</th>
                    <th>Pengajar</th>
                    <th>Cabang</th>
                    <th className="pe-3" style={{ width: 110 }}>Jenis KBM</th>
                  </tr>
                </thead>
                <tbody>
                  {chronologicalSchedules.map((item) => {
                    const tagStyle = getTagStyle(item.mapel || "default", "mapel");
                    const isReguler = (item.sourceLabel || "").toLowerCase().includes("reguler");

                    return (
                      <tr key={item.id}>
                        <td className="ps-3 font-monospace fw-semibold text-primary">
                          <i className="bi bi-clock me-1 text-muted" />
                          {item.waktu || "-"}
                        </td>
                        <td>
                          <span
                            className="badge px-2 py-1 rounded-pill border fw-semibold"
                            style={{
                              backgroundColor: tagStyle.backgroundColor || "#e2e8f0",
                              borderColor: tagStyle.borderColor || "#cbd5e1",
                              color: tagStyle.color || "#1e293b",
                            }}
                          >
                            {item.mapel || "-"}
                          </span>
                        </td>
                        <td>
                          <strong className="text-dark">{item.kelas || "-"}</strong>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="text-white fw-bold d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                              style={{
                                width: 26,
                                height: 26,
                                backgroundColor: getAvatarBg(item.pengajar),
                                fontSize: "10px",
                              }}
                            >
                              {getInitials(item.pengajar)}
                            </div>
                            <span className="fw-semibold text-dark">{item.pengajar || "-"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-muted">{item.cabang || "-"}</span>
                        </td>
                        <td className="pe-3">
                          <span
                            className={`badge px-2 py-1 rounded-pill ${
                              isReguler
                                ? "bg-secondary-subtle text-secondary border border-secondary-subtle"
                                : "bg-info-subtle text-info border border-info-subtle"
                            }`}
                          >
                            {item.sourceLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
