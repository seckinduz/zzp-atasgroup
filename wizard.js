// Werkspot-achtige klus-wizard: categorie, soort klus, plan, budget en publiceren (KvK + Wet DBA verplicht).
(function () {
  'use strict';
  var U = window.ZUI, Z = window.ZZP, G = window.ZZPGEO, h = U.h, $ = U.$, eur = U.eur;
  var DK = 'zzp_wiz_v1', step = 1, W = null, me = null;
  var S = { cat: '', sub: '', aantal: 100, kamers: 1, materiaal: 'exclusief', spoed: false, fotos: [], titel: '', omschrijving: '', postcode: '', tot: '', dba: false };
  var geo = null, geoT = null;
  try { var d = JSON.parse(localStorage.getItem(DK)); if (d) { Object.assign(S, d.S || {}); step = Math.min(4, Math.max(1, d.step || 1)); } } catch (e) { }
  var save = function () { try { localStorage.setItem(DK, JSON.stringify({ S: S, step: step })); } catch (e) { } };
  var cat = function () { return W.categorieen.filter(function (c) { return c.naam === S.cat; })[0]; };
  var sub = function () { var c = cat(); return c && c.subs.filter(function (s) { return s.naam === S.sub; })[0]; };
  var body = $('wz-body');
  var in30 = function () { return new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10); };
  if (!S.tot) S.tot = in30();

  var TITELS = [['Wat voor klus heeft u?', 'Kies eerst de hoofdcategorie.'], ['Welke klus precies?', ''], ['Vertel iets over de klus', 'Oppervlak, ruimtes, materiaal en foto\'s.'], ['Budget en publiceren', 'Controleer de richtbegroting en publiceer met uw KvK-nummer.']];

  function bereken() { var s = sub(); return s ? G.begroting(W, s, { aantal: Number(S.aantal) || 0, kamers: S.kamers, materiaal: s.materiaal ? S.materiaal : 'exclusief', spoed: S.spoed }) : null; }

  function stepper(val, min, max, stp, onchg, label) {
    var inp = h('input', { type: 'number', min: String(min), max: String(max), step: '1', value: String(val), inputmode: 'numeric', 'aria-label': label });
    var set = function (v) { v = Math.max(min, Math.min(max, Math.round(Number(v) || min))); inp.value = v; onchg(v); };
    inp.addEventListener('input', function () { if (inp.value !== '') onchg(Math.max(min, Math.min(max, Number(inp.value)))); });
    return h('div', { class: 'qrow' }, h('button', { type: 'button', 'aria-label': 'Minder', text: '−', onclick: function () { set((Number(inp.value) || min) - stp); } }), inp, h('button', { type: 'button', 'aria-label': 'Meer', text: '+', onclick: function () { set((Number(inp.value) || min) + stp); } }));
  }

  function resizeFoto(file) {
    return new Promise(function (ok, no) {
      var r = new FileReader(); r.onerror = no;
      r.onload = function () { var im = new Image(); im.onerror = no; im.onload = function () { var sc = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .72)); }; im.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  function s1() {
    body.appendChild(h('div', { class: 'tiles' }, W.categorieen.map(function (c) { return h('button', { type: 'button', class: 'tile', 'aria-pressed': S.cat === c.naam, onclick: function () { if (S.cat !== c.naam) { S.cat = c.naam; S.sub = ''; } go(2); } }, h('span', { text: c.naam }), h('small', { text: c.subs.length + ' soorten klussen' })); })));
  }
  function s2() {
    var c = cat(); if (!c) return go(1);
    body.appendChild(h('div', { class: 'tiles' }, c.subs.map(function (s) { return h('button', { type: 'button', class: 'tile', 'aria-pressed': S.sub === s.naam, onclick: function () { S.sub = s.naam; go(3); } }, h('span', { text: s.naam }), h('small', { text: 'per ' + (s.eenheid === 'uur' ? 'uur' : 'm²') })); })));
  }
  function s3() {
    var s = sub(); if (!s) return go(2);
    var m2 = s.eenheid === 'm2', prev = h('p', { class: 'budget' }), upd = function () { var b = bereken(); prev.textContent = ''; prev.appendChild(h('small', { text: 'Richtbegroting (indicatie, excl. btw)' })); prev.appendChild(h('span', { class: 'big' }, eur(b.min) + ' – ' + eur(b.max))); save(); };
    body.appendChild(h('div', { class: 'fgrid' },
      h('div', { class: 'row2c' },
        h('label', null, m2 ? 'Oppervlak (m²)' : 'Aantal uren', stepper(S.aantal, 1, 100000, m2 ? 10 : 8, function (v) { S.aantal = v; upd(); }, m2 ? 'Oppervlak in m²' : 'Aantal uren')),
        m2 && h('label', null, 'Ruimtes/vlakken', stepper(S.kamers, 1, 30, 1, function (v) { S.kamers = v; upd(); }, 'Aantal ruimtes'))),
      s.materiaal > 0 && h('div', { class: 'fgrid', style: 'gap:6px' }, h('span', { class: 'hint', style: 'font-weight:600' }, 'Materiaal'),
        h('div', { class: 'pillrow' }, [['exclusief', 'Excl. materiaal'], ['inclusief', 'Incl. materiaal']].map(function (o) { return h('button', { type: 'button', 'aria-pressed': S.materiaal === o[0], text: o[1], onclick: function (e) { S.materiaal = o[0]; Array.prototype.forEach.call(e.target.parentNode.children, function (b) { b.setAttribute('aria-pressed', b === e.target); }); upd(); } }); }))),
      h('label', { class: 'spoed' }, h('input', { type: 'checkbox', checked: S.spoed ? 'checked' : false, onchange: function (e) { S.spoed = e.target.checked; upd(); } }), h('span', null, h('b', { text: 'Spoedklus — Binnen 48 uur' }), h('small', { text: 'Toeslag van ' + Math.round(W.spoedToeslag * 100) + '% op de richtbegroting' }))),
      photoBlock(), prev));
    upd();
  }
  function photoBlock() {
    var th = h('div', { class: 'thumbs' }), er = h('p', { class: 'err', role: 'alert' }), inp = h('input', { type: 'file', accept: 'image/*', multiple: 'multiple', 'aria-label': 'Foto\'s kiezen', style: 'display:none' });
    function draw() { th.textContent = ''; S.fotos.forEach(function (f, i) { th.appendChild(h('div', { class: 'th' }, h('img', { src: f, alt: 'Voorbeeld van foto ' + (i + 1) }), h('button', { type: 'button', 'aria-label': 'Foto verwijderen', text: '×', onclick: function () { S.fotos.splice(i, 1); save(); draw(); } }))); }); }
    inp.addEventListener('change', function () {
      er.textContent = ''; var files = Array.prototype.slice.call(inp.files).slice(0, 3 - S.fotos.length);
      if (inp.files.length > files.length) er.textContent = 'Maximaal 3 foto\'s.';
      Promise.all(files.map(resizeFoto)).then(function (r) { S.fotos = S.fotos.concat(r); save(); draw(); }).catch(function () { er.textContent = 'Een foto kon niet worden gelezen.'; }); inp.value = '';
    });
    draw();
    return h('div', { class: 'upl' }, h('span', { class: 'hint', style: 'font-weight:600' }, 'Foto\'s van de klus (optioneel, maximaal 3)'), h('div', { class: 'btns' }, h('button', { type: 'button', class: 'mini', text: 'Foto toevoegen', onclick: function () { inp.click(); } })), inp, th, er);
  }
  function s4() {
    var s = sub(); if (!s) return go(2); var b = bereken();
    var plaatsTxt = h('span', { class: 'hint' }), er = h('p', { class: 'err', role: 'alert' });
    if (!S.titel) S.titel = s.naam + ' ' + S.aantal + ' ' + (s.eenheid === 'uur' ? 'uur' : 'm²');
    function checkPc() { var v = pcI.value; S.postcode = v; save(); clearTimeout(geoT); geo = null; if (!G.geldig(v) || G.norm(v).length < 6) { plaatsTxt.className = 'hint'; plaatsTxt.textContent = 'Vul een volledige postcode in (bijvoorbeeld 7811 AB).'; return; } plaatsTxt.textContent = 'Opzoeken…'; geoT = setTimeout(function () { G.zoek(v).then(function (o) { geo = o; plaatsTxt.className = o ? 'pcok' : 'pcnok'; plaatsTxt.textContent = o ? '✓ ' + o.plaats + ' (' + o.provincie + ')' : 'Postcode niet gevonden of geen verbinding.'; }); }, 300); }
    var pcI = h('input', { value: S.postcode, maxlength: '7', placeholder: '7811 AB', autocomplete: 'postal-code', inputmode: 'text', required: 'required' }); pcI.addEventListener('input', checkPc);
    var titelI = h('input', { value: S.titel, maxlength: '100' }); titelI.addEventListener('input', function () { S.titel = titelI.value; save(); });
    var omI = h('textarea', { maxlength: '2000', placeholder: 'Beschrijf kort wat er moet gebeuren, de staat van de ruimte en wanneer u wilt starten.' }); omI.value = S.omschrijving; omI.addEventListener('input', function () { S.omschrijving = omI.value; save(); });
    var totI = h('input', { type: 'date', value: S.tot, min: new Date().toISOString().slice(0, 10) }); totI.addEventListener('input', function () { S.tot = totI.value; save(); });
    var dbaC = h('input', { type: 'checkbox', checked: S.dba ? 'checked' : false }); dbaC.addEventListener('change', function () { S.dba = dbaC.checked; save(); });
    var kvk = h('div', { class: 'kvkbox' });
    if (!me) { kvk.appendChild(h('span', null, 'Voor publiceren is een account met geldig KvK-nummer nodig.')); kvk.appendChild(h('a', { class: 'btn pill', href: 'account.html?terug=plaatsen.html', text: 'Inloggen of registreren' })); }
    else if (me.profile.rol !== 'opdrachtgever') { kvk.appendChild(h('span', { class: 'err', text: 'U bent ingelogd als ZZP\'er. Alleen opdrachtgevers kunnen een klus plaatsen.' })); }
    else { kvk.appendChild(h('span', null, h('b', { text: me.profile.bedrijf }), ' · KvK ' + me.profile.kvk)); kvk.appendChild(U.badge(me.profile.kvk_geverifieerd)); }
    var lines = [h('li', { text: 'Arbeid (referentie 100 ' + (s.eenheid === 'uur' ? 'uur' : 'm²') + ' × ' + (b.factor).toFixed(2).replace('.', ',') + (b.kamerFactor > 1 ? ' × ' + b.kamerFactor.toFixed(2).replace('.', ',') + ' ruimtes' : '') + '): ' + eur(b.arbeid[0]) + ' – ' + eur(b.arbeid[1]) })];
    if (S.materiaal === 'inclusief' && s.materiaal) lines.push(h('li', { text: 'Materiaal inbegrepen: + ' + eur(b.materiaal[0]) + ' – ' + eur(b.materiaal[1]) }));
    if (S.spoed) lines.push(h('li', { text: 'Spoedtoeslag (48 uur): + ' + Math.round(W.spoedToeslag * 100) + '%' }));
    body.appendChild(h('div', { class: 'fgrid' },
      h('div', { class: 'budget' }, h('small', { text: 'Richtbegroting op basis van een vaste referentie van 100 ' + (s.eenheid === 'uur' ? 'uur' : 'm²') }), h('span', { class: 'big' }, h('em', { text: eur(b.min) }), ' – ' + eur(b.max)), h('ul', null, lines), h('small', { text: 'Indicatie, excl. btw. Geen offerte; ZZP\'ers reageren met hun eigen bedrag.' })),
      h('a', { class: 'mini', href: 'werkplan.html?draft=1', target: '_blank', rel: 'noopener', text: 'Download werkplan en begroting (PDF)', style: 'justify-self:start' }),
      h('label', null, 'Titel van de klus', titelI),
      h('div', { class: 'row2' }, h('label', null, 'Postcode van de klus', pcI, plaatsTxt), h('label', null, 'Sluitingsdatum', totI)),
      h('label', null, 'Omschrijving', omI),
      h('div', { class: 'dba' }, h('h3', { text: 'Wet DBA-controle' }),
        h('ul', null, h('li', { text: 'De ZZP\'er bepaalt zelf hoe het werk wordt uitgevoerd (geen gezag of instructies zoals bij een werknemer).' }), h('li', { text: 'De ZZP\'er mag zich laten vervangen en werkt voor eigen rekening en risico.' }), h('li', { text: 'De opdracht is resultaatgericht en geen verkapt dienstverband.' })),
        h('p', { class: 'hint' }, 'Dit is geen juridisch advies. Raadpleeg bij twijfel de ', h('a', { href: 'https://www.belastingdienst.nl', target: '_blank', rel: 'noopener', text: 'Belastingdienst' }), '.'),
        h('label', { class: 'check' }, dbaC, h('span', { text: 'Ik heb de punten gelezen en bevestig dat deze opdracht naar mijn beste weten geen verkapt dienstverband is.' }))),
      kvk, er));
    if (S.postcode) checkPc();
    s4.er = er; s4.get = function () { return { titelI: titelI, omI: omI, totI: totI, dbaC: dbaC, pcI: pcI }; };
  }

  function publiceer() {
    var s = sub(), b = bereken(), g = s4.get(), er = s4.er, btn = $('wz-next'); er.textContent = '';
    var vind = function (m) { er.textContent = m; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (!me) return vind('Log eerst in of registreer als opdrachtgever met een geldig KvK-nummer.');
    if (me.profile.rol !== 'opdrachtgever') return vind('Alleen opdrachtgevers kunnen een klus plaatsen.');
    if (!Z.kvkGeldig(me.profile.kvk)) return vind('Plaatsen is geblokkeerd: uw KvK-nummer is ongeldig.');
    if (!G.geldig(g.pcI.value) || G.norm(g.pcI.value).length < 6) return vind('Vul een geldige postcode in (bijvoorbeeld 7811 AB).');
    if (g.omI.value.trim().length < 20) return vind('Schrijf een omschrijving van minimaal 20 tekens.');
    if (!g.dbaC.checked) return vind('Bevestig de Wet DBA-controle om te publiceren.');
    btn.disabled = true; btn.textContent = 'Publiceren…';
    G.zoek(g.pcI.value).then(function (o) {
      if (!o) { btn.disabled = false; btn.textContent = 'Klus publiceren'; return vind('Postcode niet gevonden of geen verbinding. Probeer het opnieuw.'); }
      return Z.createListing({ titel: g.titelI.value, categorie: S.cat, subklus: S.sub, eenheid: s.eenheid, oppervlak: S.aantal, kamers: S.kamers, materiaal: s.materiaal ? S.materiaal : 'exclusief', spoed: S.spoed, budget_min: b.min, budget_max: b.max,
        postcode: G.norm(g.pcI.value), plaats: o.plaats, provincie: o.provincie, lat: o.lat, lon: o.lon, omschrijving: g.omI.value, fotos: S.fotos, dba_bevestigd: true, valid_through: g.totI.value })
        .then(function (l) { try { localStorage.removeItem(DK); } catch (e) { } location.href = 'ilan.html?id=' + l.id; });
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Klus publiceren'; vind(e.message); });
  }

  function render() {
    body.textContent = ''; var t = TITELS[step - 1];
    $('wz-titel').textContent = t[0]; $('wz-sub').textContent = step === 2 && cat() ? cat().naam : t[1];
    Array.prototype.forEach.call($('prog').children, function (li, i) { li.className = i + 1 === step ? 'on' : (i + 1 < step ? 'done' : ''); li.setAttribute('aria-current', i + 1 === step ? 'step' : 'false'); });
    [s1, s2, s3, s4][step - 1]();
    $('wnav').style.display = step === 1 ? 'none' : ''; $('wz-back').disabled = step === 1; $('wz-back').style.opacity = step === 1 ? '.4' : '1';
    var nx = $('wz-next'); nx.disabled = false; nx.textContent = step === 4 ? 'Klus publiceren' : 'Volgende'; nx.style.display = step <= 2 ? 'none' : '';
    $('wnav').querySelector('.in').style.gridTemplateColumns = step <= 2 ? '1fr' : '1fr 1.6fr';
    save(); window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function go(n) { step = n; render(); }
  $('wz-back').addEventListener('click', function () { if (step > 1) go(step - 1); });
  $('wz-next').addEventListener('click', function () {
    if (step === 3) { if (!(Number(S.aantal) > 0)) return; return go(4); }
    if (step === 4) return publiceer();
  });
  Promise.all([U.loadWerk(), Z.me()]).then(function (r) { W = r[0]; me = r[1]; if (S.cat && !cat()) { S.cat = ''; S.sub = ''; } if (step >= 2 && !S.cat) step = 1; if (step >= 3 && !sub()) step = S.cat ? 2 : 1; render(); })
    .catch(function () { body.textContent = 'De wizard kon niet worden geladen. Ververs de pagina.'; });
})();
