// ════════════════════════════════════════════
// KONTAKTET E NEARBUY.AL
// Plotëso këtu dhe ndryshohen kudo në faqe.
// Çdo fushë që lihet bosh "" nuk shfaqet.
// ════════════════════════════════════════════

export const SITE_CONTACT = {
  // Numri i biznesit, p.sh. "+355 69 123 4567"
  phone: "",
  // Numri i WhatsApp-it (zakonisht i njëjti me telefonin), p.sh. "+355 69 123 4567"
  whatsapp: "",
  // Email-i nga host.al, p.sh. "info@nearbuy.al"
  email: "",
  // Linqet e plota, p.sh. "https://facebook.com/nearbuy.al"
  facebook: "",
  instagram: "",
};

// Mesazhi që del i shkruar kur dikush hap WhatsApp-in nga faqja
export const WHATSAPP_DEFAULT_MESSAGE = "Përshëndetje NearBuy! Kam një pyetje:";

export function siteWhatsAppLink(message = WHATSAPP_DEFAULT_MESSAGE): string {
  let digits = SITE_CONTACT.whatsapp.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "355" + digits.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function sitePhoneLink(): string {
  const p = SITE_CONTACT.phone.replace(/[^\d+]/g, "");
  return p ? `tel:${p}` : "";
}
