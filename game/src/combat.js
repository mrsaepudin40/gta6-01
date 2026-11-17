// Combat: hitscan shooting with tracers + muzzle flash, punch, enemies,
// Rico's showdown crew. Tracers are thin lines that read on dark asphalt.
import * as THREE from 'three';
import { CFG } from './config.js';
import { buildPed } from './entities.js';
import { dist2d } from './random.js';
import { audio } from './audio.js';
import { addHeat } from './police.js';

export function newCombatState() {
  return { tracers: [], flashT: 0, fireT: 0, punchT: 0, enemyFireT: 0 };
}

function tracerLine(game, from, to, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  game.scene.add(line);
  game.combat.tracers.push({ line, t: 0.4 });
}

export function fireShot(game, from, dir, opts = {}) {
  const p = game.player;
  if (p.ammo <= 0) { p.ammo = 0; reload(game); return; }
  p.ammo -= 1;
  audio.shot();
  game.combat.flashT = 0.09;
  const end = new THREE.Vector3(from.x + dir.x * CFG.BULLET_RANGE, 2.2, from.z + dir.z * CFG.BULLET_RANGE);
  // hit the first enemy near the line
  let hit = null, hitD = CFG.BULLET_RANGE;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const dx = e.x - from.x, dz = e.z - from.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > hitD) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 3.5) { hit = e; hitD = along; }
  }
  if (hit) {
    end.set(hit.x, 2.2, hit.z);
    // shot-scene enemies are invulnerable: tracers + flash still show, nobody dies
    if (!hit.invuln) {
      hit.hp -= CFG.SHOT_DMG;
      if (hit.hp <= 0) { hit.dead = true; hit.mesh.visible = false; }
    }
  }
  tracerLine(game, new THREE.Vector3(from.x, 2.4, from.z), end, opts.color ?? 0xffe066);
  if (!opts.silent) addHeat(game, 2);
}

export function enemyShot(game, e) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const d = dist2d(e.x, e.z, px, pz);
  if (d > 55) return;
  const dir = { x: (px - e.x) / d, z: (pz - e.z) / d };
  const from = new THREE.Vector3(e.x, 2.4, e.z);
  const end = new THREE.Vector3(px, 2.0, pz);
  tracerLine(game, from, end, 0xff9040);
  audio.shot();
  if (p.inCar) { p.inCar.hp -= 2; if (p.inCar.hp <= 0) game.state = 'wasted'; }
  else { p.hp -= 2; if (p.hp <= 0) game.state = 'wasted'; }
}

export function reload(game) {
  const p = game.player;
  const need = 24 - p.ammo;
  const take = Math.min(need, p.reserve);
  p.ammo += take; p.reserve -= take;
  if (p.reserve <= 0) p.reserve = 48; // arcade: reserve refills at the docks
}

export function punch(game) {
  const p = game.player;
  if (game.combat.punchT > 0) return;
  game.combat.punchT = 0.4;
  audio.punch();
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  for (const e of game.enemies) {
    if (!e.dead && dist2d(px, pz, e.x, e.z) < CFG.PUNCH_RANGE) {
      e.hp -= CFG.PUNCH_DMG;
      if (e.hp <= 0) { e.dead = true; e.mesh.visible = false; }
    }
  }
  for (const cop of game.police.footCops) {
    if (dist2d(px, pz, cop.x, cop.z) < CFG.PUNCH_RANGE) {
      cop.hp -= CFG.PUNCH_DMG;
      if (cop.hp <= 0) { cop.mesh.visible = false; game.police.footCops = game.police.footCops.filter((c) => c !== cop); }
    }
  }
  addHeat(game, 4);
}

export function spawnShowdownCrew(game) {
  const defs = [
    { x: -1420, z: -820, hp: 100, rico: false },
    { x: -1380, z: -780, hp: 100, rico: false },
    { x: -1440, z: -760, hp: 100, rico: false },
    { x: -1400, z: -840, hp: 100, rico: false },
    { x: -1360, z: -820, hp: 100, rico: false },
    { x: -1410, z: -800, hp: 220, rico: true },
  ];
  for (const d of defs) {
    const mesh = buildPed(d.rico ? 0xe05a5a : 0x8a5a3a);
    mesh.position.set(d.x, 0, d.z);
    game.scene.add(mesh);
    game.enemies.push({ mesh, x: d.x, z: d.z, hp: d.hp, dead: false, rico: d.rico, fireT: 0.6 + Math.random() });
  }
}

export function updateCombat(game, dt) {
  const c = game.combat;
  if (c.flashT > 0) c.flashT -= dt;
  if (c.punchT > 0) c.punchT -= dt;
  if (c.fireT > 0) c.fireT -= dt;
  // fade tracers
  for (const t of c.tracers) {
    t.t -= dt;
    t.line.material.opacity = Math.max(0, t.t / 0.4);
  }
  while (c.tracers.length && c.tracers[0].t <= 0) {
    const t = c.tracers.shift();
    game.scene.remove(t.line);
    t.line.geometry.dispose();
  }
  // enemies: walk at the player + shoot back
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = dist2d(e.x, e.z, px, pz);
    if (d > 6) {
      const a = Math.atan2(-(pz - e.z), px - e.x);
      e.x += Math.cos(a) * 3.4 * dt;
      e.z -= Math.sin(a) * 3.4 * dt;
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(px - e.x, pz - e.z);
    }
    e.fireT -= dt;
    if (e.fireT <= 0 && d < 55) { enemyShot(game, e); e.fireT = 0.9 + Math.random() * 0.6; }
  }
  // peds flee gunfire
  for (const ped of game.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.x += ped.fx * 5 * dt;
      ped.z += ped.fz * 5 * dt;
      ped.mesh.position.set(ped.x, 0, ped.z);
    }
  }
}
