// Benny's Garage: engine / armor / service. Upgrades persist in the save
// and change real stats (top speed, max HP, damage taken).
import { GARAGE_UPGRADES } from './config.js';
import { audio } from './audio.js';
import { writeSave } from './save.js';

export function newGarageState() {
  return { levels: { engine: 0, armor: 0, service: 0 }, selected: 0, open: false };
}

export function garageNear(game) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  const dx = px - -800, dz = pz - 800;
  return dx * dx + dz * dz < 70 * 70;
}

export function buyUpgrade(game) {
  const g = game.garage;
  const up = GARAGE_UPGRADES[g.selected];
  const lvl = g.levels[up.id];
  if (lvl >= up.max) return 'Already maxed out.';
  const price = up.prices[lvl];
  if (game.player.money < price) return 'Not enough cash, Jax.';
  game.player.money -= price;
  g.levels[up.id] = lvl + 1;
  if (up.id === 'armor' && game.player.inCar) {
    game.player.inCar.maxHp += 50;
    game.player.inCar.hp = game.player.inCar.maxHp;
  }
  if (up.id === 'service') {
    if (game.player.inCar) game.player.inCar.hp = game.player.inCar.maxHp;
    game.player.hp = 100;
  }
  audio.pickup();
  writeSave(game);
  return `${up.name} — level ${lvl + 1}. Benny nods approvingly.`;
}

export function carDamageFactor(game) {
  return Math.max(0.4, 1 - 0.2 * game.garage.levels.armor);
}
