"""Bouwt ilan/<id>.html (statisch, met JobPosting JSON-LD) en sitemap.xml uit de open klussen.
Bron: Supabase (publieke anon key uit config.js) of, voor test, een JSON-bestand: python build_sitemap.py --local lijst.json
Klussen zonder geldig KvK-nummer worden overgeslagen."""
import html, json, re, sys, urllib.request
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = "https://zzp.atasgroup.nl"


def kvk_ok(v):
    return bool(re.fullmatch(r"[0-9]{8}", str(v or ""))) and set(str(v)) != {"0"}


def bron():
    if "--local" in sys.argv:
        return json.loads(Path(sys.argv[sys.argv.index("--local") + 1]).read_text(encoding="utf-8"))
    cfg = (HERE / "config.js").read_text(encoding="utf-8")
    url = re.search(r"supabaseUrl:\s*'([^']*)'", cfg).group(1).rstrip("/")
    key = re.search(r"supabaseKey:\s*'([^']*)'", cfg).group(1)
    if not url or not key:
        print("Supabase niet ingevuld in config.js: alleen sitemap met de basispagina's.")
        return []
    q = f"{url}/rest/v1/listings?status=eq.open&valid_through=gte.{date.today()}&select=*,profiles(bedrijf,kvk,kvk_geverifieerd)&order=created_at.desc&limit=1000"
    req = urllib.request.Request(q, headers={"apikey": key, "Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def eenheid(l):
    return "uur" if l.get("eenheid") == "uur" else "m²"


def samenvatting(l):
    d = [f"{l.get('categorie', '')} · {l.get('subklus', '')}", f"{l.get('oppervlak')} {eenheid(l)}", f"Materiaal {l.get('materiaal', 'exclusief')}"]
    if l.get("spoed"):
        d.append("Spoedklus binnen 48 uur")
    if l.get("budget_min"):
        d.append(f"Richtbegroting € {int(l['budget_min'])} tot € {int(l['budget_max'])} excl. btw")
    return " | ".join(d)


def paras(t):
    return [p for p in str(t).split("\n") if p.strip()]


def jobposting(l):
    p = l.get("profiles") or {}
    addr = {"@type": "PostalAddress", "addressLocality": l["plaats"], "addressCountry": "NL"}
    if l.get("postcode"):
        addr["postalCode"] = l["postcode"]
    if l.get("provincie"):
        addr["addressRegion"] = l["provincie"]
    return {"@context": "https://schema.org", "@type": "JobPosting", "title": l["titel"],
            "description": f"<p>{html.escape(samenvatting(l))}</p>" + "".join(f"<p>{html.escape(x)}</p>" for x in paras(l["omschrijving"])),
            "datePosted": l["created_at"][:10], "validThrough": l["valid_through"], "employmentType": "CONTRACTOR",
            "hiringOrganization": {"@type": "Organization", "name": p.get("bedrijf"), "identifier": {"@type": "PropertyValue", "name": "KvK-nummer", "value": l["kvk"]}},
            "jobLocation": {"@type": "Place", "address": addr}, "directApply": True, "url": f"{SITE}/ilan/{l['id']}.html"}


PAGE = """<!doctype html>
<html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{titel} in {plaats} | ATAS ZZP</title>
<meta name="description" content="{beschr}">
<link rel="canonical" href="{url}"><link rel="icon" type="image/svg+xml" href="../favicon.svg"><meta name="robots" content="index, follow"><meta name="theme-color" content="#ffffff">
<meta property="og:type" content="article"><meta property="og:locale" content="nl_NL"><meta property="og:title" content="{titel} in {plaats}"><meta property="og:url" content="{url}">
<link rel="stylesheet" href="../style.css?v=5"><link rel="stylesheet" href="../zzp.css?v=5">
<script type="application/ld+json">{ld}</script></head>
<body><div class="glow" aria-hidden="true"><i></i><i></i><i></i></div>
<header class="site"><div class="wrap hz"><a class="logo" href="../index.html"><img src="../logo-zzp.svg?v=5" alt="ATAS ZZP" width="190" height="34"></a><nav class="hnav"><a class="btn pill" href="../plaatsen.html">Klus plaatsen</a></nav></div></header>
<main><div class="wrap narrow" style="padding-top:calc(var(--hh) + 14px);padding-bottom:70px"><a class="back" href="../index.html#resultaten">&larr; Alle klussen</a>
<div class="article"><div class="jt"><h1>{titel}</h1>{badge}</div>
<dl><dt>Opdrachtgever</dt><dd>{bedrijf}</dd><dt>KvK-nummer</dt><dd>{kvk}</dd><dt>Categorie</dt><dd>{categorie}</dd><dt>Soort klus</dt><dd>{subklus}</dd><dt>Omvang</dt><dd>{omvang}</dd><dt>Locatie</dt><dd>{plaats} {postcode}</dd><dt>Sluit op</dt><dd>{tot}</dd></dl>
<div class="desc">{desc}</div>
<p style="margin-top:18px"><a class="btn pill" href="../ilan.html?id={id}">Reageer op deze klus</a></p></div></div></main>
<footer class="site"><div class="wrap"><p>ATAS ZZP · Onderdeel van <a href="https://atasgroup.nl">Atas Group</a> · Emmen, Nederland</p></div></footer></body></html>
"""

if __name__ == "__main__":
    lijst = [l for l in bron() if kvk_ok(l.get("kvk"))]
    out = HERE / "ilan"
    out.mkdir(exist_ok=True)
    for f in out.glob("*.html"):
        f.unlink()
    for l in lijst:
        if not re.fullmatch(r"[0-9a-f-]{36}", l["id"]):
            continue
        p = l.get("profiles") or {}
        e = lambda k: html.escape(str(l.get(k) or ""))
        badge = '<span class="kvkbadge v"><span class="coin">&#10003;</span><span>KvK Geverifieerd</span></span>' if p.get("kvk_geverifieerd") else ""
        pc = re.sub(r"(\d{4})(\w{2})", r"\1 \2", str(l.get("postcode") or ""))
        (out / f"{l['id']}.html").write_text(PAGE.format(
            titel=e("titel"), plaats=e("plaats"), kvk=e("kvk"), tot=e("valid_through"), id=l["id"], categorie=e("categorie"), subklus=e("subklus"),
            omvang=html.escape(f"{l.get('oppervlak')} {eenheid(l)}"), postcode=html.escape(pc), bedrijf=html.escape(str(p.get("bedrijf", ""))), badge=badge, url=f"{SITE}/ilan/{l['id']}.html",
            beschr=html.escape(samenvatting(l)[:150]), desc="".join(f"<p>{html.escape(x)}</p>" for x in paras(l["omschrijving"])),
            ld=json.dumps(jobposting(l), ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")
    urls = [(f"{SITE}/", date.today().isoformat(), "1.0"), (f"{SITE}/plaatsen.html", date.today().isoformat(), "0.9"), (f"{SITE}/werkwijze.html", date.today().isoformat(), "0.7"), (f"{SITE}/wet-dba-kvk.html", date.today().isoformat(), "0.7"), (f"{SITE}/voorwaarden.html", date.today().isoformat(), "0.4")] + [(f"{SITE}/ilan/{l['id']}.html", l["created_at"][:10], "0.8") for l in lijst]
    (HERE / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"  <url><loc>{u}</loc><lastmod>{m}</lastmod><priority>{p}</priority></url>\n" for u, m, p in urls) + "</urlset>\n", encoding="utf-8")
    print(f"{len(lijst)} klus(sen), sitemap bijgewerkt")
