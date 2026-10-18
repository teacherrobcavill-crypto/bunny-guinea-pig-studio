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

    def do_POST(self):
        if self.path == "/api/vibe":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode("utf-8"))

                # 1. Save to vibe_config.json
                vibe_json_file = os.path.join(DIRECTORY, "vibe_config.json")
                with open(vibe_json_file, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2)

                # 2. Write executable vibe_patch.js for client games
                patch_file = os.path.join(DIRECTORY, "vibe_patch.js")
                code_content = payload.get("code", "")
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                with open(patch_file, "w", encoding="utf-8") as f:
                    f.write(f"// Antigravity Kids Vibe Patch - Auto-generated {timestamp}\n")
                    f.write("window.VIBE_CONFIG = " + json.dumps(payload.get("config", {}), indent=2) + ";\n")
                    if code_content:
                        f.write("\n" + code_content + "\n")

                print(f"  [VIBE PUSHED] Game update saved to {vibe_json_file} and {patch_file}")

                resp_body = json.dumps({
                    "status": "ok",
                    "saved": True,
                    "timestamp": timestamp,
                    "message": "Game code updated and pushed successfully!"
                }).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
                return
            except Exception as e:
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
