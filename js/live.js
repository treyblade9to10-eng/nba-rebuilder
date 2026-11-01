// live.js - possession-by-possession game engine (used when you PLAY a game)
var Live = (function () {
  var QLEN = 720, OTLEN = 300;
  var OFF = [['auto', 'AUTO'], ['pnr', 'PICK & ROLL'], ['iso', 'STAR ISO'], ['three', 'LET IT FLY'], ['post', 'POST UP'], ['drive', 'DRIVE & KICK'], ['fast', 'PUSH PACE']];
  var DEF = [['man', 'MAN'], ['zone', 'ZONE'], ['press', 'FULL PRESS'], ['double', 'DOUBLE STAR']];

  function P(id) { return L.player(id); }
  function big(p) { return /C/.test(p.pos); }
  function guard(p) { return /G/.test(p.pos) && !/F/.test(p.pos); }
  function rates(p) { return p.r || L.rateFromOvr(p); }
  function shoot(p) {
    if (p.sh && p.sh[1] > 0.8) return { p3: U.clamp(p.sh[0], 0.22, 0.46), a3: p.sh[1], ft: p.sh[2] || 0.75 };
    var f = (p.ovr - 70) / 25, b = big(p), g = guard(p);
    return { p3: b ? 0.28 + f * 0.04 : g ? 0.34 + f * 0.04 : 0.33 + f * 0.04, a3: b ? 1 : g ? 6.5 : 4.5, ft: b ? 0.68 + f * 0.06 : 0.77 + f * 0.06 };
  }
  function blank() { return { sec: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 }; }
  function wpick(arr, w) {
    var tot = 0, i; for (i = 0; i < arr.length; i++) tot += Math.max(0.0001, w(arr[i]));
    var r = U.rnd() * tot; for (i = 0; i < arr.length; i++) { r -= Math.max(0.0001, w(arr[i])); if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  function create(h, a, opt) {
    var s = G.S, st = { h: h, a: a, kind: opt.kind, si: opt.si, q: 1, clock: QLEN, sc: { h: 0, a: 0 }, poss: U.rnd() < 0.5 ? 'h' : 'a', tipWon: null, on: {}, en: {}, box: {}, tf: { h: 0, a: 0 }, to: { h: 7, a: 7 }, log: [], shots: [], qs: { h: [], a: [] }, ot: 0, done: false, pend: null, user: h === s.user ? 'h' : a === s.user ? 'a' : null, call: { off: 'auto', def: 'man' }, meter: true, autoSub: true, last: '' };
    st.tipWon = st.poss;
    ['h', 'a'].forEach(function (k) {
      var rot = L.rotation(st[k]);
      st.on[k] = rot.slice(0, 5).map(function (x) { return x.p.id; });
      roster(st, k).forEach(function (p) { st.box[p.id] = blank(); st.en[p.id] = 100; });
    });
    st.qs.h = [0]; st.qs.a = [0];
    log(st, null, 'Tip-off. ' + L.shortName(st[st.poss]) + ' win the jump ball.');
    return st;
  }
  function roster(st, k) { var tid = st[k]; return L.roster(tid).filter(function (p) { return !(p.inj > 0); }); }
  function other(k) { return k === 'h' ? 'a' : 'h'; }
  function clockStr(c) { var m = Math.floor(c / 60), x = Math.floor(c % 60); return m + ':' + (x < 10 ? '0' : '') + x; }
  function log(st, k, txt, pts) {
    txt = txt.replace(/\.\.$/, '.').replace(/\.\. /g, '. ').replace(/\.\)/g, ')');
    st.log.unshift({ q: st.q, c: clockStr(st.clock), k: k, t: txt, p: pts || 0, sh: st.sc.h, sa: st.sc.a });
    if (st.log.length > 400) st.log.length = 400;
    st.last = txt;
  }
  function onCourt(st, k) { return st.on[k].map(P).filter(Boolean); }
  function avgOvr(list) { return U.sum(list, function (p) { return p.ovr; }) / Math.max(1, list.length); }
  function sn(p) { var w = p.n.split(' '); return w.length > 1 ? w.slice(1).join(' ') : p.n; }

  // ---- substitutions ----
  function autoSubs(st, k) {
    var avail = roster(st, k).filter(function (p) { return (st.box[p.id] || {}).pf < 6; });
    var tid = st[k], order = L.team(tid).order || [];
    var depth = avail.sort(function (x, y) {
      var ox = order.indexOf(x.id), oy = order.indexOf(y.id);
      return (ox < 0 ? 99 : ox) - (oy < 0 ? 99 : oy) || y.ovr - x.ovr;
    }).slice(0, 10);
    function val(p) { var e = st.en[p.id]; return p.ovr * (e >= 75 ? 1 : e >= 60 ? 0.9 : 0.72) - (depth.indexOf(p) >= 5 ? 1.5 : 0); }
    var want = depth.slice().sort(function (x, y) { return val(y) - val(x); }).slice(0, 5).map(function (p) { return p.id; });
    var cur = st.on[k], tired = cur.some(function (id) { return st.en[id] < 68 || (st.box[id] || {}).pf >= 6 || !P(id) || P(id).inj > 0; });
    var late = st.q >= 4 && st.clock < 300;
    if (late) want = depth.slice().sort(function (x, y) { return y.ovr * (st.en[y.id] > 45 ? 1 : 0.8) - x.ovr * (st.en[x.id] > 45 ? 1 : 0.8); }).slice(0, 5).map(function (p) { return p.id; });
    if (tired || (late && want.join() !== cur.slice().sort().join() && U.rnd() < 0.5)) {
      var changed = want.filter(function (id) { return cur.indexOf(id) < 0; });
      if (changed.length && want.length === 5) st.on[k] = want;
    }
  }
  function sub(st, k, outId, inId) {
    var i = st.on[k].indexOf(outId); if (i < 0 || st.on[k].indexOf(inId) >= 0) return;
    if ((st.box[inId] || {}).pf >= 6) return;
    st.on[k][i] = inId;
    log(st, k, P(inId).n + ' checks in for ' + P(outId).n + '.');
  }

  // ---- one possession ----
  // phase 1: decide what happens. returns pend (a shot about to go up) or null if possession ended
  function setup(st) {
    if (st.done) return null;
    var o = st.poss, d = other(o), s = G.S;
    if (st.autoSub || st.user !== o) autoSubs(st, o);
    if (st.autoSub || st.user !== d) autoSubs(st, d);
    var offC = st.user === o ? st.call.off : cpuOff(st, o), defC = st.user === d ? st.call.def : cpuDef(st, d);
    st.rep = st.rep || { h: 0, a: 0 }; st.lc = st.lc || {};
    if (offC !== 'auto' && st.lc[o] === offC) st.rep[o]++; else st.rep[o] = 0;
    st.lc[o] = offC;
    if (st.rep[o] === 6 && st.user === o) log(st, d, 'The defense is sitting on that play. Mix it up.');
    var dur = offC === 'fast' ? U.ri(5, 11) : U.ri(9, 21);
    if (defC === 'press') dur += 2;
    if (st.clock <= 24 && st.clock > 2) dur = Math.max(1, st.clock - U.ri(0, 2));
    if (st.clock <= 2) { tick(st, st.clock); endPeriod(st); return null; }
    dur = Math.min(dur, st.clock);
    tick(st, dur);
    var off = onCourt(st, o), def = onCourt(st, d);
    var oR = avgOvr(off), dR = avgOvr(def);
    // turnover
    var tov = 0.125 + (defC === 'press' ? 0.045 : 0) + (offC === 'fast' ? 0.02 : 0) + (dR - oR) * 0.003 - (offC === 'pnr' ? 0.01 : 0);
    if (U.rnd() < tov) {
      var lost = wpick(off, function (p) { return rates(p)[2] + rates(p)[0] * 0.2; });
      st.box[lost.id].tov++;
      if (U.rnd() < 0.55) { var th = wpick(def, function (p) { return rates(p)[3] + 0.3; }); st.box[th.id].stl++; log(st, d, sn(th) + ' steals it from ' + sn(lost) + '.'); }
      else log(st, o, 'Turnover by ' + sn(lost) + '.');
      flip(st); return null;
    }
    // reach-in foul
    if (U.rnd() < 0.055 + (defC === 'press' ? 0.03 : 0)) {
      var fd = wpick(def, function () { return 1; }); foul(st, d, fd);
      if (st.tf[d] >= 5) {
        var fs = wpick(off, function (p) { return rates(p)[0]; });
        log(st, d, 'Foul on ' + sn(fd) + '. In the bonus.'); fts(st, o, fs, 2); flip(st); return null;
      }
    }
    return pickShot(st, o, d, offC, defC, off, def);
  }
  function pickShot(st, o, d, offC, defC, off, def, putback) {
    var star = off.slice().sort(function (x, y) { return y.ovr - x.ovr; })[0];
    var shooter, type = null, ast = null, desc = '';
    var usage = function (p) { return Math.pow(rates(p)[0], 1.1) * (st.en[p.id] > 60 ? 1 : 0.85); };
    if (putback) { shooter = putback; type = 'rim'; desc = 'putback'; }
    else if (offC === 'iso' && U.rnd() < 0.6) { shooter = star; desc = 'iso'; }
    else if (offC === 'pnr') {
      var bhs = off.slice().sort(function (x, y) { return rates(y)[2] - rates(x)[2]; }).slice(0, 2);
      var bh = U.rnd() < 0.65 ? bhs[0] : bhs[1] || bhs[0];
      var rolls = off.filter(function (p) { return p !== bh; }).sort(function (x, y) { return rates(y)[1] - rates(x)[1]; }).slice(0, 2);
      var roller = U.rnd() < 0.65 ? rolls[0] : rolls[1] || rolls[0];
      var r0 = U.rnd();
      if (r0 < 0.4) { shooter = bh; desc = 'off the pick'; } else if (r0 < 0.72) { shooter = roller; type = U.rnd() < 0.8 ? 'rim' : 'mid'; ast = bh; desc = 'on the roll'; }
      else { shooter = wpick(off.filter(function (p) { return p !== bh && p !== roller; }), function (p) { return shoot(p).a3 + 0.6; }); type = U.rnd() < 0.7 ? 'three' : null; ast = bh; desc = 'after the pick and roll'; }
    } else if (offC === 'three') { shooter = wpick(off, function (p) { var s = shoot(p); return s.a3 * s.p3 * s.p3 + 0.05; }); type = U.rnd() < 0.85 ? 'three' : null; desc = 'spot-up'; }
    else if (offC === 'post') { var posts = off.slice().sort(function (x, y) { return (big(y) ? 5 : 0) + rates(y)[1] - (big(x) ? 5 : 0) - rates(x)[1]; }); shooter = U.rnd() < 0.3 ? wpick(off, usage) : U.rnd() < 0.65 ? posts[0] : posts[1] || posts[0]; type = U.rnd() < 0.6 ? 'rim' : 'mid'; desc = 'in the post'; }
    else if (offC === 'drive') { var dv = wpick(off, usage); if (U.rnd() < 0.4) { shooter = wpick(off.filter(function (p) { return p !== dv; }), function (p) { return shoot(p).a3 + 0.5; }); type = 'three'; ast = dv; desc = 'kick-out'; } else { shooter = dv; type = 'rim'; desc = 'drive'; } }
    else if (offC === 'fast') { shooter = wpick(off, usage); type = U.rnd() < 0.5 ? 'rim' : U.rnd() < 0.7 ? 'three' : 'mid'; desc = 'in transition'; }
    else shooter = wpick(off, usage);
    if (defC === 'double' && shooter === star && !putback && U.rnd() < 0.45) {
      // star gets doubled, finds the open man
      ast = star; shooter = wpick(off.filter(function (p) { return p !== star; }), function (p) { return shoot(p).a3 + 1; }); type = 'three'; desc = 'open after the double';
    }
    if (!type) {
      var sp = shoot(shooter), p3 = U.clamp(sp.a3 * 1.3 / (rates(shooter)[0] * 0.82 + 1), 0.02, 0.75);
      if (defC === 'zone') p3 = Math.min(0.8, p3 + 0.08);
      var r = U.rnd();
      type = r < p3 ? 'three' : r < p3 + (1 - p3) * (big(shooter) ? 0.68 : 0.5) ? 'rim' : 'mid';
    }
    return { o: o, d: d, sid: shooter.id, type: type, ast: ast ? ast.id : null, desc: desc, offC: offC, defC: defC, put: !!putback, star: star.id };
  }
  function resolve(st, pend, bonus) {
    if (!pend || st.done) return;
    var o = pend.o, d = pend.d, sh = P(pend.sid), off = onCourt(st, o), def = onCourt(st, d);
    var dR = avgOvr(def), sp = shoot(sh), e = st.en[sh.id];
    var pr = pend.type === 'three' ? sp.p3 + 0.01 : pend.type === 'rim' ? 0.63 + (sh.ovr - 75) * 0.006 + (big(sh) ? 0.04 : 0) : 0.43 + (sh.ovr - 75) * 0.005;
    if (pend.type === 'three') pr += (sh.ovr - 75) * 0.0015;
    pr -= (dR - 75) * 0.004;
    pr += (avgOvr(off) - dR) * 0.004 + 0.015;
    if (pend.defC === 'zone') pr += pend.type === 'three' ? 0.02 : pend.type === 'rim' ? -0.05 : 0;
    if (pend.defC === 'press') pr += 0.015;
    if (pend.defC === 'double' && sh.id === pend.star) pr -= 0.08;
    if (pend.desc === 'open after the double' || pend.desc === 'kick-out') pr += 0.035;
    if (pend.desc === 'in transition') pr += 0.04;
    if (pend.put) pr += 0.05;
    if (e < 70) pr -= (70 - e) * 0.003;
    if (bonus) pr += bonus;
    var rp = (st.rep || {})[o] || 0;
    if (pend.offC !== 'auto') pr += rp <= 4 ? 0.03 : -Math.min(0.1, (rp - 4) * 0.015);
    pr -= Math.max(0, st.box[sh.id].fga - 20) * 0.008;
    pr = U.clamp(pr, 0.12, 0.88);
    var three = pend.type === 'three', b = st.box[sh.id];
    var foulCh = pend.type === 'rim' ? 0.24 : pend.type === 'mid' ? 0.07 : 0.025;
    var fouled = U.rnd() < foulCh, made = U.rnd() < (fouled ? pr * 0.55 : pr);
    var where = shotSpot(pend.type), lbl = three ? '3-pointer' : pend.type === 'rim' ? (big(sh) && U.rnd() < 0.4 ? 'dunk' : 'layup') : 'jumper';
    st.shots.push({ x: where[0], y: where[1], m: made ? 1 : 0, k: o, q: st.q });
    b.fga++; if (three) b.tpa++;
    if (made) {
      var pts = three ? 3 : 2;
      b.fgm++; if (three) b.tpm++; b.pts += pts; st.sc[o] += pts; st.qs[o][st.q - 1] += pts;
      var astP = null;
      if (pend.ast) astP = P(pend.ast);
      else if (U.rnd() < (three ? 0.8 : pend.type === 'mid' ? 0.55 : 0.5) && !pend.put) astP = wpick(off.filter(function (p) { return p !== sh; }), function (p) { return rates(p)[2]; });
      if (astP && astP !== sh) st.box[astP.id].ast++;
      log(st, o, sn(sh) + ' hits the ' + lbl + (pend.desc ? ' ' + pend.desc : '') + (astP && astP !== sh ? ' (' + sn(astP) + ' assist)' : '') + '.', pts);
      if (fouled) { var fd = wpick(def, function () { return 1; }); foul(st, d, fd); log(st, o, 'AND ONE! Foul on ' + sn(fd) + '.'); fts(st, o, sh, 1); }
      flip(st); return;
    }
    if (fouled) {
      var fd2 = wpick(def, function (p) { return big(p) ? 2 : 1; }); foul(st, d, fd2);
      log(st, o, sn(sh) + ' is fouled by ' + sn(fd2) + ' on the ' + lbl + '.');
      fts(st, o, sh, three ? 3 : 2); flip(st); return;
    }
    // miss
    if (pend.type === 'rim' && U.rnd() < 0.17) { var bl = wpick(def, function (p) { return rates(p)[4] + 0.2; }); st.box[bl.id].blk++; log(st, d, sn(bl) + ' BLOCKS ' + sn(sh) + '!'); }
    else log(st, o, sn(sh) + ' misses the ' + lbl + '.');
    rebound(st, o, d, off, def, pend);
  }
  function rebound(st, o, d, off, def, pend) {
    var orb = 0.23 + (pend.defC === 'zone' ? 0.03 : 0) + (avgOvr(off) - avgOvr(def)) * 0.004;
    if (U.rnd() < orb) {
      var r = wpick(off, function (p) { return rates(p)[1] * (big(p) ? 1.6 : 1); });
      st.box[r.id].orb++; log(st, o, 'Offensive board ' + sn(r) + '.');
      var t = Math.min(st.clock, U.ri(2, 6)); tick(st, t);
      if (st.clock <= 0) { endPeriod(st); return; }
      if (U.rnd() < 0.45) { var pb = pickShot(st, o, d, pend.offC, pend.defC, off, def, r); resolve(st, pb, 0); return; }
      st.pend = null; return; // keeps the ball, new possession for same team
    }
    var dr = wpick(def, function (p) { return rates(p)[1] * (big(p) ? 1.4 : 1); });
    st.box[dr.id].drb++;
    flip(st);
  }
  function fts(st, k, p, n) {
    var sp = shoot(p), made = 0;
    for (var i = 0; i < n; i++) { st.box[p.id].fta++; if (U.rnd() < sp.ft) { made++; st.box[p.id].ftm++; st.box[p.id].pts++; st.sc[k]++; st.qs[k][st.q - 1]++; } }
    log(st, k, sn(p) + ' makes ' + made + ' of ' + n + ' free throws.', made);
  }
  function foul(st, k, p) {
    st.box[p.id].pf++; st.tf[k]++;
    if (st.box[p.id].pf >= 6) { log(st, k, p.n + ' has fouled out!'); var bench = roster(st, k).filter(function (x) { return st.on[k].indexOf(x.id) < 0 && st.box[x.id].pf < 6; }).sort(function (x, y) { return y.ovr - x.ovr; }); if (bench[0]) st.on[k][st.on[k].indexOf(p.id)] = bench[0].id; }
  }
  function tick(st, sec) {
    st.clock = Math.max(0, st.clock - sec);
    ['h', 'a'].forEach(function (k) {
      roster(st, k).forEach(function (p) {
        var on = st.on[k].indexOf(p.id) >= 0;
        if (on) { st.box[p.id].sec += sec; st.en[p.id] = Math.max(20, st.en[p.id] - sec * 0.055); }
        else st.en[p.id] = Math.min(100, st.en[p.id] + sec * 0.075);
      });
    });
  }
  function flip(st) {
    st.pend = null;
    st.poss = other(st.poss);
    if (st.clock <= 0) endPeriod(st);
  }
  function endPeriod(st) {
    if (st.done) return;
    var nm = st.q <= 4 ? 'End of Q' + st.q : 'End of OT' + (st.q - 4);
    if (st.q >= 4 && st.sc.h !== st.sc.a) { st.done = true; log(st, null, 'FINAL: ' + L.shortName(st.h) + ' ' + st.sc.h + ', ' + L.shortName(st.a) + ' ' + st.sc.a + (st.q > 4 ? ' (' + (st.q === 5 ? '' : st.q - 4) + 'OT)' : '') + '.'); return; }
    log(st, null, nm + '. ' + L.shortName(st.h) + ' ' + st.sc.h + ', ' + L.shortName(st.a) + ' ' + st.sc.a + '.');
    st.q++; st.tf = { h: 0, a: 0 }; st.qs.h.push(0); st.qs.a.push(0);
    if (st.q > 4) { st.ot++; st.clock = OTLEN; log(st, null, 'Tied up. We are going to overtime!'); }
    else st.clock = QLEN;
    if (st.q === 3) { for (var id in st.en) st.en[id] = Math.min(100, st.en[id] + 30); }
    st.poss = (st.q % 2 === 0) ? other(st.tipWon) : st.tipWon;
    if (st.q === 2 || st.q === 4) st.to.h = Math.min(st.to.h, st.q === 4 ? 4 : 7), st.to.a = Math.min(st.to.a, st.q === 4 ? 4 : 7);
  }
  function cpuOff(st, k) {
    var r = U.rnd(), lead = st.sc[k] - st.sc[other(k)];
    if (st.q >= 4 && st.clock < 90 && lead < 0 && lead >= -6) return r < 0.5 ? 'three' : 'iso';
    if (st.q >= 4 && st.clock < 120 && lead > 0) return 'iso';
    return r < 0.55 ? 'auto' : r < 0.7 ? 'pnr' : r < 0.78 ? 'drive' : r < 0.85 ? 'post' : r < 0.92 ? 'iso' : r < 0.97 ? 'three' : 'fast';
  }
  function cpuDef(st, k) {
    var lead = st.sc[k] - st.sc[other(k)];
    if (st.q >= 4 && st.clock < 150 && lead < -4) return 'press';
    var r = U.rnd(); return r < 0.8 ? 'man' : r < 0.93 ? 'zone' : 'double';
  }
  function shotSpot(type) {
    var a = Math.PI * (0.05 + U.rnd() * 0.9), r;
    if (type === 'rim') r = 1 + U.rnd() * 5; else if (type === 'mid') r = 9 + U.rnd() * 11; else r = 23.8 + U.rnd() * 3;
    var x = 25 + Math.cos(a) * r, y = 5.25 + Math.sin(a) * r;
    if (type === 'three' && U.rnd() < 0.25) { x = U.rnd() < 0.5 ? 2 + U.rnd() : 47 + U.rnd(); y = 2 + U.rnd() * 9; }
    return [Math.round(x * 10) / 10, Math.round(Math.min(46, y) * 10) / 10];
  }

  // run one full possession (auto, no meter)
  function step(st) {
    if (st.done) return;
    var p = setup(st);
    if (p) resolve(st, p, 0);
  }
  function runSeconds(st, sec) {
    var end = gameSec(st) + sec, g = 0;
    while (!st.done && gameSec(st) < end && g++ < 400) step(st);
  }
  function gameSec(st) { return st.q <= 4 ? (st.q - 1) * QLEN + (QLEN - st.clock) : 4 * QLEN + (st.q - 5) * OTLEN + (OTLEN - st.clock); }
  function toEndOfQuarter(st) { var q = st.q, g = 0; while (!st.done && st.q === q && g++ < 300) step(st); }
  function toClutch(st) { var g = 0; while (!st.done && !(st.q >= 4 && st.clock <= 300) && g++ < 600) step(st); }
  function simAll(st) { var g = 0; while (!st.done && g++ < 2000) step(st); }
  function timeout(st, k) {
    if (st.to[k] <= 0) return false;
    st.to[k]--; st.on[k].forEach(function (id) { st.en[id] = Math.min(100, st.en[id] + 12); });
    log(st, k, L.shortName(st[k]) + ' call timeout.'); return true;
  }
  // box lines in season format
  function lines(st, k) {
    return roster(st, k).concat(L.roster(st[k]).filter(function (p) { return p.inj > 0 && st.box[p.id]; })).filter(function (p) { return st.box[p.id] && st.box[p.id].sec > 0; }).map(function (p) {
      var b = st.box[p.id];
      return { id: p.id, n: p.n, min: Math.round(b.sec / 60), pts: b.pts, reb: b.orb + b.drb, ast: b.ast, stl: b.stl, blk: b.blk, fgm: b.fgm, fga: b.fga, tpm: b.tpm, tpa: b.tpa, ftm: b.ftm, fta: b.fta, tov: b.tov, pf: b.pf };
    }).sort(function (x, y) { return y.min - x.min; });
  }
  return { create: create, setup: setup, resolve: resolve, step: step, runSeconds: runSeconds, toEndOfQuarter: toEndOfQuarter, toClutch: toClutch, simAll: simAll, timeout: timeout, sub: sub, lines: lines, roster: roster, clockStr: clockStr, shoot: shoot, OFF: OFF, DEF: DEF, QLEN: QLEN };
})();
