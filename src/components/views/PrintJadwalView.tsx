import { Fragment, useMemo, useState } from "react";
import { buildMonthScheduleDates, formatScheduleLabelWithDay, parseFlexibleDate } from "../../utils/schedule";
import { getTagStyle } from "../../utils/tagColor";
import type { RecordItem, ScheduleDayGroup, ScheduleGroup, ScheduleSlotDate } from "../../types/app";

type PrintJadwalViewProps = {
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonthKey: string;
  onMonthChange: (value: string) => void;
  selectedScheduleType: ScheduleType;
  onScheduleTypeChange: (value: ScheduleType) => void;
  selectedClassKey: string;
  onClassKeyChange: (value: string) => void;
  printCopies: number;
  onPrintCopiesChange: (value: number) => void;
  printOrientation: PrintOrientation;
  onPrintOrientationChange: (value: PrintOrientation) => void;
  regulerDates: ScheduleSlotDate[];
  regulerDayGroups: ScheduleDayGroup[];
  regulerGroups: ScheduleGroup[];
  tambahanGroups: ScheduleGroup[];
  mapelNameByKode: Record<string, string>;
};

type RegularDayColumn = {
  label: string;
  dates: ScheduleSlotDate[];
};

type ScheduleType = "reguler" | "tambahan";
type PrintOrientation = "landscape" | "portrait";

const hasScheduleContent = (entry: RecordItem) =>
  Boolean((entry.mapel || "").trim() || (entry.pengajar || "").trim() || (entry.waktu || "").trim());

const getDisplayMapel = (value: string, mapelNameByKode: Record<string, string>) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "-";
  }
  return mapelNameByKode[trimmed.toLowerCase()] || trimmed;
};

const getDisplayMapelKode = (value: string, mapelNameByKode: Record<string, string>) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "-";
  const lower = trimmed.toLowerCase();
  // If value already matches a kode present in mapelNameByKode, return original trimmed value
  if (mapelNameByKode[lower]) return trimmed;
  // Otherwise try to find kode by name
  for (const [kode, nama] of Object.entries(mapelNameByKode)) {
    if ((nama || "").trim().toLowerCase() === lower) return kode;
  }
  // Fallback to trimmed
  return trimmed;
};

const getClassLabelHtml = (kelas: string, sekolah?: string) => {
  const safeKelas = escapeHtml(kelas || "-");
  const safeSekolah = escapeHtml((sekolah || "").trim());
  if (!safeSekolah) {
    return safeKelas;
  }
  return `${safeKelas}<br/><span class="muted">${safeSekolah}</span>`;
};

const getFilteredRegularDayColumns = (
  dates: ScheduleSlotDate[],
  dayGroups: ScheduleDayGroup[],
  selectedGroup: ScheduleGroup | null
) => {
  const result: RegularDayColumn[] = [];
  let offset = 0;

  dayGroups.forEach((day) => {
    const dayDates = dates.slice(offset, offset + day.count);
    offset += day.count;
    const visibleDates = dayDates.filter((slot) =>
      (selectedGroup?.entriesByDate[slot.date] ?? []).some(hasScheduleContent)
    );
    if (visibleDates.length > 0) {
      result.push({ label: day.label.toUpperCase(), dates: visibleDates });
    }
  });

  return result;
};

const toCellLines = (
  entries: RecordItem[],
  key: "mapel" | "waktu",
  mapelNameByKode: Record<string, string>
) => {
  if (!entries.length) {
    return "";
  }
  return entries
    .filter(hasScheduleContent)
    .map((entry) =>
      key === "mapel"
        ? getDisplayMapel(entry.mapel || "", mapelNameByKode)
        : (entry[key] || "-").trim() || "-"
    )
    .join("<br/>");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getCellHtml = (entries: RecordItem[], mapelNameByKode: Record<string, string>) => {
  if (entries.length === 0) {
    return '<span class="cell-empty">-</span>';
  }
  return entries
    .map(
      (entry, index) =>
        `<div class="session-item"><div class="session-mapel">${getDisplayMapelKode(
          entry.mapel || `Sesi ${index + 1}`,
          mapelNameByKode
        )}</div><div class="session-waktu">${entry.waktu || "-"}</div></div>`
    )
    .join("<hr/>");
};

const getRegularTableHtml = (
  dayColumns: RegularDayColumn[],
  groups: ScheduleGroup[],
  mapelNameByKode: Record<string, string>
) => {
  const palette = ["#fde9f5", "#eef6ff", "#fff7e6", "#fffbea", "#f0fdf4", "#f7f6ff"];
  const dayHeader = dayColumns.map((day) => `<th colspan="3">${escapeHtml(day.label)}</th>`).join("");
  const dayColGroup = dayColumns.map(() => '<col class="date-col" /><col class="mapel-col" /><col class="time-col" />').join("");

  const bodyRows = groups
    .map((group) => {
      const rowCount = Math.max(...dayColumns.map((day) => day.dates.length), 1);
      const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
        const classCell = rowIndex === 0 ? `<td class="kelas-cell" rowspan="${rowCount}">${getClassLabelHtml(group.kelas, group.sekolah)}</td>` : "";

        const dayCells = dayColumns
          .map((day, dayIndex) => {
            const slot = day.dates[rowIndex];
            if (!slot) {
              return "<td></td><td></td><td></td>";
            }
            const entries = (group.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
            const bg = palette[dayIndex % palette.length];
            const mapelHtml = entries
              .map((entry, idx) => `
                <div class="session-item" style="background:${bg};padding:4px;border-radius:6px;margin-bottom:4px;">
                  <div class="session-mapel" style="font-weight:700;color:#0b3b99;">${escapeHtml(getDisplayMapelKode(entry.mapel || `Sesi ${idx + 1}`, mapelNameByKode))}</div>
                </div>`)
              .join("");

            const timeHtml = entries
              .map((entry) => `
                <div class="session-item" style="padding:4px;border-radius:6px;margin-bottom:4px;">
                  <div class="session-waktu">${escapeHtml(entry.waktu || "-")}</div>
                </div>`)
              .join("");

            return [`
              <td class="date-col">${escapeHtml(slot.label)}</td>`,
              `<td class="mapel-col">${mapelHtml}</td>`,
              `<td class="time-col">${timeHtml}</td>`,
            ].join("");
          })
          .join("");

        const rowClass = rowIndex === 0 ? "class-group-start" : "";
        return `<tr class="${rowClass}">${classCell}${dayCells}</tr>`;
      }).join("");

      return rows;
    })
    .join("");

  const columnCount = dayColumns.length * 3 + 1;
  return `
    <table class="regular-print-table">
      <colgroup>
        <col class="kelas-col" />
        ${dayColGroup}
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">KELAS</th>
          <th colspan="${dayColumns.length * 3}">HARI & MATA PELAJARAN</th>
        </tr>
        <tr>${dayHeader}</tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="${columnCount}">Belum ada data.</td></tr>`}</tbody>
    </table>
  `;
};

const getTambahanTableHtml = (
  dates: ScheduleSlotDate[],
  groups: ScheduleGroup[],
  mapelNameByKode: Record<string, string>
) => {
  const dateHeader = dates
    .map((slot) => {
      const [year, month, day] = slot.date.split("-").map(Number);
      return `<th>${formatScheduleLabelWithDay(new Date(year, month - 1, day))}</th>`;
    })
    .join("");

  const bodyRows = groups
    .map((group) => {
      const kelasLabel = getClassLabelHtml(group.kelas, group.sekolah);
      const rowCells = dates
        .map((slot) => `<td>${getCellHtml(group.entriesByDate[slot.date] ?? [], mapelNameByKode)}</td>`)
        .join("");
      return `<tr><td class="kelas-cell">${kelasLabel}</td>${rowCells}</tr>`;
    })
    .join("");

  return `
    <table class="tambahan-print-table">
      <colgroup>
        <col class="kelas-col" />
        ${dates.map(() => '<col class="tambahan-day-col" />').join("")}
      </colgroup>
      <thead>
        <tr><th>Kelas</th>${dateHeader}</tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="${dates.length + 1}">Belum ada data.</td></tr>`}</tbody>
    </table>
  `;
};

const printHtmlDocument = (
  title: string,
  content: string,
  copies = 5,
  orientation: PrintOrientation = "landscape"
) => {
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const duplicatedContent = Array.from({ length: copies }, (_, index) => {
    const separatorClass = index < copies - 1 ? "copy-block with-separator" : "copy-block";
    return `<section class="${separatorClass}">${content}<div class="print-footer-meta">Dicetak ${printedAt}</div></section>`;
  }).join("");

  const isPortrait = orientation === "portrait";
  const kelasWidth = isPortrait ? 48 : 56;
  const dateWidth = isPortrait ? 50 : 58;
  const mapelWidth = isPortrait ? 62 : 78;
  const timeWidth = isPortrait ? 44 : 50;
  const tambahanDayWidth = isPortrait ? 70 : 86;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4 ${orientation}; margin: 5mm; }
          * { box-sizing: border-box; }
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            margin: 0;
            font-size: 10px;
            color: #111827;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-sheet { display: block; margin: 0; padding: 0; }
          .copy-block {
            display: block;
            width: 100%;
            overflow: hidden;
            padding: 8px;
            border: 1px solid #8b99a8;
            border-radius: 10px;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .copy-block.with-separator {
            border-bottom: 1px dashed #8b99a8;
          }
          .print-title-block {
            margin: 0 0 8px;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cdd6e0;
            border-left: 4px solid #1d4ed8;
            border-radius: 8px;
            background: #f8fbff;
          }
          .print-title-line { font-size: 11px; font-weight: 700; line-height: 1.25; letter-spacing: 0.02em; margin-bottom: 2px; }
          .muted { color: #4b5563; }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 8px;
            border: 1px solid #4b5563;
            overflow: hidden;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            vertical-align: top;
          }
          th:last-child, td:last-child { border-right: 1px solid #cbd5e1; }
          tr:last-child td { border-bottom: 1px solid #cbd5e1; }
          th {
            background: #e2e8f0;
            color: #0f172a;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            text-align: center;
          }
          td { font-size: 9px; line-height: 1.3; background: #ffffff; color: #111827; }
          .regular-print-table { table-layout: fixed; }
          .regular-print-table .kelas-col { width: ${kelasWidth}px; }
          .regular-print-table .kelas-cell {
            font-weight: 700;
            width: ${kelasWidth}px;
            max-width: ${kelasWidth}px;
            text-align: center;
            vertical-align: middle;
            background: #eef2ff;
            color: #0f172a;
          }
          .regular-print-table .date-col { width: ${dateWidth}px; white-space: nowrap; color: #0f172a; }
          .regular-print-table .mapel-col { width: ${mapelWidth}px; max-width: ${mapelWidth}px; word-break: break-word; color: #111827; }
          .regular-print-table .time-col { width: ${timeWidth}px; white-space: nowrap; color: #111827; }
          .regular-print-table .class-group-start td { border-top: 2px solid #475569; }
          .tambahan-print-table { table-layout: fixed; }
          .tambahan-print-table .kelas-cell {
            text-align: center;
            vertical-align: middle;
            font-weight: 700;
            background: #eef2ff;
            color: #0f172a;
          }
          .tambahan-print-table .tambahan-day-col { width: ${tambahanDayWidth}px; }
          .session-item + .session-item { margin-top: 4px; }
          .session-mapel { font-weight: 700; color: #0f172a; }
          .session-pengajar { color: #334155; }
          .session-waktu { color: #111827; }
          .cell-empty { color: #475569; }
          hr { border: 0; border-top: 1px dashed #cbd5e1; margin: 4px 0; }
          .print-footer-meta {
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px dashed #cbd5e1;
            text-align: right;
            font-size: 8px;
            color: #475569;
          }
          @media print {
            html, body { height: 100%; }
            .print-sheet { height: 100%; }
          }
        </style>
      </head>
      <body>
        <main class="print-sheet">
          ${duplicatedContent}
        </main>
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.overflow = "hidden";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentElement) {
      document.body.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    try {
      win.focus();
      win.print();
    } catch (_error) {
      // ignore print errors and cleanup anyway
    }
    setTimeout(cleanup, 500);
  };

  return { success: true };
};

const getSchedulePrintTitle = (scheduleType: ScheduleType) =>
  scheduleType === "reguler" ? "JADWAL REGULER" : "JADWAL TAMBAHAN & PELAYANAN";

const getPrintHeaderHtml = (titleSchedule: string, titleCabang: string) => `
  <div class="print-title-block">
    <div class="print-title-line">${titleSchedule}</div>
    <div class="print-title-line">NEUTRON YOGYAKARTA</div>
    <div class="print-title-line">${titleCabang || "CABANG -"}</div>
  </div>
`;

export function PrintJadwalView({
  monthOptions,
  selectedMonthKey,
  onMonthChange,
  selectedScheduleType,
  onScheduleTypeChange,
  selectedClassKey,
  onClassKeyChange,
  printCopies,
  onPrintCopiesChange,
  printOrientation,
  onPrintOrientationChange,
  regulerDates,
  regulerDayGroups,
  regulerGroups,
  tambahanGroups,
  mapelNameByKode,
}: PrintJadwalViewProps) {
  const [printError, setPrintError] = useState("");

  const selectedMonthDate = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedMonthKey]);

  const monthDateKeys = useMemo(() => {
    const { scheduleDates } = buildMonthScheduleDates(selectedMonthDate);
    return new Set(scheduleDates.map((slot) => slot.date));
  }, [selectedMonthDate]);

  const filteredTambahanGroups = useMemo(() => {
    return tambahanGroups
      .map((group) => {
        const filteredEntriesByDate: Record<string, RecordItem[]> = {};
        Object.entries(group.entriesByDate).forEach(([dateKey, entries]) => {
          if (monthDateKeys.has(dateKey)) {
            filteredEntriesByDate[dateKey] = entries;
          }
        });
        return {
          ...group,
          entriesByDate: filteredEntriesByDate,
        };
      })
      .filter((group) => Object.keys(group.entriesByDate).length > 0);
  }, [monthDateKeys, tambahanGroups]);

  const activeDates = selectedScheduleType === "reguler" ? regulerDates : regulerDates;
  const activeDayGroups = selectedScheduleType === "reguler" ? regulerDayGroups : regulerDayGroups;
  const activeGroups = selectedScheduleType === "reguler" ? regulerGroups : filteredTambahanGroups;

  const classOptions = useMemo(
    () =>
      activeGroups.map((group) => {
        const key = `${group.cabang}||${group.kelas}||${group.sekolah || ""}`;
        const label = group.sekolah
          ? `${group.kelas} - ${group.sekolah} (${group.cabang})`
          : `${group.kelas} (${group.cabang})`;
        return { value: key, label };
      }),
    [activeGroups]
  );

  const selectedClassGroup = useMemo(
    () =>
      activeGroups.find(
        (group) => `${group.cabang}||${group.kelas}||${group.sekolah || ""}` === selectedClassKey
      ) || null,
    [activeGroups, selectedClassKey]
  );

  const previewGroups = useMemo(() => (selectedClassGroup ? [selectedClassGroup] : []), [selectedClassGroup]);
  const titleSchedule = getSchedulePrintTitle(selectedScheduleType);
  const titleCabang = selectedClassGroup?.cabang ? `CABANG ${selectedClassGroup.cabang.toUpperCase()}` : "";

  const regularDayColumns = useMemo(
    () => getFilteredRegularDayColumns(activeDates, activeDayGroups, selectedClassGroup),
    [activeDates, activeDayGroups, selectedClassGroup]
  );
  const tambahanVisibleDates = useMemo(() => {
    if (!selectedClassGroup) {
      return [] as ScheduleSlotDate[];
    }
    return regulerDates.filter((slot) =>
      (selectedClassGroup.entriesByDate[slot.date] ?? []).some(hasScheduleContent)
    );
  }, [regulerDates, selectedClassGroup]);
  const maxRegularRows = useMemo(
    () => Math.max(...regularDayColumns.map((day) => day.dates.length), 1),
    [regularDayColumns]
  );
  const canPrint =
    Boolean(selectedClassGroup) &&
    (selectedScheduleType === "reguler"
      ? regularDayColumns.length > 0
      : tambahanVisibleDates.length > 0);

  const handlePrint = () => {
    setPrintError("");
    if (!selectedClassGroup) {
      return;
    }
    if (!canPrint) {
      return;
    }
    if (selectedScheduleType === "reguler") {
      const tableHtml = getRegularTableHtml(regularDayColumns, [selectedClassGroup], mapelNameByKode);
      const result = printHtmlDocument(
        "Print Jadwal Reguler",
        `${getPrintHeaderHtml(titleSchedule, titleCabang)}
         ${tableHtml}`,
        printCopies,
        printOrientation
      );
      if (!result.success) {
        setPrintError(result.message || "Gagal membuka preview print.");
      }
      return;
    }
    const tableHtml = getTambahanTableHtml(tambahanVisibleDates, [selectedClassGroup], mapelNameByKode);
    const result = printHtmlDocument(
      "Print Jadwal Tambahan & Pelayanan",
      `${getPrintHeaderHtml(titleSchedule, titleCabang)}
       ${tableHtml}`,
      printCopies,
      printOrientation
    );
    if (!result.success) {
      setPrintError(result.message || "Gagal membuka preview print.");
    }
  };

  return (
    <div className="mt-4">
      <div className="print-controls-panel mb-3">
        <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
          <div>
            <div className="text-uppercase text-muted small mb-1">Pengaturan Cetak</div>
            <div className="h6 mb-0">Print Jadwal</div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm px-4 py-2"
            onClick={handlePrint}
            disabled={!canPrint}
          >
            <i className="bi bi-printer me-1" /> Print Jadwal
          </button>
        </div>

        <div className="row g-3">
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small mb-1">Jadwal</label>
            <select
              className="form-select form-select-sm"
              value={selectedScheduleType}
              onChange={(event) => {
                onScheduleTypeChange(event.target.value as ScheduleType);
                onClassKeyChange("");
                setPrintError("");
              }}
            >
              <option value="reguler">Reguler</option>
              <option value="tambahan">Tambahan</option>
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small mb-1">Bulan</label>
            <select
              className="form-select form-select-sm"
              value={selectedMonthKey}
              onChange={(event) => {
                onMonthChange(event.target.value);
                onClassKeyChange("");
                setPrintError("");
              }}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small mb-1">Kelas</label>
            <select
              className="form-select form-select-sm"
              value={selectedClassKey}
              onChange={(event) => {
                onClassKeyChange(event.target.value);
                setPrintError("");
              }}
            >
              <option value="">Pilih kelas</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small mb-1">Salinan</label>
            <select
              className="form-select form-select-sm"
              value={printCopies}
              onChange={(event) => onPrintCopiesChange(Number(event.target.value))}
            >
              {Array.from({ length: 5 }, (_, index) => index + 1).map((copy) => (
                <option key={copy} value={copy}>
                  {copy}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label small mb-1">Orientasi</label>
            <select
              className="form-select form-select-sm"
              value={printOrientation}
              onChange={(event) => onPrintOrientationChange(event.target.value as PrintOrientation)}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>
        </div>

        {printError ? <div className="alert alert-danger py-2 mt-3 mb-0">{printError}</div> : null}
      </div>

      {!selectedClassGroup ? (
        <div className="alert alert-info py-2 mb-0">Pilih jadwal, bulan, dan kelas untuk melihat preview print.</div>
      ) : !canPrint ? (
        <div className="alert alert-warning py-2 mb-0">
          Tidak ada jadwal terisi untuk pilihan ini.
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="fw-semibold mb-1">{titleSchedule}</div>
            <div className="text-muted small">
              {titleCabang || "CABANG -"} • Kelas: {selectedClassGroup.kelas} • Bulan: {monthOptions.find((item) => item.value === selectedMonthKey)?.label || "-"}
            </div>
          </div>

          <div
            className={`table-responsive print-preview-shell print-paper-preview ${
              printOrientation === "portrait" ? "print-preview-portrait" : "print-preview-landscape"
            }`}
          >
            {selectedScheduleType === "reguler" ? (
              <table className="table table-sm table-bordered align-middle mb-0 print-preview-table print-preview-table-modern">
                <colgroup>
                  <col className="print-kelas-col" />
                  {regularDayColumns.map((day) => (
                    <Fragment key={`col-${day.label}`}>
                      <col className="print-date-col" />
                      <col className="print-mapel-col" />
                      <col className="print-time-col" />
                    </Fragment>
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="text-center align-middle print-kelas-col">
                      KELAS
                    </th>
                    <th colSpan={regularDayColumns.length * 3} className="text-center align-middle">
                      HARI & MATA PELAJARAN
                    </th>
                  </tr>
                  <tr>
                    {regularDayColumns.map((day) => (
                      <th key={day.label} colSpan={3} className="text-center">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewGroups.length === 0 ? (
                    <tr>
                      <td colSpan={regularDayColumns.length * 3 + 1} className="text-center text-muted py-3">
                        Belum ada data jadwal.
                      </td>
                    </tr>
                  ) : (
                    previewGroups.flatMap((group) =>
                      Array.from({ length: maxRegularRows }, (_, rowIndex) => {
                        const rowKey = `${group.cabang}-${group.kelas}-${rowIndex}`;
                        return (
                          <tr key={rowKey} className={rowIndex === 0 ? "class-group-start" : ""}>
                            {rowIndex === 0 && (
                              <td rowSpan={maxRegularRows} className="align-middle text-center fw-semibold print-kelas-col">
                                <div>{group.kelas}</div>
                                {group.sekolah ? <div className="text-muted small">{group.sekolah}</div> : null}
                              </td>
                            )}
                            {regularDayColumns.map((day, dayIndex) => {
                              const slot = day.dates[rowIndex];
                              if (!slot) {
                                return (
                                  <Fragment key={`${rowKey}-${day.label}-empty`}>
                                    <td key={`${rowKey}-${day.label}-tanggal`} />
                                    <td key={`${rowKey}-${day.label}-mapel`} />
                                    <td key={`${rowKey}-${day.label}-waktu`} />
                                  </Fragment>
                                );
                              }
                              const entries = (group.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
                              return (
                                <Fragment key={`${rowKey}-${slot.date}`}>
                                  <td key={`${rowKey}-${slot.date}-tanggal`} className="text-nowrap fw-semibold small text-center">
                                    {slot.label}
                                  </td>
                                  <td key={`${rowKey}-${slot.date}-mapel`} className="print-mapel-col">
                                    {entries.map((entry, idx) => (
                                      <div
                                        key={`${entry.id}-${idx}`}
                                        className="session-item"
                                        style={{
                                          background: ["#fde9f5", "#eef6ff", "#fff7e6", "#fffbea", "#f0fdf4", "#f7f6ff"][dayIndex % 6],
                                          padding: 8,
                                          borderRadius: 10,
                                          marginBottom: 6,
                                        }}
                                      >
                                        <div className="session-mapel" style={getTagStyle(getDisplayMapelKode(entry.mapel || "", mapelNameByKode), "mapel")}>
                                          {getDisplayMapelKode(entry.mapel || "", mapelNameByKode)}
                                        </div>
                                      </div>
                                    ))}
                                  </td>
                                  <td key={`${rowKey}-${slot.date}-waktu`} className="text-nowrap small print-time-col">
                                    {entries.map((entry, idx) => (
                                      <div
                                        key={`${entry.id}-${idx}`}
                                        className="session-item"
                                        style={{ marginBottom: 6, padding: "0.35rem 0.45rem", borderRadius: 10 }}
                                      >
                                        {entry.waktu || "-"}
                                      </div>
                                    ))}
                                  </td>
                                </Fragment>
                              );
                            })}
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table table-sm table-bordered align-middle mb-0 print-preview-table print-preview-table-modern">
                <thead>
                  <tr>
                    <th className="text-center align-middle print-kelas-col">KELAS</th>
                    {tambahanVisibleDates.map((slot) => (
                      <th key={slot.date} className="text-nowrap small">
                        {formatScheduleLabelWithDay(parseFlexibleDate(slot.date) || new Date(slot.date))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="align-middle text-center fw-semibold print-kelas-col">
                      <div>{selectedClassGroup.kelas}</div>
                      {selectedClassGroup.sekolah ? <div className="text-muted small">{selectedClassGroup.sekolah}</div> : null}
                    </td>
                    {tambahanVisibleDates.map((slot) => {
                      const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
                      return (
                        <td key={`tambahan-${slot.date}`}>
                          {entries.map((entry, idx) => (
                            <div key={`${entry.id}-${idx}`} className="session-item">
                              <div className="session-mapel" style={getTagStyle(getDisplayMapelKode(entry.mapel || "", mapelNameByKode), "mapel")}>
                                {getDisplayMapelKode(entry.mapel || "", mapelNameByKode)}
                              </div>
                              <div className="session-waktu">{entry.waktu || "-"}</div>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}