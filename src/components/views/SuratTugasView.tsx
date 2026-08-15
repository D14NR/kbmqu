import { sesiHeaders, formatSessionParts, parseRangeFromString } from "../../utils/schedule";

type SuratDayRow = {
  dayLabel: string;
  dates: Array<{ date: string; label: string }>;
};

type SuratTugasViewProps = {
  loading: boolean;
  selectedMonthKey: string;
  selectedPengajarKode: string;
  selectedPengajar: Record<string, string> | null;
  selectedSessionCount: number;
  dayRows: SuratDayRow[];
  recordsByDate: Map<string, Record<string, string>[]>;
};

export function SuratTugasView({
  loading,
  selectedMonthKey,
  selectedPengajarKode,
  selectedPengajar,
  selectedSessionCount,
  dayRows,
  recordsByDate,
}: SuratTugasViewProps) {
  const shouldShowSessions = Boolean(selectedPengajarKode);

  return (
    <>
      <div className="mt-4 mb-2 small text-muted">
        <span className="me-3">Nama: {selectedPengajar?.Nama || "-"}</span>
        <span className="me-3">Bidang Studi: {selectedPengajar?.["Bidang Studi"] || "-"}</span>
        <span className="me-3">Domisili: {selectedPengajar?.Domisili || "-"}</span>
        <span>Jumlah Sesi: {selectedSessionCount}</span>
      </div>

      {!selectedMonthKey ? (
        <div className="alert alert-info mt-3 mb-0 text-xs">Pilih bulan terlebih dahulu untuk menampilkan data surat tugas.</div>
      ) : (
        <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
          <table className="table table-bordered align-middle mb-0 table-sticky">
            <thead className="table-light">
              <tr>
                <th className="text-center" style={{ width: 120 }}>
                  HARI
                </th>
                <th className="text-center text-nowrap" style={{ width: 140 }}>
                  TANGGAL
                </th>
                {sesiHeaders.map((header) => (
                  <th key={header} className="text-center text-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center text-muted py-4">
                    Memuat data surat tugas...
                  </td>
                </tr>
              ) : (
                dayRows.flatMap((row) =>
                  row.dates.map((slot, slotIndex) => {
                    const rawDateRecords = shouldShowSessions ? recordsByDate.get(slot.date) ?? [] : [];
                    const dateRecords = rawDateRecords.filter((r) => {
                      const kode = (r["Kode Pengajar"] || r["Kode Pengajar"] || "").toString().trim().toLowerCase();
                      return !shouldShowSessions || (selectedPengajarKode || "").trim().toLowerCase() === kode;
                    });
                    // collect all sesi entries across columns
                    const rawValues = dateRecords.flatMap((record) =>
                      sesiHeaders.map((h) => (record[h] || "").trim()).filter(Boolean)
                    );
                    // dedupe by waktu + mapel, but merge kelas labels for gabung classes
                    const mergedMap = new Map<
                      string,
                      { waktu: string; mapel: string; kelasSet: Set<string>; tail?: string }
                    >();
                    rawValues.forEach((v) => {
                      const parts = (v || "").split("/").map((p) => p.trim());
                      const waktuPart = parts[0] || "";
                      const second = parts[1] || "";
                      const dashIndex = second.indexOf("-");
                      const mapelPart = dashIndex >= 0 ? second.slice(0, dashIndex).trim() : second.trim();
                      const kelasPart = dashIndex >= 0 ? second.slice(dashIndex + 1).trim() : "";
                      const tail = parts[2] || "";
                      const key = `${waktuPart}||${mapelPart}`;
                      const entry = mergedMap.get(key);
                      if (!entry) {
                        const kelasSet = new Set<string>();
                        if (kelasPart) kelasSet.add(kelasPart);
                        mergedMap.set(key, { waktu: waktuPart, mapel: mapelPart, kelasSet, tail });
                      } else {
                        if (kelasPart) entry.kelasSet.add(kelasPart);
                      }
                    });
                    const deduped = Array.from(mergedMap.values()).map((e) => {
                      const kelasCombined = Array.from(e.kelasSet).filter(Boolean).join(" . ");
                      const second = kelasCombined ? `${e.mapel}-${kelasCombined}` : e.mapel;
                      const combined = `${e.waktu}/${second}/${e.tail || ""}`.trim();
                      return combined;
                    });
                    const ordered = deduped
                      .map((v, i) => {
                        const timeMatch = (v || "").match(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/);
                        const range = parseRangeFromString(timeMatch ? timeMatch[0] : "");
                        return { v, start: range?.start ?? Infinity, idx: i };
                      })
                      .sort((a, b) => (a.start - b.start) || (a.idx - b.idx))
                      .map((x) => x.v);
                    const dateColumns: string[][] = Array.from({ length: sesiHeaders.length }, () => []);
                    ordered.forEach((v, i) => {
                      if (i < dateColumns.length) {
                        dateColumns[i].push(v);
                      } else {
                        dateColumns[dateColumns.length - 1].push(v);
                      }
                    });
                    return (
                      <tr key={`${row.dayLabel}-${slot.date}`} className={slotIndex === 0 ? "surat-day-separator" : ""}>
                        <td className="fw-semibold">{slotIndex === 0 ? row.dayLabel : ""}</td>
                        <td>{slot.label}</td>
                        {sesiHeaders.map((sessionHeader, sessionIndex) => {
                          const sessionValues = dateColumns[sessionIndex] ?? [];
                          return (
                            <td key={`${slot.date}-${sessionHeader}`}>
                              {!shouldShowSessions ? null : sessionValues.length === 0 ? (
                                <span className="text-muted">-</span>
                              ) : (
                                <div className="session-cell">
                                  {sessionValues.map((sessionValue, valueIndex) => {
                                    const sessionParts = formatSessionParts(sessionValue);
                                    return (
                                      <div key={`${sessionHeader}-${valueIndex}`} className="session-entry">
                                        {sessionParts.length > 0
                                          ? sessionParts.map((part, partIndex) => (
                                              <div key={`${sessionHeader}-${valueIndex}-${partIndex}`}>{part}</div>
                                            ))
                                          : <div>{sessionValue}</div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}