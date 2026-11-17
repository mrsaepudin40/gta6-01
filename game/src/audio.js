// WebAudio synth: engine hum, siren, gunshots, pickup, jingles. No audio files.
export const audio = {
  ctx: null,
  master: null,
  muted: false,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenT: 0,

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  },

  resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  _osc(type, freq, dur, vol, slideTo) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  _noise(dur, vol, freq) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },

  engine(on, speed01) {
    if (!this.ctx || !this.master) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.05;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    if (this.engineOsc) {
      const t = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 110, t, 0.08);
      this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.05 : 0.0, t, 0.1);
    }
  },

  siren(on) {
    if (!this.ctx || !this.master) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.035;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); } catch {}
      this.sirenOsc = null; this.sirenGain = null;
    }
  },

  updateSiren(dt) {
    if (!this.sirenOsc || !this.ctx) return;
    this.sirenT += dt;
    const f = Math.sin(this.sirenT * 2.4) > 0 ? 720 : 950;
    this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  },

  shot() { this._noise(0.14, 0.5, 2600); this._osc('square', 160, 0.08, 0.25, 60); },
  punch() { this._noise(0.08, 0.35, 500); },
  pickup() { this._osc('sine', 660, 0.09, 0.3); setTimeout(() => this._osc('sine', 990, 0.12, 0.3), 90); },
  crash() { this._noise(0.25, 0.5, 700); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._osc('triangle', f, 0.16, 0.3), i * 110)); },
  denied() { this._osc('sawtooth', 140, 0.18, 0.25, 90); },
};
