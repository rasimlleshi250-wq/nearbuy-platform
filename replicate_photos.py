"""
NearBuy.al — Test Replicate API (10 produkte)
==============================================
Perdorim:
  py replicate_photos.py
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import csv
import re
import time

REPLICATE_TOKEN = "r8_LuMgfDDIPIIY20fe2ZNkbAy9HZoaP4w3xwyCt"

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

TEST_LIMIT = 10  # Ndrysho ne 0 per te gjitha produktet


from difflib import SequenceMatcher

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def search_baumarket_image(product_name, category=""):
    """Kerko foton SPECIFIKE te produktit nga Baumarket."""
    try:
        clean = re.sub(r'\d+mm|\d+cm|\d+m\b|\d+w\b|\d+kg\b|\d+x\d+|\d+k\b', '', product_name, flags=re.I)
        clean = re.sub(r'\b(me|dhe|per|nga|ne|te|i|e|set|kit|plus|kundraujit|plastike|metalike)\b', '', clean, flags=re.I)
        words = [w for w in clean.split() if len(w) > 3][:3]
        
        if not words:
            return None, 0
            
        query = '+'.join(words)
        r = requests.get(f"https://baumarket.al/?s={query}&post_type=product", headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        best_img = None
        best_score = 0
        
        cards = soup.select('li.product')
        for card in cards:
            name_el = card.select_one('.woocommerce-loop-product__title, h2, h3')
            card_name = name_el.get_text(strip=True) if name_el else ""
            
            score = similarity(product_name, card_name)
            
            if score > best_score:
                img = card.select_one('img')
                if img:
                    src = img.get('data-src') or img.get('data-lazy-src') or img.get('src', '')
                    if src and src.startswith('http') and 'placeholder' not in src and 'woocommerce-placeholder' not in src:
                        best_score = score
                        best_img = src
        
        return best_img, best_score
                        
    except:
        pass
    return None, 0


def build_prompt(name, category, brand=""):
    """Nderto prompt profesional per produktin."""
    translations = {
        "ndricues": "LED light fixture", "llambe": "LED bulb", "llambë": "LED bulb",
        "prozhektor": "LED floodlight", "shirit led": "LED strip",
        "rubinet": "faucet tap", "manikote": "pipe coupling",
        "tub pvc": "PVC pipe", "pompa": "water pump", "vana": "ball valve",
        "sifon": "drain siphon", "kazan": "water heater boiler",
        "çekan": "hammer", "trapan": "power drill", "kacavide": "screwdriver",
        "shkall": "ladder", "kompresor": "air compressor",
        "disk": "grinding disc wheel", "sharre": "power saw",
        "saldatrice": "welding machine", "spraj": "spray can",
        "silikon": "silicone sealant", "ngjites": "adhesive glue",
        "shkume": "expanding foam", "boje": "paint can",
        "llak": "wood lacquer", "primer": "primer paint",
        "rulo": "paint roller", "furce": "paint brush",
        "motokose": "lawn mower", "baladeze": "extension cord strip",
        "kabllo": "electrical cable", "sigurese": "circuit breaker",
        "prize": "electrical socket", "celës": "light switch", "celes": "light switch",
        "pince": "pliers", "vida": "screws", "bullon": "bolt set",
        "zorre uji": "garden hose", "lopate": "shovel",
        "kupe": "pipe fitting", "brryl": "pipe elbow",
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
        return f"Professional product photo of {brand} {eng_term}, pure white background, studio lighting, sharp focus, commercial photography, photorealistic, no text no watermark"
    else:
        return f"Professional product photo of {eng_term}, pure white background, studio lighting, sharp focus, commercial photography, photorealistic, no text no watermark"


def generate_with_replicate(image_url, prompt):
    """Gjenero foto me Replicate."""
    headers = {
        "Authorization": f"Token {REPLICATE_TOKEN}",
        "Content-Type": "application/json",
    }

    if image_url:
        # Image-to-image me flux-dev
        payload = {
            "version": "black-forest-labs/flux-dev",
            "input": {
                "image": image_url,
                "prompt": prompt,
                "strength": 0.75,
                "num_outputs": 1,
                "aspect_ratio": "1:1",
                "output_format": "jpg",
                "output_quality": 90,
            }
        }
    else:
        # Text-to-image me flux-schnell
        payload = {
            "version": "black-forest-labs/flux-schnell",
            "input": {
                "prompt": prompt,
                "num_outputs": 1,
                "aspect_ratio": "1:1",
                "output_format": "jpg",
                "output_quality": 90,
            }
        }

    try:
        r = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json=payload,
            timeout=60
        )

        if r.status_code == 429:
            print(f"\n  [Rate limit] Duke pritur 15 sekonda...", end=" ")
            time.sleep(15)
            r = requests.post(
                "https://api.replicate.com/v1/predictions",
                headers=headers,
                json=payload,
                timeout=60
            )

        if r.status_code not in [200, 201]:
            print(f"\n  [Replicate error {r.status_code}]: {r.text[:150]}")
            return None

        data = r.json()
        prediction_id = data.get("id")

        # Prit rezultatin
        for _ in range(30):
            time.sleep(3)
            poll = requests.get(
                f"https://api.replicate.com/v1/predictions/{prediction_id}",
                headers=headers,
                timeout=15
            )
            poll_data = poll.json()
            status = poll_data.get("status")

            if status == "succeeded":
                output = poll_data.get("output", [])
                if output:
                    img_url = output[0] if isinstance(output, list) else output
                    img_r = requests.get(img_url, timeout=15)
                    if img_r.status_code == 200:
                        return img_r.content
                return None
            elif status == "failed":
                print(f"\n  [Replicate failed]: {poll_data.get('error', '')}")
                return None

    except Exception as e:
        print(f"\n  [Error]: {e}")
        return None


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
                # "nearbuy" e zeze
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 16,
                        "font_weight": "bold",
                        "text": "nearbuy"
                    },
                    "color": "#000000",
                    "opacity": 60,
                    "gravity": "south_east",
                    "x": 58,
                    "y": 10,
                },
                # ".al" e verdhe
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 16,
                        "font_weight": "bold",
                        "text": ".al"
                    },
                    "color": "#f5c842",
                    "opacity": 90,
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
    print("=" * 60)
    print("NearBuy.al — Replicate Photo Generator")
    if TEST_LIMIT > 0:
        print(f"MODE: TEST ({TEST_LIMIT} produkte)")
    print("=" * 60)

    try:
        with open("nearbuy_products_final.csv", "r", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        print(f"Total: {len(rows)} produkte")
    except FileNotFoundError:
        print("ERROR: nearbuy_products_final.csv nuk u gjet!")
        return

    # Per test: merr 10 produkte nga kategori te ndryshme (me dhe pa foto)
    if TEST_LIMIT > 0:
        test_rows = []
        cats_seen = set()
        # Merr disa me foto ekzistuese + disa pa foto
        for r in rows:
            cat = r.get('category', '')
            if len(test_rows) < TEST_LIMIT:
                test_rows.append(r)
        work_rows = test_rows
        print(f"Duke testuar: {len(work_rows)} produkte\n")
    else:
        work_rows = rows

    success = 0
    failed = 0
    baumarket_found = 0

    fieldnames = ["name", "category", "subcategory", "brand", "description", "image_url", "tags", "status"]

    for i, row in enumerate(work_rows):
        name = row['name']
        category = row.get('category', '')
        brand = row.get('brand', '')
        existing_url = row.get('image_url', '').strip()

        print(f"[{i+1}/{len(work_rows)}] {name[:45]}...", end=" ", flush=True)

        # Kërko foton nga Baumarket
        baumarket_img, score = search_baumarket_image(name, category)
        
        # Perdor foto nga Baumarket vetem nese similarity > 50%
        SIMILARITY_THRESHOLD = 0.50
        
        if baumarket_img and score >= SIMILARITY_THRESHOLD:
            baumarket_found += 1
            print(f"[BM {int(score*100)}%]", end=" ", flush=True)
            source_url = baumarket_img
        else:
            if baumarket_img:
                print(f"[BM {int(score*100)}%→T2I]", end=" ", flush=True)
            else:
                print(f"[T2I]", end=" ", flush=True)
            source_url = None

        # Nderto prompt
        prompt = build_prompt(name, category, brand)

        # Gjenero me Replicate
        image_bytes = generate_with_replicate(source_url, prompt)

        if image_bytes:
            cloudinary_url = upload_to_cloudinary(image_bytes, name)
            if cloudinary_url:
                # Gjithmonë zëvendëso foton me të renë (edhe nëse kishte)
                row['image_url'] = cloudinary_url
                success += 1
                print(f"✅")
            else:
                failed += 1
                print(f"❌ cloudinary")
        else:
            failed += 1
            print(f"❌ replicate")

        # Ruaj CSV pas çdo fotoje
        with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        time.sleep(12)  # Rate limit: max 6 kerkesa/minute

    print(f"\n{'=' * 60}")
    print(f"✅ Gjeneruar: {success}")
    print(f"❌ Dështuan: {failed}")
    print(f"📸 Nga Baumarket (i2i): {baumarket_found}")
    print(f"🎨 Text-to-image: {success - baumarket_found}")
    print(f"\nCSV u ruajt!")
    if TEST_LIMIT > 0:
        print(f"\nNëse fotot janë mirë, ndrysho TEST_LIMIT = 0 dhe ekzekuto përsëri.")


if __name__ == "__main__":
    main()
