"""
NearBuy.al — Remove Background + Watermark
============================================
Per cdo produkt:
1. Kerkon foton origjinale nga Baumarket
2. Ngarkon ne Cloudinary
3. Cloudinary AI heq backgroundin automatikisht
4. Vendos background te bardhe + watermark nearbuy.al

Perdorim:
  py remove_bg.py
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import cloudinary.utils
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

TEST_LIMIT = 0  # 0 = te gjitha produktet

from difflib import SequenceMatcher

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def search_baumarket_image(product_name):
    """Kerko foton specifike te produktit nga Baumarket."""
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

        for card in soup.select('li.product'):
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


def upload_with_bg_removal(image_url, product_name, idx=0):
    """
    Ngarko foton ne Cloudinary:
    1. Hiq background me AI
    2. Vendos background te bardhe
    3. Shto watermark nearbuy.al
    """
    try:
        pid = re.sub(r'[^a-z0-9]', '_', product_name.lower())[:45] + f"_{idx}"

        result = cloudinary.uploader.upload(
            image_url,
            folder="nearbuy/products",
            public_id=pid,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "pad", "background": "white", "gravity": "center"},
                {"quality": "auto:good"},
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 18,
                        "font_weight": "bold",
                        "text": "nearbuy"
                    },
                    "color": "#222222",
                    "opacity": 55,
                    "gravity": "south_east",
                    "x": 68,
                    "y": 12,
                },
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 18,
                        "font_weight": "bold",
                        "text": ".al"
                    },
                    "color": "#f5c842",
                    "opacity": 90,
                    "gravity": "south_east",
                    "x": 12,
                    "y": 12,
                }
            ]
        )
        return result.get("secure_url", "")
    except Exception as e:
        print(f"\n  [Cloudinary error]: {e}")
        return ""


def upload_simple(image_url, product_name, idx=0):
    """Upload i thjeshte pa background removal (fallback)."""
    try:
        pid = re.sub(r'[^a-z0-9]', '_', product_name.lower())[:45] + f"_{idx}"
        result = cloudinary.uploader.upload(
            image_url,
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
                        "font_size": 18,
                        "font_weight": "bold",
                        "text": "nearbuy"
                    },
                    "color": "#222222",
                    "opacity": 55,
                    "gravity": "south_east",
                    "x": 68,
                    "y": 12,
                },
                {
                    "overlay": {
                        "font_family": "Arial",
                        "font_size": 18,
                        "font_weight": "bold",
                        "text": ".al"
                    },
                    "color": "#f5c842",
                    "opacity": 90,
                    "gravity": "south_east",
                    "x": 12,
                    "y": 12,
                }
            ]
        )
        return result.get("secure_url", "")
    except Exception as e:
        print(f"\n  [Cloudinary simple error]: {e}")
        return ""


def main():
    print("=" * 60)
    print("NearBuy.al — Remove BG + Watermark")
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

    work_rows = rows[:TEST_LIMIT] if TEST_LIMIT > 0 else rows

    success = 0
    failed = 0
    bm_found = 0

    fieldnames = ["name", "category", "subcategory", "brand", "description", "image_url", "tags", "status"]

    for i, row in enumerate(work_rows):
        name = row['name']

        print(f"[{i+1}/{len(work_rows)}] {name[:45]}...", end=" ", flush=True)

        # Kërko foton nga Baumarket
        img_url, score = search_baumarket_image(name)

        if img_url and score >= 0.35:
            bm_found += 1
            print(f"[BM {int(score*100)}%]", end=" ", flush=True)

            # Provo me background removal
            cloudinary_url = upload_with_bg_removal(img_url, name, i)

            # Nese deshtoi, provo simple upload
            if not cloudinary_url:
                cloudinary_url = upload_simple(img_url, name, i)

            if cloudinary_url:
                row['image_url'] = cloudinary_url
                success += 1
                print(f"✅")
            else:
                failed += 1
                print(f"❌")
        else:
            failed += 1
            if img_url:
                print(f"[BM {int(score*100)}% shumë i ulët] ❌")
            else:
                print(f"[nuk u gjet] ❌")

        # Ruaj CSV pas cdo fotoje
        with open("nearbuy_products_final.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        time.sleep(0.5)

    print(f"\n{'=' * 60}")
    print(f"✅ Sukses: {success}")
    print(f"❌ Deshtuan: {failed}")
    print(f"📸 Nga Baumarket: {bm_found}")
    print(f"\nCSV u ruajt!")
    if TEST_LIMIT > 0:
        print(f"\nNëse fotot janë mirë → ndrysho TEST_LIMIT = 0 dhe ekzekuto përsëri.")


if __name__ == "__main__":
    main()
