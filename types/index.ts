import { Timestamp, GeoPoint } from "firebase/firestore";

// ── Users ──────────────────────────────────────────
export type UserRole = "admin" | "business" | "professional" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Categories ─────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

// ── Products (databaza qendrore - vetëm admin) ─────
export type ProductStatus = "active" | "inactive" | "pending";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;       // ref → categories.id
  brand?: string;
  images: string[];       // URLs nga Firebase Storage
  barcode?: string;
  tags?: string[];
  createdBy: string;      // adminUID
  status: ProductStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Businesses ─────────────────────────────────────
export type SubscriptionPlan = "free" | "basic" | "advanced" | "pro" | "premium";

export interface Business {
  id: string;
  ownerUID: string;       // ref → users.uid
  name: string;
  description?: string;
  address: string;
  city: string;
  location: GeoPoint;     // lat/lng për Maps
  phone: string;
  email?: string;
  logo?: string;          // URL e logos
  coverImage?: string;
  subscription: SubscriptionPlan;
  subscriptionEnd?: Timestamp;
  schedule?: string;
  verified: boolean;
  featured: boolean;      // promovuar në homepage
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Business Products (çmimet e bizneseve) ─────────
export interface BusinessProduct {
  id: string;
  businessId: string;     // ref → businesses.id
  productId: string;      // ref → products.id
  price: number;          // çmimi në Lekë
  inStock: boolean;
  featured: boolean;      // promovuar (paid)
  notes?: string;         // shënime opsionale
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

// ── Professionals ──────────────────────────────────
export interface Professional {
  id: string;
  ownerUID: string;       // ref → users.uid
  name: string;
  profession: string;     // elektriçist, hidraulik...
  description?: string;
  services: string[];     // lista e shërbimeve
  location: GeoPoint;
  city: string;
  address?: string;
  phone: string;
  email?: string;
  photo?: string;
  pricePerHour?: number;
  availability?: string;  // "Mon-Fri 8:00-18:00"
  subscription: "free" | "monthly";
  subscriptionEnd?: Timestamp;
  verified: boolean;
  featured: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Ads (reklamat) ─────────────────────────────────
export interface Ad {
  id: string;
  businessId: string;
  title: string;
  image: string;
  link: string;
  placement: "homepage_banner" | "search_top" | "sidebar";
  startDate: Timestamp;
  endDate: Timestamp;
  active: boolean;
  clicks: number;
  impressions: number;
}
