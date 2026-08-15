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

const dayOptions = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

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

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 680 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="mb-1">Permintaan Pengajar Antar Cabang</h5>
            <div className="text-muted small">Buat permintaan, lalu tunggu persetujuan cabang domisili.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-md-7">
            <label className="form-label small fw-semibold">Pengajar</label>
            <Select
              value={
                draft.kodePengajar
                  ? pengajarOptions.find((option) => option.value === draft.kodePengajar) || null
                  : null
              }
              options={pengajarOptions}
              isSearchable
              placeholder="Pilih pengajar"
              onChange={(option) => {
                const selected = option?.value || "";
                const selectedLabel = option?.label || "";
                const parts = selectedLabel.split(" - ");
                const nama = parts.slice(1).join(" - ") || "";
                const dariCabang = parts.length > 2 ? parts[parts.length - 1] : draft.dariCabang;
                onDraftChange({
                  ...draft,
                  kodePengajar: selected,
                  namaPengajar: nama,
                  dariCabang: dariCabang,
                });
              }}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="absolute"
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              noOptionsMessage={() => "Data pengajar tidak ditemukan"}
            />
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small fw-semibold">Cabang Peminta</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.cabangPeminta}
              readOnly={!isAdmin}
              onChange={(event) => onDraftChange({ ...draft, cabangPeminta: event.target.value })}
            />
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small fw-semibold">Dari Cabang</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.dariCabang}
              readOnly
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Tanggal Diminta</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.tanggalDiminta}
              onChange={(event) => onDraftChange({ ...draft, tanggalDiminta: event.target.value })}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Jam Mulai</label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={draft.jamMulai}
              onChange={(event) => onDraftChange({ ...draft, jamMulai: event.target.value })}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Jam Selesai</label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={draft.jamSelesai}
              onChange={(event) => onDraftChange({ ...draft, jamSelesai: event.target.value })}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Catatan</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.catatan}
              placeholder="Opsional"
              onChange={(event) => onDraftChange({ ...draft, catatan: event.target.value })}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Permintaan"}
          </button>
        </div>
      </div>
    </div>
  );
}