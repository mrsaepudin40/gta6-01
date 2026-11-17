// localStorage save / load (money, missions done, garage upgrades).
import { CFG } from './config.js';

export function readSave() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function writeSave(game) {
  try {
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      money: game.player.money,
      missionsDone: game.mission.done,
      upgrades: game.garage.owned,
      radio: game.radioIdx,
    }));
  } catch { /* storage unavailable — ignore */ }
}
