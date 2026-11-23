// Sonidos generados con Web Audio (sin archivos).
const Sound = {
  ac: null, out: null, muted: false, last: 0,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.out = this.ac.createGain(); this.out.gain.value = .8; this.out.connect(this.ac.destination); } catch (e) { this.ac = null; }
  },
  ok() { return this.ac && !this.muted && this.ac.state === 'running'; },
  note(f, o = {}) {
    if (!this.ok()) return;
    const { t = 0, dur = .25, type = 'sine', vol = .15, slide = null } = o, a = this.ac, t0 = a.currentTime + t;
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t0); if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur * .8);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(this.out); osc.start(t0); osc.stop(t0 + dur + .05);
  },
  // Un "pip" por cada persona que se entera (limitado para que no sature).
  pip(type) {
    const now = performance.now(); if (now - this.last < 35) return; this.last = now;
    if (type === 1) this.note(rand(700, 1100), { dur: .09, vol: .06, type: 'triangle' });
    else this.note(rand(420, 560), { dur: .14, vol: .07 });
  },
  tap() { this.note(880, { dur: .07, vol: .06, type: 'triangle' }); },
  place() { this.note(523, { dur: .12, vol: .1 }); this.note(784, { t: .06, dur: .14, vol: .08 }); },
  check() { [659, 880, 1175].forEach((f, i) => this.note(f, { t: i * .05, dur: .2, vol: .07 })); },
  no() { this.note(240, { dur: .2, vol: .12, slide: 180 }); },
  win(n) { const s = [523, 659, 784, 1047, 1319]; for (let i = 0; i < 2 + n; i++) this.note(s[i], { t: i * .11, dur: .5, vol: .12 }); },
  lose() { [392, 349, 311].forEach((f, i) => this.note(f, { t: i * .14, dur: .3, vol: .1 })); },
};
