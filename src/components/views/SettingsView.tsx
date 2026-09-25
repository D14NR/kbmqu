import React, { useState, useEffect } from "react";

type SettingsViewProps = {
  authSession?: { username: string; roll?: string; cabang?: string } | null;
  lastCacheCleanedAt?: string;
  onClearCache: () => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  onChangePassword?: () => void;
  isCheckingUpdates: boolean;
  isClearingCache: boolean;
  theme?: string;
  onThemeChange?: (theme: string) => void;
  compactMode?: boolean;
  onCompactModeChange?: (compact: boolean) => void;
};

const formatDateTime = (value: string | undefined) => {
  if (!value) return "Belum pernah";
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
  authSession,
  lastCacheCleanedAt,
  onClearCache,
  onCheckUpdates,
  onChangePassword,
  isCheckingUpdates,
  isClearingCache,
  theme: propTheme,
  onThemeChange,
  compactMode: propCompactMode,
  onCompactModeChange,
}: SettingsViewProps) {
  const [internalTheme, setInternalTheme] = useState(() => localStorage.getItem("app-theme") || "light");
  const [notifications, setNotifications] = useState(() => localStorage.getItem("app-notifications") !== "false");
  const [internalCompactMode, setInternalCompactMode] = useState(() => localStorage.getItem("app-compact-mode") === "true");

  const theme = propTheme !== undefined ? propTheme : internalTheme;
  const compactMode = propCompactMode !== undefined ? propCompactMode : internalCompactMode;

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setInternalTheme(newTheme);
    localStorage.setItem("app-theme", newTheme);
    document.documentElement.setAttribute("data-bs-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark-mode");
    }
    onThemeChange?.(newTheme);
  };

  const handleNotificationsChange = (val: boolean) => {
    setNotifications(val);
    localStorage.setItem("app-notifications", String(val));
  };

  const handleCompactModeChange = (val: boolean) => {
    setInternalCompactMode(val);
    localStorage.setItem("app-compact-mode", String(val));
    if (val) {
      document.body.classList.add("compact-mode");
      document.documentElement.classList.add("compact-mode");
    } else {
      document.body.classList.remove("compact-mode");
      document.documentElement.classList.remove("compact-mode");
    }
    onCompactModeChange?.(val);
  };

  return (
    <div className="d-flex flex-column gap-4 mt-2" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div>
        <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
          <i className="bi bi-gear-fill text-primary" />
          Pengaturan Sistem
        </h4>
        <p className="text-muted text-sm mb-0">Kelola preferensi aplikasi, personalisasi, dan pemeliharaan sistem.</p>
      </div>

      <div className="row g-4">
        {/* Left Column: Personalization & Preferences & Security */}
        <div className="col-12 col-lg-7 d-flex flex-column gap-4">
          
          {/* Keamanan & Password Akun */}
          {authSession && (
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="card-header bg-white border-bottom p-3 px-4">
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock-fill text-primary" />
                  Keamanan Akun & Kata Sandi
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 p-3 bg-light rounded-3 border">
                  <div className="d-flex align-items-center gap-2.5 min-w-0">
                    <div
                      className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center text-xs flex-shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      {authSession.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="fw-semibold text-dark text-sm text-truncate">{authSession.username}</div>
                      <div className="text-muted text-xs text-truncate">
                        {authSession.cabang ? `Cabang ${authSession.cabang}` : authSession.roll ? `Role: ${authSession.roll}` : "Akun Aktif"}
                      </div>
                    </div>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill text-xs px-2.5 py-1">
                    Aktif
                  </span>
                </div>

                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold text-dark text-sm">Ganti Password</div>
                    <div className="text-muted text-xs">Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan.</div>
                  </div>
                  {onChangePassword && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-2 flex-shrink-0 fw-medium shadow-xs"
                      onClick={onChangePassword}
                    >
                      <i className="bi bi-key-fill" />
                      Ubah Password
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Akun & Tampilan */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-palette" />
                Personalisasi & Tampilan
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                
                {/* Theme Setting */}
                <div className="list-group-item p-4 border-bottom-0 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold text-dark text-sm">Tema Aplikasi</div>
                    <div className="text-muted text-xs">Pilih mode tampilan terang atau gelap.</div>
                  </div>
                  <div className="btn-group bg-light rounded-pill p-1 border">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 border-0 ${theme === "light" ? "btn-white shadow-sm fw-bold text-primary" : "text-muted"}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      <i className="bi bi-sun me-1" /> Terang
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 border-0 ${theme === "dark" ? "btn-dark shadow-sm fw-bold text-white" : "text-muted"}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      <i className="bi bi-moon-stars me-1" /> Gelap
                    </button>
                  </div>
                </div>

                <hr className="m-0 text-light" />

                {/* Compact Mode */}
                <div className="list-group-item p-4 border-bottom-0 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold text-dark text-sm">Mode Kompak</div>
                    <div className="text-muted text-xs">Perkecil ukuran font dan spasi pada tabel data.</div>
                  </div>
                  <div className="form-check form-switch fs-5 mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={compactMode}
                      onChange={(e) => handleCompactModeChange(e.target.checked)}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Notifikasi */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-bell" />
                Notifikasi
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                <div className="list-group-item p-4 border-bottom-0 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold text-dark text-sm">Pemberitahuan Sistem</div>
                    <div className="text-muted text-xs">Aktifkan notifikasi untuk jadwal mengajar dan update izin.</div>
                  </div>
                  <div className="form-check form-switch fs-5 mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={notifications}
                      onChange={(e) => handleNotificationsChange(e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: System & Maintenance */}
        <div className="col-12 col-lg-5 d-flex flex-column gap-4">
          
          {/* Status System */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-primary text-white">
            <div className="card-body p-4">
               <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="fw-semibold text-white-50 text-uppercase text-xs tracking-wider">Status Sistem</div>
                  {isOnline ? (
                     <span className="badge bg-success bg-opacity-25 text-white border border-success border-opacity-50 px-2 py-1 rounded-pill d-flex align-items-center gap-1 text-xs">
                        <span className="spinner-grow spinner-grow-sm text-success" style={{width: 8, height: 8}} /> Online
                     </span>
                  ) : (
                     <span className="badge bg-danger bg-opacity-25 text-white border border-danger border-opacity-50 px-2 py-1 rounded-pill d-flex align-items-center gap-1 text-xs">
                        <i className="bi bi-wifi-off" /> Offline
                     </span>
                  )}
               </div>
               
               <h4 className="fw-bold mb-1">Versi 1.3.5</h4>
               <p className="text-white-50 text-sm mb-4">Sistem berjalan dengan baik.</p>

               <button
                  type="button"
                  className="btn btn-light btn-sm fw-semibold w-100 rounded-3 shadow-sm py-2 d-flex align-items-center justify-content-center gap-2"
                  onClick={onCheckUpdates}
                  disabled={isCheckingUpdates || !isOnline}
                >
                  {isCheckingUpdates ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Memeriksa...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-down-fill text-primary" />
                      Periksa Pembaruan
                    </>
                  )}
                </button>
            </div>
          </div>

          {/* Maintenance */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header bg-white border-bottom p-3 px-4">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-tools" />
                Pemeliharaan
              </h6>
            </div>
            <div className="card-body p-4">
               
               <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0 mt-1" style={{ width: 40, height: 40 }}>
                     <i className="bi bi-hdd-fill" />
                  </div>
                  <div>
                     <div className="fw-semibold text-dark text-sm">Cache Aplikasi</div>
                     <div className="text-muted text-xs mb-2">Terakhir dibersihkan: <br/><strong className="text-dark">{formatDateTime(lastCacheCleanedAt)}</strong></div>
                     <p className="text-muted text-xxs mb-2">
                        Pembersihan cache berguna untuk memperbaiki kendala sinkronisasi dan membebaskan ruang penyimpanan lokal.
                     </p>
                  </div>
               </div>

               <button 
                  type="button" 
                  className="btn btn-outline-danger btn-sm w-100 fw-semibold rounded-3 py-2 d-flex justify-content-center align-items-center gap-2" 
                  onClick={onClearCache} 
                  disabled={isClearingCache}
               >
                  {isClearingCache ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Membersihkan Cache...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash3-fill" />
                      Bersihkan Cache Sekarang
                    </>
                  )}
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
