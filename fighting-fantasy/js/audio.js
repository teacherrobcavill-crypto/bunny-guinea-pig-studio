/**
 * Fighting Fantasy Audio Synthesizer (Web Audio API)
 * Zero external audio dependencies - 100% procedurally synthesized sound effects
 * and ambient dungeon soundscapes.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        this.muted = false;
        this.ambientRunning = false;
        this.ambientNodes = [];
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.8;
            this.sfxGain.connect(this.masterGain);

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.value = 0.25;
            this.ambientGain.connect(this.masterGain);
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
        }
    }

    // --- UI & Exploration Sounds ---

    playPageTurn() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Parchment rustle via band-passed white noise
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(700, now + 0.25);
        filter.Q.value = 2.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
    }

    playClick() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    // --- Dice Rolling ---

    playDiceRoll() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const bounces = 5;
        for (let i = 0; i < bounces; i++) {
            const time = now + i * 0.08 + Math.random() * 0.03;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const freq = 180 + Math.random() * 220;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(80, time + 0.05);

            const vol = 0.25 * Math.pow(0.75, i);
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.06);
        }
    }

    // --- Combat SFX ---

    playSwordSwing() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playSwordHit() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Metallic clash + fleshy impact
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(1100, now);
        osc1.frequency.exponentialRampToValueAtTime(320, now + 0.2);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(160, now);
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
    }

    playShieldBlock() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playCrit() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Big heavy bass hit with shimmering high chime
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.4);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.4);

        // Chime
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(880, now + 0.05);
        chime.frequency.setValueAtTime(1320, now + 0.12);
        chimeGain.gain.setValueAtTime(0.2, now + 0.05);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        chime.connect(chimeGain);
        chimeGain.connect(this.sfxGain);
        chime.start(now + 0.05);
        chime.stop(now + 0.45);
    }

    playInterrupt() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Metallic gong / kick thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 450;
        filter.Q.value = 4;

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playSpellCast(school = 'fire') {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        if (school === 'fire') {
            // Rising whoosh
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (school === 'frost') {
            // High crystalline ping
            const freqs = [1046, 1318, 1567, 2093];
            freqs.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = now + i * 0.05;
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(t);
                osc.stop(t + 0.25);
            });
        } else if (school === 'shadow') {
            // Dark low ominous chord
            [65, 82, 98].forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = f;
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.6);
            });
        } else {
            // Holy / healing
            [440, 554, 659, 880].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = now + i * 0.04;
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(t);
                osc.stop(t + 0.5);
            });
        }
    }

    playEatProvisions() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Gentle restorative chord
        [329, 392, 493, 587].forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = f;
            const t = now + idx * 0.06;
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    playTestLuck(lucky) {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (lucky) {
            // Sparkling high triad
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = now + i * 0.06;
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(t);
                osc.stop(t + 0.35);
            });
        } else {
            // Low dissonant tritone groan
            [160, 226].forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = f;
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.5);
            });
        }
    }

    playVictory() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Fighting Fantasy triumphant fanfare (C - E - G - high C)
        const notes = [
            { f: 261.6, t: 0, d: 0.15 },
            { f: 329.6, t: 0.15, d: 0.15 },
            { f: 392.0, t: 0.30, d: 0.2 },
            { f: 523.25, t: 0.50, d: 0.6 }
        ];
        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = n.f;
            const startT = now + n.t;
            gain.gain.setValueAtTime(0.25, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + n.d);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startT);
            osc.stop(startT + n.d);
        });
    }

    playDefeat() {
        this.ensureContext();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Tragic descending minor triad
        const notes = [
            { f: 329.6, t: 0, d: 0.3 },
            { f: 293.6, t: 0.3, d: 0.3 },
            { f: 261.6, t: 0.6, d: 0.3 },
            { f: 220.0, t: 0.9, d: 0.8 }
        ];
        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = n.f;
            const startT = now + n.t;
            gain.gain.setValueAtTime(0.18, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + n.d);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startT);
            osc.stop(startT + n.d);
        });
    }

    // --- Atmospheric Ambient Dungeon Soundscape ---

    startAmbientDungeon() {
        this.ensureContext();
        if (!this.ctx || this.ambientRunning) return;
        this.ambientRunning = true;

        // Sub-bass drone osc
        const drone = this.ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55; // A1 deep drone

        // Slow pitch drift LFO
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // very slow cycle
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 2.5;
        lfo.connect(drone.frequency);

        // Low-pass filtered noise for eerie wind/cavern whisper
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 220;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.08;

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ambientGain);

        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.12;
        drone.connect(droneGain);
        droneGain.connect(this.ambientGain);

        drone.start();
        lfo.start();
        noiseSource.start();

        this.ambientNodes = [drone, lfo, noiseSource];
    }

    stopAmbientDungeon() {
        if (!this.ambientRunning) return;
        this.ambientNodes.forEach(node => {
            try { node.stop(); } catch(e){}
        });
        this.ambientNodes = [];
        this.ambientRunning = false;
    }

    toggleAmbient() {
        if (this.ambientRunning) {
            this.stopAmbientDungeon();
            return false;
        } else {
            this.startAmbientDungeon();
            return true;
        }
    }
}

// Global sound singleton
const Sound = new SoundEngine();
window.Sound = Sound;
