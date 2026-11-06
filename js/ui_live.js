// ui_live.js - play a game: scorebug, court, play calls, shot meter, subs, box score
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function LV() { return G.S && G.S.live; }
  var meterRaf = null, meterState = null;

  function court(st) {
    var c = function (k) { return L.team(st[k]).c1; };
    var h = '<svg class="court" viewBox="-1 -1 52 36" preserveAspectRatio="xMidYMin meet">' +
      '<defs><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2016"/><stop offset="1" stop-color="#1a140e"/></linearGradient></defs>' +
      '<rect x="-1" y="-1" width="52" height="38" fill="url(#fl)"/>' +
      '<rect x="17" y="0" width="16" height="19" fill="' + c(st.user || 'h') + '" opacity=".28"/>' +
      '<g fill="none" stroke="#ffffff55" stroke-width=".25">' +
      '<rect x="0" y="0" width="50" height="47"/><rect x="17" y="0" width="16" height="19"/><circle cx="25" cy="19" r="6"/>' +
      '<path d="M3 0 V14 A23.75 23.75 0 0 0 47 14 V0"/><path d="M21 5.25 A4 4 0 0 0 29 5.25"/>' +
      '<line x1="22" y1="4" x2="28" y2="4" stroke="#fff" stroke-width=".35"/><circle cx="25" cy="5.25" r=".8" stroke="#f6c31c" stroke-width=".3"/></g>';
    st.shots.slice(-24).forEach(function (sh, i, arr) {
      var col = c(sh.k), op = 0.35 + 0.65 * (i + 1) / arr.length, y = Math.min(34.5, sh.y);
      if (sh.m) h += '<circle cx="' + sh.x + '" cy="' + y + '" r=".85" fill="' + col + '" stroke="#fff" stroke-width=".2" opacity="' + op + '"/>';
      else h += '<g stroke="' + col + '" stroke-width=".35" opacity="' + op + '"><line x1="' + (sh.x - .7) + '" y1="' + (y - .7) + '" x2="' + (sh.x + .7) + '" y2="' + (y + .7) + '"/><line x1="' + (sh.x + .7) + '" y1="' + (y - .7) + '" x2="' + (sh.x - .7) + '" y2="' + (y + .7) + '"/></g>';
    });
    return h + '</svg>';
  }
  function bug(st) {
    var qn = st.q <= 4 ? 'Q' + st.q : (st.q === 5 ? 'OT' : (st.q - 4) + 'OT');
    function side(k) {
      var t = L.team(st[k]);
      return '<div class="bs ' + (st.poss === k && !st.done ? 'pos' : '') + '" style="--tc:' + t.c1 + '">' + UI.logo(st[k], 30) + '<div><div class="bab">' + U.esc(st[k]) + '</div><div class="bto">TO ' + st.to[k] + ' &middot; F ' + Math.min(5, st.tf[k]) + (st.tf[k] >= 5 ? ' BONUS' : '') + '</div></div><div class="bsc">' + st.sc[k] + '</div></div>';
    }
    return '<div class="bug">' + side('a') + '<div class="bmid"><div class="bq">' + (st.done ? 'FINAL' : qn) + '</div><div class="bc">' + (st.done ? '' : Live.clockStr(st.clock)) + '</div></div>' + side('h') + '</div>';
  }
  V.live = function () {
    var s = S(), st = LV();
    if (!st) return '<div class="card">No game in progress.</div><button class="btn gold wide" data-a="tab" data-v="home">HOME</button>';
    if (st.done) return finalCard(st);
    var me = st.user, myOff = st.poss === me;
    var h = bug(st);
    h += '<div class="lastplay">' + U.esc(st.last || '') + '</div>';
    h += court(st);
    h += '<div class="calls"><div class="clbl ' + (myOff ? 'act' : '') + '">OFFENSE' + (myOff ? ' &middot; YOUR BALL' : '') + '</div><div class="chips sc">' + Live.OFF.map(function (x) { return '<button class="chip ' + (st.call.off === x[0] ? 'on' : '') + '" data-a="lcall" data-t="off" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="clbl ' + (!myOff ? 'act' : '') + '">DEFENSE' + (!myOff ? ' &middot; THEIR BALL' : '') + '</div><div class="chips sc">' + Live.DEF.map(function (x) { return '<button class="chip ' + (st.call.def === x[0] ? 'on' : '') + '" data-a="lcall" data-t="def" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
    var clutch = st.q < 4 || st.clock > 300;
    h += '<div class="lbtns"><button class="btn gold next" data-a="lnext">NEXT PLAY</button><button class="btn" data-a="lrun" data-n="120">+2 MIN</button><button class="btn" data-a="lrun" data-n="q">END OF Q</button>' + (clutch ? '<button class="btn" data-a="lrun" data-n="clutch">TO CLUTCH</button>' : '') + '<button class="btn ghost" data-a="lrun" data-n="all">SIM TO FINAL</button></div>';
    // on court
    h += '<div class="card oncourt"><div class="lbl">ON THE FLOOR <span class="dim">(tap to sub)</span></div>' + st.on[me].map(function (id) {
      var p = L.player(id), b = st.box[id], e = Math.round(st.en[id]);
      return '<div class="oc" data-a="lsubout" data-id="' + id + '">' + UI.face(p, 30) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + '</div><div class="en"><i style="width:' + e + '%;background:' + (e > 74 ? '#3ccf6e' : e > 59 ? '#f6c31c' : '#e8401c') + '"></i></div></div><div class="ocs"><b>' + b.pts + '</b> PTS<br>' + (b.orb + b.drb) + ' REB &middot; ' + b.ast + ' AST' + (b.pf >= 4 ? ' &middot; <span class="neg">' + b.pf + ' PF</span>' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="row lsmall"><button class="btn sm" data-a="lto">TIMEOUT (' + st.to[me] + ')</button><button class="btn sm" data-a="lbox">BOX SCORE</button><button class="btn sm ' + (st.meter ? 'gold' : '') + '" data-a="lmeter">SHOT METER ' + (st.meter ? 'ON' : 'OFF') + '</button><button class="btn sm ' + (st.autoSub ? 'gold' : '') + '" data-a="lauto">AUTO SUBS ' + (st.autoSub ? 'ON' : 'OFF') + '</button></div>';
    h += '<div class="card pbp"><div class="lbl">PLAY-BY-PLAY</div>' + st.log.slice(0, 12).map(function (x) {
      return '<div class="pl ' + (x.k === me ? 'me' : x.k ? 'them' : 'neu') + '"><span class="pc">' + (x.q <= 4 ? 'Q' + x.q : 'OT') + ' ' + x.c + '</span><span class="pt">' + U.esc(x.t) + '</span>' + (x.p ? '<b>+' + x.p + '</b>' : '') + '</div>';
    }).join('') + '</div>';
    h += '<button class="btn ghost wide" data-a="lleave">SAVE &amp; LEAVE GAME</button>';
    h += '<div id="meterbox"></div>';
    return h;
  };
  function finalCard(st) {
    var s = S(), me = st.user, won = st.sc[me] > st.sc[me === 'h' ? 'a' : 'h'];
    var h = bug(st) + '<div class="final ' + (won ? 'w' : 'l') + '">' + (won ? 'YOU WIN' : 'YOU LOSE') + '</div>';
    h += qtable(st);
    ['a', 'h'].forEach(function (k) {
      var top = Live.lines(st, k).sort(function (x, y) { return y.pts - x.pts; }).slice(0, 3);
      h += '<div class="card"><div class="lbl">' + U.esc(L.teamName(st[k])) + ' TOP PERFORMERS</div>' + top.map(function (l) { return '<div class="lrow"><span class="ln">' + U.esc(l.n) + '</span><span class="dim">' + l.fgm + '-' + l.fga + ' FG &middot; ' + l.reb + ' REB &middot; ' + l.ast + ' AST</span><b>' + l.pts + '</b></div>'; }).join('') + '</div>';
    });
    h += court(st);
    h += '<div class="row"><button class="btn" data-a="lbox">FULL BOX SCORE</button><button class="btn gold" data-a="lfinish">CONTINUE</button></div>';
    return h;
  }
  function qtable(st) {
    var n = st.qs.h.length;
    var head = '<tr><th></th>' + st.qs.h.map(function (x, i) { return '<th>' + (i < 4 ? i + 1 : 'OT' + (i > 4 ? i - 3 : '')) + '</th>'; }).join('') + '<th>T</th></tr>';
    return '<div class="card"><table class="tbl qt">' + head + ['a', 'h'].map(function (k) { return '<tr><td>' + U.esc(st[k]) + '</td>' + st.qs[k].map(function (x) { return '<td>' + x + '</td>'; }).join('') + '<td><b>' + st.sc[k] + '</b></td></tr>'; }).join('') + '</table></div>';
  }
  function boxTable(name, lines) {
    var tot = { pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
    lines.forEach(function (l) { for (var k in tot) tot[k] += l[k] || 0; });
    return '<div class="lbl">' + U.esc(name) + '</div><div class="bxw"><table class="tbl bx"><tr><th>PLAYER</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3P</th><th>FT</th><th>STL</th><th>BLK</th></tr>' +
      lines.map(function (l) { return '<tr data-a="player" data-id="' + l.id + '"><td class="tn">' + U.esc(l.n) + '</td><td>' + l.min + '</td><td><b>' + l.pts + '</b></td><td>' + l.reb + '</td><td>' + l.ast + '</td><td>' + (l.fga != null ? l.fgm + '-' + l.fga : '-') + '</td><td>' + (l.tpa != null ? l.tpm + '-' + l.tpa : '-') + '</td><td>' + (l.fta != null ? l.ftm + '-' + l.fta : '-') + '</td><td>' + l.stl + '</td><td>' + l.blk + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>TEAM</td><td></td><td><b>' + tot.pts + '</b></td><td>' + tot.reb + '</td><td>' + tot.ast + '</td><td>' + tot.fgm + '-' + tot.fga + '</td><td>' + tot.tpm + '-' + tot.tpa + '</td><td>' + tot.ftm + '-' + tot.fta + '</td><td></td><td></td></tr></table></div>' +
      (tot.fga ? '<div class="dim small">FG ' + (100 * tot.fgm / tot.fga).toFixed(1) + '% &middot; 3P ' + (tot.tpa ? (100 * tot.tpm / tot.tpa).toFixed(1) : 0) + '% &middot; FT ' + (tot.fta ? (100 * tot.ftm / tot.fta).toFixed(1) : 0) + '%</div>' : '');
  }
  // box score for a finished game object {h,a,hs,as,box}
  UI.boxModal = function (g) {
    if (!g || !g.box) { U.toast('No box score saved for that game.'); return; }
    UI.modal('<h3>' + U.esc(L.shortName(g.a)) + ' ' + g.as + ' @ ' + U.esc(L.shortName(g.h)) + ' ' + g.hs + (g.ot ? ' (OT)' : '') + '</h3>' + boxTable(L.teamName(g.a), g.box.a) + boxTable(L.teamName(g.h), g.box.h) + '<div class="row"><button class="btn ghost" data-a="close">CLOSE</button></div>');
  };

  function rerender() { var y = window.scrollY; UI.render(); window.scrollTo(0, y); }
  A.lcall = function (d) { LV().call[d.t] = d.v; UI.save(); rerender(); };
  A.lmeter = function () { var st = LV(); st.meter = !st.meter; UI.save(); rerender(); };
  A.lauto = function () { var st = LV(); st.autoSub = !st.autoSub; UI.save(); rerender(); };
  A.lto = function () { var st = LV(); if (!Live.timeout(st, st.user)) U.toast('No timeouts left.'); else U.toast('Timeout. Your guys catch their breath.'); UI.save(); rerender(); };
  A.lbox = function () { var st = LV(); UI.modal('<h3>BOX SCORE</h3>' + qtable(st) + boxTable(L.teamName(st.a), Live.lines(st, 'a')) + boxTable(L.teamName(st.h), Live.lines(st, 'h')) + '<div class="row"><button class="btn ghost" data-a="close">CLOSE</button></div>'); };
  A.lleave = function () { UI.save(); UI.go('home'); U.toast('Game saved. Resume it from HOME.'); };
  A.lnext = function () {
    var st = LV(); if (!st || st.done || meterState) return;
    var p = Live.setup(st);
    if (p && p.o === st.user && st.meter) { UI.save(); rerender(); startMeter(st, p); return; }
    if (p) Live.resolve(st, p, 0);
    UI.save(); rerender();
  };
  A.lrun = function (d) {
    var st = LV(); if (!st || meterState) return;
    if (d.n === 'q') Live.toEndOfQuarter(st); else if (d.n === 'clutch') Live.toClutch(st); else if (d.n === 'all') Live.simAll(st); else Live.runSeconds(st, +d.n);
    UI.save(); rerender();
  };
  A.lfinish = function () {
    var s = S(), st = LV(), g = Sim.finishLive();
    UI.save();
    UI.go('home');
    if (st.kind === 'po' && s.phase !== 'playoffs') { UI.champModal(); return; }
    if (g) U.toast((g.hs > g.as) === (st.h === s.user) ? 'Win recorded.' : 'Loss recorded.');
  };
  // ---- subs ----
  A.lsubout = function (d) {
    var st = LV(), me = st.user, out = L.player(+d.id);
    var bench = Live.roster(st, me).filter(function (p) { return st.on[me].indexOf(p.id) < 0; }).sort(function (x, y) { return y.ovr - x.ovr; });
    UI.modal('<h3>SUB OUT ' + U.esc(out.n.toUpperCase()) + '</h3><div class="dim small">Energy ' + Math.round(st.en[out.id]) + '. Pick who comes in:</div>' + bench.map(function (p) {
      var e = Math.round(st.en[p.id]), b = st.box[p.id];
      return '<div class="oc" data-a="lsubin" data-o="' + out.id + '" data-id="' + p.id + '">' + UI.ovrTag(p.ovr) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + ' <span class="dim">' + p.pos + '</span></div><div class="en"><i style="width:' + e + '%;background:' + (e > 74 ? '#3ccf6e' : e > 59 ? '#f6c31c' : '#e8401c') + '"></i></div></div><div class="ocs">' + (b.pf >= 6 ? '<span class="neg">FOULED OUT</span>' : b.pts + ' PTS') + '</div></div>';
    }).join('') + '<div class="row"><button class="btn ghost" data-a="close">CANCEL</button></div>');
  };
  A.lsubin = function (d) {
    var st = LV(); Live.sub(st, st.user, +d.o, +d.id);

    UI.closeModal(); UI.save(); rerender();
  };

  // ---- shot meter ----
  function startMeter(st, pend) {
    var p = L.player(pend.sid), sp = Live.shoot(p);
    var skill = pend.type === 'three' ? (sp.p3 - 0.28) * 100 : (p.ovr - 65) * 0.6;
    var gw = U.clamp(9 + skill * 0.45, 7, 18);          // green zone width (out of 100)
    var gs = U.clamp(62 + U.ri(-6, 6), 40, 90 - gw);     // green zone start
    var speed = pend.type === 'three' ? 1.05 : 0.9;
    meterState = { st: st, pend: pend, gs: gs, gw: gw, pos: 0, dir: 1, speed: speed, t0: performance.now(), done: false };
    var box = document.getElementById('meterbox');
    var lbl = pend.type === 'three' ? 'THREE' : pend.type === 'rim' ? 'AT THE RIM' : 'JUMPER';
    box.innerHTML = '<div class="mover"><div class="mcard"><div class="lbl">' + U.esc(p.n) + ' &middot; ' + lbl + '</div><div class="mbar"><div class="mg" style="left:' + gs + '%;width:' + gw + '%"></div><div class="mk" id="mk"></div></div><button class="btn gold big" data-a="lshoot">SHOOT</button><div class="dim small center">Tap when the marker is in the green</div></div></div>';
    var last = performance.now();
    function frame(now) {
      if (!meterState || meterState.done) return;
      var dt = now - last; last = now;
      meterState.pos += meterState.dir * dt * 0.09 * meterState.speed;
      if (meterState.pos >= 100) { meterState.pos = 100; meterState.dir = -1; }
      if (meterState.pos <= 0 && meterState.dir < 0) { fire('LATE'); return; }
      var mk = document.getElementById('mk'); if (mk) mk.style.left = meterState.pos + '%';
      meterRaf = requestAnimationFrame(frame);
    }
    meterRaf = requestAnimationFrame(frame);
  }
  function fire(force) {
    var m = meterState; if (!m || m.done) return;
    m.done = true; cancelAnimationFrame(meterRaf);
    var res, bonus, x = m.pos;
    if (force) { res = 'LATE'; bonus = -0.12; }
    else if (x >= m.gs && x <= m.gs + m.gw) { res = 'PERFECT'; bonus = 0.14; }
    else if (x >= m.gs - 10 && x <= m.gs + m.gw + 10) { res = 'GOOD'; bonus = 0.02; }
    else { res = x < m.gs ? 'EARLY' : 'LATE'; bonus = -0.12; }
    var st = m.st;
    Live.resolve(st, m.pend, bonus);
    meterState = null;
    UI.save(); rerender();
    var made = st.log[0] && st.log[0].p > 0 && st.log[0].k === st.user;
    U.toast(res + (res === 'PERFECT' ? ' RELEASE' : '') + ' - ' + (made ? 'BUCKET' : 'NO GOOD'));
  }
  A.lshoot = function () { fire(); };

  // ---- entry points ----
  // say who won: re-sim the game until the right team wins, then keep those stats
  A.pickwin = function (d) {
    var s = S();
    if (L.roster(s.user).length < L.ROSTER_MIN) { U.toast('Sign players first: you need ' + L.ROSTER_MIN + '.'); return; }
    if (s.live) { U.toast('Finish or sim the game in progress first.'); return; }
    if (!Sim.startUserGame()) { U.toast('No game to play right now.'); UI.render(); return; }
    var base = s.live, wantMe = d.w === 'me', best = null;
    for (var i = 0; i < 1500; i++) {
      var st = Live.create(base.h, base.a, { kind: base.kind, si: base.si });
      Live.simAll(st);
      var meWon = st.sc[st.user] > st.sc[st.user === 'h' ? 'a' : 'h'];
      if (meWon === wantMe) { best = st; break; }
    }
    if (!best) { U.toast('Could not make that happen. Try playing it.'); return; }
    s.live = best;
    var kind = best.kind, g = Sim.finishLive();
    UI.save(); UI.go('home');
    if (kind === 'po' && s.phase !== 'playoffs') { UI.champModal(); return; }
    if (g) UI.boxModal(g);
  };
  A.play = function () {
    var s = S();
    if (L.roster(s.user).length < L.ROSTER_MIN) { U.toast('Sign players first: you need ' + L.ROSTER_MIN + '.'); return; }
    if (!s.live && !Sim.startUserGame()) { U.toast('No game to play right now.'); UI.render(); return; }
    UI.save(); UI.go('live');
  };
})();
