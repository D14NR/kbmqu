import React, { useMemo, useState } from "react";

type PengajarTableViewProps = {
  headers: string[];
  loading: boolean;
  records: Record<string, string>[];
  query: string;
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
};

type ViewMode = "table" | "grid";
type SortOption = "name-asc" | "name-desc" | "code-asc" | "domisili-asc";

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

function formatWhatsAppUrl(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return `https://wa.me/${cleaned}`;
}

export function PengajarTableView({
  headers,
  loading,
  records,
  query: externalQuery,
  onAdd,
  onEdit,
  onDelete,
}: PengajarTableViewProps) {
  const [searchTerm, setSearchTerm] = useState(externalQuery || "");
  const [selectedDomisili, setSelectedDomisili] = useState("");
  const [selectedBidang, setSelectedBidang] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Distinct Domisili options
  const domisiliOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const dom = (r.Domisili || r.domisili || "").trim();
      if (dom) set.add(dom);
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct Bidang Studi options
  const bidangStudiOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const raw = (r["Bidang Studi"] || r.bidang_studi || "").trim();
      if (raw) {
        raw.split(",").forEach((item) => {
          const val = item.trim();
          if (val) set.add(val);
        });
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Filter & Sort
  const processedRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = records.filter((r) => {
      // 1. Search Query
      if (term) {
        const name = (r.Nama || r.nama || "").toLowerCase();
        const code = (r["Kode Pengajar"] || r.kode_pengajar || "").toLowerCase();
        const phone = (r["No.WhatsApp"] || r.no_whatsapp || "").toLowerCase();
        const email = (r.Email || r.email || "").toLowerCase();
        const bidang = (r["Bidang Studi"] || r.bidang_studi || "").toLowerCase();
        const dom = (r.Domisili || r.domisili || "").toLowerCase();

        const matches =
          name.includes(term) ||
          code.includes(term) ||
          phone.includes(term) ||
          email.includes(term) ||
          bidang.includes(term) ||
          dom.includes(term);

        if (!matches) return false;
      }

      // 2. Domisili Filter
      if (selectedDomisili) {
        const dom = (r.Domisili || r.domisili || "").trim();
        if (dom.toLowerCase() !== selectedDomisili.toLowerCase()) return false;
      }

      // 3. Bidang Studi Filter
      if (selectedBidang) {
        const bidang = (r["Bidang Studi"] || r.bidang_studi || "").toLowerCase();
        if (!bidang.includes(selectedBidang.toLowerCase())) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const nameA = (a.Nama || a.nama || "").toLowerCase();
      const nameB = (b.Nama || b.nama || "").toLowerCase();
      const codeA = (a["Kode Pengajar"] || a.kode_pengajar || "").toLowerCase();
      const codeB = (b["Kode Pengajar"] || b.kode_pengajar || "").toLowerCase();
      const domA = (a.Domisili || a.domisili || "").toLowerCase();
      const domB = (b.Domisili || b.domisili || "").toLowerCase();

      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "code-asc":
          return codeA.localeCompare(codeB);
        case "domisili-asc":
          return domA.localeCompare(domB) || nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, selectedDomisili, selectedBidang, sortBy]);

  const handleCopyCredentials = (record: Record<string, string>, idKey: string) => {
    const nama = record.Nama || record.nama || "Pengajar";
    const user = record.Username || record.username || record["No.WhatsApp"] || "-";
    const pass = record.Password || record.password || "-";
    const text = `Akun KBM Pengajar:\nNama: ${nama}\nUsername: ${user}\nPassword: ${pass}`;
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPengajar = records.length;
  const totalFiltered = processedRecords.length;

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
                <i className="bi bi-people-fill fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Total Pengajar</div>
                <div className="h4 fw-bold text-dark mb-0">{totalPengajar} <span className="text-xs fw-normal text-muted">Guru</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-whatsapp fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Kontak WhatsApp</div>
                <div className="h4 fw-bold text-dark mb-0">
                  {records.filter((r) => Boolean(r["No.WhatsApp"] || r.no_whatsapp)).length}{" "}
                  <span className="text-xs fw-normal text-muted">Terdaftar</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-amber-subtle text-amber-700 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-geo-alt-fill fs-4 text-warning" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Cabang Domisili</div>
                <div className="h4 fw-bold text-dark mb-0">{domisiliOptions.length} <span className="text-xs fw-normal text-muted">Lokasi</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-subtle h-100 d-flex justify-content-center">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold text-dark text-xs mb-0.5">Kelola Pengajar</div>
                <div className="text-muted text-xxs">Data akun login & mapel.</div>
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-sm px-3 py-1.5 rounded-3 fw-semibold shadow-sm d-flex align-items-center gap-1.5 flex-shrink-0"
              >
                <i className="bi bi-person-plus-fill" />
                <span>Tambah Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          {/* Search Box */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1" style={{ minWidth: 260 }}>
            <div className="input-group input-group-sm flex-grow-1" style={{ maxWidth: 380 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, kode, nomor WA, atau email..."
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

            {/* Domisili Filter */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-geo-alt" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedDomisili}
                onChange={(e) => setSelectedDomisili(e.target.value)}
              >
                <option value="">Semua Domisili</option>
                {domisiliOptions.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>
            </div>

            {/* Bidang Studi Filter */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-book" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
              >
                <option value="">Semua Mapel</option>
                {bidangStudiOptions.map((bid) => (
                  <option key={bid} value={bid}>
                    {bid}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Controls: Sort & View Toggle */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Sort Dropdown */}
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
                <option value="code-asc">Kode Pengajar</option>
                <option value="domisili-asc">Cabang Domisili</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="btn-group btn-group-sm rounded-3 overflow-hidden border">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-light text-muted"}`}
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel"
              >
                <i className="bi bi-table" />
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-light text-muted"}`}
                onClick={() => setViewMode("grid")}
                title="Tampilan Kartu Direktori"
              >
                <i className="bi bi-grid-fill" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status" />
          <h6 className="fw-bold text-dark mb-1">Memuat Data Pengajar...</h6>
          <p className="text-muted text-xs mb-0">Menghubungkan ke database pengajar</p>
        </div>
      ) : processedRecords.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div
            className="rounded-circle bg-light text-muted mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-person-x fs-2" />
          </div>
          <h6 className="fw-bold text-dark mb-1">
            {searchTerm || selectedDomisili || selectedBidang ? "Tidak Ada Hasil Pencarian" : "Belum Ada Data Pengajar"}
          </h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: 400, margin: "0 auto" }}>
            {searchTerm || selectedDomisili || selectedBidang
              ? "Tidak ditemukan pengajar yang sesuai dengan filter atau kata kunci yang Anda masukkan."
              : "Data pengajar belum ditambahkan ke dalam database. Tambahkan pengajar pertama Anda sekarang."}
          </p>
          <div>
            {searchTerm || selectedDomisili || selectedBidang ? (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-3"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDomisili("");
                  setSelectedBidang("");
                }}
              >
                Reset Semua Filter
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-3 px-3 fw-semibold"
                onClick={onAdd}
              >
                <i className="bi bi-person-plus-fill me-1" /> Tambah Pengajar
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr className="text-muted text-xxs text-uppercase fw-bold">
                  <th className="text-center py-3" style={{ width: 40 }}>
                    #
                  </th>
                  <th className="py-3" style={{ minWidth: 220 }}>
                    Profil & Kode
                  </th>
                  <th className="py-3" style={{ width: 140 }}>
                    Domisili
                  </th>
                  <th className="py-3" style={{ minWidth: 200 }}>
                    Bidang Studi
                  </th>
                  <th className="py-3" style={{ width: 170 }}>
                    Kontak WhatsApp
                  </th>
                  <th className="py-3" style={{ width: 160 }}>
                    Akses Login
                  </th>
                  <th className="text-center py-3" style={{ width: 110 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => {
                  const idKey = `pengajar-${index}`;
                  const nama = record.Nama || record.nama || "-";
                  const kode = record["Kode Pengajar"] || record.kode_pengajar || "-";
                  const domisili = record.Domisili || record.domisili || "-";
                  const phone = record["No.WhatsApp"] || record.no_whatsapp || "";
                  const email = record.Email || record.email || "";
                  const username = record.Username || record.username || phone || "-";
                  const password = record.Password || record.password || "";
                  const rawBidang = record["Bidang Studi"] || record.bidang_studi || "";
                  const bidangList = rawBidang
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const isPassVisible = visiblePasswords[idKey] || false;

                  return (
                    <tr key={idKey} className="transition-all">
                      {/* # Index */}
                      <td className="text-center text-muted text-xs fw-semibold">
                        {index + 1}
                      </td>

                      {/* Profil & Kode */}
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
                            {email && (
                              <div className="text-muted text-xxs d-flex align-items-center gap-1">
                                <i className="bi bi-envelope text-muted" />
                                <span>{email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domisili */}
                      <td>
                        <span className="badge bg-light text-dark border px-2.5 py-1 text-xs rounded-pill fw-semibold d-inline-flex align-items-center gap-1">
                          <i className="bi bi-geo-alt-fill text-danger" />
                          {domisili}
                        </span>
                      </td>

                      {/* Bidang Studi */}
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: 260 }}>
                          {bidangList.length === 0 ? (
                            <span className="text-muted text-xxs italic">- Belum ditentukan -</span>
                          ) : (
                            bidangList.map((bid, bIdx) => (
                              <span
                                key={`bid-${bIdx}`}
                                className="badge bg-primary-subtle text-primary border border-primary-subtle text-xxs px-2 py-0.5 rounded-pill fw-medium"
                              >
                                {bid}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Kontak WhatsApp */}
                      <td>
                        {phone ? (
                          <div className="d-flex align-items-center gap-1.5">
                            <a
                              href={formatWhatsAppUrl(phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-success btn-xs d-flex align-items-center gap-1 px-2 py-1 rounded-2 fw-semibold text-decoration-none"
                              title="Buka Chat WhatsApp"
                            >
                              <i className="bi bi-whatsapp text-success" />
                              <span className="font-monospace text-xs">{phone}</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted text-xxs italic">-</span>
                        )}
                      </td>

                      {/* Akses Login */}
                      <td>
                        <div className="d-flex flex-column gap-0.5">
                          <div className="text-xxs text-muted d-flex align-items-center gap-1">
                            <span className="fw-semibold">User:</span>
                            <span className="font-monospace text-dark">{username}</span>
                          </div>
                          <div className="d-flex align-items-center gap-1 text-xxs">
                            <span className="text-muted fw-semibold">Pass:</span>
                            <span className="font-monospace text-dark">
                              {password ? (isPassVisible ? password : "••••••") : "-"}
                            </span>
                            {password && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(idKey)}
                                className="btn btn-link btn-xs p-0 text-muted hover:text-dark ms-0.5"
                                title={isPassVisible ? "Sembunyikan" : "Tampilkan"}
                              >
                                <i className={`bi ${isPassVisible ? "bi-eye-slash" : "bi-eye"}`} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(record, idKey)}
                              className="btn btn-link btn-xs p-0 text-muted hover:text-primary ms-1"
                              title="Salin Akun Login"
                            >
                              <i
                                className={`bi ${
                                  copiedId === idKey ? "bi-check2 text-success fw-bold" : "bi-clipboard"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="btn btn-outline-secondary btn-sm p-1 px-2 rounded-2"
                            title="Edit Data Pengajar"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(record)}
                            className="btn btn-outline-danger btn-sm p-1 px-2 rounded-2"
                            title="Hapus Data Pengajar"
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
            <span>Menampilkan <strong>{processedRecords.length}</strong> pengajar</span>
            <span>Nomor WhatsApp terdaftar otomatis menjadi username portal pengajar</span>
          </div>
        </div>
      ) : (
        /* GRID / DIRECTORY CARDS VIEW */
        <div className="row g-3">
          {processedRecords.map((record, index) => {
            const idKey = `pengajar-grid-${index}`;
            const nama = record.Nama || record.nama || "-";
            const kode = record["Kode Pengajar"] || record.kode_pengajar || "-";
            const domisili = record.Domisili || record.domisili || "-";
            const phone = record["No.WhatsApp"] || record.no_whatsapp || "";
            const email = record.Email || record.email || "";
            const username = record.Username || record.username || phone || "-";
            const password = record.Password || record.password || "";
            const rawBidang = record["Bidang Studi"] || record.bidang_studi || "";
            const bidangList = rawBidang
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            const isPassVisible = visiblePasswords[idKey] || false;

            return (
              <div key={idKey} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between hover:shadow-md transition-all">
                  <div>
                    {/* Header Card */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div
                        className="rounded-3 text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-sm shadow-xs"
                        style={{
                          width: 42,
                          height: 42,
                          background: getAvatarBgColor(nama),
                        }}
                      >
                        {getInitials(nama)}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="btn btn-light btn-xs text-muted p-1 px-2 rounded-2 hover:text-primary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record)}
                          className="btn btn-light btn-xs text-muted p-1 px-2 rounded-2 hover:text-danger"
                          title="Hapus"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>

                    {/* Teacher Name & Code */}
                    <h6 className="fw-bold text-dark mb-0.5 text-truncate" title={nama}>
                      {nama}
                    </h6>
                    <div className="d-flex flex-wrap align-items-center gap-1.5 mb-2.5">
                      {kode && kode !== "-" && (
                        <span className="badge bg-secondary-subtle text-secondary-emphasis font-monospace px-1.5 py-0.5 text-xxs rounded">
                          {kode}
                        </span>
                      )}
                      <span className="badge bg-light text-dark border text-xxs rounded-pill d-inline-flex align-items-center gap-1">
                        <i className="bi bi-geo-alt-fill text-danger" />
                        {domisili}
                      </span>
                    </div>

                    {/* Subjects */}
                    <div className="mb-3">
                      <div className="text-muted text-xxs fw-semibold mb-1">Bidang Studi:</div>
                      <div className="d-flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {bidangList.length === 0 ? (
                          <span className="text-muted text-xxs italic">-</span>
                        ) : (
                          bidangList.map((bid, bIdx) => (
                            <span
                              key={`grid-bid-${bIdx}`}
                              className="badge bg-primary-subtle text-primary border border-primary-subtle text-xxs px-2 py-0.5 rounded-pill"
                            >
                              {bid}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="d-flex flex-column gap-1 text-xxs mb-3">
                      {phone && (
                        <div className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-whatsapp text-success" />
                          <a
                            href={formatWhatsAppUrl(phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none text-dark fw-semibold font-monospace hover:text-success"
                          >
                            {phone}
                          </a>
                        </div>
                      )}
                      {email && (
                        <div className="d-flex align-items-center gap-1.5 text-muted text-truncate" title={email}>
                          <i className="bi bi-envelope text-muted" />
                          <span>{email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Card: Login Credentials */}
                  <div className="pt-2.5 border-top bg-light p-2 rounded-3">
                    <div className="d-flex justify-content-between align-items-center text-xxs mb-1">
                      <span className="text-muted fw-semibold">Akun Login:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(record, idKey)}
                        className="btn btn-link btn-xs p-0 text-decoration-none text-primary d-flex align-items-center gap-1"
                      >
                        <i
                          className={`bi ${
                            copiedId === idKey ? "bi-check2 text-success fw-bold" : "bi-clipboard"
                          }`}
                        />
                        {copiedId === idKey ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                    <div className="d-flex justify-content-between text-xxs font-monospace">
                      <span className="text-dark truncate">U: {username}</span>
                      <span className="text-dark d-flex align-items-center gap-1">
                        P: {password ? (isPassVisible ? password : "••••") : "-"}
                        {password && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(idKey)}
                            className="btn btn-link btn-xs p-0 text-muted"
                          >
                            <i className={`bi ${isPassVisible ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
