// Postcode-opzoeking (PDOK Locatieserver, gratis, geen sleutel), afstand en begroting.
(function () {
  'use strict';
  var URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?rows=1&fq=type:postcode&fl=centroide_ll,woonplaatsnaam,provincienaam,postcode&q=';
  var cache = {};
  function norm(p) { return (p || '').replace(/\s+/g, '').toUpperCase(); }
  function geldig(p) { return /^[1-9][0-9]{3}([A-Z]{2})?$/.test(norm(p)); }
  // geeft {postcode, plaats, provincie, lat, lon} of null (ook bij netwerkfout)
  function zoek(p) {
    var k = norm(p); if (!geldig(k)) return Promise.resolve(null);
    if (cache[k] !== undefined) return Promise.resolve(cache[k]);
    try { var s = sessionStorage.getItem('pc_' + k); if (s) { cache[k] = JSON.parse(s); return Promise.resolve(cache[k]); } } catch (e) { }
    return fetch(URL + encodeURIComponent(k)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var d = j && j.response && j.response.docs && j.response.docs[0]; if (!d) return null;
      var m = /POINT\(([-0-9.]+) ([-0-9.]+)\)/.exec(d.centroide_ll || ''); if (!m) return null;
      var o = { postcode: d.postcode, plaats: d.woonplaatsnaam, provincie: d.provincienaam, lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
      cache[k] = o; try { sessionStorage.setItem('pc_' + k, JSON.stringify(o)); } catch (e) { } return o;
    }).catch(function () { return null; });
  }
  function km(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  // begroting op basis van een vaste referentie van 100 eenheden
  function begroting(W, sub, o) {
    var f = (o.aantal || 0) / W.referentie, kam = Math.min(W.kamerMax, 1 + W.kamerToeslag * Math.max(0, (o.kamers || 1) - 1));
    var arb = sub.ref.map(function (v) { return v * f * kam; });
    var mat = o.materiaal === 'inclusief' ? arb.map(function (v) { return v * sub.materiaal; }) : [0, 0];
    var sp = o.spoed ? W.spoedToeslag : 0;
    var tot = arb.map(function (v, i) { return (v + mat[i]) * (1 + sp); });
    var rd = function (v) { return Math.max(W.minimum, Math.round(v / 10) * 10); };
    return { min: rd(tot[0]), max: rd(tot[1]), arbeid: arb.map(rd), materiaal: mat.map(function (v) { return Math.round(v / 10) * 10; }), spoed: sp, factor: f, kamerFactor: kam };
  }
  window.ZZPGEO = { zoek: zoek, km: km, norm: norm, geldig: geldig, begroting: begroting };
})();
