// Çdo mëngjes (Vercel Cron): kujtesa për paketat që skadojnë + përmbledhje për adminin në Telegram.
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { sendTelegram, esc } from "@/lib/server/telegram";
import { sendEmail, emailLayout, ownerEmail, SITE } from "@/lib/server/email";
import { toDate } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMES: Record<string, string> = {
  baze: "Bazë", plus: "Plus", premium: "Premium", standard: "Pro", basic: "Bazë", advanced: "Plus", pro: "Premium",
};

export async function GET(req: Request) {
  // Vetëm Vercel Cron (me CRON_SECRET) mund ta thërrasë
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = adminDb();
  const summary: string[] = [];
  let emails = 0;

  for (const kind of ["business", "professional"] as const) {
    const col = kind === "business" ? "businesses" : "professionals";
    const snap = await db.collection(col).where("planStatus", "==", "active").get();
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const end = toDate(d.subscriptionEnd);
      if (!end || !d.subscription || d.subscription === "free") continue;
      const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
      const plan = NAMES[String(d.subscription)] || String(d.subscription);
      const dash = `${SITE}/dashboard/${kind === "business" ? "business" : "professional"}`;
      const endText = end.toLocaleDateString("sq-AL", { day: "numeric", month: "long" });

      if (daysLeft <= 7) summary.push(`${daysLeft < 0 ? "🔴" : "🟡"} ${esc(d.name)} · ${plan} · ${daysLeft < 0 ? "skadoi" : daysLeft === 0 ? "skadon sot" : `${daysLeft} ditë`} · ${esc(d.phone || "")}`);

      // Një email për çdo moment: 7 ditë para, 1 ditë para, dhe kur skadon
      const stage = daysLeft === 7 ? "7" : daysLeft === 1 ? "1" : daysLeft <= 0 && daysLeft >= -2 ? "0" : null;
      if (!stage) continue;
      const key = `${toDate(d.subscriptionEnd)?.toISOString().slice(0, 10)}-${stage}`;
      if (d.expiryNotice === key) continue;
      const to = await ownerEmail(kind, docSnap.id, d);
      const sent = await sendEmail(to,
        stage === "0" ? `⚠️ Paketa ${plan} skadoi` : `⏰ Paketa ${plan} skadon ${stage === "1" ? "nesër" : "për 7 ditë"}`,
        emailLayout(
          stage === "0" ? "Paketa jote skadoi" : "Paketa jote po skadon",
          stage === "0"
            ? `<p>Paketa <b>${plan}</b> për <b>${esc(d.name)}</b> skadoi më ${endText}. ${kind === "business"
                ? "Produktet e tua mbeten në faqe, por nuk renditen më lart dhe ofertat nuk shfaqen."
                : "Nuk merr më kërkesa për punë nga klientët."}</p><p>Rinovoje që të mos humbasësh klientët.</p>`
            : `<p>Paketa <b>${plan}</b> për <b>${esc(d.name)}</b> skadon më <b>${endText}</b>.</p><p>Rinovoje që ${kind === "business" ? "dyqani yt të mbetet lart në kërkim" : "të vazhdosh të marrësh kërkesa për punë"}.</p>`,
          { label: "Rinovo paketën", href: dash }));
      if (sent) { emails++; await docSnap.ref.update({ expiryNotice: key }); }
    }
  }

  if (summary.length > 0) {
    await sendTelegram(`📅 <b>Paketat që skadojnë (7 ditë)</b>\n${summary.join("\n")}\n<a href="${SITE}/admin">Hap panelin</a>`);
  }
  return NextResponse.json({ ok: true, expiring: summary.length, emails });
}
