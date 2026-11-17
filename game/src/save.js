// localStorage save / load. Nothing leaves the browser.
import { CFG } from './config.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return null;
    return {
      money: Math.max(0, s.money | 0),
      mission: Math.max(0, Math.min(3, s.mission | 0)),
      completed: !!s.completed,
      bestWanted: Math.max(0, Math.min(5, s.bestWanted | 0)),
      muted: !!s.muted,
    };
  } catch { return null; }
}

export function writeSave(game) {
  try {
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
      money: Math.round(game.player.money),
      mission: game.mission.idx,
      completed: game.mission.completed,
      bestWanted: game.bestWanted,
      muted: game.muted,
    }));
  } catch { /* storage unavailable: play without saving */ }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.SAVE_KEY); } catch {}
}
