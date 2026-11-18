// Interface: HUD, bright round minimap, fullscreen city map, SOLMAR OS phone,
// title screen, dialog bar, district banners. All DOM — the 3D canvas stays clean.
import { MISSIONS, DISTRICTS, RADIO, RADIO_TRACKS, STAGE_TOTALS, REP_RANKS, COP_UNITS, GARAGE_UPGRADES, CHARACTERS } from './config.js';
import { districtAt } from './world.js';
import { audio } from './audio.js';
import { writeSave, clearSave } from './save.js';

const $ = (id) => document.getElementById(id);
let lastDistrict = '';
let mapOpen = false;
let phoneTab = 'Map';
let mapGame = null;
let lastDialogWho = '';

export function initHud(game) {
  $('btn-new').onclick = () => { audio.unlock(); audio.click(); startNewGame(game); };
  $('btn-continue').onclick = () => { audio.unlock(); audio.click(); continueGame(game); };
  $('btn-how').onclick = () => { audio.click(); $('howto-panel').classList.toggle('hidden'); };
  $('btn-credits').onclick = () => { audio.click(); $('credits-panel').classList.toggle('hidden'); };
  document.querySelectorAll('.phone-tab').forEach((b) => {
    b.onclick = () => { phoneTab = b.dataset.tab; audio.click(); renderPhone(game); };
  });
  document.querySelectorAll('.map-tab').forEach((b) => {
    b.onclick = () => { audio.click(); renderMapTab(game, b.dataset.mtab); };
  });
  $('btn-resume').onclick = () => { audio.click(); resumeFromMap(game); };
  $('btn-save').onclick = () => { audio.click(); writeSave(game); $('map-msg').textContent = 'Game saved ✓'; };
  $('btn-quit').onclick = () => { audio.click(); location.reload(); };
  $('btn-mute').onclick = () => { audio.setMuted(!audio.isMuted()); $('btn-mute').textContent = `Mute: ${audio.isMuted() ? 'On' : 'Off'}`; };
  $('btn-wipe').onclick = () => { clearSave(); $('map-msg').textContent = 'Save erased — reload to start fresh'; };
  buildCharRow();
}

function buildCharRow() {
  const row = $('char-row');
  row.innerHTML = '';
  for (const c of CHARACTERS) {
    const d = document.createElement('div');
    d.className = 'char-chip';
    d.innerHTML = `<div class="char-face" style="background:${c.color}">${c.init}</div><div class="char-name">${c.short}</div><div class="char-role">${c.role}</div>`;
    row.appendChild(d);
  }
}

export function startNewGame(game) {
  game.newGame();
}
export function continueGame(game) {
  game.continueGame();
}

function starRow(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += `<span class="star ${i < n ? 'on' : ''}">★</span>`;
  return s;
}

export function updateHud(game) {
  const p = game.player, m = game.mission;
  // chapter panel: stage bar + next objective
  const title = m.started && m.idx >= 0 ? `CHAPTER ${m.idx + 1} · ${MISSIONS[m.idx].name.toUpperCase()}` : 'SOLMAR BAY · FREE ROAM';
  $('chapter-title').textContent = title;
  let obj = '';
  if (m.started && m.idx >= 0) {
    obj = MISSIONS[m.idx].briefing;
    if (m.idx === 5) obj = `Collect stash ${Math.min(m.stage + 1, 3)}/3 — stay quiet, stay dark.`;
    if (m.timer > 0) obj += `  ⏱ ${Math.ceil(m.timer)}s`;
    if (m.marker) obj += `  ·  ${Math.round(distToMarker(game))}m`;
  } else if (m.completed) obj = 'Solmar Bay is yours. Free roam — cause chaos, lose the law, have fun.';
  else obj = 'Press Enter to start your first job for Mara.';
  $('chapter-obj').textContent = obj;
  const total = m.started && m.idx >= 0 ? STAGE_TOTALS[m.idx] : 1;
  $('chapter-stage-fill').style.width = m.started && m.idx >= 0 ? `${Math.round((m.stage / total) * 100)}%` : '0%';
  let nextTxt = '';
  if (m.started && m.idx >= 0) {
    const nxt = m.idx + 1 < MISSIONS.length ? MISSIONS[m.idx + 1] : null;
    nextTxt = `<b>STAGE ${m.stage}/${total}</b> Next: ${nxt ? nxt.name + ' — $' + nxt.reward : 'Finish the story'}`;
  } else if (m.completed) nextTxt = '<b>STORY COMPLETE</b> All 8 jobs done';
  else nextTxt = `<b>NEXT</b> ${MISSIONS[m.done].name} — $${MISSIONS[m.done].reward}`;
  $('chapter-next').innerHTML = nextTxt;
  // police response panel (named units + distance + status)
  const pol = game.police;
  if (pol.stars > 0 && (pol.copCars.length > 0 || pol.heli)) {
    $('police-panel').classList.remove('hidden');
    let rows = '';
    pol.copCars.forEach((c, i) => {
      const d = Math.round(Math.hypot(c.x - (p.inCar ? p.inCar.x : p.x), c.z - (p.inCar ? p.inCar.z : p.z)));
      const ram = d < 14 && Math.abs(c.speed || 0) > 20;
      rows += `<div class="police-row"><span>◆ <b>${COP_UNITS[i % 4]}</b></span><span>${d} m</span><span class="st ${ram ? 'ram' : 'purs'}">${ram ? 'RAMMING' : 'PURSUIT'}</span></div>`;
    });
    if (pol.heli) rows += `<div class="police-row"><span>◆ <b>AIR-1</b></span><span>—</span><span class="st spot">SPOTLIGHT ON YOU</span></div>`;
    $('police-list').innerHTML = rows;
  } else $('police-panel').classList.add('hidden');
  // money + clock + stars
  $('clock-day').textContent = `DAY ${game.clock.day}  ${String(game.clock.hour).padStart(2, '0')}:${String(Math.floor(game.clock.minute)).padStart(2, '0')}`;
  $('money').textContent = `$${p.money.toLocaleString('en-US')}`;
  $('stars').innerHTML = starRow(game.police.stars);
  const st = game.police.stars === 0 ? '' : (game.police.stars >= 3 ? 'IN SIGHT' : 'EVADING');
  $('wanted-status').textContent = st;
  $('wanted-status').className = st ? 'wanted-' + st.toLowerCase().replace(' ', '-') : '';
  // weapon slots: 1 fists, 2 pistol, 3 WASP SMG, 4-5 locked
  const isSmg = p.weapon === 'WASP SMG';
  $('wslot-2').classList.toggle('active', !isSmg);
  $('wslot-3').classList.toggle('active', isSmg);
  $('weapon-ammo').textContent = isSmg ? '·' : `${p.ammo} / ${p.reserve}`;
  $('smg-ammo').textContent = isSmg ? `${p.ammo} / ${p.reserve}` : '·';
  // REP bar: rank name + progress over 8 jobs
  $('rep-rank').textContent = REP_RANKS[Math.min(8, m.done)];
  $('rep-fill').style.width = `${Math.round((m.done / 8) * 100)}%`;
  $('rep-progress').textContent = `${m.done} / 8 jobs`;
  // speedometer (driving only)
  if (p.inCar) {
    $('speedo').classList.remove('hidden');
    $('speed-num').textContent = Math.round(p.speedKmh);
    $('speed-car').textContent = p.inCar.sport ? 'VESPERA GT' : 'SEDAN';
    $('speed-fill').style.width = `${Math.min(100, (p.speedKmh / 180) * 100)}%`;
    $('speed-cond-fill').style.width = `${Math.max(0, (p.inCar.hp / p.inCar.maxHp) * 100)}%`;
  } else $('speedo').classList.add('hidden');
  // radio + song title + district
  $('radio-label').innerHTML = `♪ ${RADIO[game.radioIdx]} · <b>C</b> change<div id="radio-track">${RADIO_TRACKS[game.radioIdx]}</div>`;
  const d = districtAt(p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.z : p.z);
  $('hud-district').textContent = d.name;
  if (d.name !== lastDistrict) {
    lastDistrict = d.name;
    showDistrictBanner(d);
  }
  // dialog bar with a drawn character portrait (face, not initials)
  if (m.dialog.length > 0) {
    const { who, text } = m.dialog[0];
    const ch = CHARACTERS.find((c) => c.short === who) || { color: '#888', init: who[0], name: who };
    $('dialog-bar').classList.remove('hidden');
    if (who !== lastDialogWho) { drawPortrait(who, ch.color); lastDialogWho = who; }
    $('dialog-name').textContent = ch.name || who;
    $('dialog-text').textContent = text;
  } else { $('dialog-bar').classList.add('hidden'); lastDialogWho = ''; }
  // mission passed banner
  if (m.bannerT > 0 && m.banner) {
    $('mission-banner').textContent = m.banner;
    $('mission-banner').classList.remove('hidden');
  } else $('mission-banner').classList.add('hidden');
  // prompts
  const prompt = game.promptText || '';
  if (prompt) { $('prompt').textContent = prompt; $('prompt').classList.remove('hidden'); }
  else $('prompt').classList.add('hidden');
  // health bars
  $('health-fill').style.width = `${Math.max(0, p.hp)}%`;
  $('car-fill').style.width = p.inCar ? `${Math.max(0, (p.inCar.hp / p.inCar.maxHp) * 100)}%` : '100%';
  $('car-row').style.visibility = p.inCar ? 'visible' : 'hidden';
  // minimap
  drawMinimap(game);
  // garage menu
  if (game.garage.open) renderGarage(game);
}

function distToMarker(game) {
  const p = game.player, mk = game.mission.marker;
  if (!mk) return 0;
  const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
  return Math.hypot(mk.x - px, mk.z - pz);
}

export function showDistrictBanner(d) {
  $('district-name').textContent = d.name;
  $('district-blurb').textContent = d.blurb;
  const b = $('district-banner');
  b.classList.remove('hidden', 'fade');
  void b.offsetWidth;
  b.classList.add('fade');
  setTimeout(() => b.classList.add('hidden'), 2600);
}

// Drawn character portrait for the dialog bar: face + hair + cap/band,
// drawn fresh on the 56px canvas (no initials, no emoji).
function drawPortrait(who, color) {
  const cv = $('dialog-avatar');
  const g = cv.getContext('2d');
  const S = 56;
  const faces = {
    Mara: { skin: '#e8b98a', hair: '#1a1a1a', band: '#37d67a' },
    Rico: { skin: '#c98d64', hair: '#1a1a1a', cap: '#e05a5a' },
    Benny: { skin: '#f2c9a0', hair: '#d8d8d8', cap: '#ff9a3c' },
    Vera: { skin: '#f2c9a0', hair: '#e8c93c', long: true },
    Otto: { skin: '#e8b98a', hair: '#c9c9c9' },
    Jax: { skin: '#e8b98a', hair: '#1a1a1a' },
    Objective: { skin: '#ffd23f', hair: '#ffd23f' },
  };
  const f = faces[who] || { skin: '#e8b98a', hair: '#333333' };
  g.clearRect(0, 0, S, S);
  // background disc in the character's color
  g.fillStyle = color; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  if (who === 'Objective') {
    g.fillStyle = '#111'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('!', S / 2, S / 2 + 2);
    return;
  }
  // face
  g.fillStyle = f.skin;
  g.beginPath(); g.arc(S / 2, S / 2 + 3, 15, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = f.hair;
  g.beginPath(); g.arc(S / 2, S / 2 - 2, 15, Math.PI, 0); g.fill();
  g.fillRect(S / 2 - 15, S / 2 - 4, 6, 8);
  g.fillRect(S / 2 + 9, S / 2 - 4, 6, 8);
  if (f.long) { g.fillRect(S / 2 - 16, S / 2 - 2, 5, 18); g.fillRect(S / 2 + 11, S / 2 - 2, 5, 18); }
  if (f.band) { g.fillStyle = f.band; g.fillRect(S / 2 - 15, S / 2 - 6, 30, 5); }
  if (f.cap) {
    g.fillStyle = f.cap;
    g.beginPath(); g.arc(S / 2, S / 2 - 3, 15.5, Math.PI, 0); g.fill();
    g.fillRect(S / 2 - 15, S / 2 - 5, 30, 4);
  }
  // eyes + smile
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.arc(S / 2 - 6, S / 2 + 3, 1.8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(S / 2 + 6, S / 2 + 3, 1.8, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.6;
  g.beginPath(); g.arc(S / 2, S / 2 + 8, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
}

// district labels, clamped so edge districts (e.g. SUNSET BEACH) are never cut off
function labelClamped(g, text, x, y, S) {
  const w = g.measureText(text).width;
  g.fillText(text, Math.max(w / 2 + 4, Math.min(S - w / 2 - 4, x)), y);
}

// ---------- minimap (bright, round, legible) ----------
function drawMinimap(game) {
  const cv = $('minimap');
  const g = cv.getContext('2d');
  const S = cv.width, W = 3200, H = 2400;
  const sx = (x) => ((x + 1600) / W) * S;
  const sz = (z) => ((z + 1200) / H) * S;
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
  // land + sea + sand
  g.fillStyle = '#f2e8c8'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#f2d492'; g.fillRect(sx(1400), 0, S - sx(1400), S);
  g.fillStyle = '#35b6dd'; g.fillRect(sx(1560), 0, S - sx(1560), S);
  // blocks
  g.fillStyle = '#e0cfa0';
  for (let bx = -1600; bx < 1400; bx += 400) for (let bz = -1200; bz < 1200; bz += 400) {
    g.fillRect(sx(bx + 50), sz(bz + 50), ((400 - 100) / W) * S, ((400 - 100) / H) * S);
  }
  // roads
  g.strokeStyle = '#ffffff'; g.lineWidth = 4;
  for (const z of [-800, -400, 0, 400, 800]) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(S, sz(z)); g.stroke(); }
  for (const x of [-1200, -800, -400, 0, 400, 800, 1200]) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), S); g.stroke(); }
  // district labels
  g.fillStyle = '#5a4632'; g.font = 'bold 9px Arial'; g.textAlign = 'center';
  for (const d of DISTRICTS) labelClamped(g, d.name, sx((d.x0 + d.x1) / 2), sz((d.z0 + d.z1) / 2), S);
  // route to objective
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
  if (game.mission.marker) {
    g.strokeStyle = '#8a2be2'; g.lineWidth = 2.5; g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(sx(px), sz(pz)); g.lineTo(sx(game.mission.marker.x), sz(game.mission.marker.z)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffb300';
    g.beginPath(); g.arc(sx(game.mission.marker.x), sz(game.mission.marker.z), 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a5200'; g.font = 'bold 9px Arial';
    g.fillText('◆', sx(game.mission.marker.x), sz(game.mission.marker.z) + 3);
  }
  // garage marker
  g.fillStyle = '#ff7a1a';
  g.beginPath(); g.arc(sx(-800), sz(800), 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 8px Arial'; g.fillText('G', sx(-800), sz(800) + 3);
  // cops
  g.fillStyle = '#2248c8';
  for (const c of game.police.copCars) { g.beginPath(); g.arc(sx(c.x), sz(c.z), 3.5, 0, Math.PI * 2); g.fill(); }
  if (game.police.heli) { g.fillStyle = '#2248c8'; g.font = 'bold 10px Arial'; g.fillText('H', sx(game.police.heli.position.x), sz(game.police.heli.position.z)); }
  // player arrow
  g.save();
  g.translate(sx(px), sz(pz));
  g.rotate(Math.atan2(p.inCar ? Math.cos(p.inCar.angle) : 0, p.inCar ? -Math.sin(p.inCar.angle) : -1) * 0 + (p.inCar ? -p.inCar.angle + Math.PI / 2 : 0));
  g.fillStyle = '#1d9e4b';
  g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
  g.restore();
  g.restore();
  // ring
  g.strokeStyle = '#ffffff'; g.lineWidth = 4;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.stroke();
  $('minimap-district').textContent = districtAt(px, pz).name;
}

// ---------- fullscreen city map (Tab) ----------
export function openMap(game) {
  mapOpen = true;
  mapGame = game;
  $('hud').classList.add('hidden');
  $('map-screen').classList.remove('hidden');
  $('map-msg').textContent = '';
  renderMapTab(game, 'map');
}
export function closeMap() { mapOpen = false; $('map-screen').classList.add('hidden'); $('hud').classList.remove('hidden'); }
export function isMapOpen() { return mapOpen; }
export function resumeFromMap(game) { game.state = 'playing'; closeMap(); }

export function renderMapTab(game, tab) {
  document.querySelectorAll('.map-tab').forEach((b) => b.classList.toggle('active', b.dataset.mtab === tab));
  for (const t of ['map', 'stats', 'settings', 'controls']) $(`map-view-${t}`).classList.toggle('hidden', t !== tab);
  if (tab === 'map') {
    renderStoryList(game);
    renderMapStats(game);
    drawBigMap(game);
  } else if (tab === 'stats') {
    renderStatsGrid(game);
  } else if (tab === 'settings') {
    $('btn-mute').textContent = `Mute: ${audio.isMuted() ? 'On' : 'Off'}`;
  }
}

function skillPips(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`;
  return `<span class="skill-pips">${s}</span>`;
}

function skillsOf(game) {
  const done = game.mission.done;
  const eng = game.garage.levels.engine;
  return [
    ['Driving', Math.min(5, 2 + eng)],
    ['Aim', Math.min(5, 2 + Math.floor(done / 3))],
    ['Influence', Math.min(5, 1 + done)],
    ['Stamina', Math.min(5, 2 + (done >= 5 ? 1 : 0) + (done >= 7 ? 1 : 0))],
    ['Stealth', Math.min(5, 1 + (done >= 5 ? 1 : 0) + (done >= 7 ? 1 : 0))],
    ['Street Sense', Math.min(5, 1 + Math.min(4, done))],
  ];
}

function renderStatsGrid(game) {
  const done = game.mission.done;
  const cells = [
    [`$${game.player.money.toLocaleString('en-US')}`, 'Cash in hand'],
    [`${done} / 8`, 'Story jobs done'],
    [REP_RANKS[Math.min(8, done)], 'Reputation rank'],
    [`${Math.round((done / 8) * 100)}%`, 'Game complete'],
    [`${game.garage.levels.engine + game.garage.levels.armor + game.garage.levels.service}`, 'Garage upgrades'],
    [`Day ${game.clock.day}`, 'Days in Solmar Bay'],
  ];
  $('stats-grid').innerHTML = cells.map(([v, k]) => `<div class="stat-cell"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
}

function renderStoryList(game) {
  const list = $('story-list');
  list.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const done = i < game.mission.done;
    const next = !done && i === game.mission.done;
    const div = document.createElement('div');
    div.className = 'story-item' + (done ? ' done' : next ? ' next' : ' locked');
    div.innerHTML = `<div class="story-ava">${done ? '✓' : next ? '▶' : '🔒'}</div>
      <div class="story-main"><div class="story-name">${i + 1}. ${m.name.toUpperCase()}</div>
      <div class="story-sub">${done ? 'Complete' : next ? 'Next — see Mara' : 'Locked'}</div></div>
      <div class="story-reward">$${m.reward.toLocaleString('en-US')}</div>`;
    list.appendChild(div);
  });
}

function renderMapStats(game) {
  const pct = Math.round((game.mission.done / 8) * 100);
  $('map-complete').innerHTML = `${pct}% COMPLETE<span>Story ${game.mission.done}/8</span>`;
  $('map-stats').innerHTML = `
    <div>Cash <b>$${game.player.money.toLocaleString('en-US')}</b></div>
    <div>Respect level <b>${Math.min(5, 1 + game.mission.done)}</b></div>
    <div>Missions <b>${game.mission.done} / 8</b></div>
    <div>Garage <b>${game.garage.levels.engine + game.garage.levels.armor + game.garage.levels.service} upgrades</b></div>`;
  $('map-skills').innerHTML = skillsOf(game).map(([n, v]) =>
    `<div class="skill-row"><span class="sk-name">${n}</span>${skillPips(v)}</div>`).join('');
}

// district colors for the big map (one pastel per district)
const DISTRICT_COLORS = {
  NORTHSIDE: '#8a6fae', 'OLD DOCKS': '#a8763e', DOWNTOWN: '#5a7a9e',
  "BENNY'S ROW": '#c98a4a', RIVERSIDE: '#5a9e6a', 'SUNSET BEACH': '#e9cd8f',
};

function drawBigMap(game) {
  const cv = $('bigmap');
  const g = cv.getContext('2d');
  const S = cv.width, W = 3200, H = 2400;
  const sx = (x) => ((x + 1600) / W) * S;
  const sz = (z) => ((z + 1200) / H) * S;
  g.fillStyle = '#1d3a4a'; g.fillRect(0, 0, S, S);
  // colored district ground
  for (const d of DISTRICTS) {
    g.fillStyle = DISTRICT_COLORS[d.name] || '#e0cfa0';
    g.fillRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0));
  }
  g.fillStyle = '#f2d492'; g.fillRect(sx(1400), 0, sx(1560) - sx(1400), S);
  g.fillStyle = '#35b6dd'; g.fillRect(sx(1560), 0, S - sx(1560), S);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (let bx = -1600; bx < 1400; bx += 400) for (let bz = -1200; bz < 1200; bz += 400) {
    g.fillRect(sx(bx + 50), sz(bz + 50), ((400 - 100) / W) * S, ((400 - 100) / H) * S);
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 5;
  for (const z of [-800, -400, 0, 400, 800]) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(S, sz(z)); g.stroke(); }
  for (const x of [-1200, -800, -400, 0, 400, 800, 1200]) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), S); g.stroke(); }
  g.fillStyle = '#ffffff'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 4;
  for (const d of DISTRICTS) labelClamped(g, d.name, sx((d.x0 + d.x1) / 2), sz((d.z0 + d.z1) / 2), S);
  g.shadowBlur = 0;
  // landmark labels
  g.fillStyle = '#ffe9c4'; g.font = 'bold 11px Arial';
  const landmarks = [
    ['HOSPITAL', -1200, 400], ['SAFEHOUSE', -400, 800], ['OLD DOCKS', -1400, -800],
    ['HIDEOUT', 400, -800], ['FERRY', 1400, 800],
  ];
  for (const [t, x, z] of landmarks) labelClamped(g, t, sx(x), sz(z) + 18, S);
  // route + markers
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
  if (game.mission.marker) {
    g.strokeStyle = '#8a2be2'; g.lineWidth = 4; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(sx(px), sz(pz)); g.lineTo(sx(game.mission.marker.x), sz(game.mission.marker.z)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffb300';
    g.beginPath(); g.arc(sx(game.mission.marker.x), sz(game.mission.marker.z), 10, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#ff7a1a';
  g.beginPath(); g.arc(sx(-800), sz(800), 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('G', sx(-800), sz(800) + 4);
  g.fillStyle = '#1d9e4b';
  g.beginPath(); g.moveTo(sx(px), sz(pz) - 12); g.lineTo(sx(px) + 10, sz(pz) + 8); g.lineTo(sx(px) - 10, sz(pz) + 8); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.fillText('YOU', sx(px), sz(pz) + 26);
}

// ---------- SOLMAR OS phone (Esc) ----------
export function openPhone(game) { $('phone').classList.remove('hidden'); renderPhone(game); }
export function closePhone() { $('phone').classList.add('hidden'); }
export function isPhoneOpen() { return !$('phone').classList.contains('hidden'); }

function renderPhone(game) {
  document.querySelectorAll('.phone-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === phoneTab));
  const body = $('phone-body');
  if (phoneTab === 'Map') {
    body.innerHTML = '<canvas id="phonemap" width="420" height="300" style="width:100%;border-radius:10px"></canvas><div class="phone-hint">Esc — back to game</div>';
    const cv = $('phonemap');
    const g = cv.getContext('2d');
    const S = 420, W = 3200, H = 2400;
    const sx = (x) => ((x + 1600) / W) * S, sz = (z) => ((z + 1200) / H) * 300;
    g.fillStyle = '#f2e8c8'; g.fillRect(0, 0, S, 300);
    g.fillStyle = '#35b6dd'; g.fillRect(sx(1560), 0, S - sx(1560), 300);
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    for (const z of [-800, -400, 0, 400, 800]) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(S, sz(z)); g.stroke(); }
    for (const x of [-1200, -800, -400, 0, 400, 800, 1200]) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), 300); g.stroke(); }
    const p = game.player;
    const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
    g.fillStyle = '#1d9e4b';
    g.beginPath(); g.arc(sx(px), sz(pz), 7, 0, Math.PI * 2); g.fill();
    if (game.mission.marker) {
      g.fillStyle = '#ffb300';
      g.beginPath(); g.arc(sx(game.mission.marker.x), sz(game.mission.marker.z), 7, 0, Math.PI * 2); g.fill();
    }
  } else if (phoneTab === 'Missions') {
    body.innerHTML = MISSIONS.map((m, i) => {
      const done = i < game.mission.done;
      return `<div class="phone-row">${done ? '✓' : '·'} ${i + 1}. ${m.name} — $${m.reward} ${done ? '(done)' : ''}</div>`;
    }).join('');
  } else if (phoneTab === 'Stats') {
    body.innerHTML = `<div class="phone-row">Cash <b>$${game.player.money.toLocaleString('en-US')}</b></div>
      <div class="phone-row">Missions done <b>${game.mission.done} / 8</b></div>
      <div class="phone-row">Respect level <b>${Math.min(5, 1 + game.mission.done)}</b></div>
      <div class="phone-row">Wanted <b>${game.police.stars} ★</b></div>
      <div class="phone-row">Health <b>${Math.round(game.player.hp)}%</b></div>`;
  } else {
    body.innerHTML = `<div class="phone-row"><b>WASD</b> move / drive</div>
      <div class="phone-row"><b>Mouse</b> aim · Click shoot</div>
      <div class="phone-row"><b>E</b> enter / steal car · <b>F</b> punch</div>
      <div class="phone-row"><b>G</b> garage · <b>Enter</b> start job</div>
      <div class="phone-row"><b>Tab</b> city map · <b>Esc</b> phone</div>
      <div class="phone-row"><b>C</b> radio · <b>M</b> mute · <b>P</b> pause</div>`;
  }
}

// ---------- garage menu ----------
export function renderGarage(game) {
  const g = game.garage;
  $('garage-cash').textContent = `Cash: $${game.player.money.toLocaleString('en-US')}`;
  const box = $('garage-items');
  box.innerHTML = '';
  GARAGE_UPGRADES.forEach((up, i) => {
    const lvl = g.levels[up.id];
    const div = document.createElement('div');
    div.className = 'garage-item' + (i === g.selected ? ' sel' : '');
    div.innerHTML = `<div><b>${up.name} (Lv ${lvl}/${up.max})</b><div class="garage-desc">${up.desc}</div></div>
      <div class="garage-price">${lvl >= up.max ? 'MAX' : '$' + up.prices[lvl].toLocaleString('en-US')}</div>`;
    box.appendChild(div);
  });
  $('garage-msg').textContent = game.garage.msg || '↑ ↓ select · Enter buy · G close · Upgrades stay on every car you steal';
}

// ---------- title / center screens ----------
export function showTitle(game, save) {
  $('title-screen').classList.remove('hidden');
  $('btn-continue').style.display = save ? '' : 'none';
  if (save) $('continue-sub').textContent = `Day ${save.day}, $${save.money.toLocaleString('en-US')} · ${save.done}/8 jobs done`;
}
export function hideTitle() { $('title-screen').classList.add('hidden'); }

export function showCenter(title, sub, hint) {
  $('center-title').textContent = title;
  $('center-sub').textContent = sub;
  $('center-hint').textContent = hint;
  $('center-screen').classList.remove('hidden');
}
export function hideCenter() { $('center-screen').classList.add('hidden'); }
