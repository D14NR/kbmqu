import React, { useState, useMemo } from "react";
import type { DonasiRecord, DonasiTransaksiRecord } from "../../types/donasi";

type DonasiViewProps = {
  loading: boolean;
  records: DonasiRecord[];
  transaksiRecords?: DonasiTransaksiRecord[];
  onAdd: () => void;
  onEdit: (record: DonasiRecord) => void;
  onDelete: (record: DonasiRecord) => void;
  onAddTransaksi?: () => void;
  onEditTransaksi?: (record: DonasiTransaksiRecord) => void;
  onDeleteTransaksi?: (record: DonasiTransaksiRecord) => void;
  onRefresh: () => void;
};

export function DonasiView({
  loading,
  records,
  transaksiRecords = [],
  onAdd,
  onEdit,
  onDelete,
  onAddTransaksi,
  onEditTransaksi,
  onDeleteTransaksi,
  onRefresh,
}: DonasiViewProps) {
  const [activeTab, setActiveTab] = useState<"rekening" | "transaksi">("rekening");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "masuk" | "keluar">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Perhitungan Statistik Rekening
  const totalRekening = records.length;

  // Perhitungan Statistik Transaksi (dari tabel donasi_transaksi)
  const totalNominalMasuk = useMemo(() => {
    return transaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_masuk) || 0), 0);
  }, [transaksiRecords]);

  const totalNominalKeluar = useMemo(() => {
    return transaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_keluar) || 0), 0);
  }, [transaksiRecords]);

  const saldoBersih = totalNominalMasuk - totalNominalKeluar;

  const countMasuk = useMemo(() => {
    return transaksiRecords.filter((t) => Number(t.jumlah_transaksi_masuk) > 0).length;
  }, [transaksiRecords]);

  const countKeluar = useMemo(() => {
    return transaksiRecords.filter((t) => Number(t.jumlah_transaksi_keluar) > 0).length;
  }, [transaksiRecords]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter Rekening
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.nama_pemilik.toLowerCase().includes(q) ||
        r.nama_bank.toLowerCase().includes(q) ||
        r.alamat_rekening.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Filter Transaksi
  const filteredTransaksi = useMemo(() => {
    let result = transaksiRecords;

    if (filterType === "masuk") {
      result = result.filter((t) => Number(t.jumlah_transaksi_masuk) > 0);
    } else if (filterType === "keluar") {
      result = result.filter((t) => Number(t.jumlah_transaksi_keluar) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.nama_pengirim.toLowerCase().includes(q) ||
          (t.keterangan && t.keterangan.toLowerCase().includes(q)) ||
          t.tanggal.includes(q) ||
          String(t.jumlah_transaksi_masuk).includes(q) ||
          String(t.jumlah_transaksi_keluar).includes(q)
      );
    }

    // Urutkan transaksi dari yang terbaru berdasarkan tanggal / id
    return [...result].sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [transaksiRecords, filterType, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBankBadge = (bankName: string) => {
    const lower = bankName.toLowerCase();
    if (lower.includes("jago")) return "bg-warning-subtle text-warning-emphasis border-warning";
    if (lower.includes("paypal")) return "bg-primary-subtle text-primary border-primary-subtle";
    if (lower.includes("shopee")) return "bg-danger-subtle text-danger border-danger-subtle";
    if (lower.includes("bca")) return "bg-info-subtle text-info-emphasis border-info-subtle";
    if (lower.includes("mandiri")) return "bg-warning-subtle text-dark border-warning-subtle";
    if (lower.includes("bri")) return "bg-primary-subtle text-dark border-primary-subtle";
    if (lower.includes("dana")) return "bg-info-subtle text-info-emphasis border-info";
    return "bg-secondary-subtle text-secondary-emphasis border-secondary-subtle";
  };

  const getBankIcon = (bankName: string) => {
    const lower = bankName.toLowerCase();
    if (lower.includes("paypal")) return "bi-paypal";
    if (lower.includes("shopee") || lower.includes("dana") || lower.includes("gopay")) return "bi-wallet2";
    return "bi-bank2";
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="py-2">
      {/* Header Section */}
      <div className="row g-3 mb-3.5 align-items-stretch">
        <div className="col-12 col-xl-5 d-flex flex-column justify-content-between">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xxs fw-bold d-inline-flex align-items-center gap-1">
                <i className="bi bi-shield-lock-fill" />
                KHUSUS ADMIN PUSAT
              </span>
              <span className="badge bg-light text-muted border rounded-pill px-2.5 py-1 text-xxs">
                <i className="bi bi-database me-1" />
                {activeTab === "rekening" ? "Tabel: donasi" : "Tabel: donasi_transaksi"}
              </span>
            </div>
            <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-heart-fill text-danger" />
              Kelola Donasi Database
            </h4>
            <p className="text-muted text-xs mb-0">
              Pengelolaan rekening donasi publik dan pencatatan transaksi masuk/keluar dari skema tabel <code className="text-dark fw-bold">donasi_transaksi</code>.
            </p>
          </div>
        </div>

        {/* Stats Bento */}
        <div className="col-12 col-xl-7">
          <div className="row g-2.5 h-100">
            {/* Metric 1: Saldo Bersih */}
            <div className="col-12 col-sm-4">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <i className="bi bi-wallet2 fs-5" />
                </div>
                <div className="min-w-0 flex-grow-1">
                  <div className="text-xxs text-muted fw-bold text-uppercase">
                    Saldo Bersih
                  </div>
                  <div className={`text-base fw-bold ${saldoBersih >= 0 ? "text-success" : "text-danger"} text-truncate`}>
                    {formatRupiah(saldoBersih)}
                  </div>
                  <div className="text-xxs text-muted">
                    {transaksiRecords.length} Total Transaksi
                  </div>
                </div>
              </div>
            </div>

            {/* Metric 2: Total Donasi Masuk */}
            <div className="col-6 col-sm-4">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle bg-emerald-50 text-success d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, backgroundColor: "#ecfdf5" }}
                >
                  <i className="bi bi-arrow-down-left-circle fs-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xxs text-muted fw-bold text-uppercase">
                    Donasi Masuk
                  </div>
                  <div className="text-sm fw-bold text-success text-truncate">
                    {formatRupiah(totalNominalMasuk)}
                  </div>
                  <div className="text-xxs text-muted">
                    {countMasuk} Transaksi
                  </div>
                </div>
              </div>
            </div>

            {/* Metric 3: Total Transaksi Keluar */}
            <div className="col-6 col-sm-4">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <i className="bi bi-arrow-up-right-circle fs-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xxs text-muted fw-bold text-uppercase">
                    Biaya / Keluar
                  </div>
                  <div className="text-sm fw-bold text-danger text-truncate">
                    {formatRupiah(totalNominalKeluar)}
                  </div>
                  <div className="text-xxs text-muted">
                    {countKeluar} Pengeluaran
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs Switcher */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-2 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                activeTab === "rekening"
                  ? "active bg-dark text-white shadow-sm"
                  : "bg-white text-secondary border hover-bg-light"
              }`}
              onClick={() => {
                setActiveTab("rekening");
                setSearchQuery("");
              }}
            >
              <i className="bi bi-credit-card-2-front" />
              <span>Saluran Rekening</span>
              <span
                className={`badge rounded-pill px-2 py-0.5 text-xxs ${
                  activeTab === "rekening" ? "bg-white text-dark" : "bg-light text-secondary border"
                }`}
              >
                {records.length}
              </span>
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-2 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                activeTab === "transaksi"
                  ? "active bg-dark text-white shadow-sm"
                  : "bg-white text-secondary border hover-bg-light"
              }`}
              onClick={() => {
                setActiveTab("transaksi");
                setSearchQuery("");
              }}
            >
              <i className="bi bi-receipt-cutoff text-success" />
              <span>Transaksi</span>
              <span
                className={`badge rounded-pill px-2 py-0.5 text-xxs ${
                  activeTab === "transaksi" ? "bg-success text-white" : "bg-light text-secondary border"
                }`}
              >
                {transaksiRecords.length}
              </span>
            </button>
          </li>
        </ul>

        <div className="d-none d-md-flex align-items-center text-muted text-xxs gap-2">
          <i className="bi bi-info-circle text-primary" />
          <span>
            {activeTab === "rekening"
              ? "Daftar saluran donasi yang tampil di banner modal"
              : "Riwayat data dari skema donasi_transaksi"}
          </span>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2.5">
            {/* Search and Type Filter */}
            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 flex-grow-1">
              <div className="input-group input-group-sm" style={{ maxWidth: 380 }}>
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "rekening"
                      ? "Cari pemilik, bank, atau rekening..."
                      : "Cari pengirim, keterangan, atau tanggal..."
                  }
                  className="form-control bg-light border-start-0 py-2 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setSearchQuery("")}
                  >
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>

              {/* Tipe filter button group for Tab Transaksi */}
              {activeTab === "transaksi" && (
                <div className="btn-group btn-group-sm rounded-3 border bg-light p-0.5" role="group">
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "all" ? "btn-dark text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("all")}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "masuk" ? "btn-success text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("masuk")}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "keluar" ? "btn-danger text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("keluar")}
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 d-flex align-items-center gap-1.5"
                disabled={loading}
                title="Muat Ulang Data"
              >
                <i className={`bi bi-arrow-clockwise ${loading ? "spin" : ""}`} />
                <span>Segarkan</span>
              </button>

              {activeTab === "rekening" ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="btn btn-warning btn-sm fw-bold text-dark rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
                >
                  <i className="bi bi-plus-circle-fill text-dark" />
                  <span>Tambah Saluran Donasi</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAddTransaksi}
                  className="btn btn-success btn-sm fw-bold text-white rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
                >
                  <i className="bi bi-plus-circle-fill text-white" />
                  <span>Tambah Transaksi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: SALURAN REKENING (donasi) */}
      {activeTab === "rekening" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-table text-warning-emphasis" />
              <span className="fw-bold text-dark text-sm">Daftar Saluran Donasi (donasi)</span>
              <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 text-xxs">
                {filteredRecords.length} Data
              </span>
            </div>
            <div className="text-xxs text-muted">
              Skema: <code className="text-dark">id, nama_pemilik, nama_bank, alamat_rekening, created_at, updated_at</code>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 55 }}>
                      No
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 100 }}>
                      Aksi
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Bank / Saluran (nama_bank)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Nama Pemilik (nama_pemilik)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Alamat Rekening / Nomor (alamat_rekening)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 140 }}>
                      Dibuat (created_at)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 140 }}>
                      Diperbarui (updated_at)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-warning me-2" role="status" />
                        <span className="text-muted text-xs">Memuat data donasi...</span>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <div
                            className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center mb-2"
                            style={{ width: 50, height: 50 }}
                          >
                            <i className="bi bi-heart text-danger fs-4" />
                          </div>
                          <h6 className="fw-bold text-dark mb-1 text-sm">Belum Ada Data Rekening</h6>
                          <p className="text-muted text-xs mb-3" style={{ maxWidth: 350 }}>
                            {searchQuery
                              ? `Tidak ada rekening yang cocok dengan kata kunci "${searchQuery}".`
                              : "Klik tombol Tambah Saluran Donasi untuk memasukkan nomor rekening bank atau e-wallet."}
                          </p>
                          {searchQuery ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-xs rounded-pill px-3"
                              onClick={() => setSearchQuery("")}
                            >
                              Reset Pencarian
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-warning btn-sm fw-bold text-dark rounded-pill px-4 shadow-sm"
                              onClick={onAdd}
                            >
                              <i className="bi bi-plus-lg me-1" />
                              Tambah Saluran Sekarang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, index) => {
                      const isCopied = copiedId === item.id;
                      const badgeClass = getBankBadge(item.nama_bank);
                      const iconClass = getBankIcon(item.nama_bank);

                      return (
                        <tr key={item.id}>
                          {/* No */}
                          <td className="text-center text-muted text-xs px-3 py-3">
                            {index + 1}
                          </td>

                          {/* Aksi */}
                          <td className="text-center px-2 py-3">
                            <div className="d-inline-flex align-items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-xs rounded-2 px-2 py-1"
                                onClick={() => onEdit(item)}
                                title="Edit Rekening"
                              >
                                <i className="bi bi-pencil-square" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-xs rounded-2 px-2 py-1"
                                onClick={() => onDelete(item)}
                                title="Hapus Rekening"
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            </div>
                          </td>

                          {/* Nama Bank */}
                          <td className="px-3 py-3">
                            <span
                              className={`badge ${badgeClass} border rounded-pill px-2.5 py-1 text-xxs fw-bold d-inline-flex align-items-center gap-1.5`}
                            >
                              <i className={`bi ${iconClass}`} />
                              {item.nama_bank}
                            </span>
                          </td>

                          {/* Nama Pemilik */}
                          <td className="px-3 py-3">
                            <div className="fw-semibold text-dark text-xs">{item.nama_pemilik}</div>
                          </td>

                          {/* Alamat Rekening */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center gap-1.5">
                              <code className="text-dark bg-light px-2.5 py-1 rounded border text-xs font-monospace select-all">
                                {item.alamat_rekening}
                              </code>
                              <button
                                type="button"
                                className={`btn btn-xs rounded-circle p-1 d-inline-flex align-items-center justify-content-center transition-all ${
                                  isCopied ? "btn-success text-white" : "btn-outline-secondary"
                                }`}
                                style={{ width: 26, height: 26 }}
                                onClick={() => handleCopy(item.alamat_rekening, item.id)}
                                title="Salin Nomor Rekening"
                              >
                                <i className={`bi ${isCopied ? "bi-check2" : "bi-clipboard"}`} style={{ fontSize: 11 }} />
                              </button>
                            </div>
                          </td>

                          {/* Dibuat (created_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.created_at)}
                          </td>

                          {/* Diperbarui (updated_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.updated_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSAKSI DONASI (donasi_transaksi) */}
      {activeTab === "transaksi" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-receipt text-success" />
              <span className="fw-bold text-dark text-sm">Riwayat Transaksi (donasi_transaksi)</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold">
                {filteredTransaksi.length} Transaksi
              </span>
            </div>
            <div className="text-xxs text-muted">
              Skema: <code className="text-dark">id, nama_pengirim, tanggal, jumlah_transaksi_masuk, jumlah_transaksi_keluar, keterangan, created_at, updated_at</code>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 50 }}>
                      No
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 90 }}>
                      Aksi
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 125 }}>
                      Tanggal
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Nama Pengirim / Pihak
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Keterangan
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-end" style={{ width: 160 }}>
                      Masuk (jumlah_transaksi_masuk)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-end" style={{ width: 160 }}>
                      Keluar (jumlah_transaksi_keluar)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 130 }}>
                      Dibuat
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 130 }}>
                      Diperbarui
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                        <span className="text-muted text-xs">Memuat data transaksi...</span>
                      </td>
                    </tr>
                  ) : filteredTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <div
                            className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center mb-2"
                            style={{ width: 50, height: 50 }}
                          >
                            <i className="bi bi-receipt-cutoff fs-4" />
                          </div>
                          <h6 className="fw-bold text-dark mb-1 text-sm">Belum Ada Riwayat Transaksi</h6>
                          <p className="text-muted text-xs mb-3" style={{ maxWidth: 380 }}>
                            {searchQuery || filterType !== "all"
                              ? "Tidak ada transaksi yang sesuai dengan filter atau kata kunci pencarian."
                              : "Catat donasi masuk atau biaya pengeluaran operasional ke dalam tabel donasi_transaksi."}
                          </p>
                          {searchQuery || filterType !== "all" ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-xs rounded-pill px-3"
                              onClick={() => {
                                setSearchQuery("");
                                setFilterType("all");
                              }}
                            >
                              Reset Filter
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-success btn-sm fw-bold text-white rounded-pill px-4 shadow-sm"
                              onClick={onAddTransaksi}
                            >
                              <i className="bi bi-plus-lg me-1" />
                              Tambah Transaksi Sekarang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransaksi.map((item, index) => {
                      const masuk = Number(item.jumlah_transaksi_masuk) || 0;
                      const keluar = Number(item.jumlah_transaksi_keluar) || 0;

                      return (
                        <tr key={item.id}>
                          {/* No */}
                          <td className="text-center text-muted text-xs px-3 py-3">
                            {index + 1}
                          </td>

                          {/* Aksi */}
                          <td className="text-center px-2 py-3">
                            <div className="d-inline-flex align-items-center gap-1">
                              {onEditTransaksi && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-xs rounded-2 px-2 py-1"
                                  onClick={() => onEditTransaksi(item)}
                                  title="Edit Transaksi"
                                >
                                  <i className="bi bi-pencil-square" />
                                </button>
                              )}
                              {onDeleteTransaksi && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-xs rounded-2 px-2 py-1"
                                  onClick={() => onDeleteTransaksi(item)}
                                  title="Hapus Transaksi"
                                >
                                  <i className="bi bi-trash3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Tanggal */}
                          <td className="px-3 py-3 text-center text-xs fw-semibold text-dark">
                            <div className="d-inline-flex align-items-center gap-1.5 bg-light px-2 py-1 rounded-pill border text-xxs">
                              <i className="bi bi-calendar-event text-primary" />
                              <span>{formatDateDisplay(item.tanggal)}</span>
                            </div>
                          </td>

                          {/* Nama Pengirim */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className={`rounded-circle ${
                                  masuk > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                                } d-flex align-items-center justify-content-center flex-shrink-0`}
                                style={{ width: 26, height: 26 }}
                              >
                                <i className={`bi ${masuk > 0 ? "bi-arrow-down-left" : "bi-arrow-up-right"} text-xxs`} />
                              </div>
                              <span className="fw-bold text-dark text-xs">{item.nama_pengirim || "Hamba Allah"}</span>
                            </div>
                          </td>

                          {/* Keterangan */}
                          <td className="px-3 py-3">
                            <span className="badge bg-light text-secondary border rounded-pill px-2.5 py-1 text-xxs fw-medium">
                              {item.keterangan || "donasi masuk"}
                            </span>
                          </td>

                          {/* Jumlah Transaksi Masuk */}
                          <td className="px-3 py-3 text-end">
                            {masuk > 0 ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                                +{formatRupiah(masuk)}
                              </span>
                            ) : (
                              <span className="text-muted text-xxs">-</span>
                            )}
                          </td>

                          {/* Jumlah Transaksi Keluar */}
                          <td className="px-3 py-3 text-end">
                            {keluar > 0 ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                                -{formatRupiah(keluar)}
                              </span>
                            ) : (
                              <span className="text-muted text-xxs">-</span>
                            )}
                          </td>

                          {/* Waktu Input (created_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.created_at)}
                          </td>

                          {/* Waktu Update (updated_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.updated_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Info Petunjuk Khusus Admin Pusat */}
      <div className="mt-3 card bg-light border-0 rounded-4 p-3.5">
        <div className="d-flex align-items-start gap-3">
          <div className="rounded-circle bg-warning text-dark p-2 d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="bi bi-lightbulb fs-6" />
          </div>
          <div className="text-xs text-secondary">
            <strong className="text-dark">Petunjuk Pengelolaan Menu Donasi:</strong>
            <ul className="mb-0 ps-3 mt-1 d-flex flex-column gap-1">
              <li>
                <strong>Tab Saluran Rekening (<code>donasi</code>):</strong> Digunakan untuk mengatur data rekening &amp; e-wallet yang ditampilkan kepada pengajar / pengguna di modal banner donasi.
              </li>
              <li>
                <strong>Tab Transaksi (<code>donasi_transaksi</code>):</strong> Digunakan untuk mencatat mutasi keuangan donasi masuk (<code>jumlah_transaksi_masuk</code>) dan pemeliharaan server/operasional (<code>jumlah_transaksi_keluar</code>) beserta keterangan (<code>keterangan</code>).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
