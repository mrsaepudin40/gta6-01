// HUD: DOM readouts + 2D top-down minimap canvas + overlays.
import { CFG, RADIO, GARAGE_UPGRADES, MISSIONS } from './config.js';
import { missionTitle, missionObjective } from './missions.js';
import { starsOf } from './police.js';
import { priceOf, nearGarage } from './garage.js';
import { nearestCar } from './player.js';
import { dist2d } from './random.js';

const $ = (id) => document.getElementById(id);
const cache = {};

function setText(id, v) {
  if (cache[id] !== v) { cache[id] = v; const el = $(id); if (el) el.textContent = v; }
}

export function initHud() {
  const mm = $('minimap');
  if (mm) { mm.width = 230; mm.height = 230; }
  const cm = $('citymap-canvas');
  if (cm) { cm.width = 760; cm.height = 560; }
  const pm = $('phone-map');
  if (pm) { pm.width = 360; pm.height = 270; }
  initPhone();
}

function districtOf(x, z) {
  if (x > 1300) return 'SUNSET BEACH';
  if (x < -1400) return 'OLD DOCKS';
  if (Math.abs(x + 800) < 300 && Math.abs(z - 400) < 300) return "BENNY'S ROW";
  if (z < -800) return 'NORTHSIDE';
  if (z > 800) return 'RIVERSIDE';
  return 'DOWNTOWN';
}

export function updateHud(game) {
  const p = game.player;
  const stars = starsOf(game.police.heat);
  setText('hud-money', '$' + Math.round(p.money).toLocaleString('en-US'));
  setText('hud-stars', '★'.repeat(stars) + '☆'.repeat(5 - stars));
  const day = game.day;
  const hh = String(Math.floor(game.clockMin / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(game.clockMin % 60)).padStart(2, '0');
  setText('hud-clock', `Day ${day} ${hh}:${mm}`);
  const px0 = p.inCar ? p.inCar.x : p.x;
  const pz0 = p.inCar ? p.inCar.z : p.z;
  setText('hud-district', districtOf(px0, pz0));
  setText('hud-radio', '♪ ' + RADIO[game.radioIdx] + ' · C');
  const speed = p.inCar ? Math.abs(p.inCar.speed) * 3.6 : 0;
  setText('hud-speed', p.inCar ? Math.round(speed) + ' mph' : '— mph');
  const hp = p.inCar ? p.inCar.hp : p.hp;
  const hpMax = p.inCar ? p.inCar.maxHp : CFG.PLAYER_HP;
  const hb = $('hud-hp-fill');
  if (hb) hb.style.width = Math.max(0, (hp / hpMax) * 100) + '%';
  const cb = $('hud-car-fill');
  if (cb) {
    cb.style.width = p.inCar ? Math.max(0, (p.inCar.hp / p.inCar.maxHp) * 100) + '%' : '0%';
    const row = $('hud-car-row');
    if (row) row.style.display = p.inCar ? 'flex' : 'none';
  }
  setText('hud-ammo', p.inCar ? '' : `PISTOL ${game.combat.ammo}/${game.combat.reserve}`);
  const am = $('hud-ammo');
  if (am) am.style.display = p.inCar ? 'none' : 'block';
  // mission banner + objective direction arrow (points at the target)
  const m = game.mission;
  const banner = $('hud-banner');
  if (banner) {
    if (m.started && m.idx >= 0) {
      banner.style.display = 'block';
      setText('hud-mission-title', missionTitle(game));
      let sub = missionObjective(game);
      if (m.timer > 0) sub += `  ·  ⏱ ${Math.ceil(m.timer)}s`;
      if (m.marker) {
        const px = p.inCar ? p.inCar.x : p.x;
        const pz = p.inCar ? p.inCar.z : p.z;
        sub += `  ·  ${Math.round(dist2d(px, pz, m.marker.x, m.marker.z))}m`;
      }
      setText('hud-mission-sub', sub);
    } else banner.style.display = 'none';
  }
  const arrow = $('hud-mission-arrow');
  if (arrow) {
    if (m.started && m.marker) {
      const px = p.inCar ? p.inCar.x : p.x;
      const pz = p.inCar ? p.inCar.z : p.z;
      const bearing = Math.atan2(m.marker.x - px, m.marker.z - pz);
      const rel = bearing - game.camYaw;
      arrow.style.display = 'inline-block';
      arrow.style.transform = `rotate(${rel - Math.PI / 2}rad)`;
    } else arrow.style.display = 'none';
  }
  // interaction prompt — [E] steal / [G] garage / [E] market stall, like the reference
  const inter = $('hud-interact');
  if (inter) {
    let txt = '';
    if (!game.garage.open && nearGarage(game)) txt = "[G] Benny's Garage — Upgrades & Repairs";
    else if (!p.inCar && nearestCar(p, game.traffic)) txt = '[E] Steal Car';
    else if (!p.inCar && game.world.stalls) {
      const near = game.world.stalls.some(([sx, sz]) => dist2d(px0, pz0, sx, sz) < 30);
      if (near) txt = '[E] Beach Market — Snacks & Drinks';
    }
    if (txt) { inter.style.display = 'block'; setText('hud-interact', txt); }
    else inter.style.display = 'none';
  }
  // dialogue
  const dlg = $('hud-dialog');
  if (dlg) {
    if (m.dialog.length > 0) {
      dlg.style.display = 'block';
      const d = m.dialog[0];
      setText('hud-dialog-who', d.who);
      setText('hud-dialog-text', d.text);
    } else dlg.style.display = 'none';
  }
  // mission passed banner
  const passed = $('hud-passed');
  if (passed) {
    if (m.bannerT > 0 && m.banner) { passed.style.display = 'block'; setText('hud-passed-text', m.banner); }
    else passed.style.display = 'none';
  }
  // hint line
  const hint = $('hud-hint');
  if (hint) {
    setText('hud-hint', p.inCar
      ? 'W/S drive · A/D steer · E exit car · F punch · Click shoot · C radio · M mute · P pause'
      : 'WASD move · E enter car · F punch · Click shoot · G garage (near Benny’s) · C radio · M mute');
  }
  drawMinimap(game);
  updateGarageMenu(game);
  if (game.mapOpen) { drawCityMap(game); updateCityMapPanel(game); }
  if (game.phoneOpen) { drawPhoneMap(game); updatePhonePanel(game); }
}

function drawMinimap(game) {
  const cv = $('minimap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  // uniform scale, centered — the canvas is round (CSS border-radius)
  const s = Math.min(W / CFG.WORLD_W, H / CFG.WORLD_H);
  const ox = (W - CFG.WORLD_W * s) / 2, oy = (H - CFG.WORLD_H * s) / 2;
  const X = (x) => ox + (x + CFG.WORLD_W / 2) * s;
  const Z = (z) => oy + (z + CFG.WORLD_H / 2) * s;
  g.save();
  g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.clip();
  // bright cream land — reads instantly, like the reference
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, W, H);
  // park
  g.fillStyle = '#8cc47a'; g.fillRect(X(-1200), Z(400), CFG.BLOCK * s, CFG.BLOCK * s);
  // beach + sea
  g.fillStyle = '#f0d698'; g.fillRect(X(CFG.BEACH_X), 0, X(CFG.WATER_X) - X(CFG.BEACH_X), H);
  g.fillStyle = '#35b6dd'; g.fillRect(X(CFG.WATER_X), 0, W - X(CFG.WATER_X), H);
  // roads — thick white grid on cream
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(3, CFG.ROAD_W * s * 0.85);
  for (let x = -1600; x <= 1600; x += CFG.BLOCK) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
  for (let z = -1200; z <= 1200; z += CFG.BLOCK) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(X(CFG.BEACH_X), Z(z)); g.stroke(); }
  // buildings — warm tan blocks
  g.fillStyle = '#d8a05a';
  for (const b of game.world.buildings) g.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(1.5, b.w * s), Math.max(1.5, b.d * s));
  // district labels
  g.fillStyle = '#6b543a'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center';
  g.fillText('DOWNTOWN', X(0), Z(0));
  g.fillText('DOCKS', X(-1100), Z(-700));
  g.fillText('BEACH', X(1330), Z(0));
  // route: dashed purple line from player to mission target
  const m = game.mission;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  if (m.marker) {
    g.strokeStyle = '#9b30ff'; g.lineWidth = 2; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(X(px), Z(pz)); g.lineTo(X(m.marker.x), Z(m.marker.z)); g.stroke();
    g.setLineDash([]);
    // mission marker — big yellow diamond with red outline
    const mx = X(m.marker.x), mz = Z(m.marker.z);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#d93a3a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(mx, mz - 8); g.lineTo(mx + 7, mz); g.lineTo(mx, mz + 8); g.lineTo(mx - 7, mz); g.closePath(); g.fill(); g.stroke();
  }
  // garage
  g.fillStyle = '#ff8c1a';
  g.beginPath(); g.arc(X(game.world.markers.garage.x), Z(game.world.markers.garage.z), 4, 0, Math.PI * 2); g.fill();
  // traffic — dark dots on the bright map
  g.fillStyle = '#333333';
  for (const c of game.traffic.cars) g.fillRect(X(c.x) - 1.5, Z(c.z) - 1.5, 3, 3);
  // police — white ring + blue dot
  for (const c of game.police.cars) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(X(c.x), Z(c.z), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f6df6';
    g.beginPath(); g.arc(X(c.x), Z(c.z), 3.5, 0, Math.PI * 2); g.fill();
  }
  if (game.police.heli) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(X(game.police.heli.x), Z(game.police.heli.z), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f6df6';
    g.beginPath(); g.arc(X(game.police.heli.x), Z(game.police.heli.z), 3.5, 0, Math.PI * 2); g.fill();
  }
  // player arrow — big green arrow, white halo + dark outline
  const h = p.inCar ? p.inCar.heading : p.heading;
  g.save();
  g.translate(X(px), Z(pz));
  g.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(-8, 8); g.closePath(); g.fill();
  g.fillStyle = '#37d67a';
  g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
  g.restore();
  // district label on top edge
  g.fillStyle = '#6b543a'; g.font = 'bold 10px sans-serif';
  g.fillText(districtOf(px, pz), W / 2, 13);
  g.restore();
}

function drawMapOnto(cv, game, big) {
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const k = big ? 1 : 0.55;
  const s = Math.min(W / CFG.WORLD_W, H / CFG.WORLD_H);
  const ox = (W - CFG.WORLD_W * s) / 2, oy = (H - CFG.WORLD_H * s) / 2;
  const X = (x) => ox + (x + CFG.WORLD_W / 2) * s;
  const Z = (z) => oy + (z + CFG.WORLD_H / 2) * s;
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8cc47a'; g.fillRect(X(-1200), Z(400), CFG.BLOCK * s, CFG.BLOCK * s);
  g.fillStyle = '#f0d698'; g.fillRect(X(CFG.BEACH_X), 0, X(CFG.WATER_X) - X(CFG.BEACH_X), H);
  g.fillStyle = '#35b6dd'; g.fillRect(X(CFG.WATER_X), 0, W - X(CFG.WATER_X), H);
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(4, CFG.ROAD_W * s * 0.85);
  for (let x = -1600; x <= 1600; x += CFG.BLOCK) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
  for (let z = -1200; z <= 1200; z += CFG.BLOCK) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(X(CFG.BEACH_X), Z(z)); g.stroke(); }
  g.fillStyle = '#d8a05a';
  for (const b of game.world.buildings) g.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(2, b.w * s), Math.max(2, b.d * s));
  // district labels with outline
  g.textAlign = 'center';
  const label = (txt, x, z, size, color) => {
    g.font = `900 ${Math.round(size * k)}px sans-serif`;
    g.lineWidth = Math.max(2, 4 * k); g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.strokeText(txt, X(x), Z(z));
    g.fillStyle = color; g.fillText(txt, X(x), Z(z));
  };
  label('DOWNTOWN', 0, -100, 26, '#3a2c1a');
  label('OLD DOCKS', -1150, -950, 22, '#5a4632');
  label('NORTHSIDE', 0, -1050, 22, '#5a4632');
  label('RIVERSIDE', -600, 1000, 22, '#5a4632');
  label("BENNY'S ROW", -800, 200, 20, '#b35a00');
  label('SUNSET BEACH', 1300, -600, 18, '#8a6d2f');
  // letter badges for key places
  const badge = (letter, x, z, color) => {
    g.fillStyle = color;
    g.beginPath(); g.arc(X(x), Z(z), 13 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(15 * k)}px sans-serif`;
    g.fillText(letter, X(x), Z(z) + 5 * k);
  };
  badge('G', game.world.markers.garage.x, game.world.markers.garage.z, '#ff8c1a');
  badge('H', game.world.markers.hideout.x, game.world.markers.hideout.z, '#7a5fd0');
  badge('R', game.world.markers.riverside.x, game.world.markers.riverside.z, '#2f9e6e');
  badge('B', game.world.markers.beach.x, game.world.markers.beach.z, '#d9a03a');
  // route + mission marker
  const m = game.mission;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  if (m.marker) {
    g.strokeStyle = '#9b30ff'; g.lineWidth = Math.max(2, 5 * k); g.setLineDash([12, 8]);
    g.beginPath(); g.moveTo(X(px), Z(pz)); g.lineTo(X(m.marker.x), Z(m.marker.z)); g.stroke();
    g.setLineDash([]);
    badge('M', m.marker.x, m.marker.z, '#d93a3a');
  }
  // player arrow
  const h = p.inCar ? p.inCar.heading : p.heading;
  g.save();
  g.translate(X(px), Z(pz));
  g.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, -16 * k); g.lineTo(12 * k, 12 * k); g.lineTo(-12 * k, 12 * k); g.closePath(); g.fill();
  g.fillStyle = '#37d67a';
  g.beginPath(); g.moveTo(0, -12 * k); g.lineTo(9 * k, 9 * k); g.lineTo(-9 * k, 9 * k); g.closePath(); g.fill();
  g.restore();
}

function drawCityMap(game) {
  drawMapOnto($('citymap-canvas'), game, true);
}

function drawPhoneMap(game) {
  drawMapOnto($('phone-map'), game, false);
}

function updatePhonePanel(game) {
  const m = game.mission;
  setText('phone-job-act', m.completed ? 'ALL JOBS DONE' : (m.started ? `CURRENT JOB · ACT ${m.idx + 1}` : 'NO ACTIVE JOB'));
  const def = m.idx >= 0 ? MISSIONS[m.idx] : null;
  setText('phone-job-title', def ? def.name : '—');
  setText('phone-job-desc', def ? def.briefing : 'Press Enter in-game to start your first job for Mara.');
  setText('phone-job-reward', def ? `Reward $${def.reward} · from ${def.giver}` : '');
  const list = $('phone-list');
  if (list) {
    let html = '';
    MISSIONS.forEach((d, i) => {
      const done = i < m.done;
      const cur = m.started && m.idx === i;
      html += `<div class="cm-item${cur ? ' cur' : ''}">${done ? '✓' : (cur ? '▶' : '·')} ${i + 1}. ${d.name}</div>`;
    });
    if (cache['phone-list'] !== html) { cache['phone-list'] = html; list.innerHTML = html; }
  }
  const p = game.player;
  const stars = starsOf(game.police.heat);
  setText('phone-stats', `Cash $${Math.round(p.money).toLocaleString('en-US')} · Missions ${m.done}/8 · Day ${game.day} ${String(Math.floor(game.clockMin / 60) % 24).padStart(2, '0')}:${String(Math.floor(game.clockMin % 60)).padStart(2, '0')} · Wanted ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} · Best ${game.bestWanted}★ · ${districtOf(p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.z : p.z)}`);
}

export function initPhone() {
  const tabs = document.querySelectorAll('#phone-tabs button');
  tabs.forEach((btn) => btn.addEventListener('click', () => {
    tabs.forEach((b) => b.classList.remove('sel'));
    btn.classList.add('sel');
    document.querySelectorAll('.phone-panel').forEach((el) => { el.style.display = 'none'; });
    const panel = $('phone-panel-' + btn.dataset.tab);
    if (panel) panel.style.display = 'block';
  }));
}

function updateCityMapPanel(game) {
  const m = game.mission;
  setText('citymap-job-act', m.completed ? 'ALL JOBS DONE' : (m.started ? `CURRENT JOB · ACT ${m.idx + 1}` : 'NO ACTIVE JOB'));
  const def = m.idx >= 0 ? MISSIONS[m.idx] : null;
  setText('citymap-job-title', def ? def.name : '—');
  setText('citymap-job-desc', def ? def.briefing : 'Press Enter in-game to start your first job for Mara.');
  setText('citymap-job-reward', def ? `Reward $${def.reward} · from ${def.giver}` : '');
  const list = $('citymap-list');
  if (list) {
    let html = '';
    MISSIONS.forEach((d, i) => {
      const done = i < m.done;
      const cur = m.started && m.idx === i;
      html += `<div class="cm-item${cur ? ' cur' : ''}">${done ? '✓' : (cur ? '▶' : '·')} ${i + 1}. ${d.name}</div>`;
    });
    if (cache['citymap-list'] !== html) { cache['citymap-list'] = html; list.innerHTML = html; }
  }
}

function updateGarageMenu(game) {
  const menu = $('garage-menu');
  if (!menu) return;
  if (!game.garage.open) { menu.style.display = 'none'; return; }
  menu.style.display = 'block';
  setText('garage-cash', 'Cash: $' + Math.round(game.player.money).toLocaleString('en-US'));
  const list = $('garage-list');
  if (list) {
    let html = '';
    GARAGE_UPGRADES.forEach((up, i) => {
      const lvl = game.garage.owned[up.id] || 0;
      const price = priceOf(up, game.garage.owned);
      html += `<div class="g-item${i === game.garage.sel ? ' sel' : ''}"><b>${up.name} (Lv ${lvl}/${up.max})</b><span>${up.desc}</span><em>${price === null ? 'MAX' : '$' + price}</em></div>`;
    });
    if (cache['garage-list'] !== html) { cache['garage-list'] = html; list.innerHTML = html; }
  }
}

export function showOverlay(id) {
  for (const el of document.querySelectorAll('.overlay')) el.style.display = 'none';
  const t = $(id);
  if (t) t.style.display = 'flex';
}

export function hideOverlays() {
  for (const el of document.querySelectorAll('.overlay')) el.style.display = 'none';
}
