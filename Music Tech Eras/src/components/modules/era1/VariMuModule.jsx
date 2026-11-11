import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Power } from 'lucide-react';
import {
  ensureAudioWorklets,
  isWorkletReady,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { StemGenerator } from '../../../audio/StemGenerator1950s';
import VUMeter from '../../common/VUMeter';
import RotaryKnob from '../../common/RotaryKnob';

const TC_LABELS = {
  1: 'Pos 1: 0.2ms / 0.3s (Fast Vocal Peak)',
  2: 'Pos 2: 0.2ms / 0.8s (Abbey Road Vocal/Bass)',
  3: 'Pos 3: 0.4ms / 2.0s (Smooth Bus Leveling)',
  4: 'Pos 4: 0.8ms / 5.0s (Orchestral Sustain)',
  5: 'Pos 5: Dual-RC Program Dependent (2s–10s)',
  6: 'Pos 6: Dual-RC Heavy Crest Memory (0.3s–25s)'
};

export default function VariMuModule() {
  const [inputGainDb, setInputGainDb] = useState(6);
  const [threshold, setThreshold] = useState(6.0);
  const [timeConstant, setTimeConstant] = useState(2);
  const [dcBias, setDcBias] = useState(0.45);
  const [outputGainDb, setOutputGainDb] = useState(4);
  const [bypass, setBypass] = useState(false);
  const [stemIdx, setStemIdx] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [telemetry, setTelemetry] = useState({ grDb: 0, peakIn: 0, peakOut: 0 });

  const engineRef = useRef(null);
  const srcRef = useRef(null);
  const curveCanvasRef = useRef(null);

  const setupAudio = async () => {
    const ctx = await ensureAudioWorklets();
    if (engineRef.current) return { ctx, ...engineRef.current };

    const stemGen = new StemGenerator(ctx);
    const input = ctx.createGain();
    let compNode = null;

    if (isWorkletReady('vari-mu-processor')) {
      compNode = new AudioWorkletNode(ctx, 'vari-mu-processor');
      compNode.port.onmessage = (e) => {
        if (e.data) setTelemetry(e.data);
      };
    } else {
      compNode = ctx.createDynamicsCompressor();
      compNode.knee.value = 24;
      compNode.ratio.value = 6;
    }

    input.connect(compNode);
    compNode.connect(ctx.destination);

    engineRef.current = { stemGen, input, compNode };
    return { ctx, ...engineRef.current };
  };

  useEffect(() => {
    if (!engineRef.current) return;
    const { compNode } = engineRef.current;
    const ctx = compNode.context;
    const now = ctx.currentTime;

    if (compNode.parameters) {
      compNode.parameters.get('inputGainDb')?.setTargetAtTime(inputGainDb, now, 0.02);
      compNode.parameters.get('threshold')?.setTargetAtTime(threshold, now, 0.02);
      compNode.parameters.get('timeConstant')?.setValueAtTime(timeConstant, now);
      compNode.parameters.get('dcBias')?.setTargetAtTime(dcBias, now, 0.02);
      compNode.parameters.get('outputGainDb')?.setTargetAtTime(outputGainDb, now, 0.02);
      compNode.parameters.get('bypass')?.setValueAtTime(bypass ? 1 : 0, now);
    }
  }, [inputGainDb, threshold, timeConstant, dcBias, outputGainDb, bypass]);

  // Soft-knee remote-cutoff 6386 tube transfer curve visualizer
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0c0b09';
    ctx.fillRect(0, 0, w, h);

    // 1:1 linear unity diagonal
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    const threshDb = -4 - (threshold / 10) * 28; // -4 dB to -32 dB
    const kneeSharpness = 0.35 + dcBias * 0.55;

    const mapDbToPt = (inDb) => {
      let outDb = inDb;
      if (!bypass && inDb > threshDb - 8) {
        const over = Math.max(0, inDb - (threshDb - 8));
        // Progressive variable-mu ratio from 2:1 into 20:1 limiting
        const gr = (over * over * kneeSharpness) / (14 + over * 0.85);
        outDb = inDb - gr;
      }
      const x = ((inDb + 48) / 48) * w;
      const y = h - ((outDb + 48) / 48) * h;
      return { x, y, outDb };
    };

    ctx.strokeStyle = bypass ? '#71717a' : '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let db = -48; db <= 0; db += 1) {
      const pt = mapDbToPt(db);
      db === -48 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // Live operating ball
    if (isPlaying && telemetry.peakIn > 0.001) {
      const inDb = Math.max(-46, Math.min(0, 20 * Math.log10(telemetry.peakIn)));
      const pt = mapDbToPt(inDb);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const effRatio = bypass ? '1.0 : 1' : `${(1 + telemetry.grDb * 0.85).toFixed(1)} : 1`;
    ctx.fillStyle = '#f3e5ab';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`INSTANTANEOUS MU RATIO: ${effRatio}`, 10, 18);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px monospace';
    ctx.fillText(TC_LABELS[timeConstant], 10, h - 10);
  }, [threshold, dcBias, bypass, telemetry, isPlaying, timeConstant]);

  const stopAudio = () => {
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
      srcRef.current = null;
    }
    setTelemetry({ grDb: 0, peakIn: 0, peakOut: 0 });
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const startStem = async (idx = stemIdx) => {
    const { ctx, stemGen, input } = await setupAudio();
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
    const unsub = registerStopCallback(() => stopAudio());
    return () => {
      unsub();
      stopAudio();
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#171513',
        borderRadius: '12px',
        border: '3px solid #3f3830',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      {/* Fairchild 660 Black Anodized Faceplate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#d4af37', fontWeight: 700, letterSpacing: '1.5px' }}>
            FAIRCHILD RECORDING EQUIPMENT CORP • LONG ISLAND CITY, N.Y.
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f8fafc', fontFamily: '"Courier Prime", monospace', fontSize: '1.2rem' }}>
            FAIRCHILD MODEL 660 VARI-MU LIMITING AMPLIFIER
          </h3>
        </div>

        <button
          onClick={() => setBypass(!bypass)}
          style={{
            backgroundColor: bypass ? '#27272a' : '#d4af37',
            color: bypass ? '#a1a1aa' : '#09090b',
            border: '1px solid #52525b',
            borderRadius: '6px',
            padding: '7px 14px',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Power size={14} />
          <span>{bypass ? 'BYPASSED' : 'LIMITING ACTIVE'}</span>
        </button>
      </div>

      {/* Dual Weston Ballistic Meters + Soft-Knee Transfer Curve */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr',
          gap: '14px',
          alignItems: 'center',
          marginBottom: '18px'
        }}
      >
        <VUMeter mode="gr" label="6386 GAIN RED." value={bypass ? 0 : telemetry.grDb} width={175} height={106} />
        <VUMeter mode="vu" label="OUTPUT LEVEL" value={telemetry.peakOut * 0.55} peak={telemetry.peakOut} width={175} height={106} />
        <canvas
          ref={curveCanvasRef}
          width={260}
          height={106}
          style={{
            width: '100%',
            height: '106px',
            borderRadius: '8px',
            border: '2px solid #2b2620',
            display: 'block'
          }}
        />
      </div>

      {/* Transport & Stem Choice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px', marginBottom: '18px' }}>
        <button
          onClick={() => (isPlaying ? stopAudio() : startStem(stemIdx))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#d4af37',
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
          <span>{isPlaying ? 'STOP SIGNAL' : 'DRIVE 6386 TUBE STAGE'}</span>
        </button>

        <select
          value={stemIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setStemIdx(idx);
            if (isPlaying) startStem(idx);
          }}
          style={{
            backgroundColor: '#09090b',
            color: '#f4f4f5',
            border: '1px solid #3f3830',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          <option value={3}>Dynamic Crooner Lead Vocal</option>
          <option value={2}>Calfskin Drum Room Mic</option>
          <option value={0}>Slap Upright Double Bass</option>
          <option value={1}>Archtop Jazz/Rockabilly Guitar</option>
        </select>
      </div>

      {/* Bakelite Rotary Knobs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          backgroundColor: '#0e0d0b',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #2b2620'
        }}
      >
        <RotaryKnob label="Input Gain" value={inputGainDb} min={-12} max={18} step={0.5} defaultValue={6} unit="dB" accent="#d4af37" onChange={setInputGainDb} />
        <RotaryKnob label="AC Thresh" value={threshold} min={0} max={10} step={0.2} defaultValue={6} accent="#ef4444" onChange={setThreshold} />
        <RotaryKnob label="Time Const" value={timeConstant} steps={[1, 2, 3, 4, 5, 6]} defaultValue={2} accent="#38bdf8" onChange={setTimeConstant} />
        <RotaryKnob label="DC Thresh" value={dcBias} min={0} max={1} step={0.05} defaultValue={0.45} accent="#a855f7" onChange={setDcBias} formatValue={(v) => (v < 0.35 ? 'Soft Knee' : v > 0.7 ? 'Hard Limit' : 'Balanced')} />
        <RotaryKnob label="Makeup Out" value={outputGainDb} min={-12} max={18} step={0.5} defaultValue={4} unit="dB" accent="#22c55e" onChange={setOutputGainDb} />
      </div>
    </div>
  );
}
