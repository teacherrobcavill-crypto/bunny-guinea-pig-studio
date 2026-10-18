// ========================================================
// 🐰 BARNABY BUNNY & PIP GUINEA PIG LIVE AI CODE PATCH
// Generated: 2026-10-18 11:36:25
// Prompt: "Settings Synced"
// Game: dodger
// ========================================================

window.VIBE_CONFIG = {
  "speed": 5,
  "food": "\u2b50",
  "theme": "cyberpunk",
  "ghostMode": true,
  "spellsApplied": [],
  "discoRainbow": false,
  "game": "dodger"
};

// Live Game Runtime Hooks
(function() {
  const cfg = window.VIBE_CONFIG;
  if (!cfg) return;

  // 1. Neon Snake Engine hooks
  if (window.game) {
    if (cfg.food && window.game.customFoodEmoji !== undefined) window.game.customFoodEmoji = cfg.food;
    if (cfg.speed && window.game.setSpeedLevel) window.game.setSpeedLevel(cfg.speed, false);
    if (cfg.theme && window.game.applyTheme) window.game.applyTheme(cfg.theme === 'candy' ? 'cyberpunk' : cfg.theme);
  }

  // 2. Broadcast to any open play.html or standalone tab
  try {
    localStorage.setItem('vibe_state_dodger', JSON.stringify(cfg));
    localStorage.setItem('vibe_last_prompt', "Settings Synced");
    window.dispatchEvent(new CustomEvent('vibeUpdate', { detail: cfg }));
  } catch (e) {}

  console.log("🥕 [BARNABY & PIP AI] Successfully applied fluffy update:", "Settings Synced");
})();
