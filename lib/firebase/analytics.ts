import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

// ── Format date as YYYY-MM-DD ──
const today = () => new Date().toISOString().split("T")[0];

// ── Track a view for business or professional ──
export async function trackView(type: "businesses" | "professionals", id: string) {
  try {
    const ref = doc(db, "analytics", type, id, "views", today());
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1), date: today() });
    } else {
      await setDoc(ref, { count: 1, date: today() });
    }
  } catch (e) { console.error("trackView error:", e); }
}

// ── Track a contact click ──
export async function trackContact(type: "businesses" | "professionals", id: string) {
  try {
    const ref = doc(db, "analytics", type, id, "contacts", today());
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1), date: today() });
    } else {
      await setDoc(ref, { count: 1, date: today() });
    }
  } catch (e) { console.error("trackContact error:", e); }
}

// ── Track maps click (businesses only) ──
export async function trackMapsClick(id: string) {
  try {
    const ref = doc(db, "analytics", "businesses", id, "maps", today());
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1), date: today() });
    } else {
      await setDoc(ref, { count: 1, date: today() });
    }
  } catch (e) { console.error("trackMapsClick error:", e); }
}

// ── Track product click (Pro plan) ──
export async function trackProductClick(businessId: string, productId: string, productName: string) {
  try {
    const ref = doc(db, "analytics", "businesses", businessId, "products", productId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1), name: productName });
    } else {
      await setDoc(ref, { count: 1, name: productName, productId });
    }
  } catch (e) { console.error("trackProductClick error:", e); }
}

// ── Get total stats (Basic) ──
export async function getTotalStats(type: "businesses" | "professionals", id: string) {
  try {
    const viewsSnap = await getDocs(collection(db, "analytics", type, id, "views"));
    const contactsSnap = await getDocs(collection(db, "analytics", type, id, "contacts"));
    
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
    const viewsSnap = await getDocs(query(collection(db, "analytics", type, id, "views"), orderBy("date", "desc"), limit(30)));
    const contactsSnap = await getDocs(query(collection(db, "analytics", type, id, "contacts"), orderBy("date", "desc"), limit(30)));
    const mapsSnap = type === "businesses" 
      ? await getDocs(query(collection(db, "analytics", type, id, "maps"), orderBy("date", "desc"), limit(30)))
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
    const snap = await getDocs(collection(db, "analytics", "businesses", businessId, "products"));
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

    const viewsSnap = await getDocs(collection(db, "analytics", type, id, "views"));
    const contactsSnap = await getDocs(collection(db, "analytics", type, id, "contacts"));

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
