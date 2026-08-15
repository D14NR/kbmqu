import { useEffect, useRef, useState } from "react";
import { formatScheduleLabelWithDay, formatScheduleLabel } from "../../utils/schedule";
import { isNationalHoliday } from "../../config/holidays";
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
  onOpenEditClass: (group: ScheduleGroup) => void;
  onDeleteClass: (group: ScheduleGroup) => void;
  onMoveClass: (group: ScheduleGroup, direction: -1 | 1) => void;
  onSelectSlot: (group: ScheduleGroup, slot: ScheduleSlotDate, item?: RecordItem) => void;
  onOpenClassModal: () => void;
  mapelRecords?: Record<string, string>[];
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
  onOpenEditClass,
  onDeleteClass,
  onMoveClass,
  onSelectSlot,
  onOpenClassModal,
  mapelRecords,
}: ScheduleTableViewProps) {
  const [kelasDraft, setKelasDraft] = useState("");
  const [sekolahDraft, setSekolahDraft] = useState("");
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const submitClassEdit = async (group: ScheduleGroup) => {
    const success = await onInlineSaveClass(group, kelasDraft, sekolahDraft);
    if (success) {
      setKelasDraft("");
      setSekolahDraft("");
    }
  };

  const getMapelKode = (rawValue: string) => {
    const raw = String(rawValue || "").trim();
    if (!raw) return "";
    if (!mapelRecords || mapelRecords.length === 0) return raw;
    const norm = raw.toLowerCase();
    const byKode = mapelRecords.find((r) => (((r["Kode_Mapel"] || r["Singkatan"] || "") + "").trim().toLowerCase() === norm));
    if (byKode) return ((byKode["Kode_Mapel"] || byKode["Singkatan"] || "") + "").trim();
    const byName = mapelRecords.find((r) => (((r["Mapel"] || r["Mata Pelajaran"] || "") + "").trim().toLowerCase() === norm));
    if (byName) return ((byName["Kode_Mapel"] || byName["Singkatan"] || "") + "").trim();
    return raw;
  };

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const hasVisibleConflict = monthScheduleGroups.some((group) =>
    Object.values(group.entriesByDate).some((entryList) =>
      entryList.some((entry) => conflictEntryIds.has(entry.id))
    )
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeScheduleDates, monthScheduleGroups]);

  return (
    <>
      <div ref={scrollContainerRef} className="table-responsive border rounded mt-4 table-sticky-wrapper">
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
                  const holiday = isNationalHoliday(slot.date);
                  return (
                    <th key={slot.date} className={`${holiday ? "holiday-col" : ""} text-center schedule-header-cell`}>
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
                  const holiday = isNationalHoliday(slot.date);
                  return (
                    <th
                      key={slot.date}
                      className={`${activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""} text-center schedule-header-cell ${
                        holiday ? "holiday-col" : ""
                      }`}
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
                          disabled={
                            saving || (group.entriesByDate?.[todayStr] ?? []).length > 0
                          }
                          title={
                            saving || (group.entriesByDate?.[todayStr] ?? []).length > 0
                              ? "Tidak dapat menghapus kelas pada hari ini"
                              : undefined
                          }
                        >
                          <i className="bi bi-trash" style={{ fontSize: "14px" }} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="fw-semibold col-kelas sticky-col-kelas">
                    {!readOnly ? (
                      <div className="schedule-class-wrapper">
                        <button
                          type="button"
                          className="btn btn-link text-start text-decoration-none text-reset p-0 w-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            // open edit modal instead of inline edit
                            (onOpenEditClass as any)(group);
                          }}
                          aria-label="Edit nama kelas"
                        >
                          {group.jenjang ? (
                            <div className="schedule-class-badge">{group.jenjang}</div>
                          ) : null}
                          <div className="schedule-class-main">{group.kelas}</div>
                          {isJadwalTambahanMenu && group.sekolah ? (
                            <div className="schedule-class-sub">{group.sekolah}</div>
                          ) : null}
                        </button>
                      </div>
                    ) : (
                      <div className="schedule-class-wrapper">
                        {group.jenjang ? (
                          <div className="schedule-class-badge">{group.jenjang}</div>
                        ) : null}
                        <div className="schedule-class-main">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub">{group.sekolah}</div>
                        ) : null}
                      </div>
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
                    const holidayCell = isNationalHoliday(slot.date);
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
                          } ${holidayCell ? "holiday-col" : ""}`}
                        >
                        {entries.length === 0 ? (
                          <span className="text-muted text-xxs">-</span>
                        ) : (
                          <div className="d-flex flex-column gap-1">
                            {entries.map((item, itemIndex) => {
                              const isEditingEntry = editingSlot?.entryId === item.id;
                              const rawMapel = item.mapel || `Sesi ${itemIndex + 1}`;
                              const displayKode = getMapelKode(rawMapel) || rawMapel;
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
                                    <span className="name-chip" style={getTagStyle(displayKode, "mapel")}>
                                      {displayKode}
                                      {item.isGabung ? " (Gabung)" : null}
                                    </span>
                                    {item.isGabung && item.gabungWith ? (
                                      <div className="schedule-class-sub text-xxs">
                                        {String(item.gabungWith)
                                          .split(";")
                                          .map((value) => value.trim())
                                          .filter(Boolean)
                                          .map((value) => {
                                            const parts = value.split("||").map((p) => String(p || "").trim()).filter(Boolean);
                                            if (parts.length >= 3) {
                                              return `${parts[1]} ${parts[2]}`;
                                            }
                                            if (parts.length === 2) {
                                              return parts[1];
                                            }
                                            return value;
                                          })
                                          .join(" . ")}
                                      </div>
                                    ) : null}
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

      {hasVisibleConflict ? (
        <div className="alert alert-danger mt-2 text-xs mb-0">
          Ada jadwal bentrok antar cabang. Sel berwarna merah menandakan pengajar di tanggal dan jam yang sama sudah terpakai di cabang lain.
        </div>
      ) : null}
    </>
  );
}