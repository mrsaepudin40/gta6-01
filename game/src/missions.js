// Eight story missions: objectives, dialogue, rewards, timers, result banners.
import { MISSIONS, MARKERS } from './config.js';
import { audio } from './audio.js';
import { addHeat } from './police.js';
import { dist2d } from './random.js';
import { writeSave } from './save.js';
import { spawnShowdownCrew } from './combat.js';

const STASHES = [
  { x: 1200, z: 0 },
  { x: -1000, z: 600 },
  { x: -1200, z: 800 },
];

export function newMissionState() {
  return { idx: -1, stage: 0, timer: 0, marker: null, dialog: [], dialogT: 0, completed: false, started: false, done: 0, banner: null, bannerT: 0, nextIdx: 0, nextT: 0 };
}

export function say(game, who, text, secs = 3.2) {
  game.mission.dialog.push({ who, text });
  game.mission.dialogT = secs;
}

export function missionTitle(game) {
  const m = game.mission;
  if (!m.started || m.idx < 0) return '';
  return `CHAPTER ${m.idx + 1} · ${MISSIONS[m.idx].name.toUpperCase()}`;
}

export function missionObjective(game) {
  const m = game.mission;
  if (m.completed) return 'Solmar Bay is yours. Free roam — cause chaos, lose the law, have fun.';
  if (!m.started || m.idx < 0) return 'Press Enter to start your first job for Mara.';
  const def = MISSIONS[m.idx];
  if (m.idx === 5) return `Collect stash ${Math.min(m.stage + 1, 3)}/3 — stay quiet, stay dark.`;
  return def.briefing;
}

function markerFor(idx, stage) {
  switch (idx) {
    case 0: return stage === 0 ? null : { ...MARKERS.riverside };
    case 1: return stage === 0 ? { ...MARKERS.docks } : { ...MARKERS.safehouse };
    case 2: return { ...MARKERS.hideout };
    case 3: return stage === 0 ? { ...MARKERS.docks } : { ...MARKERS.beach };
    case 4: return { ...MARKERS.garage };
    case 5: return { ...STASHES[stage] };
    case 6: return { ...MARKERS.bridge };
    case 7: return { ...MARKERS.docks };
    default: return null;
  }
}

export function syncObjectiveMarker(game) {
  const m = game.mission, w = game.world;
  if (!w) return;
  const on = !!m.marker;
  if (w.markerMesh) { w.markerMesh.visible = on; if (on) w.markerMesh.position.set(m.marker.x, 65, m.marker.z); }
  if (w.objectiveRing) { w.objectiveRing.visible = on; if (on) w.objectiveRing.position.set(m.marker.x, 0.6, m.marker.z); }
  if (w.objectiveDiamond) { w.objectiveDiamond.visible = on; if (on) w.objectiveDiamond.position.set(m.marker.x, 20, m.marker.z); }
}

function hideObjectiveMarker(game) {
  const w = game.world;
  if (!w) return;
  if (w.markerMesh) w.markerMesh.visible = false;
  if (w.objectiveRing) w.objectiveRing.visible = false;
  if (w.objectiveDiamond) w.objectiveDiamond.visible = false;
}

export function startMission(game, idx) {
  const m = game.mission;
  const def = MISSIONS[idx];
  m.idx = idx; m.stage = 0; m.started = true; m.timer = 0;
  if (idx === 2 || idx === 3 || idx === 6) m.timer = 90;
  if (idx === 2) addHeat(game, 40);
  if (idx === 6) addHeat(game, 80);
  m.marker = markerFor(idx, 0);
  syncObjectiveMarker(game);
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
    if (m.stage === 0 && p.inCar) { m.stage = 1; m.marker = markerFor(0, 1); say(game, 'Mara', 'Good. Now bring it to Riverside.', 3); }
    else if (m.stage === 1 && at(m.marker, 55)) completeMission(game);
  } else if (idx === 1) {
    if (m.stage === 0 && at(m.marker, 55)) {
      m.stage = 1; m.marker = markerFor(1, 1);
      addHeat(game, 40);
      say(game, 'Mara', 'Package secured. The law is coming — get to the Safe House!', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 55)) completeMission(game);
  } else if (idx === 2 || idx === 6) {
    if (at(m.marker, 55)) completeMission(game);
  } else if (idx === 3) {
    if (m.stage === 0 && at(m.marker, 55)) {
      m.stage = 1; m.marker = markerFor(3, 1);
      say(game, 'Mara', 'Cargo secured. Run it to Sunset Beach before the ice melts!', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 55)) completeMission(game);
  } else if (idx === 4) {
    if (p.inCar && p.inCar.sport && at(m.marker, 55)) completeMission(game);
    else if (at(m.marker, 55) && !p.inCar) say(game, 'Benny', 'I need a sports car, Jax. Not those legs.', 2);
  } else if (idx === 5) {
    if (at(m.marker, 55)) {
      audio.pickup();
      const n = m.stage + 1;
      if (n >= 3) completeMission(game);
      else {
        m.stage = n;
        m.marker = markerFor(5, m.stage);
        say(game, 'Mara', `Stash ${n}/3 secured. ${3 - n} to go.`, 3);
      }
    }
  } else if (idx === 7) {
    if (m.stage === 0 && at(m.marker, 90)) {
      m.stage = 1;
      spawnShowdownCrew(game);
      say(game, 'Rico', 'Jax Marlowe. You should have stayed away from my docks.', 3.5);
      say(game, 'Mara', 'Take them all down — crew and Rico both.', 3.5);
    } else if (m.stage === 1 && game.enemies.length > 0 && game.enemies.every((e) => e.dead)) {
      completeMission(game);
    }
  }
  if (game.world.markerMesh && m.marker) syncObjectiveMarker(game);
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
  hideObjectiveMarker(game);
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
