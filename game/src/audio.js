// Emberhorn Hunt — audio.js
// One job: every sound the game makes, synthesized live with WebAudio.
// No audio files, no network. Created lazily on first user gesture.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // Short oscillator blip with pitch slide and exponential decay.
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Filtered noise burst (whoosh / thud / roar body).
  noise(dur, vol, filterFreq, type) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = filterFreq || 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  }

  swing() { this.noise(0.14, 0.16, 2400, 'bandpass'); }
  hit() { this.tone(180, 0.09, 'square', 0.16, 90); this.noise(0.06, 0.12, 900); }
  partBreak() { this.tone(520, 0.16, 'triangle', 0.22, 940); this.tone(780, 0.2, 'triangle', 0.16, 1180); }
  hurt() { this.tone(220, 0.18, 'sawtooth', 0.2, 70); }
  dodge() { this.noise(0.18, 0.1, 1400, 'bandpass'); }
  potion() { this.tone(420, 0.1, 'sine', 0.18, 640); this.tone(640, 0.14, 'sine', 0.14, 880); }
  pickup() { this.tone(880, 0.08, 'sine', 0.14, 1320); }
  carve() { this.tone(660, 0.1, 'triangle', 0.18); this.tone(990, 0.16, 'triangle', 0.16); }
  roar() {
    this.tone(90, 0.7, 'sawtooth', 0.26, 55);
    this.tone(140, 0.6, 'square', 0.12, 70);
    this.noise(0.6, 0.14, 500);
  }
  telegraph() { this.tone(300, 0.12, 'square', 0.1, 520); }
  questStart() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.2), i * 110)); }
  questWin() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.22), i * 130)); }
  questFail() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.32, 'sawtooth', 0.14), i * 150)); }
  click() { this.tone(700, 0.05, 'square', 0.1); }

  // A slow generative pad loop for the hub, and a tenser pulse for hunts.
  // mode: 'hub' | 'hunt' | null (stop).
  startMusic(mode) {
    if (!this.ctx) return;
    this.stopMusic();
    if (!mode) return;
    const roots = mode === 'hub' ? [220, 277, 330, 262] : [110, 131, 98, 147];
    const stepDur = mode === 'hub' ? 0.9 : 0.42;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const root = roots[this.musicStep % roots.length];
      const t = this.ctx.currentTime;
      [1, 1.5, 2].forEach((mult, k) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = k === 0 ? 'triangle' : 'sine';
        o.frequency.value = root * mult;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(k === 0 ? 0.05 : 0.025, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 1.8);
        o.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + stepDur * 2);
      });
      this.musicStep++;
    }, stepDur * 1000);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
