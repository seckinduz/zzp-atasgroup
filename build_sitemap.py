"""Bouwt ilan/<id>.html (statisch, met JobPosting JSON-LD) en sitemap.xml uit de open klussen (tabel jobs).
Bron: Supabase (publieke sleutel uit config.js) of voor test: python build_sitemap.py --local lijst.json
Klussen van opdrachtgevers zonder geldig KvK-nummer worden overgeslagen."""
import html, json, re, sys, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = "https://zzp.atasgroup.nl"
REMOTE = "Landelijk / Op afstand"


def kvk_ok(v):
    return bool(re.fullmatch(r"[0-9]{8}", str(v or ""))) and set(str(v)) != {"0"}


def get(url, key):
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def bron():
    if "--local" in sys.argv:
        return json.loads(Path(sys.argv[sys.argv.index("--local") + 1]).read_text(encoding="utf-8"))
    cfg = (HERE / "config.js").read_text(encoding="utf-8")
    url = re.search(r"supabaseUrl:\s*'([^']*)'", cfg).group(1).rstrip("/")
    key = re.search(r"supabaseKey:\s*'([^']*)'", cfg).group(1)
    if not url or not key or re.search(r"demo:\s*true", cfg):
        print("Geen Supabase-koppeling actief: alleen sitemap met de basispagina's.")
        return []
    try:
        jobs = get(f"{url}/rest/v1/jobs?status=eq.open&select=*&limit=1000", key)
        ids = sorted({j["owner_id"] for j in jobs})
        prof = {}
        if ids:
            q = urllib.parse.quote("(" + ",".join(f'"{i}"' for i in ids) + ")")
            for p in get(f"{url}/rest/v1/profiles?id=in.{q}&select=id,company_name,full_name,kvk_number", key):
                prof[p["id"]] = p
    except Exception as e:  # bijvoorbeeld rechten nog niet ingesteld (setup.sql)
        print("Klussen niet te lezen:", e)
        return []
    for j in jobs:
        j["profiles"] = prof.get(j["owner_id"])
    return jobs


def paras(t):
    return [p for p in str(t).split("\n") if p.strip()]


def rate(j):
    if j.get("rate_value") is None:
        return "Tarief in overleg"
    return f"€ {int(j['rate_value'])} per uur excl. btw" if j.get("rate_type") == "uur" else f"Richtprijs € {int(j['rate_value'])} excl. btw"


def samenvatting(j):
    return " | ".join(x for x in [f"{j.get('category', '')} · {j.get('subcategory', '')}", j.get("duration"), rate(j)] if x)


def jobposting(j):
    p = j.get("profiles") or {}
    name = p.get("company_name") or p.get("full_name") or ""
    prov = re.sub(r"\s*\(.*\)", "", j.get("region") or "")
    d = {"@context": "https://schema.org", "@type": "JobPosting", "title": j["title"],
         "description": f"<p>{html.escape(samenvatting(j))}</p>" + "".join(f"<p>{html.escape(x)}</p>" for x in paras(j["description"])),
         "datePosted": str(j.get("created_at") or date.today().isoformat())[:10], "employmentType": "CONTRACTOR",
         "hiringOrganization": {"@type": "Organization", "name": name, "identifier": {"@type": "PropertyValue", "name": "KvK-nummer", "value": p.get("kvk_number")}},
         "directApply": True, "url": f"{SITE}/ilan/{j['id']}.html"}
    if j.get("region") == REMOTE:
        d["jobLocationType"] = "TELECOMMUTE"
        d["applicantLocationRequirements"] = {"@type": "Country", "name": "NL"}
    else:
        d["jobLocation"] = {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": "Emmen" if j.get("region") == "Drenthe (Emmen)" else prov, "addressRegion": prov, "addressCountry": "NL"}}
    if j.get("rate_type") == "uur" and j.get("rate_value") is not None:
        d["baseSalary"] = {"@type": "MonetaryAmount", "currency": "EUR", "value": {"@type": "QuantitativeValue", "value": float(j["rate_value"]), "unitText": "HOUR"}}
    return d


PAGE = """<!doctype html>
<html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{titel} in {regio} | ATAS ZZP</title>
<meta name="description" content="{beschr}">
<link rel="canonical" href="{url}"><link rel="icon" type="image/svg+xml" href="../favicon.svg"><meta name="robots" content="index, follow"><meta name="theme-color" content="#ffffff">
<meta property="og:type" content="article"><meta property="og:locale" content="nl_NL"><meta property="og:title" content="{titel} in {regio}"><meta property="og:url" content="{url}">
<link rel="stylesheet" href="../style.css?v=13"><link rel="stylesheet" href="../zzp.css?v=13">
<script type="application/ld+json">{ld}</script></head>
<body><div class="glow" aria-hidden="true"><i></i><i></i><i></i></div>
<header class="site"><div class="wrap hz"><a class="logo" href="../index.html"><img src="../logo-zzp.svg?v=13" alt="ATAS ZZP" width="190" height="34"></a><nav class="hnav"><a class="btn pill" href="../plaatsen.html">Klus plaatsen</a></nav></div></header>
<main><div class="wrap narrow" style="padding-top:calc(var(--hh) + 14px);padding-bottom:70px"><a class="back" href="../index.html#resultaten">&larr; Alle klussen</a>
<div class="article"><div class="jt"><h1>{titel}</h1><span class="kvkbadge v"><span class="coin">&#10003;</span><span>KvK Gecontroleerd</span></span></div>
<dl><dt>Opdrachtgever</dt><dd>{bedrijf}</dd><dt>KvK-nummer</dt><dd>{kvk}</dd><dt>Categorie</dt><dd>{categorie}</dd><dt>Soort klus</dt><dd>{subklus}</dd><dt>Regio</dt><dd>{regio}</dd><dt>Omvang en duur</dt><dd>{duur}</dd><dt>Tarief</dt><dd>{tarief}</dd></dl>
<div class="desc">{desc}</div>
<p style="margin-top:18px"><a class="btn pill" href="../ilan.html?id={id}">Reageer op deze klus</a></p></div></div></main>
<footer class="site"><div class="wrap"><nav class="fnav"><a href="../voorwaarden.html">Algemene voorwaarden</a><a href="../privacy.html">Privacy (AVG)</a></nav><p>ATAS ZZP Netwerk · <a href="https://atasgroup.nl">Atas Group</a> · Emmen, Nederland · <a href="mailto:info@atasgroup.nl">info@atasgroup.nl</a> · KvK: In voorbereiding / Aanvraag loopt</p></div></footer></body></html>
"""

if __name__ == "__main__":
    lijst = [j for j in bron() if kvk_ok((j.get("profiles") or {}).get("kvk_number"))]
    out = HERE / "ilan"
    out.mkdir(exist_ok=True)
    for f in out.glob("*.html"):
        f.unlink()
    for j in lijst:
        if not re.fullmatch(r"[0-9a-fA-F-]{8,40}|[0-9]+", str(j["id"])):
            continue
        p = j.get("profiles") or {}
        e = lambda k: html.escape(str(j.get(k) or ""))
        (out / f"{j['id']}.html").write_text(PAGE.format(
            titel=e("title"), regio=e("region"), categorie=e("category"), subklus=e("subcategory"), duur=e("duration"), id=html.escape(str(j["id"])),
            bedrijf=html.escape(str(p.get("company_name") or p.get("full_name") or "")), kvk=html.escape(str(p.get("kvk_number"))), tarief=html.escape(rate(j)),
            url=f"{SITE}/ilan/{j['id']}.html", beschr=html.escape(samenvatting(j)[:150]), desc="".join(f"<p>{html.escape(x)}</p>" for x in paras(j["description"])),
            ld=json.dumps(jobposting(j), ensure_ascii=False).replace("<", "\\u003c")), encoding="utf-8")
    vandaag = date.today().isoformat()
    urls = [(f"{SITE}/", vandaag, "1.0"), (f"{SITE}/plaatsen.html", vandaag, "0.9"), (f"{SITE}/werkwijze.html", vandaag, "0.7"), (f"{SITE}/wet-dba-kvk.html", vandaag, "0.7"), (f"{SITE}/voorwaarden.html", vandaag, "0.4"), (f"{SITE}/privacy.html", vandaag, "0.4")] + \
           [(f"{SITE}/regios.html", vandaag, "0.8")] + [(f"{SITE}/{p.name}", vandaag, "0.8") for p in sorted(HERE.glob("zzp-*.html"))] +            [(f"{SITE}/ilan/{j['id']}.html", str(j.get("created_at") or vandaag)[:10], "0.8") for j in lijst]
    (HERE / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"  <url><loc>{u}</loc><lastmod>{m}</lastmod><priority>{p}</priority></url>\n" for u, m, p in urls) + "</urlset>\n", encoding="utf-8")
    print(f"{len(lijst)} klus(sen), sitemap bijgewerkt")
