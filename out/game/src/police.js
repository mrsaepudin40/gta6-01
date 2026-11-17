// Wanted level: heat 0-100, stars 0-5, cop cars chase + ram, foot officers,
// police helicopter at 3+ stars. BUSTED when caught slow and close.
import * as THREE from 'three';
import { CFG } from './config.js';
import { buildCopCar, buildHeli, buildPed } from './entities.js';
import { dist2d, clamp } from './random.js';
import { audio } from './audio.js';

export function newPoliceState() {
  return { heat: 0, stars: 0, copCars: [], footCops: [], heli: null, sirenT: 0, bustedT: 0 };
}

export function addHeat(game, n) {
  const p = game.police;
  p.heat = clamp(p.heat + n, 0, 100);
  p.stars = Math.min(5, Math.floor(p.heat / 20));
}

export function starsOf(game) { return game.police.stars; }

function spawnCopCar(game) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const a = Math.random() * Math.PI * 2;
  const car = { mesh: buildCopCar(), x: px + Math.cos(a) * 130, z: pz + Math.sin(a) * 130, angle: 0, speed: 0 };
  car.mesh.position.set(car.x, 0, car.z);
  game.scene.add(car.mesh);
  game.police.copCars.push(car);
}

function spawnFootCop(game) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const mesh = buildPed(0x2248c8);
  const a = Math.random() * Math.PI * 2;
  const cop = { mesh, x: px + Math.cos(a) * 40, z: pz + Math.sin(a) * 40, hp: 60 };
  mesh.position.set(cop.x, 0, cop.z);
  game.scene.add(mesh);
  game.police.footCops.push(cop);
}

export function updatePolice(game, dt) {
  const pol = game.police;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const speed = p.inCar ? Math.abs(p.inCar.speed) : 0;

  // heat decays when the player is slow / hiding
  if (pol.stars > 0) {
    pol.heat = Math.max(0, pol.heat - dt * (speed > 5 ? 0.4 : 2.2));
    pol.stars = Math.min(5, Math.floor(pol.heat / 20));
  }
  // spawns
  if (pol.stars >= 1 && pol.copCars.length < Math.min(CFG.COP_MAX_CARS, pol.stars)) spawnCopCar(game);
  if (pol.stars >= 2 && pol.footCops.length < Math.min(CFG.COP_MAX_FOOT, pol.stars - 1)) spawnFootCop(game);
  if (pol.stars >= 3 && !pol.heli) {
    pol.heli = buildHeli();
    pol.heli.position.set(px + 30, 55, pz - 30);
    game.scene.add(pol.heli);
  }
  if (pol.stars < 3 && pol.heli) { game.scene.remove(pol.heli); pol.heli = null; }

  // cop cars chase + ram
  for (const car of pol.copCars) {
    const d = dist2d(car.x, car.z, px, pz);
    const target = Math.atan2(-(pz - car.z), px - car.x);
    let da = target - car.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    car.angle += clamp(da, -1.6 * dt, 1.6 * dt);
    car.speed = clamp(car.speed + 18 * dt, 0, 34);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.z -= Math.sin(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.z += car.speed * dt * 1.6;
    // lightbar flash
    const on = Math.floor(game.time * 6) % 2 === 0;
    car.mesh.userData.lightbar[0].material.color.setHex(on ? 0xff2a2a : 0x551111);
    car.mesh.userData.lightbar[1].material.color.setHex(on ? 0x112255 : 0x2a6bff);
    // ram the player car
    if (p.inCar && d < 6 && Math.abs(p.inCar.speed) < 6) {
      p.inCar.hp -= 12 * dt;
      if (p.inCar.hp <= 0) { game.state = 'wasted'; }
    }
    // busted: close + slow on foot
    if (!p.inCar && d < 5 && pol.bustedT <= 0) {
      pol.bustedT = 1.2;
    }
  }
  if (pol.bustedT > 0) {
    pol.bustedT -= dt;
    const d = pol.copCars.length ? dist2d(pol.copCars[0].x, pol.copCars[0].z, px, pz) : 99;
    if (!p.inCar && d < 6 && pol.bustedT <= 0) game.state = 'busted';
  }
  // foot cops walk toward the player
  for (const cop of pol.footCops) {
    const d = dist2d(cop.x, cop.z, px, pz);
    if (d > 2) {
      const a = Math.atan2(-(pz - cop.z), px - cop.x);
      cop.x += Math.cos(a) * 3.2 * dt;
      cop.z -= Math.sin(a) * 3.2 * dt;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = Math.atan2(px - cop.x, pz - cop.z);
    } else if (!p.inCar) {
      p.hp -= 6 * dt;
      if (p.hp <= 0) game.state = 'wasted';
    }
  }
  // helicopter hovers over the player
  if (pol.heli) {
    const h = pol.heli;
    h.position.x += (px + 18 - h.position.x) * dt * 1.2;
    h.position.z += (pz - 14 - h.position.z) * dt * 1.2;
    h.position.y = 55 + Math.sin(game.time * 1.3) * 2;
    h.rotation.y += dt * 0.4;
    for (const r of h.userData.rotors) r.rotation.y += dt * 22;
    pol.sirenT -= dt;
    if (pol.sirenT <= 0) { audio.sirenBlip(); pol.sirenT = 2.4; }
  }
  // cleanup when heat is gone
  if (pol.stars === 0) {
    for (const car of pol.copCars) game.scene.remove(car.mesh);
    for (const cop of pol.footCops) game.scene.remove(cop.mesh);
    pol.copCars = []; pol.footCops = [];
  }
}
