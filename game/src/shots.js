// Deterministic ?shot= scenes for the 4 dossier screenshots.
// chase: low-camera sunset police chase (cover) · night: neon shootout
// map: fullscreen city map · title: title screen over the beach at sunset.
import * as THREE from 'three';
import { setNight } from './world.js';
import { makeCar } from './car.js';
import { buildCrewMember, buildCopCar, buildHeli } from './entities.js';
import { startMission, say } from './missions.js';
import { addHeat } from './police.js';
import { fireShot } from './combat.js';
import { openMap, showTitle } from './hud.js';

export function applyShot(game, name, seed) {
  game.shotMode = name;
  game.shotSeed = seed || '';
  const p = game.player;
  if (name === 'chase') {
    // Sunset chase on the beach road, heading west into the sun.
    setNight(game.world, 0);
    game.clock.hour = 18; game.clock.minute = 52;
    p.money = 38420;
    const car = makeCar(1150, 0, Math.PI, true, 0xff2e88);
    car.speed = 40;
    game.scene.add(car.mesh);
    game.parked = []; game.traffic = [];
    p.inCar = car; p.mesh.visible = false;
    p.speedKmh = 40 * 3.6;
    startMission(game, 6); // The Last Bridge, 4 stars
    game.mission.timer = 67;
    addHeat(game, 80);
    // 3 cop cars flanking (real cop cars: lightbar + wheels, or updatePolice throws)
    for (const [dx, dz] of [[-14, 10], [-16, -12], [10, 14]]) {
      const mesh = buildCopCar();
      mesh.position.set(car.x + dx, 0, car.z + dz);
      mesh.rotation.y = Math.PI;
      game.scene.add(mesh);
      game.police.copCars.push({ mesh, x: car.x + dx, z: car.z + dz, angle: Math.PI, speed: 40 });
    }
    // helicopter overhead (placed explicitly: updatePolice would hover it behind the camera)
    game.police.stars = 4;
    if (!game.police.heli) {
      game.police.heli = buildHeli();
      game.scene.add(game.police.heli);
    }
    game.state = 'playing';
  } else if (name === 'night') {
    // Neon night shootout on the z=-400 road, facing east: Rico's crew stands
    // off the road centreline, in front of the CLUB SOLMAR neon sign (120, -360).
    // Lateral offset is deliberate: dead-ahead targets make the tracers
    // edge-on to the camera (invisible); offset targets give diagonal fire
    // lines across the frame. A warm practical light makes the crew readable
    // at night (street lighting alone leaves Standard-material peds black).
    setNight(game.world, 1);
    game.clock.hour = 21; game.clock.minute = 42;
    p.money = 9850;
    p.x = 0; p.z = -400; p.angle = Math.PI / 2;
    p.mesh.position.set(p.x, 0, p.z);
    p.ammo = 23; p.reserve = 160; p.weapon = 'WASP SMG';
    startMission(game, 7); // Showdown
    game.mission.stage = 1;
    addHeat(game, 40);
    const shootLight = new THREE.PointLight(0xffb36b, 1500, 160, 2);
    shootLight.position.set(55, 12, -375);
    game.scene.add(shootLight);
    const defs = [
      { x: 38, z: -376, hp: 100, rico: false },
      { x: 56, z: -368, hp: 100, rico: false },
      { x: 72, z: -382, hp: 220, rico: true },
    ];
    for (const d of defs) {
      const mesh = buildCrewMember(d.rico);
      mesh.position.set(d.x, 0, d.z);
      mesh.rotation.y = Math.PI; // face the player (camera sees their fronts)
      game.scene.add(mesh);
      // invulnerable during the scene: tracers + return fire show, nobody dies,
      // so the Showdown can never complete into the victory screen
      game.enemies.push({ mesh, x: d.x, z: d.z, hp: d.hp, dead: false, rico: d.rico, fireT: 0.5, invuln: true });
    }
    say(game, 'Rico', 'Jax Marlowe. You should have stayed away from my docks.', 6);
    game.state = 'playing';
  } else if (name === 'map') {
    setNight(game.world, 0);
    game.clock.hour = 18; game.clock.minute = 6;
    p.money = 41250;
    game.mission.done = 4;
    startMission(game, 2); // Getaway
    game.state = 'playing';
    openMap(game);
  } else if (name === 'title') {
    setNight(game.world, 0);
    game.clock.hour = 18; game.clock.minute = 40;
    game.state = 'title';
    // full title overlay: menu (incl. Continue) + HOW TO PLAY panel + character row
    showTitle(game, { day: 3, money: 31420, done: 4 });
    document.getElementById('howto-panel').classList.remove('hidden');
  }
  game.shotApplied = true;
}

export function updateShot(game, dt) {
  if (!game.shotMode) return;
  const p = game.player;
  if (game.shotMode === 'chase' && p.inCar) {
    // auto-drive west along the beach road
    const car = p.inCar;
    car.speed = 40;
    car.angle = Math.PI;
    car.x -= 40 * dt;
    if (car.x < -1400) car.x = 1200;
    car.z = 0;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.z += 40 * dt * 1.6;
    p.speedKmh = 144;
    // cop formation follows
    for (let i = 0; i < game.police.copCars.length; i++) {
      const c = game.police.copCars[i];
      const off = [[-14, 10], [-16, -12], [10, 14]][i % 3];
      c.x = car.x + off[0]; c.z = car.z + off[1];
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = Math.PI;
    }
    game.mission.timer = Math.max(1, game.mission.timer - dt);
    // keep the helicopter ahead-left in frame (updatePolice would hover it behind the camera)
    const h = game.police.heli;
    if (h) h.position.set(car.x - 55, 34, car.z + 26);
  } else if (game.shotMode === 'night' && game.state === 'playing') {
    // looped fire at the nearest living enemy
    game.combat.fireT -= dt;
    if (game.combat.fireT <= 0) {
      const alive = game.enemies.filter((e) => !e.dead);
      if (alive.length) {
        const e = alive[0];
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        fireShot(game, { x: p.x, z: p.z }, { x: (e.x - p.x) / d, z: (e.z - p.z) / d }, { silent: true });
        p.ammo = Math.max(8, p.ammo);
        game.combat.fireT = 0.18;
      }
    }
  }
}
