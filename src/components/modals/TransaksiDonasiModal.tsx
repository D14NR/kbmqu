import React, { useState, useEffect } from "react";
import type { DonasiTransaksiDraft } from "../../types/donasi";

type TransaksiDonasiModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  draft: DonasiTransaksiDraft;
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof DonasiTransaksiDraft, value: string | number) => void;
  onSave: () => void;
};

const QUICK_NOMINALS = [25000, 50000, 100000, 200000, 500000, 1000000];
const KETERANGAN_PRESETS = [
  "donasi masuk",
  "pemeliharaan database&server",
  "biaya perpanjangan domain/server",
  "pemeliharaan sistem & backup",
];

export function TransaksiDonasiModal({
  isOpen,
  isEditing,
  draft,
  error,
  loading,
  onClose,
  onChange,
  onSave,
}: TransaksiDonasiModalProps) {
  const [transactionType, setTransactionType] = useState<"masuk" | "keluar">("masuk");

  useEffect(() => {
    if (isOpen) {
      if (Number(draft.jumlah_transaksi_keluar) > 0 && Number(draft.jumlah_transaksi_masuk) === 0) {
        setTransactionType("keluar");
      } else {
        setTransactionType("masuk");
      }
    }
  }, [isOpen, draft.jumlah_transaksi_masuk, draft.jumlah_transaksi_keluar]);

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

  const handleTypeChange = (type: "masuk" | "keluar") => {
    setTransactionType(type);
    if (type === "masuk") {
      if (!draft.keterangan || draft.keterangan === "pemeliharaan database&server" || draft.keterangan === "biaya perpanjangan domain/server" || draft.keterangan === "pemeliharaan sistem & backup") {
        onChange("keterangan", "donasi masuk");
      }
      if (Number(draft.jumlah_transaksi_keluar) > 0 && Number(draft.jumlah_transaksi_masuk) === 0) {
        onChange("jumlah_transaksi_masuk", draft.jumlah_transaksi_keluar);
        onChange("jumlah_transaksi_keluar", 0);
      }
    } else {
      if (!draft.keterangan || draft.keterangan === "donasi masuk") {
        onChange("keterangan", "pemeliharaan database&server");
      }
      if (Number(draft.jumlah_transaksi_masuk) > 0 && Number(draft.jumlah_transaksi_keluar) === 0) {
        onChange("jumlah_transaksi_keluar", draft.jumlah_transaksi_masuk);
        onChange("jumlah_transaksi_masuk", 0);
      }
    }
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
              className={`rounded-circle ${
                transactionType === "masuk" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
              } d-flex align-items-center justify-content-center shadow-sm`}
              style={{ width: 40, height: 40 }}
            >
              <i className={`bi ${transactionType === "masuk" ? "bi-arrow-down-left-circle" : "bi-arrow-up-right-circle"} fs-5`} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">
                {isEditing ? "Edit Transaksi Donasi" : "Tambah Catatan Transaksi"}
              </h5>
              <div className="text-muted text-xs">
                Tabel Database: <code className="text-dark fw-bold">donasi_transaksi</code>
              </div>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
        </div>

        {/* Form Body */}
        <div className="mt-3.5 d-flex flex-column gap-3">
          {/* Tipe Transaksi Tab Selector */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1">
              Tipe Transaksi
            </label>
            <div className="btn-group w-100 rounded-3 shadow-sm p-1 bg-light border" role="group">
              <button
                type="button"
                className={`btn btn-sm rounded-2 fw-semibold text-xs py-1.5 transition-all ${
                  transactionType === "masuk"
                    ? "btn-success text-white shadow-sm"
                    : "btn-light text-muted border-0"
                }`}
                onClick={() => handleTypeChange("masuk")}
              >
                <i className="bi bi-arrow-down-left me-1" />
                Transaksi Masuk (Donasi)
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-2 fw-semibold text-xs py-1.5 transition-all ${
                  transactionType === "keluar"
                    ? "btn-danger text-white shadow-sm"
                    : "btn-light text-muted border-0"
                }`}
                onClick={() => handleTypeChange("keluar")}
              >
                <i className="bi bi-arrow-up-right me-1" />
                Transaksi Keluar (Biaya/Operasional)
              </button>
            </div>
          </div>

          {/* Tanggal */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1 d-flex align-items-center gap-1.5">
              <i className="bi bi-calendar-event text-primary" />
              Tanggal Transaksi (tanggal) <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={draft.tanggal}
              onChange={(event) => onChange("tanggal", event.target.value)}
              className="form-control form-control-sm rounded-3 py-2"
            />
          </div>

          {/* Nama Pengirim */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-xs fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                <i className="bi bi-person-heart text-danger" />
                {transactionType === "masuk" ? "Nama Pengirim / Donatur" : "Pihak Terkait / Penerima"} (nama_pengirim) <span className="text-danger">*</span>
              </label>
              {transactionType === "masuk" && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline-secondary rounded-pill py-0.5 px-2 text-xxs"
                  onClick={() => onChange("nama_pengirim", "Hamba Allah")}
                >
                  Set &quot;Hamba Allah&quot;
                </button>
              )}
            </div>
            <input
              type="text"
              value={draft.nama_pengirim}
              onChange={(event) => onChange("nama_pengirim", event.target.value)}
              placeholder={transactionType === "masuk" ? "Contoh: Hamba Allah / Ahmad Fathoni / Alumni Pengajar" : "Contoh: Penyedia Server / Cloud Hosting / Admin Pusat"}
              className="form-control form-control-sm rounded-3 py-2"
              autoFocus
            />
          </div>

          {/* Jumlah Transaksi Masuk */}
          {transactionType === "masuk" ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-xs fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-cash-coin text-success" />
                  Jumlah Transaksi Masuk (jumlah_transaksi_masuk) <span className="text-danger">*</span>
                </label>
                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold">
                  {formatRupiahPreview(draft.jumlah_transaksi_masuk)}
                </span>
              </div>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={draft.jumlah_transaksi_masuk}
                  onChange={(event) => {
                    onChange("jumlah_transaksi_masuk", event.target.value);
                    onChange("jumlah_transaksi_keluar", 0);
                  }}
                  placeholder="0"
                  className="form-control rounded-end-3 py-2"
                />
              </div>
              {/* Quick Nominal Chips */}
              <div className="d-flex flex-wrap gap-1 mt-1.5">
                {QUICK_NOMINALS.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    className={`btn btn-xs rounded-pill py-0.5 px-2 border ${
                      Number(draft.jumlah_transaksi_masuk) === nom
                        ? "btn-success text-white border-success"
                        : "btn-light text-secondary border-secondary-subtle"
                    }`}
                    onClick={() => {
                      onChange("jumlah_transaksi_masuk", nom);
                      onChange("jumlah_transaksi_keluar", 0);
                    }}
                  >
                    +{new Intl.NumberFormat("id-ID").format(nom)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-xs fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-dash-circle text-danger" />
                  Jumlah Transaksi Keluar (jumlah_transaksi_keluar) <span className="text-danger">*</span>
                </label>
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold">
                  {formatRupiahPreview(draft.jumlah_transaksi_keluar)}
                </span>
              </div>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted fw-semibold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={draft.jumlah_transaksi_keluar}
                  onChange={(event) => {
                    onChange("jumlah_transaksi_keluar", event.target.value);
                    onChange("jumlah_transaksi_masuk", 0);
                  }}
                  placeholder="0"
                  className="form-control rounded-end-3 py-2"
                />
              </div>
              {/* Quick Nominal Chips */}
              <div className="d-flex flex-wrap gap-1 mt-1.5">
                {QUICK_NOMINALS.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    className={`btn btn-xs rounded-pill py-0.5 px-2 border ${
                      Number(draft.jumlah_transaksi_keluar) === nom
                        ? "btn-danger text-white border-danger"
                        : "btn-light text-secondary border-secondary-subtle"
                    }`}
                    onClick={() => {
                      onChange("jumlah_transaksi_keluar", nom);
                      onChange("jumlah_transaksi_masuk", 0);
                    }}
                  >
                    +{new Intl.NumberFormat("id-ID").format(nom)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <label className="form-label text-xs fw-bold text-dark mb-1 d-flex align-items-center gap-1.5">
              <i className="bi bi-card-text text-secondary" />
              Keterangan Transaksi (keterangan) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.keterangan}
              onChange={(event) => onChange("keterangan", event.target.value)}
              placeholder="Contoh: donasi masuk / pemeliharaan server"
              className="form-control form-control-sm rounded-3 py-2 mb-1.5"
            />
            {/* Keterangan presets */}
            <div className="d-flex flex-wrap gap-1">
              {KETERANGAN_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`btn btn-xs rounded-pill py-0.5 px-2 border text-xxs ${
                    draft.keterangan === preset
                      ? "btn-dark text-white"
                      : "btn-light text-muted border-secondary-subtle"
                  }`}
                  onClick={() => onChange("keterangan", preset)}
                >
                  {preset}
                </button>
              ))}
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
            className="btn btn-success btn-sm text-white fw-bold px-4 rounded-3 d-flex align-items-center gap-1.5 shadow-sm"
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
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Transaksi"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

