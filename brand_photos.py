"""
NearBuy.al — Merr foto nga faqet zyrtare te prodhuesve
=======================================================
Perdorim:
  py brand_photos.py
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import csv
import re
import time

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

# ── Funksione kerkimi per cdo marke ────────────────────────────────

def search_3m(product_name):
    """Kerko foto te 3M.com"""
    try:
        clean = re.sub(r'3m', '', product_name, flags=re.I).strip()
        query = clean.split()[0] if clean.split() else product_name
        url = f"https://www.3m.com/3M/en_US/p/c/sku/search/?Ntt={requests.utils.quote(query)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        img = soup.select_one('.product-image img, .pdp-image img, [data-pdp-image] img')
        if img:
            src = img.get('data-src') or img.get('src','')
            if src and src.startswith('http'):
                return src
    except: pass
    return ""

def search_grohe(product_name):
    """Kerko foto te Grohe.com"""
    try:
        clean = re.sub(r'grohe', '', product_name, flags=re.I).strip()
        query = ' '.join(clean.split()[:3])
        url = f"https://www.grohe.com/en_gb/search/?q={requests.utils.quote(query)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        img = soup.select_one('.product-tile__image img, .search-result img')
        if img:
            src = img.get('data-src') or img.get('src','')
            if src and src.startswith('http') and 'placeholder' not in src:
                return src
    except: pass
    return ""

def search_philips(product_name):
    """Kerko foto te Philips.com"""
    try:
        clean = re.sub(r'philips', '', product_name, flags=re.I).strip()
        query = ' '.join(clean.split()[:3])
        url = f"https://www.lighting.philips.com/en_AA/consumer/search.html#q={requests.utils.quote(query)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        img = soup.select_one('.product-tile img, .search-result img')
        if img:
            src = img.get('data-src') or img.get('src','')
            if src and src.startswith('http'):
                return src
    except: pass
    return ""

def search_bing_official(product_name, brand):
    """Kerko foto zyrtare nga Bing me filter site:brand.com"""
    try:
        brand_domains = {
            "Grohe": "grohe.com",
            "Philips": "philips.com",
            "Stihl": "stihl.com",
            "Honda": "honda.com",
            "Pattex": "henkel.com",
            "3M": "3m.com",
            "WD-40": "wd40.com",
            "Ceresit": "ceresit.com",
            "Husqvarna": "husqvarna.com",
            "Flex": "flex-tools.com",
            "Hikoki": "hikoki-powertools.com",
            "Oregon": "oregonproducts.com",
            "Loctite": "loctite.com",
            "Makita": "makita.com",
            "Bosch": "bosch-professional.com",
            "DeWalt": "dewalt.com",
            "Milwaukee": "milwaukeetool.eu",
            "Karcher": "karcher.com",
            "Knauf": "knauf.com",
            "Sika": "sika.com",
            "Mapei": "mapei.com",
        }
        
        domain = brand_domains.get(brand, "")
        clean_name = re.sub(r'\b' + re.escape(brand) + r'\b', '', product_name, flags=re.I).strip()
        clean_name = ' '.join(clean_name.split()[:4])
        
        if domain:
            query = f"{brand} {clean_name} site:{domain}"
        else:
            query = f"{brand} {clean_name} official product"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        }
        url = f"https://www.bing.com/images/search?q={requests.utils.quote(query)}&first=1&count=5"
        r = requests.get(url, headers=headers, timeout=10)
        
        # Bing vendos URL-te e imazheve si JSON
        matches = re.findall(r'"murl":"(https://[^"]+\.(?:jpg|jpeg|png|webp))"', r.text)
        
        for m in matches[:5]:
            # Prefero foto nga domeni zyrtar
            if domain and domain in m:
                return m
        
        # Nese nuk gjeti nga domeni zyrtar, merr te paren
        if matches:
            return matches[0]
            
    except Exception as e:
        pass
    return ""


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


def get_photo_for_product(name, brand):
    """Zgjedh metodën e duhur bazuar ne markën."""
    brand_lower = brand.lower()
    
    # Metoda specifike per markat kryesore
    if "grohe" in brand_lower:
        url = search_grohe(name)
        if url: return url
    elif "philips" in brand_lower:
        url = search_philips(name)
        if url: return url
    elif "3m" in brand_lower:
        url = search_3m(name)
        if url: return url
    
    # Fallback per te gjitha: Bing me filter zyrtar
    return search_bing_official(name, brand)


def main():
    print("="*60)
    print("NearBuy.al — Foto nga Faqet Zyrtare te Prodhuesve")
    print("="*60)
    
    # Lexo CSV
    try:
        with open("nearbuy_products_final.csv", "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        print(f"U lexuan {len(rows)} produkte")
    except FileNotFoundError:
        print("ERROR: nearbuy_products_final.csv nuk u gjet!")
        return
    
    # Filtro produktet me marke dhe pa foto
    branded = [r for r in rows if r.get('brand','').strip() and not r.get('image_url','').strip()]
    print(f"Me markë pa foto: {len(branded)}")
    
    # Statistika
    brand_stats = {}
    for r in branded:
        b = r['brand']
        brand_stats[b] = brand_stats.get(b, 0) + 1
    print("\nSipas markave:")
    for b, c in sorted(brand_stats.items(), key=lambda x: -x[1]):
        print(f"  {b}: {c}")
    
    print("\nDuke kërkuar foto...")
    success = 0
    
    for i, row in enumerate(rows):
        brand = row.get('brand','').strip()
        image_url = row.get('image_url','').strip()
        
        # Kalon nese nuk ka marke ose ka foto
        if not brand or image_url:
            continue
        
        name = row['name']
        print(f"  [{i+1}] {name[:45]}... ({brand})", end=" ", flush=True)
        
        # Kërko foto
        photo_url = get_photo_for_product(name, brand)
        
        if photo_url:
            # Ngarko ne Cloudinary
            cloudinary_url = upload_to_cloudinary(photo_url, name)
            if cloudinary_url:
                row['image_url'] = cloudinary_url
                success += 1
                print("✅")
            else:
                row['image_url'] = photo_url
                print("📷 (pa cloudinary)")
        else:
            print("❌ nuk u gjet")
        
        time.sleep(1)
        
        # Ruaj progress cdo 25 produkte
        if success > 0 and success % 25 == 0:
            fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
            with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            print(f"\n  [Progress ruajtur: {success} foto]\n")
    
    # Ruaj CSV final
    fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
    with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n{'='*60}")
    print(f"✅ Foto të shtuara: {success}/{len(branded)}")
    print(f"CSV u ruajt: nearbuy_products_final.csv")
    print(f"\nHapat e radhës:")
    print(f"  1. Kontrollo CSV-në në Excel")
    print(f"  2. Importo te /admin/products/import")


if __name__ == "__main__":
    main()
