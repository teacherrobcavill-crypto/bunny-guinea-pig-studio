/**
 * NEON SNAKE ARCADE
 * A modern, responsive Snake game featuring procedural Web Audio,
 * particle physics, multiple themes, difficulty modes, and touch controls.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playEat() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playBonus() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  playDie() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const now = this.ctx.currentTime;
    // Low crunch oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, color, count = 12, speedMultiplier = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedMultiplier;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 20
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

const SPEED_CONFIG = [
  { level: 1, ms: 175, mult: '0.5x', label: 'Crawl' },
  { level: 2, ms: 140, mult: '0.6x', label: 'Chill' },
  { level: 3, ms: 120, mult: '0.75x', label: 'Easy' },
  { level: 4, ms: 105, mult: '0.85x', label: 'Casual' },
  { level: 5, ms: 90,  mult: '1.0x', label: 'Classic' },
  { level: 6, ms: 75,  mult: '1.2x', label: 'Brisk' },
  { level: 7, ms: 62,  mult: '1.45x', label: 'Fast' },
  { level: 8, ms: 50,  mult: '1.8x', label: 'Turbo' },
  { level: 9, ms: 40,  mult: '2.25x', label: 'Hyper' },
  { level: 10, ms: 30, mult: '3.0x', label: 'Insane' },
];

const DEFAULT_LEADERBOARD = [
  { name: 'VIPER', score: 380, len: 41, date: '14/10' },
  { name: 'CYBER', score: 310, len: 34, date: '14/10' },
  { name: 'PHANTOM', score: 260, len: 29, date: '14/10' },
  { name: 'BLITZ', score: 210, len: 24, date: '14/10' },
  { name: 'TITAN', score: 180, len: 21, date: '14/10' },
  { name: 'GHOST', score: 140, len: 17, date: '14/10' },
  { name: 'FLASH', score: 110, len: 14, date: '14/10' },
  { name: 'APEX', score: 90, len: 12, date: '14/10' },
  { name: 'PILOT', score: 60, len: 9, date: '14/10' },
  { name: 'NEO', score: 40, len: 7, date: '14/10' }
];

class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // UI elements
    this.scoreEl = document.getElementById('score-display');
    this.highscoreEl = document.getElementById('highscore-display');
    this.lengthEl = document.getElementById('length-display');
    this.speedEl = document.getElementById('speed-display');

    // Speed Slider Elements
    this.speedSlider = document.getElementById('speed-slider');
    this.speedSliderBadge = document.getElementById('speed-slider-badge');
    this.speedMinusBtn = document.getElementById('speed-minus-btn');
    this.speedPlusBtn = document.getElementById('speed-plus-btn');

    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.deathReasonEl = document.getElementById('death-reason');

    this.finalScoreEl = document.getElementById('final-score');
    this.finalBestEl = document.getElementById('final-best');
    this.finalApplesEl = document.getElementById('final-apples');
    this.finalTimeEl = document.getElementById('final-time');
    this.newRecordBanner = document.getElementById('new-record-banner');

    // Leaderboard Elements
    this.leaderboardOverlay = document.getElementById('leaderboard-overlay');
    this.leaderboardTbody = document.getElementById('leaderboard-tbody');
    this.top10EntryBox = document.getElementById('top10-entry-box');
    this.leaderboardNameInput = document.getElementById('leaderboard-name-input');
    this.saveLeaderboardBtn = document.getElementById('save-leaderboard-btn');
    this.btnLeaderboard = document.getElementById('btn-leaderboard');
    this.highscoreCard = document.getElementById('highscore-card');
    this.viewLeaderboardFromGameover = document.getElementById('view-leaderboard-from-gameover');
    this.closeLeaderboardX = document.getElementById('close-leaderboard-x');
    this.closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

    this.bonusTimerBar = document.getElementById('bonus-timer-bar');
    this.bonusTimerProgress = document.getElementById('bonus-timer-progress');

    this.soundBtn = document.getElementById('sound-btn');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundLabel = document.getElementById('sound-label');
    this.themeBtn = document.getElementById('theme-btn');
    this.themeName = document.getElementById('theme-name');

    // Audio & Particles
    this.sound = new SoundController();
    this.particles = new ParticleSystem();

    // Board Configuration
    this.gridCount = 24; // 24x24 tiles
    this.tileSize = this.canvas.width / this.gridCount; // 25px per tile

    // Game States: 'READY', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'READY';

    // Settings
    this.speedLevel = 5; // Default Level 5 (Classic 1.0x)
    this.baseSpeedMs = 90;
    this.currentSpeedMs = 90;
    this.wallMode = 'solid'; // 'solid' or 'portal'
    this.themes = ['neon', 'cyberpunk', 'matrix', 'gameboy'];
    this.currentThemeIdx = 0;

    // Game loop timing
    this.lastTickTime = 0;
    this.lastStepTime = 0;
    this.gameStartTime = 0;
    this.elapsedPlayTime = 0;

    // Game Data
    this.score = 0;
    this.leaderboard = this.loadLeaderboard();
    this.hasSavedScoreThisRound = false;

    let savedHighScore = parseInt(localStorage.getItem('neon_snake_highscore') || '0', 10);
    if (this.leaderboard.length > 0 && this.leaderboard[0].score > savedHighScore) {
      savedHighScore = this.leaderboard[0].score;
      localStorage.setItem('neon_snake_highscore', savedHighScore.toString());
    }
    this.highScore = savedHighScore;

    this.applesEaten = 0;
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.inputQueue = [];
    this.food = { x: 0, y: 0 };
    this.bonusFood = null; // { x, y, duration, remaining }
    this.tongueFlick = 0;
    this.screenShake = 0;

    // Load persisted settings
    this.loadSettings();

    // Bind listeners
    this.initEvents();

    // Initial render
    this.highscoreEl.textContent = this.highScore;
    this.renderLeaderboard();
    this.resetGame();
    this.render();

    // Start requestAnimationFrame loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadSettings() {
    const savedTheme = localStorage.getItem('neon_snake_theme');
    if (savedTheme && this.themes.includes(savedTheme)) {
      this.currentThemeIdx = this.themes.indexOf(savedTheme);
      this.applyTheme(savedTheme);
    }
    const savedSpeed = parseInt(localStorage.getItem('neon_snake_speed_level'), 10);
    if (!isNaN(savedSpeed) && savedSpeed >= 1 && savedSpeed <= 10) {
      this.setSpeedLevel(savedSpeed, false);
    } else {
      this.setSpeedLevel(5, false);
    }
  }

  setSpeedLevel(level, playSound = false) {
    const clampedLevel = Math.max(1, Math.min(10, level));
    this.speedLevel = clampedLevel;
    const config = SPEED_CONFIG[clampedLevel - 1];

    this.baseSpeedMs = config.ms;
    this.currentSpeedMs = config.ms;

    if (this.speedSlider) {
      this.speedSlider.value = clampedLevel;
    }
    if (this.speedSliderBadge) {
      this.speedSliderBadge.textContent = config.mult;
    }
    if (this.speedEl) {
      this.speedEl.textContent = config.mult;
    }

    // Sync start overlay preset buttons
    const diffButtons = document.querySelectorAll('#difficulty-selector .seg-btn');
    diffButtons.forEach(btn => {
      const btnLevel = parseInt(btn.dataset.level, 10);
      if (btnLevel === clampedLevel) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    localStorage.setItem('neon_snake_speed_level', clampedLevel.toString());

    if (playSound) {
      this.sound.playClick();
    }
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.themeName.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    localStorage.setItem('neon_snake_theme', theme);
  }

  cycleTheme() {
    this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
    const nextTheme = this.themes[this.currentThemeIdx];
    this.applyTheme(nextTheme);
    this.sound.playClick();
  }

  toggleSound() {
    const on = this.sound.toggle();
    this.soundIcon.textContent = on ? '🔊' : '🔇';
    this.soundLabel.textContent = on ? 'SFX On' : 'Muted';
    if (on) this.sound.playClick();
  }

  resetGame() {
    const midX = Math.floor(this.gridCount / 2);
    const midY = Math.floor(this.gridCount / 2);

    this.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY }
    ];

    this.direction = { x: 1, y: 0 };
    this.inputQueue = [];
    this.score = 0;
    this.applesEaten = 0;
    const config = SPEED_CONFIG[this.speedLevel - 1];
    this.baseSpeedMs = config.ms;
    this.currentSpeedMs = config.ms;
    this.bonusFood = null;
    this.screenShake = 0;
    this.particles.clear();
    this.bonusTimerBar.classList.add('hidden');
    this.hasSavedScoreThisRound = false;
    if (this.top10EntryBox) {
      this.top10EntryBox.classList.add('hidden');
    }

    this.updateHUD();
    this.spawnFood();
  }

  startGame() {
    this.sound.init();
    this.sound.playClick();
    this.resetGame();
    this.state = 'PLAYING';
    const now = performance.now();
    this.gameStartTime = now;
    this.lastTickTime = now;
    this.lastStepTime = now;
    this.elapsedPlayTime = 0;

    this.startOverlay.classList.remove('active');
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    if (this.leaderboardOverlay) {
      this.leaderboardOverlay.classList.add('hidden');
    }
  }

  pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseOverlay.classList.remove('hidden');
      this.sound.playClick();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      const now = performance.now();
      this.lastTickTime = now;
      this.lastStepTime = now;
      this.pauseOverlay.classList.add('hidden');
      this.sound.playClick();
    }
  }

  gameOver(reason = 'CRASHED!') {
    this.state = 'GAMEOVER';
    this.sound.playDie();
    this.screenShake = 18;
    this.hasSavedScoreThisRound = false;

    // Spawn explosion particles for snake segments
    const computedStyles = getComputedStyle(document.body);
    const color = computedStyles.getPropertyValue('--snake-head').trim() || '#00f0ff';
    for (const segment of this.snake) {
      const px = segment.x * this.tileSize + this.tileSize / 2;
      const py = segment.y * this.tileSize + this.tileSize / 2;
      this.particles.spawn(px, py, color, 6, 1.2);
    }

    // High Score check
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('neon_snake_highscore', this.highScore.toString());
      this.highscoreEl.textContent = this.highScore;
    }

    // Populate game over modal
    this.deathReasonEl.textContent = reason;
    this.finalScoreEl.textContent = this.score;
    this.finalBestEl.textContent = this.highScore;
    this.finalApplesEl.textContent = this.applesEaten;
    this.finalTimeEl.textContent = this.formatTime(this.elapsedPlayTime);

    if (isNewRecord && this.score > 0) {
      this.newRecordBanner.classList.remove('hidden');
    } else {
      this.newRecordBanner.classList.add('hidden');
    }

    // Top 10 qualification check
    if (this.top10EntryBox) {
      if (this.qualifiesForLeaderboard(this.score)) {
        this.top10EntryBox.classList.remove('hidden');
        if (this.leaderboardNameInput) {
          const savedName = localStorage.getItem('neon_snake_pilot_name') || 'PILOT';
          this.leaderboardNameInput.value = savedName;
          setTimeout(() => {
            this.leaderboardNameInput.focus();
            this.leaderboardNameInput.select();
          }, 500);
        }
      } else {
        this.top10EntryBox.classList.add('hidden');
      }
    }

    setTimeout(() => {
      this.gameoverOverlay.classList.remove('hidden');
    }, 450);
  }

  loadLeaderboard() {
    try {
      const stored = localStorage.getItem('neon_snake_leaderboard');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 10);
        }
      }
    } catch (e) {
      console.warn('Could not parse leaderboard from localStorage', e);
    }
    return [...DEFAULT_LEADERBOARD];
  }

  saveLeaderboard(list) {
    this.leaderboard = list.slice(0, 10);
    try {
      localStorage.setItem('neon_snake_leaderboard', JSON.stringify(this.leaderboard));
    } catch (e) {
      console.warn('Could not save leaderboard to localStorage', e);
    }
  }

  qualifiesForLeaderboard(score) {
    if (score <= 0) return false;
    if (this.leaderboard.length < 10) return true;
    return score > this.leaderboard[this.leaderboard.length - 1].score;
  }

  renderLeaderboard(highlightIndex = -1) {
    if (!this.leaderboardTbody) return;
    this.leaderboardTbody.innerHTML = '';

    const medals = ['🥇', '🥈', '🥉'];

    this.leaderboard.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      if (idx === highlightIndex) {
        tr.className = 'highlight-current';
      }

      const rankBadge = idx < 3 ? `${medals[idx]} ${idx + 1}` : `#${idx + 1}`;
      const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';

      tr.innerHTML = `
        <td><span class="rank-badge ${rankClass}">${rankBadge}</span></td>
        <td><span class="pilot-name">${this.escapeHtml(entry.name || 'PILOT')}</span></td>
        <td class="score-cell">${entry.score || 0}</td>
        <td class="len-cell">${entry.len || '-'}</td>
      `;
      this.leaderboardTbody.appendChild(tr);
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  openLeaderboard(highlightIndex = -1) {
    this.renderLeaderboard(highlightIndex);
    if (this.leaderboardOverlay) {
      this.leaderboardOverlay.classList.remove('hidden');
    }
    this.sound.playClick();
  }

  closeLeaderboard() {
    if (this.leaderboardOverlay) {
      this.leaderboardOverlay.classList.add('hidden');
    }
    this.sound.playClick();
  }

  saveCurrentScoreToLeaderboard() {
    if (this.hasSavedScoreThisRound) return;
    const rawName = this.leaderboardNameInput ? this.leaderboardNameInput.value.trim() : '';
    const pilotName = (rawName || localStorage.getItem('neon_snake_pilot_name') || 'PILOT').toUpperCase().slice(0, 10);
    localStorage.setItem('neon_snake_pilot_name', pilotName);

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}`;
    const newEntry = {
      name: pilotName,
      score: this.score,
      len: this.snake.length,
      date: dateStr
    };

    const updated = [...this.leaderboard, newEntry];
    updated.sort((a, b) => b.score - a.score);
    const top10 = updated.slice(0, 10);
    const newIndex = top10.indexOf(newEntry);

    this.saveLeaderboard(top10);
    this.hasSavedScoreThisRound = true;

    // Update high score display if this score became #1
    if (top10[0].score > this.highScore) {
      this.highScore = top10[0].score;
      localStorage.setItem('neon_snake_highscore', this.highScore.toString());
      this.highscoreEl.textContent = this.highScore;
      this.finalBestEl.textContent = this.highScore;
    }

    if (this.top10EntryBox) {
      this.top10EntryBox.classList.add('hidden');
    }

    this.sound.playBonus();
    this.openLeaderboard(newIndex);
  }

  formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  spawnFood() {
    let valid = false;
    let newX, newY;

    while (!valid) {
      newX = Math.floor(Math.random() * this.gridCount);
      newY = Math.floor(Math.random() * this.gridCount);

      valid = !this.snake.some(segment => segment.x === newX && segment.y === newY);
      if (this.bonusFood && this.bonusFood.x === newX && this.bonusFood.y === newY) {
        valid = false;
      }
    }

    this.food = { x: newX, y: newY };
  }

  spawnBonusFood() {
    let valid = false;
    let newX, newY;

    while (!valid) {
      newX = Math.floor(Math.random() * this.gridCount);
      newY = Math.floor(Math.random() * this.gridCount);

      valid = !this.snake.some(segment => segment.x === newX && segment.y === newY) &&
              !(this.food.x === newX && this.food.y === newY);
    }

    const duration = 8000; // 8 seconds duration
    this.bonusFood = {
      x: newX,
      y: newY,
      duration,
      remaining: duration
    };

    this.bonusTimerBar.classList.remove('hidden');
  }

  queueDirection(newDir) {
    // Determine the baseline direction to test against (either current direction or last in queue)
    const lastDir = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.direction;

    // Prevent pressing same direction or 180-degree reversal
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) {
      return;
    }
    if (newDir.x + lastDir.x === 0 && newDir.y + lastDir.y === 0) {
      return;
    }

    // Limit queue length to 2 inputs to maintain responsive feeling
    if (this.inputQueue.length < 2) {
      this.inputQueue.push(newDir);
    }
  }

  updateHUD() {
    this.scoreEl.textContent = this.score;
    this.lengthEl.textContent = this.snake.length;
    const speedMultiplier = (90 / this.currentSpeedMs).toFixed(1);
    this.speedEl.textContent = `${speedMultiplier}x`;
  }

  step() {
    // Consume next input from queue
    if (this.inputQueue.length > 0) {
      this.direction = this.inputQueue.shift();
    }

    const head = this.snake[0];
    let nextX = head.x + this.direction.x;
    let nextY = head.y + this.direction.y;

    // Wall handling
    if (this.wallMode === 'portal') {
      if (nextX < 0) nextX = this.gridCount - 1;
      else if (nextX >= this.gridCount) nextX = 0;
      if (nextY < 0) nextY = this.gridCount - 1;
      else if (nextY >= this.gridCount) nextY = 0;
    } else {
      // Solid walls
      if (nextX < 0 || nextX >= this.gridCount || nextY < 0 || nextY >= this.gridCount) {
        this.gameOver('HIT THE WALL!');
        return;
      }
    }

    // Self-collision check
    const selfCollision = this.snake.some((seg, idx) => {
      // Allow moving into tail segment because tail will pop this frame
      if (idx === this.snake.length - 1) return false;
      return seg.x === nextX && seg.y === nextY;
    });

    if (selfCollision) {
      this.gameOver('BIT YOURSELF!');
      return;
    }

    const newHead = { x: nextX, y: nextY };
    this.snake.unshift(newHead);

    // Food collision
    let ateFood = false;
    const computedStyles = getComputedStyle(document.body);

    if (nextX === this.food.x && nextY === this.food.y) {
      ateFood = true;
      this.score += 10;
      this.applesEaten++;
      this.sound.playEat();

      // Spawn food particles
      const px = nextX * this.tileSize + this.tileSize / 2;
      const py = nextY * this.tileSize + this.tileSize / 2;
      const foodColor = computedStyles.getPropertyValue('--food-color').trim() || '#ff006a';
      this.particles.spawn(px, py, foodColor, 14, 1);

      this.spawnFood();

      // Trigger bonus food every 5 apples
      if (this.applesEaten % 5 === 0 && !this.bonusFood) {
        this.spawnBonusFood();
      }

      // Slightly increase speed as snake grows (capping at 40ms)
      if (this.currentSpeedMs > 42) {
        this.currentSpeedMs = Math.max(42, this.currentSpeedMs - 1.5);
      }
    }

    // Bonus food collision
    if (this.bonusFood && nextX === this.bonusFood.x && nextY === this.bonusFood.y) {
      this.score += 50;
      this.sound.playBonus();

      const px = nextX * this.tileSize + this.tileSize / 2;
      const py = nextY * this.tileSize + this.tileSize / 2;
      const goldColor = computedStyles.getPropertyValue('--golden-food').trim() || '#ffe600';
      this.particles.spawn(px, py, goldColor, 24, 1.8);

      this.bonusFood = null;
      this.bonusTimerBar.classList.add('hidden');
    }

    if (!ateFood) {
      this.snake.pop();
    }

    this.updateHUD();
  }

  gameLoop(timestamp) {
    if (!this.lastTickTime) this.lastTickTime = timestamp;
    const delta = timestamp - this.lastTickTime;

    if (this.state === 'PLAYING') {
      this.elapsedPlayTime += delta;

      // Bonus food timer countdown
      if (this.bonusFood) {
        this.bonusFood.remaining -= delta;
        const progress = Math.max(0, (this.bonusFood.remaining / this.bonusFood.duration) * 100);
        this.bonusTimerProgress.style.width = `${progress}%`;

        if (this.bonusFood.remaining <= 0) {
          this.bonusFood = null;
          this.bonusTimerBar.classList.add('hidden');
        }
      }

      // Game step based on speed
      if (timestamp - this.lastStepTime > this.currentSpeedMs) {
        this.step();
        this.lastStepTime = timestamp;
        this.tongueFlick = (this.tongueFlick + 1) % 6;
      }
    }

    // Update screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // Update particles
    this.particles.update();

    // Render canvas
    this.render();

    this.lastTickTime = timestamp;
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  render() {
    const { ctx, canvas, tileSize, gridCount } = this;
    ctx.save();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // Read theme styles
    const styles = getComputedStyle(document.body);
    const gridLineColor = styles.getPropertyValue('--grid-line').trim() || 'rgba(255,255,255,0.05)';
    const headColor = styles.getPropertyValue('--snake-head').trim() || '#00f0ff';
    const bodyStart = styles.getPropertyValue('--snake-body-start').trim() || '#00f0ff';
    const bodyEnd = styles.getPropertyValue('--snake-body-end').trim() || '#7000ff';
    const foodColor = styles.getPropertyValue('--food-color').trim() || '#ff006a';
    const goldenFoodColor = styles.getPropertyValue('--golden-food').trim() || '#ffe600';

    // 1. Draw subtle grid
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    for (let i = 1; i < gridCount; i++) {
      const p = i * tileSize;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }

    // 2. Draw Food (Apple)
    if (this.food) {
      const fx = this.food.x * tileSize + tileSize / 2;
      const fy = this.food.y * tileSize + tileSize / 2;
      const pulse = Math.sin(performance.now() * 0.008) * 1.5;
      const radius = (tileSize / 2 - 3) + pulse;

      ctx.save();
      ctx.shadowColor = foodColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = foodColor;
      ctx.beginPath();
      ctx.arc(fx, fy + 1, Math.max(3, radius), 0, Math.PI * 2);
      ctx.fill();

      // Leaf stem
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(fx + 2, fy - radius + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Bonus Food (Golden Star)
    if (this.bonusFood) {
      const bx = this.bonusFood.x * tileSize + tileSize / 2;
      const by = this.bonusFood.y * tileSize + tileSize / 2;
      const rotation = performance.now() * 0.003;
      const pulse = Math.sin(performance.now() * 0.015) * 2;
      const radius = (tileSize / 2 - 2) + pulse;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rotation);
      ctx.shadowColor = goldenFoodColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = goldenFoodColor;

      // Draw 5-pointed star
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = Math.cos(outerAngle) * radius;
        const oy = Math.sin(outerAngle) * radius;
        const ix = Math.cos(innerAngle) * (radius * 0.48);
        const iy = Math.sin(innerAngle) * (radius * 0.48);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. Draw Snake Body & Head
    if (this.snake.length > 0) {
      // Draw body segments (from tail to neck)
      for (let i = this.snake.length - 1; i > 0; i--) {
        const seg = this.snake[i];
        const progress = i / this.snake.length;
        const segColor = this.interpolateColor(bodyStart, bodyEnd, progress);

        const x = seg.x * tileSize;
        const y = seg.y * tileSize;
        const pad = 2;
        const r = 6;

        ctx.fillStyle = segColor;
        this.roundRect(ctx, x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, r);
      }

      // Draw Head
      const head = this.snake[0];
      const hx = head.x * tileSize;
      const hy = head.y * tileSize;
      const pad = 1.5;

      ctx.save();
      ctx.shadowColor = headColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = headColor;
      this.roundRect(ctx, hx + pad, hy + pad, tileSize - pad * 2, tileSize - pad * 2, 8);

      // Tongue Flick (periodic)
      if (this.state === 'PLAYING' && this.tongueFlick >= 4) {
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 4;
        const tLen = 6;
        const centerX = hx + tileSize / 2;
        const centerY = hy + tileSize / 2;

        ctx.beginPath();
        if (this.direction.x === 1) { // Right
          ctx.rect(hx + tileSize - pad, centerY - 1.5, tLen, 3);
        } else if (this.direction.x === -1) { // Left
          ctx.rect(hx + pad - tLen, centerY - 1.5, tLen, 3);
        } else if (this.direction.y === 1) { // Down
          ctx.rect(centerX - 1.5, hy + tileSize - pad, 3, tLen);
        } else if (this.direction.y === -1) { // Up
          ctx.rect(centerX - 1.5, hy + pad - tLen, 3, tLen);
        }
        ctx.fill();
      }

      // Eyes on the head facing direction
      const eyeOffset = 6;
      const eyeRadius = 2.4;
      const pupilRadius = 1.2;
      let eye1 = { x: 0, y: 0 };
      let eye2 = { x: 0, y: 0 };

      const cx = hx + tileSize / 2;
      const cy = hy + tileSize / 2;

      if (this.direction.x === 1) { // Right
        eye1 = { x: cx + 4, y: cy - eyeOffset };
        eye2 = { x: cx + 4, y: cy + eyeOffset };
      } else if (this.direction.x === -1) { // Left
        eye1 = { x: cx - 4, y: cy - eyeOffset };
        eye2 = { x: cx - 4, y: cy + eyeOffset };
      } else if (this.direction.y === -1) { // Up
        eye1 = { x: cx - eyeOffset, y: cy - 4 };
        eye2 = { x: cx + eyeOffset, y: cy - 4 };
      } else if (this.direction.y === 1) { // Down
        eye1 = { x: cx - eyeOffset, y: cy + 4 };
        eye2 = { x: cx + eyeOffset, y: cy + 4 };
      }

      // Eye Whites
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
      ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#060814';
      ctx.beginPath();
      ctx.arc(eye1.x + this.direction.x * 0.8, eye1.y + this.direction.y * 0.8, pupilRadius, 0, Math.PI * 2);
      ctx.arc(eye2.x + this.direction.x * 0.8, eye2.y + this.direction.y * 0.8, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Draw Particles
    this.particles.draw(ctx);

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  interpolateColor(c1, c2, factor) {
    // If not hex, return first color as fallback
    if (!c1.startsWith('#') || !c2.startsWith('#')) return c1;
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);

    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `rgb(${r}, ${g}, ${b})`;
  }

  initEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      // If typing in the leaderboard name field, do not trigger game hotkeys
      if (e.target === this.leaderboardNameInput) {
        return;
      }

      // If leaderboard overlay is open, Escape closes it
      if (this.leaderboardOverlay && !this.leaderboardOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          this.closeLeaderboard();
        }
        return;
      }

      // Prevent browser scrolling with arrow keys & space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();

      // Spacebar: Start, Pause/Resume, or Restart
      if (e.key === ' ' || e.code === 'Space') {
        if (this.state === 'READY') {
          this.startGame();
        } else if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        } else if (this.state === 'GAMEOVER') {
          this.startGame();
        }
        return;
      }

      // R key: Quick Restart
      if (key === 'r') {
        this.startGame();
        return;
      }

      // M key: Toggle Mute
      if (key === 'm') {
        this.toggleSound();
        return;
      }

      // Adjust speed via keyboard (-/+, [/])
      if (key === '-' || key === '_') {
        this.setSpeedLevel(this.speedLevel - 1, true);
        return;
      }
      if (key === '+' || key === '=') {
        this.setSpeedLevel(this.speedLevel + 1, true);
        return;
      }
      if (key === '[') {
        this.setSpeedLevel(this.speedLevel - 1, true);
        return;
      }
      if (key === ']') {
        this.setSpeedLevel(this.speedLevel + 1, true);
        return;
      }

      if (this.state !== 'PLAYING') return;

      // Directions
      if (key === 'arrowup' || key === 'w') {
        this.queueDirection({ x: 0, y: -1 });
      } else if (key === 'arrowdown' || key === 's') {
        this.queueDirection({ x: 0, y: 1 });
      } else if (key === 'arrowleft' || key === 'a') {
        this.queueDirection({ x: -1, y: 0 });
      } else if (key === 'arrowright' || key === 'd') {
        this.queueDirection({ x: 1, y: 0 });
      }
    });

    // UI Buttons with reliable touch & click handling
    const bindAction = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let lastTrigger = 0;
      const onAction = (e) => {
        const now = Date.now();
        if (now - lastTrigger < 250) return;
        lastTrigger = now;
        handler();
      };
      el.addEventListener('click', onAction);
      el.addEventListener('pointerdown', onAction);
    };

    bindAction('start-btn', () => this.startGame());
    bindAction('resume-btn', () => this.resumeGame());
    bindAction('restart-btn', () => this.startGame());
    bindAction('restart-from-pause-btn', () => this.startGame());

    // Leaderboard button bindings
    bindAction('btn-leaderboard', () => this.openLeaderboard());
    bindAction('highscore-card', () => this.openLeaderboard());
    bindAction('view-leaderboard-from-gameover', () => this.openLeaderboard());
    bindAction('close-leaderboard-x', () => this.closeLeaderboard());
    bindAction('close-leaderboard-btn', () => this.closeLeaderboard());
    bindAction('save-leaderboard-btn', () => this.saveCurrentScoreToLeaderboard());

    // Close leaderboard when clicking backdrop outside the card
    if (this.leaderboardOverlay) {
      this.leaderboardOverlay.addEventListener('click', (e) => {
        if (e.target === this.leaderboardOverlay) {
          this.closeLeaderboard();
        }
      });
    }

    // Submit player name on Enter key in input field
    if (this.leaderboardNameInput) {
      this.leaderboardNameInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          this.saveCurrentScoreToLeaderboard();
        }
      });
    }

    // Tapping board also starts game when ready or game over
    this.canvas.addEventListener('pointerdown', () => {
      if (this.leaderboardOverlay && !this.leaderboardOverlay.classList.contains('hidden')) {
        return;
      }
      if (this.state === 'READY' || this.state === 'GAMEOVER') {
        this.startGame();
      }
    });

    this.soundBtn.addEventListener('click', () => this.toggleSound());
    this.themeBtn.addEventListener('click', () => this.cycleTheme());

    // Speed Slider Controls
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        this.setSpeedLevel(parseInt(e.target.value, 10), false);
      });
      this.speedSlider.addEventListener('change', () => {
        this.sound.playClick();
      });
    }

    if (this.speedMinusBtn) {
      this.speedMinusBtn.addEventListener('click', () => {
        this.setSpeedLevel(this.speedLevel - 1, true);
      });
    }

    if (this.speedPlusBtn) {
      this.speedPlusBtn.addEventListener('click', () => {
        this.setSpeedLevel(this.speedLevel + 1, true);
      });
    }

    // Difficulty preset selector buttons
    const diffButtons = document.querySelectorAll('#difficulty-selector .seg-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.level, 10);
        if (!isNaN(level)) {
          this.setSpeedLevel(level, true);
        }
      });
    });

    // Wall rules selector buttons
    const wallButtons = document.querySelectorAll('#wall-selector .seg-btn');
    wallButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        wallButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wallMode = btn.dataset.walls;
        this.sound.playClick();
      });
    });

    // On-screen D-Pad
    const bindTouch = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      let lastTrigger = 0;
      const handler = (e) => {
        if (e.cancelable) e.preventDefault();
        const now = Date.now();
        if (now - lastTrigger < 90) return;
        lastTrigger = now;
        action();
      };
      el.addEventListener('pointerdown', handler);
      el.addEventListener('touchstart', handler, { passive: false });
    };

    bindTouch('btn-up', () => this.queueDirection({ x: 0, y: -1 }));
    bindTouch('btn-down', () => this.queueDirection({ x: 0, y: 1 }));
    bindTouch('btn-left', () => this.queueDirection({ x: -1, y: 0 }));
    bindTouch('btn-right', () => this.queueDirection({ x: 1, y: 0 }));
    bindTouch('btn-pause', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
      else if (this.state === 'READY' || this.state === 'GAMEOVER') this.startGame();
    });

    // Swipe gestures on canvas for mobile
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 25) { // Minimum swipe threshold
          if (absX > absY) {
            // Horizontal swipe
            if (dx > 0) this.queueDirection({ x: 1, y: 0 });
            else this.queueDirection({ x: -1, y: 0 });
          } else {
            // Vertical swipe
            if (dy > 0) this.queueDirection({ x: 0, y: 1 });
            else this.queueDirection({ x: 0, y: -1 });
          }
        }
      }
    }, { passive: true });
  }
}

// Instantiate game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new SnakeGame();
});
