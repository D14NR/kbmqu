import React, { useState, useMemo } from "react";
import type { DonasiRecord } from "../../types/donasi";

type DonasiViewProps = {
  loading: boolean;
  records: DonasiRecord[];
  onAdd: () => void;
  onEdit: (record: DonasiRecord) => void;
  onDelete: (record: DonasiRecord) => void;
  onRefresh: () => void;
};

export function DonasiView({
  loading,
  records,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: DonasiViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Perhitungan Statistik
  const totalRekening = records.length;
  const totalNominal = useMemo(() => {
    return records.reduce((acc, curr) => acc + (Number(curr.nominal_terkumpul) || 0), 0);
  }, [records]);

  const rataRataNominal = totalRekening > 0 ? totalNominal / totalRekening : 0;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

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

  return (
    <div className="py-2">
      {/* Header & Stats Bento */}
      <div className="row g-3 mb-4 align-items-stretch">
        <div className="col-12 col-xl-5 d-flex flex-column justify-content-between">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xxs fw-bold d-inline-flex align-items-center gap-1">
                <i className="bi bi-shield-lock-fill" />
                KHUSUS ADMIN PUSAT
              </span>
              <span className="badge bg-light text-muted border rounded-pill px-2.5 py-1 text-xxs">
                <i className="bi bi-database me-1" />
                Tabel: donasi
              </span>
            </div>
            <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-heart-fill text-danger" />
              Kelola Data Donasi Database
            </h4>
            <p className="text-muted text-xs mb-0">
              Konfigurasi rekening dan pantau nominal donasi sukarela pemeliharaan database Cloudflare prabayar.
            </p>
          </div>
        </div>

        {/* Stats Bento */}
        <div className="col-12 col-xl-7">
          <div className="row g-2.5 h-100">
            {/* Total Terkumpul */}
            <div className="col-12 col-sm-6">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <i className="bi bi-cash-coin fs-4" />
                </div>
                <div className="min-w-0 flex-grow-1">
                  <div className="text-xxs text-muted fw-bold text-uppercase">Total Terkumpul</div>
                  <div className="fs-5 fw-bold text-success text-truncate">
                    {formatRupiah(totalNominal)}
                  </div>
                  <div className="text-xxs text-muted">Seluruh Saluran Donasi</div>
                </div>
              </div>
            </div>

            {/* Saluran Rekening Terdaftar */}
            <div className="col-6 col-sm-3">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <i className="bi bi-credit-card-2-front fs-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xxs text-muted fw-bold text-uppercase">Saluran</div>
                  <div className="fs-5 fw-bold text-dark">{totalRekening}</div>
                  <div className="text-xxs text-muted">Rekening</div>
                </div>
              </div>
            </div>

            {/* Rata-rata */}
            <div className="col-6 col-sm-3">
              <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  <i className="bi bi-calculator fs-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xxs text-muted fw-bold text-uppercase">Rata-rata</div>
                  <div className="text-sm fw-bold text-dark text-truncate">
                    {formatRupiah(rataRataNominal)}
                  </div>
                  <div className="text-xxs text-muted">Per Saluran</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2.5">
            {/* Search Input */}
            <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pemilik, bank, atau rekening..."
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
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-warning btn-sm fw-bold text-dark rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
              >
                <i className="bi bi-plus-circle-fill text-dark" />
                <span>Tambah Data Donasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-table text-warning-emphasis" />
            <span className="fw-bold text-dark text-sm">Daftar Saluran Donasi</span>
            <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 text-xxs">
              {filteredRecords.length} Data
            </span>
          </div>
          <div className="text-xxs text-muted">
            Data ini ditampilkan langsung pada banner & modal donasi publik
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: "65vh" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 60 }}>
                    No
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 110 }}>
                    Aksi
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                    Bank / Saluran
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                    Nama Pemilik
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                    Nomor / Alamat Rekening
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-end">
                    Nominal Terkumpul
                  </th>
                  <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center">
                    Terakhir Update
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
                        <h6 className="fw-bold text-dark mb-1 text-sm">Belum Ada Data Donasi</h6>
                        <p className="text-muted text-xs mb-3" style={{ maxWidth: 350 }}>
                          {searchQuery
                            ? `Tidak ada rekening yang cocok dengan kata kunci "${searchQuery}".`
                            : "Klik tombol Tambah Data Donasi untuk memasukkan nomor rekening bank atau e-wallet."}
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
                            Tambah Data Sekarang
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
                              title="Edit Rekening / Nominal"
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
                            <code className="text-dark bg-light px-2 py-1 rounded border text-xs font-monospace select-all">
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

                        {/* Nominal Terkumpul */}
                        <td className="px-3 py-3 text-end">
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                            {formatRupiah(Number(item.nominal_terkumpul) || 0)}
                          </span>
                        </td>

                        {/* Update Terakhir */}
                        <td className="px-3 py-3 text-center text-muted text-xxs">
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
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

      {/* Info Petunjuk Khusus Admin Pusat */}
      <div className="mt-3 card bg-light border-0 rounded-4 p-3.5">
        <div className="d-flex align-items-start gap-3">
          <div className="rounded-circle bg-warning text-dark p-2 d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="bi bi-lightbulb fs-6" />
          </div>
          <div className="text-xs text-secondary">
            <strong className="text-dark">Petunjuk Pengelolaan Donasi Admin Pusat:</strong>
            <ul className="mb-0 ps-3 mt-1 d-flex flex-column gap-1">
              <li>
                Setiap nomor rekening dan nama bank yang ditambahkan di menu ini akan otomatis tersinkronisasi dan tampil di banner serta jendela modal <strong>"Donasi Pemeliharaan Database"</strong>.
              </li>
              <li>
                Anda dapat memperbarui kolom <strong>Nominal Terkumpul</strong> kapan saja saat ada donasi sukarela yang masuk agar tercatat secara transparan di sistem.
              </li>
              <li>
                Menu ini dilindungi dan hanya dapat diakses serta diubah oleh akun dengan hak akses <strong>Admin Pusat</strong>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
