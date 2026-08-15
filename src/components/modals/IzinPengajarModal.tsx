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

const compactSelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: "31px",
    height: "31px",
    fontSize: "0.875rem",
  }),
  valueContainer: (base: any) => ({
    ...base,
    height: "31px",
    padding: "0 8px",
  }),
  input: (base: any) => ({
    ...base,
    margin: "0",
    padding: "0",
  }),
  indicatorsContainer: (base: any) => ({
    ...base,
    height: "31px",
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
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 520 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="mb-1">{isEditing ? "Edit Izin Pengajar" : "Tambah Izin Pengajar"}</h5>
            <div className="text-muted small">Blokir tanggal pengajar yang sedang izin.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="mt-3">
          <label className="form-label small fw-semibold">Pengajar</label>
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
            placeholder="Pilih atau cari pengajar..."
            isClearable
            isSearchable
            styles={compactSelectStyles}
          />

          <div className="mt-3">
            <label className="form-label small fw-semibold">Domisili</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.domisili}
              onChange={(event) => onDraftChange({ ...draft, domisili: event.target.value })}
              readOnly={isDomisiliLocked}
            />
          </div>

          <div className="mt-3">
            <label className="form-label small fw-semibold">Cabang Target</label>
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
              placeholder="Pilih cabang target..."
              noOptionsMessage={() => "Data cabang tidak ditemukan"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="absolute"
              styles={{
                ...compactSelectStyles,
                menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
              }}
            />
          </div>

          <div className="row g-2 mt-1">
            <div className="col-6">
              <label className="form-label small fw-semibold">Tanggal Mulai</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={draft.tanggalMulai}
                onChange={(event) => onDraftChange({ ...draft, tanggalMulai: event.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Tanggal Selesai</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={draft.tanggalSelesai}
                onChange={(event) => onDraftChange({ ...draft, tanggalSelesai: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label small fw-semibold">Keterangan (opsional)</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={draft.keterangan}
              onChange={(event) => onDraftChange({ ...draft, keterangan: event.target.value })}
              placeholder="Contoh: Izin sakit / kegiatan keluarga"
            />
          </div>

          {error ? (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {error}
            </div>
          ) : null}
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