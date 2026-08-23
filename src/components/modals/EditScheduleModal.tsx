import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
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
  copyDateOptions: SelectOption[];
  selectedCopyDates: string[];
  pengajarAvailabilityWarning: string;
  pengajarAvailableDateLabels: string[];
  conflictError: string;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (field: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai", value: string) => void;
  onCopyDatesChange: (values: string[]) => void;
  onDelete: () => void;
  onSave: () => void;
  gabung?: boolean;
  gabungOptions?: SelectOption[];
  selectedGabung?: string[];
  onToggleGabung?: (next: boolean) => void;
  onGabungChange?: (next: string[]) => void;
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
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: "8px",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
    border: "1px solid #e2e8f0",
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "0.85rem",
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff",
    color: state.isSelected ? "#fff" : state.isFocused ? "#1e40af" : "#1e293b",
    cursor: "pointer",
    padding: "8px 12px",
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
  multiValueRemove: (base: any) => ({
    ...base,
    color: "#1d4ed8",
    "&:hover": {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
  }),
};

export function EditScheduleModal({
  editingSlot,
  dateLabel,
  draft,
  mapelOptions,
  pengajarOptions,
  copyDateOptions,
  selectedCopyDates,
  pengajarAvailabilityWarning,
  pengajarAvailableDateLabels,
  conflictError,
  saving,
  onClose,
  onDraftChange,
  onCopyDatesChange,
  onDelete,
  onSave,
  gabung = false,
  gabungOptions = [],
  selectedGabung = [],
  onToggleGabung,
  onGabungChange,
}: EditScheduleModalProps) {
  if (!editingSlot) {
    return null;
  }

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const isToday = editingSlot.tanggal === todayStr;

  // Calculate session duration
  const durationText = useMemo(() => {
    if (!draft.waktuMulai || !draft.waktuSelesai) return null;
    const [startH, startM] = draft.waktuMulai.split(":").map(Number);
    const [endH, endM] = draft.waktuSelesai.split(":").map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const diff = endTotal - startTotal;

    if (diff <= 0) return "Waktu tidak valid (selesai ≤ mulai)";
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} jam ${minutes} menit (${diff} m)`;
    } else if (hours > 0) {
      return `${hours} jam (${diff} m)`;
    } else {
      return `${minutes} menit`;
    }
  }, [draft.waktuMulai, draft.waktuSelesai]);

  // Quick duration presets
  const handleQuickDuration = (minutes: number) => {
    if (!draft.waktuMulai) return;
    const [startH, startM] = draft.waktuMulai.split(":").map(Number);
    if (isNaN(startH) || isNaN(startM)) return;
    const endTotal = startH * 60 + startM + minutes;
    const endH = Math.floor(endTotal / 60) % 24;
    const endM = endTotal % 60;
    const formattedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    onDraftChange("waktuSelesai", formattedEnd);
  };

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
          maxWidth: 520,
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
              <i className={`bi ${editingSlot.entryId ? "bi-pencil-square" : "bi-calendar-plus"} fs-4`} />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">
                {editingSlot.entryId ? "Edit Sesi Jadwal" : "Tambah Sesi Jadwal"}
              </h5>
              <div className="d-flex flex-wrap align-items-center gap-1.5 text-xxs">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5">
                  <i className="bi bi-geo-alt me-1" />
                  {editingSlot.cabang}
                </span>
                {editingSlot.jenjang && (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5">
                    {editingSlot.jenjang}
                  </span>
                )}
                <span className="badge bg-light text-dark border rounded-pill px-2 py-0.5">
                  <i className="bi bi-mortarboard me-1" />
                  {editingSlot.kelas}
                </span>
                {editingSlot.classOrder !== undefined && editingSlot.classOrder !== "" && editingSlot.classOrder !== null && (
                  <span
                    className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-1.5 py-0.5 font-monospace"
                    title={`Urutan Kelas: ${editingSlot.classOrder}`}
                  >
                    <i className="bi bi-sort-numeric-down me-1" />
                    #{editingSlot.classOrder}
                  </span>
                )}
                {editingSlot.sekolah && (
                  <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5">
                    <i className="bi bi-building me-1" />
                    {editingSlot.sekolah}
                  </span>
                )}
                <span className="badge bg-secondary-subtle text-secondary border rounded-pill px-2 py-0.5">
                  <i className="bi bi-calendar3 me-1" />
                  {dateLabel}
                </span>
              </div>
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
          {isToday && (
            <div className="alert alert-warning border-warning-subtle d-flex align-items-center gap-2 p-2.5 mb-3 rounded-3 text-xs" role="alert">
              <i className="bi bi-lock-fill fs-5 text-warning flex-shrink-0" />
              <div>
                <strong>Jadwal Hari Ini Terkunci:</strong> Perubahan atau penghapusan jadwal pada hari berjalan tidak diperbolehkan demi kelancaran operasional KBM.
              </div>
            </div>
          )}

          <div className="d-flex flex-column gap-3">
            {/* Field 1: Mata Pelajaran */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-book text-primary" />
                  Mata Pelajaran <span className="text-danger">*</span>
                </label>
                {/* Gabung Toggle Switch */}
                <div className="form-check form-switch mb-0 d-flex align-items-center gap-1.5">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="gabungSwitch"
                    checked={gabung}
                    disabled={isToday}
                    onChange={(e) => onToggleGabung && onToggleGabung(e.target.checked)}
                    style={{ cursor: isToday ? "not-allowed" : "pointer" }}
                  />
                  <label
                    className="form-check-label text-xxs fw-semibold text-secondary"
                    htmlFor="gabungSwitch"
                    style={{ cursor: isToday ? "not-allowed" : "pointer" }}
                  >
                    Gabung Kelas
                  </label>
                </div>
              </div>

              <Select
                value={
                  draft.mapel
                    ? mapelOptions.find((opt) => opt.value === draft.mapel) || {
                        value: draft.mapel,
                        label: draft.mapel,
                      }
                    : null
                }
                onChange={(option) => onDraftChange("mapel", option?.value || "")}
                options={mapelOptions}
                placeholder="Pilih atau ketik mata pelajaran..."
                isClearable
                isSearchable
                isDisabled={isToday}
                styles={customSelectStyles}
              />
            </div>

            {/* Sub-Field: Pilih Kelas Gabung (Jika aktif) */}
            {gabung && (
              <div className="p-3 bg-light rounded-3 border">
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-link-45deg text-primary" />
                  Pilih Kelas Gabung ({editingSlot.cabang})
                </label>
                <Select
                  value={gabungOptions.filter((opt) => selectedGabung.includes(opt.value))}
                  onChange={(opt) => {
                    const values = Array.isArray(opt) ? opt.map((item) => item.value) : [];
                    onGabungChange && onGabungChange(values);
                  }}
                  options={gabungOptions}
                  placeholder="Pilih kelas dari cabang yang sama..."
                  isClearable
                  isMulti
                  isDisabled={isToday}
                  styles={customSelectStyles}
                />
                <div className="text-muted text-xxs mt-1">
                  Sesi ini akan otomatis direfleksikan ke kelas-kelas yang digabung.
                </div>
              </div>
            )}

            {/* Field 2: Pengajar */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-person-badge text-primary" />
                Pengajar (Guru) <span className="text-danger">*</span>
              </label>
              <Select
                value={
                  draft.pengajar
                    ? pengajarOptions.find((opt) => opt.value === draft.pengajar) || {
                        value: draft.pengajar,
                        label: draft.pengajar,
                      }
                    : null
                }
                onChange={(option) => onDraftChange("pengajar", option?.value || "")}
                options={pengajarOptions}
                placeholder={draft.mapel ? "Pilih pengajar yang tersedia..." : "Pilih mata pelajaran terlebih dahulu"}
                isClearable
                isSearchable
                isDisabled={!draft.mapel || isToday}
                noOptionsMessage={() =>
                  draft.mapel
                    ? "Tidak ada pengajar untuk mapel ini"
                    : "Pilih mata pelajaran terlebih dahulu"
                }
                styles={customSelectStyles}
              />

              {draft.pengajar && pengajarAvailableDateLabels.length > 0 && (
                <div className="mt-1.5 d-flex align-items-center gap-1 text-xxs text-muted">
                  <i className="bi bi-info-circle text-info" />
                  <span>Pengajar tersedia pada: <strong>{pengajarAvailableDateLabels.join(", ")}</strong></span>
                </div>
              )}
            </div>

            {/* Field 3: Waktu Sesi (Jam Mulai & Jam Selesai) */}
            <div className="p-3 bg-light rounded-3 border">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-clock-history text-primary" />
                  Waktu Pelaksanaan Sesi
                </label>
                {durationText && (
                  <span className="badge bg-white text-primary border rounded-pill px-2 py-1 text-xxs fw-bold">
                    ⏱️ {durationText}
                  </span>
                )}
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label text-xxs text-muted mb-1">Jam Mulai</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-clock text-muted" />
                    </span>
                    <input
                      type="time"
                      value={draft.waktuMulai}
                      onChange={(event) => onDraftChange("waktuMulai", event.target.value)}
                      className="form-control border-start-0 fw-semibold"
                      disabled={isToday}
                    />
                  </div>
                </div>

                <div className="col-6">
                  <label className="form-label text-xxs text-muted mb-1">Jam Selesai</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-clock-fill text-muted" />
                    </span>
                    <input
                      type="time"
                      value={draft.waktuSelesai}
                      onChange={(event) => onDraftChange("waktuSelesai", event.target.value)}
                      className="form-control border-start-0 fw-semibold"
                      disabled={isToday}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              {!isToday && draft.waktuMulai && (
                <div className="d-flex align-items-center gap-1.5 mt-2 pt-2 border-top">
                  <span className="text-xxs text-muted">Preset Durasi:</span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-secondary bg-white py-0.5 px-2 rounded text-xxs"
                    onClick={() => handleQuickDuration(60)}
                  >
                    +60 Menit
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-secondary bg-white py-0.5 px-2 rounded text-xxs"
                    onClick={() => handleQuickDuration(90)}
                  >
                    +90 Menit
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-secondary bg-white py-0.5 px-2 rounded text-xxs"
                    onClick={() => handleQuickDuration(120)}
                  >
                    +120 Menit
                  </button>
                </div>
              )}
            </div>

            {/* Field 4: Salin ke Tanggal Lain */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-copy text-primary" />
                Salin ke Tanggal Lain <span className="text-muted text-xxs fw-normal">(Opsional)</span>
              </label>
              <Select
                value={copyDateOptions.filter((option) => selectedCopyDates.includes(option.value))}
                onChange={(options) =>
                  onCopyDatesChange((options || []).map((option) => option.value))
                }
                options={copyDateOptions}
                placeholder="Pilih satu atau beberapa tanggal..."
                isMulti
                isSearchable
                isDisabled={isToday}
                closeMenuOnSelect={false}
                styles={customSelectStyles}
              />
              <div className="text-muted text-xxs mt-1">
                Jadwal yang Anda simpan akan langsung direplikasi ke tanggal-tanggal terpilih di atas.
              </div>
            </div>

            {/* Warnings & Error Alerts */}
            {pengajarAvailabilityWarning && (
              <div className="alert alert-warning d-flex align-items-start gap-2 p-2.5 rounded-3 mb-0 text-xs" role="alert">
                <i className="bi bi-exclamation-triangle-fill text-warning fs-6 flex-shrink-0 mt-0.5" />
                <div>{pengajarAvailabilityWarning}</div>
              </div>
            )}

            {conflictError && (
              <div className="alert alert-danger d-flex align-items-start gap-2 p-2.5 rounded-3 mb-0 text-xs" role="alert">
                <i className="bi bi-x-circle-fill text-danger fs-6 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Bentrok:</strong> {conflictError}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="modal-footer-modern bg-light p-3 border-top d-flex justify-content-between align-items-center gap-2">
          {editingSlot.entryId ? (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 d-flex align-items-center gap-1.5 rounded-2"
              onClick={onDelete}
              disabled={isToday || saving}
              title={isToday ? "Menghapus jadwal hari ini tidak diperbolehkan" : "Hapus sesi jadwal ini"}
            >
              <i className="bi bi-trash3" />
              <span>Hapus Sesi</span>
            </button>
          ) : (
            <div />
          )}

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 rounded-2"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1.5 rounded-2"
              onClick={onSave}
              disabled={saving || isToday || !draft.mapel}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle" />
                  <span>{editingSlot.entryId ? "Simpan Perubahan" : "Simpan Sesi"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
