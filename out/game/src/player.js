// On-foot player: movement, camera-relative heading, enter/exit/steal cars.
import * as THREE from 'three';
import { CFG } from './config.js';
import { buildPed } from './entities.js';
import { dist2d, clamp } from './random.js';
import { audio } from './audio.js';

export function makePlayer(game) {
  const mesh = buildPed(0x37d67a);
  mesh.position.set(0, 0, 100);
  game.scene.add(mesh);
  return {
    mesh, x: 0, z: 100, angle: 0, hp: CFG.PLAYER_HP, money: 0,
    inCar: null, speedKmh: 0, ammo: 24, reserve: 48, weapon: 'PISTOL',
  };
}

export function updatePlayer(game, dt, input) {
  const p = game.player;
  if (p.inCar) return;
  let mx = 0, mz = 0;
  if (input.forward) mz -= 1;
  if (input.back) mz += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    // camera-relative: camera looks along -z of its own yaw
    const cy = game.cameraYaw;
    const fx = Math.sin(cy), fz = Math.cos(cy);
    const rx = Math.cos(cy), rz = -Math.sin(cy);
    const dx = (fx * mz + rx * mx) / len, dz = (fz * mz + rz * mx) / len;
    const nx = p.x + dx * CFG.PLAYER_SPEED * dt;
    const nz = p.z + dz * CFG.PLAYER_SPEED * dt;
    let blocked = false;
    for (const c of game.world.colliders) {
      if (nx > c.x0 - 1 && nx < c.x1 + 1 && nz > c.z0 - 1 && nz < c.z1 + 1) { blocked = true; break; }
    }
    if (!blocked && Math.abs(nx) < 1580 && Math.abs(nz) < 1180) { p.x = nx; p.z = nz; }
    p.angle = Math.atan2(dx, dz);
  }
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.angle;
  // simple walk bob
  p.mesh.position.y = len > 0 ? Math.abs(Math.sin(game.time * 10)) * 0.12 : 0;
}

function nearestCar(game, maxD) {
  const p = game.player;
  let best = null, bestD = maxD;
  for (const car of [...game.parked, ...game.traffic]) {
    const d = dist2d(p.x, p.z, car.x, car.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

export function tryEnterCar(game) {
  const p = game.player;
  const car = nearestCar(game, 7);
  if (!car) return false;
  game.parked = game.parked.filter((c) => c !== car);
  game.traffic = game.traffic.filter((c) => c !== car);
  p.inCar = car;
  p.mesh.visible = false;
  audio.engineStart(0);
  return true;
}

export function exitCar(game) {
  const p = game.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 4;
  p.z = car.z - Math.sin(car.angle + Math.PI / 2) * 4;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  audio.engineStop();
}

export function stealPrompt(game) {
  if (game.player.inCar) return null;
  return nearestCar(game, 7) ? '[E] Steal Car' : null;
}
