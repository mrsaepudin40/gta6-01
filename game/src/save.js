// Save / continue via localStorage.
import { CFG } from './config.js';
export function writeSave(game) {
  try {
    const p = game.player;
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      money: p.money, done: game.mission.done, completed: game.mission.completed,
      upgrades: game.garage.levels, day: game.clock.day, hour: game.clock.hour,
    }));
  } catch (e) { /* storage unavailable — play on without saving */ }
}
export function readSave() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { /* ignore */ }
}
