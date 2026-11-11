import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { ProceduralStemGenerator } from '../../../audio/Procedural80sStems';

export default function QuantizeDitherModule() {
  const [bitDepth, setBitDepth] = useState(8);
  const [sampleRateSim, setSampleRateSim] = useState(44100);
  const [tpdfDither, setTpdfDither] = useState(false);
  const [antiAliasFilter, setAntiAliasFilter] = useState(true);
  const [stimulus, setStimulus] = useState('vocal_tail'); // 'vocal_tail' | 'high_sweep'
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const srcRef = useRef(null);
  const canvasRef = useRef(null);
  const paramsRef = useRef({ bitDepth, sampleRateSim, tpdfDither, antiAliasFilter });
  paramsRef.current = { bitDepth, sampleRateSim, tpdfDither, antiAliasFilter };

  const sqnrDb = (6.02 * bitDepth + 1.76).toFixed(1);
  const nyquistHz = Math.round(sampleRateSim / 2);

  const createSweepBuffer = (ctx) => {
    const sr = ctx.sampleRate;
    const len = sr * 4;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Sweeps 400 Hz -> 9000 Hz so foldback aliasing below low sample rates is unmistakable!
      const f = 400 + (t / 4) * 8600;
      phase += (2 * Math.PI * f) / sr;
      d[i] = Math.sin(phase) * 0.45;
    }
    return buf;
  };

  const ensureEngine = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const vocalBuf = ProceduralStemGenerator.createVocalPadStem(ctx);
    const sweepBuf = createSweepBuffer(ctx);

    const inputGain = ctx.createGain();
    const aaFilter = ctx.createBiquadFilter();
    aaFilter.type = 'lowpass';
    aaFilter.Q.value = 0.707;

    // ScriptProcessor used intentionally for direct educational sample-by-sample TPDF + ZOH quantization
    const proc = ctx.createScriptProcessor(1024, 1, 1);
    let holdSample = 0;
    let phaseAcc = 0;

    proc.onaudioprocess = (e) => {
      const inp = e.inputBuffer.getChannelData(0);
      const out = e.outputBuffer.getChannelData(0);
      const { bitDepth: bits, sampleRateSim: targetSr, tpdfDither: ditherOn } = paramsRef.current;

      const levels = Math.pow(2, bits);
      const stepSize = 2.0 / levels;
      const ratio = Math.max(1, ctx.sampleRate / targetSr);

      for (let i = 0; i < inp.length; i++) {
        phaseAcc += 1;
        if (phaseAcc >= ratio) {
          phaseAcc -= ratio;
          let x = inp[i];
          if (ditherOn) {
            // Triangular PDF = sum of two independent rectangular RNGs in [-0.5, +0.5] LSB
            const r1 = Math.random() - 0.5;
            const r2 = Math.random() - 0.5;
            x += (r1 + r2) * stepSize;
          }
          holdSample = Math.round(x / stepSize) * stepSize;
        }
        out[i] = Math.max(-1, Math.min(1, holdSample));
      }
    };

    const master = ctx.createGain();
    master.gain.value = 0.8;

    inputGain.connect(aaFilter);
    aaFilter.connect(proc);
    proc.connect(master);
    master.connect(ctx.destination);

    audioRef.current = { vocalBuf, sweepBuf, inputGain, aaFilter, proc };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { aaFilter } = audioRef.current;
    const now = aaFilter.context.currentTime;
    const cutoff = antiAliasFilter ? Math.min(20000, sampleRateSim * 0.45) : 21000;
    aaFilter.frequency.setTargetAtTime(cutoff, now, 0.02);
  }, [sampleRateSim, antiAliasFilter]);

  // Staircase Quantization & TPDF Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0c0814';
    ctx.fillRect(0, 0, w, h);

    const levels = Math.min(64, Math.pow(2, bitDepth));
    const step = 2.0 / levels;
    const decimate = Math.max(1, Math.round(44100 / sampleRateSim));

    // Original smooth analog sine wave (dim purple)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 4) * 0.78;
      const y = h * 0.5 - s * (h * 0.42);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Quantized PCM Staircase (bright neon violet/green)
    ctx.strokeStyle = tpdfDither ? '#4ade80' : '#c084fc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    let heldY = h * 0.5;
    for (let x = 0; x < w; x++) {
      if (x % (decimate * 3) === 0) {
        let s = Math.sin((x / w) * Math.PI * 4) * 0.78;
        if (tpdfDither && bitDepth <= 8) {
          s += ((Math.random() - 0.5) + (Math.random() - 0.5)) * step;
        }
        const q = Math.round(s / step) * step;
        heldY = h * 0.5 - q * (h * 0.42);
      }
      x === 0 ? ctx.moveTo(x, heldY) : ctx.lineTo(x, heldY);
    }
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 10.5px monospace';
    ctx.fillText(
      `${bitDepth}-BIT (${Math.pow(2, bitDepth).toLocaleString()} STATES) • SQNR: ${sqnrDb} dB • NYQUIST: ${(nyquistHz / 1000).toFixed(2)} kHz`,
      12,
      16
    );
  }, [bitDepth, sampleRateSim, tpdfDither, sqnrDb, nyquistHz]);

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

  const startAudio = (targetStim = stimulus) => {
    const { ctx, vocalBuf, sweepBuf, inputGain } = ensureEngine();
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
    }
    const src = ctx.createBufferSource();
    src.buffer = targetStim === 'vocal_tail' ? vocalBuf : sweepBuf;
    src.loop = true;
    src.connect(inputGain);
    src.start();
    srcRef.current = src;
    if (!isPlaying) {
      setIsPlaying(true);
      notifyPlayingChange(true);
    }
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
        backgroundColor: '#150f24',
        borderRadius: '12px',
        border: '2px solid #581c87',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700, letterSpacing: '1.4px' }}>
            SONY PCM-1610 / PHILIPS RED BOOK CD STANDARD (1982)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#faf5ff', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.12rem' }}>
            PCM BIT-DEPTH QUANTIZER, TPDF DITHER &amp; NYQUIST LAB
          </h3>
        </div>

        <button
          onClick={() => (isPlaying ? stopAudio() : startAudio(stimulus))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#a855f7',
            color: '#fff',
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
          <span>{isPlaying ? 'STOP PCM CONVERTER' : 'RUN LIVE ADC/DAC'}</span>
        </button>
      </div>

      {/* Staircase Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={620}
        height={145}
        style={{
          width: '100%',
          height: '145px',
          borderRadius: '8px',
          border: '1px solid #6b21a8',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Bit Depth & Sample Rate Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ backgroundColor: '#0c0814', padding: '12px', borderRadius: '8px', border: '1px solid #4c1d95' }}>
          <div style={{ fontSize: '0.72rem', color: '#d8b4fe', fontWeight: 700, marginBottom: '8px' }}>
            WORD LENGTH (BIT DEPTH): {bitDepth}-BIT ({sqnrDb} dB)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
            {[16, 12, 8, 5, 3].map((b) => (
              <button
                key={b}
                onClick={() => setBitDepth(b)}
                style={{
                  padding: '7px 4px',
                  borderRadius: '5px',
                  border: bitDepth === b ? '1px solid #c084fc' : '1px solid #3b0764',
                  backgroundColor: bitDepth === b ? 'rgba(168,85,247,0.28)' : '#181028',
                  color: '#faf5ff',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                {b}-bit
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#0c0814', padding: '12px', borderRadius: '8px', border: '1px solid #4c1d95' }}>
          <div style={{ fontSize: '0.72rem', color: '#d8b4fe', fontWeight: 700, marginBottom: '8px' }}>
            SAMPLE RATE (NYQUIST = {(nyquistHz / 1000).toFixed(1)} kHz)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
            {[44100, 22050, 11025, 5512].map((sr) => (
              <button
                key={sr}
                onClick={() => setSampleRateSim(sr)}
                style={{
                  padding: '7px 4px',
                  borderRadius: '5px',
                  border: sampleRateSim === sr ? '1px solid #38bdf8' : '1px solid #3b0764',
                  backgroundColor: sampleRateSim === sr ? 'rgba(56,189,248,0.25)' : '#181028',
                  color: '#faf5ff',
                  fontWeight: 800,
                  fontSize: '0.71rem',
                  cursor: 'pointer'
                }}
              >
                {(sr / 1000).toFixed(1)}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TPDF Dither, Anti-Aliasing Filter & Stimulus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button
          onClick={() => setTpdfDither(!tpdfDither)}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: tpdfDither ? '1px solid #22c55e' : '1px solid #4c1d95',
            backgroundColor: tpdfDither ? 'rgba(34,197,94,0.2)' : '#0c0814',
            color: tpdfDither ? '#86efac' : '#d8b4fe',
            fontWeight: 800,
            fontSize: '0.73rem',
            cursor: 'pointer'
          }}
        >
          TPDF DITHER: {tpdfDither ? 'ON (CLEAN TAIL)' : 'OFF (TRUNCATED)'}
        </button>

        <button
          onClick={() => setAntiAliasFilter(!antiAliasFilter)}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: antiAliasFilter ? '1px solid #38bdf8' : '1px solid #ef4444',
            backgroundColor: antiAliasFilter ? 'rgba(56,189,248,0.18)' : 'rgba(239,68,68,0.2)',
            color: antiAliasFilter ? '#bae6fd' : '#fca5a5',
            fontWeight: 800,
            fontSize: '0.73rem',
            cursor: 'pointer'
          }}
        >
          NYQUIST LPF: {antiAliasFilter ? 'ON (PROTECTED)' : 'OFF (ALIASING!)'}
        </button>

        <select
          value={stimulus}
          onChange={(e) => {
            const v = e.target.value;
            setStimulus(v);
            if (isPlaying) startAudio(v);
          }}
          style={{
            backgroundColor: '#0c0814',
            color: '#faf5ff',
            border: '1px solid #6b21a8',
            borderRadius: '6px',
            padding: '0 8px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
        >
          <option value="vocal_tail">Quiet Vocal Decay (Test Dither)</option>
          <option value="high_sweep">0.4–9kHz Sine Sweep (Test Aliasing)</option>
        </select>
      </div>
    </div>
  );
}
