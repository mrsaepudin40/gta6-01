// Player, cars and pedestrians: creation, physics and drawing.
import { CFG, CAR_KINDS, PAL } from './config.js';
import { clamp } from './random.js';
import { collideCircle, clampToWorld } from './world.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, hp: CFG.PLAYER_HP, money: 0,
    speed: 0, inCar: null, aim: 0, fireCd: 0, punchCd: 0, invuln: 0,
    walkPhase: 0, moving: false,
  };
}

export function makeCar(x, y, angle, kind, driver) {
  const k = CAR_KINDS[kind] || CAR_KINDS.sedan;
  return {
    x, y, angle, speed: 0, hp: 100, kind, driver,
    color: k.color, max: k.max, accel: k.accel,
    smoke: 0, dead: false, brake: false, siren: kind === 'police',
  };
}

export function makePed(x, y, armed = false) {
  return {
    x, y, angle: Math.random() * Math.PI * 2, speed: 0,
    state: 'walk', color: PAL.ped[Math.floor(Math.random() * PAL.ped.length)],
    hp: 100, armed, fireCd: 0, dead: false, fleeT: 0, walkT: 0,
  };
}

// Player-driven car physics. Returns true if a hard crash happened.
export function driveCar(car, gas, brake, steer, dt, world) {
  const prev = car.speed;
  if (gas > 0) car.speed += car.accel * gas * dt;
  if (brake > 0) {
    if (car.speed > 10) car.speed -= CFG.CAR_BRAKE * brake * dt;
    else car.speed -= CFG.CAR_REVERSE * brake * dt;
  }
  car.speed -= car.speed * 0.55 * dt; // rolling drag
  if (Math.abs(car.speed) < 4 && gas === 0 && brake === 0) car.speed = 0;
  car.speed = clamp(car.speed, -CFG.CAR_REVERSE, car.max);
  const spd = Math.abs(car.speed);
  car.angle += steer * CFG.CAR_TURN * dt * clamp(spd / 120, 0, 1) * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const res = collideCircle(world, nx, ny, 16);
  const crashed = res.hit && Math.abs(car.speed) > 120;
  if (res.hit) {
    car.speed *= 0.35;
    if (crashed) car.hp -= 8;
  }
  const c = clampToWorld(res.x, res.y, 24);
  car.x = c.x; car.y = c.y;
  car.brake = brake > 0 && prev > 10;
  return crashed;
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-19, -11 + 4, 38, 22);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -20, -11, 40, 22, 6); ctx.fill();
  // Hood + trunk.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-20, -11, 8, 22);
  // Windshield + rear window.
  ctx.fillStyle = '#bfe3ea';
  ctx.fillRect(2, -9, 6, 18);
  ctx.fillRect(-13, -9, 4, 18);
  // Wheels.
  ctx.fillStyle = '#16161a';
  ctx.fillRect(-14, -13, 8, 4); ctx.fillRect(-14, 9, 8, 4);
  ctx.fillRect(8, -13, 8, 4); ctx.fillRect(8, 9, 8, 4);
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(19, -8, 2, 4); ctx.fillRect(19, 4, 2, 4);
  if (car.brake) { ctx.fillStyle = '#ff2d2d'; ctx.fillRect(-21, -8, 2, 4); ctx.fillRect(-21, 4, 2, 4); }
  // Police light bar.
  if (car.siren) {
    const on = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2f6df6';
    ctx.fillRect(-4, -12, 8, 4);
    ctx.fillStyle = on ? '#2f6df6' : '#ff2d2d';
    ctx.fillRect(-4, 8, 8, 4);
  }
  // Smoke when damaged.
  if (car.hp < 40 && !car.dead) {
    ctx.fillStyle = PAL.smoke;
    ctx.beginPath(); ctx.arc(-14 + Math.sin(time * 9) * 3, -6, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (car.dead) {
    ctx.fillStyle = 'rgba(20,20,20,0.5)';
    ctx.beginPath(); ctx.arc(car.x, car.y, 22, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.angle);
  // Body.
  ctx.fillStyle = PAL.player;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d7a44';
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  // Gun arm.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(16, 0); ctx.stroke();
  ctx.restore();
}

export function drawPed(ctx, p) {
  if (p.dead) {
    ctx.fillStyle = 'rgba(60,20,20,0.6)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 6, p.angle, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(1, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3, 3.5, 0, Math.PI * 2); ctx.fill();
  if (p.armed) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(p.angle) * 14, Math.sin(p.angle) * 14); ctx.stroke();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
