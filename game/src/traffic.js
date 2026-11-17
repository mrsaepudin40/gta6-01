// Traffic cars (road loops) + pedestrians (sidewalk walks, flee gunfire).
import * as THREE from 'three';
import { CFG, PAL } from './config.js';
import { makeRng, dist2d, angLerp, clamp } from './random.js';
import { makeCarMesh, makePedMesh } from './entities.js';
import { makeCarState, driveCar } from './car.js';
import { isRoad, collideCircle } from './world.js';

const TRAFFIC_COLORS = [0xc94f43, 0xf2c230, 0x3fa7d6, 0x7a9a5b, 0xe8e3d8, 0x9b7ec6, 0xd97b2f];

export function initTraffic(scene, world) {
  const rng = makeRng(CFG.WORLD_SEED + 7);
  const cars = [];
  const peds = [];
  // traffic cars: each loops a rectangle around one block
  for (let i = 0; i < 14; i++) {
    const bx = rng.pick([-1200, -800, -400, 0, 400, 800]);
    const bz = rng.pick([-800, -400, 0, 400, 800]);
    const loop = [
      { x: bx - 200, z: bz - 200 }, { x: bx + 200, z: bz - 200 },
      { x: bx + 200, z: bz + 200 }, { x: bx - 200, z: bz + 200 },
    ];
    const color = rng.pick(TRAFFIC_COLORS);
    const mesh = makeCarMesh(color);
    scene.add(mesh);
    const st = makeCarState(loop[0].x, loop[0].z, 0, { mesh, max: 13, accel: 10 });
    cars.push({ ...st, loop, wp: 1, color, parked: false });
  }
  // parked cars (stealable)
  const parked = [];
  for (let i = 0; i < 8; i++) {
    const x = rng.pick([-1200, -800, -400, 0, 400, 800, 1200]) + rng.range(-30, 30);
    const z = rng.pick([-800, -400, 0, 400, 800]) + rng.range(-30, 30);
    const sport = rng.chance(0.25);
    const mesh = makeCarMesh(sport ? 0x3fa7d6 : rng.pick(TRAFFIC_COLORS), { sport });
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rng.range(0, Math.PI * 2);
    scene.add(mesh);
    parked.push({ x, z, heading: mesh.rotation.y, mesh, sport, kind: sport ? 'sport' : 'sedan', taken: false });
  }
  // pedestrians
  for (let i = 0; i < 20; i++) {
    const x = rng.range(-1500, 1300), z = rng.range(-1100, 1100);
    if (isRoad(x, z)) continue;
    const mesh = makePedMesh(rng.pick(PAL.ped));
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({ x, z, heading: rng.range(0, Math.PI * 2), mesh, speed: rng.range(1.2, 2.2), fleeT: 0, tx: x, tz: z });
  }
  return { cars, parked, peds };
}

export function updateTraffic(t, dt, world, playerPos, gunshotAt) {
  // loop cars
  for (const c of t.cars) {
    const wp = c.loop[c.wp];
    const d = dist2d(c.x, c.z, wp.x, wp.z);
    if (d < 12) { c.wp = (c.wp + 1) % c.loop.length; continue; }
    const want = Math.atan2(wp.x - c.x, wp.z - c.z);
    c.heading = angLerp(c.heading, want, Math.min(1, dt * 2.2));
    const input = { forward: true, back: false, left: false, right: false };
    // steer toward waypoint via heading error
    let err = want - c.heading;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    input.left = err > 0.08; input.right = err < -0.08;
    c.speed = Math.min(c.speed + 6 * dt, 12);
    driveCar(c, input, dt, world, null);
  }
  // pedestrians
  for (const p of t.peds) {
    if (gunshotAt && dist2d(p.x, p.z, gunshotAt.x, gunshotAt.z) < 45) p.fleeT = 3;
    if (p.fleeT > 0) {
      p.fleeT -= dt;
      const a = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      p.heading = angLerp(p.heading, a, Math.min(1, dt * 6));
      p.x += Math.sin(p.heading) * 5.5 * dt;
      p.z += Math.cos(p.heading) * 5.5 * dt;
    } else {
      const d = dist2d(p.x, p.z, p.tx, p.tz);
      if (d < 6) {
        p.tx = clamp(p.x + (Math.random() - 0.5) * 300, -1500, 1350);
        p.tz = clamp(p.z + (Math.random() - 0.5) * 300, -1100, 1100);
      }
      const want = Math.atan2(p.tx - p.x, p.tz - p.z);
      p.heading = angLerp(p.heading, want, Math.min(1, dt * 3));
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
    }
    const c = collideCircle(world, p.x, p.z, 0.8);
    p.x = c.x; p.z = c.z;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    const t2 = performance.now() * 0.008;
    const legs = p.mesh.userData.legs || [];
    if (legs[0]) legs[0].rotation.x = Math.sin(t2) * 0.5;
    if (legs[1]) legs[1].rotation.x = -Math.sin(t2) * 0.5;
  }
}
