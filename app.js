(function () {
  'use strict';
  var Z = window.ZZP, G = window.ZZPGEO, SITE = 'https://zzp.atasgroup.nl';
  var $ = function (i) { return document.getElementById(i); };
  function h(tag, a) {
    var e = document.createElement(tag); a = a || {};
    Object.keys(a).forEach(function (k) { if (k === 'class') e.className = a[k]; else if (k === 'text') e.textContent = a[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), a[k]); else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k]); });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; if (Array.isArray(c)) { c.forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); continue; } e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return e;
  }
  var eur = function (x) { return x == null ? '—' : '€ ' + Number(x).toLocaleString('nl-NL', { maximumFractionDigits: 0 }); };
  var datum = function (s) { return s ? new Date(s).toLocaleDateString('nl-NL') : ''; };
  var werkP = null;
  function loadWerk() { if (!werkP) werkP = fetch('werk.json').then(function (r) { if (!r.ok) throw new Error('werk.json'); return r.json(); }); return werkP; }
  var eenheidTxt = function (e) { return e === 'uur' ? 'uur' : 'm²'; };

  function badge(verified) {
    return h('span', { class: 'kvkbadge ' + (verified ? 'v' : 'p'), title: verified ? 'KvK-nummer gecontroleerd door Atas Group' : 'KvK-nummer ingevoerd, controle loopt' },
      h('span', { class: 'coin', 'aria-hidden': 'true' }, '✓'), h('span', { text: verified ? 'KvK Geverifieerd' : 'KvK in controle' }));
  }
  function trust(p) {
    p = p || {}; var v = !!p.docs_geverifieerd, w = h('span', { class: 'trustrow' });
    [['vca', 'VCA Veiligheid'], ['avb', 'AVB Verzekering'], ['dba_model', 'Wet DBA Modelovereenkomst']].forEach(function (x) {
      if (p[x[0]]) w.appendChild(h('span', { class: 'tchip ' + (v ? 'v' : 'p'), title: v ? 'Document gecontroleerd door Atas Group' : 'Zelf verklaard door het lid, controle door Atas Group volgt' }, h('span', { class: 'coin', 'aria-hidden': 'true' }, '✓'), x[1] + (v ? '' : ' · verklaard')));
    });
    return w.childNodes.length ? w : null;
  }
  Z.me().then(function (m) { var a = $('nav-account'); if (a) a.textContent = m ? 'Mijn paneel' : 'Inloggen'; });
  if (Z.mode === 'test' && $('testbanner')) { var tb = $('testbanner'), ft = document.querySelector('footer.site'); tb.hidden = false; if (ft) ft.parentNode.insertBefore(tb, ft); }

  function jobPosting(l) {
    var p = l.profiles || {};
    var samen = [l.categorie + ' · ' + l.subklus, l.oppervlak + ' ' + eenheidTxt(l.eenheid), 'Materiaal ' + l.materiaal, l.spoed ? 'Spoedklus binnen 48 uur' : null, l.budget_min ? 'Richtbegroting ' + eur(l.budget_min) + ' tot ' + eur(l.budget_max) + ' excl. btw' : null].filter(Boolean).join(' | ');
    var esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var o = { '@context': 'https://schema.org', '@type': 'JobPosting', title: l.titel,
      description: '<p>' + esc(samen) + '</p>' + l.omschrijving.split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''),
      datePosted: (l.created_at || '').slice(0, 10), validThrough: l.valid_through, employmentType: 'CONTRACTOR',
      hiringOrganization: { '@type': 'Organization', name: p.bedrijf, identifier: { '@type': 'PropertyValue', name: 'KvK-nummer', value: l.kvk } },
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: l.plaats, postalCode: l.postcode, addressRegion: l.provincie || undefined, addressCountry: 'NL' } },
      directApply: true, url: SITE + '/ilan.html?id=' + l.id };
    return o;
  }
  window.ZUI = { h: h, eur: eur, datum: datum, badge: badge, trust: trust, loadWerk: loadWerk, $: $ };

  var page = document.body.getAttribute('data-page');

  /* ---------------- HOME ---------------- */
  function home() {
    var mode = 'opdracht', data = { opdracht: null, zzp: null }, origin = null, uit = $('uitslag'), tel = $('telling'), note = $('fnote'), pcT = null;
    loadWerk().then(function (W) { W.categorieen.forEach(function (c) { $('f-cat').appendChild(h('option', { value: c.naam, text: c.naam })); }); }).catch(function () { });
    try { var sv = localStorage.getItem('zzp_pc'); if (sv) $('f-pc').value = sv; } catch (e) { }
    function zet(m) {
      mode = m; $('p-zoek').setAttribute('aria-pressed', m === 'zzp'); $('p-ben').setAttribute('aria-pressed', m === 'opdracht');
      $('res-titel').textContent = m === 'opdracht' ? 'Actuele klussen en opdrachten' : 'ZZP\'ers in uw regio'; laad();
    }
    function laad() {
      if (data[mode]) return render(); uit.textContent = 'Laden…';
      (mode === 'opdracht' ? Z.listListings() : Z.listZzps()).then(function (r) { data[mode] = r; render(); }).catch(function (e) { uit.textContent = e.message; });
    }
    function geoPc() {
      var v = $('f-pc').value; clearTimeout(pcT);
      pcT = setTimeout(function () {
        if (!G.geldig(v)) { origin = null; note.textContent = v ? 'Vul een geldige postcode in (bijvoorbeeld 7811 AB).' : ''; return render(); }
        note.textContent = 'Postcode opzoeken…';
        G.zoek(v).then(function (o) { origin = o; try { localStorage.setItem('zzp_pc', v); } catch (e) { } note.textContent = o ? 'Postcode ' + o.postcode.replace(/(\d{4})(\w{2})/, '$1 $2') + ': ' + o.plaats + ' (' + o.provincie + ')' : 'Postcode niet gevonden of geen verbinding. Afstandsfilter is uit.'; render(); });
      }, 350);
    }
    function render() {
      if (!data[mode]) return;
      var cat = $('f-cat').value, q = $('f-q').value.trim().toLowerCase(), straal = parseInt($('f-straal').value, 10), spoed = $('f-spoed').checked;
      var l = data[mode].map(function (x) { return { x: x, d: origin ? G.km(origin, x) : null }; }).filter(function (r) {
        var x = r.x, c = mode === 'opdracht' ? x.categorie : x.sector;
        if (cat && c !== cat) return false;
        if (mode === 'opdracht' && spoed && !x.spoed) return false;
        if (q && ((x.titel || '') + ' ' + (x.subklus || '') + ' ' + (x.plaats || '') + ' ' + (x.omschrijving || '') + ' ' + (x.bedrijf || '') + ' ' + (c || '')).toLowerCase().indexOf(q) < 0) return false;
        if (straal > 0 && origin && r.d != null && r.d > straal) return false;
        return true;
      });
      if (origin) l.sort(function (a, b) { return (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d); });
      uit.textContent = ''; tel.textContent = l.length + ' resultaat' + (l.length === 1 ? '' : 'en') + (straal > 0 && origin ? ' binnen ' + straal + ' km' : ' in heel Nederland');
      if (!l.length) { uit.appendChild(h('p', { class: 'note', text: mode === 'opdracht' ? 'Geen klussen gevonden. Verruim de straal of plaats zelf een klus.' : 'Geen ZZP\'ers gevonden. Verruim uw zoekopdracht.' })); return; }
      l.forEach(function (r) {
        var x = r.x, dist = r.d != null ? ' · ' + Math.round(r.d) + ' km' : '';
        if (mode === 'opdracht') uit.appendChild(h('a', { class: 'job', href: 'ilan.html?id=' + encodeURIComponent(x.id) },
          h('div', { class: 'jt' }, h('h3', { text: x.titel }), badge(x.profiles && x.profiles.kvk_geverifieerd)),
          h('div', { class: 'chips' }, h('span', { class: 'chip', text: x.categorie }), x.subklus && h('span', { class: 'chip', text: x.subklus }), x.spoed && h('span', { class: 'chip sp', text: 'Spoed 48 uur' }), h('span', { class: 'chip', text: 'Wet DBA ✓' }), x.profiles && x.profiles.dba_model && h('span', { class: 'chip', text: 'Modelovereenkomst' })),
          h('span', { class: 'meta', text: [x.profiles && x.profiles.bedrijf, x.plaats + dist, x.oppervlak ? x.oppervlak + ' ' + eenheidTxt(x.eenheid) : null].filter(Boolean).join(' · ') }),
          h('span', { class: 'rate', text: x.budget_min ? 'Richtbegroting ' + eur(x.budget_min) + ' – ' + eur(x.budget_max) : 'Budget in overleg' }),
          h('span', { class: 'kvk', text: 'KvK ' + x.kvk + ' · sluit ' + datum(x.valid_through) })));
        else uit.appendChild(h('article', { class: 'job' },
          h('div', { class: 'jt' }, h('h3', { text: x.bedrijf }), badge(x.kvk_geverifieerd)),
          h('span', { class: 'meta', text: [x.sector, (x.plaats || '') + dist].filter(Boolean).join(' · ') }),
          x.uurtarief != null && h('span', { class: 'rate', text: eur(x.uurtarief) + ' / uur excl. btw' }), trust(x), h('span', { class: 'kvk', text: 'KvK ' + x.kvk })));
      });
    }
    $('p-zoek').addEventListener('click', function () { zet('zzp'); });
    $('p-ben').addEventListener('click', function () { zet('opdracht'); });
    ['f-cat', 'f-straal', 'f-spoed'].forEach(function (i) { $(i).addEventListener('input', render); });
    $('f-q').addEventListener('input', render); $('f-pc').addEventListener('input', geoPc);
    Array.prototype.forEach.call(document.querySelectorAll('.rchip'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('.rchip'), function (x) { x.setAttribute('aria-pressed', x === b); });
        $('f-pc').value = b.getAttribute('data-pc'); $('f-straal').value = b.getAttribute('data-straal'); if (b.getAttribute('data-pc')) geoPc(); else { origin = null; note.textContent = ''; render(); }
      });
    });
    $('zoekform').addEventListener('submit', function (e) { e.preventDefault(); });
    if ($('f-pc').value) geoPc(); zet('opdracht');
  }

  /* ---------------- ILAN ---------------- */
  function ilan() {
    var id = new URLSearchParams(location.search).get('id'), box = $('ilan');
    Z.getListing(id).then(function (l) {
      if (!l) { box.appendChild(h('p', { class: 'note', text: 'Deze klus bestaat niet of is gesloten.' })); return; }
      document.title = l.titel + ' in ' + l.plaats + ' | ATAS ZZP';
      var ld = h('script', { type: 'application/ld+json' }); ld.textContent = JSON.stringify(jobPosting(l)).replace(/</g, '\\u003c'); document.head.appendChild(ld);
      var p = l.profiles || {}, dl = h('dl');
      [['Opdrachtgever', p.bedrijf], ['KvK-nummer', l.kvk], ['Categorie', l.categorie], ['Soort klus', l.subklus], ['Omvang', l.oppervlak ? l.oppervlak + ' ' + eenheidTxt(l.eenheid) + (l.kamers > 1 ? ' · ' + l.kamers + ' ruimtes' : '') : null], ['Materiaal', l.materiaal], ['Spoed', l.spoed ? 'Ja, binnen 48 uur' : 'Nee'],
        ['Locatie', l.plaats + (l.postcode ? ' (' + l.postcode.replace(/(\d{4})(\w{2})/, '$1 $2') + ')' : '')], ['Richtbegroting', l.budget_min ? eur(l.budget_min) + ' tot ' + eur(l.budget_max) + ' excl. btw' : 'In overleg'], ['Wet DBA', 'Controle bevestigd door opdrachtgever' + (p.dba_model ? ' · Modelovereenkomst' : '')], ['Sluit op', datum(l.valid_through)]]
        .forEach(function (r) { if (r[1]) { dl.appendChild(h('dt', { text: r[0] })); dl.appendChild(h('dd', { text: r[1] })); } });
      box.appendChild(h('div', { class: 'article' }, h('div', { class: 'jt' }, h('h1', { text: l.titel }), badge(p.kvk_geverifieerd)), dl,
        h('p', null, h('a', { class: 'btn ghost', href: 'werkplan.html?id=' + l.id, text: 'Download werkplan en begroting (PDF)' })),
        (l.fotos && l.fotos.length) ? h('div', { class: 'fotos' }, l.fotos.map(function (f) { return h('img', { src: f, alt: 'Foto van de klus', loading: 'lazy' }); })) : null,
        h('div', { class: 'desc' }, l.omschrijving.split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return h('p', { text: x }); })),
        h('p', { class: 'hint', text: 'Richtbegroting is een indicatie op basis van een referentie van 100 m² en geen offerte. De opdrachtgever heeft de Wet DBA-controle bevestigd.' })));
      var ap = $('apply'); ap.textContent = '';
      Z.me().then(function (m) {
        if (l.status !== 'open') return ap.appendChild(h('p', { class: 'note', text: 'Deze klus is gesloten.' }));
        if (!m) return ap.appendChild(h('p', { class: 'note' }, 'Wilt u reageren? ', h('a', { href: 'account.html?terug=' + encodeURIComponent('ilan.html?id=' + l.id), class: 'back', text: 'Log in of registreer als ZZP\'er' }), ' (KvK-nummer verplicht).'));
        if (m.profile.rol !== 'zzp') return ap.appendChild(h('p', { class: 'note', text: 'Alleen ZZP-accounts kunnen reageren.' }));
        var er = h('p', { class: 'err', role: 'alert' }), ok = h('p', { class: 'okmsg', role: 'status' });
        var f = h('form', { class: 'formbox', novalidate: 'novalidate' }, h('h3', { text: 'Reageer met één klik' }),
          h('label', null, 'Uw bericht', h('textarea', { name: 'bericht', required: 'required', maxlength: '2000', text: 'Beste ' + (p.bedrijf || '') + ',\n\nIk reageer graag op uw klus. Mijn KvK-nummer is ' + m.profile.kvk + '.\n\nMet vriendelijke groet,\n' + m.profile.naam })),
          h('div', { class: 'row2' }, h('label', null, 'Uw offerte (€ excl. btw)', h('input', { type: 'number', name: 'tarief', min: '0', step: '10', inputmode: 'numeric' })), h('label', null, 'Contact e-mailadres', h('input', { type: 'email', name: 'email', required: 'required', value: m.user.email }))),
          er, ok, h('button', { class: 'btn pill', type: 'submit', text: 'Verstuur aanmelding' }));
        f.addEventListener('submit', function (e) { e.preventDefault(); er.textContent = ''; var b = f.querySelector('button'); b.disabled = true;
          Z.apply(l.id, { bericht: f.elements.bericht.value, tarief: f.elements.tarief.value, contact_email: f.elements.email.value }).then(function () { ok.textContent = 'Uw aanmelding is verstuurd. U vindt hem terug in uw paneel.'; }).catch(function (x) { er.textContent = x.message; b.disabled = false; }); });
        ap.appendChild(f);
      });
    }).catch(function (e) { box.appendChild(h('p', { class: 'note', text: e.message })); });
  }

  /* ---------------- ACCOUNT ---------------- */
  function account() {
    var root = $('acc'), terug = new URLSearchParams(location.search).get('terug');
    var msg = function (cls, t) { return h('p', { class: cls, role: cls === 'err' ? 'alert' : 'status', text: t || '' }); };
    function veld(lbl, name, attrs) { return h('label', null, lbl, h('input', Object.assign({ name: name }, attrs || {}))); }
    function catSelect(name, val, W) { var s = h('select', { name: name }); s.appendChild(h('option', { value: '', text: 'Kies een categorie' })); W.categorieen.forEach(function (c) { s.appendChild(h('option', { value: c.naam, text: c.naam })); }); s.value = val || ''; return s; }
    var go = function () { if (terug && /^[a-z]+\.html/.test(terug)) location.href = terug; else paneel(); };

    function gast() {
      root.textContent = ''; var rol = 'opdrachtgever', tab = 'login';
      var tabs = h('div', { class: 'tabs', role: 'tablist' }), body = h('div', { class: 'formbox' });
      loadWerk().then(function (W) {
        function bouw() {
          tabs.textContent = ''; body.textContent = '';
          [['login', 'Inloggen'], ['opdrachtgever', 'Opdrachtgever'], ['zzp', 'ZZP\'er']].forEach(function (t) {
            tabs.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': (tab === 'login' ? 'login' : rol) === t[0], text: t[0] === 'login' ? t[1] : 'Registreren: ' + t[1], onclick: function () { if (t[0] === 'login') tab = 'login'; else { tab = 'reg'; rol = t[0]; } bouw(); } }));
          });
          var er = msg('err'), f;
          if (tab === 'login') {
            f = h('form', { novalidate: 'novalidate' }, veld('E-mailadres', 'email', { type: 'email', required: 'required', autocomplete: 'email' }), veld('Wachtwoord', 'pw', { type: 'password', required: 'required', autocomplete: 'current-password' }), er, h('button', { class: 'btn pill', type: 'submit', text: 'Inloggen' }));
            f.addEventListener('submit', function (e) { e.preventDefault(); Z.signIn(f.elements.email.value, f.elements.pw.value).then(go).catch(function (x) { er.textContent = x.message; }); });
          } else {
            var z = rol === 'zzp', oke = msg('okmsg'), pcInfo = h('span', { class: 'hint' });
            f = h('form', { novalidate: 'novalidate' },
              h('p', { class: 'hint', text: z ? 'Voor ZZP\'ers: uw eigen onderneming, KvK-nummer en postcode.' : 'Voor opdrachtgevers: een geldig KvK-nummer is verplicht om klussen te plaatsen.' }),
              h('div', { class: 'row2' }, veld('Bedrijfsnaam', 'bedrijf', { required: 'required', maxlength: '80', autocomplete: 'organization' }), veld('KvK-nummer (8 cijfers)', 'kvk', { required: 'required', inputmode: 'numeric', maxlength: '8', placeholder: '12345678', autocomplete: 'off' })),
              h('div', { class: 'row2' }, veld('Contactpersoon', 'naam', { required: 'required', autocomplete: 'name' }), veld('E-mailadres', 'email', { type: 'email', required: 'required', autocomplete: 'email' })),
              veld('Wachtwoord (minimaal 8 tekens)', 'pw', { type: 'password', required: 'required', minlength: '8', autocomplete: 'new-password' }),
              z && h('div', { class: 'row2' }, h('label', null, 'Uw vakgebied', catSelect('sector', '', W)), veld('Postcode', 'postcode', { required: 'required', maxlength: '7', placeholder: '7811 AB', autocomplete: 'postal-code' })),
              z && veld('Uw uurtarief (€ excl. btw, optioneel)', 'tarief', { type: 'number', min: '0', max: '1000', step: '1', inputmode: 'numeric' }),
              z && pcInfo,
              z && h('div', { class: 'fgrid', style: 'gap:2px' }, h('span', { class: 'hint', style: 'font-weight:700' }, 'Zekerheid (optioneel, zelf verklaard)'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'vca' }), 'Ik heb een VCA-certificaat'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'avb' }), 'Ik heb een AVB-bedrijfsaansprakelijkheidsverzekering'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'dba_model' }), 'Ik werk met een Modelovereenkomst (Wet DBA)')),
      z && h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'zichtbaar' }), 'Toon mijn profiel (bedrijfsnaam, vakgebied, plaats, tarief, KvK) in het ZZP-overzicht.'),
              h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'ok', required: 'required' }), 'Ik ga akkoord dat Atas Group mijn gegevens verwerkt en mijn KvK-nummer controleert.'),
              er, oke, h('button', { class: 'btn pill', type: 'submit', text: 'Account aanmaken' }));
            f.addEventListener('submit', function (e) {
              e.preventDefault(); er.textContent = ''; var q = f.elements; q.kvk.value = q.kvk.value.replace(/\s+/g, '');
              if (!Z.kvkGeldig(q.kvk.value)) { er.textContent = 'Een geldig KvK-nummer van precies 8 cijfers is verplicht.'; q.kvk.focus(); return; }
              if (!q.ok.checked) { er.textContent = 'Ga akkoord met de voorwaarden om door te gaan.'; return; }
              var data = { rol: rol, bedrijf: q.bedrijf.value, kvk: q.kvk.value, naam: q.naam.value, email: q.email.value, password: q.pw.value, sector: z ? q.sector.value : null, uurtarief: z ? q.tarief.value : null, zichtbaar: z && q.zichtbaar.checked, vca: z && q.vca.checked, avb: z && q.avb.checked, dba_model: z && q.dba_model.checked };
              var klaar = function () { Z.signUp(data).then(function (r) { if (r && r.needsConfirm) oke.textContent = 'Account aangemaakt. Bevestig uw e-mailadres via de link in uw inbox en log daarna in.'; else go(); }).catch(function (x) { er.textContent = x.message; }); };
              if (!z) return klaar();
              if (!q.sector.value) { er.textContent = 'Kies uw vakgebied.'; q.sector.focus(); return; }
              if (!Z.pcGeldig(q.postcode.value)) { er.textContent = 'Vul een geldige postcode in (bijvoorbeeld 7811 AB).'; q.postcode.focus(); return; }
              G.zoek(q.postcode.value).then(function (o) { if (!o) { er.textContent = 'Postcode niet gevonden. Controleer de postcode of probeer het later opnieuw.'; return; } data.postcode = G.norm(q.postcode.value); data.plaats = o.plaats; data.lat = o.lat; data.lon = o.lon; klaar(); });
            });
          }
          body.appendChild(f);
        }
        root.appendChild(tabs); root.appendChild(body); bouw();
      });
    }

    function kop(m) {
      return h('div', { class: 'dashhead' }, h('div', null, h('p', { class: 'eyebrow', text: m.profile.rol === 'zzp' ? 'ZZP-paneel' : 'Paneel opdrachtgever' }), h('h2', { class: 'dh', text: m.profile.bedrijf }), h('p', { class: 'hint', text: 'KvK ' + m.profile.kvk + ' · ' + m.user.email })),
        h('div', { class: 'dhr' }, badge(m.profile.kvk_geverifieerd), trust(m.profile),
          Z.mode === 'test' && !m.profile.kvk_geverifieerd && h('button', { class: 'mini', type: 'button', text: 'Markeer geverifieerd (test)', onclick: function () { Z.testVerify().then(paneel); } }),
          h('button', { class: 'mini', type: 'button', text: 'Uitloggen', onclick: function () { Z.signOut().then(function () { location.href = 'account.html'; }); } })));
    }
    function paneel() { Z.me().then(function (m) { if (!m) return gast(); root.textContent = ''; root.appendChild(kop(m)); (m.profile.rol === 'zzp' ? zzpPaneel : ogPaneel)(m); }); }

    function zzpPaneel(m) {
      var p = m.profile, er = msg('err'), ok = msg('okmsg');
      loadWerk().then(function (W) {
        var f = h('form', { class: 'formbox', novalidate: 'novalidate' }, h('h3', { text: 'Mijn profiel' }),
          h('div', { class: 'row2' }, h('label', null, 'Vakgebied', catSelect('sector', p.sector, W)), veld('Postcode', 'postcode', { value: p.postcode || '', maxlength: '7' })),
          veld('Uurtarief (€ excl. btw)', 'tarief', { type: 'number', min: '0', max: '1000', value: p.uurtarief != null ? p.uurtarief : '' }),
          h('div', { class: 'fgrid', style: 'gap:2px' }, h('span', { class: 'hint', style: 'font-weight:700' }, 'Zekerheid (zelf verklaard; Atas Group controleert de documenten)'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'vca', checked: p.vca ? 'checked' : false }), 'VCA-certificaat'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'avb', checked: p.avb ? 'checked' : false }), 'AVB-bedrijfsaansprakelijkheidsverzekering'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'dba_model', checked: p.dba_model ? 'checked' : false }), 'Modelovereenkomst (Wet DBA)')),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'zichtbaar', checked: p.zichtbaar ? 'checked' : false }), 'Toon mijn profiel in het ZZP-overzicht.'),
          er, ok, h('button', { class: 'btn pill', type: 'submit', text: 'Opslaan' }));
        f.addEventListener('submit', function (e) {
          e.preventDefault(); er.textContent = ''; ok.textContent = '';
          if (!Z.pcGeldig(f.elements.postcode.value)) { er.textContent = 'Vul een geldige postcode in.'; return; }
          G.zoek(f.elements.postcode.value).then(function (o) {
            if (!o) { er.textContent = 'Postcode niet gevonden.'; return; }
            return Z.updateProfile({ sector: f.elements.sector.value, uurtarief: f.elements.tarief.value, zichtbaar: f.elements.zichtbaar.checked, vca: f.elements.vca.checked, avb: f.elements.avb.checked, dba_model: f.elements.dba_model.checked, postcode: G.norm(f.elements.postcode.value), plaats: o.plaats, lat: o.lat, lon: o.lon }).then(function () { ok.textContent = 'Opgeslagen.'; });
          }).catch(function (x) { er.textContent = x.message; });
        });
        var lijst = h('div', { class: 'jobs' });
        root.appendChild(f); root.appendChild(h('h3', { class: 'sec', text: 'Mijn aanmeldingen' })); root.appendChild(lijst);
        root.appendChild(h('p', { style: 'margin-top:14px' }, h('a', { class: 'btn ghost', href: 'index.html#resultaten', text: 'Bekijk actieve klussen' })));
        Z.myApplications().then(function (r) {
          if (!r.length) lijst.appendChild(h('p', { class: 'note', text: 'U heeft nog niet gereageerd op een klus.' }));
          r.forEach(function (a) { var l = a.listings; lijst.appendChild(h('a', { class: 'job', href: l ? 'ilan.html?id=' + l.id : '#' }, h('h3', { text: l ? l.titel : 'Klus verwijderd' }), h('span', { class: 'meta', text: (l ? l.plaats + ' · ' + l.status + ' · ' : '') + 'verstuurd ' + datum(a.created_at) }), h('span', { class: 'rate', text: a.tarief != null ? 'Uw offerte ' + eur(a.tarief) : 'Geen bedrag opgegeven' }))); });
        });
      });
    }

    function ogPaneel() {
      var lijst = h('div', { class: 'jobs' });
      root.appendChild(h('p', null, h('a', { class: 'btn pill', href: 'plaatsen.html', text: 'Nieuwe klus plaatsen' })));
      root.appendChild(h('h3', { class: 'sec', text: 'Mijn klussen' })); root.appendChild(lijst);
      function laadLijst() {
        Z.myListings().then(function (r) {
          lijst.textContent = '';
          if (!r.length) lijst.appendChild(h('p', { class: 'note', text: 'U heeft nog geen klussen geplaatst.' }));
          r.forEach(function (l) {
            var ex = h('div', { class: 'apps' });
            lijst.appendChild(h('div', { class: 'job' }, h('div', { class: 'jt' }, h('h3', { text: l.titel }), h('span', { class: 'status ' + l.status, text: l.status })),
              h('span', { class: 'meta', text: [l.categorie, l.subklus, l.plaats, 'sluit ' + datum(l.valid_through)].filter(Boolean).join(' · ') }),
              l.budget_min ? h('span', { class: 'rate', text: 'Richtbegroting ' + eur(l.budget_min) + ' – ' + eur(l.budget_max) }) : null,
              h('div', { class: 'cta' },
                h('button', { class: 'mini', type: 'button', text: 'Aanmeldingen (' + l.aanmeldingen + ')', onclick: function () { if (ex.getAttribute('data-k') === 'a') { ex.textContent = ''; ex.removeAttribute('data-k'); return; } ex.setAttribute('data-k', 'a'); ex.textContent = ''; Z.listingApplications(l.id).then(function (a) { if (!a.length) ex.appendChild(h('p', { class: 'note', text: 'Nog geen aanmeldingen.' })); a.forEach(function (x) { var pr = x.profiles || {}; ex.appendChild(h('div', { class: 'app' }, h('div', { class: 'jt' }, h('b', { text: (pr.naam || '') + ' · ' + (pr.bedrijf || '') }), badge(pr.kvk_geverifieerd)), trust(pr), h('span', { class: 'meta', text: 'KvK ' + (pr.kvk || '') + ' · ' + (x.tarief != null ? 'offerte ' + eur(x.tarief) : 'geen bedrag') }), h('p', { class: 'bericht', text: x.bericht }), h('a', { href: 'mailto:' + x.contact_email, text: x.contact_email }))); }); }).catch(function (e) { ex.appendChild(msg('err', e.message)); }); } }),
                h('button', { class: 'mini', type: 'button', text: 'Bewerken', onclick: function () { if (ex.getAttribute('data-k') === 'e') { ex.textContent = ''; ex.removeAttribute('data-k'); return; } ex.setAttribute('data-k', 'e'); ex.textContent = '';
                  var er = msg('err'), f = h('form', { class: 'app', novalidate: 'novalidate' }, veld('Titel', 'titel', { value: l.titel, maxlength: '100' }), veld('Sluitingsdatum', 'tot', { type: 'date', value: l.valid_through }), h('label', null, 'Omschrijving', h('textarea', { name: 'om', text: l.omschrijving })), er, h('button', { class: 'btn pill', type: 'submit', text: 'Opslaan' }));
                  f.addEventListener('submit', function (e) { e.preventDefault(); Z.updateListing(l.id, { titel: f.elements.titel.value, valid_through: f.elements.tot.value, omschrijving: f.elements.om.value }).then(laadLijst).catch(function (x) { er.textContent = x.message; }); }); ex.appendChild(f); } }),
                h('button', { class: 'mini', type: 'button', text: l.status === 'open' ? 'Sluiten' : 'Heropenen', onclick: function () { Z.updateListing(l.id, { status: l.status === 'open' ? 'gesloten' : 'open' }).then(laadLijst); } }),
                h('a', { class: 'mini', href: 'ilan.html?id=' + l.id, text: 'Bekijken' })), ex));
          });
        }).catch(function (e) { lijst.appendChild(msg('err', e.message)); });
      }
      laadLijst();
    }
    paneel();
  }

  var fn = { home: home, ilan: ilan, account: account }[page]; if (fn) fn();
})();
