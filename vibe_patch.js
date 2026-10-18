// Antigravity Kids Vibe Patch - Auto-generated 2026-10-18 10:48:53
window.VIBE_CONFIG = {
  "speed": 5,
  "food": "\ud83e\udd55",
  "theme": "gold",
  "ghostMode": true,
  "spellsApplied": []
};

// ========================================================
// 🐰 BARNABY BUNNY & PIP GUINEA PIG LIVE VIBE CODE PATCH
// Generated: 18/10/2026, 10:48:53
// Prompt: "Settings Synced"
// Target: Pip's Piggy Pong
// ========================================================

window.VIBE_CONFIG = {
  "speed": 5,
  "food": "🥕",
  "theme": "gold",
  "ghostMode": true,
  "spellsApplied": []
};

// Real game hooks:
if (window.SnakeGame && window.game) {
  if (window.VIBE_CONFIG.food) window.game.customFoodEmoji = "🥕";
  if (window.VIBE_CONFIG.speed) window.game.setSpeedLevel(5, false);
}
console.log("🥕 [VIBE PATCH] Active config pushed successfully!");
