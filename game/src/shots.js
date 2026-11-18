// Deterministic ?shot= scenes for the 4 dossier screenshots.
// chase: low-camera sunset police chase (cover) · shootout: bright daytime
// market shootout, crowded plaza · map: fullscreen city map · title: title
// screen over the beach at sunset.
import * as THREE from 'three';
import { setNight } from './world.js';
import { makeCar } from './car.js';
import { buildCrewMember, buildCopCar, buildHeli, buildPed } from './entities.js';
import { startMission } from './missions.js';
import { addHeat } from './police.js';
import { fireShot } from './combat.js';
import { openMap, showTitle } from './hud.js';
import { PAL } from './config.js';
import { mulberry32, range, pick } from './random.js';

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
  } else if (name === 'shootout') {
    // BRIGHT DAYTIME shootout on the downtown market road (z=400). Jax stands
    // ON the asphalt facing east into Rico's crew; market stalls + shops flank
    // the road, 24 market peds flee on the sidewalks (never between camera and
    // Jax), parked cars as cover, cops + heli in frame. Chapter 8 SHOWDOWN —
    // same mission, daytime crowded stage instead of the empty night docks.
    // Lateral offset is deliberate: dead-ahead targets make the tracers
    // edge-on to the camera (invisible); offset targets give diagonal fire
    // lines across the frame.
    setNight(game.world, 0);
    game.clock.hour = 16; game.clock.minute = 30;
    p.money = 9850;
    p.hp = 10000; // scene player is invulnerable: no BUSTED mid-render
    p.x = 60; p.z = 400; p.angle = Math.PI / 2; // on the road, facing east (+x)
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.angle;
    p.ammo = 23; p.reserve = 160; p.weapon = 'WASP SMG';
    startMission(game, 7); // Showdown
    game.mission.stage = 1;
    addHeat(game, 60); // 3 stars
    // Rico's crew on the road ahead, CLOSE (14–40u from Jax) so their faces,
    // caps and return-fire tracers read at the new 8u camera. All within 55u,
    // so at least two return fire. Lateral offsets are DELIBERATE (±11–14u):
    // dead-ahead targets make the tracers edge-on to the camera (invisible);
    // offset targets give diagonal fire lines across the frame.
    const defs = [
      { x: 76, z: 388, hp: 100, rico: false },
      { x: 84, z: 414, hp: 100, rico: false },
      { x: 92, z: 389, hp: 100, rico: false },
      { x: 100, z: 413, hp: 220, rico: true },
    ];
    for (const d of defs) {
      const mesh = buildCrewMember(d.rico);
      mesh.position.set(d.x, 0, d.z);
      mesh.rotation.y = -Math.PI / 2; // face west, toward Jax
      game.scene.add(mesh);
      // invulnerable during the scene: tracers + return fire show, nobody dies,
      // so the Showdown can never complete into the victory screen
      game.enemies.push({ mesh, x: d.x, z: d.z, hp: d.hp, dead: false, rico: d.rico, fireT: 0.4, invuln: true });
    }
    // crowded market: 24 peds fleeing on the sidewalks + around the stalls.
    // Kept in game.shotPeds so updateShot can re-scare them and clamp them
    // inside the frame — and never west of x=70, i.e. never between camera
    // and Jax.
    const rng = mulberry32(2026);
    game.shotPeds = [];
    for (let i = 0; i < 24; i++) {
      const mesh = buildPed(pick(rng, PAL.ped));
      const band = rng();
      const x = range(rng, 75, 320);
      const z = band < 0.4 ? range(rng, 372, 386) : band < 0.75 ? range(rng, 414, 428) : range(rng, 448, 484);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = range(rng, 0, Math.PI * 2);
      game.scene.add(mesh);
      const ped = { mesh, x, z, horizontal: true, line: z, dir: 1, speed: 2, flee: 2.5, fx: range(rng, -1, 1), fz: range(rng, -1, 1), shotPed: true };
      game.peds.push(ped);
      game.shotPeds.push(ped);
    }
    // parked cars as cover near the crew (off the direct fire line)
    for (const [cx, cz, col] of [[125, 418, 0xf2f2f2], [140, 386, 0xd23c3c]]) {
      const c = makeCar(cx, cz, Math.PI / 2, false, col);
      game.scene.add(c.mesh);
    }
    // 2 cop cars + heli, pinned by updateShot so they never ram Jax.
    // Close enough to read in frame (~48u from Jax, not 105–135u).
    game.police.stars = 3;
    for (const [cx, cz] of [[108, 386], [106, 418]]) {
      const mesh = buildCopCar();
      mesh.position.set(cx, 0, cz);
      mesh.rotation.y = Math.PI / 2;
      game.scene.add(mesh);
      game.police.copCars.push({ mesh, x: cx, z: cz, angle: Math.PI / 2, speed: 0 });
    }
    if (!game.police.heli) {
      game.police.heli = buildHeli();
      game.scene.add(game.police.heli);
    }
    game.police.heli.position.set(115, 17, 400);
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
    // lower + closer than before: the tighter chase FOV would cut it off at the old spot
    const h = game.police.heli;
    if (h) h.position.set(car.x - 44, 26, car.z + 22);
  } else if (game.shotMode === 'shootout' && game.state === 'playing') {
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
    // pin the cop cars + heli so the formation never breaks up
    const pin = [[108, 386], [106, 418]];
    game.police.copCars.forEach((c, i) => {
      const [cx, cz] = pin[i % pin.length];
      c.x = cx; c.z = cz;
      c.mesh.position.set(cx, 0, cz);
      c.mesh.rotation.y = Math.PI / 2;
    });
    const h = game.police.heli;
    if (h) h.position.set(115, 17, 400);
    // keep the market crowd scared and inside the frame (fear pose = arms up)
    game._scareT = (game._scareT || 0) - dt;
    if (game._scareT <= 0 && game.shotPeds) {
      game._scareT = 2;
      for (const ped of game.shotPeds) {
        // clamp back into the plaza if the flee drifted them out — never west
        // of x=70, so nobody ends up between the camera and Jax
        ped.x = Math.max(72, Math.min(318, ped.x));
        ped.z = Math.max(368, Math.min(486, ped.z));
        ped.flee = 2.5;
        // flee sideways along the street, away from the gunfire line
        ped.fx = Math.random() < 0.5 ? -1 : 1;
        ped.fz = (Math.random() - 0.5) * 0.8;
        ped.mesh.position.set(ped.x, 0, ped.z);
      }
    }
  }
}
