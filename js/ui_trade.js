// ui_trade.js - trade screen (deal board + pickers) and draft picks
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function P() { var p = UI.st.p; ['ap', 'bp', 'apk', 'bpk'].forEach(function (k) { p[k] = (p[k] || []).slice(); }); return p; }
  function cur() { var p = UI.st.p; return { a: S().user, b: p.b, ap: p.ap || [], bp: p.bp || [], apk: p.apk || [], bpk: p.bpk || [] }; }

  function partnerBar(p) {
    var s = S(), ids = L.teamIds().filter(function (id) { return id !== s.user; }).sort(function (a, b) { return L.teamName(a).localeCompare(L.teamName(b)); });
    return '<div class="tpart">' + (p.b ? UI.logo(p.b, 36) : '<span class="tq">?</span>') + '<select data-ch="tpartner"><option value="">Pick a team to trade with...</option>' + ids.map(function (id) { var t = L.team(id); return '<option value="' + id + '" ' + (p.b === id ? 'selected' : '') + '>' + U.esc(L.teamName(id)) + ' (' + t.w + '-' + t.l + ', ' + (t.strat === 'rebuild' ? 'rebuilding' : 'contending') + ')</option>'; }).join('') + '</select></div>';
  }
  function item(id, k, tid) {
    var q = L.player(id);
    return '<div class="ditem">' + UI.ovrTag(q.ovr) + '<div class="pmain" data-a="player" data-id="' + id + '"><div class="pname">' + U.esc(q.n) + '</div><div class="psub">' + q.pos + ' &middot; ' + q.age + 'y &middot; ' + U.money(q.sal[0]) + (q.sal.length > 1 ? ' x' + q.sal.length : '') + '</div></div><button class="x" data-a="trm" data-k="' + k + 'p" data-id="' + id + '">&times;</button></div>';
  }
  function pitem(id, k) {
    var pk = Trade.pk(id);
    return '<div class="ditem pick"><span class="pkic">PICK</span><div class="pmain"><div class="pname">' + L.pickLabel(pk) + '</div><div class="psub">proj. #' + (pk.r === 1 ? L.projSlot(pk.o, pk.y) : L.projSlot(pk.o, pk.y) + L.teamIds().length) + '</div></div><button class="x" data-a="trm" data-k="' + k + 'pk" data-id="' + id + '">&times;</button></div>';
  }
  function column(title, tid, pl, pk, k) {
    var h = '<div class="dcol"><div class="dh">' + (tid ? UI.logo(tid, 18) + ' ' : '') + title + '</div>';
    h += pl.map(function (id) { return item(id, k, tid); }).join('') + pk.map(function (id) { return pitem(id, k); }).join('');
    if (!pl.length && !pk.length) h += '<div class="dempty">Nothing yet</div>';
    if (tid) h += '<div class="dadd"><button class="btn sm" data-a="tadd" data-k="' + k + '" data-m="p">+ PLAYER</button><button class="btn sm" data-a="tadd" data-k="' + k + '" data-m="k">+ PICK</button></div>';
    return h + '</div>';
  }

  V.trade = function (p) {
    var s = S(); P();
    if (!Sim.tradeOpen()) return '<h2>TRADES</h2><div class="card">' + (s.phase === 'regular' ? 'The trade deadline has passed. Trades open again after the playoffs, at the draft.' : s.phase === 'playoffs' ? 'No trades during the playoffs. They open again at the draft.' : 'Trades are closed right now.') + '</div>';
    var h = '<div class="hrow"><h2>TRADE</h2><button class="btn ghost sm" data-a="tclear">RESET</button></div>' + partnerBar(p);
    if (p.find && !p.b) {
      h += '<div class="card"><div class="lbl">OFFERS FOR</div><div class="chips">' + p.ap.map(function (id) { return '<span class="chip">' + U.esc(L.player(id).n) + '</span>'; }).join('') + p.apk.map(function (id) { return '<span class="chip">' + L.pickLabel(Trade.pk(id)) + '</span>'; }).join('') + '</div></div>';
      var offs = p.offers || (p.offers = Trade.offersFor(p.ap, p.apk));
      if (!offs.length) h += '<div class="card dim">Nobody wants to give much for that right now. Try adding a pick, or pick a team and build it yourself.</div>';
      offs.forEach(function (tr, i) {
        h += '<div class="offer2" data-a="loadoffer" data-i="' + i + '">' + UI.logo(tr.b, 34) + '<div class="pmain"><div class="pname">' + U.esc(L.teamName(tr.b)) + '</div><div class="psub">' + tr.bp.map(function (id) { var q = L.player(id); return U.esc(q.n) + ' (' + q.ovr + ')'; }).concat(tr.bpk.map(function (id) { return L.pickLabel(Trade.pk(id)); })).join(', ') + '</div></div><span class="go">VIEW</span></div>';
      });
      return h;
    }
    var a = s.user, b = p.b;
    h += '<div class="deal">' + column('YOU SEND', a, p.ap, p.apk, 'a') + '<div class="darrow">&#8644;</div>' + column(b ? U.esc(L.shortName(b).toUpperCase()) + ' SEND' : 'YOU GET', b, p.bp, p.bpk, 'b') + '</div>';
    var tr = cur(), so = Trade.salOf(tr.ap), si = Trade.salOf(tr.bp), c = L.capFor(), after = L.payroll(a) - so + si;
    h += '<div class="tline2"><div><span>SENDING</span><b>' + U.money(so) + '</b></div><div><span>GETTING</span><b>' + U.money(si) + '</b></div><div><span>YOUR PAYROLL</span><b class="' + (after > c.tax ? 'neg' : '') + '">' + U.money(after) + '</b></div></div>';
    if (b) {
      var ev = Trade.evaluate(tr), errs = Trade.validate(tr);
      var empty = !tr.ap.length && !tr.bp.length && !tr.apk.length && !tr.bpk.length;
      if (!empty) {
        h += '<div class="meter"><div class="mfill ' + (ev.ok ? 'ok' : '') + '" style="width:' + ev.pct + '%"></div><i style="left:80%"></i></div><div class="mlbl">' + U.esc(L.shortName(b)) + ' interest: <b>' + ev.pct + '%</b> ' + (ev.ok ? (errs.length ? '&middot; they like it, but it breaks a rule below' : '&middot; they would say yes') : '&middot; need 80%') + '</div>';
        errs.forEach(function (e) { if (!/Add something/.test(e)) h += '<div class="err">' + U.esc(e) + '</div>'; });
      }
      h += '<div class="tbtns"><button class="btn gold" data-a="propose" ' + (empty ? 'disabled' : '') + '>PROPOSE</button><button class="btn" data-a="want">WHAT DO THEY WANT?</button>' + (tr.ap.length || tr.apk.length ? '<button class="btn" data-a="findoff">SHOP IT</button>' : '') + '</div>';
    } else {
      h += '<div class="card dim small">Pick a team above. Or add your own players or picks and tap SHOP IT to see what every team would give.</div>';
      if (tr.ap.length || tr.apk.length) h += '<button class="btn gold wide" data-a="findoff">SHOP IT TO THE LEAGUE</button>';
    }
    return h;
  };

  // ---- picker sheet ----
  var pk = { k: 'a', m: 'p', f: 'ALL' };
  function sheet() {
    var s = S(), p = UI.st.p, tid = pk.k === 'a' ? s.user : p.b;
    var sel = pk.m === 'p' ? p[pk.k + 'p'] : p[pk.k + 'pk'];
    var h = '<div class="sheethead"><h3>' + (pk.k === 'a' ? 'ADD FROM YOUR TEAM' : 'ADD FROM ' + U.esc(L.shortName(tid).toUpperCase())) + '</h3><button class="btn gold sm" data-a="tdone">DONE</button></div>';
    h += '<div class="seg"><button data-a="tsm" data-m="p" class="' + (pk.m === 'p' ? 'on' : '') + '">PLAYERS</button><button data-a="tsm" data-m="k" class="' + (pk.m === 'k' ? 'on' : '') + '">PICKS</button>' + (pk.m === 'p' ? ['ALL', 'G', 'F', 'C'].map(function (x) { return '<button data-a="tsf" data-f="' + x + '" class="' + (pk.f === x ? 'on' : '') + ' sm2">' + x + '</button>'; }).join('') : '') + '</div><div class="sheetlist">';
    if (pk.m === 'p') {
      L.roster(tid).filter(function (q) { return pk.f === 'ALL' || Off.posGroup(q.pos) === pk.f; }).sort(function (x, y) { return y.ovr - x.ovr; }).forEach(function (q) {
        var on = sel.indexOf(q.id) >= 0;
        h += '<div class="srow2 ' + (on ? 'on' : '') + '" data-a="ttog" data-id="' + q.id + '"><span class="ck"></span>' + UI.ovrTag(q.ovr) + '<div class="pmain"><div class="pname">' + U.esc(q.n) + ' ' + UI.injTag(q) + '</div><div class="psub">' + q.pos + ' &middot; ' + q.age + 'y &middot; POT ' + q.pot + '</div></div><div class="pst">' + U.money(q.sal[0]) + '<br><span class="dim">x' + q.sal.length + '</span></div></div>';
      });
    } else {
      var list = L.picksOf(tid);
      if (!list.length) h += '<div class="dim">No picks to trade.</div>';
      list.forEach(function (x) {
        var on = sel.indexOf(x.id) >= 0;
        h += '<div class="srow2 ' + (on ? 'on' : '') + '" data-a="ttog" data-id="' + x.id + '"><span class="ck"></span>' + UI.logo(x.o, 24) + '<div class="pmain"><div class="pname">' + L.pickLabel(x) + '</div><div class="psub">projected #' + (x.r === 1 ? L.projSlot(x.o, x.y) : L.projSlot(x.o, x.y) + L.teamIds().length) + '</div></div></div>';
      });
    }
    return h + '</div>';
  }
  function showSheet(keepScroll) {
    var y = 0, l = document.querySelector('.sheetlist'); if (keepScroll && l) y = l.scrollTop;
    UI.modal(sheet());
    document.getElementById('modal').classList.add('sheet');
    l = document.querySelector('.sheetlist'); if (l) l.scrollTop = y;
  }
  A.tadd = function (d) { pk.k = d.k; pk.m = d.m; pk.f = 'ALL'; P(); showSheet(); };
  A.tsm = function (d) { pk.m = d.m; showSheet(); };
  A.tsf = function (d) { pk.f = d.f; showSheet(); };
  A.ttog = function (d) {
    var p = P(), key = pk.k + (pk.m === 'p' ? 'p' : 'pk'), id = pk.m === 'p' ? +d.id : d.id, arr = p[key], i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    p.offers = null; showSheet(true);
  };
  A.tdone = function () { UI.closeModal(); };
  A.trm = function (d) { var p = P(), arr = p[d.k], id = /pk$/.test(d.k) ? d.id : +d.id, i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); p.offers = null; UI.render(); };

  A.tpartner = function (d, el) { var p = P(); p.b = el.value || null; p.bp = []; p.bpk = []; p.find = false; p.offers = null; UI.render(); };
  A.tclear = function () { UI.go('trade', {}); };
  A.findoff = function () { var p = P(); if (!p.ap.length && !p.apk.length) { U.toast('Add your players or picks first.'); return; } p.find = true; p.b = null; p.bp = []; p.bpk = []; p.offers = null; UI.render(); };
  A.loadoffer = function (d) { var p = P(), tr = p.offers[+d.i]; UI.go('trade', { b: tr.b, ap: tr.ap.slice(), bp: tr.bp.slice(), apk: tr.apk.slice(), bpk: tr.bpk.slice() }); };
  A.want = function () {
    var tr = cur();
    if (!tr.bp.length && !tr.bpk.length) { U.toast('Add who you want from them first.'); return; }
    if (Trade.evaluate(tr).ok) { var e0 = Trade.validate(tr); U.toast(e0.length ? 'They like it. Fix this first: ' + e0[0] : 'They already like this one. Hit PROPOSE.'); return; }
    var ok = Trade.whatTheyWant(tr);
    var p = UI.st.p; p.ap = tr.ap; p.apk = tr.apk;
    UI.render();
    U.toast(ok ? 'They added what they want from you. Look it over.' : 'They could not find a way to make it work.');
  };
  A.propose = function () {
    var tr = cur(), errs = Trade.validate(tr);
    if (errs.length) { U.toast(errs[0]); return; }
    var ev = Trade.evaluate(tr);
    if (!ev.ok) { U.toast(L.shortName(tr.b) + ' said no (' + ev.pct + '%). Try WHAT DO THEY WANT?'); return; }
    var txt = Trade.describe(tr);
    Trade.execute(tr); UI.save();
    UI.go('trade', {});
    UI.modal('<h3>TRADE ACCEPTED</h3><p>' + U.esc(txt) + '</p><div class="row"><button class="btn gold" data-a="close">NICE</button></div>');
  };

  // ---------- picks ----------
  V.picks = function () {
    var s = S(), mine = L.picksOf(s.user), h = '<h2>DRAFT PICKS</h2>';
    h += '<div class="dim small">You can trade any pick in the next ' + L.PICK_YEARS + ' drafts. Projected spots use records now and team strength for later years.</div>';
    var years = {}; mine.forEach(function (k) { (years[k.y] = years[k.y] || []).push(k); });
    Object.keys(years).forEach(function (y) {
      h += '<div class="card"><div class="lbl">' + y + ' DRAFT</div>' + years[y].map(function (k) {
        var slot = L.projSlot(k.o, k.y);
        return '<div class="pk">' + UI.logo(k.o, 26) + '<div class="pmain"><div class="pname">' + (k.r === 1 ? '1st round' : '2nd round') + (k.o !== s.user ? ' (from ' + U.esc(L.shortName(k.o)) + ')' : '') + '</div><div class="psub">Projected #' + (k.r === 1 ? slot : slot + L.teamIds().length) + ' &middot; value ' + L.pickValue(k, s.user).toFixed(0) + '</div></div></div>';
      }).join('') + '</div>';
    });
    var owed = s.picks.filter(function (k) { return k.o === s.user && k.h !== s.user; });
    if (owed.length) h += '<div class="card"><div class="lbl">YOUR PICKS OTHER TEAMS OWN</div>' + owed.map(function (k) { return '<div class="pk">' + UI.logo(k.h, 26) + '<div class="pmain"><div class="pname">' + k.y + ' ' + (k.r === 1 ? '1st' : '2nd') + '</div><div class="psub">owned by ' + U.esc(L.teamName(k.h)) + '</div></div></div>'; }).join('') + '</div>';
    if (Sim.tradeOpen()) h += '<button class="btn gold wide" data-a="tab" data-v="trade">GO TRADE</button>';
    return h;
  };
})();
