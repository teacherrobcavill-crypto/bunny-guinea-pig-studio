import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Zap } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { ProceduralStemGenerator } from '../../../audio/Procedural80sStems';
import RotaryKnob from '../../common/RotaryKnob';

export default function GatedReverbModule() {
  const [roomAlg, setRoomAlg] = useState('stone-room');
  const [lmcSmash, setLmcSmash] = useState(true);
  const [drySidechainKey, setDrySidechainKey] = useState(true);
  const [thresholdDb, setThresholdDb] = useState(-22);
  const [holdMs, setHoldMs] = useState(210);
  const [releaseMs, setReleaseMs] = useState(75);
  const [wetMix, setWetMix] = useState(0.75);
  const [gateState, setGateState] = useState('CLOSED'); // 'OPEN' | 'HOLD' | 'CLOSED'
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const loopSrcRef = useRef(null);
  const gateStateRef = useRef({ status: 'CLOSED', openUntil: 0 });
  const scopeCanvasRef = useRef(null);
  const rafRef = useRef(null);

  const paramsRef = useRef({});
  paramsRef.current = { thresholdDb, holdMs, releaseMs, drySidechainKey, wetMix };

  const initAudio = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const drumLoop = ProceduralStemGenerator.create80sDrumStem(ctx);
    const singleSnare = ProceduralStemGenerator.createSingleSnareHit(ctx);

    const dryInput = ctx.createGain();
    const dryOut = ctx.createGain();

    // Room Convolver
    const convolver = ctx.createConvolver();
    convolver.buffer = ProceduralStemGenerator.createReverbImpulse(ctx, { algorithm: roomAlg, decaySeconds: 2.2 });

    // SSL 4000E Talkback Listen Mic Compressor (LMC) Smash
    const lmcComp = ctx.createDynamicsCompressor();
    lmcComp.threshold.value = -36;
    lmcComp.ratio.value = 20;
    lmcComp.attack.value = 0.001;
    lmcComp.release.value = 0.06;

    const lmcShaper = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i / 256) - 1;
      curve[i] = Math.tanh(x * 3.2);
    }
    lmcShaper.curve = curve;

    const lmcMakeup = ctx.createGain();
    lmcMakeup.gain.value = 2.6;

    // Drawmer DS201 VCA Gate Gain Node
    const gateVca = ctx.createGain();
    gateVca.gain.value = 0.0;

    const wetOut = ctx.createGain();
    const dryAnalyser = ctx.createAnalyser();
    dryAnalyser.fftSize = 256;
    const wetAnalyser = ctx.createAnalyser();
    wetAnalyser.fftSize = 256;

    const master = ctx.createGain();
    master.gain.value = 0.82;

    dryInput.connect(dryAnalyser);
    dryInput.connect(dryOut);
    dryOut.connect(master);

    dryInput.connect(convolver);
    convolver.connect(lmcComp);
    lmcComp.connect(lmcShaper);
    lmcShaper.connect(lmcMakeup);
    lmcMakeup.connect(wetAnalyser);
    lmcMakeup.connect(gateVca);
    gateVca.connect(wetOut);
    wetOut.connect(master);

    master.connect(ctx.destination);

    audioRef.current = {
      drumLoop,
      singleSnare,
      dryInput,
      dryOut,
      convolver,
      lmcComp,
      lmcMakeup,
      gateVca,
      wetOut,
      dryAnalyser,
      wetAnalyser
    };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { convolver } = audioRef.current;
    convolver.buffer = ProceduralStemGenerator.createReverbImpulse(convolver.context, {
      algorithm: roomAlg,
      decaySeconds: 2.2
    });
  }, [roomAlg]);

  useEffect(() => {
    if (!audioRef.current) return;
    const { lmcComp, lmcMakeup, dryOut, wetOut } = audioRef.current;
    const now = lmcComp.context.currentTime;
    lmcComp.threshold.setValueAtTime(lmcSmash ? -36 : -8, now);
    lmcComp.ratio.setValueAtTime(lmcSmash ? 20 : 1.5, now);
    lmcMakeup.gain.setTargetAtTime(lmcSmash ? 2.6 : 1.0, now, 0.02);
    dryOut.gain.setTargetAtTime(0.85, now, 0.02);
    wetOut.gain.setTargetAtTime(wetMix * 1.15, now, 0.02);
  }, [lmcSmash, wetMix]);

  // Real-time DS201 Key Envelope Follower + Trapezoid Canvas
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const buf = new Float32Array(256);

    const tick = (nowMs) => {
      const p = paramsRef.current;
      if (audioRef.current) {
        const { dryAnalyser, wetAnalyser, gateVca } = audioRef.current;
        const keyAnalyser = p.drySidechainKey ? dryAnalyser : wetAnalyser;
        keyAnalyser.getFloatTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i]);
          if (a > peak) peak = a;
        }
        const levelDb = 20 * Math.log10(Math.max(1e-5, peak));
        const aCtx = gateVca.context;

        if (levelDb >= p.thresholdDb) {
          gateStateRef.current.status = 'OPEN';
          gateStateRef.current.openUntil = nowMs + p.holdMs;
          gateVca.gain.cancelScheduledValues(aCtx.currentTime);
          gateVca.gain.setTargetAtTime(1.0, aCtx.currentTime, 0.002);
          setGateState('OPEN');
        } else if (nowMs < gateStateRef.current.openUntil) {
          if (gateStateRef.current.status !== 'HOLD') {
            gateStateRef.current.status = 'HOLD';
            setGateState('HOLD');
          }
        } else if (gateStateRef.current.status !== 'CLOSED') {
          gateStateRef.current.status = 'CLOSED';
          gateVca.gain.setTargetAtTime(0.0, aCtx.currentTime, Math.max(0.008, p.releaseMs / 3000));
          setGateState('CLOSED');
        }
      }

      // Draw Trapezoid Hold/Release Gate Envelope Diagram
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = '#070c14';
      ctx2d.fillRect(0, 0, w, h);

      const holdW = (p.holdMs / 600) * (w * 0.52);
      const relW = (p.releaseMs / 600) * (w * 0.34);
      const x0 = 36;
      const yTop = 26;
      const yBot = h - 22;

      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx2d.strokeStyle = gateStateRef.current.status === 'CLOSED' ? '#64748b' : '#38bdf8';
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.moveTo(x0, yBot);
      ctx2d.lineTo(x0 + 8, yTop);
      ctx2d.lineTo(x0 + 8 + holdW, yTop);
      ctx2d.lineTo(x0 + 8 + holdW + relW, yBot);
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.stroke();

      ctx2d.fillStyle = '#e2e8f0';
      ctx2d.font = 'bold 10px monospace';
      ctx2d.fillText(`DRAWMER DS201 ENVELOPE • HOLD: ${p.holdMs}ms • RELEASE: ${p.releaseMs}ms`, 14, 16);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const stopLoop = () => {
    if (loopSrcRef.current) {
      try {
        loopSrcRef.current.stop();
        loopSrcRef.current.disconnect();
      } catch (_) {}
      loopSrcRef.current = null;
    }
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const toggleGroove = () => {
    if (isPlaying) {
      stopLoop();
      return;
    }
    const { ctx, drumLoop, dryInput } = initAudio();
    const s = ctx.createBufferSource();
    s.buffer = drumLoop;
    s.loop = true;
    s.connect(dryInput);
    s.start();
    loopSrcRef.current = s;
    setIsPlaying(true);
    notifyPlayingChange(true);
  };

  const hitSingleSnare = () => {
    const { ctx, singleSnare, dryInput } = initAudio();
    const s = ctx.createBufferSource();
    s.buffer = singleSnare;
    s.connect(dryInput);
    s.start();
  };

  useEffect(() => {
    const unsub = registerStopCallback(() => stopLoop());
    return () => {
      unsub();
      stopLoop();
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#0e1520',
        borderRadius: '12px',
        border: '2px solid #1e3a5f',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      {/* Header + DS201 Traffic Light LEDs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1.4px' }}>
            TOWNHOUSE STUDIO 2 (1981) • HUGH PADGHAM &amp; PHIL COLLINS
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f0f9ff', fontSize: '1.18rem', fontWeight: 800 }}>
            SSL LMC + DRAWMER DS201 GATED REVERB ARCHITECTURE
          </h3>
        </div>

        {/* Authentic DS201 Red / Amber / Green Traffic Light LEDs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#05080d', padding: '7px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
          {[
            { id: 'CLOSED', color: '#ef4444' },
            { id: 'HOLD', color: '#f59e0b' },
            { id: 'OPEN', color: '#22c55e' }
          ].map((led) => {
            const lit = gateState === led.id;
            return (
              <div key={led.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: lit ? led.color : '#27272a',
                    boxShadow: lit ? `0 0 10px ${led.color}` : 'none'
                  }}
                />
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: lit ? led.color : '#64748b', fontFamily: 'monospace' }}>
                  {led.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trapezoid Envelope Canvas */}
      <canvas
        ref={scopeCanvasRef}
        width={620}
        height={118}
        style={{
          width: '100%',
          height: '118px',
          borderRadius: '8px',
          border: '1px solid #1e3a5f',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Transport + Immediate Snare Hit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '10px', marginBottom: '14px' }}>
        <button
          onClick={toggleGroove}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#38bdf8',
            color: isPlaying ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '11px 14px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px'
          }}
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isPlaying ? 'STOP TOWNHOUSE GROOVE' : 'PLAY 1981 TOM FILL GROOVE'}</span>
        </button>

        <select
          value={roomAlg}
          onChange={(e) => setRoomAlg(e.target.value)}
          style={{ backgroundColor: '#090e16', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '0 10px', fontSize: '0.8rem', fontWeight: 600 }}
        >
          <option value="stone-room">Townhouse Studio 2 Stone Room</option>
          <option value="ams-nonlin">AMS RMX16 NonLin 2 Digital</option>
          <option value="plate-224">Lexicon 224 Rich Plate</option>
        </select>

        <button
          onClick={hitSingleSnare}
          style={{
            backgroundColor: '#f59e0b',
            color: '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '0 14px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Zap size={15} fill="currentColor" />
          <span>HIT SNARE</span>
        </button>
      </div>

      {/* LMC Smash & External Dry Key Routing Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <button
          onClick={() => setLmcSmash(!lmcSmash)}
          style={{
            padding: '9px',
            borderRadius: '6px',
            border: lmcSmash ? '1px solid #22c55e' : '1px solid #475569',
            backgroundColor: lmcSmash ? 'rgba(34,197,94,0.16)' : '#090e16',
            color: lmcSmash ? '#86efac' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          SSL TALKBACK LMC SMASH: {lmcSmash ? 'ENGAGED (20:1 CRUSH)' : 'BYPASSED'}
        </button>

        <button
          onClick={() => setDrySidechainKey(!drySidechainKey)}
          style={{
            padding: '9px',
            borderRadius: '6px',
            border: drySidechainKey ? '1px solid #38bdf8' : '1px solid #ef4444',
            backgroundColor: drySidechainKey ? 'rgba(56,189,248,0.16)' : 'rgba(239,68,68,0.18)',
            color: drySidechainKey ? '#bae6fd' : '#fca5a5',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          KEY INPUT: {drySidechainKey ? 'CLEAN DRY SNARE (TIGHT)' : 'WET ROOM (CHATTER!)'}
        </button>
      </div>

      {/* DS201 Knobs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#090e16', padding: '14px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
        <RotaryKnob label="Threshold" value={thresholdDb} min={-48} max={-6} step={1} defaultValue={-22} unit="dB" accent="#38bdf8" onChange={setThresholdDb} />
        <RotaryKnob label="Hold Time" value={holdMs} min={20} max={550} step={10} defaultValue={210} unit="ms" accent="#f59e0b" onChange={setHoldMs} />
        <RotaryKnob label="Release" value={releaseMs} min={15} max={500} step={5} defaultValue={75} unit="ms" accent="#22c55e" onChange={setReleaseMs} />
        <RotaryKnob label="Room Return" value={wetMix} min={0} max={1} step={0.05} defaultValue={0.75} accent="#a855f7" onChange={setWetMix} formatValue={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </div>
  );
}
