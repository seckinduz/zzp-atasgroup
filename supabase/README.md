# Supabase (profiles, jobs, applications)
De site is gekoppeld via `config.js` (project-URL en publishable key; die sleutel is bedoeld voor de browser, de beveiliging zit in RLS).
1. Supabase > SQL Editor: voer `setup.sql` eenmalig uit (rechten, RLS en 8-cijferig KvK-controle). Zonder dit script geeft de database "permission denied" en toont de site geen klussen.
2. Authentication > Providers > Email: laat e-mailbevestiging aan. Het profiel wordt bij de eerste login automatisch aangemaakt uit de registratiegegevens.
3. Voor testen zonder database: zet `demo: true` in `config.js`.
4. Sitemap en klus-pagina's: `build_sitemap.py` draait via `.github/workflows/sitemap.yml` elke 30 minuten.
