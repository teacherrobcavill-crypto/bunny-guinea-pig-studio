import React, { useState, useEffect, useRef } from 'react';
import { getSharedAudioContext } from '../../../audio/SharedAudioContext';

const WAVE_PRESETS = {
  orch5: {
    name: 'ORCH5.VC (Stravinsky Brass/String Hit)',
    envelope: 'stab',
    gen: (i, N) => {
      const p = (i / N) * Math.PI * 2;
      return Math.tanh((Math.sin(p) + 0.7 * Math.sin(2 * p) + 0.55 * Math.sin(3 * p) + 0.4 * Math.sin(5 * p) + 0.3 * Math.sin(7 * p)) * 0.8);
    }
  },
  sararr: {
    name: 'SARARR.VC (Breathy Formant Choir)',
    envelope: 'pad',
    gen: (i, N) => {
      const p = (i / N) * Math.PI * 2;
      return (Math.sin(p) * 0.55 + Math.sin(3 * p) * 0.3 + Math.sin(6 * p) * 0.22 + (Math.random() * 2 - 1) * 0.08);
    }
  },
  nasal: {
    name: 'PAGE-D LIGHTPEN HOLLOW PULSE',
    envelope: 'pluck',
    gen: (i, N) => (i < N * 0.22 ? 0.85 : i < N * 0.55 ? -0.75 : 0.25 * Math.sin((i / N) * Math.PI * 8))
  }
};

const KEYS = [
  { label: 'C3 (-1 Oct / 2.0x Len)', midi: 48 },
  { label: 'E3', midi: 52 },
  { label: 'G3', midi: 55 },
  { label: 'C4 (Root 1.0x Len)', midi: 60 },
  { label: 'E4', midi: 64 },
  { label: 'G4', midi: 67 },
  { label: 'B4', midi: 71 },
  { label: 'C5 (+1 Oct / 0.5x Len)', midi: 72 }
];

export default function FairlightModule() {
  const [waveTable, setWaveTable] = useState(() => {
    const arr = new Float32Array(128);
    for (let i = 0; i < 128; i++) arr[i] = WAVE_PRESETS.orch5.gen(i, 128);
    return Array.from(arr);
  });
  const [envStyle, setEnvStyle] = useState('stab');
  const [lastTriggered, setLastTriggered] = useState({ midi: 60, ratio: 1.0, durSec: 0.85 });
  const [isDrawing, setIsDrawing] = useState(false);

  const crtRef = useRef(null);

  const loadPreset = (key) => {
    const p = WAVE_PRESETS[key];
    const next = [];
    for (let i = 0; i < 128; i++) {
      // Quantize to 8-bit (-128..127) just like Fairlight CMI Series I/II!
      const raw = p.gen(i, 128);
      next.push(Math.round(raw * 127) / 127);
    }
    setWaveTable(next);
    setEnvStyle(p.envelope);
  };

  // Green Phosphor Page D CRT Canvas
  useEffect(() => {
    const canvas = crtRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#031107';
    ctx.fillRect(0, 0, w, h);

    // Scanlines & Grid
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw 8-bit 128-sample Page D Lightpen Waveform
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < waveTable.length; i++) {
      const x = (i / (waveTable.length - 1)) * w;
      const y = h * 0.5 - waveTable[i] * (h * 0.42);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('FAIRLIGHT CMI PAGE D — DRAW WAVEFORM WITH LIGHTPEN (8-BIT 128 SAMPLES)', 12, 18);
  }, [waveTable]);

  const applyLightpen = (e) => {
    const canvas = crtRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(0.999, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const idx = Math.floor(normX * 128);
    const val = Math.max(-1, Math.min(1, (0.5 - normY) / 0.42));
    const q8bit = Math.round(val * 127) / 127;

    setWaveTable((prev) => {
      const copy = [...prev];
      copy[idx] = q8bit;
      if (idx > 0) copy[idx - 1] = (copy[idx - 1] + q8bit) * 0.5;
      if (idx < 127) copy[idx + 1] = (copy[idx + 1] + q8bit) * 0.5;
      return copy;
    });
  };

  const playFairlightSample = (midi) => {
    const ctx = getSharedAudioContext();
    const sr = ctx.sampleRate;
    const baseDurationSec = 0.9; // Fixed memory buffer length at Root C4
    const len = Math.floor(sr * baseDurationSec);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    // Render fixed-length 8-bit sample in RAM at C4 (261.63 Hz) so variable-clock playbackRate halves/doubles duration!
    const rootFreq = 261.63;
    const samplesPerCycle = sr / rootFreq;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const pos = ((i % samplesPerCycle) / samplesPerCycle) * 128;
      const idx = Math.floor(pos) % 128;
      // Intentional Zero-Order Hold 8-bit Fairlight grit!
      let sample = waveTable[idx];
      if (envStyle === 'stab') {
        // Add classic orchestral transient burst on attack
        sample = sample * Math.exp(-t * 3.8) * (1 - Math.exp(-t * 140));
      } else if (envStyle === 'pad') {
        sample = sample * Math.min(1, t / 0.14) * Math.min(1, (baseDurationSec - t) / 0.16);
      } else {
        sample = sample * Math.exp(-t * 4.5);
      }
      d[i] = sample * 0.55;
    }

    const ratio = Math.pow(2, (midi - 60) / 12);
    const actualDur = baseDurationSec / ratio;
    setLastTriggered({ midi, ratio, durSec: actualDur });

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = ratio; // Variable DAC clock rate!

    const out = ctx.createGain();
    out.gain.value = 0.85;
    src.connect(out);
    out.connect(ctx.destination);
    src.start();
  };

  return (
    <div
      style={{
        backgroundColor: '#111613',
        borderRadius: '12px',
        border: '3px solid #22c55e88',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.8)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700, letterSpacing: '1.4px' }}>
            FAIRLIGHT INSTRUMENTS SYDNEY • CMI SERIES II (1979–1982)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#ecfdf5', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.14rem' }}>
            PAGE D LIGHTPEN CRT &amp; VARIABLE-CLOCK 8-BIT SAMPLER
          </h3>
        </div>

        <div style={{ backgroundColor: '#041208', padding: '6px 12px', borderRadius: '6px', border: '1px solid #22c55e66', fontFamily: 'monospace', fontSize: '0.74rem', color: '#86efac' }}>
          CLOCK RATIO: <strong>{lastTriggered.ratio.toFixed(2)}×</strong> • SAMPLE LENGTH: <strong>{lastTriggered.durSec.toFixed(2)}s</strong>
        </div>
      </div>

      {/* 8-Bit Floppy Disk Voice Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {Object.entries(WAVE_PRESETS).map(([k, p]) => (
          <button
            key={k}
            onClick={() => loadPreset(k)}
            style={{
              backgroundColor: '#051b0d',
              border: '1px solid #22c55e88',
              color: '#86efac',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.73rem',
              padding: '6px 10px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            8&quot; FLOPPY: {p.name}
          </button>
        ))}
      </div>

      {/* Interactive Lightpen CRT */}
      <canvas
        ref={crtRef}
        width={620}
        height={175}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setIsDrawing(true);
          applyLightpen(e);
        }}
        onPointerMove={(e) => {
          if (isDrawing) applyLightpen(e);
        }}
        onPointerUp={() => setIsDrawing(false)}
        style={{
          width: '100%',
          height: '175px',
          borderRadius: '8px',
          border: '2px solid #22c55e',
          marginBottom: '14px',
          cursor: 'crosshair',
          display: 'block',
          touchAction: 'none'
        }}
      />

      {/* Variable-Clock Transposition Keyboard */}
      <div style={{ fontSize: '0.74rem', color: '#a7f3d0', marginBottom: '8px', fontFamily: 'monospace' }}>
        CLICK KEYS TO COMPARE ROOT C4 (0.90s) VS C5 (+1 OCTAVE = 0.45s MUNCKINIZATION) VS C3 (-1 OCTAVE = 1.80s GRIT):
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {KEYS.map((k) => (
          <button
            key={k.midi}
            onClick={() => playFairlightSample(k.midi)}
            style={{
              padding: '11px 8px',
              borderRadius: '6px',
              border: lastTriggered.midi === k.midi ? '2px solid #4ade80' : '1px solid #14532d',
              backgroundColor: lastTriggered.midi === k.midi ? 'rgba(34,197,94,0.22)' : '#07190e',
              color: '#ecfdf5',
              fontWeight: 800,
              fontSize: '0.73rem',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer'
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
