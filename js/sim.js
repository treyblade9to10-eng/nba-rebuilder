// sim.js - schedule, games, standings, playoffs
var Sim = (function () {
  var GAMES = 82;
  function S() { return G.S; }

  function makeSchedule(ids) {
    var list = ids.slice(); if (list.length % 2) list.push('BYE');
    U.shuffle(list);
    var n = list.length, cnt = {}, days = [], flip = false;
    ids.forEach(function (id) { cnt[id] = 0; });
    var guard = 0;
    while (ids.some(function (id) { return cnt[id] < GAMES; }) && guard++ < 400) {
      for (var r = 0; r < n - 1; r++) {
        var day = [];
        for (var i = 0; i < n / 2; i++) {
          var a = list[i], b = list[n - 1 - i];
          if (a === 'BYE' || b === 'BYE') continue;
          if (cnt[a] >= GAMES || cnt[b] >= GAMES) continue;
          var home = ((i + r) % 2 === 0) !== flip;
          day.push(home ? [a, b] : [b, a]); cnt[a]++; cnt[b]++;
        }
        if (day.length) days.push(day);
        list.splice(1, 0, list.pop()); // rotate (circle method)
        if (!ids.some(function (id) { return cnt[id] < GAMES; })) break;
      }
      flip = !flip;
    }
    // leftovers (odd team counts): pair up whoever still needs games
    var need = ids.filter(function (id) { return cnt[id] < GAMES; });
    while (need.length >= 2) {
      var x = need.shift(), y = need.shift();
      days.push([[x, y]]); cnt[x]++; cnt[y]++;
      need = ids.filter(function (id) { return cnt[id] < GAMES; });
    }
    return days;
  }

  function newSeason(first) {
    var s = S();
    L.teamIds().forEach(function (id) { var t = L.team(id); t.w = 0; t.l = 0; t.pf = 0; t.pa = 0; t.strk = ''; t.last = []; });
    for (var k in s.players) s.players[k].st = L.blankStats();
    s.sched = makeSchedule(L.teamIds());
    s.day = 0; s.games = []; s.phase = 'regular'; s.po = null; s.draftOrder = null;
    s.deadline = Math.round(s.sched.length * 0.62);
    s.dayLabel = 'Day 1';
    L.teamIds().forEach(L.fixOrder);
    L.setStrategies();
  }

  function playGame(h, a, playoff) {
    var s = S();
    var rh = L.teamRating(h) + 1.4, ra = L.teamRating(a);
    var diff = rh - ra;
    var margin = diff * 2.1 + U.gauss() * 11.5;
    var tot = 226 + U.gauss() * 12 + (playoff ? -6 : 0);
    var hs = Math.round(tot / 2 + margin / 2), as = Math.round(tot / 2 - margin / 2);
    var ot = 0;
    while (hs === as) { ot++; hs += U.ri(6, 14); as += U.ri(6, 14); }
    var box = {};
    box[h] = boxScore(h, hs, ot); box[a] = boxScore(a, as, ot);
    var hw = hs > as, th = L.team(h), ta = L.team(a);
    if (!playoff) {
      th.w += hw ? 1 : 0; th.l += hw ? 0 : 1; ta.w += hw ? 0 : 1; ta.l += hw ? 1 : 0;
      th.pf += hs; th.pa += as; ta.pf += as; ta.pa += hs;
      [th, ta].forEach(function (t) { var won = (t === th) === hw; t.last = (t.last || []).concat(won ? 'W' : 'L').slice(-10); });
      applyBox(box[h]); applyBox(box[a]);
    }
    injuries(h); injuries(a);
    var g = { d: s.day, h: h, a: a, hs: hs, as: as, ot: ot };
    if (h === s.user || a === s.user) g.box = { h: box[h], a: box[a] };
    return g;
  }
  function boxScore(tid, score, ot) {
    var rot = L.rotation(tid), lines = [], exp = 0;
    rot.forEach(function (x) {
      var m = x.min + (ot ? Math.round(x.min / 48 * 5 * ot) : 0);
      m = Math.max(0, Math.round(m + U.gauss() * 2.5));
      var r = x.p.r || [10, 4, 2, 1, .5];
      var e = r[0] * m / 36 * (0.65 + U.rnd() * 0.7);
      exp += e;
      lines.push({ id: x.p.id, n: x.p.n, min: m, e: e, reb: Math.max(0, Math.round(r[1] * m / 36 * (0.6 + U.rnd() * 0.8))), ast: Math.max(0, Math.round(r[2] * m / 36 * (0.55 + U.rnd() * 0.9))), stl: U.rnd() < r[3] * m / 36 ? U.ri(1, 2) : 0, blk: U.rnd() < r[4] * m / 36 ? U.ri(1, 3) : 0 });
    });
    var f = exp > 0 ? score / exp : 0, used = 0;
    lines.forEach(function (l) { l.pts = Math.max(0, Math.round(l.e * f)); used += l.pts; delete l.e; });
    if (lines.length) { lines.sort(function (a, b) { return b.pts - a.pts; }); lines[0].pts = Math.max(0, lines[0].pts + score - used); }
    return lines;
  }
  function applyBox(lines) {
    lines.forEach(function (l) {
      var p = L.player(l.id); if (!p) return;
      var st = p.st; st.g++; st.min += l.min; st.pts += l.pts; st.reb += l.reb; st.ast += l.ast; st.stl += l.stl; st.blk += l.blk;
    });
  }
  function injuries(tid) {
    L.rotation(tid).forEach(function (x) {
      if (U.rnd() < 0.0028) {
        var g = U.rnd() < 0.7 ? U.ri(1, 6) : U.rnd() < 0.8 ? U.ri(7, 20) : U.ri(21, 60);
        x.p.inj = g;
        if (x.p.ovr >= 80 || tid === S().user) L.news(x.p.n + ' (' + tid + ') is hurt and will miss about ' + g + ' game' + (g > 1 ? 's' : '') + '.', tid === S().user ? 'you' : '');
      }
    });
  }

  function simDay() {
    var s = S();
    if (s.phase !== 'regular') return false;
    if (s.day >= s.sched.length) { startPlayoffs(); return false; }
    var day = s.sched[s.day];
    var played = {};
    day.forEach(function (m) {
      var g = playGame(m[0], m[1]);
      played[m[0]] = played[m[1]] = 1;
      s.games.push(g);
    });
    for (var k in s.players) { var p = s.players[k]; if (p.inj > 0 && (played[p.t] || p.t === 'FA')) p.inj--; }
    s.day++;
    s.dayLabel = 'Day ' + (s.day + 1);
    if (s.day % 7 === 0) { Trade.cpuWeekly(); Off.cpuFillRosters(); L.setStrategies(); }
    if (s.day === s.deadline) L.news('The trade deadline has passed. No more trades until the offseason.', 'big');
    if (s.day >= s.sched.length) { startPlayoffs(); }
    return true;
  }
  function simDays(n) { for (var i = 0; i < n; i++) if (!simDay()) break; }
  function userNextGameDay() {
    var s = S();
    for (var d = s.day; d < s.sched.length; d++) if (s.sched[d].some(function (m) { return m[0] === s.user || m[1] === s.user; })) return d;
    return -1;
  }
  function simNextGame() {
    var s = S(), d = userNextGameDay();
    if (d < 0) { simDays(1); return; }
    while (s.phase === 'regular' && s.day <= d) simDay();
  }
  function tradeOpen() {
    var s = S();
    if (s.phase === 'regular') return s.day < s.deadline;
    return ['draft', 'resign', 'fa', 'preseason', 'lottery'].indexOf(s.phase) >= 0;
  }

  function standings(conf) {
    return L.teamIds().map(L.team).filter(function (t) { return !conf || t.conf === conf; }).sort(function (a, b) {
      var pa = a.w / Math.max(1, a.w + a.l), pb = b.w / Math.max(1, b.w + b.l);
      return pb - pa || (b.pf - b.pa) - (a.pf - a.pa) || b.w - a.w;
    });
  }

  // ---------- playoffs ----------
  function startPlayoffs() {
    var s = S(); if (s.phase !== 'regular') return;
    s.phase = 'playoffs';
    s.po = { stage: 'playin', round: 0, series: [], seeds: {}, log: [] };
    ['E', 'W'].forEach(function (c) { s.po.seeds[c] = standings(c).map(function (t) { return t.id; }); });
    L.news('The regular season is over. Play-In Tournament is next.', 'big');
    var u = L.team(s.user), seed = s.po.seeds[u.conf].indexOf(s.user) + 1;
    L.news('You finished ' + u.w + '-' + u.l + ', ' + U.ord(seed) + ' in the ' + (u.conf === 'E' ? 'East' : 'West') + '.', 'you');
  }
  function playSingle(h, a) { var g = playGame(h, a, true); return { w: g.hs > g.as ? h : a, l: g.hs > g.as ? a : h, g: g }; }
  function runPlayIn() {
    var s = S(), po = s.po;
    po.playin = {};
    ['E', 'W'].forEach(function (c) {
      var sd = po.seeds[c];
      var g1 = playSingle(sd[6], sd[7]);
      var g2 = playSingle(sd[8], sd[9]);
      var g3 = playSingle(g1.l, g2.w);
      po.playin[c] = [g1.g, g2.g, g3.g];
      var final = sd.slice(0, 6).concat([g1.w, g3.w]);
      po.seeds[c + '8'] = final;
      po.log.push(c + ' Play-In: ' + g1.w + ' clinch the 7 seed, ' + g3.w + ' take the 8 seed.');
    });
    po.stage = 'r1'; po.round = 1;
    po.series = [];
    ['E', 'W'].forEach(function (c) {
      var f = po.seeds[c + '8'];
      [[0, 7], [3, 4], [2, 5], [1, 6]].forEach(function (m) { po.series.push(newSeries(f[m[0]], f[m[1]], c, m[0] + 1, m[1] + 1)); });
    });
    var user = s.user, inIt = po.series.some(function (x) { return x.a === user || x.b === user; });
    L.news(inIt ? 'You made the playoffs!' : 'You missed the playoffs. Time to think about the draft.', 'you');
  }
  function newSeries(a, b, conf, sa, sb) { return { a: a, b: b, sa: sa, sb: sb, wa: 0, wb: 0, conf: conf, g: [] }; }
  var HOME = [1, 1, 0, 0, 1, 0, 1]; // 1 = higher seed at home
  function seriesDone(x) { return x.wa === 4 || x.wb === 4; }
  function simPlayoffDay() {
    var s = S(), po = s.po;
    if (!po || po.stage === 'done') return;
    if (po.stage === 'playin') { runPlayIn(); return; }
    po.series.forEach(function (x) {
      if (seriesDone(x)) return;
      var n = x.wa + x.wb, hi = HOME[n] ? x.a : x.b, lo = hi === x.a ? x.b : x.a;
      var r = playSingle(hi, lo);
      if (r.w === x.a) x.wa++; else x.wb++;
      x.g.push([r.g.h, r.g.hs, r.g.a, r.g.as]);
    });
    if (po.series.every(seriesDone)) advance();
  }
  function advance() {
    var s = S(), po = s.po, win = po.series.map(function (x) { return x.wa === 4 ? x.a : x.b; });
    po.series.forEach(function (x) {
      var w = x.wa === 4 ? x.a : x.b, l = w === x.a ? x.b : x.a;
      po.log.push(w + ' beat ' + l + ' ' + Math.max(x.wa, x.wb) + '-' + Math.min(x.wa, x.wb));
      if (l === s.user) L.news('Your season ended: ' + L.teamName(w) + ' beat you ' + Math.max(x.wa, x.wb) + '-' + Math.min(x.wa, x.wb) + '.', 'you');
    });
    po.done = (po.done || []).concat([po.series]);
    if (po.round === 4) {
      po.stage = 'done'; po.champ = win[0];
      var f = po.series[0]; po.runner = f.wa === 4 ? f.b : f.a;
      endSeason();
      return;
    }
    po.round++;
    po.stage = ['r1', 'r2', 'cf', 'f'][po.round - 1];
    var next = [];
    if (po.round === 4) {
      var e = po.series.filter(function (x) { return x.conf === 'E'; })[0], w = po.series.filter(function (x) { return x.conf === 'W'; })[0];
      var ew = e.wa === 4 ? e.a : e.b, ww = w.wa === 4 ? w.a : w.b;
      var te = L.team(ew), tw = L.team(ww), ewp = te.w / Math.max(1, te.w + te.l), wwp = tw.w / Math.max(1, tw.w + tw.l);
      next.push(ewp >= wwp ? newSeries(ew, ww, 'F', 1, 1) : newSeries(ww, ew, 'F', 1, 1));
    } else {
      ['E', 'W'].forEach(function (c) {
        var cs = po.series.filter(function (x) { return x.conf === c; });
        for (var i = 0; i < cs.length; i += 2) {
          var A = cs[i], B = cs[i + 1];
          var wa = A.wa === 4 ? [A.a, A.sa] : [A.b, A.sb], wb = B.wa === 4 ? [B.a, B.sa] : [B.b, B.sb];
          next.push(wa[1] <= wb[1] ? newSeries(wa[0], wb[0], c, wa[1], wb[1]) : newSeries(wb[0], wa[0], c, wb[1], wa[1]));
        }
      });
    }
    po.series = next;
  }
  function simPlayoffs(untilUserOut) {
    var s = S(), guard = 0;
    while (s.phase === 'playoffs' && s.po.stage !== 'done' && guard++ < 200) simPlayoffDay();
  }
  function simSeries() {
    var s = S(), po = s.po; if (!po) return;
    if (po.stage === 'playin') { runPlayIn(); return; }
    var r = po.round, guard = 0;
    while (s.phase === 'playoffs' && po.round === r && po.stage !== 'done' && guard++ < 10) simPlayoffDay();
  }

  function awards() {
    var s = S(), best = null, roy = null, P = s.players;
    for (var k in P) {
      var p = P[k]; if (!L.team(p.t) || p.st.g < 40) continue;
      var t = L.team(p.t), wp = t.w / Math.max(1, t.w + t.l);
      var sc = (p.st.pts + p.st.reb * 1.1 + p.st.ast * 1.4 + (p.st.stl + p.st.blk) * 1.5) / p.st.g * (0.6 + wp) + p.ovr * 0.3;
      if (!best || sc > best.sc) best = { p: p, sc: sc };
      if (p.exp === 0 && (!roy || sc > roy.sc)) roy = { p: p, sc: sc };
    }
    return { mvp: best && { n: best.p.n, t: best.p.t, id: best.p.id }, roy: roy && { n: roy.p.n, t: roy.p.t, id: roy.p.id } };
  }
  function endSeason() {
    var s = S(), aw = awards(), u = L.team(s.user);
    var userFinish = 'Missed playoffs';
    var allSeries = (s.po.done || []);
    allSeries.forEach(function (round, i) {
      round.forEach(function (x) { if (x.a === s.user || x.b === s.user) userFinish = ['Lost in 1st round', 'Lost in 2nd round', 'Lost in Conf Finals', 'Lost in Finals'][i]; });
    });
    if (s.po.champ === s.user) userFinish = 'CHAMPIONS';
    s.history.unshift({ season: s.season, champ: s.po.champ, runner: s.po.runner, mvp: aw.mvp, roy: aw.roy, user: s.user, rec: u.w + '-' + u.l, finish: userFinish });
    L.news(L.teamName(s.po.champ) + ' win the ' + s.season + ' NBA title!', 'big');
    if (aw.mvp) L.news('MVP: ' + aw.mvp.n + ' (' + aw.mvp.t + ')', 'big');
    if (aw.roy) L.news('Rookie of the Year: ' + aw.roy.n + ' (' + aw.roy.t + ')', 'big');
    if (aw.mvp && L.player(aw.mvp.id)) (L.player(aw.mvp.id).aw = L.player(aw.mvp.id).aw || []).push(s.season + ' MVP');
    if (s.po.champ === s.user) L.news('YOU WON THE CHAMPIONSHIP.', 'you');
    // save career lines
    for (var k in s.players) {
      var p = s.players[k];
      if (p.st.g) p.car.push({ y: s.season, t: p.t, g: p.st.g, pts: +(p.st.pts / p.st.g).toFixed(1), reb: +(p.st.reb / p.st.g).toFixed(1), ast: +(p.st.ast / p.st.g).toFixed(1), ovr: p.ovr });
    }
    Off.startOffseason();
  }

  return { newSeason: newSeason, simDay: simDay, simDays: simDays, simNextGame: simNextGame, tradeOpen: tradeOpen, standings: standings, startPlayoffs: startPlayoffs, simPlayoffDay: simPlayoffDay, simPlayoffs: simPlayoffs, simSeries: simSeries, seriesDone: seriesDone, playGame: playGame, makeSchedule: makeSchedule, GAMES: GAMES };
})();
