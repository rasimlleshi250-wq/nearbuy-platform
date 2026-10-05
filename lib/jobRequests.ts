// Kërkesat për punë: klienti përshkruan punën ("më rrjedh bojleri"), dhe kërkesa
// u shkon profesionistëve Pro/Premium të atij profesioni që punojnë në atë qytet.
// Premium e shohin menjëherë, Pro pas 2 orësh.

import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { getEffectiveProPlan, normalizeProfession } from "@/lib/proPlans";

export const URGENCY = ["Sot / urgjent", "Këtë javë", "S'ka nxitim"];
export const STANDARD_DELAY_MS = 2 * 60 * 60 * 1000;

export interface JobInput {
  profession: string;
  city: string;
  description: string;
  urgency: string;
  name: string;
  phone: string;
}

export interface Job extends JobInput {
  id: string;
  requestId: string;
  status: "new" | "contacted";
  createdAt?: { seconds: number };
  visibleAt?: { seconds: number };
}

export async function submitJobRequest(input: JobInput): Promise<number> {
  const clean: JobInput = {
    profession: input.profession,
    city: input.city,
    description: input.description.trim().slice(0, 800),
    urgency: input.urgency,
    name: input.name.trim().slice(0, 80),
    phone: input.phone.trim().slice(0, 30),
  };

  const snap = await getDocs(query(collection(db, "professionals"), where("verified", "==", true)));
  const targets = snap.docs.filter(d => {
    const p = d.data();
    const zones: string[] = Array.isArray(p.zones) && p.zones.length ? p.zones : [p.city];
    return !p.blocked
      && normalizeProfession(p.profession) === clean.profession
      && zones.includes(clean.city)
      && getEffectiveProPlan(p).jobRequests;
  });

  const now = Date.now();
  const batch = writeBatch(db);
  const reqRef = doc(collection(db, "job_requests"));
  batch.set(reqRef, { ...clean, status: "open", sentTo: targets.length, createdAt: serverTimestamp() });
  targets.slice(0, 40).forEach(d => {
    const premium = getEffectiveProPlan(d.data()).id === "premium";
    batch.set(doc(collection(db, "professionals", d.id, "jobs")), {
      ...clean,
      requestId: reqRef.id,
      status: "new",
      createdAt: serverTimestamp(),
      visibleAt: Timestamp.fromMillis(premium ? now : now + STANDARD_DELAY_MS),
    });
  });
  await batch.commit();
  return Math.min(targets.length, 40);
}
