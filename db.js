// Gegevenslaag: Supabase (config.js ingevuld) of TESTMODUS (localStorage). Zelfde API voor beide.
(function () {
  'use strict';
  var C = window.ZZP_CONFIG || {};
  var REMOTE = !!(C.supabaseUrl && C.supabaseKey);
  var kvkGeldig = function (v) { return /^[0-9]{8}$/.test(v || '') && !/^0+$/.test(v); };
  var pcGeldig = function (v) { return /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test((v || '').trim()); };
  var pcNorm = function (v) { return (v || '').replace(/\s+/g, '').toUpperCase(); };
  var fail = function (m) { throw new Error(m); };
  var num = function (x) { return x === '' || x == null ? null : Number(x); };
  var PUB = function (p) { return p ? { bedrijf: p.bedrijf, kvk: p.kvk, kvk_geverifieerd: !!p.kvk_geverifieerd, dba_model: !!p.dba_model } : null; };

  function checkProfiel(p) {
    if (['opdrachtgever', 'zzp'].indexOf(p.rol) < 0) fail('Kies een type account.');
    if (!kvkGeldig(p.kvk)) fail('Een geldig KvK-nummer van precies 8 cijfers is verplicht.');
    if (!p.bedrijf || p.bedrijf.trim().length < 2) fail('Vul uw bedrijfsnaam in.');
    if (!p.naam || p.naam.trim().length < 2) fail('Vul uw naam in.');
    if (p.rol === 'zzp' && !pcGeldig(p.postcode)) fail('Vul een geldige postcode in (bijvoorbeeld 7811 AB).');
  }
  function checkListing(l) {
    if (!l.titel || l.titel.trim().length < 3) fail('Vul een titel in (minimaal 3 tekens).');
    if (!l.categorie || !l.subklus) fail('Kies een categorie en een soort klus.');
    if (!(Number(l.oppervlak) > 0)) fail('Vul een oppervlak of aantal uren in.');
    if (!pcGeldig(l.postcode)) fail('Vul een geldige postcode in (bijvoorbeeld 7811 AB).');
    if (!l.plaats) fail('De plaats bij de postcode is niet gevonden. Controleer de postcode.');
    if (!l.omschrijving || l.omschrijving.trim().length < 20) fail('De omschrijving is te kort (minimaal 20 tekens).');
    if (!l.valid_through) fail('Kies een sluitingsdatum.');
    if (l.dba_bevestigd !== true) fail('Bevestig de Wet DBA-controle om te publiceren.');
    if ((l.fotos || []).length > 3) fail('Maximaal 3 foto\'s.');
  }
  function pickListing(l, kvk) {
    return { titel: l.titel.trim(), soort: 'ZZP-opdracht', categorie: l.categorie, subklus: l.subklus, eenheid: l.eenheid || 'm2', oppervlak: num(l.oppervlak), kamers: parseInt(l.kamers, 10) || 1,
      materiaal: l.materiaal === 'inclusief' ? 'inclusief' : 'exclusief', spoed: !!l.spoed, budget_min: num(l.budget_min), budget_max: num(l.budget_max),
      postcode: pcNorm(l.postcode), plaats: l.plaats.trim(), provincie: l.provincie || null, regio: l.provincie || 'Heel Nederland', sector: l.categorie, lat: num(l.lat), lon: num(l.lon),
      omschrijving: l.omschrijving.trim(), fotos: (l.fotos || []).slice(0, 3), dba_bevestigd: true, valid_through: l.valid_through, kvk: kvk };
  }

  /* ---------------- TESTMODUS ---------------- */
  var LK = 'zzp_local_v2', LS = 'zzp_local_session';
  var leeg = function () { return { users: [], profiles: [], listings: [], applications: [] }; };
  function load() { try { return JSON.parse(localStorage.getItem(LK)) || leeg(); } catch (e) { return leeg(); } }
  function save(d) { try { localStorage.setItem(LK, JSON.stringify(d)); } catch (e) { fail('Opslaan mislukt: de browseropslag is vol. Gebruik minder of kleinere foto\'s.'); } }
  function sha(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); }
  var newId = function () { return crypto.randomUUID(); };
  function lMe(d) { var id = localStorage.getItem(LS); if (!id) return null; var u = d.users.filter(function (x) { return x.id === id; })[0]; if (!u) return null; return { user: { id: u.id, email: u.email }, profile: d.profiles.filter(function (p) { return p.id === id; })[0] }; }
  function lNeed(d) { var m = lMe(d); if (!m) fail('Log eerst in.'); return m; }
  function lEmbed(d, l) { return Object.assign({}, l, { profiles: PUB(d.profiles.filter(function (p) { return p.id === l.owner; })[0]) }); }

  var local = {
    signUp: function (x) {
      var d = load(); checkProfiel(x);
      if (!x.email || !/^\S+@\S+\.\S+$/.test(x.email)) fail('Vul een geldig e-mailadres in.');
      if (!x.password || x.password.length < 8) fail('Het wachtwoord moet minimaal 8 tekens hebben.');
      if (d.users.some(function (u) { return u.email === x.email.toLowerCase(); })) fail('Dit e-mailadres is al in gebruik.');
      return sha(x.password).then(function (h) {
        var id = newId();
        d.users.push({ id: id, email: x.email.toLowerCase(), hash: h });
        d.profiles.push({ id: id, rol: x.rol, bedrijf: x.bedrijf.trim(), naam: x.naam.trim(), kvk: x.kvk, sector: x.sector || null, postcode: x.postcode ? pcNorm(x.postcode) : null, plaats: x.plaats || null, lat: num(x.lat), lon: num(x.lon), uurtarief: num(x.uurtarief), zichtbaar: !!x.zichtbaar, kvk_geverifieerd: false, vca: !!x.vca, avb: !!x.avb, dba_model: !!x.dba_model, docs_geverifieerd: false, created_at: new Date().toISOString() });
        save(d); localStorage.setItem(LS, id); return lMe(d);
      });
    },
    signIn: function (email, pw) { var d = load(); return sha(pw).then(function (h) { var u = d.users.filter(function (x) { return x.email === (email || '').toLowerCase() && x.hash === h; })[0]; if (!u) fail('E-mailadres of wachtwoord klopt niet.'); localStorage.setItem(LS, u.id); return lMe(d); }); },
    signOut: function () { localStorage.removeItem(LS); return Promise.resolve(); },
    me: function () { return Promise.resolve(lMe(load())); },
    updateProfile: function (patch) { var d = load(), m = lNeed(d), p = d.profiles.filter(function (x) { return x.id === m.user.id; })[0]; ['bedrijf', 'naam', 'sector', 'zichtbaar', 'postcode', 'plaats', 'lat', 'lon', 'vca', 'avb', 'dba_model'].forEach(function (k) { if (k in patch) p[k] = patch[k]; }); if ('uurtarief' in patch) p.uurtarief = num(patch.uurtarief); save(d); return Promise.resolve(p); },
    listListings: function () { var d = load(), t = new Date().toISOString().slice(0, 10); return Promise.resolve(d.listings.filter(function (l) { return l.status === 'open' && l.valid_through >= t; }).sort(function (a, b) { return b.created_at < a.created_at ? -1 : 1; }).map(function (l) { return lEmbed(d, l); })); },
    listZzps: function () { return Promise.resolve(load().profiles.filter(function (p) { return p.rol === 'zzp' && p.zichtbaar; }).map(function (p) { return { bedrijf: p.bedrijf, kvk: p.kvk, kvk_geverifieerd: p.kvk_geverifieerd, sector: p.sector, postcode: p.postcode, plaats: p.plaats, lat: p.lat, lon: p.lon, uurtarief: p.uurtarief, vca: p.vca, avb: p.avb, dba_model: p.dba_model, docs_geverifieerd: p.docs_geverifieerd }; })); },
    getListing: function (id) { var d = load(), l = d.listings.filter(function (x) { return x.id === id; })[0], m = lMe(d); if (!l || (l.status !== 'open' && !(m && m.user.id === l.owner))) return Promise.resolve(null); return Promise.resolve(lEmbed(d, l)); },
    myListings: function () { var d = load(), m = lNeed(d); return Promise.resolve(d.listings.filter(function (l) { return l.owner === m.user.id; }).sort(function (a, b) { return b.created_at < a.created_at ? -1 : 1; }).map(function (l) { return Object.assign({}, l, { aanmeldingen: d.applications.filter(function (a) { return a.listing_id === l.id; }).length }); })); },
    createListing: function (l) {
      var d = load(), m = lNeed(d); if (m.profile.rol !== 'opdrachtgever') fail('Alleen opdrachtgevers kunnen een klus plaatsen.');
      if (!kvkGeldig(m.profile.kvk)) fail('Plaatsen is geblokkeerd: geen geldig KvK-nummer.'); checkListing(l);
      var n = Object.assign({ id: newId(), owner: m.user.id, status: 'open', created_at: new Date().toISOString() }, pickListing(l, m.profile.kvk));
      d.listings.push(n); save(d); return Promise.resolve(n);
    },
    updateListing: function (id, l) {
      var d = load(), m = lNeed(d), x = d.listings.filter(function (q) { return q.id === id && q.owner === m.user.id; })[0]; if (!x) fail('Advertentie niet gevonden.');
      ['titel', 'omschrijving', 'valid_through', 'status'].forEach(function (k) { if (k in l) x[k] = l[k]; });
      if (!x.titel || x.titel.trim().length < 3) fail('Vul een titel in.'); if (!x.omschrijving || x.omschrijving.trim().length < 20) fail('De omschrijving is te kort.');
      save(d); return Promise.resolve(x);
    },
    listingApplications: function (id) {
      var d = load(), m = lNeed(d); if (!d.listings.some(function (l) { return l.id === id && l.owner === m.user.id; })) fail('Geen toegang.');
      return Promise.resolve(d.applications.filter(function (a) { return a.listing_id === id; }).map(function (a) { var p = d.profiles.filter(function (x) { return x.id === a.zzp_id; })[0]; return Object.assign({}, a, { profiles: p ? { naam: p.naam, bedrijf: p.bedrijf, kvk: p.kvk, kvk_geverifieerd: p.kvk_geverifieerd, sector: p.sector, vca: p.vca, avb: p.avb, dba_model: p.dba_model, docs_geverifieerd: p.docs_geverifieerd } : null }); }));
    },
    apply: function (listing_id, x) {
      var d = load(), m = lNeed(d); if (m.profile.rol !== 'zzp') fail('Alleen ZZP-accounts kunnen reageren.');
      var l = d.listings.filter(function (q) { return q.id === listing_id && q.status === 'open'; })[0]; if (!l) fail('Deze advertentie is gesloten.');
      if (d.applications.some(function (a) { return a.listing_id === listing_id && a.zzp_id === m.user.id; })) fail('U heeft al gereageerd op deze advertentie.');
      if (!x.bericht || x.bericht.trim().length < 5) fail('Schrijf een kort bericht.');
      if (!x.contact_email || !/^\S+@\S+\.\S+$/.test(x.contact_email)) fail('Vul een geldig e-mailadres in.');
      var n = { id: newId(), listing_id: listing_id, zzp_id: m.user.id, bericht: x.bericht.trim(), tarief: num(x.tarief), contact_email: x.contact_email, created_at: new Date().toISOString() };
      d.applications.push(n); save(d); return Promise.resolve(n);
    },
    myApplications: function () { var d = load(), m = lNeed(d); return Promise.resolve(d.applications.filter(function (a) { return a.zzp_id === m.user.id; }).map(function (a) { return Object.assign({}, a, { listings: d.listings.filter(function (l) { return l.id === a.listing_id; })[0] || null }); })); },
    testVerify: function () { var d = load(), m = lNeed(d); var pp = d.profiles.filter(function (p) { return p.id === m.user.id; })[0]; pp.kvk_geverifieerd = true; pp.docs_geverifieerd = true; save(d); return Promise.resolve(); }
  };

  /* ---------------- SUPABASE ---------------- */
  var base = (C.supabaseUrl || '').replace(/\/$/, '');
  var tok = function () { try { return JSON.parse(localStorage.getItem('zzp_sb')); } catch (e) { return null; } };
  var setTok = function (t) { if (t) localStorage.setItem('zzp_sb', JSON.stringify(t)); else localStorage.removeItem('zzp_sb'); };
  var vert = function (m) {
    if (/already registered/i.test(m)) return 'Dit e-mailadres is al in gebruik.';
    if (/Database error saving new user/i.test(m)) return 'Registratie geweigerd: controleer uw KvK-nummer (8 cijfers), postcode en de overige gegevens.';
    if (/Invalid login/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.';
    if (/Email not confirmed/i.test(m)) return 'Bevestig eerst uw e-mailadres via de link in uw inbox.';
    if (/duplicate key/i.test(m)) return 'U heeft al gereageerd op deze advertentie.';
    if (/row-level security|violates/i.test(m)) return 'Deze actie is niet toegestaan of de gegevens zijn ongeldig.';
    return m;
  };
  function req(path, o, retry) {
    o = o || {}; var t = tok();
    return fetch(base + path, { method: o.method || 'GET', headers: { apikey: C.supabaseKey, Authorization: 'Bearer ' + ((o.auth !== false && t && t.access_token) || C.supabaseKey), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) {
        return r.text().then(function (txt) {
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
          if (r.status === 401 && t && t.refresh_token && !retry && o.auth !== false) {
            return fetch(base + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: C.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.refresh_token }) })
              .then(function (rr) { return rr.json().then(function (s) { if (!rr.ok) { setTok(null); fail('Uw sessie is verlopen. Log opnieuw in.'); } setTok({ access_token: s.access_token, refresh_token: s.refresh_token, user: s.user }); return req(path, o, true); }); });
          }
          if (!r.ok) fail(vert((j && (j.msg || j.message || j.error_description || j.error)) || ('Fout ' + r.status)));
          return j;
        });
      });
  }
  var uid = function () { var t = tok(); return t && t.user && t.user.id; };
  var sb = {
    signUp: function (x) {
      checkProfiel(x);
      return req('/auth/v1/signup', { method: 'POST', auth: false, body: { email: x.email, password: x.password, data: { rol: x.rol, bedrijf: x.bedrijf.trim(), naam: x.naam.trim(), kvk: x.kvk, sector: x.sector || null, postcode: x.postcode ? pcNorm(x.postcode) : null, plaats: x.plaats || null, lat: x.lat == null ? '' : String(x.lat), lon: x.lon == null ? '' : String(x.lon), uurtarief: x.uurtarief == null ? '' : String(x.uurtarief), zichtbaar: !!x.zichtbaar, vca: !!x.vca, avb: !!x.avb, dba_model: !!x.dba_model } } })
        .then(function (j) { if (j && j.access_token) { setTok({ access_token: j.access_token, refresh_token: j.refresh_token, user: j.user }); return sb.me(); } return { needsConfirm: true }; });
    },
    signIn: function (email, pw) { return req('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email, password: pw } }).then(function (j) { setTok({ access_token: j.access_token, refresh_token: j.refresh_token, user: j.user }); return sb.me(); }); },
    signOut: function () { setTok(null); return Promise.resolve(); },
    me: function () { var id = uid(); if (!id) return Promise.resolve(null); return req('/rest/v1/profiles?id=eq.' + id + '&select=*').then(function (r) { return r[0] ? { user: { id: id, email: tok().user.email }, profile: r[0] } : null; }).catch(function () { return null; }); },
    updateProfile: function (p) { var b = {}; ['bedrijf', 'naam', 'sector', 'zichtbaar', 'postcode', 'plaats', 'lat', 'lon', 'vca', 'avb', 'dba_model'].forEach(function (k) { if (k in p) b[k] = p[k]; }); if ('uurtarief' in p) b.uurtarief = num(p.uurtarief); return req('/rest/v1/profiles?id=eq.' + uid(), { method: 'PATCH', body: b }).then(function (r) { return r[0]; }); },
    listListings: function () { var t = new Date().toISOString().slice(0, 10); return req('/rest/v1/listings?status=eq.open&valid_through=gte.' + t + '&select=*,profiles(bedrijf,kvk,kvk_geverifieerd,dba_model)&order=created_at.desc&limit=500'); },
    listZzps: function () { return req('/rest/v1/profiles?rol=eq.zzp&zichtbaar=eq.true&select=bedrijf,kvk,kvk_geverifieerd,sector,postcode,plaats,lat,lon,uurtarief,vca,avb,dba_model,docs_geverifieerd&limit=500'); },
    getListing: function (id) { return req('/rest/v1/listings?id=eq.' + encodeURIComponent(id) + '&select=*,profiles(bedrijf,kvk,kvk_geverifieerd,dba_model)').then(function (r) { return r[0] || null; }); },
    myListings: function () { return req('/rest/v1/listings?owner=eq.' + uid() + '&select=*,applications(count)&order=created_at.desc').then(function (r) { return r.map(function (l) { l.aanmeldingen = l.applications && l.applications[0] ? l.applications[0].count : 0; return l; }); }); },
    createListing: function (l) { checkListing(l); var b = pickListing(l, ''); b.owner = uid(); return req('/rest/v1/listings', { method: 'POST', body: b }).then(function (r) { return r[0]; }); },
    updateListing: function (id, l) { var b = {}; ['titel', 'omschrijving', 'valid_through', 'status'].forEach(function (k) { if (k in l) b[k] = l[k]; }); return req('/rest/v1/listings?id=eq.' + id, { method: 'PATCH', body: b }).then(function (r) { return r[0]; }); },
    listingApplications: function (id) { return req('/rest/v1/applications?listing_id=eq.' + id + '&select=*,profiles(naam,bedrijf,kvk,kvk_geverifieerd,sector,vca,avb,dba_model,docs_geverifieerd)&order=created_at.desc'); },
    apply: function (id, x) { return req('/rest/v1/applications', { method: 'POST', body: { listing_id: id, zzp_id: uid(), bericht: x.bericht, tarief: num(x.tarief), contact_email: x.contact_email } }).then(function (r) { return r[0]; }); },
    myApplications: function () { return req('/rest/v1/applications?zzp_id=eq.' + uid() + '&select=*,listings(id,titel,plaats,status)&order=created_at.desc'); },
    testVerify: function () { return Promise.reject(new Error('Verificatie gebeurt door beheer na controle op kvk.nl.')); }
  };

  window.ZZP = Object.assign({ mode: REMOTE ? 'supabase' : 'test', kvkGeldig: kvkGeldig, pcGeldig: pcGeldig, pcNorm: pcNorm }, REMOTE ? sb : local);
})();
