"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  category: string;
  price?: number;
  inStock?: boolean;
  image?: string;
}

export default function BusinessProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // Gjej ID-në e dokumentit të biznesit (jo user.uid)
        let bid: string | null = null;

        // Kontrollo nëse ekziston dokument me ID = user.uid
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizSnap.exists()) {
          bid = user.uid;
        } else {
          // Kërko me ownerUID ose uid
          const q1 = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            bid = snap1.docs[0].id;
          } else {
            const q2 = query(collection(db, "businesses"), where("uid", "==", user.uid));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) bid = snap2.docs[0].id;
          }
        }

        if (bid) {
          setBusinessId(bid);
          await loadProducts(bid);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const loadProducts = async (bid: string) => {
      const q = query(collection(db, "business_products"), where("businessId", "==", bid));
      const snap = await getDocs(q);
      const prods: Product[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        // Merr emrin dhe imazhin nga koleksioni products
        let name = data.name || "";
        let image = data.image || "";
        let category = data.category || "";
        if (data.productId) {
          try {
            const prodSnap = await getDoc(doc(db, "products", data.productId));
            if (prodSnap.exists()) {
              const pd = prodSnap.data();
              name = pd.name || name;
              image = pd.images?.[0] || image;
              category = pd.category || category;
            }
          } catch (e) { console.error(e); }
        }
        prods.push({ id: d.id, name, image, category, price: data.price, inStock: data.inStock } as Product);
      }
      setProducts(prods);
      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pr-root">
      <div className="pr-header">
        <div>
          <h1 className="pr-title">Produktet</h1>
          <p className="pr-sub">Menaxho produktet e dyqanit tënd</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="pr-empty">
          <span className="pr-empty-icon">🛍</span>
          <p className="pr-empty-title">Nuk ke produkte ende</p>
          <p className="pr-empty-sub">Produktet shtohen nga paneli i adminit. Kontakto ekipin tonë.</p>
        </div>
      ) : (
        <div className="pr-grid">
          {products.map(p => (
            <div key={p.id} className="pr-card">
              <div className="pr-img">
                {p.image ? <img src={p.image} alt={p.name} /> : <span>📦</span>}
              </div>
              <div className="pr-card-info">
                <p className="pr-card-name">{p.name}</p>
                <p className="pr-card-cat">{p.category}</p>
                {p.price && <p className="pr-card-price">{p.price.toLocaleString()} L</p>}
                <span className={`pr-stock ${p.inStock ? "in" : "out"}`}>
                  {p.inStock ? "✓ Në stok" : "✗ Jashtë stoku"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .pr-root { display: flex; flex-direction: column; gap: 1.5rem; }
        .pr-header { display: flex; align-items: center; justify-content: space-between; }
        .pr-title { font-size: 1.3rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em; }
        .pr-sub { font-size: 0.82rem; color: #71717a; margin-top: 2px; }
        .pr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 16px; text-align: center; }
        .pr-empty-icon { font-size: 2.5rem; }
        .pr-empty-title { font-size: 1rem; font-weight: 600; color: #e4e4e7; }
        .pr-empty-sub { font-size: 0.82rem; color: #52525b; max-width: 300px; line-height: 1.5; }
        .pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .pr-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; transition: border-color 0.2s; }
        .pr-card:hover { border-color: rgba(249,115,22,0.3); }
        .pr-img { height: 130px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; overflow: hidden; }
        .pr-img img { width: 100%; height: 100%; object-fit: cover; }
        .pr-card-info { padding: 0.75rem; }
        .pr-card-name { font-size: 0.875rem; font-weight: 600; color: #e4e4e7; margin-bottom: 2px; }
        .pr-card-cat { font-size: 0.75rem; color: #71717a; margin-bottom: 6px; }
        .pr-card-price { font-size: 0.9rem; font-weight: 700; color: #f97316; margin-bottom: 6px; }
        .pr-stock { font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
        .pr-stock.in { background: rgba(34,197,94,0.1); color: #22c55e; }
        .pr-stock.out { background: rgba(239,68,68,0.1); color: #f87171; }
      `}</style>
    </div>
  );
}
