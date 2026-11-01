// ui.js - app shell, saves, title screen, new game, shared widgets
var UI = (function () {
  var A = {};   // click actions: data-a="name"
  var V = {};   // views
  var st = { view: 'title', p: {} };
  var SLOTS = 3, KEY = 'nbar_slot_';
  function S() { return G.S; }

  // ---------- saves ----------
  function save() {
    var s = S(); if (!s) return;
    s.saved = Date.now();
    try { localStorage.setItem(KEY + s.slot, JSON.stringify(s)); }
    catch (e) { U.toast('Could not save (storage full?)'); }
  }
  function load(slot) { var j = localStorage.getItem(KEY + slot); if (!j) return null; try { return JSON.parse(j); } catch (e) { return null; } }
  function slotInfo(slot) {
    var j = localStorage.getItem(KEY + slot); if (!j) return null;
    try {
      var s = JSON.parse(j), t = s.teams[s.user];
      return { team: t.city + ' ' + t.name, id: s.user, logo: t.logo, c1: t.c1, c2: t.c2, custom: t.custom, season: s.season, rec: t.w + '-' + t.l, phase: s.phase, saved: s.saved, mode: s.mode, titles: s.history.filter(function (h) { return h.champ === s.user; }).length };
    } catch (e) { return null; }
  }

  // ---------- small widgets ----------
  function logo(id, size) {
    var t = S() && S().teams[id]; size = size || 28;
    if (!t) { var nt = NBA_TEAMS.filter(function (x) { return x.id === id; })[0]; if (nt) t = nt; }
    if (t && t.logo) return '<img class="logo" loading="lazy" src="' + t.logo + '" width="' + size + '" height="' + size + '" alt="" onerror="this.style.visibility=\'hidden\'">';
    return badge(id, t ? t.c1 : '#333', t ? t.c2 : '#fff', size);
  }
  function badge(ab, c1, c2, size) {
    return '<svg class="logo" width="' + size + '" height="' + size + '" viewBox="0 0 40 40"><path d="M20 2 L36 9 V22 C36 31 28 36 20 38 C12 36 4 31 4 22 V9 Z" fill="' + U.esc(c1) + '" stroke="' + U.esc(c2) + '" stroke-width="2.5"/><text x="20" y="25" text-anchor="middle" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="' + (ab.length > 3 ? 10 : 13) + '" fill="' + U.esc(c2) + '">' + U.esc(ab) + '</text></svg>';
  }
  function face(p, size) {
    size = size || 40;
    var t = S().teams[p.t], c = t ? t.c1 : '#2a3340';
    var ini = p.n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    var fb = '<span class="face ini" style="width:' + size + 'px;height:' + size + 'px;background:' + c + '">' + U.esc(ini) + '</span>';
    if (!p.hs) return fb;
    return '<span class="face" style="width:' + size + 'px;height:' + size + 'px;background:' + c + '"><img loading="lazy" src="https://a.espncdn.com/i/headshots/nba/players/full/' + p.hs + '.png" onerror="this.remove()" alt=""></span>';
  }
  function ovrTag(v, cls) { var k = v >= 90 ? 'o5' : v >= 84 ? 'o4' : v >= 78 ? 'o3' : v >= 72 ? 'o2' : 'o1'; return '<span class="ovr ' + k + ' ' + (cls || '') + '">' + v + '</span>'; }
  function contractStr(p) { return p.sal && p.sal.length ? U.money(p.sal[0]) + ' <span class="dim">x' + p.sal.length + '</span>' : '<span class="dim">-</span>'; }
  function ppg(p) { var s = p.st; if (!s || !s.g) return p.last ? '<span class="dim">' + p.last[0] + ' / ' + p.last[1] + ' / ' + p.last[2] + '</span>' : '<span class="dim">-</span>'; return (s.pts / s.g).toFixed(1) + ' / ' + (s.reb / s.g).toFixed(1) + ' / ' + (s.ast / s.g).toFixed(1); }
  function injTag(p) { return p.inj > 0 ? '<span class="inj">OUT ' + p.inj + '</span>' : ''; }
  function playerRow(p, extra, act) {
    return '<div class="prow" data-a="' + (act || 'player') + '" data-id="' + p.id + '">' + face(p, 38) +
      '<div class="pmain"><div class="pname">' + U.esc(p.n) + ' ' + injTag(p) + '</div><div class="psub">' + p.pos + ' &middot; ' + p.age + 'y &middot; ' + contractStr(p) + '</div></div>' +
      (extra || '') + '<div class="prat">' + ovrTag(p.ovr) + '<span class="pot">' + (p.scout ? p.scout[0] + '-' + p.scout[1] : p.pot) + '</span></div></div>';
  }
  function capBar(tid) {
    var c = L.capStatus(tid), max = c.c.ap2 * 1.12, pct = function (x) { return Math.min(100, x / max * 100).toFixed(1) + '%'; };
    return '<div class="capbar"><div class="fill ' + (c.pay > c.c.tax ? 'hot' : '') + '" style="width:' + pct(c.pay) + '"></div>' +
      ['cap', 'tax', 'ap1', 'ap2'].map(function (k) { return '<i style="left:' + pct(c.c[k]) + '"></i>'; }).join('') +
      '</div><div class="caplbl"><b>' + U.money(c.pay) + '</b> payroll &middot; <span class="lvl">' + c.level + '</span> &middot; ' + (c.space > 0 ? U.money(c.space) + ' space' : U.money(-c.space) + ' over cap') + '</div>';
  }
  function modal(html) {
    var m = U.$('#modal'); m.innerHTML = '<div class="mbox">' + html + '</div>'; m.classList.add('show');
  }
  function closeModal() { var m = U.$('#modal'), sh = m.classList.contains('sheet'); m.classList.remove('show'); m.classList.remove('sheet'); m.innerHTML = ''; if (sh) { var y = window.scrollY; render(); window.scrollTo(0, y); } }
  function phaseName() {
    var s = S();
    return { fantasy: 'FANTASY DRAFT', regular: s.day < s.deadline ? 'REGULAR SEASON' : 'POST DEADLINE', playoffs: 'PLAYOFFS', lottery: 'DRAFT LOTTERY', draft: 'NBA DRAFT', resign: 'RE-SIGN PLAYERS', fa: 'FREE AGENCY' }[s.phase] || s.phase.toUpperCase();
  }

  // ---------- render ----------
  var TABS = [['home', 'HOME'], ['roster', 'ROSTER'], ['trade', 'TRADE'], ['picks', 'PICKS'], ['league', 'LEAGUE'], ['more', 'MORE']];
  function go(view, p) { st.view = view; st.p = p || {}; render(); window.scrollTo(0, 0); }
  function render() {
    var app = U.$('#app'), s = S();
    if (st.view === 'title' || st.view === 'newgame' || !s) { app.innerHTML = V[st.view === 'newgame' ? 'newgame' : 'title'](st.p); return; }
    var t = s.teams[s.user];
    if (st.view === 'live') { app.innerHTML = '<main class="livem">' + V.live(st.p) + '</main>'; return; }
    var head = '<header class="top" style="--tc:' + t.c1 + '">' + logo(s.user, 34) + '<div class="tinfo"><div class="tname">' + U.esc(t.city + ' ' + t.name) + '</div><div class="tsub">' + U.seasonLabel(s.season) + ' &middot; ' + t.w + '-' + t.l + ' &middot; ' + phaseName() + '</div></div></header>';
    var body = (V[st.view] || V.home)(st.p);
    var nav = s.phase === 'fantasy' ? '' : '<nav class="tabs">' + TABS.map(function (x) { return '<button data-a="tab" data-v="' + x[0] + '" class="' + (st.view === x[0] ? 'on' : '') + '">' + icon(x[0]) + '<span>' + x[1] + '</span></button>'; }).join('') + '</nav>';
    app.innerHTML = head + '<main>' + body + '</main>' + nav;
  }
  function icon(k) {
    var d = {
      home: 'M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z', roster: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 21c0-5 4-8 9-8s9 3 9 8z',
      trade: 'M4 8h13l-4-4 M20 16H7l4 4', picks: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
      league: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2', more: 'M5 12h.01 M12 12h.01 M19 12h.01'
    }[k];
    return '<svg viewBox="0 0 24 24" width="20" height="20"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---------- title ----------
  V.title = function () {
    var h = '<div class="title"><div class="brand"><div class="b1">NBA</div><div class="b2">REBUILDER</div><div class="b3">REAL ' + U.seasonLabel(2027) + ' ROSTERS &middot; REAL CONTRACTS &middot; REAL CAP</div></div><div class="slots">';
    for (var i = 1; i <= SLOTS; i++) {
      var info = slotInfo(i);
      if (info) {
        h += '<div class="slot"><div class="slotl">' + (info.logo ? '<img class="logo" src="' + info.logo + '" width="44" height="44">' : badge(info.id, info.c1, info.c2, 44)) + '<div><div class="sn">SLOT ' + i + '</div><div class="st">' + U.esc(info.team) + '</div><div class="ss">' + U.seasonLabel(info.season) + ' &middot; ' + info.rec + (info.titles ? ' &middot; ' + info.titles + ' TITLE' + (info.titles > 1 ? 'S' : '') : '') + '</div></div></div>' +
          '<div class="slotb"><button class="btn gold" data-a="load" data-slot="' + i + '">CONTINUE</button><button class="btn ghost sm" data-a="delslot" data-slot="' + i + '">DELETE</button></div></div>';
      } else h += '<div class="slot empty"><div class="sn">SLOT ' + i + '</div><div class="st dim">Empty</div><button class="btn" data-a="newgame" data-slot="' + i + '">NEW GAME</button></div>';
    }
    h += '</div><div class="foot dim">Rosters from ESPN, contracts from Basketball Reference (Nov 1, 2026). Ratings are made from real stats. Draft prospects are made-up players.</div></div>';
    return h;
  };
  A.load = function (d) { var s = load(+d.slot); if (!s) { U.toast('Save is broken.'); return; } G.S = s; go('home'); };
  A.delslot = function (d) {
    modal('<h3>DELETE SLOT ' + d.slot + '?</h3><p>This erases that save for good.</p><div class="row"><button class="btn red" data-a="delyes" data-slot="' + d.slot + '">DELETE</button><button class="btn ghost" data-a="close">CANCEL</button></div>');
  };
  A.delyes = function (d) { localStorage.removeItem(KEY + d.slot); closeModal(); render(); };
  A.close = closeModal;
  A.newgame = function (d) { G.S = null; go('newgame', { slot: +d.slot, step: 'mode' }); };

  // ---------- new game ----------
  var COLORS = ['#c8102e', '#0e2240', '#00471b', '#552583', '#f58426', '#007ac1', '#fdb927', '#000000', '#ffffff', '#5d76a9', '#e56020', '#008ca8', '#98002e', '#79bc43', '#c4ced4', '#f6c31c'];
  V.newgame = function (p) {
    var h = '<div class="ng"><button class="back" data-a="totitle">BACK</button>';
    if (p.step === 'mode') {
      h += '<h2>NEW GAME &middot; SLOT ' + p.slot + '</h2><div class="modes">' +
        '<button class="mode" data-a="ngmode" data-m="control"><div class="mt">CONTROL A TEAM</div><div class="md">Take over a real NBA team with its real roster, contracts and draft picks. Turn on fantasy draft to reset every roster.</div></button>' +
        '<button class="mode" data-a="ngmode" data-m="create"><div class="mt">CREATE A TEAM</div><div class="md">Make your own franchise. It joins the league and every team re-drafts from scratch in a fantasy draft.</div></button></div>';
    } else if (p.step === 'control') {
      var ids = NBA_TEAMS.slice().sort(function (a, b) { return a.city.localeCompare(b.city); });
      h += '<h2>PICK YOUR TEAM</h2>' + lenPick(p) + '<label class="tog"><input type="checkbox" id="fdtog" ' + (p.fantasy ? 'checked' : '') + ' data-a="fdtog"> <span>FANTASY DRAFT (reset every roster)</span></label><div class="tgrid">' +
        ids.map(function (t) {
          var pay = U.sum(NBA_PLAYERS.filter(function (x) { return x.t === t.id; }), function (x) { return x.sal[0] || 0; });
          var top = NBA_PLAYERS.filter(function (x) { return x.t === t.id; }).sort(function (a, b) { return b.ovr - a.ovr; })[0];
          return '<button class="tcard ' + (p.team === t.id ? 'on' : '') + '" data-a="ngteam" data-id="' + t.id + '" style="--tc:' + t.c1 + '"><img class="logo" loading="lazy" src="' + t.logo + '" width="38" height="38"><div class="tc1">' + U.esc(t.city) + '</div><div class="tc2">' + U.esc(t.name) + '</div><div class="tc3">' + U.money(pay) + (top ? ' &middot; ' + U.esc(top.n.replace(/ (Jr\.|Sr\.|II|III|IV)$/, '').split(' ').slice(-1)[0]) + ' ' + top.ovr : '') + '</div></button>';
        }).join('') + '</div>' +
        '<div class="stick"><button class="btn gold big" data-a="ngstart" ' + (p.team ? '' : 'disabled') + '>' + (p.team ? 'START WITH THE ' + U.esc(NBA_TEAMS.filter(function (t) { return t.id === p.team; })[0].name.toUpperCase()) : 'PICK A TEAM') + '</button></div>';
    } else if (p.step === 'create') {
      var c = p.c || (p.c = { city: '', name: '', id: '', c1: '#0e2240', c2: '#f6c31c', conf: 'E' });
      h += '<h2>CREATE YOUR TEAM</h2><div class="form">' +
        '<div class="prev">' + badge(c.id || '???', c.c1, c.c2, 86) + '<div class="pvn">' + U.esc((c.city || 'CITY') + ' ' + (c.name || 'NAME')) + '</div></div>' +
        '<label>CITY<input id="f_city" maxlength="18" value="' + U.esc(c.city) + '" placeholder="Milwaukee"></label>' +
        '<label>TEAM NAME<input id="f_name" maxlength="16" value="' + U.esc(c.name) + '" placeholder="Blades"></label>' +
        '<label>ABBREVIATION (2-4 letters)<input id="f_id" maxlength="4" value="' + U.esc(c.id) + '" placeholder="MKB"></label>' +
        lenPick(p) + '<div class="lbl">CONFERENCE</div><div class="seg"><button data-a="ngconf" data-c="E" class="' + (c.conf === 'E' ? 'on' : '') + '">EAST</button><button data-a="ngconf" data-c="W" class="' + (c.conf === 'W' ? 'on' : '') + '">WEST</button></div>' +
        '<div class="lbl">MAIN COLOR</div><div class="sw">' + COLORS.map(function (x) { return '<button data-a="ngcol" data-k="c1" data-c="' + x + '" style="background:' + x + '" class="' + (c.c1 === x ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
        '<div class="lbl">SECOND COLOR</div><div class="sw">' + COLORS.map(function (x) { return '<button data-a="ngcol" data-k="c2" data-c="' + x + '" style="background:' + x + '" class="' + (c.c2 === x ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
        '<p class="dim">Your team joins as the 31st team. Every roster gets wiped and the whole league does a 14-round fantasy draft. Real contracts and draft picks stay.</p>' +
        '</div><div class="stick"><button class="btn gold big" data-a="ngcreate">START FANTASY DRAFT</button></div>';
    }
    return h + '</div>';
  };
  var LENS = [20, 41, 58, 82];
  function lenPick(p) {
    var v = p.len || 82;
    return '<div class="lbl">GAMES PER SEASON</div><div class="seg">' + LENS.map(function (n) { return '<button data-a="nglen" data-n="' + n + '" class="' + (v === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div>';
  }
  A.nglen = function (d) { if (st.p.c) readForm(); if (U.$('#fdtog')) st.p.fantasy = U.$('#fdtog').checked; st.p.len = +d.n; var y = window.scrollY; render(); window.scrollTo(0, y); };
  function readForm() {
    var c = st.p.c; if (!c) return;
    ['city', 'name', 'id'].forEach(function (k) { var e = U.$('#f_' + k); if (e) c[k] = e.value.trim(); });
    c.id = c.id.toUpperCase().replace(/[^A-Z]/g, '');
  }
  A.totitle = function () { G.S = null; go('title'); };
  A.ngmode = function (d) { st.p.step = d.m; if (d.m === 'control') st.p.fantasy = false; render(); };
  A.fdtog = function () { st.p.fantasy = U.$('#fdtog').checked; };
  A.ngteam = function (d) { st.p.fantasy = U.$('#fdtog') ? U.$('#fdtog').checked : st.p.fantasy; st.p.team = d.id; var y = window.scrollY; render(); window.scrollTo(0, y); };
  A.ngconf = function (d) { readForm(); st.p.c.conf = d.c; render(); };
  A.ngcol = function (d) { readForm(); st.p.c[d.k] = d.c; var y = window.scrollY; render(); window.scrollTo(0, y); };
  A.ngstart = function () {
    if (!st.p.team) return;
    var fantasy = U.$('#fdtog') ? U.$('#fdtog').checked : false;
    L.newLeague({ mode: 'control', team: st.p.team, fantasy: fantasy, slot: st.p.slot, len: st.p.len || 82 });
    save(); go('home');
  };
  A.ngcreate = function () {
    readForm(); var c = st.p.c;
    if (c.city.length < 2 || c.name.length < 2) { U.toast('Give your team a city and a name.'); return; }
    if (c.id.length < 2) { U.toast('Abbreviation needs 2-4 letters.'); return; }
    if (NBA_TEAMS.some(function (t) { return t.id === c.id; }) || c.id === 'FA' || c.id === 'DC') { U.toast(c.id + ' is taken by a real team. Pick another.'); return; }
    if (c.c1 === c.c2) { U.toast('Pick two different colors.'); return; }
    L.newLeague({ mode: 'create', fantasy: true, slot: st.p.slot, len: st.p.len || 82, custom: { id: c.id, city: c.city, name: c.name, c1: c.c1, c2: c.c2, conf: c.conf } });
    save(); go('home');
  };
  A.tab = function (d) { go(d.v); };

  function init() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-a]'); if (!el) return;
      if (el.tagName === 'INPUT' && el.type === 'checkbox' && el.dataset.a === 'fdtog') { A.fdtog(); return; }
      if (el.disabled) return;
      var f = A[el.dataset.a]; if (!f) return;
      if (el.dataset.a !== 'fdtog') e.preventDefault();
      if (el.dataset.stop) e.stopPropagation();
      f(el.dataset, el, e);
    });
    document.addEventListener('change', function (e) {
      var el = e.target; if (el.dataset && el.dataset.ch && A[el.dataset.ch]) A[el.dataset.ch](el.dataset, el);
    });
    U.$('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
    render();
  }
  return { A: A, V: V, st: st, go: go, render: render, save: save, logo: logo, badge: badge, face: face, ovrTag: ovrTag, contractStr: contractStr, ppg: ppg, injTag: injTag, playerRow: playerRow, capBar: capBar, modal: modal, closeModal: closeModal, init: init, phaseName: phaseName };
})();
