// offseason.js - fantasy draft, draft class, lottery, draft, re-sign, free agency, progression
var Off = (function () {
  function S() { return G.S; }
  var LOTTO = [14, 14, 14, 12.5, 10.5, 9, 7.5, 6, 4.5, 3, 2, 1.5, 1, 0.5];
  var POS = ['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C', 'F', 'G'];

  function posGroup(pos) { return /C/.test(pos) ? 'C' : /G/.test(pos) ? 'G' : 'F'; }
  function usedNames() { var u = {}, P = S().players; for (var k in P) u[P[k].n] = 1; return u; }
  function newPlayer(o) {
    var s = S(), p = { id: s.nextPid++, n: o.n, t: o.t, pos: o.pos, age: o.age, ht: o.ht || '', num: o.num || String(U.ri(0, 55)), exp: o.exp || 0, ovr: o.ovr, pot: o.pot, sal: o.sal || [], r: null, st: L.blankStats(), car: [], inj: 0, gen: true };
    p.r = L.rateFromOvr(p);
    if (o.scout) p.scout = o.scout;
    s.players[p.id] = p; return p;
  }
  function heightFor(pos) {
    var base = posGroup(pos) === 'C' ? 83 : posGroup(pos) === 'F' ? 80 : 76, h = base + U.ri(-2, 2);
    return Math.floor(h / 12) + "' " + (h % 12) + '"';
  }

  // ---------- draft class (made-up prospects) ----------
  function makeDraftClass() {
    var s = S(), used = usedNames(), n = Math.max(64, L.teamIds().length * 2 + 8);
    for (var k in s.players) if (s.players[k].t === 'DC') delete s.players[k];
    for (var i = 0; i < n; i++) {
      var q = U.clamp(1 - i / n + U.gauss() * 0.06, 0, 1);
      var age = U.pick([19, 19, 19, 20, 20, 21, 22]);
      var ovr = Math.round(U.clamp(56 + 20 * Math.pow(q, 1.6) + U.gauss() * 1.8 + (age - 19) * 0.8, 52, 79));
      var pot = Math.round(U.clamp(ovr + 4 + (22 - age) * 2.5 + q * 6 + U.gauss() * 2.5, ovr + 2, 97));
      var shown = pot + Math.round(U.gauss() * 2.5), spread = U.ri(3, 6);
      var pos = U.pick(POS);
      newPlayer({ n: U.makeName(used), t: 'DC', pos: pos, age: age, ht: heightFor(pos), ovr: ovr, pot: pot, scout: [shown - spread, Math.min(99, shown + spread)] });
    }
  }
  function draftClass() {
    var out = [], P = S().players; for (var k in P) if (P[k].t === 'DC') out.push(P[k]);
    return out.sort(function (a, b) { return (b.scout[0] + b.scout[1]) / 2 + b.ovr * 0.5 - ((a.scout[0] + a.scout[1]) / 2 + a.ovr * 0.5); });
  }

  // ---------- fantasy draft ----------
  function fdTeam() { var f = S().fd; var ord = f.round % 2 ? f.order : f.order.slice().reverse(); return ord[f.idx]; }
  function fdPool() { var out = [], P = S().players; for (var k in P) if (P[k].t === 'POOL') out.push(P[k]); return out; }
  function fantasyScore(p, tid) {
    var mine = L.roster(tid), g = posGroup(p.pos), same = mine.filter(function (x) { return posGroup(x.pos) === g; }).length;
    var sc = p.ovr * 0.78 + p.pot * 0.22 - Math.max(0, p.age - 30) * 1.3 - Math.max(0, (p.sal[0] || 0) - L.worth(p.ovr)) * 0.04;
    if (same >= 5) sc -= 3; if (p.inj > 25) sc -= 2;
    return sc + U.gauss() * 0.8;
  }
  function fdPick(pid) {
    var s = S(), f = s.fd, tid = fdTeam(), p = L.player(pid);
    if (!p || p.t !== 'POOL') return;
    p.t = tid; p.bird = tid;
    f.log.unshift({ r: f.round, n: f.log.length + 1, t: tid, p: p.n, ovr: p.ovr });
    f.idx++;
    if (f.idx >= f.order.length) { f.idx = 0; f.round++; }
    if (f.round > f.rounds) finishFantasy();
  }
  function fdCpuPick() {
    var tid = fdTeam(), pool = fdPool(), best = null, bs = -1e9;
    pool.forEach(function (p) { var sc = fantasyScore(p, tid); if (sc > bs) { bs = sc; best = p; } });
    if (best) fdPick(best.id);
  }
  function fdSimToUser() {
    var s = S(), g = 0;
    while (s.phase === 'fantasy' && fdTeam() !== s.user && g++ < 1000) fdCpuPick();
  }
  function fdAutoAll() {
    var s = S(), g = 0;
    while (s.phase === 'fantasy' && g++ < 2000) fdCpuPick();
  }
  function finishFantasy() {
    var s = S();
    fdPool().forEach(function (p) { p.t = 'FA'; setAsk(p); });
    s.phase = 'regular';
    L.teamIds().forEach(function (id) { L.team(id).order = null; L.fixOrder(id); });
    Sim.newSeason(true);
    makeDraftClass();
    cpuFillRosters();
    L.news('The fantasy draft is done. Rosters are set. Let the season begin.', 'big');
  }

  // ---------- free agent asks ----------
  function setAsk(p) {
    var w = L.worth(p.ovr);
    if (p.age >= 33) w *= 0.8; if (p.age <= 24) w *= 1.08;
    var amt = Math.max(L.minSal(p.exp), Math.min(L.maxSal(p.exp), w));
    var yrs = p.age >= 33 ? U.ri(1, 2) : p.age >= 30 ? U.ri(2, 3) : U.ri(2, 4);
    if (amt <= L.minSal(p.exp) * 1.2) yrs = U.ri(1, 2);
    p.ask = { amt: Math.round(amt * 100) / 100, yrs: yrs };
  }
  function contract(amt, yrs) { var a = []; for (var i = 0; i < yrs; i++) a.push(Math.round(amt * Math.pow(1.05, i) * 100) / 100); return a; }
  function freeAgents() {
    var out = [], P = S().players; for (var k in P) if (P[k].t === 'FA') out.push(P[k]);
    return out.sort(function (a, b) { return b.ovr - a.ovr; });
  }
  // can this team fit this salary? returns '' if ok, otherwise the reason
  function canSign(tid, amt, p) {
    var c = L.capStatus(tid), t = L.team(tid);
    if (L.roster(tid).length >= L.ROSTER_MAX) return 'Roster is full (' + L.ROSTER_MAX + ').';
    if (amt <= L.minSal(p.exp) + 0.01) return '';
    if (c.space >= amt) return '';
    if (!t.mleUsed && amt <= c.c.mle && c.pay + amt <= c.c.ap1) return '';
    if (!t.mleUsed && amt <= c.c.tmle && c.pay + amt <= c.c.ap2) return '';
    return 'Not enough cap space. You have ' + U.money(Math.max(0, c.space)) + ' (mid-level ' + U.money(c.c.mle) + (t.mleUsed ? ', already used' : '') + ').';
  }
  function interest(p, tid) {
    // winning teams get a small discount, bad teams pay a little more
    var t = L.team(tid), gp = t.w + t.l, wp = gp ? t.w / gp : 0.5;
    var r = L.teamRating(tid, false);
    return U.clamp(1.06 - (wp - 0.5) * 0.3 - (r - 78) * 0.01, 0.88, 1.15);
  }
  function offer(tid, pid, amt, yrs) {
    var p = L.player(pid), s = S();
    if (!p || p.t !== 'FA') return { ok: false, msg: 'He is not a free agent.' };
    var why = canSign(tid, amt, p); if (why) return { ok: false, msg: why };
    if (!p.ask) setAsk(p);
    var need = p.ask.amt * interest(p, tid);
    if (amt + 0.001 < need) return { ok: false, msg: p.n + ' wants about ' + U.money(need) + ' a year from you.' };
    if (yrs > 5 || yrs < 1) return { ok: false, msg: 'Contracts are 1 to 5 years.' };
    var c = L.capStatus(tid), t = L.team(tid);
    if (c.space < amt && amt > L.minSal(p.exp) + 0.01) t.mleUsed = true;
    p.t = tid; p.sal = contract(amt, yrs); p.bird = tid; delete p.ask;
    L.fixOrder(tid);
    L.news(L.teamName(tid) + ' sign ' + p.n + ' (' + yrs + ' yr, ' + U.money(amt) + '/yr).', tid === s.user ? 'you' : '');
    return { ok: true, msg: p.n + ' signed! ' + yrs + (yrs > 1 ? ' years, ' : ' year, ') + U.money(amt) + ' a year.' };
  }
  function release(pid) {
    var p = L.player(pid), s = S(), t = L.team(p.t);
    if (!t) return;
    if (L.roster(p.t).length <= L.ROSTER_MIN && s.phase === 'regular') return 'You need at least ' + L.ROSTER_MIN + ' players during the season.';
    if (p.sal.length) t.dead.push({ n: p.n, amt: p.sal.slice() });
    L.news(L.teamName(p.t) + ' waive ' + p.n + '. ' + U.money(U.sum(p.sal)) + ' stays on their cap as dead money.', p.t === s.user ? 'you' : '');
    p.t = 'FA'; p.sal = []; setAsk(p); p.ask.amt = Math.max(L.minSal(p.exp), p.ask.amt * 0.7);
    L.fixOrder(t.id);
    return '';
  }
  function cpuSignRound(minOnly) {
    var s = S();
    U.shuffle(L.teamIds().slice()).forEach(function (tid) {
      if (tid === s.user) return;
      var n = L.roster(tid).length; if (n >= 15) return;
      var fas = freeAgents(), t = L.team(tid);
      for (var i = 0; i < fas.length; i++) {
        var p = fas[i]; if (!p.ask) setAsk(p);
        var want = minOnly ? L.minSal(p.exp) : Math.round(p.ask.amt * interest(p, tid) * 100) / 100 + 0.01;
        if (minOnly && p.ask.amt > want * 1.5 && n >= L.ROSTER_MIN) continue;
        if (t.strat === 'rebuild' && p.age >= 31 && want > 10) continue;
        if (canSign(tid, want, p)) continue;
        if (minOnly) p.ask.amt = Math.min(p.ask.amt, want / interest(p, tid));
        if (offer(tid, p.id, want, minOnly ? 1 : p.ask.yrs).ok) break;
      }
    });
  }
  function cpuFillRosters() {
    var s = S(), used = null;
    L.teamIds().forEach(function (tid) {
      var g = 0;
      while (tid !== s.user && L.roster(tid).length < L.ROSTER_MIN && g++ < 20) {
        var fas = freeAgents(), p = fas[0];
        if (!p) { used = used || usedNames(); var pos = U.pick(POS); p = newPlayer({ n: U.makeName(used), t: 'FA', pos: pos, age: U.ri(23, 31), ht: heightFor(pos), ovr: U.ri(60, 67), pot: 68, exp: U.ri(1, 6) }); p.pot = p.ovr + U.ri(0, 3); }
        p.t = tid; p.sal = [L.minSal(p.exp)]; p.bird = tid; delete p.ask;
        L.fixOrder(tid);
      }
    });
  }

  // ---------- offseason flow ----------
  function startOffseason() {
    var s = S();
    for (var k in s.players) if (s.players[k].inj) s.players[k].inj = 0;
    s.phase = 'lottery';
    // order: lottery teams = non-playoff teams, worst first
    var po = s.po, inPO = {};
    (po.done[0] || []).forEach(function (x) { inPO[x.a] = inPO[x.b] = 1; });
    var all = Sim.standings().reverse(); // worst first
    var lot = all.filter(function (t) { return !inPO[t.id]; }).map(function (t) { return t.id; });
    var rest = all.filter(function (t) { return inPO[t.id]; }).map(function (t) { return t.id; });
    var odds = lot.map(function (id, i) { return LOTTO[i] != null ? LOTTO[i] : 0.5; });
    var drawn = [], pool = lot.slice(), w = odds.slice();
    for (var d = 0; d < 4 && pool.length; d++) {
      var tot = U.sum(w), r = U.rnd() * tot, j = 0;
      while (r > w[j] && j < w.length - 1) { r -= w[j]; j++; }
      drawn.push(pool[j]); pool.splice(j, 1); w.splice(j, 1);
    }
    var order = drawn.concat(pool).concat(rest);
    s.lottery = { pre: lot, odds: odds, order: order.slice(0, lot.length) };
    s.draftOrder = order;
    var picks = [], second = all.map(function (t) { return t.id; });
    order.forEach(function (o, i) { picks.push({ n: i + 1, r: 1, o: o }); });
    second.forEach(function (o, i) { picks.push({ n: order.length + i + 1, r: 2, o: o }); });
    picks.forEach(function (x) {
      var pk = s.picks.filter(function (p) { return p.y === s.season && p.r === x.r && p.o === x.o; })[0];
      x.h = pk ? pk.h : x.o; x.pid = pk ? pk.id : null;
    });
    s.draft = { picks: picks, at: 0 };
    var up = order.indexOf(s.user);
    var mine = picks.filter(function (x) { return x.h === s.user; }).map(function (x) { return '#' + x.n; });
    L.news('Draft Lottery: ' + L.teamName(order[0]) + ' win the #1 pick!' + (mine.length ? ' You pick at ' + mine.join(', ') + '.' : ' You have no picks this year.'), 'big');
  }
  function startDraft() { var s = S(); if (s.phase === 'lottery') { s.phase = 'draft'; if (!s.draft.picks.length) finishDraft(); } }
  function draftOnClock() { var d = S().draft; return d && d.picks[d.at]; }
  function draftPick(pid) {
    var s = S(), d = s.draft, x = d.picks[d.at], p = L.player(pid);
    if (!x || !p || p.t !== 'DC') return;
    p.t = x.h; p.bird = x.h; p.dp = x.n; p.dy = s.season; p.exp = -1;
    p.sal = x.r === 1 ? contract(L.rookieSal(x.n), 4) : contract(L.minSal(0), 2);
    delete p.scout;
    x.pick = p.id; x.name = p.n;
    s.picks = s.picks.filter(function (k) { return k.id !== x.pid; });
    if (x.h === s.user) L.news('You drafted ' + p.n + ' (' + p.pos + ', ' + p.ovr + ' OVR) at #' + x.n + '.', 'you');
    if (x.n === 1) L.news(L.teamName(x.h) + ' take ' + p.n + ' with the #1 pick.', 'big');
    d.at++;
    if (d.at >= d.picks.length) finishDraft();
  }
  function draftCpu() {
    var s = S(), x = draftOnClock(); if (!x) return;
    var t = L.team(x.h), dc = draftClass(), best = null, bs = -1e9;
    dc.slice(0, 12).forEach(function (p) {
      var sc = p.pot * (t.strat === 'rebuild' ? 0.7 : 0.55) + p.ovr * (t.strat === 'rebuild' ? 0.3 : 0.45) + U.gauss() * 1.5;
      if (sc > bs) { bs = sc; best = p; }
    });
    if (best) draftPick(best.id);
  }
  function draftToUser() { var s = S(), g = 0; while (s.phase === 'draft' && draftOnClock() && draftOnClock().h !== s.user && g++ < 200) draftCpu(); }
  function draftAll() { var s = S(), g = 0; while (s.phase === 'draft' && g++ < 200) draftCpu(); }
  function finishDraft() {
    var s = S();
    // undrafted prospects become free agents
    draftClass().forEach(function (p) { p.t = 'FA'; delete p.scout; setAsk(p); p.ask.amt = L.minSal(0); p.ask.yrs = 1; });
    L.teamIds().forEach(L.fixOrder);
    startResign();
  }
  function startResign() {
    var s = S(); s.phase = 'resign';
    // retirements
    for (var k in s.players) {
      var p = s.players[k]; if (p.t === 'DC') continue;
      var ch = 0;
      if (p.age >= 37) ch = 0.45 + (p.age - 37) * 0.15;
      else if (p.age >= 34 && p.ovr < 74) ch = 0.35;
      else if (p.t === 'FA' && p.age >= 31 && p.ovr < 68) ch = 0.5;
      if (p.ovr >= 86) ch *= 0.4;
      if (U.rnd() < ch) {
        if (p.ovr >= 78 || p.t === s.user) L.news(p.n + ' retires after ' + (p.exp + 1) + ' seasons.', p.t === s.user ? 'you' : 'big');
        if (p.sal.length > 1 && L.team(p.t)) { /* contract wiped on retirement */ }
        delete s.players[k];
      }
    }
    expiring(s.user).forEach(function (p) { setAsk(p); p.ask.amt = Math.round(p.ask.amt * 0.95 * 100) / 100; });
    L.news('Re-sign window is open. Your players on expiring deals are waiting for offers.', 'you');
  }
  function expiring(tid) { return L.roster(tid).filter(function (p) { return p.sal.length <= 1; }); }
  function resign(pid, amt, yrs) {
    var p = L.player(pid);
    if (!p.ask) setAsk(p);
    if (amt + 0.001 < p.ask.amt) return { ok: false, msg: p.n + ' wants ' + U.money(p.ask.amt) + ' a year.' };
    if (amt > L.maxSal(p.exp)) return { ok: false, msg: 'Max contract is ' + U.money(L.maxSal(p.exp)) + '.' };
    p.newDeal = contract(amt, yrs);
    return { ok: true, msg: p.n + ' agreed to ' + yrs + ' years, ' + U.money(amt) + ' a year.' };
  }
  function startFA() {
    var s = S(); if (s.phase !== 'resign') return;
    // CPU teams re-sign who they want
    for (var k in s.players) {
      var p = s.players[k], t = L.team(p.t);
      if (!t || p.sal.length > 1 || p.t === s.user) continue;
      if (!p.ask) setAsk(p);
      t._nx = t._nx == null ? L.payrollYear(p.t, 1) : t._nx;
      var lim = L.capFor().tax * 1.07 * (t.strat === 'contend' ? 1.08 : 0.85);
      var want = p.ovr >= 72 && !(t.strat === 'rebuild' && p.age >= 30) && t._nx + p.ask.amt < lim;
      if (want && U.rnd() < 0.7) { p.newDeal = contract(p.ask.amt, p.ask.yrs); t._nx += p.ask.amt; }
    }
    L.teamIds().forEach(function (id) { delete L.team(id)._nx; });
    // the new league year starts: contracts tick down
    for (k in s.players) {
      p = s.players[k]; if (p.t === 'DC') continue;
      if (L.team(p.t)) {
        if (p.newDeal) { p.sal = p.newDeal; delete p.newDeal; }
        else { p.sal.shift(); }
        if (!p.sal.length) { L.news((p.t === s.user ? 'Your player ' : '') + p.n + ' is now a free agent.', p.t === s.user ? 'you' : ''); p.t = 'FA'; setAsk(p); }
        else delete p.ask;
      }
    }
    L.teamIds().forEach(function (id) {
      var t = L.team(id); t.mleUsed = false;
      t.dead = (t.dead || []).map(function (d) { d.amt = d.amt.slice(1); return d; }).filter(function (d) { return d.amt.length; });
    });
    s.season++;
    s.phase = 'fa'; s.faDay = 1;
    L.addPicksForYear(s.season + L.PICK_YEARS - 1);
    s.picks = s.picks.filter(function (p) { return p.y >= s.season; });
    s.draftOrder = null; s.draft = null;
    L.teamIds().forEach(L.fixOrder);
    L.news('Free agency is open for the ' + U.seasonLabel(s.season) + ' season. Salary cap: ' + U.money(L.capFor().cap) + '.', 'big');
  }
  function nextFADay() {
    var s = S();
    cpuSignRound(false);
    freeAgents().forEach(function (p) { if (p.ask) p.ask.amt = Math.max(L.minSal(p.exp), Math.round(p.ask.amt * 0.85 * 100) / 100); });
    s.faDay++;
  }
  function startSeason() {
    var s = S();
    cpuSignRound(false); cpuSignRound(true); cpuFillRosters();
    // unsigned leftovers: keep the best 70 free agents, the rest leave the league
    freeAgents().slice(70).forEach(function (p) { delete s.players[p.id]; });
    // progression + aging
    for (var k in s.players) {
      var p = s.players[k]; if (p.t === 'DC') continue;
      p.age++; p.exp++;
      var a = p.age, d;
      if (a <= 21) d = U.ri(1, 6); else if (a <= 24) d = U.ri(0, 5); else if (a <= 27) d = U.ri(-1, 3);
      else if (a <= 30) d = U.ri(-2, 2); else if (a <= 33) d = U.ri(-4, 1); else d = U.ri(-6, 0);
      var room = p.pot - p.ovr;
      if (d > 0 && room <= 0) d = U.rnd() < 0.25 ? 1 : 0; else if (d > room + 1) d = room + U.ri(0, 1);
      var old = p.ovr;
      p.ovr = U.clamp(p.ovr + d, 45, 99);
      if (a <= 25) p.pot = U.clamp(Math.max(p.ovr, p.pot + U.ri(-2, 2)), p.ovr, 99); else p.pot = Math.max(p.ovr, Math.min(p.pot, p.ovr + 1));
      if (p.r && old) { var f = 1 + (p.ovr - old) * 0.035; p.r[0] = Math.round(p.r[0] * f * 10) / 10; p.r[2] = Math.round(p.r[2] * (1 + (p.ovr - old) * 0.02) * 10) / 10; }
      p.prog = p.ovr - old;
    }
    Sim.newSeason();
    makeDraftClass();
    L.news('The ' + U.seasonLabel(s.season) + ' season is here.', 'big');
  }

  return {
    posGroup: posGroup, makeDraftClass: makeDraftClass, draftClass: draftClass,
    fdTeam: fdTeam, fdPool: fdPool, fdPick: fdPick, fdCpuPick: fdCpuPick, fdSimToUser: fdSimToUser, fdAutoAll: fdAutoAll,
    setAsk: setAsk, freeAgents: freeAgents, canSign: canSign, interest: interest, offer: offer, release: release, cpuSignRound: cpuSignRound, cpuFillRosters: cpuFillRosters,
    startOffseason: startOffseason, startDraft: startDraft, draftOnClock: draftOnClock, draftPick: draftPick, draftCpu: draftCpu, draftToUser: draftToUser, draftAll: draftAll,
    expiring: expiring, resign: resign, startFA: startFA, nextFADay: nextFADay, startSeason: startSeason
  };
})();
