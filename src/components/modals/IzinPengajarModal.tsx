import Select from "react-select";
import type { SelectOption } from "../../types/app";

export type IzinPengajarDraft = {
  kodePengajar: string;
  namaPengajar: string;
  domisili: string;
  cabangTarget: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string;
};

type IzinPengajarModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  loading: boolean;
  error: string;
  draft: IzinPengajarDraft;
  pengajarOptions: SelectOption[];
  cabangOptions: string[];
  isDomisiliLocked: boolean;
  onClose: () => void;
  onDraftChange: (next: IzinPengajarDraft) => void;
  onSave: () => void;
};

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "8px",
    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
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
    color: "#1e3a8a",
    borderTopRightRadius: "6px",
    borderBottomRightRadius: "6px",
    "&:hover": {
      backgroundColor: "#bfdbfe",
      color: "#1e3a8a",
    },
  }),
};

export function IzinPengajarModal({
  isOpen,
  isEditing,
  loading,
  error,
  draft,
  pengajarOptions,
  cabangOptions,
  isDomisiliLocked,
  onClose,
  onDraftChange,
  onSave,
}: IzinPengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const selectedPengajar =
    draft.kodePengajar
      ? pengajarOptions.find((option) => option.value === draft.kodePengajar) || {
          value: draft.kodePengajar,
          label: `${draft.kodePengajar} - ${draft.namaPengajar}`,
        }
      : null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3 z-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-lg w-100 overflow-hidden d-flex flex-column transition-all"
        style={{ maxWidth: 540, maxHeight: "90vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-bottom bg-light d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-white shadow-sm d-flex justify-content-center align-items-center text-primary"
              style={{ width: 48, height: 48 }}
            >
              <i className="bi bi-file-earmark-medical fs-4" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">{isEditing ? "Edit Izin Pengajar" : "Pengajuan Izin Pengajar"}</h5>
              <div className="text-muted text-xs mt-1">Blokir tanggal untuk pengajar yang berhalangan hadir</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-close shadow-none"
            onClick={onClose}
            aria-label="Tutup"
          />
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          {error ? (
            <div className="alert alert-danger py-2 d-flex align-items-center gap-2 text-sm border-0 shadow-sm rounded-3 mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill" />
              <div>{error}</div>
            </div>
          ) : null}

          <div className="row g-4">
             <div className="col-12">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-person-badge text-primary" />
                  Pilih Pengajar
                </label>
                <Select
                  value={selectedPengajar}
                  onChange={(option) => {
                    const label = option?.label || "";
                    const separatorIndex = label.indexOf("-");
                    const namaPengajar = separatorIndex >= 0 ? label.slice(separatorIndex + 1).trim() : "";
                    onDraftChange({
                      ...draft,
                      kodePengajar: option?.value || "",
                      namaPengajar,
                    });
                  }}
                  options={pengajarOptions}
                  placeholder="Cari nama atau kode pengajar..."
                  isClearable
                  isSearchable
                  styles={customSelectStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                  isDisabled={isEditing}
                />
             </div>

             <div className="col-12">
               <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-geo-alt text-primary" />
                  Asal Cabang (Domisili)
               </label>
               <input
                  type="text"
                  className="form-control"
                  value={draft.domisili}
                  onChange={(event) => onDraftChange({ ...draft, domisili: event.target.value })}
                  readOnly={isDomisiliLocked}
                  placeholder="Masukkan cabang asal..."
                />
             </div>

             <div className="col-12">
               <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-building-check text-primary" />
                  Berlaku Untuk Cabang Target
               </label>
               <Select
                  isMulti
                  isSearchable
                  classNamePrefix="react-select"
                  options={cabangOptions.map((cabang) => ({ label: cabang, value: cabang }))}
                  value={draft.cabangTarget
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((value) => ({ label: value, value }))}
                  onChange={(selected) => {
                    const values = Array.isArray(selected)
                      ? selected.map((item) => String(item.value).trim()).filter(Boolean)
                      : [];
                    onDraftChange({ ...draft, cabangTarget: values.join(", ") });
                  }}
                  placeholder="Pilih cabang target (kosongkan = semua cabang)..."
                  noOptionsMessage={() => "Data cabang tidak ditemukan"}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                  styles={customSelectStyles}
                />
             </div>

             <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-event text-primary" />
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={draft.tanggalMulai}
                  onChange={(event) => onDraftChange({ ...draft, tanggalMulai: event.target.value })}
                />
             </div>

             <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-event text-primary" />
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={draft.tanggalSelesai}
                  onChange={(event) => onDraftChange({ ...draft, tanggalSelesai: event.target.value })}
                />
             </div>

             <div className="col-12">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-chat-text text-primary" />
                  Keterangan / Alasan
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={draft.keterangan}
                  onChange={(event) => onDraftChange({ ...draft, keterangan: event.target.value })}
                  placeholder="Misal: Izin sakit, cuti menikah, keperluan keluarga, dll..."
                />
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-top bg-light d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-light fw-medium px-4" onClick={onClose}>
            Batal
          </button>
          <button 
            type="button" 
            className="btn btn-primary fw-medium px-4 d-flex align-items-center gap-2 shadow-sm" 
            onClick={onSave} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                <span role="status">Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="bi bi-send-check" />
                {isEditing ? "Simpan Perubahan" : "Ajukan Izin"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
