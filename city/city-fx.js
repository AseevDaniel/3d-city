// ── Portfolio City: toggleable interactions (physics cars, rain, fireworks…) ─
// Everything here is event-driven: zero per-frame cost while nothing is active.
import * as THREE from 'three';

export function buildFX({ scene, city, life, renderer, camera, controls }) {
  const flags = { carGrab: true, carHop: true, trees: true, fountain: true, balloon: true, rain: true, fireworks: true, crane: true };
  window.__fxFlags = flags;

  const el = renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmpV = new THREE.Vector3();

  life.cars.forEach(c => { c.g.userData.carRef = c; });
  const carMeshes = life.cars.map(c => c.g);
  // static colliders — per-MESH boxes (a group bbox includes antennas/signs and
  // creates invisible walls; per-mesh boxes match what you actually see)
  const colliders = [];
  for (const g of city.clickables) {
    g.updateWorldMatrix(true, true);
    g.traverse(o => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      const s = b.getSize(new THREE.Vector3());
      if (s.x > 0.7 && s.y > 0.5 && s.z > 0.7) colliders.push(b);
    });
  }
  const pickables = [...city.clickables, ...life.smallClickables];

  // ---------- pointer plumbing ----------
  let downInfo = null;
  let pending = null;   // pressed a car, not dragging yet
  let drag = null;
  const freeCars = [];  // thrown cars in flight / returning

  const LIFT_Y = 5.5;
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LIFT_Y);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.75);

  function setRay(ev) {
    const r = el.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
  }

  el.addEventListener('pointerdown', (ev) => {
    downInfo = { x: ev.clientX, y: ev.clientY, t: performance.now() };
    if (!flags.carGrab && !flags.carHop) return;
    setRay(ev);
    const hit = ray.intersectObjects(carMeshes, false)[0];
    if (!hit || !hit.object.visible) return;
    const car = hit.object.userData.carRef;
    pending = { car };
    controls.enabled = false;
    ev.stopImmediatePropagation();
  }, true);

  el.addEventListener('pointermove', (ev) => {
    if (pending && !drag) {
      if (Math.hypot(ev.clientX - downInfo.x, ev.clientY - downInfo.y) > 6) {
        if (flags.carGrab) startDrag(pending.car);
        else { pending = null; controls.enabled = true; }
      }
    }
    if (drag) {
      setRay(ev);
      // aim at what the cursor is actually over: building hit → hover above it; else ground point
      const bHit = ray.intersectObjects(city.clickables, true)[0];
      if (bHit) {
        drag.target.x = THREE.MathUtils.clamp(bHit.point.x, -48, 48);
        drag.target.z = THREE.MathUtils.clamp(bHit.point.z, -48, 48);
      } else if (ray.ray.intersectPlane(groundPlane, tmpV)) {
        drag.target.x = THREE.MathUtils.clamp(tmpV.x, -48, 48);
        drag.target.z = THREE.MathUtils.clamp(tmpV.z, -48, 48);
      }
      ev.stopImmediatePropagation();
    }
  }, true);

  el.addEventListener('pointerup', (ev) => {
    if (drag) {
      release();
      pending = null; controls.enabled = true;
      ev.stopImmediatePropagation();
      return;
    }
    if (pending) {
      const car = pending.car;
      pending = null; controls.enabled = true;
      if (flags.carHop && !car.g.userData.free && car.hopT == null) {
        car.hopT = 0.0001;
        if (window.CityAch) window.CityAch.report('carHop');
      }
      ev.stopImmediatePropagation();
      return;
    }
    if (!downInfo) return;
    const isClick = Math.hypot(ev.clientX - downInfo.x, ev.clientY - downInfo.y) < 7 &&
      performance.now() - downInfo.t < 450;
    if (!isClick) return;
    setRay(ev);
    if (flags.rain) {
      const hit = ray.intersectObjects(life.cloudsGroup.children, true)[0];
      if (hit) {
        let o = hit.object;
        while (o.parent && o.parent !== life.cloudsGroup) o = o.parent;
        startRain(o);
        if (window.CityAch) window.CityAch.report('rain');
        return;
      }
    }
    if (flags.crane) {
      const hit = ray.intersectObject(life.craneParts.crane, true)[0];
      if (hit) {
        startCraneDrop();
        if (window.CityAch) window.CityAch.report('crane');
        return;
      }
    }
    if (flags.fireworks) {
      // only if the click didn't land on a building/tree/etc.
      const objHit = ray.intersectObjects(pickables, true)[0];
      if (!objHit && ray.ray.intersectPlane(groundPlane, tmpV) &&
          tmpV.x > -45 && tmpV.x < -19 && tmpV.z > -45 && tmpV.z < -19) {
        launchFirework(tmpV.x, tmpV.z);
        if (window.CityAch) window.CityAch.report('fireworks');
      }
    }
  }, true);

  // ---------- car grab / throw ----------
  const CAR_R = 0.8;
  function hoverHeightAt(x, z) {
    let h = 0;
    for (const b of colliders) {
      if (x > b.min.x - 0.8 && x < b.max.x + 0.8 && z > b.min.z - 0.8 && z < b.max.z + 0.8) {
        h = Math.max(h, b.max.y);
      }
    }
    return h;
  }
  // how high the origin must sit so a tilted car doesn't sink into the ground
  function groundYFor(g) {
    tmpV.set(0, 1, 0).applyQuaternion(g.quaternion);
    return 0.45 + (1 - Math.abs(tmpV.y)) * 0.85;
  }

  function startDrag(car) {
    pending = null;
    // re-grabbing a thrown car mid-flight: take it out of the physics list
    const fi = freeCars.findIndex(f => f.car === car);
    if (fi >= 0) freeCars.splice(fi, 1);
    drag = { car, target: car.g.position.clone().setY(LIFT_Y), vel: new THREE.Vector3(), prev: new THREE.Vector3() };
    car.g.userData.free = true;
    el.style.cursor = 'grabbing';
  }

  function release() {
    const { car, vel } = drag;
    el.style.cursor = '';
    const v = vel.clone();
    v.y = Math.max(v.y, 0) + 2;
    v.clampLength(0, 26);
    freeCars.push({
      car, v,
      ang: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .multiplyScalar(0.5 + v.length() * 0.16),
      restT: 0, state: 'fly',
    });
    if (window.CityAch) window.CityAch.report('carGrab');
    drag = null;
  }

  function lanePose(c) {
    const v = -115 + c.p;
    const pos = c.lane.dir === 1 ? v : -v;
    if (c.lane.axis === 'x') {
      return { pos: new THREE.Vector3(pos, 0.42, c.lane.fixed), yaw: c.lane.dir === 1 ? 0 : Math.PI };
    }
    return { pos: new THREE.Vector3(c.lane.fixed, 0.42, pos), yaw: c.lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2 };
  }

  // ---------- rain ----------
  const RAIN_N = 130;
  const rainPos = new Float32Array(RAIN_N * 3);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainPts = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: '#5d8fc0', size: 0.45, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  rainPts.visible = false; rainPts.frustumCulled = false;
  scene.add(rainPts);
  let rain = null;
  const cloudGrey = new THREE.Color('#8d99a6'), cloudWhite = new THREE.Color('#ffffff');

  function startRain(cloudRoot) {
    if (rain) { for (const m of rain.mats) m.color.copy(cloudWhite); }
    const mats = new Set();
    cloudRoot.traverse(o => { if (o.material) mats.add(o.material); });
    rain = { cloud: cloudRoot, t: 0, mats: [...mats], off: [] };
    for (let i = 0; i < RAIN_N; i++) {
      rain.off.push([(Math.random() - 0.5) * 9, Math.random() * 26, (Math.random() - 0.5) * 5]);
    }
    rainPts.visible = true;
  }

  function updateRain(dt) {
    if (!rain) return;
    rain.t += dt;
    const cp = rain.cloud.position;
    const dur = 4.0;
    const fall = Math.max(8, cp.y - 0.8); // drops always reach the ground
    for (let i = 0; i < RAIN_N; i++) {
      const o = rain.off[i];
      rainPos[i * 3] = cp.x + o[0];
      rainPos[i * 3 + 1] = cp.y - 2 - ((rain.t * 30 + o[1] * (fall / 26)) % fall);
      rainPos[i * 3 + 2] = cp.z + o[2];
    }
    rainGeo.attributes.position.needsUpdate = true;
    const env = Math.min(Math.min(1, rain.t / 0.4), Math.max(0, Math.min(1, (dur - rain.t) / 0.5)));
    rainPts.material.opacity = 0.85 * env;
    for (const m of rain.mats) m.color.lerpColors(cloudWhite, cloudGrey, env * 0.8);
    if (rain.t > dur) {
      for (const m of rain.mats) m.color.copy(cloudWhite);
      rainPts.visible = false;
      rain = null;
    }
  }

  // ---------- fireworks ----------
  const FW_N = 130;
  const fireworks = [];
  for (let fi = 0; fi < 2; fi++) {
    const pos = new Float32Array(FW_N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: '#ff6644', size: 0.55, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pts.visible = false; pts.frustumCulled = false;
    scene.add(pts);
    fireworks.push({ pts, pos, vel: new Float32Array(FW_N * 3), t: -1 });
  }
  let fwIdx = 0;

  function launchFirework(x, z) {
    const f = fireworks[fwIdx];
    fwIdx = (fwIdx + 1) % fireworks.length;
    const h = 13 + Math.random() * 6;
    for (let i = 0; i < FW_N; i++) {
      f.pos[i * 3] = x; f.pos[i * 3 + 1] = h; f.pos[i * 3 + 2] = z;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = 4 + Math.random() * 7;
      f.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
      f.vel[i * 3 + 1] = Math.cos(ph) * sp + 1.5;
      f.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
    }
    f.t = 0;
    f.pts.geometry.attributes.position.needsUpdate = true;
    f.pts.material.color.setHSL(Math.random(), 0.85, 0.62);
    f.pts.material.opacity = 1;
    f.pts.visible = true;
  }

  function updateFireworks(dt) {
    for (const f of fireworks) {
      if (f.t < 0) continue;
      f.t += dt;
      for (let i = 0; i < FW_N; i++) {
        f.vel[i * 3 + 1] -= 7 * dt;
        f.pos[i * 3] += f.vel[i * 3] * dt;
        f.pos[i * 3 + 1] += f.vel[i * 3 + 1] * dt;
        f.pos[i * 3 + 2] += f.vel[i * 3 + 2] * dt;
        f.vel[i * 3] *= 0.985; f.vel[i * 3 + 2] *= 0.985;
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
      f.pts.material.opacity = Math.max(0, 1 - f.t / 1.7);
      if (f.t > 1.7) { f.t = -1; f.pts.visible = false; }
    }
  }

  // ---------- crane drop ----------
  let craneT = -1;
  function startCraneDrop() { if (craneT < 0) craneT = 0; }

  function updateCrane(dt) {
    if (craneT < 0) return;
    craneT += dt;
    const { cable, hookLoad } = life.craneParts;
    const K0 = 1, K1 = 2.32;
    const dur1 = 1.0, hold = 0.5, dur2 = 1.5, total = dur1 + hold + dur2;
    let k;
    if (craneT < dur1) { const u = craneT / dur1; k = K0 + (K1 - K0) * u * u; }
    else if (craneT < dur1 + hold) k = K1;
    else {
      const u = Math.min(1, (craneT - dur1 - hold) / dur2);
      const e = u * u * (3 - 2 * u);
      k = K1 + (K0 - K1) * e;
    }
    cable.scale.y = k;
    cable.position.y = -0.2 - 3 * k;
    hookLoad.position.y = -0.2 - 6 * k - 0.4;
    if (craneT > total) {
      craneT = -1;
      cable.scale.y = 1; cable.position.y = -3.2; hookLoad.position.y = -6.6;
    }
  }

  // ── celebration when every achievement is unlocked ──
  let trophyRef = null;
  if (city.byId.cafe) city.byId.cafe.traverse(o => { if (o.userData.cup) trophyRef = o; });
  let celebT = 1.5;

  // ---------- per-frame (cheap: only active effects do work) ----------
  function update(t, dt) {
    if (drag) {
      // glide over rooftops: hover height follows whatever is under the cursor
      drag.target.y = Math.max(LIFT_Y, hoverHeightAt(drag.target.x, drag.target.z) + 1.8);
      const p = drag.car.g.position;
      drag.prev.copy(p);
      p.lerp(drag.target, Math.min(1, dt * 12));
      tmpV.subVectors(p, drag.prev).divideScalar(Math.max(dt, 1e-4));
      drag.vel.lerp(tmpV, 0.35);
      drag.car.g.rotation.x = Math.sin(t * 2.5) * 0.08;
      drag.car.g.rotation.z = THREE.MathUtils.clamp(-drag.vel.x * 0.012, -0.35, 0.35);
    }

    for (let i = freeCars.length - 1; i >= 0; i--) {
      const f = freeCars[i];
      const g = f.car.g;
      if (f.state === 'fly') {
        f.contact = false;
        // substeps prevent tunneling through walls at high speed
        const steps = Math.min(6, Math.max(1, Math.ceil((f.v.length() * dt) / (CAR_R * 0.6))));
        const sdt = dt / steps;
        for (let s = 0; s < steps; s++) {
          f.v.y -= 30 * sdt;
          g.position.addScaledVector(f.v, sdt);
          const gy = groundYFor(g);
          if (g.position.y < gy) {
            g.position.y = gy;
            f.contact = true;
            if (Math.abs(f.v.y) > 3) {
              f.v.y *= -0.42; f.v.x *= 0.7; f.v.z *= 0.7; f.ang.multiplyScalar(0.6);
            } else {
              f.v.y = 0; f.v.x *= 0.86; f.v.z *= 0.86; f.ang.multiplyScalar(0.8);
            }
          }
          for (const b of colliders) {
            tmpV.copy(g.position).clamp(b.min, b.max);
            const d2 = tmpV.distanceToSquared(g.position);
            if (d2 > 0 && d2 < CAR_R * CAR_R) {
              const n = g.position.clone().sub(tmpV).normalize();
              g.position.copy(tmpV).addScaledVector(n, CAR_R);
              const dn = f.v.dot(n);
              if (dn < 0) f.v.addScaledVector(n, -1.5 * dn);
              f.v.multiplyScalar(0.8);
              f.ang.multiplyScalar(0.7);
              f.contact = true;
            } else if (d2 === 0) {
              // center got inside the box: push out through the NEAREST face and bounce
              const dx = Math.min(g.position.x - b.min.x, b.max.x - g.position.x);
              const dy = Math.min(g.position.y - b.min.y, b.max.y - g.position.y);
              const dz = Math.min(g.position.z - b.min.z, b.max.z - g.position.z);
              if (dx <= dy && dx <= dz) {
                const sgn = (g.position.x - b.min.x < b.max.x - g.position.x) ? -1 : 1;
                g.position.x = (sgn < 0 ? b.min.x : b.max.x) + sgn * CAR_R;
                if (f.v.x * sgn < 0) f.v.x *= -0.45;
              } else if (dy <= dz) {
                const sgn = (g.position.y - b.min.y < b.max.y - g.position.y) ? -1 : 1;
                g.position.y = (sgn < 0 ? b.min.y : b.max.y) + sgn * CAR_R;
                if (f.v.y * sgn < 0) f.v.y *= -0.45;
              } else {
                const sgn = (g.position.z - b.min.z < b.max.z - g.position.z) ? -1 : 1;
                g.position.z = (sgn < 0 ? b.min.z : b.max.z) + sgn * CAR_R;
                if (f.v.z * sgn < 0) f.v.z *= -0.45;
              }
              f.v.multiplyScalar(0.82);
              f.ang.multiplyScalar(0.7);
              f.contact = true;
            }
          }
        }
        g.rotation.x += f.ang.x * dt * 3;
        g.rotation.y += f.ang.y * dt * 3;
        g.rotation.z += f.ang.z * dt * 3;
        if (f.contact && f.v.length() < 0.8) {
          f.restT += dt;
          if (f.restT > 1.1) {
            const mates = life.cars.filter(c => c.lane === f.car.lane && c !== f.car && !c.g.userData.free);
            if (mates.length) f.car.p = (mates[0].p + 230 / 3) % 230;
            f.state = 'return'; f.rT = 0;
            f.fromP = g.position.clone();
            f.fromQ = g.quaternion.clone();
          }
        } else f.restT = 0;
      } else { // returning to its lane
        f.rT += dt;
        const k = Math.min(1, f.rT / 0.9);
        const e = k * k * (3 - 2 * k);
        const pose = lanePose(f.car);
        g.position.lerpVectors(f.fromP, pose.pos, e);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pose.yaw, 0));
        g.quaternion.slerpQuaternions(f.fromQ, q, e);
        if (k >= 1) {
          g.rotation.set(0, pose.yaw, 0);
          g.userData.free = false;
          freeCars.splice(i, 1);
        }
      }
    }

    for (const c of life.cars) {
      if (c.hopT != null) {
        c.hopT += dt;
        const k = c.hopT / 0.55;
        if (k >= 1) { c.hopT = null; c.g.scale.set(1, 1, 1); }
        else {
          c.g.position.y += Math.sin(k * Math.PI) * 1.15;
          c.g.scale.set(1, 1 + Math.sin(k * Math.PI * 2) * 0.08, 1);
        }
      }
    }

    updateRain(dt);
    updateFireworks(dt);
    updateCrane(dt);

    if (window.CityAch && window.CityAch.isAllDone()) {
      celebT -= dt;
      if (celebT <= 0) {
        celebT = 2.2 + Math.random() * 1.4;
        launchFirework(-34 + (Math.random() - 0.5) * 10, 28 + (Math.random() - 0.5) * 10);
      }
      if (trophyRef) {
        trophyRef.rotation.y += dt * 2.2;
        trophyRef.position.y = 6.3 + Math.sin(t * 1.8) * 0.25;
      }
    }
  }

  function setFlags(f) {
    Object.assign(flags, f);
    window.__fxFlags = flags;
    if (!flags.carGrab && drag) { release(); controls.enabled = true; }
  }

  return { update, setFlags, flags, _debug: () => ({ pending: !!pending, drag: !!drag, freeCars: freeCars.length, down: downInfo }) };
}
