import React, { useState } from "react";
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
    minHeight: "40px",
    height: "auto",
    fontSize: "0.875rem",
    borderRadius: "10px",
    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.15)" : "none",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: "#cbd5e1",
    },
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({
    ...base,
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "0.875rem",
    backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#eff6ff" : "transparent",
    color: state.isSelected ? "white" : "#334155",
    "&:active": {
      backgroundColor: "#2563eb",
      color: "white"
    }
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    margin: "2px",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "#1e40af",
    fontWeight: "600",
    fontSize: "0.75rem",
    padding: "3px 6px",
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: "#1e40af",
    borderTopRightRadius: "6px",
    borderBottomRightRadius: "6px",
    "&:hover": {
      backgroundColor: "#bfdbfe",
      color: "#1e3a8a",
    },
  }),
};

// Simple avatar color generator
function getAvatarBgColor(name: string): string {
  const colors = [
    "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "linear-gradient(135deg, #10b981, #047857)",
    "linear-gradient(135deg, #f59e0b, #b45309)",
    "linear-gradient(135deg, #ec4899, #be185d)",
    "linear-gradient(135deg, #06b6d4, #0e7490)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "P";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "account">("profile");

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

  const handleCopyOnboarding = () => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://app.kbm.id";
    const text = `Halo Bapak/Ibu ${draft.Nama || "Pengajar"},\n\nBerikut adalah akun akses portal jadwal KBM Anda:\n• Kode Pengajar: ${draft["Kode Pengajar"] || "-"}\n• Cabang: ${draft.Domisili || cabangLabel || "-"}\n• Username: ${draft.Username || "-"}\n• Password: ${draft.Password || "-"}\n\nSilakan login melalui: ${appUrl}\n\nTerima kasih.`;
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const isFormValid =
    draft.Nama.trim().length > 0 &&
    draft["No.WhatsApp"].trim().length > 0 &&
    draft["Bidang Studi"].trim().length > 0 &&
    draft.Password.trim().length > 0;

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
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 1055,
      }}
    >
      <div
        className="modal-content-card bg-white rounded-4 shadow-2xl border-0 w-100 overflow-hidden"
        style={{
          maxWidth: 680,
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
              className="rounded-4 text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm fw-bold text-lg"
              style={{
                width: 52,
                height: 52,
                background: getAvatarBgColor(draft.Nama || "Pengajar"),
              }}
            >
              {getInitials(draft.Nama || "Pengajar")}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-0.5">
                <h5 className="fw-bold mb-0 text-dark">
                  {isEditing ? "Edit Data Pengajar" : "Pendaftaran Pengajar Baru"}
                </h5>
                <span
                  className={`badge rounded-pill text-xxs px-2.5 py-0.5 ${
                    isEditing ? "bg-amber-subtle text-amber-800 border border-amber-200" : "bg-primary-subtle text-primary border border-primary-subtle"
                  }`}
                >
                  {isEditing ? "Mode Edit" : "Baru"}
                </span>
              </div>
              <div className="text-muted text-xs d-flex align-items-center gap-2">
                <span>{draft.Nama.trim() || "Nama belum diisi"}</span>
                {draft["Kode Pengajar"] && (
                  <>
                    <span>•</span>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis font-monospace">
                      {draft["Kode Pengajar"]}
                    </span>
                  </>
                )}
              </div>
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

        {/* TAB NAVIGATION */}
        <div className="bg-white border-bottom px-3.5 px-sm-4 pt-2">
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`btn btn-sm pb-2.5 pt-2 px-3 border-0 rounded-0 border-bottom border-2 fw-semibold text-xs transition-all ${
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-dark"
              }`}
            >
              <i className="bi bi-person-lines-fill me-1.5" />
              Profil & Akademik
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`btn btn-sm pb-2.5 pt-2 px-3 border-0 rounded-0 border-bottom border-2 fw-semibold text-xs transition-all ${
                activeTab === "account"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-dark"
              }`}
            >
              <i className="bi bi-shield-lock me-1.5" />
              Kontak & Akses Login
            </button>
          </div>
        </div>

        {/* 2. MODAL BODY */}
        <div className="p-3.5 p-sm-4 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          {activeTab === "profile" ? (
            <div className="row g-3">
              {/* Field: Nama */}
              <div className="col-12 col-md-8">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-person-circle text-primary" />
                  Nama Lengkap & Gelar <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-person" />
                  </span>
                  <input
                    type="text"
                    value={draft.Nama}
                    onChange={(event) => onChange("Nama", event.target.value)}
                    placeholder="Contoh: Budi Santoso, M.Pd"
                    className="form-control border-start-0 fw-semibold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Field: Kode Pengajar */}
              <div className="col-12 col-md-4">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-upc text-muted" />
                  Kode Pengajar
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    value={draft["Kode Pengajar"]}
                    placeholder="Otomatis"
                    className="form-control bg-light text-dark fw-bold font-monospace text-uppercase"
                    readOnly
                  />
                  {draft["Kode Pengajar"] && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigator.clipboard.writeText(draft["Kode Pengajar"])}
                      title="Salin Kode"
                    >
                      <i className="bi bi-clipboard" />
                    </button>
                  )}
                </div>
                <div className="text-muted text-xxs mt-1">Otomatis dihasilkan dari nama pengajar</div>
              </div>

              {/* Field: Cabang & Domisili */}
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-geo-alt-fill text-danger" />
                  Domisili Cabang <span className="text-danger">*</span>
                </label>
                {isDomisiliLocked ? (
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0">
                      <i className="bi bi-building" />
                    </span>
                    <input
                      type="text"
                      value={draft.Domisili || cabangLabel}
                      className="form-control border-start-0 bg-light text-dark fw-semibold"
                      readOnly
                    />
                  </div>
                ) : (
                  <select
                    className="form-select fw-semibold"
                    value={draft.Domisili}
                    onChange={(event) => onChange("Domisili", event.target.value)}
                  >
                    <option value="">-- Pilih Cabang Domisili --</option>
                    {domisiliOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field: Cabang Akun */}
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-shield-check text-success" />
                  Cabang Akun Login
                </label>
                <input
                  type="text"
                  className="form-control bg-light text-muted"
                  value={cabangLabel || "Pusat / Semua Cabang"}
                  readOnly
                />
              </div>

              {/* Field: Bidang Studi */}
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-1.5">
                  <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                    <i className="bi bi-book-half text-primary" />
                    Bidang Studi / Mata Pelajaran yang Diampu <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted text-xxs">Bisa pilih lebih dari satu</span>
                </div>
                <Select
                  isMulti
                  isSearchable
                  options={bidangStudiOptions}
                  value={selectedBidangStudi}
                  placeholder="Pilih mata pelajaran yang dikuasai..."
                  noOptionsMessage={() => "Data mata pelajaran tidak ditemukan"}
                  onChange={(selected) => {
                    const nextValues = (selected || []).map((item) => item.value);
                    onBidangStudiChange(nextValues);
                  }}
                  styles={customSelectStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                />
                <div className="text-muted text-xxs mt-1">
                  Mata pelajaran ini menentukan pengajar yang muncul pada opsi jadwal dan surat tugas.
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {/* Field: No WhatsApp */}
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-whatsapp text-success" />
                  No. WhatsApp <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-telephone" />
                  </span>
                  <input
                    type="text"
                    value={draft["No.WhatsApp"]}
                    onChange={(event) => onChange("No.WhatsApp", event.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="form-control border-start-0 fw-semibold font-monospace"
                  />
                </div>
                <div className="text-muted text-xxs mt-1">Nomor ini otomatis digunakan sebagai Username login.</div>
              </div>

              {/* Field: Email */}
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-envelope text-primary" />
                  Email Pengajar
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-at" />
                  </span>
                  <input
                    type="email"
                    value={draft.Email}
                    onChange={(event) => onChange("Email", event.target.value)}
                    placeholder="nama@gmail.com"
                    className="form-control border-start-0"
                  />
                </div>
              </div>

              {/* Field: Username */}
              <div className="col-12 col-md-6">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-person-badge text-primary" />
                  Username Login
                </label>
                <input
                  type="text"
                  value={draft.Username}
                  placeholder="Otomatis dari No. WhatsApp"
                  className="form-control bg-light text-dark font-monospace fw-semibold"
                  readOnly
                />
              </div>

              {/* Field: Password */}
              <div className="col-12 col-md-6">
                <div className="d-flex justify-content-between align-items-center mb-1.5">
                  <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                    <i className="bi bi-key-fill text-amber-500" />
                    Password Login <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted text-xxs">Maks. 6 Karakter</span>
                </div>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={draft.Password}
                    onChange={(event) => onChange("Password", event.target.value)}
                    placeholder="6 Karakter"
                    className="form-control border-end-0 font-monospace fw-bold"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0 border-end"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    onClick={onGeneratePassword}
                    title="Generate Password Acak"
                  >
                    <i className="bi bi-magic me-1" />
                    Acak
                  </button>
                </div>
              </div>

              {/* Onboarding Credentials Card */}
              <div className="col-12">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted text-xxs fw-bold text-uppercase d-flex align-items-center gap-1.5">
                      <i className="bi bi-send-check-fill text-success" />
                      Pratinjau Kredensial Onboarding
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOnboarding}
                      disabled={!draft.Username || !draft.Password}
                      className="btn btn-outline-success btn-xs d-flex align-items-center gap-1"
                    >
                      <i className={`bi ${copiedMessage ? "bi-check-lg" : "bi-whatsapp"}`} />
                      {copiedMessage ? "Tersalin!" : "Salin Pesan WA"}
                    </button>
                  </div>
                  <div className="bg-white p-2.5 rounded-2 border text-xs font-monospace text-secondary">
                    <div>Halo <strong>{draft.Nama || "[Nama Pengajar]"}</strong>,</div>
                    <div className="mt-1">
                      Akun KBM: User <strong>{draft.Username || "[No.WA]"}</strong> | Pass <strong>{draft.Password || "******"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 mt-3 mb-0 text-xs shadow-xs" role="alert">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-6 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* 3. MODAL FOOTER */}
        <div className="p-3 p-sm-3.5 bg-light border-top d-flex justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            {activeTab === "profile" ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm px-3 rounded-3"
                onClick={() => setActiveTab("account")}
              >
                Lanjut ke Kontak & Login <i className="bi bi-arrow-right ms-1" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3 rounded-3"
                onClick={() => setActiveTab("profile")}
              >
                <i className="bi bi-arrow-left me-1" /> Kembali ke Profil
              </button>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
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
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle fs-6" />
                  <span>{isEditing ? "Perbarui Pengajar" : "Simpan Pengajar"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PengajarDraft };
