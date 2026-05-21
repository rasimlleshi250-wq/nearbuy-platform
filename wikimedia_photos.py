"""
NearBuy.al — Foto nga Wikimedia Commons
=========================================
Kërkon foto te Wikimedia Commons API (falas, licencë CC)
dhe i ngarkon në Cloudinary.

Perdorim:
  py wikimedia_photos.py
"""

import requests
import cloudinary
import cloudinary.uploader
import csv
import re
import time
from difflib import SequenceMatcher

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "NearBuy.al/1.0 (contact@nearbuy.al) Python/3.x",
}

def similarity(a, b):
    """Llogarit ngjashmërinë midis dy stringjeve (0-1)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def clean_query(name):
    """Pastro emrin për kërkim më të mirë."""
    # Hiq dimensionet dhe kodet teknike
    name = re.sub(r'\d+mm|\d+cm|\d+m\b|\d+w\b|\d+v\b|\d+a\b|\d+l\b', '', name, flags=re.I)
    name = re.sub(r'\b\d+x\d+\b', '', name)
    name = re.sub(r'\bpn\d+\b', '', name, flags=re.I)
    # Hiq fjalë teknike
    stop_words = ['me', 'dhe', 'per', 'nga', 'ne', 'te', 'i', 'e', 'set', 'kit', 'komplet']
    words = [w for w in name.split() if w.lower() not in stop_words and len(w) > 2]
    return ' '.join(words[:4])  # Max 4 fjalë

def translate_to_english(name, category):
    """Përkthe termat kryesorë shqip → anglisht për kërkim më të mirë."""
    translations = {
        # Hidraulikë
        "rubinet": "faucet", "manikote": "pipe coupling", "tub pvc": "pvc pipe",
        "pompa uji": "water pump", "sifonë": "drain siphon", "vana": "valve",
        "kazanë uji": "water heater", "fitingje": "pipe fittings",
        # Elektrik
        "ndricues": "led light fixture", "llambë": "light bulb", "prizë": "electrical socket",
        "çelës": "light switch", "kabllo": "electric cable", "siguresë": "circuit breaker",
        "prozhektor": "floodlight", "spot": "spotlight",
        # Ndërtim
        "çekan": "hammer", "kacavidë": "screwdriver", "trapan": "drill",
        "shkallë": "ladder", "pincë": "pliers", "matrapik": "wrench",
        "disk prerje": "cutting disc", "saldatrice": "welding machine",
        # Bojëra
        "rulo bojimi": "paint roller", "furçë": "paint brush",
        "spraj": "spray paint", "silikone": "silicone sealant",
        # Kopshtari
        "motokosë": "lawn mower", "krasitëse": "hedge trimmer",
        "sharre zinxhiri": "chainsaw", "zorrë uji": "garden hose",
    }
    
    name_lower = name.lower()
    for alb, eng in translations.items():
        if alb in name_lower:
            return eng
    
    # Nëse nuk gjeti, kthe emrin origjinal
    return clean_query(name)

def search_wikimedia(query, category=""):
    """Kërko foto te Wikimedia Commons."""
    try:
        # API endpoint
        url = "https://commons.wikimedia.org/w/api.php"
        params = {
            "action": "query",
            "generator": "search",
            "gsrnamespace": "6",  # Namespace për File
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrlimit": "10",
            "prop": "imageinfo",
            "iiprop": "url|size|mime",
            "iiurlwidth": "800",
            "format": "json",
        }
        
        r = requests.get(url, params=params, headers=HEADERS, timeout=10)
        data = r.json()
        
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None
        
        best_match = None
        best_score = 0
        
        for page in pages.values():
            imageinfo = page.get("imageinfo", [{}])[0]
            img_url = imageinfo.get("thumburl") or imageinfo.get("url", "")
            mime = imageinfo.get("mime", "")
            width = imageinfo.get("thumbwidth", 0)
            
            # Filtro SVG dhe foto shumë të vogla
            if "svg" in mime or width < 200:
                continue
            
            if not img_url or not img_url.startswith("http"):
                continue
            
            # Llogarit ngjashmërinë me emrin e faqes
            page_title = page.get("title", "").replace("File:", "")
            score = similarity(query, page_title)
            
            if score > best_score:
                best_score = score
                best_match = img_url
        
        # Pranoj vetëm nëse score > 0.15 (threshold i ulët)
        if best_score > 0.15 and best_match:
            return best_match
            
    except Exception as e:
        pass
    return None

def upload_to_cloudinary(image_url, name):
    if not image_url or not image_url.startswith("http"):
        return ""
    try:
        pid = re.sub(r'[^a-z0-9]', '_', name.lower())[:50]
        result = cloudinary.uploader.upload(
            image_url,
            folder="nearbuy/products",
            public_id=pid,
            overwrite=False,
            transformation=[
                {"width": 800, "height": 800, "crop": "limit"},
                {"quality": "auto:good"}
            ]
        )
        return result.get("secure_url", "")
    except Exception as e:
        return ""

def main():
    print("="*60)
    print("NearBuy.al — Foto nga Wikimedia Commons")
    print("="*60)
    
    # Lexo CSV
    try:
        with open("nearbuy_products_final.csv", "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        print(f"U lexuan {len(rows)} produkte")
    except FileNotFoundError:
        print("ERROR: nearbuy_products_final.csv nuk u gjet!")
        return
    
    # Filtro produktet pa foto
    without_photo = [r for r in rows if not r.get('image_url','').strip()]
    with_photo = len(rows) - len(without_photo)
    print(f"Me foto: {with_photo}")
    print(f"Pa foto: {len(without_photo)}")
    
    success = 0
    failed = 0
    
    print(f"\nDuke kërkuar foto...\n")
    
    for i, row in enumerate(rows):
        # Kalon nëse ka foto
        if row.get('image_url','').strip():
            continue
        
        name = row['name']
        category = row.get('category', '')
        brand = row.get('brand', '')
        
        # Ndërto query
        eng_query = translate_to_english(name, category)
        if brand and brand not in ['3M', 'IMI']:
            search_query = f"{brand} {eng_query}"
        else:
            search_query = eng_query
        
        print(f"[{i+1}/{len(rows)}] {name[:40]}...", end=" ", flush=True)
        print(f"→ '{search_query}'", end=" ", flush=True)
        
        # Kërko foto
        img_url = search_wikimedia(search_query, category)
        
        # Nëse nuk gjeti, provo me query të thjeshtuar
        if not img_url and len(search_query.split()) > 2:
            simple_query = ' '.join(search_query.split()[:2])
            img_url = search_wikimedia(simple_query, category)
        
        if img_url:
            # Ngarko në Cloudinary
            cloudinary_url = upload_to_cloudinary(img_url, name)
            if cloudinary_url:
                row['image_url'] = cloudinary_url
                success += 1
                print("✅")
            else:
                row['image_url'] = img_url
                success += 1
                print("📷")
        else:
            failed += 1
            print("❌")
        
        # Rate limiting - Wikimedia kërkon të jemi të sjellshëm
        time.sleep(0.5)
        
        # Ruaj progress çdo 100 produkte
        if (success + failed) % 100 == 0:
            fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
            with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            print(f"\n  ✅ Progress ruajtur: {success} foto / {failed} pa foto\n")
    
    # Ruaj CSV final
    fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
    with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n{'='*60}")
    print(f"✅ Foto të gjetura: {success}")
    print(f"❌ Pa foto: {failed}")
    print(f"📊 Sukses: {round(success/(success+failed)*100)}%" if (success+failed) > 0 else "")
    print(f"\nCSV u ruajt: nearbuy_products_final.csv")
    print(f"\nHapat e radhës:")
    print(f"  1. Kontrollo CSV-në në Excel — shiko nëse fotot janë të sakta")
    print(f"  2. Fshi produktet e vjetra nga /admin/products")
    print(f"  3. Importo CSV-në e re te /admin/products/import")


if __name__ == "__main__":
    main()
