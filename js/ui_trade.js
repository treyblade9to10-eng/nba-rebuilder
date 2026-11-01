// ui_trade.js - trade screen + draft picks
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function P() { var p = UI.st.p; ['ap', 'bp', 'apk', 'bpk'].forEach(function (k) { p[k] = (p[k] || []).slice(); }); return p; }
  function cur() { var p = UI.st.p; return { a: S().user, b: p.b, ap: p.ap || [], bp: p.bp || [], apk: p.apk || [], bpk: p.bpk || [] }; }

  V.trade = function (p) {
    var s = S(); P();
    if (!Sim.tradeOpen()) return '<h2>TRADES</h2><div class="card">' + (s.phase === 'regular' ? 'The trade deadline has passed. Trades open again after the playoffs, at the draft.' : s.phase === 'playoffs' ? 'No trades during the playoffs. They open again at the draft.' : 'Trades are closed right now.') + '</div>';
    var ids = L.teamIds().filter(function (id) { return id !== s.user; }).sort(function (a, b) { return L.teamName(a).localeCompare(L.teamName(b)); });
    var h = '<h2>TRADE</h2><div class="tsel"><select data-ch="tpartner"><option value="">Pick a team...</option>' + ids.map(function (id) { return '<option value="' + id + '" ' + (p.b === id ? 'selected' : '') + '>' + U.esc(L.teamName(id)) + ' (' + L.team(id).w + '-' + L.team(id).l + ')</option>'; }).join('') + '</select></div>';
    if (p.find && !p.b) {
      h += '<div class="card"><div class="lbl">OFFERS FOR</div>' + p.ap.map(function (id) { return '<div>' + U.esc(L.player(id).n) + '</div>'; }).join('') + p.apk.map(function (id) { return '<div>' + L.pickLabel(Trade.pk(id)) + '</div>'; }).join('') + '</div>';
      var offs = p.offers || (p.offers = Trade.offersFor(p.ap, p.apk));
      if (!offs.length) h += '<div class="card dim">Nobody wants to give much for that right now. Try adding a pick, or pick a team and build it yourself.</div>';
      offs.forEach(function (tr, i) {
        h += '<div class="card offer"><div class="mu">' + UI.logo(tr.b, 34) + '<b>' + U.esc(L.teamName(tr.b)) + '</b></div><div class="lbl">YOU GET</div>' + tr.bp.map(function (id) { var q = L.player(id); return '<div class="mini">' + UI.ovrTag(q.ovr) + ' ' + U.esc(q.n) + ' <span class="dim">' + q.pos + ', ' + q.age + 'y, ' + U.money(q.sal[0]) + ' x' + q.sal.length + '</span></div>'; }).join('') + tr.bpk.map(function (id) { return '<div class="mini"><span class="chip">' + L.pickLabel(Trade.pk(id)) + '</span></div>'; }).join('') + '<button class="btn gold sm" data-a="loadoffer" data-i="' + i + '">LOOK AT IT</button></div>';
      });
      return h;
    }
    var a = s.user, b = p.b;
    h += side('YOU SEND', a, p.ap, p.apk, 'a');
    if (b) h += side('YOU GET', b, p.bp, p.bpk, 'b');
    else h += '<div class="card dim">Pick a team above, or select your players and tap FIND OFFERS to see what teams will give.</div>';
    // summary
    var tr = cur(), so = Trade.salOf(tr.ap), si = Trade.salOf(tr.bp);
    h += '<div class="tsum"><div class="tline"><span>OUT ' + U.money(so) + '</span><span>IN ' + U.money(si) + '</span><span>PAYROLL AFTER ' + U.money(L.payroll(a) - so + si) + '</span></div>';
    if (b) {
      var ev = Trade.evaluate(tr), errs = Trade.validate(tr);
      h += '<div class="meter"><div class="mfill ' + (ev.ok ? 'ok' : '') + '" style="width:' + ev.pct + '%"></div><i style="left:80%"></i></div><div class="mlbl">' + U.esc(L.shortName(b)) + ' interest: <b>' + ev.pct + '%</b> ' + (ev.ok ? '&middot; they would say yes' : '&middot; need 80%') + '</div>';
      errs.forEach(function (e) { if (!/Add something/.test(e)) h += '<div class="err">' + U.esc(e) + '</div>'; });
      h += '<div class="row"><button class="btn gold" data-a="propose">PROPOSE</button><button class="btn" data-a="want">WHAT DO THEY WANT?</button>' + (tr.ap.length || tr.apk.length ? '<button class="btn" data-a="findoff">FIND OFFERS</button>' : '') + '<button class="btn ghost" data-a="tclear">CLEAR</button></div>';
    } else if (tr.ap.length || tr.apk.length) h += '<div class="row"><button class="btn gold" data-a="findoff">FIND OFFERS</button></div>';
    h += '</div>';
    return h;
  };
  function side(title, tid, sel, selk, k) {
    var ros = L.roster(tid).sort(function (x, y) { return y.ovr - x.ovr; });
    var h = '<div class="card tside"><div class="lbl">' + title + ' &middot; ' + U.esc(L.shortName(tid)) + ' <span class="dim">' + U.money(L.payroll(tid)) + '</span></div>';
    h += ros.map(function (p) {
      var on = sel.indexOf(p.id) >= 0;
      return '<div class="tp ' + (on ? 'on' : '') + '" data-a="tsel" data-k="' + k + '" data-id="' + p.id + '"><span class="ck"></span>' + UI.ovrTag(p.ovr) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + ' ' + UI.injTag(p) + '</div><div class="psub">' + p.pos + ' &middot; ' + p.age + 'y &middot; POT ' + p.pot + ' &middot; ' + U.money(p.sal[0]) + ' x' + p.sal.length + '</div></div><span class="tv">' + L.playerValue(p, k === 'a' ? (UI.st.p.b || S().user) : tid).toFixed(0) + '</span></div>';
    }).join('');
    var pk = L.picksOf(tid);
    h += '<div class="lbl">PICKS</div><div class="chips">' + (pk.map(function (x) { return '<button class="chip ' + (selk.indexOf(x.id) >= 0 ? 'on' : '') + '" data-a="tpick" data-k="' + k + '" data-id="' + x.id + '">' + L.pickLabel(x) + '</button>'; }).join('') || '<span class="dim">No picks</span>') + '</div>';
    return h + '</div>';
  }
  function keep(fn) { var y = window.scrollY; fn(); UI.render(); window.scrollTo(0, y); }
  A.tpartner = function (d, el) { var p = P(); p.b = el.value || null; p.bp = []; p.bpk = []; p.find = false; p.offers = null; UI.render(); };
  A.tsel = function (d) { keep(function () { var p = P(), arr = p[d.k + 'p'], id = +d.id, i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id); p.offers = null; }); };
  A.tpick = function (d) { keep(function () { var p = P(), arr = p[d.k + 'pk'], i = arr.indexOf(d.id); if (i >= 0) arr.splice(i, 1); else arr.push(d.id); p.offers = null; }); };
  A.tclear = function () { var p = P(); p.ap = []; p.bp = []; p.apk = []; p.bpk = []; UI.render(); };
  A.findoff = function () { var p = P(); if (!p.ap.length && !p.apk.length) { U.toast('Select your players or picks first.'); return; } p.find = true; p.b = null; p.bp = []; p.bpk = []; p.offers = null; UI.render(); };
  A.loadoffer = function (d) { var p = P(), tr = p.offers[+d.i]; UI.go('trade', { b: tr.b, ap: tr.ap.slice(), bp: tr.bp.slice(), apk: tr.apk.slice(), bpk: tr.bpk.slice() }); };
  A.want = function () {
    var tr = cur();
    if (Trade.evaluate(tr).ok) { U.toast('They already like this one. Hit PROPOSE.'); return; }
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
    return;
    UI.modal('<h3>TRADE ACCEPTED</h3><p>' + U.esc(Trade.describe(tr)) + '</p><div class="row"><button class="btn gold" data-a="close">NICE</button></div>');
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
