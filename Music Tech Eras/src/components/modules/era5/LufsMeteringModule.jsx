import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { ProceduralStemGenerator } from '../../../audio/Procedural80sStems';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';

export default function LufsMeteringModule() {
  const [limiterDriveDb, setLimiterDriveDb] = useState(0); // 0 dB = Dynamic -14 LUFS; 12 dB = Crushed -5.5 LUFS
  const [streamingNormalize, setStreamingNormalize] = useState(true); // -14 LUFS Spotify/YouTube penalty!
  const [auditionKWeighting, setAuditionKWeighting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meters, setMeters] = useState({ lufs: -14.0, truePeakDb: -1.0, crestDb: 13.0, penaltyDb: 0.0 });

  const audioRef = useRef(null);
  const sourcesRef = useRef([]);
  const canvasRef = useRef(null);

  const initAudio = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const drums = ProceduralStemGenerator.create80sDrumStem(ctx);
    const bass = FlangeStemGenerator.createBassStem(ctx);

    const preDrive = ctx.createGain();

    // Brickwall Maximizer Waveshaper + Fast Limiter
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 512) - 1;
      curve[i] = Math.tanh(x * 1.45);
    }
    shaper.curve = curve;

    const brickwall = ctx.createDynamicsCompressor();
    brickwall.threshold.value = -1.2;
    brickwall.ratio.value = 20;
    brickwall.attack.value = 0.001;
    brickwall.release.value = 0.05;

    // ITU-R BS.1770 K-Weighting Filter Stage 1 (+4dB >1.5kHz head acoustic shelf) & Stage 2 (<100Hz RLB HPF)
    const kShelf = ctx.createBiquadFilter();
    kShelf.type = 'highshelf';
    kShelf.frequency.value = 1500;
    kShelf.gain.value = 0;

    const kRlbHpf = ctx.createBiquadFilter();
    kRlbHpf.type = 'highpass';
    kRlbHpf.frequency.value = 20;

    const platformPenaltyGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    preDrive.connect(shaper);
    shaper.connect(brickwall);
    brickwall.connect(platformPenaltyGain);
    platformPenaltyGain.connect(kShelf);
    kShelf.connect(kRlbHpf);
    kRlbHpf.connect(analyser);
    analyser.connect(ctx.destination);

    audioRef.current = { drums, bass, preDrive, platformPenaltyGain, kShelf, kRlbHpf, analyser };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    const estIntegratedLufs = -14.0 + limiterDriveDb * 0.72; // 0dB -> -14.0 LUFS; +12dB -> -5.4 LUFS
    const penaltyDb = streamingNormalize ? Math.min(0, -14.0 - estIntegratedLufs) : 0;
    const truePeak = limiterDriveDb > 8 ? +0.4 : -1.0 + limiterDriveDb * 0.08;
    const crest = Math.max(3.5, 13.5 - limiterDriveDb * 0.8);

    setMeters({
      lufs: estIntegratedLufs,
      truePeakDb: truePeak,
      crestDb: crest,
      penaltyDb
    });

    if (!audioRef.current) return;
    const { preDrive, platformPenaltyGain, kShelf, kRlbHpf } = audioRef.current;
    const now = preDrive.context.currentTime;

    preDrive.gain.setTargetAtTime(Math.pow(10, limiterDriveDb / 20), now, 0.02);
    platformPenaltyGain.gain.setTargetAtTime(Math.pow(10, penaltyDb / 20), now, 0.02);
    kShelf.gain.setTargetAtTime(auditionKWeighting ? 4.0 : 0.0, now, 0.02);
    kRlbHpf.frequency.setTargetAtTime(auditionKWeighting ? 100 : 20, now, 0.02);
  }, [limiterDriveDb, streamingNormalize, auditionKWeighting]);

  // Dynamic Transient vs Crushed "Sausage" Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const buf = new Float32Array(1024);
    let raf = null;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#070f0d';
      ctx.fillRect(0, 0, w, h);

      // -14 LUFS Target Line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.25);
      ctx.lineTo(w, h * 0.25);
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(w, h * 0.75);
      ctx.stroke();
      ctx.setLineDash([]);

      if (audioRef.current?.analyser && isPlaying) {
        audioRef.current.analyser.getFloatTimeDomainData(buf);
        ctx.strokeStyle = limiterDriveDb > 7 ? '#f43f5e' : '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 512; i++) {
          const x = (i / 511) * w;
          const y = h * 0.5 - buf[i] * (h * 0.45);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#d1fae5';
      ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
      ctx.fillText(
        streamingNormalize
          ? `SPOTIFY -14 LUFS NORMALISATION ON → GAIN PENALTY: ${meters.penaltyDb.toFixed(1)} dB`
          : 'RAW UN-NORMALISED CD / CLUB OUTPUT (LOUDNESS BIAS ACTIVE!)',
        12,
        17
      );

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, limiterDriveDb, streamingNormalize, meters.penaltyDb]);

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
    const { ctx, drums, bass, preDrive } = initAudio();
    const now = ctx.currentTime + 0.02;
    sourcesRef.current = [drums, bass].map((b, i) => {
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.85 : 0.55;
      s.connect(g);
      g.connect(preDrive);
      s.start(now);
      return s;
    });
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

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #0b1512 0%, #090d11 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(16, 185, 129, 0.45)',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, letterSpacing: '1.4px' }}>
            ITU-R BS.1770-4 / EBU R128 STREAMING MASTERING SUITE
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#ecfdf5', fontSize: '1.18rem', fontWeight: 800 }}>
            LUFS LOUDNESS METERING &amp; STREAMING PENALTY LAB
          </h3>
        </div>

        <button
          onClick={togglePlay}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#10b981',
            color: isPlaying ? '#fff' : '#052e16',
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
          <span>{isPlaying ? 'STOP MASTER BUS' : 'AUDITION MASTER'}</span>
        </button>
      </div>

      {/* 4 Telemetry Readout Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'INTEGRATED LUFS', val: `${meters.lufs.toFixed(1)} LUFS`, color: meters.lufs > -9 ? '#f43f5e' : '#10b981' },
          { label: 'TRUE PEAK (4× ISP)', val: `${meters.truePeakDb > 0 ? '+' : ''}${meters.truePeakDb.toFixed(1)} dBTP`, color: meters.truePeakDb > -1 ? '#ef4444' : '#38bdf8' },
          { label: 'CREST FACTOR (PLR)', val: `${meters.crestDb.toFixed(1)} dB`, color: '#f59e0b' },
          { label: 'PLATFORM PENALTY', val: `${meters.penaltyDb.toFixed(1)} dB`, color: '#c084fc' }
        ].map((m) => (
          <div key={m.label} style={{ backgroundColor: '#09100e', padding: '10px', borderRadius: '8px', border: '1px solid #1f2937', textAlign: 'center' }}>
            <div style={{ fontSize: '0.63rem', color: '#9ca3af', fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.color, fontFamily: '"JetBrains Mono", monospace', marginTop: '3px' }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Waveform Scope */}
      <canvas
        ref={canvasRef}
        width={620}
        height={135}
        style={{
          width: '100%',
          height: '135px',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Quick A/B Master Presets + Limiter Drive */}
      <div style={{ backgroundColor: '#09100e', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d1fae5' }}>
            BRICKWALL MAXIMIZER PUSH: +{limiterDriveDb.toFixed(1)} dB
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setLimiterDriveDb(0)}
              style={{ backgroundColor: '#064e3b', color: '#6ee7b7', border: '1px solid #10b981', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Dynamic Master (-14 LUFS)
            </button>
            <button
              onClick={() => setLimiterDriveDb(12)}
              style={{ backgroundColor: '#4c0519', color: '#fda4af', border: '1px solid #f43f5e', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              2005 Loudness War (-5.4 LUFS)
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="13"
          step="0.5"
          value={limiterDriveDb}
          onChange={(e) => setLimiterDriveDb(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#10b981' }}
        />
      </div>

      {/* Normalisation & K-Weighting Filter Audition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          onClick={() => setStreamingNormalize(!streamingNormalize)}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: streamingNormalize ? '1px solid #10b981' : '1px solid #4b5563',
            backgroundColor: streamingNormalize ? 'rgba(16,185,129,0.2)' : '#111827',
            color: '#ecfdf5',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          SPOTIFY -14 LUFS MATCH: {streamingNormalize ? 'ON (FAIR PUNCH A/B)' : 'OFF (LOUDER WINS)'}
        </button>

        <button
          onClick={() => setAuditionKWeighting(!auditionKWeighting)}
          style={{
            padding: '10px',
            borderRadius: '6px',
            border: auditionKWeighting ? '1px solid #38bdf8' : '1px solid #4b5563',
            backgroundColor: auditionKWeighting ? 'rgba(56,189,248,0.2)' : '#111827',
            color: '#ecfdf5',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          AUDITION K-WEIGHTING CURVE: {auditionKWeighting ? 'ON (+4dB >1.5k + HPF)' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
