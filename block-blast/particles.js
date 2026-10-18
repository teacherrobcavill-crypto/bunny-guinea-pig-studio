/**
 * Block Blast - Particle FX & Canvas Visuals Engine
 * Handles shattering block shards, sparkling stars, shockwaves,
 * floating score numbers, and high-score confetti celebrations.
 */

const COLOR_MAP = {
  cyan: '#00f0ff',
  sky: '#38bdf8',
  blue: '#3b82f6',
  indigo: '#6366f1',
  amber: '#fbbf24',
  gold: '#f59e0b',
  orange: '#f97316',
  lime: '#a3e635',
  purple: '#a855f7',
  emerald: '#10b981',
  magenta: '#ec4899',
  green: '#22c55e',
  rose: '#f43f5e',
  teal: '#14b8a6',
  coral: '#ff6b6b',
  white: '#ffffff'
};

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.floaters = [];
    this.confetti = [];
    this.shockwaves = [];
    this.running = false;
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  /**
   * Spawn shattering square shards from a block cell
   */
  explodeCell(x, y, cellSize, colorName = 'cyan') {
    const hex = COLOR_MAP[colorName] || colorName || '#00f0ff';
    const count = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      const size = (cellSize * 0.16) + Math.random() * (cellSize * 0.18);

      this.particles.push({
        x: x + cellSize / 2 + (Math.random() - 0.5) * (cellSize * 0.5),
        y: y + cellSize / 2 + (Math.random() - 0.5) * (cellSize * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0, // slight upward impulse
        size: size,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
        color: hex,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        gravity: 0.18,
        shape: Math.random() > 0.4 ? 'square' : 'star'
      });
    }

    this.start();
  }

  /**
   * Trigger an expanding shockwave ring at blast epicenter
   */
  addShockwave(x, y, maxRadius = 120, color = '#ffffff') {
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius,
      width: 6,
      color,
      alpha: 0.9,
      decay: 0.035
    });
    this.start();
  }

  /**
   * Floating text particle for score & combo popups
   */
  addFloatingText(x, y, text, type = 'score', customColor = null) {
    let color = '#ffffff';
    let fontSize = 24;
    let textShadow = '0 0 12px rgba(0,0,0,0.8)';

    if (type === 'score') {
      color = customColor || '#fbbf24';
      fontSize = 22;
    } else if (type === 'combo') {
      color = '#f43f5e';
      fontSize = 32;
    } else if (type === 'mega') {
      color = '#a855f7';
      fontSize = 34;
    }

    this.floaters.push({
      x,
      y,
      text,
      color,
      fontSize,
      scale: 0.5,
      targetScale: 1.2,
      alpha: 1,
      vy: -1.6,
      life: 1.0,
      decay: 0.016
    });

    this.start();
  }

  /**
   * High score celebration confetti explosion
   */
  spawnConfetti(count = 80) {
    const palette = ['#00f0ff', '#fbbf24', '#f43f5e', '#a855f7', '#22c55e', '#ec4899', '#ffffff'];

    for (let i = 0; i < count; i++) {
      this.confetti.push({
        x: this.width * (0.2 + Math.random() * 0.6),
        y: this.height * 0.5 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 12,
        vy: -7 - Math.random() * 10,
        gravity: 0.25 + Math.random() * 0.1,
        drag: 0.98,
        w: 8 + Math.random() * 8,
        h: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        decay: 0.007 + Math.random() * 0.005
      });
    }

    this.start();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.16 + 2;
      sw.alpha -= sw.decay;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.strokeStyle = sw.color;
      this.ctx.globalAlpha = sw.alpha;
      this.ctx.lineWidth = sw.width * (sw.alpha);
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = sw.color;
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 2. Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;

      if (p.shape === 'star') {
        this.drawStar(this.ctx, 0, 0, 4, p.size, p.size * 0.45);
      } else {
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      this.ctx.restore();
    }

    // 3. Render Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.vx *= c.drag;
      c.rotation += c.vRot;
      c.alpha -= c.decay;

      if (c.alpha <= 0 || c.y > this.height + 50) {
        this.confetti.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rotation);
      this.ctx.fillStyle = c.color;
      this.ctx.globalAlpha = c.alpha;
      this.ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      this.ctx.restore();
    }

    // 4. Render Floating Text
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y += f.vy;
      f.life -= f.decay;
      if (f.scale < f.targetScale) {
        f.scale += (f.targetScale - f.scale) * 0.2;
      } else {
        f.scale = 1.0;
      }
      f.alpha = Math.max(0, f.life);

      if (f.alpha <= 0) {
        this.floaters.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(f.x, f.y);
      this.ctx.scale(f.scale, f.scale);
      this.ctx.globalAlpha = f.alpha;
      this.ctx.font = `900 ${f.fontSize}px 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Outline / glow
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      this.ctx.lineWidth = 5;
      this.ctx.strokeText(f.text, 0, 0);

      this.ctx.fillStyle = f.color;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = f.color;
      this.ctx.fillText(f.text, 0, 0);
      this.ctx.restore();
    }

    // Continue loop if active elements remain
    if (
      this.particles.length > 0 ||
      this.floaters.length > 0 ||
      this.confetti.length > 0 ||
      this.shockwaves.length > 0
    ) {
      requestAnimationFrame(this.loop.bind(this));
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}

window.ParticleSystem = ParticleSystem;
