// HUD: money, wanted stars, clock, minimap, objective, speed, radio, ammo, subtitles + screens.
import { CFG, PAL, RADIO_STATIONS } from './config.js';
import { missionObjective, missionTitle } from './missions.js';
import { roundRect } from './entities.js';

const MM_W = 208, MM_H = 156;

export function clockText(game) {
  const mins = Math.floor(game.clockMins) % 1440;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `Day ${game.clockDay} ${hh}:${mm}`;
}

export function drawHUD(ctx, game) {
  const p = game.player;
  ctx.save();
  // Top-left: money + wanted stars + clock.
  panel(ctx, 12, 12, 250, 92);
  ctx.fillStyle = PAL.hudText;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('$' + Math.round(p.money).toLocaleString('en-US'), 26, 32);
  ctx.font = '22px system-ui, sans-serif';
  let sx = 26;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < game.wanted ? PAL.star : PAL.starEmpty;
    ctx.fillText('★', sx, 60);
    sx += 26;
  }
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(clockText(game), 26, 88);
  // Top-center: mission banner (number + name + timer + distance).
  if (game.mission.started && game.mission.idx >= 0) {
    const title = missionTitle(game);
    let line2 = missionObjective(game);
    const parts = [];
    if (game.mission.timer > 0) parts.push('⏱ ' + Math.ceil(game.mission.timer) + 's');
    if (game.mission.marker) {
      const mx = p.inCar ? p.inCar.x : p.x, my = p.inCar ? p.inCar.y : p.y;
      const d = Math.round(Math.hypot(game.mission.marker.x - mx, game.mission.marker.y - my) / 10);
      parts.push(d + 'm to ' + game.mission.marker.label);
    }
    if (parts.length > 0) line2 += '  ·  ' + parts.join('  ·  ');
    const bw = 600;
    panel(ctx, (CFG.VIEW_W - bw) / 2, 12, bw, 62);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, CFG.VIEW_W / 2, 34);
    ctx.fillStyle = PAL.hudText;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(truncate(ctx, line2, bw - 32), CFG.VIEW_W / 2, 58);
    ctx.textAlign = 'left';
  }
  // Minimap top-right.
  const mmx = CFG.VIEW_W - MM_W - 12, mmy = 12;
  ctx.drawImage(game.world.minimap, mmx, mmy, MM_W, MM_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  ctx.strokeRect(mmx, mmy, MM_W, MM_H);
  const kx = MM_W / CFG.WORLD_W, ky = MM_H / CFG.WORLD_H;
  const dot = (x, y, color, r = 4) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mmx + x * kx, mmy + y * ky, r, 0, Math.PI * 2); ctx.fill();
  };
  if (game.mission.marker) {
    const pulse = 4 + Math.sin(game.time * 5) * 1.5;
    dot(game.mission.marker.x, game.mission.marker.y, PAL.marker, pulse);
  }
  // Benny's Garage is always on the map.
  dot(game.world.markers.garage.x, game.world.markers.garage.y, '#ff9f1c', 3.5);
  for (const c of game.copCars) if (!c.dead) dot(c.x, c.y, '#3b82f6', 3.5);
  for (const c of game.cops) if (!c.dead) dot(c.x, c.y, '#60a5fa', 3);
  for (const e of game.enemies) if (!e.dead) dot(e.x, e.y, '#ff3b30', 3.5);
  const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
  dot(px, py, '#37d67a', 5);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(mmx + px * kx, mmy + py * ky, 7, 0, Math.PI * 2); ctx.stroke();
  // Bottom-left: health bar.
  panel(ctx, 12, CFG.VIEW_H - 52, 230, 40);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, CFG.VIEW_H - 38, 150, 14);
  ctx.fillStyle = p.hp > 40 ? '#37d67a' : '#ff5a5a';
  ctx.fillRect(24, CFG.VIEW_H - 38, 150 * Math.max(0, p.hp / 100), 14);
  ctx.fillStyle = PAL.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('HEALTH ' + Math.ceil(p.hp), 182, CFG.VIEW_H - 30);
  // Ammo on foot / car HP when driving.
  if (p.inCar) {
    panel(ctx, 250, CFG.VIEW_H - 52, 170, 40);
    ctx.fillStyle = '#333';
    ctx.fillRect(262, CFG.VIEW_H - 38, 90, 14);
    ctx.fillStyle = p.inCar.hp > 40 ? '#37d67a' : '#ff5a5a';
    ctx.fillRect(262, CFG.VIEW_H - 38, 90 * Math.max(0, p.inCar.hp / p.inCar.maxHp), 14);
    ctx.fillStyle = PAL.hudText;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('CAR ' + Math.ceil(p.inCar.hp), 360, CFG.VIEW_H - 30);
  } else {
    panel(ctx, 250, CFG.VIEW_H - 52, 170, 40);
    const empty = p.ammoMag <= 0 && p.ammoRes <= 0;
    ctx.fillStyle = empty ? '#ff5a5a' : PAL.hudText;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(empty ? 'PISTOL — EMPTY' : `PISTOL ${p.ammoMag}/${p.ammoRes}`, 262, CFG.VIEW_H - 31);
  }
  // Radio station above the speedometer.
  panel(ctx, CFG.VIEW_W - 260, CFG.VIEW_H - 92, 248, 30);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('♪ ' + RADIO_STATIONS[game.radioIdx] + '  ·  C', CFG.VIEW_W - 26, CFG.VIEW_H - 76);
  ctx.textAlign = 'left';
  // Bottom-right: speed when driving.
  if (p.inCar) {
    panel(ctx, CFG.VIEW_W - 150, CFG.VIEW_H - 52, 138, 40);
    ctx.fillStyle = PAL.hudText;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(p.inCar.speed) * 0.24) + ' mph', CFG.VIEW_W - 26, CFG.VIEW_H - 31);
    ctx.textAlign = 'left';
  }
  // Objective bar bottom-center.
  const obj = missionObjective(game);
  ctx.font = '15px system-ui, sans-serif';
  const w = Math.min(760, ctx.measureText(obj).width + 36);
  panel(ctx, (CFG.VIEW_W - w) / 2, CFG.VIEW_H - 92, w, 30);
  ctx.fillStyle = PAL.hudText;
  ctx.textAlign = 'center';
  ctx.fillText(obj, CFG.VIEW_W / 2, CFG.VIEW_H - 76);
  ctx.textAlign = 'left';
  // Dialogue subtitle.
  if (game.mission.dialog.length > 0) {
    const d = game.mission.dialog[0];
    ctx.font = 'bold 16px system-ui, sans-serif';
    const tw = ctx.measureText(d.who + ': ' + d.text).width + 36;
    panel(ctx, (CFG.VIEW_W - tw) / 2, CFG.VIEW_H - 138, tw, 32);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(d.who + ': ', (CFG.VIEW_W - tw) / 2 + 18, CFG.VIEW_H - 121);
    ctx.fillStyle = PAL.hudText;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(d.text, (CFG.VIEW_W - tw) / 2 + 18 + ctx.measureText(d.who + ': ').width, CFG.VIEW_H - 121);
  }
  // MISSION PASSED result banner.
  if (game.resultBanner && game.time < game.resultBanner.until) {
    const b = game.resultBanner;
    ctx.font = 'bold 34px system-ui, sans-serif';
    const tw = Math.max(ctx.measureText(b.title).width, ctx.measureText(b.sub).width) + 72;
    panel(ctx, (CFG.VIEW_W - tw) / 2, 150, tw, 84);
    ctx.fillStyle = '#37d67a';
    ctx.textAlign = 'center';
    ctx.fillText(b.title, CFG.VIEW_W / 2, 182);
    ctx.fillStyle = PAL.hudText;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(b.sub, CFG.VIEW_W / 2, 214);
    ctx.textAlign = 'left';
  }
  // Controls hint lives on the title / pause screens, not over the HUD.
  ctx.restore();
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 4 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.hudBg;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
}

export const MENU = {
  new: { x: 490, y: 380, w: 300, h: 52 },
  cont: { x: 490, y: 444, w: 300, h: 52 },
  how: { x: 490, y: 508, w: 300, h: 52 },
};

export function titleMenuHit(x, y) {
  for (const [k, r] of Object.entries(MENU)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k;
  }
  return null;
}

export function drawTitle(ctx, game, save, showHow) {
  ctx.save();
  // Sun-baked sky gradient backdrop (top-down city faintly visible behind).
  const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
  g.addColorStop(0, '#2b1608'); g.addColorStop(0.55, '#57240f'); g.addColorStop(1, '#1a0d06');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(1060, 130, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,179,71,0.25)';
  ctx.beginPath(); ctx.arc(1060, 130, 96, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('SOLMAR BAY', CFG.VIEW_W / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('A sun-baked crime story — Jax Marlowe takes the bay', CFG.VIEW_W / 2, 232);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Steal cars. Outrun the law. Run eight jobs for Mara. Own the docks.', CFG.VIEW_W / 2, 262);
  const items = [
    ['new', '▶  NEW GAME'],
    ['cont', save ? '↻  CONTINUE  ($' + save.money + ' · Job ' + (save.mission + 1) + '/8)' : '↻  CONTINUE  (no save yet)'],
    ['how', '?  HOW TO PLAY'],
  ];
  for (const [key, label] of items) {
    const r = MENU[key];
    const hover = game.menuHover === key;
    ctx.fillStyle = hover ? '#ffd23f' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.fillStyle = hover ? '#1a0d06' : '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(label, CFG.VIEW_W / 2, r.y + 33);
  }
  if (showHow) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    roundRect(ctx, 240, 580, 800, 118, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — walk or drive · E — steal / enter / exit a car · Mouse + Click — aim & shoot', CFG.VIEW_W / 2, 612);
    ctx.fillText('F — punch · G — Benny\u2019s Garage (near the garage) · C — change radio · P — pause · R — restart · M — mute', CFG.VIEW_W / 2, 640);
    ctx.fillText('Finish all 8 jobs to own Solmar Bay. Progress auto-saves.', CFG.VIEW_W / 2, 668);
  }
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('An original game. No Rockstar content. Runs fully offline.', CFG.VIEW_W / 2, CFG.VIEW_H - 18);
  ctx.restore();
}

export function drawOverlay(ctx, title, sub, color = '#ff5a5a') {
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,12,0.72)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(title, CFG.VIEW_W / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(sub, CFG.VIEW_W / 2, 350);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Press R to restart  ·  Press Enter for the title screen', CFG.VIEW_W / 2, 400);
  ctx.restore();
}
