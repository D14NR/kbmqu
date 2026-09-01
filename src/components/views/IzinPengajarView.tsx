import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/id";

dayjs.extend(isBetween);
dayjs.locale("id");

type IzinPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
  canManageRecord?: (record: Record<string, string>) => boolean;
};

type SortOption = "newest" | "oldest" | "name-asc" | "status";

export function IzinPengajarView({
  loading,
  records,
  onAdd,
  onEdit,
  onDelete,
  canManageRecord,
}: IzinPengajarViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Filter & Sort
  const processedRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = records.filter((r) => {
      // 1. Search Query
      if (term) {
        const name = (r["Nama Pengajar"] || r.nama_pengajar || "").toLowerCase();
        const code = (r["Kode Pengajar"] || r.kode_pengajar || "").toLowerCase();
        const desc = (r.Keterangan || r.keterangan || "").toLowerCase();
        const target = (r["Cabang Target"] || r.cabang_target || "").toLowerCase();
        
        const matches = name.includes(term) || code.includes(term) || desc.includes(term) || target.includes(term);
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter) {
        const status = (r["Keterangan Status"] || r.keterangan_status || "").toLowerCase();
        
        if (statusFilter === "Disetujui") {
          if (!status.includes("disetujui")) return false;
        } else if (statusFilter === "Ditolak") {
          if (!status.includes("ditolak")) return false;
        } else if (statusFilter === "Pending") {
          if (status && status !== "-" && status.toLowerCase() !== "pending") return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const nameA = (a["Nama Pengajar"] || a.nama_pengajar || "").toLowerCase();
      const nameB = (b["Nama Pengajar"] || b.nama_pengajar || "").toLowerCase();
      const dateAStr = a["Tanggal Mulai"] || a.tanggal_mulai || "";
      const dateBStr = b["Tanggal Mulai"] || b.tanggal_mulai || "";
      const dateA = dateAStr ? dayjs(dateAStr).valueOf() : 0;
      const dateB = dateBStr ? dayjs(dateBStr).valueOf() : 0;

      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "status": {
           const statA = (a["Keterangan Status"] || a.keterangan_status || "").toLowerCase();
           const statB = (b["Keterangan Status"] || b.keterangan_status || "").toLowerCase();
           return statA.localeCompare(statB);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, statusFilter, sortBy]);

  const activeIzin = records.filter(r => {
      const today = dayjs();
      const start = r["Tanggal Mulai"] ? dayjs(r["Tanggal Mulai"]) : null;
      const end = r["Tanggal Selesai"] ? dayjs(r["Tanggal Selesai"]) : null;
      if (start && end) {
        return today.isBetween(start.subtract(1, 'day'), end.add(1, 'day'));
      }
      return false;
  }).length;

  const totalIzin = records.length;
  const pendingIzin = records.filter(r => {
    const status = (r["Keterangan Status"] || r.keterangan_status || "").toLowerCase();
    return !status || status === "-" || status === "pending" || status === "menunggu";
  }).length;

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("disetujui")) {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 text-xs rounded-pill d-inline-flex align-items-center gap-1">
          <i className="bi bi-check-circle-fill" /> Disetujui
        </span>
      );
    }
    if (s.includes("ditolak")) {
      return (
        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 text-xs rounded-pill d-inline-flex align-items-center gap-1">
          <i className="bi bi-x-circle-fill" /> Ditolak
        </span>
      );
    }
    return (
      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 text-xs rounded-pill d-inline-flex align-items-center gap-1">
        <i className="bi bi-clock-history" /> Menunggu
      </span>
    );
  };

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return "P";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return (
    <div className="d-flex flex-column gap-3.5 mt-2">
      {/* 1. TOP STATS & SUMMARY BENTO */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-file-earmark-text fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Total Pengajuan</div>
                <div className="h4 fw-bold text-dark mb-0">{totalIzin} <span className="text-xs fw-normal text-muted">Izin</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-hourglass-split fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Menunggu Validasi</div>
                <div className="h4 fw-bold text-dark mb-0">
                  {pendingIzin} <span className="text-xs fw-normal text-muted">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-info-subtle text-info-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-calendar2-x fs-4 text-info" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Izin Berjalan</div>
                <div className="h4 fw-bold text-dark mb-0">{activeIzin} <span className="text-xs fw-normal text-muted">Aktif</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-subtle h-100 d-flex justify-content-center flex-column">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold text-dark text-xs mb-0.5">Kelola Izin Pengajar</div>
                <div className="text-muted text-xxs">Blokir tanggal absen.</div>
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-sm px-3 py-1.5 rounded-3 fw-semibold shadow-sm d-flex align-items-center gap-1.5 flex-shrink-0"
              >
                <i className="bi bi-plus-circle-fill" />
                <span>Ajukan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          {/* Search Box & Filters */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1" style={{ minWidth: 260 }}>
            <div className="input-group input-group-sm flex-grow-1" style={{ maxWidth: 380 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama pengajar, kode, alasan..."
                className="form-control border-start-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0 border-end"
                  onClick={() => setSearchTerm("")}
                  title="Hapus pencarian"
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-shield-check" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="Pending">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Right Controls: Sort */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: 160 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-sort-alpha-down" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name-asc">Nama (A - Z)</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status" />
          <h6 className="fw-bold text-dark mb-1">Memuat Data Izin...</h6>
          <p className="text-muted text-xs mb-0">Menghubungkan ke database</p>
        </div>
      ) : processedRecords.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div
            className="rounded-circle bg-light text-muted mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-calendar-x fs-2" />
          </div>
          <h6 className="fw-bold text-dark mb-1">
            {searchTerm || statusFilter ? "Tidak Ada Hasil Pencarian" : "Belum Ada Pengajuan Izin"}
          </h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: 400, margin: "0 auto" }}>
            {searchTerm || statusFilter
              ? "Tidak ditemukan data izin yang sesuai dengan filter atau pencarian Anda."
              : "Belum ada pengajar yang mengajukan izin untuk saat ini."}
          </p>
          {(searchTerm || statusFilter) && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-3"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
              }}
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr className="text-muted text-xxs text-uppercase fw-bold">
                  <th className="text-center py-3" style={{ width: 50 }}>#</th>
                  <th className="py-3" style={{ minWidth: 200 }}>Profil Pengajar</th>
                  <th className="py-3" style={{ minWidth: 200 }}>Waktu & Alasan</th>
                  <th className="py-3" style={{ minWidth: 160 }}>Target Cabang</th>
                  <th className="py-3" style={{ width: 140 }}>Status</th>
                  <th className="text-center py-3" style={{ width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => {
                  const nama = record["Nama Pengajar"] || record.nama_pengajar || "-";
                  const kode = record["Kode Pengajar"] || record.kode_pengajar || "-";
                  const domisili = record.Domisili || record.domisili || "-";
                  const start = record["Tanggal Mulai"] || record.tanggal_mulai || "-";
                  const end = record["Tanggal Selesai"] || record.tanggal_selesai || "-";
                  const ket = record.Keterangan || record.keterangan || "-";
                  const status = record["Keterangan Status"] || record.keterangan_status || "Pending";
                  const cabTarget = record["Cabang Target"] || record.cabang_target || "-";
                  const canEdit = canManageRecord ? canManageRecord(record) : true;
                  
                  const targetList = cabTarget.split(",").map(c => c.trim()).filter(Boolean);

                  return (
                    <tr key={`izin-${index}`} className="transition-all">
                      <td className="text-center text-muted text-xs fw-semibold">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-xs shadow-xs"
                            style={{ width: 36, height: 36 }}
                          >
                            {getInitials(nama)}
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-1.5 mb-0.5">
                              <span className="fw-bold text-dark text-sm">{nama}</span>
                              {kode && kode !== "-" && (
                                <span className="badge bg-secondary-subtle text-secondary-emphasis font-monospace px-1.5 py-0.5 text-xxs rounded">
                                  {kode}
                                </span>
                              )}
                            </div>
                            <div className="text-muted text-xxs d-flex align-items-center gap-1">
                              <i className="bi bi-geo-alt-fill text-danger" />
                              <span>{domisili}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="text-xs fw-semibold text-dark d-flex align-items-center gap-1">
                            <i className="bi bi-calendar-range text-primary" />
                            {start} <span className="text-muted fw-normal">s/d</span> {end}
                          </span>
                          <span className="text-muted text-xxs text-truncate" style={{ maxWidth: 220 }} title={ket}>
                            "{ket}"
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: 200 }}>
                          {targetList.length === 0 || cabTarget === "-" ? (
                            <span className="text-muted text-xxs italic">- Semua -</span>
                          ) : (
                            targetList.map((cab, cIdx) => (
                              <span
                                key={`cab-${cIdx}`}
                                className="badge bg-light text-dark border px-2 py-0.5 text-xxs rounded-pill d-inline-flex align-items-center gap-1"
                              >
                                {cab}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(status)}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="btn btn-outline-secondary btn-sm p-1 px-2 rounded-2"
                            title="Edit / Tinjau"
                            disabled={!canEdit}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(record)}
                            className="btn btn-outline-danger btn-sm p-1 px-2 rounded-2"
                            title="Hapus"
                            disabled={!canEdit}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center text-xs text-muted">
            <span>Menampilkan <strong>{processedRecords.length}</strong> data izin pengajar</span>
          </div>
        </div>
      )}
    </div>
  );
}
