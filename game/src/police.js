// Wanted level, police cars + foot cops, arrests.
import { CFG } from './config.js';
import { makeCar, makePed, driveCar } from './entities.js';
import { clampToWorld, nearestRoadCenter } from './world.js';
import { angleLerp, clamp, dist } from './random.js';
import { audio } from './audio.js';

export function wantedStars(game) {
  return Math.min(5, Math.floor(game.heat / 20));
}

export function addHeat(game, n) {
  game.heat = Math.min(100, game.heat + n);
  game.lastCrimeT = game.time;
  const s = wantedStars(game);
  if (s > game.bestWanted) game.bestWanted = s;
}

export function updatePolice(game, dt) {
  const stars = wantedStars(game);
  game.wanted = stars;
  // Heat decays when the player has been clean for a while.
  if (game.time - game.lastCrimeT > 4 && stars > 0) game.heat = Math.max(0, game.heat - 1.6 * dt);
  audio.siren(stars > 0, dt);
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  // Spawn police to match the wanted level.
  const wantCars = Math.min(CFG.COP_MAX_CARS, stars);
  const wantFoot = Math.min(CFG.COP_MAX_FOOT, stars * 2);
  game.spawnCd -= dt;
  if (game.spawnCd <= 0) {
    game.spawnCd = 1.2;
    if (game.copCars.length < wantCars && stars > 0) {
      const spot = spawnSpot(game, px, py);
      const car = makeCar(spot.x, spot.y, Math.atan2(py - spot.y, px - spot.x), 'police', 'police');
      car.speed = 200;
      game.copCars.push(car);
    }
    if (game.cops.length < wantFoot && stars > 0) {
      const spot = spawnSpot(game, px, py);
      const cop = makePed(spot.x, spot.y);
      cop.color = '#2f6df6';
      game.cops.push(cop);
    }
  }
  // Police cars chase: steer toward the player, faster than traffic.
  for (const car of game.copCars) {
    if (car.dead) continue;
    const target = Math.atan2(py - car.y, px - car.x);
    car.angle = angleLerp(car.angle, target, Math.min(1, 2.2 * dt));
    const d = dist(car.x, car.y, px, py);
    const gas = d > 60 ? 1 : 0.4;
    driveCar(car, gas, 0, 0, dt, game.world);
    car.speed = clamp(car.speed, 0, car.max);
    // Ram the player: damage + arrest pressure when the player is slow.
    if (d < 46) {
      const pspeed = p.inCar ? Math.abs(p.inCar.speed) : 0;
      if (p.inCar && pspeed < 60) game.arrestT += dt;
      else if (!p.inCar) game.arrestT += dt * 0.5;
      if (p.inCar) p.inCar.hp -= 6 * dt;
    }
  }
  // Foot cops run at the player.
  for (const cop of game.cops) {
    if (cop.dead) continue;
    cop.angle = Math.atan2(py - cop.y, px - cop.x);
    const sp = 165;
    const nx = cop.x + Math.cos(cop.angle) * sp * dt;
    const ny = cop.y + Math.sin(cop.angle) * sp * dt;
    cop.x = nx; cop.y = ny;
    const d = dist(cop.x, cop.y, px, py);
    if (d < 34 && !p.inCar) game.arrestT += dt;
    if (d < 34 && p.inCar) game.arrestT += dt * 0.3;
  }
  // Arrested.
  if (game.arrestT > 1.5) {
    game.arrestT = 0;
    game.state = 'busted';
    audio.busted();
    audio.siren(false, dt);
  }
  // Despawn cops that are far away once the heat is gone.
  if (stars === 0) {
    game.copCars = game.copCars.filter((c) => dist(c.x, c.y, px, py) < 900);
    game.cops = game.cops.filter((c) => dist(c.x, c.y, px, py) < 700);
  }
}

function spawnSpot(game, px, py) {
  const { world, rng } = game;
  for (let tries = 0; tries < 12; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(420, 700);
    let x = px + Math.cos(a) * r;
    let y = py + Math.sin(a) * r;
    const c = clampToWorld(x, y, 40);
    x = c.x; y = c.y;
    const rc = nearestRoadCenter(world, x, y);
    if (dist(x, y, rc.x, rc.y) < 240) return { x: rc.x, y: rc.y };
  }
  return { x: 200, y: 200 };
}
