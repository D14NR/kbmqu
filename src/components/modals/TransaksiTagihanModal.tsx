import React from "react";
import type { DonasiTransaksiTagihanDraft } from "../../types/donasi";

type TransaksiTagihanModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  draft: DonasiTransaksiTagihanDraft;
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof DonasiTransaksiTagihanDraft, value: string | number) => void;
  onSave: () => void;
};

const QUICK_NOMINALS = [25000, 50000, 75000, 100000, 150000, 250000, 500000];
const PENGIRIM_PRESETS = [
  "Cloudflare Operations",
  "Cloudflare Plan Worker & Database",
  "Cloudflare KV & backup ",
  "Cloudflare Pemeliharaan Server",
];
const KETERANGAN_PRESETS = [
  "pembelian database & server",
  "Operations Writes, Deletes, Read",
  "biaya perpanjangan database & server",
  "pemeliharaan sistem & backup",
];

const formatForDateTimeInput = (dateStr?: string) => {
  if (!dateStr) return "";
  if (dateStr.includes("T") && dateStr.length >= 16) {
    return dateStr.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T12:00`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
};

export function TransaksiTagihanModal({
  isOpen,
  isEditing,
  draft,
  error,
  loading,
  onClose,
  onChange,
  onSave,
}: TransaksiTagihanModalProps) {
  if (!isOpen) {
    return null;
  }

  const formatRupiahPreview = (val: string | number) => {
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    if (isNaN(num) || num < 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      style={{ zIndex: 1060, backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-lg p-4 w-100 border-0"
        style={{ maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start pb-3 border-bottom">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: 40, height: 40 }}
            >
              <i className="bi bi-receipt-cutoff fs-5" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">
                {isEditing ? "Edit Transaksi Tagihan" : "Tambah Transaksi Tagihan"}
              </h5>
              <div className="text-muted text-xs">
                Tabel Database: <code className="text-dark fw-bold">donasi_transaksi_tagihan</code>
              </div>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
        </div>

        {/* Form Body */}
        <div className="mt-3.5 d-flex flex-column gap-3">
          {/* Nama Pengirim / Vendor */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-xs fw-bold text-dark mb-0">
                Nama Pengirim / Vendor Tagihan <span className="text-danger">*</span>
              </label>
            </div>
            <input
              type="text"
              className="form-control form-control-sm py-2 px-3 text-xs rounded-3 border-secondary-subtle"
              placeholder="Contoh: Cloudflare D1 & Host / Server & Domain"
              value={draft.nama_pengirim}
              onChange={(e) => onChange("nama_pengirim", e.target.value)}
            />
            {/* Quick Presets for Pengirim */}
            <div className="d-flex align-items-center gap-1.5 flex-wrap mt-1.5">
              <span className="text-xxs text-muted">Contoh Cepat:</span>
              {PENGIRIM_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange("nama_pengirim", p)}
                  className="badge bg-light text-dark border text-xxs rounded-pill text-decoration-none py-1 px-2 hover-bg-secondary-subtle"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal Tagihan */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1">
              Tanggal Tagihan <span className="text-danger">*</span>
            </label>
            <input
              type="datetime-local"
              className="form-control form-control-sm py-2 px-3 text-xs rounded-3 border-secondary-subtle"
              value={formatForDateTimeInput(draft.tanggal)}
              onChange={(e) => onChange("tanggal", e.target.value)}
            />
            <div className="text-xxs text-muted mt-1">
              Pilih tanggal & waktu penerbitan atau pencatatan invoice tagihan.
            </div>
          </div>

          {/* Jumlah Tagihan */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-xs fw-bold text-dark mb-0">
                Jumlah Tagihan (Rp) <span className="text-danger">*</span>
              </label>
              <span className="fw-bold text-danger text-sm">
                {formatRupiahPreview(draft.jumlah_tagihan)}
              </span>
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-dark fw-bold text-xs border-secondary-subtle">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-control form-control-sm py-2 px-3 text-xs rounded-end-3 border-secondary-subtle"
                placeholder="0"
                value={draft.jumlah_tagihan || ""}
                onChange={(e) => onChange("jumlah_tagihan", e.target.value)}
              />
            </div>

            {/* Quick Nominals */}
            <div className="d-flex align-items-center gap-1.5 flex-wrap mt-2">
              <span className="text-xxs text-muted">Pilihan Cepat:</span>
              {QUICK_NOMINALS.map((nom) => (
                <button
                  key={nom}
                  type="button"
                  onClick={() => onChange("jumlah_tagihan", nom)}
                  className="badge bg-light text-dark border text-xxs rounded-pill text-decoration-none py-1 px-2 hover-bg-secondary-subtle"
                >
                  {new Intl.NumberFormat("id-ID").format(nom)}
                </button>
              ))}
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1">
              Keterangan Tagihan
            </label>
            <input
              type="text"
              className="form-control form-control-sm py-2 px-3 text-xs rounded-3 border-secondary-subtle"
              placeholder="tagihan bulan ini"
              value={draft.keterangan}
              onChange={(e) => onChange("keterangan", e.target.value)}
            />
            {/* Quick Presets for Keterangan */}
            <div className="d-flex align-items-center gap-1.5 flex-wrap mt-1.5">
              <span className="text-xxs text-muted">Preset:</span>
              {KETERANGAN_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onChange("keterangan", k)}
                  className={`badge border text-xxs rounded-pill text-decoration-none py-1 px-2 ${
                    draft.keterangan === k
                      ? "bg-danger-subtle text-danger border-danger-subtle"
                      : "bg-light text-muted hover-bg-secondary-subtle"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger py-2 px-3 text-xs rounded-3 d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="d-flex justify-content-end align-items-center gap-2 pt-3 mt-4 border-top">
          <button
            type="button"
            className="btn btn-light btn-sm text-secondary fw-semibold rounded-3 px-3 py-1.5 text-xs"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm text-white fw-bold rounded-3 px-4 py-1.5 text-xs shadow-sm d-flex align-items-center gap-1.5"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check-circle-fill" />
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Tagihan"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
