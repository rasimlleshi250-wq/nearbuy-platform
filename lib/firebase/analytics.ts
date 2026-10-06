import { db, auth } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, increment, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

// ── Format date as YYYY-MM-DD ──
const today = () => new Date().toISOString().split("T")[0];

// ════════════════════════════════════════════
// FILTRI: çfarë NUK numërohet
//  1. Pronari që hap profilin e vet
//  2. Admini
//  3. I njëjti vizitor më shumë se 1 herë në ditë (rifreskime, kthime mbrapa)
// ════════════════════════════════════════════

type EntityType = "businesses" | "professionals";

// Pret që Firebase Auth të dijë kush është i loguar (ose që s'ka njeri)
function currentUser(): Promise<User | null> {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, u => { unsub(); resolve(u); });
  });
}

// Roli i përdoruesit të loguar — lexohet 1 herë për sesion
let rolePromise: Promise<string | null> | null = null;
let roleUid: string | null = null;
function getRole(uid: string): Promise<string | null> {
  if (!rolePromise || roleUid !== uid) {
    roleUid = uid;
    rolePromise = getDoc(doc(db, "users", uid))
      .then(s => (s.exists() ? (s.data().role as string) || null : null))
      .catch(() => null);
  }
  return rolePromise;
}

// A është përdoruesi i loguar pronari i këtij biznesi/mjeshtri?
const ownerCache = new Map<string, boolean>();
async function isOwner(uid: string, type: EntityType, id: string): Promise<boolean> {
  if (uid === id) return true; // profilet e reja kanë ID = uid
  const key = `${type}/${id}/${uid}`;
  if (ownerCache.has(key)) return ownerCache.get(key)!;
  let owner = false;
  try {
    const s = await getDoc(doc(db, type, id));
    const d = s.exists() ? s.data() : null;
    owner = !!d && (d.ownerUID === uid || d.uid === uid);
  } catch { /* nëse s'lexohet, e konsiderojmë vizitor */ }
  ownerCache.set(key, owner);
  return owner;
}

// Shënon "u numërua sot" në shfletues; kthen false nëse ishte numëruar tashmë
function firstTimeToday(key: string): boolean {
  try {
    const k = `nb_t_${key}_${today()}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, "1");
  } catch { /* shfletues privat — vazhdo */ }
  return true;
}

async function shouldCount(type: EntityType, id: string, event: string, extra = ""): Promise<boolean> {
  if (!id) return false;
  const user = await currentUser();
  if (user) {
    const role = await getRole(user.uid);
    if (role === "admin") return false;
    if (await isOwner(user.uid, type, id)) return false;
  }
  return firstTimeToday(`${event}_${type}_${id}${extra}`);
}

// ── Track a view for business or professional ──
export async function trackView(type: EntityType, id: string) {
  try {
    if (!(await shouldCount(type, id, "v"))) return;
    const ref = doc(db, "analytics_" + type, id, "views", today());
    await setDoc(ref, { count: increment(1), date: today() }, { merge: true });
  } catch (e) { console.error("trackView error:", e); }
}

// ── Track a contact click ──
export async function trackContact(type: EntityType, id: string) {
  try {
    if (!(await shouldCount(type, id, "c"))) return;
    const ref = doc(db, "analytics_" + type, id, "contacts", today());
    await setDoc(ref, { count: increment(1), date: today() }, { merge: true });
  } catch (e) { console.error("trackContact error:", e); }
}

// ── Track maps click (businesses only) ──
export async function trackMapsClick(id: string) {
  try {
    if (!(await shouldCount("businesses", id, "m"))) return;
    const ref = doc(db, "analytics_businesses", id, "maps", today());
    await setDoc(ref, { count: increment(1), date: today() }, { merge: true });
  } catch (e) { console.error("trackMapsClick error:", e); }
}

// ── Track product click (Pro plan) ──
export async function trackProductClick(businessId: string, productId: string, productName: string) {
  try {
    if (!(await shouldCount("businesses", businessId, "p", `_${productId}`))) return;
    const ref = doc(db, "analytics_businesses", businessId, "products", productId);
    await setDoc(ref, { count: increment(1), name: productName, productId }, { merge: true });
  } catch (e) { console.error("trackProductClick error:", e); }
}

// ── Get total stats (Basic) ──
export async function getTotalStats(type: "businesses" | "professionals", id: string) {
  try {
    const viewsSnap = await getDocs(collection(db, "analytics_" + type, id, "views"));
    const contactsSnap = await getDocs(collection(db, "analytics_" + type, id, "contacts"));
    
    const totalViews = viewsSnap.docs.reduce((sum, d) => sum + (d.data().count || 0), 0);
    const totalContacts = contactsSnap.docs.reduce((sum, d) => sum + (d.data().count || 0), 0);
    
    return { totalViews, totalContacts };
  } catch (e) { 
    console.error("getTotalStats error:", e);
    return { totalViews: 0, totalContacts: 0 };
  }
}

// ── Get last 30 days stats (Advanced+) ──
export async function getLast30DaysStats(type: "businesses" | "professionals", id: string) {
  try {
    const viewsSnap = await getDocs(query(collection(db, "analytics_" + type, id, "views"), orderBy("date", "desc"), limit(30)));
    const contactsSnap = await getDocs(query(collection(db, "analytics_" + type, id, "contacts"), orderBy("date", "desc"), limit(30)));
    const mapsSnap = type === "businesses" 
      ? await getDocs(query(collection(db, "analytics_" + type, id, "maps"), orderBy("date", "desc"), limit(30)))
      : null;

    const views = viewsSnap.docs.map(d => ({ date: d.data().date, count: d.data().count }));
    const contacts = contactsSnap.docs.map(d => ({ date: d.data().date, count: d.data().count }));
    const maps = mapsSnap ? mapsSnap.docs.map(d => ({ date: d.data().date, count: d.data().count })) : [];

    const totalViews = views.reduce((s, d) => s + d.count, 0);
    const totalContacts = contacts.reduce((s, d) => s + d.count, 0);
    const totalMaps = maps.reduce((s, d) => s + d.count, 0);

    return { views, contacts, maps, totalViews, totalContacts, totalMaps };
  } catch (e) {
    console.error("getLast30DaysStats error:", e);
    return { views: [], contacts: [], maps: [], totalViews: 0, totalContacts: 0, totalMaps: 0 };
  }
}

// ── Get top products (Pro) ──
export async function getTopProducts(businessId: string, topN = 5) {
  try {
    const snap = await getDocs(collection(db, "analytics_businesses", businessId, "products"));
    const products = snap.docs.map(d => ({ productId: d.id, name: d.data().name, count: d.data().count }));
    return products.sort((a, b) => b.count - a.count).slice(0, topN);
  } catch (e) {
    console.error("getTopProducts error:", e);
    return [];
  }
}

// ── Get comparison: this month vs last month (Pro) ──
export async function getMonthComparison(type: "businesses" | "professionals", id: string) {
  try {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const viewsSnap = await getDocs(collection(db, "analytics_" + type, id, "views"));
    const contactsSnap = await getDocs(collection(db, "analytics_" + type, id, "contacts"));

    const filterMonth = (docs: any[], month: string) =>
      docs.filter(d => d.data().date?.startsWith(month)).reduce((s, d) => s + d.data().count, 0);

    return {
      thisMonth: {
        views: filterMonth(viewsSnap.docs, thisMonth),
        contacts: filterMonth(contactsSnap.docs, thisMonth),
      },
      lastMonth: {
        views: filterMonth(viewsSnap.docs, lastMonth),
        contacts: filterMonth(contactsSnap.docs, lastMonth),
      }
    };
  } catch (e) {
    console.error("getMonthComparison error:", e);
    return { thisMonth: { views: 0, contacts: 0 }, lastMonth: { views: 0, contacts: 0 } };
  }
}
