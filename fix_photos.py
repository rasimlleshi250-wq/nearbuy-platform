"""
NearBuy.al — Shto foto produkteve nga CSV ekzistues
====================================================
Lexon nearbuy_products.csv, kerkon foto per cdo produkt,
ngarkon ne Cloudinary dhe gjeneron CSV te ri.

Perdorim:
  py fix_photos.py
"""

import requests
from bs4 import BeautifulSoup
import cloudinary
import cloudinary.uploader
import pandas as pd
import time
import re
import urllib.parse

cloudinary.config(
    cloud_name="dvqcrh4qf",
    api_key="687541231726594",
    api_secret="DQspptukM2H8cYx-655Irw6l5Fk"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def search_google_image(query):
    """Kerko foto nga Google Images."""
    try:
        encoded = urllib.parse.quote(query + " product transparent background")
        url = f"https://www.google.com/search?q={encoded}&tbm=isch&tbs=il:cl"
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Gjej URL-te e imazheve nga JSON ne HTML
        scripts = soup.find_all("script")
        for script in scripts:
            text = script.string or ""
            # Google vendos URL ne format AF_initDataCallback
            matches = re.findall(r'https://[^"\']+\.(?:jpg|jpeg|png|webp)', text)
            for m in matches:
                if "gstatic" not in m and "google" not in m and len(m) > 30:
                    return m
    except Exception as e:
        pass
    return ""


def search_bing_image(query):
    """Kerko foto nga Bing Images (pa API)."""
    try:
        encoded = urllib.parse.quote(query + " product photo")
        url = f"https://www.bing.com/images/search?q={encoded}&form=HDRSC2&first=1"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        r = requests.get(url, headers=headers, timeout=10)
        
        # Bing vendos te dhenat e imazheve si JSON ne faqe
        matches = re.findall(r'"murl":"(https://[^"]+\.(?:jpg|jpeg|png|webp))"', r.text)
        for m in matches:
            if len(m) > 20:
                return m
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


def build_query(name, brand, category):
    """Nderto query te mire."""
    # Pastro emrin nga kode teknike
    clean = re.sub(r'\b[A-Z0-9]{3,10}\b', '', name).strip()
    clean = re.sub(r'\s+', ' ', clean).strip()
    
    if brand and len(brand) > 2:
        return f"{brand} {clean}"
    return f"{clean} {category}"


def main():
    print("=" * 60)
    print("NearBuy.al — Shto foto produkteve")
    print("=" * 60)
    
    # Lexo CSV ekzistues
    try:
        df = pd.read_csv("nearbuy_products.csv", encoding="utf-8-sig")
        print(f"U lexuan {len(df)} produkte nga CSV")
    except FileNotFoundError:
        print("ERROR: nearbuy_products.csv nuk u gjet!")
        print("Sigurohu qe je ne dosjen e duhur.")
        return
    
    # Shto kolonen image_url nese nuk ekziston
    if "image_url" not in df.columns:
        df["image_url"] = ""
    
    success = 0
    skip = 0
    
    for i, row in df.iterrows():
        name = str(row.get("name", ""))
        brand = str(row.get("brand", ""))
        category = str(row.get("category", ""))
        current_url = str(row.get("image_url", ""))
        
        # Kalon nese ka foto
        if current_url and current_url.startswith("http") and "cloudinary" in current_url:
            skip += 1
            continue
        
        print(f"  [{i+1}/{len(df)}] {name[:45]}...", end=" ", flush=True)
        
        query = build_query(name, brand, category)
        
        # Provo Bing fillimisht
        img_url = search_bing_image(query)
        
        # Nese Bing deshtoi, provo Google
        if not img_url:
            time.sleep(0.5)
            img_url = search_google_image(query)
        
        if img_url:
            # Ngarko ne Cloudinary
            cloudinary_url = upload_to_cloudinary(img_url, name)
            if cloudinary_url:
                df.at[i, "image_url"] = cloudinary_url
                success += 1
                print("OK")
            else:
                df.at[i, "image_url"] = img_url
                print("foto OK")
        else:
            print("nuk u gjet")
        
        # Ruaj progress cdo 50 produkte
        if (i + 1) % 50 == 0:
            df.to_csv("nearbuy_products.csv", index=False, encoding="utf-8-sig")
            print(f"\n  [Progress u ruajt: {i+1}/{len(df)}]\n")
        
        time.sleep(0.8)
    
    # Ruaj CSV final
    df.to_csv("nearbuy_products.csv", index=False, encoding="utf-8-sig")
    
    print(f"\n CSV u perditesua: nearbuy_products.csv")
    print(f"  Foto te shtuara: {success}")
    print(f"  Tashmë me foto: {skip}")
    print(f"  Total: {len(df)} produkte")
    print(f"\n Hapat e radhes:")
    print(f"  1. Hap 'nearbuy_products.csv' ne Excel dhe kontrollo")
    print(f"  2. Importo te /admin/products/import")


if __name__ == "__main__":
    main()
