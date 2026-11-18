// World: sunset coastal city. Low sun + real shadow maps, buildings with lit-window
// facades (canvas textures), neon signs, lamps, palms, beach, skyline, shiny roads.
// Original art, no Rockstar/GTA content.
import * as THREE from 'three';
import { CFG, PAL, DISTRICTS } from './config.js';
import { mulberry32, pick, range } from './random.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Facade: base color + window grid. Some windows warm-lit (emissive map = same canvas).
function facadeTexture(base, litRatio, rng) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
    const cols = 4, rows = 9, ww = 16, wh = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 10 + c * 28, y = 10 + r * 27;
        const lit = rng() < litRatio;
        g.fillStyle = lit ? '#ffd98a' : (rng() < 0.5 ? '#bfe3f2' : '#7fa8bd');
        g.fillRect(x, y, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, ww, 3);
      }
    }
  });
}

function neonTexture(text, color) {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 6; g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2);
  });
}

function glowTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,220,150,0.9)');
    grad.addColorStop(0.4, 'rgba(255,180,90,0.35)');
    grad.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

function sunTexture() {
  // Detailed sun disc: white-hot granulated core, bright rim, crisp edge.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 2, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,252,235,1)');
  grad.addColorStop(0.16, 'rgba(255,244,196,1)');
  grad.addColorStop(0.26, 'rgba(255,207,107,0.98)');
  grad.addColorStop(0.32, 'rgba(255,154,60,0.95)');
  grad.addColorStop(0.36, 'rgba(255,120,40,0.55)');
  grad.addColorStop(0.45, 'rgba(255,110,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  // granulation: darker speckles in the core so the disc is not flat
  const rng = mulberry32(7);
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 26;
    g.fillStyle = `rgba(255,180,80,${0.12 + rng() * 0.25})`;
    g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 1 + rng() * 2.2, 0, Math.PI * 2); g.fill();
  }
  // bright rim ring
  g.strokeStyle = 'rgba(255,240,190,0.9)'; g.lineWidth = 3;
  g.beginPath(); g.arc(128, 128, 40, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function haloTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(128, 128, 6, 128, 128, 126);
    grad.addColorStop(0, 'rgba(255,214,140,0.85)');
    grad.addColorStop(0.35, 'rgba(255,170,80,0.35)');
    grad.addColorStop(0.7, 'rgba(255,130,60,0.12)');
    grad.addColorStop(1, 'rgba(255,120,50,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

function streakTexture() {
  // wide, thin horizontal flare streak
  return canvasTex(512, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(255,180,90,0)');
    grad.addColorStop(0.5, 'rgba(255,210,130,0.85)');
    grad.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const vg = g.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(255,180,90,0)');
    vg.addColorStop(0.5, 'rgba(255,210,130,0.5)');
    vg.addColorStop(1, 'rgba(255,180,90,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  });
}

function frondTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#2f8f4e'; g.lineWidth = 7; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64, 64);
      g.quadraticCurveTo(64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40 - 12, 64 + Math.cos(a) * 60, 64 + Math.sin(a) * 58);
      g.stroke();
    }
  });
}

// Sunset sky dome: blazing orange horizon → coral → pink → deep violet zenith.
// The dome (not the flat scene background) is what the camera actually sees.
function skyTexture() {
  return canvasTex(16, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#5a3fa8'); // deep violet zenith
    grad.addColorStop(0.28, '#b84f9e'); // pink-purple
    grad.addColorStop(0.5, '#ff6e5e'); // coral
    grad.addColorStop(0.68, '#ff9a3c'); // blazing orange
    grad.addColorStop(0.84, '#ffc36b'); // golden horizon
    grad.addColorStop(1.0, '#ffe6b0'); // warm haze
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

function stripeTexture(c1, c2) {
  return canvasTex(128, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 16, 0, 16, h); }
  });
}

function shopTexture(text, color) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = 'rgba(16,12,18,0.92)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.font = 'bold 52px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

const ROAD_X = [-1200, -800, -400, 0, 400, 800, 1200];
const ROAD_Z = [-800, -400, 0, 400, 800];

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[2];
}

export function buildWorld(scene) {
  const rng = mulberry32(CFG.WORLD_SEED);
  const world = {
    colliders: [], facadeMats: [], lampGlows: [], neonMats: [],
    markers: {}, sunLight: null, hemi: null, sunSprite: null,
    markerMesh: null, objectiveRing: null, objectiveDiamond: null,
    nightF: 0, // 0 = sunset day, 1 = night
  };
  const g = new THREE.Group();
  scene.add(g);

  // ---- ground, sand, sea ----
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.WORLD_W + 800, CFG.WORLD_H + 800),
    new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.2, 0);
  grass.receiveShadow = true; g.add(grass);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(260, CFG.WORLD_H + 800),
    new THREE.MeshStandardMaterial({ color: PAL.sand, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(1530, 0, 0);
  sand.receiveShadow = true; g.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, CFG.WORLD_H + 1600),
    new THREE.MeshPhongMaterial({ color: PAL.water, shininess: 200, specular: 0xffd9a0, transparent: true, opacity: 0.96 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(2300, 0.4, 0);
  g.add(sea);

  // ---- sunset sky dome (gradient, follows nothing — radius covers the map) ----
  {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(5800, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
    dome.position.set(0, 0, 0);
    scene.add(dome);
    world.skyDome = dome;
  }

  // ---- roads: sidewalk base + asphalt with a soft sun sheen + markings + zebra ----
  // matte asphalt: Phong specular painted a giant sun-glint wedge on the road
  const roadMat = new THREE.MeshStandardMaterial({ color: PAL.asphalt, roughness: 0.8, metalness: 0.08 });
  const walkMat = new THREE.MeshStandardMaterial({ color: PAL.sidewalk, roughness: 0.9 });
  const lineWhite = new THREE.MeshBasicMaterial({ color: 0xf5f2e8 });
  const lineYellow = new THREE.MeshBasicMaterial({ color: 0xf2c14e });
  function roadPlane(w, l, x, z, mat, y = 0.05) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
    m.receiveShadow = true; g.add(m); return m;
  }
  function dashLine(x0, z0, x1, z1, mat) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(len / 16);
    for (let i = 0; i < n; i += 2) {
      const t0 = i / n, t1 = (i + 0.5) / n;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0;
      const bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const seg = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, seg), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.atan2(bx - ax, bz - az);
      m.position.set((ax + bx) / 2, 0.12, (az + bz) / 2);
      g.add(m);
    }
  }
  for (const z of ROAD_Z) {
    roadPlane(CFG.WORLD_W, CFG.ROAD_W + 26, 0, z, walkMat, 0.03);
    roadPlane(CFG.WORLD_W, CFG.ROAD_W, 0, z, roadMat);
    dashLine(-1500, z, 1400, z, lineYellow);
  }
  for (const x of ROAD_X) {
    roadPlane(CFG.ROAD_W + 26, CFG.WORLD_H, x, 0, walkMat, 0.03);
    roadPlane(CFG.ROAD_W, CFG.WORLD_H, x, 0, roadMat);
    dashLine(x, -1100, x, 1100, lineYellow);
  }
  // zebra crossings at the two main junctions
  for (const [jx, jz] of [[0, 0], [400, 0], [0, 400], [800, 400]]) {
    for (let i = -3; i <= 3; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 26), lineWhite);
      s.rotation.x = -Math.PI / 2; s.position.set(jx + i * 9, 0.14, jz - 40);
      g.add(s);
    }
  }

  // ---- buildings with lit-window facades (pastel per district) ----
  const facadeTexs = [
    facadeTexture('#e89bb0', 0.35, rng), // rose pink
    facadeTexture('#7ec8e3', 0.4, rng), // sky blue
    facadeTexture('#f2c14e', 0.3, rng), // amber
    facadeTexture('#a8d8a8', 0.45, rng), // mint
    facadeTexture('#c9a0dc', 0.4, rng), // lavender
    facadeTexture('#e88f6a', 0.3, rng), // coral
    facadeTexture('#8a5a4a', 0.35, rng), // brick
    facadeTexture('#5a6a7a', 0.4, rng), // slate
  ];
  const roofMat = new THREE.MeshStandardMaterial({ color: PAL.roof, roughness: 0.9 });
  function addBuilding(x, z, w, d, h, texIdx) {
    const tex = facadeTexs[texIdx % facadeTexs.length];
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffc27a, emissiveIntensity: 0.32, roughness: 0.75,
    });
    world.facadeMats.push(mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 2.5, d + 2), roofMat);
    roof.position.set(x, h + 1, z); roof.castShadow = true; g.add(roof);
    // rooftop box (AC unit / water tank) for silhouette variety
    if (rng() < 0.6) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 6, d * 0.25),
        new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 }));
      box.position.set(x + range(rng, -w / 4, w / 4), h + 5, z + range(rng, -d / 4, d / 4));
      box.castShadow = true; g.add(box);
    }
    world.colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return b;
  }
  // blocks between roads
  const blockXs = [-1400, -1000, -600, -200, 200, 600, 1000];
  const blockZs = [-1000, -600, -200, 200, 600, 1000];
  let bi = 0;
  for (const bx of blockXs) {
    for (const bz of blockZs) {
      if (bx > 1250) continue; // beach side stays open
      if (bx === -1000 && bz === 600) continue; // park block
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 55, 95), d = range(rng, 55, 95);
        const h = range(rng, 22, rng() < 0.22 ? 95 : 55);
        const x = bx + range(rng, -90, 90), z = bz + range(rng, -90, 90);
        addBuilding(x, z, w, d, h, bi++);
      }
    }
  }
  // downtown towers (taller, near the beach road)
  for (let i = 0; i < 6; i++) {
    addBuilding(1050 + range(rng, -60, 60), -700 + i * 260, range(rng, 70, 100), range(rng, 70, 100), range(rng, 70, 110), bi++);
  }

  // ---- far skyline silhouettes (NOT grey pyramids) ----
  const skyMat = new THREE.MeshStandardMaterial({ color: 0x3a2f5e, roughness: 1 });
  const skyMat2 = new THREE.MeshStandardMaterial({ color: 0x2c2348, roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const h = range(rng, 120, 280);
    const m = new THREE.Mesh(new THREE.BoxGeometry(range(rng, 90, 170), h, range(rng, 90, 170)), i % 2 ? skyMat : skyMat2);
    const side = rng() < 0.5 ? -1 : 1;
    m.position.set(side * range(rng, 1900, 2600), h / 2, range(rng, -1700, 1700));
    g.add(m);
  }
  // a few towers behind the beach, across the water
  for (let i = 0; i < 4; i++) {
    const h = range(rng, 90, 170);
    const m = new THREE.Mesh(new THREE.BoxGeometry(110, h, 110), skyMat2);
    m.position.set(2900, h / 2, -900 + i * 600);
    g.add(m);
  }

  // ---- neon signs ----
  const glowTex = glowTexture();
  function neonSign(text, color, x, y, z, ry, w = 46) {
    const tex = neonTexture(text, color);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    world.neonMats.push(mat);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
    p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.55, depthWrite: false }));
    spr.scale.set(w * 1.4, w * 0.5, 1); spr.position.set(x, y, z); g.add(spr);
    return p;
  }
  neonSign("BENNY'S GARAGE", '#ff9a3c', -800, 16, 748, 0, 52);
  // CLUB SOLMAR faces the z=-400 road (ry=PI): the night shootout is staged
  // on that road, and with ry=0 the sign showed mirrored from the road.
  neonSign('CLUB SOLMAR', '#ff5fa2', 120, 20, -360, Math.PI, 46);
  neonSign('HOTEL MARINA', '#54e0ff', 1150, 26, -520, Math.PI / 2, 48);
  neonSign('BAR · SOLMAR', '#7dff8a', -420, 14, 360, Math.PI, 34);
  // ---- readable storefront signs (Solmar Bay's own shops) ----
  function shopSign(text, color, x, y, z, ry, w = 40) {
    const tex = shopTexture(text, color);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
  }
  shopSign('SUNSET TACOS', '#ffd23f', 220, 10, -360, Math.PI);
  shopSign('PIER PIZZA', '#ff5f6d', -200, 10, 440, 0);
  shopSign('BAY BAKERY', '#7dff8a', 620, 10, 360, Math.PI);
  shopSign('SOLMAR SURF', '#54e0ff', 1180, 10, -760, Math.PI / 2);
  shopSign('DOCK CAFE', '#ffb36b', -1180, 10, -360, Math.PI);
  shopSign('MARINA MARKET', '#c9a0dc', 420, 10, -440, 0);
  shopSign('PALM GROCER', '#a8d8a8', -620, 10, 840, Math.PI);
  shopSign('BEACH BAR', '#ff9a3c', 1180, 10, 440, Math.PI / 2);
  // ---- billboard over the beach road (faces the westbound chase camera) ----
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });
  {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 26, 8), poleMat);
    pole.position.set(1250, 13, -70); g.add(pole);
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(64, 20),
      new THREE.MeshBasicMaterial({ map: shopTexture('SOLMAR BAY', '#ffd23f'), transparent: true, side: THREE.DoubleSide }));
    bb.position.set(1250, 32, -70); bb.rotation.y = Math.PI / 2; g.add(bb);
  }
  // ---- market square pavement (the shootout plaza: paved, not empty grass) ----
  {
    const sq = new THREE.Mesh(new THREE.PlaneGeometry(460, 70),
      new THREE.MeshStandardMaterial({ color: PAL.sidewalk, roughness: 0.9 }));
    sq.rotation.x = -Math.PI / 2; sq.position.set(250, 0.04, 470);
    sq.receiveShadow = true; g.add(sq);
  }
  // ---- market stalls with striped awnings (downtown, z=400 road) ----
  {
    const stallCols = [['#ff5f6d', '#f2e8c8'], ['#54e0ff', '#f2e8c8'], ['#ffd23f', '#e05a5a'], ['#7dff8a', '#f2e8c8'], ['#c77dff', '#f2e8c8']];
    for (let i = 0; i < 5; i++) {
      const sx = 60 + i * 95, sz = 470;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }));
      counter.position.set(sx, 3, sz); counter.castShadow = true; g.add(counter);
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(26, 12),
        new THREE.MeshStandardMaterial({ map: stripeTexture(stallCols[i][0], stallCols[i][1]), roughness: 0.8, side: THREE.DoubleSide }));
      awn.position.set(sx, 12, sz); awn.rotation.x = -Math.PI / 2 + 0.35; awn.castShadow = true; g.add(awn);
      for (const px of [-11, 11]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 10, 6), poleMat);
        pole.position.set(sx + px, 5, sz + 4); g.add(pole);
      }
      // fruit crates on the counter
      for (let j = 0; j < 3; j++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 4),
          new THREE.MeshStandardMaterial({ color: [0xff8a3c, 0x7dff8a, 0xff5f6d][j], roughness: 0.8 }));
        crate.position.set(sx - 6 + j * 6, 7.2, sz); g.add(crate);
      }
    }
  }
  // garage building (orange, distinct)
  const gar = new THREE.Mesh(new THREE.BoxGeometry(120, 26, 80),
    new THREE.MeshStandardMaterial({ color: 0xd96a2e, roughness: 0.8 }));
  gar.position.set(-800, 13, 800); gar.castShadow = true; gar.receiveShadow = true; g.add(gar);
  const garRoof = new THREE.Mesh(new THREE.BoxGeometry(124, 3, 84), roofMat);
  garRoof.position.set(-800, 27.5, 800); g.add(garRoof);
  world.colliders.push({ x0: -860, z0: 760, x1: -740, z1: 840 });

  // ---- street lamps (emissive bulb + glow sprite; no real point lights) ----
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
  for (const z of ROAD_Z) {
    for (const x of [-1100, -300, 500, 1100]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 16, 6), lampPoleMat);
      pole.position.set(x, 8, z + 52); pole.castShadow = true; g.add(pole);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7, 6), lampPoleMat);
      arm.rotation.z = Math.PI / 2; arm.position.set(x - 3, 15.6, z + 52); g.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), lampBulbMat);
      bulb.position.set(x - 6, 15.2, z + 52); g.add(bulb);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.42, depthWrite: false }));
      spr.scale.set(22, 22, 1); spr.position.set(x - 6, 15.2, z + 52); g.add(spr);
      world.lampGlows.push(spr.material);
    }
  }

  // ---- palms (trunk + crown cone + hero frond planes on the beach road) ----
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 1 });
  const frondTex = frondTexture();
  const frondMat = new THREE.MeshBasicMaterial({ map: frondTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
  function palm(x, z, hero = false) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 22, 7), trunkMat);
    trunk.position.y = 11; trunk.rotation.z = range(rng, -0.06, 0.06); trunk.castShadow = true; t.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(9, 7, 7), crownMat);
    crown.position.y = 24; crown.scale.y = 0.55; crown.castShadow = true; t.add(crown);
    if (hero) {
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), frondMat);
        f.position.y = 23; f.rotation.y = (i / 3) * Math.PI; f.rotation.x = -0.5;
        t.add(f);
      }
    }
    t.position.set(x, 0, z);
    g.add(t);
  }
  for (let i = 0; i < 14; i++) palm(1380, -1000 + i * 160, i % 3 === 0);
  for (const z of ROAD_Z) for (const x of [-1000, -200, 600]) if (rng() < 0.7) palm(x + 52, z - 52);
  for (let i = 0; i < 8; i++) palm(range(rng, -1100, 900), range(rng, 500, 1100));

  // ---- beach: umbrellas + boats + beachgoers spots ----
  const umbColors = [0xff5f6d, 0xffc93c, 0x54e0ff, 0x7dff8a, 0xc77dff, 0xff9a3c];
  for (let i = 0; i < 16; i++) {
    const x = range(rng, 1420, 1540), z = range(rng, -1000, 1000);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xf0e6d2 }));
    pole.position.set(x, 3.5, z); g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: pick(rng, umbColors), roughness: 0.7 }));
    top.position.set(x, 8, z); top.castShadow = true; g.add(top);
  }
  const boatMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
  const boatMat2 = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 6), i % 2 ? boatMat : boatMat2);
    hull.position.y = 1; b.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 6), trunkMat);
    mast.position.y = 7; b.add(mast);
    b.position.set(range(rng, 1620, 1750), 0.5, range(rng, -900, 900));
    b.rotation.y = range(rng, 0, Math.PI);
    g.add(b);
  }

  // ---- sun: detailed disc + halo + flare streak + directional light with shadows ----
  // Disc: crisp granulated core (sunTexture). Halo: huge soft additive glow.
  // Streak: wide horizontal anamorphic flare. Together they read as a blazing
  // late-afternoon sun, not a flat orange circle.
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), transparent: true, opacity: 0.98, depthWrite: false, fog: false }));
  sunSpr.scale.set(430, 430, 1);
  sunSpr.position.set(-1500, 190, -350);
  scene.add(sunSpr);
  world.sunSprite = sunSpr;
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunHalo.scale.set(1500, 1500, 1);
  sunHalo.position.copy(sunSpr.position);
  scene.add(sunHalo);
  world.sunHalo = sunHalo;
  const sunStreak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTexture(), transparent: true, opacity: 0.4, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunStreak.scale.set(1700, 130, 1);
  sunStreak.position.copy(sunSpr.position);
  scene.add(sunStreak);
  world.sunStreak = sunStreak;

  const sun = new THREE.DirectionalLight(0xffb36b, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -280; sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280; sun.shadow.camera.bottom = -280;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);
  world.sunLight = sun;

  // warm fill from the east: lifts the shadow sides of cars and peds so the
  // pink sports car still reads pink from behind (camera looks into the sun).
  const fill = new THREE.DirectionalLight(0xffd9a0, 0.55);
  fill.position.set(700, 260, 200);
  scene.add(fill); scene.add(fill.target);
  world.fillLight = fill;

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3b32, 0.95);
  scene.add(hemi);
  world.hemi = hemi;

  // ---- objective marker: beam + ground ring + floating diamond ----
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 130, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 65; beam.visible = false; g.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(9, 12, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.6; ring.visible = false; g.add(ring);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(5),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 1.4 }));
  diamond.position.y = 22; diamond.visible = false; g.add(diamond);
  world.markerMesh = beam; world.objectiveRing = ring; world.objectiveDiamond = diamond;

  world.group = g;
  return world;
}

// Day <-> night lighting. f: 0 = sunset, 1 = night.
// Night sky is REAL dark blue: the dome color lerps from white to deep navy,
// so the pink-purple sunset gradient is fully suppressed at night.
const NIGHT_SKY = new THREE.Color(0x0e1633);
const DAY_SKY = new THREE.Color(0xffffff);
export function setNight(world, f) {
  world.nightF = f;
  const sun = world.sunLight;
  sun.intensity = 3.0 - f * 2.4;
  sun.color.setHex(f > 0.5 ? 0x8fa8ff : 0xffb36b);
  world.hemi.intensity = 0.95 - f * 0.55;
  world.hemi.color.setHex(f > 0.5 ? 0x2a3560 : 0xffd9a0);
  if (world.fillLight) world.fillLight.intensity = 0.55 - f * 0.43;
  for (const m of world.facadeMats) m.emissiveIntensity = 0.32 + f * 0.95;
  for (const m of world.lampGlows) m.opacity = 0.42 + f * 0.5;
  world.sunSprite.material.opacity = 0.98 - f * 0.95;
  if (world.sunHalo) world.sunHalo.material.opacity = 0.55 * (1 - f);
  if (world.sunStreak) world.sunStreak.material.opacity = 0.4 * (1 - f);
  if (world.skyDome) world.skyDome.material.color.copy(DAY_SKY).lerp(NIGHT_SKY, f);
}
