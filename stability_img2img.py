"""
NearBuy.al — Scrape Baumarket Foto + Stability AI Image-to-Image
================================================================
Per cdo produkt:
1. Kerkon foton origjinale nga Baumarket
2. Dergon foton te Stability AI → gjeneron version unik
3. Ngarkon ne Cloudinary me watermark nearbuy.al

Perdorim:
  py stability_img2img.py
  
Per te vazhduar nga ku u ndal:
  py stability_img2img.py --resume
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import csv
import re
import time
import sys
import os

STABILITY_API_KEY = "sk-Q1d2QNUMgLbT7S2f3V26Tt7yM5KVqQnsOoOA5KxpJtqaL99P"

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

def search_baumarket_image(product_name):
    """Kerko foton e produktit nga Baumarket."""
    try:
        # Pastro emrin per kërkim
        clean = re.sub(r'\d+mm|\d+cm|\d+m\b|\d+w\b|\d+kg\b', '', product_name, flags=re.I)
        words = clean.split()[:4]
        query = '+'.join(words)
        
        search_url = f"https://baumarket.al/?s={query}"
        r = requests.get(search_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Gjej foton e parë të produktit
        cards = soup.select('li.product img, .products img, .product-image img')
        for img in cards:
            src = img.get('data-src') or img.get('data-lazy-src') or img.get('src', '')
            if src and src.startswith('http') and 'placeholder' not in src and 'woocommerce-placeholder' not in src:
                return src
        
        # Provo me URL direkte te kategorisë
        cat_urls = {
            "Elektrik": "https://baumarket.al/product-category/ndrricimi-dhe-elektrike/",
            "Hidraulikë": "https://baumarket.al/product-category/tualeti-dhe-hidraulika/",
            "Ndërtim": "https://baumarket.al/product-category/vegla-dore-dhe-aksesore-ndertimi/",
            "Bojëra & Kimikate": "https://baumarket.al/product-category/spraj-silikona-mbushesa-dhe-lubrifikant/",
            "Kopshtari": "https://baumarket.al/product-category/kopshtaria-gjelberimi-dhe-bujqesia/",
        }
                    
    except Exception as e:
        pass
    return None


def image_to_image_stability(image_url, prompt):
    """Stability AI image-to-image - gjeneron version unik te fotos."""
    try:
        # Shkarko foton origjinale
        img_r = requests.get(image_url, headers=HEADERS, timeout=15)
        if img_r.status_code != 200:
            return None
        
        img_bytes = img_r.content
        
        # Kontrollo madhesine e fotos (max 10MB)
        if len(img_bytes) > 10 * 1024 * 1024:
            return None
        
        # Determine content type
        content_type = img_r.headers.get('content-type', 'image/jpeg')
        if 'png' in content_type:
            ext = 'image.png'
        elif 'webp' in content_type:
            ext = 'image.webp'
        else:
            ext = 'image.jpg'
        
        # Stability AI image-to-image
        response = requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/sd3",
            headers={
                "authorization": f"Bearer {STABILITY_API_KEY}",
                "accept": "image/*"
            },
            files={
                "image": (ext, img_bytes, content_type),
            },
            data={
                "prompt": prompt,
                "mode": "image-to-image",
                "strength": 0.75,  # 0.75 = ndryshim i mesem, ruan strukturen
                "output_format": "jpeg",
                "model": "sd3-large-turbo",
            },
        )
        
        if response.status_code == 200:
            return response.content
        else:
            print(f"\n  [Stability error {response.status_code}]: {response.text[:150]}")
            return None
            
    except Exception as e:
        print(f"\n  [Error]: {e}")
        return None


def text_to_image_stability(prompt):
    """Stability AI text-to-image - fallback kur nuk ka foto origjinale."""
    try:
        response = requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/core",
            headers={
                "authorization": f"Bearer {STABILITY_API_KEY}",
                "accept": "image/*"
            },
            files={"none": ""},
            data={
                "prompt": prompt,
                "output_format": "jpeg",
                "aspect_ratio": "1:1",
            },
        )
        
        if response.status_code == 200:
            return response.content
        else:
            print(f"\n  [Stability t2i error {response.status_code}]: {response.text[:150]}")
            return None
    except Exception as e:
        return None


def build_prompt(name, category, brand=""):
    """Nderto prompt profesional."""
    translations = {
        "ndricues": "LED light fixture", "llambë": "LED bulb", "prozhektor": "LED floodlight",
        "rubinet": "bathroom faucet", "manikote": "pipe coupling", "tub pvc": "PVC pipe",
        "pompa uji": "water pump", "vana": "ball valve", "sifon": "drain trap",
        "çekan": "hammer", "trapan": "drill", "kacavidë": "screwdriver set",
        "shkallë": "aluminum ladder", "kompresor": "air compressor",
        "disk prerje": "cutting disc", "saldatrice": "welder machine",
        "spraj": "spray can", "silikon": "silicone sealant", "ngjites": "adhesive",
        "boje": "paint can", "llak": "wood varnish", "primer": "primer paint",
        "motokosë": "lawn mower", "sharre zinxhiri": "chainsaw",
        "baladeze": "extension cord power strip", "kabllo": "electrical cable",
        "siguresë": "circuit breaker", "prizë": "electrical socket",
        "furce": "paint brush roller", "rulo": "paint roller",
        "pince": "pliers", "çelës": "wrench spanner",
        "vida": "screws bolts set", "bullon": "bolt nut set",
        "kupe": "pipe fitting", "brryl": "pipe elbow fitting",
        "zorrë uji": "garden hose", "lopatë": "shovel spade",
    }
    
    name_lower = name.lower()
    eng_term = ""
    for alb, eng in translations.items():
        if alb in name_lower:
            eng_term = eng
            break
    
    if not eng_term:
        eng_term = ' '.join(name.split()[:4])
    
    if brand and brand not in ['3M', 'IMI', '']:
        return f"Professional product photography of {brand} {eng_term}, pure white background, studio lighting, sharp focus, commercial product photo, no text no watermark"
    else:
        return f"Professional product photography of {eng_term}, pure white background, studio lighting, sharp focus, high quality commercial product photo, no text no watermark"


def upload_to_cloudinary(image_bytes, name):
    """Ngarko ne Cloudinary me watermark nearbuy.al."""
    try:
        pid = re.sub(r'[^a-z0-9]', '_', name.lower())[:50]
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="nearbuy/products",
            public_id=pid,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "fill", "gravity": "center"},
                {"quality": "auto:good"},
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 16,
                        "font_weight": "bold",
                        "text": "nearbuy.al"
                    },
                    "color": "#ffffff",
                    "opacity": 45,
                    "gravity": "south_east",
                    "x": 12,
                    "y": 10,
                }
            ]
        )
        return result.get("secure_url", "")
    except Exception as e:
        print(f"\n  [Cloudinary error]: {e}")
        return ""


def main():
    resume = "--resume" in sys.argv
    
    print("="*60)
    print("NearBuy.al — Stability AI Image-to-Image")
    print("="*60)
    
    # Lexo CSV
    try:
        with open("nearbuy_products_final.csv", "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        print(f"Total produkte: {len(rows)}")
    except FileNotFoundError:
        print("ERROR: nearbuy_products_final.csv nuk u gjet!")
        return
    
    # Filtro pa foto
    without_photo = [r for r in rows if not r.get('image_url','').strip()]
    with_photo = len(rows) - len(without_photo)
    print(f"Me foto: {with_photo}")
    print(f"Pa foto: {len(without_photo)}")
    
    # Kontrollo credits
    print(f"\nDuke kontrolluar Stability AI credits...")
    try:
        bal_r = requests.get(
            "https://api.stability.ai/v1/user/balance",
            headers={"Authorization": f"Bearer {STABILITY_API_KEY}"}
        )
        if bal_r.status_code == 200:
            credits = bal_r.json().get('credits', 0)
            print(f"Credits: {credits:.2f}")
            if credits < 1:
                print("ERROR: Nuk ka credits të mjaftueshme!")
                return
    except:
        print("  (nuk mund të kontrolloj credits)")
    
    print(f"\nDuke gjeneruar foto...\n")
    
    success = 0
    failed = 0
    baumarket_found = 0
    
    fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
    
    for i, row in enumerate(rows):
        # Kalon nëse ka foto
        if row.get('image_url','').strip():
            continue
        
        # Stop pas 10 fotove per test
        if success + failed >= 10:
            break
        
        name = row['name']
        category = row.get('category','')
        brand = row.get('brand','')
        
        print(f"[{success+failed+1}/{len(without_photo)}] {name[:45]}...", end=" ", flush=True)
        
        # Hapi 1: Kërko foton origjinale nga Baumarket
        baumarket_img = search_baumarket_image(name)
        
        # Nderto prompt
        prompt = build_prompt(name, category, brand)
        
        image_bytes = None
        
        if baumarket_img:
            baumarket_found += 1
            print(f"[BM✓]", end=" ", flush=True)
            # Hapi 2: Image-to-image me Stability AI
            image_bytes = image_to_image_stability(baumarket_img, prompt)
        
        if not image_bytes:
            # Fallback: Text-to-image
            print(f"[T2I]", end=" ", flush=True)
            image_bytes = text_to_image_stability(prompt)
        
        if image_bytes:
            # Hapi 3: Ngarko ne Cloudinary
            cloudinary_url = upload_to_cloudinary(image_bytes, name)
            if cloudinary_url:
                row['image_url'] = cloudinary_url
                success += 1
                print(f"✅")
            else:
                failed += 1
                print(f"❌ cloudinary")
        else:
            failed += 1
            print(f"❌ stability")
        
        # Ruaj CSV pas çdo fotoje
        if success % 1 == 0:
            with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
        
        # Rate limiting
        time.sleep(1.5)
        
        # Shfaq statistika cdo 50
        if (success + failed) % 50 == 0 and (success + failed) > 0:
            print(f"\n  📊 Progress: {success} ✅ / {failed} ❌ / {baumarket_found} nga Baumarket\n")
    
    # Ruaj CSV final
    with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n{'='*60}")
    print(f"✅ Foto të gjeneruara: {success}")
    print(f"❌ Dështuan: {failed}")
    print(f"📸 Nga Baumarket (i2i): {baumarket_found}")
    print(f"🎨 Text-to-image: {success - baumarket_found}")
    print(f"\nCSV u ruajt: nearbuy_products_final.csv")


if __name__ == "__main__":
    main()
