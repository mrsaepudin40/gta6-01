// Solmar Bay 3D — REBUILD. Boot, low chase camera, game loop, state machine.
// Original game, no Rockstar/GTA content.
import * as THREE from 'three';
import { CFG, PAL } from './config.js';
import { buildWorld, setNight, districtAt } from './world.js';
import { makeCar, spawnTraffic, updateTraffic, updatePlayerCar } from './car.js';
import { makePlayer, updatePlayer, tryEnterCar, exitCar, stealPrompt } from './player.js';
import { newPoliceState, updatePolice, addHeat } from './police.js';
import { newCombatState, fireShot, punch, updateCombat } from './combat.js';
import { newMissionState, startMission, updateMissions, updateMissionQueue } from './missions.js';
import { newGarageState, garageNear, buyUpgrade, carDamageFactor } from './garage.js';
import { audio } from './audio.js';
import { initInput, pressed, consumeClick, mouse } from './input.js';
import { writeSave, readSave } from './save.js';
import { initHud, updateHud, openMap, closeMap, isMapOpen, openPhone, closePhone, isPhoneOpen, showTitle, hideTitle, showCenter, hideCenter } from './hud.js';
import { applyShot, updateShot } from './shots.js';
import { buildJax, buildPed, animatePed } from './entities.js';
import { mulberry32, range, pick, clamp, lerp } from './random.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xff9a5c);
scene.fog = new THREE.Fog(0xf2b98a, 900, 5200);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 9000);

const game = {
  scene, camera, renderer, time: 0, state: 'title',
  clock: { day: 1, hour: 18, minute: 52 },
  radioIdx: 0, cameraYaw: Math.PI, shotMode: null, shotSeed: '',
  promptText: '', nightF: 0,
};
game.world = buildWorld(scene);
game.player = makePlayer(game);
game.police = newPoliceState();
game.combat = newCombatState();
game.mission = newMissionState();
game.garage = newGarageState();
game.traffic = []; game.parked = []; game.peds = []; game.enemies = [];
spawnTraffic(game);

// ---- pedestrians wandering the sidewalks ----
{
  const rng = mulberry32(4242);
  const lines = [-800, -400, 0, 400, 800];
  for (let i = 0; i < 46; i++) {
    const horizontal = rng() < 0.5;
    const line = horizontal ? pick(rng, lines) : pick(rng, [-1200, -800, -400, 0, 400, 800, 1200]);
    const along = range(rng, -1400, 1400);
    const x = horizontal ? along : line + 52;
    const z = horizontal ? line + 52 : along;
    const mesh = buildPed(pick(rng, PAL.ped));
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    game.peds.push({ mesh, x, z, horizontal, line, dir: rng() < 0.5 ? 1 : -1, speed: range(rng, 1.2, 2.4), flee: 0, fx: 0, fz: 0 });
  }
  // beachgoers on the sand
  for (let i = 0; i < 10; i++) {
    const x = range(rng, 1420, 1540), z = range(rng, -1000, 1000);
    const mesh = buildPed(pick(rng, PAL.ped));
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    game.peds.push({ mesh, x, z, horizontal: true, line: z, dir: 1, speed: 0.6, flee: 0, fx: 0, fz: 0, beach: true });
  }
}

// ---- effects: muzzle flash + damage smoke ----
function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const flashTex = radialTex('rgba(255,240,170,1)', 'rgba(255,160,40,0)');
const smokeTex = radialTex('rgba(120,120,120,0.55)', 'rgba(120,120,120,0)');
const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, depthWrite: false }));
flash.scale.set(3.5, 3.5, 1);
scene.add(flash);
const smokes = [];
game.effects = {
  smoke(x, z) {
    if (smokes.length > 14) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.7, depthWrite: false }));
    s.position.set(x, 3, z); s.scale.set(5, 5, 1);
    scene.add(s);
    smokes.push({ s, t: 1.4 });
  },
};

// ---- golden dust motes drifting in the sunset air (follows the player) ----
const DUST_N = 220;
const dustGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(DUST_N * 3);
  const rngD = mulberry32(777);
  for (let i = 0; i < DUST_N; i++) {
    pos[i * 3] = range(rngD, -130, 130);
    pos[i * 3 + 1] = range(rngD, 1, 42);
    pos[i * 3 + 2] = range(rngD, -130, 130);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const dustMat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 1.2, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, map: radialTex('rgba(255,217,160,1)', 'rgba(255,217,160,0)') });
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

// ---- sun follows the player so shadows stay crisp ----
const SUN_DIR = new THREE.Vector3(-1, 0.30, -0.28).normalize();
function updateSun() {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
  game.world.sunLight.position.set(px + SUN_DIR.x * 700, SUN_DIR.y * 700, pz + SUN_DIR.z * 700);
  game.world.sunLight.target.position.set(px, 0, pz);
  game.world.sunLight.target.updateMatrixWorld();
  // lens-flare ghosts: strung along the sun -> camera line, so they track
  // the sun's screen position from any camera angle
  if (game.world.sunGhosts) {
    const sp = game.world.sunSprite.position;
    for (const g of game.world.sunGhosts) {
      g.spr.position.set(
        sp.x + (camera.position.x - sp.x) * g.t,
        sp.y + (camera.position.y - sp.y) * g.t,
        sp.z + (camera.position.z - sp.z) * g.t);
      g.spr.material.opacity = g.baseOp * (1 - game.world.nightF);
    }
  }
}

// ---- camera: LOW + CLOSE behind the player (the Halcyon look) ----
// Shot scenes frame tighter than gameplay: the chase shot uses a close 3/4
// rear view, the shootout shot sits right behind Jax so faces read.
// Title orbit sits over the beach looking west across the city (no tower
// between camera and skyline — the old low orbit put a rooftop in the way).
const camPos = new THREE.Vector3(1450, 140, 100);
const camLook = new THREE.Vector3(-200, 50, -100);
function updateCamera(dt) {
  const p = game.player;
  if (game.state === 'title') {
    // slow orbit over the beach at sunset: city skyline + sun ahead, sand below
    const t = game.time * 0.05;
    camPos.set(1450 + Math.sin(t) * 110, 140, 100 + Math.cos(t * 0.8) * 70);
    camLook.set(-200, 50, -100);
    camera.position.lerp(camPos, 1 - Math.exp(-2 * dt));
    camera.lookAt(camLook);
    camera.fov = lerp(camera.fov, 55, dt * 2);
    camera.updateProjectionMatrix();
    return;
  }
  let target, look;
  if (p.inCar) {
    const c = p.inCar;
    const fx = Math.cos(c.angle), fz = -Math.sin(c.angle);
    const shot = game.shotMode === 'chase';
    const back = shot ? 5.2 : 6.5, height = shot ? 2.1 : 2.4;
    // lateral offset in shot mode: 3/4 rear view like the rank-3 reference
    const lat = shot ? 2.0 : 0;
    const px = -fz, pz = fx; // perpendicular to the car's forward
    target = new THREE.Vector3(c.x - fx * back + px * lat, height, c.z - fz * back + pz * lat);
    look = new THREE.Vector3(c.x + fx * 11, shot ? 2.0 : 1.2, c.z + fz * 11);
    camera.fov = lerp(camera.fov, shot ? 58 : 62 + clamp(Math.abs(c.speed) / 50, 0, 1) * 7, dt * 3);
  } else {
    // on-foot camera: closer than the old 16u (Jax was ~21% of frame);
    // the shootout shot goes tighter still so faces + tracers fill the frame
    const fx = Math.sin(p.angle), fz = Math.cos(p.angle);
    const shot = game.shotMode === 'shootout';
    const back = shot ? 8 : 13, height = shot ? 2.9 : 3.4;
    target = new THREE.Vector3(p.x - fx * back, height, p.z - fz * back);
    look = new THREE.Vector3(p.x + fx * 10, shot ? 1.8 : 2.0, p.z + fz * 10);
    camera.fov = lerp(camera.fov, shot ? 54 : 58, dt * 3);
    game.cameraYaw = p.angle + Math.PI;
  }
  camera.position.lerp(target, 1 - Math.exp(-7 * dt));
  camera.lookAt(look);
  camera.updateProjectionMatrix();
}

// ---- game flow ----
game.newGame = () => {
  game.player.money = 0; game.player.hp = 100;
  game.player.x = 0; game.player.z = 100; game.player.angle = 0;
  game.mission = newMissionState();
  game.police = newPoliceState();
  game.garage = newGarageState();
  game.clock = { day: 1, hour: 18, minute: 52 };
  game.state = 'playing';
  hideTitle(); hideCenter();
  document.getElementById('hud').classList.remove('hidden');
  game.mission.nextIdx = 0; game.mission.nextT = 1.2;
  audio.unlock();
};
game.continueGame = () => {
  const s = readSave();
  if (s) {
    game.player.money = s.money || 0;
    game.mission.done = s.done || 0;
    game.mission.completed = !!s.completed;
    if (s.upgrades) game.garage.levels = s.upgrades;
    game.clock.day = s.day || 1; game.clock.hour = s.hour || 18;
  }
  game.state = 'playing';
  hideTitle(); hideCenter();
  document.getElementById('hud').classList.remove('hidden');
  game.mission.nextIdx = game.mission.done; game.mission.nextT = 1.2;
  audio.unlock();
};

function restart() { location.reload(); }

function aimDirection() {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2((mouse.x / innerWidth) * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(plane, hit);
  const p = game.player;
  const dx = hit.x - p.x, dz = hit.z - p.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dx / len, z: dz / len };
}

function scarePeds() {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
  for (const ped of game.peds) {
    const d = Math.hypot(ped.x - px, ped.z - pz);
    if (d < 70) {
      ped.flee = 2.5;
      ped.fx = (ped.x - px) / (d || 1); ped.fz = (ped.z - pz) / (d || 1);
    }
  }
}

// ---- input handling (edge-triggered) ----
let tabDown = false, escDown = false, gDown = false, eDown = false, enterDown = false, fDown = false, cDown = false, mDown = false, pDown = false, rDown = false;
function handleKeys() {
  const p = game.player;
  if (pressed('tab') && !tabDown) {
    tabDown = true;
    if (game.state === 'playing') { game.state = 'map'; openMap(game); }
    else if (game.state === 'map') { game.state = 'playing'; closeMap(); }
  } else if (!pressed('tab')) tabDown = false;
  if (pressed('escape') && !escDown) {
    escDown = true;
    if (game.state === 'map') { game.state = 'playing'; closeMap(); }
    else if (game.state === 'phone') { game.state = 'playing'; closePhone(); }
    else if (game.state === 'garage') { game.state = 'playing'; game.garage.open = false; document.getElementById('garage-menu').classList.add('hidden'); }
    else if (game.state === 'playing') { game.state = 'phone'; openPhone(game); }
  } else if (!pressed('escape')) escDown = false;
  if (pressed('g') && !gDown) {
    gDown = true;
    if (game.state === 'playing' && garageNear(game)) {
      game.state = 'garage'; game.garage.open = true; game.garage.msg = '';
      document.getElementById('garage-menu').classList.remove('hidden');
    } else if (game.state === 'garage') {
      game.state = 'playing'; game.garage.open = false;
      document.getElementById('garage-menu').classList.add('hidden');
    }
  } else if (!pressed('g')) gDown = false;
  if (pressed('e') && !eDown) {
    eDown = true;
    if (game.state === 'playing') {
      if (p.inCar) exitCar(game);
      else if (tryEnterCar(game)) { /* entered */ }
    }
  } else if (!pressed('e')) eDown = false;
  if (pressed('enter') && !enterDown) {
    enterDown = true;
    if (game.state === 'title') game.newGame();
    else if (game.state === 'playing' && !game.mission.started && !game.mission.completed) startMission(game, game.mission.done);
    else if (game.state === 'garage') game.garage.msg = buyUpgrade(game);
  } else if (!pressed('enter')) enterDown = false;
  if (pressed('f') && !fDown) { fDown = true; if (game.state === 'playing' && !p.inCar) punch(game); }
  else if (!pressed('f')) fDown = false;
  if (pressed('c') && !cDown) { cDown = true; if (game.state === 'playing') { game.radioIdx = (game.radioIdx + 1) % 3; audio.click(); } }
  else if (!pressed('c')) cDown = false;
  if (pressed('m') && !mDown) { mDown = true; audio.setMuted(!audio.isMuted()); }
  else if (!pressed('m')) mDown = false;
  if (pressed('p') && !pDown) {
    pDown = true;
    if (game.state === 'playing') { game.state = 'paused'; showCenter('PAUSED', 'Take a breath. Solmar Bay waits.', 'Press P to resume'); }
    else if (game.state === 'paused') { game.state = 'playing'; hideCenter(); }
  } else if (!pressed('p')) pDown = false;
  if (pressed('r') && !rDown) {
    rDown = true;
    if (['busted', 'wasted', 'complete'].includes(game.state)) restart();
  } else if (!pressed('r')) rDown = false;
  // garage selection
  if (game.state === 'garage') {
    if (pressed('arrowup') && !game._upDown) { game._upDown = true; game.garage.selected = (game.garage.selected + 2) % 3; audio.click(); }
    else if (!pressed('arrowup')) game._upDown = false;
    if (pressed('arrowdown') && !game._dnDown) { game._dnDown = true; game.garage.selected = (game.garage.selected + 1) % 3; audio.click(); }
    else if (!pressed('arrowdown')) game._dnDown = false;
  }
}

// ---- main loop ----
initInput();
initHud(game);
showTitle(game, readSave());
const params = new URLSearchParams(location.search);
const shotParam = params.get('shot');
const clock = new THREE.Clock();
let nightApplied = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.time += dt;

  // clock: 1 game-minute per 2 real seconds
  game.clock.minute += dt * 0.5;
  if (game.clock.minute >= 60) { game.clock.minute -= 60; game.clock.hour += 1; }
  if (game.clock.hour >= 24) { game.clock.hour -= 24; game.clock.day += 1; }
  // day/night blend
  const h = game.clock.hour;
  const targetNight = (h >= 20 || h < 6) ? 1 : h >= 17 ? ((h - 17) / 3) * 0.7 : 0;
  if (Math.abs(targetNight - nightApplied) > 0.05) {
    nightApplied = targetNight;
    setNight(game.world, nightApplied);
    const bg = new THREE.Color(0xff9a5c).lerp(new THREE.Color(0x0b1026), nightApplied);
    scene.background = bg;
    scene.fog.color.copy(bg).lerp(new THREE.Color(0xf2b98a), 1 - nightApplied);
  }

  handleKeys();

  if (game.state === 'playing' || game.state === 'map' || game.state === 'phone' || game.state === 'garage') {
    const input = {
      forward: pressed('w') || pressed('arrowup'),
      back: pressed('s') || pressed('arrowdown'),
      left: pressed('a') || pressed('arrowleft'),
      right: pressed('d') || pressed('arrowright'),
    };
    if (game.state === 'playing') {
      if (game.player.inCar) updatePlayerCar(game, dt, input);
      else updatePlayer(game, dt, input);
      // shooting (on foot, mouse aim, hold to auto-fire)
      if (!game.player.inCar && mouse.down && game.combat.fireT <= 0) {
        const dir = aimDirection();
        fireShot(game, { x: game.player.x, z: game.player.z }, dir);
        scarePeds();
        game.combat.fireT = 0.18;
      }
      if (consumeClick() && !game.player.inCar) { /* click consumed by fire above */ }
      updateTraffic(game, dt);
      updatePolice(game, dt);
      updateCombat(game, dt);
      updateMissions(game, dt);
      updateMissionQueue(game, dt);
      updateShot(game, dt);
      // peds wander / flee (articulated walk; beachgoers idle)
      for (const ped of game.peds) {
        if (ped.flee > 0) continue; // handled in combat update
        if (ped.beach) { animatePed(ped.mesh, dt, false, 'idle'); continue; }
        if (ped.horizontal) {
          ped.x += ped.dir * ped.speed * dt;
          if (ped.x > 1450) ped.dir = -1;
          if (ped.x < -1450) ped.dir = 1;
        } else {
          ped.z += ped.dir * ped.speed * dt;
          if (ped.z > 1150) ped.dir = -1;
          if (ped.z < -1150) ped.dir = 1;
        }
        ped.mesh.position.set(ped.x, 0, ped.z);
        ped.mesh.rotation.y = ped.horizontal ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
        animatePed(ped.mesh, dt, true, 'walk');
      }
      // prompt text
      game.promptText = stealPrompt(game) || (garageNear(game) ? '[G] Benny\'s Garage' : '');
      // muzzle flash sits at the gun, offset along the last shot direction
      // (smaller in the close shootout shot, or it would wash the frame)
      const fs = game.shotMode === 'shootout' ? 2.0 : 3.5;
      flash.scale.set(fs, fs, 1);
      flash.material.opacity = game.combat.flashT > 0 ? 0.95 : 0;
      if (game.combat.flashT > 0) {
        const p = game.player;
        const d = game.combat.flashDir || { x: Math.sin(p.angle), z: Math.cos(p.angle) };
        flash.position.set(p.x + d.x * 2.4, 2.4, p.z + d.z * 2.4);
      }
      // smoke puffs
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.t -= dt;
        s.s.position.y += dt * 3;
        s.s.material.opacity = Math.max(0, s.t / 1.4) * 0.7;
        if (s.t <= 0) { scene.remove(s.s); smokes.splice(i, 1); }
      }
      // objective diamond spin
      if (game.world.objectiveDiamond && game.world.objectiveDiamond.visible) {
        game.world.objectiveDiamond.rotation.y += dt * 2;
        game.world.objectiveDiamond.position.y = 20 + Math.sin(game.time * 2) * 2;
      }
      // car damage uses armor factor
      if (game.player.inCar && game.player.inCar.hp <= 0) game.state = 'wasted';
      if (game.player.hp <= 0) game.state = 'wasted';
    }
    if (game.state === 'map') updateShot(game, dt);
  }

  // end states
  if (game.state === 'busted') showCenter('BUSTED', 'The law finally caught up with Jax.', 'Press R to restart');
  if (game.state === 'wasted') showCenter('WASTED', 'Solmar Bay is a dangerous place.', 'Press R to restart');
  if (game.state === 'complete') {
    showCenter('SOLMAR BAY IS YOURS', `All 8 jobs done · $${game.player.money.toLocaleString('en-US')} earned`, 'Press R to play again');
    writeSave(game);
  }

  // dust motes: drift with the wind, wrap inside the box, follow the player
  {
    const dp = dustGeo.attributes.position;
    for (let i = 0; i < DUST_N; i++) {
      let x = dp.getX(i) + dt * 2.2;
      let y = dp.getY(i) + Math.sin(game.time * 0.7 + i) * dt * 0.4;
      if (x > 130) x = -130;
      if (y < 1) y = 42; if (y > 42) y = 1;
      dp.setX(i, x); dp.setY(i, y);
    }
    dp.needsUpdate = true;
    const pp = game.player;
    dust.position.set(pp.inCar ? pp.inCar.x : pp.x, 0, pp.inCar ? pp.inCar.z : pp.z);
    dustMat.opacity = 0.5 * (1 - game.world.nightF * 0.8);
  }
  updateSun();
  updateCamera(dt);
  updateHud(game);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// shot mode (deterministic scenes for screenshots)
if (shotParam) {
  if (shotParam === 'title') {
    // title scene keeps the real title overlay (menu + how-to + characters)
    applyShot(game, shotParam, params.get('seed') || '');
  } else {
    document.getElementById('hud').classList.remove('hidden');
    hideTitle();
    applyShot(game, shotParam, params.get('seed') || '');
  }
}

window.__game = game;
animate();
