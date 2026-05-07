import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  serverTimestamp, GeoPoint, limit, QueryConstraint
} from "firebase/firestore";
import { db } from "./config";
import type {
  UserProfile, Product, Business, BusinessProduct,
  Professional, Category
} from "@/types";

// ════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, "users", uid), {
    uid,
    role: "user",
    createdAt: serverTimestamp(),
    ...data,
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
}

export async function createCategory(data: Omit<Category, "id">) {
  return await addDoc(collection(db, "categories"), data);
}

// ════════════════════════════════════════════
// PRODUCTS (admin only)
// ════════════════════════════════════════════

export async function getProducts(categoryFilter?: string): Promise<Product[]> {
  const constraints: QueryConstraint[] = [
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
  ];
  if (categoryFilter) {
    constraints.unshift(where("category", "==", categoryFilter));
  }
  const q = query(collection(db, "products"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null;
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "createdBy">, adminUID: string) {
  return await addDoc(collection(db, "products"), {
    ...data,
    createdBy: adminUID,
    status: "active",
    createdAt: serverTimestamp(),
  });
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════════
// BUSINESSES
// ════════════════════════════════════════════

export async function createBusiness(ownerUID: string, data: Omit<Business, "id" | "createdAt" | "ownerUID">) {
  return await addDoc(collection(db, "businesses"), {
    ...data,
    ownerUID,
    verified: false,
    featured: false,
    subscription: "free",
    createdAt: serverTimestamp(),
  });
}

export async function getBusinessByOwner(ownerUID: string): Promise<Business | null> {
  const q = query(collection(db, "businesses"), where("ownerUID", "==", ownerUID));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Business;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(db, "businesses", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Business) : null;
}

export async function getVerifiedBusinesses(cityFilter?: string): Promise<Business[]> {
  const constraints: QueryConstraint[] = [where("verified", "==", true)];
  if (cityFilter) constraints.push(where("city", "==", cityFilter));
  const q = query(collection(db, "businesses"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
}

export async function updateBusiness(id: string, data: Partial<Business>) {
  await updateDoc(doc(db, "businesses", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════════
// BUSINESS PRODUCTS (çmimet)
// ════════════════════════════════════════════

export async function addBusinessProduct(data: Omit<BusinessProduct, "id" | "createdAt" | "updatedAt">) {
  // Kontrollo nëse biznesi e ka tashmë këtë produkt
  const existing = query(
    collection(db, "business_products"),
    where("businessId", "==", data.businessId),
    where("productId", "==", data.productId)
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    // Nëse ekziston, update çmimin
    await updateDoc(doc(db, "business_products", snap.docs[0].id), {
      price: data.price,
      inStock: data.inStock,
      updatedAt: serverTimestamp(),
    });
    return snap.docs[0].id;
  }
  // Nëse nuk ekziston, krijo të ri
  const ref = await addDoc(collection(db, "business_products"), {
    ...data,
    featured: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getBusinessProductsByProduct(productId: string): Promise<BusinessProduct[]> {
  const q = query(
    collection(db, "business_products"),
    where("productId", "==", productId),
    where("inStock", "==", true),
    orderBy("price", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProduct));
}

export async function getBusinessProductsByBusiness(businessId: string): Promise<BusinessProduct[]> {
  const q = query(
    collection(db, "business_products"),
    where("businessId", "==", businessId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProduct));
}

export async function removeBusinessProduct(id: string) {
  await deleteDoc(doc(db, "business_products", id));
}

// ════════════════════════════════════════════
// PROFESSIONALS
// ════════════════════════════════════════════

export async function createProfessional(ownerUID: string, data: Omit<Professional, "id" | "createdAt" | "ownerUID">) {
  return await addDoc(collection(db, "professionals"), {
    ...data,
    ownerUID,
    verified: false,
    featured: false,
    subscription: "free",
    rating: 0,
    reviewCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function getProfessionals(filters?: { city?: string; profession?: string }): Promise<Professional[]> {
  const constraints: QueryConstraint[] = [where("verified", "==", true)];
  if (filters?.city) constraints.push(where("city", "==", filters.city));
  if (filters?.profession) constraints.push(where("profession", "==", filters.profession));
  const q = query(collection(db, "professionals"), ...constraints, limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Professional));
}

export async function getProfessionalByOwner(ownerUID: string): Promise<Professional | null> {
  const q = query(collection(db, "professionals"), where("ownerUID", "==", ownerUID));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Professional;
}

export async function updateProfessional(id: string, data: Partial<Professional>) {
  await updateDoc(doc(db, "professionals", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════════
// HELPER — GeoPoint creator
// ════════════════════════════════════════════

export function createGeoPoint(lat: number, lng: number): GeoPoint {
  return new GeoPoint(lat, lng);
}
