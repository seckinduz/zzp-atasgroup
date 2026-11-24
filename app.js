(function () {
  'use strict';
  var Z = window.ZZP, SITE = 'https://zzp.atasgroup.nl', REMOTE_REGIO = 'Landelijk / Op afstand';
  var $ = function (i) { return document.getElementById(i); };
  function h(tag, a) {
    var e = document.createElement(tag); a = a || {};
    Object.keys(a).forEach(function (k) { if (k === 'class') e.className = a[k]; else if (k === 'text') e.textContent = a[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), a[k]); else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k]); });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; if (Array.isArray(c)) { c.forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); continue; } e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return e;
  }
  var eur = function (x) { return x == null ? '—' : '€ ' + Number(x).toLocaleString('nl-NL', { maximumFractionDigits: 0 }); };
  var eur2 = function (x) { return '€ ' + Number(x).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var datum = function (s) { return s ? new Date(s).toLocaleDateString('nl-NL') : ''; };
  var werkP = null;
  function loadWerk() { if (!werkP) werkP = fetch('werk.json').then(function (r) { if (!r.ok) throw new Error('werk.json'); return r.json(); }); return werkP; }

  var rateTxt = function (j) { return j.rate_value == null ? 'Tarief in overleg' : (j.rate_type === 'uur' ? eur(j.rate_value) + ' / uur excl. btw' : 'Richtprijs ' + eur(j.rate_value) + ' excl. btw'); };
  var isSpoed = function (j) { return /spoed/i.test(j.duration || ''); };
  var hasDba = function (j) { return /Wet DBA-controle bevestigd/i.test(j.description || ''); };

  // KvK-label: verschijnt zodra het profiel een geldig KvK-nummer van 8 cijfers heeft
  function badge(p) {
    var ok = !!p && /^[0-9]{8}$/.test(p.kvk_number || '') && !/^0+$/.test(p.kvk_number);
    return h('span', { class: 'kvkbadge ' + (ok ? 'v' : 'p'), title: ok ? 'Geldig KvK-nummer van 8 cijfers ingevuld' : 'Geen geldig KvK-nummer' },
      h('span', { class: 'coin', 'aria-hidden': 'true' }, ok ? '✓' : '!'), h('span', { text: ok ? 'KvK Gecontroleerd' : 'KvK ontbreekt' }));
  }
  function trust(p) {
    var b = (p && p.badges) || {}, w = h('span', { class: 'trustrow' });
    [['vca', 'VCA Veiligheid'], ['avb', 'AVB Verzekering'], ['dba', 'Wet DBA Modelovereenkomst']].forEach(function (x) {
      if (b[x[0]]) w.appendChild(h('span', { class: 'tchip p', title: 'Zelf verklaard door het lid' }, h('span', { class: 'coin', 'aria-hidden': 'true' }, '✓'), x[1] + ' · verklaard'));
    });
    return w.childNodes.length ? w : null;
  }
  var naam = function (p) { return p ? (p.company_name || p.full_name) : ''; };

  function jobPosting(j) {
    var p = j.profiles || {}, esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var remote = j.region === REMOTE_REGIO, prov = (j.region || '').replace(/\s*\(.*\)/, '');
    var o = { '@context': 'https://schema.org', '@type': 'JobPosting', title: j.title,
      description: '<p>' + esc([j.category + ' · ' + j.subcategory, j.duration, rateTxt(j)].filter(Boolean).join(' | ')) + '</p>' + (j.description || '').split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''),
      datePosted: (j.created_at || '').slice(0, 10), employmentType: 'CONTRACTOR',
      hiringOrganization: { '@type': 'Organization', name: naam(p), identifier: { '@type': 'PropertyValue', name: 'KvK-nummer', value: p.kvk_number } },
      directApply: true, url: SITE + '/ilan.html?id=' + j.id };
    if (remote) { o.jobLocationType = 'TELECOMMUTE'; o.applicantLocationRequirements = { '@type': 'Country', name: 'NL' }; }
    else o.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.region === 'Drenthe (Emmen)' ? 'Emmen' : prov, addressRegion: prov, addressCountry: 'NL' } };
    if (j.rate_type === 'uur' && j.rate_value != null) o.baseSalary = { '@type': 'MonetaryAmount', currency: 'EUR', value: { '@type': 'QuantitativeValue', value: Number(j.rate_value), unitText: 'HOUR' } };
    return o;
  }
  window.ZUI = { h: h, eur: eur, datum: datum, badge: badge, trust: trust, loadWerk: loadWerk, $: $, rateTxt: rateTxt, naam: naam, REMOTE_REGIO: REMOTE_REGIO };

  /* ---------------- gebruikersmenu (avatar) ---------------- */
  var initials = function (n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join(''); };
  function userMenu() {
    var link = $('nav-account'); if (!link) return;
    var old = document.querySelector('.umenu'); if (old) old.remove();
    Promise.all([Z.session(), Z.me()]).then(function (r) {
      var s = r[0], m = r[1]; if (!s) { link.hidden = false; return; }
      link.hidden = true;
      var md = (s.user && s.user.user_metadata) || {}, p = m && m.profile, naam0 = (p && p.full_name) || md.full_name || md.name || (s.user && s.user.email) || 'Account';
      var role = p && p.role, rl = role === 'zzp' ? 'ZZP\'er' : role === 'opdrachtgever' ? 'Opdrachtgever' : '', foto = md.avatar_url || md.picture;
      var av = h('span', { class: 'uav', 'aria-hidden': 'true' }, initials(naam0));
      if (foto) { var im = h('img', { src: foto, alt: '', referrerpolicy: 'no-referrer', width: '36', height: '36' }); im.addEventListener('error', function () { im.remove(); }); av.textContent = ''; av.appendChild(im); av.appendChild(h('span', { class: 'ini' }, initials(naam0))); }
      var dash = 'dashboard.html?tab=overzicht';
      var menu = h('div', { class: 'umenu-list', role: 'menu', hidden: 'hidden' },
        h('div', { class: 'umenu-head' }, h('b', { text: naam0 }), rl && h('span', { class: 'urole', text: rl }), h('small', { text: s.user && s.user.email })),
        h('a', { role: 'menuitem', href: dash, text: 'Mijn Dashboard' }), h('a', { role: 'menuitem', href: 'dashboard.html?tab=profiel', text: 'Profiel & KvK bewerken' }),
        h('button', { role: 'menuitem', type: 'button', text: 'Uitloggen', onclick: function () { Z.signOut().then(function () { location.href = 'index.html'; }); } }));
      var btn = h('button', { type: 'button', class: 'ubtn', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': 'Gebruikersmenu van ' + naam0 }, av, h('span', { class: 'uname' }, h('b', { text: naam0.split(' ')[0] }), rl && h('i', { text: rl })));
      var wrap = h('div', { class: 'umenu' }, btn, menu);
      function sluit() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
      btn.addEventListener('click', function (e) { e.stopPropagation(); var o = menu.hidden; menu.hidden = !o; btn.setAttribute('aria-expanded', o); });
      document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) sluit(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluit(); });
      link.parentNode.insertBefore(wrap, link.nextSibling);
    }).catch(function () { });
  }
  userMenu();
  window.addEventListener('storage', function (e) { if (e.key === 'zzp_sb' || e.key === 'zzp_demo_session') userMenu(); });

  var page = document.body.getAttribute('data-page');
  var matchRegio = function (sel, r) { return !sel || r === sel || r === REMOTE_REGIO; };

  /* ---------------- HOME ---------------- */
  function home() {
    var mode = 'opdracht', data = { opdracht: null, zzp: null }, uit = $('uitslag'), tel = $('telling');
    loadWerk().then(function (W) {
      W.categorieen.forEach(function (c) { $('f-cat').appendChild(h('option', { value: c.naam, text: c.naam })); });
      W.regios.forEach(function (r) { $('f-regio').appendChild(h('option', { value: r, text: r })); });
      var rc = $('regio'); rc.textContent = ''; W.regios.forEach(function (r) { rc.appendChild(h('button', { type: 'button', class: 'rchip', 'aria-pressed': 'false', text: r, onclick: function () { $('f-regio').value = r; sync(); render(); } })); });
      function sync() { Array.prototype.forEach.call(rc.children, function (b) { b.setAttribute('aria-pressed', b.textContent === $('f-regio').value); }); }
      $('f-regio').addEventListener('input', sync);
    });
    function zet(m) {
      mode = m; $('p-zoek').setAttribute('aria-pressed', m === 'zzp'); $('p-ben').setAttribute('aria-pressed', m === 'opdracht');
      $('res-titel').textContent = m === 'opdracht' ? 'Actuele klussen en opdrachten' : 'ZZP\'ers in uw regio'; laad();
    }
    function laad() {
      if (data[mode]) return render(); uit.textContent = 'Laden…';
      (mode === 'opdracht' ? Z.listJobs() : Z.listZzps()).then(function (r) { data[mode] = r; render(); }).catch(function (e) { uit.textContent = ''; uit.appendChild(h('p', { class: 'note', text: /database|toegang/i.test(e.message) ? 'De klussen kunnen op dit moment niet worden geladen. Probeer het later opnieuw.' : e.message })); tel.textContent = ''; });
    }
    function render() {
      if (!data[mode]) return;
      var cat = $('f-cat').value, reg = $('f-regio').value, q = $('f-q').value.trim().toLowerCase(), spoed = $('f-spoed').checked;
      var l = data[mode].filter(function (x) {
        if (cat && x.category !== cat) return false;
        if (!matchRegio(reg, x.region)) return false;
        if (mode === 'opdracht' && spoed && !isSpoed(x)) return false;
        if (q && ((x.title || '') + ' ' + (x.subcategory || '') + ' ' + (x.description || '') + ' ' + naam(x.profiles || x) + ' ' + (x.category || '') + ' ' + (x.bio || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      uit.textContent = ''; tel.textContent = l.length + ' resultaat' + (l.length === 1 ? '' : 'en') + (reg ? ' in ' + reg : ' in heel Nederland');
      if (!l.length) { uit.appendChild(h('p', { class: 'note', text: mode === 'opdracht' ? 'Geen klussen gevonden. Kies een andere regio of plaats zelf een klus.' : 'Geen ZZP\'ers gevonden. Kies een andere regio of categorie.' })); return; }
      l.forEach(function (x) {
        if (mode === 'opdracht') uit.appendChild(h('a', { class: 'job', href: 'ilan.html?id=' + encodeURIComponent(x.id) },
          h('div', { class: 'jt' }, h('h3', { text: x.title }), badge(x.profiles)),
          h('div', { class: 'chips' }, h('span', { class: 'chip', text: x.category }), x.subcategory && h('span', { class: 'chip', text: x.subcategory }), isSpoed(x) && h('span', { class: 'chip sp', text: 'Spoed 48 uur' }), hasDba(x) && h('span', { class: 'chip', text: 'Wet DBA ✓' })),
          h('span', { class: 'meta', text: [naam(x.profiles), x.region, x.duration].filter(Boolean).join(' · ') }),
          h('span', { class: 'rate', text: rateTxt(x) }),
          h('span', { class: 'kvk', text: x.profiles && x.profiles.kvk_number ? 'KvK ' + x.profiles.kvk_number : '' })));
        else uit.appendChild(h('article', { class: 'job' },
          h('div', { class: 'jt' }, h('h3', { text: naam(x) }), badge(x)),
          h('span', { class: 'meta', text: [x.category, x.region].filter(Boolean).join(' · ') }),
          x.hourly_rate != null && h('span', { class: 'rate', text: eur(x.hourly_rate) + ' / uur excl. btw' }),
          x.bio ? h('span', { class: 'meta', text: x.bio.length > 140 ? x.bio.slice(0, 140) + '…' : x.bio }) : null, trust(x), h('span', { class: 'kvk', text: 'KvK ' + x.kvk_number })));
      });
    }
    $('p-zoek').addEventListener('click', function () { zet('zzp'); });
    $('p-ben').addEventListener('click', function () { zet('opdracht'); });
    ['f-cat', 'f-regio', 'f-spoed'].forEach(function (i) { $(i).addEventListener('input', render); });
    $('f-q').addEventListener('input', render); $('zoekform').addEventListener('submit', function (e) { e.preventDefault(); });
    zet('opdracht'); calculator();
  }

  /* ---------------- ZZP Uurtarief Calculator ---------------- */
  function calculator() {
    var f = $('calc'); if (!f) return;
    function num(n) { var v = parseFloat(String(f.elements[n].value).replace(',', '.')); return isNaN(v) ? 0 : v; }
    function run() {
      var net = num('netto'), uren = num('uren'), vak = num('vakantie'), ziek = num('ziek'), kosten = num('kosten'), verz = num('verzekering'), bel = Math.min(60, Math.max(0, num('belasting'))) / 100;
      var weken = Math.max(1, 52 - vak - ziek), uJaar = uren * weken, uit = $('calc-uit'); uit.textContent = '';
      if (uJaar <= 0 || net <= 0) { uit.appendChild(h('p', { class: 'note', text: 'Vul uw netto doelinkomen en uren in.' })); return; }
      var bruto = net * 12 / (1 - bel), omzet = bruto + (kosten + verz) * 12, tarief = omzet / uJaar;
      uit.appendChild(h('div', { class: 'budget' }, h('small', { text: 'Aanbevolen uurtarief (excl. btw)' }), h('span', { class: 'big' }, h('em', { text: eur2(tarief) })),
        h('ul', null, h('li', { text: 'Dagtarief (8 uur): ' + eur(tarief * 8) }), h('li', { text: 'Uurtarief incl. 21% btw: ' + eur2(tarief * 1.21) }), h('li', { text: 'Benodigde jaaromzet: ' + eur(omzet) }), h('li', { text: 'Declarabele uren per jaar: ' + Math.round(uJaar).toLocaleString('nl-NL') + ' (' + weken + ' werkweken)' })),
        h('small', { text: 'Indicatie. Zelfstandigenaftrek, MKB-winstvrijstelling en btw zijn niet meegerekend; dit is geen belastingadvies.' })));
    }
    f.addEventListener('input', run); f.addEventListener('submit', function (e) { e.preventDefault(); run(); }); run();
  }

  /* ---------------- ILAN ---------------- */
  function ilan() {
    var id = new URLSearchParams(location.search).get('id'), box = $('ilan');
    Z.getJob(id).then(function (j) {
      if (!j) { box.appendChild(h('p', { class: 'note', text: 'Deze klus bestaat niet of is gesloten.' })); return; }
      document.title = j.title + ' in ' + j.region + ' | ATAS ZZP';
      var ld = h('script', { type: 'application/ld+json' }); ld.textContent = JSON.stringify(jobPosting(j)).replace(/</g, '\\u003c'); document.head.appendChild(ld);
      var p = j.profiles || {}, dl = h('dl');
      [['Opdrachtgever', naam(p)], ['KvK-nummer', p.kvk_number], ['Categorie', j.category], ['Soort klus', j.subcategory], ['Regio', j.region], ['Omvang en duur', j.duration], ['Tarief', rateTxt(j)], ['Geplaatst', datum(j.created_at)]]
        .forEach(function (r) { if (r[1]) { dl.appendChild(h('dt', { text: r[0] })); dl.appendChild(h('dd', { text: r[1] })); } });
      box.appendChild(h('div', { class: 'article' }, h('div', { class: 'jt' }, h('h1', { text: j.title }), badge(p)), trust(p), dl,
        h('p', null, h('a', { class: 'btn ghost', href: 'werkplan.html?id=' + j.id, text: 'Download werkplan en begroting (PDF)' })),
        h('div', { class: 'desc' }, (j.description || '').split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return h('p', { text: x }); })),
        h('p', { class: 'hint', text: 'Richtprijzen zijn een indicatie en geen offerte. ZZP\'ers reageren met hun eigen bedrag.' })));
      var ap = $('apply'); ap.textContent = '';
      Z.me().then(function (m) {
        if (j.status !== 'open') return ap.appendChild(h('p', { class: 'note', text: 'Deze klus is gesloten.' }));
        if (!m) return ap.appendChild(h('p', { class: 'note' }, 'Wilt u reageren? ', h('a', { href: 'account.html?terug=' + encodeURIComponent('ilan.html?id=' + j.id), class: 'back', text: 'Log in of registreer als ZZP\'er' }), ' (KvK-nummer verplicht).'));
        if (m.profile.role !== 'zzp') return ap.appendChild(h('p', { class: 'note', text: 'Alleen ZZP-accounts kunnen reageren.' }));
        var er = h('p', { class: 'err', role: 'alert' }), ok = h('p', { class: 'okmsg', role: 'status' });
        var f = h('form', { class: 'formbox', novalidate: 'novalidate' }, h('h3', { text: 'Reageer met één klik' }),
          h('label', null, 'Uw bericht', h('textarea', { name: 'bericht', required: 'required', maxlength: '2000', text: 'Beste ' + naam(p) + ',\n\nIk reageer graag op uw klus. Mijn KvK-nummer is ' + m.profile.kvk_number + '.\n\nMet vriendelijke groet,\n' + m.profile.full_name })),
          h('div', { class: 'row2' }, h('label', null, 'Uw bod (€ excl. btw)', h('input', { type: 'number', name: 'tarief', min: '0', step: '10', inputmode: 'numeric' })), h('label', null, 'Contact e-mailadres', h('input', { type: 'email', name: 'email', required: 'required', value: m.user.email }))),
          er, ok, h('button', { class: 'btn pill', type: 'submit', text: 'Verstuur aanmelding' }));
        f.addEventListener('submit', function (e) { e.preventDefault(); er.textContent = ''; var b = f.querySelector('button'); b.disabled = true;
          Z.apply(j.id, { message: f.elements.bericht.value, proposed_rate: f.elements.tarief.value, email: f.elements.email.value }).then(function () { ok.textContent = 'Uw aanmelding is verstuurd. U vindt hem terug in uw paneel.'; }).catch(function (x) { er.textContent = x.message; b.disabled = false; }); });
        ap.appendChild(f);
      });
    }).catch(function (e) { box.appendChild(h('p', { class: 'note', text: e.message })); });
  }

  /* ---------------- ACCOUNT ---------------- */
  function account() {
    var root = $('acc'), terug = new URLSearchParams(location.search).get('terug'), isDash = page === 'dashboard';
    var msg = function (cls, t) { return h('p', { class: cls, role: cls === 'err' ? 'alert' : 'status', text: t || '' }); };
    function veld(lbl, name, attrs) { return h('label', null, lbl, h('input', Object.assign({ name: name }, attrs || {}))); }
    function sel(name, val, lijst, leegTxt) { var s = h('select', { name: name }); s.appendChild(h('option', { value: '', text: leegTxt })); lijst.forEach(function (c) { s.appendChild(h('option', { value: c, text: c })); }); s.value = val || ''; return s; }
    var go = function () { if (terug && /^[a-z-]+\.html/.test(terug)) location.href = terug; else location.href = 'dashboard.html'; };
    var badgeBoxes = function (b) {
      b = b || {};
      return h('div', { class: 'fgrid', style: 'gap:2px' }, h('span', { class: 'hint', style: 'font-weight:700' }, 'Zekerheid (optioneel, zelf verklaard)'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'vca', checked: b.vca ? 'checked' : false }), 'Ik heb een VCA-certificaat'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'avb', checked: b.avb ? 'checked' : false }), 'Ik heb een AVB-bedrijfsaansprakelijkheidsverzekering'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'dba', checked: b.dba ? 'checked' : false }), 'Ik werk met een Modelovereenkomst (Wet DBA)'));
    };

    function gast() {
      root.textContent = ''; var role = 'opdrachtgever', tab = 'login';
      var tabs = h('div', { class: 'tabs', role: 'tablist' }), body = h('div', { class: 'formbox' });
      var gerr = h('p', { class: 'err', role: 'alert' });
      root.appendChild(h('div', { class: 'formbox gbox' },
        h('button', { type: 'button', class: 'gbtn', onclick: function () { gerr.textContent = ''; Z.googleSignIn().catch(function (e) { gerr.textContent = e.message; }); } }, h('img', { src: 'google-g.svg', alt: '', width: '20', height: '20' }), h('span', { text: 'Doorgaan met Google' })),
        gerr, h('p', { class: 'hint divider', text: 'of ga verder met e-mail' })));
      loadWerk().then(function (W) {
        var cats = W.categorieen.map(function (c) { return c.naam; });
        function bouw() {
          tabs.textContent = ''; body.textContent = '';
          [['login', 'Inloggen'], ['opdrachtgever', 'Opdrachtgever'], ['zzp', 'ZZP\'er']].forEach(function (t) {
            tabs.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': (tab === 'login' ? 'login' : role) === t[0], text: t[0] === 'login' ? t[1] : 'Registreren: ' + t[1], onclick: function () { if (t[0] === 'login') tab = 'login'; else { tab = 'reg'; role = t[0]; } bouw(); } }));
          });
          var er = msg('err'), f;
          if (tab === 'login') {
            f = h('form', { novalidate: 'novalidate' }, veld('E-mailadres', 'email', { type: 'email', required: 'required', autocomplete: 'email' }), veld('Wachtwoord', 'pw', { type: 'password', required: 'required', autocomplete: 'current-password' }), er, h('button', { class: 'btn pill', type: 'submit', text: 'Inloggen' }));
            f.addEventListener('submit', function (e) { e.preventDefault(); Z.signIn(f.elements.email.value, f.elements.pw.value).then(go).catch(function (x) { er.textContent = x.message; }); });
          } else {
            var z = role === 'zzp', oke = msg('okmsg');
            f = h('form', { novalidate: 'novalidate' },
              h('p', { class: 'hint', text: z ? 'Voor ZZP\'ers: uw onderneming, KvK-nummer, vakgebied en regio.' : 'Voor opdrachtgevers: een geldig KvK-nummer is verplicht om klussen te plaatsen.' }),
              h('div', { class: 'row2' }, veld('Bedrijfsnaam', 'company_name', { required: 'required', maxlength: '80', autocomplete: 'organization' }), veld('KvK-nummer (8 cijfers)', 'kvk_number', { required: 'required', inputmode: 'numeric', maxlength: '8', placeholder: '12345678', autocomplete: 'off' })),
              h('div', { class: 'row2' }, veld('Uw naam', 'full_name', { required: 'required', autocomplete: 'name' }), veld('E-mailadres', 'email', { type: 'email', required: 'required', autocomplete: 'email' })),
              veld('Wachtwoord (minimaal 8 tekens)', 'pw', { type: 'password', required: 'required', minlength: '8', autocomplete: 'new-password' }),
              z && h('div', { class: 'row2' }, h('label', null, 'Vakgebied', sel('category', '', cats, 'Kies een categorie')), h('label', null, 'Regio', sel('region', '', W.regios, 'Kies een regio'))),
              z && veld('Uurtarief (€ excl. btw, optioneel)', 'hourly_rate', { type: 'number', min: '0', max: '1000', step: '1', inputmode: 'numeric' }),
              z && h('label', null, 'Korte omschrijving (optioneel)', h('textarea', { name: 'bio', maxlength: '600', style: 'min-height:80px' })),
              z && badgeBoxes(),
              z && h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'zicht', required: 'required' }), 'Ik begrijp dat mijn profiel (bedrijfsnaam, vakgebied, regio, tarief, KvK) zichtbaar is in het ZZP-overzicht.'),
              h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'ok', required: 'required' }), h('span', null, 'Ik ga akkoord met de ', h('a', { href: 'voorwaarden.html', target: '_blank', rel: 'noopener', text: 'voorwaarden en privacyverklaring' }), '.')),
              er, oke, h('button', { class: 'btn pill', type: 'submit', text: 'Account aanmaken' }));
            f.addEventListener('submit', function (e) {
              e.preventDefault(); er.textContent = ''; var q = f.elements; q.kvk_number.value = q.kvk_number.value.replace(/\s+/g, '');
              if (!Z.kvkGeldig(q.kvk_number.value)) { er.textContent = 'Een geldig KvK-nummer van precies 8 cijfers is verplicht.'; q.kvk_number.focus(); return; }
              if (!q.ok.checked) { er.textContent = 'Ga akkoord met de voorwaarden om door te gaan.'; return; }
              if (z && !q.zicht.checked) { er.textContent = 'Bevestig dat uw profiel zichtbaar mag zijn.'; return; }
              if (z && (!q.category.value || !q.region.value)) { er.textContent = 'Kies uw vakgebied en regio.'; return; }
              Z.signUp({ role: role, company_name: q.company_name.value, kvk_number: q.kvk_number.value, full_name: q.full_name.value, email: q.email.value, password: q.pw.value,
                category: z ? q.category.value : null, region: z ? q.region.value : null, hourly_rate: z ? q.hourly_rate.value : null, bio: z ? q.bio.value : '', badges: z ? { vca: q.vca.checked, avb: q.avb.checked, dba: q.dba.checked } : {} })
                .then(function (r) { if (r && r.needsConfirm) oke.textContent = 'Account aangemaakt. Bevestig uw e-mailadres via de link in uw inbox en log daarna in.'; else go(); })
                .catch(function (x) { er.textContent = x.message; });
            });
          }
          body.appendChild(f);
        }
        root.appendChild(tabs); root.appendChild(body); bouw();
      });
    }

    function kop(m) {
      return h('div', { class: 'dashhead' }, h('div', null, h('p', { class: 'eyebrow', text: m.profile.role === 'zzp' ? 'ZZP-paneel' : 'Paneel opdrachtgever' }), h('h2', { class: 'dh', text: naam(m.profile) }), h('p', { class: 'hint', text: 'KvK ' + m.profile.kvk_number + ' · ' + m.user.email })),
        h('div', { class: 'dhr' }, badge(m.profile), trust(m.profile), h('button', { class: 'mini', type: 'button', text: 'Uitloggen', onclick: function () { Z.signOut().then(function () { location.href = 'account.html'; }); } })));
    }
    function paneel() { Z.session().then(function (s) { if (s) { location.replace('dashboard.html?tab=overzicht'); return; } gast(); }); }
    paneel();
  }

  /* ---------------- Profiel voltooien (niet te sluiten) ---------------- */
  function profielModal(sess, raw) {
    raw = raw || {}; var md = (sess.user && sess.user.user_metadata) || {}, role = raw.role || '', er = h('p', { class: 'err', role: 'alert' });
    var ov = h('div', { class: 'mdl-ov' }), box = h('div', { class: 'mdl', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mdl-t' });
    var roleRow = h('div', { class: 'pillrow', role: 'group', 'aria-label': 'Ik ben' });
    var rate = h('label', { hidden: role === 'zzp' ? false : 'hidden' }, 'Uurtarief (€ excl. btw)', h('input', { name: 'hourly_rate', type: 'number', min: '0', max: '1000', step: '1', inputmode: 'numeric', value: raw.hourly_rate != null ? raw.hourly_rate : '' }));
    [['zzp', 'ZZP\'er'], ['opdrachtgever', 'Opdrachtgever']].forEach(function (r) {
      roleRow.appendChild(h('button', { type: 'button', 'aria-pressed': role === r[0], text: r[1], onclick: function (e) { role = r[0]; Array.prototype.forEach.call(roleRow.children, function (b) { b.setAttribute('aria-pressed', b === e.target); }); rate.hidden = role !== 'zzp'; } }));
    });
    var f = h('form', { novalidate: 'novalidate' }, h('div', null, h('span', { class: 'hint', style: 'font-weight:700' }, 'Ik ben'), roleRow),
      h('div', { class: 'row2' }, h('label', null, 'Naam', h('input', { name: 'full_name', value: raw.full_name || md.full_name || md.name || '', autocomplete: 'name', required: 'required' })), h('label', null, 'Bedrijfsnaam', h('input', { name: 'company_name', value: raw.company_name || '', autocomplete: 'organization', required: 'required' }))),
      h('label', null, 'KvK-nummer (8 cijfers)', h('input', { name: 'kvk_number', value: raw.kvk_number || '', inputmode: 'numeric', maxlength: '8', placeholder: '12345678', required: 'required', autocomplete: 'off' })),
      h('div', { class: 'row2' }, h('label', null, 'Categorie', h('select', { name: 'category', required: 'required' }, h('option', { value: '', text: 'Kies een categorie' }))), h('label', null, 'Regio', h('select', { name: 'region', required: 'required' }, h('option', { value: '', text: 'Kies een regio' })))),
      rate, er, h('button', { class: 'btn pill', type: 'submit', text: 'Profiel opslaan en doorgaan' }));
    loadWerk().then(function (W) {
      W.categorieen.forEach(function (c) { f.elements.category.appendChild(h('option', { value: c.naam, text: c.naam })); }); W.regios.forEach(function (r) { f.elements.region.appendChild(h('option', { value: r, text: r })); });
      f.elements.category.value = raw.category || ''; f.elements.region.value = raw.region || '';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.textContent = ''; var q = f.elements, b = f.querySelector('button[type=submit]');
      q.kvk_number.value = q.kvk_number.value.replace(/\s+/g, ''); b.disabled = true;
      Z.saveProfile({ role: role, full_name: q.full_name.value, company_name: q.company_name.value, kvk_number: q.kvk_number.value, category: q.category.value, region: q.region.value, hourly_rate: q.hourly_rate ? q.hourly_rate.value : null })
        .then(function () { document.body.classList.remove('lock'); ov.remove(); try { sessionStorage.removeItem('zzp_just'); } catch (e) { } location.href = 'dashboard.html?tab=overzicht'; })
        .catch(function (x) { er.textContent = x.message; b.disabled = false; });
    });
    box.appendChild(h('h2', { id: 'mdl-t', text: 'Profiel voltooien' })); box.appendChild(h('p', { class: 'hint', text: 'Nog even uw gegevens aanvullen om verder te gaan. Een geldig KvK-nummer is verplicht.' })); box.appendChild(f);
    ov.appendChild(box); document.body.appendChild(ov); document.body.classList.add('lock');
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') e.preventDefault();
      if (e.key === 'Tab') { var els = box.querySelectorAll('button,input,select,textarea,a[href]'), vis = Array.prototype.filter.call(els, function (x) { return !x.disabled && x.offsetParent !== null; }), first = vis[0], last = vis[vis.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    setTimeout(function () { var i = f.elements.full_name; if (i) i.focus(); }, 50);
  }
  function toast(t) { var n = h('p', { class: 'toastmsg', role: 'alert', text: t }); document.body.appendChild(n); setTimeout(function () { n.remove(); }, 9000); }
  if (Z.mode === 'supabase') {
    var oe = Z.takeOauthError && Z.takeOauthError(); if (oe) toast(oe);
    Z.session().then(function (s) { if (!s) return; return Z.rawProfile().then(function (r) { if (!r || !r.role || !r.kvk_number) { if (page === 'dashboard') return; return profielModal(s, r); }
      if (sessionStorage.getItem('zzp_just')) { sessionStorage.removeItem('zzp_just'); if (page !== 'dashboard') location.replace('dashboard.html?tab=overzicht'); } }); }).catch(function () { });
  }

  var fn = { home: home, ilan: ilan, account: account }[page]; if (fn) fn();
})();
