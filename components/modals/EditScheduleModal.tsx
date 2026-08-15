import Select from "react-select";
import React, { useEffect, useState } from "react";
import type { EditingSlot, SelectOption } from "../../types/app";

type EditScheduleModalProps = {
  editingSlot: EditingSlot | null;
  dateLabel: string;
  draft: {
    mapel: string;
    pengajar: string;
    waktuMulai: string;
    waktuSelesai: string;
  };
  mapelOptions: SelectOption[];
  pengajarOptions: SelectOption[];
  conflictError: string;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (field: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai", value: string) => void;
  onDelete: () => void;
  onSave: () => void;
  gabung?: boolean;
  gabungOptions?: SelectOption[];
  selectedGabung?: string;
  onToggleGabung?: (next: boolean) => void;
  onGabungChange?: (next: string) => void;
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

export function EditScheduleModal({
  editingSlot,
  dateLabel,
  draft,
  mapelOptions,
  pengajarOptions,
  conflictError,
  saving,
  onClose,
  onDraftChange,
  onDelete,
  onSave,
  gabung = false,
  gabungOptions = [],
  selectedGabung = "",
  onToggleGabung,
  onGabungChange,
}: EditScheduleModalProps) {
  if (!editingSlot) {
    return null;
  }

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  // Local checkbox component to ensure immediate UI feedback and stop propagation
  function GabungCheckbox({
    checked,
    onToggle,
  }: {
    checked: boolean;
    onToggle: (next: boolean) => void;
  }) {
    const [localChecked, setLocalChecked] = useState<boolean>(checked);

    useEffect(() => {
      setLocalChecked(checked);
    }, [checked]);

    return (
      <div className="form-check form-check-inline mt-2">
        <input
          className="form-check-input"
          type="checkbox"
          id="gabungCheck"
          checked={localChecked}
          onChange={(e) => {
            const next = e.target.checked;
            console.log("GabungCheckbox onChange", next);
            setLocalChecked(next);
            onToggle(next);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <label className="form-check-label small" htmlFor="gabungCheck">
          Gabung
        </label>
      </div>
    );
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
            <h5 className="mb-1">Edit Jadwal</h5>
            <div className="text-muted small">
              {editingSlot.cabang} • {editingSlot.kelas}
              {editingSlot.sekolah ? ` • ${editingSlot.sekolah}` : ""} • {dateLabel}
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Mata Pelajaran</label>
          <Select
            value={
              draft.mapel
                ? (mapelOptions.find((opt) => opt.value === draft.mapel) || {
                    value: draft.mapel,
                    label: draft.mapel,
                  })
                : null
            }
            onChange={(option) => onDraftChange("mapel", option?.value || "")}
            options={mapelOptions}
            placeholder="Pilih atau cari mapel..."
            isClearable
            isSearchable
            styles={compactSelectStyles}
          />
          <label className="form-label small fw-semibold mt-3">Pengajar</label>
          <Select
            value={
              draft.pengajar
                ? (pengajarOptions.find((opt) => opt.value === draft.pengajar) || {
                    value: draft.pengajar,
                    label: draft.pengajar,
                  })
                : null
            }
            onChange={(option) => onDraftChange("pengajar", option?.value || "")}
            options={pengajarOptions}
            placeholder="Pilih atau cari pengajar..."
            isClearable
            isSearchable
            styles={compactSelectStyles}
          />
          <GabungCheckbox
            checked={gabung}
            onToggle={(next) => onToggleGabung && onToggleGabung(next)}
          />
          <div className="d-flex align-items-center gap-2">
            <div className="small text-muted mt-1">debug: gabung prop = {String(gabung)}{selectedGabung ? `, selected = ${selectedGabung}` : ''}</div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleGabung && onToggleGabung(!gabung);
              }}
            >
              Toggle Gabung (debug)
            </button>
          </div>
          {gabung && (
            <div className="mt-2">
              <label className="form-label small fw-semibold">Pilih Kelas Gabung (sama cabang)</label>
              <Select
                value={
                  selectedGabung
                    ? gabungOptions.find((opt) => opt.value === selectedGabung) || { value: selectedGabung, label: selectedGabung }
                    : null
                }
                onChange={(opt) => onGabungChange && onGabungChange(opt?.value || "")}
                options={gabungOptions}
                placeholder="Pilih kelas dari cabang..."
                isClearable
                styles={compactSelectStyles}
              />
            </div>
          )}
          <div className="row g-2 mt-3">
            <div className="col-6">
              <label className="form-label small fw-semibold">Jam Mulai</label>
              <input
                type="time"
                value={draft.waktuMulai}
                onChange={(event) => onDraftChange("waktuMulai", event.target.value)}
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Jam Selesai</label>
              <input
                type="time"
                value={draft.waktuSelesai}
                onChange={(event) => onDraftChange("waktuSelesai", event.target.value)}
                className="form-control form-control-sm"
              />
            </div>
          </div>
          {conflictError && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {conflictError}
            </div>
          )}
        </div>
        <div className="mt-2">
          {editingSlot.tanggal === todayStr ? (
            <div className="text-muted small">Menghapus atau mengubah jadwal pada hari ini tidak diperbolehkan.</div>
          ) : null}
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={onDelete}
            disabled={editingSlot.tanggal === todayStr}
            title={editingSlot.tanggal === todayStr ? "Menghapus jadwal hari ini tidak diperbolehkan" : undefined}
          >
            {editingSlot.entryId ? "Hapus" : "Batal"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}