/**
 * Normalizes any Indonesian phone number / WhatsApp input to format without country code or leading 0.
 * Examples:
 *  +62 856-4127-2104 -> 85641272104
 *  +6285641272104    -> 85641272104
 *  6285641272104     -> 85641272104
 *  085641272104      -> 85641272104
 *  85641272104       -> 85641272104
 */
export function sanitizeWhatsappDigits(value: string): string {
  let digits = String(value || "").replace(/\D/g, "");
  while (digits.startsWith("62") || digits.startsWith("0")) {
    if (digits.startsWith("62")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
  }
  return digits;
}

export function formatWhatsAppUrl(phone: string, text?: string): string {
  const clean = sanitizeWhatsappDigits(phone);
  if (!clean) return "";
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/62${clean}${query}`;
}

export function createPengajarOnboardingMessage(params: {
  nama?: string;
  kode?: string;
  cabang?: string;
  username?: string;
  password?: string;
  appUrl?: string;
}): string {
  const nama = params.nama ? params.nama.trim() : "Pengajar";
  const kode = params.kode || "-";
  const cabang = params.cabang || "-";
  const username = params.username || "-";
  const password = params.password || "-";

  let portalUrl = params.appUrl;
  if (!portalUrl) {
    portalUrl =
      typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev")
        ? window.location.origin
        : "https://tugaskita.pages.dev";
  }

  return `Halo Bapak/Ibu ${nama},

Berikut adalah akun akses portal jadwal KBM Anda:
* Kode Pengajar: ${kode}
* Cabang: ${cabang}
* Username: ${username}
* Password: ${password}

Silakan login melalui: ${portalUrl}

Terima kasih.`;
}
