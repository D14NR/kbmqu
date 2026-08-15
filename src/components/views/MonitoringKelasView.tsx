import type { MonitoringRow } from "../../types/app";

type MonitoringKelasViewProps = {
  loading: boolean;
  rows: MonitoringRow[];
  mapelNameByKode?: Record<string, string>;
};

export function MonitoringKelasView({ loading, rows, mapelNameByKode }: MonitoringKelasViewProps) {
  const normalizeRawKode = (raw: string) => (raw || "").trim().toUpperCase();

  const getDisplayMapelKode = (value: string, mapelNameByKode?: Record<string, string>) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";

    const lower = trimmed.toLowerCase();
    if (mapelNameByKode && mapelNameByKode[lower]) {
      return normalizeRawKode(trimmed);
    }

    if (mapelNameByKode) {
      for (const [kode, nama] of Object.entries(mapelNameByKode)) {
        if ((nama || "").trim().toLowerCase() === lower) return normalizeRawKode(kode);
      }
    }

    const normalized = normalizeRawKode(trimmed).replace(/\s+/g, " ");
    if (normalized.includes("TKA ") || normalized.includes("TKA-")) {
      return normalized.replace(/\s+/g, "-");
    }
    if (normalized.includes("SNBT") || normalized.includes("UTBK")) {
      return normalized.replace(/\s+/g, "-");
    }
    return normalized;
  };

  // Get all unique subject codes from all rows (normalize names to kode when possible)
  const allMapelKodes = Array.from(
    new Set(
      rows.flatMap((row) =>
        Object.keys(row.mapelCountByKode).map((k) => getDisplayMapelKode(k, mapelNameByKode))
      )
    )
  )
    .filter(Boolean)
    .sort();

  const getCountColor = (count: number | undefined) => {
    if (!count || count === 0) return "#f0f0f0"; // light gray
    if (count === 1) return "#c8e6c9"; // light green
    if (count === 2) return "#a5d6a7"; // green
    if (count === 3) return "#81c784"; // darker green
    return "#66bb6a"; // darkest green
  };

  const normalizeKode = (value: string) => (value || "").trim().toUpperCase();

  const subjectGroups = [
    {
      label: "UMUM",
      codes: [
        "MTK",
        "FIS",
        "KIM",
        "BIO",
        "EKO",
        "GEO",
        "SEJ",
        "SOS",
        "IND",
        "ING",
        "IPA",
        "IPS",
        "IPAS",
      ],
    },
    {
      label: "SNBT-UTBK",
      codes: ["PU", "PPU", "PBM", "PK", "L.IND", "L.ING", "P.MTK", "L.IPA", "L.IPS"],
    },
    {
      label: "TKA",
      codes: [
        "TKA-MTK",
        "TKA-MTK TL",
        "TKA-MTK W",
        "TKA-FIS",
        "TKA-KIM",
        "TKA-BIO",
        "TKA-EKO",
        "TKA-GEO",
        "TKA-SEJ",
        "TKA-SOS",
        "TKA-IND",
        "TKA-ING",
        "TKA-IND TL",
        "TKA-ING TL",
        "PP",
        "PKWU",
        "ANTRO",
      ],
    },
  ];

  const groups = subjectGroups.map((group) => ({
    label: group.label,
    codes: group.codes,
  }));
  const otherGroup: { label: string; codes: string[] } = { label: "LAINNYA", codes: [] };

  const groupedCodes = new Set<string>();
  for (const group of groups) {
    for (const code of group.codes) {
      groupedCodes.add(normalizeKode(code));
    }
  }

  const ungroupedCodes = allMapelKodes.filter((kode) => !groupedCodes.has(normalizeKode(kode)));
  if (ungroupedCodes.length > 0) {
    otherGroup.codes = ungroupedCodes;
  }

  const visibleGroups = otherGroup.codes.length > 0 ? [...groups, otherGroup] : groups;
  const orderedCodes = visibleGroups.flatMap((group) => group.codes.filter(Boolean));

  return (
    <div className="monitoring-kelas-panel mt-4">
      <div className="monitoring-kelas-header">
        <div>
          <div className="text-uppercase text-muted small mb-1 fw-semibold">📚 Monitoring Kelas</div>
          <div className="h6 mb-0">Ringkasan penggunaan mapel per kelas</div>
        </div>
      </div>

      <div className="monitoring-kelas-table-wrapper">
        <table className="table monitoring-kelas-table">
          <thead>
            <tr>
              <th className="monitoring-kelas-class-header" rowSpan={2}>
                Kelas
              </th>
              {visibleGroups.map((group) => (
                <th
                  key={`group-${group.label}`}
                  className="monitoring-kelas-group-header text-center"
                  colSpan={group.codes.length}
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {visibleGroups.map((group) =>
                group.codes.map((kode) => (
                  <th key={`code-${group.label}-${kode}`} className="monitoring-kelas-subject-header text-center">
                    {kode}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={orderedCodes.length + 1} className="text-center text-muted py-4">
                  Memuat data jadwal...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={orderedCodes.length + 1} className="text-center text-muted py-4">
                  Belum ada data jadwal untuk ditampilkan.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.cabang}-${row.kelas}`}>
                  <td className="monitoring-kelas-class-cell">{row.kelas}</td>
                  {orderedCodes.map((kode) => {
                    const count = (() => {
                      const normalizedKode = normalizeRawKode(kode);

                      if (row.mapelCountByKode[normalizedKode] != null) return row.mapelCountByKode[normalizedKode];

                      for (const [rawKey, val] of Object.entries(row.mapelCountByKode)) {
                        if (getDisplayMapelKode(rawKey, mapelNameByKode) === normalizedKode) return val;
                      }

                      return 0;
                    })();
                    return (
                      <td
                        key={`${row.cabang}-${row.kelas}-${kode}`}
                        className="text-center monitoring-kelas-count-cell"
                        style={{
                          backgroundColor: getCountColor(count),
                          color: count > 1 ? "#ffffff" : "#000000",
                          fontWeight: 700,
                          fontSize: "1rem",
                        }}
                      >
                        {count > 0 ? count : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted small mt-2 px-2" style={{ fontSize: '0.8rem' }}>
        💡 Warna menunjukkan jumlah penggunaan mapel: Abu-abu (0) | Hijau muda (1) | Hijau (2) | Hijau tua (3+)
      </div>
    </div>
  );
}