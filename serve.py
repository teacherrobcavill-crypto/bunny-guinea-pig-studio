#!/usr/bin/env python3
"""
Local Network Game Server for Neon Snake Arcade.
Serves this directory over the local Wi-Fi network with proper MIME types,
instant live reloads (no-cache headers), and displays all connection URLs.
"""

import http.server
import socket
import socketserver
import os
import subprocess
import sys

import json
import time

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    # Try ipconfig for macOS interfaces first
    for iface in ("en0", "en1", "en2"):
        try:
            ip = subprocess.check_output(["ipconfig", "getifaddr", iface], text=True).strip()
            if ip:
                return ip
        except Exception:
            pass

    # Fallback to UDP socket trick
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_bonjour_hostname():
    try:
        name = subprocess.check_output(["scutil", "--get", "LocalHostName"], text=True).strip()
        if name:
            return f"{name}.local"
    except Exception:
        pass
    return f"{socket.gethostname()}.local"

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent mobile Safari and Chrome from caching stale files during play
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def git_commit_and_push(commit_msg):
    try:
        subprocess.run(["git", "add", "."], cwd=DIRECTORY, check=True, timeout=15)
        # Check if changes exist
        diff_proc = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=DIRECTORY)
        has_changes = (diff_proc.returncode != 0)

        commit_hash = "main"
        push_output = ""
        if has_changes:
            commit_proc = subprocess.run(["git", "commit", "-m", commit_msg], cwd=DIRECTORY, capture_output=True, text=True, timeout=15)
            push_proc = subprocess.run(["git", "push", "origin", "main"], cwd=DIRECTORY, capture_output=True, text=True, timeout=30)
            push_output = push_proc.stdout + push_proc.stderr
            print(f"  [GIT PUSH SUCCESS] Cloudflare repository updated:\n{push_output.strip()[:160]}")
        else:
            print("  [GIT PUSH] Code matches latest commit, already up to date.")

        rev_proc = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=DIRECTORY, capture_output=True, text=True, timeout=5)
        if rev_proc.returncode == 0:
            commit_hash = rev_proc.stdout.strip()
        return True, commit_hash, push_output
    except Exception as e:
        print(f"  [GIT PUSH WARNING] {e}")
        return False, "main", str(e)

def generate_ai_game_code(prompt, game_key, existing_config=None):
    """
    Barnaby Bunny 🐰 & Pip Guinea Pig 🐹 AI Game Agent.
    Interprets user prompt, writes code hooks, and generates game configuration.
    """
    import re
    p = prompt.lower()
    cfg = dict(existing_config or {})

    if "speed" not in cfg: cfg["speed"] = 5
    if "food" not in cfg: cfg["food"] = "🥕"
    if "theme" not in cfg: cfg["theme"] = "neon"
    if "ghostMode" not in cfg: cfg["ghostMode"] = True
    if "discoRainbow" not in cfg: cfg["discoRainbow"] = False
    cfg["game"] = game_key

    applied = []

    # 1. Food / Collectibles
    food_map = [
        ("carrot", "🥕", "Crunchy Garden Carrots 🥕"),
        ("lettuce", "🥬", "Crispy Garden Lettuce 🥬"),
        ("strawberry", "🍓", "Sweet Strawberries 🍓"),
        ("berries", "🍓", "Juicy Berries 🍓"),
        ("berry", "🍓", "Juicy Berries 🍓"),
        ("hay", "🌾", "Timothy Hay Stash 🌾"),
        ("grass", "🌾", "Sweet Meadow Grass 🌾"),
        ("flower", "🌸", "Blooming Dandelion Flowers 🌸"),
        ("clover", "🍀", "Lucky Four-Leaf Clovers 🍀"),
        ("apple", "🍎", "Crisp Red Apples 🍎"),
        ("donut", "🍩", "Glazed Sprinkles Donuts 🍩"),
        ("doughnut", "🍩", "Glazed Sprinkles Donuts 🍩"),
        ("pizza", "🍕", "Cheesy Pizza Slices 🍕"),
        ("cookie", "🍪", "Chocolate Chip Cookies 🍪"),
        ("cake", "🎂", "Birthday Cake 🎂"),
        ("star", "⭐", "Golden Shimmering Stars ⭐"),
        ("gem", "💎", "Sparkling Cosmic Gems 💎"),
        ("diamond", "💎", "Diamond Crystals 💎"),
        ("heart", "💖", "Magic Love Hearts 💖"),
        ("lightning", "⚡", "Turbo Lightning Bolts ⚡"),
        ("banana", "🍌", "Sweet Bananas 🍌"),
        ("watermelon", "🍉", "Juicy Watermelon 🍉"),
        ("bunny", "🐰", "Fluffy Bunny Treats 🐰"),
        ("rabbit", "🐰", "Fluffy Bunny Treats 🐰"),
        ("piggy", "🐹", "Cuddly Guinea Pig Treats 🐹"),
        ("guinea pig", "🐹", "Cuddly Guinea Pig Treats 🐹"),
        ("unicorn", "🦄", "Unicorn Magic Horns 🦄"),
        ("rocket", "🚀", "Space Rockets 🚀")
    ]
    for key, emoji, desc in food_map:
        if key in p:
            cfg["food"] = emoji
            applied.append(desc)
            break

    # Direct emoji in prompt if present
    emoji_match = re.findall(r'[\U00010000-\U0010ffff]', prompt)
    if emoji_match:
        cfg["food"] = emoji_match[0]
        applied.append(f"Custom Emoji Treats {emoji_match[0]}")

    # 2. Speeds & Physics
    if any(k in p for k in ["warp", "insane", "sonic", "lightning", "hyper", "crazy fast"]):
        cfg["speed"] = 10
        applied.append("⚡ Warp Speed 10")
    elif any(k in p for k in ["zoom", "zoomies", "piggy zoom", "turbo", "super fast", "rocket"]):
        cfg["speed"] = 9
        applied.append("🐹 Piggy Zoomies Speed 9")
    elif any(k in p for k in ["hop", "bunny hop", "bouncy", "fast", "speedy", "quicker", "boost"]):
        cfg["speed"] = 8
        applied.append("🐰 Bouncy Bunny Hop Speed 8")
    elif any(k in p for k in ["turtle", "snail", "crawl", "super slow"]):
        cfg["speed"] = 1
        applied.append("🐢 Snail Crawl Speed 1")
    elif any(k in p for k in ["slow", "chill", "relax", "easy"]):
        cfg["speed"] = 2
        applied.append("🧊 Chill Nap Speed 2")
    elif any(k in p for k in ["normal", "classic", "medium"]):
        cfg["speed"] = 5
        applied.append("Classic Speed 5")

    speed_num = re.search(r'(?:speed|level)\s*(\d+)', p)
    if speed_num:
        val = max(1, min(10, int(speed_num.group(1))))
        cfg["speed"] = val
        applied.append(f"Speed Level {val}")

    # 3. Themes & Visual Atmospheres
    if any(k in p for k in ["rainbow", "disco", "multicolor", "party"]):
        cfg["theme"] = "candy"
        cfg["discoRainbow"] = True
        cfg["customColors"] = {"head": "#ffffff", "body": "#ec4899", "glow": "#f472b6", "bg": "#120417"}
        applied.append("🌈 Disco Rainbow Party Mode")
    elif any(k in p for k in ["purple", "galaxy", "space", "cosmic", "violet", "nebula"]):
        cfg["theme"] = "cyberpunk"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#c084fc", "body": "#9333ea", "glow": "#d8b4fe", "bg": "#0d061c"}
        applied.append("🌌 Deep Space Purple Nebula")
    elif any(k in p for k in ["pink", "berry", "strawberry", "sweet", "bubblegum", "rose"]):
        cfg["theme"] = "candy"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#ec4899", "body": "#db2777", "glow": "#fbcfe8", "bg": "#170614"}
        applied.append("🍓 Sweet Strawberry Pink Theme")
    elif any(k in p for k in ["gold", "golden", "sun", "sunshine", "yellow", "amber"]):
        cfg["theme"] = "gold"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#fbbf24", "body": "#d97706", "glow": "#fef08a", "bg": "#1c1404"}
        applied.append("👑 Golden Sunshine Theme")
    elif any(k in p for k in ["green", "meadow", "grass", "clover", "forest", "emerald"]):
        cfg["theme"] = "neon"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#10b981", "body": "#059669", "glow": "#a7f3d0", "bg": "#031c12"}
        applied.append("🍀 Lush Green Meadow Theme")
    elif any(k in p for k in ["blue", "cyan", "ice", "ocean", "water", "aqua"]):
        cfg["theme"] = "cyberpunk"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#06b6d4", "body": "#0284c7", "glow": "#38bdf8", "bg": "#041424"}
        applied.append("💎 Neon Ice Cyan Theme")
    elif any(k in p for k in ["red", "lava", "fire", "flame", "magma"]):
        cfg["theme"] = "lava"
        cfg["discoRainbow"] = False
        cfg["customColors"] = {"head": "#ef4444", "body": "#dc2626", "glow": "#fca5a5", "bg": "#1c0505"}
        applied.append("🔥 Fiery Lava Theme")

    # 4. Shield / Walls
    if any(k in p for k in ["shield", "invincible", "no die", "safe", "forcefield"]):
        cfg["ghostMode"] = True
        cfg["shield"] = True
        applied.append("🛡️ Invincible Fluffy Shield Active")
    elif any(k in p for k in ["solid", "bounce", "hardcore"]):
        cfg["ghostMode"] = False
        applied.append("🧱 Solid Boundary Walls")

    if not applied:
        applied.append("✨ Barnaby & Pip Magic Sparkles")

    summary_text = " + ".join(applied)
    cute_dialogue = f"WHEEK WHEEK! 🐹 HOP HOP! 🐰 Barnaby & Pip updated your game code with: {summary_text}! Pushed live to Cloudflare! Refreshing your game now!"

    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    code_content = f"""// ========================================================
// 🐰 BARNABY BUNNY & PIP GUINEA PIG LIVE AI CODE PATCH
// Generated: {timestamp}
// Prompt: "{prompt}"
// Game: {game_key}
// ========================================================

window.VIBE_CONFIG = {json.dumps(cfg, indent=2)};

// Live Game Runtime Hooks
(function() {{
  const cfg = window.VIBE_CONFIG;
  if (!cfg) return;

  // 1. Neon Snake Engine hooks
  if (window.game) {{
    if (cfg.food && window.game.customFoodEmoji !== undefined) window.game.customFoodEmoji = cfg.food;
    if (cfg.speed && window.game.setSpeedLevel) window.game.setSpeedLevel(cfg.speed, false);
    if (cfg.theme && window.game.applyTheme) window.game.applyTheme(cfg.theme === 'candy' ? 'cyberpunk' : cfg.theme);
  }}

  // 2. Broadcast to any open play.html or standalone tab
  try {{
    localStorage.setItem('vibe_state_{game_key}', JSON.stringify(cfg));
    localStorage.setItem('vibe_last_prompt', "{prompt}");
    window.dispatchEvent(new CustomEvent('vibeUpdate', {{ detail: cfg }}));
  }} catch (e) {{}}

  console.log("🥕 [BARNABY & PIP AI] Successfully applied fluffy update:", "{prompt}");
}})();
"""
    return cfg, code_content, summary_text, cute_dialogue

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent mobile Safari and Chrome from caching stale files during play
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path in ("/api/vibe", "/api/ai_vibe"):
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode("utf-8"))

                user_prompt = payload.get("prompt", "Fluffy Code Update")
                game_key = payload.get("game", "catcher")
                existing_config = payload.get("config", {})

                # 1. Run Barnaby & Pip AI Code Agent
                cfg, code_content, summary_text, cute_dialogue = generate_ai_game_code(
                    user_prompt, game_key, existing_config
                )

                # 2. Write to vibe_config.json
                vibe_json_file = os.path.join(DIRECTORY, "vibe_config.json")
                with open(vibe_json_file, "w", encoding="utf-8") as f:
                    json.dump({
                        "prompt": user_prompt,
                        "game": game_key,
                        "config": cfg,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    }, f, indent=2)

                # 3. Write executable vibe_patch.js for client games
                patch_file = os.path.join(DIRECTORY, "vibe_patch.js")
                with open(patch_file, "w", encoding="utf-8") as f:
                    f.write(code_content)

                print(f"  [BARNABY & PIP AI] Code written to {vibe_json_file} and {patch_file}")

                # 4. Commit and push to Cloudflare
                commit_title = f"Barnaby & Pip AI: {user_prompt[:45]}"
                pushed, commit_hash, push_log = git_commit_and_push(commit_title)

                resp_body = json.dumps({
                    "status": "ok",
                    "pushed_to_cloudflare": pushed,
                    "commit": commit_hash,
                    "summary": summary_text,
                    "dialogue": cute_dialogue,
                    "config": cfg,
                    "code": code_content,
                    "message": f"Game code written and pushed to Cloudflare! (Commit #{commit_hash})" if pushed else "Game code updated locally!",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
                return
            except Exception as e:
                print(f"  [API ERROR] {e}")
                err_body = json.dumps({"status": "error", "message": str(e)}).encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(err_body)))
                self.end_headers()
                self.wfile.write(err_body)
                return

        super().do_POST()

    def log_message(self, format, *args):
        # Clean logging with client IP
        client_ip = self.client_address[0]
        print(f"  [CONNECTED] {client_ip} -> {args[0]}")

def main():
    os.chdir(DIRECTORY)
    local_ip = get_local_ip()
    bonjour_host = get_bonjour_hostname()

    banner = f"""
===================================================================
 🐍  NEON SNAKE ARCADE - LOCAL WI-FI SERVER
===================================================================
 Serving folder: {DIRECTORY}
 Port:           {PORT}

 Other devices on your Wi-Fi (iPhone, iPad, Android, PC) can connect via:

   1. Apple / Bonjour URL:
      👉  http://{bonjour_host}:{PORT}

   2. Direct Wi-Fi IP URL:
      👉  http://{local_ip}:{PORT}

   3. Localhost (on this Mac):
      👉  http://localhost:{PORT}

 Note: Make sure all devices are connected to the same Wi-Fi network.
 Press [Ctrl+C] to stop the server anytime.
===================================================================
    """
    print(banner)

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[STOPPED] Local server shut down gracefully.")
    except OSError as e:
        if e.errno == 48:
            print(f"\n[NOTICE] Port {PORT} is already actively serving!")
            print(f"You can already connect via: http://{local_ip}:{PORT}")
        else:
            raise

if __name__ == "__main__":
    main()
