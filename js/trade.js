// trade.js - trade checks, CPU brain, offers
var Trade = (function () {
  function S() { return G.S; }
  function salOf(ids) { return U.sum(ids.map(L.player), function (p) { return p.sal[0] || 0; }); }
  function pk(id) { return S().picks.filter(function (p) { return p.id === id; })[0]; }

  // tr = {a, b, ap:[pids a gives], bp:[pids b gives], apk:[pick ids a gives], bpk:[]}
  function validate(tr) {
    var errs = [], c = L.capFor();
    [['a', 'ap', 'bp'], ['b', 'bp', 'ap']].forEach(function (x) {
      var tid = tr[x[0]], out = tr[x[1]], inc = tr[x[2]];
      var n = L.roster(tid).length - out.length + inc.length;
      if (n > L.ROSTER_MAX) errs.push(L.shortName(tid) + ' would have ' + n + ' players (max ' + L.ROSTER_MAX + ').');
      var so = salOf(out), si = salOf(inc), pay = L.payroll(tid), after = pay - so + si;
      if (si > so && after > c.cap) {
        var lim = after > c.ap2 ? so : so * 1.25 + 0.25;
        if (si > lim + 0.001) errs.push(L.shortName(tid) + ' are over the cap after this, so they can take back at most ' + U.money(lim) + ' (taking ' + U.money(si) + ').' + (after > c.ap2 ? ' Second apron teams cannot add salary.' : ''));
      }
    });
    if (!tr.ap.length && !tr.bp.length && !tr.apk.length && !tr.bpk.length) errs.push('Add something to the trade.');
    if (!Sim.tradeOpen()) errs.push(S().phase === 'regular' ? 'The trade deadline has passed.' : 'Trades are closed right now.');
    return errs;
  }
  // how the CPU team (tr.b) feels about it
  function evaluate(tr) {
    var b = tr.b;
    var vin = U.sum(tr.ap.map(L.player), function (p) { return L.playerValue(p, b); }) + U.sum(tr.apk.map(pk), function (p) { return L.pickValue(p, b); });
    var vout = U.sum(tr.bp.map(L.player), function (p) { return L.playerValue(p, b); }) + U.sum(tr.bpk.map(pk), function (p) { return L.pickValue(p, b); });
    // too many bodies coming back = they have to cut guys
    var extra = L.roster(b).length - tr.bp.length + tr.ap.length - 17;
    if (extra > 0 && tr.ap.length > tr.bp.length) vin -= extra * 1.5;
    // their franchise guy is hard to pry loose
    var best = L.roster(b).sort(function (x, y) { return y.ovr - x.ovr; })[0];
    if (best && tr.bp.indexOf(best.id) >= 0 && L.team(b).strat === 'contend') vout *= 1.12;
    var margin = 1 + Math.abs(vout) * 0.05;
    var scale = Math.max(12, (Math.abs(vin) + Math.abs(vout)) / 2);
    var pct = Math.round(U.clamp(80 + 100 * (vin - vout - margin) / scale, 0, 100));
    return { vin: vin, vout: vout, pct: pct, ok: pct >= 80 };
  }
  function execute(tr, silent) {
    var s = S();
    tr.ap.forEach(function (id) { L.player(id).t = tr.b; });
    tr.bp.forEach(function (id) { L.player(id).t = tr.a; });
    tr.apk.forEach(function (id) { pk(id).h = tr.b; });
    tr.bpk.forEach(function (id) { pk(id).h = tr.a; });
    L.fixOrder(tr.a); L.fixOrder(tr.b);
    var desc = describe(tr);
    s.tradeLog.unshift({ season: s.season, d: s.dayLabel, txt: desc });
    L.news('TRADE: ' + desc, (tr.a === s.user || tr.b === s.user) ? 'you' : 'trade');
    Off.cpuFillRosters();
  }
  function describe(tr) {
    function side(pl, pks) { return pl.map(function (id) { return L.player(id).n; }).concat(pks.map(function (id) { return L.pickLabel(pk(id)); })).join(', ') || 'nothing'; }
    return L.shortName(tr.a) + ' get ' + side(tr.bp, tr.bpk) + '. ' + L.shortName(tr.b) + ' get ' + side(tr.ap, tr.apk) + '.';
  }

  // CPU team "b" builds a package to send for what "a" is giving
  function buildOffer(a, b, ap, apk) {
    var tr = { a: a, b: b, ap: ap.slice(), bp: [], apk: apk.slice(), bpk: [] };
    var target = evaluate(tr).vin;
    if (target <= 2) return null;
    var t = L.team(b), ros = L.roster(b).sort(function (x, y) { return y.ovr - x.ovr; });
    var core = t.strat === 'contend' ? ros.slice(0, 2).map(function (p) { return p.id; }) : ros.filter(function (p) { return p.age <= 23 && p.pot >= 85; }).map(function (p) { return p.id; });
    var assets = ros.filter(function (p) { return core.indexOf(p.id) < 0; }).map(function (p) { return { k: 'p', id: p.id, v: L.playerValue(p, b), sal: p.sal[0] || 0 }; })
      .concat(L.picksOf(b).map(function (p) { return { k: 'k', id: p.id, v: L.pickValue(p, b), sal: 0 }; }));
    // salary first: add players until salaries roughly match, then sweeten with picks/value
    var inSal = salOf(ap), gotSal = 0, got = 0;
    assets.sort(function (x, y) { return y.sal - x.sal; });
    var payB = L.payroll(b), cap = L.capFor().cap;
    var needSal = payB + inSal > cap ? Math.max(0, (inSal - 0.25) / 1.25) : 0;
    var cap0 = (target - 1.5) / 1.07;
    var c2 = L.capFor(), payA = L.payroll(a);
    var aLimit = Math.max(inSal * 1.25 + 0.25, c2.cap - payA + inSal);
    if (payA > c2.ap2) aLimit = Math.max(inSal, c2.cap - payA + inSal);
    for (var i = 0; i < assets.length && gotSal < needSal; i++) {
      var x = assets[i]; if (x.k !== 'p' || x.v > cap0 || gotSal + x.sal > aLimit) continue;
      tr.bp.push(x.id); gotSal += x.sal; got += x.v; x.used = 1;
    }
    var cap2 = (target - 1.5) / 1.07;
    var rest = assets.filter(function (x) { return !x.used && x.v > 0; }).sort(function (x, y) { return y.v - x.v; });
    for (i = 0; i < rest.length && got < cap2 * 0.8; i++) {
      x = rest[i]; if (got + x.v > cap2) continue;
      if (x.k === 'p' && gotSal + x.sal > aLimit) continue;
      if (x.k === 'p') gotSal += x.sal;
      if (x.k === 'p') tr.bp.push(x.id); else tr.bpk.push(x.id);
      got += x.v;
    }
    if (!tr.bp.length && !tr.bpk.length) return null;
    if (validate(tr).length || !evaluate(tr).ok) return null;
    return tr;
  }
  function offersFor(ap, apk) {
    var s = S(), out = [];
    L.teamIds().forEach(function (b) {
      if (b === s.user) return;
      var tr = buildOffer(s.user, b, ap, apk);
      if (tr) {
        tr.myV = U.sum(tr.bp.map(L.player), function (p) { return L.playerValue(p, s.user); }) + U.sum(tr.bpk.map(pk), function (p) { return L.pickValue(p, s.user); });
        out.push(tr);
      }
    });
    return out.sort(function (x, y) { return y.myV - x.myV; }).slice(0, 6);
  }
  // CPU asks for more from the user until it works
  function whatTheyWant(tr) {
    var s = S(), g = 0, a = tr.a;
    while (!evaluate(tr).ok && g++ < 6) {
      var ev = evaluate(tr), gap = ev.vout - ev.vin + 1 + Math.abs(ev.vout) * 0.05 + 1;
      var cands = L.roster(a).filter(function (p) { return tr.ap.indexOf(p.id) < 0; }).map(function (p) { return { k: 'p', id: p.id, v: L.playerValue(p, tr.b) }; })
        .concat(L.picksOf(a).filter(function (p) { return tr.apk.indexOf(p.id) < 0; }).map(function (p) { return { k: 'k', id: p.id, v: L.pickValue(p, tr.b) }; }))
        .filter(function (x) { return x.v > 0.5; }).sort(function (x, y) { return x.v - y.v; });
      if (!cands.length) return false;
      var pickOne = cands.filter(function (x) { return x.v >= gap; })[0] || cands[cands.length - 1];
      var test = JSON.parse(JSON.stringify(tr));
      if (pickOne.k === 'p') test.ap.push(pickOne.id); else test.apk.push(pickOne.id);
      if (validate(test).some(function (e) { return /over the cap|players \(max/.test(e); })) {
        // try a pick instead (no salary)
        var pks = cands.filter(function (x) { return x.k === 'k'; });
        if (!pks.length) return false;
        pickOne = pks.filter(function (x) { return x.v >= gap; })[0] || pks[pks.length - 1];
        test = JSON.parse(JSON.stringify(tr)); test.apk.push(pickOne.id);
      }
      tr.ap = test.ap; tr.apk = test.apk;
    }
    return evaluate(tr).ok;
  }

  function cpuWeekly() {
    var s = S();
    if (!Sim.tradeOpen()) return;
    for (var k = 0; k < 3; k++) if (U.rnd() < 0.5) cpuTry();
  }
  function cpuTry() {
    var s = S();
    var ids = L.teamIds().filter(function (id) { return id !== s.user; });
    var sellers = ids.filter(function (id) { return L.team(id).strat === 'rebuild'; });
    var buyers = ids.filter(function (id) { return L.team(id).strat === 'contend'; });
    if (!sellers.length || !buyers.length) return;
    var sel = U.pick(sellers), vets = L.roster(sel).filter(function (p) { return p.age >= 27 && p.ovr >= 76 && p.sal.length; });
    if (!vets.length) return;
    var v = U.pick(vets);
    var tries = U.shuffle(buyers.slice()).slice(0, 5);
    for (var i = 0; i < tries.length; i++) {
      var tr = buildOffer(sel, tries[i], [v.id], []);
      if (!tr) continue;
      // seller must like it from its own side too
      var rev = { a: tr.b, b: tr.a, ap: tr.bp, bp: tr.ap, apk: tr.bpk, bpk: tr.apk };
      if (evaluate(rev).pct >= 65) { execute(tr); return; }
    }
  }
  // CPU teams call you sometimes
  function incomingOffer() {
    var s = S(); if (!Sim.tradeOpen()) return null;
    var mine = L.roster(s.user).filter(function (p) { return p.ovr >= 74; });
    if (!mine.length) return null;
    var p = U.pick(mine), offs = offersFor([p.id], []);
    return offs[0] || null;
  }

  return { validate: validate, evaluate: evaluate, execute: execute, describe: describe, offersFor: offersFor, whatTheyWant: whatTheyWant, cpuWeekly: cpuWeekly, incomingOffer: incomingOffer, pk: pk, salOf: salOf };
})();
