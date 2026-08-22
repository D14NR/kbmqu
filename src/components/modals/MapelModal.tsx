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
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 1050,
      }}
    >
      <div
        className="modal-content-card bg-white rounded-4 shadow-lg border w-100 overflow-hidden"
        style={{
          maxWidth: 460,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="modal-header-modern bg-white p-3 p-sm-4 border-bottom d-flex justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <i className="bi bi-book-half fs-4" />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">
                {editingMapelOldName ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
              </h5>
              <div className="text-muted text-xxs">
                Kelola nama mata pelajaran dan kode singkatannya untuk tabel jadwal.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-light btn-sm rounded-circle p-0 text-muted d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="modal-body-modern p-3 p-sm-4 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          <div className="d-flex flex-column gap-3">
            {/* Field 1: Nama Mapel */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-journal-text text-primary" />
                Nama Mata Pelajaran <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-bookmark text-muted" />
                </span>
                <input
                  value={mapelDraft.Mapel}
                  onChange={(event) => onMapelChange(event.target.value)}
                  placeholder="Contoh: Matematika Wajib, Fisika, Biologi"
                  className="form-control border-start-0 fw-semibold"
                />
              </div>
            </div>

            {/* Field 2: Kode Singkatan */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-tag text-primary" />
                Kode Singkatan <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-hash text-muted" />
                </span>
                <input
                  value={mapelDraft.Kode_Mapel}
                  onChange={(event) => onKodeMapelChange(event.target.value.toUpperCase())}
                  placeholder="Contoh: MTK, FIS, BIO, KIM"
                  className="form-control border-start-0 fw-semibold font-monospace"
                />
              </div>
              <div className="text-muted text-xxs mt-1">
                Kode singkatan akan ditampilkan pada badge tabel sesi jadwal.
              </div>
            </div>

            {/* Error Alert */}
            {mapelError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 mb-0 text-xs" role="alert">
                <i className="bi bi-exclamation-circle-fill text-danger fs-6 flex-shrink-0" />
                <div>{mapelError}</div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="modal-footer-modern bg-light p-3 border-top d-flex justify-content-end align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3 rounded-2"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1.5 rounded-2"
            onClick={onSave}
            disabled={loading || !mapelDraft.Mapel.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle" />
                <span>{editingMapelOldName ? "Simpan Perubahan" : "Simpan Mapel"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
