// league.js - league state, cap, rosters, values
var G = { S: null };
var L = (function () {
  // Real 2026-27 numbers (NBA official, in $M). Later seasons grow 7% a year.
  var BASE = { cap: 164.961, min: 148.465, tax: 200.428, ap1: 209.015, ap2: 221.686 };
  var ROSTER_MAX = 18, ROSTER_MIN = 13, FIRST_SEASON = 2027, PICK_YEARS = 7;
  var MINS = [34, 34, 33, 32, 31, 24, 20, 15, 10, 7];

  function S() { return G.S; }
  function capFor(season) {
    var f = Math.pow(1.07, (season || S().season) - FIRST_SEASON), o = {};
    for (var k in BASE) o[k] = Math.round(BASE[k] * f * 1000) / 1000;
    o.mle = Math.round(o.cap * 0.0912 * 100) / 100; // non-taxpayer mid-level
    o.tmle = Math.round(o.cap * 0.0368 * 100) / 100; // taxpayer mid-level
    return o;
  }
  function capRatio() { return capFor().cap / BASE.cap; }
  function minSal(exp) { return Math.round(Math.min(3.6, 1.27 + (exp || 0) * 0.23) * capRatio() * 100) / 100; }
  function maxSal(exp) { var c = capFor().cap; return Math.round(c * (exp >= 10 ? 0.35 : exp >= 7 ? 0.30 : 0.25) * 100) / 100; }
  function rookieSal(pick) {
    var r = capRatio();
    if (pick > 30) return Math.round(1.27 * r * 100) / 100;
    return Math.round(Math.max(2.6, 13.8 * Math.pow(0.92, pick - 1)) * r * 100) / 100;
  }

  function team(id) { return S().teams[id]; }
  function teamIds() { return Object.keys(S().teams); }
  function player(id) { return S().players[id]; }
  function roster(tid) { var out = [], P = S().players; for (var k in P) if (P[k].t === tid) out.push(P[k]); return out; }
  function payroll(tid) {
    var t = team(tid), tot = 0, r = roster(tid);
    for (var i = 0; i < r.length; i++) tot += r[i].sal[0] || 0;
    (t.dead || []).forEach(function (d) { tot += d.amt[0] || 0; });
    return Math.round(tot * 100) / 100;
  }
  function payrollYear(tid, y) {
    var t = team(tid), tot = 0;
    roster(tid).forEach(function (p) { tot += p.sal[y] || 0; });
    (t.dead || []).forEach(function (d) { tot += d.amt[y] || 0; });
    return Math.round(tot * 100) / 100;
  }
  function capStatus(tid) {
    var c = capFor(), p = payroll(tid);
    var lvl = p >= c.ap2 ? '2ND APRON' : p >= c.ap1 ? '1ST APRON' : p >= c.tax ? 'TAX' : p >= c.cap ? 'OVER CAP' : 'UNDER CAP';
    return { pay: p, space: Math.round((c.cap - p) * 100) / 100, level: lvl, c: c };
  }

  function fixOrder(tid) {
    var t = team(tid), r = roster(tid), ids = {};
    r.forEach(function (p) { ids[p.id] = 1; });
    var keep = (t.order || []).filter(function (id) { return ids[id]; });
    var rest = r.filter(function (p) { return keep.indexOf(p.id) < 0; }).sort(function (a, b) { return b.ovr - a.ovr; }).map(function (p) { return p.id; });
    if (tid !== S().user || !t.order) {
      // CPU (and fresh teams) just play their best guys
      t.order = r.sort(function (a, b) { return b.ovr - a.ovr; }).map(function (p) { return p.id; });
    } else t.order = keep.concat(rest);
  }
  // minutes for a team tonight (skips injured)
  function rotation(tid) {
    var t = team(tid); if (!t.order) fixOrder(tid);
    var list = t.order.map(player).filter(function (p) { return p && p.t === tid && !(p.inj > 0); });
    if (tid !== S().user) list.sort(function (a, b) { return b.ovr - a.ovr; });
    return list.slice(0, 10).map(function (p, i) { return { p: p, min: MINS[i] }; });
  }
  function teamRating(tid, healthy) {
    var rot;
    if (healthy === false) {
      rot = roster(tid).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 10).map(function (p, i) { return { p: p, min: MINS[i] }; });
    } else rot = rotation(tid);
    var tot = 0;
    for (var i = 0; i < 10; i++) tot += (rot[i] ? rot[i].p.ovr : 52) * MINS[i];
    // top-heavy bonus: stars matter more in the NBA
    var stars = rot.slice(0, 3).reduce(function (s, x) { return s + Math.max(0, x.p.ovr - 84); }, 0);
    return tot / 240 + stars * 0.18;
  }
  function ovrRank() {
    return teamIds().map(function (id) { return { id: id, r: teamRating(id, false) }; }).sort(function (a, b) { return b.r - a.r; });
  }
  function setStrategies() {
    var rk = ovrRank(), n = rk.length;
    rk.forEach(function (x, i) {
      var t = team(x.id);
      if (t.id === S().user) { t.strat = t.strat || 'contend'; return; }
      var top = roster(x.id).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 7);
      var age = U.sum(top, function (p) { return p.age; }) / Math.max(1, top.length);
      t.strat = (i < n * 0.45 || (i < n * 0.6 && age > 28)) ? 'contend' : 'rebuild';
    });
  }

  function worth(ovr) {
    var r = capRatio();
    return Math.max(1.3 * r, Math.min(capFor().cap * 0.35, 40 * Math.exp((ovr - 85) / 7.5) * r));
  }
  function effRating(p, strat) {
    var yw = U.clamp((26 - p.age) / 7, 0, 1) * (strat === 'rebuild' ? 0.75 : 0.4);
    var e = p.ovr + (p.pot - p.ovr) * yw;
    if (strat === 'rebuild' && p.age >= 30) e -= (p.age - 29) * 1.2;
    if (p.age >= 34) e -= (p.age - 33) * 0.8;
    return e;
  }
  function playerValue(p, tid) {
    var strat = tid ? (team(tid).strat || 'contend') : 'contend';
    var tal = worth(effRating(p, strat)) / capRatio() * (strat === 'contend' ? 1.12 : 1);
    var yrs = Math.max(1, Math.min(4, p.sal.length)), v = 0;
    for (var y = 0; y < yrs; y++) v += (tal - (p.sal[y] || 0) / capRatio() * 0.55) * Math.pow(0.9, y);
    if (p.sal.length <= 1) v += tal * 0.25; // expiring = flexibility
    if (p.inj > 20) v *= 0.8;
    return Math.round(v * 10) / 10;
  }
  function projSlot(orig, year) {
    var s = S(), n = teamIds().length;
    if (s.draftOrder && year === s.season && s.draftOrder.indexOf(orig) >= 0) return s.draftOrder.indexOf(orig) + 1;
    // worst team = pick 1
    var list = teamIds().map(function (id) {
      var t = team(id), gp = t.w + t.l, wp = gp ? t.w / gp : 0.5;
      var r = teamRating(id, false), rw = (r - 76) / 12 + 0.5;
      var f = year === s.season ? Math.min(1, gp / 60) : 0;
      return { id: id, k: wp * f + rw * (1 - f) };
    }).sort(function (a, b) { return a.k - b.k; });
    var slot = 1; for (var i = 0; i < list.length; i++) if (list[i].id === orig) slot = i + 1;
    var away = year - s.season;
    var mid = (n + 1) / 2;
    return Math.round(slot + (mid - slot) * Math.min(0.85, away * 0.3));
  }
  function pickValue(pk, tid) {
    var strat = tid ? team(tid).strat : 'contend', s = S();
    var slot = projSlot(pk.o, pk.y);
    var eff = pk.r === 1 ? 84 - slot * 0.45 : 67 - slot * 0.06;
    var v = (worth(eff) / capRatio()) * (pk.r === 1 ? 2.5 : 1.2) * Math.pow(0.93, Math.max(0, pk.y - s.season));
    if (strat === 'rebuild') v *= 1.3; else v *= 0.85;
    return Math.round(v * 10) / 10;
  }
  function pickLabel(pk) {
    var s = pk.y + ' ' + (pk.r === 1 ? '1st' : '2nd');
    if (pk.o !== pk.h) s += ' (' + pk.o + ')';
    return s;
  }
  function picksOf(tid) {
    return S().picks.filter(function (p) { return p.h === tid; }).sort(function (a, b) { return a.y - b.y || a.r - b.r; });
  }
  function news(msg, kind) {
    var s = S(); s.news.unshift({ d: s.dayLabel || '', m: msg, k: kind || '' });
    if (s.news.length > 150) s.news.length = 150;
  }
  function blankStats() { return { g: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }; }

  function addPicksForYear(y) {
    teamIds().forEach(function (id) {
      [1, 2].forEach(function (r) { S().picks.push({ id: y + '-' + r + '-' + id, y: y, r: r, o: id, h: id }); });
    });
  }

  // brand-new league
  function newLeague(o) {
    var s = { v: 1, slot: o.slot, mode: o.mode, user: null, season: FIRST_SEASON, phase: 'regular', day: 0, teams: {}, players: {}, picks: [], news: [], history: [], awards: [], nextPid: 1, created: Date.now(), tradeLog: [] };
    G.S = s;
    NBA_TEAMS.forEach(function (t) {
      s.teams[t.id] = { id: t.id, city: t.city, name: t.name, c1: t.c1, c2: t.c2, conf: t.conf, logo: t.logo, w: 0, l: 0, dead: [], order: null, strat: 'contend' };
    });
    if (o.mode === 'create') {
      var c = o.custom;
      s.teams[c.id] = { id: c.id, city: c.city, name: c.name, c1: c.c1, c2: c.c2, conf: c.conf, logo: null, custom: true, w: 0, l: 0, dead: [], order: null, strat: 'rebuild' };
      s.user = c.id;
    } else s.user = o.team;
    NBA_PLAYERS.forEach(function (p) {
      var q = JSON.parse(JSON.stringify(p));
      q.hs = p.id; q.id = s.nextPid++;
      q.inj = p.inj === 'Out' ? U.ri(4, 30) : p.inj === 'Day-To-Day' ? U.ri(1, 3) : 0;
      q.st = blankStats(); q.car = []; q.bird = q.t;
      if (!q.r) q.r = rateFromOvr(q);
      s.players[q.id] = q;
    });
    for (var y = s.season; y < s.season + PICK_YEARS; y++) addPicksForYear(y);
    if (o.fantasy) {
      for (var k in s.players) s.players[k].t = 'POOL';
      s.phase = 'fantasy';
      s.fd = { order: U.shuffle(teamIds()), round: 1, idx: 0, rounds: 14, log: [] };
    } else {
      teamIds().forEach(fixOrder);
      Sim.newSeason(true);
      Off.makeDraftClass();
    }
    setStrategies();
    news('Welcome to the ' + U.seasonLabel(s.season) + ' season. You run the ' + teamName(s.user) + '.', 'big');
    return s;
  }
  function rateFromOvr(p) {
    var f = (p.ovr - 60) / 30, big = /C/.test(p.pos), guard = /G/.test(p.pos) && !/F/.test(p.pos);
    return [Math.round((8 + f * 18) * 10) / 10, Math.round((big ? 9 : guard ? 4 : 6.5) * (0.8 + f * 0.5) * 10) / 10, Math.round((guard ? 5 : big ? 1.8 : 2.8) * (0.8 + f * 0.6) * 10) / 10, 1, big ? 1.4 : 0.5];
  }
  function teamName(id) { var t = team(id); return t ? t.city + ' ' + t.name : id; }
  function shortName(id) { var t = team(id); return t ? t.name : id; }

  return {
    BASE: BASE, ROSTER_MAX: ROSTER_MAX, ROSTER_MIN: ROSTER_MIN, MINS: MINS, PICK_YEARS: PICK_YEARS,
    capFor: capFor, capRatio: capRatio, minSal: minSal, maxSal: maxSal, rookieSal: rookieSal,
    team: team, teamIds: teamIds, player: player, roster: roster, payroll: payroll, payrollYear: payrollYear, capStatus: capStatus,
    fixOrder: fixOrder, rotation: rotation, teamRating: teamRating, ovrRank: ovrRank, setStrategies: setStrategies,
    worth: worth, effRating: effRating, playerValue: playerValue, pickValue: pickValue, projSlot: projSlot, pickLabel: pickLabel, picksOf: picksOf,
    news: news, blankStats: blankStats, addPicksForYear: addPicksForYear, newLeague: newLeague, rateFromOvr: rateFromOvr, teamName: teamName, shortName: shortName
  };
})();
