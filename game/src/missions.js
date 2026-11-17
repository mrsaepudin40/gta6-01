// Eight story missions: objectives, dialogue, rewards, timers, result banners.
// Round 1: full mission data + generic marker/stage flow; showdown combat lands in round 2.
import { MISSIONS } from './config.js';
import { audio } from './audio.js';
import { addHeat } from './police.js';
import { dist2d } from './random.js';
import { writeSave } from './save.js';

export function newMissionState() {
  return { idx: -1, stage: 0, timer: 0, marker: null, dialog: [], dialogT: 0, completed: false, started: false, done: 0, banner: null, bannerT: 0 };
}

export function say(game, who, text, secs = 3.2) {
  game.mission.dialog.push({ who, text });
  game.mission.dialogT = secs;
}

export function missionTitle(game) {
  const m = game.mission;
  if (!m.started || m.idx < 0) return '';
  return `MISSION ${m.idx + 1}/8 — ${MISSIONS[m.idx].name.toUpperCase()}`;
}

export function missionObjective(game) {
  const m = game.mission;
  if (m.completed) return 'Solmar Bay is yours. Free roam — cause chaos, lose the law, have fun.';
  if (!m.started || m.idx < 0) return 'Press Enter to start your first job for Mara.';
  const def = MISSIONS[m.idx];
  return `${def.name}: ${def.briefing}`;
}

function markerFor(game, idx, stage) {
  const W = game.world.markers;
  switch (idx) {
    case 0: return stage === 0 ? null : { ...W.riverside };
    case 1: return stage === 0 ? { ...W.docks } : { ...W.safehouse };
    case 2: return { ...W.hideout };
    case 3: return stage === 0 ? { ...W.docks } : { ...W.beach };
    case 4: return { ...W.garage };
    case 5: return { ...W.beach }; // stash 1 (round 2 adds 2 more)
    case 6: return { ...W.bridge };
    case 7: return { ...W.docks };
    default: return null;
  }
}

export function startMission(game, idx) {
  const m = game.mission;
  const def = MISSIONS[idx];
  m.idx = idx; m.stage = 0; m.started = true; m.timer = 0;
  if (idx === 2 || idx === 3 || idx === 6) m.timer = 90;
  if (idx === 2) addHeat(game, 40);
  if (idx === 6) addHeat(game, 80);
  m.marker = markerFor(game, idx, 0);
  if (game.world.markerMesh && m.marker) {
    game.world.markerMesh.position.set(m.marker.x, 45, m.marker.z);
    game.world.markerMesh.visible = true;
  }
  for (const [who, text] of def.dialog) say(game, who, text, 3.2);
  say(game, 'Objective', def.briefing, 5);
}

export function updateMissions(game, dt) {
  const m = game.mission;
  if (m.dialogT > 0) m.dialogT -= dt;
  if (m.dialog.length > 0 && m.dialogT <= 0) { m.dialog.shift(); m.dialogT = m.dialog.length > 0 ? 3.2 : 0; }
  if (m.bannerT > 0) m.bannerT -= dt;
  if (!m.started || m.idx < 0 || m.completed) return;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const at = (mk, r) => mk && dist2d(px, pz, mk.x, mk.z) < r;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(game, 'Too slow — the job went cold. Try again.'); return; }
  }
  const idx = m.idx;
  if (idx === 0) {
    if (m.stage === 0 && p.inCar) { m.stage = 1; m.marker = markerFor(game, 0, 1); say(game, 'Mara', 'Good. Now bring it to Riverside.', 3); }
    else if (m.stage === 1 && at(m.marker, 55)) completeMission(game);
  } else if (idx === 1) {
    if (m.stage === 0 && at(m.marker, 55)) {
      m.stage = 1; m.marker = markerFor(game, 1, 1);
      addHeat(game, 40);
      say(game, 'Mara', 'Package secured. The law is coming — get to the Safe House!', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 55)) completeMission(game);
  } else if (idx === 2 || idx === 3 || idx === 6) {
    if (at(m.marker, 55)) completeMission(game);
  } else if (idx === 4) {
    if (p.inCar && p.inCar.sport && at(m.marker, 55)) completeMission(game);
    else if (at(m.marker, 55) && !p.inCar) say(game, 'Benny', 'I need a sports car, Jax. Not those legs.', 2);
  } else if (idx === 5) {
    if (at(m.marker, 55)) completeMission(game);
  } else if (idx === 7) {
    // showdown combat lands in round 2 — reaching the docks starts the fight banner
    if (m.stage === 0 && at(m.marker, 90)) { m.stage = 1; say(game, 'Rico', 'Jax Marlowe. You should have stayed away from my docks.', 3.5); }
    else if (m.stage === 1) completeMission(game); // round 1: arriving twice completes (combat in round 2)
  }
  if (game.world.markerMesh && m.marker) {
    game.world.markerMesh.position.set(m.marker.x, 45, m.marker.z);
    game.world.markerMesh.visible = true;
  }
}

function completeMission(game) {
  const m = game.mission;
  const def = MISSIONS[m.idx];
  game.player.money += def.reward;
  audio.jingle();
  m.banner = `MISSION PASSED  +$${def.reward}`;
  m.bannerT = 3.5;
  say(game, 'Mara', `Job done. $${def.reward} is yours.`, 3.5);
  m.done += 1;
  if (game.world.markerMesh) game.world.markerMesh.visible = false;
  game.police.heat = 0;
  const next = m.idx + 1;
  m.started = false;
  if (next >= MISSIONS.length) {
    m.completed = true;
    game.state = 'complete';
  } else {
    m.nextIdx = next;
    m.nextT = 2.5;
  }
  writeSave(game);
}

function failMission(game, text) {
  const m = game.mission;
  say(game, 'Mara', text, 3.5);
  game.police.heat = 0;
  const idx = m.idx;
  m.started = false;
  m.nextIdx = idx;
  m.nextT = 2.5;
}

export function updateMissionQueue(game, dt) {
  const m = game.mission;
  if (m.nextT > 0 && !m.started && !m.completed) {
    m.nextT -= dt;
    if (m.nextT <= 0 && game.state === 'playing') startMission(game, m.nextIdx);
  }
}
