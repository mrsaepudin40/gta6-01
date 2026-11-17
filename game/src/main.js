// Solmar Bay — main loop, state machine, camera, car enter/exit, collisions, rendering.
import { CFG, PAL } from './config.js';
import { makeRng, clamp, dist, angleTo } from './random.js';
import { input, moveVector } from './input.js';
import { audio } from './audio.js';
import { genWorld, drawWorld, isRoad, collideCircle, clampToWorld } from './world.js';
import { makePlayer, makeCar, makePed, driveCar, drawCar, drawPlayer, drawPed } from './entities.js';
import { spawnTraffic, spawnPeds, updateTraffic } from './traffic.js';
import { wantedStars, addHeat, updatePolice } from './police.js';
import { newMissionState, startMission, updateMissions, say } from './missions.js';
import { fireBullet, punch, updateBullets, updateParticles, updateEnemies, hurtPlayer, damageCar, spawnSparks } from './combat.js';
import { drawHUD, drawTitle, drawOverlay, titleMenuHit } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  time: 0,
  state: 'title',
  world: genWorld(1337),
  rng: makeRng(1337),
  player: makePlayer(1000, 600),
  trafficCars: [],
  parkedCars: [],
  peds: [],
  cops: [],
  copCars: [],
  enemies: [],
  bullets: [],
  particles: [],
  tireMarks: [],
  pickups: [],
  heat: 0,
  wanted: 0,
  lastCrimeT: -99,
  arrestT: 0,
  spawnCd: 0,
  mission: newMissionState(),
  cam: { x: 1000, y: 600 },
  menuHover: null,
  showHow: false,
  muted: false,
  lastShot: null,
  bestWanted: 0,
  save: loadSave(),
};

function resetRun(keepMoney) {
  const money = keepMoney ? game.player.money : 0;
  game.world = genWorld(1337 + Math.floor(Math.random() * 100000));
  game.rng = makeRng(1337);
  game.player = makePlayer(1000, 600);
  game.player.money = money;
  game.trafficCars = spawnTraffic(game.world, game.rng, 13);
  game.peds = spawnPeds(game.world, game.rng, 24);
  game.parkedCars = spawnParked();
  game.cops = []; game.copCars = []; game.enemies = [];
  game.bullets = []; game.particles = []; game.tireMarks = [];
  game.heat = 0; game.wanted = 0; game.arrestT = 0; game.spawnCd = 0;
  game.mission = newMissionState();
  game.pickups = spawnPickups();
  game.cam.x = 1000; game.cam.y = 600;
}

function spawnParked() {
  const cars = [];
  const kinds = ['sedan', 'taxi', 'pickup', 'van', 'sport'];
  for (let i = 0; i < 9; i++) {
    const vertical = game.rng.chance(0.5);
    const road = vertical ? game.rng.pick(game.world.roadsX) : game.rng.pick(game.world.roadsY);
    const along = game.rng.range(220, (vertical ? CFG.WORLD_H : CFG.WORLD_W) - 220);
    cars.push(makeCar(
      vertical ? road + 34 : along,
      vertical ? along : road + 34,
      vertical ? Math.PI / 2 : 0,
      game.rng.pick(kinds), 'parked',
    ));
  }
  return cars;
}

function spawnPickups() {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const road = game.rng.pick(game.world.roadsX);
    out.push({ x: road + game.rng.pick([-30, 30]), y: game.rng.range(200, 2200), kind: 'cash', taken: false });
  }
  for (let i = 0; i < 4; i++) {
    const road = game.rng.pick(game.world.roadsY);
    out.push({ x: game.rng.range(200, 2600), y: road + game.rng.pick([-30, 30]), kind: 'health', taken: false });
  }
  return out;
}

function newGame() {
  resetRun(false);
  game.state = 'playing';
  startMission(game, 0);
  audio.ensure(); audio.click();
}

function continueGame() {
  const s = game.save || loadSave();
  resetRun(false);
  if (s) {
    game.player.money = s.money;
    game.muted = s.muted;
    audio.setMuted(s.muted);
  }
  game.state = 'playing';
  startMission(game, s ? Math.min(3, s.mission) : 0);
  audio.ensure(); audio.click();
}

function respawn() {
  const m = game.mission.idx >= 0 ? game.mission.idx : 0;
  const money = Math.max(0, game.player.money - 100);
  const hx = game.world.markers.hospital;
  game.player.x = hx.x; game.player.y = hx.y + 60;
  game.player.hp = CFG.PLAYER_HP;
  game.player.inCar = null;
  game.heat = 0; game.wanted = 0; game.arrestT = 0;
  game.cops = []; game.copCars = [];
  game.player.money = money;
  game.state = 'playing';
  if (!game.mission.completed) startMission(game, Math.min(3, m));
}

function nearestCar(maxD) {
  const p = game.player;
  let best = null, bd = maxD;
  for (const car of [...game.parkedCars, ...game.trafficCars]) {
    if (car.dead) continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  const p = game.player;
  p.inCar = car;
  car.driver = 'player';
  car.speed = 0;
  if (car.wasTraffic) { /* carjacked from traffic */ }
  addHeat(game, 15);
  say(game, 'Jax', car.driver === 'player' ? 'This one will do.' : '', 1.5);
  audio.ensure();
}

function exitCar() {
  const p = game.player;
  const car = p.inCar;
  if (!car) return;
  car.speed = 0;
  car.driver = 'parked';
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  p.inCar = null;
  const res = collideCircle(game.world, p.x, p.y, 12);
  p.x = res.x; p.y = res.y;
}

function update(dt) {
  game.time += dt;
  const p = game.player;
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.punchCd = Math.max(0, p.punchCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  // Aim follows the mouse.
  const wx = game.cam.x - CFG.VIEW_W / 2 + input.mouse.x;
  const wy = game.cam.y - CFG.VIEW_H / 2 + input.mouse.y;
  p.aim = angleTo(p.x, p.y, wx, wy);

  if (input.hit('KeyM')) { game.muted = !game.muted; audio.setMuted(game.muted); }
  if (input.hit('KeyP', 'Escape')) { game.state = 'paused'; return; }
  if (input.hit('KeyR')) { respawn(); return; }

  // Enter / exit car.
  if (input.hit('KeyE')) {
    if (p.inCar) exitCar();
    else {
      const car = nearestCar(56);
      if (car) {
        const wasTraffic = game.trafficCars.includes(car);
        if (wasTraffic) game.trafficCars = game.trafficCars.filter((c) => c !== car);
        else game.parkedCars = game.parkedCars.filter((c) => c !== car);
        enterCar(car);
      }
    }
  }

  if (p.inCar) {
    const car = p.inCar;
    const gas = game.shotDrive ? 1 : (input.down('KeyW', 'ArrowUp') ? 1 : 0);
    const brake = game.shotDrive ? 0 : (input.down('KeyS', 'ArrowDown') ? 1 : 0);
    const steer = game.shotDrive ? 0 : ((input.down('KeyD', 'ArrowRight') ? 1 : 0) - (input.down('KeyA', 'ArrowLeft') ? 1 : 0));
    const crashed = driveCar(car, gas, brake, steer, dt, game.world);
    if (crashed) { audio.crash(); spawnSparks(game, car.x, car.y, 8, '#ffb347'); }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    // Tire marks on hard turns.
    if (Math.abs(car.speed) > 200 && steer !== 0 && Math.random() < 0.5) {
      game.tireMarks.push({ x: car.x - Math.cos(car.angle) * 16, y: car.y - Math.sin(car.angle) * 16, a: car.angle, life: 5 });
    }
    // Run over pedestrians.
    for (const ped of game.peds) {
      if (ped.dead) continue;
      if (dist(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 50) {
        ped.dead = true;
        addHeat(game, 20);
        audio.crash();
        spawnSparks(game, ped.x, ped.y, 8, '#ff6b6b');
        car.hp -= 3;
      }
    }
    // Bump traffic cars.
    for (const other of game.trafficCars) {
      if (other.dead) continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d < 36 && d > 0.01) {
        const push = (36 - d) / 2;
        const nx = (car.x - other.x) / d, ny = (car.y - other.y) / d;
        car.x += nx * push; car.y += ny * push;
        other.x -= nx * push; other.y -= ny * push;
        if (Math.abs(car.speed) > 150) { damageCar(game, car, 4); damageCar(game, other, 6); audio.crash(); }
        car.speed *= 0.6; other.speed *= 0.6;
      }
    }
    if (car.hp <= 0) damageCar(game, car, 0);
    audio.engine(Math.abs(car.speed) / car.max, true);
  } else {
    const mv = moveVector(input);
    p.moving = mv.x !== 0 || mv.y !== 0;
    if (p.moving) {
      const nx = p.x + mv.x * CFG.PLAYER_SPEED * dt;
      const ny = p.y + mv.y * CFG.PLAYER_SPEED * dt;
      const res = collideCircle(game.world, nx, ny, 12);
      p.x = res.x; p.y = res.y;
      p.angle = Math.atan2(mv.y, mv.x);
      p.walkPhase += dt * 10;
    }
    // Traffic cars can hit the player on foot.
    for (const car of game.trafficCars) {
      if (car.dead) continue;
      if (dist(car.x, car.y, p.x, p.y) < 26 && Math.abs(car.speed) > 60) {
        hurtPlayer(game, 12);
        p.x += (p.x - car.x) * 0.4; p.y += (p.y - car.y) * 0.4;
      }
    }
    if (input.mouse.down) fireBullet(game);
    if (input.hit('KeyF', 'Space')) punch(game);
    audio.engine(0, false);
  }

  updateTraffic(game, dt);
  updatePolice(game, dt);
  updateMissions(game, dt);
  updateBullets(game, dt);
  updateParticles(game, dt);
  updateEnemies(game, dt);

  // Tire marks decay.
  for (const t of game.tireMarks) t.life -= dt;
  game.tireMarks = game.tireMarks.filter((t) => t.life > 0);

  // Pickups.
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'cash') { p.money += 50; say(game, 'Jax', '+$50 found on the street.', 1.6); }
      else { p.hp = Math.min(100, p.hp + 30); say(game, 'Jax', 'Patched up. +30 health.', 1.6); }
      audio.pickup();
    }
  }

  // Camera follows the player.
  const tx = p.inCar ? p.inCar.x : p.x;
  const ty = p.inCar ? p.inCar.y : p.y;
  game.cam.x += (tx - game.cam.x) * Math.min(1, 5 * dt);
  game.cam.y += (ty - game.cam.y) * Math.min(1, 5 * dt);
  game.cam.x = clamp(game.cam.x, CFG.VIEW_W / 2 - 100, CFG.WORLD_W - CFG.VIEW_W / 2 + 100);
  game.cam.y = clamp(game.cam.y, CFG.VIEW_H / 2 - 100, CFG.WORLD_H - CFG.VIEW_H / 2 + 100);

  // Start a mission with Enter when none is running.
  if (input.hit('Enter') && (!game.mission.started && !game.mission.completed)) {
    startMission(game, Math.max(0, game.mission.idx));
  }
}

function render() {
  const p = game.player;
  ctx.clearRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  if (game.state === 'title') {
    // Slow drift over the city behind the menu.
    game.cam.x = 1600 + Math.sin(game.time * 0.05) * 500;
    game.cam.y = 1200 + Math.cos(game.time * 0.04) * 300;
    ctx.save();
    ctx.translate(-game.cam.x + CFG.VIEW_W / 2, -game.cam.y + CFG.VIEW_H / 2);
    drawWorld(ctx, game.cam, game.world);
    ctx.restore();
    ctx.fillStyle = 'rgba(10,6,4,0.45)';
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    drawTitle(ctx, game, game.save, game.showHow);
    return;
  }
  ctx.save();
  ctx.translate(-Math.round(game.cam.x - CFG.VIEW_W / 2), -Math.round(game.cam.y - CFG.VIEW_H / 2));
  drawWorld(ctx, game.cam, game.world);
  // Tire marks.
  for (const t of game.tireMarks) {
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate(t.a);
    ctx.fillStyle = `rgba(20,20,20,${Math.min(0.5, t.life / 8)})`;
    ctx.fillRect(-8, -3, 16, 2); ctx.fillRect(-8, 2, 16, 2);
    ctx.restore();
  }
  // Pickups.
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    ctx.fillStyle = pk.kind === 'cash' ? '#37d67a' : '#ff5a5a';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'cash' ? '$' : '+', pk.x, pk.y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  // Mission marker beacon.
  if (game.mission.marker) {
    const mk = game.mission.marker;
    const pulse = 26 + Math.sin(game.time * 4) * 6;
    ctx.strokeStyle = PAL.marker; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mk.x, mk.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,63,0.25)';
    ctx.beginPath(); ctx.arc(mk.x, mk.y, pulse - 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.marker;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mk.label, mk.x, mk.y - pulse - 8);
    ctx.textAlign = 'left';
  }
  for (const car of game.parkedCars) drawCar(ctx, car, game.time);
  for (const car of game.trafficCars) drawCar(ctx, car, game.time);
  for (const car of game.copCars) drawCar(ctx, car, game.time);
  for (const ped of game.peds) drawPed(ctx, ped);
  for (const cop of game.cops) drawPed(ctx, cop);
  for (const e of game.enemies) drawPed(ctx, e);
  if (p.inCar) drawCar(ctx, p.inCar, game.time);
  else drawPlayer(ctx, p, game.time);
  // Bullets.
  for (const b of game.bullets) {
    ctx.fillStyle = PAL.bullet;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Particles.
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD(ctx, game);
  if (game.state === 'paused') drawOverlay(ctx, 'PAUSED', 'Take a breath. The bay will wait.', '#ffd23f');
  else if (game.state === 'busted') drawOverlay(ctx, 'BUSTED', 'The law caught up with Jax. -$100 bail.');
  else if (game.state === 'wasted') drawOverlay(ctx, 'WASTED', 'Jax is down. The bay keeps moving.');
  else if (game.state === 'complete') drawOverlay(ctx, 'SOLMAR BAY IS YOURS', 'All four jobs done. Rico is finished. $1,000 richer.', '#37d67a');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt * (game.state === 'playing' ? 0 : 1);
  if (game.state === 'title') {
    game.menuHover = titleMenuHit(input.mouse.x, input.mouse.y);
    if (input.mouse.clicked) {
      const hit = titleMenuHit(input.mouse.x, input.mouse.y);
      if (hit === 'new') newGame();
      else if (hit === 'cont' && game.save) continueGame();
      else if (hit === 'how') { game.showHow = !game.showHow; audio.ensure(); audio.click(); }
    }
    if (input.hit('Digit1')) newGame();
    if (input.hit('Digit2') && game.save) continueGame();
    if (input.hit('Digit3')) game.showHow = !game.showHow;
    audio.ensure();
  } else if (game.state === 'playing') {
    update(dt);
  } else if (game.state === 'paused') {
    if (input.hit('KeyP', 'Escape')) game.state = 'playing';
    if (input.hit('KeyR')) respawn();
  } else if (game.state === 'busted' || game.state === 'wasted') {
    if (input.hit('KeyR')) respawn();
    if (input.hit('Enter')) { game.state = 'title'; game.save = loadSave(); }
  } else if (game.state === 'complete') {
    if (input.hit('KeyR')) newGame();
    if (input.hit('Enter')) { game.state = 'title'; game.save = loadSave(); }
  }
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Boot.
input.attach(canvas);
if (game.save) { game.muted = game.save.muted; audio.setMuted(game.save.muted); }
resetRun(false);
game.player.money = 0;
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot, params.get('seed') || shot);
  // Settle the scene deterministically before the first paint.
  for (let i = 0; i < 45; i++) {
    if (game.state === 'playing') update(1 / 60);
    game.time += 1 / 60;
  }
}
requestAnimationFrame(frame);
