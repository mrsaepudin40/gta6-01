// Shooting, punching, bullets, car damage, enemy gunmen.
import { CFG } from './config.js';
import { audio } from './audio.js';
import { collideCircle } from './world.js';
import { dist, angleTo } from './random.js';
import { addHeat } from './police.js';

export function fireBullet(game) {
  const p = game.player;
  if (p.inCar || p.fireCd > 0 || game.state !== 'playing') return;
  p.fireCd = CFG.FIRE_RATE;
  const a = p.aim;
  game.bullets.push({
    x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * CFG.BULLET_SPEED, vy: Math.sin(a) * CFG.BULLET_SPEED,
    from: 'player', life: 1.2, dmg: CFG.SHOT_DMG,
  });
  game.lastShot = { x: p.x, y: p.y, t: game.time };
  addHeat(game, 4);
  audio.shot();
  spawnSparks(game, p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, 3, '#ffe066');
}

export function punch(game) {
  const p = game.player;
  if (p.inCar || p.punchCd > 0 || game.state !== 'playing') return;
  p.punchCd = 0.45;
  audio.punch();
  const targets = [...game.peds, ...game.enemies, ...game.cops];
  for (const t of targets) {
    if (t.dead) continue;
    if (dist(p.x, p.y, t.x, t.y) < CFG.PUNCH_RANGE) {
      t.hp -= CFG.PUNCH_DMG;
      t.x += Math.cos(p.aim) * 14; t.y += Math.sin(p.aim) * 14;
      if (t.hp <= 0) { t.dead = true; addHeat(game, 12); }
      spawnSparks(game, t.x, t.y, 5, '#ffffff');
      break;
    }
  }
}

export function updateBullets(game, dt) {
  for (const b of game.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    const hitWall = collideCircle(game.world, b.x, b.y, 2).hit;
    if (hitWall) { b.life = 0; spawnSparks(game, b.x, b.y, 4, '#ffb347'); continue; }
    // Hit pedestrians / enemies / cops.
    for (const t of [...game.peds, ...game.enemies, ...game.cops]) {
      if (t.dead) continue;
      if (dist(b.x, b.y, t.x, t.y) < 12) {
        b.life = 0;
        t.hp -= b.dmg;
        if (t.hp <= 0) {
          t.dead = true;
          if (b.from === 'player') addHeat(game, game.enemies.includes(t) ? 0 : 14);
        }
        spawnSparks(game, b.x, b.y, 5, '#ff6b6b');
        break;
      }
    }
    if (b.life <= 0) continue;
    // Hit cars (not the shooter's own).
    for (const car of [...game.trafficCars, ...game.parkedCars, ...game.copCars]) {
      if (car.dead) continue;
      if (dist(b.x, b.y, car.x, car.y) < 20) {
        b.life = 0;
        damageCar(game, car, b.dmg);
        spawnSparks(game, b.x, b.y, 4, '#9fb3c8');
        break;
      }
    }
    // Enemy bullets hit the player.
    if (b.from === 'enemy') {
      const p = game.player;
      if (!p.inCar && dist(b.x, b.y, p.x, p.y) < 12) {
        b.life = 0;
        hurtPlayer(game, b.dmg);
      } else if (p.inCar && dist(b.x, b.y, p.inCar.x, p.inCar.y) < 20) {
        b.life = 0;
        damageCar(game, p.inCar, b.dmg);
      }
    }
  }
  game.bullets = game.bullets.filter((b) => b.life > 0);
}

export function damageCar(game, car, n) {
  car.hp -= n;
  if (car.hp <= 0 && !car.dead) {
    car.dead = true;
    explode(game, car.x, car.y);
    if (game.player.inCar === car) {
      game.player.inCar = null;
      game.player.x = car.x + 30; game.player.y = car.y + 30;
      hurtPlayer(game, 20);
    }
  }
}

export function hurtPlayer(game, n) {
  const p = game.player;
  if (p.invuln > 0) return;
  p.hp -= n;
  p.invuln = 0.5;
  audio.crash();
  if (p.hp <= 0) {
    p.hp = 0;
    game.state = 'wasted';
    audio.busted();
  }
}

export function explode(game, x, y) {
  spawnSparks(game, x, y, 26, '#ff9f1c');
  spawnSparks(game, x, y, 14, '#3a3a3a');
  audio.crash();
  addHeat(game, 10);
}

export function spawnSparks(game, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 180;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, max: 0.7, color, size: 2 + Math.random() * 3 });
  }
}

export function updateParticles(game, dt) {
  for (const pt of game.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92;
    pt.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
  // Tire marks fade slowly.
  if (game.tireMarks.length > 600) game.tireMarks.splice(0, game.tireMarks.length - 600);
}

// Armed crew (mission 4) shoot at the player.
export function updateEnemies(game, dt) {
  const p = game.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = dist(e.x, e.y, px, py);
    e.angle = angleTo(e.x, e.y, px, py);
    if (d > 200) {
      e.x += Math.cos(e.angle) * 120 * dt;
      e.y += Math.sin(e.angle) * 120 * dt;
    } else if (d < 120) {
      e.x -= Math.cos(e.angle) * 60 * dt;
      e.y -= Math.sin(e.angle) * 60 * dt;
    }
    e.fireCd -= dt;
    if (d < 340 && e.fireCd <= 0) {
      e.fireCd = e.boss ? 0.7 : 1.1;
      const a = e.angle + (Math.random() - 0.5) * 0.25;
      game.bullets.push({
        x: e.x + Math.cos(a) * 16, y: e.y + Math.sin(a) * 16,
        vx: Math.cos(a) * CFG.BULLET_SPEED * 0.85, vy: Math.sin(a) * CFG.BULLET_SPEED * 0.85,
        from: 'enemy', life: 1.1, dmg: e.boss ? 12 : 8,
      });
      game.lastShot = { x: e.x, y: e.y, t: game.time };
      audio.shot();
    }
  }
}
