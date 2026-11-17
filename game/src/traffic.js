// Traffic cars and pedestrians: simple road/sidewalk AI.
import { CFG } from './config.js';
import { makeCar, makePed } from './entities.js';
import { isRoad, collideCircle } from './world.js';
import { clamp } from './random.js';

const TRAFFIC_KINDS = ['sedan', 'taxi', 'pickup', 'van', 'sedan', 'taxi'];

export function spawnTraffic(world, rng, n) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const vertical = rng.chance(0.5);
    const road = vertical ? rng.pick(world.roadsX) : rng.pick(world.roadsY);
    const along = rng.range(150, (vertical ? CFG.WORLD_H : CFG.WORLD_W) - 150);
    const dir = rng.chance(0.5) ? 1 : -1;
    const lane = rng.chance(0.5) ? 22 : -22;
    const x = vertical ? road + lane : along;
    const y = vertical ? along : road + lane;
    const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = makeCar(x, y, angle, rng.pick(TRAFFIC_KINDS), 'traffic');
    car.axis = vertical ? 'y' : 'x';
    car.dir = dir;
    car.cruise = rng.range(120, 185);
    car.speed = car.cruise;
    cars.push(car);
  }
  return cars;
}

export function spawnPeds(world, rng, n) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const road = rng.pick(world.roadsX);
    const along = rng.range(150, CFG.WORLD_H - 150);
    const side = rng.chance(0.5) ? 68 : -68;
    peds.push(makePed(road + side, along));
  }
  return peds;
}

export function updateTraffic(game, dt) {
  const { world, rng } = game;
  // Traffic cars follow their road; at intersections they may turn.
  for (const car of game.trafficCars) {
    if (car.dead) continue;
    // Slow down if a car is close ahead.
    let target = car.cruise;
    for (const other of game.trafficCars) {
      if (other === car || other.dead) continue;
      const dx = other.x - car.x, dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 70 && side < 20) { target = 0; break; }
    }
    car.speed += clamp(target - car.speed, -260 * dt, 200 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!isRoad(world, nx, ny)) {
      // Reached a dead end of the road grid: turn around.
      car.angle += Math.PI;
      car.x += Math.cos(car.angle) * 4; car.y += Math.sin(car.angle) * 4;
      continue;
    }
    car.x = nx; car.y = ny;
    // At an intersection, sometimes turn onto the crossing road.
    const cx = world.roadsX.find((rx) => Math.abs(car.x - rx) < 26);
    const cy = world.roadsY.find((ry) => Math.abs(car.y - ry) < 26);
    if ((cx !== undefined || cy !== undefined) && rng.chance(dt * 0.55)) {
      const turns = [];
      if (cx !== undefined) { turns.push(-Math.PI / 2, Math.PI / 2); }
      if (cy !== undefined) { turns.push(0, Math.PI); }
      const a = rng.pick(turns);
      if (Math.abs(a - car.angle) > 0.1) {
        car.angle = a;
        // Snap onto the lane of the new road.
        if (a === 0 || a === Math.PI) car.y = (cy !== undefined ? cy : car.y) + (rng.chance(0.5) ? 22 : -22);
        else car.x = (cx !== undefined ? cx : car.x) + (rng.chance(0.5) ? 22 : -22);
      }
    }
  }
  // Pedestrians walk the sidewalks; they flee from gunfire.
  for (const ped of game.peds) {
    if (ped.dead) continue;
    ped.walkT -= dt;
    const shot = game.lastShot;
    if (shot && game.time - shot.t < 2.5 && Math.hypot(ped.x - shot.x, ped.y - shot.y) < 380) {
      ped.state = 'flee';
      ped.angle = Math.atan2(ped.y - shot.y, ped.x - shot.x);
      ped.speed = 150;
    } else if (ped.state === 'flee' && (!shot || game.time - shot.t > 2.5)) {
      ped.state = 'walk'; ped.speed = 0;
    }
    if (ped.state === 'walk') {
      if (ped.walkT <= 0) {
        ped.walkT = rng.range(2, 6);
        if (rng.chance(0.5)) ped.angle += rng.pick([-Math.PI / 2, Math.PI / 2, Math.PI]);
      }
      ped.speed = 55;
    }
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    const res = collideCircle(world, nx, ny, 9);
    ped.x = res.x; ped.y = res.y;
    if (res.hit && ped.state === 'walk') ped.angle += Math.PI / 2;
  }
}
