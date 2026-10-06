// Firebase Admin — VETËM për server (API routes). Lexon çelësin nga Vercel (FIREBASE_SERVICE_ACCOUNT).
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createVerify } from "crypto";

let app: App | undefined;
let projectId = "";

function adminApp(): App {
  if (!app) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT mungon në Vercel");
    const sa = JSON.parse(raw);
    projectId = sa.project_id || "";
    app = getApps()[0];
    if (!app) {
      if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
      app = initializeApp({ credential: cert(sa) });
    }
  }
  return app;
}

export function adminDb() {
  return getFirestore(adminApp());
}

// ── Verifikimi i përdoruesit të loguar ─────────────────────────────
// Nuk përdorim "firebase-admin/auth" sepse në Vercel nuk ngarkohet (gabim ERR_REQUIRE_ESM).
// E verifikojmë vetë token-in e Firebase me çelësat publikë të Google-it.

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache: { certs: Record<string, string>; until: number } | null = null;

async function googleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.until > Date.now()) return certCache.certs;
  const res = await fetch(CERTS_URL);
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") || "")?.[1] || 3600);
  certCache = { certs, until: Date.now() + maxAge * 1000 };
  return certs;
}

const b64json = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

// Kthen uid-në nëse token-i është i vlefshëm, përndryshe null
export async function verifyIdToken(token: string): Promise<string | null> {
  try {
    adminApp(); // për projectId
    const [h, p, sig] = token.split(".");
    if (!h || !p || !sig) return null;
    const header = b64json(h);
    const payload = b64json(p);
    if (header.alg !== "RS256") return null;
    const certs = await googleCerts();
    const pem = certs[header.kid];
    if (!pem) return null;
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(pem, Buffer.from(sig, "base64url"));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== "number" || payload.exp < now - 60) return null;
    if (typeof payload.iat !== "number" || payload.iat > now + 300) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// Kthen uid-në e përdoruesit nga header-i "Authorization: Bearer <token>", ose null
export async function uidFromRequest(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? verifyIdToken(h.slice(7)) : null;
}
