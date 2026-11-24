// Gegevenslaag voor ATAS ZZP: Supabase (tabellen profiles, jobs, applications) of DEMO-modus (localStorage).
// Beide kanten leveren dezelfde objecten:
//   profile: { id, role, full_name, company_name, kvk_number, category, region, hourly_rate, bio, badges:{vca,avb,dba} }
//   job:     { id, owner_id, title, category, subcategory, region, rate_type, rate_value, duration, description, status, created_at, profiles }
//   application: { id, job_id, applicant_id, proposed_rate, message, status, created_at, profiles }
(function () {
  'use strict';
  var C = window.ZZP_CONFIG || {};
  var REMOTE = !!(C.supabaseUrl && C.supabaseKey && !C.demo);
  var kvkGeldig = function (v) { return /^[0-9]{8}$/.test(v || '') && !/^0+$/.test(v); };
  var fail = function (m) { throw new Error(m); };
  var num = function (x) { return x === '' || x == null || isNaN(Number(x)) ? null : Number(x); };

  /* vinkjes VCA / AVB / Modelovereenkomst worden onzichtbaar in het bio-veld bewaard: [[badges:vca,avb,dba]] */
  function unpackBio(bio) {
    var m = /\n*\[\[badges:([a-z,]*)\]\]\s*$/.exec(bio || ''), b = { vca: false, avb: false, dba: false };
    if (m) m[1].split(',').forEach(function (k) { if (k in b) b[k] = true; });
    return { bio: (bio || '').replace(/\n*\[\[badges:[a-z,]*\]\]\s*$/, ''), badges: b };
  }
  function packBio(text, b) {
    var k = ['vca', 'avb', 'dba'].filter(function (x) { return b && b[x]; });
    return (text || '').trim() + (k.length ? '\n\n[[badges:' + k.join(',') + ']]' : '');
  }
  function shapeProfile(p) { if (!p) return p; var u = unpackBio(p.bio); return Object.assign({}, p, { bio: u.bio, badges: u.badges }); }
  var pubProfile = function (p) { return p ? { id: p.id, role: p.role, full_name: p.full_name, company_name: p.company_name, kvk_number: p.kvk_number, bio: p.bio, badges: p.badges } : null; };

  function checkProfile(p) {
    if (['opdrachtgever', 'zzp'].indexOf(p.role) < 0) fail('Kies een type account.');
    if (!kvkGeldig(p.kvk_number)) fail('Een geldig KvK-nummer van precies 8 cijfers is verplicht.');
    if (!p.company_name || p.company_name.trim().length < 2) fail('Vul uw bedrijfsnaam in.');
    if (!p.full_name || p.full_name.trim().length < 2) fail('Vul uw naam in.');
  }
  function checkJob(j) {
    if (!j.title || j.title.trim().length < 3) fail('Vul een titel in (minimaal 3 tekens).');
    if (!j.category || !j.subcategory) fail('Kies een categorie en een soort klus.');
    if (!j.region) fail('Kies een regio.');
    if (!j.description || j.description.trim().length < 20) fail('De omschrijving is te kort (minimaal 20 tekens).');
  }
  var profFields = function (x) {
    return { role: x.role, full_name: x.full_name.trim(), company_name: x.company_name.trim(), kvk_number: x.kvk_number, category: x.category || null, region: x.region || null,
      hourly_rate: num(x.hourly_rate), bio: packBio(x.bio, x.badges) };
  };
  var jobFields = function (j) {
    return { title: j.title.trim(), category: j.category, subcategory: j.subcategory, region: j.region, rate_type: j.rate_type || 'project', rate_value: num(j.rate_value),
      duration: j.duration || null, description: j.description.trim() };
  };
  var byDate = function (a, b) { return (b.created_at || '') < (a.created_at || '') ? -1 : 1; };

  /* ---------------- DEMO-modus (localStorage) ---------------- */
  var LK = 'zzp_demo_v3', LS = 'zzp_demo_session';
  var leeg = function () { return { users: [], profiles: [], jobs: [], applications: [] }; };
  function load() { try { return JSON.parse(localStorage.getItem(LK)) || leeg(); } catch (e) { return leeg(); } }
  function save(d) { try { localStorage.setItem(LK, JSON.stringify(d)); } catch (e) { fail('Opslaan mislukt: de browseropslag is vol.'); } }
  function sha(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }); }
  var newId = function () { return crypto.randomUUID(); };
  function lMe(d) { var id = localStorage.getItem(LS); if (!id) return null; var u = d.users.filter(function (x) { return x.id === id; })[0]; if (!u) return null; return { user: { id: u.id, email: u.email }, profile: shapeProfile(d.profiles.filter(function (p) { return p.id === id; })[0]) }; }
  function lNeed(d) { var m = lMe(d); if (!m) fail('Log eerst in.'); return m; }
  var lProf = function (d, id) { return pubProfile(shapeProfile(d.profiles.filter(function (p) { return p.id === id; })[0])); };

  var demo = {
    signUp: function (x) {
      var d = load(); checkProfile(x);
      if (!x.email || !/^\S+@\S+\.\S+$/.test(x.email)) fail('Vul een geldig e-mailadres in.');
      if (!x.password || x.password.length < 8) fail('Het wachtwoord moet minimaal 8 tekens hebben.');
      if (d.users.some(function (u) { return u.email === x.email.toLowerCase(); })) fail('Dit e-mailadres is al in gebruik.');
      return sha(x.password).then(function (h) {
        var id = newId(); d.users.push({ id: id, email: x.email.toLowerCase(), hash: h });
        d.profiles.push(Object.assign({ id: id, created_at: new Date().toISOString() }, profFields(x))); save(d); localStorage.setItem(LS, id); return lMe(d);
      });
    },
    signIn: function (email, pw) { var d = load(); return sha(pw).then(function (h) { var u = d.users.filter(function (x) { return x.email === (email || '').toLowerCase() && x.hash === h; })[0]; if (!u) fail('E-mailadres of wachtwoord klopt niet.'); localStorage.setItem(LS, u.id); return lMe(d); }); },
    signOut: function () { localStorage.removeItem(LS); return Promise.resolve(); },
    me: function () { return Promise.resolve(lMe(load())); },
    updateProfile: function (patch) {
      var d = load(), m = lNeed(d), p = d.profiles.filter(function (x) { return x.id === m.user.id; })[0], cur = shapeProfile(p), n = Object.assign({}, cur, patch);
      if (patch.kvk_number != null && !kvkGeldig(patch.kvk_number)) fail('Een geldig KvK-nummer van precies 8 cijfers is verplicht.');
      Object.assign(p, profFields(n)); save(d); return Promise.resolve(shapeProfile(p));
    },
    listJobs: function () { var d = load(); return Promise.resolve(d.jobs.filter(function (j) { return j.status === 'open'; }).sort(byDate).map(function (j) { return Object.assign({}, j, { profiles: lProf(d, j.owner_id) }); })); },
    listZzps: function () { return Promise.resolve(load().profiles.filter(function (p) { return p.role === 'zzp'; }).map(function (p) { var s = shapeProfile(p); return { id: s.id, full_name: s.full_name, company_name: s.company_name, kvk_number: s.kvk_number, category: s.category, region: s.region, hourly_rate: s.hourly_rate, bio: s.bio, badges: s.badges }; })); },
    getJob: function (id) { var d = load(), j = d.jobs.filter(function (x) { return x.id === id; })[0], m = lMe(d); if (!j || (j.status !== 'open' && !(m && m.user.id === j.owner_id))) return Promise.resolve(null); return Promise.resolve(Object.assign({}, j, { profiles: lProf(d, j.owner_id) })); },
    myJobs: function () { var d = load(), m = lNeed(d); return Promise.resolve(d.jobs.filter(function (j) { return j.owner_id === m.user.id; }).sort(byDate).map(function (j) { return Object.assign({}, j, { aanmeldingen: d.applications.filter(function (a) { return a.job_id === j.id; }).length }); })); },
    createJob: function (j) {
      var d = load(), m = lNeed(d); if (m.profile.role !== 'opdrachtgever') fail('Alleen opdrachtgevers kunnen een klus plaatsen.');
      if (!kvkGeldig(m.profile.kvk_number)) fail('Plaatsen is geblokkeerd: geen geldig KvK-nummer.'); checkJob(j);
      var n = Object.assign({ id: newId(), owner_id: m.user.id, status: 'open', created_at: new Date().toISOString() }, jobFields(j)); d.jobs.push(n); save(d); return Promise.resolve(n);
    },
    updateJob: function (id, patch) {
      var d = load(), m = lNeed(d), x = d.jobs.filter(function (q) { return q.id === id && q.owner_id === m.user.id; })[0]; if (!x) fail('Advertentie niet gevonden.');
      ['title', 'description', 'duration', 'status'].forEach(function (k) { if (k in patch) x[k] = patch[k]; });
      if (!x.title || x.title.trim().length < 3) fail('Vul een titel in.'); if (!x.description || x.description.trim().length < 20) fail('De omschrijving is te kort.');
      save(d); return Promise.resolve(x);
    },
    jobApplications: function (id) {
      var d = load(), m = lNeed(d); if (!d.jobs.some(function (j) { return j.id === id && j.owner_id === m.user.id; })) fail('Geen toegang.');
      return Promise.resolve(d.applications.filter(function (a) { return a.job_id === id; }).map(function (a) { return Object.assign({}, a, { profiles: lProf(d, a.applicant_id) }); }));
    },
    apply: function (job_id, x) {
      var d = load(), m = lNeed(d); if (m.profile.role !== 'zzp') fail('Alleen ZZP-accounts kunnen reageren.');
      var j = d.jobs.filter(function (q) { return q.id === job_id && q.status === 'open'; })[0]; if (!j) fail('Deze klus is gesloten.');
      if (d.applications.some(function (a) { return a.job_id === job_id && a.applicant_id === m.user.id; })) fail('U heeft al gereageerd op deze klus.');
      if (!x.message || x.message.trim().length < 5) fail('Schrijf een kort bericht.');
      var n = { id: newId(), job_id: job_id, applicant_id: m.user.id, proposed_rate: num(x.proposed_rate), message: x.message.trim() + (x.email ? '\n\nContact: ' + x.email : ''), status: 'pending', created_at: new Date().toISOString() };
      d.applications.push(n); save(d); return Promise.resolve(n);
    },
    myApplications: function () { var d = load(), m = lNeed(d); return Promise.resolve(d.applications.filter(function (a) { return a.applicant_id === m.user.id; }).map(function (a) { return Object.assign({}, a, { jobs: d.jobs.filter(function (j) { return j.id === a.job_id; })[0] || null }); })); }
  };

  /* ---------------- SUPABASE ---------------- */
  var base = (C.supabaseUrl || '').replace(/\/$/, '');
  var tok = function () { try { return JSON.parse(localStorage.getItem('zzp_sb')); } catch (e) { return null; } };
  var setTok = function (t) { if (t) localStorage.setItem('zzp_sb', JSON.stringify(t)); else localStorage.removeItem('zzp_sb'); };
  var vert = function (m, code) {
    if (code === '42501' || /permission denied/i.test(m)) return 'Geen toegang tot de database. Het beheer moet eerst supabase/setup.sql uitvoeren (rechten en beveiliging).';
    if (/already registered/i.test(m)) return 'Dit e-mailadres is al in gebruik.';
    if (/Invalid login/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.';
    if (/Email not confirmed/i.test(m)) return 'Bevestig eerst uw e-mailadres via de link in uw inbox.';
    if (/duplicate key|already exists/i.test(m)) return 'U heeft hier al op gereageerd.';
    if (/row-level security|violates/i.test(m)) return 'Deze actie is niet toegestaan of de gegevens zijn ongeldig.';
    if (/rate limit|too many/i.test(m)) return 'Te veel pogingen. Probeer het over enkele minuten opnieuw.';
    return m;
  };
  function req(path, o, retry) {
    o = o || {}; var t = tok();
    var headers = { apikey: C.supabaseKey, Authorization: 'Bearer ' + ((o.auth !== false && t && t.access_token) || C.supabaseKey), 'Content-Type': 'application/json' };
    if (o.prefer) headers.Prefer = o.prefer; else if (o.method && o.method !== 'GET') headers.Prefer = 'return=representation';
    return fetch(base + path, { method: o.method || 'GET', headers: headers, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) {
        return r.text().then(function (txt) {
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
          if (r.status === 401 && j && /JWT/i.test(j.message || '') && t && t.refresh_token && !retry && o.auth !== false) {
            return fetch(base + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: C.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.refresh_token }) })
              .then(function (rr) { return rr.json().then(function (s) { if (!rr.ok) { setTok(null); fail('Uw sessie is verlopen. Log opnieuw in.'); } setTok({ access_token: s.access_token, refresh_token: s.refresh_token, user: s.user }); return req(path, o, true); }); });
          }
          if (!r.ok) fail(vert((j && (j.msg || j.message || j.error_description || j.error)) || ('Fout ' + r.status), j && j.code));
          return j;
        });
      });
  }
  var uid = function () { var t = tok(); return t && t.user && t.user.id; };
  var inList = function (ids) { return '(' + ids.map(function (i) { return '"' + i + '"'; }).join(',') + ')'; };
  var uniq = function (a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); };
  function profilesFor(ids) {
    ids = uniq(ids); if (!ids.length) return Promise.resolve({});
    return req('/rest/v1/profiles?id=in.' + encodeURIComponent(inList(ids)) + '&select=id,role,full_name,company_name,kvk_number,bio').then(function (r) { var m = {}; (r || []).forEach(function (p) { m[p.id] = pubProfile(shapeProfile(p)); }); return m; });
  }
  // maakt na de eerste login het profiel aan op basis van de registratiegegevens (nodig bij e-mailbevestiging)
  function ensureProfile(user) {
    return req('/rest/v1/profiles?id=eq.' + user.id + '&select=id').then(function (r) {
      if (r && r.length) return;
      var md = user.user_metadata || {};
      if (!md.role || !md.kvk_number) return;
      return req('/rest/v1/profiles', { method: 'POST', body: { id: user.id, role: md.role, full_name: md.full_name, company_name: md.company_name, kvk_number: md.kvk_number, category: md.category || null, region: md.region || null, hourly_rate: num(md.hourly_rate), bio: md.bio || null } });
    });
  }
  var sb = {
    signUp: function (x) {
      checkProfile(x);
      var f = profFields(x);
      return req('/auth/v1/signup', { method: 'POST', auth: false, body: { email: x.email, password: x.password, data: f } })
        .then(function (j) {
          if (j && j.access_token) { setTok({ access_token: j.access_token, refresh_token: j.refresh_token, user: j.user }); return ensureProfile(j.user).then(function () { return sb.me(); }); }
          return { needsConfirm: true };
        });
    },
    signIn: function (email, pw) {
      return req('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email, password: pw } })
        .then(function (j) { setTok({ access_token: j.access_token, refresh_token: j.refresh_token, user: j.user }); return ensureProfile(j.user).then(function () { return sb.me(); }); });
    },
    signOut: function () { setTok(null); return Promise.resolve(); },
    me: function () { var id = uid(); if (!id) return Promise.resolve(null); return req('/rest/v1/profiles?id=eq.' + id + '&select=*').then(function (r) { return r && r[0] ? { user: { id: id, email: tok().user.email }, profile: shapeProfile(r[0]) } : null; }).catch(function () { return null; }); },
    updateProfile: function (patch) {
      if (patch.kvk_number != null && !kvkGeldig(patch.kvk_number)) fail('Een geldig KvK-nummer van precies 8 cijfers is verplicht.');
      return sb.me().then(function (m) { if (!m) fail('Log eerst in.'); var n = Object.assign({}, m.profile, patch), f = profFields(n); delete f.role; return req('/rest/v1/profiles?id=eq.' + uid(), { method: 'PATCH', body: f }).then(function (r) { return shapeProfile(r[0]); }); });
    },
    listJobs: function () {
      return req('/rest/v1/jobs?status=eq.open&select=*&limit=500').then(function (jobs) {
        jobs = jobs || []; return profilesFor(jobs.map(function (j) { return j.owner_id; })).then(function (m) { return jobs.map(function (j) { return Object.assign({}, j, { profiles: m[j.owner_id] || null }); }).sort(byDate); });
      });
    },
    listZzps: function () { return req('/rest/v1/profiles?role=eq.zzp&select=id,full_name,company_name,kvk_number,category,region,hourly_rate,bio&limit=500').then(function (r) { return (r || []).map(shapeProfile); }); },
    getJob: function (id) { return req('/rest/v1/jobs?id=eq.' + encodeURIComponent(id) + '&select=*').then(function (r) { var j = r && r[0]; if (!j) return null; return profilesFor([j.owner_id]).then(function (m) { return Object.assign({}, j, { profiles: m[j.owner_id] || null }); }); }); },
    myJobs: function () {
      return req('/rest/v1/jobs?owner_id=eq.' + uid() + '&select=*').then(function (jobs) {
        jobs = jobs || []; if (!jobs.length) return [];
        return req('/rest/v1/applications?job_id=in.' + encodeURIComponent(inList(jobs.map(function (j) { return j.id; }))) + '&select=job_id').then(function (a) {
          var c = {}; (a || []).forEach(function (x) { c[x.job_id] = (c[x.job_id] || 0) + 1; }); return jobs.map(function (j) { return Object.assign({}, j, { aanmeldingen: c[j.id] || 0 }); }).sort(byDate);
        });
      });
    },
    createJob: function (j) {
      return sb.me().then(function (m) {
        if (!m) fail('Log eerst in.'); if (m.profile.role !== 'opdrachtgever') fail('Alleen opdrachtgevers kunnen een klus plaatsen.');
        if (!kvkGeldig(m.profile.kvk_number)) fail('Plaatsen is geblokkeerd: uw KvK-nummer is ongeldig.'); checkJob(j);
        var b = jobFields(j); b.owner_id = uid(); b.status = 'open'; return req('/rest/v1/jobs', { method: 'POST', body: b }).then(function (r) { return r[0]; });
      });
    },
    updateJob: function (id, patch) { var b = {}; ['title', 'description', 'duration', 'status'].forEach(function (k) { if (k in patch) b[k] = patch[k]; }); return req('/rest/v1/jobs?id=eq.' + id, { method: 'PATCH', body: b }).then(function (r) { return r[0]; }); },
    jobApplications: function (id) {
      return req('/rest/v1/applications?job_id=eq.' + id + '&select=*').then(function (a) { a = a || []; return profilesFor(a.map(function (x) { return x.applicant_id; })).then(function (m) { return a.map(function (x) { return Object.assign({}, x, { profiles: m[x.applicant_id] || null }); }).sort(byDate); }); });
    },
    apply: function (job_id, x) {
      if (!x.message || x.message.trim().length < 5) fail('Schrijf een kort bericht.');
      return req('/rest/v1/applications', { method: 'POST', body: { job_id: job_id, applicant_id: uid(), proposed_rate: num(x.proposed_rate), message: x.message.trim() + (x.email ? '\n\nContact: ' + x.email : '') } }).then(function (r) { return r[0]; });
    },
    myApplications: function () {
      return req('/rest/v1/applications?applicant_id=eq.' + uid() + '&select=*').then(function (a) {
        a = a || []; if (!a.length) return [];
        return req('/rest/v1/jobs?id=in.' + encodeURIComponent(inList(a.map(function (x) { return x.job_id; }))) + '&select=id,title,region,status').then(function (jobs) { var m = {}; (jobs || []).forEach(function (j) { m[j.id] = j; }); return a.map(function (x) { return Object.assign({}, x, { jobs: m[x.job_id] || null }); }).sort(byDate); });
      });
    }
  };

  window.ZZP = Object.assign({ mode: REMOTE ? 'supabase' : 'demo', kvkGeldig: kvkGeldig, packBio: packBio }, REMOTE ? sb : demo);
})();
