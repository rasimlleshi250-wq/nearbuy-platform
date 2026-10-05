// Firebase Admin — VETËM për server (API routes). Lexon çelësin nga Vercel (FIREBASE_SERVICE_ACCOUNT).
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

export function adminDb() {
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
  return getFirestore(app);
}
