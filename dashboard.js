// Dashboard: Overzicht, Profiel & KvK bewerken, Mijn klussen / Sollicitaties, Werkplan & Tarief Tools.
// Stuurt een ingelogde gebruiker NOOIT terug naar de inlogpagina; ontbreekt het profiel, dan opent bovenaan "Profiel & KvK voltooien".
(function () {
  'use strict';
  var U = window.ZUI, Z = window.ZZP, G = window.ZZPGEO, h = U.h, $ = U.$, eur = U.eur, datum = U.datum, badge = U.badge, trust = U.trust, naam = U.naam, REMOTE = U.REMOTE_REGIO;
  var root = $('dash'), TABS = [['overzicht', 'Overzicht'], ['profiel', 'Profiel & KvK bewerken'], ['klussen', 'Mijn klussen & sollicitaties'], ['tools', 'Werkplan & Tarief Tools']];
  var matchRegio = function (sel, r) { return !sel || r === sel || r === REMOTE; };
  var msg = function (cls, t) { return h('p', { class: cls, role: cls === 'err' ? 'alert' : 'status', text: t || '' }); };
  var initials = function (n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join(''); };
  var STATUS = { pending: ['In behandeling', ''], accepted: ['Geaccepteerd', 'ok'], rejected: ['Afgewezen', 'no'], declined: ['Afgewezen', 'no'], open: ['Open', 'ok'], closed: ['Gesloten', ''] };
  var schip = function (s) { var x = STATUS[s] || [s || '—', '']; return h('span', { class: 'schip ' + x[1], text: x[0] }); };
  var sel = function (name, val, lijst, leeg) { var s = h('select', { name: name }); s.appendChild(h('option', { value: '', text: leeg })); lijst.forEach(function (c) { s.appendChild(h('option', { value: c, text: c })); }); s.value = val || ''; return s; };
  var veld = function (lbl, name, attrs) { return h('label', null, lbl, h('input', Object.assign({ name: name }, attrs || {}))); };
  var telVan = function (a) { var m = /Tel:\s*([+0-9][0-9 ()-]{7,})/.exec(a.message || ''); if (!m) return ''; var n = m[1].replace(/[^0-9+]/g, '').replace(/^\+/, '').replace(/^00/, ''); return /^0/.test(n) ? '31' + n.slice(1) : n; };
  var waLink = function (a, j, pr) { var t = 'Hallo ' + (pr.full_name || '') + ', bedankt voor uw bod' + (a.proposed_rate != null ? ' van ' + eur(a.proposed_rate) : '') + ' op "' + j.title + '". Ik heb uw aanmelding geaccepteerd via ATAS ZZP. Wanneer kunnen we de details bespreken?'; return 'https://wa.me/' + telVan(a) + '?text=' + encodeURIComponent(t); };
  var contactMail = function (a) { var m = /Contact:\s*([^\s]+@[^\s]+)/.exec(a.message || ''); return m ? m[1] : ''; };
  var tab0 = (new URLSearchParams(location.search).get('tab') || 'overzicht').toLowerCase();
  if (['zzp', 'opdrachtgever'].indexOf(tab0) >= 0) tab0 = 'overzicht';
  if (['overzicht', 'profiel', 'klussen', 'tools'].indexOf(tab0) < 0) tab0 = 'overzicht';

  Promise.all([Z.session(), U.loadWerk()]).then(function (r) {
    var s = r[0], W = r[1];
    if (!s) { location.replace('account.html'); return; }          // alleen zonder echte sessie terug naar inloggen
    return Z.rawProfile().then(function (p) { start(s, p, W, ''); }, function (e) { start(s, null, W, e.message || 'Profiel kon niet worden geladen.'); });
  }).catch(function (e) { root.appendChild(msg('err', e.message || 'Het dashboard kon niet worden geladen.')); });

  function start(s, p, W, err) {
    var md = (s.user && s.user.user_metadata) || {}, st = { s: s, p: p, W: W, md: md, tab: tab0, email: (s.user && s.user.email) || '' };
    root.textContent = '';
    var complete = p && p.role && p.kvk_number;
    if (err) root.appendChild(h('div', { class: 'dcard warn' }, h('h2', { text: 'Profiel kon niet worden geladen' }), msg('err', err), h('button', { class: 'btn pill', type: 'button', text: 'Opnieuw proberen', onclick: function () { location.reload(); } })));
    if (!complete) { root.appendChild(completeCard(st)); if (!p) return; }
    if (!complete) return;
    var nav = h('nav', { class: 'dnav', 'aria-label': 'Dashboard', role: 'tablist' }), main = h('section', { class: 'dmain', 'aria-live': 'polite' });
    TABS.forEach(function (t) {
      nav.appendChild(h('button', { type: 'button', role: 'tab', class: 'dtab', 'data-t': t[0], 'aria-selected': st.tab === t[0], text: t[1], onclick: function () { show(t[0]); } }));
    });
    root.appendChild(h('div', { class: 'dash' }, nav, main));
    var ic = function (p) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); var q = document.createElementNS('http://www.w3.org/2000/svg', 'path'); q.setAttribute('d', p); s.appendChild(q); return s; };
    var qb = h('nav', { class: 'qbar', 'aria-label': 'Snelle acties' });
    [['overzicht', 'Overzicht', 'M3 11l9-7 9 7M5 10v10h14V10'], ['klussen', 'Klussen', 'M4 6h16M4 12h16M4 18h10'], ['tools', 'Tools', 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z'], ['profiel', 'Profiel', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0']].forEach(function (x) { qb.appendChild(h('button', { type: 'button', 'data-q': x[0], 'aria-current': st.tab === x[0], onclick: function () { show(x[0]); } }, ic(x[2]), x[1])); });
    qb.insertBefore(h('a', { href: 'plaatsen.html' }, ic('M12 5v14M5 12h14'), 'Nieuwe klus'), qb.children[2]); qb.removeChild(qb.children[3]);
    document.body.appendChild(qb);
    function show(t) {
      st.tab = t; try { history.replaceState(null, '', 'dashboard.html?tab=' + t); } catch (e) { }
      Array.prototype.forEach.call(nav.children, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t); }); Array.prototype.forEach.call(document.querySelectorAll('.qbar [data-q]'), function (b) { b.setAttribute('aria-current', b.getAttribute('data-q') === t); });
      main.textContent = ''; ({ overzicht: overzicht, profiel: profiel, klussen: klussen, tools: tools })[t](st, main, show);
      if (window.scrollY > 200) window.scrollTo({ top: 0, behavior: 'auto' });
    }
    st.show = show; show(st.tab);
  }

  /* ---------- Profiel & KvK voltooien (kaart bovenaan) ---------- */
  function completeCard(st) {
    var p = st.p || {}, md = st.md, role = p.role || '', er = msg('err');
    var roleRow = h('div', { class: 'pillrow', role: 'group', 'aria-label': 'Ik ben' }), rate = h('label', { hidden: role === 'zzp' ? false : 'hidden' }, 'Uurtarief (€ excl. btw)', h('input', { name: 'hourly_rate', type: 'number', min: '0', max: '1000', step: '1', inputmode: 'numeric', value: p.hourly_rate != null ? p.hourly_rate : '' }));
    [['zzp', 'ZZP\'er'], ['opdrachtgever', 'Opdrachtgever']].forEach(function (x) { roleRow.appendChild(h('button', { type: 'button', 'aria-pressed': role === x[0], text: x[1], onclick: function (e) { role = x[0]; Array.prototype.forEach.call(roleRow.children, function (b) { b.setAttribute('aria-pressed', b === e.target); }); rate.hidden = role !== 'zzp'; } })); });
    var f = h('form', { novalidate: 'novalidate' }, h('div', null, h('span', { class: 'hint', style: 'font-weight:700' }, 'Ik ben'), roleRow),
      h('div', { class: 'row2' }, veld('Naam', 'full_name', { value: p.full_name || md.full_name || md.name || '', autocomplete: 'name' }), veld('Bedrijfsnaam', 'company_name', { value: p.company_name || '', autocomplete: 'organization' })),
      veld('KvK-nummer (8 cijfers)', 'kvk_number', { value: p.kvk_number || '', inputmode: 'numeric', maxlength: '8', placeholder: '12345678', autocomplete: 'off' }),
      h('div', { class: 'row2' }, h('label', null, 'Categorie', sel('category', p.category, st.W.categorieen.map(function (c) { return c.naam; }), 'Kies een categorie')), h('label', null, 'Regio', sel('region', p.region, st.W.regios, 'Kies een regio'))),
      rate, er, h('button', { class: 'btn pill', type: 'submit', text: 'Profiel opslaan en doorgaan' }));
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.textContent = ''; var q = f.elements, b = f.querySelector('button[type=submit]'); q.kvk_number.value = q.kvk_number.value.replace(/\s+/g, ''); b.disabled = true;
      Z.saveProfile({ role: role, full_name: q.full_name.value, company_name: q.company_name.value, kvk_number: q.kvk_number.value, category: q.category.value, region: q.region.value, hourly_rate: q.hourly_rate ? q.hourly_rate.value : null })
        .then(function () { location.href = 'dashboard.html?tab=overzicht'; }).catch(function (x) { er.textContent = x.message; b.disabled = false; });
    });
    return h('div', { class: 'dcard warn', id: 'voltooien' }, h('p', { class: 'eyebrow', text: 'Eerste stap' }), h('h2', { text: 'Profiel & KvK voltooien' }), h('p', { class: 'hint', text: 'Vul uw gegevens aan om het dashboard te gebruiken. Een geldig KvK-nummer van 8 cijfers is verplicht.' }), f);
  }

  /* ---------- 1. Overzicht ---------- */
  function overzicht(st, main, show) {
    var p = st.p, zzp = p.role === 'zzp', foto = st.md.avatar_url || st.md.picture;
    var av = h('span', { class: 'bigav' }, initials(p.full_name || naam(p)));
    if (foto) { var im = h('img', { src: foto, alt: '', referrerpolicy: 'no-referrer', width: '72', height: '72' }); im.addEventListener('error', function () { im.remove(); }); av.textContent = ''; av.appendChild(im); }
    main.appendChild(h('div', { class: 'dcard pcard' }, av, h('div', { class: 'pinfo' }, h('h2', { text: p.full_name || naam(p) }), h('p', { class: 'meta', text: naam(p) + ' · KvK ' + p.kvk_number }),
      h('div', { class: 'trustrow' }, h('span', { class: 'urole', text: zzp ? 'ZZP\'er' : 'Opdrachtgever' }), badge(p), trust(p))), h('button', { class: 'mini', type: 'button', text: 'Profiel bewerken', onclick: function () { show('profiel'); } })));
    var st3 = h('div', { class: 'stats' }); main.appendChild(st3);
    var box = function (lbl, val, sub) { var v = h('b', { class: 'sv', text: val }); st3.appendChild(h('div', { class: 'sbox' }, h('small', { text: lbl }), v, h('span', { class: 'ss', text: sub || '' }))); return v; };
    var b1 = box('Actieve klussen', '…', zzp ? 'in uw regio' : 'van u online'), b2 = box('Sollicitaties', '…', zzp ? 'door u verstuurd' : 'ontvangen'), b3 = box('Regio & uurtarief', p.region || '—', zzp ? (p.hourly_rate != null ? eur(p.hourly_rate) + ' / uur excl. btw' : 'Uurtarief niet ingevuld') : (p.category || ''));
    if (zzp) Promise.all([Z.listJobs(), Z.myApplications()]).then(function (r) { b1.textContent = r[0].filter(function (j) { return matchRegio(p.region, j.region); }).length; b2.textContent = r[1].length; }).catch(function () { b1.textContent = '—'; b2.textContent = '—'; });
    else Z.myJobs().then(function (js) { b1.textContent = js.filter(function (j) { return j.status === 'open'; }).length; b2.textContent = js.reduce(function (a, j) { return a + (j.aanmeldingen || 0); }, 0); }).catch(function () { b1.textContent = '—'; b2.textContent = '—'; });
    main.appendChild(h('div', { class: 'cta' }, zzp ? h('button', { class: 'btn pill', type: 'button', text: 'Klussen in uw regio bekijken', onclick: function () { show('klussen'); } }) : h('a', { class: 'btn pill', href: 'plaatsen.html', text: 'Nieuwe klus plaatsen' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Werkplan & Tarief Tools', onclick: function () { show('tools'); } })));
  }

  /* ---------- 2. Profiel & KvK bewerken ---------- */
  function profiel(st, main, show) {
    var p = st.p, W = st.W, role = p.role, er = msg('err'), ok = msg('okmsg'), ex = p.extra || {}, b = p.badges || {};
    var roleRow = h('div', { class: 'pillrow', role: 'group', 'aria-label': 'Rol' }), rate = h('label', { hidden: role === 'zzp' ? false : 'hidden' }, 'Uurtarief (€ excl. btw)', h('input', { name: 'hourly_rate', type: 'number', min: '0', max: '1000', step: '1', inputmode: 'numeric', value: p.hourly_rate != null ? p.hourly_rate : '' }));
    [['zzp', 'ZZP\'er'], ['opdrachtgever', 'Opdrachtgever']].forEach(function (x) { roleRow.appendChild(h('button', { type: 'button', 'aria-pressed': role === x[0], text: x[1], onclick: function (e) { role = x[0]; Array.prototype.forEach.call(roleRow.children, function (bb) { bb.setAttribute('aria-pressed', bb === e.target); }); rate.hidden = role !== 'zzp'; } })); });
    var cat = sel('category', p.category, W.categorieen.map(function (c) { return c.naam; }), 'Kies een categorie'), sub = h('select', { name: 'sub' });
    function fillSub() { sub.textContent = ''; sub.appendChild(h('option', { value: '', text: 'Kies een soort werk' })); var c = W.categorieen.filter(function (x) { return x.naam === cat.value; })[0]; if (c) c.subs.forEach(function (x) { sub.appendChild(h('option', { value: x.naam, text: x.naam })); }); sub.value = ex.sub || ''; }
    cat.addEventListener('input', function () { ex.sub = ''; fillSub(); }); fillSub();
    var chk = function (n, t, v) { return h('label', { class: 'check' }, h('input', { type: 'checkbox', name: n, checked: v ? 'checked' : false }), t); };
    var f = h('form', { class: 'dcard', id: 'profiel', novalidate: 'novalidate' }, h('h2', { text: 'Profiel & KvK bewerken' }),
      h('div', null, h('span', { class: 'hint', style: 'font-weight:700' }, 'Rol'), roleRow),
      h('div', { class: 'row2' }, veld('Naam', 'full_name', { value: p.full_name || '' }), veld('Bedrijfsnaam', 'company_name', { value: p.company_name || '' })),
      h('div', { class: 'row2' }, veld('KvK-nummer (8 cijfers)', 'kvk_number', { value: p.kvk_number || '', maxlength: '8', inputmode: 'numeric' }), veld('BTW-nummer (optioneel)', 'btw', { value: ex.btw || '', placeholder: 'NL123456789B01', maxlength: '14', autocapitalize: 'characters' })),
      h('div', { class: 'row2' }, h('label', null, 'Hoofdcategorie', cat), h('label', null, 'Soort werk', sub)),
      h('div', { class: 'row2' }, h('label', null, 'Regio', sel('region', p.region, W.regios, 'Kies een regio')), veld('Postcode', 'pc', { value: ex.pc || '', maxlength: '7', placeholder: '7811 AB', autocomplete: 'postal-code' })),
      rate,
      h('div', { class: 'fgrid', style: 'gap:2px' }, h('span', { class: 'hint', style: 'font-weight:700' }, 'Zekerheid (zelf verklaard)'), chk('vca', 'VCA-certificaat', b.vca), chk('avb', 'AVB-bedrijfsaansprakelijkheidsverzekering', b.avb), chk('dba', 'Modelovereenkomst (Wet DBA)', b.dba)),
      h('label', null, 'Korte introductie (bio)', h('textarea', { name: 'bio', maxlength: '600', style: 'min-height:90px', text: p.bio || '' })),
      er, ok, h('button', { class: 'btn pill', type: 'submit', text: 'Opslaan' }));
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.textContent = ''; ok.textContent = ''; var q = f.elements, kvk = q.kvk_number.value.replace(/\s+/g, ''), btw = q.btw.value.replace(/\s+/g, '').toUpperCase(), pc = q.pc.value.replace(/\s+/g, '').toUpperCase();
      if (!role) { er.textContent = 'Kies uw rol.'; return; }
      if (!Z.kvkGeldig(kvk)) { er.textContent = 'Een geldig KvK-nummer van precies 8 cijfers is verplicht.'; q.kvk_number.focus(); return; }
      if (btw && !/^NL[0-9]{9}B[0-9]{2}$/.test(btw)) { er.textContent = 'Een BTW-nummer ziet er zo uit: NL123456789B01.'; q.btw.focus(); return; }
      if (pc && !/^[1-9][0-9]{3}[A-Z]{2}$/.test(pc)) { er.textContent = 'Vul een geldige postcode in (bijvoorbeeld 7811 AB).'; q.pc.focus(); return; }
      if (!q.category.value || !q.region.value) { er.textContent = 'Kies een categorie en een regio.'; return; }
      var bt = f.querySelector('button[type=submit]'); bt.disabled = true;
      Z.updateProfile({ role: role, full_name: q.full_name.value, company_name: q.company_name.value, kvk_number: kvk, category: q.category.value, region: q.region.value, hourly_rate: role === 'zzp' ? q.hourly_rate.value : null,
        bio: q.bio.value, badges: { vca: q.vca.checked, avb: q.avb.checked, dba: q.dba.checked }, extra: { btw: btw, sub: q.sub.value, pc: pc } })
        .then(function () { return Z.rawProfile(); }).then(function (np) { st.p = np; ok.textContent = 'Opgeslagen.'; bt.disabled = false; })
        .catch(function (x) { er.textContent = x.message; bt.disabled = false; });
    });
    main.appendChild(f);
  }

  /* ---------- 3. Mijn klussen & sollicitaties ---------- */
  function klussen(st, main) { (st.p.role === 'zzp' ? zzpKlussen : ogKlussen)(st, main); }

  function ogKlussen(st, main) {
    var lijst = h('div', { class: 'jobs' });
    main.appendChild(h('div', { class: 'dhead' }, h('h2', { text: 'Mijn klussen' }), h('a', { class: 'btn pill', href: 'plaatsen.html', text: 'Nieuwe klus plaatsen' }))); main.appendChild(lijst);
    function laad() {
      Z.myJobs().then(function (js) {
        lijst.textContent = ''; if (!js.length) lijst.appendChild(h('p', { class: 'note', text: 'U heeft nog geen klussen geplaatst. Gebruik "Nieuwe klus plaatsen" om te starten.' }));
        js.forEach(function (j) {
          var ex = h('div', { class: 'apps' });
          lijst.appendChild(h('div', { class: 'job' }, h('div', { class: 'jt' }, h('h3', { text: j.title }), schip(j.status)), h('span', { class: 'meta', text: [j.category, j.subcategory, j.region, datum(j.created_at)].filter(Boolean).join(' · ') }), h('span', { class: 'rate', text: U.rateTxt(j) }),
            h('div', { class: 'cta' },
              h('button', { class: 'mini', type: 'button', text: 'Aanmeldingen (' + j.aanmeldingen + ')', onclick: function () { if (ex.getAttribute('data-k')) { ex.textContent = ''; ex.removeAttribute('data-k'); return; } ex.setAttribute('data-k', '1'); toonAanm(j, ex); } }),
              h('button', { class: 'mini', type: 'button', text: j.status === 'open' ? 'Sluiten' : 'Heropenen', onclick: function () { Z.updateJob(j.id, { status: j.status === 'open' ? 'closed' : 'open' }).then(laad); } }),
              h('a', { class: 'mini', href: 'ilan.html?id=' + j.id, text: 'Bekijken' }), h('a', { class: 'mini', href: 'werkplan.html?id=' + j.id, text: 'Werkplan (PDF)' })), ex));
        });
      }).catch(function (e) { lijst.textContent = ''; lijst.appendChild(msg('err', e.message)); });
    }
    function toonAanm(j, ex) {
      ex.textContent = ''; Z.jobApplications(j.id).then(function (a) {
        if (!a.length) ex.appendChild(h('p', { class: 'note', text: 'Nog geen aanmeldingen.' }));
        a.forEach(function (x) {
          var pr = x.profiles || {}, mail = contactMail(x), er = msg('err');
          var acc = h('button', { class: 'btn pill', type: 'button', text: x.status === 'accepted' ? 'Geaccepteerd ✓' : 'Accepteren', disabled: x.status === 'accepted' ? 'disabled' : false });
          acc.addEventListener('click', function () { acc.disabled = true; Z.updateApplication(x.id, { status: 'accepted' }).then(function () { toonAanm(j, ex); }).catch(function (e) { acc.disabled = false; er.textContent = e.message; }); });
          ex.appendChild(h('div', { class: 'app' }, h('div', { class: 'jt' }, h('b', { text: (pr.full_name || '') + ' · ' + (pr.company_name || '') }), schip(x.status || 'pending')), h('div', { class: 'trustrow' }, badge(pr), trust(pr)),
            h('span', { class: 'rate', text: x.proposed_rate != null ? 'Bod: ' + eur(x.proposed_rate) : 'Geen bedrag opgegeven' }), h('span', { class: 'meta', text: 'KvK ' + (pr.kvk_number || '') + ' · ' + datum(x.created_at) }), h('p', { class: 'bericht', text: x.message }),
            h('div', { class: 'cta' }, acc, x.status === 'accepted' ? h('a', { class: 'btn wa', href: waLink(x, j, pr), target: '_blank', rel: 'noopener', text: 'Contact via WhatsApp' }) : null, mail ? h('a', { class: 'btn ghost', href: 'mailto:' + mail + '?subject=' + encodeURIComponent('Uw reactie op: ' + j.title), text: 'Contact opnemen' }) : h('span', { class: 'hint', text: 'Geen e-mailadres opgegeven' })), er));
        });
      }).catch(function (e) { ex.appendChild(msg('err', e.message)); });
    }
    laad();
  }

  function zzpKlussen(st, main) {
    var p = st.p, reg = h('div', { class: 'jobs' }), mine = h('div', { class: 'jobs' });
    main.appendChild(h('div', { class: 'dhead' }, h('h2', { text: 'Klussen in uw regio' + (p.region ? ': ' + p.region : '') }))); main.appendChild(reg);
    main.appendChild(h('div', { class: 'dhead' }, h('h2', { text: 'Mijn sollicitaties' }))); main.appendChild(mine);
    function laad() {
      Promise.all([Z.listJobs(), Z.myApplications()]).then(function (r) {
        var apps = {}; r[1].forEach(function (a) { apps[a.job_id] = a; });
        var l = r[0].filter(function (j) { return matchRegio(p.region, j.region); }).sort(function (x, y) { return (y.category === p.category) - (x.category === p.category); });
        reg.textContent = ''; if (!l.length) reg.appendChild(h('p', { class: 'note', text: 'Er zijn nu geen open klussen in uw regio.' }));
        l.slice(0, 20).forEach(function (j) { reg.appendChild(bodCard(j, apps[j.id])); });
        mine.textContent = ''; if (!r[1].length) mine.appendChild(h('p', { class: 'note', text: 'U heeft nog niet gereageerd op een klus.' }));
        r[1].forEach(function (a) { var j = a.jobs; mine.appendChild(h('div', { class: 'job' }, h('div', { class: 'jt' }, h('h3', { text: j ? j.title : 'Klus verwijderd' }), schip(a.status || 'pending')), h('span', { class: 'meta', text: (j ? j.region + ' · ' : '') + 'verstuurd ' + datum(a.created_at) }), h('span', { class: 'rate', text: a.proposed_rate != null ? 'Uw bod: ' + eur(a.proposed_rate) : 'Geen bedrag opgegeven' }), j ? h('a', { class: 'mini', href: 'ilan.html?id=' + j.id, text: 'Bekijken' }) : null)); });
      }).catch(function (e) { reg.textContent = ''; reg.appendChild(msg('err', e.message)); });
    }
    function bodCard(j, app) {
      var box = h('div', { class: 'job' }), form = h('form', { class: 'app', hidden: 'hidden', novalidate: 'novalidate' }), er = msg('err');
      var typ = h('select', { name: 'typ' }, h('option', { value: 'totaalbod', text: 'Totaalbod' }), h('option', { value: 'uurtarief', text: 'Uurtarief' }));
      form.appendChild(h('div', { class: 'row2' }, h('label', null, 'Soort bod', typ), veld('Telefoon of WhatsApp (optioneel)', 'tel', { type: 'tel', autocomplete: 'tel', placeholder: '06 12345678' }), veld('Bedrag (€ excl. btw)', 'bedrag', { type: 'number', min: '0', step: '5', inputmode: 'numeric', value: p.hourly_rate != null && j.rate_type === 'uur' ? p.hourly_rate : '' })));
      form.appendChild(h('label', null, 'Bericht', h('textarea', { name: 'bericht', maxlength: '1500', text: 'Beste ' + naam(j.profiles) + ',\n\nIk reageer graag op uw klus "' + j.title + '". Mijn KvK-nummer is ' + p.kvk_number + '.\n\nMet vriendelijke groet,\n' + p.full_name })));
      form.appendChild(er); form.appendChild(h('button', { class: 'btn pill', type: 'submit', text: 'Verstuur bod' }));
      form.addEventListener('submit', function (e) {
        e.preventDefault(); er.textContent = ''; var q = form.elements; if (q.bericht.value.trim().length < 5) { er.textContent = 'Schrijf een kort bericht.'; return; }
        var b = form.querySelector('button'); b.disabled = true;
        Z.apply(j.id, { message: q.bericht.value.trim() + (q.bedrag.value ? '\n\nBod: ' + eur(Number(q.bedrag.value)) + ' (' + q.typ.value + ')' : '') + (q.tel.value.trim() ? '\n\nTel: ' + q.tel.value.trim() : ''), proposed_rate: q.bedrag.value, email: st.email }).then(laad).catch(function (x) { er.textContent = x.message; b.disabled = false; });
      });
      var toggle = app ? h('span', { class: 'okmsg', text: 'Gereageerd ✓ · ' + (STATUS[app.status || 'pending'] || [app.status])[0] }) : h('button', { class: 'btn pill', type: 'button', text: 'Bod uitbrengen', onclick: function () { form.hidden = !form.hidden; } });
      box.appendChild(h('div', { class: 'jt' }, h('h3', { text: j.title }), badge(j.profiles))); box.appendChild(h('span', { class: 'meta', text: [naam(j.profiles), j.category, j.subcategory, j.duration].filter(Boolean).join(' · ') }));
      box.appendChild(h('span', { class: 'rate', text: U.rateTxt(j) })); box.appendChild(h('div', { class: 'cta' }, toggle, h('a', { class: 'mini', href: 'ilan.html?id=' + j.id, text: 'Bekijken' }))); box.appendChild(form); return box;
    }
    laad();
  }

  /* ---------- 4. Werkplan & Tarief Tools ---------- */
  function tools(st, main) {
    var W = st.W, out = h('div', { 'aria-live': 'polite' }), cat = sel('cat', '', W.categorieen.map(function (c) { return c.naam; }), 'Kies een categorie'), sub = h('select', { name: 'sub' }, h('option', { value: '', text: 'Kies een soort klus' }));
    var n = h('input', { name: 'n', type: 'number', min: '1', step: '1', value: '100', inputmode: 'numeric' }), mat = h('input', { type: 'checkbox' });
    function cur() { var c = W.categorieen.filter(function (x) { return x.naam === cat.value; })[0]; return c && c.subs.filter(function (s) { return s.naam === sub.value; })[0]; }
    cat.addEventListener('input', function () { sub.textContent = ''; sub.appendChild(h('option', { value: '', text: 'Kies een soort klus' })); var c = W.categorieen.filter(function (x) { return x.naam === cat.value; })[0]; if (c) c.subs.forEach(function (x) { sub.appendChild(h('option', { value: x.naam, text: x.naam })); }); calc(); });
    function calc() {
      out.textContent = ''; var s = cur(); if (!s) { out.appendChild(h('p', { class: 'hint', text: 'Kies een categorie en soort klus voor een richtbegroting.' })); return; }
      var eh = s.eenheid === 'uur' ? 'uur' : 'm²', b = G.begroting(W, s, { aantal: Number(n.value) || 0, kamers: 1, materiaal: mat.checked ? 'inclusief' : 'exclusief', spoed: false });
      out.appendChild(h('div', { class: 'budget' }, h('small', { text: 'Richtbegroting voor ' + (Number(n.value) || 0) + ' ' + eh + ' (referentie 100 ' + eh + ', excl. btw)' }), h('span', { class: 'big' }, h('em', { text: eur(b.min) }), ' – ' + eur(b.max)), h('small', { text: 'Indicatie, geen offerte.' })));
    }
    [sub, n, mat].forEach(function (x) { x.addEventListener('input', calc); }); calc();
    var draft = false; try { var dd = JSON.parse(localStorage.getItem('zzp_wiz_v1')); draft = !!(dd && dd.S && dd.S.cat && dd.S.sub); } catch (e) { }
    main.appendChild(h('div', { class: 'dhead' }, h('h2', { text: 'Werkplan & Tarief Tools' })));
    main.appendChild(h('div', { class: 'tgrid' },
      h('div', { class: 'dcard' }, h('h3', { text: '100 m² budget & werkplan' }), h('div', { class: 'fgrid' }, h('label', null, 'Categorie', cat), h('label', null, 'Soort klus', sub), h('label', null, 'Oppervlak (m²) of uren', n), h('label', { class: 'check' }, mat, 'Materiaal inclusief')), out,
        h('div', { class: 'cta' }, h('a', { class: 'btn pill', href: 'plaatsen.html', text: 'Volledige wizard' }), draft ? h('a', { class: 'btn ghost', href: 'werkplan.html?draft=1', text: 'Werkplan (PDF) van uw concept' }) : null)),
      h('div', { class: 'dcard' }, h('h3', { text: 'ZZP Uurtarief Calculator' }), h('p', { class: 'hint', text: 'Bereken uw uurtarief uit netto doelinkomen, kosten, verzekeringen, vakantie en belastingreserve.' }), h('a', { class: 'btn pill', href: 'index.html#calculator', text: 'Open de calculator' })),
      h('div', { class: 'dcard' }, h('h3', { text: 'Wet DBA & KvK' }), h('p', { class: 'hint', text: 'Lees hoe KvK, VCA, AVB en de Modelovereenkomst werken.' }), h('a', { class: 'btn ghost', href: 'wet-dba-kvk.html', text: 'Lees meer' }))));
  }
})();
