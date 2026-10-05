// Njoftimet për adminin në Telegram.
// Faqja thërret këtë adresë pas një veprimi (kërkesë, paketë, regjistrim) duke dërguar vetëm ID-në.
// Serveri e lexon vetë dokumentin nga databaza, kontrollon që është i ri dhe nuk është njoftuar,
// dhe vetëm atëherë dërgon mesazhin. Kështu askush nuk mund të dërgojë njoftime të rreme.

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { sendTelegram, esc } from "@/lib/server/telegram";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail, emailLayout, ownerEmail } from "@/lib/server/email";
import { getEffectivePlan } from "@/lib/plans";
import { getEffectiveProPlan } from "@/lib/proPlans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nearbuy.al";
const FRESH_MS = 15 * 60 * 1000; // pranohen vetëm dokumente të 15 minutave të fundit

const PLAN_NAMES: Record<string, string> = {
  baze: "Bazë (€10)", plus: "Plus (€15)", premium: "Premium", standard: "Pro (€10)", free: "Falas",
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

      // Email bizneseve që e morën kërkesën
      const ids: string[] = Array.isArray(d.sentToIds) ? d.sentToIds.slice(0, 40) : [];
      await Promise.all(ids.map(async bizId => {
        const biz = (await db.collection("businesses").doc(bizId).get()).data();
        if (!biz) return;
        const to = await ownerEmail("business", bizId, biz);
        const visible = getEffectivePlan(biz).id === "premium"; // Plus e sheh pas 2 orësh
        await sendEmail(to, `📨 Klient i ri kërkon: ${d.productName}`, emailLayout(
          "Një klient po kërkon një produkt në zonën tënde",
          `<p><b>${esc(d.productName)}</b><br>📍 ${esc(d.city)}${d.note ? `<br>📝 "${esc(d.note)}"` : ""}</p>` +
          (visible
            ? `<p>👤 <b>${esc(d.name)}</b> · ${esc(d.phone)}</p><p>Kontaktoje sa më shpejt, sepse kërkesa u shkon disa dyqaneve.</p>`
            : `<p>Kontakti i klientit shfaqet në panelin tënd pas 2 orësh. Me paketën <b>Premium</b> e merr menjëherë, para të tjerëve.</p>`),
          { label: "Hap kërkesën", href: `${SITE}/dashboard/business/leads` }));
      }));
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

      // Email mjeshtrave që e morën kërkesën
      const ids: string[] = Array.isArray(d.sentToIds) ? d.sentToIds.slice(0, 40) : [];
      await Promise.all(ids.map(async proId => {
        const pro = (await db.collection("professionals").doc(proId).get()).data();
        if (!pro) return;
        const to = await ownerEmail("professional", proId, pro);
        const visible = getEffectiveProPlan(pro).id === "premium"; // Pro e sheh pas 2 orësh
        await sendEmail(to, `🛠 Punë e re: ${d.profession} në ${d.city}`, emailLayout(
          `Një klient kërkon ${String(d.profession).toLowerCase()} në ${esc(d.city)}`,
          `<p><b>${esc(d.urgency)}</b><br>"${esc(d.description)}"</p>` +
          (visible
            ? `<p>👤 <b>${esc(d.name)}</b> · ${esc(d.phone)}</p><p>Shkruaji sa më shpejt — klienti zakonisht zgjedh të parin që i përgjigjet.</p>`
            : `<p>Kontakti i klientit shfaqet në panelin tënd pas 2 orësh. Me paketën <b>Premium</b> e merr menjëherë.</p>`),
          { label: "Hap kërkesën", href: `${SITE}/dashboard/professional/jobs` }));
      }));
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

    // ── Kërkesa për produkt u shqyrtua (nga admini) ────────────
    else if (event === "product_request_done") {
      const ref = db.collection("product_requests").doc(id);
      const d = (await ref.get()).data();
      if (!d || d.status === "pending" || d.businessEmailed) return NextResponse.json({ ok: true, skipped: true });
      const ok = d.status === "approved" || d.status === "merged";
      const to = await ownerEmail("business", d.businessId);
      if (!to) console.error("notify: biznesi pa email", d.businessId);
      const sent = await sendEmail(to, ok ? `✅ "${d.name}" u shtua në profilin tënd` : `Kërkesa për "${d.name}"`, emailLayout(
        ok ? "Produkti u shtua" : "Kërkesa nuk u pranua",
        ok ? `<p><b>${esc(d.name)}</b> është tani në katalog dhe në profilin tënd me çmimin ${esc(d.price)} L. Klientët mund ta gjejnë që sot.</p>`
           : `<p>Produkti <b>${esc(d.name)}</b> nuk u shtua në katalog. Nëse mendon se është gabim, na shkruaj.</p>`,
        { label: "Shiko produktet e mia", href: `${SITE}/dashboard/business/products` }));
      if (sent) await ref.update({ businessEmailed: true });
    }

    // ── Paketa u aktivizua (nga admini) ─────────────────────────
    else if (event === "plan_activated") {
      const col = kind === "professional" ? "professionals" : "businesses";
      const ref = db.collection(col).doc(id);
      const d = (await ref.get()).data();
      const key = `${d?.subscription}-${d?.subscriptionEnd}`;
      if (!d || d.planStatus !== "active" || d.activationEmailed === key) return NextResponse.json({ ok: true, skipped: true });
      const to = await ownerEmail(kind === "professional" ? "professional" : "business", id, d);
      if (!to) console.error("notify: pa email për", col, id);
      const name = PLAN_NAMES[String(d.subscription)] || String(d.subscription);
      const sent = await sendEmail(to, `🎉 Paketa ${name.split(" (")[0]} është aktive`, emailLayout(
        "Faleminderit! Paketa jote është aktive",
        `<p>Paketa <b>${esc(name.split(" (")[0])}</b> për <b>${esc(d.name)}</b> është aktive deri më <b>${esc(d.subscriptionEnd)}</b>.</p>` +
        `<p>Do të të njoftojmë 7 ditë para se të skadojë.</p>`,
        { label: "Hap panelin", href: `${SITE}/dashboard/${kind === "professional" ? "professional" : "business"}` }));
      // Shënohet vetëm kur email-i u dërgua vërtet, që të provohet përsëri herën tjetër
      if (sent) await ref.update({ activationEmailed: key });
      return NextResponse.json({ ok: sent, email: to ? "found" : "missing" });
    }

    else return NextResponse.json({ ok: false }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notify:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
