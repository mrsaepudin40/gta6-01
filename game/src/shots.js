// Deterministic ?shot= scenes: ?shot=chase|start|night|garage&seed=N
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeCarMesh, makeCopCarMesh, makePedMesh, makeHeliMesh } from './entities.js';
import { makeCarState } from './car.js';
import { startMission, syncObjectiveMarker } from './missions.js';
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

// Spawn the police heli already at its hover spot (ahead of the player),
// so it is in frame from the first rendered frame instead of lerping in
// from the spawn point over several seconds.
function spawnHeliNow(game) {
  if (game.police.heli) return;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const heading = p.inCar ? p.inCar.heading : p.heading;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const mesh = makeHeliMesh();
  game.scene.add(mesh);
  game.police.heli = { mesh, x: px + fx * 45 - fz * 12, z: pz + fz * 45 + fx * 12 };
}

function addTrafficCar(game, x, z, heading) {
  const mesh = makeCarMesh(0xf2c230);
  game.scene.add(mesh);
  const st = makeCarState(x, z, heading, { mesh, max: 13, accel: 10 });
  const loop = [{ x: x - 200, z: z - 200 }, { x: x + 200, z: z - 200 }, { x: x + 200, z: z + 200 }, { x: x - 200, z: z + 200 }];
  game.traffic.cars.push({ ...st, loop, wp: 1, color: 0xf2c230, parked: false });
  return st;
}

export function applyShot(game, name, seed) {
  game.shotMode = name;
  const p = game.player;
  p.money = 0; p.hp = CFG.PLAYER_HP;
  game.police.heat = 0;
  game.night = false;
  if (name === 'chase') {
    // 4-star police chase on the beach road (x=1200), Mission 7 The Last Bridge.
    // Bridge marker (1200,-1200) sits straight ahead: beacon + ring + diamond
    // in frame, beach + sea + umbrellas on the right, towers on the left.
    game.state = 'playing';
    p.money = 4870;
    setClock(game, 1, 16, 45);
    putPlayerInCar(game, 1200, -650, Math.PI, true, 30);
    // police flanking in convoy formation (held by updatePolice in shot mode)
    // slightly AHEAD of the player: the chase camera sits 12u behind, so
    // anything behind the player is behind the camera too.
    addCop(game, 1180, -668, Math.PI, 28);
    addCop(game, 1220, -668, Math.PI, 26);
    addCop(game, 1245, -682, Math.PI, 27);
    // staged traffic ahead on the beach road + cross streets, so the frame is busy
    addTrafficCar(game, 1200, -870, Math.PI);
    addTrafficCar(game, 1180, -1010, Math.PI);
    addTrafficCar(game, 1220, -1150, Math.PI);
    addTrafficCar(game, 800, -850, Math.PI / 2);
    addTrafficCar(game, 400, -800, 0);
    game.police.heat = 80;
    spawnHeliNow(game);
    startMission(game, 6);
    game.mission.timer = 72;
    game.mission.marker = { ...game.world.markers.bridge };
  } else if (name === 'chase2') {
    // Downtown chase, second angle: towers both sides, Mission 7 active.
    game.state = 'playing';
    p.money = 4870;
    setClock(game, 1, 16, 45);
    putPlayerInCar(game, 400, -600, Math.PI, true, 30);
    addCop(game, 380, -618, Math.PI, 28);
    addCop(game, 420, -618, Math.PI, 26);
    addCop(game, 445, -632, Math.PI, 27);
    addTrafficCar(game, 400, -820, Math.PI);
    addTrafficCar(game, 380, -960, Math.PI);
    addTrafficCar(game, 800, -700, Math.PI / 2);
    game.police.heat = 80;
    spawnHeliNow(game);
    startMission(game, 6);
    game.mission.timer = 72;
    game.shotMode = 'chase'; // reuse convoy formation + auto-drive
  } else if (name === 'heli') {
    // Helicopter showcase: same chase, road x=800 — heli hovers ahead, in frame.
    game.state = 'playing';
    p.money = 4870;
    setClock(game, 1, 16, 45);
    putPlayerInCar(game, 800, -300, Math.PI, true, 30);
    addCop(game, 780, -318, Math.PI, 28);
    addCop(game, 820, -318, Math.PI, 26);
    addTrafficCar(game, 800, -520, Math.PI);
    addTrafficCar(game, 780, -660, Math.PI);
    game.police.heat = 80;
    spawnHeliNow(game);
    startMission(game, 6);
    game.mission.timer = 72;
    game.shotMode = 'chase';
  } else if (name === 'beach') {
    // Bright beach day on foot: sand, umbrellas, stalls, beachgoers, sea.
    // Mission 4 Cold Chain stage 2 — deliver to Sunset Beach (banner + timer).
    game.state = 'playing';
    p.money = 1240;
    setClock(game, 1, 15, 30);
    p.x = 1470; p.z = 400; p.heading = Math.PI;
    p.mesh.position.set(1470, 0, 400);
    startMission(game, 3);
    game.mission.stage = 1;
    game.mission.marker = { ...game.world.markers.beach };
    game.mission.timer = 72;
    syncObjectiveMarker(game);
  } else if (name === 'market') {
    // Beach market stalls up close — [E] prompt visible, vendors + crates.
    // Player stands back so the whole stall + beach behind it fit the frame.
    game.state = 'playing';
    p.money = 1240;
    setClock(game, 1, 16, 0);
    p.x = 1330; p.z = 200; p.heading = 2.36;
    p.mesh.position.set(1330, 0, 200);
    game.police.heat = 0;
  } else if (name === 'mission') {
    // Objective close-up on foot: beacon + ring + diamond at Sunset Bridge,
    // Mission 7 active with Mara's dialogue.
    game.state = 'playing';
    p.money = 3200;
    setClock(game, 1, 16, 45);
    p.x = 1120; p.z = -1080; p.heading = 2.55;
    p.mesh.position.set(1120, 0, -1080);
    game.police.heat = 80;
    spawnHeliNow(game);
    startMission(game, 6);
    game.mission.timer = 72;
  } else if (name === 'phone') {
    // Phone open (Esc screen): map tab, Mission 3 in progress.
    game.state = 'playing';
    p.money = 2450;
    setClock(game, 1, 16, 0);
    p.x = 0; p.z = 200;
    p.mesh.position.set(0, 0, 200);
    startMission(game, 2);
    game.mission.done = 2;
    game.phoneOpen = true;
  } else if (name === 'map') {
    // fullscreen city map + missions (Tab screen), mission 3 in progress
    game.state = 'playing';
    p.money = 2450;
    setClock(game, 1, 16, 0);
    p.x = 0; p.z = 200;
    p.mesh.position.set(0, 0, 200);
    startMission(game, 2);
    game.mission.done = 2; // acts 1-2 already passed
    game.mapOpen = true;
  } else if (name === 'start') {
    // title screen over the city (fixed cinematic camera in main.js)
    game.state = 'title';
    setClock(game, 1, 16, 20);
    p.x = 0; p.z = 200;
    p.mesh.position.set(0, 0, 200);
    game.titleCam = { x: 620, y: 300, z: 980, tx: 0, ty: 20, tz: 0 };
  } else if (name === 'night') {
    // Night Shift on foot at night, 1 star, pistol ammo — player near stash 1
    // with two patrolling guards + vision cones in frame.
    game.state = 'playing';
    p.money = 1240;
    setClock(game, 1, 21, 48);
    game.night = true;
    p.x = 1120; p.z = -40; p.heading = 1.1;
    p.mesh.position.set(1120, 0, -40);
    game.police.heat = 20;
    startMission(game, 5);
    game.combat.ammo = 12; game.combat.reserve = 24;
    game.nightGuards = [];
    const guardSpots = [[1160, -20, 1.3], [1230, 50, 0.9]];
    for (const [gx, gz, heading] of guardSpots) {
      const grp = new THREE.Group();
      const ped = makePedMesh(0x1a2a6b, { cop: true });
      grp.add(ped);
      // vision cone: apex at the guard, opening 14u ahead (geometry pre-rotated)
      const coneGeo = new THREE.ConeGeometry(6, 14, 20, 1, true);
      coneGeo.rotateX(-Math.PI / 2);
      coneGeo.translate(0, 0, 7);
      const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      cone.position.set(0, 0.7, 0);
      grp.add(cone);
      grp.position.set(gx, 0, gz);
      grp.rotation.y = heading;
      game.scene.add(grp);
      game.nightGuards.push(grp);
    }
  } else if (name === 'garage') {
    // Benny's Garage menu open — player stands off to the side so the
    // garage building shows at an angle behind the menu, beacon off-center.
    game.state = 'playing';
    p.money = 1850;
    setClock(game, 1, 16, 20);
    p.x = -720; p.z = 300; p.heading = -0.67;
    p.mesh.position.set(-720, 0, 300);
    game.garage.open = true;
    game.garage.sel = 1;
  } else if (name === 'shootout') {
    // Public daytime shootout: Jax on foot trading fire with Rico's crew
    // behind police-car cover, pedestrians fleeing, traffic pulled over.
    // Mission 8 (Showdown) banner + Mara dialogue. Variant via seed:
    // wide (default) / close / plaza. The crew holds cover with huge HP
    // (Jax cannot kill them mid-capture) and the mission stays stage 0
    // (docks marker is ~2000u away), so the frame never completes/fails.
    const layouts = {
      wide: {
        jax: [400, -550, Math.PI],
        cops: [[378, -588, 2.6], [424, -592, 3.7], [400, -612, Math.PI]],
        crew: [[400, -584, 0], [382, -596, 0.37], [418, -596, -0.37]],
        peds: [[375, -580], [390, -585], [410, -578], [425, -590], [370, -610], [430, -615], [395, -620], [415, -605]],
        stopped: [[360, -590, 0.5, 0xe8e3d8], [440, -600, -0.4, 0x9b7ec6]],
      },
      close: {
        jax: [400, -560, Math.PI],
        cops: [[380, -580, 2.6], [420, -582, 3.7], [400, -596, Math.PI]],
        crew: [[400, -578, 0], [384, -586, 0.37], [416, -586, -0.37]],
        peds: [[378, -572], [392, -576], [408, -570], [422, -578], [376, -592], [424, -594], [396, -598], [412, -592]],
        stopped: [[362, -582, 0.5, 0xe8e3d8], [438, -592, -0.4, 0x9b7ec6]],
      },
      plaza: {
        jax: [0, -400, 2.4],
        cops: [[-18, -430, 2.0], [20, -428, 3.0], [0, -445, 2.4]],
        crew: [[0, -424, -0.74], [-14, -436, -0.4], [16, -436, -1.1]],
        peds: [[-22, -418], [-10, -412], [12, -410], [24, -420], [-26, -438], [26, -440], [-6, -446], [8, -442]],
        stopped: [[-30, -425, 0.3, 0xf2c230], [32, -432, -0.3, 0x3fa7d6]],
      },
    };
    const L = layouts[seed] || layouts.wide;
    game.state = 'playing';
    p.money = 3200;
    setClock(game, 1, 16, 30);
    p.x = L.jax[0]; p.z = L.jax[1]; p.heading = L.jax[2];
    p.mesh.position.set(p.x, 0, p.z);
    game.police.heat = 60;
    spawnHeliNow(game);
    startMission(game, 7);
    game.combat.ammo = 8; game.combat.reserve = 60;
    for (const [x, z, h] of L.cops) addCop(game, x, z, h, 0);
    for (const [x, z, h] of L.crew) {
      const mesh = makePedMesh(0x8b1e1e);
      mesh.position.set(x, 0, z);
      game.scene.add(mesh);
      game.enemies.push({ x, z, heading: h, hp: 10000, maxHp: 10000, boss: false, mesh, shootT: 0.2, dead: false, hold: true });
    }
    // fleeing pedestrians staged around the firefight (Jax's shots keep
    // refreshing gunshotAt, so they keep running away from him)
    game.traffic.peds.slice(0, 8).forEach((ped, i) => {
      const [x, z] = L.peds[i];
      ped.x = x; ped.z = z; ped.fleeT = 3;
      ped.mesh.position.set(x, 0, z);
    });
    // stopped traffic pulled over at the roadside
    for (const [x, z, h, color] of L.stopped) {
      const mesh = makeCarMesh(color);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = h;
      game.scene.add(mesh);
    }
  }
}
