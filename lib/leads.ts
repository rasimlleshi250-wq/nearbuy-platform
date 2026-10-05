// Kërkesat e klientëve: klienti kërkon një produkt që nuk e ka asnjë dyqan,
// dhe kërkesa u shkon dyqaneve Plus/Premium të asaj kategorie në qytetin e tij.
// Premium e shohin menjëherë, Plus pas 2 orësh.

import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { getEffectivePlan } from "@/lib/plans";
import { notify } from "@/lib/notify";

export const CITIES = ["Tiranë", "Durrës", "Vlorë", "Shkodër", "Elbasan", "Korçë", "Fier", "Berat", "Lushnjë", "Kavajë", "Gjirokastër", "Sarandë", "Lezhë", "Kukës", "Pogradec", "Peshkopi"];
export const PLUS_DELAY_MS = 2 * 60 * 60 * 1000;

export interface LeadInput {
  productId: string;
  productName: string;
  category: string;
  name: string;
  phone: string;
  city: string;
  note: string;
}

export interface Lead extends LeadInput {
  id: string;
  status: "new" | "contacted";
  createdAt?: { seconds: number };
  visibleAt?: { seconds: number };
  requestId: string;
}

// Kthen sa dyqane u njoftuan
export async function submitCustomerRequest(input: LeadInput): Promise<number> {
  const clean: LeadInput = {
    productId: input.productId,
    productName: input.productName.slice(0, 200),
    category: input.category,
    name: input.name.trim().slice(0, 80),
    phone: input.phone.trim().slice(0, 30),
    city: input.city,
    note: input.note.trim().slice(0, 500),
  };

  // Dyqanet e verifikuara të qytetit, me kategorinë e produktit dhe paketë Plus/Premium aktive
  const snap = await getDocs(query(collection(db, "businesses"), where("city", "==", clean.city), where("verified", "==", true)));
  const targets = snap.docs.filter(d => {
    const b = d.data();
    const cats: string[] = Array.isArray(b.categories) ? b.categories : b.category ? [b.category] : [];
    return !b.blocked && cats.includes(clean.category) && getEffectivePlan(b).leads;
  });

  const now = Date.now();
  const batch = writeBatch(db);
  const reqRef = doc(collection(db, "customer_requests"));
  batch.set(reqRef, { ...clean, status: "open", sentTo: Math.min(targets.length, 40),
    sentToIds: targets.slice(0, 40).map(d => d.id), createdAt: serverTimestamp() });
  targets.slice(0, 40).forEach(d => {
    const isPremium = getEffectivePlan(d.data()).id === "premium";
    batch.set(doc(collection(db, "businesses", d.id, "leads")), {
      ...clean,
      requestId: reqRef.id,
      status: "new",
      createdAt: serverTimestamp(),
      visibleAt: Timestamp.fromMillis(isPremium ? now : now + PLUS_DELAY_MS),
    });
  });
  await batch.commit();
  notify("customer_request", reqRef.id);
  return Math.min(targets.length, 40);
}
