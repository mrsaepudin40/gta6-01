// Wanted level, police cars, arrests (BUSTED).
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeCopCarMesh, makeHeliMesh } from './entities.js';
import { makeCarState, driveCar } from './car.js';
import { angLerp, dist2d, clamp } from './random.js';
import { nearestRoadCenter } from './world.js';
import { audio } from './audio.js';

export function makePolice(scene) {
  return { heat: 0, cars: [], bustT: 0, scene, heli: null };
}

export function starsOf(heat) { return Math.min(5, Math.floor(heat / 20)); }

export function addHeat(game, n) {
  game.police.heat = clamp(game.police.heat + n, 0, 100);
  game.bestWanted = Math.max(game.bestWanted, starsOf(game.police.heat));
}

function spawnCopCar(game) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const a = Math.random() * Math.PI * 2;
  const sp = nearestRoadCenter(px + Math.sin(a) * 120, pz + Math.cos(a) * 120);
  const mesh = makeCopCarMesh();
  game.police.scene.add(mesh);
  const st = makeCarState(sp.x, sp.z, 0, { mesh, max: CFG.CAR_MAX + 2, accel: CFG.CAR_ACCEL + 6, kind: 'police' });
  game.police.cars.push(st);
  return st;
}

export function updatePolice(game, dt) {
  const pol = game.police;
  const p = game.player;
  const stars = starsOf(pol.heat);
  // heat slowly decays when no crime recently
  pol.heat = Math.max(0, pol.heat - dt * (stars === 0 ? 0 : 0.9));
  // Shootout scene: pin exactly 3 stars (heat decay would drop it to 2,
  // and Jax's shots must not push it up and spawn extra cop cars).
  if (game.shotMode === 'shootout') pol.heat = 60;
  const want = stars === 0 ? 0 : Math.min(CFG.COP_MAX_CARS, stars);
  while (pol.cars.length < want) spawnCopCar(game);
  while (pol.cars.length > want) {
    const c = pol.cars.pop();
    pol.scene.remove(c.mesh);
  }
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const pSpeed = p.inCar ? Math.abs(p.inCar.speed) : 0;
  // Shot mode: police hold formation (convoy) so the cover always shows the chase.
  if (game.shotMode === 'chase') {
    for (const c of pol.cars) {
      c.heading = Math.PI;
      c.speed = pSpeed;
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      if (c.mesh) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; }
    }
    audio.siren(true);
    audio.updateSiren(dt);
    return;
  }
  // Shot mode: cops hold their cover positions for the shootout scene —
  // no driving in, no BUSTED (the frame must stay a firefight).
  if (game.shotMode === 'shootout') {
    for (const c of pol.cars) {
      if (c.mesh) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; }
    }
    audio.siren(true);
    audio.updateSiren(dt);
    return;
  }
  for (const c of pol.cars) {
    const wantH = Math.atan2(px - c.x, pz - c.z);
    c.heading = angLerp(c.heading, wantH, Math.min(1, dt * 1.6));
    const input = { forward: true, back: false, left: false, right: false };
    let err = wantH - c.heading;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    input.left = err > 0.1; input.right = err < -0.1;
    driveCar(c, input, dt, game.world, null);
    // ram the player car
    if (p.inCar && dist2d(c.x, c.z, px, pz) < 4.5) {
      p.inCar.hp -= 14 * dt;
      if (p.inCar.hp <= 0) { p.inCar.hp = 0; }
    }
  }
  // BUSTED: a cop car sits on the player while slow/on foot
  const near = pol.cars.some((c) => dist2d(c.x, c.z, px, pz) < 5);
  if (stars > 0 && near && pSpeed < 2) {
    pol.bustT += dt;
    if (pol.bustT > 1.5) { game.state = 'busted'; audio.siren(false); audio.engine(false, 0); }
  } else pol.bustT = 0;
  // siren while wanted
  audio.siren(stars > 0 && game.state === 'playing');
  if (game.state === 'playing') audio.updateSiren(dt);
}

// Police helicopter: appears at 3+ stars, hovers above the player with a spotlight.
export function updateHeli(game, dt) {
  const pol = game.police;
  const stars = starsOf(pol.heat);
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  if (stars >= 3 && !pol.heli) {
    const mesh = makeHeliMesh();
    pol.scene.add(mesh);
    pol.heli = { mesh, x: px + 30, z: pz + 30 };
  } else if (stars < 3 && pol.heli) {
    pol.scene.remove(pol.heli.mesh);
    pol.heli = null;
  }
  const h = pol.heli;
  if (!h) return;
  // Hover AHEAD of the player (not directly overhead) and low enough to stay
  // inside the third-person camera frame — the chase shot must show it.
  // Track FAST (dt*3): at SwiftShader frame rates a slow lerp lags ~28u
  // behind a 30u/s car and the heli ends up overhead, out of frame.
  const heading = p.inCar ? p.inCar.heading : p.heading;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const tx = px + fx * 45 - fz * 12;
  const tz = pz + fz * 45 + fx * 12;
  h.x += (tx - h.x) * Math.min(1, dt * 3);
  h.z += (tz - h.z) * Math.min(1, dt * 3);
  const y = 15 + Math.sin(performance.now() * 0.0012) * 1.2;
  h.mesh.position.set(h.x, y, h.z);
  h.mesh.rotation.y = Math.atan2(px - h.x, pz - h.z);
  const rotor = h.mesh.userData.rotor;
  if (rotor) rotor.rotation.y += dt * 22;
}
