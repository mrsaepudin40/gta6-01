// Driving: arcade car physics, parked + traffic cars, collisions vs buildings.
import * as THREE from 'three';
import { CFG } from './config.js';
import { buildCar, randomCarColor } from './entities.js';
import { mulberry32, range, clamp } from './random.js';
import { audio } from './audio.js';

export function makeCar(x, z, angle, sport = false, color = null, rng = null) {
  const r = rng || mulberry32(1);
  const mesh = buildCar(color ?? randomCarColor(r, sport), sport);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  const top = CFG.CAR_MAX_SPORT;
  return {
    mesh, x, z, angle, speed: 0, sport,
    maxSpeed: sport ? top : CFG.CAR_MAX,
    hp: 100, maxHp: 100, color: color ?? 0,
    ai: null, // { route: 'x'|'z', dir, line, speed }
  };
}

function collideWorld(game, x, z) {
  for (const c of game.world.colliders) {
    if (x > c.x0 - 3 && x < c.x1 + 3 && z > c.z0 - 3 && z < c.z1 + 3) return true;
  }
  return Math.abs(x) > 1580 || Math.abs(z) > 1180;
}

export function updatePlayerCar(game, dt, input) {
  const car = game.player.inCar;
  if (!car) return;
  const p = game.player;
  const up = game.garage.levels.engine;
  const max = car.maxSpeed * (1 + 0.12 * up);
  const fwd = { x: Math.cos(car.angle), z: -Math.sin(car.angle) };
  if (input.forward) car.speed += CFG.CAR_ACCEL * dt;
  else if (input.back) car.speed -= CFG.CAR_BRAKE * dt;
  else car.speed *= Math.pow(0.4, dt);
  if (input.back && car.speed > 0) car.speed -= CFG.CAR_BRAKE * 0.7 * dt;
  car.speed = clamp(car.speed, -CFG.CAR_REVERSE, max);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (Math.abs(car.speed) > 0.5) {
    car.angle += steer * CFG.CAR_TURN * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 12, 0.3, 1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const nz = car.z - Math.sin(car.angle) * car.speed * dt;
  if (collideWorld(game, nx, nz)) {
    if (Math.abs(car.speed) > 14) { audio.crash(); car.hp -= 8; }
    car.speed *= -0.25;
  } else { car.x = nx; car.z = nz; }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  // wheel spin + body lean
  const spin = car.speed * dt * 1.6;
  for (const w of car.mesh.userData.wheels) w.rotation.z += spin;
  car.mesh.rotation.z = -steer * clamp(Math.abs(car.speed) / 40, 0, 1) * 0.05;
  // engine audio + speed state
  p.speedKmh = Math.abs(car.speed) * 3.6;
  audio.engineSet(clamp(Math.abs(car.speed) / max, 0, 1));
  // car damage smoke
  if (car.hp < 45 && game.effects) game.effects.smoke(car.x, car.z);
}

export function spawnTraffic(game) {
  const rng = mulberry32(99);
  game.traffic = [];
  for (let i = 0; i < 24; i++) {
    const horizontal = rng() < 0.5;
    const line = horizontal ? [-800, -400, 0, 400, 800][Math.floor(rng() * 5)] : [-1200, -800, -400, 0, 400, 800, 1200][Math.floor(rng() * 7)];
    const along = range(rng, -1400, 1400);
    const car = makeCar(horizontal ? along : line, horizontal ? line : along, horizontal ? 0 : Math.PI / 2, rng() < 0.18, null, rng);
    car.ai = { horizontal, line, dir: rng() < 0.5 ? 1 : -1, speed: range(rng, 9, 15) };
    game.scene.add(car.mesh);
    game.traffic.push(car);
  }
  // parked cars (stealable)
  game.parked = [];
  for (let i = 0; i < 8; i++) {
    const x = range(rng, -1200, 1200), z = [-800, -400, 0, 400, 800][i % 5] + 52;
    const car = makeCar(x, z, (rng() < 0.5 ? 0 : Math.PI) + range(rng, -0.1, 0.1), i === 2, null, rng);
    game.scene.add(car.mesh);
    game.parked.push(car);
  }
}

export function updateTraffic(game, dt) {
  for (const car of game.traffic) {
    const a = car.ai;
    const step = a.speed * a.dir * dt;
    if (a.horizontal) {
      car.x += step;
      car.angle = a.dir > 0 ? 0 : Math.PI;
      if (car.x > 1450) car.x = -1450;
      if (car.x < -1450) car.x = 1450;
    } else {
      car.z += step;
      car.angle = a.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (car.z > 1150) car.z = -1150;
      if (car.z < -1150) car.z = 1150;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.z += a.speed * dt * 1.6;
  }
}
