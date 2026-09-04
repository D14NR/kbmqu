import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../lib/api";
import type { DonasiTransaksiRecord } from "../../types/donasi";

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
  const [isDetailTransaksiOpen, setIsDetailTransaksiOpen] = useState(false);
  const [transaksiList, setTransaksiList] = useState<DonasiTransaksiRecord[]>([]);
  const [loadingTransaksi, setLoadingTransaksi] = useState(false);
  const [searchTransaksi, setSearchTransaksi] = useState("");
  const [filterType, setFilterType] = useState<"all" | "masuk" | "keluar">("all");

  const [usdRate, setUsdRate] = useState<number>(15500); // Default fallback exchange rate

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.IDR) {
          setUsdRate(data.rates.IDR);
        }
      })
      .catch((err) => console.error("Failed to fetch exchange rate", err));
  }, []);

  const formatUSD = (amountIDR: number) => {
    const usd = amountIDR / usdRate;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
  };

  // Filter Periode Bulan (Default: Bulan Ini)
  const getCurrentMonthKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };
  const currentMonthKey = getCurrentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const totalSaldoBersih = useMemo(() => {
    const masuk = transaksiList.reduce((sum, item) => sum + (Number(item.jumlah_transaksi_masuk) || 0), 0);
    const keluar = transaksiList.reduce((sum, item) => sum + (Number(item.jumlah_transaksi_keluar) || 0), 0);
    return masuk - keluar;
  }, [transaksiList]);

  const TARGET_MONTHLY_USD = 15;
  const TARGET_MONTHLY_IDR = TARGET_MONTHLY_USD * usdRate;
  // Ensure we don't have negative progress if balance is somehow negative
  const effectiveSaldo = Math.max(0, totalSaldoBersih);
  const progressPercent = Math.min(100, Math.round((effectiveSaldo / TARGET_MONTHLY_IDR) * 100));
  const sisaTarget = Math.max(0, TARGET_MONTHLY_IDR - effectiveSaldo);


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

  // Load Transaksi List
  const fetchTransaksiList = async () => {
    setLoadingTransaksi(true);
    try {
      const res = await apiFetch<any>("/db/donasi_transaksi");
      const rawList = Array.isArray(res) ? res : (res?.data || []);
      const mapped: DonasiTransaksiRecord[] = (rawList || []).map((row: any) => ({
        id: row.id,
        nama_pengirim: String(row.data?.["Nama Pengirim"] || row.nama_pengirim || "Hamba Allah"),
        tanggal: String(row.data?.["Tanggal"] || row.tanggal || ""),
        jumlah_transaksi_masuk: Number(
          row.data?.["Jumlah Transaksi Masuk"] ??
            row.jumlah_transaksi_masuk ??
            row.data?.["Jumlah Transaksi"] ??
            row.jumlah_transaksi ??
            0
        ),
        jumlah_transaksi_keluar: Number(
          row.data?.["Jumlah Transaksi Keluar"] ?? row.jumlah_transaksi_keluar ?? 0
        ),
        keterangan: String(row.data?.["Keterangan"] || row.keterangan || "donasi masuk"),
        created_at: String(row.data?.["Created At"] || row.created_at || ""),
        updated_at: String(row.data?.["Updated At"] || row.updated_at || ""),
      }));
      setTransaksiList(mapped);
    } catch (err) {
      console.error("Gagal memuat transaksi donasi", err);
    } finally {
      setLoadingTransaksi(false);
    }
  };

  useEffect(() => {
    if (isDetailTransaksiOpen || isModalOpen) {
      void fetchTransaksiList();
    }
  }, [isDetailTransaksiOpen, isModalOpen]);

  const donationAccounts = dynamicAccounts.length > 0 ? dynamicAccounts : DEFAULT_ACCOUNTS;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatMonthName = (yearMonthStr: string) => {
    if (!yearMonthStr) return "Bulan Ini";
    try {
      const [year, month] = yearMonthStr.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      if (isNaN(d.getTime())) return yearMonthStr;
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } catch {
      return yearMonthStr;
    }
  };

  const isCurrentMonthSelected = selectedMonth === currentMonthKey;

  // Filter Transaksi Khusus Bulan yang Dipilih (Default: Bulan Ini)
  const monthTransaksiList = useMemo(() => {
    if (!selectedMonth) return transaksiList;
    return transaksiList.filter((item) => {
      const dateStr = item.tanggal || item.created_at || "";
      return dateStr.startsWith(selectedMonth);
    });
  }, [transaksiList, selectedMonth]);

  // Kalkulasi Statistik Transaksi Khusus Bulan Ini
  const totalMasuk = useMemo(() => {
    return monthTransaksiList.reduce((sum, item) => sum + (Number(item.jumlah_transaksi_masuk) || 0), 0);
  }, [monthTransaksiList]);

  const totalKeluar = useMemo(() => {
    return monthTransaksiList.reduce((sum, item) => sum + (Number(item.jumlah_transaksi_keluar) || 0), 0);
  }, [monthTransaksiList]);

  const saldoBersih = totalMasuk - totalKeluar;

  // Filtered Transaksi (Tipe Masuk/Keluar + Pencarian)
  const filteredTransaksiList = useMemo(() => {
    let result = monthTransaksiList;
    if (filterType === "masuk") {
      result = result.filter((t) => Number(t.jumlah_transaksi_masuk) > 0);
    } else if (filterType === "keluar") {
      result = result.filter((t) => Number(t.jumlah_transaksi_keluar) > 0);
    }

    if (searchTransaksi.trim()) {
      const q = searchTransaksi.toLowerCase();
      result = result.filter(
        (t) =>
          t.nama_pengirim.toLowerCase().includes(q) ||
          t.keterangan.toLowerCase().includes(q) ||
          t.tanggal.includes(q) ||
          String(t.jumlah_transaksi_masuk).includes(q) ||
          String(t.jumlah_transaksi_keluar).includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [monthTransaksiList, filterType, searchTransaksi]);

  const changeMonth = (delta: number) => {
    const [yearStr, monthStr] = (selectedMonth || currentMonthKey).split("-");
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
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

                  {/* Target Progress Section */}
                  <div className="bg-white border rounded-3 p-3 shadow-sm">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-bold text-dark text-sm d-flex align-items-center gap-1.5">
                        <i className="bi bi-bullseye text-primary" />
                        Target Pemeliharaan ($15)
                      </div>
                      <div className="text-xs fw-bold text-success">
                        {formatUSD(effectiveSaldo)} / {formatUSD(TARGET_MONTHLY_IDR)}
                      </div>
                    </div>
                    <div className="progress" style={{ height: "10px" }} aria-label="Target Pemeliharaan" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                      <div 
                        className={`progress-bar ${progressPercent >= 100 ? "bg-success" : "bg-primary progress-bar-striped progress-bar-animated"}`} 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-1">
                      <div className="text-xxs fw-semibold text-danger">
                        {sisaTarget > 0 ? `Kekurangan: ${formatUSD(sisaTarget)}` : "Target Terpenuhi!"}
                      </div>
                      <div className="text-xxs text-muted fw-semibold">
                        Terkumpul: {progressPercent}%
                      </div>
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
              <div className="modal-footer bg-light py-2.5 px-4 justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="text-muted text-xs d-flex align-items-center">
                    <i className="bi bi-shield-check me-1 text-success" />
                    Terima kasih atas kepedulian dan donasi yang Anda berikan.
                  </span>
                  {isHidden && (
                    <button
                      type="button"
                      className="btn btn-link btn-xs text-decoration-none text-primary p-0 ms-1 fw-semibold d-inline-flex align-items-center"
                      onClick={handleRestore}
                      title="Tampilkan kembali banner di atas selama 2.5 menit"
                    >
                      <i className="bi bi-eye me-1" />
                      Tampilkan Kembali Banner
                    </button>
                  )}
                  {/* Button Detail Transaksi di samping Tampilkan Kembali Banner */}
                  <button
                    type="button"
                    className="btn btn-outline-success btn-xs rounded-pill px-3 py-1 fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm transition-all"
                    onClick={() => {
                      setIsDetailTransaksiOpen(true);
                      void fetchTransaksiList();
                    }}
                    title="Lihat Rincian Riwayat Transaksi Donasi & Pemeliharaan Database"
                  >
                    <i className="bi bi-receipt-cutoff text-success" />
                    <span>Detail Transaksi</span>
                  </button>
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

      {/* Modal Rincian Detail Transaksi (donasi_transaksi) */}
      {isDetailTransaksiOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(5px)", zIndex: 1080 }}
          onClick={() => setIsDetailTransaksiOpen(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
            role="document"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
              {/* Header */}
              <div className="modal-header bg-dark text-white border-0 py-3 px-4">
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    className="d-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow-sm"
                    style={{ width: 40, height: 40 }}
                  >
                    <i className="bi bi-receipt-cutoff fs-5" />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h5 className="modal-title fw-bold mb-0 text-white text-base">
                        Detail Transaksi Donasi &amp; Pemeliharaan
                      </h5>
                      <span className="badge bg-success-subtle text-success border border-success-subtle text-xxs px-2 py-0.5 rounded-pill fw-semibold d-inline-flex align-items-center gap-1">
                        <i className="bi bi-calendar3" />
                        {isCurrentMonthSelected ? `Bulan Ini: ${formatMonthName(selectedMonth)}` : `Periode: ${formatMonthName(selectedMonth)}`}
                      </span>
                    </div>
                    <div className="text-white-50 text-xs mt-0.5">
                      Menampilkan mutasi &amp; pemeliharaan database periode <span className="text-warning fw-semibold">{formatMonthName(selectedMonth)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setIsDetailTransaksiOpen(false)}
                />
              </div>

              {/* Body */}
              <div className="modal-body p-3.5 bg-light">
                {/* Month Navigator Toolbar */}
                <div className="bg-white border rounded-3 p-2 mb-3 shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-xs fw-bold text-dark d-flex align-items-center gap-1.5">
                      <i className="bi bi-calendar-event text-success" />
                      Periode Bulan:
                    </span>
                    <span className="badge bg-light text-dark border px-2.5 py-1 text-xs fw-bold rounded-2 font-monospace">
                      {formatMonthName(selectedMonth)}
                    </span>
                    {isCurrentMonthSelected && (
                      <span className="badge bg-success text-white text-xxs rounded-pill px-2 py-0.5 fw-semibold">
                        Bulan Berjalan
                      </span>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-xs rounded-2 px-2 py-1 shadow-none"
                      onClick={() => changeMonth(-1)}
                      title="Bulan Sebelumnya"
                    >
                      <i className="bi bi-chevron-left me-1" />
                      Lalu
                    </button>

                    {!isCurrentMonthSelected && (
                      <button
                        type="button"
                        className="btn btn-warning btn-xs rounded-2 px-2.5 py-1 fw-bold shadow-none text-dark"
                        onClick={() => setSelectedMonth(currentMonthKey)}
                        title="Kembali ke Bulan Ini"
                      >
                        <i className="bi bi-arrow-counterclockwise me-1" />
                        Bulan Ini
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-xs rounded-2 px-2 py-1 shadow-none"
                      onClick={() => changeMonth(1)}
                      title="Bulan Berikutnya"
                    >
                      Depan
                      <i className="bi bi-chevron-right ms-1" />
                    </button>

                    <div className="border-start ps-1.5 ms-1">
                      <input
                        type="month"
                        className="form-control form-control-sm text-xxs py-0.5 px-2 bg-light border"
                        style={{ height: 26, width: 125 }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value || currentMonthKey)}
                        title="Pilih Bulan Tertentu"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Bento Summary Khusus Bulan Ini */}
                <div className="row g-2.5 mb-3">
                  {/* Saldo Bersih */}
                  <div className="col-12 col-sm-4">
                    <div className="bg-white border rounded-3 p-2.5 shadow-sm d-flex align-items-center gap-2.5">
                      <div
                        className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 38, height: 38 }}
                      >
                        <i className="bi bi-wallet2 fs-6" />
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div className="text-xxs text-muted fw-bold text-uppercase">
                          Saldo {isCurrentMonthSelected ? "Bulan Ini" : "Periode Ini"}
                        </div>
                        <div className={`text-sm fw-bold ${saldoBersih >= 0 ? "text-success" : "text-danger"} text-truncate`}>
                          {formatUSD(saldoBersih)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Donasi Masuk */}
                  <div className="col-6 col-sm-4">
                    <div className="bg-white border rounded-3 p-2.5 shadow-sm d-flex align-items-center gap-2.5">
                      <div
                        className="rounded-circle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 38, height: 38, backgroundColor: "#ecfdf5" }}
                      >
                        <i className="bi bi-arrow-down-left-circle fs-6" />
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div className="text-xxs text-muted fw-bold text-uppercase">
                          Total Masuk ({formatMonthName(selectedMonth)})
                        </div>
                        <div className="text-sm fw-bold text-success text-truncate">
                          {formatUSD(totalMasuk)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pengeluaran / Server */}
                  <div className="col-6 col-sm-4">
                    <div className="bg-white border rounded-3 p-2.5 shadow-sm d-flex align-items-center gap-2.5">
                      <div
                        className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 38, height: 38 }}
                      >
                        <i className="bi bi-arrow-up-right-circle fs-6" />
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div className="text-xxs text-muted fw-bold text-uppercase">
                          Biaya Server ({formatMonthName(selectedMonth)})
                        </div>
                        <div className="text-sm fw-bold text-danger text-truncate">
                          {formatUSD(totalKeluar)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar Search & Filter */}
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mb-2.5">
                  <div className="input-group input-group-sm" style={{ maxWidth: 300 }}>
                    <span className="input-group-text bg-white text-muted border-end-0">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      type="text"
                      className="form-control bg-white border-start-0 text-xs"
                      placeholder={`Cari pengirim di ${formatMonthName(selectedMonth)}...`}
                      value={searchTransaksi}
                      onChange={(e) => setSearchTransaksi(e.target.value)}
                    />
                    {searchTransaksi && (
                      <button
                        type="button"
                        className="btn btn-white border border-start-0 text-muted"
                        onClick={() => setSearchTransaksi("")}
                      >
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-1.5">
                    <div className="btn-group btn-group-sm rounded-3 border bg-white p-0.5 shadow-none" role="group">
                      <button
                        type="button"
                        className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1 ${
                          filterType === "all" ? "btn-dark text-white" : "btn-light text-muted border-0"
                        }`}
                        onClick={() => setFilterType("all")}
                      >
                        Semua ({monthTransaksiList.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1 ${
                          filterType === "masuk" ? "btn-success text-white" : "btn-light text-muted border-0"
                        }`}
                        onClick={() => setFilterType("masuk")}
                      >
                        Masuk
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1 ${
                          filterType === "keluar" ? "btn-danger text-white" : "btn-light text-muted border-0"
                        }`}
                        onClick={() => setFilterType("keluar")}
                      >
                        Keluar
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-xs rounded-2 px-2 py-1 shadow-none"
                      onClick={() => void fetchTransaksiList()}
                      disabled={loadingTransaksi}
                      title="Segarkan Transaksi"
                    >
                      <i className={`bi bi-arrow-clockwise ${loadingTransaksi ? "spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="card border rounded-3 overflow-hidden shadow-sm bg-white">
                  <div className="table-responsive" style={{ maxHeight: "380px" }}>
                    <table className="table table-hover align-middle mb-0 text-xs">
                      <thead className="table-light">
                        <tr>
                          <th className="text-center px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase" style={{ width: 45 }}>
                            No
                          </th>
                          <th className="text-center px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase" style={{ width: 105 }}>
                            Tanggal
                          </th>
                          <th className="px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase">
                            Pengirim / Pihak
                          </th>
                          <th className="px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase">
                            Keterangan
                          </th>
                          <th className="text-end px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase" style={{ width: 130 }}>
                            Masuk
                          </th>
                          <th className="text-end px-2.5 py-2 text-muted text-xxs fw-bold text-uppercase" style={{ width: 130 }}>
                            Keluar
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingTransaksi ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4">
                              <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                              <span className="text-muted text-xs">Memuat riwayat transaksi donasi {formatMonthName(selectedMonth)}...</span>
                            </td>
                          </tr>
                        ) : filteredTransaksiList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-4">
                              <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                                <i className="bi bi-calendar-x fs-4 text-secondary mb-1" />
                                <div className="fw-semibold text-xs text-dark">
                                  Belum ada transaksi di bulan {formatMonthName(selectedMonth)}
                                </div>
                                <div className="text-xxs text-secondary mt-0.5">
                                  {searchTransaksi
                                    ? "Tidak ada hasil pencarian yang cocok untuk bulan ini"
                                    : `Belum tercatat transaksi masuk/keluar pada periode ${formatMonthName(selectedMonth)}.`}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredTransaksiList.map((item, idx) => {
                            const masuk = Number(item.jumlah_transaksi_masuk) || 0;
                            const keluar = Number(item.jumlah_transaksi_keluar) || 0;

                            return (
                              <tr key={item.id}>
                                <td className="text-center text-muted text-xxs px-2.5 py-2">
                                  {idx + 1}
                                </td>
                                <td className="text-center text-dark fw-semibold px-2.5 py-2">
                                  <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 text-xxs font-monospace">
                                    {formatDateDisplay(item.tanggal)}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2">
                                  <div className="d-flex align-items-center gap-1.5">
                                    <div
                                      className={`rounded-circle ${
                                        masuk > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                                      } d-flex align-items-center justify-content-center flex-shrink-0`}
                                      style={{ width: 22, height: 22 }}
                                    >
                                      <i className={`bi ${masuk > 0 ? "bi-arrow-down-left" : "bi-arrow-up-right"}`} style={{ fontSize: 10 }} />
                                    </div>
                                    <span className="fw-bold text-dark text-xs">{item.nama_pengirim || "Hamba Allah"}</span>
                                  </div>
                                </td>
                                <td className="px-2.5 py-2 text-muted text-xxs">
                                  {item.keterangan || "donasi masuk"}
                                </td>
                                <td className="text-end px-2.5 py-2">
                                  {masuk > 0 ? (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold font-monospace">
                                      +{formatUSD(masuk)}
                                    </span>
                                  ) : (
                                    <span className="text-muted text-xxs">-</span>
                                  )}
                                </td>
                                <td className="text-end px-2.5 py-2">
                                  {keluar > 0 ? (
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold font-monospace">
                                      -{formatUSD(keluar)}
                                    </span>
                                  ) : (
                                    <span className="text-muted text-xxs">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer bg-white py-2 px-4 justify-content-between">
                <div className="text-muted text-xxs d-flex align-items-center gap-1">
                  <i className="bi bi-shield-check text-success" />
                  <span>Transparansi donasi &amp; pemeliharaan operasional database.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-3"
                  onClick={() => setIsDetailTransaksiOpen(false)}
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

