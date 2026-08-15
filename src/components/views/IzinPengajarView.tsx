type IzinPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
  canManageRecord?: (record: Record<string, string>) => boolean;
};

const izinHeaders = [
  "Kode Pengajar",
  "Nama Pengajar",
  "Domisili",
  "Cabang Target",
  "Tanggal Mulai",
  "Tanggal Selesai",
  "Keterangan",
  "Keterangan Status",
  "Diputuskan Oleh",
  "Diputuskan Pada",
];

export function IzinPengajarView({
  loading,
  records,
  onAdd,
  onEdit,
  onDelete,
  canManageRecord,
}: IzinPengajarViewProps) {
  return (
    <>
      <div className="d-flex justify-content-end mb-3 mt-4">
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-primary btn-sm d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-lg" />
          Tambah Izin
        </button>
      </div>

      <div className="table-responsive border rounded table-sticky-wrapper">
        <table className="table table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th className="text-center" style={{ width: 90 }}>
                Aksi
              </th>
              {izinHeaders.map((header) => (
                <th key={header} className="text-center text-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={izinHeaders.length + 1} className="text-center text-muted py-4">
                  Memuat data izin pengajar...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={izinHeaders.length + 1} className="text-center text-muted py-4">
                  Belum ada data izin pengajar.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={`izin-${record._id || index}`}>
                  <td className="text-center">
                    {canManageRecord && canManageRecord(record) ? (
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="btn btn-outline-secondary btn-sm btn-icon"
                          aria-label="Edit izin"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record)}
                          className="btn btn-outline-danger btn-sm btn-icon"
                          aria-label="Hapus izin"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  {izinHeaders.map((header) => (
                    <td key={`${record._id || index}-${header}`}>{record[header] || "-"}</td>
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