// Kërkesat e klientëve: klienti kërkon një produkt që nuk e ka asnjë dyqan,
// dhe kërkesa u shkon dyqaneve Plus/Premium të asaj kategorie në qytetin e tij.
// Premium e shohin menjëherë, Plus pas 2 orësh.
// Kërkesa dërgohet përmes serverit (/api/requests), që kontrollon numrin dhe spam-in.

import { notify } from "@/lib/notify";
import { postRequests, saveMyRequest } from "@/lib/myRequests";
import { CITIES } from "@/lib/requestRules";

export { CITIES };
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
  status: "new" | "contacted" | "closed";
  createdAt?: { seconds: number };
  visibleAt?: { seconds: number };
  requestId: string;
  contactedCount?: number;
  closedBy?: string; // "customer" ose ID e biznesit që e mbylli
}

// Kthen sa dyqane u njoftuan. Hedh Error me mesazh për klientin nëse refuzohet.
export async function submitCustomerRequest(input: LeadInput & { consent: boolean; website?: string }): Promise<number> {
  const res = await postRequests({
    action: "create",
    kind: "product",
    productId: input.productId,
    name: input.name,
    phone: input.phone,
    city: input.city,
    note: input.note,
    consent: input.consent,
    website: input.website || "",
  });
  const id = String(res.id || "");
  if (id) {
    saveMyRequest({ kind: "product", id, token: String(res.token), title: input.productName });
    notify("customer_request", id);
  }
  return Number(res.sentTo || 0);
}
