// Benny's Garage — buy car upgrades with cash. Menu opens with G near the garage.
// Round 1: data + buy logic + DOM menu; full upgrade effects wire into car.js via game.garage.owned.
import { GARAGE_UPGRADES } from './config.js';
import { audio } from './audio.js';
import { dist2d } from './random.js';

export function makeGarage() {
  return { owned: { engine: 0, armor: 0, service: 0 }, open: false, sel: 0 };
}

export function nearGarage(game) {
  const g = game.world.markers.garage;
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const pz = p.inCar ? p.inCar.z : p.z;
  return dist2d(px, pz, g.x, g.z) < 70;
}

export function priceOf(up, owned) {
  const lvl = owned[up.id] || 0;
  if (lvl >= up.max) return null;
  return up.prices[Math.min(lvl, up.prices.length - 1)];
}

export function buySelected(game) {
  const up = GARAGE_UPGRADES[game.garage.sel];
  const price = priceOf(up, game.garage.owned);
  if (price === null) { audio.denied(); return false; }
  if (game.player.money < price) { audio.denied(); return false; }
  game.player.money -= price;
  game.garage.owned[up.id] = (game.garage.owned[up.id] || 0) + 1;
  if (up.id === 'service' && game.player.inCar) {
    game.player.inCar.hp = game.player.inCar.maxHp;
    game.garage.owned.service = 0; // service is consumable
  }
  audio.pickup();
  return true;
}

export function applyArmor(game) {
  // called when entering a car: raise its max HP by owned armor levels
  const car = game.player.inCar;
  if (!car) return;
  const lvl = game.garage.owned.armor || 0;
  car.maxHp = 100 + 50 * lvl;
  if (car.hp > car.maxHp) car.hp = car.maxHp;
}
