// Player: on-foot third-person + enter/exit/steal cars (E).
import * as THREE from 'three';
import { CFG, PAL } from './config.js';
import { makePedMesh, makeCarMesh } from './entities.js';
import { makeCarState } from './car.js';
import { clamp, dist2d, angLerp } from './random.js';
import { collideCircle } from './world.js';

export function makePlayer(scene) {
  const mesh = makePedMesh(PAL.player);
  scene.add(mesh);
  return {
    x: 0, z: 0, heading: 0, hp: CFG.PLAYER_HP, money: 0,
    mesh, inCar: null, speed: 0,
  };
}

export function updatePlayerOnFoot(p, input, dt, world, camYaw) {
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let mz = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len; mz /= len;
    // move relative to camera yaw
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    const want = Math.atan2(wx, wz);
    p.heading = angLerp(p.heading, want, Math.min(1, dt * 10));
    p.x += wx * CFG.PLAYER_SPEED * dt;
    p.z += wz * CFG.PLAYER_SPEED * dt;
    p.speed = CFG.PLAYER_SPEED;
  } else p.speed = 0;
  const c = collideCircle(world, p.x, p.z, 0.8);
  p.x = c.x; p.z = c.z;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
  const t2 = performance.now() * 0.01;
  const legs = p.mesh.userData.legs || [];
  const sw = p.speed > 0 ? 0.6 : 0;
  if (legs[0]) legs[0].rotation.x = Math.sin(t2) * sw;
  if (legs[1]) legs[1].rotation.x = -Math.sin(t2) * sw;
}

// Find the nearest enterable car (parked or traffic) within 5 units.
// Returns { ref, parked, traffic } or null.
export function nearestCar(p, traffic) {
  let best = null, bd = 5;
  for (const c of traffic.parked) {
    if (c.taken) continue;
    const d = dist2d(p.x, p.z, c.x, c.z);
    if (d < bd) { bd = d; best = { ref: c, parked: true, traffic: false }; }
  }
  for (const c of traffic.cars) {
    const d = dist2d(p.x, p.z, c.x, c.z);
    if (d < bd) { bd = d; best = { ref: c, parked: false, traffic: true }; }
  }
  return best;
}

export function enterCar(game, found) {
  const p = game.player;
  const car = found.ref;
  let st;
  if (found.parked) {
    car.taken = true;
    st = makeCarState(car.x, car.z, car.heading, { mesh: car.mesh, sport: car.sport, max: car.sport ? CFG.CAR_MAX_SPORT : CFG.CAR_MAX, kind: car.kind });
  } else if (found.traffic) {
    // steal a traffic car: remove it from the loop
    const idx = game.traffic.cars.indexOf(car);
    if (idx >= 0) game.traffic.cars.splice(idx, 1);
    st = makeCarState(car.x, car.z, car.heading, { mesh: car.mesh, max: CFG.CAR_MAX, kind: car.kind || 'sedan' });
  } else return;
  st.hp = 100; st.maxHp = 100;
  p.inCar = st;
  p.mesh.visible = false;
  return st;
}

export function exitCar(game) {
  const p = game.player;
  if (!p.inCar) return;
  const car = p.inCar;
  // leave the car as a parked car in the world
  const parked = { x: car.x, z: car.z, heading: car.heading, mesh: car.mesh, sport: car.sport, kind: car.kind, taken: true };
  game.traffic.parked.push(parked);
  p.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  p.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  p.inCar = null;
}
