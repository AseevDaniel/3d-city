// ── Portfolio City: floating name tags over clickable buildings ──────────────
// (the visitor cue the user picked; always on)
import * as THREE from 'three';

function labelTex(text, { bg = '#ffffff', fg = '#23262b', border = null, ratio = 5 } = {}) {
  const h = 192, w = h * ratio;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(6, 6, w - 12, h - 12, 28); ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 10; ctx.stroke(); }
  ctx.fillStyle = fg;
  let fs = Math.round(h * 0.42);
  ctx.font = `800 ${fs}px Rubik, sans-serif`;
  while (ctx.measureText(text).width > w * 0.86 && fs > 20) {
    fs -= 4; ctx.font = `800 ${fs}px Rubik, sans-serif`;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildGuides(scene, city) {
  const D = window.CITY_DATA;
  const CATS = {
    about: 'section', skills: 'section', contacts: 'section',
    flylink: 'project', academy: 'project', genai: 'project',
    panda: 'project', medbook: 'project', ruddy: 'project',
    arcade: 'fun', cinema: 'fun', cafe: 'fun', construction: 'fun',
  };
  const COLOR = (id) => {
    if (D.sections[id]) return D.sections[id].color;
    const p = D.projects.find(p => p.id === id);
    if (p) return p.color;
    if (D.fun[id]) return D.fun[id].color;
    return '#e8442e';
  };

  const g = new THREE.Group();
  scene.add(g);
  for (const id of Object.keys(CATS)) {
    const root = city.byId[id];
    if (!root) continue;
    const bb = new THREE.Box3().setFromObject(root);
    const center = bb.getCenter(new THREE.Vector3());
    const text = CATS[id] === 'project' ? `${root.userData.label} · PROJECT` : root.userData.label;
    const tex = labelTex(text, { border: COLOR(id) });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
    const w = Math.min(3 + text.length * 0.32, 9.5);
    sp.scale.set(w, w / 5, 1);
    sp.position.set(center.x, bb.max.y + 1.9, center.z);
    g.add(sp);
  }

  return { update() {}, setMode() {}, MODES: [] };
}
