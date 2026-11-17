// Deterministic ?shot= scenes for screenshots: ?shot=chase|drive|foot|start&seed=N
import { CFG } from './config.js';
import { makeRng, hashSeed } from './random.js';
import { genWorld } from './world.js';
import { makeCar } from './entities.js';
import { spawnTraffic, spawnPeds } from './traffic.js';
import { startMission } from './missions.js';

export function applyShot(game, name, seedStr) {
  const seed = hashSeed(seedStr || name);
  game.rng = makeRng(seed);
  game.world = genWorld(seed);
  game.trafficCars = spawnTraffic(game.world, game.rng, 12);
  game.peds = spawnPeds(game.world, game.rng, 22);
  game.parkedCars = spawnParked(game);
  game.cops = []; game.copCars = []; game.enemies = [];
  game.bullets = []; game.particles = []; game.tireMarks = [];
  game.heat = 0; game.wanted = 0; game.arrestT = 0;
  game.lastCrimeT = 1e9; // shots keep their wanted level (no decay during the scene)
  game.shotDrive = false;
  game.mission.idx = -1; game.mission.started = false; game.mission.completed = false;
  const p = game.player;
  p.hp = CFG.PLAYER_HP; p.inCar = null; p.fireCd = 0;

  if (name === 'start') {
    game.state = 'title';
    p.x = 1400; p.y = 1000;
    return;
  }
  if (name === 'chase') {
    // Player in a sports car mid-city, 3 stars, police on the tail.
    const car = makeCar(1400, 1000, 0, 'sport', 'player');
    car.speed = 320;
    p.inCar = car; p.x = car.x; p.y = car.y;
    game.shotDrive = true;
    for (let i = 0; i < 3; i++) {
      const cop = makeCar(1400 - 140 - i * 90, 1000 + (i % 2 === 0 ? 24 : -24), 0, 'police', 'police');
      cop.speed = 300;
      game.copCars.push(cop);
    }
    game.trafficCars.forEach((tc, i) => {
      // Clear the player's road: traffic waits on the southern avenues.
      tc.x = 400 + i * 180; tc.y = 1800 + (i % 2) * 400; tc.angle = i % 2 === 0 ? 0 : Math.PI; tc.speed = tc.cruise;
    });
    startMission(game, 2);
    game.mission.timer = 74;
    game.heat = 60; // mission 2 already added 40 heat; set 60 total -> 3 stars
    game.lastCrimeT = 1e9;
    game.state = 'playing';
    return;
  }
  if (name === 'drive') {
    const car = makeCar(600, 600, 0, 'sedan', 'player');
    car.speed = 380;
    p.inCar = car; p.x = car.x; p.y = car.y;
    game.shotDrive = true;
    game.trafficCars.forEach((tc, i) => {
      // Clear the player's avenue so the car can run at full speed.
      tc.x = 400 + i * 180; tc.y = 1800 + (i % 2) * 400; tc.angle = i % 2 === 0 ? 0 : Math.PI; tc.speed = tc.cruise;
    });
    startMission(game, 0);
    game.mission.stage = 1;
    game.state = 'playing';
    return;
  }
  // foot: on-foot mission at the docks.
  p.x = 2600; p.y = 1000; p.angle = 0; p.aim = 0;
  game.heat = 20;
  const cop = makeCar(2200, 1000, 0, 'police', 'police');
  cop.speed = 200;
  game.copCars.push(cop);
  startMission(game, 1);
  game.state = 'playing';
}

function spawnParked(game) {
  const cars = [];
  const kinds = ['sedan', 'taxi', 'pickup', 'van', 'sport'];
  for (let i = 0; i < 9; i++) {
    const vertical = game.rng.chance(0.5);
    const road = vertical
      ? game.rng.pick(game.world.roadsX)
      : game.rng.pick(game.world.roadsY);
    const along = game.rng.range(220, (vertical ? CFG.WORLD_H : CFG.WORLD_W) - 220);
    const x = vertical ? road + 34 : along;
    const y = vertical ? along : road + 34;
    const angle = vertical ? Math.PI / 2 : 0;
    cars.push(makeCar(x, y, angle, game.rng.pick(kinds), 'parked'));
  }
  return cars;
}
