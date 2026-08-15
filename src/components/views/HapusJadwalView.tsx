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
    <div className="py-3">
      <div className="row g-3 align-items-end">
        <div className="col-12 col-md-5 col-lg-4">
          <label className="form-label mb-1">Jenis Jadwal</label>
          <select
            className="form-select"
            value={scheduleType}
            onChange={(event) => onTypeChange(event.target.value as "bulanIni" | "jadwalTambahanPelayanan")}
          >
            <option value="bulanIni">Jadwal Reguler</option>
            <option value="jadwalTambahanPelayanan">Jadwal Tambahan & Pelayanan</option>
          </select>
        </div>
        <div className="col-12 col-md-5 col-lg-4">
          <label className="form-label mb-1">Bulan Jadwal</label>
          <select
            className="form-select"
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
        <div className="col-12 col-md-2 col-lg-4 d-grid d-md-flex justify-content-md-start">
          <button type="button" className="btn btn-danger" onClick={onDelete} disabled={deleting}>
            {deleting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Menghapus...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-2" />
                Hapus Data Jadwal
              </>
            )}
          </button>
        </div>
      </div>
      {deleting && (
        <div className="mt-3">
          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: "100%" }} />
          </div>
          <div className="text-muted small mt-2">Sedang menghapus jadwal dan menyinkronkan hasilnya. Mohon tunggu.</div>
        </div>
      )}
      <div className="alert alert-warning mt-3 mb-0 py-2" role="alert">
        Penghapusan berdasarkan jenis jadwal dan bulan. Data yang dihapus akan ikut diperbarui di Surat Tugas Mengajar.
      </div>
    </div>
  );
}