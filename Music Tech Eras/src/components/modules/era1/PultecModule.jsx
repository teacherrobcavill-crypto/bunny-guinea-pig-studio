import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Power } from 'lucide-react';
import {
  ensureAudioWorklets,
  isWorkletReady,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { StemGenerator } from '../../../audio/StemGenerator1950s';
import RotaryKnob from '../../common/RotaryKnob';

const PULTEC_PRESETS = [
  {
    name: 'Classic 60Hz Kick/Bass Trick',
    lowFreq: 60,
    lowBoost: 6.8,
    lowAtten: 5.5,
    highFreq: 8000,
    highBoost: 3.2,
    bandwidth: 5.0,
    attenFreq: 10000,
    highAtten: 1.0,
    stem: 0
  },
  {
    name: '12kHz Vocal Tube Silk Air',
    lowFreq: 100,
    lowBoost: 2.0,
    lowAtten: 2.8,
    highFreq: 12000,
    highBoost: 7.2,
    bandwidth: 6.5,
    attenFreq: 20000,
    highAtten: 1.5,
    stem: 3
  },
  {
    name: 'Calfskin Drum Punch (30Hz + 5kHz)',
    lowFreq: 30,
    lowBoost: 7.5,
    lowAtten: 6.0,
    highFreq: 5000,
    highBoost: 5.4,
    bandwidth: 4.0,
    attenFreq: 10000,
    highAtten: 2.2,
    stem: 2
  },
  {
    name: 'Flat Zero Calibration',
    lowFreq: 60,
    lowBoost: 0,
    lowAtten: 0,
    highFreq: 8000,
    highBoost: 0,
    bandwidth: 5,
    attenFreq: 10000,
    highAtten: 0,
    stem: 0
  }
];

export default function PultecModule() {
  const [lowFreq, setLowFreq] = useState(60);
  const [lowBoost, setLowBoost] = useState(6.8);
  const [lowAtten, setLowAtten] = useState(5.5);
  const [highFreq, setHighFreq] = useState(10000);
  const [highBoost, setHighBoost] = useState(4.2);
  const [bandwidth, setBandwidth] = useState(5.0);
  const [attenFreq, setAttenFreq] = useState(10000);
  const [highAtten, setHighAtten] = useState(1.2);
  const [bypass, setBypass] = useState(false);
  const [stemIdx, setStemIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const srcRef = useRef(null);

  const setupEngine = async () => {
    const ctx = await ensureAudioWorklets();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const stemGen = new StemGenerator(ctx);
    const input = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    let eqNode = null;
    if (isWorkletReady('pultec-eq-processor')) {
      eqNode = new AudioWorkletNode(ctx, 'pultec-eq-processor');
      input.connect(eqNode);
      eqNode.connect(analyser);
    } else {
      // Fallback Biquad Pultec network if Worklet unavailable
      const lfBoostNode = ctx.createBiquadFilter();
      lfBoostNode.type = 'lowshelf';
      const lfCutNode = ctx.createBiquadFilter();
      lfCutNode.type = 'peaking';
      const hfBoostNode = ctx.createBiquadFilter();
      hfBoostNode.type = 'peaking';
      input.connect(lfBoostNode);
      lfBoostNode.connect(lfCutNode);
      lfCutNode.connect(hfBoostNode);
      hfBoostNode.connect(analyser);
      eqNode = { fallback: { lfBoostNode, lfCutNode, hfBoostNode } };
    }

    analyser.connect(ctx.destination);
    audioRef.current = { stemGen, input, eqNode, analyser };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { eqNode, analyser } = audioRef.current;
    const ctx = analyser.context;
    const now = ctx.currentTime;

    if (eqNode.parameters) {
      eqNode.parameters.get('lowFreq')?.setValueAtTime(lowFreq, now);
      eqNode.parameters.get('lowBoost')?.setTargetAtTime(lowBoost, now, 0.02);
      eqNode.parameters.get('lowAtten')?.setTargetAtTime(lowAtten, now, 0.02);
      eqNode.parameters.get('highFreq')?.setValueAtTime(highFreq, now);
      eqNode.parameters.get('highBoost')?.setTargetAtTime(highBoost, now, 0.02);
      eqNode.parameters.get('bandwidth')?.setTargetAtTime(bandwidth, now, 0.02);
      eqNode.parameters.get('attenFreq')?.setValueAtTime(attenFreq, now);
      eqNode.parameters.get('highAtten')?.setTargetAtTime(highAtten, now, 0.02);
      eqNode.parameters.get('bypass')?.setValueAtTime(bypass ? 1 : 0, now);
    }
  }, [lowFreq, lowBoost, lowAtten, highFreq, highBoost, bandwidth, attenFreq, highAtten, bypass]);

  // 60fps Bode Plot + Live Spectrum Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;
    const fftData = new Uint8Array(512);

    const freqToX = (f, w) => {
      const minLog = Math.log10(20);
      const maxLog = Math.log10(20000);
      return ((Math.log10(f) - minLog) / (maxLog - minLog)) * w;
    };

    const dbToY = (db, h) => h * 0.5 - (db / 18) * (h * 0.44);

    const evalCurves = (f) => {
      // LF Boost shelf around lowFreq
      const boostDb = (lowBoost / 10) * 13.5;
      const lfB = boostDb / (1 + Math.pow(f / (lowFreq * 1.25), 2.1));

      // LF Atten higher-corner shelf (shifted ~2.2x higher -> creates Pultec mid-bass dip!)
      const attenDb = -(lowAtten / 10) * 17.5;
      const lfA = attenDb / (1 + Math.pow(f / (lowFreq * 2.45), 1.75)) * (f > lowFreq * 0.65 ? 1 : 0.55);

      // HF LC resonant bell
      const q = 3.6 - (bandwidth / 10) * 3.0;
      const logDist = Math.log2(f / highFreq);
      const hfB = ((highBoost / 10) * 18.0) * Math.exp(-Math.pow(logDist * q * 1.4, 2));

      // HF Atten shelf
      const hfA = -((highAtten / 10) * 16.0) / (1 + Math.pow(attenFreq / f, 1.8));

      return {
        lfB,
        lfA,
        total: bypass ? 0 : lfB + lfA + hfB + hfA
      };
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#090d14';
      ctx.fillRect(0, 0, w, h);

      // Live FFT background bars if playing
      if (audioRef.current?.analyser && isPlaying) {
        audioRef.current.analyser.getByteFrequencyData(fftData);
        const sr = audioRef.current.analyser.context.sampleRate;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        for (let i = 1; i < fftData.length; i++) {
          const binFreq = (i * sr) / 1024;
          if (binFreq < 20 || binFreq > 20000) continue;
          const x = freqToX(binFreq, w);
          const barH = (fftData[i] / 255) * (h * 0.85);
          ctx.fillRect(x, h - barH, 3, barH);
        }
      }

      // Grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      [30, 60, 100, 250, 500, 1000, 3000, 8000, 16000].forEach((gf) => {
        const x = freqToX(gf, w);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(gf >= 1000 ? `${gf / 1000}k` : `${gf}`, x + 3, h - 6);
      });

      [-12, -6, 0, 6, 12].forEach((gdb) => {
        const y = dbToY(gdb, h);
        ctx.strokeStyle = gdb === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(148,163,184,0.12)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${gdb > 0 ? '+' : ''}${gdb}dB`, 6, y - 3);
      });

      if (!bypass && (lowBoost > 0.2 || lowAtten > 0.2)) {
        // Draw separate LF Boost (green dashed) & LF Atten (red dashed) to visualize offset corners
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
        ctx.beginPath();
        for (let px = 0; px <= w; px += 4) {
          const f = 20 * Math.pow(1000, px / w);
          const y = dbToY(evalCurves(f).lfB, h);
          px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
        ctx.beginPath();
        for (let px = 0; px <= w; px += 4) {
          const f = 20 * Math.pow(1000, px / w);
          const y = dbToY(evalCurves(f).lfA, h);
          px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Combined Pultec EQP-1A curve
      ctx.strokeStyle = bypass ? '#64748b' : '#d4af37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        const f = 20 * Math.pow(1000, px / w);
        const y = dbToY(evalCurves(f).total, h);
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [lowFreq, lowBoost, lowAtten, highFreq, highBoost, bandwidth, attenFreq, highAtten, bypass, isPlaying]);

  const stopPlayback = () => {
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

  const startStem = async (idx = stemIdx) => {
    const { ctx, stemGen, input } = await setupEngine();
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
    }
    const src = ctx.createBufferSource();
    src.buffer = stemGen.syntheticBuffers[idx];
    src.loop = true;
    src.connect(input);
    src.start();
    srcRef.current = src;
    if (!isPlaying) {
      setIsPlaying(true);
      notifyPlayingChange(true);
    }
  };

  useEffect(() => {
    const unsub = registerStopCallback(() => stopPlayback());
    return () => {
      unsub();
      stopPlayback();
    };
  }, []);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #273545 0%, #19232e 100%)',
        borderRadius: '12px',
        border: '3px solid #475569',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.7)'
      }}
    >
      {/* Classic Pultec Slate-Blue Faceplate Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 700, letterSpacing: '1.5px' }}>
            PULSE TECHNIQUES INC. • TEANECK, N.J.
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f8fafc', fontFamily: '"Courier Prime", monospace', fontSize: '1.2rem' }}>
            PROGRAM EQUALIZER MODEL EQP-1A
          </h3>
        </div>

        <button
          onClick={() => setBypass(!bypass)}
          style={{
            backgroundColor: bypass ? '#334155' : '#dc2626',
            color: '#fff',
            border: '2px solid #94a3b8',
            borderRadius: '6px',
            padding: '7px 14px',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: bypass ? 'none' : '0 0 12px rgba(220,38,38,0.6)'
          }}
        >
          <Power size={14} />
          <span>{bypass ? 'BYPASSED (OUT)' : 'EQ IN CIRCUIT'}</span>
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {PULTEC_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setLowFreq(p.lowFreq);
              setLowBoost(p.lowBoost);
              setLowAtten(p.lowAtten);
              setHighFreq(p.highFreq);
              setHighBoost(p.highBoost);
              setBandwidth(p.bandwidth);
              setAttenFreq(p.attenFreq);
              setHighAtten(p.highAtten);
              setStemIdx(p.stem);
              setBypass(false);
              if (isPlaying) startStem(p.stem);
            }}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid #64748b',
              color: '#e2e8f0',
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

      {/* Bode Frequency Response Curve + Live Spectrum */}
      <div style={{ marginBottom: '18px' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={190}
          style={{
            width: '100%',
            height: '190px',
            borderRadius: '8px',
            border: '2px solid #0f172a',
            display: 'block'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginTop: '5px' }}>
          <span>Green Dashed: LF Boost Shelf • Red Dashed: Offset LF Atten Shelf</span>
          <span style={{ color: '#d4af37', fontWeight: 700 }}>Gold Solid: Net Pultec Resonant Curve</span>
        </div>
      </div>

      {/* Transport Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '18px' }}>
        <button
          onClick={() => (isPlaying ? stopPlayback() : startStem(stemIdx))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#d4af37',
            color: isPlaying ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '11px 16px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isPlaying ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          <span>{isPlaying ? 'STOP AUDIO TEST' : 'AUDITION THROUGH PULTEC WORKLET'}</span>
        </button>

        <select
          value={stemIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setStemIdx(idx);
            if (isPlaying) startStem(idx);
          }}
          style={{
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #64748b',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          <option value={0}>Stem: Slap Upright Double Bass</option>
          <option value={2}>Stem: Calfskin Kick &amp; Snare Kit</option>
          <option value={3}>Stem: 1950s Lead Vocal</option>
          <option value={1}>Stem: Hollowbody Archtop Guitar</option>
        </select>
      </div>

      {/* Rotary Hardware Dials */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #334155'
        }}
      >
        <RotaryKnob label="CPS (LF)" value={lowFreq} steps={[20, 30, 60, 100]} defaultValue={60} unit="Hz" accent="#38bdf8" onChange={setLowFreq} />
        <RotaryKnob label="LF Boost" value={lowBoost} min={0} max={10} step={0.2} defaultValue={0} accent="#22c55e" onChange={setLowBoost} />
        <RotaryKnob label="LF Atten" value={lowAtten} min={0} max={10} step={0.2} defaultValue={0} accent="#f43f5e" onChange={setLowAtten} />
        <RotaryKnob label="Bandwidth" value={bandwidth} min={0} max={10} step={0.2} defaultValue={5} accent="#e2e8f0" onChange={setBandwidth} />

        <RotaryKnob
          label="KCS (HF)"
          value={highFreq}
          steps={[3000, 4000, 5000, 8000, 10000, 12000, 16000]}
          defaultValue={10000}
          unit="Hz"
          accent="#d4af37"
          onChange={setHighFreq}
        />
        <RotaryKnob label="HF Boost" value={highBoost} min={0} max={10} step={0.2} defaultValue={0} accent="#d4af37" onChange={setHighBoost} />
        <RotaryKnob label="Atten Sel" value={attenFreq} steps={[5000, 10000, 20000]} defaultValue={10000} unit="Hz" accent="#f97316" onChange={setAttenFreq} />
        <RotaryKnob label="HF Atten" value={highAtten} min={0} max={10} step={0.2} defaultValue={0} accent="#f97316" onChange={setHighAtten} />
      </div>
    </div>
  );
}
