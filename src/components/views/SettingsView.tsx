type SettingsViewProps = {
  lastCacheCleanedAt?: string;
  onClearCache: () => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  isCheckingUpdates: boolean;
  isClearingCache: boolean;
};

const formatDateTime = (value: string | undefined) => {
  if (!value) return "-";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function SettingsView({
  lastCacheCleanedAt,
  onClearCache,
  onCheckUpdates,
  isCheckingUpdates,
  isClearingCache,
}: SettingsViewProps) {
  return (
    <div>
      <h3>Pengaturan Aplikasi</h3>

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="mb-3">Informasi Aplikasi</h5>
          <div className="mb-2">
            <span className="fw-semibold">Status koneksi:</span> {navigator.onLine ? "Online" : "Offline"}
          </div>
          <div className="mb-2">
            <span className="fw-semibold">Terakhir bersih cache:</span> {formatDateTime(lastCacheCleanedAt)}
          </div>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCheckUpdates}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Memeriksa...
                </>
              ) : (
                "Periksa Pembaruan Aplikasi"
              )}
            </button>
            <button type="button" className="btn btn-outline-danger" onClick={onClearCache} disabled={isClearingCache}>
              {isClearingCache ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Membersihkan...
                </>
              ) : (
                "Bersihkan Cache Sekarang"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="mb-3">Fitur Lainnya</h5>
          <div className="alert alert-info">
            Fitur tambahan akan ditambahkan di sini. Contoh: reset tampilan, konfigurasi notifikasi, dan preferensi lainnya.
          </div>
          <ul className="list-unstyled">
            <li className="mb-2">
              <i className="bi bi-check-circle-fill text-success me-2" />
              Tersedia pemeriksaan pembaruan.
            </li>
            <li className="mb-2">
              <i className="bi bi-check-circle-fill text-success me-2" />
              Pembersihan cache lokal otomatis dan manual.
            </li>
            <li>
              <i className="bi bi-info-circle-fill text-secondary me-2" />
              Fitur tambahan bisa ditambahkan sesuai kebutuhan.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
