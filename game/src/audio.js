// WebAudio synth sounds: engine hum, siren, gunshots, pickup, crash, jingles. No audio files.
export const audio = {
  ctx: null,
  master: null,
  muted: false,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenTimer: 0,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch { /* audio unavailable: game stays silent */ }
  },
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  blip(freq, dur, type = 'square', vol = 0.16, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.25, low = 400) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  shot() { this.noise(0.09, 0.3, 1800); this.blip(160, 0.08, 'square', 0.12, -90); },
  punch() { this.noise(0.06, 0.18, 700); },
  crash() { this.noise(0.22, 0.32, 300); this.blip(70, 0.2, 'sine', 0.2, -30); },
  pickup() { this.blip(660, 0.09, 'sine', 0.16); setTimeout(() => this.blip(990, 0.12, 'sine', 0.16), 80); },
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.18), i * 110)); },
  busted() { this.blip(220, 0.5, 'sawtooth', 0.18, -120); },
  click() { this.blip(880, 0.05, 'sine', 0.1); },
  engine(speed01, on) {
    if (!this.ctx || this.muted) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(on ? 0.035 + speed01 * 0.03 : 0, t, 0.1);
  },
  siren(on, dt) {
    if (!this.ctx || this.muted) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.045;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    }
    if (!on && this.sirenOsc) { try { this.sirenOsc.stop(); } catch {} this.sirenOsc = null; return; }
    if (this.sirenOsc) {
      this.sirenTimer += dt;
      this.sirenOsc.frequency.value = (Math.floor(this.sirenTimer * 1.6) % 2 === 0) ? 720 : 540;
    }
  },
};
