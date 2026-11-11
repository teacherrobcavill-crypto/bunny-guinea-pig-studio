import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Sparkles, Info, Zap } from 'lucide-react';
import {
  ensureAudioWorklets,
  isWorkletReady,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { StemGenerator } from '../../../audio/StemGenerator1950s';
import VUMeter from '../../common/VUMeter';

const PRESETS = [
  { name: '1954 Elvis Sun Vocal (130ms)', speed: 15, dist: 1.95, fb: 0.0, mix: 0.48, drive: 4, stem: 3 },
  { name: 'Scotty Moore Archtop (115ms)', speed: 15, dist: 1.72, fb: 0.16, mix: 0.45, drive: 6, stem: 1 },
  { name: '7.5 IPS Lo-Fi Dark Slap (260ms)', speed: 7.5, dist: 1.95, fb: 0.12, mix: 0.52, drive: 9, stem: 3 },
  { name: 'Runaway Feedback Oscillation', speed: 15, dist: 2.25, fb: 0.68, mix: 0.58, drive: 11, stem: 2 }
];

const GUIDES = {
  speed: {
    title: 'Capstan Tape Speed (15 ips vs 7.5 ips)',
    text: 'Halving the capstan speed from 15 ips to 7.5 ips doubles the travel time between Record and Repro heads while darkening high-frequency treble response due to magnetic wavelength crowding.'
  },
  distance: {
    title: 'Record-to-Repro Head Spacing (Inches)',
    text: 'Delay = Distance ÷ Speed. On an Ampex 350 at 15 ips, 1.95 inches yields a crisp 130 ms single slap that sits right behind consonants without smearing rhythm.'
  },
  drive: {
    title: 'Ampex 350 Tube & Ferric Oxide Saturation',
    text: 'Pushing input drive saturates magnetic domains on ferric oxide tape, rounding sharp transients with warm 3rd-harmonic compression.'
  },
  feedback: {
    title: 'Echo Return-to-Record Regeneration',
    text: 'Sam Phillips kept regeneration at 0% for a single distinct slapback. Raising feedback feeds the Repro output back into the Record head, creating decaying multi-tap echoes.'
  }
};

export default function SlapbackModule() {
  const [tapeSpeed, setTapeSpeed] = useState(15);
  const [headDistance, setHeadDistance] = useState(1.95);
  const [feedback, setFeedback] = useState(0.08);
  const [mix, setMix] = useState(0.5);
  const [driveDb, setDriveDb] = useState(5);
  const [stemIdx, setStemIdx] = useState(3); // 0=Bass, 1=Guitar, 2=Drums, 3=Vocal
  const [isPlaying, setIsPlaying] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [hoverKey, setHoverKey] = useState(null);

  const nodesRef = useRef(null);
  const stemGenRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const rafRef = useRef(null);

  const delaySec = headDistance / tapeSpeed;
  const delayMs = Math.round(delaySec * 1000);

  const buildGraph = async () => {
    const ctx = await ensureAudioWorklets();
    if (nodesRef.current) return { ctx, ...nodesRef.current };

    const stemGen = new StemGenerator(ctx);
    stemGenRef.current = stemGen;

    const inputGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const delayNode = ctx.createDelay(2.0);
    const fbGain = ctx.createGain();
    const hfLossFilter = ctx.createBiquadFilter();
    hfLossFilter.type = 'lowpass';
    hfLossFilter.frequency.value = 9000;

    const headBumpFilter = ctx.createBiquadFilter();
    headBumpFilter.type = 'peaking';
    headBumpFilter.frequency.value = 110;
    headBumpFilter.Q.value = 1.4;
    headBumpFilter.gain.value = 3.2;

    let tapeNode = null;
    if (isWorkletReady('tape-machine-processor')) {
      tapeNode = new AudioWorkletNode(ctx, 'tape-machine-processor');
    } else {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 512) - 1;
        curve[i] = Math.tanh(x * 1.8);
      }
      shaper.curve = curve;
      tapeNode = shaper;
    }

    const masterSum = ctx.createGain();
    masterSum.gain.value = 0.88;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;

    // Dry path
    inputGain.connect(dryGain);
    dryGain.connect(masterSum);

    // Wet slapback tape loop
    inputGain.connect(tapeNode);
    tapeNode.connect(delayNode);
    delayNode.connect(headBumpFilter);
    headBumpFilter.connect(hfLossFilter);
    hfLossFilter.connect(wetGain);
    wetGain.connect(masterSum);

    // Feedback regeneration loop
    hfLossFilter.connect(fbGain);
    fbGain.connect(delayNode);

    masterSum.connect(analyser);
    analyser.connect(ctx.destination);

    nodesRef.current = {
      inputGain,
      dryGain,
      wetGain,
      delayNode,
      fbGain,
      hfLossFilter,
      headBumpFilter,
      tapeNode,
      analyser
    };
    return { ctx, ...nodesRef.current };
  };

  // Live parameter updates
  useEffect(() => {
    if (!nodesRef.current) return;
    const { delayNode, fbGain, dryGain, wetGain, hfLossFilter, headBumpFilter, tapeNode } = nodesRef.current;
    const ctx = delayNode.context;
    const now = ctx.currentTime;

    delayNode.delayTime.setTargetAtTime(headDistance / tapeSpeed, now, 0.025);
    fbGain.gain.setTargetAtTime(feedback, now, 0.02);
    dryGain.gain.setTargetAtTime(1 - mix * 0.45, now, 0.02);
    wetGain.gain.setTargetAtTime(mix, now, 0.02);
    hfLossFilter.frequency.setTargetAtTime(tapeSpeed === 15 ? 9200 : 4800, now, 0.03);
    headBumpFilter.frequency.setTargetAtTime(tapeSpeed === 15 ? 115 : 62, now, 0.03);

    if (tapeNode && tapeNode.parameters) {
      tapeNode.parameters.get('tapeSpeed')?.setValueAtTime(tapeSpeed === 15 ? 1 : 0, now);
      tapeNode.parameters.get('recordDriveDb')?.setTargetAtTime(driveDb, now, 0.02);
      tapeNode.parameters.get('wowFlutter')?.setTargetAtTime(0.28, now, 0.02);
      tapeNode.parameters.get('hissLevel')?.setTargetAtTime(0.18, now, 0.02);
    }
  }, [tapeSpeed, headDistance, feedback, mix, driveDb]);

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setVuLevel(0);
    setIsPlaying((prev) => {
      if (prev) notifyPlayingChange(false);
      return false;
    });
  };

  const startLoop = async (targetStem = stemIdx) => {
    const { ctx, inputGain, analyser } = await buildGraph();
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (_) {}
    }

    const buf = stemGenRef.current.syntheticBuffers[targetStem];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(inputGain);
    src.start();
    sourceNodeRef.current = src;

    if (!isPlaying) {
      setIsPlaying(true);
      notifyPlayingChange(true);
    }

    const timeBuf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(timeBuf);
      let sum = 0;
      for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
      setVuLevel(Math.sqrt(sum / timeBuf.length));
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const triggerOneShotTransient = async () => {
    const { ctx, inputGain } = await buildGraph();
    const now = ctx.currentTime;

    // Punchy rockabilly E7 guitar chord + slap transient so single echo repeat is unmistakable
    [164.81, 207.65, 246.94, 293.66, 329.63].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.012);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.18, now + idx * 0.012 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.connect(g);
      g.connect(inputGain);
      osc.start(now + idx * 0.012);
      osc.stop(now + 0.25);
    });
  };

  useEffect(() => {
    const unsub = registerStopCallback(() => stopPlayback());
    return () => {
      unsub();
      stopPlayback();
    };
  }, []);

  const stemNames = ['Slap Upright Bass', 'Scotty Archtop Guitar', 'Calfskin Drum Kit', 'Sun Crooner Vocal'];

  return (
    <div
      style={{
        backgroundColor: '#1b1815',
        borderRadius: '12px',
        border: '2px solid #45392d',
        padding: '24px',
        boxShadow: '0 16px 36px rgba(0,0,0,0.65)'
      }}
    >
      {/* Top Hardware Faceplate */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #382e24',
          paddingBottom: '14px',
          marginBottom: '18px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#d4af37', fontWeight: 700, letterSpacing: '1.5px' }}>
            MEMPHIS RECORDING SERVICE • 706 UNION AVE
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f3e5ab', fontFamily: '"Courier Prime", monospace', fontSize: '1.15rem' }}>
            AMPEX MODEL 350 SLAPBACK ECHO DECK
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <VUMeter mode="vu" label="REPRO OUT" value={vuLevel} width={165} height={92} />
          <div
            style={{
              backgroundColor: '#09090b',
              border: '1px solid #54422e',
              borderRadius: '8px',
              padding: '8px 14px',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: '0.66rem', color: '#a1a1aa' }}>CALCULATED SLAP DELAY</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d4af37', fontFamily: '"JetBrains Mono", monospace' }}>
              {delayMs} ms
            </div>
            <div style={{ fontSize: '0.68rem', color: '#71717a' }}>
              {headDistance.toFixed(2)}&quot; ÷ {tapeSpeed} ips
            </div>
          </div>
        </div>
      </div>

      {/* Presets Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setTapeSpeed(p.speed);
              setHeadDistance(p.dist);
              setFeedback(p.fb);
              setMix(p.mix);
              setDriveDb(p.drive);
              setStemIdx(p.stem);
              if (isPlaying) startLoop(p.stem);
            }}
            style={{
              backgroundColor: '#26201a',
              border: '1px solid #54422e',
              color: '#f3e5ab',
              fontSize: '0.74rem',
              padding: '5px 10px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Animated Dual Reel & Head Assembly */}
      <div
        style={{
          backgroundColor: '#0f0d0b',
          borderRadius: '10px',
          border: '1px solid #2e261f',
          padding: '20px',
          marginBottom: '18px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '18px' }}>
          {['SUPPLY REEL', 'TAKEUP REEL'].map((reelLabel) => (
            <div key={reelLabel} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  border: '4px solid #78716c',
                  background: 'radial-gradient(circle, #292524 28%, #44403c 30%, #1c1917 70%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  animation: isPlaying
                    ? `spin ${tapeSpeed === 15 ? '1.8s' : '3.6s'} linear infinite`
                    : 'none',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{ position: 'absolute', width: '100%', height: '3px', backgroundColor: '#a8a29e' }} />
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '3px',
                    backgroundColor: '#a8a29e',
                    transform: 'rotate(60deg)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '3px',
                    backgroundColor: '#a8a29e',
                    transform: 'rotate(120deg)'
                  }}
                />
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#d4af37',
                    border: '3px solid #18181b',
                    zIndex: 2
                  }}
                />
              </div>
              <div style={{ fontSize: '0.65rem', color: '#78716c', marginTop: '6px', letterSpacing: '0.08em' }}>
                {reelLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Magnetic Tape Path & Movable Repro Head */}
        <div style={{ position: 'relative', height: '46px', display: 'flex', alignItems: 'center', padding: '0 14%' }}>
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: isPlaying ? '#b45309' : '#57361a',
              boxShadow: isPlaying ? '0 0 10px rgba(212,175,55,0.4)' : 'none'
            }}
          />

          {/* Record Head */}
          <div
            style={{
              position: 'absolute',
              left: '26%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '24px',
                height: '28px',
                backgroundColor: '#d6d3d1',
                border: '2px solid #ef4444',
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.66rem', color: '#ef4444', fontWeight: 700, marginTop: '3px' }}>REC HEAD</span>
          </div>

          {/* Movable Repro Head */}
          <div
            style={{
              position: 'absolute',
              left: `${26 + ((headDistance - 0.75) / 2.75) * 46}%`,
              transition: 'left 0.08s ease-out',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '24px',
                height: '28px',
                backgroundColor: '#d4af37',
                border: '2px solid #fef08a',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(212,175,55,0.45)'
              }}
            />
            <span style={{ fontSize: '0.66rem', color: '#d4af37', fontWeight: 700, marginTop: '3px' }}>
              REPRO ({headDistance.toFixed(2)}&quot;)
            </span>
          </div>
        </div>
      </div>

      {/* Transport & Source Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr auto', gap: '10px', marginBottom: '18px' }}>
        <button
          onClick={() => (isPlaying ? stopPlayback() : startLoop(stemIdx))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#d4af37',
            color: isPlaying ? '#fff' : '#09090b',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 16px',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          <span>{isPlaying ? 'STOP TAPE TRANSPORT' : 'RUN 1950s STEM LOOP'}</span>
        </button>

        <select
          value={stemIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setStemIdx(idx);
            if (isPlaying) startLoop(idx);
          }}
          style={{
            backgroundColor: '#09090b',
            color: '#f4f4f5',
            border: '1px solid #54422e',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          {stemNames.map((name, idx) => (
            <option key={name} value={idx}>
              Stem: {name}
            </option>
          ))}
        </select>

        <button
          onClick={triggerOneShotTransient}
          style={{
            backgroundColor: '#27272a',
            color: '#f3e5ab',
            border: '1px solid #d4af37',
            borderRadius: '8px',
            padding: '0 14px',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Fire a single dry rockabilly guitar stab to clearly hear the exact single slap repeat"
        >
          <Zap size={15} color="#d4af37" />
          <span>One-Shot Chord</span>
        </button>
      </div>

      {/* Parameter Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          onMouseEnter={() => setHoverKey('speed')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#12100e', padding: '12px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '8px' }}>
            CAPSTAN MOTOR SPEED
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[15, 7.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setTapeSpeed(spd)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: tapeSpeed === spd ? '1px solid #d4af37' : '1px solid #3f3f46',
                  backgroundColor: tapeSpeed === spd ? 'rgba(212,175,55,0.18)' : '#18181b',
                  color: tapeSpeed === spd ? '#d4af37' : '#a1a1aa',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                {spd} IPS {spd === 15 ? '(Hi-Fi)' : '(2× Delay)'}
              </button>
            ))}
          </div>
        </div>

        <div
          onMouseEnter={() => setHoverKey('distance')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#12100e', padding: '12px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>HEAD GAP DISTANCE</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>{headDistance.toFixed(2)} inches</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="3.5"
            step="0.05"
            value={headDistance}
            onChange={(e) => setHeadDistance(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>

        <div
          onMouseEnter={() => setHoverKey('drive')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#12100e', padding: '12px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>OXIDE RECORD DRIVE</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>+{driveDb} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="16"
            step="0.5"
            value={driveDb}
            onChange={(e) => setDriveDb(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>

        <div
          onMouseEnter={() => setHoverKey('feedback')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#12100e', padding: '12px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>REGENERATION / ECHO MIX</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>
              FB {Math.round(feedback * 100)}% • Mix {Math.round(mix * 100)}%
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="0.72"
              step="0.02"
              value={feedback}
              onChange={(e) => setFeedback(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#d4af37' }}
              title="Feedback Regeneration"
            />
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.02"
              value={mix}
              onChange={(e) => setMix(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#d4af37' }}
              title="Echo Return Wet Mix"
            />
          </div>
        </div>
      </div>

      {/* Auditory Learning Banner */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#0c0a09',
          border: '1px solid #45392d',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        {hoverKey ? <Sparkles size={16} color="#d4af37" style={{ marginTop: '2px', flexShrink: 0 }} /> : <Info size={16} color="#71717a" style={{ marginTop: '2px', flexShrink: 0 }} />}
        <div style={{ fontSize: '0.8rem', color: '#d6d3d1', lineHeight: 1.5 }}>
          {hoverKey ? (
            <>
              <strong style={{ color: '#d4af37' }}>{GUIDES[hoverKey].title}: </strong>
              {GUIDES[hoverKey].text}
            </>
          ) : (
            <span>
              Hover over any control to inspect its 1950s tape physics, or click <strong>One-Shot Chord</strong> while adjusting Head Distance and Speed to hear the exact single slap delay shift.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
