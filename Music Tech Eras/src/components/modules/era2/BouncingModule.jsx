import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Lock, Unlock } from 'lucide-react';
import {
  ensureAudioWorklets,
  isWorkletReady,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';

const GEN_SPECS = {
  1: { label: 'Gen 1: Discrete 4-Track Master', hiss: 0.08, cutoff: 15500, drive: 2.5, wow: 0.12, bumpDb: 1.5, dbNoise: '-62 dB' },
  2: { label: 'Gen 2: Machine-to-Machine Bounce 1', hiss: 0.24, cutoff: 10200, drive: 6.0, wow: 0.28, bumpDb: 3.5, dbNoise: '-59 dB (+3dB)' },
  3: { label: 'Gen 3: Second Reduction Bounce', hiss: 0.48, cutoff: 6800, drive: 9.5, wow: 0.48, bumpDb: 5.5, dbNoise: '-56 dB (+6dB)' },
  4: { label: 'Gen 4: Over-Bounced Oxide Smear', hiss: 0.78, cutoff: 4300, drive: 13.5, wow: 0.72, bumpDb: 7.5, dbNoise: '-53 dB (+9dB)' }
};

export default function BouncingModule() {
  const [generation, setGeneration] = useState(1);
  const [faders, setFaders] = useState([0.85, 0.85, 0.8, 0.9]); // Drums, Bass, 12-Str Guitar, Lead Vocal Overdub
  const [treblePreBoost, setTreblePreBoost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const engineRef = useRef(null);
  const sourcesRef = useRef([]);
  const specCanvasRef = useRef(null);

  const submixLocked = generation > 1;
  const spec = GEN_SPECS[generation];

  const initAudio = async () => {
    const ctx = await ensureAudioWorklets();
    if (engineRef.current) return { ctx, ...engineRef.current };

    const buffers = [
      FlangeStemGenerator.createDrumStem(ctx),
      FlangeStemGenerator.createBassStem(ctx),
      FlangeStemGenerator.createGuitarStem(ctx),
      FlangeStemGenerator.createVocalStem(ctx)
    ];

    const trackGains = [0, 1, 2, 3].map((i) => {
      const g = ctx.createGain();
      g.gain.value = faders[i];
      return g;
    });

    const bounceBus = ctx.createGain();
    const preEmphasis = ctx.createBiquadFilter();
    preEmphasis.type = 'highshelf';
    preEmphasis.frequency.value = 6500;
    preEmphasis.gain.value = 0;

    const headBump = ctx.createBiquadFilter();
    headBump.type = 'peaking';
    headBump.frequency.value = 95;
    headBump.Q.value = 1.3;

    const hfGapLoss = ctx.createBiquadFilter();
    hfGapLoss.type = 'lowpass';
    hfGapLoss.frequency.value = 15500;

    let tapeNode = null;
    if (isWorkletReady('tape-machine-processor')) {
      tapeNode = new AudioWorkletNode(ctx, 'tape-machine-processor');
    } else {
      tapeNode = ctx.createGain();
    }

    const masterSum = ctx.createGain();
    masterSum.gain.value = 0.78;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    // Tracks 1-3 go through cumulative bounce degradation chain; Track 4 stays Gen 1 fresh overdub!
    trackGains[0].connect(bounceBus);
    trackGains[1].connect(bounceBus);
    trackGains[2].connect(bounceBus);

    bounceBus.connect(preEmphasis);
    preEmphasis.connect(tapeNode);
    tapeNode.connect(headBump);
    headBump.connect(hfGapLoss);
    hfGapLoss.connect(masterSum);

    // Fresh Gen-1 Vocal Overdub on freed track
    trackGains[3].connect(masterSum);

    masterSum.connect(analyser);
    analyser.connect(ctx.destination);

    engineRef.current = { buffers, trackGains, preEmphasis, headBump, hfGapLoss, tapeNode, analyser };
    return { ctx, ...engineRef.current };
  };

  useEffect(() => {
    if (!engineRef.current) return;
    const { trackGains, preEmphasis, headBump, hfGapLoss, tapeNode, analyser } = engineRef.current;
    const now = analyser.context.currentTime;
    const s = GEN_SPECS[generation];

    faders.forEach((v, idx) => {
      trackGains[idx].gain.setTargetAtTime(v, now, 0.02);
    });

    preEmphasis.gain.setTargetAtTime(treblePreBoost ? 6.5 : 0, now, 0.03);
    headBump.gain.setTargetAtTime(s.bumpDb, now, 0.03);
    hfGapLoss.frequency.setTargetAtTime(s.cutoff, now, 0.04);

    if (tapeNode.parameters) {
      tapeNode.parameters.get('recordDriveDb')?.setTargetAtTime(s.drive, now, 0.03);
      tapeNode.parameters.get('hissLevel')?.setTargetAtTime(s.hiss, now, 0.03);
      tapeNode.parameters.get('wowFlutter')?.setTargetAtTime(s.wow, now, 0.03);
    }
  }, [generation, faders, treblePreBoost]);

  // Spectrum & HF Ceiling Visualizer
  useEffect(() => {
    const canvas = specCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bins = new Uint8Array(512);
    let raf = null;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0c0a0b';
      ctx.fillRect(0, 0, w, h);

      if (engineRef.current?.analyser && isPlaying) {
        engineRef.current.analyser.getByteFrequencyData(bins);
        for (let i = 1; i < 220; i++) {
          const x = (i / 220) * w;
          const barH = (bins[i] / 255) * (h - 22);
          ctx.fillStyle = generation >= 3 ? '#fb7185' : '#fda4af';
          ctx.fillRect(x, h - barH, Math.max(2, w / 220 - 1), barH);
        }
      }

      // Draw HF Gap Loss Cutoff Curtain
      const cutNorm = Math.min(1, GEN_SPECS[generation].cutoff / 16000);
      const cutX = cutNorm * w;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(cutX, 0, w - cutX, h);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cutX, 0);
      ctx.lineTo(cutX, h);
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HF OXIDE ROLLOFF: ${(GEN_SPECS[generation].cutoff / 1000).toFixed(1)} kHz • NOISE FLOOR: ${GEN_SPECS[generation].dbNoise}`,
        10,
        16
      );
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [generation, isPlaying]);

  const stopPlayback = () => {
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

  const togglePlay = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    const { ctx, buffers, trackGains } = await initAudio();
    const startAt = ctx.currentTime + 0.03;
    sourcesRef.current = buffers.map((buf, idx) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(trackGains[idx]);
      src.start(startAt);
      return src;
    });
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

  const trackMeta = [
    { num: 'TRK 1', name: 'Ringo Breakbeat Kit', bounced: true },
    { num: 'TRK 2', name: 'Flatwound P-Bass', bounced: true },
    { num: 'TRK 3', name: '12-Str Rickenbacker', bounced: true },
    { num: 'TRK 4', name: 'Fresh Lead Vocal Overdub', bounced: false }
  ];

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
            EMI ABBEY ROAD STUDIO TWO • REDD.51 → DUAL STUDER J37
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#fff1f2', fontFamily: '"Courier Prime", monospace', fontSize: '1.18rem' }}>
            1-INCH 4-TRACK REDUCTION BOUNCE SIMULATOR
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
          <span>{isPlaying ? 'STOP J37 TRANSPORT' : 'PLAY 4-TRACK MASTER'}</span>
        </button>
      </div>

      {/* Bounce Generation Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[1, 2, 3, 4].map((g) => (
          <button
            key={g}
            onClick={() => setGeneration(g)}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: generation === g ? '2px solid #ff6b6b' : '1px solid #3f3f46',
              backgroundColor: generation === g ? 'rgba(255,107,107,0.18)' : '#0f0b0c',
              color: generation === g ? '#fecdd3' : '#a1a1aa',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div>GENERATION {g}</div>
            <div style={{ fontSize: '0.66rem', opacity: 0.8, marginTop: '2px' }}>{GEN_SPECS[g].dbNoise}</div>
          </button>
        ))}
      </div>

      {/* Live Spectrum & Oxide HF Curtain */}
      <canvas
        ref={specCanvasRef}
        width={620}
        height={130}
        style={{
          width: '100%',
          height: '130px',
          borderRadius: '8px',
          border: '1px solid #4c1d24',
          marginBottom: '16px',
          display: 'block'
        }}
      />

      {/* 4-Track Fader Strip with Submix Commitment Lock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {trackMeta.map((t, idx) => {
          const locked = t.bounced && submixLocked;
          return (
            <div
              key={t.num}
              style={{
                backgroundColor: locked ? 'rgba(63, 25, 30, 0.35)' : '#110c0e',
                border: locked ? '1px dashed #fb7185' : '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ff6b6b' }}>{t.num}</span>
                {locked ? <Lock size={13} color="#fb7185" /> : <Unlock size={13} color="#4ade80" />}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '10px', minHeight: '32px' }}>
                {t.name}
              </div>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.02"
                disabled={locked}
                value={faders[idx]}
                onChange={(e) => {
                  const next = [...faders];
                  next[idx] = parseFloat(e.target.value);
                  setFaders(next);
                }}
                style={{
                  width: '100%',
                  accentColor: locked ? '#71717a' : '#ff6b6b',
                  cursor: locked ? 'not-allowed' : 'pointer'
                }}
              />
              <div style={{ fontSize: '0.68rem', color: locked ? '#fda4af' : '#a1a1aa', marginTop: '6px', fontFamily: 'monospace' }}>
                {locked ? 'COMMITTED IN BOUNCE' : `${Math.round(faders[idx] * 100)}% LEVEL`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Geoff Emerick Treble Pre-Emphasis Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          backgroundColor: '#0f0b0c',
          borderRadius: '8px',
          border: '1px solid #4c1d24'
        }}
      >
        <div style={{ fontSize: '0.79rem', color: '#e2c6cb' }}>
          <strong>Geoff Emerick REDD.51 Pre-Emphasis Trick:</strong> Boost +6.5 dB @ 6.5 kHz <em>before</em> bouncing to compensate for cumulative multi-generation oxide treble loss ({spec.label}).
        </div>
        <button
          onClick={() => setTreblePreBoost(!treblePreBoost)}
          style={{
            backgroundColor: treblePreBoost ? '#22c55e' : '#27272a',
            color: treblePreBoost ? '#09090b' : '#e4e4e7',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontWeight: 800,
            fontSize: '0.76rem',
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: '12px'
          }}
        >
          {treblePreBoost ? 'HF PRE-BOOST ON' : 'HF PRE-BOOST OFF'}
        </button>
      </div>
    </div>
  );
}
