// ── Portfolio City: core scene — ground, roads, buildings, signs ─────────────
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- shared helpers ----------
const texCache = {};
function windowTexture(base, win, style = 'ribbon') {
  const key = base + win + style;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);

  // shared glass pane painter (frame + gradient + reflection streak)
  const pane = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#7fa3c4'); g.addColorStop(0.4, '#46688c'); g.addColorStop(1, '#2c4361');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.74, y); ctx.lineTo(x + w * 0.3, y + h);
    ctx.closePath(); ctx.fill();
  };

  if (style === 'grid') {
    // classic office: 2×2 punched windows
    pane(12, 14, 42, 42); pane(74, 14, 42, 42);
    pane(12, 72, 42, 42); pane(74, 72, 42, 42);
  } else if (style === 'vertical') {
    // tall narrow window columns
    for (const x of [10, 52, 94]) pane(x, 8, 24, 112);
  } else if (style === 'curtain') {
    // full glass curtain wall with a mullion grid
    pane(3, 3, 122, 122);
    ctx.fillStyle = 'rgba(245,245,240,0.5)';
    for (let i = 32; i < 128; i += 32) { ctx.fillRect(i - 1, 3, 2, 122); ctx.fillRect(3, i - 1, 122, 2); }
  } else if (style === 'brick') {
    // brick courses + one centered window
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 128; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
      const off = (y / 16) % 2 ? 16 : 0;
      for (let x = off; x <= 128; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, 128, 5);
    pane(38, 34, 52, 60);
  } else {
    // 'ribbon' — continuous floor band
    const by = 34, bh = 62;
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, by - 4, 128, 4);
    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, '#7fa3c4');
    grad.addColorStop(0.35, '#46688c');
    grad.addColorStop(1, '#2c4361');
    ctx.fillStyle = grad;
    ctx.fillRect(0, by, 128, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, by + bh); ctx.lineTo(54, by); ctx.lineTo(86, by); ctx.lineTo(32, by + bh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(240,240,235,0.55)';
    for (let x = 0; x < 128; x += 32) ctx.fillRect(x - 1, by, 2, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, by + bh, 128, 3);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache[key] = t;
  return t;
}

const matCache = {};
function lambert(color, opts = {}) {
  if (Object.keys(opts).length === 0) {
    if (!matCache[color]) matCache[color] = new THREE.MeshLambertMaterial({ color });
    return matCache[color];
  }
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

// Bake a flat vertex color into a geometry (for merged, single-material meshes).
function colorGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute('uv');
  return geo;
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Building body with repeated window texture on the sides.
function buildingBody(w, h, d, facade, glass = '#79c4ec', roof = null, style = 'ribbon') {
  const tex = windowTexture(facade, glass, style).clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(w / 3.2)), Math.max(1, Math.round(h / 3.2)));
  const texD = tex.clone(); texD.needsUpdate = true;
  texD.repeat.set(Math.max(1, Math.round(d / 3.2)), Math.max(1, Math.round(h / 3.2)));
  const side = new THREE.MeshLambertMaterial({ map: tex });
  const sideD = new THREE.MeshLambertMaterial({ map: texD });
  const roofMat = lambert(roof || '#' + new THREE.Color(facade).lerp(new THREE.Color('#ffffff'), 0.45).getHexString());
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    [sideD, sideD, roofMat, roofMat, side, side],
  );
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.y = h / 2;
  return mesh;
}

// Canvas text plate mounted on a wall (project signs).
function textPlate(text, { bg = '#ffffff', fg = '#222', w = 6, h = 1.6, radius = 26 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * (h / w));
  const ctx = c.getContext('2d');
  const r = radius;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, c.width - 8, c.height - 8, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.round(c.height * 0.46)}px Rubik, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const plateMats = [
    lambert('#e8e4dc'), lambert('#e8e4dc'), lambert('#e8e4dc'),
    lambert('#e8e4dc'), new THREE.MeshLambertMaterial({ map: t }), lambert('#e8e4dc'),
  ];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.28), plateMats);
  m.castShadow = true;
  return m;
}

// Extruded 3D letters for roof signs.
function roofLetters(text, font, size, mat) {
  const geo = new TextGeometry(text, {
    font, size, height: size * 0.34,
    curveSegments: 4, bevelEnabled: true,
    bevelThickness: size * 0.03, bevelSize: size * 0.022, bevelSegments: 2,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.max.x + bb.min.x) / 2, 0, -(bb.max.z + bb.min.z) / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function roofClutter(group, w, h, d, rng, cx = 0, cz = 0) {
  // AC units + occasional solar panel — kept on the roof centered at (cx, cz)
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const ac = box(1 + rng(), 0.7, 1 + rng(), lambert('#b9b9b3'));
    ac.position.set(cx + (rng() - 0.5) * (w - 3), h + 0.35, cz + (rng() - 0.5) * (d - 3));
    group.add(ac);
  }
  if (rng() > 0.5) {
    const p = box(Math.min(3.4, w - 3), 0.12, Math.min(2.2, d - 3), lambert('#23365e'));
    p.position.set(cx + (rng() - 0.5) * (w - 5), h + 0.45, cz + (rng() - 0.5) * (d - 5));
    p.rotation.z = 0.18;
    group.add(p);
  }
}

let seed = 7;
function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

function makeFillerTree(rng) {
  const g = new THREE.Group();
  const s = 0.8 + rng() * 0.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.2 * s, 6), lambert('#8a5a3b'));
  trunk.position.y = 0.6 * s;
  trunk.castShadow = true;
  g.add(trunk);
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 0),
    lambert(rng() > 0.5 ? '#46b03c' : '#63c94e'));
  canopy.position.y = 1.9 * s;
  canopy.castShadow = true;
  g.add(canopy);
  return g;
}

// Convert any geometry to a non-indexed, vertex-colored, uv-less geometry ready to merge.
function bake(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.groups) g.clearGroups();
  return colorGeo(g, hex);
}

// Road variant: KEEPS uvs (scaled so the asphalt speckle tiles in world units).
function bakeRoad(geo, su, sv) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.groups) g.clearGroups();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

// Builds the surrounding suburb as a HANDFUL of merged meshes (huge perf win):
// one mesh for all buildings, one for roof caps, one for pads, one for roads, one for trees.
function buildSuburb(scene) {
  const facades = ['#f4eddc', '#ece3cf', '#e6eef3', '#f1e4e4', '#e6efe2', '#f2e8d2', '#e8e4f0', '#f6efdb', '#dde8ee'];
  const roofCols = ['#efece2', '#e7e2d4', '#e3e7ea']; // neutral — colored roofs are reserved for clickable buildings
  const ROAD = '#5d6167', DASH = '#f4f1e7';

  const bldGeos = [], roofGeos = [], padGeos = [], roadGeos = [], treeGeos = [], bandGeos = [], dashGeos = [];
  const glassCols = ['#3d5a7a', '#46688c', '#35506e'];

  const STEP = 26, RANGE = 130, ROADW = 6.5;
  const lines = [];
  for (let c = -RANGE; c <= RANGE; c += STEP) lines.push(c);
  const inCore = (x, z) => Math.abs(x) < 52 && Math.abs(z) < 52;
  // main avenues run at x=±16 and z=±16 (8 wide). Cells crossed by them aren't
  // skipped — the buildable area is clipped to the biggest strip clear of the road.
  const AV_STRIPS = [[-21.5, -10.5], [10.5, 21.5]];
  function freeSpan(c, half) {
    let segs = [[c - half, c + half]];
    for (const [a, b] of AV_STRIPS) {
      const next = [];
      for (const [s0, s1] of segs) {
        if (b <= s0 || a >= s1) { next.push([s0, s1]); continue; }
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
      segs = next;
    }
    if (!segs.length) return null;
    segs.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
    return segs[0][1] - segs[0][0] >= 5.5 ? segs[0] : null;
  }

  // ── grid roads + sparse dashes ──
  // Roads never cross the central plat: lines passing the core are split into
  // two segments that stop at its edge — no half-buried road stubs.
  const EDGE = RANGE + STEP / 2;
  const CORE = 56;
  const segsFor = (c) => Math.abs(c) >= CORE ? [[-EDGE, EDGE]] : [[-EDGE, -CORE], [CORE, EDGE]];
  for (const c of lines) {
    if (Math.abs(c) < 4) continue;
    for (const [a, b] of segsFor(c)) {
      const len = b - a, mid = (a + b) / 2;
      roadGeos.push(bakeRoad(new THREE.BoxGeometry(len, 0.2, ROADW).translate(mid, 0.12, c), len / 4.2, ROADW / 4.2));
      roadGeos.push(bakeRoad(new THREE.BoxGeometry(ROADW, 0.22, len).translate(c, 0.12, mid), ROADW / 4.2, len / 4.2));
    }
    for (let i = -RANGE; i <= RANGE; i += 7) {
      if (Math.abs(i) < 4) continue;
      if (Math.abs(c) < CORE && Math.abs(i) < CORE + 2) continue; // no dashes where there is no road
      dashGeos.push(bake(new THREE.BoxGeometry(2.2, 0.05, 0.34).translate(i, 0.24, c), DASH));
      dashGeos.push(bake(new THREE.BoxGeometry(0.34, 0.05, 2.2).translate(c, 0.24, i), DASH));
    }
  }

  // ── tree helper (geometry only) ──
  function pushTree(x, z) {
    const s = 0.85 + rng() * 0.7;
    treeGeos.push(bake(new THREE.CylinderGeometry(0.24 * s, 0.32 * s, 1.3 * s, 5).translate(x, 0.65 * s, z), '#8a5a3b'));
    const grn = rng() > 0.5 ? '#46b03c' : '#5fc44a';
    treeGeos.push(bake(new THREE.IcosahedronGeometry(1.15 * s, 0).translate(x, 1.95 * s, z), grn));
  }

  // tree-lined avenues leaving the city
  for (const ax of [-16, 16]) {
    for (let z = 64; z <= RANGE; z += 9) {
      pushTree(ax - 6.5, z); pushTree(ax + 6.5, z);
      pushTree(ax - 6.5, -z); pushTree(ax + 6.5, -z);
    }
  }
  for (const az of [-16, 16]) {
    for (let x = 64; x <= RANGE; x += 9) {
      pushTree(x, az - 6.5); pushTree(x, az + 6.5);
      pushTree(-x, az - 6.5); pushTree(-x, az + 6.5);
    }
  }

  // ── building blocks ──
  for (let li = 0; li < lines.length - 1; li++) {
    for (let lj = 0; lj < lines.length - 1; lj++) {
      const cx = (lines[li] + lines[li + 1]) / 2;
      const cz = (lines[lj] + lines[lj + 1]) / 2;
      if (inCore(cx, cz)) continue;
      const cellHalf = (STEP - ROADW) / 2;
      // clip the buildable area to the part of the cell clear of the avenues
      const spanX = freeSpan(cx, cellHalf);
      const spanZ = freeSpan(cz, cellHalf);
      if (!spanX || !spanZ) continue;
      const pcx = (spanX[0] + spanX[1]) / 2, padW = spanX[1] - spanX[0];
      const pcz = (spanZ[0] + spanZ[1]) / 2, padD = spanZ[1] - spanZ[0];
      const clipped = padW < STEP - ROADW - 0.01 || padD < STEP - ROADW - 0.01;
      const halfX = padW / 2 - 1.2, halfZ = padD / 2 - 1.2;
      // avenue-side blocks always stand on grey-beige paving
      const padCol = clipped ? '#d8d0bd' : (rng() > 0.6 ? (rng() > 0.5 ? '#d8d0bd' : '#cdd6c4') : '#66b62c');
      padGeos.push(bake(new THREE.BoxGeometry(padW, 0.3, padD).translate(pcx, 0.16, pcz), padCol));

      const roll = rng();
      if (!clipped && roll < 0.14) { // pocket park
        for (let k = 0; k < 4; k++) pushTree(pcx + (rng() - 0.5) * halfX * 1.6, pcz + (rng() - 0.5) * halfZ * 1.6);
        continue;
      }
      if (!clipped && roll < 0.22) { // parking lot
        padGeos.push(bake(new THREE.BoxGeometry(padW - 1, 0.32, padD - 1).translate(pcx, 0.2, pcz), '#4c4f55'));
        continue;
      }
      const count = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) {
        const w = Math.min(4 + rng() * (halfX * 0.85), halfX * 2 - 0.6);
        const d = Math.min(4 + rng() * (halfZ * 0.85), halfZ * 2 - 0.6);
        const isTower = rng() > 0.82;
        const h = isTower ? 13 + rng() * 15 : 3 + rng() * 9;
        // clamp offsets so the footprint stays inside the buildable strip
        const maxOx = Math.max(0, halfX - w / 2);
        const maxOz = Math.max(0, halfZ - d / 2);
        const ox = count === 1 ? 0 : (rng() - 0.5) * 2 * maxOx * 0.85;
        const oz = count === 1 ? 0 : (rng() - 0.5) * 2 * maxOz * 0.85;
        bldGeos.push(bake(new THREE.BoxGeometry(w, h, d).translate(pcx + ox, 0.33 + h / 2, pcz + oz),
          facades[Math.floor(rng() * facades.length)]));
        // ribbon-window bands — cheap geometric «windows», all merged into one mesh
        const floors = Math.min(8, Math.max(1, Math.floor(h / 2.9)));
        const fh = h / floors;
        const glass = glassCols[Math.floor(rng() * glassCols.length)];
        for (let fl = 0; fl < floors; fl++) {
          bandGeos.push(bake(
            new THREE.BoxGeometry(w + 0.12, Math.min(1.05, fh * 0.42), d + 0.12)
              .translate(pcx + ox, 0.33 + (fl + 0.58) * fh, pcz + oz), glass));
        }
        // colored flat roof cap (reference look)
        if (rng() > 0.4) {
          roofGeos.push(bake(new THREE.BoxGeometry(w + 0.2, 0.6, d + 0.2).translate(pcx + ox, 0.33 + h + 0.2, pcz + oz),
            roofCols[Math.floor(rng() * roofCols.length)]));
        }
      }
      if (rng() > 0.45) pushTree(pcx + (rng() - 0.5) * halfX * 1.7, pcz + (rng() - 0.5) * halfZ * 1.7);
    }
  }

  // ── merge & add (a handful of draw calls for the whole suburb) ──
  const vcMat = (extra = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...extra });
  function addMerged(geos, mat, cast, recv) {
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = cast; m.receiveShadow = recv;
    m.matrixAutoUpdate = false;
    scene.add(m);
  }
  // suburb roads share the same speckled asphalt as the avenues (uv-tiled)
  const subAsphalt = speckleTexture('#5d6167', {
    dots: [['#54585e', 40, 2, 5, 0.6], ['#676b71', 40, 1.5, 4.5, 0.55], ['#4d5157', 20, 1, 3, 0.5]],
  });
  addMerged(roadGeos, new THREE.MeshLambertMaterial({ map: subAsphalt }), false, true);
  addMerged(dashGeos, vcMat(), false, false);
  addMerged(padGeos, vcMat(), false, true);
  addMerged(bldGeos, vcMat(), true, true);
  addMerged(roofGeos, vcMat(), true, false);
  addMerged(bandGeos, vcMat(), false, false);
  addMerged(treeGeos, vcMat(), true, false);
}

// Small street furniture around the core blocks — all merged into ONE mesh.
function buildDecor(scene) {
  const geos = [];
  const lamp = (x, z) => {
    geos.push(bake(new THREE.CylinderGeometry(0.07, 0.1, 3, 5).translate(x, 2.25, z), '#5a5e63'));
    geos.push(bake(new THREE.BoxGeometry(0.55, 0.2, 0.26).translate(x, 3.85, z), '#ffe9a8'));
  };
  const bush = (x, z, s) => {
    geos.push(bake(new THREE.IcosahedronGeometry(0.5 * s, 0).translate(x, 0.75 + 0.42 * s, z),
      rng() > 0.5 ? '#46b03c' : '#5fc44a'));
  };
  const bench = (x, z, a) => {
    geos.push(bake(new THREE.BoxGeometry(1.7, 0.14, 0.55).rotateY(a).translate(x, 1.25, z), '#a87848'));
    geos.push(bake(new THREE.BoxGeometry(1.7, 0.5, 0.12).rotateY(a)
      .translate(x - Math.sin(a) * 0.26, 1.55, z - Math.cos(a) * 0.26), '#a87848'));
    for (const s of [-0.65, 0.65]) {
      geos.push(bake(new THREE.BoxGeometry(0.12, 0.45, 0.5).rotateY(a)
        .translate(x + Math.cos(a) * s, 0.98, z - Math.sin(a) * s), '#7a5432'));
    }
  };
  const hydrant = (x, z) => {
    geos.push(bake(new THREE.CylinderGeometry(0.16, 0.19, 0.55, 6).translate(x, 1.05, z), '#d8442e'));
    geos.push(bake(new THREE.SphereGeometry(0.13, 6, 5).translate(x, 1.36, z), '#d8442e'));
  };
  const planter = (x, z) => {
    geos.push(bake(new THREE.BoxGeometry(1.5, 0.5, 0.55).translate(x, 1.0, z), '#cfc9bd'));
    geos.push(bake(new THREE.BoxGeometry(1.4, 0.18, 0.45).translate(x, 1.32, z), '#4fae2e'));
  };

  const centers = [-32, 0, 32];
  for (const bx of centers) for (const bz of centers) {
    if (bx === -32 && bz === -32) continue; // park has its own life
    // corner street lamps
    for (const [ox, oz] of [[-10.7, -10.7], [10.7, -10.7], [-10.7, 10.7], [10.7, 10.7]]) lamp(bx + ox, bz + oz);
    // bushes along sidewalk edges
    const nB = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nB; i++) {
      const edge = Math.floor(rng() * 4);
      const t = (rng() - 0.5) * 16;
      const p = edge === 0 ? [t, -10.5] : edge === 1 ? [t, 10.5] : edge === 2 ? [-10.5, t] : [10.5, t];
      bush(bx + p[0], bz + p[1], 0.7 + rng() * 0.7);
    }
    if (rng() > 0.3) bench(bx + (rng() - 0.5) * 9, bz + 10.3, Math.PI);
    if (rng() > 0.45) hydrant(bx - 10.5, bz + (rng() - 0.5) * 12);
    if (rng() > 0.35) planter(bx + (rng() - 0.5) * 13, bz - 10.4);
  }

  const mesh = new THREE.Mesh(mergeGeometries(geos, false),
    new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
}

// Tiny procedural speckle/blotch texture — cheap ground detail (one small canvas).
function speckleTexture(base, opts = {}) {
  const { dots = [], tile = null, size = 128 } = opts;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (const [color, count, rMin, rMax, alpha] of dots) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      const r = rMin + rng() * (rMax - rMin);
      ctx.beginPath();
      ctx.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (tile) { // pavement expansion joints
    ctx.strokeStyle = tile;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- main build ----------
export function buildCity(scene, font) {
  const clickables = [];
  const byId = {};
  const signMat = new THREE.MeshLambertMaterial({ color: '#e8442e' });
  const D = window.CITY_DATA;

  // ground — mottled grass
  const grassTex = speckleTexture('#6cba2e', { dots: [
    ['#5fae27', 26, 5, 14, 0.55], ['#7cc73a', 26, 4, 11, 0.5], ['#63b42c', 20, 3, 8, 0.45],
  ] });
  grassTex.repeat.set(85, 85);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 460),
    new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // shared ground-detail textures
  const concreteTexA = speckleTexture('#d8d0bd', {
    dots: [['#cfc7b4', 22, 3, 8, 0.5], ['#e0d9c8', 22, 3, 8, 0.5]],
    tile: 'rgba(0,0,0,0.08)',
  });
  const concreteTexB = speckleTexture('#ece4d4', {
    dots: [['#e2dac6', 20, 3, 8, 0.5], ['#f2ecdd', 20, 3, 8, 0.5]],
    tile: 'rgba(0,0,0,0.07)',
  });
  const asphaltBase = speckleTexture('#5d6167', {
    dots: [['#54585e', 40, 2, 5, 0.6], ['#676b71', 40, 1.5, 4.5, 0.55], ['#4d5157', 20, 1, 3, 0.5]],
  });

  // city plat (paved area under everything) — tiled concrete
  concreteTexA.repeat.set(26, 26);
  const plat = box(104, 0.3, 104, new THREE.MeshLambertMaterial({ map: concreteTexA }));
  plat.position.y = 0.15;
  scene.add(plat);

  // block slabs
  const parkTex = grassTex.clone(); parkTex.needsUpdate = true; parkTex.repeat.set(5, 5);
  concreteTexB.repeat.set(6, 6);
  const slabMatPark = new THREE.MeshLambertMaterial({ map: parkTex });
  const slabMatPaved = new THREE.MeshLambertMaterial({ map: concreteTexB });
  const centers = [-32, 0, 32];
  for (const x of centers) for (const z of centers) {
    const isPark = (x === -32 && z === -32);
    const slab = box(24, 0.6, 24, isPark ? slabMatPark : slabMatPaved);
    slab.position.set(x, 0.45, z);
    scene.add(slab);
  }

  // roads + dashes (extended out of the city, to the horizon) — speckled asphalt
  const asphH = asphaltBase.clone(); asphH.needsUpdate = true; asphH.repeat.set(46, 1.6);
  const asphV = asphaltBase.clone(); asphV.needsUpdate = true; asphV.repeat.set(1.6, 46);
  const roadMatH = new THREE.MeshLambertMaterial({ map: asphH });
  const roadMatV = new THREE.MeshLambertMaterial({ map: asphV });
  for (const p of [-16, 16]) {
    const rh = box(230, 0.32, 8, roadMatH); rh.position.set(0, 0.18, p); rh.receiveShadow = true; rh.castShadow = false; scene.add(rh);
    const rv = box(8, 0.34, 230, roadMatV); rv.position.set(p, 0.18, 0); rv.receiveShadow = true; rv.castShadow = false; scene.add(rv);
  }
  const dashGeo = new THREE.BoxGeometry(2.2, 0.06, 0.34);
  const dashGeoV = new THREE.BoxGeometry(0.34, 0.06, 2.2);
  const dashMat = lambert('#f2efe6');
  const dashList = [];
  for (let i = -112; i <= 112; i += 6) {
    if (Math.abs(i) < 21 && Math.abs(i) > 11) continue; // skip inner intersections
    for (const p of [-16, 16]) {
      dashList.push(dashGeo.clone().translate(i, 0.38, p));
      dashList.push(dashGeoV.clone().translate(p, 0.38, i));
    }
  }
  const dashesMesh = new THREE.Mesh(mergeGeometries(dashList, false), dashMat);
  dashesMesh.receiveShadow = true; dashesMesh.matrixAutoUpdate = false;
  scene.add(dashesMesh);

  const Y = 0.75; // top of slabs

  function register(group, id, label, sublabel) {
    group.userData = { ...group.userData, id, label, sublabel, clickable: true };
    clickables.push(group);
    byId[id] = group;
    scene.add(group);
    return group;
  }

  // ── ABOUT — hero HQ, center block, big DANYLO letters ──
  {
    const g = new THREE.Group();
    g.position.set(0, Y, 0);
    const tower = buildingBody(11, 19, 11, '#f5f0e1', '#79c4ec', null, 'curtain');
    tower.position.set(-4.5, 9.5, -5);
    g.add(tower);
    const wing = buildingBody(20, 9, 9, '#e2eef5');
    wing.position.set(0, 4.5, 5.5);
    g.add(wing);
    const lobby = buildingBody(6, 4, 6, '#cdd6dd', '#9fd0e8', null, 'curtain');
    lobby.position.set(7, 2, -4);
    g.add(lobby);
    roofClutter(g, 11, 19, 11, rng, -4.5, -5);
    // hero letters on the wing roof
    const hero = roofLetters('DANYLO', font, 3.1, signMat);
    hero.position.set(0, 9, 5.5);
    g.add(hero);
    const plate = textPlate('ABOUT ME', { bg: '#ffffff', fg: '#e8442e', w: 6.4, h: 1.7 });
    plate.position.set(-4.5, 15.5, 0.65); // on tower front (+z)
    g.add(plate);
    // entrance canopy
    const canopy = box(4.4, 0.3, 1.6, lambert('#e8442e'));
    canopy.position.set(0, 3.4, 10.6);
    g.add(canopy);
    register(g, 'about', 'About Me', 'Who built this city');
  }

  // ── SKILLS — twin towers + bridge, west block ──
  {
    const g = new THREE.Group();
    g.position.set(-32, Y, 0);
    const t1 = buildingBody(9, 16, 9, '#e4f0f7', '#79c4ec', null, 'grid');
    t1.position.set(-5, 8, 0);
    g.add(t1);
    const t2 = buildingBody(7.5, 10.5, 7.5, '#f3e9d2');
    t2.position.set(5.5, 5.25, 2);
    g.add(t2);
    const bridge = box(4.5, 2.2, 3.4, lambert('#c4d3de'));
    bridge.position.set(0.2, 7.6, 0.9);
    g.add(bridge);
    roofClutter(g, 9, 16, 9, rng, -5, 0);
    const letters = roofLetters('SKILLS', font, 2.0, signMat);
    letters.position.set(-5, 16, 0);
    g.add(letters);
    const plate = textPlate('TECH PARK', { bg: '#2a6fdb', fg: '#ffffff', w: 6, h: 1.5 });
    plate.position.set(5.5, 8.6, 5.9);
    g.add(plate);
    register(g, 'skills', 'Skills', 'The full stack, floor by floor');
  }

  // ── CONTACTS — comms tower, east block ──
  {
    const g = new THREE.Group();
    g.position.set(32, Y, 0);
    const t = buildingBody(8.5, 17, 8.5, '#f1e6d4', '#79c4ec', null, 'vertical');
    t.position.set(-2, 8.5, -2);
    g.add(t);
    const annex = buildingBody(7, 6, 9, '#e0edf3');
    annex.position.set(5.5, 3, 3);
    g.add(annex);
    // antenna mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 9, 6), lambert('#9aa3ab'));
    mast.position.set(-2, 21.5, -2); mast.castShadow = true;
    g.add(mast);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9 - i * 0.25, 0.07, 6, 16), lambert('#9aa3ab'));
      ring.position.set(-2, 19.4 + i * 1.8, -2);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8),
      new THREE.MeshLambertMaterial({ color: '#ff5240', emissive: '#ff2200', emissiveIntensity: 1 }));
    beacon.position.set(-2, 26.2, -2);
    beacon.userData.beacon = true;
    g.add(beacon);
    // satellite dish on annex
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), lambert('#f4f1ea'));
    dish.position.set(5.5, 6.6, 3);
    dish.rotation.set(-Math.PI / 1.6, 0, 0.5);
    dish.castShadow = true;
    g.add(dish);
    const letters = roofLetters('CONTACT', font, 1.55, signMat);
    letters.position.set(-2, 17, -2);
    g.add(letters);
    const plate = textPlate('SAY HELLO', { bg: '#1f8a5b', fg: '#ffffff', w: 5.6, h: 1.4 });
    plate.position.set(5.5, 4.6, 7.65);
    g.add(plate);
    register(g, 'contacts', 'Contacts', 'All lines are open');
  }

  // ── PROJECT ROWS — each project gets its own distinct silhouette ──
  const facades = { flylink: '#ddd2f5', academy: '#f7e8c4', genai: '#f3d8cf', panda: '#e3e6ea', medbook: '#f7dde4', ruddy: '#d3eef3' };
  const rows = [
    { z: -32, ids: ['panda', 'medbook', 'ruddy'] },
    { z: 32, ids: ['flylink', 'academy', 'genai'] },
  ];

  // per-project custom builders; each returns the height for the sign plate
  const projectShapes = {
    flylink(g, f, col) { // slim tower + low wing (L-shape)
      const tower = buildingBody(4.6, 12, 4.6, f, '#79c4ec', col, 'curtain');
      tower.position.set(-1.4, 6, -1.2);
      g.add(tower);
      const wing = buildingBody(6.8, 4, 3, f, '#79c4ec', col);
      wing.position.set(0.4, 2, 2.4);
      g.add(wing);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.6, 5), lambert('#9aa3ab'));
      ant.position.set(-1.4, 13.3, -1.2); ant.castShadow = true;
      g.add(ant);
      return { h: 12, px: -1.4, pz: 1.2 };
    },
    academy(g, f, col) { // stepped ziggurat
      const b1 = buildingBody(7.2, 4.6, 7.2, f, '#79c4ec', col, 'grid'); b1.position.y = 2.3; g.add(b1);
      const b2 = buildingBody(5.4, 3.2, 5.4, f, '#79c4ec', col, 'grid'); b2.position.set(-0.4, 6.2, -0.4); g.add(b2);
      const b3 = buildingBody(3.6, 2.6, 3.6, f, '#79c4ec', col, 'grid'); b3.position.set(0.3, 9.1, 0.3); g.add(b3);
      return { h: 4.6, px: 0, pz: 3.6, pw: 6 };
    },
    ruddy(g, f, col) { // slab + glass corner + entrance canopy
      const slab = buildingBody(6.8, 9.5, 5.2, f, '#79c4ec', col);
      slab.position.set(0, 4.75, -0.8);
      g.add(slab);
      const glassCorner = box(2.6, 7, 2.6, lambert('#8fcce8'));
      glassCorner.position.set(2.6, 3.5, 2.4);
      g.add(glassCorner);
      const canopy = box(3.6, 0.26, 1.4, lambert(col));
      canopy.position.set(-1.2, 2.6, 2.4);
      g.add(canopy);
      return { h: 9.5, px: 0, pz: 1.8 };
    },
    panda(g, f, col) { // wide low block + rooftop garden
      const body = buildingBody(7.4, 6.2, 6.6, f, '#79c4ec', col, 'brick');
      body.position.y = 3.1;
      g.add(body);
      const lawn = box(5.8, 0.18, 4.8, lambert('#5fb944'));
      lawn.position.set(-0.3, 6.4, -0.3);
      g.add(lawn);
      for (const [tx, tz] of [[-2, -1.6], [1.4, 0.8], [-0.4, 1.2]]) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), lambert('#46b03c'));
        bush.position.set(tx, 6.9, tz); bush.castShadow = true;
        g.add(bush);
      }
      return { h: 6.2, px: 0, pz: 3.3 };
    },
    medbook(g, f, col) { // clinic block + red helipad roof
      const body = buildingBody(6.6, 8, 6.6, f, '#79c4ec', '#c4404f', 'grid');
      body.position.y = 4;
      g.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.17, 6, 24), lambert('#f6f3ea'));
      ring.position.set(0, 8.12, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const hBar = box(0.32, 0.06, 1.7, lambert('#f6f3ea')); hBar.position.set(-0.55, 8.1, 0); g.add(hBar);
      const hBar2 = box(0.32, 0.06, 1.7, lambert('#f6f3ea')); hBar2.position.set(0.55, 8.1, 0); g.add(hBar2);
      const hBar3 = box(0.78, 0.06, 0.3, lambert('#f6f3ea')); hBar3.position.set(0, 8.1, 0); g.add(hBar3);
      return { h: 8, px: 0, pz: 3.3 };
    },
    genai(g, f, col) { // bistro block + striped awning + rooftop sign
      const body = buildingBody(7, 5, 6.2, f, '#79c4ec', col, 'brick');
      body.position.y = 2.5;
      g.add(body);
      const awn = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const s = box(1.2, 0.16, 1.7, lambert(i % 2 ? '#f6f3ea' : col));
        s.position.set(-2.4 + i * 1.2, 0, 0);
        awn.add(s);
      }
      awn.position.set(0, 3.6, 3.6);
      awn.rotation.x = 0.4;
      g.add(awn);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 5), lambert('#8a5a3b'));
      pole.position.set(1.9, 5.8, -1.4); pole.castShadow = true;
      g.add(pole);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.7, 8), lambert('#e8a13a'));
      umb.position.set(1.9, 6.7, -1.4); umb.castShadow = true;
      g.add(umb);
      // legs for the rooftop sign (the plate itself is placed by the shared code)
      for (const lx of [-1.9, 1.9]) {
        const leg = box(0.16, 1.1, 0.16, lambert('#7a5432'));
        leg.position.set(lx, 5.5, 1.35);
        g.add(leg);
      }
      return { h: 7.7, px: 0, pz: 1.2 };
    },
  };

  for (const row of rows) {
    row.ids.forEach((id, i) => {
      const proj = D.projects.find(p => p.id === id);
      const g = new THREE.Group();
      const x = (i - 1) * 8.6;
      g.position.set(x, Y, row.z);
      const spec = projectShapes[id](g, facades[id], proj.color);
      const plate = textPlate(proj.sign, { bg: proj.color, fg: '#ffffff', w: spec.pw || 5.4, h: 1.45 });
      plate.position.set(spec.px, spec.h - 1.2, spec.pz + 0.15);
      g.add(plate);
      register(g, id, proj.title, proj.kind);
    });
  }

  // ── FUN: ARCADE + CINEMA (south-east-ish block at 32,-32) ──
  {
    const g = new THREE.Group();
    g.position.set(28, Y, -36);
    const body = buildingBody(8, 6.5, 7, '#3b3650', '#e8a13a', '#2c2840', 'grid');
    g.add(body);
    // marquee cubes
    const cols = ['#e8442e', '#e8a13a', '#2a6fdb', '#1f8a5b'];
    for (let i = 0; i < 8; i++) {
      const cube = box(0.7, 0.7, 0.7, new THREE.MeshLambertMaterial({ color: cols[i % 4] }));
      cube.position.set(-3.5 + i, 6.9, 3.2);
      cube.userData.marquee = i;
      g.add(cube);
    }
    const plate = textPlate('ARCADE', { bg: '#1c1830', fg: '#ffd84d', w: 5.4, h: 1.5 });
    plate.position.set(0, 4.6, 3.65);
    g.add(plate);
    register(g, 'arcade', 'Bug Arcade', 'Playable · smash some bugs');
  }
  {
    const g = new THREE.Group();
    g.position.set(36.5, Y, -28);
    const body = buildingBody(7, 9, 8, '#5b3ba8', '#cdb9f2', '#46307e', 'vertical');
    g.add(body);
    const screen = box(5.4, 3.2, 0.2, lambert('#f6f3ea'));
    screen.position.set(0, 6.4, 4.05);
    g.add(screen);
    const plate = textPlate('CINEMA', { bg: '#ffffff', fg: '#5b3ba8', w: 4.8, h: 1.3 });
    plate.position.set(0, 3.6, 4.1);
    g.add(plate);
    register(g, 'cinema', 'City Cinema', 'Now showing');
  }

  // ── FUN: CAFÉ + filler houses (block -32, 32) ──
  {
    const g = new THREE.Group();
    g.position.set(-34, Y, 28);
    const body = buildingBody(7.5, 4.5, 7, '#efe7d8', '#9c7c54', null, 'brick');
    g.add(body);
    // striped awning
    const awn = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const s = box(1.3, 0.18, 2, lambert(i % 2 ? '#f6f3ea' : '#8a5a3b'));
      s.position.set(-2.6 + i * 1.3, 0, 0);
      awn.add(s);
    }
    awn.position.set(0, 3.65, 4.35);
    awn.rotation.x = 0.42;
    g.add(awn);
    // giant cup on the roof
    const cup = new THREE.Group();
    const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.85, 1.8, 14), lambert('#ffffff'));
    cupBody.castShadow = true;
    cup.add(cupBody);
    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.12, 14), lambert('#5a3a22'));
    coffee.position.y = 0.92;
    cup.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.14, 8, 16), lambert('#ffffff'));
    handle.position.set(1.15, 0.1, 0);
    cup.add(handle);
    cup.position.set(0, 5.5, 0);
    cup.userData.cup = true;
    g.add(cup);
    const plate = textPlate('DEV CAFÉ', { bg: '#8a5a3b', fg: '#ffffff', w: 5, h: 1.3 });
    plate.position.set(0, 2.1, 3.72);
    g.add(plate);
    register(g, 'cafe', 'Dev Café', 'Fun facts inside');
  }
  // filler houses (non-clickable)
  const housePos = [[-27, 35.5], [-39, 35.5], [-27, 22]];
  for (const [hx, hz] of housePos) {
    const hg = new THREE.Group();
    hg.position.set(hx, Y, hz);
    const hb = buildingBody(4.4, 3 + rng() * 1.6, 4.4, ['#e9e0cf', '#dfe7e2', '#e8d8d2'][Math.floor(rng() * 3)]);
    hg.add(hb);
    scene.add(hg);
  }

  // ── CONSTRUCTION SITE (block 32, 32) ──
  {
    const g = new THREE.Group();
    g.position.set(32, Y, 32);
    // concrete skeleton: columns + slabs
    const colMat = lambert('#cfc9bd');
    for (let fl = 0; fl < 3; fl++) {
      const slab = box(9, 0.4, 7, colMat);
      slab.position.set(-3, 2.2 + fl * 2.4, -3);
      g.add(slab);
      for (const cx of [-6.8, 0.8]) for (const cz of [-5.9, -0.1]) {
        const col = box(0.45, 2.4, 0.45, colMat);
        col.position.set(cx, 1 + fl * 2.4, cz);
        g.add(col);
      }
    }
    // dirt mound + beams
    const mound = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 8), lambert('#b08a5e'));
    mound.position.set(5.5, 0.8, 4); mound.castShadow = true;
    g.add(mound);
    const beams = box(3.4, 0.8, 1.2, lambert('#e8a13a'));
    beams.position.set(1.5, 0.4, 6);
    g.add(beams);
    // fence
    const fenceMat = lambert('#e8a13a');
    for (let i = 0; i < 6; i++) {
      const f = box(3.2, 1.1, 0.12, fenceMat);
      f.position.set(-8 + i * 3.4, 0.55, 9.6);
      g.add(f);
    }
    // billboard
    const bb = textPlate('NEXT PROJECT', { bg: '#e8a13a', fg: '#1c1c1c', w: 7.4, h: 1.8 });
    bb.position.set(0, 3.4, 10.2);
    g.add(bb);
    for (const px of [-2.6, 2.6]) {
      const leg = box(0.25, 2.6, 0.25, lambert('#8a6a3b'));
      leg.position.set(px, 1.2, 10.2);
      g.add(leg);
    }
    register(g, 'construction', 'Next Project', 'Under construction — reserved for you?');
  }

  // ── SUBURB: dense road grid + varied filler buildings beyond the ring ──
  buildSuburb(scene);
  // ── street furniture around the core blocks ──
  buildDecor(scene);

  return { clickables, byId, signMat, groundY: Y };
}
