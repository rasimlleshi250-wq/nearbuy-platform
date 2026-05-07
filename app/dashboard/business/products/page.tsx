"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp, addDoc, updateDoc } from "firebase/firestore";
import { Business, Product, BusinessProduct } from "@/types";

export default function BusinessProductsPage() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [myProducts, setMyProducts] = useState<(BusinessProduct & { productData?: Product })[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "add">("my");
  const [saving, setSaving] = useState<string | null>(null);
  const [priceModal, setPriceModal] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Get business
        const bizQ = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
        const bizSnap = await getDocs(bizQ);
        if (bizSnap.empty) { setLoading(false); return; }
        const biz = { id: bizSnap.docs[0].id, ...bizSnap.docs[0].data() } as Business;
        setBusiness(biz);

        // Get my products
        const myQ = query(collection(db, "business_products"), where("businessId", "==", biz.id));
        const mySnap = await getDocs(myQ);
        const myProds = mySnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProduct));

        // Enrich with product data
        const enriched = await Promise.all(myProds.map(async bp => {
          const prodSnap = await getDoc(doc(db, "products", bp.productId));
          return { ...bp, productData: prodSnap.exists() ? { id: prodSnap.id, ...prodSnap.data() } as Product : undefined };
        }));
        setMyProducts(enriched);

        // Get all products from DB
        const allSnap = await getDocs(query(collection(db, "products"), where("status", "==", "active")));
        setAllProducts(allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const openPriceModal = (product: Product) => {
    // Check if already have this product
    const existing = myProducts.find(p => p.productId === product.id);
    if (existing) {
      setPrice(existing.price.toString());
      setInStock(existing.inStock);
    } else {
      setPrice("");
      setInStock(true);
    }
    setPriceModal(product);
  };

  const saveProduct = async () => {
    if (!business || !priceModal || !price) return;
    setSaving(priceModal.id);
    try {
      const existing = myProducts.find(p => p.productId === priceModal.id);
      if (existing) {
        await updateDoc(doc(db, "business_products", existing.id), {
          price: parseFloat(price),
          inStock,
          updatedAt: serverTimestamp(),
        });
        setMyProducts(prev => prev.map(p => p.id === existing.id ? { ...p, price: parseFloat(price), inStock } : p));
      } else {
        const ref = await addDoc(collection(db, "business_products"), {
          businessId: business.id,
          productId: priceModal.id,
          price: parseFloat(price),
          inStock,
          featured: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setMyProducts(prev => [...prev, {
          id: ref.id, businessId: business.id, productId: priceModal.id,
          price: parseFloat(price), inStock, featured: false,
          createdAt: null as any, updatedAt: null as any,
          productData: priceModal,
        }]);
      }
      setPriceModal(null);
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const toggleStock = async (bp: BusinessProduct) => {
    await updateDoc(doc(db, "business_products", bp.id), { inStock: !bp.inStock, updatedAt: serverTimestamp() });
    setMyProducts(prev => prev.map(p => p.id === bp.id ? { ...p, inStock: !bp.inStock } : p));
  };

  const myProductIds = new Set(myProducts.map(p => p.productId));

  const filteredAll = allProducts.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}><div className="nb-spin" /><style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div className="prod-page">
      <div className="prod-header">
        <div>
          <h1>Produktet e mia</h1>
          <p>{myProducts.length} produkte të listuara</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="prod-tabs">
        <button onClick={() => setTab("my")} className={`prod-tab ${tab === "my" ? "active" : ""}`}>
          Produktet e mia ({myProducts.length})
        </button>
        <button onClick={() => setTab("add")} className={`prod-tab ${tab === "add" ? "active" : ""}`}>
          + Shto nga databaza
        </button>
      </div>

      {/* My Products Tab */}
      {tab === "my" && (
        <div className="prod-card">
          {myProducts.length === 0 ? (
            <div className="prod-empty">
              <p>🛍 Nuk ke produkte të listuara akoma.</p>
              <button onClick={() => setTab("add")} className="prod-btn-primary" style={{ marginTop: "1rem" }}>
                Shto produktin e parë
              </button>
            </div>
          ) : (
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Produkti</th>
                  <th>Kategoria</th>
                  <th>Çmimi</th>
                  <th>Gjendja</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {myProducts.map(bp => (
                  <tr key={bp.id}>
                    <td>
                      <div className="prod-cell">
                        {bp.productData?.images?.[0]
                          ? <img src={bp.productData.images[0]} alt={bp.productData.name} className="prod-img" />
                          : <div className="prod-img prod-img-placeholder">🛍</div>
                        }
                        <div>
                          <p className="prod-name">{bp.productData?.name || `Produkt #${bp.productId.slice(-6)}`}</p>
                          <p className="prod-brand">{bp.productData?.brand || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="prod-badge">{bp.productData?.category || "—"}</span></td>
                    <td><span className="prod-price">{bp.price.toLocaleString()} L</span></td>
                    <td>
                      <button onClick={() => toggleStock(bp)} className={`prod-stock-btn ${bp.inStock ? "in" : "out"}`}>
                        {bp.inStock ? "● Në gjendje" : "○ Pa gjendje"}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => bp.productData && openPriceModal(bp.productData)} className="prod-edit-btn">
                        Edito çmimin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Products Tab */}
      {tab === "add" && (
        <div>
          <div className="prod-search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Kërko produkte në databazë..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {filteredAll.length === 0 ? (
            <div className="prod-empty">😕 Nuk u gjet asnjë produkt.</div>
          ) : (
            <div className="prod-grid">
              {filteredAll.map(p => {
                const hasIt = myProductIds.has(p.id);
                const myBP = myProducts.find(bp => bp.productId === p.id);
                return (
                  <div key={p.id} className={`prod-grid-card ${hasIt ? "has-it" : ""}`}>
                    <div className="prod-grid-img">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} />
                        : <span>🛍</span>
                      }
                      {hasIt && <div className="prod-grid-check">✓</div>}
                    </div>
                    <div className="prod-grid-info">
                      <p className="prod-grid-name">{p.name}</p>
                      <p className="prod-grid-meta">{p.brand || ""} {p.brand && p.category ? "·" : ""} {p.category}</p>
                      {hasIt && myBP && (
                        <p className="prod-grid-price">{myBP.price.toLocaleString()} L</p>
                      )}
                    </div>
                    <button
                      onClick={() => openPriceModal(p)}
                      disabled={saving === p.id}
                      className={`prod-grid-btn ${hasIt ? "edit" : "add"}`}
                    >
                      {hasIt ? "Edito çmimin" : "+ Shto"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Price Modal */}
      {priceModal && (
        <div className="modal-overlay" onClick={() => setPriceModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Vendos çmimin</h3>
              <button onClick={() => setPriceModal(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-product">
              {priceModal.images?.[0] && <img src={priceModal.images[0]} alt={priceModal.name} className="modal-img" />}
              <div>
                <p className="modal-product-name">{priceModal.name}</p>
                <p className="modal-product-meta">{priceModal.brand} · {priceModal.category}</p>
              </div>
            </div>
            <div className="modal-field">
              <label>Çmimi (Lekë) *</label>
              <div className="modal-input-wrap">
                <input type="number" placeholder="p.sh. 2500" value={price}
                  onChange={e => setPrice(e.target.value)} autoFocus />
                <span className="modal-currency">L</span>
              </div>
            </div>
            <div className="modal-field">
              <label>Gjendja</label>
              <div className="modal-toggles">
                <button type="button" onClick={() => setInStock(true)}
                  className={`modal-toggle-btn ${inStock ? "active" : ""}`}>
                  ● Në gjendje
                </button>
                <button type="button" onClick={() => setInStock(false)}
                  className={`modal-toggle-btn ${!inStock ? "active-off" : ""}`}>
                  ○ Pa gjendje
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setPriceModal(null)} className="modal-btn-cancel">Anulo</button>
              <button onClick={saveProduct} disabled={!price || !!saving} className="modal-btn-save">
                {saving ? "Duke ruajtur..." : "Ruaj"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prod-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .prod-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .prod-header h1 { font-size: 1.4rem; font-weight: 700; color: #fff; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
        .prod-header p { font-size: 0.85rem; color: #71717a; }
        .prod-btn-primary { padding: 0.6rem 1.2rem; background: #f97316; color: #fff; border: none; border-radius: 10px; font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit; }
        .prod-btn-primary:hover { background: #ea6c0a; }

        .prod-tabs { display: flex; gap: 6px; }
        .prod-tab { padding: 0.5rem 1.1rem; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #71717a; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
        .prod-tab:hover { background: rgba(255,255,255,0.05); color: #e4e4e7; }
        .prod-tab.active { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.3); color: #f97316; }

        .prod-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; }
        .prod-empty { text-align: center; padding: 3rem; color: #71717a; font-size: 0.9rem; }
        .prod-table { width: 100%; border-collapse: collapse; }
        .prod-table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); }
        .prod-table td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
        .prod-table tr:last-child td { border-bottom: none; }
        .prod-table tr:hover td { background: rgba(255,255,255,0.02); }
        .prod-cell { display: flex; align-items: center; gap: 10px; }
        .prod-img { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .prod-img-placeholder { background: rgba(249,115,22,0.1); display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .prod-name { font-size: 0.875rem; font-weight: 600; color: #e4e4e7; margin-bottom: 2px; }
        .prod-brand { font-size: 0.75rem; color: #71717a; }
        .prod-badge { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 2px 8px; font-size: 0.75rem; color: #a1a1aa; }
        .prod-price { font-size: 0.9rem; font-weight: 700; color: #f97316; }
        .prod-stock-btn { border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .2s; }
        .prod-stock-btn.in { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
        .prod-stock-btn.out { background: rgba(113,113,122,0.1); color: #71717a; border: 1px solid rgba(113,113,122,0.2); }
        .prod-edit-btn { font-size: 0.8rem; color: #f97316; background: none; border: none; cursor: pointer; font-weight: 500; font-family: inherit; }
        .prod-edit-btn:hover { text-decoration: underline; }

        .prod-search-bar { display: flex; align-items: center; gap: 10px; background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0 14px; margin-bottom: 1rem; color: #52525b; }
        .prod-search-bar input { flex: 1; background: none; border: none; outline: none; padding: 0.72rem 0; color: #f4f4f5; font-size: 0.875rem; font-family: inherit; }
        .prod-search-bar input::placeholder { color: #3f3f46; }

        .prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .prod-grid-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; transition: border-color .2s; display: flex; flex-direction: column; }
        .prod-grid-card:hover { border-color: rgba(255,255,255,0.15); }
        .prod-grid-card.has-it { border-color: rgba(249,115,22,0.3); }
        .prod-grid-img { position: relative; height: 120px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
        .prod-grid-img img { width: 100%; height: 100%; object-fit: cover; }
        .prod-grid-check { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; background: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: white; font-weight: 700; }
        .prod-grid-info { padding: 0.75rem; flex: 1; }
        .prod-grid-name { font-size: 0.85rem; font-weight: 600; color: #e4e4e7; margin-bottom: 3px; }
        .prod-grid-meta { font-size: 0.72rem; color: #71717a; }
        .prod-grid-price { font-size: 0.85rem; font-weight: 700; color: #f97316; margin-top: 4px; }
        .prod-grid-btn { width: 100%; padding: 0.6rem; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .2s; }
        .prod-grid-btn.add { background: rgba(249,115,22,0.12); color: #f97316; border-top: 1px solid rgba(249,115,22,0.2); }
        .prod-grid-btn.add:hover { background: rgba(249,115,22,0.2); }
        .prod-grid-btn.edit { background: rgba(255,255,255,0.05); color: #a1a1aa; border-top: 1px solid rgba(255,255,255,0.07); }
        .prod-grid-btn.edit:hover { background: rgba(255,255,255,0.08); color: #e4e4e7; }
        .prod-grid-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.75rem; width: 100%; max-width: 400px; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
        .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .modal-close { background: none; border: none; color: #71717a; font-size: 1rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .modal-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .modal-product { display: flex; align-items: center; gap: 12px; padding: 0.75rem; background: rgba(255,255,255,0.04); border-radius: 10px; margin-bottom: 1.25rem; }
        .modal-img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
        .modal-product-name { font-size: 0.9rem; font-weight: 600; color: #e4e4e7; margin-bottom: 2px; }
        .modal-product-meta { font-size: 0.78rem; color: #71717a; }
        .modal-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .modal-field label { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.02em; }
        .modal-input-wrap { position: relative; display: flex; align-items: center; }
        .modal-input-wrap input { width: 100%; padding: 0.72rem 2.5rem 0.72rem 0.9rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #f4f4f5; font-size: 1rem; font-weight: 600; outline: none; font-family: inherit; transition: border-color .2s; }
        .modal-input-wrap input:focus { border-color: rgba(249,115,22,0.5); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .modal-currency { position: absolute; right: 12px; color: #71717a; font-weight: 600; font-size: 0.875rem; }
        .modal-toggles { display: flex; gap: 8px; }
        .modal-toggle-btn { flex: 1; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #71717a; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
        .modal-toggle-btn.active { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #22c55e; }
        .modal-toggle-btn.active-off { background: rgba(113,113,122,0.12); border-color: rgba(113,113,122,0.25); color: #71717a; }
        .modal-actions { display: flex; gap: 8px; margin-top: 1.25rem; }
        .modal-btn-cancel { flex: 1; padding: 0.72rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #a1a1aa; font-size: 0.875rem; font-weight: 500; cursor: pointer; font-family: inherit; }
        .modal-btn-save { flex: 2; padding: 0.72rem; background: #f97316; border: none; border-radius: 10px; color: white; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 4px 16px rgba(249,115,22,0.3); transition: background .2s; }
        .modal-btn-save:hover:not(:disabled) { background: #ea6c0a; }
        .modal-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
