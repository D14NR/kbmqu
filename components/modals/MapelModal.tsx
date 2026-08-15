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
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 460 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">{editingMapelOldName ? "Edit" : "Tambah"} Mata Pelajaran</h5>
            <div className="text-muted small">Kelola data mata pelajaran dan singkatannya.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Mata Pelajaran</label>
          <input
            value={mapelDraft.Mapel}
            onChange={(event) => onMapelChange(event.target.value)}
            placeholder="Contoh: Matematika"
            className="form-control form-control-sm"
          />
          <label className="form-label small fw-semibold mt-3">Singkatan</label>
          <input
            value={mapelDraft.Kode_Mapel}
            onChange={(event) => onKodeMapelChange(event.target.value)}
            placeholder="Contoh: MTK"
            className="form-control form-control-sm"
          />
          {mapelError && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {mapelError}
            </div>
          )}
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}