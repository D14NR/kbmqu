type HapusJadwalViewProps = {
  scheduleType: "bulanIni" | "jadwalTambahanPelayanan";
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonthKey: string;
  deleting: boolean;
  onTypeChange: (value: "bulanIni" | "jadwalTambahanPelayanan") => void;
  onMonthChange: (value: string) => void;
  onDelete: () => void;
};

export function HapusJadwalView({
  scheduleType,
  monthOptions,
  selectedMonthKey,
  deleting,
  onTypeChange,
  onMonthChange,
  onDelete,
}: HapusJadwalViewProps) {
  return (
    <div className="py-4" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="mb-4">
        <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-trash3-fill text-danger" />
          Penghapusan Jadwal
        </h4>
        <p className="text-muted text-sm mb-0">Hapus data jadwal per bulan secara massal. Aksi ini tidak dapat dibatalkan.</p>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 border-top border-danger border-3">
        <div className="card-body p-4 p-md-5 bg-white">
          <div className="row g-4 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold text-dark small d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-list-task text-primary" />
                Pilih Jenis Jadwal
              </label>
              <select
                className="form-select bg-light border-0 shadow-none px-3 py-2 text-sm"
                value={scheduleType}
                onChange={(event) => onTypeChange(event.target.value as "bulanIni" | "jadwalTambahanPelayanan")}
              >
                <option value="bulanIni">Jadwal Reguler</option>
                <option value="jadwalTambahanPelayanan">Jadwal Tambahan & Pelayanan</option>
              </select>
            </div>
            
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold text-dark small d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-calendar-event text-primary" />
                Pilih Bulan
              </label>
              <select
                className="form-select bg-light border-0 shadow-none px-3 py-2 text-sm"
                value={selectedMonthKey}
                onChange={(event) => onMonthChange(event.target.value)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-12 mt-5 text-end border-top pt-4">
              <button 
                type="button" 
                className="btn btn-danger px-4 py-2 fw-medium shadow-sm d-inline-flex align-items-center justify-content-center gap-2" 
                onClick={onDelete} 
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Memproses Penghapusan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-exclamation-triangle-fill" />
                    Hapus Data Permanen
                  </>
                )}
              </button>
            </div>
          </div>

          {deleting && (
            <div className="mt-4 pt-3">
              <div className="progress rounded-pill bg-danger bg-opacity-10" style={{ height: 6 }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated bg-danger" style={{ width: "100%" }} />
              </div>
              <div className="text-danger small mt-2 fw-medium d-flex flex-column align-items-center gap-1 text-center">
                <div className="d-flex justify-content-center gap-2 align-items-center">
                  <span className="spinner-grow spinner-grow-sm" style={{ width: 10, height: 10 }} />
                  Sedang menghapus {scheduleType === "bulanIni" ? "Jadwal Reguler" : "Jadwal Tambahan & Pelayanan"} untuk {monthOptions.find((opt) => opt.value === selectedMonthKey)?.label || selectedMonthKey}...
                </div>
                <span className="text-muted text-xxs">Mohon tunggu, sedang menyinkronkan data. Jangan tutup halaman ini.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="alert alert-warning border-0 shadow-sm rounded-4 d-flex align-items-start gap-3 p-4" role="alert">
        <i className="bi bi-info-circle-fill fs-4 text-warning" />
        <div>
          <h6 className="fw-bold mb-1 text-dark">Informasi Penting</h6>
          <p className="mb-0 text-sm text-dark opacity-75">
            Penghapusan dilakukan berdasarkan jenis jadwal dan bulan yang dipilih. Jadwal yang dihapus akan otomatis terhapus dari sinkronisasi <strong>Surat Tugas Mengajar</strong> dan halaman utama. Pastikan Anda memilih bulan yang tepat sebelum menghapus.
          </p>
        </div>
      </div>
    </div>
  );
}
