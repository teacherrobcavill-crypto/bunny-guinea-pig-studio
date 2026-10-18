#!/usr/bin/env bash
# ==============================================================================
# Arcade Server & Cloudflare Quick Tunnel Launcher
# Serves the Arcade Game Portal locally and exposes it via a secure public tunnel.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-8080}"
SERVER_LOG="$DIR/arcade_server.log"
TUNNEL_LOG="$DIR/tunnel.log"
PID_FILE="$DIR/.arcade.pid"

# --- 1. Find or Install cloudflared ---
CLOUDFLARED_BIN=""

if command -v cloudflared &>/dev/null; then
    CLOUDFLARED_BIN="$(command -v cloudflared)"
elif [[ -x "$DIR/bin/cloudflared" ]]; then
    CLOUDFLARED_BIN="$DIR/bin/cloudflared"
elif [[ -x "$HOME/.local/bin/cloudflared" ]]; then
    CLOUDFLARED_BIN="$HOME/.local/bin/cloudflared"
else
    echo "⚡ cloudflared not found. Downloading official macOS binary..."
    mkdir -p "$DIR/bin"
    ARCH="$(uname -m)"
    if [[ "$ARCH" == "arm64" ]]; then
        DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
    else
        DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
    fi
    curl -sL "$DOWNLOAD_URL" -o /tmp/cloudflared.tgz
    tar -xzf /tmp/cloudflared.tgz -C "$DIR/bin"
    chmod +x "$DIR/bin/cloudflared"
    rm -f /tmp/cloudflared.tgz
    CLOUDFLARED_BIN="$DIR/bin/cloudflared"
    echo "✓ Installed cloudflared to $CLOUDFLARED_BIN"
fi

# --- 2. Stop Previous Instances If Running ---
if [[ -f "$PID_FILE" ]]; then
    OLD_PIDS=$(cat "$PID_FILE" 2>/dev/null || true)
    for p in $OLD_PIDS; do
        if kill -0 "$p" 2>/dev/null; then
            kill "$p" 2>/dev/null || true
        fi
    done
    rm -f "$PID_FILE"
fi

# Kill any lingering processes on PORT
OLD_PORT_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [[ -n "$OLD_PORT_PID" ]]; then
    kill -9 $OLD_PORT_PID 2>/dev/null || true
fi

# --- 3. Start Local Python HTTP Server ---
echo "🎮 Starting Local Arcade Server on port $PORT..."
PORT="$PORT" python3 "$DIR/serve.py" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

# --- 4. Start Cloudflare Quick Tunnel ---
echo "🌐 Launching Cloudflare Quick Tunnel for http://127.0.0.1:$PORT..."
> "$TUNNEL_LOG"
"$CLOUDFLARED_BIN" tunnel --url "http://127.0.0.1:$PORT" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Record PIDs
echo "$SERVER_PID $TUNNEL_PID" > "$PID_FILE"

# --- 5. Extract Public Tunnel URL ---
echo "⏳ Waiting for Cloudflare tunnel assignment..."
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -o "https://[a-zA-Z0-9-]*\.trycloudflare\.com" "$TUNNEL_LOG" 2>/dev/null | head -n 1 || true)
    if [[ -n "$TUNNEL_URL" ]]; then
        break
    fi
    sleep 0.5
done

# Local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

# --- 6. Generate QR Code for Phone Access ---
if [[ -n "$TUNNEL_URL" ]]; then
    curl -s "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${TUNNEL_URL}" -o "$DIR/arcade_qr.png" 2>/dev/null || true
fi

# --- 7. Print Status & Links ---
echo ""
echo "=========================================================================="
echo "  🚀 RETRO & RPG ARCADE PORTAL IS NOW LIVE!"
echo "=========================================================================="
echo ""
if [[ -n "$TUNNEL_URL" ]]; then
    echo "  🌍 PUBLIC CLOUDFLARE TUNNEL URL (Share & Play Anywhere):"
    echo "     $TUNNEL_URL"
    echo ""
fi
echo "  📱 LOCAL WI-FI NETWORK URL (Same Wi-Fi):"
echo "     http://${LOCAL_IP}:${PORT}"
echo ""
echo "  💻 LOCALHOST URL:"
echo "     http://localhost:${PORT}"
echo ""
echo "  🎮 GAMES INCLUDED IN THIS PORTAL:"
echo "     • Fighting Fantasy: Titan Reborn (Book I: The Vault of the Iron Warlock)"
echo "     • Block Blast Arcade"
echo "     • Neon Snake Arcade"
echo ""
echo "  📋 PROCESS DETAILS:"
echo "     • Server PID: $SERVER_PID (Port $PORT)"
echo "     • Tunnel PID: $TUNNEL_PID"
echo "     • Logs: $SERVER_LOG | $TUNNEL_LOG"
echo "     • Stop server anytime with: ./stop-arcade.sh"
echo "=========================================================================="
echo ""
