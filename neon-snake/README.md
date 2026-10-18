# 🐍 Neon Snake Arcade

A modern, responsive retro-arcade Snake game built with HTML5 Canvas, Vanilla JavaScript, procedural Web Audio, and custom CSS styling.

Designed for mobile and desktop screens, featuring no-scroll full-width mobile framing, custom themes, real-time speed adjustment, and a Top 10 Hall of Fame leaderboard.

---

## ⚡ Features

- **📱 Mobile Optimized**:
  - Full-width edge-to-edge game arena on phones.
  - Wide, thumb-friendly D-Pad touch controls with big direction arrows.
  - No vertical scrolling required on any mobile screen.
  - Fullscreen floating modals for menus, settings, and high scores.
- **🏆 Top 10 Hall of Fame**:
  - Persistent local leaderboard saving ranks, pilot names, scores, and snake length.
  - Name entry prompt when achieving a new Top 10 record.
  - Clickable High Score card to view the leaderboard at any time.
- **⚡ Real-time Speed Slider**:
  - Dynamic game speed scaling from 0.5x (Crawl) to 3.0x (Insane).
- **🎨 4 Retro Themes**:
  - **Neon**: Cyber blue, hot pink, and radiant glow.
  - **Matrix**: Phosphor green and digital terminal aesthetic.
  - **Cyberpunk**: Golden yellow, neon orange, and purple hues.
  - **Game Boy**: Classic 4-shade LCD retro green palette.
- **🔊 Procedural Web Audio**:
  - Crunch, arpeggio bonus chords, and retro synth sound effects generated live using Web Audio API oscillators (no external audio files needed).
- **💥 Particle Physics Engine**:
  - Visual particle bursts on eating apples and crashing.

---

## 🕹️ Controls

| Action | Desktop Keys | Mobile Controls |
| :--- | :--- | :--- |
| **Move Up** | <kbd>W</kbd> or <kbd>↑</kbd> | <kbd>▲</kbd> Button or Swipe Up |
| **Move Down** | <kbd>S</kbd> or <kbd>↓</kbd> | <kbd>▼</kbd> Button or Swipe Down |
| **Move Left** | <kbd>A</kbd> or <kbd>←</kbd> | <kbd>◀</kbd> Button or Swipe Left |
| **Move Right** | <kbd>D</kbd> or <kbd>→</kbd> | <kbd>▶</kbd> Button or Swipe Right |
| **Pause / Resume** | <kbd>Space</kbd> | <kbd>⏸</kbd> Center Button |
| **Restart Game** | <kbd>R</kbd> | Tap Board or Overlay Button |
| **Adjust Speed** | <kbd>−</kbd> / <kbd>+</kbd> or <kbd>[</kbd> / <kbd>]</kbd> | Touch Slider |
| **Toggle Mute** | <kbd>M</kbd> | Speaker Icon Button |

---

## 🚀 Deployment

### GitHub Pages
1. Push this repository to GitHub under your account.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy-pages.yml` will automatically build and publish your game!

### Cloudflare Pages
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select this repository and click **Save and Deploy**.
4. Your game is live worldwide on `*.pages.dev`!

---

Crafted with HTML5 Canvas, Web Audio & Vanilla JavaScript.
