#!/usr/bin/env bash
# ==============================================================================
# Stop Arcade Server & Cloudflare Tunnel
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/.arcade.pid"

if [[ -f "$PID_FILE" ]]; then
    PIDS=$(cat "$PID_FILE")
    for p in $PIDS; do
        if kill -0 "$p" 2>/dev/null; then
            echo "Stopping process PID $p..."
            kill "$p" 2>/dev/null || true
        fi
    done
    rm -f "$PID_FILE"
fi

# Clean up any remaining cloudflared or port 8080 listeners
pkill -f "cloudflared tunnel.*8080" 2>/dev/null || true
PORT_PID=$(lsof -ti :8080 2>/dev/null || true)
if [[ -n "$PORT_PID" ]]; then
    kill -9 $PORT_PID 2>/dev/null || true
fi

echo "✓ Arcade Server and Cloudflare Tunnel stopped."
