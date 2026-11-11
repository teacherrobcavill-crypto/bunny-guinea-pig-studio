import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';

const MODES = {
  repro_error: {
    title: '1. Pre-1955 Repro Head Monitoring (135ms Flam Error)',
    lagSec: 0.135,
    bandLimited: false,
    badge: 'OUT OF SYNC (+135ms LAG)',
    color: '#ef4444',
    desc: 'Musician monitors Track 1 off the downstream Playback (Repro) head 2.025" away at 15 ips. Their Track 2 guitar overdub is printed 135 ms late—creating a rhythmic trainwreck!'
  },
  selsync_record: {
    title: '2. Sel-Sync Record-Head Monitoring (In-Session Overdub)',
    lagSec: 0.0,
    bandLimited: true,
    badge: '0ms PHASE LOCKED (MID-BAND)',
    color: '#f59e0b',
    desc: 'Track 1’s Record head coil is switched to act as a temporary playback pickup right where Track 2 is being recorded! Zero physical offset = 0 ms latency, though wide record head gap limits highs (~6.5 kHz).'
  },
  final_repro: {
    title: '3. Final Mixdown off Dedicated Repro Head (Full Hi-Fi)',
    lagSec: 0.0,
    bandLimited: false,
    badge: '0ms SYNC + FULL 16kHz HI-FI',
    color: '#22c55e',
    desc: 'Once overdubbing is complete, all tracks switch back to the narrow-gap Repro head together—delivering full 30 Hz–16 kHz fidelity AND tight 0 ms alignment!'
  }
};

export default function SelSyncModule() {
  const [mode, setMode] = useState('selsync_record');
  const [tapeIps, setTapeIps] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const sourcesRef = useRef([]);
  const canvasRef = useRef(null);

  const lagMs = mode === 'repro_error' ? Math.round((2.025 / tapeIps) * 1000) : 0;

  const ensureAudio = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const drumBuf = FlangeStemGenerator.createDrumStem(ctx);
    const guitarBuf = FlangeStemGenerator.createGuitarStem(ctx);

    const backingFilter = ctx.createBiquadFilter();
    backingFilter.type = 'lowpass';
    backingFilter.frequency.value = 16000;

    const backingHpf = ctx.createBiquadFilter();
    backingHpf.type = 'highpass';
    backingHpf.frequency.value = 35;

    const overdubDelay = ctx.createDelay(1.0);
    overdubDelay.delayTime.value = 0;

    const master = ctx.createGain();
    master.gain.value = 0.8;

    backingHpf.connect(backingFilter);
    backingFilter.connect(master);
    overdubDelay.connect(master);
    master.connect(ctx.destination);

    audioRef.current = { drumBuf, guitarBuf, backingFilter, backingHpf, overdubDelay };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { backingFilter, backingHpf, overdubDelay } = audioRef.current;
    const now = backingFilter.context.currentTime;
    const cfg = MODES[mode];

    const delaySec = mode === 'repro_error' ? 2.025 / tapeIps : 0.0;
    overdubDelay.delayTime.setTargetAtTime(delaySec, now, 0.02);
    backingFilter.frequency.setTargetAtTime(cfg.bandLimited ? 6200 : 16500, now, 0.03);
    backingHpf.frequency.setTargetAtTime(cfg.bandLimited ? 155 : 35, now, 0.03);
  }, [mode, tapeIps]);

  // 3-Head Transport + Transient Alignment Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;
    let raf = null;

    const draw = () => {
      if (isPlaying) phase = (phase + (tapeIps === 15 ? 3.2 : 1.6)) % 120;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0d0a0b';
      ctx.fillRect(0, 0, w, h);

      // Tape Oxide Ribbon
      ctx.fillStyle = '#6b3410';
      ctx.fillRect(30, 56, w - 60, 14);

      // Moving magnetictransient pulses on Track 1 & Track 2
      for (let x = 30 + (phase % 90); x < w - 40; x += 90) {
        // Track 1 Backing Beat
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x, 56, 6, 7);
        // Track 2 Overdub Beat (shifted if Repro error!)
        const offsetPx = mode === 'repro_error' ? (tapeIps === 15 ? 34 : 68) : 0;
        ctx.fillStyle = mode === 'repro_error' ? '#ef4444' : '#4ade80';
        if (x - offsetPx > 30) {
          ctx.fillRect(x - offsetPx, 63, 6, 7);
        }
      }

      // Draw 3 Heads: ERASE | RECORD / SEL-SYNC | REPRO
      const heads = [
        { label: 'ERASE HEAD', x: w * 0.24, active: false, color: '#71717a' },
        {
          label: 'RECORD / SEL-SYNC HEAD',
          x: w * 0.5,
          active: mode === 'selsync_record',
          color: '#f59e0b'
        },
        {
          label: 'REPRO HEAD (+2.025")',
          x: w * 0.76,
          active: mode !== 'selsync_record',
          color: mode === 'repro_error' ? '#ef4444' : '#22c55e'
        }
      ];

      heads.forEach((hd) => {
        ctx.fillStyle = hd.active ? hd.color : '#27272a';
        ctx.strokeStyle = hd.color;
        ctx.lineWidth = 2;
        ctx.fillRect(hd.x - 22, 22, 44, 32);
        ctx.strokeRect(hd.x - 22, 22, 44, 32);
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hd.label, hd.x, 15);
      });

      // Bottom Transient Timing Grid
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('TRACK 1 (DRUM BACKING):   |Beat 1          |Beat 2          |Beat 3', 36, 108);
      ctx.fillStyle = mode === 'repro_error' ? '#fca5a5' : '#86efac';
      ctx.fillText(
        mode === 'repro_error'
          ? `TRACK 2 (GUITAR OVERDUB):     |LATE +${lagMs}ms!   |LATE +${lagMs}ms!   |LATE +${lagMs}ms!`
          : 'TRACK 2 (GUITAR OVERDUB): |Beat 1 (LOCKED) |Beat 2 (LOCKED) |Beat 3 (LOCKED)',
        36,
        130
      );

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, tapeIps, isPlaying, lagMs]);

  const stopAudio = () => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch (_) {}
    });
    sourcesRef.current = [];
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    const { ctx, drumBuf, guitarBuf, backingHpf, overdubDelay } = ensureAudio();
    const now = ctx.currentTime + 0.03;

    const s1 = ctx.createBufferSource();
    s1.buffer = drumBuf;
    s1.loop = true;
    s1.connect(backingHpf);

    const s2 = ctx.createBufferSource();
    s2.buffer = guitarBuf;
    s2.loop = true;
    s2.connect(overdubDelay);

    s1.start(now);
    s2.start(now);
    sourcesRef.current = [s1, s2];
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

  const currentCfg = MODES[mode];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#ff6b6b', fontWeight: 700, letterSpacing: '1.4px' }}>
            AMPEX MODEL 300-8 / LES PAUL &amp; ROSS SNYDER (1955)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#fff1f2', fontFamily: '"Courier Prime", monospace', fontSize: '1.18rem' }}>
            SELECTIVE SYNCHRONIZATION (SEL-SYNC) ALIGNMENT LAB
          </h3>
        </div>

        <button
          onClick={togglePlay}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#ff6b6b',
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
          {isPlaying ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          <span>{isPlaying ? 'STOP OVERDUB TEST' : 'AUDITION DRUMS + GUITAR OVERDUB'}</span>
        </button>
      </div>

      {/* 3-Head Tape Path Canvas */}
      <canvas
        ref={canvasRef}
        width={620}
        height={150}
        style={{
          width: '100%',
          height: '150px',
          borderRadius: '8px',
          border: '1px solid #4c1d24',
          marginBottom: '16px',
          display: 'block'
        }}
      />

      {/* 3 Monitoring Routing Modes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {Object.entries(MODES).map(([key, cfg]) => {
          const active = mode === key;
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '8px',
                border: active ? `2px solid ${cfg.color}` : '1px solid #3f3f46',
                backgroundColor: active ? `${cfg.color}18` : '#110c0e',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{cfg.title}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: cfg.color,
                  fontFamily: 'monospace',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0,0,0,0.45)'
                }}
              >
                {cfg.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Speed Selector & Explanation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[15, 7.5].map((spd) => (
            <button
              key={spd}
              onClick={() => setTapeIps(spd)}
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                border: tapeIps === spd ? '1px solid #ff6b6b' : '1px solid #3f3f46',
                backgroundColor: tapeIps === spd ? 'rgba(255,107,107,0.2)' : '#110c0e',
                color: tapeIps === spd ? '#fecdd3' : '#a1a1aa',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {spd} IPS
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '11px 14px',
            borderRadius: '8px',
            backgroundColor: '#0f0b0c',
            border: `1px solid ${currentCfg.color}66`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.79rem',
            color: '#e2e8f0'
          }}
        >
          {mode === 'repro_error' ? (
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} color={currentCfg.color} style={{ flexShrink: 0 }} />
          )}
          <span>{currentCfg.desc}</span>
        </div>
      </div>
    </div>
  );
}
