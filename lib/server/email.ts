// Email-et për bizneset dhe mjeshtrat, me Resend (RESEND_API_KEY + EMAIL_FROM në Vercel).
import { adminDb } from "./firebaseAdmin";
import { esc } from "./telegram";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nearbuy.al";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "NearBuy <njoftime@nearbuy.al>";
  if (!key) { console.error("Resend: mungon RESEND_API_KEY në Vercel"); return false; }
  if (!to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("Resend:", res.status, await res.text());
  return res.ok;
}

// Shablloni i përbashkët i email-eve
export function emailLayout(title: string, bodyHtml: string, button?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
      <tr><td style="background:#111111;padding:18px 24px;font-size:20px;font-weight:bold;color:#ffffff">Near<span style="color:#f5c842">Buy</span>.al</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#111111">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#3f3f46">${bodyHtml}</div>
        ${button ? `<p style="margin:24px 0 0"><a href="${button.href}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">${button.label}</a></p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
        Ky email u dërgua automatikisht nga NearBuy.al sepse ke një profil në platformë.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// Email-i i pronarit të një biznesi ose mjeshtri (nga koleksioni users)
export async function ownerEmail(kind: "business" | "professional", id: string, doc?: Record<string, unknown>): Promise<string> {
  const db = adminDb();
  const d = doc || (await db.collection(kind === "business" ? "businesses" : "professionals").doc(id).get()).data() || {};
  if (typeof d.email === "string" && d.email.includes("@")) return d.email;
  const uid = String(d.ownerUID || d.uid || id);
  const u = (await db.collection("users").doc(uid).get()).data();
  return typeof u?.email === "string" ? u.email : "";
}

export { SITE, esc };
