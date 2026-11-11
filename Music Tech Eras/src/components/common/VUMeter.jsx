import React, { useEffect, useRef } from 'react';

/**
 * VUMeter.jsx
 * Authentic Weston Model 862 / Fairchild 660 Illuminated Ballistic VU & Gain Reduction Meter
 * ported from studio_effects/src/ui/VUMeterCanvas.js into React.
 */
export default function VUMeter({
  mode = 'vu', // 'vu' (-20 to +3 VU) | 'gr' (0 to -20 dB Gain Reduction)
  label = 'VU',
  value = 0, // linear RMS for 'vu', positive dB GR for 'gr'
  peak = 0,
  width = 190,
  height = 108
}) {
  const canvasRef = useRef(null);
  const valRef = useRef({ value, peak });
  valRef.current = { value, peak };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let needlePos = mode === 'gr' ? 0.88 : 0.0;
    let needleVel = 0.0;
    let peakLedHold = 0.0;
    let lastTime = performance.now();
    let rafId = null;

    const ticks =
      mode === 'vu'
        ? [
            { label: '-20', norm: 0.0, red: false },
            { label: '-10', norm: 0.28, red: false },
            { label: '-7', norm: 0.42, red: false },
            { label: '-5', norm: 0.52, red: false },
            { label: '-3', norm: 0.61, red: false },
            { label: '0', norm: 0.72, red: false },
            { label: '+1', norm: 0.81, red: true },
            { label: '+2', norm: 0.9, red: true },
            { label: '+3', norm: 1.0, red: true }
          ]
        : [
            { label: '-20', norm: 0.03, red: true },
            { label: '-15', norm: 0.24, red: true },
            { label: '-10', norm: 0.45, red: false },
            { label: '-6', norm: 0.62, red: false },
            { label: '-3', norm: 0.75, red: false },
            { label: '0', norm: 0.88, red: false }
          ];

    const render = (now) => {
      const safeDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const { value: curVal, peak: curPeak } = valRef.current;
      let targetNorm = 0.0;

      if (mode === 'vu') {
        const db = 20 * Math.log10(Math.max(1e-5, curVal / 0.25));
        const clampedDb = Math.max(-20, Math.min(3.5, db));
        if (clampedDb <= 0) {
          targetNorm = Math.pow((clampedDb + 20) / 20, 1.35) * 0.72;
        } else {
          targetNorm = 0.72 + (clampedDb / 3.5) * 0.28;
        }
      } else {
        const grDb = Math.max(0, Math.min(20, curVal));
        targetNorm = Math.max(0.0, 0.88 - (grDb / 20.0) * 0.85);
      }

      const wn = 14.0;
      const zeta = 0.81;
      const accel = wn * wn * (targetNorm - needlePos) - 2.0 * zeta * wn * needleVel;
      needleVel += accel * safeDt;
      needlePos += needleVel * safeDt;

      if (needlePos < -0.02) {
        needlePos = -0.02;
        needleVel *= -0.25;
      } else if (needlePos > 1.03) {
        needlePos = 1.03;
        needleVel *= -0.25;
      }

      if (curPeak > 0.88 || (mode === 'vu' && needlePos > 0.74)) {
        peakLedHold = 1.0;
      } else {
        peakLedHold = Math.max(0.0, peakLedHold - safeDt * 3.5);
      }

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.85,
        8,
        width * 0.5,
        height * 0.55,
        width * 0.7
      );
      bgGrad.addColorStop(0, '#fff4d6');
      bgGrad.addColorStop(0.65, '#eddcb4');
      bgGrad.addColorStop(1, '#c9b282');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const pivotX = width * 0.5;
      const pivotY = height * 1.18;
      const radius = height * 0.92;
      const startAngle = -Math.PI * 0.73;
      const endAngle = -Math.PI * 0.27;
      const zeroVuAngle = startAngle + 0.72 * (endAngle - startAngle);

      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#241e18';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, radius, startAngle, mode === 'vu' ? zeroVuAngle : endAngle);
      ctx.stroke();

      if (mode === 'vu') {
        ctx.lineWidth = 3.8;
        ctx.strokeStyle = '#b92b27';
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, radius, zeroVuAngle, endAngle);
        ctx.stroke();
      }

      ctx.font = 'bold 8.5px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const t of ticks) {
        const ang = startAngle + t.norm * (endAngle - startAngle);
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        ctx.strokeStyle = t.red ? '#b92b27' : '#241e18';
        ctx.lineWidth = t.label === '0' ? 2.0 : 1.2;
        ctx.beginPath();
        ctx.moveTo(pivotX + cos * (radius - 5), pivotY + sin * (radius - 5));
        ctx.lineTo(pivotX + cos * (radius + 5), pivotY + sin * (radius + 5));
        ctx.stroke();

        ctx.fillStyle = t.red ? '#b92b27' : '#241e18';
        ctx.fillText(t.label, pivotX + cos * (radius + 14), pivotY + sin * (radius + 14));
      }

      ctx.fillStyle = '#382f25';
      ctx.font = 'bold 12px "Courier Prime", monospace';
      ctx.fillText(mode === 'vu' ? 'VU' : 'dB GR', pivotX, height * 0.62);

      ctx.font = 'bold 8px "Courier Prime", monospace';
      ctx.fillStyle = '#6b5a45';
      ctx.fillText(label, pivotX, height * 0.78);

      // Peak Jewel
      const ledX = width - 13;
      const ledY = 12;
      ctx.beginPath();
      ctx.arc(ledX, ledY, 4, 0, Math.PI * 2);
      if (peakLedHold > 0.1) {
        ctx.fillStyle = `rgba(235, 35, 30, ${0.4 + 0.6 * peakLedHold})`;
      } else {
        ctx.fillStyle = '#4a201e';
      }
      ctx.fill();

      // Needle
      const needleAngle = startAngle + needlePos * (endAngle - startAngle);
      const nCos = Math.cos(needleAngle);
      const nSin = Math.sin(needleAngle);
      const needleLen = radius + 9;

      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX + 2, pivotY + 2);
      ctx.lineTo(pivotX + nCos * needleLen + 2, pivotY + nSin * needleLen + 2);
      ctx.stroke();

      ctx.strokeStyle = '#181412';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX + nCos * needleLen, pivotY + nSin * needleLen);
      ctx.stroke();

      ctx.fillStyle = '#1d1916';
      ctx.beginPath();
      ctx.arc(pivotX, height + 7, 20, Math.PI, 0);
      ctx.fill();

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [mode, label, width, height]);

  return (
    <div
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '3px solid #2b231b',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)',
        width: `${width}px`,
        height: `${height}px`,
        flexShrink: 0
      }}
    >
      <canvas ref={canvasRef} style={{ width: `${width}px`, height: `${height}px`, display: 'block' }} />
    </div>
  );
}
