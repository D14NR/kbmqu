type AccountsCabangDraft = {
  Username: string;
  Password: string;
  Roll: string;
  Cabang: string;
};

type AccountsCabangModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  draft: AccountsCabangDraft;
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof AccountsCabangDraft, value: string) => void;
  onSave: () => void;
};

export function AccountsCabangModal({
  isOpen,
  isEditing,
  draft,
  error,
  loading,
  onClose,
  onChange,
  onSave,
}: AccountsCabangModalProps) {
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
        style={{ maxWidth: 520 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">{isEditing ? "Edit" : "Tambah"} Akun Cabang</h5>
            <div className="text-muted small">Kelola akun login cabang.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Username</label>
          <input
            type="text"
            value={draft.Username}
            onChange={(event) => onChange("Username", event.target.value)}
            placeholder="Contoh: semarang1"
            className="form-control form-control-sm"
          />
          <label className="form-label small fw-semibold mt-3">Password</label>
          <input
            type="text"
            value={draft.Password}
            onChange={(event) => onChange("Password", event.target.value)}
            placeholder="Password login"
            className="form-control form-control-sm"
          />
          <label className="form-label small fw-semibold mt-3">Roll</label>
          <input
            type="text"
            value={draft.Roll}
            onChange={(event) => onChange("Roll", event.target.value)}
            placeholder="cabang"
            className="form-control form-control-sm"
          />
          <label className="form-label small fw-semibold mt-3">Cabang</label>
          <input
            type="text"
            value={draft.Cabang}
            onChange={(event) => onChange("Cabang", event.target.value)}
            placeholder="Nama cabang"
            className="form-control form-control-sm"
          />
          {error && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {error}
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
