type PermintaanPengajarViewProps = {
  loading: boolean;
  records: Record<string, string>[];
  query: string;
  isAdmin: boolean;
  userCabang: string;
  onAdd: () => void;
  onDelete: (record: Record<string, string>) => void;
  onApprove: (record: Record<string, string>) => void;
  onReject: (record: Record<string, string>) => void;
};

const tableHeaders = [
  "Kode Pengajar",
  "Nama Pengajar",
  "Dari Cabang",
  "Cabang Peminta",
  "Tanggal Diminta",
  "Jam Mulai",
  "Jam Selesai",
  "Status",
  "Catatan",
];

const normalizeText = (value: string) => value.trim().toLowerCase();

export function PermintaanPengajarView({
  loading,
  records,
  query,
  isAdmin,
  userCabang,
  onAdd,
  onDelete,
  onApprove,
  onReject,
}: PermintaanPengajarViewProps) {
  const lowered = query.trim().toLowerCase();
  const filtered = !lowered
    ? records
    : records.filter((record) =>
        tableHeaders.some((header) => (record[header] || "").toLowerCase().includes(lowered))
      );

  const canProcess = (record: Record<string, string>) => {
    if (isAdmin) {
      return true;
    }
    // Only the dari_cabang (teacher's home branch) can approve/reject
    return normalizeText(record["Dari Cabang"] || "") === normalizeText(userCabang);
  };

  const canDelete = (record: Record<string, string>) => {
    if (isAdmin) {
      return true;
    }
    const userCabangKey = normalizeText(userCabang);
    // Only cabang_peminta (requesting branch) can delete their own requests
    const cabangPemintaKey = normalizeText(record["Cabang Peminta"] || "");
    return cabangPemintaKey === userCabangKey;
  };

  const statusBadge = (status: string) => {
    const normalized = normalizeText(status);
    if (normalized === "disetujui") {
      return "bg-success-subtle text-success-emphasis";
    }
    if (normalized === "ditolak") {
      return "bg-danger-subtle text-danger-emphasis";
    }
    return "bg-warning-subtle text-warning-emphasis";
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3 mt-4">
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-primary btn-sm d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-lg" />
          Buat Permintaan
        </button>
      </div>

      <div className="table-responsive border rounded table-sticky-wrapper">
        <table className="table table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th className="text-center" style={{ width: 150 }}>
                Aksi
              </th>
              {tableHeaders.map((header) => (
                <th key={header} className="text-center text-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tableHeaders.length + 1} className="text-center text-muted py-4">
                  Memuat data permintaan pengajar...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length + 1} className="text-center text-muted py-4">
                  Belum ada permintaan pengajar antar cabang.
                </td>
              </tr>
            ) : (
              filtered.map((record, index) => {
                const status = record.Status || "Menunggu";
                const pending = normalizeText(status) === "menunggu";
                return (
                  <tr key={`permintaan-${record.ID || index}`}>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1 flex-wrap">
                        {pending && canProcess(record) && (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => onApprove(record)}
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => onReject(record)}
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {canDelete(record) && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDelete(record)}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{record["Kode Pengajar"] || "-"}</td>
                    <td>{record["Nama Pengajar"] || "-"}</td>
                    <td>{record["Dari Cabang"] || "-"}</td>
                    <td>{record["Cabang Peminta"] || "-"}</td>
                    <td>{record["Tanggal Diminta"] || "-"}</td>
                    <td>{record["Jam Mulai"] || "-"}</td>
                    <td>{record["Jam Selesai"] || "-"}</td>
                    <td className="text-center">
                      <span className={`badge ${statusBadge(status)}`}>{status}</span>
                    </td>
                    <td>{record.Catatan || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}