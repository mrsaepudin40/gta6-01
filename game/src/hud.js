// HUD: DOM readouts + 2D top-down minimap canvas + overlays.
import { CFG, RADIO, GARAGE_UPGRADES } from './config.js';
import { missionTitle, missionObjective } from './missions.js';
import { starsOf } from './police.js';
import { priceOf } from './garage.js';
import { dist2d } from './random.js';

const $ = (id) => document.getElementById(id);
const cache = {};

function setText(id, v) {
  if (cache[id] !== v) { cache[id] = v; const el = $(id); if (el) el.textContent = v; }
}

export function initHud() {
  const mm = $('minimap');
  if (mm) { mm.width = 220; mm.height = 168; }
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
  // mission banner
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
}

function drawMinimap(game) {
  const cv = $('minimap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const sx = W / CFG.WORLD_W, sz = H / CFG.WORLD_H;
  const X = (x) => (x + CFG.WORLD_W / 2) * sx;
  const Z = (z) => (z + CFG.WORLD_H / 2) * sz;
  g.fillStyle = 'rgba(8,12,8,0.85)'; g.fillRect(0, 0, W, H);
  // water + beach
  g.fillStyle = '#2ea8c4'; g.fillRect(X(CFG.WATER_X), 0, W - X(CFG.WATER_X), H);
  g.fillStyle = '#e9cf8f'; g.fillRect(X(CFG.BEACH_X), 0, X(CFG.WATER_X) - X(CFG.BEACH_X), H);
  // roads
  g.strokeStyle = '#55555f'; g.lineWidth = 5;
  for (let x = -1600; x <= 1600; x += CFG.BLOCK) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
  for (let z = -1200; z <= 1200; z += CFG.BLOCK) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(X(CFG.BEACH_X), Z(z)); g.stroke(); }
  // buildings
  g.fillStyle = '#9aa0a8';
  for (const b of game.world.buildings) g.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(2, b.w * sx), Math.max(2, b.d * sz));
  // garage
  g.fillStyle = '#ff8c1a';
  g.beginPath(); g.arc(X(game.world.markers.garage.x), Z(game.world.markers.garage.z), 4, 0, Math.PI * 2); g.fill();
  // mission marker
  const m = game.mission;
  if (m.marker) {
    g.fillStyle = '#ffd23f';
    const mx = X(m.marker.x), mz = Z(m.marker.z);
    g.beginPath(); g.moveTo(mx, mz - 6); g.lineTo(mx + 5, mz + 4); g.lineTo(mx - 5, mz + 4); g.closePath(); g.fill();
  }
  // traffic
  g.fillStyle = '#ffffff';
  for (const c of game.traffic.cars) g.fillRect(X(c.x) - 1.5, Z(c.z) - 1.5, 3, 3);
  // police
  g.fillStyle = '#2f6df6';
  for (const c of game.police.cars) { g.beginPath(); g.arc(X(c.x), Z(c.z), 3.5, 0, Math.PI * 2); g.fill(); }
  // player arrow
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const h = p.inCar ? p.inCar.heading : p.heading;
  g.save();
  g.translate(X(px), Z(pz));
  g.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
  g.fillStyle = '#37d67a';
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill();
  g.restore();
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
