import Select from "react-select";
import type { SelectOption } from "../../types/app";

export type PermintaanDraft = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  dariCabang: string;
  tanggalDiminta: string;
  jamMulai: string;
  jamSelesai: string;
  catatan: string;
};

type PermintaanPengajarModalProps = {
  isOpen: boolean;
  loading: boolean;
  error: string;
  isAdmin: boolean;
  draft: PermintaanDraft;
  pengajarOptions: SelectOption[];
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (next: PermintaanDraft) => void;
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
};

export function PermintaanPengajarModal({
  isOpen,
  loading,
  error,
  isAdmin,
  draft,
  pengajarOptions,
  onClose,
  onSave,
  onDraftChange,
}: PermintaanPengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const selectedPengajar = draft.kodePengajar
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
        style={{ maxWidth: 640, maxHeight: "90vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-bottom bg-light d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-white shadow-sm d-flex justify-content-center align-items-center text-primary"
              style={{ width: 48, height: 48 }}
            >
              <i className="bi bi-people-fill fs-4" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">Permintaan Pengajar Antar Cabang</h5>
              <div className="text-muted text-xs mt-1">Buat permintaan peminjaman guru untuk jadwal mengajar</div>
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
             {/* Target Pengajar */}
             <div className="col-12">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-person-bounding-box text-primary" />
                  Pengajar yang Diminta
                </label>
                <Select
                  value={selectedPengajar}
                  onChange={(option) => {
                    const label = option?.label || "";
                    const separatorIndex = label.indexOf("-");
                    const nama = separatorIndex >= 0 ? label.slice(separatorIndex + 1).trim() : "";
                    const domisili = option?.domisili || "";

                    onDraftChange({
                      ...draft,
                      kodePengajar: option?.value || "",
                      namaPengajar: nama,
                      dariCabang: domisili, 
                    });
                  }}
                  options={pengajarOptions}
                  placeholder="Ketik untuk mencari guru..."
                  isClearable
                  isSearchable
                  styles={customSelectStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  menuPosition="fixed"
                  formatOptionLabel={(opt) => (
                    <div>
                      <div className="fw-semibold text-dark">{opt.label}</div>
                      {opt.domisili && (
                        <div className="text-xxs text-muted d-flex align-items-center gap-1 mt-0.5">
                          <i className="bi bi-house-door" /> {opt.domisili}
                        </div>
                      )}
                    </div>
                  )}
                />
             </div>

             {/* Info Cabang Asal & Peminta */}
             <div className="col-12">
               <div className="p-3 bg-light rounded-3 border">
                  <div className="row g-3">
                     <div className="col-6">
                        <label className="form-label text-xxs text-muted fw-semibold text-uppercase mb-1">Cabang Asal (Pemilik)</label>
                        <input
                           type="text"
                           className="form-control form-control-sm bg-white"
                           value={draft.dariCabang}
                           readOnly
                           disabled
                           placeholder="Otomatis terisi..."
                         />
                     </div>
                     <div className="col-6">
                        <label className="form-label text-xxs text-muted fw-semibold text-uppercase mb-1">Cabang Peminta (Anda)</label>
                        <input
                           type="text"
                           className="form-control form-control-sm bg-white"
                           value={draft.cabangPeminta}
                           onChange={(event) => onDraftChange({ ...draft, cabangPeminta: event.target.value })}
                           readOnly={!isAdmin}
                           placeholder="Otomatis terisi..."
                         />
                     </div>
                  </div>
               </div>
             </div>

             <div className="col-md-12">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-event text-primary" />
                  Tanggal & Hari Diminta
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={draft.tanggalDiminta}
                  onChange={(event) => onDraftChange({ ...draft, tanggalDiminta: event.target.value })}
                />
                <div className="text-muted text-xxs mt-1">Sistem akan secara otomatis membaca hari dari tanggal yang dipilih.</div>
             </div>

             <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-primary" />
                  Jam Mulai
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={draft.jamMulai}
                  onChange={(event) => onDraftChange({ ...draft, jamMulai: event.target.value })}
                />
             </div>

             <div className="col-md-6">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-primary" />
                  Jam Selesai
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={draft.jamSelesai}
                  onChange={(event) => onDraftChange({ ...draft, jamSelesai: event.target.value })}
                />
             </div>

             <div className="col-12">
                <label className="form-label small fw-semibold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-chat-text text-primary" />
                  Catatan / Keterangan Keperluan
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={draft.catatan}
                  onChange={(event) => onDraftChange({ ...draft, catatan: event.target.value })}
                  placeholder="Tuliskan tujuan peminjaman guru, cth: Menggantikan pengajar yang sakit di cabang..."
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
                <span role="status">Memproses...</span>
              </>
            ) : (
              <>
                <i className="bi bi-send-check" />
                Ajukan Permintaan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
