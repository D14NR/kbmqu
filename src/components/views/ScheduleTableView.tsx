import { useEffect, useMemo, useRef, useState } from "react";
import { formatScheduleLabel } from "../../utils/schedule";
import { isNationalHoliday, getNationalHolidayName } from "../../config/holidays";
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
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>("all");
  const [showLegend, setShowLegend] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

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

  const hasVisibleConflict = useMemo(() => {
    return monthScheduleGroups.some((group) =>
      Object.values(group.entriesByDate).some((entryList) =>
        entryList.some((entry) => conflictEntryIds.has(entry.id))
      )
    );
  }, [monthScheduleGroups, conflictEntryIds]);

  // Extract available jenjangs for filter
  const jenjangCounts = useMemo(() => {
    const counts: Record<string, number> = { all: monthScheduleGroups.length };
    monthScheduleGroups.forEach((g) => {
      const j = (g.jenjang || "Lainnya").toUpperCase();
      counts[j] = (counts[j] || 0) + 1;
    });
    return counts;
  }, [monthScheduleGroups]);

  const availableJenjangs = useMemo(() => {
    const list = Object.keys(jenjangCounts).filter((k) => k !== "all");
    return ["all", ...list];
  }, [jenjangCounts]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return monthScheduleGroups.filter((group) => {
      // Filter by Jenjang
      if (selectedJenjangFilter !== "all") {
        const j = (group.jenjang || "Lainnya").toUpperCase();
        if (j !== selectedJenjangFilter) return false;
      }

      // Filter by Search text
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchClass = (group.kelas || "").toLowerCase().includes(q);
        const matchSekolah = (group.sekolah || "").toLowerCase().includes(q);
        const matchJenjang = (group.jenjang || "").toLowerCase().includes(q);

        // Check if any schedule entry inside matches mapel or pengajar
        const matchEntry = Object.values(group.entriesByDate).some((entries) =>
          entries.some(
            (e) =>
              (e.mapel || "").toLowerCase().includes(q) ||
              (e.pengajar || "").toLowerCase().includes(q) ||
              (e.waktu || "").toLowerCase().includes(q)
          )
        );

        if (!matchClass && !matchSekolah && !matchJenjang && !matchEntry) {
          return false;
        }
      }

      return true;
    });
  }, [monthScheduleGroups, selectedJenjangFilter, searchFilter]);

  // Total sessions and teachers count
  const { totalSessions, totalTeachers } = useMemo(() => {
    let sessions = 0;
    const teachers = new Set<string>();
    monthScheduleGroups.forEach((g) => {
      Object.values(g.entriesByDate).forEach((entries) => {
        sessions += entries.length;
        entries.forEach((e) => {
          if (e.pengajar && e.pengajar.trim()) {
            teachers.add(e.pengajar.trim());
          }
        });
      });
    });
    return { totalSessions: sessions, totalTeachers: teachers.size };
  }, [monthScheduleGroups]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeScheduleDates, monthScheduleGroups]);

  return (
    <div className="schedule-table-module d-flex flex-column gap-3 mt-3">
      {/* 1. Executive Summary & Control Header */}
      <div className="card shadow-sm border rounded-3 bg-white">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-center gap-3">
            {/* Left Info: Mode & Quick KPI Badges */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-2 me-2">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center bg-primary-subtle text-primary"
                  style={{ width: 36, height: 36 }}
                >
                  <i className={`bi ${isJadwalTambahanMenu ? "bi-journal-plus" : "bi-calendar2-range"} fs-5`} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0 text-dark">
                    {isJadwalTambahanMenu ? "Jadwal Tambahan & Pelayanan" : "Jadwal Reguler KBM"}
                  </h6>
                  <div className="text-muted text-xxs">
                    {isJadwalTambahanMenu ? "Periode 30 hari ke depan" : "Tabel jadwal belajar mengajar bulanan"}
                  </div>
                </div>
              </div>

              {/* KPI Badges */}
              <div className="d-flex flex-wrap align-items-center gap-1.5 ms-lg-2">
                <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1">
                  <i className="bi bi-mortarboard text-primary" />
                  <span>Kelas:</span>
                  <strong className="text-primary">{monthScheduleGroups.length}</strong>
                </span>

                <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1">
                  <i className="bi bi-clock-history text-success" />
                  <span>Total Sesi:</span>
                  <strong className="text-success">{totalSessions}</strong>
                </span>

                <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1">
                  <i className="bi bi-people text-info" />
                  <span>Pengajar:</span>
                  <strong className="text-info">{totalTeachers}</strong>
                </span>

                {hasVisibleConflict ? (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1 animate-pulse">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <strong>Ada Bentrok!</strong>
                  </span>
                ) : (
                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1">
                    <i className="bi bi-shield-check" />
                    <span>Jadwal Aman</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right Controls: Search, Legend & Add Class Button */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search Bar */}
              <div className="input-group input-group-sm" style={{ width: 220 }}>
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Cari kelas, mapel, guru..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
                {searchFilter && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary bg-white border-start-0"
                    onClick={() => setSearchFilter("")}
                  >
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>

              {/* Toggle Legend */}
              <button
                type="button"
                className={`btn btn-sm ${showLegend ? "btn-secondary text-white" : "btn-outline-secondary bg-white"}`}
                onClick={() => setShowLegend(!showLegend)}
                title="Tampilkan Panduan Warna"
              >
                <i className="bi bi-palette me-1" />
                Panduan
              </button>

              {/* Add Class Button */}
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary shadow-sm fw-semibold d-flex align-items-center gap-1 px-3"
                  onClick={onOpenClassModal}
                >
                  <i className="bi bi-plus-circle-fill" />
                  <span>Tambah Kelas</span>
                </button>
              )}
            </div>
          </div>

          {/* Jenjang Filter Chips */}
          {availableJenjangs.length > 2 && (
            <div className="d-flex flex-wrap align-items-center gap-1.5 mt-2.5 pt-2 border-top">
              <span className="text-muted text-xxs fw-semibold me-1">Filter Jenjang:</span>
              {availableJenjangs.map((j) => {
                const isSelected = selectedJenjangFilter === j;
                const label = j === "all" ? "Semua Jenjang" : j;
                const count = jenjangCounts[j] || 0;

                return (
                  <button
                    key={j}
                    type="button"
                    className={`btn btn-sm py-0.5 px-2 rounded-pill text-xxs fw-semibold ${
                      isSelected
                        ? "btn-primary shadow-xs"
                        : "btn-light text-secondary border"
                    }`}
                    onClick={() => setSelectedJenjangFilter(j)}
                  >
                    {label} <span className="opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Collapsible Color Legend */}
          {showLegend && (
            <div className="mt-2.5 p-2.5 bg-light rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-2 text-xxs">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="d-flex align-items-center gap-1.5">
                  <span
                    className="d-inline-block rounded"
                    style={{ width: 14, height: 14, backgroundColor: "#fee2e2", border: "1px solid #f87171" }}
                  />
                  <span>Jadwal Bentrok Antar Cabang</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span
                    className="d-inline-block rounded"
                    style={{ width: 14, height: 14, backgroundColor: "#fff1f2", border: "1px solid #fda4af" }}
                  />
                  <span>Hari Libur Nasional</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span
                    className="d-inline-block rounded"
                    style={{ width: 14, height: 14, backgroundColor: "#dbeafe", border: "1px solid #3b82f6" }}
                  />
                  <span>Kolom Hari Ini / Sel Diedit</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="badge bg-light text-dark border px-1.5 py-0.5 rounded-pill">(Gabung)</span>
                  <span>Kelas Digabung</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <i className="bi bi-lock-fill text-secondary" />
                  <span>Sesi Hari Ini (Terkunci)</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                onClick={() => setShowLegend(false)}
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Interactive Schedule Table */}
      <div
        ref={scrollContainerRef}
        className="table-responsive border rounded-3 bg-white shadow-sm table-sticky-wrapper"
      >
        <table className="table table-bordered align-middle schedule-table mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th className="text-center col-aksi sticky-col-aksi">
                <div className="py-1 text-uppercase text-xxs fw-bold text-muted">Aksi</div>
              </th>
              <th className="text-center col-kelas sticky-col-kelas">
                <div className="py-1 text-uppercase text-xxs fw-bold text-muted">Kelas</div>
              </th>
              {activeScheduleDates.map((slot, index) => {
                const [year, month, day] = slot.date.split("-").map(Number);
                const slotDate = new Date(year, month - 1, day);
                const weekday = slotDate.toLocaleDateString("id-ID", { weekday: "long" });
                const dateLabel = formatScheduleLabel(slotDate);
                const holiday = isNationalHoliday(slot.date);
                const holidayName = holiday ? getNationalHolidayName(slot.date) : null;
                const isToday = slot.date === todayStr;

                return (
                  <th
                    key={slot.date}
                    className={`text-center schedule-header-cell ${
                      !isJadwalTambahanMenu && activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""
                    } ${holiday ? "holiday-col" : ""} ${isToday ? "today-header-col" : ""}`}
                    title={holidayName ? `Libur Nasional: ${holidayName}` : isToday ? "Hari Ini" : undefined}
                  >
                    <div className="d-flex flex-column align-items-center py-1">
                      <div className="schedule-header-weekday text-nowrap fw-bold">{weekday}</div>
                      <div className="d-flex align-items-center gap-1 mt-0.5">
                        <span
                          className={`schedule-header-date text-nowrap badge ${
                            isToday
                              ? "bg-primary text-white"
                              : holiday
                              ? "bg-danger text-white"
                              : "bg-white text-dark border"
                          }`}
                          style={{ fontSize: "10px", padding: "2px 6px" }}
                        >
                          {dateLabel}
                        </span>
                        {isToday && (
                          <span
                            className="badge bg-primary-subtle text-primary border border-primary-subtle text-xxs"
                            style={{ fontSize: "8px", padding: "1px 4px" }}
                          >
                            Hari Ini
                          </span>
                        )}
                        {holiday && (
                          <i className="bi bi-umbrella-fill text-danger text-xxs" title={holidayName || "Libur"} />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={activeScheduleDates.length + 2} className="text-center py-5">
                  <div className="d-flex flex-column align-items-center justify-content-center p-4">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle bg-light text-muted mb-3"
                      style={{ width: 56, height: 56 }}
                    >
                      <i className="bi bi-calendar2-x fs-2" />
                    </div>
                    <h6 className="fw-bold text-dark mb-1">
                      {searchFilter || selectedJenjangFilter !== "all"
                        ? "Tidak Ada Kelas yang Cocok dengan Filter"
                        : isJadwalTambahanMenu
                        ? "Belum Ada Jadwal Tambahan & Pelayanan"
                        : "Belum Ada Kelas & Jadwal Bulan Ini"}
                    </h6>
                    <p className="text-muted small mb-3" style={{ maxWidth: 420 }}>
                      {searchFilter || selectedJenjangFilter !== "all"
                        ? "Coba sesuaikan kata kunci pencarian atau reset filter jenjang."
                        : "Klik tombol Tambah Kelas untuk mulai membuat daftar kelas dan mengatur jadwal belajar."}
                    </p>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary px-3 shadow-sm"
                        onClick={onOpenClassModal}
                      >
                        <i className="bi bi-plus-circle me-1" />
                        Tambah Kelas Baru
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredGroups.map((group, groupIndex) => (
                <tr key={`${group.cabang}-${group.kelas}-${group.sekolah || ""}`}>
                  {/* Action Column */}
                  <td className="text-center col-aksi sticky-col-aksi">
                    {readOnly ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <div className="d-flex flex-column align-items-center justify-content-center gap-1 py-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveClass(group, -1);
                          }}
                          className="btn btn-sm p-0 rounded-2 border bg-white text-secondary shadow-xs hover-bg-light"
                          style={{ width: "26px", height: "24px" }}
                          aria-label="Geser kelas ke atas"
                          title="Geser kelas ke atas"
                          disabled={saving || groupIndex === 0}
                        >
                          <i className="bi bi-chevron-up" style={{ fontSize: "12px" }} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveClass(group, 1);
                          }}
                          className="btn btn-sm p-0 rounded-2 border bg-white text-secondary shadow-xs hover-bg-light"
                          style={{ width: "26px", height: "24px" }}
                          aria-label="Geser kelas ke bawah"
                          title="Geser kelas ke bawah"
                          disabled={saving || groupIndex === filteredGroups.length - 1}
                        >
                          <i className="bi bi-chevron-down" style={{ fontSize: "12px" }} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteClass(group);
                          }}
                          className="btn btn-sm p-0 rounded-2 border border-danger-subtle bg-danger-subtle text-danger shadow-xs"
                          style={{ width: "26px", height: "24px" }}
                          aria-label="Hapus kelas"
                          disabled={saving || (group.entriesByDate?.[todayStr] ?? []).length > 0}
                          title={
                            saving || (group.entriesByDate?.[todayStr] ?? []).length > 0
                              ? "Tidak dapat menghapus kelas yang memiliki jadwal hari ini"
                              : "Hapus kelas ini"
                          }
                        >
                          <i className="bi bi-trash" style={{ fontSize: "12px" }} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Class Column */}
                  <td className="fw-semibold col-kelas sticky-col-kelas">
                    {!readOnly ? (
                      <div className="schedule-class-wrapper p-1">
                        <button
                          type="button"
                          className="btn btn-link text-start text-decoration-none text-reset p-0 w-100 class-interactive-card"
                          onClick={(event) => {
                            event.stopPropagation();
                            (onOpenEditClass as any)(group);
                          }}
                          aria-label="Edit nama kelas"
                          title="Klik untuk edit kelas / jenjang"
                        >
                          <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                            {group.jenjang ? (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-xxs rounded-pill px-2 py-0.5">
                                {group.jenjang}
                              </span>
                            ) : null}
                            {group.classOrder !== undefined && group.classOrder !== null && (
                              <span
                                className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle text-xxs rounded-pill px-1.5 py-0.5 font-monospace"
                                title={`Urutan Kelas: ${group.classOrder}`}
                              >
                                #{group.classOrder}
                              </span>
                            )}
                          </div>
                          <div className="schedule-class-main fw-bold text-dark d-flex align-items-center justify-content-between">
                            <span>{group.kelas}</span>
                            <i className="bi bi-pencil-square text-muted text-xxs class-edit-icon" />
                          </div>
                          {isJadwalTambahanMenu && group.sekolah ? (
                            <div className="schedule-class-sub text-muted small mt-0.5 text-truncate" title={group.sekolah}>
                              <i className="bi bi-building me-1" />
                              {group.sekolah}
                            </div>
                          ) : null}
                        </button>
                      </div>
                    ) : (
                      <div className="schedule-class-wrapper p-1">
                        <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                          {group.jenjang ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-xxs rounded-pill px-2 py-0.5">
                              {group.jenjang}
                            </span>
                          ) : null}
                          {group.classOrder !== undefined && group.classOrder !== null && (
                            <span
                              className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle text-xxs rounded-pill px-1.5 py-0.5 font-monospace"
                              title={`Urutan Kelas: ${group.classOrder}`}
                            >
                              #{group.classOrder}
                            </span>
                          )}
                        </div>
                        <div className="schedule-class-main fw-bold text-dark">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub text-muted small mt-0.5 text-truncate" title={group.sekolah}>
                            <i className="bi bi-building me-1" />
                            {group.sekolah}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>

                  {/* Schedule Slot Cells */}
                  {activeScheduleDates.map((slot, index) => {
                    const entries = group.entriesByDate[slot.date] ?? [];
                    const hasConflictInCell = entries.some((item) => conflictEntryIds.has(item.id));
                    const isEditingCell =
                      editingSlot?.cabang === group.cabang &&
                      editingSlot?.kelas === group.kelas &&
                      (editingSlot?.sekolah || "") === (group.sekolah || "") &&
                      editingSlot?.tanggal === slot.date;
                    const holidayCell = isNationalHoliday(slot.date);
                    const isToday = slot.date === todayStr;

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
                        title={
                          slot.date === todayStr
                            ? "Terkunci: Tidak dapat menambah/mengubah jadwal hari ini"
                            : !readOnly
                            ? "Klik untuk menambah / kelola jadwal sesi ini"
                            : undefined
                        }
                        className={`schedule-cell ${
                          !isJadwalTambahanMenu && activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""
                        } ${isEditingCell && !editingSlot?.entryId ? "is-editing" : ""} ${
                          hasConflictInCell ? "schedule-cell-conflict" : ""
                        } ${holidayCell ? "holiday-col" : ""} ${isToday ? "today-cell-col" : ""}`}
                      >
                        {entries.length === 0 ? (
                          <div className="schedule-empty-slot d-flex align-items-center justify-content-center">
                            {!readOnly && !isToday ? (
                              <span className="empty-add-icon text-muted opacity-25">
                                <i className="bi bi-plus-lg" />
                              </span>
                            ) : (
                              <span className="text-muted text-xxs opacity-50">-</span>
                            )}
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-1.5 py-0.5">
                            {entries.map((item, itemIndex) => {
                              const isEditingEntry = editingSlot?.entryId === item.id;
                              const rawMapel = item.mapel || `Sesi ${itemIndex + 1}`;
                              const displayKode = getMapelKode(rawMapel) || rawMapel;
                              const tagStyle = getTagStyle(displayKode, "mapel");
                              const isConflict = conflictEntryIds.has(item.id);

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`btn text-start p-1.5 schedule-entry-btn rounded-2 shadow-xs ${
                                    isEditingEntry ? "active" : ""
                                  } ${isConflict ? "is-conflict" : ""}`}
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
                                  title={
                                    slot.date === todayStr
                                      ? "Terkunci: Tidak dapat mengubah/hapus jadwal hari ini"
                                      : isConflict
                                      ? "⚠️ BENTROK: Pengajar sudah memiliki jadwal di cabang lain pada jam ini!"
                                      : undefined
                                  }
                                >
                                  {/* Mapel Header Pill */}
                                  <div className="d-flex align-items-center justify-content-between gap-1">
                                    <span
                                      className="name-chip fw-bold text-xxs"
                                      style={{
                                        ...tagStyle,
                                        fontSize: "9px",
                                        padding: "1px 5px",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      {displayKode}
                                    </span>
                                    {isConflict && (
                                      <i className="bi bi-exclamation-triangle-fill text-danger text-xxs animate-pulse" />
                                    )}
                                    {isToday && (
                                      <i className="bi bi-lock-fill text-muted text-xxs" title="Terkunci hari ini" />
                                    )}
                                  </div>

                                  {/* Gabung Info */}
                                  {item.isGabung ? (
                                    <div className="schedule-class-sub text-xxs mt-0.5 text-primary fw-semibold">
                                      <i className="bi bi-link-45deg me-0.5" />
                                      Gabung
                                    </div>
                                  ) : null}

                                  {/* Pengajar */}
                                  <div className="mt-1 d-flex align-items-center gap-1">
                                    {item.pengajar ? (
                                      <span
                                        className="name-chip fw-semibold text-xxs"
                                        style={{
                                          ...getTagStyle(item.pengajar, "pengajar"),
                                          fontSize: "9px",
                                          padding: "1px 5px",
                                        }}
                                      >
                                        {item.pengajar}
                                      </span>
                                    ) : (
                                      <span className="text-muted text-xxs">-</span>
                                    )}
                                  </div>

                                  {/* Waktu Jam */}
                                  <div className="text-muted text-xxs mt-1 font-monospace d-flex align-items-center gap-1">
                                    <i className="bi bi-clock text-primary opacity-75" />
                                    <span>{item.waktu || "-"}</span>
                                  </div>
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
          {!readOnly && filteredGroups.length > 0 && (
            <tfoot>
              <tr className="table-light">
                <td className="col-aksi sticky-col-aksi" />
                <td className="col-kelas sticky-col-kelas p-2">
                  <button
                    type="button"
                    onClick={onOpenClassModal}
                    className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1 fw-semibold text-xxs"
                    aria-label="Tambah kelas baru"
                  >
                    <i className="bi bi-plus-lg" />
                    <span>Tambah Kelas</span>
                  </button>
                </td>
                <td colSpan={activeScheduleDates.length} className="text-muted small px-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <span>
                      Total <strong>{filteredGroups.length}</strong> kelas terdaftar
                    </span>
                    <span className="text-xxs opacity-75">
                      💡 Klik pada kolom jam untuk menambah atau mengatur sesi pengajar
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 3. Conflict Alert Banner */}
      {hasVisibleConflict && (
        <div className="alert alert-danger shadow-sm border-danger rounded-3 d-flex align-items-center gap-3 p-3 mb-0" role="alert">
          <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
            <i className="bi bi-exclamation-triangle-fill fs-5" />
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-danger">Terdeteksi Jadwal Bentrok Antar Cabang!</h6>
            <div className="small text-danger-emphasis mt-0.5">
              Sel jadwal dengan tanda merah menandakan pengajar telah dijadwalkan pada hari dan jam yang sama di cabang lain. Mohon sesuaikan jam sesi atau ganti pengajar yang tersedia.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
