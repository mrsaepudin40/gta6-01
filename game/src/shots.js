// Deterministic ?shot= scenes: ?shot=chase|start|night|garage&seed=N
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeCarMesh, makeCopCarMesh } from './entities.js';
import { makeCarState } from './car.js';
import { startMission } from './missions.js';
import { makePlayer } from './player.js';

function setClock(game, day, hh, mm) {
  game.day = day;
  game.clockMin = hh * 60 + mm;
}

function putPlayerInCar(game, x, z, heading, sport, speed) {
  const mesh = makeCarMesh(sport ? 0x3fa7d6 : 0xc94f43, { sport });
  game.scene.add(mesh);
  const st = makeCarState(x, z, heading, { mesh, sport, max: sport ? CFG.CAR_MAX_SPORT : CFG.CAR_MAX, kind: sport ? 'sport' : 'sedan' });
  st.speed = speed || 0;
  game.player.inCar = st;
  game.player.mesh.visible = false;
  return st;
}

function addCop(game, x, z, heading, speed) {
  const mesh = makeCopCarMesh();
  game.scene.add(mesh);
  const st = makeCarState(x, z, heading, { mesh, max: CFG.CAR_MAX + 2, accel: CFG.CAR_ACCEL + 6, kind: 'police' });
  st.speed = speed || 0;
  game.police.cars.push(st);
  return st;
}

export function applyShot(game, name, seed) {
  game.shotMode = name;
  const p = game.player;
  p.money = 0; p.hp = CFG.PLAYER_HP;
  game.police.heat = 0;
  game.night = false;
  if (name === 'chase') {
    // 4-star police chase, Mission 7/8 The Last Bridge, dense HUD
    // Player on road x=800 heading north (-Z) so the auto-drive stays on the road.
    game.state = 'playing';
    p.money = 4870;
    setClock(game, 1, 18, 25);
    putPlayerInCar(game, 800, -200, Math.PI, true, 30);
    // police flanking in convoy formation (held by updatePolice in shot mode)
    // slightly AHEAD of the player: the chase camera sits 12u behind, so
    // anything behind the player is behind the camera too.
    addCop(game, 780, -218, Math.PI, 28);
    addCop(game, 820, -218, Math.PI, 26);
    addCop(game, 845, -232, Math.PI, 27);
    game.police.heat = 80;
    startMission(game, 6);
    game.mission.timer = 72;
    game.mission.marker = { ...game.world.markers.bridge };
  } else if (name === 'start') {
    // title screen over the city (fixed cinematic camera in main.js)
    game.state = 'title';
    setClock(game, 1, 17, 40);
    p.x = 0; p.z = 200;
    p.mesh.position.set(0, 0, 200);
    game.titleCam = { x: 620, y: 300, z: 980, tx: 0, ty: 20, tz: 0 };
  } else if (name === 'night') {
    // Night Shift on foot at night, 1 star, pistol ammo
    game.state = 'playing';
    p.money = 1240;
    setClock(game, 1, 21, 48);
    game.night = true;
    p.x = 0; p.z = 0; p.heading = 0;
    p.mesh.position.set(0, 0, 0);
    game.police.heat = 20;
    startMission(game, 5);
    game.combat.ammo = 12; game.combat.reserve = 24;
  } else if (name === 'garage') {
    // Benny's Garage menu open
    game.state = 'playing';
    p.money = 1850;
    setClock(game, 1, 17, 40);
    p.x = -800; p.z = 330; p.heading = Math.PI;
    p.mesh.position.set(-800, 0, 330);
    game.garage.open = true;
    game.garage.sel = 1;
  }
}
