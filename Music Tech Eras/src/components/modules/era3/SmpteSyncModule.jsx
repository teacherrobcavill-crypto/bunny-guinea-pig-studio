import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertCircle, CheckCircle2, Radio } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';

function formatSmpte(sec) {
  const totalFrames = Math.floor(Math.max(0, sec) * 25);
  const ff = totalFrames % 25;
  const ss = Math.floor(totalFrames / 25) % 60;
  const mm = Math.floor(totalFrames / 1500) % 60;
  return `01:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

function createLtcBuffer(ctx) {
  const sr = ctx.sampleRate;
  const len = sr * 2;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  // 25 fps * 80 bits = 2000 bps -> Bi-Phase Mark 1kHz ('0') and 2kHz ('1') square transitions
  let phase = 1;
  let samplesPerHalfBit = Math.max(8, Math.floor(sr / 4000));
  let bitVal = 0;
  for (let i = 0; i < len; i++) {
    if (i % (samplesPerHalfBit * 2) === 0) {
      phase = -phase;
      bitVal = ((i * 7) % 13) > 5 ? 1 : 0;
    } else if (i % samplesPerHalfBit === 0 && bitVal === 1) {
      phase = -phase;
    }
    d[i] = phase * 0.45;
  }
  return buf;
}

export default function SmpteSyncModule() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [guardBandEmpty, setGuardBandEmpty] = useState(true); // Track 23 empty vs populated
  const [soloLtc, setSoloLtc] = useState(false);
  const [jamSyncEnabled, setJamSyncEnabled] = useState(true);
  const [syncState, setSyncState] = useState('LOCKED'); // 'LOCKED' | 'CHASING' | 'DROPOUT'
  const [masterSec, setMasterSec] = useState(0);
  const [slaveSec, setSlaveSec] = useState(0);
  const [slaveRate, setSlaveRate] = useState(1.0);

  const audioRef = useRef(null);
  const activeNodesRef = useRef(null);
  const syncPhysicsRef = useRef({ masterT: 0, slaveT: 0, rate: 1.0, dropoutUntil: 0 });
  const canvasRef = useRef(null);

  const initEngine = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const masterDrums = FlangeStemGenerator.createDrumStem(ctx); // Machine A (Trks 1-22)
    const slaveKeys = FlangeStemGenerator.createKeysStem(ctx);   // Machine B (Trks 25-46)
    const ltcBuf = createLtcBuffer(ctx);                         // Track 24 SMPTE LTC

    const mixGain = ctx.createGain();
    const ltcCrosstalkGain = ctx.createGain();
    const ltcFilter = ctx.createBiquadFilter();
    ltcFilter.type = 'bandpass';
    ltcFilter.frequency.value = 1850;
    ltcFilter.Q.value = 1.2;

    const masterOut = ctx.createGain();
    masterOut.gain.value = 0.8;

    mixGain.connect(masterOut);
    ltcCrosstalkGain.connect(ltcFilter);
    ltcFilter.connect(masterOut);
    masterOut.connect(ctx.destination);

    audioRef.current = { masterDrums, slaveKeys, ltcBuf, mixGain, ltcCrosstalkGain };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { mixGain, ltcCrosstalkGain } = audioRef.current;
    const now = mixGain.context.currentTime;

    if (soloLtc) {
      mixGain.gain.setTargetAtTime(0.0, now, 0.02);
      ltcCrosstalkGain.gain.setTargetAtTime(0.45, now, 0.02);
    } else {
      mixGain.gain.setTargetAtTime(0.85, now, 0.02);
      // Track 23 empty = -65 dB negligible bleed; Track 23 populated = loud annoying Track 24 crosstalk whine!
      ltcCrosstalkGain.gain.setTargetAtTime(guardBandEmpty ? 0.002 : 0.14, now, 0.02);
    }
  }, [guardBandEmpty, soloLtc]);

  // PLL Synchronizer & 24-Track Head Stack Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    let last = performance.now();
    let raf = null;

    const tick = (nowMs) => {
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;

      const sp = syncPhysicsRef.current;
      if (isPlaying) {
        sp.masterT += dt;
        const inDropout = nowMs < sp.dropoutUntil;

        if (inDropout && !jamSyncEnabled) {
          // Without Jam Sync flywheel, slave capstan stalls/drifts wildly during oxide dropout!
          sp.rate += (0.72 - sp.rate) * dt * 4.5;
          setSyncState('DROPOUT');
        } else {
          const err = sp.masterT - sp.slaveT;
          if (Math.abs(err) > 0.012) {
            sp.rate = Math.max(0.82, Math.min(1.16, 1.0 + err * 0.65));
            setSyncState(inDropout ? 'DROPOUT' : 'CHASING');
          } else {
            sp.rate += (1.0 - sp.rate) * dt * 10;
            sp.slaveT = sp.masterT;
            setSyncState(inDropout ? 'DROPOUT' : 'LOCKED');
          }
        }

        sp.slaveT += dt * sp.rate;
        setMasterSec(sp.masterT);
        setSlaveSec(sp.slaveT);
        setSlaveRate(sp.rate);

        if (activeNodesRef.current?.slaveSrc) {
          const aCtx = activeNodesRef.current.slaveSrc.context;
          activeNodesRef.current.slaveSrc.playbackRate.setTargetAtTime(sp.rate, aCtx.currentTime, 0.03);
        }
      }

      // Draw 24-Track Edge Guard-Band View + Bi-Phase Square Wave
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = '#090e16';
      ctx2d.fillRect(0, 0, w, h);

      // Draw Tracks 19..24 on 2-inch tape edge
      const tracks = [
        { num: 19, label: 'TRK 19: KICK', color: '#38bdf8' },
        { num: 20, label: 'TRK 20: SNARE', color: '#38bdf8' },
        { num: 21, label: 'TRK 21: BASS', color: '#38bdf8' },
        { num: 22, label: 'TRK 22: SYNTH', color: '#38bdf8' },
        {
          num: 23,
          label: guardBandEmpty ? 'TRK 23: GUARD BAND (BLANK)' : 'TRK 23: VOCAL (BLEED RISK!)',
          color: guardBandEmpty ? '#22c55e' : '#ef4444'
        },
        { num: 24, label: 'TRK 24: SMPTE 80-BIT LTC', color: '#f59e0b' }
      ];

      tracks.forEach((t, idx) => {
        const y = 12 + idx * 21;
        ctx2d.fillStyle = '#111827';
        ctx2d.fillRect(16, y, w * 0.52, 17);
        ctx2d.strokeStyle = t.color;
        ctx2d.strokeRect(16, y, w * 0.52, 17);
        ctx2d.fillStyle = t.color;
        ctx2d.font = 'bold 10px monospace';
        ctx2d.fillText(t.label, 24, y + 12);
      });

      // Crosstalk magnetic flux arcs from Track 24 -> Track 23
      if (!guardBandEmpty) {
        ctx2d.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.arc(w * 0.5, 114, 16, -Math.PI * 0.5, Math.PI * 0.5);
        ctx2d.stroke();
      }

      // Right side: Live 80-Bit Bi-Phase Mark Square Wave
      const wx = w * 0.57;
      const ww = w - wx - 16;
      ctx2d.fillStyle = '#05080d';
      ctx2d.fillRect(wx, 12, ww, h - 24);
      ctx2d.strokeStyle = '#1e3a5f';
      ctx2d.strokeRect(wx, 12, ww, h - 24);

      ctx2d.strokeStyle = '#f59e0b';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      const shift = Math.floor(sp.masterT * 45);
      for (let b = 0; b < 14; b++) {
        const bx = wx + 8 + (b / 14) * (ww - 16);
        const bw = (ww - 16) / 14;
        const high = (b + shift) % 2 === 0;
        const oneBit = (b * 3 + shift) % 5 === 0;
        const yTop = 44;
        const yBot = h - 32;
        if (b === 0) ctx2d.moveTo(bx, high ? yTop : yBot);
        ctx2d.lineTo(bx, high ? yTop : yBot);
        if (oneBit) {
          ctx2d.lineTo(bx + bw * 0.5, high ? yTop : yBot);
          ctx2d.lineTo(bx + bw * 0.5, high ? yBot : yTop);
          ctx2d.lineTo(bx + bw, high ? yBot : yTop);
        } else {
          ctx2d.lineTo(bx + bw, high ? yTop : yBot);
        }
      }
      ctx2d.stroke();
      ctx2d.fillStyle = '#fde68a';
      ctx2d.font = 'bold 9.5px monospace';
      ctx2d.fillText('80-BIT BI-PHASE MARK LTC', wx + 10, 27);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, guardBandEmpty, jamSyncEnabled]);

  const stopPlayback = () => {
    if (activeNodesRef.current) {
      ['masterSrc', 'slaveSrc', 'ltcSrc'].forEach((k) => {
        try {
          activeNodesRef.current[k]?.stop();
          activeNodesRef.current[k]?.disconnect();
        } catch (_) {}
      });
      activeNodesRef.current = null;
    }
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const toggleTransport = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    const { ctx, masterDrums, slaveKeys, ltcBuf, mixGain, ltcCrosstalkGain } = initEngine();
    const now = ctx.currentTime + 0.02;

    const masterSrc = ctx.createBufferSource();
    masterSrc.buffer = masterDrums;
    masterSrc.loop = true;
    masterSrc.connect(mixGain);

    const slaveSrc = ctx.createBufferSource();
    slaveSrc.buffer = slaveKeys;
    slaveSrc.loop = true;
    slaveSrc.connect(mixGain);

    const ltcSrc = ctx.createBufferSource();
    ltcSrc.buffer = ltcBuf;
    ltcSrc.loop = true;
    ltcSrc.connect(ltcCrosstalkGain);

    masterSrc.start(now);
    slaveSrc.start(now);
    ltcSrc.start(now);

    syncPhysicsRef.current = { masterT: 0, slaveT: 0, rate: 1.0, dropoutUntil: 0 };
    activeNodesRef.current = { masterSrc, slaveSrc, ltcSrc };
    setIsPlaying(true);
    notifyPlayingChange(true);
  };

  const knockSlaveOffset = () => {
    syncPhysicsRef.current.slaveT -= 0.45; // Force Slave Machine B 450ms behind Master so PLL slews!
  };

  const triggerDropout = () => {
    syncPhysicsRef.current.dropoutUntil = performance.now() + 1600;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1.4px' }}>
            DUAL STUDER A800 MKIII + LYNX TIMELINE PLL SYNCHRONIZER
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f0f9ff', fontSize: '1.18rem', fontWeight: 800 }}>
            46-TRACK SMPTE LTC LOCKING &amp; GUARD-BAND LAB
          </h3>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: syncState === 'LOCKED' ? 'rgba(34,197,94,0.16)' : 'rgba(245,158,11,0.2)',
            border: `1px solid ${syncState === 'LOCKED' ? '#22c55e' : '#f59e0b'}`,
            color: syncState === 'LOCKED' ? '#4ade80' : '#fcd34d',
            fontWeight: 800,
            fontSize: '0.76rem',
            fontFamily: 'monospace'
          }}
        >
          {syncState === 'LOCKED' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{syncState} • SLAVE CAPSTAN {(slaveRate * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Dual 7-Segment LED Timecode Displays */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ backgroundColor: '#05080d', padding: '12px 16px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
          <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>MASTER A800 (25 FPS EBU LTC)</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#ef4444', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '2px' }}>
            {formatSmpte(masterSec)}
          </div>
        </div>
        <div style={{ backgroundColor: '#05080d', padding: '12px 16px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
          <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>SLAVE A800 (PLL CHASE TIMECODE)</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: syncState === 'LOCKED' ? '#22c55e' : '#f59e0b', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '2px' }}>
            {formatSmpte(slaveSec)}
          </div>
        </div>
      </div>

      {/* 24-Track Edge & LTC Waveform Visualizer */}
      <canvas
        ref={canvasRef}
        width={620}
        height={150}
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '8px',
          border: '1px solid #1e3a5f',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Transport & Interactive Fault Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={toggleTransport}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#38bdf8',
            color: isPlaying ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '11px 12px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{isPlaying ? 'STOP 46-TRK RIG' : 'LOCK & PLAY 46-TRK'}</span>
        </button>

        <button
          onClick={knockSlaveOffset}
          disabled={!isPlaying}
          style={{
            backgroundColor: '#1e293b',
            color: isPlaying ? '#fcd34d' : '#64748b',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 700,
            fontSize: '0.76rem',
            cursor: isPlaying ? 'pointer' : 'not-allowed'
          }}
        >
          Knock Slave Out of Sync
        </button>

        <button
          onClick={triggerDropout}
          disabled={!isPlaying}
          style={{
            backgroundColor: '#1e293b',
            color: isPlaying ? '#fca5a5' : '#64748b',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 700,
            fontSize: '0.76rem',
            cursor: isPlaying ? 'pointer' : 'not-allowed'
          }}
        >
          Simulate 1.5s LTC Dropout
        </button>
      </div>

      {/* Guard Band, Jam Sync & Solo LTC Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <button
          onClick={() => setGuardBandEmpty(!guardBandEmpty)}
          style={{
            padding: '9px',
            borderRadius: '6px',
            border: guardBandEmpty ? '1px solid #22c55e' : '1px solid #ef4444',
            backgroundColor: guardBandEmpty ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.2)',
            color: guardBandEmpty ? '#86efac' : '#fca5a5',
            fontWeight: 800,
            fontSize: '0.73rem',
            cursor: 'pointer'
          }}
        >
          TRK 23 GUARD BAND: {guardBandEmpty ? 'EMPTY (SAFE)' : 'USED (BLEED!)'}
        </button>

        <button
          onClick={() => setJamSyncEnabled(!jamSyncEnabled)}
          style={{
            padding: '9px',
            borderRadius: '6px',
            border: jamSyncEnabled ? '1px solid #38bdf8' : '1px solid #475569',
            backgroundColor: jamSyncEnabled ? 'rgba(56,189,248,0.16)' : '#0f172a',
            color: jamSyncEnabled ? '#bae6fd' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.73rem',
            cursor: 'pointer'
          }}
        >
          JAM SYNC FLYWHEEL: {jamSyncEnabled ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setSoloLtc(!soloLtc)}
          style={{
            padding: '9px',
            borderRadius: '6px',
            border: soloLtc ? '1px solid #f59e0b' : '1px solid #475569',
            backgroundColor: soloLtc ? 'rgba(245,158,11,0.22)' : '#0f172a',
            color: soloLtc ? '#fde68a' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.73rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Radio size={13} />
          <span>{soloLtc ? 'SOLOING TRK 24 LTC' : 'SOLO TRK 24 LTC'}</span>
        </button>
      </div>
    </div>
  );
}
