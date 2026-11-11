import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';

function makeWaveshaperCurve(topology, drive) {
  const N = 4096;
  const curve = new Float32Array(N);
  const g = 1 + drive * 6.5;

  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1;
    if (topology === 'triode_even') {
      // Asymmetric single-ended Class-A tube curve -> rich Even (2f0, 4f0) + Odd harmonics!
      const bias = 0.24 * (drive / 1.0);
      curve[i] = Math.tanh((x + bias) * g) - Math.tanh(bias * g);
    } else if (topology === 'tape_odd') {
      // Pure symmetric push-pull / magnetic tape tanh -> Odd harmonics only (3f0, 5f0, 7f0)!
      curve[i] = Math.tanh(x * g);
    } else {
      // Harsh digital brickwall clip -> dense high-order odd harmonic buzz!
      curve[i] = Math.max(-0.75, Math.min(0.75, x * g));
    }
  }
  return curve;
}

export default function AnalogModelingModule() {
  const [topology, setTopology] = useState('triode_even'); // 'triode_even' | 'tape_odd' | 'hard_clip'
  const [drive, setDrive] = useState(0.55);
  const [oversampleMode, setOversampleMode] = useState('4x'); // 'none' | '4x'
  const [inputMode, setInputMode] = useState('sine220'); // 'sine220' | 'sine3200' | 'bass_stem'
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const srcRef = useRef(null);
  const canvasRef = useRef(null);

  const ensureAudio = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const bassBuf = FlangeStemGenerator.createBassStem(ctx);
    const input = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeWaveshaperCurve(topology, drive);
    shaper.oversample = oversampleMode;

    const dcBlocker = ctx.createBiquadFilter();
    dcBlocker.type = 'highpass';
    dcBlocker.frequency.value = 25;

    const outTrim = ctx.createGain();
    outTrim.gain.value = 0.35;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;

    input.connect(shaper);
    shaper.connect(dcBlocker);
    dcBlocker.connect(outTrim);
    outTrim.connect(analyser);
    analyser.connect(ctx.destination);

    audioRef.current = { bassBuf, input, shaper, analyser };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.shaper.curve = makeWaveshaperCurve(topology, drive);
    audioRef.current.shaper.oversample = oversampleMode;
  }, [topology, drive, oversampleMode]);

  // Harmonic Partial Spectrum (Even = Gold, Odd = Cyan) + Transfer Curve Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fft = new Uint8Array(2048);
    let raf = null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#070f0d';
      ctx.fillRect(0, 0, w, h);

      // Left 65%: FFT Spectrum highlighting Even vs Odd Partials
      const specW = w * 0.64;
      if (audioRef.current?.analyser && isPlaying) {
        audioRef.current.analyser.getByteFrequencyData(fft);
        for (let i = 1; i < 320; i++) {
          const x = (i / 320) * specW;
          const barH = (fft[i] / 255) * (h - 28);
          ctx.fillStyle = topology === 'triode_even' ? '#fbbf24' : topology === 'tape_odd' ? '#38bdf8' : '#f43f5e';
          ctx.fillRect(x, h - 14 - barH, Math.max(1.5, specW / 320), barH);
        }
      }

      // Right 32%: Non-linear Waveshaper Transfer Curve
      const cx = specW + 16;
      const cw = w - cx - 12;
      ctx.fillStyle = '#0c1714';
      ctx.fillRect(cx, 18, cw, h - 32);
      ctx.strokeStyle = '#1f2937';
      ctx.strokeRect(cx, 18, cw, h - 32);

      const curve = makeWaveshaperCurve(topology, drive);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < curve.length; i += 32) {
        const px = cx + (i / (curve.length - 1)) * cw;
        const py = 18 + (h - 32) * 0.5 - curve[i] * ((h - 32) * 0.42);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const labelTxt =
        topology === 'triode_even'
          ? 'ASYMMETRIC CLASS-A: EVEN (2f, 4f) + ODD HARMONICS'
          : topology === 'tape_odd'
            ? 'SYMMETRIC PUSH-PULL/TAPE: ODD HARMONICS ONLY (3f, 5f, 7f)'
            : 'HARD DIGITAL CLIP: DENSE HIGH-ORDER HARMONICS';
      ctx.fillText(labelTxt, 12, 15);
      ctx.fillText(`OVERSAMPLE: ${oversampleMode === '4x' ? '4× ANTI-ALIASED' : '1× NATIVE'}`, cx + 6, 14);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [topology, drive, oversampleMode, isPlaying]);

  const stopAudio = () => {
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
      srcRef.current = null;
    }
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const startSignal = (mode = inputMode) => {
    const { ctx, bassBuf, input } = ensureAudio();
    stopAudio();

    if (mode === 'bass_stem') {
      const s = ctx.createBufferSource();
      s.buffer = bassBuf;
      s.loop = true;
      s.connect(input);
      s.start();
      srcRef.current = s;
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = mode === 'sine220' ? 220 : 3450; // 3450 Hz clearly reveals Nyquist foldback aliasing at 1x!
      osc.connect(input);
      osc.start();
      srcRef.current = osc;
    }

    setIsPlaying(true);
    notifyPlayingChange(true);
  };

  useEffect(() => {
    const unsub = registerStopCallback(() => stopAudio());
    return () => {
      unsub();
      stopAudio();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, letterSpacing: '1.4px' }}>
            NON-LINEAR COMPONENT MODELING • EVEN/ODD HARMONICS &amp; OVERSAMPLING
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#ecfdf5', fontSize: '1.18rem', fontWeight: 800 }}>
            CIRCUIT HARMONIC ANALYZER &amp; 4× OVERSAMPLING LAB
          </h3>
        </div>

        <button
          onClick={() => (isPlaying ? stopAudio() : startSignal(inputMode))}
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
          <span>{isPlaying ? 'STOP GENERATOR' : 'INJECT TEST SIGNAL'}</span>
        </button>
      </div>

      {/* Spectrum + Transfer Curve */}
      <canvas
        ref={canvasRef}
        width={620}
        height={155}
        style={{
          width: '100%',
          height: '155px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Circuit Topology Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { id: 'triode_even', name: 'Class-A Triode (Even + Odd)', color: '#fbbf24' },
          { id: 'tape_odd', name: 'Push-Pull / Tape (Odd Only)', color: '#38bdf8' },
          { id: 'hard_clip', name: 'Hard Digital Clip (Harsh)', color: '#f43f5e' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTopology(t.id)}
            style={{
              padding: '9px 8px',
              borderRadius: '6px',
              border: topology === t.id ? `2px solid ${t.color}` : '1px solid #374151',
              backgroundColor: topology === t.id ? `${t.color}20` : '#09100e',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Drive, Oversampling & Input Stimulus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.1fr', gap: '10px' }}>
        <div style={{ backgroundColor: '#09100e', padding: '10px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: '#d1fae5', fontWeight: 700 }}>SATURATION DRIVE</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{Math.round(drive * 100)}%</span>
          </div>
          <input type="range" min="0.05" max="1" step="0.05" value={drive} onChange={(e) => setDrive(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
        </div>

        <button
          onClick={() => setOversampleMode(oversampleMode === '4x' ? 'none' : '4x')}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: oversampleMode === '4x' ? '1px solid #10b981' : '1px solid #ef4444',
            backgroundColor: oversampleMode === '4x' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
            color: '#ecfdf5',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          OVERSAMPLING: {oversampleMode === '4x' ? '4× ON (CLEAN)' : '1× OFF (ALIASING)'}
        </button>

        <select
          value={inputMode}
          onChange={(e) => {
            const v = e.target.value;
            setInputMode(v);
            if (isPlaying) startSignal(v);
          }}
          style={{
            backgroundColor: '#09100e',
            color: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '0 10px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
        >
          <option value="sine220">220 Hz Pure Sine (See Harmonics)</option>
          <option value="sine3200">3.45 kHz Sine (Hear 1× Aliasing!)</option>
          <option value="bass_stem">Electric Bass Stem (Warmth Test)</option>
        </select>
      </div>
    </div>
  );
}
