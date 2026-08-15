import Select from "react-select";
import type { SelectOption } from "../../types/app";

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
  cabangLabel: string;
  isDomisiliLocked: boolean;
  domisiliOptions: string[];
  bidangStudiOptions: SelectOption[];
  error: string;
  loading: boolean;
  onClose: () => void;
  onChange: (field: keyof PengajarDraft, value: string) => void;
  onBidangStudiChange: (values: string[]) => void;
  onGeneratePassword: () => void;
  onSave: () => void;
};

export function PengajarModal({
  isOpen,
  isEditing,
  draft,
  cabangLabel,
  isDomisiliLocked,
  domisiliOptions,
  bidangStudiOptions,
  error,
  loading,
  onClose,
  onChange,
  onBidangStudiChange,
  onGeneratePassword,
  onSave,
}: PengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const bidangStudiValues = draft["Bidang Studi"]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const selectedBidangStudi = bidangStudiValues.map((value) => {
    const matched = bidangStudiOptions.find((option) => option.value.toLowerCase() === value.toLowerCase());
    return matched || { value, label: value };
  });

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
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Nama</label>
              <input
                type="text"
                value={draft.Nama}
                onChange={(event) => onChange("Nama", event.target.value)}
                placeholder="Nama Lengkap"
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Kode Pengajar</label>
              <input
                type="text"
                value={draft["Kode Pengajar"]}
                placeholder="Otomatis dari Nama"
                className="form-control form-control-sm"
                readOnly
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Cabang</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cabangLabel}
                placeholder="Otomatis dari akun login"
                readOnly
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Domisili</label>
              {isDomisiliLocked ? (
                <input
                  type="text"
                  value={draft.Domisili}
                  placeholder="Otomatis dari Cabang"
                  className="form-control form-control-sm"
                  readOnly
                />
              ) : (
                <select
                  className="form-select form-select-sm"
                  value={draft.Domisili}
                  onChange={(event) => onChange("Domisili", event.target.value)}
                >
                  <option value="">Pilih Domisili Cabang</option>
                  {domisiliOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">No.WhatsApp</label>
              <input
                type="text"
                value={draft["No.WhatsApp"]}
                onChange={(event) => onChange("No.WhatsApp", event.target.value)}
                placeholder="0812xxxxxx"
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Username</label>
              <input
                type="text"
                value={draft.Username}
                placeholder="Otomatis dari No.WhatsApp"
                className="form-control form-control-sm"
                readOnly
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Bidang Studi</label>
              <Select
                isMulti
                isSearchable
                classNamePrefix="react-select"
                options={bidangStudiOptions}
                value={selectedBidangStudi}
                placeholder="Pilih mata pelajaran yang diampu"
                noOptionsMessage={() => "Data mata pelajaran tidak ditemukan"}
                onChange={(selected) => {
                  const nextValues = (selected || []).map((item) => item.value);
                  onBidangStudiChange(nextValues);
                }}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="absolute"
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Email</label>
              <input
                type="text"
                value={draft.Email}
                onChange={(event) => onChange("Email", event.target.value)}
                placeholder="email@example.com"
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold mt-2">Password</label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  value={draft.Password}
                  onChange={(event) => onChange("Password", event.target.value)}
                  placeholder="Maksimal 6 karakter"
                  className="form-control"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onGeneratePassword}
                >
                  Generate
                </button>
              </div>
            </div>
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