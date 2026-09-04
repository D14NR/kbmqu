import React from "react";
import type { DonasiDraft } from "../../types/donasi";

type DonasiModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  draft: DonasiDraft;
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof DonasiDraft, value: string) => void;
  onSave: () => void;
};

const BANK_SUGGESTIONS = [
  "Bank Jago",
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "BSI",
  "PayPal",
  "ShopeePay",
  "DANA",
  "GoPay",
];

export function DonasiModal({
  isOpen,
  isEditing,
  draft,
  error,
  loading,
  onClose,
  onChange,
  onSave,
}: DonasiModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      style={{ zIndex: 1060, backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-lg p-4 w-100 border-0"
        style={{ maxWidth: 520 }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start pb-3 border-bottom">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: 40, height: 40 }}
            >
              <i className="bi bi-heart-fill text-danger fs-5" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">{isEditing ? "Edit Saluran Rekening" : "Tambah Saluran Rekening"}</h5>
              <div className="text-muted text-xs">
                Tabel Database: <code className="text-dark fw-bold">donasi</code>
              </div>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
        </div>

        {/* Form Body */}
        <div className="mt-3.5 d-flex flex-column gap-3">
          {/* Nama Bank */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1 d-flex align-items-center gap-1.5">
              <i className="bi bi-bank2 text-primary" />
              Nama Bank / Saluran (nama_bank) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.nama_bank}
              onChange={(event) => onChange("nama_bank", event.target.value)}
              placeholder="Contoh: Bank Jago, BCA, PayPal, ShopeePay"
              className="form-control form-control-sm rounded-3 py-2"
              autoFocus
            />
            <div className="d-flex flex-wrap gap-1 mt-1.5">
              {BANK_SUGGESTIONS.map((bank) => (
                <button
                  key={bank}
                  type="button"
                  className={`btn btn-xs rounded-pill py-0.5 px-2 border ${
                    draft.nama_bank.toLowerCase() === bank.toLowerCase()
                      ? "btn-primary text-white border-primary"
                      : "btn-light text-secondary border-secondary-subtle"
                  }`}
                  onClick={() => onChange("nama_bank", bank)}
                >
                  {bank}
                </button>
              ))}
            </div>
          </div>

          {/* Nama Pemilik */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1 d-flex align-items-center gap-1.5">
              <i className="bi bi-person-fill text-primary" />
              Nama Pemilik Rekening / Akun (nama_pemilik) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.nama_pemilik}
              onChange={(event) => onChange("nama_pemilik", event.target.value)}
              placeholder="Contoh: Dian Rizki Sofiawan"
              className="form-control form-control-sm rounded-3 py-2"
            />
          </div>

          {/* Alamat Rekening */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1 d-flex align-items-center gap-1.5">
              <i className="bi bi-credit-card text-primary" />
              Alamat Rekening / Nomor / Email (alamat_rekening) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.alamat_rekening}
              onChange={(event) => onChange("alamat_rekening", event.target.value)}
              placeholder="Contoh: 109760181905 / 08999990431 / dianrizkisofiawan9@gmail.com"
              className="form-control form-control-sm font-monospace rounded-3 py-2"
            />
            <div className="form-text text-xxs text-muted mt-1">
              Nomor/alamat ini yang disalin oleh donatur saat membuka banner donasi pemeliharaan database.
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 text-xs mb-0 rounded-3 d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm px-3 rounded-3" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-warning btn-sm text-dark fw-bold px-4 rounded-3 d-flex align-items-center gap-1.5 shadow-sm"
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
                <i className="bi bi-check2-circle fs-6" />
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Saluran Rekening"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
