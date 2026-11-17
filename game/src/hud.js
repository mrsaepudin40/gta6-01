// Interface: HUD, bright round minimap, fullscreen city map, SOLMAR OS phone,
// title screen, dialog bar, district banners. All DOM — the 3D canvas stays clean.
import { MISSIONS, DISTRICTS, RADIO, GARAGE_UPGRADES, CHARACTERS } from './config.js';
import { districtAt } from './world.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
let lastDistrict = '';
let mapOpen = false;
let phoneTab = 'Map';

export function initHud(game) {
  $('btn-new').onclick = () => { audio.unlock(); audio.click(); startNewGame(game); };
  $('btn-continue').onclick = () => { audio.unlock(); audio.click(); continueGame(game); };
  $('btn-how').onclick = () => { audio.click(); $('howto-panel').classList.toggle('hidden'); };
  document.querySelectorAll('.phone-tab').forEach((b) => {
    b.onclick = () => { phoneTab = b.dataset.tab; audio.click(); renderPhone(game); };
  });
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
  // chapter panel
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
  // money + clock + stars
  $('clock-day').textContent = `DAY ${game.clock.day}  ${String(game.clock.hour).padStart(2, '0')}:${String(Math.floor(game.clock.minute)).padStart(2, '0')}`;
  $('money').textContent = `$${p.money.toLocaleString('en-US')}`;
  $('stars').innerHTML = starRow(game.police.stars);
  const st = game.police.stars === 0 ? '' : (game.police.stars >= 3 ? 'IN SIGHT' : 'EVADING');
  $('wanted-status').textContent = st;
  $('wanted-status').className = st ? 'wanted-' + st.toLowerCase().replace(' ', '-') : '';
  // weapon
  $('weapon-name').textContent = p.weapon;
  $('weapon-ammo').textContent = `${p.ammo} / ${p.reserve}`;
  // speedometer (driving only)
  if (p.inCar) {
    $('speedo').classList.remove('hidden');
    $('speed-num').textContent = Math.round(p.speedKmh);
    $('speed-car').textContent = p.inCar.sport ? 'VESPERA GT' : 'SEDAN';
    $('speed-fill').style.width = `${Math.min(100, (p.speedKmh / 180) * 100)}%`;
  } else $('speedo').classList.add('hidden');
  // radio + district
  $('radio-label').innerHTML = `♪ ${RADIO[game.radioIdx]} · <b>C</b> change`;
  const d = districtAt(p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.z : p.z);
  $('hud-district').textContent = d.name;
  if (d.name !== lastDistrict) {
    lastDistrict = d.name;
    showDistrictBanner(d);
  }
  // dialog bar
  if (m.dialog.length > 0) {
    const { who, text } = m.dialog[0];
    const ch = CHARACTERS.find((c) => c.short === who) || { color: '#888', init: who[0], name: who };
    $('dialog-bar').classList.remove('hidden');
    $('dialog-avatar').textContent = ch.init;
    $('dialog-avatar').style.background = ch.color;
    $('dialog-name').textContent = ch.name || who;
    $('dialog-text').textContent = text;
  } else $('dialog-bar').classList.add('hidden');
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
  $('hud').classList.add('hidden');
  $('map-screen').classList.remove('hidden');
  renderStoryList(game);
  renderMapStats(game);
  drawBigMap(game);
}
export function closeMap() { mapOpen = false; $('map-screen').classList.add('hidden'); $('hud').classList.remove('hidden'); }
export function isMapOpen() { return mapOpen; }

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
  $('map-stats').innerHTML = `
    <div>Cash <b>$${game.player.money.toLocaleString('en-US')}</b></div>
    <div>Respect level <b>${Math.min(5, 1 + game.mission.done)}</b></div>
    <div>Missions <b>${game.mission.done} / 8</b></div>
    <div>Garage <b>${game.garage.levels.engine + game.garage.levels.armor + game.garage.levels.service} upgrades</b></div>`;
}

function drawBigMap(game) {
  const cv = $('bigmap');
  const g = cv.getContext('2d');
  const S = cv.width, W = 3200, H = 2400;
  const sx = (x) => ((x + 1600) / W) * S;
  const sz = (z) => ((z + 1200) / H) * S;
  g.fillStyle = '#1d3a4a'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#f2e8c8'; g.fillRect(0, 0, sx(1400), S);
  g.fillStyle = '#f2d492'; g.fillRect(sx(1400), 0, sx(1560) - sx(1400), S);
  g.fillStyle = '#35b6dd'; g.fillRect(sx(1560), 0, S - sx(1560), S);
  g.fillStyle = '#e0cfa0';
  for (let bx = -1600; bx < 1400; bx += 400) for (let bz = -1200; bz < 1200; bz += 400) {
    g.fillRect(sx(bx + 50), sz(bz + 50), ((400 - 100) / W) * S, ((400 - 100) / H) * S);
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 5;
  for (const z of [-800, -400, 0, 400, 800]) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(S, sz(z)); g.stroke(); }
  for (const x of [-1200, -800, -400, 0, 400, 800, 1200]) { g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), S); g.stroke(); }
  g.fillStyle = '#3a2c1c'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
  for (const d of DISTRICTS) labelClamped(g, d.name, sx((d.x0 + d.x1) / 2), sz((d.z0 + d.z1) / 2), S);
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
