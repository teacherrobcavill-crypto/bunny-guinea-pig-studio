import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';

const VOICES = [
  { id: 'kick', name: '808 Sub Kick', midiHex: '24', color: '#ef4444' },
  { id: 'snare', name: '909 Snare', midiHex: '26', color: '#f97316' },
  { id: 'clap', name: '808 Handclap', midiHex: '27', color: '#eab308' },
  { id: 'ch', name: 'Closed Hat', midiHex: '2A', color: '#22c55e' },
  { id: 'oh', name: 'Open Hat', midiHex: '2E', color: '#38bdf8' },
  { id: 'cow', name: '808 Cowbell', midiHex: '38', color: '#c084fc' }
];

const PATTERNS = {
  electro82: {
    name: '1982 Planet Rock Electro',
    bpm: 126,
    swing: 50,
    grid: [
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]
    ]
  },
  house88: {
    name: '1988 Chicago 909 Jack',
    bpm: 124,
    swing: 57,
    grid: [
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
  },
  mpc93: {
    name: '1993 MPC60 Boom-Bap (65% Swing)',
    bpm: 94,
    swing: 65,
    grid: [
      [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
  }
};

export default function StepSequencerModule() {
  const [grid, setGrid] = useState(PATTERNS.electro82.grid);
  const [bpm, setBpm] = useState(124);
  const [swingPct, setSwingPct] = useState(54);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [midiLog, setMidiLog] = useState(['99 24 7F  [Ch.10 Kick Vel:127]']);

  const timerRef = useRef(null);
  const openHatGainRef = useRef(null);
  const stateRef = useRef({ grid, bpm, swingPct });
  stateRef.current = { grid, bpm, swingPct };

  const synthDrumVoice = (ctx, voiceId, accent = false) => {
    const now = ctx.currentTime;
    const vel = accent ? 1.0 : 0.78;

    if (voiceId === 'kick') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(46, now + 0.09);
      g.gain.setValueAtTime(0.85 * vel, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (voiceId === 'snare') {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.08);
      og.gain.setValueAtTime(0.45 * vel, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(og);
      og.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      const len = Math.floor(ctx.sampleRate * 0.2);
      const nb = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-(i / ctx.sampleRate) * 18);
      const ns = ctx.createBufferSource();
      ns.buffer = nb;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      ns.connect(hp);
      hp.connect(ctx.destination);
      ns.start(now);
    } else if (voiceId === 'clap') {
      // 808 multi-burst filtered noise clap
      const len = Math.floor(ctx.sampleRate * 0.22);
      const nb = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const burst = t < 0.03 ? ((Math.floor(t / 0.01) % 2 === 0) ? 1 : 0.2) : Math.exp(-(t - 0.03) * 16);
        d[i] = (Math.random() * 2 - 1) * burst * 0.45;
      }
      const ns = ctx.createBufferSource();
      ns.buffer = nb;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1150;
      ns.connect(bp);
      bp.connect(ctx.destination);
      ns.start(now);
    } else if (voiceId === 'ch' || voiceId === 'oh') {
      // Closed Hat chokes Open Hat!
      if (voiceId === 'ch' && openHatGainRef.current) {
        try {
          openHatGainRef.current.gain.setTargetAtTime(0.0001, now, 0.005);
        } catch (_) {}
      }
      const dur = voiceId === 'oh' ? 0.34 : 0.065;
      const len = Math.floor(ctx.sampleRate * dur);
      const nb = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * (voiceId === 'oh' ? 9 : 48)) * 0.32;
      }
      const ns = ctx.createBufferSource();
      ns.buffer = nb;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6800;
      const g = ctx.createGain();
      g.gain.value = 0.85;
      if (voiceId === 'oh') openHatGainRef.current = g;
      ns.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      ns.start(now);
    } else if (voiceId === 'cow') {
      // Classic 808 dual non-harmonic square oscillators (540 Hz + 800 Hz)
      [540, 800].forEach((f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.16, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now);
        o.stop(now + 0.2);
      });
    }
  };

  const stopSequencer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentStep(-1);
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const startSequencer = () => {
    const ctx = getSharedAudioContext();
    let step = 0;
    setIsPlaying(true);
    notifyPlayingChange(true);

    const advance = () => {
      const { grid: g, bpm: curBpm, swingPct: curSwing } = stateRef.current;
      setCurrentStep(step);

      const newBytes = [];
      VOICES.forEach((v, rIdx) => {
        const cell = g[rIdx][step];
        if (cell > 0) {
          synthDrumVoice(ctx, v.id, cell === 2);
          const velHex = cell === 2 ? '7F' : '64';
          newBytes.push(`99 ${v.midiHex} ${velHex}  [${v.name}]`);
        }
      });

      if (newBytes.length > 0) {
        setMidiLog((prev) => [...newBytes, ...prev].slice(0, 5));
      }

      // Calculate Roger Linn / MPC Swing delay for next 16th step:
      // Base eighth note = (60 / BPM) / 2. First 16th gets swingPct%, second 16th gets (100 - swingPct)%!
      const eighthMs = ((60 / curBpm) * 0.5) * 1000;
      const isEvenStep = step % 2 === 0;
      const stepDurationMs = isEvenStep
        ? eighthMs * (curSwing / 100)
        : eighthMs * ((100 - curSwing) / 100);

      step = (step + 1) % 16;
      timerRef.current = setTimeout(advance, stepDurationMs);
    };

    advance();
  };

  useEffect(() => {
    const unsub = registerStopCallback(() => stopSequencer());
    return () => {
      unsub();
      stopSequencer();
    };
  }, []);

  const toggleCell = (rIdx, cIdx) => {
    setGrid((prev) =>
      prev.map((row, r) =>
        r === rIdx ? row.map((val, c) => (c === cIdx ? (val + 1) % 3 : val)) : row
      )
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#150f24',
        borderRadius: '12px',
        border: '2px solid #581c87',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700, letterSpacing: '1.4px' }}>
            ROLAND TR-808/909 + AKAI MPC60 SWING + MIDI DIN-5 (31.25 KBAUD)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#faf5ff', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.12rem' }}>
            16-STEP DRUM MATRIX &amp; MIDI HEX MONITOR
          </h3>
        </div>

        <button
          onClick={() => (isPlaying ? stopSequencer() : startSequencer())}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#a855f7',
            color: '#fff',
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
          <span>{isPlaying ? 'STOP SEQUENCER' : 'START RUN/CLOCK'}</span>
        </button>
      </div>

      {/* Classic Pattern Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {Object.values(PATTERNS).map((pat) => (
          <button
            key={pat.name}
            onClick={() => {
              setGrid(pat.grid);
              setBpm(pat.bpm);
              setSwingPct(pat.swing);
            }}
            style={{
              backgroundColor: '#0c0814',
              border: '1px solid #6b21a8',
              color: '#e9d5ff',
              fontSize: '0.73rem',
              padding: '5px 10px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {pat.name}
          </button>
        ))}
      </div>

      {/* 6 x 16 Step Button Matrix (Click once = Normal, Click twice = Accent!) */}
      <div style={{ backgroundColor: '#0c0814', padding: '12px', borderRadius: '8px', border: '1px solid #4c1d95', marginBottom: '14px' }}>
        {VOICES.map((v, rIdx) => (
          <div
            key={v.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '106px repeat(16, 1fr)',
              gap: '4px',
              alignItems: 'center',
              marginBottom: rIdx === VOICES.length - 1 ? 0 : '6px'
            }}
          >
            <span style={{ fontSize: '0.71rem', fontWeight: 700, color: v.color, fontFamily: 'monospace' }}>
              {v.name}
            </span>
            {grid[rIdx].map((val, cIdx) => {
              const isStepHead = currentStep === cIdx;
              return (
                <button
                  key={cIdx}
                  onClick={() => toggleCell(rIdx, cIdx)}
                  style={{
                    height: '24px',
                    borderRadius: '4px',
                    border: isStepHead ? '2px solid #fff' : cIdx % 4 === 0 ? '1px solid #6b21a8' : '1px solid #27272a',
                    backgroundColor:
                      val === 2
                        ? '#facc15'
                        : val === 1
                          ? v.color
                          : cIdx % 4 === 0
                            ? '#1e1433'
                            : '#120c1f',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title={`Step ${cIdx + 1} (${val === 2 ? 'Accent 127' : val === 1 ? 'On 100' : 'Off'})`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tempo, Roger Linn Swing & Live MIDI 1.0 Hex Monitor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '10px' }}>
        <div style={{ backgroundColor: '#0c0814', padding: '10px', borderRadius: '8px', border: '1px solid #4c1d95' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: '#d8b4fe', fontWeight: 700 }}>TEMPO CLOCK</span>
            <span style={{ color: '#faf5ff', fontFamily: 'monospace' }}>{bpm} BPM</span>
          </div>
          <input type="range" min="80" max="150" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: '100%', accentColor: '#a855f7' }} />
        </div>

        <div style={{ backgroundColor: '#0c0814', padding: '10px', borderRadius: '8px', border: '1px solid #4c1d95' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: '#d8b4fe', fontWeight: 700 }}>MPC 16TH SWING</span>
            <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{swingPct}%</span>
          </div>
          <input type="range" min="50" max="72" value={swingPct} onChange={(e) => setSwingPct(Number(e.target.value))} style={{ width: '100%', accentColor: '#22c55e' }} />
        </div>

        <div style={{ backgroundColor: '#050308', padding: '8px 10px', borderRadius: '8px', border: '1px solid #581c87', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.66rem', color: '#4ade80' }}>
          <div style={{ color: '#a855f7', fontWeight: 800, marginBottom: '3px' }}>MIDI 1.0 DIN-5 STREAM (Ch.10):</div>
          {midiLog.slice(0, 3).map((line, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.28 }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
