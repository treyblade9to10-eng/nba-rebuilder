// ui_phase.js - fantasy draft, playoffs, lottery, draft, re-sign, free agency
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function keep(fn) { var y = window.scrollY; fn(); UI.render(); window.scrollTo(0, y); }
  function filterBar(p, act) {
    var f = p.f || 'ALL', so = p.so || 'ovr';
    return '<div class="fbar"><div class="seg">' + ['ALL', 'G', 'F', 'C'].map(function (x) { return '<button data-a="' + act + '" data-f="' + x + '" class="' + (f === x ? 'on' : '') + '">' + x + '</button>'; }).join('') + '</div><div class="seg">' + [['ovr', 'OVR'], ['pot', 'POT'], ['age', 'AGE'], ['sal', '$']].map(function (x) { return '<button data-a="' + act + '" data-so="' + x[0] + '" class="' + (so === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div><input class="search" placeholder="Search players" value="' + U.esc(p.q || '') + '" data-ch="' + act + 'q">';
  }
  function applyFilter(list, p) {
    var f = p.f || 'ALL', so = p.so || 'ovr', q = (p.q || '').toLowerCase();
    if (f !== 'ALL') list = list.filter(function (x) { return Off.posGroup(x.pos) === f; });
    if (q) list = list.filter(function (x) { return x.n.toLowerCase().indexOf(q) >= 0; });
    return list.sort(function (a, b) { return so === 'age' ? a.age - b.age || b.ovr - a.ovr : so === 'sal' ? (a.sal[0] || 0) - (b.sal[0] || 0) : so === 'pot' ? b.pot - a.pot : b.ovr - a.ovr || b.pot - a.pot; });
  }
  function setF(d) { var p = UI.st.p; if (d.f) p.f = d.f; if (d.so) p.so = d.so; }

  // ---------- fantasy draft ----------
  V.fantasy = function (p) {
    var s = S(), f = s.fd, on = Off.fdTeam(), mine = on === s.user, n = f.order.length;
    var pickNo = (f.round - 1) * n + f.idx + 1;
    var h = '<div class="card clock ' + (mine ? 'me' : '') + '"><div class="lbl">FANTASY DRAFT &middot; ROUND ' + f.round + ' OF ' + f.rounds + ' &middot; PICK ' + pickNo + '</div><div class="mu">' + UI.logo(on, 40) + '<div><b>' + (mine ? 'YOU ARE ON THE CLOCK' : U.esc(L.teamName(on)) + ' are picking') + '</b><div class="dim">Your roster: ' + L.roster(s.user).length + ' &middot; payroll ' + U.money(L.payroll(s.user)) + '</div></div></div>' +
      '<div class="row">' + (mine ? '<button class="btn" data-a="fdauto1">AUTO PICK</button>' : '<button class="btn gold" data-a="fdtouser">SIM TO MY PICK</button>') + '<button class="btn ghost" data-a="fdall">AUTO DRAFT THE REST</button></div></div>';
    var myR = L.roster(s.user);
    if (myR.length) h += '<div class="card"><div class="lbl">YOUR TEAM</div><div class="chips">' + myR.map(function (x) { return '<span class="chip">' + x.pos + ' ' + U.esc(x.n) + ' ' + x.ovr + '</span>'; }).join('') + '</div></div>';
    if (f.log.length) h += '<div class="card"><div class="lbl">LAST PICKS</div>' + f.log.slice(0, 5).map(function (x) { return '<div class="mini">#' + x.n + ' ' + UI.logo(x.t, 16) + ' ' + U.esc(x.p) + ' <span class="dim">' + x.ovr + '</span></div>'; }).join('') + '</div>';
    h += filterBar(p, 'fdf');
    var pool = applyFilter(Off.fdPool(), p).slice(0, p.more ? 400 : 60);
    h += pool.map(function (x) { return '<div class="drow">' + UI.playerRow(x) + (mine ? '<button class="btn gold sm" data-a="fdpick" data-id="' + x.id + '">DRAFT</button>' : '') + '</div>'; }).join('');
    if (!p.more) h += '<button class="btn ghost wide" data-a="fdmore">SHOW EVERYONE</button>';
    return h;
  };
  A.fdf = function (d) { keep(function () { setF(d); }); };
  A.fdfq = function (d, el) { UI.st.p.q = el.value; UI.render(); };
  A.fdmore = function () { keep(function () { UI.st.p.more = true; }); };
  A.fdpick = function (d) { Off.fdPick(+d.id); Off.fdSimToUser(); UI.save(); UI.render(); };
  A.fdauto1 = function () { Off.fdCpuPick(); Off.fdSimToUser(); UI.save(); UI.render(); };
  A.fdtouser = function () { Off.fdSimToUser(); UI.save(); UI.render(); };
  A.fdall = function () { Off.fdAutoAll(); UI.save(); UI.go('home'); };

  // ---------- playoffs ----------
  V.playoffs = function () {
    var s = S(), po = s.po, h = '<h2>PLAYOFFS</h2>';
    if (po.stage === 'playin') {
      h += '<div class="card"><div class="lbl">PLAY-IN TOURNAMENT</div>' + ['E', 'W'].map(function (c) { var sd = po.seeds[c]; return '<div class="mini"><b>' + (c === 'E' ? 'EAST' : 'WEST') + '</b>: 7 ' + sd[6] + ' vs 8 ' + sd[7] + ' &middot; 9 ' + sd[8] + ' vs 10 ' + sd[9] + '</div>'; }).join('') + '</div>';
      h += '<div class="row"><button class="btn gold" data-a="po" data-n="day">PLAY THE PLAY-IN</button><button class="btn" data-a="po" data-n="all">SIM WHOLE PLAYOFFS</button></div>';
      return h;
    }
    var rn = ['FIRST ROUND', 'CONF SEMIFINALS', 'CONF FINALS', 'NBA FINALS'][po.round - 1];
    h += '<div class="row"><button class="btn gold" data-a="po" data-n="day">NEXT GAME DAY</button><button class="btn" data-a="po" data-n="round">SIM ROUND</button><button class="btn" data-a="po" data-n="all">SIM TO THE END</button></div>';
    h += '<div class="card"><div class="lbl">' + rn + '</div>' + po.series.map(function (x) {
      var me = x.a === s.user || x.b === s.user;
      return '<div class="series ' + (me ? 'me' : '') + '"><div class="sr">' + UI.logo(x.a, 22) + ' <span class="sd">' + x.sa + '</span> ' + U.esc(L.shortName(x.a)) + '<b>' + x.wa + '</b></div><div class="sr">' + UI.logo(x.b, 22) + ' <span class="sd">' + x.sb + '</span> ' + U.esc(L.shortName(x.b)) + '<b>' + x.wb + '</b></div>' + (x.g.length ? '<div class="dim small">Last: ' + x.g[x.g.length - 1][0] + ' ' + x.g[x.g.length - 1][1] + ', ' + x.g[x.g.length - 1][2] + ' ' + x.g[x.g.length - 1][3] + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    if (po.log.length) h += '<div class="card"><div class="lbl">RESULTS</div>' + po.log.slice().reverse().slice(0, 16).map(function (l) { return '<div class="mini">' + U.esc(l) + '</div>'; }).join('') + '</div>';
    return h;
  };
  A.po = function (d) {
    var s = S();
    if (d.n === 'day') Sim.simPlayoffDay(); else if (d.n === 'round') Sim.simSeries(); else Sim.simPlayoffs();
    UI.save();
    if (s.phase !== 'playoffs') { var hst = s.history[0]; UI.render(); UI.modal('<h3>' + U.esc(L.teamName(hst.champ).toUpperCase()) + ' WIN THE TITLE</h3><div class="center">' + UI.logo(hst.champ, 90) + '</div><p>Finals: beat the ' + U.esc(L.shortName(hst.runner)) + '. MVP: ' + U.esc(hst.mvp ? hst.mvp.n : '-') + '. Rookie of the Year: ' + U.esc(hst.roy ? hst.roy.n : '-') + '.</p><p>Your season: ' + hst.rec + ', ' + hst.finish + '.</p><div class="row"><button class="btn gold" data-a="close">TO THE LOTTERY</button></div>'); return; }
    UI.render();
  };

  // ---------- lottery ----------
  V.lottery = function () {
    var s = S(), lo = s.lottery, h = '<h2>DRAFT LOTTERY ' + s.season + '</h2>';
    h += '<div class="card"><table class="tbl"><tr><th>PICK</th><th>TEAM</th><th>WAS</th><th>ODDS</th></tr>' + lo.order.map(function (id, i) {
      var pre = lo.pre.indexOf(id), jump = pre - i;
      var holder = s.draft.picks[i].h;
      return '<tr class="' + (holder === s.user ? 'me' : '') + '"><td><b>' + (i + 1) + '</b></td><td class="tn">' + UI.logo(id, 20) + ' ' + U.esc(L.shortName(id)) + (holder !== id ? ' <span class="dim">(to ' + holder + ')</span>' : '') + '</td><td>' + (pre + 1) + (jump > 0 ? ' <span class="pos">+' + jump + '</span>' : jump < 0 ? ' <span class="neg">' + jump + '</span>' : '') + '</td><td>' + lo.odds[pre] + '%</td></tr>';
    }).join('') + '</table></div>';
    var mine = s.draft.picks.filter(function (x) { return x.h === s.user; });
    h += '<div class="card">' + (mine.length ? 'Your picks: ' + mine.map(function (x) { return '#' + x.n; }).join(', ') : 'You have no picks in this draft.') + '</div>';
    h += '<button class="btn gold wide" data-a="todraft">GO TO THE DRAFT</button><div class="dim small center">You can still trade picks during the draft.</div>';
    return h;
  };
  A.todraft = function () { Off.startDraft(); UI.save(); UI.go('home'); };

  // ---------- draft ----------
  V.draft = function (p) {
    var s = S(), x = Off.draftOnClock();
    if (!x) return '<div class="card">Draft finished.</div>';
    var mine = x.h === s.user, n = L.teamIds().length;
    var h = '<div class="card clock ' + (mine ? 'me' : '') + '"><div class="lbl">' + s.season + ' NBA DRAFT &middot; ROUND ' + x.r + ' &middot; PICK ' + x.n + '</div><div class="mu">' + UI.logo(x.h, 40) + '<div><b>' + (mine ? 'YOU ARE ON THE CLOCK' : U.esc(L.teamName(x.h)) + ' are picking') + '</b>' + (x.o !== x.h ? '<div class="dim">pick from ' + U.esc(L.shortName(x.o)) + '</div>' : '') + '</div></div>' +
      '<div class="row">' + (mine ? '<button class="btn" data-a="dauto1">AUTO PICK</button>' : '<button class="btn gold" data-a="dtouser">SIM TO MY PICK</button>') + '<button class="btn ghost" data-a="dall">SIM REST OF DRAFT</button><button class="btn ghost" data-a="tab" data-v="trade">TRADE PICKS</button></div></div>';
    var done = s.draft.picks.filter(function (k) { return k.pick; }).slice(-6).reverse();
    if (done.length) h += '<div class="card"><div class="lbl">LAST PICKS</div>' + done.map(function (k) { return '<div class="mini">#' + k.n + ' ' + UI.logo(k.h, 16) + ' ' + U.esc(k.name) + '</div>'; }).join('') + '</div>';
    var myUp = s.draft.picks.slice(s.draft.at).filter(function (k) { return k.h === s.user; }).map(function (k) { return '#' + k.n; });
    if (myUp.length && !mine) h += '<div class="dim small">Your picks: ' + myUp.join(', ') + '</div>';
    h += '<div class="lbl">BIG BOARD</div>';
    var dc = Off.draftClass(), f = p.f || 'ALL';
    if (f !== 'ALL') dc = dc.filter(function (q) { return Off.posGroup(q.pos) === f; });
    h += '<div class="seg">' + ['ALL', 'G', 'F', 'C'].map(function (k) { return '<button data-a="dfil" data-f="' + k + '" class="' + (f === k ? 'on' : '') + '">' + k + '</button>'; }).join('') + '</div>';
    h += dc.slice(0, 45).map(function (q, i) { return '<div class="drow">' + UI.playerRow(q, '<div class="pst">#' + (i + 1) + ' &middot; ' + U.esc(q.ht) + '</div>') + (mine ? '<button class="btn gold sm" data-a="dpick" data-id="' + q.id + '">DRAFT</button>' : '') + '</div>'; }).join('');
    return h;
  };
  A.dfil = function (d) { keep(function () { UI.st.p.f = d.f; }); };
  function afterDraft() { var s = S(); UI.save(); UI.render(); if (s.phase === 'resign') U.toast('Draft is over. Time to re-sign your players.'); }
  A.dpick = function (d) { Off.draftPick(+d.id); Off.draftToUser(); afterDraft(); };
  A.dauto1 = function () { Off.draftCpu(); Off.draftToUser(); afterDraft(); };
  A.dtouser = function () { Off.draftToUser(); afterDraft(); };
  A.dall = function () { Off.draftAll(); afterDraft(); };

  // ---------- re-sign ----------
  V.resign = function () {
    var s = S(), ex = Off.expiring(s.user), h = '<h2>RE-SIGN YOUR PLAYERS</h2>';
    h += '<div class="dim small">These contracts end this summer. You can go over the cap to keep your own guys. Anyone you do not re-sign becomes a free agent.</div>';
    h += '<div class="card"><div class="lbl">NEXT SEASON PAYROLL (SIGNED)</div><b>' + U.money(L.payrollYear(s.user, 1) + U.sum(ex.filter(function (p) { return p.newDeal; }), function (p) { return p.newDeal[0]; })) + '</b> <span class="dim">cap next year about ' + U.money(L.capFor().cap * 1.07) + '</span></div>';
    if (!ex.length) h += '<div class="card dim">Nobody on your team has an expiring deal.</div>';
    ex.forEach(function (p) {
      if (!p.ask) Off.setAsk(p);
      h += '<div class="card rs">' + UI.playerRow(p) + (p.newDeal ? '<div class="pos">RE-SIGNED: ' + p.newDeal.length + ' yrs, ' + U.money(p.newDeal[0]) + '/yr <button class="btn ghost sm" data-a="rsundo" data-id="' + p.id + '">UNDO</button></div>' : '<div class="dim">Wants ' + U.money(p.ask.amt) + ' a year for ' + p.ask.yrs + ' yrs</div><div class="row"><button class="btn gold sm" data-a="rsoffer" data-id="' + p.id + '">MAKE OFFER</button></div>') + '</div>';
    });
    h += '<button class="btn gold wide" data-a="tofa">DONE &middot; START FREE AGENCY</button>';
    return h;
  };
  function contractModal(p, act, title) {
    var amt = p.ask ? p.ask.amt : L.minSal(p.exp), yrs = p.ask ? p.ask.yrs : 2, mx = L.maxSal(p.exp), mn = L.minSal(p.exp);
    UI.modal('<h3>' + title + '</h3>' + UI.playerRow(p) + '<div class="dim">Asking: ' + U.money(amt) + ' a year</div>' +
      '<label class="lbl">PER YEAR: <b id="c_amt_l">' + U.money(amt) + '</b></label><input type="range" id="c_amt" min="' + mn + '" max="' + mx + '" step="0.1" value="' + amt + '" oninput="document.getElementById(\'c_amt_l\').textContent=U.money(+this.value)">' +
      '<label class="lbl">YEARS: <b id="c_yrs_l">' + yrs + '</b></label><input type="range" id="c_yrs" min="1" max="5" step="1" value="' + yrs + '" oninput="document.getElementById(\'c_yrs_l\').textContent=this.value">' +
      '<div class="row"><button class="btn gold" data-a="' + act + '" data-id="' + p.id + '">OFFER</button><button class="btn ghost" data-a="close">CANCEL</button></div>');
  }
  A.rsoffer = function (d) { contractModal(L.player(+d.id), 'rssend', 'RE-SIGN'); };
  A.rssend = function (d) {
    var r = Off.resign(+d.id, +U.$('#c_amt').value, +U.$('#c_yrs').value);
    U.toast(r.msg); if (r.ok) { UI.closeModal(); UI.save(); UI.render(); }
  };
  A.rsundo = function (d) { delete L.player(+d.id).newDeal; UI.save(); UI.render(); };
  A.tofa = function () { Off.startFA(); UI.save(); UI.go('home'); };

  // ---------- free agency ----------
  V.fa = function (p) {
    var s = S(), c = L.capStatus(s.user), t = L.team(s.user);
    var h = '<h2>FREE AGENCY &middot; DAY ' + s.faDay + ' OF 3</h2>';
    h += '<div class="card">' + UI.capBar(s.user) + '<div class="dim small">Mid-level exception: ' + U.money(c.c.mle) + (t.mleUsed ? ' (used)' : ' (available if you stay under the first apron)') + '. Min deals always work. Roster ' + L.roster(s.user).length + '/' + L.ROSTER_MAX + '.</div></div>';
    h += '<div class="row">' + (s.faDay < 3 ? '<button class="btn gold" data-a="faday">NEXT DAY</button>' : '') + '<button class="btn ' + (s.faDay >= 3 ? 'gold' : '') + '" data-a="faseason">START THE SEASON</button></div>';
    h += '<div class="dim small">Other teams sign players at the end of each day. Asking prices drop each day.</div>';
    h += filterBar(p, 'faf');
    var list = applyFilter(Off.freeAgents(), p).slice(0, 60);
    h += list.map(function (x) { if (!x.ask) Off.setAsk(x); return '<div class="drow">' + UI.playerRow(x, '<div class="pst">' + U.money(x.ask.amt) + ' x' + x.ask.yrs + '</div>') + '<button class="btn gold sm" data-a="faoffer" data-id="' + x.id + '">OFFER</button></div>'; }).join('');
    return h;
  };
  A.faf = function (d) { keep(function () { setF(d); }); };
  A.fafq = function (d, el) { UI.st.p.q = el.value; UI.render(); };
  A.faoffer = function (d) {
    var p = L.player(+d.id); if (!p.ask) Off.setAsk(p);
    var need = Math.round(p.ask.amt * Off.interest(p, S().user) * 100) / 100;
    var save = p.ask.amt; p.ask.amt = need;
    contractModal(p, 'fasend', 'OFFER CONTRACT'); p.ask.amt = save;
  };
  A.fasend = function (d) {
    var r = Off.offer(S().user, +d.id, +U.$('#c_amt').value, +U.$('#c_yrs').value);
    U.toast(r.msg); if (r.ok) { UI.closeModal(); UI.save(); UI.render(); }
  };
  A.faday = function () { Off.nextFADay(); UI.save(); UI.render(); };
  A.faseason = function () {
    var s = S();
    if (L.roster(s.user).length < L.ROSTER_MIN) { UI.modal('<h3>NOT ENOUGH PLAYERS</h3><p>You have ' + L.roster(s.user).length + '. You need ' + L.ROSTER_MIN + ' to start the season.</p><div class="row"><button class="btn gold" data-a="autofill">SIGN MIN PLAYERS FOR ME</button><button class="btn ghost" data-a="close">I WILL DO IT</button></div>'); return; }
    Off.startSeason(); UI.save(); UI.go('home');
    var prog = L.roster(s.user).filter(function (p) { return p.prog; }).sort(function (a, b) { return b.prog - a.prog; });
    if (prog.length) UI.modal('<h3>SUMMER PROGRESS</h3>' + prog.map(function (p) { return '<div class="lrow"><span class="ln">' + U.esc(p.n) + ' <span class="dim">' + p.age + 'y</span></span><b class="' + (p.prog > 0 ? 'pos' : 'neg') + '">' + (p.prog > 0 ? '+' : '') + p.prog + '</b>' + UI.ovrTag(p.ovr) + '</div>'; }).join('') + '<div class="row"><button class="btn gold" data-a="close">LET\'S GO</button></div>');
  };
})();
