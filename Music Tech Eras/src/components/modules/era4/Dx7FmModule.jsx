import React, { useState, useEffect, useRef } from 'react';
import { getSharedAudioContext } from '../../../audio/SharedAudioContext';
import RotaryKnob from '../../common/RotaryKnob';

const DX7_PRESETS = [
  { name: 'ROM 11: E. PIANO 1 (Rhodes Tine)', alg: 5, ratioM1: 14.0, ratioM2: 1.0, modIndex: 3.2, decaySec: 0.9 },
  { name: 'ROM 26: TUBULAR BELLS (1:1.414)', alg: 1, ratioM1: 1.414, ratioM2: 3.53, modIndex: 6.5, decaySec: 2.1 },
  { name: 'TX81Z / DX SOLID FM BASS', alg: 16, ratioM1: 1.0, ratioM2: 2.0, modIndex: 5.8, decaySec: 0.34 },
  { name: 'ROM 01: BRASS 1 (Swell Index)', alg: 5, ratioM1: 1.0, ratioM2: 3.0, modIndex: 4.8, decaySec: 1.2 }
];

const KEYBOARD = [
  { label: 'C3', midi: 48 },
  { label: 'D3', midi: 50 },
  { label: 'E3', midi: 52 },
  { label: 'F3', midi: 53 },
  { label: 'G3', midi: 55 },
  { label: 'A3', midi: 57 },
  { label: 'C4', midi: 60 },
  { label: 'E4', midi: 64 },
  { label: 'G4', midi: 67 },
  { label: 'B4', midi: 71 },
  { label: 'D5', midi: 74 }
];

export default function Dx7FmModule() {
  const [alg, setAlg] = useState(5); // 1, 5, 16, 32
  const [ratioM1, setRatioM1] = useState(14.0);
  const [ratioM2, setRatioM2] = useState(1.0);
  const [modIndex, setModIndex] = useState(3.2);
  const [decaySec, setDecaySec] = useState(0.9);
  const [lastNote, setLastNote] = useState(60);

  const analyserRef = useRef(null);
  const canvasRef = useRef(null);

  const playFmNote = (midi) => {
    const ctx = getSharedAudioContext();
    if (!analyserRef.current) {
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.connect(ctx.destination);
      analyserRef.current = an;
    }

    setLastNote(midi);
    const now = ctx.currentTime;
    const fc = 440 * Math.pow(2, (midi - 69) / 12);

    const op1 = ctx.createOscillator(); // Carrier 1
    const op2 = ctx.createOscillator(); // Modulator / Carrier 2
    const op3 = ctx.createOscillator(); // Carrier / Mod 3
    const op4 = ctx.createOscillator(); // Modulator 4

    op1.frequency.value = fc;
    op2.frequency.value = fc * ratioM1;
    op3.frequency.value = fc * 1.002;
    op4.frequency.value = fc * ratioM2;

    const modGain2 = ctx.createGain();
    const modGain4 = ctx.createGain();
    const outGain = ctx.createGain();

    // Frequency deviation deltaF = modIndex * fm
    const dev2 = modIndex * fc * Math.min(4, ratioM1 * 0.35);
    const dev4 = modIndex * fc * ratioM2 * 0.8;

    modGain2.gain.setValueAtTime(dev2, now);
    modGain2.gain.exponentialRampToValueAtTime(Math.max(1, dev2 * 0.08), now + decaySec * 0.65);

    modGain4.gain.setValueAtTime(dev4, now);
    modGain4.gain.exponentialRampToValueAtTime(Math.max(1, dev4 * 0.15), now + decaySec);

    outGain.gain.setValueAtTime(0.001, now);
    outGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    outGain.gain.exponentialRampToValueAtTime(0.0008, now + decaySec + 0.3);

    if (alg === 5) {
      // Classic DX7 E.Piano 1: Two parallel 2-Op stacks (Op2->Op1 Tine + Op4->Op3 Body)
      op2.connect(modGain2);
      modGain2.connect(op1.frequency);
      op4.connect(modGain4);
      modGain4.connect(op3.frequency);
      op1.connect(outGain);
      op3.connect(outGain);
    } else if (alg === 1) {
      // Deep 4-Op Cascade: Op4 -> Op3 -> Op2 -> Op1
      op4.connect(modGain4);
      modGain4.connect(op2.frequency);
      op2.connect(modGain2);
      modGain2.connect(op1.frequency);
      op1.connect(outGain);
    } else if (alg === 16) {
      // 3 Modulators converging on 1 Carrier
      op2.connect(modGain2);
      op4.connect(modGain4);
      modGain2.connect(op1.frequency);
      modGain4.connect(op1.frequency);
      op1.connect(outGain);
    } else {
      // Alg 32: 4 Parallel Additive Sine Carriers (Hammond Organ)
      op1.connect(outGain);
      op2.connect(outGain);
      op3.connect(outGain);
      op4.connect(outGain);
    }

    outGain.connect(analyserRef.current);

    const stopAt = now + decaySec + 0.35;
    [op1, op2, op3, op4].forEach((o) => {
      o.start(now);
      o.stop(stopAt);
    });
  };

  // Live Bessel Sideband Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bins = new Uint8Array(1024);
    let raf = null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0c1816';
      ctx.fillRect(0, 0, w, h);

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(bins);
        for (let i = 1; i < 240; i++) {
          const x = (i / 240) * w;
          const barH = (bins[i] / 255) * (h - 28);
          ctx.fillStyle = '#2dd4bf';
          ctx.fillRect(x, h - barH, Math.max(2, w / 240 - 0.5), barH);
        }
      }

      ctx.fillStyle = '#99f6e4';
      ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
      const nature = Number.isInteger(ratioM1) ? 'HARMONIC INTEGER SIDEBANDS' : 'INHARMONIC METALLIC BELL SPECTRUM';
      ctx.fillText(`ALG #${alg} • C:M1 = 1:${ratioM1} (${nature}) • INDEX I=${modIndex.toFixed(1)}`, 12, 17);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [alg, ratioM1, modIndex]);

  return (
    <div
      style={{
        backgroundColor: '#171514',
        borderRadius: '12px',
        border: '3px solid #2dd4bf88',
        padding: '22px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.8)'
      }}
    >
      {/* Classic DX7 Brown & Tiffany-Teal Membrane Aesthetic */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#2dd4bf', fontWeight: 700, letterSpacing: '1.4px' }}>
            NIPPON GAKKI / YAMAHA CORP • JOHN CHOWNING FM PATENT (1983)
          </span>
          <h3 style={{ margin: '2px 0 0 0', color: '#f0fdfa', fontFamily: '"JetBrains Mono", monospace', fontSize: '1.14rem' }}>
            DX7 DIGITAL PROGRAMMABLE ALGORITHM SYNTHESIZER
          </h3>
        </div>
      </div>

      {/* Classic Cartridge Voice Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {DX7_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              setAlg(p.alg);
              setRatioM1(p.ratioM1);
              setRatioM2(p.ratioM2);
              setModIndex(p.modIndex);
              setDecaySec(p.decaySec);
              playFmNote(lastNote);
            }}
            style={{
              backgroundColor: '#0f2926',
              border: '1px solid #2dd4bf',
              color: '#99f6e4',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.71rem',
              padding: '5px 9px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Live Sideband Spectrum */}
      <canvas
        ref={canvasRef}
        width={620}
        height={138}
        style={{
          width: '100%',
          height: '138px',
          borderRadius: '8px',
          border: '2px solid #14b8a6',
          marginBottom: '14px',
          display: 'block'
        }}
      />

      {/* Operator Algorithm Membrane Buttons & FM Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ backgroundColor: '#0e0d0c', padding: '12px', borderRadius: '8px', border: '1px solid #2dd4bf55' }}>
          <div style={{ fontSize: '0.7rem', color: '#2dd4bf', fontWeight: 800, marginBottom: '8px', fontFamily: 'monospace' }}>
            OPERATOR ROUTING ALGORITHM
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { id: 1, txt: 'ALG 1: Deep Cascade' },
              { id: 5, txt: 'ALG 5: Dual Stacks (EP1)' },
              { id: 16, txt: 'ALG 16: 3-Mod → 1-Car' },
              { id: 32, txt: 'ALG 32: Additive Organ' }
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => setAlg(a.id)}
                style={{
                  padding: '8px 6px',
                  borderRadius: '4px',
                  border: alg === a.id ? '2px solid #2dd4bf' : '1px solid #3f3f46',
                  backgroundColor: alg === a.id ? 'rgba(45,212,191,0.22)' : '#1c1917',
                  color: '#f0fdfa',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  cursor: 'pointer'
                }}
              >
                {a.txt}
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#0e0d0c', padding: '12px', borderRadius: '8px', border: '1px solid #2dd4bf55', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <RotaryKnob label="Mod 1 Ratio" value={ratioM1} steps={[0.5, 1.0, 1.414, 2.0, 3.0, 7.0, 14.0]} defaultValue={14.0} accent="#2dd4bf" size={44} onChange={setRatioM1} />
          <RotaryKnob label="Mod 2 Ratio" value={ratioM2} steps={[1.0, 2.0, 3.0, 3.53, 5.0]} defaultValue={1.0} accent="#a855f7" size={44} onChange={setRatioM2} />
          <RotaryKnob label="FM Index (I)" value={modIndex} min={0} max={10} step={0.2} defaultValue={3.2} accent="#f59e0b" size={44} onChange={setModIndex} />
          <RotaryKnob label="Env Decay" value={decaySec} min={0.15} max={2.8} step={0.05} defaultValue={0.9} unit="s" accent="#22c55e" size={44} onChange={setDecaySec} />
        </div>
      </div>

      {/* Playable DX7 Keyboard */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KEYBOARD.length}, 1fr)`, gap: '5px' }}>
        {KEYBOARD.map((k) => (
          <button
            key={k.midi}
            onMouseDown={() => playFmNote(k.midi)}
            style={{
              height: '54px',
              borderRadius: '0 0 6px 6px',
              border: lastNote === k.midi ? '2px solid #2dd4bf' : '1px solid #3f3f46',
              backgroundColor: lastNote === k.midi ? '#2dd4bf' : '#f8fafc',
              color: '#09090b',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '6px'
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
