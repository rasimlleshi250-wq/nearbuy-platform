"""
NearBuy.al — Scraper Baumarket + Foto DuckDuckGo + Cloudinary
=============================================================
Perdorim:
  py scraper_final.py
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import pandas as pd
import time
import re
import json

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

CATEGORIES = {
    "Elektrik": [
        "https://baumarket.al/product-category/ndrricimi-dhe-elektrike/",
        "https://baumarket.al/product-category/pajisje-pune-elektrike-dhe-me-bateri/",
        "https://baumarket.al/product-category/aksesore-per-makineri-elektrike-dhe-me-bateri/",
    ],
    "Hidraulike": [
        "https://baumarket.al/product-category/tualeti-dhe-hidraulika/",
        "https://baumarket.al/product-category/pompa-uji-motopompa-dhe-gjeneratore/",
    ],
    "Ndertim": [
        "https://baumarket.al/product-category/makineri-ndertimi-saldimi-dhe-aksesore/",
        "https://baumarket.al/product-category/vegla-dore-dhe-aksesore-ndertimi/",
        "https://baumarket.al/product-category/sisteme-fiksimi-bulloneri-litare-dhe-zinxhira/",
        "https://baumarket.al/product-category/shkalle-dhe-skela/",
        "https://baumarket.al/product-category/kompresora-ajri-pistoleta-dhe-aksesore/",
        "https://baumarket.al/product-category/shtepia-dhe-outdoor/",
    ],
    "Bojera": [
        "https://baumarket.al/product-category/spraj-silikona-mbushesa-dhe-lubrifikant/",
        "https://baumarket.al/product-category/kopshtaria-gjelberimi-dhe-bujqesia/",
    ],
}

KNOWN_BRANDS = [
    "Grohe","Hansgrohe","Legrand","Schneider","Knauf","Caparol","Vitex",
    "Wavin","Osram","Philips","Gewiss","ABB","Siemens","Rehau","Geberit",
    "Roca","Mapei","Sika","Weber","Baumit","Ceresit","Duravit","Bosch",
    "Makita","DeWalt","Stanley","Hilti","Wurth","Milwaukee","Karcher",
    "Husqvarna","Stihl","Honda","Pattex","Henkel","3M","Knauf","Isover",
]


def get_page(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
        print(f"  Status {r.status_code}")
    except Exception as e:
        print(f"  Error: {e}")
    return None


def extract_brand(name):
    for b in KNOWN_BRANDS:
        if b.lower() in name.lower():
            return b
    return ""


def search_image_duckduckgo(query):
    """Kërko foto nga DuckDuckGo Images - pa API key."""
    try:
        # Merr token nga DuckDuckGo
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://duckduckgo.com/",
        }
        
        # Hapi 1: Merr vqd token
        r = requests.get(
            "https://duckduckgo.com/",
            params={"q": query},
            headers=headers,
            timeout=10
        )
        vqd = re.search(r'vqd=([\d-]+)', r.text)
        if not vqd:
            return ""
        
        # Hapi 2: Kërko foto
        time.sleep(0.5)
        r2 = requests.get(
            "https://duckduckgo.com/i.js",
            params={
                "l": "us-en",
                "o": "json",
                "q": query,
                "vqd": vqd.group(1),
                "f": ",,,,,",
                "p": "1",
            },
            headers=headers,
            timeout=10
        )
        
        data = r2.json()
        results = data.get("results", [])
        
        # Merr foton e pare me cilesI te mire
        for result in results[:5]:
            img_url = result.get("image", "")
            width = result.get("width", 0)
            height = result.get("height", 0)
            # Prefero foto katrore ose pothuajse katrore me rezolucion te mire
            if img_url and width >= 300 and height >= 300:
                return img_url
        
        # Nese nuk gjetëm, merr të parën
        if results:
            return results[0].get("image", "")
            
    except Exception as e:
        pass
    return ""


def build_search_query(name, brand, category):
    """Nderto query te mire per kërkim fotosh."""
    # Nese ka marke te njohur, kerko me marken
    if brand:
        return f"{brand} {name} product official"
    # Nese nuk ka marke, kerko me emrin e produktit
    clean_name = re.sub(r'\d+mm|\d+cm|\d+m|\d+w|\d+v', '', name, flags=re.I).strip()
    return f"{clean_name} {category} product white background"


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
        print(f" Cloudinary error: {e}")
        return ""


def scrape_page(url, category_name):
    products = []
    soup = get_page(url)
    if not soup:
        return products, None

    cards = (
        soup.select("li.product") or
        soup.select(".products li") or
        soup.select("article.product")
    )

    print(f"  Gjetur {len(cards)} produkte")

    for card in cards:
        try:
            name_el = (
                card.select_one(".woocommerce-loop-product__title") or
                card.select_one("h2") or
                card.select_one("h3")
            )
            name = name_el.get_text(strip=True) if name_el else ""
            if not name or len(name) < 3:
                continue

            products.append({
                "name": name,
                "category": category_name,
                "subcategory": "",
                "brand": extract_brand(name),
                "description": "",
                "image_url": "",
                "tags": category_name.lower(),
                "status": "active",
            })

        except Exception:
            continue

    # Faqja tjeter
    next_url = None
    next_btn = soup.select_one("a.next.page-numbers, .next a")
    if next_btn:
        next_url = next_btn.get("href")

    return products, next_url


def main():
    print("=" * 60)
    print("NearBuy.al — Scraper + DuckDuckGo Foto + Cloudinary")
    print("=" * 60)

    # ── Hapi 1: Scrape produktet ────────────────────────────────────
    all_products = []
    for category, urls in CATEGORIES.items():
        print(f"\n Kategoria: {category}")
        print("-" * 40)
        for start_url in urls:
            print(f"\n  URL: {start_url}")
            current_url = start_url
            page = 1
            while current_url and page <= 999:
                print(f"  Faqja {page}...")
                products, next_url = scrape_page(current_url, category)
                all_products.extend(products)
                current_url = next_url
                page += 1
                time.sleep(1)
        print(f"  Total deri tani: {len(all_products)}")

    # Hiq duplikatat
    seen = set()
    unique = []
    for p in all_products:
        key = p["name"].lower().strip()
        if key not in seen and len(key) > 2:
            seen.add(key)
            unique.append(p)

    print(f"\n Total unik: {len(unique)} produkte")

    # ── Ruaj CSV menjehere ──────────────────────────────────────────
    import csv
    fieldnames = ["name","category","subcategory","brand","description","image_url","tags","status"]
    with open("nearbuy_products.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for p in unique:
            writer.writerow({
                "name": p["name"],
                "category": p["category"],
                "subcategory": p.get("subcategory",""),
                "brand": p.get("brand",""),
                "description": p.get("description",""),
                "image_url": "",
                "tags": p.get("tags",""),
                "status": "active",
            })
    print(f" CSV u ruajt: nearbuy_products.csv ({len(unique)} produkte)")
    print(f" Mund ta ndalosh tani me Ctrl+C ose vazhdo per foto.\n")

    # ── Hapi 2: Kerko foto + ngarko Cloudinary ──────────────────────
    success = 0
    
    for i, p in enumerate(unique):
        print(f"  [{i+1}/{len(unique)}] {p['name'][:45]}...", end=" ", flush=True)
        
        # Kërko foto nga DuckDuckGo
        query = build_search_query(p["name"], p["brand"], p["category"])
        img_url = search_image_duckduckgo(query)
        
        if img_url:
            # Ngarko ne Cloudinary
            cloudinary_url = upload_to_cloudinary(img_url, p["name"])
            if cloudinary_url:
                p["image_url"] = cloudinary_url
                success += 1
                print("OK")
            else:
                p["image_url"] = img_url
                print("foto OK / cloudinary skip")
        else:
            print("foto nuk u gjet")
        
        time.sleep(1)  # Respekto DuckDuckGo rate limit

    print(f"\n  Foto te ngarkuara: {success}/{len(unique)}")

    # ── Hapi 3: Gjenero CSV ─────────────────────────────────────────
    rows = [{
        "name": p["name"],
        "category": p["category"],
        "subcategory": p["subcategory"],
        "brand": p["brand"],
        "description": p["description"],
        "image_url": p["image_url"],
        "tags": p["tags"],
        "status": "active",
    } for p in unique]

    if not rows:
        print("\n Nuk u gjet asnje produkt!")
        return

    df = pd.DataFrame(rows)
    output = "nearbuy_products.csv"
    df.to_csv(output, index=False, encoding="utf-8-sig")

    print(f"\n CSV u ruajt: {output}")
    for cat in df["category"].unique():
        print(f"  {cat}: {len(df[df['category']==cat])} produkte")

    print(f"\n Hapat e radhes:")
    print(f"  1. Hap '{output}' ne Excel")
    print(f"  2. Kontrollo fotot dhe emrat")
    print(f"  3. Importo te /admin/products/import")


if __name__ == "__main__":
    main()
