// Kërkesat për punë: klienti përshkruan punën ("më rrjedh bojleri"), dhe kërkesa
// u shkon profesionistëve Pro/Premium të atij profesioni që punojnë në atë qytet.
// Premium e shohin menjëherë, Pro pas 2 orësh.
// Kërkesa dërgohet përmes serverit (/api/requests), që kontrollon numrin dhe spam-in.

import { notify } from "@/lib/notify";
import { postRequests, saveMyRequest } from "@/lib/myRequests";
import { URGENCY } from "@/lib/requestRules";

export { URGENCY };
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
  status: "new" | "contacted" | "closed";
  createdAt?: { seconds: number };
  visibleAt?: { seconds: number };
  contactedCount?: number;
  closedBy?: string; // "customer" ose ID e mjeshtrit që e mbylli
}

// Kthen sa mjeshtër u njoftuan. Hedh Error me mesazh për klientin nëse refuzohet.
export async function submitJobRequest(input: JobInput & { consent: boolean; website?: string }): Promise<number> {
  const res = await postRequests({
    action: "create",
    kind: "job",
    profession: input.profession,
    city: input.city,
    description: input.description,
    urgency: input.urgency,
    name: input.name,
    phone: input.phone,
    consent: input.consent,
    website: input.website || "",
  });
  const id = String(res.id || "");
  if (id) {
    saveMyRequest({ kind: "job", id, token: String(res.token), title: `${input.profession} në ${input.city}` });
    notify("job_request", id);
  }
  return Number(res.sentTo || 0);
}
