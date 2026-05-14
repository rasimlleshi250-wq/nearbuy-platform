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
  category: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  barcode?: string;
  tags?: string[];
  createdBy: string;
  status: ProductStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Businesses ─────────────────────────────────────
export type SubscriptionPlan = "free" | "basic" | "advanced" | "pro" | "premium";

export interface Business {
  id: string;
  ownerUID: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  location: GeoPoint;
  phone: string;
  email?: string;
  logo?: string;
  coverImage?: string;
  subscription: SubscriptionPlan;
  category?: string;
  categories?: string[];
  subscriptionEnd?: Timestamp;
  schedule?: string;
  verified: boolean;
  featured: boolean;
  requestedPlan?: SubscriptionPlan;
  planStatus?: "pending" | "active" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Business Products (çmimet e bizneseve) ─────────
export interface BusinessProduct {
  id: string;
  businessId: string;
  productId: string;
  price: number;
  inStock: boolean;
  featured: boolean;
  notes?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

// ── Professionals ──────────────────────────────────
export interface Professional {
  id: string;
  ownerUID?: string;
  uid?: string;
  displayName?: string;
  name: string;
  profession: string;
  description?: string;
  services: string[];
  location?: GeoPoint;
  city: string;
  address?: string;
  phone: string;
  email?: string;
  photo?: string;
  pricePerHour?: number;
  experience?: string;
  schedule?: string;
  availability?: string;
  subscription?: "free" | "monthly";
  subscriptionEnd?: Timestamp;
  status?: "pending" | "approved" | "rejected";
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
