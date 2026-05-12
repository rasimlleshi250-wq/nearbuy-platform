"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

interface MyProduct {
  id: string; // business_products doc id
  productId: string;
  name: string;
  category: string;
  image?: string;
  price: number;
  inStock: boolean;
  offerPrice?: number;
  offerEnd?: string;
  featured?: boolean;
}

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  images?: string[];
  description?: string;
  brand?: string;
}

export default function BusinessProductsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"mine" | "add">("mine");
  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: "", inStock: true, hasOffer: false, offerPrice: "", offerEnd: "", featured: false });
  const [addForm, setAddForm] = useState<Record<string, { price: string; inStock: boolean; offerPrice: string; offerEnd: string }>>({});
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        // Gjej businessId
        let bid = user.uid;
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (!bizSnap.exists()) {
          const q1 = query(collection(db, "businesses"), where("ownerUID", "==", user.uid));
          const s1 = await getDocs(q1);
          if (!s1.empty) bid = s1.docs[0].id;
          else {
            const q2 = query(collection(db, "businesses"), where("uid", "==", user.uid));
            const s2 = await getDocs(q2);
            if (!s2.empty) bid = s2.docs[0].id;
          }
        }
        setBusinessId(bid);

        // Ngarko produktet e mia
        await loadMyProducts(bid);

        // Ngarko katalogun
        const catSnap = await getDocs(collection(db, "products"));
        setCatalog(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as CatalogProduct)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, [user]);

  const loadMyProducts = async (bid: string) => {
    const q = query(collection(db, "business_products"), where("businessId", "==", bid));
    const snap = await getDocs(q);
    const prods: MyProduct[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      let name = "", image = "", category = "";
      if (data.productId) {
        try {
          const ps = await getDoc(doc(db, "products", data.productId));
          if (ps.exists()) { name = ps.data().name; image = ps.data().images?.[0] || ""; category = ps.data().category; }
        } catch {}
      }
      prods.push({ id: d.id, productId: data.productId, name, image, category, price: data.price || 0, inStock: data.inStock ?? true, offerPrice: data.offerPrice, offerEnd: data.offerEnd, featured: data.featured });
    }
    setMyProducts(prods);
  };

  const openEdit = (p: MyProduct) => {
    setEditId(p.id);
    setEditForm({ price: String(p.price), inStock: p.inStock, hasOffer: !!p.offerPrice, offerPrice: p.offerPrice ? String(p.offerPrice) : "", offerEnd: p.offerEnd || "", featured: p.featured || false });
  };

  const saveEdit = async (p: MyProduct) => {
    if (!editForm.price || isNaN(Number(editForm.price))) return;
    setSaving(p.id);
    try {
      await updateDoc(doc(db, "business_products", p.id), {
        price: Number(editForm.price),
        inStock: editForm.inStock,
        offerPrice: editForm.offerPrice ? Number(editForm.offerPrice) : null,
        offerEnd: editForm.offerEnd || null,
        featured: editForm.featured,
        updatedAt: serverTimestamp(),
      });
      setMyProducts(prev => prev.map(x => x.id === p.id ? {
        ...x, price: Number(editForm.price), inStock: editForm.inStock,
        offerPrice: editForm.offerPrice ? Number(editForm.offerPrice) : undefined,
        offerEnd: editForm.offerEnd || undefined, featured: editForm.featured
      } : x));
      setEditId(null);
      showSuccess("Produkti u përditësua!");
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("A jeni i sigurt që dëshironi ta fshini këtë produkt?")) return;
    setSaving(id);
    try {
      await deleteDoc(doc(db, "business_products", id));
      setMyProducts(prev => prev.filter(x => x.id !== id));
      showSuccess("Produkti u fshi!");
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const addProduct = async (cat: CatalogProduct) => {
    if (!businessId) return;
    const f = addForm[cat.id] || { price: "", inStock: true, hasOffer: false, offerPrice: "", offerEnd: "" };
    if (!f.price || isNaN(Number(f.price))) { alert("Vendos çmimin!"); return; }
    if (f.hasOffer && (!f.offerPrice || isNaN(Number(f.offerPrice)))) { alert("Vendos çmimin e ofertës!"); return; }
    const alreadyAdded = myProducts.some(p => p.productId === cat.id);
    if (alreadyAdded) { alert("Ky produkt është shtuar tashmë!"); return; }
    setSaving(cat.id);
    try {
      const newId = `${businessId}_${cat.id}`;
      await setDoc(doc(db, "business_products", newId), {
        businessId,
        productId: cat.id,
        price: Number(f.price),
        inStock: f.inStock,
        offerPrice: f.hasOffer && f.offerPrice ? Number(f.offerPrice) : null,
        offerEnd: f.hasOffer && f.offerEnd ? f.offerEnd : null,
        featured: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await loadMyProducts(businessId);
      setAddForm(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
      showSuccess(`"${cat.name}" u shtua me sukses!`);
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const filteredCatalog = catalog.filter(c =>
    !catalogSearch.trim() ||
    c.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    c.category?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const addedIds = new Set(myProducts.map(p => p.productId));

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pr-root">
      {/* Header */}
      <div className="pr-header">
        <div>
          <h1 className="pr-title">Produktet</h1>
          <p className="pr-sub">Menaxho dhe shto produkte në dyqanin tënd</p>
        </div>
      </div>

      {successMsg && <div className="pr-success">✓ {successMsg}</div>}

      {/* Tabs */}
      <div className="pr-tabs">
        <button onClick={() => setTab("mine")} className={`pr-tab ${tab === "mine" ? "active" : ""}`}>
          🛍 Produktet e mia ({myProducts.length})
        </button>
        <button onClick={() => setTab("add")} className={`pr-tab ${tab === "add" ? "active" : ""}`}>
          ➕ Shto produkt
        </button>
      </div>

      {/* Tab: Produktet e mia */}
      {tab === "mine" && (
        myProducts.length === 0 ? (
          <div className="pr-empty">
            <span className="pr-empty-icon">🛍</span>
            <p className="pr-empty-title">Nuk ke produkte ende</p>
            <p className="pr-empty-sub">Shko te "Shto produkt" për të zgjedhur nga katalogu.</p>
            <button onClick={() => setTab("add")} className="pr-empty-btn">➕ Shto produktin e parë</button>
          </div>
        ) : (
          <div className="pr-list">
            {myProducts.map(p => (
              <div key={p.id} className={`pr-item ${editId === p.id ? "pr-item-editing" : ""}`}>
                <div className="pr-item-left">
                  <div className="pr-item-img">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span>📦</span>}
                  </div>
                  <div className="pr-item-info">
                    <p className="pr-item-name">{p.name}</p>
                    <p className="pr-item-cat">{p.category}</p>
                    <div className="pr-item-badges">
                      <span className={`pr-stock ${p.inStock ? "in" : "out"}`}>
                        {p.inStock ? "✓ Në stok" : "✗ Jashtë stoku"}
                      </span>
                      {p.offerPrice && <span className="pr-offer-badge">🏷 Ofertë</span>}
                      {p.featured && <span className="pr-feat-badge">⭐ Featured</span>}
                    </div>
                  </div>
                </div>
                <div className="pr-item-right">
                  {editId !== p.id ? (
                    <>
                      <p className="pr-item-price">{p.price.toLocaleString()} L</p>
                      {p.offerPrice && <p className="pr-offer-price">{p.offerPrice.toLocaleString()} L <span>ofertë</span></p>}
                      <div className="pr-item-btns">
                        <button onClick={() => openEdit(p)} className="pr-btn-edit">✏️ Edito</button>
                        <button onClick={() => deleteProduct(p.id)} disabled={saving === p.id} className="pr-btn-del">🗑</button>
                      </div>
                    </>
                  ) : (
                    <div className="pr-edit-form">
                      <div className="pr-edit-field">
                        <label>Çmimi normal (L) *</label>
                        <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="p.sh. 2500" />
                      </div>
                      <div className="pr-edit-checks">
                        <label className="pr-check">
                          <input type="checkbox" checked={editForm.inStock} onChange={e => setEditForm(f => ({ ...f, inStock: e.target.checked }))} />
                          Në stok
                        </label>
                        <label className="pr-check">
                          <input type="checkbox" checked={editForm.featured} onChange={e => setEditForm(f => ({ ...f, featured: e.target.checked }))} />
                          Featured
                        </label>
                        <label className="pr-check pr-check-offer">
                          <input type="checkbox" checked={editForm.hasOffer} onChange={e => setEditForm(f => ({ ...f, hasOffer: e.target.checked }))} />
                          🏷 Shto ofertë
                        </label>
                      </div>
                      {editForm.hasOffer && (
                        <div className="pr-offer-section">
                          <div className="pr-offer-row">
                            <div className="pr-edit-field">
                              <label>Çmimi i ofertës (L) *</label>
                              <input type="number" value={editForm.offerPrice} onChange={e => setEditForm(f => ({ ...f, offerPrice: e.target.value }))} placeholder="p.sh. 1800" />
                            </div>
                            <div className="pr-edit-field">
                              <label>Oferta mbaron më</label>
                              <input type="date" value={editForm.offerEnd} onChange={e => setEditForm(f => ({ ...f, offerEnd: e.target.value }))} />
                            </div>
                          </div>
                          {editForm.price && editForm.offerPrice && (
                            <p className="pr-offer-preview">
                              Zbritje: {Math.round((1 - Number(editForm.offerPrice) / Number(editForm.price)) * 100)}% 
                              ({(Number(editForm.price) - Number(editForm.offerPrice)).toLocaleString()} L kursim)
                            </p>
                          )}
                        </div>
                      )}
                      <div className="pr-edit-actions">
                        <button onClick={() => saveEdit(p)} disabled={saving === p.id} className="pr-btn-save">
                          {saving === p.id ? "Duke ruajtur..." : "✓ Ruaj"}
                        </button>
                        <button onClick={() => setEditId(null)} className="pr-btn-cancel">Anulo</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: Shto produkt */}
      {tab === "add" && (
        <div className="pr-add">
          <input type="text" placeholder="🔍 Kërko produkt nga katalogu..." value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)} className="pr-cat-search" />

          {filteredCatalog.length === 0 ? (
            <div className="pr-empty">
              <span className="pr-empty-icon">📦</span>
              <p className="pr-empty-title">Nuk u gjet asnjë produkt</p>
              <p className="pr-empty-sub">Katalogu është bosh ose kërkimi nuk ka rezultate.</p>
            </div>
          ) : (
            <div className="pr-catalog">
              {filteredCatalog.map(c => {
                const isAdded = addedIds.has(c.id);
                const f = addForm[c.id] || { price: "", inStock: true, offerPrice: "", offerEnd: "" };
                return (
                  <div key={c.id} className={`pr-cat-item ${isAdded ? "pr-cat-added" : ""}`}>
                    <div className="pr-cat-left">
                      <div className="pr-cat-img">
                        {(c.images?.[0]) ? <img src={c.images[0]} alt={c.name} /> : <span>📦</span>}
                      </div>
                      <div>
                        <p className="pr-cat-name">{c.name}</p>
                        <p className="pr-cat-cat">{c.category}</p>
                        {c.brand && <p className="pr-cat-brand">{c.brand}</p>}
                      </div>
                    </div>
                    {isAdded ? (
                      <span className="pr-added-badge">✓ I shtuar</span>
                    ) : (
                      <div className="pr-cat-form-v2">
                        <div className="pr-cat-form-row">
                          <div className="pr-edit-field">
                            <label>Çmimi (L) *</label>
                            <input type="number" placeholder="p.sh. 2500" value={f.price}
                              onChange={e => setAddForm(prev => ({ ...prev, [c.id]: { ...f, price: e.target.value } }))}
                              className="pr-cat-price-v2" />
                          </div>
                          <div className="pr-cat-form-checks">
                            <label className="pr-check pr-check-small">
                              <input type="checkbox" checked={f.inStock}
                                onChange={e => setAddForm(prev => ({ ...prev, [c.id]: { ...f, inStock: e.target.checked } }))} />
                              Në stok
                            </label>
                            <label className="pr-check pr-check-small pr-check-offer">
                              <input type="checkbox" checked={f.hasOffer || false}
                                onChange={e => setAddForm(prev => ({ ...prev, [c.id]: { ...f, hasOffer: e.target.checked } }))} />
                              🏷 Ofertë
                            </label>
                          </div>
                          <button onClick={() => addProduct(c)} disabled={saving === c.id || !f.price} className="pr-btn-add">
                            {saving === c.id ? "..." : "➕ Shto"}
                          </button>
                        </div>
                        {f.hasOffer && (
                          <div className="pr-offer-row pr-offer-row-sm">
                            <div className="pr-edit-field">
                              <label>Çmimi ofertë (L) *</label>
                              <input type="number" placeholder="p.sh. 1800" value={f.offerPrice || ""}
                                onChange={e => setAddForm(prev => ({ ...prev, [c.id]: { ...f, offerPrice: e.target.value } }))}
                                className="pr-cat-price-v2" />
                            </div>
                            <div className="pr-edit-field">
                              <label>Oferta mbaron më</label>
                              <input type="date" value={f.offerEnd || ""}
                                onChange={e => setAddForm(prev => ({ ...prev, [c.id]: { ...f, offerEnd: e.target.value } }))}
                                className="pr-cat-price-v2" />
                            </div>
                            {f.price && f.offerPrice && (
                              <p className="pr-offer-preview">-{Math.round((1 - Number(f.offerPrice) / Number(f.price)) * 100)}% zbritje</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .pr-root{display:flex;flex-direction:column;gap:1.25rem}
        .pr-header{display:flex;align-items:center;justify-content:space-between}
        .pr-title{font-size:1.3rem;font-weight:700;color:#f4f4f5;letter-spacing:-0.02em}
        .pr-sub{font-size:0.82rem;color:#71717a;margin-top:2px}
        .pr-success{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:#22c55e;font-size:0.85rem;border-radius:10px;padding:0.65rem 1rem}
        .pr-tabs{display:flex;gap:6px}
        .pr-tab{padding:0.55rem 1.25rem;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#71717a;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s}
        .pr-tab:hover{background:rgba(255,255,255,0.05);color:#e4e4e7}
        .pr-tab.active{background:rgba(249,115,22,0.12);border-color:rgba(249,115,22,0.3);color:#f97316}
        .pr-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:4rem 2rem;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:16px;text-align:center}
        .pr-empty-icon{font-size:2.5rem}
        .pr-empty-title{font-size:1rem;font-weight:600;color:#e4e4e7}
        .pr-empty-sub{font-size:0.82rem;color:#52525b;max-width:300px;line-height:1.5}
        .pr-empty-btn{padding:0.6rem 1.5rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px}
        .pr-list{display:flex;flex-direction:column;gap:10px}
        .pr-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;transition:border-color .2s}
        .pr-item-editing{border-color:rgba(249,115,22,0.3);background:rgba(249,115,22,0.03)}
        .pr-item-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
        .pr-item-img{width:56px;height:56px;border-radius:10px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden;flex-shrink:0}
        .pr-item-img img{width:100%;height:100%;object-fit:cover}
        .pr-item-name{font-size:0.9rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .pr-item-cat{font-size:0.75rem;color:#71717a;margin-bottom:6px}
        .pr-item-badges{display:flex;flex-wrap:wrap;gap:5px}
        .pr-stock{font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:4px}
        .pr-stock.in{background:rgba(34,197,94,0.1);color:#22c55e}
        .pr-stock.out{background:rgba(239,68,68,0.1);color:#f87171}
        .pr-offer-badge{font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(245,200,66,0.1);color:#f5c842}
        .pr-feat-badge{font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(249,115,22,0.1);color:#f97316}
        .pr-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .pr-item-price{font-size:1rem;font-weight:700;color:#f97316}
        .pr-offer-price{font-size:0.78rem;color:#f5c842;font-weight:600}
        .pr-offer-price span{font-size:0.7rem;color:#71717a;font-weight:400}
        .pr-item-btns{display:flex;gap:6px}
        .pr-btn-edit{padding:4px 12px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);border-radius:8px;color:#f97316;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit}
        .pr-btn-del{padding:4px 10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;color:#f87171;font-size:0.78rem;cursor:pointer;font-family:inherit}
        .pr-edit-form{display:flex;flex-direction:column;gap:8px;min-width:280px}
        .pr-edit-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .pr-edit-field{display:flex;flex-direction:column;gap:3px}
        .pr-edit-field label{font-size:0.7rem;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:0.03em}
        .pr-edit-field input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.82rem;padding:0.5rem 0.7rem;outline:none;font-family:inherit}
        .pr-edit-field input:focus{border-color:rgba(249,115,22,0.4)}
        .pr-edit-checks{display:flex;gap:12px}
        .pr-check{display:flex;align-items:center;gap:6px;font-size:0.82rem;color:#a1a1aa;cursor:pointer}
        .pr-check-small{font-size:0.78rem}
        .pr-check input{accent-color:#f97316}
        .pr-edit-actions{display:flex;gap:8px}
        .pr-btn-save{padding:0.5rem 1rem;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit}
        .pr-btn-save:disabled{opacity:0.5;cursor:not-allowed}
        .pr-btn-cancel{padding:0.5rem 1rem;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#71717a;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .pr-add{display:flex;flex-direction:column;gap:1rem}
        .pr-cat-search{width:100%;padding:0.75rem 1rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#f4f4f5;font-size:0.9rem;outline:none;font-family:inherit}
        .pr-cat-search:focus{border-color:rgba(249,115,22,0.4)}
        .pr-catalog{display:flex;flex-direction:column;gap:8px}
        .pr-cat-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .pr-cat-added{opacity:0.5}
        .pr-cat-left{display:flex;align-items:center;gap:12px}
        .pr-cat-img{width:48px;height:48px;border-radius:8px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:1.3rem;overflow:hidden;flex-shrink:0}
        .pr-cat-img img{width:100%;height:100%;object-fit:cover}
        .pr-cat-name{font-size:0.875rem;font-weight:600;color:#e4e4e7;margin-bottom:2px}
        .pr-cat-cat{font-size:0.75rem;color:#71717a}
        .pr-cat-brand{font-size:0.72rem;color:#52525b}
        .pr-added-badge{font-size:0.75rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,0.1);padding:4px 10px;border-radius:6px;border:1px solid rgba(34,197,94,0.2);white-space:nowrap}
        .pr-cat-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .pr-cat-price{padding:0.5rem 0.7rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.82rem;outline:none;font-family:inherit;width:100px}
        .pr-cat-price:focus{border-color:rgba(249,115,22,0.4)}
        .pr-btn-add{padding:0.5rem 1rem;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
        .pr-btn-add:disabled{opacity:0.5;cursor:not-allowed}
        .pr-check-offer{color:#f5c842!important}
        .pr-offer-section{background:rgba(245,200,66,0.05);border:1px solid rgba(245,200,66,0.15);border-radius:10px;padding:0.75rem}
        .pr-offer-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .pr-offer-row-sm{margin-top:8px}
        .pr-offer-preview{font-size:0.75rem;color:#22c55e;font-weight:600;margin-top:6px}
        .pr-cat-form-v2{display:flex;flex-direction:column;gap:8px;min-width:260px}
        .pr-cat-form-row{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
        .pr-cat-price-v2{padding:0.5rem 0.7rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f4f4f5;font-size:0.82rem;outline:none;font-family:inherit;width:110px}
        .pr-cat-price-v2:focus{border-color:rgba(249,115,22,0.4)}
        .pr-cat-form-checks{display:flex;flex-direction:column;gap:6px}
        @media(max-width:600px){.pr-item{flex-direction:column}.pr-edit-row{grid-template-columns:1fr}.pr-cat-form{width:100%}.pr-cat-price{width:80px}.pr-cat-form-row{flex-direction:column}.pr-offer-row{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
