// ── Portfolio City: interactions — hover, tooltip, click-to-focus camera ─────
import * as THREE from 'three';

const EASE = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

export function initInteractions({ renderer, camera, controls, city, life, openPanel, closePanel }) {
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-10, -10);
  const tooltip = document.getElementById('tooltip');
  const targets = [...city.clickables, ...life.smallClickables];

  let hovered = null;          // clickable building group
  let hoverLift = new Map();   // group -> current lift
  let focused = null;
  let kbSelected = null;       // keyboard-highlighted building
  let kbIndex = -1;
  let homeView = null;         // {pos, target} before focusing
  let tween = null;            // active camera tween
  let pointerDown = null;
  const tipVec = new THREE.Vector3();

  function rootOf(obj) {
    let o = obj;
    while (o) {
      if (o.userData && (o.userData.clickable || o.userData.fun)) return o;
      o = o.parent;
    }
    return null;
  }

  function pick(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(targets, true);
    return hits.length ? rootOf(hits[0].object) : null;
  }

  renderer.domElement.addEventListener('pointermove', (ev) => {
    const root = pick(ev);
    const isBuilding = root && root.userData.clickable;
    if (hovered !== (isBuilding ? root : null)) hovered = isBuilding ? root : null;
    renderer.domElement.style.cursor = root ? 'pointer' : 'grab';
    if (isBuilding && root !== focused) {
      kbSelected = null; // mouse takes over from keyboard highlight
      tooltip.style.opacity = '1';
      tooltip.style.transform = `translate(${ev.clientX + 16}px, ${ev.clientY + 8}px)`;
      tooltip.querySelector('.tt-title').textContent = root.userData.label;
      tooltip.querySelector('.tt-sub').textContent = root.userData.sublabel || '';
    } else if (!kbSelected) {
      tooltip.style.opacity = '0';
    }
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    hovered = null;
    if (!kbSelected) tooltip.style.opacity = '0';
  });

  renderer.domElement.addEventListener('pointerdown', (ev) => {
    pointerDown = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (!pointerDown) return;
    const dx = ev.clientX - pointerDown.x, dy = ev.clientY - pointerDown.y;
    const isClick = Math.hypot(dx, dy) < 7 && performance.now() - pointerDown.t < 450;
    pointerDown = null;
    if (!isClick) return;
    const root = pick(ev);
    if (!root) return;
    if (root.userData.fun) { life.poke(root); return; }
    if (root.userData.clickable) focus(root);
  });

  // ── keyboard navigation: Tab / arrows cycle buildings, Enter / Space opens ──
  function kbMove(dir) {
    const list = city.clickables;
    if (!list.length) return;
    kbIndex = (kbIndex + dir + list.length) % list.length;
    const g = list[kbIndex];
    if (focused) {
      focus(g); // already inside a building — switch directly
    } else {
      kbSelected = g;
      tooltip.querySelector('.tt-title').textContent = g.userData.label;
      tooltip.querySelector('.tt-sub').textContent = g.userData.sublabel || '';
      tooltip.style.opacity = '1';
    }
  }

  window.addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (k === 'Escape') {
      kbSelected = null;
      tooltip.style.opacity = '0';
      unfocus();
      return;
    }
    if (k === 'Tab' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowUp') {
      ev.preventDefault();
      const dir = (k === 'ArrowLeft' || k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey)) ? -1 : 1;
      kbMove(dir);
      return;
    }
    if ((k === 'Enter' || k === ' ') && kbSelected && !focused) {
      ev.preventDefault();
      const sel = kbSelected;
      kbSelected = null;
      tooltip.style.opacity = '0';
      focus(sel);
    }
  });

  function startTween(toPos, toTarget, dur = 1.25, onDone) {
    tween = {
      t: 0, dur,
      fromPos: camera.position.clone(), toPos,
      fromTarget: controls.target.clone(), toTarget,
      onDone,
    };
    controls.enabled = false;
  }

  function focus(root) {
    if (focused === root) return;
    kbIndex = city.clickables.indexOf(root); // keep keyboard cycle in sync
    if (!focused) {
      homeView = { pos: camera.position.clone(), target: controls.target.clone() };
    } else {
      closePanel(true); // switching buildings: close instantly
    }
    focused = root;
    tooltip.style.opacity = '0';

    const bbox = new THREE.Box3().setFromObject(root);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.5;

    // approach from the south-east (sign side), slightly biased by building position
    const dir = new THREE.Vector3(0.5 + Math.sign(root.position.x || 1) * 0.22, 0, 1).normalize();

    const dist = radius * 2.8 + 18;
    const target = center.clone();
    target.y = Math.min(center.y, size.y * 0.38);
    const pos = target.clone()
      .addScaledVector(dir, dist)
      .add(new THREE.Vector3(0, size.y * 0.5 + 10, 0));

    // shift view so the building sits left of the side panel
    // camera-right vector (camera looks along -dir)
    const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    const shift = window.innerWidth > 760 ? dist * 0.26 : 0;
    pos.addScaledVector(right, shift);
    target.addScaledVector(right, shift);

    startTween(pos, target, 1.25, () => { controls.enabled = true; });
    openPanel(root.userData.id);
  }

  function unfocus() {
    if (!focused) return;
    focused = null;
    closePanel();
    if (homeView) {
      startTween(homeView.pos.clone(), homeView.target.clone(), 1.1, () => { controls.enabled = true; });
      homeView = null;
    } else {
      controls.enabled = true;
    }
  }

  function focusById(id) {
    if (city.byId[id]) focus(city.byId[id]);
  }

  function update(t, dt) {
    // camera tween
    if (tween) {
      tween.t += dt;
      const k = Math.min(1, tween.t / tween.dur);
      const e = EASE(k);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (k >= 1) {
        const done = tween.onDone;
        tween = null;
        controls.enabled = true; // always hand control back
        if (done) done();
      }
    }
    // hover / keyboard-highlight lift animation
    for (const g of city.clickables) {
      const want = ((g === hovered || g === kbSelected) && g !== focused) ? 0.9 : 0;
      const cur = hoverLift.get(g) || 0;
      const next = cur + (want - cur) * Math.min(1, dt * 10);
      hoverLift.set(g, next);
      g.position.y = g.userData.baseY + next;
    }
    // keep keyboard tooltip pinned to the selected building
    if (kbSelected && !focused) {
      tipVec.set(kbSelected.position.x, kbSelected.userData.kbH, kbSelected.position.z);
      tipVec.project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      const sx = (tipVec.x * 0.5 + 0.5) * r.width + r.left;
      const sy = (-tipVec.y * 0.5 + 0.5) * r.height + r.top;
      tooltip.style.transform = `translate(${Math.round(sx + 14)}px, ${Math.round(sy)}px)`;
    }
  }

  // record base Y + bbox height for lift animation and keyboard tooltip
  for (const g of city.clickables) {
    g.userData.baseY = g.position.y;
    const bb = new THREE.Box3().setFromObject(g);
    g.userData.kbH = bb.max.y + 1.5;
  }

  return { update, focusById, unfocus, isFocused: () => !!focused, startTween };
}
