type PengajarTableViewProps = {
  headers: string[];
  loading: boolean;
  records: Record<string, string>[];
  query: string;
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
};

export function PengajarTableView({
  headers,
  loading,
  records,
  query,
  onAdd,
  onEdit,
  onDelete,
}: PengajarTableViewProps) {
  const visibleHeaders = headers.length > 0 ? headers : ["Data"];
  const filteredRecords = records.filter(
    (record) => !query || Object.values(record).some((value) => value.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <>
      <div className="d-flex justify-content-end mb-3 mt-4">
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-primary btn-sm d-flex align-items-center gap-2"
          aria-label="Tambah pengajar"
        >
          <i className="bi bi-plus-lg" />
          Tambah Data
        </button>
      </div>
      <div className="table-responsive border rounded table-sticky-wrapper">
        <table className="table table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th className="text-center" style={{ width: 100 }}>
                Aksi
              </th>
              {visibleHeaders.map((header) => (
                <th key={header} className="text-center text-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleHeaders.length + 1} className="text-center text-muted py-4">
                  Memuat data pengajar...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={visibleHeaders.length + 1} className="text-center text-muted py-4">
                  Belum ada data pengajar.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <tr key={`pengajar-${index}`}>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        className="btn btn-outline-secondary btn-sm btn-icon"
                        aria-label="Edit pengajar"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(record)}
                        className="btn btn-outline-danger btn-sm btn-icon"
                        aria-label="Hapus pengajar"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                  {visibleHeaders.map((header) => (
                    <td key={`${index}-${header}`}>{record[header] ?? ""}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}