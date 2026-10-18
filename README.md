# 🐰 Bunny & Guinea Pig Vibe Studio & Arcade 🐹

A creative web arcade and kid-friendly **"Vibe Coding" Studio** featuring Barnaby the Bunny 🐰 and Pip the Guinea Pig 🐹! Kids can either vibe-code existing arcade games (changing foods to carrots and apples, adjusting speeds, switching themes and controls) or create brand new games from scratch (like *Meadow Catcher*, *Fluffy Space Dodger*, or *Pip's Piggy Pong*) with AI prompts and visual buttons!

---

## 🚀 Quick Launch

### 1. Web / Desktop Launch
- **Bunny & Guinea Pig Studio:** Open [`vibe.html`](file:///Volumes/TOSHIBA%20EXT/Antigravity%20Work/vibe.html) in your browser.
- **Arcade Hub:** Open [`index.html`](file:///Volumes/TOSHIBA%20EXT/Antigravity%20Work/index.html) in your browser.

### 2. Live Phone & Cloudflare Arcade Server
Run the arcade launcher to start the local Python server and Cloudflare live tunnel:
```bash
./start-arcade.sh
```
This gives you an instant local URL (`http://localhost:8080/vibe.html`) and an instant public Cloudflare HTTPS tunnel for playing on any mobile phone or tablet!

---

## ☁️ Cloudflare Pages Deployment
To deploy this repository directly on **Cloudflare Pages**:
1. Log into your Cloudflare Dashboard and go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select repository: `teacherrobcavill-crypto/bunny-guinea-pig-studio`.
3. Set build configuration:
   - **Framework preset**: None
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/` (root)
4. Click **Save and Deploy**. Every `git push` to `main` will automatically build and publish your latest games and studio updates!

---

# 🐉 Fighting Fantasy: Titan Reborn & Web Arcade

Open `fighting-fantasy/index.html` in any browser or launch directly from terminal:
```bash
open "fighting-fantasy/index.html"
```

### ✨ Highlights & Core Architecture:
* **Authentic Livingstone & Jackson Gamebook Engine**: 
  * Branching numbered section architecture with authentic second-person narrative voice (*"YOU are the hero"*).
  * Devious deathtraps, puzzle locks, riddle doors, secret section jumps, and three ancient keys (*Iron Key #42, Brass Key #119, Bone Key #88*).
  * Multiple replayable endings: *The Savior of Allansia (True Hero)*, *The Dark Sovereign of Titan (Cursed Usurper)*, and classic *Your Adventure Ends Here* demises.
* **100% On-Screen Paperless Mechanics**:
  * **Interactive Adventure Sheet**: Real-time tracking of SKILL, STAMINA, and LUCK.
  * **Animated 3D Dice Roller**: Physics-tumbled 1d6 and 2d6 rolls with procedural wood-clatter sound synthesis.
  * **Push-Your-Luck**: Classic *Test Your Luck* mechanics on hits and defenses (Luck depletes by 1 each time it is tested!).
  * **"Keep Your Finger in the Page"**: 3 digital bookmark ribbon slots allowing you to bookmark sections and rewind from fatal traps.
  * **Supplies & Consumables**: Eat trail meal provisions outside of combat to recover 4 STAMINA; quaff starting potions (*Potion of Skill, Potion of Strength, Potion of Fortune*).
* **World of Warcraft Hybrid Combat System**:
  * **5 Hero Archetypes**:
    * ⚔️ *The Juggernaut (Warrior)*: Generates **Rage** from taking and dealing hits. Heavy plate defense, *Heroic Strike*, *Pummel* (interrupt), *Shield Slam* (stun), *Execute* (<30% HP finisher), and *Shield Wall* (75% damage reduction).
    * 🗡️ *The Shadowblade (Rogue)*: Regenerating **Energy** and **Combo Points**. 15% passive dodge, *Sinister Strike*, *Kick* (interrupt), *Kidney Shot* (stun finisher), *Eviscerate* (damage finisher), and *Cloak of Shadows* (spell immunity & DoT cleanse).
    * 🔮 *The Arcanist (Mage)*: **Mana** pool management. Spells bypass physical armor. *Fireball* (with Ignite DoT), *Counterspell* (interrupt), *Frost Nova* (freeze), *Pyroblast* (massive direct damage), and *Ice Barrier* (10-point absorb shield).
    * 🛡️ *The Sunsworn (Paladin)*: **Holy Power** + Mana. Bonus damage vs Undead/Demons. *Crusader Strike*, *Judgment* (debuff), *Hammer of Justice* (stun), *Word of Glory* (heal), and *Divine Shield* (complete invulnerability bubble!).
    * 🗡️ *Classic Hero (1982 Purist)*: Pure Momentum & push-your-luck tactics for old-school purists.
  * **Raid Boss Mechanics**:
    * **Telegraphed Casts**: Dangerous enemy spells (*Chaos Nova, Petrifying Breath, Hellfire*) display a cast timer requiring a well-timed **Interrupt** (*Pummel / Kick / Counterspell / Hammer*).
    * **Phases & Adds**: Bosses summon minions (*Void Walkers, Clockwork Spider Drones, Hobgoblin Bowmen*) that require target switching or tactical CC.
    * **Soft Enrage**: High-threat bosses enter blood frenzy on turn 6 or 8!
    * **Tactical & Environmental Exploits**: Multiple ways to win each encounter — sever chandelier ropes to crush foes, splash Holy Water on undead, throw flash-powder to blind bosses, or distract beasts with meat rations.
* **Interactive Dungeon Automap & Lore Codex**:
  * Real-time vector SVG automap automatically charts explored chambers, paths, and current hero location.
  * Bestiary Codex logs defeated horrors with lore snippets.
* **Procedural Web Audio Engine**:
  * Zero external MP3 downloads: 100% synthesized dice rattle, parchment rustle, blade clashes, shield blocks, critical hits, magical spells, victory fanfares, and toggleable cavern ambience.

---

## 🕹️ Other Games in this Workspace


### 💥 1. Block Blast Arcade Recreation
Double-click `block-blast/index.html` or open it from your terminal:
```bash
open "block-blast/index.html"
```
* **Full faithful recreation**: 8×8 grid, 30+ shapes, smart placement algorithm, combo streak multiplier, screen shake, and physics particle explosions.
* **Procedural Web Audio**: Real-time synthesized drops, snap clicks, and chord sequences that raise musical key with combo streaks.
* **4 Themes & 2 Modes**: Neon Arcade, Woodoku, Gem Blast, and Candy Pop; Classic Endless and Bomb Rush modes.
* **Power-ups & Accessibility**: Hammer (3×3 smash), Swap tray, Rotate piece, Touch drag offset, and full keyboard navigation.

---

### 🐍 2. Neon Snake Web Arcade
Double-click `index.html` or open it from your terminal:
```bash
open index.html
```

### 💻 3. Snake Terminal Edition (`snake_cli.py`)
```bash
python3 snake_cli.py
```

---

## ✨ Features

### Web Arcade
- **Fluid Visuals & Animations**:
  - Glowing snake segments with gradient body interpolation.
  - Direction-aware eyes and periodic animated tongue flicks.
  - Pulsing apples and shimmering golden star bonuses with time bars.
  - Particle explosion system for eating food and crashing.
  - Subtle camera screen-shake on impact.
- **Procedural 8-bit Audio (Web Audio API)**:
  - Custom synthesized chimes for apples, triumphant arpeggios for golden stars, crunch tones for crashes, and UI blips.
  - Sound toggle with mute status persistence.
- **Speed Control Slider & Presets**:
  - **Interactive Speed Slider**: 10 fine-grained speed levels ranging from `0.5x` (Relaxed Crawl) up to `3.0x` (Insane Turbo).
  - **Real-Time On-The-Fly Adjustment**: Drag the slider or click `−` / `+` at any time—even mid-game!
  - **Difficulty Presets**: Quick buttons for Chill (`0.6x`), Classic (`1.0x`), Turbo (`1.8x`), and Insane (`3.0x`), fully synced with the slider.
  - **Keyboard Shortcuts**: Tap <kbd>−</kbd> or <kbd>+</kbd> (or <kbd>[</kbd> / <kbd>]</kbd>) to nudge the speed up or down during gameplay.
- **2 Wall Rules**:
  - **Solid Walls**: Traditional death on collision.
  - **Portal Mode**: Pac-Man style wrap-around mechanics.
- **4 Visual Themes**:
  - ⚡ **Neon**: Electric cyan & magenta cyberpunk glow.
  - 🕶️ **Matrix**: Phosphor green monochrome terminal aesthetic.
  - 🌆 **Cyberpunk**: Hot magenta and electric yellow synthwave palette.
  - 🕹️ **GameBoy**: Nostalgic olive-tinted LCD retro handheld styling.
- **Responsive & Mobile Ready**:
  - On-screen touch D-pad for mobile and tablets.
  - Canvas touch swipe support (swipe up/down/left/right).
- **Persistent Settings & High Scores**:
  - Saves your theme, preferred speed level, and high scores in `localStorage`.

---

## 🕹️ Controls

### Keyboard (Web & Terminal)
| Action | Key(s) |
| :--- | :--- |
| **Move Up** | <kbd>W</kbd> or <kbd>↑</kbd> |
| **Move Down** | <kbd>S</kbd> or <kbd>↓</kbd> |
| **Move Left** | <kbd>A</kbd> or <kbd>←</kbd> |
| **Move Right** | <kbd>D</kbd> or <kbd>→</kbd> |
| **Adjust Speed** | <kbd>−</kbd> / <kbd>+</kbd> or <kbd>[</kbd> / <kbd>]</kbd> |
| **Pause / Resume** | <kbd>Space</kbd> |
| **Quick Restart** | <kbd>R</kbd> (or <kbd>Space</kbd> on Game Over) |
| **Mute / Unmute** | <kbd>M</kbd> |

### Touch / Mouse (Web)
- Drag the **Speed Slider** or tap **`−`** and **`+`** to change speed.
- Tap the on-screen **D-Pad** arrows to steer.
- Or swipe directly on the game board in the direction you want the snake to slither.

---

## 📁 Project Structure

```
├── index.html       # Responsive game UI, HUD, modal overlays & D-Pad
├── style.css        # Neon glow aesthetics, CSS variables & theme palettes
├── game.js          # Web Audio synth, particle engine, input queue & logic
├── snake_cli.py     # Standalone terminal curses version
└── README.md        # Documentation and gameplay guide
```
