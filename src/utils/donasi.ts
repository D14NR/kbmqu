import type { DonasiTransaksiRecord, DonasiTransaksiTagihanRecord } from "../types/donasi";

/**
 * Normalizes date to DD/MM/YYYY string format
 */
export function getTagihanDateFormatted(dateStr?: string, fallback?: string): string {
  const raw = dateStr || fallback || "";
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[3]}/${match[2]}/${match[1]}`;
      return raw.split("T")[0];
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
}

/**
 * Checks whether a given bill (donasi_transaksi_tagihan) has a corresponding
 * payment transaction (donasi_transaksi with jumlah_transaksi_keluar > 0).
 */
export function findMatchingPaymentTransaction(
  tagihan: DonasiTransaksiTagihanRecord,
  transaksiList: DonasiTransaksiRecord[]
): DonasiTransaksiRecord | undefined {
  const tagihanNominal = Number(tagihan.jumlah_tagihan) || 0;
  if (tagihanNominal <= 0) return undefined;

  const rawTagihanDate = tagihan.tanggal || tagihan.created_at || "";
  const datePattern = getTagihanDateFormatted(tagihan.tanggal, tagihan.created_at);
  const tagihanVendor = (tagihan.nama_pengirim || "").trim().toLowerCase();
  const tagihanIdStr = String(tagihan.id || "");

  // Only consider outgoing transactions (biaya/pengeluaran)
  const keluarList = (transaksiList || []).filter(
    (t) => Number(t.jumlah_transaksi_keluar) > 0
  );

  // 1. Direct tagihan id reference in keterangan (e.g. #tagihan:8 or #donasi_transaksi_tagihan:8)
  if (tagihanIdStr) {
    const byId = keluarList.find((t) => {
      const ket = (t.keterangan || "").toLowerCase();
      return (
        ket.includes(`#tagihan:${tagihanIdStr}`) ||
        ket.includes(`#tagihan_${tagihanIdStr}`) ||
        ket.includes(`#donasi_transaksi_tagihan:${tagihanIdStr}`)
      );
    });
    if (byId) return byId;
  }

  // 2. Exact amount + vendor + date pattern in keterangan (e.g. "biaya perpanjangan... (27/10/2026)")
  if (datePattern) {
    const byDateAndAmount = keluarList.find((t) => {
      const nominalMatch = Number(t.jumlah_transaksi_keluar) === tagihanNominal;
      const ket = t.keterangan || "";
      const dateMatch = ket.includes(datePattern);
      const vendorMatch =
        !tagihanVendor ||
        (t.nama_pengirim || "").toLowerCase().includes(tagihanVendor) ||
        tagihanVendor.includes((t.nama_pengirim || "").toLowerCase());
      return nominalMatch && dateMatch && vendorMatch;
    });
    if (byDateAndAmount) return byDateAndAmount;
  }

  // 3. Exact amount + vendor + close date (within 45 days)
  const byAmountAndVendor = keluarList.find((t) => {
    const nominalMatch = Number(t.jumlah_transaksi_keluar) === tagihanNominal;
    if (!nominalMatch) return false;
    const vendorMatch =
      !tagihanVendor ||
      (t.nama_pengirim || "").toLowerCase().includes(tagihanVendor) ||
      tagihanVendor.includes((t.nama_pengirim || "").toLowerCase());
    if (!vendorMatch) return false;

    // Check dates proximity if available
    const tDateRaw = t.tanggal || t.created_at;
    if (rawTagihanDate && tDateRaw) {
      try {
        const d1 = new Date(rawTagihanDate).getTime();
        const d2 = new Date(tDateRaw).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
          if (diffDays <= 45) return true;
        }
      } catch {}
    }
    return true;
  });

  return byAmountAndVendor;
}

/**
 * Returns true if the bill has already been paid
 */
export function isTagihanPaid(
  tagihan: DonasiTransaksiTagihanRecord,
  transaksiList: DonasiTransaksiRecord[]
): boolean {
  return Boolean(findMatchingPaymentTransaction(tagihan, transaksiList));
}
