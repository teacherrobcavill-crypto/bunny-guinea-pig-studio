/**
 * Block Blast - Core Game Engine
 * Handles board state, input handling (touch, mouse, pointer, click-to-place, keyboard),
 * piece placement, line clears, multi-combos, scoring, audio triggers, particle effects,
 * power-ups, and game-over detection.
 */

class BlockBlastGame {
  constructor() {
    // 8x8 Board: 0 = empty, or { color, id, isBomb, bombTimer }
    this.board = Array(8).fill(null).map(() => Array(8).fill(0));
    this.trayPieces = [null, null, null];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('blockblast_highscore') || '0', 10);
    this.comboStreak = 0;
    this.maxComboSession = 0;
    this.linesClearedSession = 0;
    this.isGameOver = false;
    this.gameMode = 'classic'; // 'classic' or 'blast' (bombs)
    this.moveCount = 0;

    // Power-ups
    this.powerups = {
      hammer: 2,
      refresh: 2,
      rotate: Infinity
    };
    this.activePowerup = null; // 'hammer'

    // Selected piece (for click-to-place and keyboard navigation)
    this.selectedTrayIndex = null;
    this.kbCursor = { row: 3, col: 3 };

    // Drag state
    this.dragState = {
      isDragging: false,
      trayIndex: null,
      piece: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      offsetY: 0,
      hoverRow: null,
      hoverCol: null,
      isValidHover: false
    };

    // DOM Elements
    this.initElements();

    // Visual FX System
    this.particles = new ParticleSystem(this.fxCanvas);

    // Initialize listeners
    this.initEventListeners();

    // Start new game
    this.startNewGame();
  }

  initElements() {
    this.boardEl = document.getElementById('board-grid');
    this.boardWrapper = document.getElementById('board-wrapper');
    this.fxCanvas = document.getElementById('fx-canvas');
    this.traySlots = [
      document.getElementById('slot-0'),
      document.getElementById('slot-1'),
      document.getElementById('slot-2')
    ];
    this.dragAvatar = document.getElementById('drag-avatar');

    // Stats
    this.scoreDisplay = document.getElementById('score-display');
    this.highScoreDisplay = document.getElementById('highscore-display');
    this.comboPill = document.getElementById('combo-pill');
    this.comboText = document.getElementById('combo-text');

    // Modals
    this.gameOverModal = document.getElementById('gameover-modal');
    this.statsModal = document.getElementById('stats-modal');
    this.rulesModal = document.getElementById('rules-modal');
    this.settingsModal = document.getElementById('settings-modal');

    // Power-up buttons
    this.btnHammer = document.getElementById('powerup-hammer');
    this.btnRefresh = document.getElementById('powerup-refresh');
    this.btnRotate = document.getElementById('powerup-rotate');

    // Standalone host detection (Cloudflare Pages, GitHub Pages)
    if (window.location.protocol !== 'file:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      document.querySelectorAll('.local-arcade-link').forEach(el => el.style.display = 'none');
    }
  }

  initEventListeners() {
    // Window resize -> particles resize
    window.addEventListener('resize', () => {
      this.particles.resize();
    });

    // Theme selector
    const savedTheme = localStorage.getItem('blockblast_theme') || 'neon';
    this.setTheme(savedTheme);

    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.setTheme(theme);
        window.soundCtrl?.playClick();
      });
    });

    // Sound toggle buttons
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = window.soundCtrl?.toggleMute();
        this.updateSoundBtnUI(isMuted);
      });
    }

    const soundSlider = document.getElementById('volume-slider');
    if (soundSlider) {
      soundSlider.value = window.soundCtrl?.volume || 0.7;
      soundSlider.addEventListener('input', (e) => {
        window.soundCtrl?.setVolume(parseFloat(e.target.value));
      });
    }

    // Modal controls
    document.getElementById('btn-help')?.addEventListener('click', () => {
      window.soundCtrl?.playClick();
      this.rulesModal.classList.add('active');
    });

    document.getElementById('btn-stats')?.addEventListener('click', () => {
      window.soundCtrl?.playClick();
      this.updateStatsModal();
      this.statsModal.classList.add('active');
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      window.soundCtrl?.playClick();
      this.settingsModal.classList.add('active');
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        window.soundCtrl?.playClick();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Modal overlay click outside to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && modal !== this.gameOverModal) {
          modal.classList.remove('active');
        }
      });
    });

    // Restart button in game over modal and header
    document.getElementById('btn-restart-game')?.addEventListener('click', () => {
      window.soundCtrl?.playClick();
      this.gameOverModal.classList.remove('active');
      this.startNewGame();
    });

    document.getElementById('btn-restart-header')?.addEventListener('click', () => {
      window.soundCtrl?.playClick();
      if (confirm('Start a new game? Current score will be reset.')) {
        this.startNewGame();
      }
    });

    // Game mode selector
    const modeSelect = document.getElementById('mode-selector');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        this.gameMode = e.target.value;
        this.startNewGame();
      });
    }

    // Power-up clicks
    this.btnHammer?.addEventListener('click', () => this.toggleHammer());
    this.btnRefresh?.addEventListener('click', () => this.useRefresh());
    this.btnRotate?.addEventListener('click', () => this.useRotate());

    // Tray Drag & Drop (Pointer Events for Touch & Mouse)
    this.traySlots.forEach((slot, index) => {
      slot.addEventListener('pointerdown', (e) => this.onTrayPointerDown(e, index));
    });

    window.addEventListener('pointermove', (e) => this.onWindowPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onWindowPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onWindowPointerCancel(e));

    // Board click (for click-to-place and hammer power-up)
    this.boardEl.addEventListener('click', (e) => this.onBoardClick(e));

    // Keyboard support
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('blockblast_theme', theme);
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  updateSoundBtnUI(isMuted) {
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.innerHTML = isMuted ? '🔇' : '🔊';
      soundBtn.title = isMuted ? 'Sound Muted' : 'Sound On';
    }
  }

  startNewGame() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(0));
    this.score = 0;
    this.comboStreak = 0;
    this.maxComboSession = 0;
    this.linesClearedSession = 0;
    this.isGameOver = false;
    this.selectedTrayIndex = null;
    this.moveCount = 0;

    // Reset power-ups
    this.powerups = {
      hammer: 2,
      refresh: 2,
      rotate: Infinity
    };
    this.activePowerup = null;
    this.updatePowerupBadges();

    this.updateScoreUI();
    this.hideComboPill();
    this.buildBoardDOM();
    this.replenishTray();
    this.particles.resize();
  }

  // =========================================================================
  // DOM Rendering
  // =========================================================================

  buildBoardDOM() {
    this.boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `cell-${r}-${c}`;
        this.boardEl.appendChild(cell);
      }
    }
    this.renderBoard();
  }

  renderBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (!cellEl) continue;

        cellEl.innerHTML = '';
        cellEl.className = 'board-cell';

        const data = this.board[r][c];
        if (data !== 0) {
          const tile = document.createElement('div');
          tile.className = `block-tile color-${data.color}`;
          if (data.isBomb) {
            tile.classList.add('bomb');
            const counter = document.createElement('span');
            counter.className = 'bomb-counter';
            counter.textContent = data.bombTimer;
            tile.appendChild(counter);
          }
          cellEl.appendChild(tile);
        }
      }
    }
  }

  renderTray(animateRotate = false) {
    this.traySlots.forEach((slot, index) => {
      slot.innerHTML = '';
      const piece = this.trayPieces[index];
      if (!piece) return;

      const pieceEl = document.createElement('div');
      pieceEl.className = 'tray-piece';
      if (animateRotate) {
        pieceEl.classList.add('rotated');
      }
      pieceEl.id = `tray-piece-${index}`;
      pieceEl.dataset.index = index;

      if (this.selectedTrayIndex === index) {
        pieceEl.classList.add('selected');
      }

      // Check if piece can fit anywhere
      const canFit = ShapeManager.canPieceFitAnywhere(this.board, piece.matrix);
      if (!canFit) {
        pieceEl.classList.add('unplaceable');
      }

      pieceEl.style.gridTemplateColumns = `repeat(${piece.cols}, 1fr)`;

      for (let r = 0; r < piece.rows; r++) {
        for (let c = 0; c < piece.cols; c++) {
          const cell = document.createElement('div');
          if (piece.matrix[r][c] !== 0) {
            cell.className = `tray-cell color-${piece.color}`;
          } else {
            cell.className = 'tray-cell empty';
          }
          pieceEl.appendChild(cell);
        }
      }

      slot.appendChild(pieceEl);
    });

    this.updatePowerupBadges();
  }

  replenishTray() {
    this.trayPieces = ShapeManager.generatePieceSet(this.board, 3);
    this.renderTray();
    this.checkGameOver();
  }

  updateScoreUI() {
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = this.score.toLocaleString();
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('blockblast_highscore', this.highScore);
    }
    if (this.highScoreDisplay) {
      this.highScoreDisplay.textContent = this.highScore.toLocaleString();
    }
  }

  showComboPill(combo) {
    if (!this.comboPill || !this.comboText) return;
    const icons = ['🔥', '⚡', '💥', '🌟', '👑'];
    const icon = icons[Math.min(combo - 1, icons.length - 1)];
    this.comboText.textContent = `${icon} COMBO x${combo}!`;
    this.comboPill.classList.add('visible');
  }

  hideComboPill() {
    if (this.comboPill) {
      this.comboPill.classList.remove('visible');
    }
  }

  updatePowerupBadges() {
    const hammerBadge = document.getElementById('badge-hammer');
    const refreshBadge = document.getElementById('badge-refresh');
    const rotateBadge = document.getElementById('badge-rotate');

    if (hammerBadge) hammerBadge.textContent = this.powerups.hammer;
    if (refreshBadge) refreshBadge.textContent = this.powerups.refresh;
    if (rotateBadge) rotateBadge.textContent = '∞';

    if (this.btnHammer) {
      this.btnHammer.disabled = this.powerups.hammer <= 0;
      this.btnHammer.classList.toggle('active', this.activePowerup === 'hammer');
    }
    if (this.btnRefresh) this.btnRefresh.disabled = this.powerups.refresh <= 0;
    if (this.btnRotate) {
      const hasAnyPiece = this.trayPieces && this.trayPieces.some(p => p !== null);
      this.btnRotate.disabled = !hasAnyPiece || this.isGameOver;
    }
  }

  // =========================================================================
  // Drag & Drop Pointer Event Handling
  // =========================================================================

  onTrayPointerDown(e, slotIndex) {
    if (this.isGameOver) return;
    const piece = this.trayPieces[slotIndex];
    if (!piece) return;

    // Hammer power-up active? Cancel hammer if picking piece
    if (this.activePowerup === 'hammer') {
      this.toggleHammer(false);
    }

    window.soundCtrl?.playPick();

    // Setup drag state
    this.dragState.isDragging = true;
    this.dragState.trayIndex = slotIndex;
    this.dragState.piece = piece;
    this.dragState.pointerId = e.pointerId;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;

    // Offset piece upward on touch so thumb doesn't obscure it
    const isTouch = e.pointerType === 'touch';
    this.dragState.offsetY = isTouch ? -75 : -30;

    // Hide original tray piece during drag
    const originalPieceEl = document.getElementById(`tray-piece-${slotIndex}`);
    if (originalPieceEl) {
      originalPieceEl.style.opacity = '0.2';
    }

    // Setup Drag Avatar
    this.renderDragAvatar(piece);
    this.updateDragAvatarPosition(e.clientX, e.clientY + this.dragState.offsetY);
    this.dragAvatar.style.display = 'block';

    // Capture pointer
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  renderDragAvatar(piece) {
    this.dragAvatar.innerHTML = '';
    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / 8;
    const pieceEl = document.createElement('div');
    pieceEl.className = 'tray-piece';
    pieceEl.style.gridTemplateColumns = `repeat(${piece.cols}, 1fr)`;
    pieceEl.style.gap = '5px';

    for (let r = 0; r < piece.rows; r++) {
      for (let c = 0; c < piece.cols; c++) {
        const cell = document.createElement('div');
        if (piece.matrix[r][c] !== 0) {
          cell.className = `tray-cell color-${piece.color}`;
        } else {
          cell.className = 'tray-cell empty';
        }
        cell.style.width = `${Math.floor(cellSize) - 6}px`;
        cell.style.height = `${Math.floor(cellSize) - 6}px`;
        pieceEl.appendChild(cell);
      }
    }
    this.dragAvatar.appendChild(pieceEl);
  }

  updateDragAvatarPosition(x, y) {
    const avatarRect = this.dragAvatar.getBoundingClientRect();
    const posX = x - (avatarRect.width / 2);
    const posY = y - (avatarRect.height / 2);
    this.dragAvatar.style.left = `${posX}px`;
    this.dragAvatar.style.top = `${posY}px`;
  }

  onWindowPointerMove(e) {
    if (!this.dragState.isDragging) return;
    if (this.dragState.pointerId !== null && e.pointerId !== this.dragState.pointerId) return;

    this.dragState.currentX = e.clientX;
    this.dragState.currentY = e.clientY;

    const targetY = e.clientY + this.dragState.offsetY;
    this.updateDragAvatarPosition(e.clientX, targetY);

    // Compute board hover coordinates
    this.updateBoardGhost(e.clientX, targetY);
  }

  updateBoardGhost(pointerX, pointerY) {
    const piece = this.dragState.piece;
    if (!piece) return;

    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    // Piece dimensions in px
    const pieceWidthPx = piece.cols * cellSize;
    const pieceHeightPx = piece.rows * cellSize;

    // Top-left of piece relative to board
    const relLeft = (pointerX - pieceWidthPx / 2) - boardRect.left;
    const relTop = (pointerY - pieceHeightPx / 2) - boardRect.top;

    // Snap to nearest grid row/col
    const targetCol = Math.round(relLeft / cellSize);
    const targetRow = Math.round(relTop / cellSize);

    const isValid = ShapeManager.canPieceFitAt(this.board, piece.matrix, targetRow, targetCol);

    if (isValid) {
      if (!this.dragState.isValidHover || this.dragState.hoverRow !== targetRow || this.dragState.hoverCol !== targetCol) {
        window.soundCtrl?.playSnap();
      }
      this.dragState.isValidHover = true;
      this.dragState.hoverRow = targetRow;
      this.dragState.hoverCol = targetCol;
      this.drawGhostPreview(targetRow, targetCol, piece);
    } else {
      this.dragState.isValidHover = false;
      this.dragState.hoverRow = null;
      this.dragState.hoverCol = null;
      this.clearGhostPreview();
    }
  }

  drawGhostPreview(startRow, startCol, piece) {
    this.clearGhostPreview();

    // 1. Draw ghost cells of piece
    for (let r = 0; r < piece.rows; r++) {
      for (let c = 0; c < piece.cols; c++) {
        if (piece.matrix[r][c] !== 0) {
          const cellEl = document.getElementById(`cell-${startRow + r}-${startCol + c}`);
          if (cellEl) {
            cellEl.classList.add('ghost', `color-${piece.color}`);
          }
        }
      }
    }

    // 2. Check which rows/cols WOULD be cleared if placed here
    const tempBoard = this.board.map(row => [...row]);
    for (let r = 0; r < piece.rows; r++) {
      for (let c = 0; c < piece.cols; c++) {
        if (piece.matrix[r][c] !== 0) {
          tempBoard[startRow + r][startCol + c] = 1;
        }
      }
    }

    const completedRows = [];
    const completedCols = [];

    for (let r = 0; r < 8; r++) {
      if (tempBoard[r].every(v => v !== 0)) completedRows.push(r);
    }
    for (let c = 0; c < 8; c++) {
      let full = true;
      for (let r = 0; r < 8; r++) {
        if (tempBoard[r][c] === 0) {
          full = false;
          break;
        }
      }
      if (full) completedCols.push(c);
    }

    // Highlight will-clear lines
    completedRows.forEach(r => {
      for (let c = 0; c < 8; c++) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        cell?.classList.add('will-clear');
      }
    });

    completedCols.forEach(c => {
      for (let r = 0; r < 8; r++) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        cell?.classList.add('will-clear');
      }
    });
  }

  clearGhostPreview() {
    document.querySelectorAll('.board-cell.ghost').forEach(c => {
      c.classList.remove('ghost');
      const colors = ['cyan','sky','blue','indigo','amber','gold','orange','lime','purple','emerald','magenta','green','rose','teal','coral'];
      colors.forEach(col => c.classList.remove(`color-${col}`));
    });
    document.querySelectorAll('.board-cell.will-clear').forEach(c => {
      c.classList.remove('will-clear');
    });
  }

  onWindowPointerUp(e) {
    if (!this.dragState.isDragging) return;

    const { trayIndex, piece, isValidHover, hoverRow, hoverCol, startX, startY, currentX, currentY } = this.dragState;

    // Check if it was just a tap/click without moving much (distance < 10px)
    const dist = Math.hypot(currentX - startX, currentY - startY);
    const wasTap = dist < 12;

    this.dragAvatar.style.display = 'none';
    this.clearGhostPreview();

    const originalPieceEl = document.getElementById(`tray-piece-${trayIndex}`);
    if (originalPieceEl) {
      originalPieceEl.style.opacity = '1';
    }

    if (isValidHover && hoverRow !== null && hoverCol !== null) {
      // Successful drop!
      this.placePiece(trayIndex, hoverRow, hoverCol);
    } else if (wasTap) {
      // Toggle select for click-to-place mode
      this.toggleSelectTrayPiece(trayIndex);
    }

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.trayIndex = null;
    this.dragState.piece = null;
    this.dragState.pointerId = null;
    this.dragState.isValidHover = false;
    this.dragState.hoverRow = null;
    this.dragState.hoverCol = null;
  }

  onWindowPointerCancel(e) {
    if (!this.dragState.isDragging) return;
    this.dragAvatar.style.display = 'none';
    this.clearGhostPreview();
    const originalPieceEl = document.getElementById(`tray-piece-${this.dragState.trayIndex}`);
    if (originalPieceEl) originalPieceEl.style.opacity = '1';

    this.dragState.isDragging = false;
    this.dragState.trayIndex = null;
    this.dragState.piece = null;
    this.dragState.pointerId = null;
  }

  // =========================================================================
  // Click-to-Place Alternative Interaction
  // =========================================================================

  toggleSelectTrayPiece(index) {
    if (this.selectedTrayIndex === index) {
      this.selectedTrayIndex = null;
    } else {
      this.selectedTrayIndex = index;
    }
    this.renderTray();
  }

  onBoardClick(e) {
    if (this.isGameOver) return;

    const cellEl = e.target.closest('.board-cell');
    if (!cellEl) return;

    const r = parseInt(cellEl.dataset.row, 10);
    const c = parseInt(cellEl.dataset.col, 10);

    // Hammer powerup mode
    if (this.activePowerup === 'hammer') {
      this.executeHammerAt(r, c);
      return;
    }

    // Click-to-place with selected tray piece
    if (this.selectedTrayIndex !== null) {
      const piece = this.trayPieces[this.selectedTrayIndex];
      if (!piece) return;

      if (ShapeManager.canPieceFitAt(this.board, piece.matrix, r, c)) {
        this.placePiece(this.selectedTrayIndex, r, c);
        this.selectedTrayIndex = null;
        this.renderTray();
      } else {
        // Invalid placement - shake the board slightly
        this.boardWrapper.classList.remove('shake-sm');
        void this.boardWrapper.offsetWidth;
        this.boardWrapper.classList.add('shake-sm');
      }
    }
  }

  // =========================================================================
  // Piece Placement & Line Clear Engine
  // =========================================================================

  placePiece(trayIndex, startRow, startCol) {
    const piece = this.trayPieces[trayIndex];
    if (!piece) return;

    this.moveCount++;
    window.soundCtrl?.playDrop();
    navigator.vibrate?.([20, 25]);

    // Place blocks on board
    for (let r = 0; r < piece.rows; r++) {
      for (let c = 0; c < piece.cols; c++) {
        if (piece.matrix[r][c] !== 0) {
          const boardR = startRow + r;
          const boardC = startCol + c;

          // In Arcade mode, small chance of spawning a Bomb
          const isBomb = this.gameMode === 'blast' && Math.random() < 0.12 && this.moveCount > 5;
          this.board[boardR][boardC] = {
            color: piece.color,
            id: piece.id,
            isBomb: isBomb,
            bombTimer: isBomb ? 9 : 0
          };
        }
      }
    }

    // Points for placing blocks
    const placePoints = piece.blockCount * 10;
    this.addScore(placePoints);

    // Floating text for placement
    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / 8;
    const dropCenterX = (startCol + piece.cols / 2) * cellSize;
    const dropCenterY = (startRow + piece.rows / 2) * cellSize;
    this.particles.addFloatingText(dropCenterX, dropCenterY, `+${placePoints}`, 'score');

    // Remove piece from tray
    this.trayPieces[trayIndex] = null;
    this.selectedTrayIndex = null;
    this.renderBoard();
    this.renderTray();

    // Check line clears!
    this.processLineClears(dropCenterX, dropCenterY);
  }

  processLineClears(dropX, dropY) {
    const completedRows = [];
    const completedCols = [];

    // Find full rows
    for (let r = 0; r < 8; r++) {
      if (this.board[r].every(v => v !== 0)) {
        completedRows.push(r);
      }
    }

    // Find full cols
    for (let c = 0; c < 8; c++) {
      let isFull = true;
      for (let r = 0; r < 8; r++) {
        if (this.board[r][c] === 0) {
          isFull = false;
          break;
        }
      }
      if (isFull) completedCols.push(c);
    }

    const linesCount = completedRows.length + completedCols.length;

    if (linesCount > 0) {
      this.comboStreak++;
      this.linesClearedSession += linesCount;
      if (this.comboStreak > this.maxComboSession) {
        this.maxComboSession = this.comboStreak;
      }

      // Audio feedback
      window.soundCtrl?.playClear(linesCount, this.comboStreak);
      if (this.comboStreak >= 3) {
        window.soundCtrl?.playComboFanfare(this.comboStreak);
      }

      // Screen Shake
      this.boardWrapper.classList.remove('shake-sm', 'shake-md', 'shake-lg');
      void this.boardWrapper.offsetWidth;
      if (linesCount === 1) {
        this.boardWrapper.classList.add('shake-sm');
      } else if (linesCount === 2 || linesCount === 3) {
        this.boardWrapper.classList.add('shake-md');
      } else {
        this.boardWrapper.classList.add('shake-lg');
      }

      // Calculate score with combo multiplier
      const baseLinePoints = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600];
      const lineScore = baseLinePoints[Math.min(linesCount, baseLinePoints.length - 1)] || (linesCount * 400);
      const comboMultiplier = 1 + (this.comboStreak - 1) * 0.5;
      const totalPoints = Math.round(lineScore * comboMultiplier);

      this.addScore(totalPoints);

      // Show combo pill
      if (this.comboStreak >= 2) {
        this.showComboPill(this.comboStreak);
      }

      // Shockwave and floating text
      const boardRect = this.boardEl.getBoundingClientRect();
      const cellSize = boardRect.width / 8;
      const blastX = dropX || (boardRect.width / 2);
      const blastY = dropY || (boardRect.height / 2);

      this.particles.addShockwave(blastX, blastY, 130 + (linesCount * 30), '#ffffff');

      let bannerText = `+${totalPoints}`;
      if (this.comboStreak >= 2) {
        bannerText = `COMBO x${this.comboStreak}! +${totalPoints}`;
      }
      this.particles.addFloatingText(blastX, blastY, bannerText, this.comboStreak >= 2 ? 'combo' : 'score');

      // Unique cells to explode
      const cellsToClear = new Set();
      completedRows.forEach(r => {
        for (let c = 0; c < 8; c++) cellsToClear.add(`${r},${c}`);
      });
      completedCols.forEach(c => {
        for (let r = 0; r < 8; r++) cellsToClear.add(`${r},${c}`);
      });

      // Explode each cell and animate shatter
      cellsToClear.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const data = this.board[r][c];
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        const tileEl = cellEl?.querySelector('.block-tile');

        if (tileEl) {
          tileEl.classList.add('clearing');
        }

        const cellX = c * cellSize;
        const cellY = r * cellSize;
        this.particles.explodeCell(cellX, cellY, cellSize, data?.color || 'cyan');
      });

      // Clear after animation
      setTimeout(() => {
        cellsToClear.forEach(coord => {
          const [r, c] = coord.split(',').map(Number);
          this.board[r][c] = 0;
        });
        this.renderBoard();
        this.postTurnCheck();
      }, 260);

    } else {
      // No lines cleared -> reset combo streak
      this.comboStreak = 0;
      this.hideComboPill();
      this.postTurnCheck();
    }
  }

  postTurnCheck() {
    // In Arcade mode, decrement bomb timers
    if (this.gameMode === 'blast') {
      let bombExploded = false;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = this.board[r][c];
          if (cell && cell.isBomb) {
            cell.bombTimer--;
            if (cell.bombTimer <= 0) {
              bombExploded = true;
            }
          }
        }
      }
      this.renderBoard();

      if (bombExploded) {
        this.triggerGameOver('A bomb exploded! Defuse them by clearing their line.');
        return;
      }
    }

    // If all tray pieces used, replenish!
    if (this.trayPieces.every(p => p === null)) {
      this.replenishTray();
    } else {
      this.renderTray();
      this.checkGameOver();
    }
  }

  addScore(pts) {
    this.score += pts;
    this.updateScoreUI();
    this.scoreDisplay?.classList.remove('pop');
    void this.scoreDisplay?.offsetWidth;
    this.scoreDisplay?.classList.add('pop');
  }

  // =========================================================================
  // Game Over Handling
  // =========================================================================

  checkGameOver() {
    const activePieces = this.trayPieces.filter(p => p !== null);
    if (activePieces.length === 0) return;

    // Check if ANY active piece can fit ANYWHERE
    const canAnyFit = activePieces.some(piece => ShapeManager.canPieceFitAnywhere(this.board, piece.matrix));

    if (!canAnyFit) {
      setTimeout(() => {
        this.triggerGameOver();
      }, 350);
    }
  }

  triggerGameOver(customReason = null) {
    this.isGameOver = true;
    window.soundCtrl?.playGameOver();

    // Check high score
    const isNewHigh = this.score >= this.highScore && this.score > 0;
    if (isNewHigh) {
      setTimeout(() => {
        window.soundCtrl?.playNewHighScore();
        this.particles.spawnConfetti(120);
      }, 400);
    }

    // Save statistics
    this.saveGameStats();

    // Populate Game Over Modal
    document.getElementById('modal-final-score').textContent = this.score.toLocaleString();
    document.getElementById('modal-high-score').textContent = this.highScore.toLocaleString();
    document.getElementById('modal-lines-blasted').textContent = this.linesClearedSession;
    document.getElementById('modal-max-combo').textContent = this.maxComboSession;

    const reasonEl = document.getElementById('modal-gameover-reason');
    if (reasonEl) {
      reasonEl.textContent = customReason || (isNewHigh ? '🎉 Fantastic! New High Score!' : 'No more valid moves remaining!');
    }

    this.gameOverModal.classList.add('active');
  }

  saveGameStats() {
    const stats = JSON.parse(localStorage.getItem('blockblast_stats') || '{}');
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.totalLines = (stats.totalLines || 0) + this.linesClearedSession;
    stats.highestCombo = Math.max(stats.highestCombo || 0, this.maxComboSession);
    stats.totalScore = (stats.totalScore || 0) + this.score;
    localStorage.setItem('blockblast_stats', JSON.stringify(stats));
  }

  updateStatsModal() {
    const stats = JSON.parse(localStorage.getItem('blockblast_stats') || '{}');
    document.getElementById('stat-games-played').textContent = stats.gamesPlayed || 0;
    document.getElementById('stat-total-lines').textContent = stats.totalLines || 0;
    document.getElementById('stat-best-combo').textContent = stats.highestCombo || 0;
    document.getElementById('stat-total-score').textContent = (stats.totalScore || 0).toLocaleString();
  }

  // =========================================================================
  // Power-Ups (Hammer, Refresh Tray, Rotate)
  // =========================================================================

  toggleHammer(forceState = null) {
    if (this.powerups.hammer <= 0) return;
    this.activePowerup = forceState !== null ? (forceState ? 'hammer' : null) : (this.activePowerup === 'hammer' ? null : 'hammer');
    this.updatePowerupBadges();
    if (this.activePowerup === 'hammer') {
      window.soundCtrl?.playPowerup();
      this.selectedTrayIndex = null;
      this.renderTray();
    }
  }

  executeHammerAt(r, c) {
    if (this.powerups.hammer <= 0) return;
    this.powerups.hammer--;
    this.activePowerup = null;
    this.updatePowerupBadges();

    window.soundCtrl?.playClear(2, 0);

    const boardRect = this.boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    // Clear 3x3 area around clicked cell
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const data = this.board[nr][nc];
          if (data !== 0) {
            this.board[nr][nc] = 0;
            this.particles.explodeCell(nc * cellSize, nr * cellSize, cellSize, data.color || 'white');
          }
        }
      }
    }

    this.particles.addShockwave(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, 140, '#fbbf24');
    this.particles.addFloatingText(c * cellSize, r * cellSize, 'SMASH! 🔨', 'mega');

    this.renderBoard();
    this.renderTray();
    this.checkGameOver();
  }

  useRefresh() {
    if (this.powerups.refresh <= 0) return;
    this.powerups.refresh--;
    this.updatePowerupBadges();
    window.soundCtrl?.playPowerup();

    this.replenishTray();
    this.particles.spawnConfetti(30);
  }

  useRotate() {
    if (this.isGameOver) return;

    // Check if there are any active pieces in tray
    const hasAnyPiece = this.trayPieces.some(p => p !== null);
    if (!hasAnyPiece) return;

    window.soundCtrl?.playPick();

    // Rotate all active pieces in tray 90 degrees clockwise
    this.trayPieces.forEach(piece => {
      if (piece) {
        piece.matrix = ShapeManager.rotateMatrix(piece.matrix);
        piece.rows = piece.matrix.length;
        piece.cols = piece.matrix[0].length;
      }
    });

    // Re-render tray with spin animation
    this.renderTray(true);

    // If drag ghost was showing or a piece is selected, re-check ghost/board preview
    if (this.dragState.isDragging && this.dragState.piece) {
      this.updateBoardGhost(this.dragState.currentX, this.dragState.currentY + this.dragState.offsetY);
    }

    this.checkGameOver();
  }

  // =========================================================================
  // Keyboard Accessibility
  // =========================================================================

  onKeyDown(e) {
    if (this.isGameOver) {
      if (e.key === 'Enter' || e.key === ' ') {
        this.gameOverModal.classList.remove('active');
        this.startNewGame();
      }
      return;
    }

    if (e.key === '1') this.toggleSelectTrayPiece(0);
    else if (e.key === '2') this.toggleSelectTrayPiece(1);
    else if (e.key === '3') this.toggleSelectTrayPiece(2);
    else if (e.key === 'Escape') {
      this.selectedTrayIndex = null;
      this.activePowerup = null;
      this.updatePowerupBadges();
      this.clearGhostPreview();
      this.renderTray();
    } else if (e.key === 'r' || e.key === 'R') {
      this.useRotate();
    } else if (e.key === 'm' || e.key === 'M') {
      window.soundCtrl?.toggleMute();
    }
  }
}

// Instantiate game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.blockBlastGame = new BlockBlastGame();
});
