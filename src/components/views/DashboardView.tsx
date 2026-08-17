type DashboardRequestItem = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  cabangDomisili: string;
  status: string;
};

import { useState } from "react";
import { formatLocalDate, parseFlexibleDate, parseRangeFromString } from "../../utils/schedule";

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

const normalizeText = (value: string) => value.trim().toLowerCase();

const getInitials = (name: string) => {
  if (!name) return "-";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
};

const colorFromString = (s: string) => {
  if (!s) return "#6c757d";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 60% 45%)`;
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

  const selectedScheduleKey =
    scheduleMode === "today"
      ? todayKey
      : scheduleMode === "tomorrow"
      ? tomorrowKey
      : customScheduleDate;

  const scheduleLabel =
    scheduleMode === "today"
      ? "Hari ini"
      : scheduleMode === "tomorrow"
      ? "Besok"
      : new Date(customScheduleDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const visibleSchedules = (dashboardSchedules || []).filter((item) => {
    if (!(item.pengajar || "").trim()) {
      return false;
    }
    const parsedDate = parseFlexibleDate(item.tanggal || "");
    return parsedDate && formatLocalDate(parsedDate) === selectedScheduleKey;
  });

  const scheduleGroups = (() => {
    const sorted = [...visibleSchedules].sort((a, b) => {
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
  })();

  // Show all izin requests regardless of date status
  // (both active and expired records should be visible)
  const visibleIzinRequests = (izinRequests || []);
  const waitingIzinRequests = visibleIzinRequests.filter(
    (item) => normalizeText(item.status || "Menunggu") === "menunggu"
  );
  const showIzinSection = waitingIzinRequests.length > 0;
  const showPermintaanSection = pendingRequests.length > 0;
  const showDashboardRequestAlert = showIzinSection || showPermintaanSection;

  return (
    <div className="mt-3">
      {showDashboardRequestAlert && (
        <div className="alert alert-info border-info mb-4 shadow-sm">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h5 className="mb-1">Permintaan baru menunggu persetujuan</h5>
              <p className="mb-0 text-muted">
                {showPermintaanSection && `${pendingRequests.length} permintaan pengajar antar cabang menunggu.`}
                {showPermintaanSection && showIzinSection && " "}
                {showIzinSection && `${waitingIzinRequests.length} permintaan izin pengajar menunggu.`}
              </p>
            </div>
            <div className="text-muted small">
              Setelah semua permintaan disetujui atau ditolak, notifikasi ini akan otomatis hilang.
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-3 p-3 mb-4 bg-body-secondary shadow-sm">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
          <div>
            <h5 className="mb-1">Jadwal {scheduleLabel}</h5>
            <p className="mb-0 text-muted">
              Pilih jadwal untuk melihat detail kelas, pengajar, dan cabang secara cepat.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "today" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("today")}
            >
              Hari ini
            </button>
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "tomorrow" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("tomorrow")}
            >
              Besok
            </button>
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "custom" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("custom")}
            >
              Tanggal lain
            </button>
          </div>
          {scheduleMode === "custom" ? (
            <div className="input-group input-group-sm w-auto">
              <span className="input-group-text">Tanggal</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={customScheduleDate}
                onChange={(event) => setCustomScheduleDate(event.target.value)}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-3 text-muted small">
          Menampilkan <strong>{visibleSchedules.length}</strong> jadwal untuk <strong>{scheduleLabel}</strong>.
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-3 g-3 mb-4">
        <div className="col">
          <div className="dashboard-stat-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted small mb-1">Permintaan menunggu</p>
                <h3 className="mb-0">{pendingRequests.length}</h3>
              </div>
              <div className="dashboard-stat-icon bg-warning-subtle text-warning-emphasis">
                <i className="bi bi-send-check" />
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="dashboard-stat-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted small mb-1">Jadwal terpilih</p>
                <h3 className="mb-0">{visibleSchedules.length}</h3>
              </div>
              <div className="dashboard-stat-icon bg-primary-subtle text-primary-emphasis">
                <i className="bi bi-calendar-check" />
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="dashboard-stat-card p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-muted small mb-1">Izin pengajar</p>
                <h3 className="mb-0">{visibleIzinRequests.length}</h3>
              </div>
              <div className="dashboard-stat-icon bg-danger-subtle text-danger-emphasis">
                <i className="bi bi-calendar-x" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showIzinSection && (
        <>
          <h6 className="dashboard-section-title">Permintaan Izin Pengajar</h6>
          <div className="dashboard-request-card mb-4">
            <div className="table-responsive border-0 rounded-bottom table-sticky-wrapper mb-0">
              <table className="table table-sm table-borderless align-middle mb-0 table-sticky">
              <thead className="table-light">
                <tr>
                  <th>Nama Pengajar</th>
                  <th>Domisili</th>
                  <th>Tanggal Mulai</th>
                  <th>Tanggal Selesai</th>
                  <th>Keterangan Izin</th>
                  <th>Keterangan Status</th>
                  <th>Diputuskan Oleh</th>
                  <th>Diputuskan Pada</th>
                  <th className="text-center" style={{ width: 130 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-3">
                      Memuat data dashboard...
                    </td>
                  </tr>
                ) : (
                  waitingIzinRequests.map((item) => {
                    const normalizedStatus = normalizeText(item.status || "Menunggu");
                    const canShowAction = canManageIzin && normalizedStatus === "menunggu";
                    return (
                      <tr key={item.id}>
                        <td>{item.namaPengajar || "-"}</td>
                        <td>{item.domisili || "-"}</td>
                        <td>{item.tanggalMulai || "-"}</td>
                        <td>{item.tanggalSelesai || "-"}</td>
                        <td>{item.keterangan || "-"}</td>
                        <td>
                          <span className="badge text-bg-warning">{item.status || "Menunggu"}</span>
                        </td>
                        <td>{item.diputuskanOleh || "-"}</td>
                        <td>{item.diputuskanPada || "-"}</td>
                        <td>
                          {canShowAction ? (
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => onApproveIzin(item)}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onRejectIzin(item)}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {showPermintaanSection && (
        <>
          <h6 className="dashboard-section-title">Permintaan Pengajar Antar Cabang (Menunggu)</h6>
          <div className="dashboard-request-card mb-4">
            <div className="table-responsive border-0 rounded-bottom table-sticky-wrapper mb-0">
              <table className="table table-sm table-borderless align-middle mb-0 table-sticky">
              <thead className="table-light">
                <tr>
                  <th>Kode Pengajar</th>
                  <th>Nama Pengajar</th>
                  <th>Cabang Peminta</th>
                  <th>Cabang Domisili</th>
                  <th>Status</th>
                  <th className="text-center" style={{ width: 130 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-3">
                      Memuat data dashboard...
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((item) => {
                    const statusKey = normalizeText(item.status || "Menunggu");
                    // Only show action buttons if user can manage AND status is menunggu AND user is from dari_cabang (cabangDomisili)
                    const isFromDariCabang = isAdmin || normalizeText(userCabang) === normalizeText(item.cabangDomisili || "");
                    const canShowAction = canManagePermintaan && statusKey === "menunggu" && isFromDariCabang;
                    return (
                      <tr key={item.id}>
                        <td>{item.kodePengajar || "-"}</td>
                        <td>{item.namaPengajar || "-"}</td>
                        <td>{item.cabangPeminta || "-"}</td>
                        <td>{item.cabangDomisili || "-"}</td>
                        <td>
                          <span className="badge text-bg-warning">{item.status || "Menunggu"}</span>
                        </td>
                        <td>
                          {canShowAction ? (
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => onApprovePermintaan(item)}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onRejectPermintaan(item)}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <h6 className="dashboard-section-title">Jadwal {scheduleLabel}</h6>
      <div className="dashboard-schedule-board mb-4">
        {loading ? (
          <div className="p-4 text-center text-muted">Memuat data dashboard...</div>
        ) : visibleSchedules.length === 0 ? (
          <div className="p-4 text-center text-muted">Tidak ada jadwal untuk tanggal ini.</div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            {Array.from(scheduleGroups.entries()).map(([pengajar, items]) => (
              <div key={pengajar} className="col">
                <div className="card dashboard-schedule-card h-100">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className="dashboard-schedule-avatar"
                        style={{ backgroundColor: colorFromString(pengajar) }}
                      >
                        {getInitials(pengajar)}
                      </div>
                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-semibold">{pengajar}</div>
                        <div className="text-muted small">{items.length} sesi • {scheduleLabel}</div>
                      </div>
                      <span className="badge bg-primary align-self-start">{items.length}</span>
                    </div>
                    <ul className="list-group list-group-flush dashboard-schedule-list">
                      {items.map((item) => (
                        <li key={item.id} className="list-group-item py-2 px-0 border-0">
                          <div className="d-flex align-items-center gap-3">
                            <div className="schedule-time-tag text-xxs fw-semibold text-center">
                              {item.waktu || "-"}
                            </div>
                            <div className="min-width-0 flex-grow-1">
                              <div className="fw-semibold text-sm text-truncate">{item.mapel || "-"}</div>
                              <div className="text-muted text-xxs text-truncate">{item.kelas || "-"}</div>
                            </div>
                            <span className="badge bg-secondary text-xxs">{item.sourceLabel}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}