"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createProduct, getCategories } from "@/lib/firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Category } from "@/types";

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    barcode: "",
    tags: "",
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 5) {
      setError("Maksimumi 5 foto.");
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!imageFiles.length) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of imageFiles) {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) { setError("Emri dhe kategoria janë të detyrueshme."); return; }
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      const imageUrls = await uploadImages();
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        brand: form.brand.trim(),
        barcode: form.barcode.trim(),
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        images: imageUrls,
        status: "active" as const,
        createdBy: user.uid,
      }, user.uid);
      setSuccess(true);
      setTimeout(() => router.push("/admin/products"), 1500);
    } catch (err) {
      console.error(err);
      setError("Gabim gjatë ruajtjes. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="adm-page-header">
        <div className="adm-header-row">
          <div>
            <div className="adm-breadcrumb">
              <Link href="/admin/products">Produktet</Link>
              <span>›</span>
              <span>Produkt i ri</span>
            </div>
            <h1>Shto produkt të ri</h1>
          </div>
        </div>
      </div>

      {success && (
        <div className="adm-alert adm-alert-ok">✓ Produkti u ruajt me sukses! Duke të ridrejtuar...</div>
      )}

      <form onSubmit={handleSubmit} className="adm-form">
        <div className="adm-form-grid">
          {/* Left col */}
          <div className="adm-form-left">
            <div className="adm-card">
              <h2 className="adm-card-title">Informacioni bazë</h2>

              <div className="adm-field">
                <label>Emri i produktit <span className="req">*</span></label>
                <input type="text" placeholder="p.sh. Samsung Galaxy S24" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>

              <div className="adm-field">
                <label>Përshkrimi</label>
                <textarea rows={4} placeholder="Përshkrim i detajuar i produktit..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Kategoria <span className="req">*</span></label>
                  <select value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
                    <option value="">Zgjidh kategorinë...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="adm-hint">
                      <Link href="/admin/categories/new">+ Shto kategori të parë</Link>
                    </p>
                  )}
                </div>
                <div className="adm-field">
                  <label>Marka</label>
                  <input type="text" placeholder="p.sh. Samsung, Apple..."
                    value={form.brand}
                    onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
                </div>
              </div>

              <div className="adm-field-row">
                <div className="adm-field">
                  <label>Barkodi</label>
                  <input type="text" placeholder="EAN/UPC opsional"
                    value={form.barcode}
                    onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} />
                </div>
                <div className="adm-field">
                  <label>Tags</label>
                  <input type="text" placeholder="smartphone, android, 5G"
                    value={form.tags}
                    onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
                  <p className="adm-hint">Të ndara me presje</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right col - images */}
          <div className="adm-form-right">
            <div className="adm-card">
              <h2 className="adm-card-title">Fotot e produktit</h2>
              <p className="adm-hint" style={{ marginBottom: "1rem" }}>Maksimumi 5 foto. Formati: JPG, PNG, WebP.</p>

              <div className="adm-image-grid">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="adm-image-item">
                    <img src={src} alt={`foto ${i + 1}`} />
                    <button type="button" onClick={() => removeImage(i)} className="adm-image-remove">✕</button>
                    {i === 0 && <span className="adm-image-main">Kryesore</span>}
                  </div>
                ))}
                {imagePreviews.length < 5 && (
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
          <button type="submit" disabled={loading || uploading} className="adm-btn-primary">
            {loading || uploading ? (uploading ? "Duke ngarkuar fotot..." : "Duke ruajtur...") : "Ruaj produktin"}
          </button>
        </div>
      </form>

      <style>{`
        .adm-page-header{margin-bottom:1.5rem}
        .adm-header-row{display:flex;align-items:flex-start;justify-content:space-between}
        .adm-breadcrumb{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#71717a;margin-bottom:0.4rem}
        .adm-breadcrumb a{color:#71717a;text-decoration:none}
        .adm-breadcrumb a:hover{color:#f97316}
        .adm-page-header h1{font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.025em}
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
        .adm-field input,.adm-field textarea,.adm-field select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#f4f4f5;font-size:0.875rem;padding:0.7rem 0.9rem;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;resize:vertical}
        .adm-field input::placeholder,.adm-field textarea::placeholder{color:#3f3f46}
        .adm-field input:focus,.adm-field textarea:focus,.adm-field select:focus{border-color:rgba(249,115,22,0.5);box-shadow:0 0 0 3px rgba(249,115,22,0.1)}
        .adm-field select option{background:#1c1c1c;color:#f4f4f5}
        .adm-field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .adm-hint{font-size:0.75rem;color:#52525b;margin-top:3px}
        .adm-hint a{color:#f97316;text-decoration:none}
        .adm-image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        .adm-image-item{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:rgba(255,255,255,0.04)}
        .adm-image-item img{width:100%;height:100%;object-fit:cover}
        .adm-image-remove{position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);border:none;color:#fff;width:22px;height:22px;border-radius:50%;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .adm-image-main{position:absolute;bottom:5px;left:5px;background:rgba(249,115,22,0.9);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:4px}
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
