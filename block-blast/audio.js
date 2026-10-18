/**
 * Block Blast - Procedural Web Audio Sound Synthesizer
 * Zero external audio files required. Uses Web Audio API to generate
 * punchy, crisp, musical sound effects for placement, combos, and blasts.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = localStorage.getItem('blockblast_muted') === 'true';
    this.volume = parseFloat(localStorage.getItem('blockblast_volume') || '0.7');
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    localStorage.setItem('blockblast_muted', this.muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    localStorage.setItem('blockblast_volume', this.volume);
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // Pick up a piece from the tray
  playPick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Soft tick when piece snaps to grid hover
  playSnap() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.02);
  }

  // Satisfying block drop / placement thud
  playDrop() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Body thump
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, t);
    osc1.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // Click transient
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(420, t);
    osc2.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.05);
  }

  // Line Clear sound - scales with lines cleared and combo streak!
  playClear(linesCount = 1, combo = 0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Musical root scales based on combo streak
    // Key shifts up progressively: C, D, E, F, G, A, B, High C
    const rootNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    const baseFreq = rootNotes[Math.min(combo, rootNotes.length - 1)];

    // Major intervals: 1 (root), 1.25 (major 3rd), 1.5 (perfect 5th), 2.0 (octave)
    const intervals = [1.0, 1.25, 1.5, 2.0];
    const notesCount = Math.min(2 + linesCount, 4);

    for (let i = 0; i < notesCount; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? 'triangle' : 'sine';
      const freq = baseFreq * intervals[i];
      const noteDelay = i * 0.045;

      osc.frequency.setValueAtTime(freq, t + noteDelay);
      // Slight shimmering vibrato
      osc.frequency.linearRampToValueAtTime(freq * 1.01, t + noteDelay + 0.15);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.28, t + noteDelay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDelay + 0.35 + (linesCount * 0.08));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + noteDelay);
      osc.stop(t + noteDelay + 0.45 + (linesCount * 0.08));
    }

    // Heavy bass impact on multi-clears or combos >= 2
    if (linesCount > 1 || combo >= 2) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(95, t);
      bassOsc.frequency.exponentialRampToValueAtTime(32, t + 0.3);

      bassGain.gain.setValueAtTime(0.4, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(t);
      bassOsc.stop(t + 0.3);
    }
  }

  // Celebratory fanfare for massive combos (x4, x5+)
  playComboFanfare(combo = 3) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];

    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteStart = t + (idx * 0.05);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.25, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.3);
    });
  }

  // Game over sound (mournful descending sequence)
  playGameOver() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const sadNotes = [440, 392, 349.23, 293.66, 220];

    sadNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteStart = t + (idx * 0.12);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteStart);

      // Low pass filter for soft dark tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, noteStart);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.22, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.32);
    });
  }

  // Triumphant High Score fanfare
  playNewHighScore() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [
      [523.25, 659.25, 783.99],       // C
      [587.33, 739.99, 880.00],       // D
      [659.25, 830.61, 987.77],       // E
      [1046.50, 1318.51, 1567.98]     // High C Major
    ];

    chords.forEach((chord, step) => {
      const stepStart = t + (step * 0.14);
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, stepStart);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.setValueAtTime(0.2, stepStart);
        gain.gain.exponentialRampToValueAtTime(0.001, stepStart + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(stepStart);
        osc.stop(stepStart + 0.42);
      });
    });
  }

  // Power-up activation sound
  playPowerup() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.25);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  // UI button click
  playClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

// Export singleton
window.soundCtrl = new SoundController();
