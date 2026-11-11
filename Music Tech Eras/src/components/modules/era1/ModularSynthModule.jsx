import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import RotaryKnob from '../../common/RotaryKnob';

const PATCH_PRESETS = [
  { name: '1968 Switched-On Baroque Pluck', wave1: 'sawtooth', wave2: 'square', detune: 6, cutoff: 1900, res: 5.5, envAmt: 2600, attack: 0.008, decay: 0.22, sustain: 0.15, release: 0.18, lfoRate: 4.5, lfoAmt: 0 },
  { name: 'Fat Dual-VCO Moog Bass', wave1: 'sawtooth', wave2: 'sawtooth', detune: 14, cutoff: 420, res: 8.5, envAmt: 1800, attack: 0.01, decay: 0.32, sustain: 0.4, release: 0.2, lfoRate: 2.0, lfoAmt: 40 },
  { name: 'Resonant Ladder Self-Sweep', wave1: 'square', wave2: 'sawtooth', detune: 9, cutoff: 680, res: 16.5, envAmt: 3400, attack: 0.03, decay: 0.55, sustain: 0.5, release: 0.35, lfoRate: 3.2, lfoAmt: 420 },
  { name: '1963 Forbidden Sci-Fi Wobble', wave1: 'triangle', wave2: 'square', detune: 22, cutoff: 1150, res: 14.0, envAmt: 900, attack: 0.05, decay: 0.4, sustain: 0.7, release: 0.45, lfoRate: 6.8, lfoAmt: 680 }
];

const KEYBOARD_NOTES = [
  { label: 'C2', midi: 36, black: false },
  { label: 'C#', midi: 37, black: true },
  { label: 'D2', midi: 38, black: false },
  { label: 'D#', midi: 39, black: true },
  { label: 'E2', midi: 40, black: false },
  { label: 'F2', midi: 41, black: false },
  { label: 'F#', midi: 42, black: true },
  { label: 'G2', midi: 43, black: false },
  { label: 'G#', midi: 44, black: true },
  { label: 'A2', midi: 45, black: false },
  { label: 'A#', midi: 46, black: true },
  { label: 'B2', midi: 47, black: false },
  { label: 'C3', midi: 48, black: false },
  { label: 'D3', midi: 50, black: false },
  { label: 'E3', midi: 52, black: false },
  { label: 'G3', midi: 55, black: false }
];

const ARP_MIDI = [36, 48, 43, 46, 36, 48, 41, 43];

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export default function ModularSynthModule() {
  const [wave1, setWave1] = useState('sawtooth');
  const [wave2, setWave2] = useState('sawtooth');
  const [detune, setDetune] = useState(12);
  const [cutoff, setCutoff] = useState(720);
  const [res, setRes] = useState(8.5);
  const [envAmt, setEnvAmt] = useState(2100);
  const [attack, setAttack] = useState(0.012);
  const [decay, setDecay] = useState(0.28);
  const [sustain, setSustain] = useState(0.35);
  const [release, setRelease] = useState(0.22);
  const [lfoRate, setLfoRate] = useState(3.5);
  const [lfoAmt, setLfoAmt] = useState(80);
  const [arpRunning, setArpRunning] = useState(false);
  const [activeMidi, setActiveMidi] = useState(null);

  const analyserRef = useRef(null);
  const arpTimerRef = useRef(null);
  const scopeCanvasRef = useRef(null);
  const paramsRef = useRef({});
  paramsRef.current = { wave1, wave2, detune, cutoff, res, envAmt, attack, decay, sustain, release, lfoRate, lfoAmt };

  const ensureAnalyser = () => {
    const ctx = getSharedAudioContext();
    if (!analyserRef.current) {
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      const master = ctx.createGain();
      master.gain.value = 0.65;
      an.connect(master);
      master.connect(ctx.destination);
      analyserRef.current = an;
    }
    return { ctx, analyser: analyserRef.current };
  };

  const triggerNote = (midi, gateDurationSec = 0.24) => {
    const { ctx, analyser } = ensureAnalyser();
    const p = paramsRef.current;
    const now = ctx.currentTime;
    const f0 = midiToHz(midi);

    setActiveMidi(midi);

    const vco1 = ctx.createOscillator();
    const vco2 = ctx.createOscillator();
    vco1.type = p.wave1;
    vco2.type = p.wave2;
    vco1.frequency.setValueAtTime(f0, now);
    vco2.frequency.setValueAtTime(f0, now);
    vco2.detune.setValueAtTime(p.detune, now);

    // 24 dB/oct Transistor Ladder = Two cascaded 12 dB/oct lowpass stages
    const vcf1 = ctx.createBiquadFilter();
    const vcf2 = ctx.createBiquadFilter();
    vcf1.type = 'lowpass';
    vcf2.type = 'lowpass';
    vcf1.Q.setValueAtTime(p.res * 0.65, now);
    vcf2.Q.setValueAtTime(p.res * 0.45, now);

    const baseCut = Math.max(40, p.cutoff);
    const peakCut = Math.min(14000, baseCut + p.envAmt);
    const susCut = Math.min(14000, baseCut + p.envAmt * p.sustain);

    [vcf1.frequency, vcf2.frequency].forEach((param) => {
      param.setValueAtTime(baseCut, now);
      param.linearRampToValueAtTime(peakCut, now + p.attack);
      param.exponentialRampToValueAtTime(Math.max(45, susCut), now + p.attack + p.decay);
      param.exponentialRampToValueAtTime(Math.max(40, baseCut), now + gateDurationSec + p.release);
    });

    // Optional LFO -> VCF Cutoff CV
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(p.lfoRate, now);
    lfoGain.gain.setValueAtTime(p.lfoAmt, now);
    lfo.connect(lfoGain);
    lfoGain.connect(vcf1.frequency);
    lfoGain.connect(vcf2.frequency);

    // VCA with ADSR Contour
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, now);
    vca.gain.linearRampToValueAtTime(0.45, now + p.attack);
    vca.gain.linearRampToValueAtTime(Math.max(0.02, 0.45 * p.sustain), now + p.attack + p.decay);
    vca.gain.setValueAtTime(Math.max(0.02, 0.45 * p.sustain), now + gateDurationSec);
    vca.gain.exponentialRampToValueAtTime(0.0001, now + gateDurationSec + p.release);

    vco1.connect(vcf1);
    vco2.connect(vcf1);
    vcf1.connect(vcf2);
    vcf2.connect(vca);
    vca.connect(analyser);

    const stopAt = now + gateDurationSec + p.release + 0.05;
    vco1.start(now);
    vco2.start(now);
    lfo.start(now);
    vco1.stop(stopAt);
    vco2.stop(stopAt);
    lfo.stop(stopAt);
  };

  const stopArp = () => {
    if (arpTimerRef.current) {
      clearInterval(arpTimerRef.current);
      arpTimerRef.current = null;
    }
    setActiveMidi(null);
    setArpRunning((prev) => {
      if (prev) notifyPlayingChange(false);
      return false;
    });
  };

  const toggleArp = () => {
    if (arpRunning) {
      stopArp();
      return;
    }
    let step = 0;
    setArpRunning(true);
    notifyPlayingChange(true);
    triggerNote(ARP_MIDI[0], 0.18);
    step = 1;
    arpTimerRef.current = setInterval(() => {
      triggerNote(ARP_MIDI[step % ARP_MIDI.length], 0.18);
      step += 1;
    }, 210);
  };

  // CRT Phosphor Oscilloscope
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const timeBuf = new Float32Array(1024);
    let raf = null;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#05100a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.14)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (analyserRef.current) {
        analyserRef.current.getFloatTimeDomainData(timeBuf);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 512; i++) {
          const x = (i / 511) * w;
          const y = h * 0.5 - timeBuf[i] * h * 0.72;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#86efac';
      ctx.font = '10px monospace';
      ctx.fillText('VCO 1+2 → 24dB LADDER VCF → VCA CRT SCOPE', 10, 15);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const unsub = registerStopCallback(() => stopArp());
    return () => {
      unsub();
      stopArp();
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#181410',
        borderRadius: '12px',
        border: '3px solid #6b4423',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#d4af37', fontWeight: 700, letterSpacing: '1.5px' }}>
            R. A. MOOG CO. • TRUMANSBURG, NEW YORK (1963)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f8fafc', fontFamily: '"Courier Prime", monospace', fontSize: '1.18rem' }}>
            1V/OCT EAST-COAST SUBTRACTIVE MODULAR SYNTHESIZER
          </h3>
        </div>

        <button
          onClick={toggleArp}
          style={{
            backgroundColor: arpRunning ? '#dc2626' : '#d4af37',
            color: arpRunning ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {arpRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{arpRunning ? 'STOP CV SEQUENCER' : 'RUN 8-STEP CV SEQUENCER'}</span>
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {PATCH_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setWave1(p.wave1);
              setWave2(p.wave2);
              setDetune(p.detune);
              setCutoff(p.cutoff);
              setRes(p.res);
              setEnvAmt(p.envAmt);
              setAttack(p.attack);
              setDecay(p.decay);
              setSustain(p.sustain);
              setRelease(p.release);
              setLfoRate(p.lfoRate);
              setLfoAmt(p.lfoAmt);
            }}
            style={{
              backgroundColor: '#241d17',
              border: '1px solid #6b4423',
              color: '#f3e5ab',
              fontSize: '0.73rem',
              padding: '5px 10px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Green Phosphor CRT Scope */}
      <canvas
        ref={scopeCanvasRef}
        width={620}
        height={135}
        style={{
          width: '100%',
          height: '135px',
          borderRadius: '8px',
          border: '2px solid #14532d',
          marginBottom: '16px',
          display: 'block'
        }}
      />

      {/* Modular Cabinet Bay: VCO | 24dB Ladder VCF | ADSR Contour + LFO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.2fr',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        {/* VCO Module */}
        <div style={{ backgroundColor: '#110f0d', padding: '12px', borderRadius: '8px', border: '1px solid #3f3830' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d4af37', marginBottom: '10px', textAlign: 'center' }}>
            901-B DUAL VCO BANK
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            <select
              value={wave1}
              onChange={(e) => setWave1(e.target.value)}
              style={{ backgroundColor: '#1c1917', color: '#f8fafc', border: '1px solid #44403c', borderRadius: '5px', padding: '5px', fontSize: '0.76rem' }}
            >
              <option value="sawtooth">VCO 1: Ramp Sawtooth (All Harmonics)</option>
              <option value="square">VCO 1: Square Pulse (Odd Harmonics)</option>
              <option value="triangle">VCO 1: Triangle Core</option>
            </select>
            <select
              value={wave2}
              onChange={(e) => setWave2(e.target.value)}
              style={{ backgroundColor: '#1c1917', color: '#f8fafc', border: '1px solid #44403c', borderRadius: '5px', padding: '5px', fontSize: '0.76rem' }}
            >
              <option value="sawtooth">VCO 2: Ramp Sawtooth</option>
              <option value="square">VCO 2: Square Pulse</option>
              <option value="triangle">VCO 2: Triangle Core</option>
            </select>
          </div>
          <RotaryKnob label="VCO 2 Detune" value={detune} min={0} max={40} step={1} defaultValue={12} unit="ct" accent="#d4af37" size={48} onChange={setDetune} />
        </div>

        {/* 904A 24dB Ladder VCF */}
        <div style={{ backgroundColor: '#110f0d', padding: '12px', borderRadius: '8px', border: '1px solid #3f3830' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', marginBottom: '10px', textAlign: 'center' }}>
            904-A 24dB LADDER VCF
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RotaryKnob label="Cutoff" value={cutoff} min={60} max={6000} step={20} defaultValue={720} unit="Hz" accent="#38bdf8" size={48} onChange={setCutoff} />
            <RotaryKnob label="Emphasis Q" value={res} min={0.5} max={20} step={0.5} defaultValue={8.5} accent="#f43f5e" size={48} onChange={setRes} />
            <RotaryKnob label="Contour Amt" value={envAmt} min={0} max={5000} step={50} defaultValue={2100} unit="Hz" accent="#22c55e" size={48} onChange={setEnvAmt} />
            <RotaryKnob label="LFO → VCF" value={lfoAmt} min={0} max={900} step={10} defaultValue={80} unit="Hz" accent="#a855f7" size={48} onChange={setLfoAmt} />
          </div>
        </div>

        {/* 911 ADSR Contour Generator */}
        <div style={{ backgroundColor: '#110f0d', padding: '12px', borderRadius: '8px', border: '1px solid #3f3830' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#22c55e', marginBottom: '10px', textAlign: 'center' }}>
            911 ADSR CONTOUR + LFO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <RotaryKnob label="Attack" value={attack} min={0.005} max={0.8} step={0.005} defaultValue={0.012} unit="s" accent="#22c55e" size={44} onChange={setAttack} />
            <RotaryKnob label="Decay" value={decay} min={0.05} max={1.2} step={0.02} defaultValue={0.28} unit="s" accent="#22c55e" size={44} onChange={setDecay} />
            <RotaryKnob label="Sustain" value={sustain} min={0.05} max={1.0} step={0.05} defaultValue={0.35} accent="#22c55e" size={44} onChange={setSustain} />
            <RotaryKnob label="Release" value={release} min={0.05} max={1.5} step={0.05} defaultValue={0.22} unit="s" accent="#22c55e" size={44} onChange={setRelease} />
            <RotaryKnob label="LFO Rate" value={lfoRate} min={0.3} max={14} step={0.2} defaultValue={3.5} unit="Hz" accent="#a855f7" size={44} onChange={setLfoRate} />
          </div>
        </div>
      </div>

      {/* Playable 1V/Oct Pratt-Read Keyboard */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KEYBOARD_NOTES.length}, 1fr)`, gap: '4px' }}>
        {KEYBOARD_NOTES.map((k) => {
          const isLit = activeMidi === k.midi;
          return (
            <button
              key={k.midi}
              onMouseDown={() => triggerNote(k.midi, 0.32)}
              style={{
                height: '62px',
                borderRadius: '0 0 6px 6px',
                border: isLit ? '2px solid #d4af37' : '1px solid #3f3f46',
                backgroundColor: isLit
                  ? '#d4af37'
                  : k.black
                    ? '#18181b'
                    : '#f4f4f5',
                color: isLit ? '#09090b' : k.black ? '#e4e4e7' : '#18181b',
                fontWeight: 800,
                fontSize: '0.68rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '6px'
              }}
            >
              {k.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
