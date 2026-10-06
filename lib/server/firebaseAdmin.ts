// Firebase Admin — VETËM për server (API routes). Lexon çelësin nga Vercel (FIREBASE_SERVICE_ACCOUNT).
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App | undefined;

function adminApp(): App {
  if (!app) {
    app = getApps()[0];
    if (!app) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT mungon në Vercel");
      const sa = JSON.parse(raw);
      if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
      app = initializeApp({ credential: cert(sa) });
    }
  }
  return app;
}

export function adminDb() {
  return getFirestore(adminApp());
}

export function adminAuth() {
  return getAuth(adminApp());
}

// Kthen uid-në e përdoruesit të loguar nga header-i "Authorization: Bearer <token>", ose null
export async function uidFromRequest(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(h.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}
