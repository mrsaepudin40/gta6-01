// Deterministic ?shot= scenes for screenshots: ?shot=chase|start|night|garage&seed=N
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
  game.night = false;
  game.resultBanner = null;
  const p = game.player;
  p.hp = CFG.PLAYER_HP; p.inCar = null; p.fireCd = 0;
  p.ammoMag = 12; p.ammoRes = 24;

  if (name === 'start') {
    game.state = 'title';
    game.clockDay = 1; game.clockMins = 17 * 60;
    p.x = 1400; p.y = 1000;
    return;
  }
  if (name === 'garage') {
    // Benny's Garage menu open: upgrades visible, cash on hand.
    game.upgrades = { engine: 1, armor: 0 };
    p.money = 1850;
    p.x = 1800; p.y = 1400;
    game.cam.x = 1800; game.cam.y = 1400;
    game.clockDay = 1; game.clockMins = 17 * 60 + 40;
    game.garageSel = 1;
    game.state = 'garage';
    return;
  }
  if (name === 'night') {
    // On-foot Night Shift: dark city, pistol ammo, 1 star, stash marker ahead.
    p.x = 1400; p.y = 1000; p.angle = 0; p.aim = 0;
    p.money = 1240;
    game.clockDay = 1; game.clockMins = 21 * 60 + 47;
    const cop = makeCar(2200, 1000, 0, 'police', 'police');
    cop.speed = 200;
    game.copCars.push(cop);
    startMission(game, 5);
    game.heat = 20;
    game.lastCrimeT = 1e9;
    game.state = 'playing';
    return;
  }
  if (name === 'chase') {
    // Cover: 4-star police chase, dense HUD (clock, radio, mission banner, timer, distance).
    const car = makeCar(1400, 1000, 0, 'sport', 'player');
    car.speed = 320;
    p.inCar = car; p.x = car.x; p.y = car.y;
    p.money = 4820;
    game.clockDay = 1; game.clockMins = 18 * 60 + 24;
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
    startMission(game, 6);
    game.mission.timer = 74;
    game.heat = 80; // 4 stars: mission 6 already added 80; keep 80 total
    game.lastCrimeT = 1e9;
    game.state = 'playing';
    return;
  }
  // Default: on-foot mission at the docks.
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
