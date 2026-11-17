// WebAudio synth: engine hum, siren, shots, pickups, jingles. No external files.
let ctx = null;
let muted = false;
let engineOsc = null, engineGain = null, engineFilter = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}
function noiseBurst(dur, vol = 0.2, low = 800) {
  const c = ac(); if (!c || muted) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(c.destination); src.start();
}
export const audio = {
  unlock() { ac(); },
  setMuted(m) { muted = m; if (m) this.engineStop(); },
  isMuted() { return muted; },
  shot() { noiseBurst(0.09, 0.22, 2400); tone(180, 0.07, 'square', 0.06, 60); },
  punch() { noiseBurst(0.08, 0.18, 500); },
  pickup() { tone(660, 0.09, 'sine', 0.12); setTimeout(() => tone(990, 0.12, 'sine', 0.12), 80); },
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.14), i * 110)); },
  crash() { noiseBurst(0.25, 0.25, 300); },
  sirenBlip() { tone(880, 0.18, 'sine', 0.05, 1170); },
  click() { tone(1200, 0.04, 'square', 0.05); },
  engineStart(speed01) {
    const c = ac(); if (!c || muted || engineOsc) return;
    engineOsc = c.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    engineFilter = c.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
    engineGain = c.createGain(); engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(c.destination);
    engineOsc.start();
    this.engineSet(speed01);
  },
  engineSet(speed01) {
    if (!engineOsc || !engineGain) return;
    engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.028 + speed01 * 0.05, ctx.currentTime, 0.1);
  },
  engineStop() {
    if (engineOsc) { try { engineOsc.stop(); } catch (e) { /* already stopped */ } engineOsc = null; engineGain = null; engineFilter = null; }
  },
};
