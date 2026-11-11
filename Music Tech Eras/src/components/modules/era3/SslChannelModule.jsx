import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Repeat, Monitor } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { ProceduralStemGenerator } from '../../../audio/Procedural80sStems';
import { FlangeStemGenerator } from '../../../audio/FlangeStemGenerator';
import RotaryKnob from '../../common/RotaryKnob';
import VUMeter from '../../common/VUMeter';

const RECALL_TARGET = {
  lfDb: 4.5,
  lmfDb: -3.5,
  hmfDb: 5.0,
  hfDb: 3.5,
  busRatio: 4
};

export default function SslChannelModule() {
  const [flipActive, setFlipActive] = useState(false); // false = Tracking (Mic->Channel, Tape->Monitor); true = Mixdown Flip!
  const [lfDb, setLfDb] = useState(3.0);
  const [lmfDb, setLmfDb] = useState(-2.0);
  const [hmfDb, setHmfDb] = useState(4.0);
  const [hfDb, setHfDb] = useState(2.5);
  const [vcaFader, setVcaFader] = useState(0.88);
  const [busRatio, setBusRatio] = useState(4);
  const [busThresh, setBusThresh] = useState(-16);
  const [showRecallCrt, setShowRecallCrt] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [busGr, setBusGr] = useState(0);

  const audioRef = useRef(null);
  const sourcesRef = useRef([]);
  const rafRef = useRef(null);

  const initConsole = () => {
    const ctx = getSharedAudioContext();
    if (audioRef.current) return { ctx, ...audioRef.current };

    const drums = ProceduralStemGenerator.create80sDrumStem(ctx);
    const bass = FlangeStemGenerator.createBassStem(ctx);
    const keys = FlangeStemGenerator.createKeysStem(ctx);

    const inputBus = ctx.createGain();

    // 4000 E Brown-Knob 4-Band EQ
    const lfShelf = ctx.createBiquadFilter();
    lfShelf.type = 'lowshelf';
    lfShelf.frequency.value = 85;

    const lmfBell = ctx.createBiquadFilter();
    lmfBell.type = 'peaking';
    lmfBell.frequency.value = 320;
    lmfBell.Q.value = 1.4;

    const hmfBell = ctx.createBiquadFilter();
    hmfBell.type = 'peaking';
    hmfBell.frequency.value = 3200;
    hmfBell.Q.value = 1.6;

    const hfShelf = ctx.createBiquadFilter();
    hfShelf.type = 'highshelf';
    hfShelf.frequency.value = 8500;

    // dbx 202 VCA Channel Fader
    const vcaGain = ctx.createGain();

    // Quad-VCA Master Bus "Glue" Compressor
    const quadBusComp = ctx.createDynamicsCompressor();
    quadBusComp.attack.value = 0.030; // Classic 30ms punchy SSL slow attack!
    quadBusComp.release.value = 0.12;
    quadBusComp.knee.value = 6;

    const makeup = ctx.createGain();
    makeup.gain.value = 1.35;

    inputBus.connect(lfShelf);
    lfShelf.connect(lmfBell);
    lmfBell.connect(hmfBell);
    hmfBell.connect(hfShelf);
    hfShelf.connect(vcaGain);
    vcaGain.connect(quadBusComp);
    quadBusComp.connect(makeup);
    makeup.connect(ctx.destination);

    audioRef.current = { drums, bass, keys, inputBus, lfShelf, lmfBell, hmfBell, hfShelf, vcaGain, quadBusComp };
    return { ctx, ...audioRef.current };
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const { lfShelf, lmfBell, hmfBell, hfShelf, vcaGain, quadBusComp } = audioRef.current;
    const now = lfShelf.context.currentTime;

    // When FLIP is off (Tracking), EQ sits in Small Fader path unless routed; when FLIP is on (Mixdown), Tape feeds Large VCA Fader + EQ!
    const eqScale = flipActive ? 1.0 : 0.45;
    lfShelf.gain.setTargetAtTime(lfDb * eqScale, now, 0.02);
    lmfBell.gain.setTargetAtTime(lmfDb * eqScale, now, 0.02);
    hmfBell.gain.setTargetAtTime(hmfDb * eqScale, now, 0.02);
    hfShelf.gain.setTargetAtTime(hfDb * eqScale, now, 0.02);

    vcaGain.gain.setTargetAtTime(vcaFader, now, 0.02);
    quadBusComp.ratio.setValueAtTime(busRatio, now);
    quadBusComp.threshold.setTargetAtTime(busThresh, now, 0.02);
  }, [flipActive, lfDb, lmfDb, hmfDb, hfDb, vcaFader, busRatio, busThresh]);

  const stopPlayback = () => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch (_) {}
    });
    sourcesRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setBusGr(0);
    setIsPlaying((p) => {
      if (p) notifyPlayingChange(false);
      return false;
    });
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    const { ctx, drums, bass, keys, inputBus, quadBusComp } = initConsole();
    const now = ctx.currentTime + 0.02;
    sourcesRef.current = [drums, bass, keys].map((buf, idx) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.85 : 0.45;
      s.connect(g);
      g.connect(inputBus);
      s.start(now);
      return s;
    });

    const pollGr = () => {
      setBusGr(Math.abs(quadBusComp.reduction || 0));
      rafRef.current = requestAnimationFrame(pollGr);
    };
    rafRef.current = requestAnimationFrame(pollGr);

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

  const recallMatched =
    Math.abs(lfDb - RECALL_TARGET.lfDb) <= 0.5 &&
    Math.abs(lmfDb - RECALL_TARGET.lmfDb) <= 0.5 &&
    Math.abs(hmfDb - RECALL_TARGET.hmfDb) <= 0.5 &&
    Math.abs(hfDb - RECALL_TARGET.hfDb) <= 0.5;

  return (
    <div
      style={{
        backgroundColor: '#1a202c',
        borderRadius: '12px',
        border: '3px solid #334155',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.75)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '1.4px' }}>
            SOLID STATE LOGIC OXFORD • SL 4000 E SERIES
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f8fafc', fontSize: '1.18rem', fontWeight: 800 }}>
            IN-LINE CHANNEL STRIP, TOTAL RECALL &amp; QUAD VCA BUS
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRecallCrt(!showRecallCrt)}
            style={{
              backgroundColor: showRecallCrt ? '#22c55e' : '#0f172a',
              color: showRecallCrt ? '#09090b' : '#bae6fd',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              padding: '7px 12px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Monitor size={14} />
            <span>{showRecallCrt ? 'HIDE TOTAL RECALL CRT' : 'TOTAL RECALL CRT'}</span>
          </button>

          <button
            onClick={togglePlay}
            style={{
              backgroundColor: isPlaying ? '#dc2626' : '#38bdf8',
              color: isPlaying ? '#fff' : '#09090b',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span>{isPlaying ? 'STOP MIX BUS' : 'PLAY MULTITRACK BUS'}</span>
          </button>
        </div>
      </div>

      {/* In-Line Architecture FLIP Routing Diagram */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
          <div style={{ fontWeight: 800, color: flipActive ? '#4ade80' : '#fcd34d', marginBottom: '2px' }}>
            {flipActive
              ? 'MIXDOWN MODE (FLIP ENGAGED): 24-Track Tape Return → Brown EQ → Large VCA Fader → Quad Mix Bus'
              : 'TRACKING MODE (NORMAL): Live Mic → Small Fader → Multitrack Record | Tape Return → Monitor Mix'}
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.73rem' }}>
            In-line consoles house both paths in a single vertical strip—eliminating bulky split monitor desks.
          </span>
        </div>

        <button
          onClick={() => setFlipActive(!flipActive)}
          style={{
            backgroundColor: flipActive ? '#ef4444' : '#334155',
            color: '#fff',
            border: '2px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 14px',
            fontWeight: 800,
            fontSize: '0.76rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Repeat size={14} />
          <span>FLIP ({flipActive ? 'MIXDOWN' : 'TRACKING'})</span>
        </button>
      </div>

      {/* Optional Total Recall 8-Bit CRT Computer Overlay */}
      {showRecallCrt && (
        <div
          style={{
            backgroundColor: '#04120a',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '14px',
            fontFamily: '"JetBrains Mono", monospace'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: '0.76rem', fontWeight: 800, marginBottom: '8px' }}>
            <span>SSL TOTAL RECALL COMPUTER (MANUAL POTENTIOMETER NULLING)</span>
            <span>{recallMatched ? '★ ALL POTS NULLED & MATCHED!' : 'TURN EQ KNOBS TO MATCH STORED TARGETS'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.72rem' }}>
            {[
              { name: 'LF 85Hz', cur: lfDb, tgt: RECALL_TARGET.lfDb },
              { name: 'LMF 320Hz', cur: lmfDb, tgt: RECALL_TARGET.lmfDb },
              { name: 'HMF 3.2kHz', cur: hmfDb, tgt: RECALL_TARGET.hmfDb },
              { name: 'HF 8.5kHz', cur: hfDb, tgt: RECALL_TARGET.hfDb }
            ].map((item) => {
              const ok = Math.abs(item.cur - item.tgt) <= 0.5;
              return (
                <div key={item.name} style={{ backgroundColor: '#072213', padding: '6px 8px', borderRadius: '4px', border: `1px solid ${ok ? '#4ade80' : '#f59e0b'}` }}>
                  <div style={{ color: '#86efac' }}>{item.name}</div>
                  <div style={{ color: ok ? '#4ade80' : '#fcd34d' }}>
                    Cur: {item.cur.toFixed(1)} / Tgt: {item.tgt.toFixed(1)} dB
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel EQ + VCA Fader + Quad VCA Bus Compressor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '14px' }}>
        {/* Left: Brown-Knob 242 EQ + VCA Fader */}
        <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '12px' }}>
            4000 E &quot;BROWN KNOB&quot; 4-BAND EQ &amp; dbx VCA FADER
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            <RotaryKnob label="LF 85Hz" value={lfDb} min={-12} max={12} step={0.5} defaultValue={0} unit="dB" accent="#a16207" size={46} onChange={setLfDb} />
            <RotaryKnob label="LMF 320" value={lmfDb} min={-12} max={12} step={0.5} defaultValue={0} unit="dB" accent="#a16207" size={46} onChange={setLmfDb} />
            <RotaryKnob label="HMF 3.2k" value={hmfDb} min={-12} max={12} step={0.5} defaultValue={0} unit="dB" accent="#22c55e" size={46} onChange={setHmfDb} />
            <RotaryKnob label="HF 8.5k" value={hfDb} min={-12} max={12} step={0.5} defaultValue={0} unit="dB" accent="#ef4444" size={46} onChange={setHfDb} />
            <RotaryKnob label="VCA Fader" value={vcaFader} min={0} max={1.25} step={0.05} defaultValue={0.88} accent="#38bdf8" size={46} onChange={setVcaFader} formatValue={(v) => `${Math.round(v * 100)}%`} />
          </div>
        </div>

        {/* Right: Quad-VCA Master Bus Glue Compressor */}
        <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>
            QUAD-VCA MASTER BUS COMPRESSOR
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <VUMeter mode="gr" label="BUS GLUE GR" value={busGr} width={145} height={88} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <RotaryKnob label="Threshold" value={busThresh} min={-32} max={0} step={1} defaultValue={-16} unit="dB" accent="#38bdf8" size={44} onChange={setBusThresh} />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[2, 4, 10].map((r) => (
                  <button
                    key={r}
                    onClick={() => setBusRatio(r)}
                    style={{
                      padding: '4px 7px',
                      borderRadius: '4px',
                      border: busRatio === r ? '1px solid #38bdf8' : '1px solid #475569',
                      backgroundColor: busRatio === r ? 'rgba(56,189,248,0.2)' : '#1e293b',
                      color: '#f8fafc',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {r}:1
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
