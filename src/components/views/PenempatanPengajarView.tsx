import React, { useMemo, useState } from "react";

type PenempatanPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  query: string;
};

const placementHeaders = [
  { key: "Kode Pengajar", label: "Kode Pengajar" },
  { key: "Nama Pengajar", label: "Nama Pengajar" },
  { key: "Domisili", label: "Domisili" },
  { key: "Hari", label: "Hari" },
  { key: "Jam Mulai", label: "Jam Mulai" },
  { key: "Jam Selesai", label: "Jam Selesai" },
  { key: "Cabang Penempatan", label: "Bersedia Mengajar di Cabang" },
];

function getAvatarBgColor(name: string): string {
  const colors = [
    "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "linear-gradient(135deg, #10b981, #047857)",
    "linear-gradient(135deg, #f59e0b, #b45309)",
    "linear-gradient(135deg, #ec4899, #be185d)",
    "linear-gradient(135deg, #06b6d4, #0e7490)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "P";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type SortOption = "name-asc" | "name-desc" | "day-asc";

const dayOrder: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  minggu: 7,
};

export function PenempatanPengajarView({
  loading,
  records,
  query: externalQuery,
}: PenempatanPengajarViewProps) {
  const [searchTerm, setSearchTerm] = useState(externalQuery || "");
  const [selectedCabang, setSelectedCabang] = useState("");
  const [selectedHari, setSelectedHari] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  // Distinct Cabang options
  const cabangOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const cab = (r["Cabang Penempatan"] || r.cabang_penempatan || "").trim();
      if (cab) {
        cab.split(",").forEach((c) => {
          const val = c.trim();
          if (val) set.add(val);
        });
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct Hari options
  const hariOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const hari = (r.Hari || r.hari || "").trim();
      if (hari) set.add(hari);
    });
    return Array.from(set).sort((a, b) => (dayOrder[a.toLowerCase()] || 99) - (dayOrder[b.toLowerCase()] || 99));
  }, [records]);

  // Filter & Sort
  const processedRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = records.filter((r) => {
      // 1. Search Query
      if (term) {
        const name = (r["Nama Pengajar"] || r.nama_pengajar || "").toLowerCase();
        const code = (r["Kode Pengajar"] || r.kode_pengajar || "").toLowerCase();
        const cab = (r["Cabang Penempatan"] || r.cabang_penempatan || "").toLowerCase();
        
        const matches = name.includes(term) || code.includes(term) || cab.includes(term);
        if (!matches) return false;
      }

      // 2. Cabang Filter
      if (selectedCabang) {
        const cab = (r["Cabang Penempatan"] || r.cabang_penempatan || "").toLowerCase();
        if (!cab.includes(selectedCabang.toLowerCase())) return false;
      }

      // 3. Hari Filter
      if (selectedHari) {
        const hari = (r.Hari || r.hari || "").trim();
        if (hari.toLowerCase() !== selectedHari.toLowerCase()) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const nameA = (a["Nama Pengajar"] || a.nama_pengajar || "").toLowerCase();
      const nameB = (b["Nama Pengajar"] || b.nama_pengajar || "").toLowerCase();
      const dayA = (a.Hari || a.hari || "").toLowerCase();
      const dayB = (b.Hari || b.hari || "").toLowerCase();

      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "day-asc": {
          const dA = dayOrder[dayA] || 99;
          const dB = dayOrder[dayB] || 99;
          if (dA !== dB) return dA - dB;
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, selectedCabang, selectedHari, sortBy]);

  const totalPenempatan = records.length;
  const uniquePengajar = new Set(records.map(r => r["Kode Pengajar"] || r.kode_pengajar)).size;

  return (
    <div className="d-flex flex-column gap-3.5 mt-2">
      {/* 1. TOP STATS & SUMMARY BENTO */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-calendar2-check fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Total Jadwal Penempatan</div>
                <div className="h4 fw-bold text-dark mb-0">{totalPenempatan} <span className="text-xs fw-normal text-muted">Jadwal</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-person-video3 fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Pengajar Terjadwal</div>
                <div className="h4 fw-bold text-dark mb-0">
                  {uniquePengajar} <span className="text-xs fw-normal text-muted">Guru</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-subtle h-100 d-flex justify-content-center flex-column">
            <div className="fw-bold text-dark text-xs mb-0.5">Penempatan Guru KBM</div>
            <div className="text-muted text-xxs">Sinkronisasi otomatis dengan jadwal belajar mengajar.</div>
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
                placeholder="Cari nama pengajar, kode, atau cabang..."
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

            {/* Cabang Filter */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-geo-alt" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
              >
                <option value="">Semua Cabang</option>
                {cabangOptions.map((cab) => (
                  <option key={cab} value={cab}>
                    {cab}
                  </option>
                ))}
              </select>
            </div>

            {/* Hari Filter */}
            <div className="input-group input-group-sm" style={{ width: 150 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-calendar" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedHari}
                onChange={(e) => setSelectedHari(e.target.value)}
              >
                <option value="">Semua Hari</option>
                {hariOptions.map((hari) => (
                  <option key={hari} value={hari}>
                    {hari}
                  </option>
                ))}
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
                <option value="name-asc">Nama (A - Z)</option>
                <option value="name-desc">Nama (Z - A)</option>
                <option value="day-asc">Urutan Hari</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status" />
          <h6 className="fw-bold text-dark mb-1">Memuat Data Penempatan...</h6>
          <p className="text-muted text-xs mb-0">Menghubungkan ke database jadwal</p>
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
            {searchTerm || selectedCabang || selectedHari ? "Tidak Ada Hasil Pencarian" : "Belum Ada Data Penempatan"}
          </h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: 400, margin: "0 auto" }}>
            {searchTerm || selectedCabang || selectedHari
              ? "Tidak ditemukan jadwal penempatan yang sesuai dengan filter atau kata kunci yang Anda masukkan."
              : "Jadwal penempatan belum ditambahkan ke dalam database."}
          </p>
          {(searchTerm || selectedCabang || selectedHari) && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-3"
              onClick={() => {
                setSearchTerm("");
                setSelectedCabang("");
                setSelectedHari("");
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
                  <th className="py-3" style={{ minWidth: 240 }}>Profil Pengajar</th>
                  <th className="py-3" style={{ width: 140 }}>Waktu</th>
                  <th className="py-3" style={{ minWidth: 200 }}>Cabang Penempatan</th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => {
                  const nama = record["Nama Pengajar"] || record.nama_pengajar || "-";
                  const kode = record["Kode Pengajar"] || record.kode_pengajar || "-";
                  const domisili = record.Domisili || record.domisili || "-";
                  const hari = record.Hari || record.hari || "-";
                  const jamMulai = record["Jam Mulai"] || record.jam_mulai || "-";
                  const jamSelesai = record["Jam Selesai"] || record.jam_selesai || "-";
                  const rawCabang = record["Cabang Penempatan"] || record.cabang_penempatan || "-";
                  const cabangList = rawCabang.split(",").map(c => c.trim()).filter(Boolean);

                  return (
                    <tr key={`penempatan-${index}`} className="transition-all">
                      <td className="text-center text-muted text-xs fw-semibold">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-3 text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-xs shadow-xs"
                            style={{
                              width: 36,
                              height: 36,
                              background: getAvatarBgColor(nama),
                            }}
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
                              <i className="bi bi-house-door text-muted" />
                              <span>Asal Cabang: <strong>{domisili}</strong></span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 text-xs rounded-2 d-inline-flex align-items-center gap-1 w-fit-content">
                            <i className="bi bi-calendar-day" />
                            {hari}
                          </span>
                          <span className="text-xs fw-semibold text-muted d-flex align-items-center gap-1">
                            <i className="bi bi-clock" />
                            {jamMulai} - {jamSelesai}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: 300 }}>
                          {cabangList.length === 0 || rawCabang === "-" ? (
                            <span className="text-muted text-xxs italic">- Belum ditentukan -</span>
                          ) : (
                            cabangList.map((cab, cIdx) => (
                              <span
                                key={`cab-${cIdx}`}
                                className="badge bg-light text-dark border px-2 py-1 text-xxs rounded-pill d-inline-flex align-items-center gap-1 shadow-sm"
                              >
                                <i className="bi bi-geo-alt text-danger" />
                                {cab}
                              </span>
                            ))
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
            <span>Menampilkan <strong>{processedRecords.length}</strong> jadwal penempatan</span>
            <span>Jadwal yang ditampilkan bersumber dari data pusat</span>
          </div>
        </div>
      )}
    </div>
  );
}
