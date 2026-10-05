// Historiku i pagesave — çdo aprovim ose rinovim paketash regjistrohet këtu.
import { db } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export interface PaymentRecord {
  type: "business" | "professional";
  entityId: string;
  name: string;
  plan: string;
  planName: string;
  months: number;
  amountEur: number;
  method: string;
  date: string; // YYYY-MM-DD
  kind: "aprovim" | "rinovim";
}

export async function recordPayment(p: PaymentRecord) {
  try {
    await addDoc(collection(db, "payments"), { ...p, createdAt: serverTimestamp() });
  } catch (e) {
    // Pagesa është aktivizuar gjithsesi; mungesa e historikut nuk duhet ta ndalë
    console.error("Pagesa nuk u regjistrua në historik:", e);
  }
}
