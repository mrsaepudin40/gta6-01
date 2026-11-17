// Eight story missions: objectives, dialogue, rewards, timers, result banners.
import { MISSIONS } from './config.js';
import { makePed } from './entities.js';
import { addHeat } from './police.js';
import { audio } from './audio.js';
import { dist } from './random.js';

export function newMissionState() {
  return { idx: -1, stage: 0, timer: 0, marker: null, dialog: [], dialogT: 0, completed: false, started: false, progress: 0 };
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

const STASHES = ['stashA', 'stashB', 'stashC'];

export function startMission(game, idx) {
  const m = game.mission;
  const def = MISSIONS[idx];
  m.idx = idx; m.stage = 0; m.started = true; m.timer = 0; m.progress = 0;
  const W = game.world.markers;
  if (idx === 0) m.marker = { ...W.riverside };
  if (idx === 1) m.marker = { ...W.package };
  if (idx === 2) { m.marker = { ...W.hideout }; m.timer = 90; addHeat(game, 40); }
  if (idx === 3) { m.marker = { ...W.docks }; m.timer = 90; }
  if (idx === 4) m.marker = null; // steal a sports car first; marker appears at stage 1
  if (idx === 5) { game.night = true; m.marker = { ...W.stashA }; }
  if (idx === 6) { m.marker = { ...W.bridge }; m.timer = 90; addHeat(game, 80); }
  if (idx === 7) m.marker = { ...W.docks };
  for (const [who, text] of def.dialog) say(game, who, text, 3.2);
  say(game, 'Objective', def.briefing, 5);
}

export function missionObjective(game) {
  const m = game.mission;
  if (m.completed) return 'Solmar Bay is yours. Free roam — cause chaos, lose the law, have fun.';
  if (!m.started && m.idx >= 0) return `Next job: ${MISSIONS[m.idx].name} — starting soon…`;
  if (!m.started || m.idx < 0) return 'Press Enter to start your first job for Mara.';
  const def = MISSIONS[m.idx];
  if (m.idx === 0) return m.stage === 0 ? `${def.name}: Borrow any car (walk up and press E).` : `${def.name}: Drive to the Riverside marker.`;
  if (m.idx === 1) return m.stage === 0 ? `${def.name}: Pick up the package at the Old Docks.` : `${def.name}: Lose the heat — get the package to the Safe House.`;
  if (m.idx === 2) return `${def.name}: Reach the Hideout before the timer runs out!`;
  if (m.idx === 3) return m.stage === 0 ? `${def.name}: Pick up the cargo at the Old Docks.` : `${def.name}: Deliver the cargo to Sunset Beach — beat the clock!`;
  if (m.idx === 4) return m.stage === 0 ? `${def.name}: Steal a sports car (fast, blue).` : `${def.name}: Bring the sports car to Benny's Garage.`;
  if (m.idx === 5) return `${def.name}: Collect stash ${m.progress + 1}/3 — stay quiet, stay dark.`;
  if (m.idx === 6) return `${def.name}: Reach Sunset Bridge before the timer runs out!`;
  if (m.idx === 7) return m.stage === 0 ? `${def.name}: Get to the Old Docks.` : `${def.name}: Take down Rico's crew — ${game.enemies.filter((e) => !e.dead).length} left.`;
  return def.name;
}

export function updateMissions(game, dt) {
  const m = game.mission;
  if (m.dialogT > 0) m.dialogT -= dt;
  if (m.dialog.length > 0 && m.dialogT <= 0) { m.dialog.shift(); m.dialogT = m.dialog.length > 0 ? 3.2 : 0; }
  if (!m.started || m.idx < 0 || m.completed) return;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const at = (mk, r) => mk && dist(px, py, mk.x, mk.y) < r;
  if (m.idx === 0) {
    if (m.stage === 0 && p.inCar) { m.stage = 1; say(game, 'Mara', 'Good. Now bring it to Riverside.', 3); }
    else if (m.stage === 1 && at(m.marker, 80)) completeMission(game);
  } else if (m.idx === 1) {
    if (m.stage === 0 && at(m.marker, 70)) {
      m.stage = 1; m.marker = { ...game.world.markers.safehouse };
      addHeat(game, 40);
      say(game, 'Mara', 'Package secured. The law is coming — get to the Safe House!', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 80)) completeMission(game);
  } else if (m.idx === 2) {
    m.timer -= dt;
    if (at(m.marker, 80)) completeMission(game);
    else if (m.timer <= 0) failMission(game, 'Too slow — the hideout went cold. Try again.');
  } else if (m.idx === 3) {
    m.timer -= dt;
    if (m.stage === 0 && at(m.marker, 70)) {
      m.stage = 1; m.marker = { ...game.world.markers.beach };
      addHeat(game, 30);
      say(game, 'Mara', 'Cargo loaded. Sunset Beach, now — do not stop!', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 80)) completeMission(game);
    else if (m.timer <= 0) failMission(game, 'The cargo melted. Try again.');
  } else if (m.idx === 4) {
    if (m.stage === 0 && p.inCar && p.inCar.kind === 'sport') {
      m.stage = 1; m.marker = { ...game.world.markers.garage };
      say(game, 'Benny', 'That is the one. Bring her into my garage.', 3.5);
      audio.pickup();
    } else if (m.stage === 1 && at(m.marker, 90)) completeMission(game);
  } else if (m.idx === 5) {
    if (at(m.marker, 70)) {
      m.progress += 1;
      audio.pickup();
      if (m.progress >= 3) { completeMission(game); return; }
      m.marker = { ...game.world.markers[STASHES[m.progress]] };
      say(game, 'Jax', `Stash ${m.progress}/3 secured. ${3 - m.progress} to go.`, 2.5);
    }
  } else if (m.idx === 6) {
    m.timer -= dt;
    if (at(m.marker, 80)) completeMission(game);
    else if (m.timer <= 0) failMission(game, 'The bridge closed. Try again.');
  } else if (m.idx === 7) {
    if (m.stage === 0 && at(m.marker, 130)) {
      m.stage = 1;
      spawnCrew(game);
      say(game, 'Rico', 'Jax Marlowe. You should have stayed away from my docks.', 3.5);
    } else if (m.stage === 1 && game.enemies.length > 0 && game.enemies.every((e) => e.dead)) {
      completeMission(game);
    }
  }
}

function spawnCrew(game) {
  const docks = game.world.markers.docks;
  for (let i = 0; i < 6; i++) {
    const e = makePed(docks.x + (i % 3) * 70 - 70, docks.y + Math.floor(i / 3) * 70 - 40, true);
    e.color = '#8b1e1e';
    game.enemies.push(e);
  }
  const boss = makePed(docks.x, docks.y - 90, true);
  boss.color = '#3d0c0c'; boss.hp = 300; boss.boss = true;
  game.enemies.push(boss);
}

function completeMission(game) {
  const m = game.mission;
  const def = MISSIONS[m.idx];
  game.player.money += def.reward;
  audio.jingle();
  const next = m.idx + 1;
  game.resultBanner = {
    title: 'MISSION PASSED',
    sub: `+$${def.reward}  ·  ${next < MISSIONS.length ? 'Next: ' + MISSIONS[next].name : 'Solmar Bay is yours'}`,
    until: game.time + 3,
  };
  say(game, 'Mara', `Job done. $${def.reward} is yours.`, 3.5);
  if (m.idx === 5) game.night = false;
  game.mission.started = false;
  if (m.idx >= MISSIONS.length - 1) {
    m.completed = true;
    game.state = 'complete';
  } else {
    m.idx += 1;
    setTimeout(() => { if (game.state === 'playing') startMission(game, m.idx); }, 2500);
    m.started = false;
  }
  game.mission.marker = null;
  game.heat = 0;
  try { import('./save.js').then((s) => s.writeSave(game)); } catch {}
}

function failMission(game, text) {
  const m = game.mission;
  say(game, 'Mara', text, 3.5);
  game.heat = 0;
  if (m.idx === 5) game.night = false;
  const idx = m.idx;
  m.started = false;
  setTimeout(() => { if (game.state === 'playing') startMission(game, idx); }, 2500);
}
