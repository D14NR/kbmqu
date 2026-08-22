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
type TableLayoutMode = "matrix" | "agenda";

type FlatSessionItem = {
  date: string;
  dateLabel: string;
  dayName: string;
  fullDate: Date;
  entries: RecordItem[];
};

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
  if (mapelNameByKode[lower]) return trimmed;
  for (const [kode, nama] of Object.entries(mapelNameByKode)) {
    if ((nama || "").trim().toLowerCase() === lower) return kode;
  }
  return trimmed;
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Palette for day columns
const DAY_PALETTE = [
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", headerBg: "#2563eb", headerText: "#ffffff" },
  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", headerBg: "#16a34a", headerText: "#ffffff" },
  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", headerBg: "#ea580c", headerText: "#ffffff" },
  { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff", headerBg: "#9333ea", headerText: "#ffffff" },
  { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8", headerBg: "#db2777", headerText: "#ffffff" },
  { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc", headerBg: "#0891b2", headerText: "#ffffff" },
];

/**
 * Modern Clean Day-by-Day Grid Matrix HTML for Print
 * Fits 100% of A4 page width with zero overflow
 */
const getMatrixTableHtml = (
  dayColumns: RegularDayColumn[],
  group: ScheduleGroup,
  mapelNameByKode: Record<string, string>
) => {
  if (dayColumns.length === 0) {
    return `<div style="text-align:center;padding:20px;color:#64748b;">Belum ada sesi jadwal terisi.</div>`;
  }

  const colWidth = (100 / dayColumns.length).toFixed(2);
  const rowCount = Math.max(...dayColumns.map((day) => day.dates.length), 1);

  const headerCells = dayColumns
    .map(
      (day, idx) => `
        <th class="matrix-th" style="width: ${colWidth}%; background: ${DAY_PALETTE[idx % DAY_PALETTE.length].headerBg}; color: ${DAY_PALETTE[idx % DAY_PALETTE.length].headerText};">
          <div class="matrix-th-day">${escapeHtml(day.label)}</div>
          <div class="matrix-th-count">${day.dates.length} Pertemuan</div>
        </th>`
    )
    .join("");

  const bodyRows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowCells = dayColumns
      .map((day, dayIndex) => {
        const slot = day.dates[rowIndex];
        const palette = DAY_PALETTE[dayIndex % DAY_PALETTE.length];

        if (!slot) {
          return `<td class="matrix-td matrix-empty-cell" style="width: ${colWidth}%;"></td>`;
        }

        const entries = (group.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);

        if (entries.length === 0) {
          return `
            <td class="matrix-td matrix-empty-cell" style="width: ${colWidth}%;">
              <div class="matrix-date-badge">${escapeHtml(slot.label)}</div>
              <div class="matrix-empty-text">-</div>
            </td>`;
        }

        const cardsHtml = entries
          .map((entry, idx) => {
            const kode = getDisplayMapelKode(entry.mapel || `Sesi ${idx + 1}`, mapelNameByKode);
            const namaLengkap = getDisplayMapel(entry.mapel || "", mapelNameByKode);
            const isLibur = (entry.mapel || "").toLowerCase().includes("libur");

            if (isLibur) {
              return `
                <div class="matrix-session-card matrix-libur-card">
                  <div class="matrix-mapel-kode" style="color: #b45309;">🏖️ LIBUR KBM</div>
                  ${entry.pengajar ? `<div class="matrix-guru">${escapeHtml(entry.pengajar)}</div>` : ""}
                </div>`;
            }

            return `
              <div class="matrix-session-card" style="border-left: 3px solid ${palette.border};">
                <div class="matrix-card-header">
                  <span class="matrix-mapel-kode" style="background: ${palette.bg}; color: ${palette.text};">${escapeHtml(kode)}</span>
                  ${entry.waktu ? `<span class="matrix-waktu">⏱️ ${escapeHtml(entry.waktu)}</span>` : ""}
                </div>
                ${namaLengkap && namaLengkap !== kode ? `<div class="matrix-mapel-name">${escapeHtml(namaLengkap)}</div>` : ""}
                ${entry.pengajar ? `<div class="matrix-guru">👤 Guru: <strong>${escapeHtml(entry.pengajar)}</strong></div>` : ""}
              </div>`;
          })
          .join("");

        return `
          <td class="matrix-td" style="width: ${colWidth}%;">
            <div class="matrix-date-badge">
              <span class="matrix-date-num">${escapeHtml(slot.label)}</span>
            </div>
            <div class="matrix-sessions-wrap">
              ${cardsHtml}
            </div>
          </td>`;
      })
      .join("");

    return `<tr>${rowCells}</tr>`;
  }).join("");

  return `
    <table class="schedule-table matrix-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
};

/**
 * Chronological Agenda List Table HTML for Print
 * Perfect linear sequential list for handouts
 */
const getAgendaTableHtml = (
  flatSessions: FlatSessionItem[],
  mapelNameByKode: Record<string, string>
) => {
  if (flatSessions.length === 0) {
    return `<div style="text-align:center;padding:20px;color:#64748b;">Belum ada sesi jadwal terisi.</div>`;
  }

  const rows = flatSessions
    .map((item, idx) => {
      const isEven = idx % 2 === 0;
      const formattedDate = formatScheduleLabelWithDay(item.fullDate);

      const sessionsHtml = item.entries
        .map((entry, sIdx) => {
          const kode = getDisplayMapelKode(entry.mapel || `Sesi ${sIdx + 1}`, mapelNameByKode);
          const namaLengkap = getDisplayMapel(entry.mapel || "", mapelNameByKode);
          const isLibur = (entry.mapel || "").toLowerCase().includes("libur");

          if (isLibur) {
            return `
              <div class="agenda-session-item agenda-libur">
                <span class="agenda-badge-libur">🏖️ LIBUR KBM</span>
              </div>`;
          }

          return `
            <div class="agenda-session-item">
              <span class="agenda-mapel-badge">${escapeHtml(kode)}</span>
              <span class="agenda-mapel-title">${escapeHtml(namaLengkap)}</span>
            </div>`;
        })
        .join("");

      const waktuHtml = item.entries
        .map((e) => `<div class="agenda-time-pill">${escapeHtml(e.waktu || "-")}</div>`)
        .join("");

      const guruHtml = item.entries
        .map((e) => `<div class="agenda-guru-text">${e.pengajar ? `👤 ${escapeHtml(e.pengajar)}` : "-"}</div>`)
        .join("");

      return `
        <tr class="${isEven ? "agenda-row-even" : ""}">
          <td class="agenda-col-no">${idx + 1}</td>
          <td class="agenda-col-date">
            <div class="agenda-date-main">${escapeHtml(formattedDate)}</div>
          </td>
          <td class="agenda-col-time">${waktuHtml}</td>
          <td class="agenda-col-mapel">${sessionsHtml}</td>
          <td class="agenda-col-guru">${guruHtml}</td>
        </tr>`;
    })
    .join("");

  return `
    <table class="schedule-table agenda-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">NO</th>
          <th style="width: 150px; text-align: left;">HARI & TANGGAL</th>
          <th style="width: 110px; text-align: center;">WAKTU / JAM</th>
          <th style="text-align: left;">MATA PELAJARAN / MATERI</th>
          <th style="width: 130px; text-align: left;">PENGAJAR</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

type PrintOptions = {
  includeKop: boolean;
  includeNotes: boolean;
  includeSignatures: boolean;
  includeCutLine: boolean;
};

const printHtmlDocument = (
  title: string,
  contentBlock: string,
  copies = 1,
  orientation: PrintOrientation = "landscape",
  options: PrintOptions = {
    includeKop: true,
    includeNotes: true,
    includeSignatures: true,
    includeCutLine: true,
  }
) => {
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const duplicatedContent = Array.from({ length: copies }, (_, index) => {
    const isLast = index === copies - 1;
    return `
      <section class="copy-section ${!isLast && copies > 1 ? "has-next-copy" : ""}">
        ${contentBlock}
        <div class="doc-footer-meta">
          <div class="doc-meta-left">
            <span>Sistem KBM Terpadu • Neutron Yogyakarta</span>
            ${copies > 1 ? `<span class="copy-badge">Salinan #${index + 1} dari ${copies}</span>` : ""}
          </div>
          <div class="doc-meta-right">Dicetak: ${printedAt}</div>
        </div>
        ${!isLast && copies > 1 && options.includeCutLine ? `
          <div class="cut-guide">
            <span class="cut-icon">✁</span>
            <span class="cut-text">POTONG DI SINI (SLIP JADWAL SISWA)</span>
            <span class="cut-line"></span>
          </div>` : ""}
      </section>
    `;
  }).join("");

  const isPortrait = orientation === "portrait";

  const html = `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${isPortrait ? "8mm 8mm" : "6mm 8mm"};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: ${isPortrait ? "9.5px" : "9px"};
            color: #0f172a;
            background: #ffffff;
            line-height: 1.35;
          }

          .print-container {
            width: 100%;
            margin: 0;
            padding: 0;
          }

          .copy-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: ${copies > 1 ? "12px" : "0"};
            padding: 4px;
          }

          /* Header / Kop Lembaga */
          .kop-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 8px;
            margin-bottom: 8px;
            border-bottom: 2px solid #0f2d59;
            position: relative;
          }
          .kop-container::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            right: 0;
            height: 1px;
            background-color: #3b82f6;
          }
          .kop-brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .kop-logo-box {
            width: 38px;
            height: 38px;
            background: #1e3a8a;
            color: #ffffff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -1px;
            border: 1px solid #1e40af;
          }
          .kop-title-group h1 {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .kop-title-group p {
            margin: 1px 0 0 0;
            font-size: 8.5px;
            color: #475569;
            font-weight: 500;
          }
          .kop-doc-badge {
            text-align: right;
          }
          .kop-badge-title {
            display: inline-block;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1d4ed8;
            font-weight: 700;
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 5px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .kop-badge-sub {
            margin-top: 2px;
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
          }

          /* Info Strip */
          .info-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 5px 8px;
            margin-bottom: 8px;
            font-size: 8.5px;
          }
          .info-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .info-label {
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 7.5px;
          }
          .info-value {
            color: #0f172a;
            font-weight: 700;
          }

          /* Universal Table Styles */
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 8px;
            font-size: 8.5px;
          }
          .schedule-table th,
          .schedule-table td {
            border: 1px solid #cbd5e1;
            padding: 4px;
            vertical-align: top;
          }

          /* Matrix Table Design */
          .matrix-th {
            padding: 5px 4px;
            text-align: center;
            font-weight: 700;
            border: 1px solid #94a3b8;
          }
          .matrix-th-day {
            font-size: 10px;
            letter-spacing: 0.04em;
          }
          .matrix-th-count {
            font-size: 7.5px;
            opacity: 0.9;
            font-weight: 500;
            margin-top: 1px;
          }
          .matrix-td {
            background: #ffffff;
            padding: 5px 4px;
            min-height: 50px;
          }
          .matrix-empty-cell {
            background: #fcfdfd;
          }
          .matrix-date-badge {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 2px 4px;
            text-align: center;
            font-weight: 700;
            font-size: 8px;
            color: #334155;
            margin-bottom: 4px;
          }
          .matrix-sessions-wrap {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .matrix-session-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px;
          }
          .matrix-libur-card {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            border-color: #fde68a;
            text-align: center;
          }
          .matrix-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2px;
            margin-bottom: 2px;
          }
          .matrix-mapel-kode {
            font-weight: 800;
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 3px;
            letter-spacing: 0.02em;
          }
          .matrix-waktu {
            font-size: 7.5px;
            font-weight: 600;
            color: #475569;
          }
          .matrix-mapel-name {
            font-size: 8px;
            font-weight: 600;
            color: #1e293b;
            line-height: 1.2;
            margin-top: 2px;
          }
          .matrix-guru {
            font-size: 7px;
            color: #64748b;
            margin-top: 2px;
          }
          .matrix-empty-text {
            color: #cbd5e1;
            text-align: center;
            font-size: 9px;
            padding: 8px 0;
          }

          /* Agenda Table Design */
          .agenda-table thead th {
            background: #1e3a8a;
            color: #ffffff;
            font-size: 8.5px;
            font-weight: 700;
            padding: 4px 6px;
          }
          .agenda-row-even {
            background: #f8fafc;
          }
          .agenda-col-no {
            text-align: center;
            font-weight: 700;
            color: #64748b;
          }
          .agenda-col-date {
            font-weight: 700;
            color: #0f172a;
          }
          .agenda-col-time {
            text-align: center;
          }
          .agenda-time-pill {
            display: inline-block;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1d4ed8;
            font-size: 7.5px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 3px;
            margin: 1px 0;
          }
          .agenda-session-item {
            display: flex;
            align-items: center;
            gap: 4px;
            margin: 2px 0;
          }
          .agenda-mapel-badge {
            background: #e2e8f0;
            color: #1e293b;
            font-size: 7.5px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 3px;
          }
          .agenda-mapel-title {
            font-size: 8px;
            font-weight: 600;
            color: #0f172a;
          }
          .agenda-guru-text {
            font-size: 8px;
            color: #475569;
          }
          .agenda-badge-libur {
            background: #fef3c7;
            color: #92400e;
            font-size: 7.5px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 3px;
          }

          /* Notes & Signatures Box */
          .doc-footer-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 10px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #cbd5e1;
          }
          .notes-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px 6px;
            font-size: 7.5px;
            color: #475569;
          }
          .notes-title {
            font-weight: 700;
            color: #1e3a8a;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 8px;
          }
          .notes-list {
            margin: 0;
            padding-left: 12px;
          }
          .notes-list li {
            margin-bottom: 1px;
          }

          .signatures-grid {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            text-align: center;
          }
          .signature-col {
            flex: 1;
            font-size: 7.5px;
          }
          .sig-title {
            color: #64748b;
            margin-bottom: 20px;
          }
          .sig-line {
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #94a3b8;
            padding-top: 2px;
          }

          /* Meta Footer */
          .doc-footer-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 7px;
            color: #94a3b8;
            margin-top: 4px;
            padding-top: 2px;
          }
          .copy-badge {
            background: #e2e8f0;
            color: #475569;
            padding: 1px 3px;
            border-radius: 2px;
            font-weight: 600;
            margin-left: 4px;
          }

          /* Cut Guide */
          .cut-guide {
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 8px 0;
            color: #94a3b8;
            font-size: 7px;
            letter-spacing: 0.1em;
          }
          .cut-icon {
            font-size: 10px;
          }
          .cut-line {
            flex: 1;
            border-bottom: 1px dashed #94a3b8;
          }

          @media print {
            body {
              background: transparent;
            }
          }
        </style>
      </head>
      <body>
        <main class="print-container">
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
      // ignore print errors
    }
    setTimeout(cleanup, 500);
  };

  return { success: true };
};

const getSchedulePrintTitle = (scheduleType: ScheduleType) =>
  scheduleType === "reguler" ? "JADWAL KBM REGULER" : "JADWAL TAMBAHAN & PELAYANAN";

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
  const [copiedTextNotice, setCopiedTextNotice] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [tableLayoutMode, setTableLayoutMode] = useState<TableLayoutMode>("matrix");

  // Print customization options
  const [includeKop, setIncludeKop] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeCutLine, setIncludeCutLine] = useState(true);

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

  const activeDates = regulerDates;
  const activeDayGroups = regulerDayGroups;
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

  const titleSchedule = getSchedulePrintTitle(selectedScheduleType);
  const monthLabel = monthOptions.find((item) => item.value === selectedMonthKey)?.label || selectedMonthKey;

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

  // Chronological list of sessions
  const flatSessions = useMemo<FlatSessionItem[]>(() => {
    if (!selectedClassGroup) return [];
    const datesToUse = selectedScheduleType === "reguler"
      ? regularDayColumns.flatMap((col) => col.dates)
      : tambahanVisibleDates;

    // Deduplicate & sort chronologically
    const uniqueDatesMap = new Map<string, ScheduleSlotDate>();
    datesToUse.forEach((d) => {
      uniqueDatesMap.set(d.date, d);
    });

    const sortedDates = Array.from(uniqueDatesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return sortedDates
      .map((slot) => {
        const [y, m, d] = slot.date.split("-").map(Number);
        const fullDate = new Date(y, m - 1, d);
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);

        return {
          date: slot.date,
          dateLabel: slot.label,
          dayName: dayNames[fullDate.getDay()] || "",
          fullDate,
          entries,
        };
      })
      .filter((item) => item.entries.length > 0);
  }, [selectedClassGroup, selectedScheduleType, regularDayColumns, tambahanVisibleDates]);

  const maxRegularRows = useMemo(
    () => Math.max(...regularDayColumns.map((day) => day.dates.length), 1),
    [regularDayColumns]
  );

  // Total session statistics
  const scheduleStats = useMemo(() => {
    if (!selectedClassGroup) return { totalSessions: 0, totalDays: 0, teachers: new Set<string>() };
    let sessions = 0;
    const teachers = new Set<string>();
    const dates = new Set<string>();

    Object.entries(selectedClassGroup.entriesByDate).forEach(([date, entries]) => {
      const valid = entries.filter(hasScheduleContent);
      if (valid.length > 0) {
        dates.add(date);
        sessions += valid.length;
        valid.forEach((e) => {
          if (e.pengajar) teachers.add(e.pengajar);
        });
      }
    });

    return {
      totalSessions: sessions,
      totalDays: dates.size,
      teachers,
    };
  }, [selectedClassGroup]);

  const canPrint =
    Boolean(selectedClassGroup) &&
    (selectedScheduleType === "reguler"
      ? regularDayColumns.length > 0
      : tambahanVisibleDates.length > 0);

  const getHeaderKopHtml = () => {
    if (!includeKop) {
      return `
        <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 13px; font-weight: 800; color: #1e3a8a;">${escapeHtml(titleSchedule)}</h2>
          <div style="font-size: 9px; color: #64748b;">NEUTRON YOGYAKARTA • CABANG ${escapeHtml((selectedClassGroup?.cabang || "").toUpperCase())}</div>
        </div>
      `;
    }

    return `
      <div class="kop-container">
        <div class="kop-brand">
          <div class="kop-logo-box">N</div>
          <div class="kop-title-group">
            <h1>NEUTRON YOGYAKARTA</h1>
            <p>Bimbingan Belajar & Konsultasi Pendidikan • Cabang ${escapeHtml((selectedClassGroup?.cabang || "").toUpperCase())}</p>
          </div>
        </div>
        <div class="kop-doc-badge">
          <div class="kop-badge-title">${escapeHtml(titleSchedule)}</div>
          <div class="kop-badge-sub">Periode: ${escapeHtml(monthLabel)}</div>
        </div>
      </div>
    `;
  };

  const getInfoStripHtml = () => {
    return `
      <div class="info-strip">
        <div class="info-item">
          <span class="info-label">Kelas:</span>
          <span class="info-value">${escapeHtml(selectedClassGroup?.kelas || "-")} ${selectedClassGroup?.sekolah ? `(${escapeHtml(selectedClassGroup.sekolah)})` : ""}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Cabang:</span>
          <span class="info-value">${escapeHtml(selectedClassGroup?.cabang || "-")}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Bulan:</span>
          <span class="info-value">${escapeHtml(monthLabel)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Total Pertemuan:</span>
          <span class="info-value">${scheduleStats.totalSessions} Sesi (${scheduleStats.totalDays} Hari)</span>
        </div>
      </div>
    `;
  };

  const getFooterGridHtml = () => {
    if (!includeNotes && !includeSignatures) return "";

    return `
      <div class="doc-footer-grid">
        ${includeNotes ? `
          <div class="notes-box">
            <div class="notes-title">📌 Tata Tertib & Catatan KBM</div>
            <ul class="notes-list">
              <li>Siswa wajib hadir di kelas bimbingan minimal 10 menit sebelum jam KBM dimulai.</li>
              <li>Wajib membawa buku paket modul bimbingan dan alat tulis lengkap.</li>
              <li>Izin berhalangan hadir harap dikonfirmasikan ke admin cabang minimal H-1.</li>
            </ul>
          </div>` : `<div></div>`}

        ${includeSignatures ? `
          <div class="signatures-grid">
            <div class="signature-col">
              <div class="sig-title">Koordinator KBM Cabang</div>
              <div class="sig-line">( ____________________ )</div>
            </div>
            <div class="signature-col">
              <div class="sig-title">Siswa / Orang Tua</div>
              <div class="sig-line">( ${escapeHtml(selectedClassGroup?.kelas || "________________")} )</div>
            </div>
          </div>` : `<div></div>`}
      </div>
    `;
  };

  const handlePrint = () => {
    setPrintError("");
    if (!selectedClassGroup || !canPrint) {
      return;
    }

    const printOpts: PrintOptions = {
      includeKop,
      includeNotes,
      includeSignatures,
      includeCutLine,
    };

    let tableHtml = "";
    if (tableLayoutMode === "agenda") {
      tableHtml = getAgendaTableHtml(flatSessions, mapelNameByKode);
    } else {
      tableHtml = getMatrixTableHtml(regularDayColumns, selectedClassGroup, mapelNameByKode);
    }

    const fullContent = `
      ${getHeaderKopHtml()}
      ${getInfoStripHtml()}
      ${tableHtml}
      ${getFooterGridHtml()}
    `;

    const result = printHtmlDocument(
      `Jadwal ${selectedClassGroup.kelas} - ${selectedClassGroup.cabang} (${monthLabel})`,
      fullContent,
      printCopies,
      printOrientation,
      printOpts
    );

    if (!result.success) {
      setPrintError("Gagal membuka dialog print browser.");
    }
  };

  // Copy schedule as formatted text for WhatsApp broadcast
  const handleCopyWhatsAppText = () => {
    if (!selectedClassGroup) return;

    let text = `📅 *${titleSchedule} - NEUTRON YOGYAKARTA*\n`;
    text += `🏢 Cabang: ${selectedClassGroup.cabang}\n`;
    text += `🎓 Kelas: ${selectedClassGroup.kelas}${selectedClassGroup.sekolah ? ` (${selectedClassGroup.sekolah})` : ""}\n`;
    text += `🗓️ Periode: ${monthLabel}\n`;
    text += `------------------------------------\n\n`;

    if (selectedScheduleType === "reguler") {
      regularDayColumns.forEach((day) => {
        text += `🔹 *HARI ${day.label}*\n`;
        day.dates.forEach((slot) => {
          const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
          if (entries.length > 0) {
            entries.forEach((e) => {
              const mapel = getDisplayMapel(e.mapel || "", mapelNameByKode);
              text += `  • *${slot.label}* (${e.waktu || "-"}): ${mapel}${e.pengajar ? ` - Guru: ${e.pengajar}` : ""}\n`;
            });
          }
        });
        text += `\n`;
      });
    } else {
      tambahanVisibleDates.forEach((slot) => {
        const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
        if (entries.length > 0) {
          const [y, m, d] = slot.date.split("-").map(Number);
          const dateFormatted = formatScheduleLabelWithDay(new Date(y, m - 1, d));
          text += `🔹 *${dateFormatted}*\n`;
          entries.forEach((e) => {
            const mapel = getDisplayMapel(e.mapel || "", mapelNameByKode);
            text += `  • Jam: ${e.waktu || "-"} | Mapel: ${mapel}${e.pengajar ? ` | Pengajar: ${e.pengajar}` : ""}\n`;
          });
          text += `\n`;
        }
      });
    }

    text += `📌 *Catatan:* Harap hadir tepat waktu dan membawa modul belajar.\n`;
    text += `Salam Sukses, *Neutron Yogyakarta*.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTextNotice(true);
      setTimeout(() => setCopiedTextNotice(false), 3000);
    });
  };

  return (
    <div className="mt-3">
      {/* 1. Header & Control Command Station */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 bg-white overflow-hidden">
        {/* Banner Title */}
        <div className="p-3 p-md-4 bg-gradient-primary-soft border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
              style={{ width: 46, height: 46 }}
            >
              <i className="bi bi-printer-fill fs-4" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0 text-dark">Studio Cetak Dokumen Jadwal</h5>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-2.5 py-0.5 text-xxs font-monospace">
                  A4 Print Ready
                </span>
              </div>
              <p className="text-muted text-xs mb-0 mt-0.5">
                Cetak lembar jadwal KBM resmi rapi proporsional tanpa terpotong, ekspor dokumen bersih, atau salin teks WhatsApp.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
              onClick={handleCopyWhatsAppText}
              disabled={!canPrint}
              title="Salin ringkasan jadwal dalam format teks WhatsApp"
            >
              <i className={`bi ${copiedTextNotice ? "bi-check2-all text-success" : "bi-whatsapp text-success"}`} />
              <span>{copiedTextNotice ? "Tersalin ke Clipboard!" : "Salin Teks WA"}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-1.5 shadow-2xs"
              onClick={() => setShowOptionsModal(!showOptionsModal)}
              title="Pengaturan Kop Surat & Lembar Dokumen"
            >
              <i className="bi bi-sliders2" />
              <span>Opsi Dokumen</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm px-4 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center gap-2 print-trigger-btn"
              onClick={handlePrint}
              disabled={!canPrint}
            >
              <i className="bi bi-printer fs-6" />
              <span>Cetak Jadwal</span>
            </button>
          </div>
        </div>

        {/* Filter Configuration Grid */}
        <div className="p-3 p-md-4">
          <div className="row g-3 align-items-end">
            {/* 1. Schedule Type Selector */}
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-layers text-primary" />
                Jenis Jadwal
              </label>
              <div className="btn-group w-100 p-1 bg-light rounded-3 border" role="group">
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    selectedScheduleType === "reguler"
                      ? "btn-white text-primary shadow-xs"
                      : "text-muted"
                  }`}
                  onClick={() => {
                    onScheduleTypeChange("reguler");
                    onClassKeyChange("");
                    setPrintError("");
                  }}
                >
                  <i className="bi bi-calendar3-range me-1" />
                  Reguler
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 py-1.5 text-xs fw-semibold ${
                    selectedScheduleType === "tambahan"
                      ? "btn-white text-primary shadow-xs"
                      : "text-muted"
                  }`}
                  onClick={() => {
                    onScheduleTypeChange("tambahan");
                    onClassKeyChange("");
                    setPrintError("");
                  }}
                >
                  <i className="bi bi-stars me-1 text-warning" />
                  Tambahan
                </button>
              </div>
            </div>

            {/* 2. Month Selector */}
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-calendar-month text-primary" />
                Periode Bulan
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-calendar-event" />
                </span>
                <select
                  className="form-select form-select-sm border-start-0 fw-medium"
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
            </div>

            {/* 3. Class Selector */}
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5 d-flex align-items-center gap-1">
                <i className="bi bi-mortarboard text-primary" />
                Pilih Kelas
                {classOptions.length > 0 && (
                  <span className="badge bg-primary-subtle text-primary rounded-pill px-1.5 py-0.5 ms-1">
                    {classOptions.length}
                  </span>
                )}
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted border-end-0">
                  <i className="bi bi-search" />
                </span>
                <select
                  className="form-select form-select-sm border-start-0 fw-bold text-primary"
                  value={selectedClassKey}
                  onChange={(event) => {
                    onClassKeyChange(event.target.value);
                    setPrintError("");
                  }}
                >
                  <option value="">-- Pilih Kelas Target --</option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Format & Orientation */}
            <div className="col-12 col-md-12 col-lg-3">
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5">
                    Format Tabel
                  </label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        tableLayoutMode === "matrix"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setTableLayoutMode("matrix")}
                      title="Format Matriks Kalender Kolom Hari"
                    >
                      <i className="bi bi-grid-3x3" /> Matriks
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        tableLayoutMode === "agenda"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setTableLayoutMode("agenda")}
                      title="Format Daftar Agenda Kronologis Baris"
                    >
                      <i className="bi bi-list-task" /> Agenda
                    </button>
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label text-xxs fw-bold text-muted text-uppercase mb-1.5">
                    Orientasi Kertas
                  </label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        printOrientation === "landscape"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => onPrintOrientationChange("landscape")}
                      title="Kertas Lebar / Landscape"
                    >
                      <i className="bi bi-aspect-ratio" /> L
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        printOrientation === "portrait"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => onPrintOrientationChange("portrait")}
                      title="Kertas Tegak / Portrait"
                    >
                      <i className="bi bi-file-earmark" /> P
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Banner if Class Selected */}
          {selectedClassGroup && canPrint && (
            <div className="mt-3 p-2.5 bg-light rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-2 text-xs">
              <div className="d-flex align-items-center gap-3">
                <span className="d-flex align-items-center gap-1 text-dark fw-bold">
                  <i className="bi bi-check-circle-fill text-success" />
                  {selectedClassGroup.kelas}
                  {selectedClassGroup.sekolah ? ` • ${selectedClassGroup.sekolah}` : ""}
                </span>
                <span className="text-muted">|</span>
                <span className="text-muted">
                  Cabang: <strong className="text-dark">{selectedClassGroup.cabang}</strong>
                </span>
                <span className="text-muted">|</span>
                <span className="text-muted">
                  Total Sesi: <strong className="text-primary">{scheduleStats.totalSessions} Pertemuan ({scheduleStats.totalDays} Hari)</strong>
                </span>
                {scheduleStats.teachers.size > 0 && (
                  <>
                    <span className="text-muted">|</span>
                    <span className="text-muted">
                      Pengajar: <strong className="text-dark">{scheduleStats.teachers.size} Orang</strong>
                    </span>
                  </>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-white text-secondary border rounded-pill px-2.5 py-1 text-xxs">
                  A4 {printOrientation === "landscape" ? "Landscape (Mendatar)" : "Portrait (Tegak)"}
                </span>
                <span className="badge bg-white text-primary border border-primary-subtle rounded-pill px-2.5 py-1 text-xxs">
                  {tableLayoutMode === "matrix" ? "Matriks Kolom Hari" : "Agenda Daftar Baris"}
                </span>
                {printCopies > 1 && (
                  <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2 py-1 text-xxs">
                    ✂️ Multi-Salinan ({printCopies}x)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Document Options Popover / Drawer */}
          {showOptionsModal && (
            <div className="mt-3 p-3 bg-white rounded-3 border shadow-sm animation-fade-in">
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <span className="fw-bold small text-dark d-flex align-items-center gap-1.5">
                  <i className="bi bi-sliders text-primary" /> Pengaturan Komponen Lembar Cetak
                </span>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  onClick={() => setShowOptionsModal(false)}
                />
              </div>
              <div className="row g-3">
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optKop"
                      checked={includeKop}
                      onChange={(e) => setIncludeKop(e.target.checked)}
                    />
                    <label className="form-check-label text-xs fw-semibold text-dark" htmlFor="optKop">
                      Kop Surat Lembaga Resmi
                    </label>
                    <div className="text-xxs text-muted">Menampilkan logo & header Neutron Yogyakarta.</div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optNotes"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                    />
                    <label className="form-check-label text-xs fw-semibold text-dark" htmlFor="optNotes">
                      Catatan Tata Tertib Belajar
                    </label>
                    <div className="text-xxs text-muted">Informasi jam hadir, modul, dan izin siswa.</div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optSig"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                    />
                    <label className="form-check-label text-xs fw-semibold text-dark" htmlFor="optSig">
                      Ruang Tanda Tangan
                    </label>
                    <div className="text-xxs text-muted">Kolom tanda tangan Koordinator KBM & Wali.</div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="optCut"
                      checked={includeCutLine}
                      onChange={(e) => setIncludeCutLine(e.target.checked)}
                    />
                    <label className="form-check-label text-xs fw-semibold text-dark" htmlFor="optCut">
                      Garis Panduan Potong (✁)
                    </label>
                    <div className="text-xxs text-muted">Garis putus-putus saat mencetak &gt; 1 salinan.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {printError && (
            <div className="alert alert-danger py-2 mt-3 mb-0 text-xs d-flex align-items-center gap-2 rounded-3">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
              <div>{printError}</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Live Paper Preview Simulator */}
      {!selectedClassGroup ? (
        <div className="card shadow-sm border-0 rounded-4 p-5 text-center bg-white">
          <div
            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 68, height: 68 }}
          >
            <i className="bi bi-file-earmark-text fs-2" />
          </div>
          <h5 className="fw-bold text-dark mb-1">Pilih Kelas untuk Menampilkan Dokumen Cetak</h5>
          <p className="text-muted text-xs mx-auto mb-4" style={{ maxWidth: 460 }}>
            Pilih jenis jadwal, periode bulan, dan nama kelas pada bilah kendali di atas untuk memuat simulator lembar dokumen A4 secara langsung.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <span className="badge bg-light text-secondary border rounded-pill px-3 py-1.5 text-xs">
              <i className="bi bi-printer me-1" /> Siap Cetak ke Mesin Printer
            </span>
            <span className="badge bg-light text-secondary border rounded-pill px-3 py-1.5 text-xs">
              <i className="bi bi-file-pdf me-1 text-danger" /> Ekspor PDF Bersih
            </span>
            <span className="badge bg-light text-secondary border rounded-pill px-3 py-1.5 text-xs">
              <i className="bi bi-whatsapp me-1 text-success" /> Broadcast Teks WA
            </span>
          </div>
        </div>
      ) : !canPrint ? (
        <div className="card shadow-sm border-0 rounded-4 p-5 text-center bg-white">
          <div
            className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 64, height: 64 }}
          >
            <i className="bi bi-calendar-x fs-2" />
          </div>
          <h5 className="fw-bold text-dark mb-1">Belum Ada Sesi Jadwal Terisi</h5>
          <p className="text-muted text-xs mx-auto mb-0" style={{ maxWidth: 440 }}>
            Tidak ditemukan sesi bimbingan pada kelas <strong>{selectedClassGroup.kelas}</strong> untuk periode <strong>{monthLabel}</strong>. Silakan isi sesi pada menu Jadwal KBM terlebih dahulu.
          </p>
        </div>
      ) : (
        <div>
          {/* Paper Controls Toolbar */}
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-dark text-white rounded-pill px-2.5 py-1 text-xxs fw-bold text-uppercase">
                <i className="bi bi-eye me-1" /> Pratinjau Kertas A4
              </span>
              <span className="text-muted text-xxs">
                Skala: <strong>{previewZoom}%</strong> • Format: <strong>A4 ({printOrientation.toUpperCase()})</strong> • Mode: <strong>{tableLayoutMode === "matrix" ? "Matriks Kolom Hari" : "Daftar Agenda"}</strong>
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Layout Switcher */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-xs ${tableLayoutMode === "matrix" ? "btn-primary" : "btn-light border"}`}
                  onClick={() => setTableLayoutMode("matrix")}
                >
                  <i className="bi bi-grid-3x3 me-1" /> Matriks
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${tableLayoutMode === "agenda" ? "btn-primary" : "btn-light border"}`}
                  onClick={() => setTableLayoutMode("agenda")}
                >
                  <i className="bi bi-list-task me-1" /> Agenda
                </button>
              </div>

              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  className={`btn btn-xs ${previewZoom === 85 ? "btn-primary" : "btn-light border"}`}
                  onClick={() => setPreviewZoom(85)}
                >
                  85%
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${previewZoom === 100 ? "btn-primary" : "btn-light border"}`}
                  onClick={() => setPreviewZoom(100)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${previewZoom === 115 ? "btn-primary" : "btn-light border"}`}
                  onClick={() => setPreviewZoom(115)}
                >
                  115%
                </button>
              </div>
            </div>
          </div>

          {/* Realistic Paper Container Simulator */}
          <div
            className="print-paper-simulator-viewport p-3 p-md-4 rounded-4 border overflow-auto"
            style={{
              background: "#64748b15",
              maxHeight: "82vh",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              className={`print-paper-sheet bg-white p-4 shadow-lg border rounded-3 position-relative ${
                printOrientation === "portrait" ? "paper-portrait" : "paper-landscape"
              }`}
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                width: printOrientation === "portrait" ? "794px" : "1040px",
                minHeight: printOrientation === "portrait" ? "1040px" : "740px",
                color: "#0f172a",
                overflow: "hidden",
              }}
            >
              {/* Kop Surat Live Preview */}
              {includeKop ? (
                <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom border-2 border-primary position-relative">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 bg-gradient-primary text-white d-flex align-items-center justify-content-center fw-bolder shadow-sm flex-shrink-0"
                      style={{ width: 44, height: 44, fontSize: "1.4rem" }}
                    >
                      N
                    </div>
                    <div>
                      <h4 className="fw-bolder mb-0 text-primary tracking-wide">NEUTRON YOGYAKARTA</h4>
                      <div className="text-muted text-xxs fw-semibold">
                        Lembaga Bimbingan Belajar & Konsultasi Pendidikan • Cabang {selectedClassGroup.cabang.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="text-end">
                    <div className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1.5 text-xs fw-bold rounded-2">
                      {titleSchedule}
                    </div>
                    <div className="text-muted text-xxs mt-1 fw-semibold">Periode: {monthLabel}</div>
                  </div>
                </div>
              ) : (
                <div className="mb-3 pb-2 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold text-primary mb-0">{titleSchedule}</h5>
                  <span className="text-muted text-xs">NEUTRON YOGYAKARTA • CABANG {selectedClassGroup.cabang.toUpperCase()}</span>
                </div>
              )}

              {/* Info Strip */}
              <div className="p-2.5 bg-light rounded-3 border mb-3 d-flex flex-wrap justify-content-between align-items-center text-xs">
                <div>
                  <span className="text-muted text-uppercase text-xxs fw-bold">Kelas: </span>
                  <strong className="text-dark">
                    {selectedClassGroup.kelas} {selectedClassGroup.sekolah ? `(${selectedClassGroup.sekolah})` : ""}
                  </strong>
                </div>
                <div>
                  <span className="text-muted text-uppercase text-xxs fw-bold">Cabang: </span>
                  <strong className="text-dark">{selectedClassGroup.cabang}</strong>
                </div>
                <div>
                  <span className="text-muted text-uppercase text-xxs fw-bold">Bulan: </span>
                  <strong className="text-dark">{monthLabel}</strong>
                </div>
                <div>
                  <span className="text-muted text-uppercase text-xxs fw-bold">Total Sesi: </span>
                  <strong className="text-primary">{scheduleStats.totalSessions} Pertemuan ({scheduleStats.totalDays} Hari)</strong>
                </div>
              </div>

              {/* Live Table Content - Zero Scrollbar, 100% Fit */}
              {tableLayoutMode === "matrix" ? (
                /* Matriks Kolom Hari - 1 Kolom Per Hari Bimbingan */
                <table className="table table-bordered table-sm align-middle mb-0 text-xs border-dark-subtle" style={{ tableLayout: "fixed", width: "100%" }}>
                  <thead>
                    <tr>
                      {regularDayColumns.map((day, idx) => {
                        const palette = DAY_PALETTE[idx % DAY_PALETTE.length];
                        const colWidthPct = (100 / regularDayColumns.length).toFixed(2);
                        return (
                          <th
                            key={day.label}
                            className="text-center py-2 text-white"
                            style={{
                              width: `${colWidthPct}%`,
                              backgroundColor: palette.headerBg,
                              borderColor: "#94a3b8",
                            }}
                          >
                            <div className="fw-bold fs-7 tracking-wide text-uppercase">{day.label}</div>
                            <div className="text-xxs fw-normal text-white-50">{day.dates.length} Pertemuan</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxRegularRows }, (_, rowIndex) => (
                      <tr key={`matrix-row-${rowIndex}`}>
                        {regularDayColumns.map((day, dayIndex) => {
                          const slot = day.dates[rowIndex];
                          const palette = DAY_PALETTE[dayIndex % DAY_PALETTE.length];

                          if (!slot) {
                            return (
                              <td
                                key={`matrix-${day.label}-${rowIndex}-empty`}
                                className="bg-light-subtle text-center text-muted"
                                style={{ height: "68px" }}
                              />
                            );
                          }

                          const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);

                          return (
                            <td
                              key={`matrix-${slot.date}`}
                              className="p-1.5 align-top bg-white"
                              style={{ verticalAlign: "top" }}
                            >
                              {/* Date Header Pill */}
                              <div className="d-flex justify-content-between align-items-center px-1.5 py-0.5 mb-1.5 bg-light rounded border text-xxs font-monospace">
                                <span className="fw-bold text-dark">{slot.label}</span>
                                <span className="text-muted" style={{ fontSize: "0.68rem" }}>Sesi {rowIndex + 1}</span>
                              </div>

                              {/* Sessions in this Date */}
                              {entries.length === 0 ? (
                                <div className="text-center text-muted py-2 text-xxs">-</div>
                              ) : (
                                <div className="d-flex flex-column gap-1.5">
                                  {entries.map((entry, idx) => {
                                    const kode = getDisplayMapelKode(entry.mapel || "", mapelNameByKode);
                                    const namaLengkap = getDisplayMapel(entry.mapel || "", mapelNameByKode);
                                    const isLibur = (entry.mapel || "").toLowerCase().includes("libur");

                                    if (isLibur) {
                                      return (
                                        <div
                                          key={`${entry.id}-${idx}`}
                                          className="p-1.5 rounded-2 text-center bg-warning-subtle border border-warning-subtle text-warning-emphasis"
                                        >
                                          <div className="fw-bold text-xxs">🏖️ LIBUR KBM</div>
                                          {entry.pengajar && <div className="text-xxs text-muted">{entry.pengajar}</div>}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={`${entry.id}-${idx}`}
                                        className="p-1.5 rounded-2 border shadow-2xs"
                                        style={{
                                          backgroundColor: palette.light || "#f8fafc",
                                          borderLeft: `3px solid ${palette.border}`,
                                        }}
                                      >
                                        <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                                          <span
                                            className="badge rounded-pill fw-bold text-xxs px-2 py-0.5"
                                            style={getTagStyle(kode, "mapel")}
                                          >
                                            {kode}
                                          </span>
                                          {entry.waktu && (
                                            <span className="text-muted fw-semibold" style={{ fontSize: "0.68rem" }}>
                                              ⏱️ {entry.waktu}
                                            </span>
                                          )}
                                        </div>

                                        <div
                                          className="text-dark fw-bold"
                                          style={{ fontSize: "0.74rem", lineHeight: "1.25" }}
                                        >
                                          {namaLengkap}
                                        </div>

                                        {entry.pengajar && (
                                          <div className="text-muted text-xxs mt-1 fst-italic">
                                            👤 Guru: <strong>{entry.pengajar}</strong>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Format Agenda Baris Kronologis */
                <table className="table table-bordered table-sm align-middle mb-0 text-xs border-dark-subtle" style={{ tableLayout: "fixed", width: "100%" }}>
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="text-center py-2" style={{ width: 40 }}>NO</th>
                      <th className="py-2" style={{ width: 170 }}>HARI & TANGGAL</th>
                      <th className="text-center py-2" style={{ width: 120 }}>WAKTU / JAM</th>
                      <th className="py-2">MATA PELAJARAN / MATERI</th>
                      <th className="py-2" style={{ width: 140 }}>PENGAJAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatSessions.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      const formattedDate = formatScheduleLabelWithDay(item.fullDate);
                      return (
                        <tr key={item.date} className={isEven ? "bg-light-subtle" : "bg-white"}>
                          <td className="text-center fw-bold text-muted">{idx + 1}</td>
                          <td>
                            <strong className="text-dark">{formattedDate}</strong>
                          </td>
                          <td className="text-center">
                            {item.entries.map((e, sIdx) => (
                              <div key={sIdx} className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 text-xxs mb-0.5 d-inline-block">
                                {e.waktu || "-"}
                              </div>
                            ))}
                          </td>
                          <td>
                            {item.entries.map((e, sIdx) => {
                              const kode = getDisplayMapelKode(e.mapel || "", mapelNameByKode);
                              const nama = getDisplayMapel(e.mapel || "", mapelNameByKode);
                              const isLibur = (e.mapel || "").toLowerCase().includes("libur");

                              if (isLibur) {
                                return (
                                  <span key={sIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle me-1">
                                    🏖️ LIBUR KBM
                                  </span>
                                );
                              }

                              return (
                                <div key={sIdx} className="d-flex align-items-center gap-1.5 my-0.5">
                                  <span className="badge fw-bold text-xxs px-1.5 py-0.5" style={getTagStyle(kode, "mapel")}>
                                    {kode}
                                  </span>
                                  <span className="fw-semibold text-dark" style={{ fontSize: "0.78rem" }}>
                                    {nama}
                                  </span>
                                </div>
                              );
                            })}
                          </td>
                          <td>
                            {item.entries.map((e, sIdx) => (
                              <div key={sIdx} className="text-muted text-xxs">
                                {e.pengajar ? `👤 ${e.pengajar}` : "-"}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Notes & Signatures Box in Simulator */}
              {(includeNotes || includeSignatures) && (
                <div className="row g-3 mt-3 pt-3 border-top border-dashed">
                  {includeNotes && (
                    <div className={includeSignatures ? "col-7" : "col-12"}>
                      <div className="p-2.5 bg-light rounded-3 border text-xxs">
                        <div className="fw-bold text-primary mb-1 text-uppercase">
                          📌 Tata Tertib & Catatan KBM
                        </div>
                        <ul className="mb-0 ps-3 text-muted">
                          <li>Siswa wajib hadir di kelas bimbingan minimal 10 menit sebelum jam KBM dimulai.</li>
                          <li>Wajib membawa buku paket modul bimbingan dan alat tulis lengkap.</li>
                          <li>Izin berhalangan hadir harap dikonfirmasikan ke admin cabang minimal H-1.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {includeSignatures && (
                    <div className={includeNotes ? "col-5" : "col-12"}>
                      <div className="d-flex justify-content-around text-center text-xxs pt-1">
                        <div>
                          <div className="text-muted mb-4">Koordinator KBM</div>
                          <div className="fw-bold border-top pt-1 text-dark">( ____________________ )</div>
                        </div>
                        <div>
                          <div className="text-muted mb-4">Siswa / Orang Tua</div>
                          <div className="fw-bold border-top pt-1 text-dark">
                            ( {selectedClassGroup.kelas} )
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document Footer Meta */}
              <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top text-xxs text-muted">
                <div>Sistem Informasi Akademik • Neutron Yogyakarta</div>
                <div>
                  Dicetak otomatis pada: {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
