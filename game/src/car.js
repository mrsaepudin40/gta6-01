// Arcade car physics: accel/brake/reverse, steering that scales with speed, wheel spin.
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, angLerp } from './random.js';
import { collideCircle } from './world.js';

export function makeCarState(x, z, heading, opts = {}) {
  return {
    x, z, heading, speed: 0,
    max: opts.max || CFG.CAR_MAX,
    accel: opts.accel || CFG.CAR_ACCEL,
    sport: !!opts.sport,
    hp: 100, maxHp: 100,
    mesh: opts.mesh || null,
    kind: opts.kind || 'sedan',
    steer: 0,
  };
}

export function driveCar(car, input, dt, world, upgrades) {
  const max = car.max * (1 + 0.12 * (upgrades?.engine || 0));
  const accel = car.accel * (1 + 0.12 * (upgrades?.engine || 0));
  const fwd = input.forward, back = input.back;
  if (fwd) car.speed += accel * dt;
  else if (back) {
    if (car.speed > 0.5) car.speed -= CFG.CAR_BRAKE * dt;
    else car.speed -= accel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 14 * dt);
  }
  car.speed = clamp(car.speed, -CFG.CAR_REVERSE, max);
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer = angLerp(car.steer, steerTarget, Math.min(1, dt * 8));
  const turnRate = CFG.CAR_TURN * clamp(Math.abs(car.speed) / 14, 0, 1);
  car.heading += car.steer * turnRate * Math.sign(car.speed) * dt;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const c = collideCircle(world, nx, nz, 2.2);
  if (c.x !== nx || c.z !== nz) car.speed *= 0.55; // bumped a building
  car.x = c.x; car.z = c.z;
  if (car.mesh) {
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.42;
    for (const w of car.mesh.userData.wheels || []) w.rotation.x += spin;
    const front = car.mesh.userData.wheels || [];
    if (front[0]) front[0].rotation.y = car.steer * 0.4;
    if (front[1]) front[1].rotation.y = car.steer * 0.4;
  }
}

export function carForward(car) {
  return new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
}
