import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import RotaryKnob from '../../common/RotaryKnob';

// 8 distinct harmonic wavetable frames (harmonics 1..16)
const WT_FRAMES = [
  { name: 'Sine Pure', amps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Warm Tri', amps: [1, 0, 0.12, 0, 0.04, 0, 0.02, 0, 0, 0, 0, 0] },
  { name: 'Formant Ah', amps: [0.7, 0.3, 0.85, 0.4, 0.15, 0.6, 0.25, 0.1, 0.05, 0, 0, 0] },
  { name: 'Classic Saw', amps: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.12, 0.11, 0.1, 0.09, 0.08] },
  { name: 'Hollow Square', amps: [1, 0, 0.33, 0, 0.2, 0, 0.14, 0, 0.11, 0, 0.09, 0] },
  { name: 'Vocal Ee-Oh', amps: [0.5, 0.8, 0.2, 0.1, 0.75, 0.5, 0.15, 0.45, 0.3, 0.2, 0.1, 0] },
  { name: 'Metallic Sync', amps: [0.4, 0.2, 0.9, 0.1, 0.7, 0.8, 0.2, 0.65, 0.5, 0.4, 0.35, 0.3] },
  { name: 'Hyper Growl', amps: [0.8, 0.6, 0.7, 0.9, 0.4, 0.85, 0.6, 0.75, 0.5, 0.65, 0.55, 0.45] }
];

function interpolatePeriodicWave(ctx, pos01) {
  const scaled = Math.max(0, Math.min(0.9999, pos01)) * (WT_FRAMES.length - 1);
  const idxA = Math.floor(scaled);
  const idxB = Math.min(WT_FRAMES.length - 1, idxA + 1);
  const frac = scaled - idxA;

  const real = new Float32Array(13);
  const imag = new Float32Array(13);
  for (let h = 1; h <= 12; h++) {
    imag[h] = WT_FRAMES[idxA].amps[h - 1] * (1 - frac) + WT_FRAMES[idxB].amps[h - 1] * frac;
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

export default function WavetableModule() {
  const [wtPos, setWtPos] = useState(0.38);
  const [lfoMorph, setLfoMorph] = useState(true);
  const [lfoRate, setLfoRate] = useState(0.35);
  const [unisonVoices, setUnisonVoices] = useState(5); // 1, 3, 5, 7
  const [detuneSpread, setDetuneSpread] = useState(24);
  const [subMonoOn, setSubMonoOn] = useState(true);
  const [noteHz, setNoteHz] = useState(110); // A2
  const [isPlaying, setIsPlaying] = useState(false);
  const [livePos, setLivePos] = useState(0.38);

  const canvasRef = useRef(null);
  const voiceBankRef = useRef(null);
  const paramsRef = useRef({ wtPos, lfoMorph, lfoRate, subMonoOn });
  paramsRef.current = { wtPos, lfoMorph, lfoRate, subMonoOn };

  const stopDrone = () => {
    if (voiceBankRef.current) {
      voiceBankRef.current.oscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch (_) {}
      });
      try {
        voiceBankRef.current.subOsc.stop();
        voiceBankRef.current.subOsc.disconnect();
      } catch (_) {}
      voiceBankRef.current = null;
    }
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const startDrone = (freq = noteHz, voices = unisonVoices, spread = detuneSpread) => {
    const ctx = getSharedAudioContext();
    stopDrone();

    const master = ctx.createGain();
    master.gain.value = 0.45 / Math.sqrt(voices);
    master.connect(ctx.destination);

    const wave = interpolatePeriodicWave(ctx, paramsRef.current.wtPos);
    const oscs = [];

    for (let v = 0; v < voices; v++) {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.value = freq;

      const norm = voices === 1 ? 0 : (v / (voices - 1)) * 2 - 1; // -1 .. +1
      osc.detune.value = norm * spread;

      const pan = ctx.createStereoPanner();
      pan.pan.value = norm * 0.85;

      osc.connect(pan);
      pan.connect(master);
      osc.start();
      oscs.push(osc);
    }

    // Dedicated Center Mono -1 Octave Sub Oscillator
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.value = freq * 0.5;
    subGain.gain.value = paramsRef.current.subMonoOn ? 0.28 : 0.0;
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();

    voiceBankRef.current = { ctx, oscs, subOsc, subGain };
    setIsPlaying(true);
    notifyPlayingChange(true);
  };

  useEffect(() => {
    if (voiceBankRef.current) {
      startDrone(noteHz, unisonVoices, detuneSpread);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unisonVoices, detuneSpread, noteHz]);

  useEffect(() => {
    if (voiceBankRef.current) {
      const { ctx, subGain } = voiceBankRef.current;
      subGain.gain.setTargetAtTime(subMonoOn ? 0.28 : 0.0, ctx.currentTime, 0.02);
    }
  }, [subMonoOn]);

  // 60fps 3D Isometric Stacked-Frame Wavetable Visualizer + Real-Time PeriodicWave Morphing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    let phase = 0;
    let frameCounter = 0;
    let raf = null;

    const render = () => {
      const { wtPos: basePos, lfoMorph: morphOn, lfoRate: rate } = paramsRef.current;
      phase += 0.016 * rate * Math.PI * 2;
      const effPos = morphOn
        ? Math.max(0, Math.min(1, basePos + Math.sin(phase) * 0.35))
        : basePos;

      frameCounter += 1;
      if (frameCounter % 3 === 0) {
        setLivePos(effPos);
        if (voiceBankRef.current) {
          const pw = interpolatePeriodicWave(voiceBankRef.current.ctx, effPos);
          voiceBankRef.current.oscs.forEach((o) => o.setPeriodicWave(pw));
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = '#070f0d';
      ctx2d.fillRect(0, 0, w, h);

      // Draw 8 isometric 3D stacked frames back-to-front
      for (let f = WT_FRAMES.length - 1; f >= 0; f--) {
        const depthNorm = f / (WT_FRAMES.length - 1);
        const offsetX = 44 + depthNorm * 110;
        const offsetY = h - 34 - depthNorm * 92;
        const widthSpan = w - 180;
        const dist = Math.abs(effPos * (WT_FRAMES.length - 1) - f);
        const activeWeight = Math.max(0, 1 - dist);

        ctx2d.strokeStyle =
          activeWeight > 0.25
            ? `rgba(16, 185, 129, ${0.45 + activeWeight * 0.55})`
            : 'rgba(148, 163, 184, 0.18)';
        ctx2d.lineWidth = activeWeight > 0.25 ? 2.6 : 1.1;
        ctx2d.beginPath();

        for (let i = 0; i <= 96; i++) {
          const t = (i / 96) * Math.PI * 2;
          let ySum = 0;
          WT_FRAMES[f].amps.forEach((amp, hIdx) => {
            ySum += Math.sin(t * (hIdx + 1)) * amp;
          });
          const px = offsetX + (i / 96) * widthSpan;
          const py = offsetY - ySum * 16;
          i === 0 ? ctx2d.moveTo(px, py) : ctx2d.lineTo(px, py);
        }
        ctx2d.stroke();
      }

      const frameIdx = Math.min(WT_FRAMES.length - 1, Math.round(effPos * (WT_FRAMES.length - 1)));
      ctx2d.fillStyle = '#6ee7b7';
      ctx2d.font = 'bold 11px "JetBrains Mono", monospace';
      ctx2d.fillText(
        `3D WAVETABLE POS: ${Math.round(effPos * 100)}% (${WT_FRAMES[frameIdx].name}) • UNISON: ${unisonVoices} VOICES`,
        14,
        18
      );

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [unisonVoices]);

  useEffect(() => {
    const unsub = registerStopCallback(() => stopDrone());
    return () => {
      unsub();
      stopDrone();
    };
  }, []);

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #0b1512 0%, #090d11 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(16, 185, 129, 0.45)',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, letterSpacing: '1.4px' }}>
            XFER SERUM / ABLETON WAVETABLE ARCHITECTURE (2014–PRESENT)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#ecfdf5', fontSize: '1.18rem', fontWeight: 800 }}>
            3D MORPHING WAVETABLE &amp; STEREO UNISON ENGINE
          </h3>
        </div>

        <button
          onClick={() => (isPlaying ? stopDrone() : startDrone())}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#10b981',
            color: isPlaying ? '#fff' : '#052e16',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '7px'
          }}
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isPlaying ? 'STOP WAVETABLE VOICE' : 'HOLD WAVETABLE SYNTH'}</span>
        </button>
      </div>

      {/* 3D Isometric Stacked Wavetable Canvas */}
      <canvas
        ref={canvasRef}
        width={620}
        height={180}
        style={{
          width: '100%',
          height: '180px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Note Selector Pads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '14px' }}>
        {[
          { label: 'E1 (41 Hz Bass)', hz: 41.2 },
          { label: 'A1 (55 Hz Sub)', hz: 55.0 },
          { label: 'D2 (73 HzReese)', hz: 73.42 },
          { label: 'A2 (110 Hz Lead)', hz: 110.0 },
          { label: 'E3 (165 Hz Pad)', hz: 164.81 }
        ].map((n) => (
          <button
            key={n.label}
            onClick={() => setNoteHz(n.hz)}
            style={{
              padding: '8px 4px',
              borderRadius: '6px',
              border: noteHz === n.hz ? '1px solid #10b981' : '1px solid #27272a',
              backgroundColor: noteHz === n.hz ? 'rgba(16,185,129,0.2)' : '#111827',
              color: '#ecfdf5',
              fontSize: '0.71rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', backgroundColor: '#09100e', padding: '14px', borderRadius: '10px', border: '1px solid #1f2937', alignItems: 'center' }}>
        <RotaryKnob
          label="WT Pos"
          value={wtPos}
          min={0}
          max={1}
          step={0.02}
          defaultValue={0.38}
          accent="#10b981"
          size={46}
          onChange={setWtPos}
          formatValue={() => `${Math.round(livePos * 100)}%`}
        />
        <RotaryKnob label="LFO Rate" value={lfoRate} min={0.05} max={2.5} step={0.05} defaultValue={0.35} unit="Hz" accent="#38bdf8" size={46} onChange={setLfoRate} />
        <RotaryKnob label="Unison" value={unisonVoices} steps={[1, 3, 5, 7]} defaultValue={5} unit="v" accent="#a855f7" size={46} onChange={setUnisonVoices} />
        <RotaryKnob label="Detune" value={detuneSpread} min={0} max={55} step={1} defaultValue={24} unit="ct" accent="#f59e0b" size={46} onChange={setDetuneSpread} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setLfoMorph(!lfoMorph)}
            style={{
              padding: '7px',
              borderRadius: '5px',
              border: lfoMorph ? '1px solid #10b981' : '1px solid #374151',
              backgroundColor: lfoMorph ? 'rgba(16,185,129,0.2)' : '#111827',
              color: '#ecfdf5',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            LFO MORPH: {lfoMorph ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setSubMonoOn(!subMonoOn)}
            style={{
              padding: '7px',
              borderRadius: '5px',
              border: subMonoOn ? '1px solid #38bdf8' : '1px solid #374151',
              backgroundColor: subMonoOn ? 'rgba(56,189,248,0.2)' : '#111827',
              color: '#ecfdf5',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            MONO SUB: {subMonoOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
