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
  // Visible muzzle-flash shape: a point light alone does not read as a
  // burst in a still frame (day sun washes it out), so add a bright cone
  // at the muzzle that is shown while the tracer is visible.
  const flashGeo = new THREE.ConeGeometry(0.32, 1.2, 8);
  flashGeo.rotateX(Math.PI / 2); // point along +Z, then yaw by heading
  const flashMesh = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  flashMesh.visible = false;
  scene.add(flashMesh);
  // Enemy return fire: one shared tracer + light, re-aimed per shot.
  const enemyTracerMat = new THREE.LineBasicMaterial({ color: 0xff9f43, transparent: true, opacity: 0.9 });
  const enemyTracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const enemyTracer = new THREE.Line(enemyTracerGeo, enemyTracerMat);
  enemyTracer.visible = false;
  scene.add(enemyTracer);
  const enemyFlash = new THREE.PointLight(0xff9f43, 0, 14);
  scene.add(enemyFlash);
  return {
    ammo: 12, reserve: 24, cooldown: 0, punchT: 0,
    tracer, tracerT: 0, flash, flashMesh,
    enemyTracer, enemyTracerT: 0, enemyFlash,
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
  // Shootout scene: partial-mag reloads keep the HUD ammo visibly reduced
  // (8 instead of 12) for the whole capture window.
  if (c.ammo <= 0) { c.ammo = game.shotMode === 'shootout' ? 8 : 12; c.reserve = Math.max(0, c.reserve - 12); c.cooldown = 0.6; audio.denied(); return; }
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
  // Shootout scene: tracer + flash outlast the fire interval (0.18s), so a
  // still frame taken at any moment catches the gunfire mid-burst.
  c.tracerT = game.shotMode === 'shootout' ? 0.4 : 0.07;
  c.flash.position.set(m.x, m.y, m.z);
  c.flash.intensity = 60;
  c.flashMesh.position.set(m.x + dir.x * 1.5, 1.25, m.z + dir.z * 1.5);
  c.flashMesh.rotation.y = m.heading;
  c.flashMesh.scale.setScalar(0.6 + Math.random() * 0.3);
  c.flashMesh.visible = true;
  if (best) {
    // scare nearby peds
    game.gunshotAt = { x: end.x, z: end.z };
    game.gunshotT = 0.1;
  }
  if (bestEnemy) damageEnemy(game, bestEnemy, CFG.SHOT_DMG);
  // Shootout scene: heat is pinned at 3 stars by updatePolice, so shots
  // must not push it up (that would also spawn extra cop cars).
  if (game.shotMode !== 'shootout') game.addHeat && game.addHeat(6);
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
  if (c.tracerT > 0) { c.tracerT -= dt; if (c.tracerT <= 0) { c.tracer.visible = false; c.flashMesh.visible = false; } }
  // Shootout scene: flash decays slower than the fire interval, so the
  // muzzle burst is lit in every captured frame.
  const decay = game.shotMode === 'shootout' ? 200 : 900;
  if (c.flash.intensity > 0) c.flash.intensity = Math.max(0, c.flash.intensity - dt * decay);
  if (c.enemyTracerT > 0) { c.enemyTracerT -= dt; if (c.enemyTracerT <= 0) c.enemyTracer.visible = false; }
  if (c.enemyFlash.intensity > 0) c.enemyFlash.intensity = Math.max(0, c.enemyFlash.intensity - dt * (game.shotMode === 'shootout' ? 150 : 900));
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
    // walk toward the player, stop at punching range — unless hold is set
    // (shootout scene: the crew stays behind police-car cover).
    if (!e.hold && d > 3) {
      const want = Math.atan2(px - e.x, pz - e.z);
      e.heading = want;
      const sp = e.boss ? 3.0 : 3.8;
      e.x += Math.sin(want) * sp * dt;
      e.z += Math.cos(want) * sp * dt;
    }
    e.shootT -= dt;
    // Shootout scene: the crew fires from cover at bullet range (not just
    // 22u), faster, with a visible tracer — but soft damage so Jax cannot
    // be WASTED mid-capture.
    const range = game.shotMode === 'shootout' ? CFG.BULLET_RANGE : 22;
    if (d < range && e.shootT <= 0) {
      e.shootT = game.shotMode === 'shootout' ? 0.9 : (e.boss ? 1.4 : 2.0);
      p.hp -= game.shotMode === 'shootout' ? 2 : (e.boss ? 6 : 4);
      audio.shot();
      if (game.shotMode === 'shootout') {
        const c = game.combat;
        const mx = e.x + Math.sin(e.heading) * 2, mz = e.z + Math.cos(e.heading) * 2;
        const pos = c.enemyTracer.geometry.attributes.position;
        pos.setXYZ(0, mx, 1.5, mz);
        pos.setXYZ(1, px, 1.2, pz);
        pos.needsUpdate = true;
        c.enemyTracer.visible = true;
        c.enemyTracerT = 0.5;
        c.enemyFlash.position.set(mx, 1.5, mz);
        c.enemyFlash.intensity = 40;
      }
      game.addHeat && game.addHeat(2);
    }
    if (e.mesh) { e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = e.heading; }
  }
}
