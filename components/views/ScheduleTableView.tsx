import { useState } from "react";
import { formatScheduleLabelWithDay, formatScheduleLabel } from "../../utils/schedule";
import { getTagStyle } from "../../utils/tagColor";
import type { EditingSlot, RecordItem, ScheduleDayGroup, ScheduleGroup, ScheduleSlotDate } from "../../types/app";

type ScheduleTableViewProps = {
  isJadwalTambahanMenu: boolean;
  readOnly: boolean;
  activeScheduleDates: ScheduleSlotDate[];
  activeDayGroups: ScheduleDayGroup[];
  activeDayStartIndexes: Set<number>;
  monthScheduleGroups: ScheduleGroup[];
  conflictEntryIds: Set<string>;
  editingSlot: EditingSlot | null;
  saving: boolean;
  onInlineSaveClass: (group: ScheduleGroup, kelas: string, sekolah: string) => Promise<boolean>;
  onDeleteClass: (group: ScheduleGroup) => void;
  onMoveClass: (group: ScheduleGroup, direction: -1 | 1) => void;
  onSelectSlot: (group: ScheduleGroup, slot: ScheduleSlotDate, item?: RecordItem) => void;
  onOpenClassModal: () => void;
};

export function ScheduleTableView({
  isJadwalTambahanMenu,
  readOnly,
  activeScheduleDates,
  activeDayGroups,
  activeDayStartIndexes,
  monthScheduleGroups,
  conflictEntryIds,
  editingSlot,
  saving,
  onInlineSaveClass,
  onDeleteClass,
  onMoveClass,
  onSelectSlot,
  onOpenClassModal,
}: ScheduleTableViewProps) {
  const [editingClassKey, setEditingClassKey] = useState<string | null>(null);
  const [kelasDraft, setKelasDraft] = useState("");
  const [sekolahDraft, setSekolahDraft] = useState("");
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const startClassEdit = (group: ScheduleGroup) => {
    const key = `${group.cabang}||${group.kelas}||${group.sekolah || ""}`;
    setEditingClassKey(key);
    setKelasDraft(group.kelas || "");
    setSekolahDraft(group.sekolah || "");
  };

  const cancelClassEdit = () => {
    setEditingClassKey(null);
    setKelasDraft("");
    setSekolahDraft("");
  };

  const submitClassEdit = async (group: ScheduleGroup) => {
    const success = await onInlineSaveClass(group, kelasDraft, sekolahDraft);
    if (success) {
      cancelClassEdit();
    }
  };

  const hasVisibleConflict = monthScheduleGroups.some((group) =>
    Object.values(group.entriesByDate).some((entryList) =>
      entryList.some((entry) => conflictEntryIds.has(entry.id))
    )
  );

  return (
    <>
      <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
        <table className="table table-bordered align-middle schedule-table mb-0 table-sticky">
          <thead className="table-light">
            {isJadwalTambahanMenu ? (
              <tr>
                <th className="text-center col-aksi sticky-col-aksi">Aksi</th>
                <th className="text-center col-kelas sticky-col-kelas">Kelas</th>
                {activeScheduleDates.map((slot, index) => {
                  const [year, month, day] = slot.date.split("-").map(Number);
                  const slotDate = new Date(year, month - 1, day);
                  const weekday = slotDate.toLocaleDateString("id-ID", { weekday: "long" });
                  const dateLabel = formatScheduleLabel(slotDate);
                  return (
                    <th key={slot.date} className="text-center schedule-header-cell">
                      <div className="schedule-header-weekday text-nowrap">{weekday}</div>
                      <div className="schedule-header-date text-nowrap">{dateLabel}</div>
                    </th>
                  );
                })}
              </tr>
            ) : (
              <tr>
                <th className="text-center col-aksi sticky-col-aksi">Aksi</th>
                <th className="text-center col-kelas sticky-col-kelas">Kelas</th>
                {activeScheduleDates.map((slot, index) => {
                  const [year, month, day] = slot.date.split("-").map(Number);
                  const slotDate = new Date(year, month - 1, day);
                  const weekday = slotDate.toLocaleDateString("id-ID", { weekday: "long" });
                  const dateLabel = formatScheduleLabel(slotDate);
                  return (
                    <th
                      key={slot.date}
                      className={`${activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""} text-center schedule-header-cell`}
                    >
                      <div className="schedule-header-weekday text-nowrap">{weekday}</div>
                      <div className="schedule-header-date text-nowrap">{dateLabel}</div>
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {monthScheduleGroups.length === 0 ? (
              <tr>
                <td colSpan={activeScheduleDates.length + 2} className="text-center text-muted py-4">
                  {isJadwalTambahanMenu
                    ? "Belum ada jadwal tambahan dan pelayanan 30 hari ke depan."
                    : "Belum ada jadwal bulan ini."}
                </td>
              </tr>
            ) : (
              monthScheduleGroups.map((group, groupIndex) => (
                <tr key={`${group.cabang}-${group.kelas}-${group.sekolah || ""}`}>
                  <td className="text-center col-aksi sticky-col-aksi">
                    {readOnly ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <div className="d-flex flex-column align-items-center justify-content-center" style={{ gap: "0.25rem" }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveClass(group, -1);
                          }}
                          className="btn btn-sm btn-icon"
                          style={{
                            width: "28px",
                            height: "28px",
                            padding: "0",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#fff",
                            color: "#64748b",
                            borderRadius: "5px"
                          }}
                          aria-label="Geser kelas ke atas"
                          disabled={saving || groupIndex === 0}
                        >
                          <i className="bi bi-chevron-up" style={{ fontSize: "14px" }} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveClass(group, 1);
                          }}
                          className="btn btn-sm btn-icon"
                          style={{
                            width: "28px",
                            height: "28px",
                            padding: "0",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#fff",
                            color: "#64748b",
                            borderRadius: "5px"
                          }}
                          aria-label="Geser kelas ke bawah"
                          disabled={
                            saving || groupIndex === monthScheduleGroups.length - 1
                          }
                        >
                          <i className="bi bi-chevron-down" style={{ fontSize: "14px" }} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteClass(group);
                          }}
                          className="btn btn-sm btn-icon"
                          style={{
                            width: "28px",
                            height: "28px",
                            padding: "0",
                            border: "1px solid #fca5a5",
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            borderRadius: "5px"
                          }}
                          aria-label="Hapus kelas"
                          disabled={(group.entriesByDate?.[todayStr] ?? []).length > 0 || saving}
                          title={(group.entriesByDate?.[todayStr] ?? []).length > 0 || saving ? "Tidak dapat menghapus kelas pada hari ini" : undefined}
                        >
                          <i className="bi bi-trash" style={{ fontSize: "14px" }} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="fw-semibold col-kelas sticky-col-kelas">
                    {!readOnly && editingClassKey === `${group.cabang}||${group.kelas}||${group.sekolah || ""}` ? (
                      <div className="class-inline-editor" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={kelasDraft}
                          onChange={(event) => setKelasDraft(event.target.value)}
                          className="form-control form-control-sm class-inline-input"
                          placeholder="Nama kelas"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void submitClassEdit(group);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelClassEdit();
                            }
                          }}
                        />
                        {isJadwalTambahanMenu ? (
                          <input
                            value={sekolahDraft}
                            onChange={(event) => setSekolahDraft(event.target.value)}
                            className="form-control form-control-sm class-inline-input mt-1"
                            placeholder="Nama sekolah"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void submitClassEdit(group);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelClassEdit();
                              }
                            }}
                          />
                        ) : null}
                        <div className="d-flex gap-1 mt-1">
                          <button
                            type="button"
                            className="btn btn-success btn-sm btn-icon"
                            onClick={() => {
                              void submitClassEdit(group);
                            }}
                            disabled={saving}
                            aria-label="Simpan kelas"
                          >
                            <i className="bi bi-check-lg" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm btn-icon"
                            onClick={cancelClassEdit}
                            disabled={saving}
                            aria-label="Batal edit kelas"
                          >
                            <i className="bi bi-x-lg" />
                          </button>
                        </div>
                      </div>
                    ) : readOnly ? (
                      <div>
                        <div className="schedule-class-main">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub">{group.sekolah}</div>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link text-start text-decoration-none text-reset p-0 w-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          startClassEdit(group);
                        }}
                        aria-label="Edit nama kelas"
                      >
                        <div className="schedule-class-main">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub">{group.sekolah}</div>
                        ) : null}
                      </button>
                    )}
                  </td>
                  {activeScheduleDates.map((slot, index) => {
                    const entries = group.entriesByDate[slot.date] ?? [];
                    const hasConflictInCell = entries.some((item) => conflictEntryIds.has(item.id));
                    const isEditingCell =
                      editingSlot?.cabang === group.cabang &&
                      editingSlot?.kelas === group.kelas &&
                      (editingSlot?.sekolah || "") === (group.sekolah || "") &&
                      editingSlot?.tanggal === slot.date;
                    return (
                      <td
                        key={slot.date}
                        onClick={() => {
                          if (!readOnly) {
                            if (slot.date === todayStr) {
                              window.alert("Tidak diperbolehkan menambah atau mengubah jadwal pada hari ini.");
                            } else {
                              onSelectSlot(group, slot);
                            }
                          }
                        }}
                        title={slot.date === todayStr ? "Tidak dapat menambah/mengubah jadwal hari ini" : undefined}
                        className={`schedule-cell ${
                          activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""
                        } ${isEditingCell && !editingSlot?.entryId ? "is-editing" : ""} ${
                          hasConflictInCell ? "schedule-cell-conflict" : ""
                        }`}
                      >
                        {entries.length === 0 ? (
                          <span className="text-muted text-xxs">-</span>
                        ) : (
                          <div className="d-flex flex-column gap-1">
                            {entries.map((item, itemIndex) => {
                              const isEditingEntry = editingSlot?.entryId === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`btn btn-outline-secondary text-start p-1 schedule-entry-btn ${
                                    isEditingEntry ? "active" : ""
                                  } ${
                                    conflictEntryIds.has(item.id) ? "is-conflict" : ""
                                  }`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                     if (!readOnly) {
                                       if (slot.date === todayStr) {
                                         window.alert("Tidak diperbolehkan menambah atau mengubah jadwal pada hari ini.");
                                       } else {
                                         onSelectSlot(group, slot, item);
                                       }
                                     }
                                   }}
                                   disabled={readOnly || slot.date === todayStr}
                                   title={slot.date === todayStr ? "Tidak dapat mengubah/hapus jadwal hari ini" : undefined}
                                >
                                  <div className="fw-semibold text-xxs">
                                    <span className="name-chip" style={getTagStyle(item.mapel || `Sesi ${itemIndex + 1}`, "mapel")}>
                                      {item.mapel || `Sesi ${itemIndex + 1}`}
                                    </span>
                                  </div>
                                  <div className="text-xxs mt-1">
                                    {item.pengajar ? (
                                      <span className="name-chip" style={getTagStyle(item.pengajar, "pengajar")}>
                                        {item.pengajar}
                                      </span>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </div>
                                  <div className="text-muted text-xxs">{item.waktu || "-"}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-aksi sticky-col-aksi" />
              <td className="col-kelas sticky-col-kelas">
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={onOpenClassModal}
                    className="btn btn-outline-primary btn-sm btn-icon"
                    aria-label="Tambah kelas"
                  >
                    <i className="bi bi-plus-lg" />
                  </button>
                )}
              </td>
              <td colSpan={activeScheduleDates.length} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="alert alert-info mt-3 text-xs mb-0">
        {readOnly
          ? "Mode lihat cabang lain aktif. Anda hanya dapat melihat jadwal tanpa mengubah data."
          : "Klik sel untuk edit jadwal. Gunakan ikon panah di kolom aksi untuk menggeser urutan kelas."}
      </div>
      {hasVisibleConflict ? (
        <div className="alert alert-danger mt-2 text-xs mb-0">
          Ada jadwal bentrok antar cabang. Sel berwarna merah menandakan pengajar di tanggal dan jam yang sama sudah terpakai di cabang lain.
        </div>
      ) : null}
    </>
  );
}