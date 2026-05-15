"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getCategories, getSubcategories } from "@/lib/firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Category } from "@/types";

export default function EditProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<{id:string;name:string}[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    barcode: "",
    tags: "",
    status: "active",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "products", productId));
        if (!snap.exists()) { router.push("/admin/products"); return; }
        const d = snap.data();
        setForm({
          name: d.name || "",
          description: d.description || "",
          category: d.category || "",
          subcategory: d.subcategory || "",
          brand: d.brand || "",
          barcode: d.barcode || "",
          tags: d.tags?.join(", ") || "",
          status: d.status || "active",
        });
        setExistingImages(d.images || []);
        const cats = await getCategories();
        setCategories(cats);
      } catch (e) {
        console.error(e);
        setError("Produkti nuk u gjet.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, router]);

  useEffect(() => {
    if (!form.category) { setSubcategories([]); return; }
    setLoadingSubs(true);
    getSubcategories(form.category)
      .then(setSubcategories)
      .finally(() => setLoadingSubs(false));
  }, [form.category]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = existingImages.length + newImageFiles.length + files.length;
    if (total > 5) { setError("Maksimumi 5 foto gjithsej."); return; }
    setNewImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setNewImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeExistingImage = (i: number) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== i));
  };

  const removeNewImage = (i: number) => {
    setNewImageFiles(prev => prev.filter((_, idx) => idx !== i));
    setNewImagePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    if (!newImageFiles.length) return [];
    setUploading(true);
    const urls: string[] = [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dvqcrh4qf";
    for (const file of newImageFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "nearbuy_products");
        formData.append("folder", "nearbuy/products");
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        if (data.secure_url) {
          urls.push(data.secure_url);
        } else {
          throw new Error(data.error?.message || "Upload failed");
        }
      } catch (e) {
        console.error("Cloudinary upload error:", e);
        setError("Gabim gjatë ngarkimit të fotos. Provo përsëri.");
      }
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) { setError("Emri dhe kategoria janë të detyrueshme."); return; }
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      const newUrls = await uploadNewImages();
      const allImages = [...existingImages, ...newUrls];
      await updateDoc(doc(db, "products", productId), {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        subcategory: form.subcategory,
        brand: form.brand.trim(),
        barcode: form.barcode.trim(),
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        images: allImages,
        status: form.status,
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => router.push("/admin/products"), 1500);
    } catch (err) {
      console.error(err);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="nb-spin" />
      <style>{`.nb-spin{width:24px;height:24px;border:2px solid rgba(249,115,22,0.2);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalImages = existingImages.length + newImageFiles.length;

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <div className="adm-breadcrumb">
              <Link href="/admin/products">Produktet</Link>
              <span>›</span>
              <span>Edito produktin</span>
            </div>
            <h1>Edito: {form.name}</h1>
          </div>
          <span className={`adm-status-badge ${form.status === "active" ? "active" : "inactive"}`}>
            {form.status === "active" ? "● Aktiv" : "○ Joaktiv"}
          </span>
        </div>
      </div>

      {success && <div className="adm-alert adm-alert-ok">✓ Produkti u përditësua! Duke të ridrejtuar...</div>}

      <form onSubmit={handleSubmit} className="adm-form">
        <div className="adm-form-grid">
          {/* Left */}
          <div className="adm-form-left">
            <div className="adm-card">
              <h2 className="adm-card-title">Informacioni bazë</h2>

              <div className="adm-field">
                <label>Emri i produktit <span className="req">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>

              <div className="adm-field">
                <label>Përshkrimi</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Kategoria <span className="req">*</span></label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: "" }))} required>
                    <option value="">Zgjidh kategorinë...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label>Nënkategoria {loadingSubs && <span className="adm-hint" style={{textTransform:"none"}}>duke ngarkuar...</span>}</label>
                  <select value={form.subcategory}
                    onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                    disabled={!form.category || loadingSubs}>
                    <option value="">Zgjidh nënkategorinë...</option>
                    {subcategories.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {form.category && !loadingSubs && subcategories.length === 0 && (
                    <p className="adm-hint">Nuk ka nënkategori</p>
                  )}
                </div>
              </div>

              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Marka</label>
                  <input type="text" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
                </div>

              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Barkodi</label>
                  <input type="text" value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label>Tags</label>
                  <input type="text" placeholder="të ndara me presje" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
                </div>
              </div>

              <div className="adm-field">
                <label>Statusi</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Joaktiv</option>
                  <option value="pending">Në pritje</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right - images */}
          <div className="adm-form-right">
            <div className="adm-card">
              <h2 className="adm-card-title">Fotot e produktit</h2>
              <p className="adm-hint" style={{ marginBottom: "1rem" }}>Maksimumi 5 foto. {totalImages}/5 të ngarkuara.</p>

              <div className="adm-image-grid">
                {/* Fotot ekzistuese */}
                {existingImages.map((src, i) => (
                  <div key={`existing-${i}`} className="adm-image-item">
                    <img src={src} alt={`foto ${i + 1}`} />
                    <button type="button" onClick={() => removeExistingImage(i)} className="adm-image-remove">✕</button>
                    {i === 0 && <span className="adm-image-main">Kryesore</span>}
                  </div>
                ))}
                {/* Fotot e reja */}
                {newImagePreviews.map((src, i) => (
                  <div key={`new-${i}`} className="adm-image-item adm-image-new">
                    <img src={src} alt={`foto e re ${i + 1}`} />
                    <button type="button" onClick={() => removeNewImage(i)} className="adm-image-remove">✕</button>
                    <span className="adm-image-new-badge">E re</span>
                  </div>
                ))}
                {/* Upload */}
                {totalImages < 5 && (
                  <label className="adm-image-upload">
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
                    <span className="adm-upload-icon">📷</span>
                    <span>Shto foto</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="adm-alert adm-alert-err">{error}</div>}

        <div className="adm-form-actions">
          <Link href="/admin/products" className="adm-btn-secondary">Anulo</Link>
          <button type="submit" disabled={saving || uploading} className="adm-btn-primary">
            {saving || uploading ? (uploading ? "Duke ngarkuar fotot..." : "Duke ruajtur...") : "Ruaj ndryshimet"}
          </button>
        </div>
      </form>

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
        .adm-breadcrumb{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#71717a;margin-bottom:0.4rem}
        .adm-breadcrumb a{color:#71717a;text-decoration:none}
        .adm-breadcrumb a:hover{color:#f97316}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em}
        .adm-status-badge{font-size:0.78rem;font-weight:600;padding:4px 12px;border-radius:6px}
        .adm-status-badge.active{background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)}
        .adm-status-badge.inactive{background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
        .adm-alert{padding:0.75rem 1rem;border-radius:10px;font-size:0.875rem;margin-bottom:1rem}
        .adm-alert-ok{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e}
        .adm-alert-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171}
        .adm-form-grid{display:grid;grid-template-columns:1fr 320px;gap:1.25rem;margin-bottom:1.25rem}
        .adm-card{background:#141414;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:1.5rem}
        .adm-card-title{font-size:0.95rem;font-weight:700;color:#e4e4e7;margin-bottom:1.25rem}
        .adm-field{display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1rem}
        .adm-field:last-child{margin-bottom:0}
        .adm-field label{font-size:0.8rem;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.02em}
        .req{color:#f97316}
        .adm-field input,.adm-field textarea,.adm-field select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.7rem 0.9rem;outline:none;transition:border-color .2s;font-family:inherit;resize:vertical}
        .adm-field input:focus,.adm-field textarea:focus,.adm-field select:focus{border-color:rgba(249,115,22,0.5);box-shadow:0 0 0 3px rgba(249,115,22,0.1)}
        .adm-field input::placeholder,.adm-field textarea::placeholder{color:#3f3f46}
        .adm-field select option{background:#1c1c1c;color:#f4f4f5}
        .adm-field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .adm-hint{font-size:0.75rem;color:#52525b}
        .adm-image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        .adm-image-item{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:rgba(255,255,255,0.04)}
        .adm-image-item img{width:100%;height:100%;object-fit:cover}
        .adm-image-new{outline:2px solid rgba(34,197,94,0.4)}
        .adm-image-remove{position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:22px;height:22px;border-radius:50%;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .adm-image-main{position:absolute;bottom:5px;left:5px;background:rgba(249,115,22,0.9);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px}
        .adm-image-new-badge{position:absolute;bottom:5px;left:5px;background:rgba(34,197,94,0.9);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px}
        .adm-image-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1.5px dashed rgba(255,255,255,0.12);border-radius:10px;aspect-ratio:1;cursor:pointer;transition:border-color .2s,background .2s}
        .adm-image-upload:hover{border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.04)}
        .adm-upload-icon{font-size:1.5rem}
        .adm-image-upload span:last-child{font-size:0.75rem;color:#71717a}
        .adm-form-actions{display:flex;justify-content:flex-end;gap:10px}
        .adm-btn-primary{padding:0.65rem 1.5rem;background:#f97316;color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s;font-family:inherit}
        .adm-btn-primary:hover:not(:disabled){background:#ea6c0a}
        .adm-btn-primary:disabled{opacity:0.55;cursor:not-allowed}
        .adm-btn-secondary{padding:0.65rem 1.5rem;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:10px;font-size:0.875rem;font-weight:500;cursor:pointer;text-decoration:none;transition:all .2s;font-family:inherit}
        .adm-btn-secondary:hover{border-color:rgba(255,255,255,0.2);color:#e4e4e7}
        @media(max-width:900px){.adm-form-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
