import React, { useRef } from 'react';

/**
 * RotaryKnob.jsx
 * Skeuomorphic rotary hardware potentiometer ported from studio_effects/RackController.js.
 * Supports vertical pointer drag, Shift precision mode, mouse wheel, discrete steps, and double-click reset.
 */
export default function RotaryKnob({
  label,
  value,
  min = 0,
  max = 10,
  step = 0.1,
  steps = null, // optional array of discrete numeric values e.g. [20, 30, 60, 100]
  defaultValue,
  unit = '',
  accent = '#d4af37',
  size = 54,
  onChange,
  formatValue
}) {
  const dragRef = useRef(null);

  const findClosestStepIdx = (arr, v) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const d = Math.abs(arr[i] - v);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  let norm = 0;
  if (steps && steps.length > 1) {
    norm = findClosestStepIdx(steps, value) / (steps.length - 1);
  } else {
    norm = (value - min) / Math.max(1e-6, max - min);
  }
  norm = Math.max(0, Math.min(1, norm));
  const angleDeg = -135 + norm * 270;

  const commitVal = (raw) => {
    if (!onChange) return;
    if (steps && steps.length) {
      const idx = findClosestStepIdx(steps, raw);
      onChange(steps[idx]);
    } else {
      const clamped = Math.max(min, Math.min(max, raw));
      const snapped = parseFloat((Math.round(clamped / step) * step).toFixed(4));
      onChange(snapped);
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startVal: value
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    const sens = e.shiftKey ? 280 : 125;

    if (steps && steps.length > 1) {
      const startIdx = findClosestStepIdx(steps, dragRef.current.startVal);
      const offset = Math.round((dy / 100) * (steps.length - 1));
      const nextIdx = Math.max(0, Math.min(steps.length - 1, startIdx + offset));
      onChange && onChange(steps[nextIdx]);
    } else {
      const range = max - min;
      commitVal(dragRef.current.startVal + (dy / sens) * range);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    if (steps && steps.length > 1) {
      const curIdx = findClosestStepIdx(steps, value);
      const nextIdx = Math.max(0, Math.min(steps.length - 1, curIdx + dir));
      onChange && onChange(steps[nextIdx]);
    } else {
      const delta = dir * Math.max(step, (max - min) * 0.03);
      commitVal(value + delta);
    }
  };

  const displayStr = formatValue
    ? formatValue(value)
    : unit === 'Hz' && value >= 1000
      ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} kHz`
      : `${typeof value === 'number' ? (step < 1 && !steps ? value.toFixed(1) : value) : value}${unit ? ' ' + unit : ''}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        userSelect: 'none'
      }}
    >
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#cbd5e1',
          letterSpacing: '0.04em',
          textAlign: 'center',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </span>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={() => {
          if (defaultValue !== undefined) commitVal(defaultValue);
        }}
        title="Drag up/down to turn • Double-click to reset"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #383842, #141418 75%)',
          border: `2px solid ${accent}88`,
          boxShadow: '0 6px 14px rgba(0,0,0,0.65), inset 0 1px 2px rgba(255,255,255,0.18)',
          position: 'relative',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transform: `rotate(${angleDeg.toFixed(1)}deg)`,
            transition: dragRef.current ? 'none' : 'transform 0.06s ease-out'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '3px',
              height: `${Math.round(size * 0.26)}px`,
              borderRadius: '2px',
              backgroundColor: accent,
              boxShadow: `0 0 6px ${accent}`
            }}
          />
        </div>
      </div>

      <span
        style={{
          fontSize: '0.72rem',
          fontFamily: '"JetBrains Mono", monospace',
          color: accent,
          fontWeight: 700,
          backgroundColor: 'rgba(0,0,0,0.45)',
          padding: '1px 6px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {displayStr}
      </span>
    </div>
  );
}
