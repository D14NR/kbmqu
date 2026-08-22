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

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "38px",
    height: "auto",
    fontSize: "0.875rem",
    borderRadius: "8px",
    borderColor: state.isFocused ? "#3b82f6" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "0 1px 2px rgba(0, 0, 0, 0.04)",
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: "0.78rem",
    padding: "2px 6px",
  }),
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
          maxWidth: 620,
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
              <i className={`bi ${isEditing ? "bi-person-gear" : "bi-person-plus-fill"} fs-4`} />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">{isEditing ? "Edit Data Pengajar" : "Tambah Pengajar Baru"}</h5>
              <div className="text-muted text-xxs">Kelola identitas, bidang studi, dan kredensial login pengajar.</div>
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
          <div className="row g-3">
            {/* Field: Nama */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-person text-primary" />
                Nama Lengkap <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={draft.Nama}
                onChange={(event) => onChange("Nama", event.target.value)}
                placeholder="Contoh: Budi Santoso, M.Pd"
                className="form-control form-control-sm fw-semibold"
              />
            </div>

            {/* Field: Kode Pengajar */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-upc-scan text-muted" />
                Kode Pengajar
              </label>
              <input
                type="text"
                value={draft["Kode Pengajar"]}
                placeholder="Otomatis dari Nama"
                className="form-control form-control-sm bg-light text-muted font-monospace"
                readOnly
              />
            </div>

            {/* Field: Cabang */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-building text-muted" />
                Cabang Akun
              </label>
              <input
                type="text"
                className="form-control form-control-sm bg-light text-muted"
                value={cabangLabel}
                placeholder="Otomatis dari akun login"
                readOnly
              />
            </div>

            {/* Field: Domisili */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-geo-alt text-primary" />
                Domisili Cabang
              </label>
              {isDomisiliLocked ? (
                <input
                  type="text"
                  value={draft.Domisili}
                  placeholder="Otomatis dari Cabang"
                  className="form-control form-control-sm bg-light text-muted"
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

            {/* Field: No WhatsApp */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-whatsapp text-success" />
                No. WhatsApp <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={draft["No.WhatsApp"]}
                onChange={(event) => onChange("No.WhatsApp", event.target.value)}
                placeholder="Contoh: 08123456789"
                className="form-control form-control-sm"
              />
            </div>

            {/* Field: Username */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-person-badge text-muted" />
                Username Login
              </label>
              <input
                type="text"
                value={draft.Username}
                placeholder="Otomatis dari No. WhatsApp"
                className="form-control form-control-sm bg-light text-muted"
                readOnly
              />
            </div>

            {/* Field: Bidang Studi */}
            <div className="col-12">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-book text-primary" />
                Bidang Studi / Mata Pelajaran yang Diampu
              </label>
              <Select
                isMulti
                isSearchable
                options={bidangStudiOptions}
                value={selectedBidangStudi}
                placeholder="Pilih satu atau lebih mata pelajaran..."
                noOptionsMessage={() => "Data mata pelajaran tidak ditemukan"}
                onChange={(selected) => {
                  const nextValues = (selected || []).map((item) => item.value);
                  onBidangStudiChange(nextValues);
                }}
                styles={customSelectStyles}
              />
            </div>

            {/* Field: Email */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-envelope text-primary" />
                Email
              </label>
              <input
                type="text"
                value={draft.Email}
                onChange={(event) => onChange("Email", event.target.value)}
                placeholder="email@example.com"
                className="form-control form-control-sm"
              />
            </div>

            {/* Field: Password */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-key text-primary" />
                Password (Maks 6 Karakter)
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  value={draft.Password}
                  onChange={(event) => onChange("Password", event.target.value)}
                  placeholder="Password akun"
                  className="form-control border-end-0 font-monospace"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onGeneratePassword}
                  title="Generate Acak"
                >
                  <i className="bi bi-magic me-1" />
                  Acak
                </button>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 mt-3 mb-0 text-xs" role="alert">
              <i className="bi bi-exclamation-circle-fill text-danger fs-6 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
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
            disabled={loading || !draft.Nama.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle" />
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Pengajar"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { PengajarDraft };
