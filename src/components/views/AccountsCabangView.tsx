type AccountsCabangViewProps = {
  headers: string[];
  loading: boolean;
  records: Record<string, string>[];
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
};

export function AccountsCabangView({
  headers,
  loading,
  records,
  onAdd,
  onEdit,
  onDelete,
}: AccountsCabangViewProps) {
  const visibleHeaders = headers.length > 0 ? headers : ["Data"];

  // Hitung jumlah cabang unik dan total akun
  const totalAccounts = records.length;
  const uniqueCabang = new Set(records.map(r => r.Cabang || r.cabang || "").filter(Boolean)).size;

  return (
    <div className="py-2">
      {/* Header & Stats Bento */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-5">
           <div>
             <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
               <i className="bi bi-people-fill text-primary" />
               Akun Cabang
             </h4>
             <p className="text-muted text-sm mb-0">Kelola daftar akses login untuk setiap cabang operasional.</p>
           </div>
        </div>
        <div className="col-12 col-md-7 d-flex flex-wrap gap-3 justify-content-md-end">
           <div className="bg-white border rounded-4 p-3 shadow-sm d-flex align-items-center gap-3 flex-fill flex-md-grow-0" style={{ minWidth: 160 }}>
              <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44 }}>
                 <i className="bi bi-person-vcard fs-5" />
              </div>
              <div>
                 <div className="text-xs text-muted fw-semibold text-uppercase">Total Akun</div>
                 <div className="fs-5 fw-bold text-dark">{totalAccounts}</div>
              </div>
           </div>
           <div className="bg-white border rounded-4 p-3 shadow-sm d-flex align-items-center gap-3 flex-fill flex-md-grow-0" style={{ minWidth: 160 }}>
              <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44 }}>
                 <i className="bi bi-buildings fs-5" />
              </div>
              <div>
                 <div className="text-xs text-muted fw-semibold text-uppercase">Cabang Terdaftar</div>
                 <div className="fs-5 fw-bold text-dark">{uniqueCabang}</div>
              </div>
           </div>
           
           <button
             type="button"
             onClick={onAdd}
             className="btn btn-primary d-flex align-items-center gap-2 shadow-sm rounded-4 px-4 fw-medium flex-fill flex-md-grow-0"
           >
             <i className="bi bi-plus-lg" />
             Tambah Akun
           </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-4 pb-3 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-list-columns-reverse text-primary" />
            Daftar Akses
          </h6>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark border px-2 py-1 d-flex align-items-center gap-1 text-xs">
              <i className="bi bi-info-circle text-muted" /> {totalAccounts} Data
            </span>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive table-sticky-wrapper" style={{ maxHeight: '65vh' }}>
            <table className="table table-hover align-middle mb-0 table-sticky">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3 text-muted fw-semibold text-xs text-uppercase text-center" style={{ width: 100 }}>
                    Aksi
                  </th>
                  {visibleHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 text-muted fw-semibold text-xs text-uppercase text-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleHeaders.length + 1} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center gap-3 text-muted">
                        <div className="spinner-border text-primary" role="status" />
                        <span>Memuat data akun cabang...</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={visibleHeaders.length + 1} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center gap-3 text-muted">
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{width: 60, height: 60}}>
                          <i className="bi bi-person-slash fs-2 text-secondary" />
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">Belum ada data akun</div>
                          <div className="text-sm">Klik tombol "Tambah Akun" untuk membuat akses baru.</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr key={`accounts-cabang-${index}`}>
                      <td className="px-3 py-3 text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="btn btn-outline-secondary btn-sm btn-icon rounded-3 shadow-sm"
                            aria-label="Edit akun cabang"
                            title="Edit"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(record)}
                            className="btn btn-outline-danger btn-sm btn-icon rounded-3 shadow-sm"
                            aria-label="Hapus akun cabang"
                            title="Hapus"
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </td>
                      {visibleHeaders.map((header) => {
                        const val = record[header] ?? "";
                        
                        // Formatting khusus untuk kolom tertentu agar lebih modern
                        if (header.toLowerCase() === 'cabang') {
                          return (
                            <td key={`${index}-${header}`} className="px-4 py-3">
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-medium d-inline-flex align-items-center gap-1">
                                <i className="bi bi-geo-alt-fill text-xs" />
                                {val || "-"}
                              </span>
                            </td>
                          );
                        }
                        
                        if (header.toLowerCase() === 'roll') {
                           return (
                             <td key={`${index}-${header}`} className="px-4 py-3">
                               <span className={`badge ${val.toLowerCase() === 'admin' ? 'bg-danger text-white' : 'bg-secondary text-white'} px-2 py-1 rounded-pill fw-medium text-xs`}>
                                 {val || "-"}
                               </span>
                             </td>
                           );
                        }

                        if (header.toLowerCase() === 'password') {
                          return (
                            <td key={`${index}-${header}`} className="px-4 py-3">
                              <span className="text-muted font-monospace text-xs tracking-wider">••••••••</span>
                            </td>
                          );
                        }
                        
                        // Default rendering
                        return (
                          <td key={`${index}-${header}`} className="px-4 py-3 text-dark fw-medium text-sm">
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
