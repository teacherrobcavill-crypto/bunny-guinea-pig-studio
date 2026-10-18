# 💥 Block Blast - Modern Arcade Recreation

An authentic, juice-filled, zero-dependency recreation of the viral mobile puzzle game **Block Blast!**. Built entirely with vanilla HTML5, CSS3, modern ES6+ JavaScript, Canvas particle physics, and procedural Web Audio API synthesis.

🌐 **Play Online Live:** [https://blockblast.rjcmusicproduction.co.uk](https://blockblast.rjcmusicproduction.co.uk)

---

## 🚀 Quick Start

Open `index.html` directly in your browser:

```bash
# On macOS
open "block-blast/index.html"

# Or serve locally with Python if preferred
python3 -m http.server 8080
# then visit http://localhost:8080/block-blast/
```

- **Zero npm / zero dependencies**: Everything works out of the box directly off the file system.
- **No external sound files**: Web Audio API procedurally synthesizes every drop thump, snap tick, line clear chord, arpeggio, and fanfare.

---

## 🎮 How to Play

1. **Place Blocks**:
   - **Drag & Drop**: Touch or click-and-drag pieces from the bottom tray onto the 8×8 grid. On mobile touch screens, pieces automatically float above your thumb so you can see exactly where they align.
   - **Click-to-Place**: Tap a piece in the tray to select it, then tap any valid grid location on the board to drop it.
   - **Keyboard Navigation**: Press <kbd>1</kbd>, <kbd>2</kbd>, or <kbd>3</kbd> to select a piece, navigate with arrow keys, and press <kbd>Space</kbd> or <kbd>Enter</kbd> to drop. Press <kbd>R</kbd> to rotate all 3 pieces.

2. **Blast Lines**:
   - Complete any horizontal row (8 blocks) or vertical column (8 blocks) to blast it off the board.
   - Completing multiple lines simultaneously triggers a **Multi-Clear** (Double, Triple, Mega Blast).

3. **Combos & Streaks**:
   - Clearing lines on consecutive turns builds a **Combo Streak** (Combo ×2, ×3, ×4, ×5+).
   - Combos multiply your score exponentially and raise the musical key of the synthesized chord sequence.

4. **Power-Ups**:
   - 🔨 **Hammer**: Smash a 3×3 cluster of blocks anywhere on the grid to escape tight corners or defuse bombs.
   - 🔄 **Swap**: Discard the current 3 pieces and receive 3 brand new pieces.
   - 🔁 **Rotate All (Unlimited)**: Rotate all 3 pieces currently in the tray 90° clockwise with unlimited uses.

5. **Game Over**:
   - When none of the remaining pieces in the tray can fit anywhere on the board, the game ends.
   - If a new personal high score is achieved, celebratory confetti and victory fanfare are unleashed.

---

## ✨ Features & Mechanics

- **Smart Piece Generator**:
  - Contains over 30 classic tetromino, tromino, pentomino, corner, bar, dot, and square shapes.
  - Fair-play RNG ensures at least one generated piece is guaranteed to fit on the current board state whenever possible, preventing unfair instant losses.
- **Dynamic Previews**:
  - **Ghost Preview**: Shows exactly where the piece will drop before releasing.
  - **Line Clear Predictor**: Pre-highlights rows and columns with a pulsing shimmer if dropping the piece will clear them.
- **Procedural Web Audio API Engine**:
  - Crisp ascending pickup chirps.
  - Heavy bass-kick thuds on block drops.
  - Dynamic musical chords that modulate pitch up the scale with each combo step (C major → D major → E major → F major → cascading arpeggios).
  - Melancholy game-over cadence and triumphant high-score fanfare.
  - Sound volume slider and instant mute toggle with `localStorage` persistence.
- **Juice & Visual FX**:
  - High-performance Canvas particle engine with shattering block shards, sparkling stars, shockwaves, and confetti.
  - Dynamic screen shake proportional to blast impact.
  - Floating arcade score text (`+100`, `COMBO x3! +450`).
- **4 Visual Themes**:
  - ⚡ **Neon Arcade**: Glowing cyan, magenta, and amber cyber tiles with dark midnight backdrop.
  - 🪵 **Woodoku Classic**: Warm carved wood tiles, cedar slots, and polished aesthetic.
  - 💎 **Gem Blast**: Faceted royal crystalline jewels with purple and gold accents.
  - 🍬 **Candy Pop**: Playful marshmallow and pastel bubblegum blocks.
- **2 Game Modes**:
  - **Classic Endless**: Authentic, pure Block Blast experience.
  - **Bomb Rush**: Special bomb blocks spawn with countdown timers (e.g. 9 moves). Clear their line before the counter reaches 0!
- **Lifetime Statistics**:
  - Tracks total games played, total lines cleared, all-time highest combo, and total career score in `localStorage`.

---

## 📁 File Structure

```
block-blast/
├── index.html       # Semantic HTML5 layout, modals, tray, and HUD
├── style.css        # Responsive mobile-first CSS, 3D block styles, animations & themes
├── shapes.js        # 30+ Block definitions, weights, and smart placement validation
├── audio.js         # Pure Web Audio API procedural synthesizer
├── particles.js     # Canvas particle physics (shards, stars, shockwaves, confetti)
├── game.js          # Main game state machine, drag-and-drop, line clears & power-ups
└── README.md        # Documentation and guide
```
