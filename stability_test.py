"""
NearBuy.al — Test Stability AI Image Generation
=================================================
Teston gjenerimin e fotove per 5 produkte.

Perdorim:
  py stability_test.py
"""

import requests
import cloudinary
import cloudinary.uploader
import csv
import re
import time
import base64
from io import BytesIO

STABILITY_API_KEY = "sk-Q1d2QNUMgLbT7S2f3V26Tt7yM5KVqQnsOoOA5KxpJtqaL99P"

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS_BAUMARKET = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

def get_baumarket_image(product_name):
    """Kërko foton e produktit nga Baumarket."""
    try:
        from bs4 import BeautifulSoup
        query = product_name.split()[0:3]
        search_url = f"https://baumarket.al/?s={'+'.join(query)}"
        r = requests.get(search_url, headers=HEADERS_BAUMARKET, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Gjej foton e parë të produktit
        img = soup.select_one('.product img, .woocommerce-loop-product img')
        if img:
            src = img.get('data-src') or img.get('src', '')
            if src and src.startswith('http') and 'placeholder' not in src:
                return src
    except Exception as e:
        print(f"  Baumarket error: {e}")
    return None


def generate_with_stability(image_url, prompt):
    """Gjenero foto të re me Stability AI (image-to-image)."""
    try:
        # Shkarko foton origjinale
        img_response = requests.get(image_url, timeout=15)
        if img_response.status_code != 200:
            return None
        
        # Stability AI image-to-image endpoint
        response = requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/sd3",
            headers={
                "authorization": f"Bearer {STABILITY_API_KEY}",
                "accept": "image/*"
            },
            files={
                "none": ""
            },
            data={
                "prompt": prompt,
                "output_format": "jpeg",
                "model": "sd3-large-turbo",
            },
        )
        
        if response.status_code == 200:
            return response.content
        else:
            print(f"  Stability error {response.status_code}: {response.text[:100]}")
            return None
            
    except Exception as e:
        print(f"  Error: {e}")
        return None


def generate_text_to_image(prompt):
    """Gjenero foto nga teksti (text-to-image)."""
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
            print(f"  Stability error {response.status_code}: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"  Error: {e}")
        return None


def build_prompt(name, category, brand=""):
    """Nderto prompt profesional per produktin."""
    
    # Perkthime te termave shqip per prompt me te mire
    translations = {
        "ndricues": "LED light fixture", "llambë": "LED bulb", "prozhektor": "LED floodlight",
        "rubinet": "faucet tap", "manikote": "pipe coupling fitting", "tub pvc": "PVC pipe",
        "pompa uji": "water pump", "vana": "ball valve", "sifon": "drain siphon",
        "çekan": "hammer tool", "trapan": "power drill", "kacavidë": "screwdriver",
        "shkallë": "aluminum ladder", "kompresor": "air compressor",
        "disk prerje": "cutting disc wheel", "saldatrice": "welding machine",
        "spraj": "spray can", "silikon": "silicone sealant", "ngjites": "adhesive glue",
        "boje": "paint", "llak": "lacquer varnish", "primer": "primer paint",
        "motokosë": "lawn mower", "sharre": "chainsaw saw", "zorrë uji": "garden hose",
        "baladeze": "power extension cord strip", "kabllo": "electrical cable wire",
        "siguresë": "circuit breaker", "prizë": "electrical socket outlet",
    }
    
    name_lower = name.lower()
    eng_term = ""
    
    for alb, eng in translations.items():
        if alb in name_lower:
            eng_term = eng
            break
    
    if not eng_term:
        # Perdor emrin direkt
        eng_term = ' '.join(name.split()[:3])
    
    if brand and brand not in ['3M', 'IMI']:
        prompt = f"Professional product photo of {brand} {eng_term}, white background, studio lighting, high quality, commercial photography, no text"
    else:
        prompt = f"Professional product photo of {eng_term}, white background, studio lighting, high quality, commercial photography, isolated product, no text"
    
    return prompt


def upload_to_cloudinary(image_bytes, name):
    """Ngarko bytes te Cloudinary me watermark nearbuy.al."""
    try:
        pid = re.sub(r'[^a-z0-9]', '_', name.lower())[:50]
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="nearbuy/products",
            public_id=pid,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "fill"},
                {"quality": "auto:good"},
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 18,
                        "font_weight": "bold",
                        "text": "nearbuy.al"
                    },
                    "color": "#ffffff",
                    "opacity": 40,
                    "gravity": "south_east",
                    "x": 10,
                    "y": 10,
                }
            ]
        )
        return result.get("secure_url", "")
    except Exception as e:
        print(f"  Cloudinary error: {e}")
        return ""


def main():
    print("="*60)
    print("NearBuy.al — Test Stability AI (5 produkte)")
    print("="*60)
    
    # Lexo CSV
    try:
        with open("nearbuy_products_final.csv", "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        print(f"Total produkte: {len(rows)}")
    except FileNotFoundError:
        print("ERROR: nearbuy_products_final.csv nuk u gjet!")
        return
    
    # Zgjidh 5 produkte te ndryshme per test
    test_products = []
    categories_tested = set()
    for r in rows:
        cat = r.get('category','')
        if cat not in categories_tested and not r.get('image_url','').strip():
            test_products.append(r)
            categories_tested.add(cat)
        if len(test_products) >= 5:
            break
    
    print(f"\nDuke testuar {len(test_products)} produkte...\n")
    
    for i, row in enumerate(test_products):
        name = row['name']
        category = row.get('category','')
        brand = row.get('brand','')
        
        print(f"[{i+1}/5] {name[:50]}")
        print(f"  Kategoria: {category}")
        
        # Nderto prompt
        prompt = build_prompt(name, category, brand)
        print(f"  Prompt: {prompt[:80]}...")
        
        # Gjenero me Stability AI (text-to-image)
        print(f"  Duke gjeneruar foto...", end=" ", flush=True)
        image_bytes = generate_text_to_image(prompt)
        
        if image_bytes:
            # Ngarko ne Cloudinary
            cloudinary_url = upload_to_cloudinary(image_bytes, name)
            if cloudinary_url:
                row['image_url'] = cloudinary_url
                print(f"✅ {cloudinary_url[:60]}...")
            else:
                print("❌ Cloudinary failed")
        else:
            print("❌ Stability AI failed")
        
        time.sleep(2)
    
    # Ruaj CSV me fotot e reja
    fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
    with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n{'='*60}")
    print(f"Test u krye! Kontrollo fotot te Cloudinary dashboard.")
    print(f"Nese fotot jane te mira, shtoni credits dhe ekzekutoni:")
    print(f"  py stability_full.py")


if __name__ == "__main__":
    main()
