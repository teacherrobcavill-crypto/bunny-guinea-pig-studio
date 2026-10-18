// ========================================================
// 🐰 BARNABY BUNNY & PIP GUINEA PIG LIVE AI CODE PATCH
// Generated: 2026-10-18 11:37:09
// Prompt: "Cute guinea pig and bunny face blocks with bouncy animations!"
// Game: blocks
// ========================================================

window.VIBE_CONFIG = {
  "speed": 8,
  "food": "\ud83d\udc30",
  "theme": "cyberpunk",
  "ghostMode": true,
  "spellsApplied": [],
  "discoRainbow": true,
  "game": "blocks",
  "customColors": null
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
    localStorage.setItem('vibe_state_blocks', JSON.stringify(cfg));
    localStorage.setItem('vibe_last_prompt', "Cute guinea pig and bunny face blocks with bouncy animations!");
    window.dispatchEvent(new CustomEvent('vibeUpdate', { detail: cfg }));
  } catch (e) {}

  console.log("🥕 [BARNABY & PIP AI] Successfully applied fluffy update:", "Cute guinea pig and bunny face blocks with bouncy animations!");
})();
