// ui_hub.js - home, roster, player card, league, more
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function confRank(id) { var t = L.team(id); return Sim.standings(t.conf).map(function (x) { return x.id; }).indexOf(id) + 1; }

  V.home = function (p) {
    var s = S();
    var ph = { fantasy: V.fantasy, playoffs: V.playoffs, lottery: V.lottery, draft: V.draft, resign: V.resign, fa: V.fa }[s.phase];
    if (ph) return ph(p);
    var t = L.team(s.user), h = '';
    var last = t.last || [], streak = 0;
    for (var i = last.length - 1; i >= 0 && last[i] === last[last.length - 1]; i--) streak++;
    var gp = t.w + t.l;
    h += '<div class="hero" style="--tc:' + t.c1 + ';--tc2:' + t.c2 + '">' + UI.logo(s.user, 64) + '<div class="hrec"><div class="hw">' + t.w + '<span>-</span>' + t.l + '</div><div class="hsub">' + U.ord(confRank(s.user) || 1) + ' IN THE ' + (t.conf === 'E' ? 'EAST' : 'WEST') + (streak && gp ? ' &middot; ' + last[last.length - 1] + streak : '') + '</div></div>' +
      '<div class="hstats"><div><b>' + L.teamRating(s.user).toFixed(1) + '</b><span>OVR</span></div><div><b>' + gp + '/' + (s.len || 82) + '</b><span>GAMES</span></div><div data-a="strat" class="link"><b>' + (t.strat === 'rebuild' ? 'REBUILD' : 'WIN NOW') + '</b><span>MODE</span></div></div></div>';
    if (s.live) {
      var lv = s.live;
      h += '<div class="card next live"><div class="lbl">GAME IN PROGRESS</div><div class="mu">' + UI.logo(lv.a, 40) + '<div class="vs">' + lv.sc.a + ' - ' + lv.sc.h + '</div>' + UI.logo(lv.h, 40) + '<div class="mut dim">' + (lv.q <= 4 ? 'Q' + lv.q : 'OT') + ' ' + Live.clockStr(lv.clock) + '</div></div><button class="btn gold big" data-a="play">RESUME GAME</button></div>';
    } else {
      var nd = Sim.userNextGameDay();
      if (nd >= 0) {
        var m = s.sched[nd].filter(function (m) { return m[0] === s.user || m[1] === s.user; })[0], home = m[0] === s.user, opp = home ? m[1] : m[0], ot = L.team(opp);
        h += '<div class="card next"><div class="lbl">NEXT GAME &middot; GAME ' + (gp + 1) + '</div><div class="mu">' + UI.logo(s.user, 46) + '<div class="vs">' + (home ? 'VS' : '@') + '</div>' + UI.logo(opp, 46) + '<div class="mut"><div class="b">' + U.esc(L.teamName(opp)) + '</div><div class="dim">' + ot.w + '-' + ot.l + ' &middot; OVR ' + L.teamRating(opp).toFixed(1) + '</div></div></div>' +
          '<div class="row"><button class="btn gold big" data-a="play">PLAY GAME</button></div><button class="btn wide" data-a="sim" data-n="game">SIM THIS GAME</button></div>';
      }
    }
    var short = L.roster(s.user).length < L.ROSTER_MIN;
    if (short) h += '<div class="warn">You need at least ' + L.ROSTER_MIN + ' players to play. <button class="btn sm gold" data-a="autofill">SIGN MIN PLAYERS</button> or go to LEAGUE &gt; FREE AGENTS.</div>';
    h += '<div class="simgrid3"><button class="btn" data-a="sim" data-n="week">SIM WEEK</button>' +
      (s.day < s.deadline ? '<button class="btn" data-a="sim" data-n="deadline">TO DEADLINE</button>' : '') +
      '<button class="btn" data-a="sim" data-n="season">TO PLAYOFFS</button></div>';
    if (s.day < s.deadline) h += '<div class="dim small center">Trade deadline in ' + (s.deadline - s.day) + ' days</div>';
    var mine = s.games.filter(function (g) { return g.h === s.user || g.a === s.user; }).slice(-5).reverse();
    if (mine.length) h += '<div class="card"><div class="hrow"><div class="lbl">RECENT GAMES</div><button class="btn ghost sm" data-a="tab" data-v="sched">SCHEDULE</button></div><div class="recent">' + mine.map(gameChip).join('') + '</div></div>';
    else h += '<button class="btn ghost wide" data-a="tab" data-v="sched">FULL SCHEDULE</button>';
    h += '<div class="card"><div class="lbl">SALARY CAP ' + U.seasonLabel(s.season) + '</div>' + UI.capBar(s.user) + '</div>';
    h += newsList(6);
    return h;
  };
  function gameChip(g) {
    var s = S(), me = g.h === s.user, ms = me ? g.hs : g.as, os = me ? g.as : g.hs, opp = me ? g.a : g.h, w = ms > os;
    return '<div class="gchip ' + (w ? 'w' : 'l') + '" data-a="gbox" data-i="' + s.games.indexOf(g) + '">' + UI.logo(opp, 24) + '<div class="gr">' + (w ? 'W' : 'L') + '</div><div class="gs">' + ms + '-' + os + '</div>' + (g.live ? '<div class="gp">PLAYED</div>' : '') + '</div>';
  }
  A.gbox = function (d) { UI.boxModal(S().games[+d.i]); };
  V.sched = function () {
    var s = S(), h = '<h2>SCHEDULE</h2>';
    if (s.phase !== 'regular') return h + '<div class="card dim">The regular season is over.</div>';
    var played = s.games.filter(function (g) { return g.h === s.user || g.a === s.user; });
    h += '<div class="dim small">' + (s.len || 82) + '-game season. Tap a played game for its box score. Change the season length in MORE.</div>';
    played.forEach(function (g, i) {
      var me = g.h === s.user, ms = me ? g.hs : g.as, os = me ? g.as : g.hs, opp = me ? g.a : g.h, w = ms > os;
      h += '<div class="srow" data-a="gbox" data-i="' + s.games.indexOf(g) + '"><span class="sn2">' + (i + 1) + '</span>' + UI.logo(opp, 24) + '<span class="so">' + (me ? 'vs ' : '@ ') + U.esc(L.shortName(opp)) + '</span><span class="res ' + (w ? 'w' : 'l') + '">' + (w ? 'W' : 'L') + '</span><b>' + ms + '-' + os + (g.ot ? ' OT' : '') + '</b>' + (g.live ? '<span class="gp">PLAYED</span>' : '') + '</div>';
    });
    var n = played.length;
    for (var d = s.day; d < s.sched.length; d++) {
      s.sched[d].forEach(function (m) {
        if (m[0] !== s.user && m[1] !== s.user) return;
        n++; var home = m[0] === s.user, opp = home ? m[1] : m[0], t = L.team(opp);
        h += '<div class="srow up"><span class="sn2">' + n + '</span>' + UI.logo(opp, 24) + '<span class="so">' + (home ? 'vs ' : '@ ') + U.esc(L.shortName(opp)) + '</span><span class="dim">' + t.w + '-' + t.l + '</span>' + (n === played.length + 1 && !s.live ? '<button class="btn gold sm" data-a="play">PLAY</button>' : '') + '</div>';
      });
    }
    return h;
  };
  function newsList(n) {
    var s = S();
    return '<div class="card"><div class="lbl">LEAGUE NEWS</div>' + (s.news.slice(0, n).map(function (x) { return '<div class="news ' + x.k + '">' + U.esc(x.m) + '</div>'; }).join('') || '<div class="dim">Nothing yet.</div>') + (n < 50 ? '<button class="btn ghost sm" data-a="tab" data-v="news">ALL NEWS</button>' : '') + '</div>';
  }
  V.news = function () { return '<h2>NEWS</h2>' + newsList(150); };
  A.strat = function () {
    var t = L.team(S().user); t.strat = t.strat === 'rebuild' ? 'contend' : 'rebuild'; UI.save(); UI.render();
    U.toast(t.strat === 'rebuild' ? 'Rebuild mode: trade values now favor young players + picks.' : 'Win-now mode: trade values favor players who help now.');
  };
  A.autofill = function () {
    var s = S(), g = 0;
    while (L.roster(s.user).length < L.ROSTER_MIN && g++ < 20) {
      var p = Off.freeAgents()[0]; if (!p) break;
      p.t = s.user; p.sal = [L.minSal(p.exp)]; delete p.ask; L.fixOrder(s.user);
      L.news('You sign ' + p.n + ' to a minimum deal.', 'you');
    }
    if (L.roster(s.user).length < L.ROSTER_MIN) { Off.cpuFillRosters(); }
    UI.save(); UI.render();
  };
  A.sim = function (d) {
    var s = S();
    if (L.roster(s.user).length < L.ROSTER_MIN) { U.toast('Sign players first: you need ' + L.ROSTER_MIN + '.'); return; }
    if (s.live) { Live.simAll(s.live); Sim.finishLive(); if (d.n === 'game') { UI.save(); UI.render(); return; } }
    var before = s.day;
    if (d.n === 'game') Sim.simNextGame();
    else if (d.n === 'week') Sim.simDays(7);
    else if (d.n === 'deadline') Sim.simDays(Math.max(0, s.deadline - s.day));
    else if (d.n === 'season') { var g = 0; while (s.phase === 'regular' && g++ < 400) Sim.simDay(); }
    // sometimes a CPU team calls with an offer
    var days = s.day - before;
    if (s.phase === 'regular' && Sim.tradeOpen() && days > 0 && U.rnd() < Math.min(0.5, days * 0.04)) {
      var off = Trade.incomingOffer();
      if (off) { UI.st.offer = off; UI.save(); UI.render(); showOffer(off); return; }
    }
    UI.save(); UI.render();
  };
  function showOffer(tr) {
    var ev = Trade.evaluate(tr);
    UI.modal('<h3>TRADE CALL</h3><div class="mu">' + UI.logo(tr.b, 40) + '<div><b>' + U.esc(L.teamName(tr.b)) + '</b><div class="dim">want to make a deal</div></div></div>' +
      '<div class="lbl">YOU GET</div>' + tr.bp.map(function (id) { return UI.playerRow(L.player(id)); }).join('') + tr.bpk.map(function (id) { return '<div class="pkrow">' + L.pickLabel(Trade.pk(id)) + '</div>'; }).join('') +
      '<div class="lbl">YOU SEND</div>' + tr.ap.map(function (id) { return UI.playerRow(L.player(id)); }).join('') + tr.apk.map(function (id) { return '<div class="pkrow">' + L.pickLabel(Trade.pk(id)) + '</div>'; }).join('') +
      '<div class="row"><button class="btn gold" data-a="offeryes">ACCEPT</button><button class="btn" data-a="offeredit">EDIT IN TRADE</button><button class="btn ghost" data-a="close">NO THANKS</button></div>');
  }
  A.offeryes = function () {
    var tr = UI.st.offer; UI.closeModal(); if (!tr) return;
    var errs = Trade.validate(tr); if (errs.length) { U.toast(errs[0]); return; }
    Trade.execute(tr); UI.st.offer = null; UI.save(); UI.render(); U.toast('Trade done.');
  };
  A.offeredit = function () { var tr = UI.st.offer; UI.closeModal(); UI.st.offer = null; UI.go('trade', { b: tr.b, ap: tr.ap, bp: tr.bp, apk: tr.apk, bpk: tr.bpk }); };

  // ---------- roster ----------
  V.roster = function (p) {
    var s = S(), t = L.team(s.user); L.fixOrder(s.user);
    var list = t.order.map(L.player).filter(Boolean);
    var h = '<div class="hrow"><h2>ROSTER <span class="dim">' + list.length + '/' + L.ROSTER_MAX + '</span></h2><button class="btn sm" data-a="autolineup">BEST LINEUP</button></div>';
    h += '<div class="dim small">Tap a player to move him in the lineup, trade or release him. Top 5 start. Top 10 play.</div>';
    list.forEach(function (pl, i) {
      if (i === 0) h += '<div class="sect">STARTERS</div>';
      if (i === 5) h += '<div class="sect">BENCH</div>';
      if (i === 10) h += '<div class="sect">RESERVES (DO NOT PLAY)</div>';
      h += UI.playerRow(pl, '<div class="pst">' + UI.ppg(pl) + '</div>');
    });
    h += '<div class="card"><div class="lbl">CAP</div>' + UI.capBar(s.user) + '</div>';
    return h;
  };
  A.autolineup = function () { var s = S(); L.team(s.user).order = null; L.fixOrder(s.user); var t = L.team(s.user); t.order = L.roster(s.user).sort(function (a, b) { return b.ovr - a.ovr; }).map(function (p) { return p.id; }); UI.save(); UI.render(); };
  A.move = function (d) {
    var s = S(), t = L.team(s.user), o = t.order, i = o.indexOf(+d.id), j = i + (+d.dir);
    if (d.dir === 'top') j = 0;
    if (i < 0 || j < 0 || j >= o.length) return;
    if (d.dir === 'top') { o.splice(i, 1); o.unshift(+d.id); }
    else { var x = o[i]; o[i] = o[j]; o[j] = x; }
    UI.save(); UI.closeModal(); UI.render();
  };

  // ---------- player card ----------
  A.player = function (d) {
    var p = L.player(+d.id); if (!p) return;
    var s = S(), mine = p.t === s.user, t = L.team(p.t);
    var h = '<div class="pc"><div class="pchead" style="--tc:' + (t ? t.c1 : '#333') + '">' + UI.face(p, 84) + '<div><div class="pcn">' + U.esc(p.n) + '</div><div class="dim">' + (t ? U.esc(L.teamName(p.t)) : p.t === 'DC' ? 'DRAFT PROSPECT' : 'FREE AGENT') + '</div><div class="dim">' + p.pos + ' &middot; ' + p.age + ' yrs &middot; ' + U.esc(p.ht) + (p.num ? ' &middot; #' + U.esc(p.num) : '') + ' &middot; ' + (p.exp <= 0 ? 'ROOKIE' : p.exp + ' YR EXP') + '</div></div></div>';
    h += '<div class="pcr"><div><b>' + p.ovr + '</b><span>OVR</span></div><div><b>' + (p.scout ? p.scout[0] + '-' + p.scout[1] : p.pot) + '</b><span>POT</span></div><div><b>' + L.playerValue(p, s.user).toFixed(0) + '</b><span>TRADE VALUE</span></div></div>';
    if (p.inj > 0) h += '<div class="warn">Injured: out about ' + p.inj + ' more game' + (p.inj > 1 ? 's' : '') + '.</div>';
    if (p.prog) h += '<div class="dim small">Offseason change: ' + (p.prog > 0 ? '+' : '') + p.prog + ' OVR</div>';
    if (p.sal.length) h += '<div class="lbl">CONTRACT</div><table class="tbl"><tr>' + p.sal.map(function (x, i) { return '<th>' + U.seasonLabel(s.season + i) + '</th>'; }).join('') + '</tr><tr>' + p.sal.map(function (x) { return '<td>' + U.money(x) + '</td>'; }).join('') + '</tr></table>';
    else if (p.ask) h += '<div class="lbl">ASKING FOR</div><div>' + U.money(p.ask.amt) + ' a year, ' + p.ask.yrs + ' yrs</div>';
    if (p.st && p.st.g) { var st = p.st; h += '<div class="lbl">THIS SEASON</div><table class="tbl"><tr><th>G</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th></tr><tr><td>' + st.g + '</td>' + ['min', 'pts', 'reb', 'ast', 'stl', 'blk'].map(function (k) { return '<td>' + (st[k] / st.g).toFixed(1) + '</td>'; }).join('') + '</tr></table>'; }
    else if (p.last) h += '<div class="lbl">LAST REAL SEASON (PTS / REB / AST)</div><div>' + p.last.join(' / ') + '</div>';
    if (p.car && p.car.length) h += '<div class="lbl">CAREER (IN THIS SAVE)</div><table class="tbl"><tr><th>YEAR</th><th>TM</th><th>G</th><th>PTS</th><th>REB</th><th>AST</th><th>OVR</th></tr>' + p.car.slice().reverse().map(function (c) { return '<tr><td>' + U.seasonLabel(c.y) + '</td><td>' + c.t + '</td><td>' + c.g + '</td><td>' + c.pts + '</td><td>' + c.reb + '</td><td>' + c.ast + '</td><td>' + c.ovr + '</td></tr>'; }).join('') + '</table>';
    if (p.aw && p.aw.length) h += '<div class="lbl">AWARDS</div><div>' + p.aw.map(U.esc).join(', ') + '</div>';
    if (p.dp) h += '<div class="dim small">Drafted #' + p.dp + (p.dy ? ' in ' + p.dy : '') + '</div>';
    h += '<div class="row wrap">';
    if (mine) {
      h += '<button class="btn" data-a="move" data-id="' + p.id + '" data-dir="top">START HIM</button><button class="btn" data-a="move" data-id="' + p.id + '" data-dir="-1">MOVE UP</button><button class="btn" data-a="move" data-id="' + p.id + '" data-dir="1">MOVE DOWN</button>';
      if (Sim.tradeOpen()) h += '<button class="btn gold" data-a="shop" data-id="' + p.id + '">FIND TRADES</button>';
      h += '<button class="btn red" data-a="release" data-id="' + p.id + '">RELEASE</button>';
    } else if (t && Sim.tradeOpen()) h += '<button class="btn gold" data-a="tradefor" data-id="' + p.id + '">TRADE FOR HIM</button>';
    else if (p.t === 'FA') h += '<button class="btn gold" data-a="faoffer" data-id="' + p.id + '">OFFER CONTRACT</button>';
    h += '<button class="btn ghost" data-a="close">CLOSE</button></div></div>';
    UI.modal(h);
  };
  A.release = function (d) {
    var p = L.player(+d.id);
    UI.modal('<h3>RELEASE ' + U.esc(p.n.toUpperCase()) + '?</h3><p>His whole contract (' + U.money(U.sum(p.sal)) + ') stays on your cap as dead money until it runs out.</p><div class="row"><button class="btn red" data-a="releaseyes" data-id="' + p.id + '">RELEASE</button><button class="btn ghost" data-a="close">CANCEL</button></div>');
  };
  A.releaseyes = function (d) { var err = Off.release(+d.id); UI.closeModal(); if (err) U.toast(err); UI.save(); UI.render(); };
  A.tradefor = function (d) { var p = L.player(+d.id); UI.closeModal(); UI.go('trade', { b: p.t, bp: [p.id] }); };
  A.shop = function (d) { UI.closeModal(); UI.go('trade', { b: null, ap: [+d.id], find: true }); };

  // ---------- league ----------
  var SUBS = [['stand', 'STANDINGS'], ['teams', 'TEAMS'], ['leaders', 'LEADERS'], ['fa', 'FREE AGENTS'], ['prospects', 'PROSPECTS'], ['history', 'HISTORY'], ['moves', 'TRADES']];
  V.league = function (p) {
    var sub = p.sub || 'stand', s = S();
    var h = '<div class="subtabs">' + SUBS.map(function (x) { return '<button data-a="lsub" data-s="' + x[0] + '" class="' + (sub === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (sub === 'stand') {
      ['E', 'W'].forEach(function (c) {
        h += '<div class="card"><div class="lbl">' + (c === 'E' ? 'EASTERN' : 'WESTERN') + ' CONFERENCE</div><table class="tbl stand"><tr><th></th><th>TEAM</th><th>W</th><th>L</th><th>GB</th><th>L10</th></tr>';
        var list = Sim.standings(c), top = list[0];
        list.forEach(function (t, i) {
          var gb = ((top.w - t.w) + (t.l - top.l)) / 2, l10 = t.last || [];
          h += '<tr class="' + (t.id === s.user ? 'me' : '') + (i === 5 || i === 9 ? ' cut' : '') + '" data-a="teamv" data-id="' + t.id + '"><td>' + (i + 1) + '</td><td class="tn">' + UI.logo(t.id, 20) + ' ' + U.esc(t.name) + '</td><td>' + t.w + '</td><td>' + t.l + '</td><td>' + (gb ? gb.toFixed(1) : '-') + '</td><td>' + l10.filter(function (x) { return x === 'W'; }).length + '-' + l10.filter(function (x) { return x === 'L'; }).length + '</td></tr>';
        });
        h += '</table><div class="dim small">1-6 make the playoffs. 7-10 go to the Play-In.</div></div>';
      });
    } else if (sub === 'teams') {
      h += L.ovrRank().map(function (x, i) { var t = L.team(x.id), c = L.capStatus(x.id); return '<div class="trow" data-a="teamv" data-id="' + x.id + '">' + UI.logo(x.id, 32) + '<div class="pmain"><div class="pname">' + U.esc(L.teamName(x.id)) + '</div><div class="psub">' + t.w + '-' + t.l + ' &middot; ' + U.money(c.pay) + ' &middot; ' + (t.strat === 'rebuild' ? 'Rebuilding' : 'Contending') + '</div></div><div class="prat">' + UI.ovrTag(Math.round(x.r)) + '<span class="pot">#' + (i + 1) + '</span></div></div>'; }).join('');
    } else if (sub === 'leaders') {
      var P = Object.keys(s.players).map(function (k) { return s.players[k]; }).filter(function (p) { return L.team(p.t) && p.st.g >= Math.max(1, Math.min(20, s.day * 0.5)); });
      [['pts', 'POINTS'], ['reb', 'REBOUNDS'], ['ast', 'ASSISTS'], ['stl', 'STEALS'], ['blk', 'BLOCKS']].forEach(function (k) {
        var top = P.slice().sort(function (a, b) { return b.st[k[0]] / b.st.g - a.st[k[0]] / a.st.g; }).slice(0, 8);
        h += '<div class="card"><div class="lbl">' + k[1] + ' PER GAME</div>' + (top.length ? top.map(function (p, i) { return '<div class="lrow" data-a="player" data-id="' + p.id + '"><span>' + (i + 1) + '</span>' + UI.logo(p.t, 18) + '<span class="ln">' + U.esc(p.n) + '</span><b>' + (p.st[k[0]] / p.st.g).toFixed(1) + '</b></div>'; }).join('') : '<div class="dim">Play some games first.</div>') + '</div>';
      });
      if (!P.length) h += '<div class="card"><div class="lbl">TOP PLAYERS</div>' + Object.keys(s.players).map(function (k) { return s.players[k]; }).filter(function (p) { return L.team(p.t); }).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 15).map(function (p) { return UI.playerRow(p); }).join('') + '</div>';
    } else if (sub === 'fa') {
      var fas = Off.freeAgents();
      h += '<div class="dim small">Free agents. Min contracts always work. Bigger deals need cap space or your mid-level exception.</div>' + (fas.slice(0, 60).map(function (p) { if (!p.ask) Off.setAsk(p); return UI.playerRow(p, '<div class="pst">' + U.money(p.ask.amt) + '</div>'); }).join('') || '<div class="dim">No free agents right now.</div>');
    } else if (sub === 'prospects') {
      var dc = Off.draftClass();
      h += '<div class="dim small">The ' + s.season + ' draft class. POT shows a scouting range. These are made-up players.</div>' + dc.slice(0, 40).map(function (p, i) { return UI.playerRow(p, '<div class="pst">#' + (i + 1) + '</div>'); }).join('');
    } else if (sub === 'history') {
      h += s.history.length ? s.history.map(function (x) { return '<div class="card hist"><div class="lbl">' + U.seasonLabel(x.season) + '</div><div class="hr">' + UI.logo(x.champ, 30) + '<div><b>' + U.esc(L.teamName(x.champ)) + '</b> champions<div class="dim">beat ' + U.esc(L.shortName(x.runner)) + ' &middot; MVP ' + U.esc(x.mvp ? x.mvp.n : '-') + ' &middot; ROY ' + U.esc(x.roy ? x.roy.n : '-') + '</div><div class="dim">You: ' + x.rec + ', ' + x.finish + '</div></div></div></div>'; }).join('') : '<div class="dim">No seasons finished yet.</div>';
    } else if (sub === 'moves') {
      h += s.tradeLog.length ? s.tradeLog.slice(0, 60).map(function (x) { return '<div class="news">' + U.seasonLabel(x.season) + ' ' + U.esc(x.d || '') + ': ' + U.esc(x.txt) + '</div>'; }).join('') : '<div class="dim">No trades yet.</div>';
    }
    return h;
  };
  A.lsub = function (d) { UI.go('league', { sub: d.s }); };
  A.teamv = function (d) { UI.go('team', { id: d.id }); };
  V.team = function (p) {
    var s = S(), t = L.team(p.id), ros = L.roster(p.id).sort(function (a, b) { return b.ovr - a.ovr; });
    var h = '<button class="back" data-a="tab" data-v="league">BACK</button><div class="thead" style="--tc:' + t.c1 + '">' + UI.logo(p.id, 56) + '<div><h2>' + U.esc(L.teamName(p.id)) + '</h2><div class="dim">' + t.w + '-' + t.l + ' &middot; OVR ' + L.teamRating(p.id).toFixed(1) + ' &middot; ' + (t.strat === 'rebuild' ? 'Rebuilding' : 'Contending') + '</div></div></div>';
    if (p.id !== s.user && Sim.tradeOpen()) h += '<button class="btn gold wide" data-a="tradewith" data-id="' + p.id + '">TRADE WITH THEM</button>';
    h += '<div class="card">' + UI.capBar(p.id) + '</div>';
    h += ros.map(function (pl) { return UI.playerRow(pl, '<div class="pst">' + UI.ppg(pl) + '</div>'); }).join('');
    h += '<div class="card"><div class="lbl">DRAFT PICKS</div>' + (L.picksOf(p.id).map(function (k) { return '<span class="chip">' + L.pickLabel(k) + '</span>'; }).join('') || '<div class="dim">None</div>') + '</div>';
    return h;
  };
  A.tradewith = function (d) { UI.go('trade', { b: d.id }); };

  // ---------- more ----------
  V.more = function () {
    var s = S(), c = L.capFor(), h = '<h2>FRONT OFFICE</h2>';
    var ln = s.len || 82, pend = s.lenNext && s.lenNext !== ln;
    h += '<div class="card"><div class="lbl">GAMES PER SEASON</div><div class="seg">' + [20, 41, 58, 82].map(function (n) { return '<button data-a="setlen" data-n="' + n + '" class="' + ((s.lenNext || ln) === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div><div class="dim small">' + (pend ? 'This season stays at ' + ln + ' games. Next season will be ' + s.lenNext + '.' : 'Right now: ' + ln + ' games. Changing it in the middle of a season starts next season.') + '</div></div>';
    h += '<div class="card"><div class="lbl">PAYROLL BY SEASON</div><table class="tbl"><tr><th>SEASON</th><th>PAYROLL</th><th>VS CAP</th></tr>';
    for (var y = 0; y < 5; y++) {
      var pay = L.payrollYear(s.user, y), cap = c.cap * Math.pow(1.07, y);
      h += '<tr><td>' + U.seasonLabel(s.season + y) + '</td><td>' + U.money(pay) + '</td><td class="' + (pay > cap ? 'neg' : 'pos') + '">' + (pay > cap ? '+' + U.money(pay - cap) + ' over' : U.money(cap - pay) + ' room') + '</td></tr>';
    }
    h += '</table><div class="dim small">Future years only count players already signed.</div></div>';
    h += '<div class="card"><div class="lbl">' + U.seasonLabel(s.season) + ' CAP NUMBERS</div><table class="tbl"><tr><td>Salary cap</td><td>' + U.money(c.cap) + '</td></tr><tr><td>Luxury tax</td><td>' + U.money(c.tax) + '</td></tr><tr><td>First apron</td><td>' + U.money(c.ap1) + '</td></tr><tr><td>Second apron</td><td>' + U.money(c.ap2) + '</td></tr><tr><td>Mid-level exception</td><td>' + U.money(c.mle) + '</td></tr></table>' +
      '<div class="dim small">Over the cap? In trades you can take back up to 125% of the salary you send. Over the second apron you cannot take back more than you send. Free agents need cap space, the mid-level (once a season) or a minimum deal.</div></div>';
    var dead = L.team(s.user).dead || [];
    if (dead.length) h += '<div class="card"><div class="lbl">DEAD MONEY</div>' + dead.map(function (d) { return '<div class="lrow"><span class="ln">' + U.esc(d.n) + '</span><b>' + U.money(d.amt[0] || 0) + '</b><span class="dim">x' + d.amt.length + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card"><div class="lbl">HOW IT WORKS</div><div class="small">Sim games from HOME. Make trades before the deadline (about 60% through the season). After the playoffs: Draft Lottery, NBA Draft, re-sign your guys, then 3 days of free agency. Players get better or older every summer. Your game saves itself after every move.</div></div>';
    h += '<div class="row"><button class="btn" data-a="tab" data-v="news">NEWS</button><button class="btn gold" data-a="exit">SAVE &amp; EXIT</button></div>';
    return h;
  };
  A.setlen = function (d) {
    var s = S(), n = +d.n;
    if (s.phase === 'regular' && s.day === 0 && !s.live) { s.len = n; s.lenNext = null; Sim.newSeason(); U.toast('New ' + n + '-game schedule made.'); }
    else if (s.phase === 'regular' || s.phase === 'playoffs') { s.lenNext = n === s.len ? null : n; U.toast(n === s.len ? 'Staying at ' + n + ' games.' : 'Next season will be ' + n + ' games.'); }
    else { s.len = n; s.lenNext = null; U.toast('Next season will be ' + n + ' games.'); }
    UI.save(); UI.render();
  };
  A.exit = function () { UI.save(); G.S = null; UI.go('title'); };
})();
