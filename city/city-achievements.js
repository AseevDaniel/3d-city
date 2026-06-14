// ── Portfolio City: achievements (tracked in localStorage) ───────────────────
(function () {
  const VISIT_IDS = ['about', 'skills', 'contacts', 'flylink', 'academy', 'genai', 'panda', 'medbook', 'ruddy'];
  const FX_KINDS = ['carHop', 'carGrab', 'tree', 'fountain', 'balloon', 'rain', 'fireworks', 'crane'];

  let st = { visited: {}, fx: {} };
  try {
    const saved = JSON.parse(localStorage.getItem('city_achievements') || 'null');
    if (saved) st = { visited: saved.visited || {}, fx: saved.fx || {} };
  } catch (e) {}
  let liveScore = 0;

  function save() {
    try { localStorage.setItem('city_achievements', JSON.stringify(st)); } catch (e) {}
  }
  function bestScore() {
    let b = 0;
    try { b = +(localStorage.getItem('city_arcade_best') || 0); } catch (e) {}
    return Math.max(b, liveScore);
  }

  const DEFS = [
    { id: 'testdrive', name: 'Test Drive', desc: 'Tap a car to make it hop', prog: () => [st.fx.carHop ? 1 : 0, 1] },
    { id: 'airmail', name: 'Air Mail', desc: 'Pick up a car and throw it', prog: () => [st.fx.carGrab ? 1 : 0, 1] },
    { id: 'rainmaker', name: 'Rainmaker', desc: 'Click a cloud to make it rain', prog: () => [st.fx.rain ? 1 : 0, 1] },
    { id: 'pyro', name: 'Pyrotechnician', desc: 'Launch fireworks in the park', prog: () => [st.fx.fireworks ? 1 : 0, 1] },
    { id: 'foreman', name: 'Site Foreman', desc: 'Operate the construction crane', prog: () => [st.fx.crane ? 1 : 0, 1] },
    {
      id: 'ranger', name: 'Park Ranger', desc: 'Bounce a tree, splash the fountain, boost the balloon',
      prog: () => [['tree', 'fountain', 'balloon'].filter(k => st.fx[k]).length, 3],
    },
    {
      id: 'explorer', name: 'City Explorer', desc: 'Visit About, Skills, Contacts and all 6 projects',
      prog: () => [VISIT_IDS.filter(k => st.visited[k]).length, 9],
    },
    { id: 'bughunter', name: 'Bug Hunter', desc: 'Score 20 points in the Bug Arcade', prog: () => [Math.min(bestScore(), 20), 20] },
  ];

  let allCache = false;
  function isAllDone() {
    if (allCache) return true;
    allCache = DEFS.every(d => { const [a, b] = d.prog(); return a >= b; });
    return allCache;
  }

  window.CityAch = {
    DEFS,
    visit(id) { if (VISIT_IDS.includes(id) && !st.visited[id]) { st.visited[id] = true; save(); } },
    report(kind) { if (FX_KINDS.includes(kind) && !st.fx[kind]) { st.fx[kind] = true; save(); } },
    notifyScore(s) {
      liveScore = Math.max(liveScore, s);
      // write-through: a reload mid-game must not lose the caught bugs
      try {
        const b = +(localStorage.getItem('city_arcade_best') || 0);
        if (liveScore > b) localStorage.setItem('city_arcade_best', String(liveScore));
      } catch (e) {}
    },
    progress() { return DEFS.map(d => ({ name: d.name, desc: d.desc, p: d.prog() })); },
    isAllDone,
  };
})();
