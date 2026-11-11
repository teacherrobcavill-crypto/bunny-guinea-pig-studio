import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Sparkles, Info, Zap } from 'lucide-react';
import {
  getSharedAudioContext,
  registerStopCallback,
  notifyPlayingChange
} from '../../../audio/SharedAudioContext';
import { StemGenerator } from '../../../audio/StemGenerator1950s';

const MATERIALS = {
  tile: { label: 'Glazed Ceramic Tile', rt60: 4.6, cutoff: 8800, color: '#38bdf8' },
  concrete: { label: 'Shellacked Concrete', rt60: 2.5, cutoff: 3900, color: '#d4af37' },
  brick: { label: 'Porous Basement Brick', rt60: 0.95, cutoff: 1450, color: '#f97316' }
};

const CHAMBER_GUIDES = {
  material: {
    title: 'Wall Absorption & Sabin Coefficient (RT60)',
    text: 'Glazed ceramic tile reflects high frequencies up to 9 kHz for a shimmering 4.6s Capitol Tower tail. Porous brick absorbs treble rapidly, collapsing decay to a dark 0.95s thud.'
  },
  distance: {
    title: 'Altec Speaker-to-RCA Mic Distance (Acoustic Pre-Delay)',
    text: 'Sound travels ~1.13 feet per millisecond in air. Increasing speaker-to-mic spacing widens the pre-delay gap before diffuse reverberation blooms, keeping dry vocals intelligible.'
  },
  angle: {
    title: 'Corner Boundary Loading (+dB Low Shelf & Dispersion)',
    text: 'Aiming the Altec 604 speaker into the non-parallel masonry corner couples low frequencies into three rigid boundaries (+11 dB bass loading) while scattering treble reflections.'
  },
  mix: {
    title: 'Console Aux Send / Echo Return Fader Balance',
    text: 'In a 1950s Putnam console, the chamber returns on a dedicated mixer channel so engineers can EQ and ride the wet acoustic room wash independently of the dry mic.'
  }
};

function createChamberIR(ctx, rt60, angleDeg) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * rt60);
  const buf = ctx.createBuffer(2, len, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const decay = 6.91 / rt60;
  const corner = angleDeg / 90;

  let seed = 19471102;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.exp(-decay * t);
    let er = 1.0;
    if (t < 0.085) {
      er = 1.0 + Math.sin(t * (290 + corner * 410)) * (0.38 + corner * 0.35);
    }
    L[i] = rand() * env * er * 0.52;
    R[i] = rand() * env * er * 0.52;
  }
  return buf;
}

export default function ChamberModule() {
  const [material, setMaterial] = useState('tile');
  const [distanceFt, setDistanceFt] = useState(18);
  const [cornerAngle, setCornerAngle] = useState(45);
  const [returnMix, setReturnMix] = useState(0.55);
  const [stemIdx, setStemIdx] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverKey, setHoverKey] = useState(null);

  const graphRef = useRef(null);
  const stemGenRef = useRef(null);
  const srcRef = useRef(null);
  const canvasRef = useRef(null);

  const preDelayMs = Math.round(distanceFt * 1.5);
  const matCfg = MATERIALS[material];

  const ensureGraph = () => {
    const ctx = getSharedAudioContext();
    if (graphRef.current) return { ctx, ...graphRef.current };

    stemGenRef.current = new StemGenerator(ctx);
    const input = ctx.createGain();
    const dryGain = ctx.createGain();
    const preDelay = ctx.createDelay(0.5);
    const damping = ctx.createBiquadFilter();
    damping.type = 'lowpass';
    const cornerShelf = ctx.createBiquadFilter();
    cornerShelf.type = 'lowshelf';
    cornerShelf.frequency.value = 185;
    const convolver = ctx.createConvolver();
    convolver.buffer = createChamberIR(ctx, matCfg.rt60, cornerAngle);
    const wetGain = ctx.createGain();
    const master = ctx.createGain();
    master.gain.value = 0.85;

    input.connect(dryGain);
    dryGain.connect(master);

    input.connect(preDelay);
    preDelay.connect(cornerShelf);
    cornerShelf.connect(damping);
    damping.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(master);
    master.connect(ctx.destination);

    graphRef.current = { input, dryGain, preDelay, damping, cornerShelf, convolver, wetGain };
    return { ctx, ...graphRef.current };
  };

  useEffect(() => {
    if (!graphRef.current) return;
    const { preDelay, damping, cornerShelf, dryGain, wetGain } = graphRef.current;
    const ctx = preDelay.context;
    const now = ctx.currentTime;
    preDelay.delayTime.setTargetAtTime((distanceFt * 1.5) / 1000, now, 0.025);
    damping.frequency.setTargetAtTime(MATERIALS[material].cutoff, now, 0.03);
    cornerShelf.gain.setTargetAtTime((cornerAngle / 90) * 11, now, 0.03);
    dryGain.gain.setTargetAtTime(1 - returnMix * 0.55, now, 0.02);
    wetGain.gain.setTargetAtTime(returnMix * 1.2, now, 0.02);
  }, [distanceFt, material, cornerAngle, returnMix]);

  useEffect(() => {
    if (!graphRef.current) return;
    const { convolver } = graphRef.current;
    convolver.buffer = createChamberIR(convolver.context, MATERIALS[material].rt60, cornerAngle);
  }, [material, cornerAngle]);

  // Blueprint room canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let pulse = 0;
    let raf = null;

    const draw = () => {
      pulse = (pulse + 0.04) % (Math.PI * 2);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#090c12';
      ctx.fillRect(0, 0, w, h);

      // Blueprint grid
      ctx.strokeStyle = 'rgba(56,189,248,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Non-parallel Putnam trapezoidal chamber walls
      const poly = [
        [45, 34],
        [w - 40, 18],
        [w - 28, h - 22],
        [62, h - 36]
      ];
      ctx.fillStyle =
        material === 'tile'
          ? 'rgba(56,189,248,0.09)'
          : material === 'concrete'
            ? 'rgba(212,175,55,0.08)'
            : 'rgba(249,115,22,0.08)';
      ctx.strokeStyle = matCfg.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      poly.slice(1).forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Speaker at left corner
      const spkX = 92;
      const spkY = h * 0.52;
      const micX = 140 + ((distanceFt - 6) / 24) * (w - 220);
      const micY = h * 0.48;

      // Acoustic reflection rays
      const rayAngle = -((cornerAngle / 90) * 0.95);
      ctx.strokeStyle = `${matCfg.color}66`;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.4;
      [-0.35, 0, 0.35].forEach((spread) => {
        const bounceX = spkX + Math.cos(rayAngle + spread) * 140;
        const bounceY = Math.max(28, Math.min(h - 28, spkY + Math.sin(rayAngle + spread) * 110));
        ctx.beginPath();
        ctx.moveTo(spkX, spkY);
        ctx.lineTo(bounceX, bounceY);
        ctx.lineTo(micX, micY);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Propagating wave rings when playing
      if (isPlaying) {
        for (let r = 0; r < 3; r++) {
          const rad = ((pulse * 22 + r * 38) % 115) + 12;
          ctx.strokeStyle = `${matCfg.color}${Math.max(15, Math.floor((1 - rad / 130) * 90)).toString(16)}`;
          ctx.beginPath();
          ctx.arc(spkX, spkY, rad, rayAngle - 0.65, rayAngle + 0.65);
          ctx.stroke();
        }
      }

      // Draw Altec Speaker
      ctx.save();
      ctx.translate(spkX, spkY);
      ctx.rotate(rayAngle);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-10, -12, 20, 24);
      ctx.restore();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`ALTEC 604 (${cornerAngle}°)`, spkX - 28, spkY + 28);

      // Draw RCA 44BX Ribbon Mic
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(micX, micY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.fillText(`RCA MIC (${distanceFt} ft • ${preDelayMs}ms)`, micX - 52, micY - 16);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [material, distanceFt, cornerAngle, isPlaying, matCfg.color, preDelayMs]);

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

  const startStem = (idx = stemIdx) => {
    const { ctx, input } = ensureGraph();
    if (srcRef.current) {
      try {
        srcRef.current.stop();
        srcRef.current.disconnect();
      } catch (_) {}
    }
    const src = ctx.createBufferSource();
    src.buffer = stemGenRef.current.syntheticBuffers[idx];
    src.loop = true;
    src.connect(input);
    src.start();
    srcRef.current = src;
    if (!isPlaying) {
      setIsPlaying(true);
      notifyPlayingChange(true);
    }
  };

  const fireSnareCrack = () => {
    const { ctx, input } = ensureGraph();
    const now = ctx.currentTime;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate;
      d[i] = ((Math.random() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 210 * t) * 0.6) * Math.exp(-t * 22);
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.connect(input);
    s.start(now);
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
        backgroundColor: '#161412',
        borderRadius: '12px',
        border: '2px solid #45392d',
        padding: '24px',
        boxShadow: '0 16px 36px rgba(0,0,0,0.65)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#d4af37', fontWeight: 700, letterSpacing: '1.4px' }}>
            UNIVERSAL RECORDING / CAPITOL TOWER SUBTERRANEAN BUNKER
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f3e5ab', fontFamily: '"Courier Prime", monospace', fontSize: '1.15rem' }}>
            TRAPEZOIDAL ACOUSTIC ECHO CHAMBER (1947)
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ backgroundColor: '#09090b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #3f3f46' }}>
            <div style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>RT60 DECAY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: matCfg.color, fontFamily: 'monospace' }}>
              {matCfg.rt60.toFixed(2)} s
            </div>
          </div>
          <div style={{ backgroundColor: '#09090b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #3f3f46' }}>
            <div style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>PRE-DELAY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d4af37', fontFamily: 'monospace' }}>
              {preDelayMs} ms
            </div>
          </div>
        </div>
      </div>

      {/* Trapezoidal Blueprint Canvas */}
      <canvas
        ref={canvasRef}
        width={620}
        height={195}
        style={{
          width: '100%',
          height: '195px',
          borderRadius: '8px',
          border: '1px solid #2e261f',
          marginBottom: '16px',
          display: 'block'
        }}
      />

      {/* Transport & Snare Clap Impulse */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr auto', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => (isPlaying ? stopAudio() : startStem(stemIdx))}
          style={{
            backgroundColor: isPlaying ? '#dc2626' : '#d4af37',
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
          <span>{isPlaying ? 'STOP CHAMBER SEND' : 'SEND 1950s STEM TO CHAMBER'}</span>
        </button>

        <select
          value={stemIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setStemIdx(idx);
            if (isPlaying) startStem(idx);
          }}
          style={{
            backgroundColor: '#09090b',
            color: '#f4f4f5',
            border: '1px solid #54422e',
            borderRadius: '8px',
            padding: '0 10px',
            fontSize: '0.83rem'
          }}
        >
          <option value={3}>Crooner Lead Vocal</option>
          <option value={2}>Calfskin Snare &amp; Kit</option>
          <option value={1}>Hollowbody Archtop Guitar</option>
          <option value={0}>Slap Upright Bass</option>
        </select>

        <button
          onClick={fireSnareCrack}
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
        >
          <Zap size={14} color="#d4af37" />
          <span>Snare Impulse</span>
        </button>
      </div>

      {/* Surface Material Selector */}
      <div
        onMouseEnter={() => setHoverKey('material')}
        onMouseLeave={() => setHoverKey(null)}
        style={{ marginBottom: '14px' }}
      >
        <div style={{ fontSize: '0.73rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
          CHAMBER WALL SURFACE COATING
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(MATERIALS).map(([k, cfg]) => (
            <button
              key={k}
              onClick={() => setMaterial(k)}
              style={{
                padding: '9px 8px',
                borderRadius: '6px',
                border: material === k ? `1px solid ${cfg.color}` : '1px solid #3f3f46',
                backgroundColor: material === k ? `${cfg.color}20` : '#0f0d0b',
                color: material === k ? cfg.color : '#a1a1aa',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
            >
              {cfg.label} ({cfg.rt60}s)
            </button>
          ))}
        </div>
      </div>

      {/* Acoustic Geometry Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div
          onMouseEnter={() => setHoverKey('distance')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#0f0d0b', padding: '11px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>MIC DISTANCE</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>{distanceFt} ft</span>
          </div>
          <input
            type="range"
            min="6"
            max="30"
            step="1"
            value={distanceFt}
            onChange={(e) => setDistanceFt(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>

        <div
          onMouseEnter={() => setHoverKey('angle')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#0f0d0b', padding: '11px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>CORNER LOADING</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>{cornerAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={cornerAngle}
            onChange={(e) => setCornerAngle(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>

        <div
          onMouseEnter={() => setHoverKey('mix')}
          onMouseLeave={() => setHoverKey(null)}
          style={{ backgroundColor: '#0f0d0b', padding: '11px', borderRadius: '8px', border: '1px solid #2e261f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>ECHO RETURN</span>
            <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>{Math.round(returnMix * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={returnMix}
            onChange={(e) => setReturnMix(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: '14px',
          padding: '11px 14px',
          borderRadius: '8px',
          backgroundColor: '#0c0a09',
          border: '1px solid #45392d',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        {hoverKey ? <Sparkles size={16} color="#d4af37" style={{ marginTop: '2px', flexShrink: 0 }} /> : <Info size={16} color="#71717a" style={{ marginTop: '2px', flexShrink: 0 }} />}
        <div style={{ fontSize: '0.79rem', color: '#d6d3d1', lineHeight: 1.5 }}>
          {hoverKey ? (
            <>
              <strong style={{ color: '#d4af37' }}>{CHAMBER_GUIDES[hoverKey].title}: </strong>
              {CHAMBER_GUIDES[hoverKey].text}
            </>
          ) : (
            <span>
              Click <strong>Snare Impulse</strong> while switching between <strong>Glazed Tile (4.6s)</strong> and <strong>Porous Brick (0.95s)</strong> to hear acoustic Sabin absorption directly.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
