import React, { useEffect, useState } from "react";

type MapelModalProps = {
  isOpen: boolean;
  editingMapelOldName: string | null;
  mapelDraft: { Mapel: string; Kode_Mapel: string };
  mapelError: string;
  loading: boolean;
  onClose: () => void;
  onMapelChange: (value: string) => void;
  onKodeMapelChange: (value: string) => void;
  onSave: () => void;
};

// Preset populer untuk mempermudah pengisian
const POPULAR_PRESETS = [
  { name: "Matematika", code: "MTK" },
  { name: "Fisika", code: "FIS" },
  { name: "Kimia", code: "KIM" },
  { name: "Biologi", code: "BIO" },
  { name: "Bahasa Indonesia", code: "IND" },
  { name: "Bahasa Inggris", code: "ING" },
  { name: "Sejarah", code: "SEJ" },
  { name: "Geografi", code: "GEO" },
  { name: "Ekonomi", code: "EKO" },
  { name: "Sosiologi", code: "SOS" },
  { name: "Tes Potensi Skolastik (TPS)", code: "TPS" },
  { name: "Literasi & Penalaran", code: "LIT" },
];

export function MapelModal({
  isOpen,
  editingMapelOldName,
  mapelDraft,
  mapelError,
  loading,
  onClose,
  onMapelChange,
  onKodeMapelChange,
  onSave,
}: MapelModalProps) {
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setLocalError(mapelError);
  }, [mapelError]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mapelDraft.Mapel.trim() && mapelDraft.Kode_Mapel.trim()) {
        onSave();
      }
    }
  };

  const handleApplyPreset = (preset: { name: string; code: string }) => {
    onMapelChange(preset.name);
    onKodeMapelChange(preset.code);
  };

  const handleAutoGenerateCode = () => {
    const raw = mapelDraft.Mapel.trim();
    if (!raw) return;
    const words = raw.split(/[\s-]+/).filter(Boolean);
    let code = "";
    if (words.length === 1) {
      code = words[0].slice(0, 3).toUpperCase();
    } else {
      code = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
    }
    onKodeMapelChange(code);
  };

  const isEditing = Boolean(editingMapelOldName);
  const isValid = mapelDraft.Mapel.trim().length > 0 && mapelDraft.Kode_Mapel.trim().length > 0;

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 1055,
      }}
    >
      <div
        className="modal-content-card bg-white rounded-4 shadow-2xl border-0 w-100 overflow-hidden"
        style={{
          maxWidth: 520,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 1. MODAL HEADER */}
        <div className="p-3.5 p-sm-4 bg-light border-bottom d-flex justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm ${
                isEditing ? "bg-amber-100 text-amber-700" : "bg-primary-subtle text-primary"
              }`}
              style={{ width: 46, height: 46 }}
            >
              <i className={`bi ${isEditing ? "bi-pencil-square" : "bi-journal-plus"} fs-4`} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-0.5">
                <h5 className="fw-bold mb-0 text-dark">
                  {isEditing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
                </h5>
                <span
                  className={`badge rounded-pill text-xxs px-2 py-0.5 ${
                    isEditing ? "bg-amber-subtle text-amber-800 border border-amber-200" : "bg-primary-subtle text-primary border border-primary-subtle"
                  }`}
                >
                  {isEditing ? "Perbarui" : "Baru"}
                </span>
              </div>
              <p className="text-muted text-xs mb-0">
                {isEditing
                  ? `Mengubah rincian mata pelajaran: ${editingMapelOldName}`
                  : "Daftarkan mata pelajaran dan kode singkatan resmi KBM"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-circle p-0 text-muted d-flex align-items-center justify-content-center flex-shrink-0 border-0 hover:bg-gray-100"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* 2. MODAL BODY */}
        <div className="p-3.5 p-sm-4 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          <div className="d-flex flex-column gap-3.5">
            {/* Quick Preset Selector (Only for new items) */}
            {!isEditing && (
              <div>
                <label className="text-muted text-xxs fw-semibold text-uppercase d-flex align-items-center gap-1.5 mb-1.5">
                  <i className="bi bi-lightning-charge text-amber-500" />
                  Pilihan Cepat (Preset Mata Pelajaran)
                </label>
                <div className="d-flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-light rounded-3 border border-dashed">
                  {POPULAR_PRESETS.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`btn btn-xs rounded-2 d-flex align-items-center gap-1 transition-all ${
                        mapelDraft.Kode_Mapel === preset.code
                          ? "btn-primary shadow-xs"
                          : "btn-outline-secondary bg-white text-dark border-secondary-subtle"
                      }`}
                    >
                      <span className="badge bg-secondary-subtle text-secondary-emphasis font-monospace me-0.5">
                        {preset.code}
                      </span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Field 1: Nama Mata Pelajaran */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-journal-text text-primary" />
                  Nama Mata Pelajaran <span className="text-danger">*</span>
                </label>
                <span className="text-muted text-xxs">Contoh: Matematika Wajib</span>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-book" />
                </span>
                <input
                  type="text"
                  value={mapelDraft.Mapel}
                  onChange={(e) => onMapelChange(e.target.value)}
                  placeholder="Masukkan nama mata pelajaran lengkap"
                  className="form-control border-start-0 fw-semibold"
                  autoFocus
                />
                {mapelDraft.Mapel && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0 border-end"
                    onClick={() => onMapelChange("")}
                    title="Hapus teks"
                  >
                    <i className="bi bi-x text-muted" />
                  </button>
                )}
              </div>
            </div>

            {/* Field 2: Kode Singkatan */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-tag-fill text-primary" />
                  Kode Singkatan <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  disabled={!mapelDraft.Mapel.trim()}
                  className="btn btn-link btn-xs text-decoration-none p-0 text-primary fw-semibold d-flex align-items-center gap-1"
                >
                  <i className="bi bi-magic" />
                  Otomatiskan dari Nama
                </button>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-hash" />
                </span>
                <input
                  type="text"
                  value={mapelDraft.Kode_Mapel}
                  onChange={(e) => onKodeMapelChange(e.target.value.toUpperCase())}
                  placeholder="MTK / FIS / BIO"
                  maxLength={10}
                  className="form-control border-start-0 fw-bold font-monospace text-uppercase"
                />
              </div>
              <div className="text-muted text-xxs mt-1 d-flex align-items-center gap-1">
                <i className="bi bi-info-circle text-primary" />
                Kode ini digunakan pada badge sesi jadwal kelas, surat tugas, dan matriks.
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-3 bg-light rounded-3 border">
              <span className="text-muted text-xxs fw-bold text-uppercase d-block mb-2">
                <i className="bi bi-eye me-1 text-primary" />
                Pratinjau Tampilan Jadwal & Badge
              </span>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="badge bg-primary px-2.5 py-1.5 text-xs rounded-2 font-monospace shadow-xs d-flex align-items-center gap-1.5">
                  <i className="bi bi-bookmark-fill opacity-75" />
                  {mapelDraft.Kode_Mapel.trim() || "KODE"}
                </div>
                <span className="text-dark fw-bold text-sm">
                  {mapelDraft.Mapel.trim() || "Nama Mata Pelajaran"}
                </span>
                <span className="badge bg-white text-muted border text-xxs rounded-pill ms-auto">
                  Format Resmi
                </span>
              </div>
            </div>

            {/* Error Message */}
            {localError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 mb-0 text-xs shadow-xs" role="alert">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-6 flex-shrink-0" />
                <div>{localError}</div>
              </div>
            )}
          </div>
        </div>

        {/* 3. MODAL FOOTER */}
        <div className="p-3 p-sm-3.5 bg-light border-top d-flex justify-content-between align-items-center gap-2">
          <div className="text-muted text-xxs d-none d-sm-block">
            Tekan <kbd className="bg-white border text-dark px-1.5 py-0.5 rounded text-xxs">Enter</kbd> untuk simpan
          </div>
          <div className="d-flex align-items-center gap-2 ms-auto">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3.5 rounded-3"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-2 rounded-3"
              onClick={onSave}
              disabled={loading || !isValid}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle fs-6" />
                  <span>{isEditing ? "Perbarui Mapel" : "Simpan Mapel"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
