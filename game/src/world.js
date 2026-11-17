// Solmar Bay 3D city: ground texture, road grid, buildings, beach + sea, palms, lamps, markers.
import * as THREE from 'three';
import { CFG, PAL } from './config.js';
import { makeRng, clamp } from './random.js';

const ROAD_XS = [];
for (let x = -1600; x <= 1600; x += CFG.BLOCK) ROAD_XS.push(x);
const ROAD_ZS = [];
for (let z = -1200; z <= 1200; z += CFG.BLOCK) ROAD_ZS.push(z);

export function isRoad(x, z) {
  const hw = CFG.ROAD_W / 2;
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < hw) return true;
  for (const rz of ROAD_ZS) if (Math.abs(z - rz) < hw) return true;
  return false;
}

export function nearestRoadCenter(x, z) {
  let bx = ROAD_XS[0], bz = ROAD_ZS[0];
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < Math.abs(x - bx)) bx = rx;
  for (const rz of ROAD_ZS) if (Math.abs(z - rz) < Math.abs(z - bz)) bz = rz;
  return Math.abs(x - bx) < Math.abs(z - bz) ? { x: bx, z } : { x, z: bz };
}

function groundTexture(rng) {
  const W = 2048, H = 1536;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const sx = W / CFG.WORLD_W, sz = H / CFG.WORLD_H;
  const X = (x) => (x + CFG.WORLD_W / 2) * sx;
  const Z = (z) => (z + CFG.WORLD_H / 2) * sz;
  // grass
  g.fillStyle = '#95c468'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
    g.fillRect(rng.range(0, W), rng.range(0, H), rng.range(6, 26), rng.range(6, 26));
  }
  // park block (south-west)
  g.fillStyle = '#6fae56'; g.fillRect(X(-1200) + 8, Z(400) + 8, CFG.BLOCK - 16, CFG.BLOCK - 16);
  // beach sand strip
  g.fillStyle = '#f0d698'; g.fillRect(X(CFG.BEACH_X), 0, W - X(CFG.BEACH_X), H);
  g.fillStyle = '#e2c37e'; g.fillRect(X(CFG.BEACH_X), 0, 26, H);
  // roads
  for (const rx of ROAD_XS) {
    g.fillStyle = '#55565f'; g.fillRect(X(rx - CFG.ROAD_W / 2), 0, CFG.ROAD_W * sx, H);
    g.fillStyle = '#b7b0a0';
    g.fillRect(X(rx - CFG.ROAD_W / 2), 0, 5, H);
    g.fillRect(X(rx + CFG.ROAD_W / 2) - 5, 0, 5, H);
  }
  for (const rz of ROAD_ZS) {
    g.fillStyle = '#55565f'; g.fillRect(0, Z(rz - CFG.ROAD_W / 2), X(CFG.BEACH_X), CFG.ROAD_W * sz);
    g.fillStyle = '#b7b0a0';
    g.fillRect(0, Z(rz - CFG.ROAD_W / 2), X(CFG.BEACH_X), 5);
    g.fillRect(0, Z(rz + CFG.ROAD_W / 2) - 5, X(CFG.BEACH_X), 5);
  }
  // lane dashes — thin, so they read as dashes, not a solid band
  g.fillStyle = '#d9d9c9';
  for (const rx of ROAD_XS) for (let z = -1200; z < 1200; z += 60) g.fillRect(X(rx) - 1, Z(z), 2, 14);
  for (const rz of ROAD_ZS) for (let x = -1600; x < CFG.BEACH_X; x += 60) g.fillRect(X(x), Z(rz) - 1, 14, 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makePalm(rng) {
  const grp = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b46 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8a4a });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
  trunk.position.y = 3.5; trunk.rotation.z = rng.range(-0.08, 0.08);
  grp.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.6, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.6, 7.6, Math.sin(a) * 1.6);
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    leaf.scale.set(1, 1, 0.28);
    grp.add(leaf);
  }
  return grp;
}

export function buildWorld(scene) {
  const rng = makeRng(CFG.WORLD_SEED);
  const group = new THREE.Group();
  const colliders = [];
  const buildings = []; // {x,z,w,d,h,color} for minimap
  const markers = {
    riverside: { x: -1200, z: 800 },
    docks: { x: -1600, z: -800 },
    package: { x: -1600, z: -800 },
    safehouse: { x: 400, z: 1200 },
    hideout: { x: -400, z: -1200 },
    garage: { x: -800, z: 400 },
    beach: { x: 1200, z: 0 },
    bridge: { x: 1200, z: -1200 },
  };

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.WORLD_W, CFG.WORLD_H),
    new THREE.MeshLambertMaterial({ map: groundTexture(rng) })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // sea (east of the beach)
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(700, CFG.WORLD_H + 600),
    new THREE.MeshPhongMaterial({ color: PAL.water, shininess: 120, specular: 0xffd9a0, transparent: true, opacity: 0.94 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CFG.WATER_X + 350, 0.4, 0);
  group.add(sea);

  // sunset bridge deck over the water (NE)
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(320, 2, 60),
    new THREE.MeshLambertMaterial({ color: 0x8a6b46 })
  );
  bridge.position.set(CFG.WATER_X + 130, 3, -1200);
  group.add(bridge);
  const bridgeRail = new THREE.Mesh(
    new THREE.BoxGeometry(320, 3, 2),
    new THREE.MeshLambertMaterial({ color: 0xffd23f })
  );
  bridgeRail.position.set(CFG.WATER_X + 130, 5.5, -1172);
  group.add(bridgeRail);

  // buildings per block — denser + taller skyline, materials shared by color
  // so the extra meshes stay cheap to render.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const matCache = new Map();
  const matFor = (color) => {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
    return matCache.get(color);
  };
  const roofMat = new THREE.MeshLambertMaterial({ color: PAL.roof });
  const windowSpots = []; // {x,y,z,ry} lit-window quads, shown only at night
  for (let bx = -1600; bx < 1600; bx += CFG.BLOCK) {
    for (let bz = -1200; bz < 1200; bz += CFG.BLOCK) {
      const cx = bx + CFG.BLOCK / 2, cz = bz + CFG.BLOCK / 2;
      if (cx > CFG.BEACH_X - 100) continue; // beach: no buildings
      if (bx === -1200 && bz === 400) continue; // park block
      if (Math.abs(cx - markers.garage.x) < 220 && Math.abs(cz - markers.garage.z) < 220) continue; // garage lot
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) {
        const w = rng.range(55, 120), d = rng.range(55, 120);
        const h = rng.range(18, 95);
        const x = cx + rng.range(-90, 90), z = cz + rng.range(-90, 90);
        const color = rng.pick(PAL.buildings);
        const b = new THREE.Mesh(boxGeo, matFor(color));
        b.scale.set(w, h, d);
        b.position.set(x, h / 2, z);
        group.add(b);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 2, 1.6, d + 2);
        roof.position.set(x, h + 0.8, z);
        group.add(roof);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        buildings.push({ x, z, w, d, h, color });
        // lit windows on both long faces for taller buildings
        if (h > 30 && windowSpots.length < 600) {
          const rows = Math.min(6, Math.floor(h / 14));
          const cols = Math.min(5, Math.floor(w / 20));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (!rng.chance(0.6)) continue;
              const wx = x - ((cols - 1) * 18) / 2 + c * 18;
              const wy = 10 + r * 13;
              windowSpots.push({ x: wx, y: wy, z: z + d / 2 + 0.4, ry: 0 });
              windowSpots.push({ x: wx, y: wy, z: z - d / 2 - 0.4, ry: Math.PI });
            }
          }
        }
      }
    }
  }
  // one instanced mesh for all lit windows — visible only at night
  let windowsMesh = null;
  let windowsDayMesh = null;
  if (windowSpots.length > 0) {
    const winGeo = new THREE.PlaneGeometry(4.5, 6);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    windowsMesh = new THREE.InstancedMesh(winGeo, winMat, windowSpots.length);
    const dummy = new THREE.Object3D();
    windowSpots.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.ry, 0);
      dummy.updateMatrix();
      windowsMesh.setMatrixAt(i, dummy.matrix);
    });
    windowsMesh.visible = false;
    group.add(windowsMesh);
    // same windows as pale sky-glass by day, so towers are not flat boxes
    const dayMat = new THREE.MeshBasicMaterial({ color: 0x9fb8cc });
    windowsDayMesh = new THREE.InstancedMesh(winGeo, dayMat, windowSpots.length);
    windowSpots.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.ry, 0);
      dummy.updateMatrix();
      windowsDayMesh.setMatrixAt(i, dummy.matrix);
    });
    group.add(windowsDayMesh);
  }

  // Benny's Garage — distinct orange-roof building + sign + beacon
  const garage = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd95f4b }));
  garage.scale.set(130, 22, 90);
  garage.position.set(markers.garage.x, 11, markers.garage.z);
  group.add(garage);
  const garageRoof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xff8c1a }));
  garageRoof.scale.set(134, 2, 94);
  garageRoof.position.set(markers.garage.x, 23, markers.garage.z);
  group.add(garageRoof);
  colliders.push({ minX: markers.garage.x - 65, maxX: markers.garage.x + 65, minZ: markers.garage.z - 45, maxZ: markers.garage.z + 45 });
  buildings.push({ x: markers.garage.x, z: markers.garage.z, w: 130, d: 90, h: 22, color: 0xd95f4b });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 8), beaconMat);
  beacon.position.set(markers.garage.x, 30, markers.garage.z - 60);
  group.add(beacon);

  // palms along the beach + scattered
  const palmPositions = [];
  for (let z = -1100; z <= 1100; z += 110) palmPositions.push([CFG.BEACH_X - 40 + rng.range(-15, 15), z]);
  for (let i = 0; i < 40; i++) palmPositions.push([rng.range(-1500, 1300), rng.range(-1100, 1100)]);
  for (const [x, z] of palmPositions) {
    if (isRoad(x, z)) continue;
    const p = makePalm(rng);
    p.position.set(x, 0, z);
    p.rotation.y = rng.range(0, Math.PI * 2);
    group.add(p);
  }

  // street lamps at intersections
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lampBulbs = [];
  for (const rx of ROAD_XS) for (const rz of ROAD_ZS) {
    if (rx > CFG.BEACH_X - 100) continue;
    if (rng.chance(0.35)) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 11, 6), lampMat);
    pole.position.set(rx + CFG.ROAD_W / 2 + 4, 5.5, rz + CFG.ROAD_W / 2 + 4);
    group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), bulbMat);
    bulb.position.set(rx + CFG.ROAD_W / 2 + 4, 11.4, rz + CFG.ROAD_W / 2 + 4);
    group.add(bulb);
    lampBulbs.push(bulb);
  }

  // beach umbrellas — bright cones on poles, lined up on the sand
  const umbrellaColors = [0xff5a5a, 0xffd23f, 0x3fa7d6, 0x7fb069, 0xff8c1a, 0xc77dff];
  const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, 7, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xf0e6d2 });
  const canopyGeo = new THREE.ConeGeometry(7, 3, 8);
  for (let i = 0; i < 16; i++) {
    const ux = CFG.BEACH_X + 60 + rng.range(0, 90);
    const uz = -1000 + i * 130 + rng.range(-20, 20);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(ux, 3.5, uz);
    group.add(pole);
    const canopy = new THREE.Mesh(canopyGeo, matFor(umbrellaColors[i % umbrellaColors.length]));
    canopy.position.set(ux, 8.2, uz);
    group.add(canopy);
  }

  // market stalls on the beach promenade — canopy + table + red/blue crates
  const stallSpots = [[1350, -260], [1350, 180], [1350, 620]];
  const stallCanopyGeo = new THREE.BoxGeometry(26, 1.2, 18);
  const stallTableGeo = new THREE.BoxGeometry(22, 3, 12);
  const stallTableMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const stallPoleGeo = new THREE.CylinderGeometry(0.4, 0.4, 9, 6);
  const stallPoleMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  for (let s = 0; s < stallSpots.length; s++) {
    const [sx, sz] = stallSpots[s];
    const canopy = new THREE.Mesh(stallCanopyGeo, matFor(s % 2 === 0 ? 0xff5a5a : 0x3fa7d6));
    canopy.position.set(sx, 9.5, sz);
    group.add(canopy);
    for (const [ox, oz] of [[-11, -7], [11, -7], [-11, 7], [11, 7]]) {
      const p = new THREE.Mesh(stallPoleGeo, stallPoleMat);
      p.position.set(sx + ox, 4.5, sz + oz);
      group.add(p);
    }
    const table = new THREE.Mesh(stallTableGeo, stallTableMat);
    table.position.set(sx, 2.2, sz);
    group.add(table);
    for (let c = 0; c < 4; c++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), c % 2 === 0 ? new THREE.MeshLambertMaterial({ color: 0xd93a3a }) : new THREE.MeshLambertMaterial({ color: 0x2f6df6 }));
      const cs = rng.range(2.2, 3);
      crate.scale.set(cs, cs, cs);
      crate.position.set(sx - 8 + c * 5.5, 3.7 + cs / 2, sz + rng.range(-2, 2));
      group.add(crate);
    }
  }

  // mountains on the far horizon — pale and hazy, like the reference
  const mountainMat = new THREE.MeshLambertMaterial({ color: 0x9fb4c8 });
  const mountainMat2 = new THREE.MeshLambertMaterial({ color: 0x8fa8bc });
  const mountainSpots = [
    [-3400, -1200, 340, 800], [-3200, 300, 420, 950], [-3400, 1500, 320, 750],
    [-1600, -3200, 380, 900], [400, -3300, 320, 800], [2200, -3200, 360, 850],
  ];
  for (let i = 0; i < mountainSpots.length; i++) {
    const [mx, mz, mh, mr] = mountainSpots[i];
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), i % 2 === 0 ? mountainMat : mountainMat2);
    mtn.position.set(mx, mh / 2 - 10, mz);
    group.add(mtn);
  }

  // mid-ground props: bushes + crates fill the wide grass between blocks
  const bushGeo = new THREE.SphereGeometry(1, 7, 5);
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  const crateGeo = new THREE.BoxGeometry(1, 1, 1);
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x9a7b4f });
  for (let i = 0; i < 200; i++) {
    const x = rng.range(-1500, 1300), z = rng.range(-1100, 1100);
    if (isRoad(x, z)) continue;
    if (Math.abs(x - markers.garage.x) < 220 && Math.abs(z - markers.garage.z) < 220) continue;
    if (rng.chance(0.55)) {
      const s = rng.range(1.5, 3.5);
      const b = new THREE.Mesh(bushGeo, bushMat);
      b.scale.set(s, s * 0.7, s);
      b.position.set(x, s * 0.45, z);
      group.add(b);
    } else {
      const s = rng.range(1.2, 2.4);
      const c = new THREE.Mesh(crateGeo, crateMat);
      c.scale.set(s, s, s);
      c.position.set(x, s / 2, z);
      c.rotation.y = rng.range(0, Math.PI);
      group.add(c);
      colliders.push({ minX: x - s / 2, maxX: x + s / 2, minZ: z - s / 2, maxZ: z + s / 2 });
    }
  }

  // mission marker beacon (bright yellow pillar, moved by missions.js)
  const markerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.5, 120, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: PAL.marker, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
  );
  markerMesh.position.set(markers.riverside.x, 60, markers.riverside.z);
  group.add(markerMesh);

  // objective ring on the ground + floating diamond above the target
  const objectiveRing = new THREE.Mesh(
    new THREE.RingGeometry(11, 16, 32),
    new THREE.MeshBasicMaterial({ color: PAL.marker, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  objectiveRing.rotation.x = -Math.PI / 2;
  objectiveRing.position.set(markers.riverside.x, 0.6, markers.riverside.z);
  group.add(objectiveRing);
  const objectiveDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(6),
    new THREE.MeshBasicMaterial({ color: 0xffd23f })
  );
  objectiveDiamond.position.set(markers.riverside.x, 20, markers.riverside.z);
  group.add(objectiveDiamond);

  scene.add(group);
  return { group, markers, colliders, buildings, beacon, markerMesh, objectiveRing, objectiveDiamond, lampBulbs, windowsMesh, windowsDayMesh, stalls: stallSpots };
}

export function clampToWorld(x, z) {
  return {
    x: clamp(x, -CFG.WORLD_W / 2 + 20, CFG.WORLD_W / 2 - 20),
    z: clamp(z, -CFG.WORLD_H / 2 + 20, CFG.WORLD_H / 2 - 20),
  };
}

// Push a circle (x,z,r) out of building colliders. Returns corrected {x,z}.
export function collideCircle(world, x, z, r) {
  for (const c of world.colliders) {
    const cx = clamp(x, c.minX, c.maxX);
    const cz = clamp(z, c.minZ, c.maxZ);
    const dx = x - cx, dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // center inside the box: push out along the smallest penetration axis
        const pl = x - (c.minX - r), pr = (c.maxX + r) - x;
        const pt = z - (c.minZ - r), pb = (c.maxZ + r) - z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) x = c.minX - r;
        else if (m === pr) x = c.maxX + r;
        else if (m === pt) z = c.minZ - r;
        else z = c.maxZ + r;
      }
    }
  }
  return clampToWorld(x, z);
}
