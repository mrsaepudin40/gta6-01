// Solmar Bay city generation: grid roads, blocks, buildings, beach, parks, markers.
import { CFG, PAL } from './config.js';
import { makeRng } from './random.js';

export function genWorld(seed) {
  const rng = makeRng(seed);
  const roadsX = [200, 600, 1000, 1400, 1800, 2200, 2600];
  const roadsY = [200, 600, 1000, 1400, 1800, 2200];
  const buildings = [];
  const parks = [];
  // Two park blocks, away from the beach.
  const parkBlocks = new Set();
  while (parkBlocks.size < 2) parkBlocks.add(rng.int(0, 5) + ':' + rng.int(0, 4));
  for (let bx = 0; bx < roadsX.length; bx++) {
    for (let by = 0; by < roadsY.length; by++) {
      const x0 = roadsX[bx] + CFG.ROAD_W / 2 + 10;
      const x1 = (bx + 1 < roadsX.length ? roadsX[bx + 1] : CFG.BEACH_X) - CFG.ROAD_W / 2 - 10;
      const y0 = roadsY[by] + CFG.ROAD_W / 2 + 10;
      const y1 = (by + 1 < roadsY.length ? roadsY[by + 1] : CFG.WORLD_H - 40) - CFG.ROAD_W / 2 - 10;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      if (parkBlocks.has(bx + ':' + by)) { parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); continue; }
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const w = rng.range(70, Math.min(150, (x1 - x0) / n - 8));
        const h = rng.range(60, Math.min(130, y1 - y0 - 8));
        const x = x0 + (i * (x1 - x0)) / n + rng.range(4, Math.max(5, (x1 - x0) / n - w - 4));
        const y = y0 + rng.range(4, Math.max(5, y1 - y0 - h - 4));
        buildings.push({ x, y, w, h, color: rng.pick(PAL.buildings), hgt: rng.int(6, 16) });
      }
    }
  }
  const world = {
    seed, roadsX, roadsY, buildings, parks,
    markers: {
      riverside: { x: 1000, y: 200, label: 'Riverside' },
      docks: { x: 2720, y: 1000, label: 'Old Docks' },
      safehouse: { x: 600, y: 1800, label: 'Safe House' },
      hideout: { x: 2200, y: 2200, label: 'Hideout' },
      hospital: { x: 1400, y: 600, label: 'Hospital' },
      package: { x: 2720, y: 1000, label: 'Package' },
    },
  };
  world.minimap = buildMinimap(world);
  return world;
}

export function isRoad(world, x, y) {
  const hw = CFG.ROAD_W / 2;
  for (const rx of world.roadsX) if (Math.abs(x - rx) <= hw) return true;
  for (const ry of world.roadsY) if (Math.abs(y - ry) <= hw) return true;
  return false;
}

export function nearestRoadCenter(world, x, y) {
  let bx = world.roadsX[0], bd = Math.abs(x - bx);
  for (const rx of world.roadsX) if (Math.abs(x - rx) < bd) { bd = Math.abs(x - rx); bx = rx; }
  let by = world.roadsY[0]; bd = Math.abs(y - by);
  for (const ry of world.roadsY) if (Math.abs(y - ry) < bd) { bd = Math.abs(y - ry); by = ry; }
  return { x: bx, y: by };
}

// Push a circle out of buildings. Returns {x, y, hit}.
export function collideCircle(world, x, y, r) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r; y = cy + (dy / d) * r;
      } else {
        y = b.y - r; // inside: push up
      }
    }
  }
  return { x, y, hit };
}

export function clampToWorld(x, y, m = 20) {
  return { x: Math.max(m, Math.min(CFG.WORLD_W - m, x)), y: Math.max(m, Math.min(CFG.WORLD_H - m, y)) };
}

function buildMinimap(world) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  const g = c.getContext('2d');
  const sx = 320 / CFG.WORLD_W, sy = 240 / CFG.WORLD_H;
  g.fillStyle = PAL.grass; g.fillRect(0, 0, 320, 240);
  g.fillStyle = PAL.sand; g.fillRect(CFG.BEACH_X * sx, 0, (CFG.WORLD_W - CFG.BEACH_X) * sx, 240);
  g.fillStyle = PAL.water; g.fillRect(CFG.WATER_X * sx, 0, (CFG.WORLD_W - CFG.WATER_X) * sx, 240);
  g.fillStyle = PAL.asphalt;
  for (const rx of world.roadsX) g.fillRect((rx - CFG.ROAD_W / 2) * sx, 0, CFG.ROAD_W * sx, 240);
  for (const ry of world.roadsY) g.fillRect(0, (ry - CFG.ROAD_W / 2) * sy, 320, CFG.ROAD_W * sy);
  for (const p of world.parks) { g.fillStyle = PAL.park; g.fillRect(p.x * sx, p.y * sy, p.w * sx, p.h * sy); }
  for (const b of world.buildings) { g.fillStyle = b.color; g.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy); }
  return c;
}

export function drawWorld(ctx, cam, world) {
  const vx0 = cam.x - CFG.VIEW_W / 2 - 60, vy0 = cam.y - CFG.VIEW_H / 2 - 60;
  const vx1 = cam.x + CFG.VIEW_W / 2 + 60, vy1 = cam.y + CFG.VIEW_H / 2 + 60;
  ctx.fillStyle = PAL.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // Beach + water (east edge).
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(Math.max(vx0, CFG.BEACH_X), vy0, Math.min(vx1, CFG.WORLD_W) - Math.max(vx0, CFG.BEACH_X), vy1 - vy0);
  ctx.fillStyle = PAL.water;
  ctx.fillRect(Math.max(vx0, CFG.WATER_X), vy0, Math.min(vx1, CFG.WORLD_W) - Math.max(vx0, CFG.WATER_X), vy1 - vy0);
  ctx.fillStyle = PAL.waterDeep;
  for (let y = Math.max(0, Math.floor(vy0 / 90)) * 90; y < vy1; y += 90) {
    ctx.fillRect(Math.max(vx0, CFG.WATER_X + 30), y + 20, 120, 3);
  }
  // Parks.
  for (const p of world.parks) {
    if (p.x > vx1 || p.x + p.w < vx0 || p.y > vy1 || p.y + p.h < vy0) continue;
    ctx.fillStyle = PAL.park; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PAL.parkTree;
    for (let i = 0; i < 5; i++) {
      const tx = p.x + 20 + ((i * 53) % Math.max(30, p.w - 40));
      const ty = p.y + 18 + ((i * 37) % Math.max(30, p.h - 36));
      ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Roads.
  ctx.fillStyle = PAL.asphalt;
  for (const rx of world.roadsX) {
    if (rx + CFG.ROAD_W / 2 < vx0 || rx - CFG.ROAD_W / 2 > vx1) continue;
    ctx.fillRect(rx - CFG.ROAD_W / 2, vy0, CFG.ROAD_W, vy1 - vy0);
  }
  for (const ry of world.roadsY) {
    if (ry + CFG.ROAD_W / 2 < vy0 || ry - CFG.ROAD_W / 2 > vy1) continue;
    ctx.fillRect(vx0, ry - CFG.ROAD_W / 2, vx1 - vx0, CFG.ROAD_W);
  }
  // Lane dashes.
  ctx.fillStyle = PAL.lane;
  for (const rx of world.roadsX) {
    if (rx < vx0 || rx > vx1) continue;
    for (let y = Math.max(vy0, 0); y < vy1; y += 46) ctx.fillRect(rx - 2, y, 4, 24);
  }
  for (const ry of world.roadsY) {
    if (ry < vy0 || ry > vy1) continue;
    for (let x = Math.max(vx0, 0); x < vx1; x += 46) ctx.fillRect(x, ry - 2, 24, 4);
  }
  // Buildings with sun shadows (light from the south-west: shadow to north-east).
  for (const b of world.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = PAL.buildingShadow;
    ctx.fillRect(b.x + b.hgt, b.y - b.hgt, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x, b.y, b.w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let wx = b.x + 10; wx < b.x + b.w - 12; wx += 22) {
      for (let wy = b.y + 10; wy < b.y + b.h - 12; wy += 24) ctx.fillRect(wx, wy, 10, 12);
    }
  }
}
