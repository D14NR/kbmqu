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

export function formatWhatsAppUrl(phone: string): string {
  const clean = sanitizeWhatsappDigits(phone);
  return clean ? `https://wa.me/62${clean}` : "";
}
