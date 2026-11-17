// Four story missions: objectives, dialogue, rewards, timers.
import { MISSIONS } from './config.js';
import { makePed } from './entities.js';
import { addHeat } from './police.js';
import { audio } from './audio.js';
import { dist } from './random.js';

export function newMissionState() {
  return { idx: -1, stage: 0, timer: 0, marker: null, dialog: [], dialogT: 0, completed: false, started: false };
}

export function say(game, who, text, secs = 3.2) {
  game.mission.dialog.push({ who, text });
  game.mission.dialogT = secs;
}

export function startMission(game, idx) {
  const m = game.mission;
  const def = MISSIONS[idx];
  m.idx = idx; m.stage = 0; m.started = true; m.timer = 0;
  const W = game.world.markers;
  if (idx === 0) m.marker = { ...W.riverside };
  if (idx === 1) m.marker = { ...W.package };
  if (idx === 2) { m.marker = { ...W.hideout }; m.timer = 90; addHeat(game, 40); }
  if (idx === 3) m.marker = { ...W.docks };
  for (const [who, text] of def.dialog) say(game, who, text, 3.2);
  say(game, 'Objective', def.briefing, 5);
}

export function missionObjective(game) {
  const m = game.mission;
  if (m.completed) return 'Solmar Bay is yours. Free roam — cause chaos, lose the law, have fun.';
  if (!m.started || m.idx < 0) return 'Press Enter to start your first job for Mara.';
  const def = MISSIONS[m.idx];
  if (m.idx === 0) return m.stage === 0 ? `${def.name}: Borrow any car (walk up and press E).` : `${def.name}: Drive to the Riverside marker.`;
  if (m.idx === 1) return m.stage === 0 ? `${def.name}: Pick up the package at the Old Docks.` : `${def.name}: Lose the heat — get the package to the Safe House.`;
  if (m.idx === 2) return `${def.name}: Reach the Hideout before the timer runs out!`;
  if (m.idx === 3) return m.stage === 0 ? `${def.name}: Get to the Old Docks.` : `${def.name}: Take down Rico's crew — ${game.enemies.filter((e) => !e.dead).length} left.`;
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
  say(game, 'Mara', `Job done. $${def.reward} is yours.`, 3.5);
  game.mission.started = false;
  if (m.idx >= MISSIONS.length - 1) {
    m.completed = true;
    game.state = 'complete';
  } else {
    m.idx += 1;
    setTimeout(() => { if (game.state === 'playing') startMission(game, m.idx); }, 2500);
    m.started = false;
    m.idx = m.idx; // next mission starts on the delayed call
  }
  game.mission.marker = null;
  game.heat = 0;
  try { import('./save.js').then((s) => s.writeSave(game)); } catch {}
}

function failMission(game, text) {
  const m = game.mission;
  say(game, 'Mara', text, 3.5);
  game.heat = 0;
  const idx = m.idx;
  m.started = false;
  setTimeout(() => { if (game.state === 'playing') startMission(game, idx); }, 2500);
}
