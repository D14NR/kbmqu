import React, { useMemo, useState } from "react";

type MapelTableViewProps = {
  headers: string[];
  loading: boolean;
  records: Record<string, string>[];
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
};

type ViewMode = "table" | "grid";
type SortOption = "name-asc" | "name-desc" | "code-asc" | "code-desc" | "category-asc";

const getCategoryBadgeStyle = (category: string) => {
  const norm = (category || "").toUpperCase().trim();
  switch (norm) {
    case "SNBT":
      return "bg-primary text-white"; // Using Bootstrap Primary
    case "TKA":
      return "bg-info text-white";    // Using Bootstrap Info
    case "KEDINASAN":
      return "bg-warning text-dark";  // Using Bootstrap Warning
    case "UMUM":
      return "bg-success text-white"; // Using Bootstrap Success
    default:
      return "bg-secondary text-white"; // Using Bootstrap Secondary
  }
};

export const getNormalizedKategori = (record: Record<string, string>): string => {
  const val = (
    record.Kategori ||
    record.kategori ||
    record.kategory ||
    record.Category ||
    record.Jenis ||
    ""
  ).trim();
  return val ? val.toUpperCase() : "UMUM";
};

export function MapelTableView({
  headers,
  loading,
  records,
  onAdd,
  onEdit,
  onDelete,
}: MapelTableViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Extract distinct categories
  const categoriesAvailable = useMemo(() => {
    const set = new Set<string>();
    set.add("SNBT");
    set.add("TKA");
    set.add("KEDINASAN");
    set.add("UMUM");

    records.forEach((r) => {
      const cat = getNormalizedKategori(r);
      if (cat) set.add(cat);
    });

    return Array.from(set);
  }, [records]);

  // Filter & Sort
  const processedRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = records.filter((r) => {
      const mapel = (r.Mapel || r.mapel || "").toLowerCase();
      const kode = (r.Kode_Mapel || r.kode_mapel || r.kode || "").toLowerCase();
      const kategori = getNormalizedKategori(r).toLowerCase();

      const matchesSearch = !term || mapel.includes(term) || kode.includes(term) || kategori.includes(term);
      const matchesCategory =
        selectedCategory === "ALL" ||
        kategori === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      const nameA = (a.Mapel || a.mapel || "").toLowerCase();
      const nameB = (b.Mapel || b.mapel || "").toLowerCase();
      const codeA = (a.Kode_Mapel || a.kode_mapel || "").toLowerCase();
      const codeB = (b.Kode_Mapel || b.kode_mapel || "").toLowerCase();
      const catA = getNormalizedKategori(a).toLowerCase();
      const catB = getNormalizedKategori(b).toLowerCase();

      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "code-asc":
          return codeA.localeCompare(codeB);
        case "code-desc":
          return codeB.localeCompare(codeA);
        case "category-asc":
          return catA.localeCompare(catB) || nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return result;
  }, [records, searchTerm, selectedCategory, sortBy]);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalMapel = records.length;
  const totalFiltered = processedRecords.length;

  return (
    <div className="d-flex flex-column gap-3.5 mt-2">
      {/* 1. TOP STATS & BENTO SUMMARY */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-book-half fs-4" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Total Mata Pelajaran</div>
                <div className="h4 fw-bold text-dark mb-0">{totalMapel} <span className="text-xs fw-normal text-muted">Mapel</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 bg-indigo-subtle text-indigo d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-grid-3x3-gap-fill fs-4 text-primary" />
              </div>
              <div>
                <div className="text-muted text-xxs fw-semibold text-uppercase">Kategori Terdaftar</div>
                <div className="h4 fw-bold text-dark mb-0">
                  {categoriesAvailable.length} <span className="text-xs fw-normal text-muted">Kategori ({totalFiltered} Tampil)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-subtle h-100 d-flex justify-content-center">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold text-dark text-xs mb-0.5">Kelola Kurikulum KBM</div>
                <div className="text-muted text-xxs">Data tersinkron otomatis ke jadwal & surat tugas.</div>
              </div>
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-sm px-3 py-1.5 rounded-3 fw-semibold shadow-sm d-flex align-items-center gap-1.5 flex-shrink-0"
              >
                <i className="bi bi-plus-circle-fill" />
                <span>Tambah Mapel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR & FILTER CONTROLS */}
      <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          {/* Search Box & Category Filter */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
            {/* Search */}
            <div className="input-group input-group-sm flex-grow-1" style={{ minWidth: 200 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, kode, atau kategori..."
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

            {/* Category Filter */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <i className="bi bi-funnel-fill" />
              </span>
              <select
                className="form-select form-select-sm border-start-0 fw-semibold"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Semua Kategori</option>
                {categoriesAvailable.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Controls: Sort & View Toggle & Action */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Sort Dropdown */}
            <div className="input-group input-group-sm" style={{ width: 170 }}>
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
                <option value="code-asc">Kode (A - Z)</option>
                <option value="code-desc">Kode (Z - A)</option>
                <option value="category-asc">Kategori</option>
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
                title="Tampilan Grid Kartu"
              >
                <i className="bi bi-grid-fill" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Category Quick Filter Badges */}
        <div className="d-flex flex-wrap align-items-center gap-1.5 mt-3 pt-2.5 border-top">
          <span className="text-muted text-xxs fw-bold text-uppercase me-1">
            <i className="bi bi-tags me-1" />
            Filter Cepat:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`btn btn-xs rounded-pill px-2.5 ${
              selectedCategory === "ALL" ? "btn-dark fw-bold" : "btn-light text-muted"
            }`}
          >
            Semua ({totalMapel})
          </button>
          {categoriesAvailable.map((cat) => {
            const count = records.filter(
              (r) => getNormalizedKategori(r) === cat
            ).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-xs rounded-pill px-2.5 transition-all ${
                  isSelected ? "btn-primary fw-bold shadow-xs" : getCategoryBadgeStyle(cat)
                }`}
              >
                {cat} <span className="opacity-75 ms-0.5">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {loading ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div className="spinner-border text-primary mx-auto mb-3" role="status" />
          <h6 className="fw-bold text-dark mb-1">Memuat Data Mata Pelajaran...</h6>
          <p className="text-muted text-xs mb-0">Menghubungkan ke database</p>
        </div>
      ) : processedRecords.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 bg-white p-5 text-center">
          <div
            className="rounded-circle bg-light text-muted mx-auto d-flex align-items-center justify-content-center mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-journal-x fs-2" />
          </div>
          <h6 className="fw-bold text-dark mb-1">
            {searchTerm || selectedCategory !== "ALL"
              ? "Tidak Ada Hasil Pencarian / Filter"
              : "Belum Ada Data Mata Pelajaran"}
          </h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: 360, margin: "0 auto" }}>
            {searchTerm || selectedCategory !== "ALL"
              ? "Tidak ditemukan mata pelajaran yang sesuai dengan kriteria filter Anda."
              : "Mata pelajaran belum ditambahkan ke dalam database. Tambahkan data pertama Anda sekarang."}
          </p>
          <div>
            {searchTerm || selectedCategory !== "ALL" ? (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-3"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("ALL");
                }}
              >
                Reset Filter & Pencarian
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-3 px-3 fw-semibold"
                onClick={onAdd}
              >
                <i className="bi bi-plus-lg me-1" /> Tambah Mata Pelajaran
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
                  <th className="text-center py-3" style={{ width: 50 }}>
                    #
                  </th>
                  <th className="py-3" style={{ width: 140 }}>
                    Kode Singkatan
                  </th>
                  <th className="py-3">
                    Nama Mata Pelajaran
                  </th>
                  <th className="py-3" style={{ width: 150 }}>
                    Kategori
                  </th>
                  <th className="text-center py-3" style={{ width: 120 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRecords.map((record, index) => {
                  const mapelName = record.Mapel || record.mapel || "-";
                  const kodeMapel = record.Kode_Mapel || record.kode_mapel || record.kode || "-";
                  const kategori = getNormalizedKategori(record);

                  return (
                    <tr key={`mapel-row-${index}`} className="transition-all">
                      {/* # Index */}
                      <td className="text-center text-muted text-xs fw-semibold">
                        {index + 1}
                      </td>

                      {/* Kode Badge */}
                      <td>
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace px-2.5 py-1 text-xs rounded-2 fw-bold">
                            {kodeMapel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(kodeMapel)}
                            className="btn btn-link btn-xs p-0 text-muted hover:text-primary"
                            title="Salin Kode"
                          >
                            <i
                              className={`bi ${
                                copiedCode === kodeMapel ? "bi-check2 text-success fw-bold" : "bi-copy"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Nama Mapel */}
                      <td>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-3 bg-light text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 34, height: 34 }}
                          >
                            <i className="bi bi-book text-muted" />
                          </div>
                          <div>
                            <span className="fw-semibold text-dark text-sm d-block">{mapelName}</span>
                            <span className="text-muted text-xxs">Kurikulum KBM</span>
                          </div>
                        </div>
                      </td>

                      {/* Kategori Badge */}
                      <td>
                        <span className={`badge px-2.5 py-1 text-xxs rounded-pill fw-bold ${getCategoryBadgeStyle(kategori)}`}>
                          {kategori}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="btn btn-outline-secondary btn-sm p-1 px-2 rounded-2"
                            title="Edit Mata Pelajaran"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(record)}
                            className="btn btn-outline-danger btn-sm p-1 px-2 rounded-2"
                            title="Hapus Mata Pelajaran"
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
            <span>Menampilkan <strong>{processedRecords.length}</strong> data mata pelajaran</span>
            <span>Gunakan kode singkatan pada formulir jadwal</span>
          </div>
        </div>
      ) : (
        /* GRID / CARDS VIEW */
        <div className="row g-3">
          {processedRecords.map((record, index) => {
            const mapelName = record.Mapel || record.mapel || "-";
            const kodeMapel = record.Kode_Mapel || record.kode_mapel || record.kode || "-";
            const kategori = getNormalizedKategori(record);

            return (
              <div key={`mapel-card-${index}`} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between hover:shadow-md transition-all">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2.5">
                      <div className="d-flex align-items-center gap-1.5">
                        <span className="badge bg-primary text-white font-monospace px-2.5 py-1 text-xs rounded-2 fw-bold shadow-xs">
                          {kodeMapel}
                        </span>
                        <span className={`badge px-2 py-0.5 text-xxs rounded-pill fw-bold ${getCategoryBadgeStyle(kategori)}`}>
                          {kategori}
                        </span>
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

                    <h6 className="fw-bold text-dark mb-1 text-truncate" title={mapelName}>
                      {mapelName}
                    </h6>
                    <div className="text-muted text-xxs d-flex align-items-center gap-1">
                      <i className="bi bi-tag text-primary" />
                      <span>Kode: {kodeMapel}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-top d-flex justify-content-between align-items-center text-xxs">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(kodeMapel)}
                      className="btn btn-link btn-xs p-0 text-decoration-none text-muted d-flex align-items-center gap-1"
                    >
                      <i className={`bi ${copiedCode === kodeMapel ? "bi-check2 text-success" : "bi-copy"}`} />
                      {copiedCode === copiedCode ? "Tersalin" : "Salin Kode"}
                    </button>
                    <span className="text-muted"># {index + 1}</span>
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
