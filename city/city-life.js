// ── Portfolio City: life — cars, trees, clouds, balloon, fountain, crane ─────
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lifeMatCache = {};
function lambert(color, opts = {}) {
  if (Object.keys(opts).length === 0) {
    if (!lifeMatCache[color]) lifeMatCache[color] = new THREE.MeshLambertMaterial({ color });
    return lifeMatCache[color];
  }
  return new THREE.MeshLambertMaterial({ color, ...opts });
}
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function bakeC(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.groups) g.clearGroups();
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}
const carMat = new THREE.MeshLambertMaterial({ vertexColors: true });

let seed = 1234;
function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

const CAR_COLORS = ['#e8442e', '#2a6fdb', '#e8a13a', '#1f8a5b', '#f6f3ea', '#46cfd8', '#d94f70', '#5b3ba8'];

function makeCar() {
  const color = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
  const geos = [];
  geos.push(bakeC(new THREE.BoxGeometry(2.5, 0.7, 1.25).translate(0, 0.55, 0), color));
  geos.push(bakeC(new THREE.BoxGeometry(1.25, 0.55, 1.1).translate(-0.15, 1.15, 0), '#bfe3f0'));
  for (const [wx, wz] of [[-0.8, 0.6], [0.8, 0.6], [-0.8, -0.6], [0.8, -0.6]]) {
    geos.push(bakeC(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 8).rotateX(Math.PI / 2).translate(wx, 0.3, wz), '#26262a'));
  }
  const m = new THREE.Mesh(mergeGeometries(geos, false), carMat);
  m.castShadow = true;
  return m;
}

function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 1.2 * scale, 6), lambert('#8a5a3b'));
  trunk.position.y = 0.6 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  if (rng() > 0.45) {
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * scale, 0),
      lambert(rng() > 0.5 ? '#46b03c' : '#63c94e'));
    canopy.position.y = 1.9 * scale;
    canopy.castShadow = true;
    g.add(canopy);
  } else {
    for (let i = 0; i < 2; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.05 - i * 0.32) * scale, 1.5 * scale, 7),
        lambert('#3aa547'));
      cone.position.y = (1.5 + i * 0.9) * scale;
      cone.castShadow = true;
      g.add(cone);
    }
  }
  g.userData.fun = 'tree';
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(2 + rng() * 2.4, 8, 6), mat);
    s.position.set(i * 2.6 - n * 1.2, (rng() - 0.5) * 1.2, (rng() - 0.5) * 2.5);
    s.scale.y = 0.6;
    g.add(s);
  }
  return g;
}

function balloonTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#e8442e' : '#f6f3ea';
    ctx.fillRect(i * 32, 0, 32, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLife(scene, city) {
  const smallClickables = [];
  const pokes = []; // active poke animations

  // ── trees ──
  const treeSpots = [
    // park block (-32,-32)
    [-39, -39], [-25, -39], [-39, -25], [-26, -26], [-36, -30], [-28, -36], [-24, -31],
    // sprinkles around other blocks
    [-10, 10.5], [10.5, -10], [10.5, 10.5], [-10, -10],
    [-42, 10], [-22, 8], [42, 10], [22, -9], [40, -20], [22, 41], [-21, 42], [-42, -9],
    [9, 42], [-9, 42], [9, -42], [-6, -42], [44, 24], [24, 22],
    // outside the plat, on the grass
    [-58, -20], [-60, 14], [58, -12], [60, 26], [-20, 58], [16, 59], [-58, 44], [56, 56], [-56, -52], [30, -58], [-12, -60], [52, -44],
  ];
  for (const [x, z] of treeSpots) {
    const t = makeTree(0.8 + rng() * 0.7);
    const onPlat = Math.abs(x) < 50 && Math.abs(z) < 50;
    t.position.set(x, onPlat ? 0.75 : 0, z);
    scene.add(t);
    smallClickables.push(t);
  }

  // ── fountain (park center) ──
  const fountain = new THREE.Group();
  fountain.position.set(-32, 0.75, -32);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 0.9, 16), lambert('#d8d2c4'));
  basin.position.y = 0.45; basin.castShadow = true; basin.receiveShadow = true;
  fountain.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.12, 16), lambert('#5db4d8'));
  water.position.y = 0.85;
  fountain.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.4, 10), lambert('#d8d2c4'));
  column.position.y = 1.4;
  fountain.add(column);
  const drops = [];
  const dropMat = lambert('#8fd0ea');
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), dropMat);
    fountain.add(d);
    drops.push({ mesh: d, phase: rng() * Math.PI * 2, angle: rng() * Math.PI * 2, r: 0.5 + rng() * 1.6 });
  }
  fountain.userData.fun = 'fountain';
  fountain.userData.boost = 0;
  scene.add(fountain);
  smallClickables.push(fountain);

  // park benches
  for (const [bx, bz, rot] of [[-28, -29, 0.6], [-36, -35, -2.2]]) {
    const bench = new THREE.Group();
    const seat2 = box(2, 0.18, 0.7, lambert('#a87848'));
    seat2.position.y = 0.55;
    bench.add(seat2);
    const back = box(2, 0.6, 0.14, lambert('#a87848'));
    back.position.set(0, 0.95, -0.3);
    bench.add(back);
    bench.position.set(bx, 0.75, bz);
    bench.rotation.y = rot;
    scene.add(bench);
  }

  // ── hot-air balloon over the park ──
  const balloon = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12),
    new THREE.MeshLambertMaterial({ map: balloonTexture() }));
  envelope.scale.y = 1.15;
  envelope.castShadow = true;
  balloon.add(envelope);
  const basket = box(1.1, 0.9, 1.1, lambert('#8a5a3b'));
  basket.position.y = -4.6;
  balloon.add(basket);
  const ropeMat = lambert('#5a4630');
  for (const [rx, rz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), ropeMat);
    rope.position.set(rx * 1.6, -3.4, rz * 1.6);
    balloon.add(rope);
  }
  balloon.userData.fun = 'balloon';
  balloon.userData.boost = 0;
  scene.add(balloon);
  smallClickables.push(balloon);

  // ── clouds ──
  const clouds = new THREE.Group();
  const cloudList = [];
  for (let i = 0; i < 7; i++) {
    const c = makeCloud();
    c.position.set(-100 + rng() * 200, 62 + rng() * 16, -90 + rng() * 180);
    clouds.add(c);
    cloudList.push({ g: c, speed: 0.8 + rng() * 1.4 });
  }
  scene.add(clouds);

  // ── cars ──
  const LANES = [
    { axis: 'x', fixed: -18, dir: 1 }, { axis: 'x', fixed: -14, dir: -1 },
    { axis: 'x', fixed: 14, dir: 1 }, { axis: 'x', fixed: 18, dir: -1 },
    { axis: 'z', fixed: -18, dir: -1 }, { axis: 'z', fixed: -14, dir: 1 },
    { axis: 'z', fixed: 14, dir: -1 }, { axis: 'z', fixed: 18, dir: 1 },
  ];
  const MAX_PER_LANE = 3;
  const cars = [];
  for (const lane of LANES) {
    // one shared speed per lane — cars keep their spacing, no rear-ending
    const laneSpeed = 7 + rng() * 6;
    for (let i = 0; i < MAX_PER_LANE; i++) {
      const car = makeCar();
      car.position.y = 0.42;
      const p = (i / MAX_PER_LANE) * 230 + rng() * 30;
      cars.push({ g: car, lane, p, speed: laneSpeed });
      scene.add(car);
    }
  }
  // ── crane on the construction block ──
  const crane = new THREE.Group();
  crane.position.set(40, 0.75, 38);
  const craneMat = lambert('#e8b32e');
  const base = box(2.4, 0.7, 2.4, craneMat);
  base.position.y = 0.35;
  crane.add(base);
  const tower = box(0.8, 13, 0.8, craneMat);
  tower.position.y = 7;
  crane.add(tower);
  const jib = new THREE.Group();
  jib.position.y = 13.6;
  const arm = box(11, 0.55, 0.55, craneMat);
  arm.position.x = 3.6;
  jib.add(arm);
  const counter = box(1.6, 1, 1.2, lambert('#9a9a94'));
  counter.position.set(-2.4, -0.3, 0);
  jib.add(counter);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 4), lambert('#444'));
  cable.position.set(8, -3.2, 0);
  jib.add(cable);
  const hookLoad = box(1.2, 0.8, 0.9, lambert('#cfc9bd'));
  hookLoad.position.set(8, -6.6, 0);
  jib.add(hookLoad);
  crane.add(jib);
  scene.add(crane);

  // ── beacon + marquee refs from city ──
  let beacon = null;
  const marquee = [];
  if (city.byId.contacts) city.byId.contacts.traverse(o => { if (o.userData.beacon) beacon = o; });
  if (city.byId.arcade) city.byId.arcade.traverse(o => { if (o.userData.marquee !== undefined) marquee.push(o); });
  const MARQ_COLS = ['#e8442e', '#e8a13a', '#2a6fdb', '#1f8a5b'];
  const MARQ_OBJS = MARQ_COLS.map(c => new THREE.Color(c));

  // ── settings ──
  let trafficPerLane = 2;
  let cloudsOn = true;

  function setTraffic(n) {
    trafficPerLane = Math.max(0, Math.min(MAX_PER_LANE, n));
    cars.forEach((c, idx) => {
      c.g.visible = (idx % MAX_PER_LANE) < trafficPerLane;
    });
  }
  function setClouds(v) { cloudsOn = v; clouds.visible = v; }
  setTraffic(trafficPerLane);

  // ── poke (small interactive objects) ──
  function poke(root) {
    const kind = root.userData.fun;
    if (kind === 'tree') {
      pokes.push({ root, t: 0, kind });
    } else if (kind === 'balloon') {
      root.userData.boost = 1;
    } else if (kind === 'fountain') {
      root.userData.boost = 1.6;
    }
  }

  // ── per-frame update ──
  function update(t, dt) {
    // cars
    for (const c of cars) {
      if (!c.g.visible) continue;
      c.p += c.speed * dt;
      if (c.p > 230) c.p -= 230;
      const v = -115 + c.p;
      const pos = c.lane.dir === 1 ? v : -v;
      if (c.lane.axis === 'x') {
        c.g.position.set(pos, 0.42, c.lane.fixed);
        c.g.rotation.y = c.lane.dir === 1 ? 0 : Math.PI;
      } else {
        c.g.position.set(c.lane.fixed, 0.42, pos);
        c.g.rotation.y = c.lane.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      }
    }
    // clouds
    if (cloudsOn) {
      for (const c of cloudList) {
        c.g.position.x += c.speed * dt;
        if (c.g.position.x > 120) c.g.position.x = -120;
      }
    }
    // balloon drift
    const bb = balloon.userData;
    bb.boost = Math.max(0, bb.boost - dt * 0.5);
    const ba = t * 0.12;
    balloon.position.set(
      -32 + Math.cos(ba) * 9,
      27 + Math.sin(t * 0.6) * 1.2 + bb.boost * 7,
      -28 + Math.sin(ba) * 7,
    );
    balloon.rotation.y = t * 0.1 + bb.boost * 2;
    // fountain drops
    const fb = fountain.userData;
    fb.boost = Math.max(0, fb.boost - dt * 0.8);
    const amp = 1 + fb.boost;
    for (const d of drops) {
      const ph = (t * (1.6 + fb.boost) + d.phase) % Math.PI;
      const hgt = Math.sin(ph) * 1.9 * amp;
      const out = (ph / Math.PI) * d.r * amp;
      d.mesh.position.set(Math.cos(d.angle) * out, 2.1 + hgt, Math.sin(d.angle) * out);
      d.mesh.scale.setScalar(1 - (ph / Math.PI) * 0.5);
    }
    water.scale.setScalar(1 + Math.sin(t * 2.4) * 0.015 + fb.boost * 0.05);
    // crane
    jib.rotation.y = Math.sin(t * 0.13) * 1.4;
    // beacon blink
    if (beacon) beacon.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(t * 2.2)) * 1.2;
    // arcade marquee — smooth desynced color crossfade
    for (const m of marquee) {
      const ph = (t * 0.55 + m.userData.marquee * 0.43) % MARQ_OBJS.length;
      const i0 = Math.floor(ph), f = ph - i0;
      const sf = f * f * (3 - 2 * f);
      m.material.color.lerpColors(MARQ_OBJS[i0], MARQ_OBJS[(i0 + 1) % MARQ_OBJS.length], sf);
    }
    // pokes (tree bounce)
    for (let i = pokes.length - 1; i >= 0; i--) {
      const p = pokes[i];
      p.t += dt;
      const k = p.t / 0.9;
      if (k >= 1) {
        p.root.scale.set(1, 1, 1);
        pokes.splice(i, 1);
        continue;
      }
      const s = 1 + Math.sin(k * Math.PI * 3) * 0.22 * (1 - k);
      p.root.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }
  }

  return { update, setTraffic, setClouds, smallClickables, poke };
}
