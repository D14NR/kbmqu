import React, { useState, useMemo } from "react";
import type {
  DonasiRecord,
  DonasiTransaksiRecord,
  DonasiTransaksiTagihanRecord,
} from "../../types/donasi";

type DonasiViewProps = {
  loading: boolean;
  records: DonasiRecord[];
  transaksiRecords?: DonasiTransaksiRecord[];
  tagihanRecords?: DonasiTransaksiTagihanRecord[];
  isAdmin?: boolean;
  onAdd: () => void;
  onEdit: (record: DonasiRecord) => void;
  onDelete: (record: DonasiRecord) => void;
  onAddTransaksi?: () => void;
  onEditTransaksi?: (record: DonasiTransaksiRecord) => void;
  onDeleteTransaksi?: (record: DonasiTransaksiRecord) => void;
  onToggleHideNamaTransaksi?: (record: DonasiTransaksiRecord) => void;
  onAddTagihan?: () => void;
  onEditTagihan?: (record: DonasiTransaksiTagihanRecord) => void;
  onDeleteTagihan?: (record: DonasiTransaksiTagihanRecord) => void;
  onPayTagihan?: (record: DonasiTransaksiTagihanRecord) => void;
  onRefresh: () => void;
};

export function DonasiView({
  loading,
  records,
  transaksiRecords = [],
  tagihanRecords = [],
  isAdmin = false,
  onAdd,
  onEdit,
  onDelete,
  onAddTransaksi,
  onEditTransaksi,
  onDeleteTransaksi,
  onToggleHideNamaTransaksi,
  onAddTagihan,
  onEditTagihan,
  onDeleteTagihan,
  onPayTagihan,
  onRefresh,
}: DonasiViewProps) {
  const [activeTab, setActiveTab] = useState<"rekening" | "transaksi" | "tagihan">("rekening");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "masuk" | "keluar">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());

  const formatMonthLabel = (yearMonthStr: string) => {
    if (yearMonthStr === "all") return "Semua Periode";
    try {
      const [year, month] = yearMonthStr.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      if (isNaN(d.getTime())) return yearMonthStr;
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } catch {
      return yearMonthStr;
    }
  };

  // Generate list of distinct months from transaksiRecords + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const current = getCurrentMonthKey();
    monthsSet.add(current);

    transaksiRecords.forEach((t) => {
      const raw = t.tanggal || t.created_at || "";
      if (raw) {
        try {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            monthsSet.add(`${year}-${month}`);
          }
        } catch {}
      }
    });

    tagihanRecords.forEach((t) => {
      const raw = t.tanggal || t.created_at || "";
      if (raw) {
        try {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            monthsSet.add(`${year}-${month}`);
          }
        } catch {}
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [transaksiRecords, tagihanRecords]);

  // Filter Transaksi Berdasarkan Bulan Terpilih
  const monthTransaksiRecords = useMemo(() => {
    if (selectedMonth === "all") {
      return transaksiRecords;
    }
    return transaksiRecords.filter((t) => {
      const raw = t.tanggal || t.created_at || "";
      if (!raw) return false;
      try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
          return raw.startsWith(selectedMonth);
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      } catch {
        return raw.startsWith(selectedMonth);
      }
    });
  }, [transaksiRecords, selectedMonth]);

  // Perhitungan Statistik Rekening
  const totalRekening = records.length;

  // 1. Transaksi SEBELUM bulan yang dipilih (untuk menghitung Sisa Saldo Bulan Kemarin / Saldo Awal)
  const priorMonthTransaksiRecords = useMemo(() => {
    if (selectedMonth === "all") return [];
    return transaksiRecords.filter((t) => {
      const raw = t.tanggal || t.created_at || "";
      if (!raw) return false;
      if (/^\d{4}-\d{2}/.test(raw)) {
        return raw.slice(0, 7) < selectedMonth;
      }
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          return `${year}-${month}` < selectedMonth;
        }
      } catch {}
      return false;
    });
  }, [transaksiRecords, selectedMonth]);

  // Sisa Uang / Saldo Awal dari Bulan Kemarin
  const saldoAwalBulanLalu = useMemo(() => {
    const masuk = priorMonthTransaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_masuk) || 0), 0);
    const keluar = priorMonthTransaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_keluar) || 0), 0);
    return masuk - keluar;
  }, [priorMonthTransaksiRecords]);

  // 2. Transaksi KHUSUS bulan yang dipilih
  const totalNominalMasuk = useMemo(() => {
    return monthTransaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_masuk) || 0), 0);
  }, [monthTransaksiRecords]);

  const totalNominalKeluar = useMemo(() => {
    return monthTransaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_keluar) || 0), 0);
  }, [monthTransaksiRecords]);

  // Mutasi Bersih Bulan Ini = Pemasukan Bulan Ini DIKURANGI Pengeluaran Bulan Ini
  const mutasiBersihBulanIni = totalNominalMasuk - totalNominalKeluar;
  const saldoBersih = mutasiBersihBulanIni;

  // Total Kas Tersedia Saat Ini = Saldo Awal Bulan Lalu + Mutasi Bersih Bulan Ini
  const totalKasTersedia = useMemo(() => {
    if (selectedMonth === "all") {
      const masuk = transaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_masuk) || 0), 0);
      const keluar = transaksiRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_transaksi_keluar) || 0), 0);
      return masuk - keluar;
    }
    return saldoAwalBulanLalu + mutasiBersihBulanIni;
  }, [selectedMonth, transaksiRecords, saldoAwalBulanLalu, mutasiBersihBulanIni]);

  const countMasuk = useMemo(() => {
    return monthTransaksiRecords.filter((t) => Number(t.jumlah_transaksi_masuk) > 0).length;
  }, [monthTransaksiRecords]);

  const countKeluar = useMemo(() => {
    return monthTransaksiRecords.filter((t) => Number(t.jumlah_transaksi_keluar) > 0).length;
  }, [monthTransaksiRecords]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter Rekening
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.nama_pemilik.toLowerCase().includes(q) ||
        r.nama_bank.toLowerCase().includes(q) ||
        r.alamat_rekening.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Filter Transaksi
  const filteredTransaksi = useMemo(() => {
    let result = monthTransaksiRecords;

    if (filterType === "masuk") {
      result = result.filter((t) => Number(t.jumlah_transaksi_masuk) > 0);
    } else if (filterType === "keluar") {
      result = result.filter((t) => Number(t.jumlah_transaksi_keluar) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.nama_pengirim.toLowerCase().includes(q) ||
          (t.keterangan && t.keterangan.toLowerCase().includes(q)) ||
          t.tanggal.includes(q) ||
          String(t.jumlah_transaksi_masuk).includes(q) ||
          String(t.jumlah_transaksi_keluar).includes(q)
      );
    }

    // Urutkan transaksi dari yang terbaru berdasarkan tanggal / id
    return [...result].sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [monthTransaksiRecords, filterType, searchQuery]);

  // Filter Transaksi Tagihan Berdasarkan Bulan Terpilih
  const monthTagihanRecords = useMemo(() => {
    if (selectedMonth === "all") {
      return tagihanRecords;
    }
    return tagihanRecords.filter((t) => {
      const raw = t.tanggal || t.created_at || "";
      if (!raw) return false;
      try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
          return raw.startsWith(selectedMonth);
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      } catch {
        return raw.startsWith(selectedMonth);
      }
    });
  }, [tagihanRecords, selectedMonth]);

  const totalNominalTagihan = useMemo(() => {
    return monthTagihanRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_tagihan) || 0), 0);
  }, [monthTagihanRecords]);

  // Filter Tagihan dengan Pencarian
  const filteredTagihan = useMemo(() => {
    let result = monthTagihanRecords;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.nama_pengirim.toLowerCase().includes(q) ||
          (t.keterangan && t.keterangan.toLowerCase().includes(q)) ||
          t.tanggal.includes(q) ||
          String(t.jumlah_tagihan).includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [monthTagihanRecords, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBankBadge = (bankName: string) => {
    const lower = bankName.toLowerCase();
    if (lower.includes("jago")) return "bg-warning-subtle text-warning-emphasis border-warning";
    if (lower.includes("paypal")) return "bg-primary-subtle text-primary border-primary-subtle";
    if (lower.includes("shopee")) return "bg-danger-subtle text-danger border-danger-subtle";
    if (lower.includes("bca")) return "bg-info-subtle text-info-emphasis border-info-subtle";
    if (lower.includes("mandiri")) return "bg-warning-subtle text-dark border-warning-subtle";
    if (lower.includes("bri")) return "bg-primary-subtle text-dark border-primary-subtle";
    if (lower.includes("dana")) return "bg-info-subtle text-info-emphasis border-info";
    return "bg-secondary-subtle text-secondary-emphasis border-secondary-subtle";
  };

  const getBankIcon = (bankName: string) => {
    const lower = bankName.toLowerCase();
    if (lower.includes("paypal")) return "bi-paypal";
    if (lower.includes("shopee") || lower.includes("dana") || lower.includes("gopay")) return "bi-wallet2";
    return "bi-bank2";
  };

  const formatDateTimeDisplay = (dateStr?: string, createdAtStr?: string) => {
    if (!dateStr && !createdAtStr) return { date: "-", time: "" };

    const raw = dateStr || createdAtStr || "";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        return { date: raw, time: "" };
      }

      const datePart = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Extract time if raw contains time info or fallback to createdAtStr
      let timePart = "";
      if (raw.includes("T") || raw.includes(":") || (raw.length > 10 && !/^\d{4}-\d{2}-\d{2}$/.test(raw))) {
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        timePart = `${hours}:${minutes}`;
      } else if (createdAtStr) {
        const cDate = new Date(createdAtStr);
        if (!isNaN(cDate.getTime())) {
          const hours = String(cDate.getHours()).padStart(2, "0");
          const minutes = String(cDate.getMinutes()).padStart(2, "0");
          timePart = `${hours}:${minutes}`;
        }
      }

      return { date: datePart, time: timePart };
    } catch {
      return { date: raw, time: "" };
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    return formatDateTimeDisplay(dateStr).date;
  };

  return (
    <div className="py-2">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xxs fw-bold d-inline-flex align-items-center gap-1">
              <i className="bi bi-shield-lock-fill" />
              KHUSUS ADMIN PUSAT
            </span>
            <span className="badge bg-light text-muted border rounded-pill px-2.5 py-1 text-xxs">
              <i className="bi bi-database me-1" />
              {activeTab === "rekening"
                ? "Tabel: donasi"
                : activeTab === "transaksi"
                ? "Tabel: donasi_transaksi"
                : "Tabel: donasi_transaksi_tagihan"}
            </span>
          </div>
          <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-heart-fill text-danger" />
            Kelola Donasi Database
          </h4>
          <p className="text-muted text-xs mb-0">
            Pengelolaan saluran rekening, mutasi donasi (<code className="text-dark fw-bold">donasi_transaksi</code>), serta pencatatan invoice tagihan server (<code className="text-dark fw-bold">donasi_transaksi_tagihan</code>).
          </p>
        </div>

        {/* Filter Periode Bulan */}
        <div className="d-flex align-items-center gap-2 flex-wrap ms-md-auto">
          <span className="text-xxs fw-bold text-muted text-uppercase d-flex align-items-center gap-1">
            <i className="bi bi-calendar3 text-primary" />
            Periode Hitung:
          </span>
          <select
            className="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-white shadow-xs"
            style={{ width: "auto", minWidth: 160 }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value={getCurrentMonthKey()}>Bulan Ini ({formatMonthLabel(getCurrentMonthKey())})</option>
            <option disabled>──────────</option>
            {availableMonths.map((mKey) => (
              <option key={mKey} value={mKey}>
                {formatMonthLabel(mKey)}
              </option>
            ))}
            <option value="all">Semua Periode (Akumulasi)</option>
          </select>
        </div>
      </div>

      {/* Info Edukasi Siklus Tagihan Server */}
      <div className="alert bg-primary-subtle bg-opacity-25 border border-primary-subtle text-dark rounded-4 p-3 mb-3 d-flex align-items-start gap-2.5 shadow-xs">
        <i className="bi bi-info-circle-fill text-primary fs-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong>Siklus Pembukuan &amp; Tagihan Server Database:</strong>
          <div className="mt-0.5 text-secondary">
            Tagihan server Cloudflare beroperasi dengan sistem <strong>pascabayar</strong> (pemakaian bulan lalu ditagihkan di awal bulan berjalan). 
            Oleh karena itu, <strong>dana donasi yang masuk di Bulan Ini</strong> bersama <strong>sisa uang kas bulan kemarin</strong> dihimpun untuk melunasi <strong>tagihan server bulan kemarin</strong> tersebut.
          </div>
        </div>
      </div>

      {/* 4 Cards Bento Strip: Sisa Bulan Lalu + Masuk - Keluar = Total Kas Tersedia */}
      <div className="row g-2.5 mb-3.5">
        {/* Kartu 1: Sisa Uang Bulan Kemarin (Saldo Awal) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <i className="bi bi-clock-history fs-5" />
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="text-xxs text-muted fw-bold text-uppercase d-flex align-items-center justify-content-between">
                <span>Sisa Bulan Kemarin</span>
                <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "0.6rem" }}>
                  Saldo Awal
                </span>
              </div>
              <div className={`text-base fw-bold ${saldoAwalBulanLalu >= 0 ? "text-primary" : "text-danger"} text-truncate`}>
                {formatRupiah(saldoAwalBulanLalu)}
              </div>
              <div className="text-xxs text-muted text-truncate">
                {selectedMonth === "all" ? "Awal pembukuan" : "Sisa kas sebelum bulan ini"}
              </div>
            </div>
          </div>
        </div>

        {/* Kartu 2: Donasi Masuk Bulan Ini */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle text-success d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44, backgroundColor: "#ecfdf5" }}
            >
              <i className="bi bi-arrow-down-left-circle fs-5" />
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="text-xxs text-muted fw-bold text-uppercase d-flex align-items-center justify-content-between">
                <span>Donasi Masuk</span>
                <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "0.6rem" }}>
                  {countMasuk} Trx
                </span>
              </div>
              <div className="text-base fw-bold text-success text-truncate">
                {formatRupiah(totalNominalMasuk)}
              </div>
              <div className="text-xxs text-muted text-truncate">
                {selectedMonth === "all" ? "Total semua pemasukan" : `Pemasukan ${formatMonthLabel(selectedMonth).slice(0, 10)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Kartu 3: Biaya Keluar / Server Bulan Ini */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="bg-white border rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <i className="bi bi-arrow-up-right-circle fs-5" />
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="text-xxs text-muted fw-bold text-uppercase d-flex align-items-center justify-content-between">
                <span>Biaya / Keluar</span>
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: "0.6rem" }}>
                  {countKeluar} Trx
                </span>
              </div>
              <div className="text-base fw-bold text-danger text-truncate">
                {formatRupiah(totalNominalKeluar)}
              </div>
              <div className="text-xxs text-muted text-truncate" title="Tagihan server pemakaian bulan sebelumnya yang dibayar di bulan ini">
                {selectedMonth === "all" ? "Total semua pengeluaran" : "Tagihan server (bln kemaren)"}
              </div>
            </div>
          </div>
        </div>

        {/* Kartu 4: Total Kas Tersedia (Saldo Akhir) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="bg-white border border-success-subtle rounded-4 p-3 shadow-sm h-100 d-flex align-items-center gap-3" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)" }}>
            <div
              className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-xs"
              style={{ width: 44, height: 44 }}
            >
              <i className="bi bi-wallet2 fs-5" />
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="text-xxs text-muted fw-bold text-uppercase d-flex align-items-center justify-content-between">
                <span className="text-dark fw-bolder">Kas Tersedia</span>
                <span className="badge bg-success text-white fw-bold" style={{ fontSize: "0.6rem" }}>
                  Saldo Akhir
                </span>
              </div>
              <div className={`text-base fw-bold ${totalKasTersedia >= 0 ? "text-success" : "text-danger"} text-truncate`}>
                {formatRupiah(totalKasTersedia)}
              </div>
              <div className="text-xxs text-muted text-truncate" title={`Sisa lalu (${formatRupiah(saldoAwalBulanLalu)}) + Mutasi bln ini (${mutasiBersihBulanIni >= 0 ? "+" : ""}${formatRupiah(mutasiBersihBulanIni)})`}>
                Mutasi bln ini: <strong className={mutasiBersihBulanIni >= 0 ? "text-success" : "text-danger"}>{mutasiBersihBulanIni >= 0 ? "+" : ""}{formatRupiah(mutasiBersihBulanIni)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs Switcher */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
        <ul className="nav nav-pills gap-2 flex-wrap">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-2 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                activeTab === "rekening"
                  ? "active bg-dark text-white shadow-sm"
                  : "bg-white text-secondary border hover-bg-light"
              }`}
              onClick={() => {
                setActiveTab("rekening");
                setSearchQuery("");
              }}
            >
              <i className="bi bi-credit-card-2-front" />
              <span>Saluran Rekening</span>
              <span
                className={`badge rounded-pill px-2 py-0.5 text-xxs ${
                  activeTab === "rekening" ? "bg-white text-dark" : "bg-light text-secondary border"
                }`}
              >
                {records.length}
              </span>
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-2 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                activeTab === "transaksi"
                  ? "active bg-dark text-white shadow-sm"
                  : "bg-white text-secondary border hover-bg-light"
              }`}
              onClick={() => {
                setActiveTab("transaksi");
                setSearchQuery("");
              }}
            >
              <i className="bi bi-arrow-left-right text-success" />
              <span>Transaksi Donasi</span>
              <span
                className={`badge rounded-pill px-2 py-0.5 text-xxs ${
                  activeTab === "transaksi" ? "bg-success text-white" : "bg-light text-secondary border"
                }`}
              >
                {transaksiRecords.length}
              </span>
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link rounded-pill px-4 py-2 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                activeTab === "tagihan"
                  ? "active bg-danger text-white shadow-sm"
                  : "bg-white text-secondary border hover-bg-light"
              }`}
              onClick={() => {
                setActiveTab("tagihan");
                setSearchQuery("");
              }}
            >
              <i className="bi bi-receipt-cutoff" />
              <span>Transaksi Tagihan</span>
              <span
                className={`badge rounded-pill px-2 py-0.5 text-xxs ${
                  activeTab === "tagihan" ? "bg-white text-danger fw-bold" : "bg-light text-secondary border"
                }`}
              >
                {tagihanRecords.length}
              </span>
            </button>
          </li>
        </ul>

        <div className="d-none d-md-flex align-items-center text-muted text-xxs gap-2">
          <i className="bi bi-info-circle text-primary" />
          <span>
            {activeTab === "rekening"
              ? "Daftar saluran donasi yang tampil di banner modal"
              : activeTab === "transaksi"
              ? "Riwayat mutasi dari skema donasi_transaksi"
              : "Pencatatan tagihan server dari skema donasi_transaksi_tagihan"}
          </span>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2.5">
            {/* Search and Type Filter */}
            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 flex-grow-1">
              <div className="input-group input-group-sm" style={{ maxWidth: 380 }}>
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "rekening"
                      ? "Cari pemilik, bank, atau rekening..."
                      : activeTab === "transaksi"
                      ? "Cari pengirim, keterangan, atau tanggal..."
                      : "Cari vendor/pengirim, keterangan, atau nominal..."
                  }
                  className="form-control bg-light border-start-0 py-2 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setSearchQuery("")}
                  >
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>

              {/* Tipe filter button group for Tab Transaksi */}
              {activeTab === "transaksi" && (
                <div className="btn-group btn-group-sm rounded-3 border bg-light p-0.5" role="group">
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "all" ? "btn-dark text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("all")}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "masuk" ? "btn-success text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("masuk")}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs rounded-2 text-xxs fw-semibold px-2.5 py-1.5 ${
                      filterType === "keluar" ? "btn-danger text-white shadow-sm" : "btn-light text-muted border-0"
                    }`}
                    onClick={() => setFilterType("keluar")}
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 d-flex align-items-center gap-1.5"
                disabled={loading}
                title="Muat Ulang Data"
              >
                <i className={`bi bi-arrow-clockwise ${loading ? "spin" : ""}`} />
                <span>Segarkan</span>
              </button>

              {isAdmin ? (
                activeTab === "rekening" ? (
                  <button
                    type="button"
                    onClick={onAdd}
                    className="btn btn-warning btn-sm fw-bold text-dark rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
                  >
                    <i className="bi bi-plus-circle-fill text-dark" />
                    <span>Tambah Saluran Donasi</span>
                  </button>
                ) : activeTab === "transaksi" ? (
                  <button
                    type="button"
                    onClick={onAddTransaksi}
                    className="btn btn-success btn-sm fw-bold text-white rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
                  >
                    <i className="bi bi-plus-circle-fill text-white" />
                    <span>Tambah Transaksi</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onAddTagihan}
                    className="btn btn-danger btn-sm fw-bold text-white rounded-3 px-3.5 py-1.5 shadow-sm d-flex align-items-center gap-2"
                  >
                    <i className="bi bi-plus-circle-fill text-white" />
                    <span>Tambah Transaksi Tagihan</span>
                  </button>
                )
              ) : (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1.5 text-xs fw-semibold d-inline-flex align-items-center gap-1.5 shadow-xs">
                  <i className="bi bi-shield-check" />
                  <span>Transparansi Cabang</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: SALURAN REKENING (donasi) */}
      {activeTab === "rekening" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-table text-warning-emphasis" />
              <span className="fw-bold text-dark text-sm">Daftar Saluran Donasi (donasi)</span>
              <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 text-xxs">
                {filteredRecords.length} Data
              </span>
            </div>
            <div className="text-xxs text-muted">
              Skema: <code className="text-dark">id, nama_pemilik, nama_bank, alamat_rekening, created_at, updated_at</code>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 55 }}>
                      No
                    </th>
                    {isAdmin && (
                      <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 100 }}>
                        Aksi
                      </th>
                    )}
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Bank / Saluran (nama_bank)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Nama Pemilik (nama_pemilik)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Alamat Rekening / Nomor (alamat_rekening)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 140 }}>
                      Dibuat (created_at)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 140 }}>
                      Diperbarui (updated_at)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-warning me-2" role="status" />
                        <span className="text-muted text-xs">Memuat data donasi...</span>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <div
                            className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center mb-2"
                            style={{ width: 50, height: 50 }}
                          >
                            <i className="bi bi-heart text-danger fs-4" />
                          </div>
                          <h6 className="fw-bold text-dark mb-1 text-sm">Belum Ada Data Rekening</h6>
                          <p className="text-muted text-xs mb-3" style={{ maxWidth: 350 }}>
                            {searchQuery
                              ? `Tidak ada rekening yang cocok dengan kata kunci "${searchQuery}".`
                              : "Saluran donasi operasional database akan ditampilkan di sini."}
                          </p>
                          {searchQuery ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-xs rounded-pill px-3"
                              onClick={() => setSearchQuery("")}
                            >
                              Reset Pencarian
                            </button>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              className="btn btn-warning btn-sm fw-bold text-dark rounded-pill px-4 shadow-sm"
                              onClick={onAdd}
                            >
                              <i className="bi bi-plus-lg me-1" />
                              Tambah Saluran Sekarang
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, index) => {
                      const isCopied = copiedId === item.id;
                      const badgeClass = getBankBadge(item.nama_bank);
                      const iconClass = getBankIcon(item.nama_bank);

                      return (
                        <tr key={item.id}>
                          {/* No */}
                          <td className="text-center text-muted text-xs px-3 py-3">
                            {index + 1}
                          </td>

                          {/* Aksi */}
                          {isAdmin && (
                            <td className="text-center px-2 py-3">
                              <div className="d-inline-flex align-items-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-xs rounded-2 px-2 py-1"
                                  onClick={() => onEdit(item)}
                                  title="Edit Rekening"
                                >
                                  <i className="bi bi-pencil-square" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-xs rounded-2 px-2 py-1"
                                  onClick={() => onDelete(item)}
                                  title="Hapus Rekening"
                                >
                                  <i className="bi bi-trash3" />
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Nama Bank */}
                          <td className="px-3 py-3">
                            <span
                              className={`badge ${badgeClass} border rounded-pill px-2.5 py-1 text-xxs fw-bold d-inline-flex align-items-center gap-1.5`}
                            >
                              <i className={`bi ${iconClass}`} />
                              {item.nama_bank}
                            </span>
                          </td>

                          {/* Nama Pemilik */}
                          <td className="px-3 py-3">
                            <div className="fw-semibold text-dark text-xs">{item.nama_pemilik}</div>
                          </td>

                          {/* Alamat Rekening */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center gap-1.5">
                              <code className="text-dark bg-light px-2.5 py-1 rounded border text-xs font-monospace select-all">
                                {item.alamat_rekening}
                              </code>
                              <button
                                type="button"
                                className={`btn btn-xs rounded-circle p-1 d-inline-flex align-items-center justify-content-center transition-all ${
                                  isCopied ? "btn-success text-white" : "btn-outline-secondary"
                                }`}
                                style={{ width: 26, height: 26 }}
                                onClick={() => handleCopy(item.alamat_rekening, item.id)}
                                title="Salin Nomor Rekening"
                              >
                                <i className={`bi ${isCopied ? "bi-check2" : "bi-clipboard"}`} style={{ fontSize: 11 }} />
                              </button>
                            </div>
                          </td>

                          {/* Dibuat (created_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.created_at)}
                          </td>

                          {/* Diperbarui (updated_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.updated_at)}
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
      )}

      {/* TAB 2: TRANSAKSI DONASI (donasi_transaksi) */}
      {activeTab === "transaksi" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-receipt text-success" />
              <span className="fw-bold text-dark text-sm">Riwayat Transaksi (donasi_transaksi)</span>
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold">
                {filteredTransaksi.length} Transaksi
              </span>
            </div>
            <div className="text-xxs text-muted">
              Skema: <code className="text-dark">id, nama_pengirim, tanggal, jumlah_transaksi_masuk, jumlah_transaksi_keluar, keterangan, created_at, updated_at</code>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 50 }}>
                      No
                    </th>
                    {isAdmin && (
                      <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 90 }}>
                        Aksi
                      </th>
                    )}
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 125 }}>
                      Tanggal
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Nama Pengirim / Pihak
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase">
                      Keterangan
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-end" style={{ width: 160 }}>
                      Masuk (jumlah_transaksi_masuk)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-end" style={{ width: 160 }}>
                      Keluar (jumlah_transaksi_keluar)
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 130 }}>
                      Dibuat
                    </th>
                    <th className="px-3 py-3 text-muted fw-semibold text-xxs text-uppercase text-center" style={{ width: 130 }}>
                      Diperbarui
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Baris Saldo Awal (Sisa Kas Bulan Kemarin) */}
                  {!loading && (filterType === "all" || filterType === "masuk") && selectedMonth !== "all" && saldoAwalBulanLalu !== 0 && (
                    <tr className="table-primary bg-primary-subtle bg-opacity-25 border-bottom border-primary-subtle">
                      <td className="text-center text-primary fw-bold text-xxs px-3 py-2.5">
                        <i className="bi bi-clock-history fs-6" />
                      </td>
                      {isAdmin && (
                        <td className="text-center px-2 py-2.5">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5 text-xxs font-monospace">
                            Awal Bulan
                          </span>
                        </td>
                      )}
                      <td className="text-center text-primary text-xs px-3 py-2.5">
                        <span className="badge bg-light text-primary border rounded-pill px-2 py-0.5 text-xxs font-monospace">
                          Awal Periode
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="d-flex align-items-center gap-1.5">
                          <i className="bi bi-wallet2 text-primary" />
                          <span className="fw-bold text-primary text-xs">
                            Saldo Awal (Sisa Kas Bulan Kemarin)
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-primary text-xxs fst-italic">
                        Akumulasi sisa kas sebelum periode {formatMonthLabel(selectedMonth)}
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                          +{formatRupiah(saldoAwalBulanLalu)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-end text-muted text-xxs">-</td>
                      <td className="px-3 py-2.5 text-center text-muted text-xxs">-</td>
                      <td className="px-3 py-2.5 text-center text-muted text-xxs">-</td>
                    </tr>
                  )}

                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                        <span className="text-muted text-xs">Memuat data transaksi...</span>
                      </td>
                    </tr>
                  ) : filteredTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <div
                            className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center mb-2"
                            style={{ width: 50, height: 50 }}
                          >
                            <i className="bi bi-receipt-cutoff fs-4" />
                          </div>
                          <h6 className="fw-bold text-dark mb-1 text-sm">Belum Ada Riwayat Transaksi</h6>
                          <p className="text-muted text-xs mb-3" style={{ maxWidth: 380 }}>
                            {searchQuery || filterType !== "all"
                              ? "Tidak ada transaksi yang sesuai dengan filter atau kata kunci pencarian."
                              : "Riwayat donasi masuk dan biaya pemeliharaan server akan tercatat di sini."}
                          </p>
                          {searchQuery || filterType !== "all" ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-xs rounded-pill px-3"
                              onClick={() => {
                                setSearchQuery("");
                                setFilterType("all");
                              }}
                            >
                              Reset Filter
                            </button>
                          ) : isAdmin && onAddTransaksi ? (
                            <button
                              type="button"
                              className="btn btn-success btn-sm fw-bold text-white rounded-pill px-4 shadow-sm"
                              onClick={onAddTransaksi}
                            >
                              <i className="bi bi-plus-lg me-1" />
                              Tambah Transaksi Sekarang
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransaksi.map((item, index) => {
                      const masuk = Number(item.jumlah_transaksi_masuk) || 0;
                      const keluar = Number(item.jumlah_transaksi_keluar) || 0;

                      return (
                        <tr key={item.id}>
                          {/* No */}
                          <td className="text-center text-muted text-xs px-3 py-3">
                            {index + 1}
                          </td>

                          {/* Aksi */}
                          {isAdmin && (
                            <td className="text-center px-2 py-3">
                              <div className="d-inline-flex align-items-center gap-1">
                                {onEditTransaksi && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-xs rounded-2 px-2 py-1"
                                    onClick={() => onEditTransaksi(item)}
                                    title="Edit Transaksi"
                                  >
                                    <i className="bi bi-pencil-square" />
                                  </button>
                                )}
                                {onToggleHideNamaTransaksi && (
                                  <button
                                    type="button"
                                    className={`btn btn-xs rounded-2 px-2 py-1 ${
                                      Number(item.hidden_nama_pengirim) === 1
                                        ? "btn-secondary text-white"
                                        : "btn-outline-secondary"
                                    }`}
                                    onClick={() => onToggleHideNamaTransaksi(item)}
                                    title={
                                      Number(item.hidden_nama_pengirim) === 1
                                        ? "Status: Sembunyi di Publik (*******). Klik untuk TAMPILKAN nama pengirim di publik"
                                        : "Status: Tampil Nama di Publik. Klik untuk SEMBUNYIKAN nama pengirim (*******) di publik"
                                    }
                                  >
                                    <i className={`bi ${Number(item.hidden_nama_pengirim) === 1 ? "bi-eye-slash-fill" : "bi-eye"}`} />
                                  </button>
                                )}
                                {onDeleteTransaksi && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-xs rounded-2 px-2 py-1"
                                    onClick={() => onDeleteTransaksi(item)}
                                    title="Hapus Transaksi"
                                  >
                                    <i className="bi bi-trash3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Tanggal */}
                          <td className="px-3 py-3 text-center text-xs fw-semibold text-dark">
                            {(() => {
                              const { date, time } = formatDateTimeDisplay(item.tanggal, item.created_at);
                              return (
                                <div className="d-flex flex-column align-items-center justify-content-center gap-0.5">
                                  <div className="d-inline-flex align-items-center gap-1.5 bg-light px-2 py-0.5 rounded-pill border text-xxs font-monospace">
                                    <i className="bi bi-calendar-event text-primary" />
                                    <span>{date}</span>
                                  </div>
                                  {time ? (
                                    <span className="text-muted text-xxs d-inline-flex align-items-center gap-1 font-monospace" style={{ fontSize: "0.68rem" }}>
                                      <i className="bi bi-clock text-secondary" style={{ fontSize: "0.65rem" }} />
                                      {time} WIB
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Nama Pengirim */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className={`rounded-circle ${
                                  masuk > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                                } d-flex align-items-center justify-content-center flex-shrink-0`}
                                style={{ width: 26, height: 26 }}
                              >
                                <i className={`bi ${masuk > 0 ? "bi-arrow-down-left" : "bi-arrow-up-right"} text-xxs`} />
                              </div>
                              <div className="d-flex align-items-center flex-wrap gap-1">
                                <span className="fw-bold text-dark text-xs">{item.nama_pengirim || "*******"}</span>
                                {onToggleHideNamaTransaksi ? (
                                  <button
                                    type="button"
                                    onClick={() => onToggleHideNamaTransaksi(item)}
                                    className={`btn btn-xs rounded-pill px-1.5 py-0.5 ms-1 align-middle ${
                                      Number(item.hidden_nama_pengirim) === 1
                                        ? "btn-secondary text-white"
                                        : "btn-outline-secondary text-muted"
                                    }`}
                                    style={{ fontSize: "0.68rem" }}
                                    title={
                                      Number(item.hidden_nama_pengirim) === 1
                                        ? "Publik melihat: ******* (Sembunyi). Klik untuk tampilkan nama asli di publik"
                                        : "Publik melihat nama asli. Klik untuk sembunyikan sebagai ******* di publik"
                                    }
                                  >
                                    <i className={`bi ${Number(item.hidden_nama_pengirim) === 1 ? "bi-eye-slash-fill me-1" : "bi-eye me-1"}`} />
                                    {Number(item.hidden_nama_pengirim) === 1 ? "Publik: Hidden" : "Publik: Tampil"}
                                  </button>
                                ) : (
                                  Number(item.hidden_nama_pengirim) === 1 && (
                                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill ms-1.5 px-1.5 py-0.5 text-xxs" title="Nama disembunyikan sebagai '*******' di rincian publik">
                                      <i className="bi bi-eye-slash me-0.5" /> Publik: *******
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Keterangan */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center flex-wrap gap-1">
                              <span className="badge bg-light text-secondary border rounded-pill px-2.5 py-1 text-xxs fw-medium">
                                {item.keterangan || "donasi masuk"}
                              </span>
                              {keluar > 0 && (
                                <span className="badge bg-warning-subtle text-dark border border-warning-subtle rounded-pill px-1.5 py-0.5 text-xxs" title="Tagihan pemakaian server bulan sebelumnya yang dibayar di bulan ini">
                                  <i className="bi bi-clock-history me-0.5" /> Tagihan server bln lalu
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Jumlah Transaksi Masuk */}
                          <td className="px-3 py-3 text-end">
                            {masuk > 0 ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                                +{formatRupiah(masuk)}
                              </span>
                            ) : (
                              <span className="text-muted text-xxs">-</span>
                            )}
                          </td>

                          {/* Jumlah Transaksi Keluar */}
                          <td className="px-3 py-3 text-end">
                            {keluar > 0 ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                                -{formatRupiah(keluar)}
                              </span>
                            ) : (
                              <span className="text-muted text-xxs">-</span>
                            )}
                          </td>

                          {/* Waktu Input (created_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.created_at)}
                          </td>

                          {/* Waktu Update (updated_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.updated_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer Summary */}
                <tfoot className="table-light border-top">
                  <tr className="fw-bold text-xs">
                    <td colSpan={isAdmin ? 5 : 4} className="text-end px-3 py-2.5 text-dark">
                      Total Mutasi {selectedMonth === "all" ? "Seluruh Periode" : `Bulan ${formatMonthLabel(selectedMonth)}`}:
                    </td>
                    <td className="text-end px-3 py-2.5 text-success font-monospace">
                      +{formatRupiah(totalNominalMasuk)}
                    </td>
                    <td className="text-end px-3 py-2.5 text-danger font-monospace">
                      -{formatRupiah(totalNominalKeluar)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="bg-success-subtle bg-opacity-25 fw-bold text-xs border-top">
                    <td colSpan={isAdmin ? 5 : 4} className="text-end px-3 py-2.5 text-dark">
                      <span className="d-inline-flex align-items-center gap-1.5">
                        <i className="bi bi-wallet2 text-success fs-6" />
                        Total Kas Tersedia (Saldo Akhir):
                      </span>
                    </td>
                    <td colSpan={2} className={`text-end px-3 py-2.5 ${totalKasTersedia >= 0 ? "text-success" : "text-danger"} font-monospace fs-6`}>
                      {formatRupiah(totalKasTersedia)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSAKSI TAGIHAN (donasi_transaksi_tagihan) */}
      {activeTab === "tagihan" && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-receipt-cutoff text-danger" />
              <span className="fw-bold text-dark text-sm">Riwayat Transaksi Tagihan (donasi_transaksi_tagihan)</span>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 text-xxs fw-bold">
                {filteredTagihan.length} Data Tagihan
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-muted border text-xxs font-monospace">
                Total Tagihan: {formatRupiah(totalNominalTagihan)}
              </span>
              <span className="text-xxs text-muted d-none d-lg-inline">
                Skema: <code className="text-dark">id, nama_pengirim, tanggal, jumlah_tagihan, keterangan, created_at, updated_at</code>
              </span>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "65vh" }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light border-bottom sticky-top text-xxs text-muted text-uppercase fw-bold">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-center" style={{ width: 60 }}>
                      No / ID
                    </th>
                    {isAdmin && (
                      <th scope="col" className="px-3 py-2.5 text-center" style={{ width: 175 }}>
                        Aksi
                      </th>
                    )}
                    <th scope="col" className="px-3 py-2.5" style={{ minWidth: 140 }}>
                      Tanggal Tagihan
                    </th>
                    <th scope="col" className="px-3 py-2.5" style={{ minWidth: 200 }}>
                      Nama Pengirim / Vendor
                    </th>
                    <th scope="col" className="px-3 py-2.5" style={{ minWidth: 220 }}>
                      Keterangan Tagihan
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-end" style={{ minWidth: 150 }}>
                      Jumlah Tagihan (Rp)
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-center" style={{ width: 130 }}>
                      Dicatat Pada
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-center" style={{ width: 130 }}>
                      Diperbarui
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y">
                  {filteredTagihan.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="text-center py-5 text-muted">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <i className="bi bi-receipt text-secondary fs-1 mb-2 opacity-50" />
                          <h6 className="fw-semibold text-dark mb-1">Belum Ada Transaksi Tagihan</h6>
                          <p className="text-muted text-xs mb-3" style={{ maxWidth: 360 }}>
                            {searchQuery
                              ? `Tidak ada data tagihan yang cocok dengan kata kunci "${searchQuery}".`
                              : `Belum ada catatan transaksi tagihan pada periode ${formatMonthLabel(selectedMonth)}.`}
                          </p>
                          {isAdmin && onAddTagihan && (
                            <button
                              type="button"
                              onClick={onAddTagihan}
                              className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 text-xs fw-semibold shadow-xs d-flex align-items-center gap-1.5"
                            >
                              <i className="bi bi-plus-circle" />
                              <span>Catat Transaksi Tagihan Baru</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTagihan.map((item, idx) => {
                      const tagihanVal = Number(item.jumlah_tagihan) || 0;
                      const dt = formatDateTimeDisplay(item.tanggal, item.created_at);

                      return (
                        <tr key={String(item.id || idx)}>
                          {/* No / ID */}
                          <td className="px-3 py-3 text-center">
                            <span className="badge bg-light text-secondary border rounded-pill px-2 py-1 font-monospace text-xxs">
                              #{item.id ?? idx + 1}
                            </span>
                          </td>

                          {/* Aksi (Admin Only) */}
                          {isAdmin && (
                            <td className="px-3 py-3 text-center">
                              <div className="d-flex align-items-center justify-content-center gap-1.5 flex-wrap">
                                {onPayTagihan && (
                                  <button
                                    type="button"
                                    onClick={() => onPayTagihan(item)}
                                    className="btn btn-success btn-xs rounded-pill px-2.5 py-1 text-white fw-bold shadow-xs d-inline-flex align-items-center gap-1"
                                    title="Bayar tagihan ini (Catat di donasi_transaksi sebagai Transaksi Keluar)"
                                  >
                                    <i className="bi bi-wallet2" />
                                    <span>Bayar</span>
                                  </button>
                                )}
                                {onEditTagihan && (
                                  <button
                                    type="button"
                                    onClick={() => onEditTagihan(item)}
                                    className="btn btn-outline-secondary btn-xs rounded-2 px-2 py-1 hover-shadow"
                                    title="Edit Data Tagihan"
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>
                                )}
                                {onDeleteTagihan && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTagihan(item)}
                                    className="btn btn-outline-danger btn-xs rounded-2 px-2 py-1 hover-shadow"
                                    title="Hapus Data Tagihan"
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Tanggal Tagihan */}
                          <td className="px-3 py-3">
                            <div className="d-flex flex-column">
                              <span className="fw-semibold text-dark">{dt.date}</span>
                              {dt.time && (
                                <span className="text-muted text-xxs font-monospace d-flex align-items-center gap-1">
                                  <i className="bi bi-clock" /> {dt.time} WIB
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Nama Pengirim / Vendor */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 28, height: 28 }}
                              >
                                <i className="bi bi-building text-xxs" />
                              </div>
                              <span className="fw-bold text-dark text-xs">{item.nama_pengirim || "Vendor Layanan"}</span>
                            </div>
                          </td>

                          {/* Keterangan */}
                          <td className="px-3 py-3">
                            <div className="d-flex align-items-center flex-wrap gap-1">
                              <span className="badge bg-light text-secondary border rounded-pill px-2.5 py-1 text-xxs fw-medium">
                                {item.keterangan || "tagihan bulan ini"}
                              </span>
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-1.5 py-0.5 text-xxs">
                                <i className="bi bi-tag-fill me-0.5" /> Tagihan
                              </span>
                            </div>
                          </td>

                          {/* Jumlah Tagihan */}
                          <td className="px-3 py-3 text-end">
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 text-xs fw-bold font-monospace">
                              {formatRupiah(tagihanVal)}
                            </span>
                          </td>

                          {/* Waktu Input (created_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.created_at)}
                          </td>

                          {/* Waktu Update (updated_at) */}
                          <td className="px-3 py-3 text-center text-muted text-xxs">
                            {formatDateDisplay(item.updated_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer Summary */}
                <tfoot className="table-light border-top">
                  <tr className="fw-bold text-xs">
                    <td colSpan={isAdmin ? 5 : 4} className="text-end px-3 py-2.5 text-dark">
                      Total Transaksi Tagihan {selectedMonth === "all" ? "Seluruh Periode" : `Bulan ${formatMonthLabel(selectedMonth)}`}:
                    </td>
                    <td className="text-end px-3 py-2.5 text-danger font-monospace fs-6">
                      {formatRupiah(totalNominalTagihan)}
                    </td>
                    <td colSpan={2} className="text-muted text-xxs px-3 py-2.5">
                      ({filteredTagihan.length} invoice tagihan tercatat)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Info Petunjuk Transparansi Pusat & Cabang */}
      <div className="mt-3 card bg-light border-0 rounded-4 p-3.5">
        <div className="d-flex align-items-start gap-3">
          <div className="rounded-circle bg-primary text-white p-2 d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="bi bi-shield-check fs-6" />
          </div>
          <div className="text-xs text-secondary">
            <strong className="text-dark">Petunjuk Transparansi Donasi &amp; Operasional Database:</strong>
            <ul className="mb-0 ps-3 mt-1 d-flex flex-column gap-1">
              <li>
                <strong>Pusat &amp; Seluruh Cabang:</strong> Riwayat mutasi donasi masuk dan tagihan server ditampilkan secara terbuka agar seluruh pengurus cabang dapat memantau kesehatan kas operasional sistem bersama-sama.
              </li>
              <li>
                <strong>Hak Kelola Admin Pusat:</strong> Penambahan saluran rekening baru dan pencatatan transaksi mutasi hanya dikelola oleh Akun Admin Pusat demi menjaga akuntabilitas data.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
