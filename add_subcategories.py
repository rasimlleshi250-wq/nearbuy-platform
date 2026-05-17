"""
NearBuy.al — Shto Nënkategori Automatikisht
============================================
Lexon nearbuy_products.csv dhe shton subcategory
bazuar ne fjalet kyçe ne emrin e produktit.

Perdorim:
  py add_subcategories.py
"""

import csv
import re

# ── Rregullat e nënkategorive ───────────────────────────────────────
# Formati: "Kategoria": [("Nënkategoria", ["fjale", "kyçe"]), ...]
# Rendi ka rëndësi — kontrollohet nga lart poshtë

SUBCATEGORY_RULES = {
    "Hidraulike": [
        ("Rubineta Kuzhine", ["rubinet kuzhin", "rubinet kuzhine", "rubineti kuzhin"]),
        ("Rubineta Banjo", ["rubinet banjo", "rubineti banjo", "rubinet lavaman", "rubinet lavoar"]),
        ("Tuba PVC", ["tub pvc", "tuba pvc", "pipe pvc", "tubi pvc"]),
        ("Tuba Bakri", ["tub bakri", "tuba bakri", "copper pipe"]),
        ("Fitingje & Lidhëse", ["fitingje", "fiting", "lidhese", "lidhëse", "manikote", "rakoder", "nipel", "reduksion", "brryl", "kaps", "kupe", "muf", "niple"]),
        ("Pompa Uji", ["pompa uji", "pompë uji", "water pump", "motopompa", "motopompë"]),
        ("Kazanë Uji", ["kazan uji", "kazanë uji", "boiler", "termosifon"]),
        ("Vana & Çifte", ["vana", "vanë", "çifte", "çiftë", "valve", "ball valve", "sfera"]),
        ("Lavamane & Lavatriçe", ["lavaman", "lavatrice", "lavaman", "lavabo", "washbasin"]),
        ("Kabinete Banjo", ["kabinet banjo", "kabineti banjo", "furniture banjo"]),
        ("Kanalizime & Sifone", ["kanalizim", "sifon", "sifonë", "drain", "gropa", "gyp"]),
        ("Aksesorë Hidraulikë", ["aksesore hidraulik", "tape fundore", "tape", "teflon", "izolues"]),
    ],
    "Elektrik": [
        ("Kabllo NYM", ["kabllo nym", "kabel nym", "NYM", "kabllo e bardhe"]),
        ("Kabllo CYY", ["kabllo cyy", "kabel cyy", "CYY", "kabllo e zeze"]),
        ("Çelësa & Prize", ["celesë", "çelës", "prize", "priza", "switch", "socket", "pllake", "pllakë"]),
        ("Ndriçim LED", ["led", "ndricim", "ndriçim", "llambë", "llamba", "bulb", "spotlight", "drite", "dritë"]),
        ("Spot & Lustër", ["spot", "lustre", "lustër", "lustëra", "kandelabër", "chandelier", "aplique", "prozhektor"]),
        ("Panele Elektrike", ["panel elektrik", "panele elektrik", "tabllo", "tablo", "distribution"]),
        ("Siguresa Automatike", ["sigures", "sigurese", "siguresa", "automat", "mcb", "rcb", "rcd", "disjunktor"]),
        ("Kamera Sigurie", ["kamera", "camera", "cctv", "surveillance"]),
        ("Sistem Alarmi", ["alarm", "alarmi", "sensor", "detektor"]),
        ("Termostata", ["termostat", "thermostat"]),
        ("Tub Korrugat", ["tub korrugat", "tuba korrugat", "corrugated", "korrugat", "pipe corrugated"]),
        ("Dozat & Kutitë", ["doza", "dozë", "kuti elektrike", "junction box", "kanal kabel"]),
        ("Aksesorë Elektrik", ["aksesore elektrik", "shirit led", "shirit", "lidhese kabllo", "klemë", "kleme", "terminale", "skaje"]),
    ],
    "Ndertim": [
        ("Çimento & Llaç", ["çimento", "cimento", "llaç", "llac", "cement", "mikse", "guri çimentoje"]),
        ("Tulla e Kuqe", ["tulla", "tullë", "brick", "tulla e kuqe"]),
        ("Blloqe Siporex", ["siporex", "blloqe", "bllok", "ytong", "celcon"]),
        ("Hekur Betoni", ["hekur betoni", "hekur", "armatyre", "armaturë", "rrjetë hekuri", "shufër"]),
        ("Rrjetë Metalike", ["rrjete metalike", "rrjetë", "mesh", "rrjeta"]),
        ("Izolim Termik", ["izolim termik", "polystirol", "polistirol", "xps", "eps", "rockwool", "lana guri"]),
        ("Izolim Akustik", ["izolim akustik", "akustik", "acoustic"]),
        ("Pllaka Dysheme", ["pllaka dysheme", "pllake dysheme", "floor tile", "gres"]),
        ("Pllaka Muri", ["pllaka muri", "pllake muri", "wall tile", "karolle"]),
        ("Dyer & Dritare", ["dere", "derë", "dyer", "dritare", "door", "window", "portë"]),
        ("Çati & Tjegulla", ["çati", "tjegull", "tjegulla", "roof", "shingel", "bitum"]),
        ("Impermeabilizim", ["impermeabilizim", "hidroizolim", "waterproof", "membranë", "bitum"]),
        ("Zhavorr & Rërë", ["zhavorr", "rërë", "rere", "gravel", "sand", "agregat"]),
        ("Aksesorë Ndërtimi", ["vida", "bullon", "gozhdë", "gozhde", "skrupë", "skrupe", "anker", "dowel", "kapese", "kapëse", "profil", "vegla", "çekan", "levë", "leve", "shpatull", "spatule", "masë", "shkallë", "shkalle", "skele"]),
    ],
    "Bojera": [
        ("Bojë Fasade", ["boje fasade", "bojë fasade", "fasade", "exterior paint", "boja fasade"]),
        ("Bojë Brendshme", ["boje brendshme", "bojë brendshme", "interior paint", "boja brendshme", "boje muri", "bojë muri"]),
        ("Bojë Tavani", ["boje tavani", "bojë tavani", "ceiling paint", "boja tavani"]),
        ("Llak Parket", ["llak parket", "llak parketi", "floor lacquer", "parket llak"]),
        ("Bojë Druri", ["boje druri", "bojë druri", "wood paint", "boja druri", "lazure"]),
        ("Bojë Metalike", ["boje metalike", "bojë metalike", "metal paint", "antikorrozion", "zinko"]),
        ("Primer & Baza", ["primer", "baze", "bazë", "ground coat", "pregatitje", "prep coat", "grunduer"]),
        ("Stuko Dekorative", ["stuko", "dekorativ", "dekorative", "venetian", "struktural", "tekstur"]),
        ("Impregnim", ["impregnim", "impregnues", "impregnant", "mbrojtës druri"]),
        ("Ngjyrues & Tonalizim", ["ngjyrues", "tonalizim", "pigment", "colorant", "tint"]),
        ("Aksesorë Bojimi", ["rulo", "furçë", "furce", "penzel", "maskues", "shirit maskues", "plastike mbrojtese", "kove", "kovë", "mikser"]),
    ],
}


def find_subcategory(name, category):
    """Gjej nënkategorinë bazuar në emrin e produktit."""
    name_lower = name.lower()
    
    rules = SUBCATEGORY_RULES.get(category, [])
    for subcat, keywords in rules:
        for kw in keywords:
            if kw.lower() in name_lower:
                return subcat
    
    return ""


def main():
    print("=" * 60)
    print("NearBuy.al — Shto Nënkategori")
    print("=" * 60)
    
    # Lexo CSV
    try:
        with open("nearbuy_products.csv", "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        print(f"U lexuan {len(rows)} produkte")
    except FileNotFoundError:
        print("ERROR: nearbuy_products.csv nuk u gjet!")
        return
    
    # Shto nënkategorinë
    matched = 0
    unmatched = 0
    
    for row in rows:
        name = row.get("name", "")
        category = row.get("category", "")
        subcat = find_subcategory(name, category)
        row["subcategory"] = subcat
        if subcat:
            matched += 1
        else:
            unmatched += 1
    
    # Ruaj CSV
    fieldnames = ["name", "category", "subcategory", "brand", "description", "image_url", "tags", "status"]
    with open("nearbuy_products.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n Rezultatet:")
    print(f"  Me nënkategori: {matched}")
    print(f"  Pa nënkategori: {unmatched}")
    print(f"  Total: {len(rows)}")
    
    # Statistika per kategori
    print(f"\n Nënkategoritë e shtuara:")
    stats = {}
    for row in rows:
        cat = row.get("category","")
        sub = row.get("subcategory","")
        if sub:
            key = f"{cat} → {sub}"
            stats[key] = stats.get(key, 0) + 1
    
    for key, count in sorted(stats.items()):
        print(f"  {key}: {count}")
    
    print(f"\n CSV u perditesua: nearbuy_products.csv")
    print(f" Importo tani te /admin/products/import")


if __name__ == "__main__":
    main()
