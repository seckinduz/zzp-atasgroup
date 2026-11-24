# Supabase koppelen (gratis plan)
1. supabase.com > New project (regio EU). 2. SQL Editor > plak en run `schema.sql`.
3. Authentication > Providers > Email: laat e-mailbevestiging aan (aanbevolen).
4. Project Settings > API: kopieer Project URL en `anon` key naar `config.js` (de anon key is publiek bedoeld; RLS beschermt de data). Nooit de `service_role` key in de site zetten.
5. KvK verifiëren: controleer het nummer op kvk.nl, zet daarna in Table Editor > profiles `kvk_geverifieerd` = true. Pas dan verschijnt het gouden "KvK Geverifieerd"-label.
6. Sitemap en ilan-pagina's: `build_sitemap.py` draait via .github/workflows/sitemap.yml elke 30 minuten.
