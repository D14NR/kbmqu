import React, { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

// Durasi tampil otomatis sebelum di-hidden: 2.5 menit (150 detik)
const AUTO_HIDE_SECONDS = 150;

type DonationAccount = {
  id: string;
  name: string;
  account: string;
  recipient: string;
  badgeColor: string;
  icon: string;
  type: string;
  nominal?: number;
};

const DEFAULT_ACCOUNTS: DonationAccount[] = [
  {
    id: "jago",
    name: "Bank Jago",
    account: "109760181905",
    recipient: "Dian Rizki Sofiawan",
    badgeColor: "bg-warning-subtle text-dark border border-warning",
    icon: "bi-bank2",
    type: "Nomor Rekening",
  },
  {
    id: "paypal",
    name: "PayPal",
    account: "dianrizkisofiawan9@gmail.com",
    recipient: "Dian Rizki Sofiawan",
    badgeColor: "bg-primary-subtle text-primary border border-primary-subtle",
    icon: "bi-paypal",
    type: "Email Akun",
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    account: "08999990431",
    recipient: "Dian Rizki Sofiawan",
    badgeColor: "bg-danger-subtle text-danger border border-danger-subtle",
    icon: "bi-wallet2",
    type: "Nomor HP / Akun",
  },
];

const getBankBadgeColor = (bankName: string) => {
  const lower = (bankName || "").toLowerCase();
  if (lower.includes("jago")) return "bg-warning-subtle text-dark border border-warning";
  if (lower.includes("paypal")) return "bg-primary-subtle text-primary border border-primary-subtle";
  if (lower.includes("shopee")) return "bg-danger-subtle text-danger border border-danger-subtle";
  if (lower.includes("bca")) return "bg-info-subtle text-info-emphasis border border-info-subtle";
  if (lower.includes("mandiri")) return "bg-warning-subtle text-dark border border-warning-subtle";
  if (lower.includes("bri")) return "bg-primary-subtle text-dark border border-primary-subtle";
  if (lower.includes("dana")) return "bg-info-subtle text-info-emphasis border border-info";
  return "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
};

const getBankIcon = (bankName: string) => {
  const lower = (bankName || "").toLowerCase();
  if (lower.includes("paypal")) return "bi-paypal";
  if (lower.includes("shopee") || lower.includes("dana") || lower.includes("gopay")) return "bi-wallet2";
  return "bi-bank2";
};

const getAccountType = (bankName: string, account: string) => {
  const lower = (bankName || "").toLowerCase();
  if (lower.includes("paypal") || account.includes("@")) return "Email Akun";
  if (lower.includes("shopee") || lower.includes("dana") || lower.includes("gopay") || account.startsWith("08")) return "Nomor HP / Akun";
  return "Nomor Rekening";
};

export function DatabaseMaintenanceBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      // Periksa apakah user sudah pernah menutup manual pada sesi ini
      const manualHidden = sessionStorage.getItem("database_banner_manual_hidden");
      if (manualHidden === "true") {
        return 0;
      }
      const startTimeStr = sessionStorage.getItem("database_banner_start_time");
      if (!startTimeStr) {
        const now = Date.now();
        sessionStorage.setItem("database_banner_start_time", now.toString());
        return AUTO_HIDE_SECONDS;
      }
      const elapsed = Math.floor((Date.now() - parseInt(startTimeStr, 10)) / 1000);
      const remaining = AUTO_HIDE_SECONDS - elapsed;
      return remaining > 0 ? remaining : 0;
    } catch {
      return AUTO_HIDE_SECONDS;
    }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isHidden = timeLeft <= 0;

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          try {
            sessionStorage.setItem("database_banner_manual_hidden", "true");
          } catch (e) {
            console.error(e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleHide = () => {
    setTimeLeft(0);
    try {
      sessionStorage.setItem("database_banner_manual_hidden", "true");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestore = () => {
    const now = Date.now();
    try {
      sessionStorage.removeItem("database_banner_manual_hidden");
      sessionStorage.setItem("database_banner_start_time", now.toString());
    } catch (e) {
      console.error(e);
    }
    setTimeLeft(AUTO_HIDE_SECONDS);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Gagal menyalin teks", err);
      }
      document.body.removeChild(textArea);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const [dynamicAccounts, setDynamicAccounts] = useState<DonationAccount[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDonationAccounts() {
      try {
        const res = await apiFetch<any>("/db/donasi");
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped: DonationAccount[] = list.map((item: any) => ({
            id: item.id || `acc-${Math.random()}`,
            name: item.nama_bank || "Bank",
            account: item.alamat_rekening || "",
            recipient: item.nama_pemilik || "",
            badgeColor: getBankBadgeColor(item.nama_bank),
            icon: getBankIcon(item.nama_bank),
            type: getAccountType(item.nama_bank, item.alamat_rekening),
            nominal: Number(item.nominal_terkumpul) || 0,
          }));
          setDynamicAccounts(mapped);
        }
      } catch {
        // Fallback to default accounts
      }
    }
    loadDonationAccounts();
    return () => {
      isMounted = false;
    };
  }, [isModalOpen]);

  const donationAccounts = dynamicAccounts.length > 0 ? dynamicAccounts : DEFAULT_ACCOUNTS;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <>
      {/* Jika Di-Hidden (otomatis setelah 2-3 menit atau klik tombol Hidden), HANYA TAMPILKAN ICON LOVE SAJA */}
      {isHidden ? (
        <div
          id="database-maintenance-love-icon"
          className="position-fixed"
          style={{
            bottom: "24px",
            right: "24px",
            zIndex: 1040,
          }}
        >
          <button
            type="button"
            className="btn btn-warning rounded-circle shadow-lg p-0 d-flex align-items-center justify-content-center border border-2 border-white"
            style={{
              width: "50px",
              height: "50px",
              boxShadow: "0 8px 20px rgba(245, 158, 11, 0.45)",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onClick={() => setIsModalOpen(true)}
            title="Donasi Pemeliharaan Database (Klik untuk rincian)"
            aria-label="Donasi Pemeliharaan Database"
          >
            <i className="bi bi-heart-fill text-danger fs-5" />
          </button>
        </div>
      ) : (
        /* Top Banner Container (Tampil otomatis selama 2-3 menit) */
        <div
          id="database-maintenance-banner"
          className="w-100 position-relative border-bottom shadow-sm"
          style={{
            background: "linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)",
            borderColor: "#fde68a",
            zIndex: 1020,
          }}
        >
          <div className="container-fluid px-3 px-md-4 py-2">
            <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2.5">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                  style={{ width: 36, height: 36 }}
                >
                  <i className="bi bi-database-fill-gear fs-6" />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="badge bg-warning text-dark border border-warning-subtle fw-bold rounded-pill px-2 py-0.5 text-xxs">
                      PENGUMUMAN KHUSUS
                    </span>
                    <h6 className="mb-0 fw-bold text-dark text-sm">
                      Mohon Bantuannya untuk Pemeliharaan Database prabayar
                    </h6>
                    <span
                      className="badge bg-white text-secondary border border-warning-subtle rounded-pill px-2 py-0.5 text-xxs d-inline-flex align-items-center gap-1"
                      title="Banner ini akan otomatis tersembunyi menjadi ikon Love setelah waktu hitung mundur habis"
                    >
                      <i className="bi bi-clock-history text-warning-emphasis" />
                      <span>Auto-hidden {formatCountdown(timeLeft)}</span>
                    </span>
                  </div>
                  <p className="mb-0 text-secondary text-xs mt-0.5">
                    Sistem aplikasi ini beroperasi menggunakan layanan database Cloudflare prabayar. Bantuan dan partisipasi sukarela Anda sangat berharga demi kelancaran operasional bersama.
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 ms-md-auto flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-warning btn-sm fw-bold text-dark px-3 py-1 rounded-3 shadow-sm d-flex align-items-center gap-1.5"
                  onClick={() => setIsModalOpen(true)}
                  title="Buka Informasi Donasi"
                >
                  <i className="bi bi-heart-fill text-danger" />
                  <span>Donasi</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-1 d-flex align-items-center gap-1"
                  onClick={handleHide}
                  title="Sembunyikan banner sekarang (Hanya tampilkan icon Love)"
                  aria-label="Sembunyikan banner"
                >
                  <i className="bi bi-eye-slash" />
                  <span>Hidden</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Donasi Pemeliharaan Database */}
      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Header */}
              <div className="modal-header bg-warning-subtle text-dark border-bottom border-warning-subtle py-3 px-4">
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    className="d-flex align-items-center justify-content-center bg-warning text-dark rounded-circle shadow-sm"
                    style={{ width: 42, height: 42 }}
                  >
                    <i className="bi bi-heart-fill text-danger fs-5" />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0 text-dark">
                      Donasi Pemeliharaan Database
                    </h5>
                    <div className="text-muted text-xs">
                      Dukungan Operasional Cloudflare Prabayar
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsModalOpen(false)}
                />
              </div>

              {/* Body */}
              <div className="modal-body p-4" style={{ maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
                <div className="d-flex flex-column gap-3">
                  {/* Alert Message */}
                  <div className="alert alert-warning border border-warning-subtle d-flex align-items-start gap-2.5 p-3 rounded-3 mb-0">
                    <i className="bi bi-info-circle-fill text-warning-emphasis fs-5 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-dark">
                      <strong>Mohon Bantuannya untuk Pemeliharaan Database prabayar.</strong>
                      <br />
                      Database Cloudflare yang digunakan aplikasi beroperasi dengan sistem kuota prabayar untuk pembacaan, penyimpanan, dan sinkronisasi data antar cabang secara real-time. Donasi sukarela Anda sangat membantu menjaga kelangsungan operasional sistem.
                    </div>
                  </div>

                  {/* Rekening & Saluran Donasi */}
                  <div>
                    <h6 className="fw-bold text-dark text-sm mb-2.5 d-flex align-items-center gap-2">
                      <i className="bi bi-wallet2 text-warning-emphasis" />
                      Pilihan Saluran Donasi
                    </h6>

                    <div className="row g-2.5">
                      {donationAccounts.map((item) => {
                        const isCopied = copiedKey === item.id;
                        return (
                          <div key={item.id} className="col-12 col-md-4">
                            <div className="card h-100 border rounded-3 p-3 shadow-none bg-white d-flex flex-column justify-content-between">
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <span className={`badge ${item.badgeColor} rounded-pill px-2.5 py-1 text-xxs fw-semibold d-inline-flex align-items-center gap-1`}>
                                    <i className={`bi ${item.icon}`} />
                                    {item.name}
                                  </span>
                                  <span className="text-muted text-xxs">{item.type}</span>
                                </div>

                                <div className="bg-light p-2 rounded-2 border text-center my-2">
                                  <div className="fw-bold text-dark text-sm font-monospace select-all text-break">
                                    {item.account}
                                  </div>
                                  {item.recipient && (
                                    <div className="text-muted text-xxs mt-0.5 text-truncate">
                                      a.n. {item.recipient}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`btn btn-sm w-100 fw-semibold mt-2 d-flex align-items-center justify-content-center gap-1.5 transition-all ${
                                  isCopied ? "btn-success text-white" : "btn-outline-dark"
                                }`}
                                onClick={() => copyToClipboard(item.account, item.id)}
                              >
                                <i className={`bi ${isCopied ? "bi-check2" : "bi-clipboard"}`} />
                                <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Informasi Pemeliharaan */}
                  <div className="card bg-light border rounded-3 p-3">
                    <div className="fw-semibold text-dark text-xs mb-1.5 d-flex align-items-center gap-1.5">
                      <i className="bi bi-check2-circle text-success" />
                      Manfaat Pemeliharaan Rutin:
                    </div>
                    <ul className="text-xs text-secondary mb-0 ps-3 d-flex flex-column gap-1">
                      <li>Menjaga akses data jadwal dan kehadiran pengajar tetap lancar tanpa kendala kuota.</li>
                      <li>Memastikan penyimpanan cloud real-time tetap aktif untuk seluruh cabang.</li>
                      <li>Menjamin keandalan pencadangan dan pemeliharaan server berkesinambungan.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer bg-light py-2.5 px-4 justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted text-xs">
                    <i className="bi bi-shield-check me-1 text-success" />
                    Terima kasih atas kepedulian dan donasi yang Anda berikan.
                  </span>
                  {isHidden && (
                    <button
                      type="button"
                      className="btn btn-link btn-xs text-decoration-none text-primary p-0 ms-2 fw-semibold"
                      onClick={handleRestore}
                      title="Tampilkan kembali banner di atas selama 2.5 menit"
                    >
                      <i className="bi bi-eye me-1" />
                      Tampilkan Kembali Banner
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-3"
                  onClick={() => setIsModalOpen(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
