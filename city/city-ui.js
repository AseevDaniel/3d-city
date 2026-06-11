// ── Portfolio City: panel UI (plain script) ──────────────────────────────────
(function () {
  const D = window.CITY_DATA;
  const panel = () => document.getElementById('panel');
  let gameTimers = [];

  const ICONS = {
    mail: '<path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2"/>',
    github: '<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.6s.9-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1a3.6 3.6 0 0 1 .1 2.6 3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" fill="currentColor"/>',
    linkedin: '<rect x="3" y="9" width="4" height="12" fill="currentColor"/><circle cx="5" cy="5" r="2" fill="currentColor"/><path d="M10 9h4v2a4.4 4.4 0 0 1 4-2c3 0 4 2 4 5v7h-4v-6c0-1.7-.5-3-2-3s-2.3 1.2-2.3 3v6H10z" fill="currentColor"/>',
    telegram: '<path d="M21 4L2.5 11.3c-.8.3-.8 1.2 0 1.5l4.6 1.5 1.8 5.5c.2.7 1 .8 1.5.3l2.5-2.4 4.8 3.5c.6.4 1.4.1 1.6-.6L22.4 5c.2-.8-.6-1.4-1.4-1z" fill="currentColor"/>',
    phone: '<path d="M5 3h4l1.5 5L8 10a14 14 0 0 0 6 6l2-2.5L21 15v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" fill="currentColor"/>',
    pin: '<path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" width="18" height="18">${ICONS[n] || ''}</svg>`;
  const chips = (arr) => `<div class="chips">${arr.map(s => `<span class="chip">${s}</span>`).join('')}</div>`;

  function header(chip, title, tagline, color) {
    return `
      <div class="panel-head" style="--accent:${color}">
        <div class="panel-head-top">
          <span class="badge">${chip}</span>
          <button class="close-btn" id="panel-close" aria-label="Close">✕</button>
        </div>
        <h2>${title}</h2>
        <p class="tagline">${tagline}</p>
      </div>`;
  }

  function render(id) {
    const S = D.sections, F = D.fun;
    const proj = D.projects.find(p => p.id === id);

    if (proj) {
      return header(proj.company, proj.title, proj.kind, proj.color) + `
        <div class="panel-body">
          <ul class="bullets">${proj.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          <h4>Technologies</h4>
          ${chips(proj.tech)}
        </div>`;
    }

    switch (id) {
      case 'about':
        return header(S.about.chip, S.about.title, S.about.tagline, S.about.color) +
          `<div class="panel-body">${S.about.html}</div>`;

      case 'skills':
        return header(S.skills.chip, S.skills.title, S.skills.tagline, S.skills.color) +
          `<div class="panel-body">` +
          S.skills.groups.map(g => `<h4>${g.name}</h4>${chips(g.items)}`).join('') +
          `</div>`;

      case 'contacts':
        return header(S.contacts.chip, S.contacts.title, S.contacts.tagline, S.contacts.color) + `
          <div class="panel-body">
            <div class="contact-list">
              ${S.contacts.links.map(l => l.href
                ? `<a class="contact-row" href="${l.href}" target="_blank" rel="noopener">
                     <span class="ci">${icon(l.icon)}</span>
                     <span class="cl">${l.label}</span><span class="cv">${l.value}</span><span class="arrow">→</span></a>`
                : `<div class="contact-row static">
                     <span class="ci">${icon(l.icon)}</span>
                     <span class="cl">${l.label}</span><span class="cv">${l.value}</span></div>`).join('')}
            </div>
          </div>`;

      case 'cafe':
        return header(F.cafe.chip, F.cafe.title, F.cafe.tagline, F.cafe.color) + `
          <div class="panel-body">
            <div class="facts">
              ${F.cafe.facts.map(f => `<div class="fact-card"><div class="fk">${f.k}</div><div class="fv">${f.v}</div></div>`).join('')}
            </div>
          </div>`;

      case 'cinema':
        return header(F.cinema.chip, F.cinema.title, F.cinema.tagline, F.cinema.color) + `
          <div class="panel-body">
            <div class="posters">
              ${F.cinema.posters.map(p => `
                <div class="poster">
                  <div class="poster-art">${p.title.split(' ').slice(0, 2).join(' ')}</div>
                  <div class="poster-title">${p.title}</div>
                  <div class="poster-sub">${p.sub}</div>
                  <div class="poster-rating">${p.rating}</div>
                </div>`).join('')}
            </div>
          </div>`;

      case 'construction':
        return header(F.construction.chip, F.construction.title, F.construction.tagline, F.construction.color) +
          `<div class="panel-body">${F.construction.html}</div>`;

      case 'arcade':
        return header(F.arcade.chip, F.arcade.title, F.arcade.tagline, F.arcade.color) + `
          <div class="panel-body">
            <div class="game-hud">
              <div>Score <b id="game-score">0</b></div>
              <div>Time <b id="game-time">20</b>s</div>
              <div>Best <b id="game-best">${localStorage.getItem('city_arcade_best') || 0}</b></div>
            </div>
            <div class="game-field" id="game-field">
              <button class="cta-btn" id="game-start">▶ Start Bug Hunt</button>
            </div>
            <p class="game-note">Bugs escape to production in 1.6 s. Click fast.</p>
          </div>`;
    }
    return '';
  }

  // ── arcade mini-game ──
  function clearGame() {
    gameTimers.forEach(clearInterval);
    gameTimers.forEach(clearTimeout);
    gameTimers = [];
  }
  function initGame() {
    const startBtn = document.getElementById('game-start');
    if (!startBtn) return;
    startBtn.addEventListener('click', () => {
      const field = document.getElementById('game-field');
      const scoreEl = document.getElementById('game-score');
      const timeEl = document.getElementById('game-time');
      const bestEl = document.getElementById('game-best');
      clearGame();
      field.innerHTML = '';
      let score = 0, time = 20;
      scoreEl.textContent = '0';
      timeEl.textContent = '20';

      function spawn() {
        if (time <= 0) return;
        const bug = document.createElement('div');
        bug.className = 'bug';
        bug.style.left = (6 + Math.random() * 82) + '%';
        bug.style.top = (8 + Math.random() * 74) + '%';
        bug.style.setProperty('--r', (Math.random() * 360) + 'deg');
        bug.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          if (bug.classList.contains('dead')) return;
          bug.classList.add('dead');
          score++;
          scoreEl.textContent = score;
          setTimeout(() => bug.remove(), 250);
        });
        field.appendChild(bug);
        gameTimers.push(setTimeout(() => {
          if (!bug.classList.contains('dead')) {
            bug.classList.add('escaped');
            setTimeout(() => bug.remove(), 300);
          }
        }, 1600));
      }

      const spawner = setInterval(() => { spawn(); if (Math.random() > 0.55) spawn(); }, 620);
      const ticker = setInterval(() => {
        time--;
        timeEl.textContent = time;
        if (time <= 0) {
          clearGame();
          const best = Math.max(score, +(localStorage.getItem('city_arcade_best') || 0));
          localStorage.setItem('city_arcade_best', best);
          bestEl.textContent = best;
          field.innerHTML = `<div class="game-over">
              <div class="go-score">${score}</div>
              <div>bugs squashed</div>
              <button class="cta-btn" id="game-start">↻ Play again</button>
            </div>`;
          initGame();
        }
      }, 1000);
      gameTimers.push(spawner, ticker);
    }, { once: true });
  }

  window.CityUI = {
    open(id) {
      clearGame();
      const p = panel();
      p.innerHTML = render(id);
      p.classList.add('open');
      document.getElementById('panel-close').addEventListener('click', () => window.CityApp && window.CityApp.unfocus());
      if (id === 'arcade') initGame();
      // restart progress bar animation
      const bar = p.querySelector('.progress-bar');
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      document.getElementById('navbar').classList.add('shifted');
    },
    close() {
      clearGame();
      panel().classList.remove('open');
      document.getElementById('navbar').classList.remove('shifted');
    },
  };
})();
