// ========================================================
// 🐰 BARNABY BUNNY & PIP GUINEA PIG LIVE AI CODE PATCH
// Generated: 2026-10-18 11:27:21
// Prompt: "Turn snacks into sweet pink strawberries and activate disco rainbow party mode!"
// Game: catcher
// ========================================================

window.VIBE_CONFIG = {
  "speed": 5,
  "food": "\ud83c\udf53",
  "theme": "candy",
  "ghostMode": true,
  "discoRainbow": true,
  "game": "catcher",
  "customColors": {
    "head": "#ffffff",
    "body": "#ec4899",
    "glow": "#f472b6",
    "bg": "#120417"
  }
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
    localStorage.setItem('vibe_state_catcher', JSON.stringify(cfg));
    localStorage.setItem('vibe_last_prompt', "Turn snacks into sweet pink strawberries and activate disco rainbow party mode!");
    window.dispatchEvent(new CustomEvent('vibeUpdate', { detail: cfg }));
  } catch (e) {}

  console.log("🥕 [BARNABY & PIP AI] Successfully applied fluffy update:", "Turn snacks into sweet pink strawberries and activate disco rainbow party mode!");
})();
