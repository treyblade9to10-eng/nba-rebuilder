// util.js - helpers shared by everything
var U = (function () {
  var seed = (Date.now() % 2147483647) || 1;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function money(m) {
    if (m == null) return '-';
    var neg = m < 0; m = Math.abs(m);
    var s = m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2);
    return (neg ? '-' : '') + '$' + s + 'M';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sum(a, f) { var t = 0; for (var i = 0; i < a.length; i++) t += f ? f(a[i]) : a[i]; return t; }
  function seasonLabel(y) { return (y - 1) + '-' + String(y).slice(2); }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  // name pools for generated draft prospects / free agents (made-up people)
  var FIRST = ['Jalen', 'Marcus', 'Tyrese', 'Darius', 'Andre', 'Kobe', 'Malik', 'Isaiah', 'Jordan', 'Cameron', 'Elijah', 'Xavier', 'Devin', 'Trevon', 'Javon', 'Caleb', 'Mason', 'Bryce', 'Keegan', 'Dillon', 'Aiden', 'Luca', 'Mateo', 'Nikola', 'Tomas', 'Aleksej', 'Yuki', 'Kenji', 'Omari', 'Kwame', 'Amari', 'Deshawn', 'Terrence', 'Quentin', 'Rashad', 'Zion', 'Jabari', 'Kendall', 'Brandon', 'Tyler', 'Ethan', 'Noah', 'Liam', 'Owen', 'Gavin', 'Jace', 'Micah', 'Ezra', 'Silas', 'Rowan', 'Dante', 'Rico', 'Santi', 'Pau', 'Hugo', 'Sekou', 'Moussa', 'Ibou', 'Tari', 'Kofi', 'Jovan', 'Stefan', 'Bogdan', 'Ilias', 'Theo', 'Max', 'Cole', 'Reed', 'Brooks', 'Chase', 'Trey', 'Deon', 'Khalil', 'Jamir', 'Kyree', 'Nasir', 'Jaylin', 'Ty', 'Cade', 'Ace', 'Royce', 'Corey', 'Darnell', 'Emeka', 'Chidi', 'Ousmane', 'Victor', 'Alexandre', 'Matas', 'Rokas'];
  var LAST = ['Carter', 'Walker', 'Hayes', 'Brooks', 'Mitchell', 'Coleman', 'Freeman', 'Barnes', 'Sanders', 'Price', 'Bennett', 'Wood', 'Ross', 'Henderson', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Fisher', 'Hamilton', 'Graham', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Okafor', 'Diallo', 'Traore', 'Ndiaye', 'Petrovic', 'Jovic', 'Markovic', 'Sabonis', 'Kuzma', 'Larsen', 'Nakamura', 'Silva', 'Costa', 'Moreau', 'Dubois', 'Keller', 'Novak', 'Horvat', 'Adeyemi', 'Mensah', 'Boateng', 'Okeke', 'Achebe', 'Bamba', 'Kone', 'Sow', 'Fall', 'Gueye'];
  function makeName(used) {
    for (var i = 0; i < 60; i++) {
      var n = pick(FIRST) + ' ' + pick(LAST);
      if (!used || !used[n]) { if (used) used[n] = 1; return n; }
    }
    return pick(FIRST) + ' ' + pick(LAST) + ' ' + ri(2, 9);
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  return { rnd: rnd, ri: ri, pick: pick, shuffle: shuffle, gauss: gauss, clamp: clamp, money: money, esc: esc, sum: sum, seasonLabel: seasonLabel, ord: ord, makeName: makeName, $: $, toast: toast };
})();
