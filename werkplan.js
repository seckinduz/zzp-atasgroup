// Werkplan en begroting: afdrukbaar document (Opslaan als PDF via het afdrukvenster).
(function () {
  'use strict';
  var U = window.ZUI, Z = window.ZZP, G = window.ZZPGEO, h = U.h, $ = U.$, eur = U.eur, doc = $('doc');
  var q = new URLSearchParams(location.search), id = q.get('id'), draft = q.get('draft');
  var tx = function (n, el) { return h('tr', null, h('th', { scope: 'row', text: n }), h('td', null, el)); };
  var fmt = function (n) { return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 }); };
  function fail(m) { doc.appendChild(h('p', { class: 'note', text: m })); $('wp-print').disabled = true; }

  Promise.all([U.loadWerk(), Z.me(), id ? Z.getJob(id) : Promise.resolve(null)]).then(function (r) {
    var W = r[0], me = r[1], job = r[2], D, S = null, snap = null;
    if (id) {
      if (!job) return fail('Deze klus bestaat niet of is gesloten.');
      try { snap = JSON.parse(localStorage.getItem('zzp_plan_' + id)); } catch (e) { }
      var po = job.profiles || {};
      D = { titel: job.title, cat: job.category, sub: job.subcategory, region: job.region, omschrijving: job.description, fotos: [], dba: /Wet DBA-controle bevestigd/i.test(job.description || ''), bedrijf: U.naam(po), kvk: po.kvk_number, ref: String(job.id).slice(0, 8).toUpperCase(), duration: job.duration, rate: U.rateTxt(job) };
      if (snap && snap.S) S = snap.S;
    } else if (draft) {
      try { S = (JSON.parse(localStorage.getItem('zzp_wiz_v1')) || {}).S || null; } catch (e) { }
      if (!S || !S.cat || !S.sub) return fail('Er is nog geen klus ingevuld. Doorloop eerst de wizard.');
      D = { titel: S.titel, cat: S.cat, sub: S.sub, region: S.region, omschrijving: S.omschrijving, fotos: S.fotos || [], dba: !!S.dba, bedrijf: me && U.naam(me.profile), kvk: me && me.profile.kvk_number, ref: 'CONCEPT' };
    } else return fail('Geen klus gekozen.');
    var cat = W.categorieen.filter(function (c) { return c.naam === D.cat; })[0], sub = cat && cat.subs.filter(function (s) { return s.naam === D.sub; })[0], b = null, eh = 'uur';
    if (S && sub) { eh = sub.eenheid === 'uur' ? 'uur' : 'm²'; D.fotos = S.fotos || []; D.aantal = S.aantal; D.kamers = S.kamers; D.materiaal = S.materiaal; D.spoed = S.spoed; b = G.begroting(W, sub, { aantal: Number(S.aantal), kamers: S.kamers, materiaal: sub.materiaal ? S.materiaal : 'exclusief', spoed: S.spoed }); }
    document.title = 'Werkplan ' + D.ref + ' | ATAS ZZP Netwerk';

    var rows = [];
    if (b) {
      rows = [h('tr', null, h('th', { scope: 'row', text: 'Arbeid, referentie 100 ' + eh }), h('td', { text: eur(sub.ref[0]) + ' – ' + eur(sub.ref[1]) })),
        h('tr', null, h('th', { scope: 'row', text: 'Factor ' + fmt(D.aantal) + ' ' + eh + ' / 100' }), h('td', { text: '× ' + fmt(b.factor) })),
        b.kamerFactor > 1 ? h('tr', null, h('th', { scope: 'row', text: 'Ruimtefactor (' + D.kamers + ' ruimtes)' }), h('td', { text: '× ' + fmt(b.kamerFactor) })) : null,
        h('tr', null, h('th', { scope: 'row', text: 'Arbeid (berekend)' }), h('td', { text: eur(b.arbeid[0]) + ' – ' + eur(b.arbeid[1]) })),
        (D.materiaal === 'inclusief' && sub.materiaal) ? h('tr', null, h('th', { scope: 'row', text: 'Materiaal inbegrepen' }), h('td', { text: '+ ' + eur(b.materiaal[0]) + ' – ' + eur(b.materiaal[1]) })) : null,
        D.spoed ? h('tr', null, h('th', { scope: 'row', text: 'Spoedtoeslag (48 uur)' }), h('td', { text: '+ ' + Math.round(W.spoedToeslag * 100) + '%' })) : null,
        h('tr', { class: 'tot' }, h('th', { scope: 'row', text: 'Richtbegroting excl. btw' }), h('td', { text: eur(b.min) + ' – ' + eur(b.max) })),
        h('tr', null, h('th', { scope: 'row', text: 'Indicatief incl. 21% btw' }), h('td', { text: eur(b.min * 1.21) + ' – ' + eur(b.max * 1.21) }))].filter(Boolean);
    } else rows = [h('tr', { class: 'tot' }, h('th', { scope: 'row', text: 'Richtprijs' }), h('td', { text: D.rate || '—' }))];

    var off = { naam: me && me.profile.role === 'zzp' ? me.profile.full_name : '', bedrijf: me && me.profile.role === 'zzp' ? me.profile.company_name : '', kvk: me && me.profile.role === 'zzp' ? me.profile.kvk_number : '', bedrag: '', opm: '' };
    var offBox = h('section', { class: 'wp-s' }, h('h2', { text: 'Offerte van de ZZP\'er' }));
    var offView = h('table', { class: 'wp-t' }); offBox.appendChild(offView);
    function drawOff() { offView.textContent = ''; [['ZZP\'er', off.naam], ['Bedrijf', off.bedrijf], ['KvK-nummer', off.kvk], ['Offerte excl. btw', off.bedrag ? eur(Number(off.bedrag)) : ''], ['Opmerking', off.opm]].forEach(function (x) { offView.appendChild(tx(x[0], x[1] || '………………………………………')); }); }
    var form = h('div', { class: 'wp-form noprint' }, h('p', { class: 'hint', text: 'ZZP\'er? Vul uw gegevens en bedrag in; ze komen in de PDF.' }),
      ['naam:Naam', 'bedrijf:Bedrijf', 'kvk:KvK-nummer', 'bedrag:Offerte excl. btw (€)', 'opm:Opmerking'].map(function (f) { var k = f.split(':')[0]; var i = h('input', { value: off[k], placeholder: f.split(':')[1], 'aria-label': f.split(':')[1], inputmode: k === 'bedrag' ? 'numeric' : 'text' }); i.addEventListener('input', function () { off[k] = i.value; drawOff(); }); return i; }));
    drawOff();

    doc.appendChild(h('div', { class: 'wp-head' }, h('img', { src: 'logo-zzp.svg', alt: 'ATAS ZZP', width: '200', height: '36' }), h('div', null, h('b', { text: 'Werkplan en begroting' }), h('br'), h('span', { text: 'Referentie ' + D.ref + ' · ' + new Date().toLocaleDateString('nl-NL') }))));
    doc.appendChild(h('h1', { class: 'wp-h1', text: D.titel || D.sub }));
    var t1 = h('table', { class: 'wp-t' });
    [['Opdrachtgever', (D.bedrijf || '—') + (D.kvk ? ' · KvK ' + D.kvk : '')], ['Categorie', D.cat], ['Soort klus', D.sub], ['Regio', D.region || '—'],
      b ? ['Omvang', fmt(D.aantal) + ' ' + eh + (eh === 'm²' ? ' · ' + D.kamers + ' ruimtes/vlakken' : '')] : ['Omvang en duur', D.duration || '—'],
      b && eh === 'm²' ? ['Materiaal', D.materiaal === 'inclusief' ? 'Inclusief' : 'Exclusief'] : null, b ? ['Spoedklus', D.spoed ? 'Ja, binnen 48 uur' : 'Nee'] : null].filter(Boolean).forEach(function (x) { t1.appendChild(tx(x[0], x[1])); });
    doc.appendChild(h('section', { class: 'wp-s' }, h('h2', { text: 'Klus' }), t1));
    doc.appendChild(h('section', { class: 'wp-s' }, h('h2', { text: 'Omschrijving' }), (D.omschrijving || '—').split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return h('p', { text: x }); })));
    if (D.fotos && D.fotos.length) doc.appendChild(h('section', { class: 'wp-s' }, h('h2', { text: 'Foto\'s' }), h('div', { class: 'fotos' }, D.fotos.map(function (f) { return h('img', { src: f, alt: 'Foto van de klus' }); }))));
    doc.appendChild(h('section', { class: 'wp-s' }, h('h2', { text: b ? 'Begroting op basis van 100 ' + eh + ' referentie' : 'Tarief' }), h('table', { class: 'wp-t' }, rows),
      h('p', { class: 'hint', text: 'Indicatie op basis van referentiewaarden, excl. btw. Geen offerte of aanbod; de ZZP\'er bepaalt de definitieve prijs.' })));
    doc.appendChild(offBox); doc.appendChild(form);
    doc.appendChild(h('section', { class: 'wp-s' }, h('h2', { text: 'Wet DBA en voorwaarden' }),
      h('p', { text: D.dba ? 'De opdrachtgever heeft bevestigd de Wet DBA-controle te hebben gelezen en dat de opdracht naar beste weten geen verkapt dienstverband is.' : 'De Wet DBA-controle is nog niet bevestigd.' }),
      h('p', { class: 'hint', text: 'Dit document is geen juridisch advies. Raadpleeg bij twijfel de Belastingdienst. Op het gebruik van ATAS ZZP Netwerk zijn de algemene voorwaarden en de privacyverklaring van toepassing.' })));
    doc.appendChild(h('div', { class: 'wp-sign' }, h('div', null, 'Opdrachtgever, datum en handtekening'), h('div', null, 'ZZP\'er, datum en handtekening')));
    doc.appendChild(h('p', { class: 'wp-foot', text: 'ATAS ZZP Netwerk · Atas Group · Emmen, Nederland · actief in heel Nederland · sales@atasgroup.nl' }));
  }).catch(function () { fail('Het werkplan kon niet worden geladen.'); });
  $('wp-print').addEventListener('click', function () { window.print(); });
})();
