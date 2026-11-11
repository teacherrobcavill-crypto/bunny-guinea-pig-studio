import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Zap } from 'lucide-react';
import {
  ensureAudioWorklets,
  isWorkletReady,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';
import RotaryKnob from '../../common/RotaryKnob';

const ALLOYS = [
  { id: 0, name: '0.5mm Cold-Rolled Steel (EMT 140)', color: '#94a3b8' },
  { id: 1, name: '24k Gold Foil (Compact EMT 240)', color: '#eab308' },
  { id: 2, name: 'Anodized Aluminium Sheet', color: '#38bdf8' },
  { id: 3, name: 'Aerospace Titanium Foil', color: '#c084fc' }
];

export default function EmtPlateModule() {
  const [decay, setDecay] = useState(2.8);
  const [damping, setDamping] = useState(0.35);
  const [plateSize, setPlateSize] = useState(1.0);
  const [material, setMaterial] = useState(0);
  const [lowCut80Hz, setLowCut80Hz] = useState(true);
  const [wetMix, setWetMix] = useState(0.48);
  const [stemType, setStemType] = useState('vocals');
  const [isPlaying, setIsPlaying] = useState(false);

  const engineRef = useRef(null);
  const srcRef = useRef(null);
  const canvasRef = useRef(null);
  const rippleRef = useRef(0);

  const setupPlate = async () => {
    const ctx = await ensureAudioWorklets();
    if (engineRef.current) return { ctx, ...engineRef.current };

    const stems = {
      vocals: FlangeStemGenerator.createVocalStem(ctx),
      drums: FlangeStemGenerator.createDrumStem(ctx),
      guitar: FlangeStemGenerator.createGuitarStem(ctx)
    };

    const input = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const master = ctx.createGain();
    master.gain.value = 0.85;

    let plateNode = null;
    if (isWorkletReady('plate-reverb-processor')) {
      plateNode = new AudioWorkletNode(ctx, 'plate-reverb-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });
    } else {
      plateNode = ctx.createDelay(0.08);
      plateNode.delayTime.value = 0.045;
    }

    input.connect(dryGain);
    dryGain.connect(master);

    input.connect(plateNode);
    plateNode.connect(wetGain);
    wetGain.connect(master);
    master.connect(ctx.destination);

    engineRef.current = { stems, input, dryGain, wetGain, plateNode };
    return { ctx, ...engineRef.current };
  };

  useEffect(() => {
    if (!engineRef.current) return;
    const { dryGain, wetGain, plateNode } = engineRef.current;
    const now = dryGain.context.currentTime;

    dryGain.gain.setTargetAtTime(1 - wetMix * 0.45, now, 0.02);
    wetGain.gain.setTargetAtTime(wetMix * 1.35, now, 0.02);

    if (plateNode.parameters) {
      plateNode.parameters.get('decay')?.setTargetAtTime(decay, now, 0.03);
      plateNode.parameters.get('damping')?.setTargetAtTime(damping, now, 0.03);
      plateNode.parameters.get('plateSize')?.setTargetAtTime(plateSize, now, 0.03);
      plateNode.parameters.get('material')?.setValueAtTime(material, now);
      plateNode.parameters.get('lowCut')?.setValueAtTime(lowCut80Hz ? 80 : 20, now);
    }
  }, [decay, damping, plateSize, material, lowCut80Hz, wetMix]);

  // Cutaway Mechanical Plate + Motorized Felt Damper Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = null;

    const draw = () => {
      if (isPlaying || rippleRef.current > 0.02) {
        rippleRef.current = isPlaying ? (rippleRef.current + 0.06) % (Math.PI * 2) : rippleRef.current * 0.94;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0e0b0d';
      ctx.fillRect(0, 0, w, h);

      // Wooden Crate Frame (2m x 1m steel chassis)
      ctx.strokeStyle = '#78553a';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 18, w - 40, h - 36);

      // Tensioned Metal Sheet in center
      const alloyColor = ALLOYS[material].color;
      const sheetY = h * 0.56;
      ctx.strokeStyle = alloyColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let x = 44; x <= w - 44; x += 4) {
        const normX = (x - 44) / (w - 88);
        const amp = isPlaying ? Math.sin(normX * 18 - rippleRef.current * 3) * 4.5 : 0;
        x === 44 ? ctx.moveTo(x, sheetY + amp) : ctx.lineTo(x, sheetY + amp);
      }
      ctx.stroke();

      // Motorized Porous Felt Damper Pad (Gap proportional to Decay 0.5s - 6.0s!)
      const gapPx = 6 + ((decay - 0.5) / 5.5) * 42;
      const damperY = sheetY - gapPx - 12;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(64, damperY, w - 128, 10);
      ctx.strokeRect(64, damperY, w - 128, 10);

      // Voice-Coil Driver & Dual Piezo Pickups L/R
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.48 - 10, sheetY + 4, 20, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(w * 0.28, sheetY, 6, 0, Math.PI * 2);
      ctx.arc(w * 0.74, sheetY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`FELT DAMPER GAP: ${Math.round(gapPx * 2.2)} mm → RT60 DECAY: ${decay.toFixed(1)}s`, 34, 34);
      ctx.fillStyle = alloyColor;
      ctx.fillText(`ALLOY: ${ALLOYS[material].name} • 80Hz RUMBLE HPF: ${lowCut80Hz ? 'IN' : 'OUT'}`, 34, h - 28);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [decay, material, lowCut80Hz, isPlaying]);

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

  const startStem = async (target = stemType) => {
    const { ctx, stems, input } = await setupPlate();
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
    }
    const src = ctx.createBufferSource();
    src.buffer = stems[target];
    src.loop = true;
    src.connect(input);
    src.start();
    srcRef.current = src;
    if (!isPlaying) {
      setIsPlaying(true);
      notifyPlayingChange(true);
    }
  };

  const triggerChirpHit = async () => {
    const { ctx, input } = await setupPlate();
    rippleRef.current = 1.5;
    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      ch[i] = ((Math.random() * 2 - 1) * 0.8 + Math.sin(2 * Math.PI * 240 * t) * 0.6) * Math.exp(-t * 28);
    }
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(input);
    s.start();
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
        backgroundColor: '#191214',
        borderRadius: '12px',
        border: '2px solid #6b3036',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.7)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#ff6b6b', fontWeight: 700, letterSpacing: '1.4px' }}>
            ELEKTROMESSTECHNIK WILHELM FRANZ • LAHR, GERMANY (1957)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#fff1f2', fontFamily: '"Courier Prime", monospace', fontSize: '1.18rem' }}>
            EMT 140ST MECHANICAL DISPERSIVE PLATE REVERB
          </h3>
        </div>

        <button
          onClick={() => setLowCut80Hz(!lowCut80Hz)}
          style={{
            backgroundColor: lowCut80Hz ? '#22c55e' : '#3f3f46',
            color: lowCut80Hz ? '#09090b' : '#e4e4e7',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 800,
            fontSize: '0.76rem',
            cursor: 'pointer'
          }}
        >
          80 Hz TUBE HPF: {lowCut80Hz ? 'ENGAGED' : 'BYPASSED'}
        </button>
      </div>

      {/* Cutaway Plate Visualizer */}
      <canvas
        ref={canvasRef}
        width={620}
        height={150}
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '8px',
          border: '1px solid #4c1d24',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Transport + SnareWhip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr auto', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => (isPlaying ? stopAudio() : startStem(stemType))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#ff6b6b',
            color: isPlaying ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '11px 14px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isPlaying ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          <span>{isPlaying ? 'STOP PLATE SEND' : 'DRIVE EMT 140 TRANSDUCER'}</span>
        </button>

        <select
          value={stemType}
          onChange={(e) => {
            const val = e.target.value;
            setStemType(val);
            if (isPlaying) startStem(val);
          }}
          style={{
            backgroundColor: '#0f0b0c',
            color: '#f8fafc',
            border: '1px solid #6b3036',
            borderRadius: '8px',
            padding: '0 10px',
            fontSize: '0.83rem'
          }}
        >
          <option value="vocals">1967 Lead Vocal Phrase</option>
          <option value="drums">Snare &amp; Overhead Breakbeat</option>
          <option value="guitar">12-String Rickenbacker</option>
        </select>

        <button
          onClick={triggerChirpHit}
          style={{
            backgroundColor: '#27272a',
            color: '#fecdd3',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '0 14px',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Zap size={14} color="#ff6b6b" />
          <span>Whip Transient</span>
        </button>
      </div>

      {/* Metallurgy Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
        {ALLOYS.map((a) => (
          <button
            key={a.id}
            onClick={() => setMaterial(a.id)}
            style={{
              padding: '7px 6px',
              borderRadius: '6px',
              border: material === a.id ? `1px solid ${a.color}` : '1px solid #3f3f46',
              backgroundColor: material === a.id ? `${a.color}20` : '#110c0e',
              color: material === a.id ? a.color : '#a1a1aa',
              fontSize: '0.71rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Plate Dials */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#110c0e', padding: '14px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
        <RotaryKnob label="Damper RT60" value={decay} min={0.5} max={6.0} step={0.1} defaultValue={2.8} unit="s" accent="#ff6b6b" onChange={setDecay} />
        <RotaryKnob label="HF Damping" value={damping} min={0.05} max={0.95} step={0.05} defaultValue={0.35} accent="#f59e0b" onChange={setDamping} />
        <RotaryKnob label="Plate Tension" value={plateSize} min={0.5} max={1.5} step={0.05} defaultValue={1.0} accent="#38bdf8" onChange={setPlateSize} />
        <RotaryKnob label="Echo Return" value={wetMix} min={0} max={1} step={0.02} defaultValue={0.48} accent="#22c55e" onChange={setWetMix} formatValue={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </div>
  );
}
