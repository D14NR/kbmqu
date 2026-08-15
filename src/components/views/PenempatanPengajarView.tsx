type PenempatanPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  query: string;
};

const placementHeaders = [
  { key: "Kode Pengajar", label: "Kode Pengajar" },
  { key: "Nama Pengajar", label: "Nama Pengajar" },
  { key: "Domisili", label: "Domisili" },
  { key: "Hari", label: "Hari" },
  { key: "Jam Mulai", label: "Jam Mulai" },
  { key: "Jam Selesai", label: "Jam Selesai" },
  { key: "Cabang Penempatan", label: "Bersedia Mengajar di Cabang" },
];

export function PenempatanPengajarView({
  loading,
  records,
  query,
}: PenempatanPengajarViewProps) {
  const lowered = query.trim().toLowerCase();
  const filtered = !lowered
    ? records
    : records.filter((record) =>
        placementHeaders.some((header) => (record[header.key] || "").toLowerCase().includes(lowered))
      );

  return (
    <div className="table-responsive border rounded table-sticky-wrapper">
      <table className="table table-bordered align-middle mb-0 table-sticky">
        <thead className="table-light">
          <tr>
            {placementHeaders.map((header) => (
              <th key={header.key} className="text-center text-nowrap">
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={placementHeaders.length} className="text-center text-muted py-4">
                Memuat data penempatan pengajar...
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={placementHeaders.length} className="text-center text-muted py-4">
                Belum ada data penempatan pengajar.
              </td>
            </tr>
          ) : (
            filtered.map((record, index) => (
              <tr key={`penempatan-${index}`}>
                {placementHeaders.map((header) => (
                  <td key={`${index}-${header.key}`}>{record[header.key] || "-"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}