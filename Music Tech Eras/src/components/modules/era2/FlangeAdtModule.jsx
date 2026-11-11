import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';
import { FlangePhysicsEngine } from '../../../audio/FlangePhysicsEngine';

export default function FlangeAdtModule() {
  const [stemType, setStemType] = useState('drums');
  const [bpoHz, setBpoHz] = useState(50.0);
  const [lfoActive, setLfoActive] = useState(true);
  const [lfoRate, setLfoRate] = useState(0.22);
  const [lfoDepth, setLfoDepth] = useState(0.55);
  const [phaseInvert, setPhaseInvert] = useState(true);
  const [stereoSplit, setStereoSplit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [telemetry, setTelemetry] = useState({ deltaT_ms: 0, deckBSpeedIps: 15.0, isBraking: false });

  const physicsRef = useRef(new FlangePhysicsEngine());
  const audioRef = useRef(null);
  const srcRef = useRef(null);
  const reelsCanvasRef = useRef(null);

  const ensureAudio = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const stems = {
      drums: FlangeStemGenerator.createDrumStem(ctx),
      vocals: FlangeStemGenerator.createVocalStem(ctx),
      guitar: FlangeStemGenerator.createGuitarStem(ctx),
      keys: FlangeStemGenerator.createKeysStem(ctx),
      noise: FlangeStemGenerator.createNoiseStem(ctx)
    };

    const input = ctx.createGain();
    const delayA = ctx.createDelay(0.1);
    delayA.delayTime.value = 0.010; // Fixed 10ms Through-Zero anchor!

    const delayB = ctx.createDelay(0.1);
    delayB.delayTime.value = 0.010;

    const gainB = ctx.createGain();
    gainB.gain.value = -1.0; // 180 deg phase invert default

    const panA = ctx.createStereoPanner();
    const panB = ctx.createStereoPanner();

    const master = ctx.createGain();
    master.gain.value = 0.72;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    input.connect(delayA);
    delayA.connect(panA);
    panA.connect(master);

    input.connect(delayB);
    delayB.connect(gainB);
    gainB.connect(panB);
    panB.connect(master);

    master.connect(analyser);
    analyser.connect(ctx.destination);

    audioRef.current = { stems, input, delayA, delayB, gainB, panA, panB, analyser };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    physicsRef.current.setBPOFrequency(bpoHz);
    physicsRef.current.setLFO(lfoActive, 'sine', lfoRate, lfoDepth);
  }, [bpoHz, lfoActive, lfoRate, lfoDepth]);

  useEffect(() => {
    if (!audioRef.current) return;
    const { gainB, panA, panB } = audioRef.current;
    const now = gainB.context.currentTime;
    gainB.gain.setTargetAtTime(phaseInvert ? -1.0 : 1.0, now, 0.015);
    panA.pan.setTargetAtTime(stereoSplit ? -0.85 : 0.0, now, 0.02);
    panB.pan.setTargetAtTime(stereoSplit ? 0.85 : 0.0, now, 0.02);
  }, [phaseInvert, stereoSplit]);

  // 60fps Physics + Dual J37 Reel & Comb Spectrum Canvas
  useEffect(() => {
    const canvas = reelsCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const fftBins = new Uint8Array(512);
    let lastT = performance.now();
    let raf = null;

    const loop = (nowMs) => {
      const dt = (nowMs - lastT) / 1000;
      lastT = nowMs;

      const phys = physicsRef.current;
      phys.update(dt);
      const st = phys.getState();
      setTelemetry({
        deltaT_ms: st.deltaT_ms,
        deckBSpeedIps: st.deckBSpeedIps,
        isBraking: st.isBraking
      });

      if (audioRef.current) {
        const aCtx = audioRef.current.delayB.context;
        audioRef.current.delayB.delayTime.setTargetAtTime(st.delayBSec, aCtx.currentTime, 0.012);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = '#0d090b';
      ctx2d.fillRect(0, 0, w, h);

      // Draw Deck A & Deck B 10.5" Aluminum NAB Reels on Left Half
      const drawReel = (cx, cy, angle, title, ips, highlight) => {
        ctx2d.save();
        ctx2d.translate(cx, cy);
        ctx2d.rotate(isPlaying ? angle : 0);

        ctx2d.beginPath();
        ctx2d.arc(0, 0, 56, 0, Math.PI * 2);
        ctx2d.fillStyle = highlight ? '#3f1d24' : '#231f20';
        ctx2d.fill();
        ctx2d.lineWidth = 3;
        ctx2d.strokeStyle = highlight ? '#ff6b6b' : '#94a3b8';
        ctx2d.stroke();

        for (let k = 0; k < 3; k++) {
          ctx2d.save();
          ctx2d.rotate((k * Math.PI * 2) / 3);
          ctx2d.fillStyle = '#cbd5e1';
          ctx2d.fillRect(-4, 14, 8, 38);
          ctx2d.restore();
        }

        ctx2d.beginPath();
        ctx2d.arc(0, 0, 14, 0, Math.PI * 2);
        ctx2d.fillStyle = '#ff6b6b';
        ctx2d.fill();
        ctx2d.restore();

        ctx2d.fillStyle = '#f8fafc';
        ctx2d.font = 'bold 10px monospace';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(title, cx, cy + 72);
        ctx2d.fillStyle = highlight ? '#fda4af' : '#94a3b8';
        ctx2d.fillText(`${ips.toFixed(2)} IPS`, cx, cy + 85);
      };

      drawReel(88, 76, st.reelAngleA, 'J37 DECK A (REF)', 15.0, false);
      drawReel(226, 76, st.reelAngleB, st.isBraking ? 'THUMB BRAKING!' : 'DRAG RIM TO FLANGE', st.deckBSpeedIps, true);

      // Right Half: Live Comb-Filter Spectrum
      const specX = 310;
      const specW = w - specX - 14;
      ctx2d.fillStyle = '#140e11';
      ctx2d.fillRect(specX, 14, specW, h - 28);
      ctx2d.strokeStyle = '#4c1d24';
      ctx2d.strokeRect(specX, 14, specW, h - 28);

      if (audioRef.current?.analyser && isPlaying) {
        audioRef.current.analyser.getByteFrequencyData(fftBins);
        for (let i = 1; i < 160; i++) {
          const x = specX + (i / 160) * specW;
          const barH = (fftBins[i] / 255) * (h - 46);
          ctx2d.fillStyle = Math.abs(st.deltaT_ms) < 0.15 && phaseInvert ? '#ef4444' : '#fb7185';
          ctx2d.fillRect(x, h - 16 - barH, Math.max(1.5, specW / 160 - 0.5), barH);
        }
      }

      ctx2d.textAlign = 'left';
      ctx2d.fillStyle = '#fecdd3';
      ctx2d.font = 'bold 10.5px monospace';
      const firstNotch =
        Math.abs(st.deltaT_ms) > 0.05
          ? `${Math.round(1000 / (phaseInvert ? Math.abs(st.deltaT_ms) : 2 * Math.abs(st.deltaT_ms)))} Hz`
          : phaseInvert
            ? 'TOTAL ZERO NULL!'
            : '+6dB SUM';
      ctx2d.fillText(`Δt: ${st.deltaT_ms >= 0 ? '+' : ''}${st.deltaT_ms.toFixed(2)} ms • NOTCH: ${firstNotch}`, specX + 8, 29);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, phaseInvert]);

  const handleReelPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const dist = Math.hypot(x - 226, y - 76);
    if (dist <= 68) {
      e.currentTarget.setPointerCapture(e.pointerId);
      physicsRef.current.applyThumbBrake(Math.min(1, dist / 56), 0.85);
    }
  };

  const handleReelPointerUp = () => {
    physicsRef.current.releaseThumbBrake();
  };

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

  const startStem = (target = stemType) => {
    const { ctx, stems, input } = ensureAudio();
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
            KEN TOWNSEND • ABBEY ROAD B.P.O. VARISPEED RIG (APRIL 1966)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#fff1f2', fontFamily: '"Courier Prime", monospace', fontSize: '1.18rem' }}>
            THROUGH-ZERO TAPE FLANGING &amp; ARTIFICIAL DOUBLE TRACKING
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              physicsRef.current.resetToZeroPoint();
              setLfoActive(true);
              setLfoRate(0.22);
              setLfoDepth(0.55);
              setPhaseInvert(true);
              setStereoSplit(false);
            }}
            style={{ backgroundColor: '#29181d', border: '1px solid #ff6b6b', color: '#fecdd3', borderRadius: '5px', padding: '5px 9px', fontSize: '0.73rem', cursor: 'pointer' }}
          >
            Jet Through-Zero Sweep
          </button>
          <button
            onClick={() => {
              setLfoActive(false);
              setBpoHz(45.2); // ~ +11ms offset beyond 10ms = ~21ms ADT Haas vocal double!
              setPhaseInvert(false);
              setStereoSplit(true);
              setStemType('vocals');
              if (isPlaying) startStem('vocals');
            }}
            style={{ backgroundColor: '#29181d', border: '1px solid #38bdf8', color: '#bae6fd', borderRadius: '5px', padding: '5px 9px', fontSize: '0.73rem', cursor: 'pointer' }}
          >
            Lennon Vocal ADT (~21ms Haas)
          </button>
          <button
            onClick={() => {
              physicsRef.current.resetToZeroPoint();
              setLfoActive(false);
              setBpoHz(50.0);
              setPhaseInvert(true);
              setStereoSplit(false);
            }}
            style={{ backgroundColor: '#29181d', border: '1px solid #f59e0b', color: '#fde68a', borderRadius: '5px', padding: '5px 9px', fontSize: '0.73rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} />
            <span>Zero-Point Total Null (0.0ms)</span>
          </button>
        </div>
      </div>

      {/* Interactive Thumb-Brake Reel + Comb Spectrum */}
      <canvas
        ref={reelsCanvasRef}
        width={620}
        height={175}
        onPointerDown={handleReelPointerDown}
        onPointerUp={handleReelPointerUp}
        onPointerCancel={handleReelPointerUp}
        style={{
          width: '100%',
          height: '175px',
          borderRadius: '8px',
          border: '1px solid #4c1d24',
          marginBottom: '14px',
          cursor: 'grab',
          display: 'block',
          touchAction: 'none'
        }}
        title="Press and hold your mouse/thumb on Deck B's spinning flange rim to physically drag the tape!"
      />

      {/* Transport & Stem Choice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px', marginBottom: '14px' }}>
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
          <span>{isPlaying ? 'STOP DUAL J37 DECKS' : 'START SYNCHRONIZED J37 PAIR'}</span>
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
            padding: '0 12px',
            fontSize: '0.83rem',
            fontWeight: 600
          }}
        >
          <option value="drums">1967 Glyn Johns Breakbeat &amp; Cymbals</option>
          <option value="vocals">Psychedelic Double-Tracked Lead Vocal</option>
          <option value="guitar">12-String Rickenbacker Chime</option>
          <option value="keys">Hammond B3 Organ Drawbars</option>
          <option value="noise">Pink Noise Calibration (Comb Notch View)</option>
        </select>
      </div>

      {/* BPO Oscillator & Polarity Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div style={{ backgroundColor: '#110c0e', padding: '11px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>B.P.O. MAINS OSC</span>
            <span style={{ color: '#ff6b6b', fontFamily: 'monospace' }}>{bpoHz.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min="45"
            max="55"
            step="0.1"
            disabled={lfoActive}
            value={bpoHz}
            onChange={(e) => setBpoHz(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#ff6b6b' }}
          />
          <div style={{ fontSize: '0.67rem', color: '#a1a1aa', marginTop: '4px' }}>
            {lfoActive ? 'Auto-swept by LFO' : '50.0 Hz = Exact Zero Sync'}
          </div>
        </div>

        <div style={{ backgroundColor: '#110c0e', padding: '11px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>AUTO LFO SWEEP</span>
            <button
              onClick={() => setLfoActive(!lfoActive)}
              style={{
                backgroundColor: lfoActive ? '#ff6b6b' : '#27272a',
                color: lfoActive ? '#09090b' : '#a1a1aa',
                border: 'none',
                borderRadius: '4px',
                padding: '1px 7px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {lfoActive ? 'ON' : 'MANUAL'}
            </button>
          </div>
          <input
            type="range"
            min="0.06"
            max="1.2"
            step="0.02"
            value={lfoRate}
            onChange={(e) => setLfoRate(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#ff6b6b' }}
          />
          <div style={{ fontSize: '0.67rem', color: '#a1a1aa', marginTop: '4px' }}>
            Sweep Rate: {lfoRate.toFixed(2)} Hz • Δt = {telemetry.deltaT_ms.toFixed(2)} ms
          </div>
        </div>

        <div style={{ backgroundColor: '#110c0e', padding: '11px', borderRadius: '8px', border: '1px solid #3f3f46', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
          <button
            onClick={() => setPhaseInvert(!phaseInvert)}
            style={{
              padding: '6px',
              borderRadius: '5px',
              border: phaseInvert ? '1px solid #ef4444' : '1px solid #3f3f46',
              backgroundColor: phaseInvert ? 'rgba(239,68,68,0.2)' : '#18181b',
              color: phaseInvert ? '#fca5a5' : '#a1a1aa',
              fontSize: '0.73rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Ø DECK B 180° INVERT: {phaseInvert ? 'INVERTED' : 'NORMAL'}
          </button>
          <button
            onClick={() => setStereoSplit(!stereoSplit)}
            style={{
              padding: '6px',
              borderRadius: '5px',
              border: stereoSplit ? '1px solid #38bdf8' : '1px solid #3f3f46',
              backgroundColor: stereoSplit ? 'rgba(56,189,248,0.2)' : '#18181b',
              color: stereoSplit ? '#bae6fd' : '#a1a1aa',
              fontSize: '0.73rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ROUTING: {stereoSplit ? 'STEREO ADT PAN (L/R)' : 'MONO COMB SUM'}
          </button>
        </div>
      </div>
    </div>
  );
}
