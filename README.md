# Solmar Bay — a sun-baked crime story

A top-down 2D open-world crime game in the spirit of the early GTA games,
built for the make.fun `gta6-01` bounty. Vanilla JavaScript, no libraries,
no network requests — everything runs from static files.

You are **Jax Marlowe**, new in Solmar Bay, a beach city that never cools
down. Run four jobs for the fixer Mara, steal cars, outrun the law, and
take the docks from Rico's crew.

## Play

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open `game/index.html` in a desktop browser, or serve it as above.

## Controls

- **WASD / arrows** — walk, or drive (gas / brake / steer)
- **E** — steal / enter / exit a car
- **Mouse + click** — aim and shoot (on foot)
- **F** — punch
- **P** — pause · **R** — restart · **M** — mute · **Enter** — start a job

## Systems

- **City**: procedurally generated grid city (roads, blocks, buildings with
  sun shadows, parks, a beach and the sea) from a seed.
- **Traffic & pedestrians**: cars drive the roads, pedestrians walk the
  sidewalks and flee from gunfire.
- **Wanted 0–5 stars**: stealing cars, hitting pedestrians and shooting
  raise your heat; police cars and foot cops chase you. Get caught and
  you are BUSTED; lose all health and you are WASTED.
- **Missions**: four story jobs with objectives, dialogue and cash rewards
  — The Borrow, Package Run, Getaway (90-second timer) and Showdown at
  the Docks.
- **Combat**: pistol with mouse aim, punching, car damage and smoke,
  explosions.
- **HUD**: money, wanted stars, health, minimap (player / police / mission
  markers), objective text, mission timer, speed.
- **Save**: progress (money, unlocked job) auto-saves to localStorage;
  Continue on the title screen.
- **Sound**: synthesized WebAudio — engine hum, sirens, gunshots, pickups.

## Screenshots

Deterministic scenes via `?shot=chase|drive|foot|start&seed=N`:

| file | scene |
| --- | --- |
| `screenshots/1-chase.jpg` | Police chase, 3 wanted stars, minimap, mission HUD |
| `screenshots/2-drive.jpg` | Driving fast down the avenue |
| `screenshots/3-foot.jpg` | On-foot mission at the docks |
| `screenshots/4-start.jpg` | Title screen |

## Layout

- `game/index.html` — page + canvas
- `game/src/main.js` — loop, state machine, camera, car enter/exit
- `game/src/config.js` — constants, palette, mission data
- `game/src/world.js` — city generation, drawing, collision
- `game/src/entities.js` — player, cars, pedestrians
- `game/src/traffic.js` — traffic + pedestrian AI
- `game/src/police.js` — wanted level, police chase, arrests
- `game/src/missions.js` — the four jobs
- `game/src/combat.js` — shooting, punching, bullets, explosions
- `game/src/hud.js` — HUD, minimap, title/pause/end screens
- `game/src/audio.js` — WebAudio synth
- `game/src/save.js` — localStorage save/load
- `game/src/shots.js` — deterministic `?shot=` scenes
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `main.ts` — copies game/ + screenshots/ to the output and writes dossier.json
