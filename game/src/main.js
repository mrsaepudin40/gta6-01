// Solmar Bay 3D — main loop, state machine, third-person camera, enter/exit, screens.
import * as THREE from 'three';
import { CFG, PAL, MISSIONS } from './config.js';
import { clamp, lerp, angLerp } from './random.js';
import { initInput, pressed, consumeClick, keys } from './input.js';
import { audio } from './audio.js';
import { buildWorld } from './world.js';
import { makePlayer, updatePlayerOnFoot, nearestCar, enterCar, exitCar } from './player.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { makePolice, updatePolice, updateHeli, addHeat, starsOf } from './police.js';
import { makeCombat, tryShoot, tryPunch, updateCombat, updateEnemies } from './combat.js';
import { newMissionState, startMission, updateMissions, updateMissionQueue, say } from './missions.js';
import { makeGarage, nearGarage, buySelected, applyArmor } from './garage.js';
import { readSave, writeSave } from './save.js';
import { initHud, updateHud, showOverlay, hideOverlays } from './hud.js';
import { applyShot } from './shots.js';
import { driveCar } from './car.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(CFG.VIEW_W, CFG.VIEW_H, false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.skyDay);
scene.fog = new THREE.Fog(PAL.fogDay, 900, 5200);

const camera = new THREE.PerspectiveCamera(62, CFG.VIEW_W / CFG.VIEW_H, 0.1, 8000);

const sun = new THREE.DirectionalLight(PAL.sun, 2.7);
sun.position.set(-1400, 500, -600);
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xffe2b0, 0x8a7a5a, 1.15);
scene.add(hemi);
// low sun disc on the western horizon
const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(120, 24),
  new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false })
);
sunDisc.position.set(-2600, 260, 400);
sunDisc.lookAt(0, 260, 400);
scene.add(sunDisc);

const game = {
  state: 'title',
  scene, camera, renderer,
  world: null, player: null, traffic: null, police: null, combat: null,
  mission: newMissionState(),
  garage: makeGarage(),
  enemies: [], nightGuards: null, completeShown: false,
  day: 1, clockMin: 17 * 60 + 40,
  radioIdx: 0, muted: false, bestWanted: 0,
  gunshotAt: null, gunshotT: 0,
  night: false, shotMode: null, titleCam: null, mapOpen: false, phoneOpen: false,
  camPos: new THREE.Vector3(620, 300, 980),
  camYaw: 0,
  addHeat: (n) => addHeat(game, n),
};

function setNight(on) {
  game.night = on;
  // street lamps glow brighter at night so the city reads as lit
  if (game.world?.lampBulbs) for (const b of game.world.lampBulbs) b.scale.setScalar(on ? 1.8 : 1);
  // lit windows only read at night; dark glass reads by day
  if (game.world?.windowsMesh) game.world.windowsMesh.visible = on;
  if (game.world?.windowsDayMesh) game.world.windowsDayMesh.visible = !on;
  if (on) {
    sun.intensity = 0.5; sun.color.setHex(0x8fa8ff);
    hemi.intensity = 0.45;
    scene.background.setHex(PAL.skyNight);
    scene.fog.color.setHex(PAL.fogNight);
    sunDisc.material.color.setHex(0xdde6ff);
  } else {
    sun.intensity = 2.7; sun.color.setHex(PAL.sun);
    hemi.intensity = 1.15;
    scene.background.setHex(PAL.skyDay);
    scene.fog.color.setHex(PAL.fogDay);
    sunDisc.material.color.setHex(0xfff3c0);
  }
}

function resetGame() {
  const p = game.player;
  p.x = 0; p.z = 0; p.heading = 0; p.hp = CFG.PLAYER_HP;
  if (p.inCar) { game.scene.remove(p.inCar.mesh); p.inCar = null; }
  p.mesh.visible = true;
  p.mesh.position.set(0, 0, 0);
  p.money = 0;
  game.police.heat = 0;
  game.police.cars.forEach((c) => game.scene.remove(c.mesh));
  game.police.cars = [];
  if (game.police.heli) { game.scene.remove(game.police.heli.mesh); game.police.heli = null; }
  for (const e of game.enemies) if (e.mesh) game.scene.remove(e.mesh);
  game.enemies = [];
  if (game.nightGuards) { for (const g of game.nightGuards) game.scene.remove(g); game.nightGuards = null; }
  game.completeShown = false;
  game.mission = newMissionState();
  game.day = 1; game.clockMin = 17 * 60 + 40;
  game.bestWanted = 0;
  setNight(false);
}

// edge-triggered keys
const edge = new Set();
window.addEventListener('keydown', (e) => { if (e.code === 'Tab') e.preventDefault(); if (!e.repeat) edge.add(e.code); audio.resume(); });
window.addEventListener('mousedown', () => audio.resume());

function init() {
  game.world = buildWorld(scene);
  game.player = makePlayer(scene);
  game.traffic = initTraffic(scene, game.world);
  game.police = makePolice(scene);
  game.combat = makeCombat(scene);
  initInput();
  initHud();
  // save
  const save = readSave();
  if (save) {
    game.player.money = save.money || 0;
    game.radioIdx = save.radio || 0;
    game.muted = !!save.muted;
    if (save.upgrades) game.garage.owned = { ...game.garage.owned, ...save.upgrades };
  }
  audio.setMuted(game.muted);
  // title buttons
  const btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.addEventListener('click', () => { audio.resume(); startGame(); });
  const btnContinue = document.getElementById('btn-continue');
  if (btnContinue) btnContinue.addEventListener('click', () => {
    audio.resume();
    game.state = 'playing';
    hideOverlays();
    if (!game.mission.started && !game.mission.completed) startMission(game, Math.min(save?.missionsDone || 0, 7));
  });
  const btnHow = document.getElementById('btn-how');
  if (btnHow) btnHow.addEventListener('click', () => {
    const h = document.getElementById('howto');
    if (h) h.style.display = h.style.display === 'block' ? 'none' : 'block';
  });
  // shot mode?
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const seed = params.get('seed') || 'default';
  if (shot) {
    applyShot(game, shot, seed);
    if (shot === 'night') setNight(true);
    hideOverlays();
    if (shot === 'start') showOverlay('title');
    if (shot === 'garage') { /* garage menu drawn by HUD */ }
    if (shot === 'map') { game.mapOpen = true; showOverlay('citymap'); }
    if (shot === 'phone') { game.phoneOpen = true; showOverlay('phone'); }
  } else {
    showOverlay('title');
  }
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth || CFG.VIEW_W, h = canvas.clientHeight || CFG.VIEW_H;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  // automated-test hook (harmless in production): lets the mission test drive
  // missions directly instead of only through synthetic input.
  window.__solmar = { game, startMission };
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  game.state = 'playing';
  hideOverlays();
  startMission(game, 0);
}

function restart() {
  resetGame();
  game.state = 'playing';
  hideOverlays();
  startMission(game, 0);
}

function driveInput() {
  return {
    forward: pressed('KeyW') || pressed('ArrowUp'),
    back: pressed('KeyS') || pressed('ArrowDown'),
    left: pressed('KeyA') || pressed('ArrowLeft'),
    right: pressed('KeyD') || pressed('ArrowRight'),
  };
}

function footInput() {
  return {
    forward: pressed('KeyW') || pressed('ArrowUp'),
    back: pressed('KeyS') || pressed('ArrowDown'),
    left: pressed('KeyA') || pressed('ArrowLeft'),
    right: pressed('KeyD') || pressed('ArrowRight'),
  };
}

function updateCamera(dt) {
  const p = game.player;
  if (game.state === 'title') {
    if (game.titleCam) {
      camera.position.set(game.titleCam.x, game.titleCam.y, game.titleCam.z);
      camera.lookAt(game.titleCam.tx, game.titleCam.ty, game.titleCam.tz);
    } else {
      const t = performance.now() * 0.00003;
      const cx = Math.cos(t) * 900, cz = Math.sin(t) * 900;
      camera.position.lerp(new THREE.Vector3(cx, 320, cz), Math.min(1, dt * 2));
      camera.lookAt(0, 0, 0);
    }
    return;
  }
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const heading = p.inCar ? p.inCar.heading : p.heading;
  const dist = p.inCar ? 12 : 9;
  const height = p.inCar ? 5.2 : 4.5;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const des = new THREE.Vector3(px - fx * dist, height, pz - fz * dist);
  game.camPos.lerp(des, 1 - Math.exp(-dt * 4.5));
  camera.position.copy(game.camPos);
  camera.lookAt(px + fx * 7, 1.5, pz + fz * 7);
  game.camYaw = Math.atan2(px - camera.position.x, pz - camera.position.z);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const p = game.player;

  if (game.state === 'playing') {
    game.clockMin += dt * 0.5;
    if (game.clockMin >= 1440) { game.clockMin -= 1440; game.day += 1; }
    // Tab: fullscreen city map + missions (pauses the action while open)
    if (edge.has('Tab')) {
      if (game.phoneOpen) { game.phoneOpen = false; hideOverlays(); }
      else {
        game.mapOpen = !game.mapOpen;
        if (game.mapOpen) showOverlay('citymap');
        else hideOverlays();
      }
    }
    // Esc: phone — closes garage/map first, otherwise opens the phone
    if (edge.has('Escape')) {
      if (game.garage.open) game.garage.open = false;
      else if (game.mapOpen) { game.mapOpen = false; hideOverlays(); }
      else if (game.phoneOpen) { game.phoneOpen = false; hideOverlays(); }
      else { game.phoneOpen = true; showOverlay('phone'); }
    }
    if (game.mapOpen || game.phoneOpen) { edge.clear(); updateCamera(dt); updateHud(game); renderer.render(scene, camera); return; }
    // garage menu navigation
    if (game.garage.open) {
      if (edge.has('ArrowUp')) game.garage.sel = (game.garage.sel + 2) % 3;
      if (edge.has('ArrowDown')) game.garage.sel = (game.garage.sel + 1) % 3;
      if (edge.has('Enter')) buySelected(game);
      if (edge.has('KeyG') || edge.has('Escape')) { game.garage.open = false; audio.resume(); }
    } else {
      // enter / exit car
      if (edge.has('KeyE')) {
        if (p.inCar) exitCar(game);
        else {
          const found = nearestCar(p, game.traffic);
          if (found) {
            const stolen = found.traffic;
            enterCar(game, found);
            applyArmor(game);
            if (stolen) addHeat(game, 20);
            audio.pickup();
          }
        }
      }
      if (edge.has('KeyG') && nearGarage(game)) { game.garage.open = true; }
      if (edge.has('KeyC')) game.radioIdx = (game.radioIdx + 1) % 3;
      if (edge.has('Enter') && !game.mission.started && !game.mission.completed) startMission(game, 0);
      if (edge.has('KeyF')) tryPunch(game);
      if (consumeClick()) tryShoot(game);
      // movement
      if (p.inCar) {
        // shot mode: auto-drive the chase so the cover shows speed
        const din = game.shotMode === 'chase' ? { forward: true, back: false, left: false, right: false } : driveInput();
        driveCar(p.inCar, din, dt, game.world, game.garage.owned);
        audio.engine(true, Math.abs(p.inCar.speed) / CFG.CAR_MAX_SPORT);
        if (p.inCar.hp <= 0) { /* car wrecked: force exit */ exitCar(game); }
      } else {
        updatePlayerOnFoot(p, footInput(), dt, game.world, game.camYaw);
        audio.engine(false, 0);
      }
      updateTraffic(game.traffic, dt, game.world, { x: p.inCar ? p.inCar.x : p.x, z: p.inCar ? p.inCar.z : p.z }, game.gunshotAt);
      updatePolice(game, dt);
      updateHeli(game, dt);
      updateMissions(game, dt);
      updateMissionQueue(game, dt);
      updateCombat(game, dt);
      updateEnemies(game, dt);
      if (game.gunshotT > 0) { game.gunshotT -= dt; if (game.gunshotT <= 0) game.gunshotAt = null; }
      if (p.hp <= 0) { game.state = 'wasted'; showOverlay('wasted'); audio.siren(false); }
    }
    if (edge.has('KeyM')) { game.muted = !game.muted; audio.setMuted(game.muted); writeSave(game); }
    if (edge.has('KeyP')) { game.state = 'paused'; showOverlay('paused'); audio.engine(false, 0); audio.siren(false); }
  } else if (game.state === 'paused') {
    if (edge.has('KeyP') || edge.has('Escape')) { game.state = 'playing'; hideOverlays(); }
  } else if (game.state === 'busted' || game.state === 'wasted' || game.state === 'complete') {
    if (game.state === 'complete' && !game.completeShown) { game.completeShown = true; showOverlay('complete'); }
    if (edge.has('KeyR')) restart();
  } else if (game.state === 'title') {
    if (edge.has('Enter')) startGame();
  }

  // beacon pulse + night-guard scan sweep
  if (game.nightGuards) {
    for (const g of game.nightGuards) g.rotation.y += dt * 0.25;
  }

  // beacon pulse
  if (game.world?.beacon) {
    const s = 1 + Math.sin(performance.now() * 0.004) * 0.25;
    game.world.beacon.scale.set(s, 1, s);
  }
  // mission objective diamond bobs + spins above the target; ring pulses
  if (game.world?.objectiveDiamond && game.world.objectiveDiamond.visible) {
    const t = performance.now() * 0.002;
    game.world.objectiveDiamond.position.y = 20 + Math.sin(t) * 2.5;
    game.world.objectiveDiamond.rotation.y += dt * 1.5;
  }
  if (game.world?.objectiveRing && game.world.objectiveRing.visible) {
    const s = 1 + Math.sin(performance.now() * 0.003) * 0.12;
    game.world.objectiveRing.scale.set(s, s, 1);
  }

  updateCamera(dt);
  updateHud(game);
  const wrap = document.getElementById('wrap');
  if (wrap) wrap.classList.toggle('title-mode', game.state === 'title');
  renderer.render(scene, camera);
  edge.clear();
}

init();
