import Select from "react-select";
import type { SelectOption } from "../../types/app";

export type PenempatanDraft = {
  kodePengajar: string;
  namaPengajar: string;
  domisili: string;
  availabilityList: {
    hari: string;
    enabled: boolean;
    jamMulai: string;
    jamSelesai: string;
    cabangList: string[];
  }[];
};

type PenempatanPengajarModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  loading: boolean;
  error: string;
  draft: PenempatanDraft;
  pengajarOptions: SelectOption[];
  cabangOptions: string[];
  isDomisiliLocked: boolean;
  onClose: () => void;
  onDraftChange: (next: PenempatanDraft) => void;
  onSave: () => void;
  onSaveDay: (day: { hari: string; jamMulai: string; jamSelesai: string; cabangList: string[] }) => void;
};

const hariOptions = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const enabledDayCount = (draft: PenempatanDraft) =>
  draft.availabilityList.filter((item) => item.enabled).length;

export function PenempatanPengajarModal({
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
  onSaveDay,
}: PenempatanPengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const addNewDay = () => {
    const nextEntry = { hari: "", enabled: true, jamMulai: "", jamSelesai: "", cabangList: [] };
    onDraftChange({ ...draft, availabilityList: [...draft.availabilityList, nextEntry] });
  };

  const allDaysSelected = enabledDayCount(draft) === hariOptions.length;
  const selectedAvailabilities = draft.availabilityList.filter((item) => item.enabled);
  const isAllDayTime =
    selectedAvailabilities.length > 0 &&
    selectedAvailabilities.every((item) => item.jamMulai === "00:00" && item.jamSelesai === "23:59");

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="mb-1">{isEditing ? "Edit" : "Tambah"} Penempatan Pengajar</h5>
            <div className="text-muted small">Atur hari, jam, dan cabang yang bersedia Anda ajar.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-md-8">
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
                onDraftChange({
                  ...draft,
                  kodePengajar: selected,
                });
              }}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="absolute"
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label small fw-semibold">Domisili</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.domisili}
              readOnly={true}
            />
          </div>
          <div className="col-12">
            <label className="form-label small fw-semibold">Hari Tersedia</label>
            <div className="table-responsive border rounded">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 90 }}>Pilih</th>
                    <th>Hari</th>
                    <th style={{ width: 160 }}>Jam Mulai</th>
                    <th style={{ width: 160 }}>Jam Selesai</th>
                    <th style={{ minWidth: 260 }}>Bersedia Mengajar di Cabang</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.availabilityList.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, enabled: event.target.checked }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <Select
                          value={item.hari ? { label: item.hari, value: item.hari } : null}
                          options={hariOptions.map((h) => ({ label: h, value: h }))}
                          isDisabled={!item.enabled}
                          onChange={(opt) => {
                            const nextAvailability = draft.availabilityList.map((entry, i) =>
                              i === idx ? { ...entry, hari: (opt?.value as string) || entry.hari } : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                          menuPosition="absolute"
                          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          className="form-control form-control-sm"
                          value={item.jamMulai}
                          disabled={!item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, jamMulai: event.target.value }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          className="form-control form-control-sm"
                          value={item.jamSelesai}
                          disabled={!item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, jamSelesai: event.target.value }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-grow-1">
                            <Select
                              value={
                                item.cabangList.length > 0
                                  ? { label: item.cabangList[0], value: item.cabangList[0] }
                                  : null
                              }
                              options={cabangOptions.map((c) => ({ label: c, value: c }))}
                              isClearable
                              isSearchable
                              isDisabled={!item.enabled}
                              placeholder="Pilih cabang"
                              onChange={(selectedOption) => {
                                const nextCabangList = selectedOption ? [String(selectedOption.value)] : [];
                                const nextAvailability = draft.availabilityList.map((entry) =>
                                  entry.hari === item.hari
                                    ? { ...entry, cabangList: nextCabangList }
                                    : entry
                                );
                                onDraftChange({ ...draft, availabilityList: nextAvailability });
                              }}
                              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                              menuPosition="absolute"
                              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const nextAvailability = draft.availabilityList.filter(
                                (_, i) => i !== idx
                              );
                              onDraftChange({ ...draft, availabilityList: nextAvailability });
                            }}
                            disabled={!item.enabled}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2">
              <button type="button" className="btn btn-link p-0" onClick={addNewDay}>
                + Tambah Hari
              </button>
            </div>
            <div className="text-muted small mt-1">Gunakan format jam HH:MM, contoh 13:15.</div>
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
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}