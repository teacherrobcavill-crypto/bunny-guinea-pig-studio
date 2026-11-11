import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { ProceduralStemGenerator } from '../../../audio/Procedural80sStems';

const DOLBY_MODES = [
  { id: 'bypass', label: 'NR Bypass (Raw Tape Oxide Hiss)', color: '#ef4444' },
  { id: 'compand', label: 'Dolby A Encode + Decode (–10dB NR)', color: '#22c55e' },
  { id: 'air_trick', label: 'Encode-Only "Dolby A Vocal Air Trick"', color: '#38bdf8' },
  { id: 'cal_tone', label: '850 Hz FM Calibration Warble Tone', color: '#f59e0b' }
];

export default function DolbyModule() {
  const [nrMode, setNrMode] = useState('compand');
  const [tapeHissDb, setTapeHissDb] = useState(-40);
  const [calErrorDb, setCalErrorDb] = useState(0); // -8 to +8 dB mistracking
  const [stemChoice, setStemChoice] = useState('vocal');
  const [isPlaying, setIsPlaying] = useState(false);

  const engineRef = useRef(null);
  const activeSrcRef = useRef(null);
  const warbleOscRef = useRef(null);
  const canvasRef = useRef(null);

  const ensureAudio = () => {
    const ctx = getSharedAudioContext();
    if (engineRef.current) return { ctx, ...engineRef.current };

    const vocalBuf = ProceduralStemGenerator.createVocalPadStem(ctx);
    const calBuf = ProceduralStemGenerator.createCalibrationStem(ctx);

    // Continuous Tape Oxide Hiss Buffer
    const hissLen = ctx.sampleRate * 3;
    const hissBuf = ctx.createBuffer(2, hissLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = hissBuf.getChannelData(ch);
      for (let i = 0; i < hissLen; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.5;
      }
    }

    const inputGain = ctx.createGain();

    // Encoder Cat. 22 High-Frequency Low-Level Boosters (Band 3 >3kHz & Band 4 >9kHz)
    const encBand3 = ctx.createBiquadFilter();
    encBand3.type = 'highshelf';
    encBand3.frequency.value = 3000;

    const encBand4 = ctx.createBiquadFilter();
    encBand4.type = 'highshelf';
    encBand4.frequency.value = 9000;

    const tapeFluxGain = ctx.createGain();
    const hissGain = ctx.createGain();
    const tapeNodeSum = ctx.createGain();

    // Complementary Decoder Cutters
    const decBand3 = ctx.createBiquadFilter();
    decBand3.type = 'highshelf';
    decBand3.frequency.value = 3000;

    const decBand4 = ctx.createBiquadFilter();
    decBand4.type = 'highshelf';
    decBand4.frequency.value = 9000;

    const masterOut = ctx.createGain();
    masterOut.gain.value = 0.85;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;

    inputGain.connect(encBand3);
    encBand3.connect(encBand4);
    encBand4.connect(tapeFluxGain);
    tapeFluxGain.connect(tapeNodeSum);
    hissGain.connect(tapeNodeSum);

    tapeNodeSum.connect(decBand3);
    decBand3.connect(decBand4);
    decBand4.connect(masterOut);
    masterOut.connect(analyser);
    analyser.connect(ctx.destination);

    engineRef.current = {
      vocalBuf,
      calBuf,
      hissBuf,
      inputGain,
      encBand3,
      encBand4,
      tapeFluxGain,
      hissGain,
      decBand3,
      decBand4,
      masterOut,
      analyser
    };
    return { ctx, ...engineRef.current };
  };

  useEffect(() => {
    if (!engineRef.current) return;
    const { encBand3, encBand4, tapeFluxGain, hissGain, decBand3, decBand4 } = engineRef.current;
    const now = encBand3.context.currentTime;

    const hissLinear = nrMode === 'cal_tone' ? 0 : Math.pow(10, tapeHissDb / 20);
    hissGain.gain.setTargetAtTime(hissLinear, now, 0.02);
    tapeFluxGain.gain.setTargetAtTime(Math.pow(10, calErrorDb / 20), now, 0.02);

    if (nrMode === 'bypass') {
      encBand3.gain.setTargetAtTime(0, now, 0.03);
      encBand4.gain.setTargetAtTime(0, now, 0.03);
      decBand3.gain.setTargetAtTime(0, now, 0.03);
      decBand4.gain.setTargetAtTime(0, now, 0.03);
    } else if (nrMode === 'compand') {
      // Encode +10dB HF, Decode -10dB HF (+ calibration mistracking offset!)
      encBand3.gain.setTargetAtTime(7.5, now, 0.03);
      encBand4.gain.setTargetAtTime(5.5, now, 0.03);
      decBand3.gain.setTargetAtTime(-7.5 + calErrorDb * 0.75, now, 0.03);
      decBand4.gain.setTargetAtTime(-5.5 + calErrorDb * 0.65, now, 0.03);
    } else if (nrMode === 'air_trick') {
      // Famous 1970s/80s Vocal Exciter Trick: Encode ON, Decoder BYPASSED!
      encBand3.gain.setTargetAtTime(8.0, now, 0.03);
      encBand4.gain.setTargetAtTime(6.5, now, 0.03);
      decBand3.gain.setTargetAtTime(0, now, 0.03);
      decBand4.gain.setTargetAtTime(0, now, 0.03);
    }
  }, [nrMode, tapeHissDb, calErrorDb]);

  // 4-Band Cat. 22 Bilinear Action Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fft = new Uint8Array(256);
    let raf = null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#070c14';
      ctx.fillRect(0, 0, w, h);

      const bands = [
        { name: 'BAND 1 (80Hz LP)', color: '#f59e0b', boost: nrMode === 'bypass' ? 0 : 6 },
        { name: 'BAND 2 (80Hz–3kHz)', color: '#22c55e', boost: nrMode === 'bypass' ? 0 : 8 },
        { name: 'BAND 3 (3kHz HIGH)', color: '#38bdf8', boost: nrMode === 'bypass' ? 0 : 10 },
        { name: 'BAND 4 (9kHz AIR)', color: '#a855f7', boost: nrMode === 'bypass' ? 0 : 12 }
      ];

      if (engineRef.current?.analyser && isPlaying) {
        engineRef.current.analyser.getByteFrequencyData(fft);
      }

      bands.forEach((b, idx) => {
        const bx = 20 + idx * 92;
        const bw = 76;
        ctx.fillStyle = '#111827';
        ctx.fillRect(bx, 22, bw, h - 42);
        ctx.strokeStyle = b.color;
        ctx.strokeRect(bx, 22, bw, h - 42);

        const dyn = isPlaying ? (fft[4 + idx * 18] || 40) / 255 : 0.35;
        const barH = nrMode === 'bypass' ? 6 : Math.min(h - 54, b.boost * 6.5 * (1.15 - dyn * 0.5));
        ctx.fillStyle = b.color;
        ctx.fillRect(bx + 10, h - 26 - barH, bw - 20, barH);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(b.name, bx + 2, 15);
      });

      // Right Side: Bilinear Transfer Curve
      const cx = 400;
      const cw = w - cx - 16;
      ctx.fillStyle = '#0d1522';
      ctx.fillRect(cx, 22, cw, h - 42);
      ctx.strokeStyle = '#1e3a5f';
      ctx.strokeRect(cx, 22, cw, h - 42);

      // Encode Curve (Green above diagonal) & Decode Curve (Cyan below diagonal)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, h - 20);
      ctx.lineTo(cx + cw, 22);
      ctx.stroke();

      if (nrMode !== 'bypass') {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, h - 38);
        ctx.quadraticCurveTo(cx + cw * 0.45, 42, cx + cw, 22);
        ctx.stroke();

        if (nrMode === 'compand') {
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(cx, h - 14);
          ctx.quadraticCurveTo(cx + cw * 0.55, h - 26, cx + cw, 22);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 9.5px monospace';
      ctx.fillText('CAT. 22 BILINEAR LAW', cx + 8, 15);
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [nrMode, isPlaying]);

  const stopPlayback = () => {
    if (activeSrcRef.current) {
      try {
        activeSrcRef.current.stop();
        activeSrcRef.current.disconnect();
      } catch (_) {}
      activeSrcRef.current = null;
    }
    if (warbleOscRef.current) {
      try {
        warbleOscRef.current.osc.stop();
        warbleOscRef.current.lfo.stop();
      } catch (_) {}
      warbleOscRef.current = null;
    }
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const startPlayback = (targetMode = nrMode, targetStem = stemChoice) => {
    const { ctx, vocalBuf, calBuf, hissBuf, inputGain, hissGain, masterOut } = ensureAudio();
    stopPlayback();

    if (targetMode === 'cal_tone') {
      // Authentic 850 Hz Dolby Tone with periodic FM warble identification
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoDepth = ctx.createGain();
      const toneGain = ctx.createGain();
      osc.frequency.value = 850;
      lfo.type = 'square';
      lfo.frequency.value = 1.3;
      lfoDepth.gain.value = 45;
      toneGain.gain.value = 0.22;

      lfo.connect(lfoDepth);
      lfoDepth.connect(osc.frequency);
      osc.connect(toneGain);
      toneGain.connect(masterOut);
      osc.start();
      lfo.start();
      warbleOscRef.current = { osc, lfo };
    } else {
      const progSrc = ctx.createBufferSource();
      progSrc.buffer = targetStem === 'vocal' ? vocalBuf : calBuf;
      progSrc.loop = true;
      progSrc.connect(inputGain);

      const hissSrc = ctx.createBufferSource();
      hissSrc.buffer = hissBuf;
      hissSrc.loop = true;
      hissSrc.connect(hissGain);

      progSrc.start();
      hissSrc.start();
      activeSrcRef.current = {
        stop: () => {
          progSrc.stop();
          hissSrc.stop();
        },
        disconnect: () => {
          progSrc.disconnect();
          hissSrc.disconnect();
        }
      };
    }

    setIsPlaying(true);
    notifyPlayingChange(true);
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
        backgroundColor: '#0e1520',
        borderRadius: '12px',
        border: '2px solid #1e3a5f',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.7)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1.4px' }}>
            DOLBY LABORATORIES LONDON • MODEL 361 / CAT. 22 CARD
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f0f9ff', fontSize: '1.18rem', fontWeight: 800 }}>
            DOLBY A-TYPE 4-BAND COMPANDING NOISE REDUCTION
          </h3>
        </div>

        <button
          onClick={() => (isPlaying ? stopPlayback() : startPlayback(nrMode, stemChoice))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#38bdf8',
            color: isPlaying ? '#fff' : '#09090b',
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
          <span>{isPlaying ? 'STOP DOLBY RACK' : 'AUDITION COMPANDER'}</span>
        </button>
      </div>

      {/* Mode Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {DOLBY_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setNrMode(m.id);
              if (isPlaying) startPlayback(m.id, stemChoice);
            }}
            style={{
              padding: '9px 10px',
              borderRadius: '7px',
              border: nrMode === m.id ? `2px solid ${m.color}` : '1px solid #334155',
              backgroundColor: nrMode === m.id ? `${m.color}20` : '#090e16',
              color: nrMode === m.id ? '#f8fafc' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 4-Band Meters + Bilinear Curve */}
      <canvas
        ref={canvasRef}
        width={620}
        height={145}
        style={{
          width: '100%',
          height: '145px',
          borderRadius: '8px',
          border: '1px solid #1e3a5f',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Sliders: Hiss Floor, Flux Mistracking & Program */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div style={{ backgroundColor: '#090e16', padding: '11px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>TAPE OXIDE HISS</span>
            <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{tapeHissDb} dBFS</span>
          </div>
          <input
            type="range"
            min="-60"
            max="-26"
            step="1"
            value={tapeHissDb}
            onChange={(e) => setTapeHissDb(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
        </div>

        <div style={{ backgroundColor: '#090e16', padding: '11px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>CAL MISTRACKING</span>
            <span style={{ color: calErrorDb === 0 ? '#4ade80' : '#f59e0b', fontFamily: 'monospace' }}>
              {calErrorDb > 0 ? `+${calErrorDb}` : calErrorDb} dB
            </span>
          </div>
          <input
            type="range"
            min="-8"
            max="8"
            step="1"
            value={calErrorDb}
            onChange={(e) => setCalErrorDb(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
        </div>

        <div style={{ backgroundColor: '#090e16', padding: '11px', borderRadius: '8px', border: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>TEST STIMULUS</div>
          <select
            value={stemChoice}
            onChange={(e) => {
              const v = e.target.value;
              setStemChoice(v);
              if (isPlaying) startPlayback(nrMode, v);
            }}
            style={{ backgroundColor: '#111827', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '6px', fontSize: '0.76rem' }}
          >
            <option value="vocal">Breathy Vocal + Whisper Passage</option>
            <option value="cal">Dynamic Staircase Probe</option>
          </select>
        </div>
      </div>
    </div>
  );
}
