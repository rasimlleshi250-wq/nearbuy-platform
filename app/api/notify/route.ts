// Njoftimet për adminin në Telegram.
// Faqja thërret këtë adresë pas një veprimi (kërkesë, paketë, regjistrim) duke dërguar vetëm ID-në.
// Serveri e lexon vetë dokumentin nga databaza, kontrollon që është i ri dhe nuk është njoftuar,
// dhe vetëm atëherë dërgon mesazhin. Kështu askush nuk mund të dërgojë njoftime të rreme.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { sendTelegram, esc } from "@/lib/server/telegram";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nearbuy.al";
const FRESH_MS = 15 * 60 * 1000; // pranohen vetëm dokumente të 15 minutave të fundit

const PLAN_NAMES: Record<string, string> = {
  baze: "Bazë (€10)", plus: "Plus (€15)", premium: "Premium", standard: "Pro (€10)",
  basic: "Bazë (€10)", advanced: "Plus (€15)", pro: "Premium (€20)",
};

type Body = { event: string; id?: string; kind?: "business" | "professional" };

function isFresh(ts: unknown): boolean {
  const t = ts as { toMillis?: () => number } | undefined;
  return !!t?.toMillis && Date.now() - t.toMillis() < FRESH_MS;
}

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { event, id, kind } = body;
  if (!event || !id || typeof id !== "string" || id.length > 100) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const db = adminDb();

    // ── Kërkesë klienti për produkt pa dyqan ───────────────────
    if (event === "customer_request") {
      const ref = db.collection("customer_requests").doc(id);
      const d = (await ref.get()).data();
      if (!d || d.adminNotified || !isFresh(d.createdAt)) return NextResponse.json({ ok: true, skipped: true });
      const unserved = !d.sentTo;
      await sendTelegram(
        `${unserved ? "🎯 <b>Kërkesë pa partner</b>" : "📦 <b>Kërkesë e re për produkt</b>"}\n` +
        `${esc(d.productName)}\n📍 ${esc(d.city)} · ${esc(d.category)}\n👤 ${esc(d.name)} · ${esc(d.phone)}` +
        (d.note ? `\n📝 ${esc(d.note)}` : "") +
        `\n${unserved ? "⚠️ Asnjë dyqan me paketë s'e mori — kontakto klientin ose gjej partner." : `→ u dërgua te ${d.sentTo} dyqane`}` +
        `\n<a href="${SITE}/admin/customer-requests">Hape në panel</a>`);
      await ref.update({ adminNotified: true });
    }

    // ── Kërkesë për punë (mjeshtër) ─────────────────────────────
    else if (event === "job_request") {
      const ref = db.collection("job_requests").doc(id);
      const d = (await ref.get()).data();
      if (!d || d.adminNotified || !isFresh(d.createdAt)) return NextResponse.json({ ok: true, skipped: true });
      const unserved = !d.sentTo;
      await sendTelegram(
        `${unserved ? "🎯 <b>Punë pa mjeshtër</b>" : "🛠 <b>Kërkesë e re për punë</b>"}\n` +
        `${esc(d.profession)} · 📍 ${esc(d.city)} · ${esc(d.urgency)}\n"${esc(d.description)}"\n👤 ${esc(d.name)} · ${esc(d.phone)}` +
        `\n${unserved ? "⚠️ Asnjë mjeshtër me paketë s'e mori — kontakto klientin ose gjej mjeshtër." : `→ u dërgua te ${d.sentTo} mjeshtër`}` +
        `\n<a href="${SITE}/admin/customer-requests">Hape në panel</a>`);
      await ref.update({ adminNotified: true });
    }

    // ── Biznesi kërkoi produkte të reja në katalog ──────────────
    else if (event === "product_requests") {
      const biz = (await db.collection("businesses").doc(id).get()).data();
      const snap = await db.collection("product_requests")
        .where("businessId", "==", id).where("status", "==", "pending").get();
      const fresh = snap.docs.filter(d => !d.data().adminNotified && isFresh(d.data().createdAt));
      if (fresh.length === 0) return NextResponse.json({ ok: true, skipped: true });
      const names = fresh.slice(0, 5).map(d => `• ${esc(d.data().name)}`).join("\n");
      await sendTelegram(
        `📥 <b>${esc(biz?.name || "Një biznes")}</b> kërkoi ${fresh.length} produkte të reja\n${names}` +
        (fresh.length > 5 ? `\n… dhe ${fresh.length - 5} të tjera` : "") +
        `\n<a href="${SITE}/admin/product-requests">Shqyrtoji</a>`);
      const batch = db.batch();
      fresh.forEach(d => batch.update(d.ref, { adminNotified: true }));
      await batch.commit();
    }

    // ── Kërkesë për paketë (duhet marrë pagesa) ─────────────────
    else if (event === "plan_request") {
      const col = kind === "professional" ? "professionals" : "businesses";
      const ref = db.collection(col).doc(id);
      const d = (await ref.get()).data();
      if (!d || d.planStatus !== "pending" || !d.requestedPlan) return NextResponse.json({ ok: true, skipped: true });
      const at = (d.planRequestedAt as { toMillis?: () => number } | undefined)?.toMillis?.() || 0;
      const key = `${d.requestedPlan}-${at}`;
      if (d.planRequestNotified === key) return NextResponse.json({ ok: true, skipped: true });
      await sendTelegram(
        `💶 <b>Kërkesë për paketë</b>\n${kind === "professional" ? "🛠" : "🏪"} ${esc(d.name)} · ${esc(d.city)}\n` +
        `Kërkon: <b>${esc(PLAN_NAMES[String(d.requestedPlan)] || d.requestedPlan)}</b>\n📞 ${esc(d.phone)}` +
        `\nMerr pagesën dhe aprovoje: <a href="${SITE}/admin/${col}">${col === "businesses" ? "Bizneset" : "Profesionistët"}</a>`);
      await ref.update({ planRequestNotified: key });
    }

    // ── Regjistrim i ri ─────────────────────────────────────────
    else if (event === "new_signup") {
      const col = kind === "professional" ? "professionals" : "businesses";
      const ref = db.collection(col).doc(id);
      const d = (await ref.get()).data();
      if (!d || d.signupNotified || d.verified) return NextResponse.json({ ok: true, skipped: true });
      await sendTelegram(
        `🆕 <b>${kind === "professional" ? "Mjeshtër i ri" : "Biznes i ri"}</b> në pritje aprovimi\n` +
        `${esc(d.name)} · ${esc(d.profession || d.category || "")} · 📍 ${esc(d.city)}\n📞 ${esc(d.phone)}` +
        `\n<a href="${SITE}/admin/${col}">Aprovoje</a>`);
      await ref.update({ signupNotified: FieldValue.serverTimestamp() });
    }

    else return NextResponse.json({ ok: false }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notify:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
