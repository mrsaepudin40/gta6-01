// Punch (F) + shoot (mouse click, hitscan raycast). Ammo, muzzle flash, tracers.
// Showdown enemies (Rico's crew + boss): spawn, AI, damage, death.
import * as THREE from 'three';
import { CFG } from './config.js';
import { audio } from './audio.js';
import { dist2d } from './random.js';
import { makePedMesh } from './entities.js';

export function makeCombat(scene) {
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 });
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracer = new THREE.Line(tracerGeo, tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  const flash = new THREE.PointLight(0xffe066, 0, 18);
  scene.add(flash);
  return {
    ammo: 12, reserve: 24, cooldown: 0, punchT: 0,
    tracer, tracerT: 0, flash,
  };
}

function muzzlePos(game) {
  const p = game.player;
  const x = p.inCar ? p.inCar.x : p.x;
  const z = p.inCar ? p.inCar.z : p.z;
  const h = p.inCar ? p.inCar.heading : p.heading;
  return { x: x + Math.sin(h) * 2.2, z: z + Math.cos(h) * 2.2, y: p.inCar ? 1.2 : 1.5, heading: h };
}

export function tryShoot(game) {
  const c = game.combat;
  if (c.cooldown > 0 || game.state !== 'playing') return;
  if (c.ammo <= 0) { c.ammo = 12; c.reserve = Math.max(0, c.reserve - 12); c.cooldown = 0.6; audio.denied(); return; }
  c.ammo -= 1;
  c.cooldown = CFG.FIRE_RATE;
  audio.shot();
  const m = muzzlePos(game);
  const dir = new THREE.Vector3(Math.sin(m.heading), 0, Math.cos(m.heading));
  // hitscan vs peds + showdown enemies (simple distance-to-ray test)
  let best = null, bd = CFG.BULLET_RANGE, bestEnemy = null;
  const consider = (x, z, ref) => {
    const dx = x - m.x, dz = z - m.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > bd) return;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 2.2 && along < bd) { bd = along; best = { x, z }; bestEnemy = ref || null; }
  };
  for (const ped of game.traffic.peds) consider(ped.x, ped.z, null);
  for (const e of game.enemies) if (!e.dead) consider(e.x, e.z, e);
  const end = best || { x: m.x + dir.x * CFG.BULLET_RANGE, z: m.z + dir.z * CFG.BULLET_RANGE };
  // tracer
  const pos = c.tracer.geometry.attributes.position;
  pos.setXYZ(0, m.x, m.y, m.z);
  pos.setXYZ(1, end.x, 1.2, end.z);
  pos.needsUpdate = true;
  c.tracer.visible = true;
  c.tracerT = 0.07;
  c.flash.position.set(m.x, m.y, m.z);
  c.flash.intensity = 60;
  if (best) {
    // scare nearby peds
    game.gunshotAt = { x: end.x, z: end.z };
    game.gunshotT = 0.1;
  }
  if (bestEnemy) damageEnemy(game, bestEnemy, CFG.SHOT_DMG);
  game.addHeat && game.addHeat(6);
}

export function tryPunch(game) {
  const c = game.combat;
  if (c.punchT > 0 || game.state !== 'playing') return;
  c.punchT = 0.35;
  audio.punch();
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  for (const ped of game.traffic.peds) {
    if (dist2d(px, pz, ped.x, ped.z) < CFG.PUNCH_RANGE) {
      ped.fleeT = 4;
      game.addHeat && game.addHeat(8);
    }
  }
  for (const e of game.enemies) {
    if (!e.dead && dist2d(px, pz, e.x, e.z) < CFG.PUNCH_RANGE) {
      damageEnemy(game, e, CFG.PUNCH_DMG);
      game.addHeat && game.addHeat(8);
    }
  }
}

export function updateCombat(game, dt) {
  const c = game.combat;
  if (c.cooldown > 0) c.cooldown -= dt;
  if (c.punchT > 0) c.punchT -= dt;
  if (c.tracerT > 0) { c.tracerT -= dt; if (c.tracerT <= 0) c.tracer.visible = false; }
  if (c.flash.intensity > 0) c.flash.intensity = Math.max(0, c.flash.intensity - dt * 900);
}

// ---- Showdown enemies (Rico's crew + boss) ----

export function spawnShowdownCrew(game) {
  const docks = game.world.markers.docks;
  const spots = [
    [docks.x - 60, docks.z - 40], [docks.x + 40, docks.z - 60], [docks.x + 70, docks.z + 30],
    [docks.x - 40, docks.z + 60], [docks.x - 90, docks.z + 10], [docks.x + 10, docks.z - 90],
  ];
  for (const [x, z] of spots) {
    const mesh = makePedMesh(0x8b1e1e);
    mesh.position.set(x, 0, z);
    game.scene.add(mesh);
    game.enemies.push({ x, z, heading: 0, hp: 100, maxHp: 100, boss: false, mesh, shootT: 1 + Math.random(), dead: false });
  }
  const bossMesh = makePedMesh(0x3d0c0c);
  bossMesh.scale.setScalar(1.25);
  bossMesh.position.set(docks.x, 0, docks.z - 90);
  game.scene.add(bossMesh);
  game.enemies.push({ x: docks.x, z: docks.z - 90, heading: 0, hp: 300, maxHp: 300, boss: true, mesh: bossMesh, shootT: 1.5, dead: false });
}

function killEnemy(game, e) {
  e.dead = true;
  if (e.mesh) { game.scene.remove(e.mesh); e.mesh = null; }
}

export function damageEnemy(game, e, dmg) {
  if (!e || e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0) { e.hp = 0; killEnemy(game, e); }
}

export function updateEnemies(game, dt) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.hp <= 0) { killEnemy(game, e); continue; }
    const d = dist2d(e.x, e.z, px, pz);
    // walk toward the player, stop at punching range
    if (d > 3) {
      const want = Math.atan2(px - e.x, pz - e.z);
      e.heading = want;
      const sp = e.boss ? 3.0 : 3.8;
      e.x += Math.sin(want) * sp * dt;
      e.z += Math.cos(want) * sp * dt;
    }
    e.shootT -= dt;
    if (d < 22 && e.shootT <= 0) {
      e.shootT = e.boss ? 1.4 : 2.0;
      p.hp -= e.boss ? 6 : 4;
      audio.shot();
      game.addHeat && game.addHeat(2);
    }
    if (e.mesh) { e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = e.heading; }
  }
}
