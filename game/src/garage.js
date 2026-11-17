// Benny's Garage — buy car upgrades with cash. Menu opens with G near the garage.
import { UPGRADES } from './config.js';
import { audio } from './audio.js';
import { dist } from './random.js';
import { roundRect } from './entities.js';

const PANEL = { x: 290, y: 96, w: 700, h: 480 };
const ROWS = [
  { key: 'engine', y: 252, h: 64 },
  { key: 'armor', y: 326, h: 64 },
  { key: 'service', y: 400, h: 64 },
];
const ROW_X = 320, ROW_W = 640;

export function garageNear(game) {
  const g = game.world.markers.garage;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  return dist(px, py, g.x, g.y) < 130;
}

export function openGarage(game) {
  game.state = 'garage';
  game.garageSel = 0;
  game.garageMsg = '';
  audio.ensure(); audio.click();
}

export function closeGarage(game) {
  game.state = 'playing';
  audio.click();
}

export function garageItems(game) {
  const p = game.player;
  return [
    {
      key: 'engine',
      name: UPGRADES.engine.name,
      desc: UPGRADES.engine.desc,
      level: game.upgrades.engine,
      max: UPGRADES.engine.max,
      price: game.upgrades.engine < UPGRADES.engine.max ? UPGRADES.engine.prices[game.upgrades.engine] : null,
    },
    {
      key: 'armor',
      name: UPGRADES.armor.name,
      desc: UPGRADES.armor.desc,
      level: game.upgrades.armor,
      max: UPGRADES.armor.max,
      price: game.upgrades.armor < UPGRADES.armor.max ? UPGRADES.armor.prices[game.upgrades.armor] : null,
    },
    {
      key: 'service',
      name: UPGRADES.service.name,
      desc: p.inCar ? UPGRADES.service.desc : 'Bring a car in for a service',
      level: 0,
      max: 1,
      price: UPGRADES.service.prices[0],
      disabled: !p.inCar,
    },
  ];
}

export function buySelected(game) {
  const item = garageItems(game)[game.garageSel];
  if (!item) return;
  if (item.disabled) { game.garageMsg = 'Bring a car in for a service.'; audio.click(); return; }
  if (item.price === null) { game.garageMsg = 'Already maxed out.'; audio.click(); return; }
  if (game.player.money < item.price) { game.garageMsg = 'Not enough cash.'; audio.click(); return; }
  game.player.money -= item.price;
  if (item.key === 'engine') game.upgrades.engine += 1;
  if (item.key === 'armor') {
    game.upgrades.armor += 1;
    if (game.player.inCar) {
      const car = game.player.inCar;
      car.maxHp = 100 + 50 * game.upgrades.armor;
      car.hp = car.maxHp;
    }
  }
  if (item.key === 'service' && game.player.inCar) {
    game.player.inCar.hp = game.player.inCar.maxHp;
  }
  game.garageMsg = `${item.name} — done. Benny approves.`;
  audio.jingle();
  try { import('./save.js').then((s) => s.writeSave(game)); } catch {}
}

export function garageRowHit(x, y) {
  for (let i = 0; i < ROWS.length; i++) {
    const r = ROWS[i];
    if (x >= ROW_X && x <= ROW_X + ROW_W && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

export function drawGarage(ctx, game) {
  const items = garageItems(game);
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,12,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#1d1408';
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 14); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 14); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText("BENNY'S GARAGE", 640, 158);
  ctx.fillStyle = '#fff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Benny fixes anything — for the right price.', 640, 188);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#37d67a';
  ctx.fillText('Cash: $' + Math.round(game.player.money).toLocaleString('en-US'), 640, 222);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r = ROWS[i];
    const sel = game.garageSel === i;
    ctx.fillStyle = sel ? 'rgba(255,210,63,0.22)' : 'rgba(255,255,255,0.07)';
    roundRect(ctx, ROW_X, r.y, ROW_W, r.h, 10); ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; roundRect(ctx, ROW_X, r.y, ROW_W, r.h, 10); ctx.stroke(); }
    ctx.textAlign = 'left';
    ctx.fillStyle = it.disabled ? 'rgba(255,255,255,0.45)' : '#fff';
    ctx.font = 'bold 19px system-ui, sans-serif';
    const lvl = it.max > 1 ? `  (Lv ${it.level}/${it.max})` : '';
    ctx.fillText(it.name + lvl, ROW_X + 18, r.y + 26);
    ctx.fillStyle = it.disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(it.desc, ROW_X + 18, r.y + 50);
    ctx.textAlign = 'right';
    ctx.fillStyle = it.price === null ? '#37d67a' : (it.disabled ? 'rgba(255,255,255,0.4)' : '#ffd23f');
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(it.price === null ? 'MAXED' : '$' + it.price.toLocaleString('en-US'), ROW_X + ROW_W - 18, r.y + 38);
    ctx.textAlign = 'center';
  }
  if (game.garageMsg) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(game.garageMsg, 640, 500);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('↑ ↓ select  ·  Enter buy  ·  G close  ·  Upgrades stay on every car you steal', 640, 540);
  ctx.restore();
}
