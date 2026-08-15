type PengajarDraft = {
  "Kode Pengajar": string;
  Nama: string;
  "Bidang Studi": string;
  Email: string;
  "No.WhatsApp": string;
  Domisili: string;
  Username: string;
  Password: string;
};

type PengajarModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  draft: PengajarDraft;
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof PengajarDraft, value: string) => void;
  onSave: () => void;
};

const fields: Array<{ key: keyof PengajarDraft; label: string; placeholder: string }> = [
  { key: "Kode Pengajar", label: "Kode Pengajar", placeholder: "Contoh: mk" },
  { key: "Nama", label: "Nama", placeholder: "Nama Lengkap" },
  { key: "Bidang Studi", label: "Bidang Studi", placeholder: "Contoh: Matematika" },
  { key: "Email", label: "Email", placeholder: "email@example.com" },
  { key: "No.WhatsApp", label: "No.WhatsApp", placeholder: "0812xxxxxx" },
  { key: "Domisili", label: "Domisili", placeholder: "Semarang" },
  { key: "Username", label: "Username", placeholder: "Username" },
  { key: "Password", label: "Password", placeholder: "Password" },
];

export function PengajarModal({
  isOpen,
  isEditing,
  draft,
  error,
  loading,
  onClose,
  onChange,
  onSave,
}: PengajarModalProps) {
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
        style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">{isEditing ? "Edit" : "Tambah"} Pengajar</h5>
            <div className="text-muted small">Kelola data pengajar.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <div className="row g-2">
            {fields.map((field) => (
              <div key={field.key} className="col-12 col-md-6">
                <label className="form-label small fw-semibold mt-2">{field.label}</label>
                <input
                  type={field.key === "Password" ? "text" : "text"}
                  value={draft[field.key]}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="form-control form-control-sm"
                />
              </div>
            ))}
          </div>

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

export type { PengajarDraft };