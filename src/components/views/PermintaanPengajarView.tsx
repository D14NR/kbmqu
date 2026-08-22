import React, { useMemo, useState } from "react";
import dayjs from "dayjs";

type PermintaanPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  query: string;
  isAdmin: boolean;
  userCabang: string;
  onAdd: () => void;
  onDelete: (record: Record<string, string>) => void;
  onApprove: (record: Record<string, string>) => void;
  onReject: (record: Record<string, string>) => void;
};

type SortOption = "newest" | "oldest" | "name-asc" | "status";

export function PermintaanPengajarView({
  loading,
  records,
  query: externalQuery,
  isAdmin,
  userCabang,
  onAdd,
  onDelete,
  onApprove,
  onReject,
}: PermintaanPengajarViewProps) {
  const [searchTerm, setSearchTerm] = useState(externalQuery || "");
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
        const dariCabang = (r["Dari Cabang"] || r.dari_cabang || "").toLowerCase();
        const cabangPeminta = (r["Cabang Peminta"] || r.cabang_peminta || "").toLowerCase();
        
        const matches = name.includes(term) || code.includes(term) || dariCabang.includes(term) || cabangPeminta.includes(term);
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter) {
        const status = (r.Status || r.status || "Menunggu").toLowerCase();
        if (statusFilter === "Menunggu" && !status.includes("menunggu")) return false;
        if (statusFilter === "Disetujui" && !status.includes("disetujui")) return false;
        if (statusFilter === "Ditolak" && !status.includes("ditolak")) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const nameA = (a["Nama Pengajar"] || a.nama_pengajar || "").toLowerCase();
      const nameB = (b["Nama Pengajar"] || b.nama_pengajar || "").toLowerCase();
      
      // Asumsikan tanggal disimpan di "Tanggal Diminta"
      const dateAStr = a["Tanggal Diminta"] || a.tanggal_diminta || "";
      const dateBStr = b["Tanggal Diminta"] || b.tanggal_diminta || "";
      
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
           const statA = (a.Status || a.status || "Menunggu").toLowerCase();
           const statB = (b.Status || b.status || "Menunggu").toLowerCase();
           return statA.localeCompare(statB);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, statusFilter, sortBy]);

  const normalizeText = (value: string) => value.trim().toLowerCase();
  
  const totalPermintaan = records.length;
  const pendingPermintaan = records.filter(r => {
    const status = (r.Status || r.status || "Menunggu").toLowerCase();
    return status.includes("menunggu");
  }).length;
  
  // Hitung jumlah yang bisa kita proses (sebagai Admin atau Cabang Pemilik)
  const incomingPermintaan = records.filter((record) => {
    const isOwner = normalizeText(record["Dari Cabang"] || record.dari_cabang || "") === normalizeText(userCabang);
    return isAdmin || isOwner;
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
                <i className="bi bi-arrow-left-right fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Total Permintaan</div>
                <div className="h4 fw-bold text-dark mb-0">{totalPermintaan} <span className="text-xs fw-normal text-muted">Data</span></div>
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
                <div className="text-muted text-xxs fw-semibold text-uppercase">Menunggu Keputusan</div>
                <div className="h4 fw-bold text-dark mb-0">
                  {pendingPermintaan} <span className="text-xs fw-normal text-muted">Pending</span>
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
                <i className="bi bi-inbox fs-4 text-info" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Otoritas Akses</div>
                <div className="h4 fw-bold text-dark mb-0">{incomingPermintaan} <span className="text-xs fw-normal text-muted">Dikelola</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-subtle h-100 d-flex justify-content-center flex-column">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold text-dark text-xs mb-0.5">Permintaan Pengajar</div>
                <div className="text-muted text-xxs">Pinjam guru antar cabang.</div>
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-sm px-3 py-1.5 rounded-3 fw-semibold shadow-sm d-flex align-items-center gap-1.5 flex-shrink-0"
              >
                <i className="bi bi-plus-circle-fill" />
                <span>Minta Guru</span>
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
                placeholder="Cari nama, kode, atau cabang..."
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
                <option value="Menunggu">Menunggu</option>
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
          <h6 className="fw-bold text-dark mb-1">Memuat Permintaan...</h6>
          <p className="text-muted text-xs mb-0">Menghubungkan ke database</p>
        </div>
      ) : processedRecords.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div
            className="rounded-circle bg-light text-muted mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-inbox-fill fs-2" />
          </div>
          <h6 className="fw-bold text-dark mb-1">
            {searchTerm || statusFilter ? "Tidak Ada Hasil Pencarian" : "Belum Ada Permintaan Pengajar"}
          </h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: 400, margin: "0 auto" }}>
            {searchTerm || statusFilter
              ? "Tidak ditemukan data yang sesuai dengan filter atau pencarian Anda."
              : "Belum ada permintaan pengajar antar cabang untuk saat ini."}
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
                  <th className="py-3" style={{ minWidth: 220 }}>Jalur Permintaan</th>
                  <th className="py-3" style={{ minWidth: 160 }}>Waktu & Durasi</th>
                  <th className="py-3" style={{ width: 140 }}>Status</th>
                  <th className="text-center py-3" style={{ minWidth: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => {
                  const nama = record["Nama Pengajar"] || record.nama_pengajar || "-";
                  const kode = record["Kode Pengajar"] || record.kode_pengajar || "-";
                  const dariCabang = record["Dari Cabang"] || record.dari_cabang || "-";
                  const cabangPeminta = record["Cabang Peminta"] || record.cabang_peminta || "-";
                  const tglDiminta = record["Tanggal Diminta"] || record.tanggal_diminta || "-";
                  const jamMulai = record["Jam Mulai"] || record.jam_mulai || "-";
                  const jamSelesai = record["Jam Selesai"] || record.jam_selesai || "-";
                  const status = record.Status || record.status || "Menunggu";
                  const ket = record.Catatan || record.catatan || "-";

                  // Logika akses
                  const isOwner = normalizeText(dariCabang) === normalizeText(userCabang);
                  const isRequester = normalizeText(cabangPeminta) === normalizeText(userCabang);
                  
                  const isPending = status.toLowerCase() === "menunggu";
                  const canDelete = isAdmin || (isRequester && isPending);
                  const canApproveReject = isPending && (isAdmin || isOwner);

                  return (
                    <tr key={`permintaan-${index}`} className="transition-all">
                      <td className="text-center text-muted text-xs fw-semibold">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-3 bg-secondary-subtle text-secondary-emphasis d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-xs shadow-xs"
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
                            <div className="text-muted text-xxs text-truncate" style={{ maxWidth: 180 }} title={ket}>
                              "{ket}"
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2 text-xs">
                           <div className="d-flex flex-column align-items-end" style={{ width: 90 }}>
                              <span className="text-muted text-xxs">Asal (Pemilik)</span>
                              <span className="fw-semibold text-dark text-truncate w-100 text-end" title={dariCabang}>{dariCabang}</span>
                           </div>
                           <div className="text-primary d-flex align-items-center">
                             <i className="bi bi-arrow-right fs-6" />
                           </div>
                           <div className="d-flex flex-column" style={{ width: 90 }}>
                              <span className="text-muted text-xxs">Peminta (Target)</span>
                              <span className="fw-semibold text-primary text-truncate w-100" title={cabangPeminta}>{cabangPeminta}</span>
                           </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="text-xs fw-semibold text-dark d-flex align-items-center gap-1">
                            <i className="bi bi-calendar-check text-primary" />
                            {tglDiminta}
                          </span>
                          <span className="text-muted text-xxs d-flex align-items-center gap-1">
                            <i className="bi bi-clock" />
                            {jamMulai} - {jamSelesai}
                          </span>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(status)}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center gap-1.5">
                          {canApproveReject ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-success btn-sm p-1 px-2 rounded-2"
                                title="Setujui"
                                onClick={() => onApprove(record)}
                              >
                                <i className="bi bi-check-lg" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm p-1 px-2 rounded-2"
                                title="Tolak"
                                onClick={() => onReject(record)}
                              >
                                <i className="bi bi-x-lg" />
                              </button>
                            </>
                          ) : canDelete ? (
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm p-1 px-2 rounded-2"
                                title="Batalkan / Hapus"
                                onClick={() => onDelete(record)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                          ) : (
                            <span className="text-muted text-xxs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center text-xs text-muted">
            <span>Menampilkan <strong>{processedRecords.length}</strong> data permintaan</span>
          </div>
        </div>
      )}
    </div>
  );
}
