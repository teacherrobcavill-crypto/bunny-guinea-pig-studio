import { spawn, execSync, ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const BACKEND_HEALTH_URL = "http://127.0.0.1:3001/api/health";

function rjcServerControllerPlugin(): Plugin {
  let managedProcess: ChildProcess | null = null;
  const logLines: string[] = [];

  const pushLog = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const timestamp = new Date().toISOString().slice(11, 19);
    logLines.push(`[${timestamp}] ${trimmed}`);
    if (logLines.length > 50) {
      logLines.splice(0, logLines.length - 50);
    }
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(BACKEND_HEALTH_URL, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  };

  const getPort3001Pid = (): number | null => {
    try {
      const out = execSync("lsof -ti tcp:3001", {
        stdio: ["ignore", "pipe", "ignore"]
      })
        .toString()
        .trim();
      if (!out) return null;
      const firstPid = Number(out.split("\n")[0]);
      return Number.isFinite(firstPid) ? firstPid : null;
    } catch {
      return null;
    }
  };

  const stopBackend = async (): Promise<void> => {
    pushLog("Stopping backend API server on 127.0.0.1:3001...");
    if (managedProcess && !managedProcess.killed) {
      try {
        managedProcess.kill("SIGTERM");
      } catch {
        // ignore
      }
      managedProcess = null;
    }

    const pid = getPort3001Pid();
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // ignore
      }
    }

    for (let i = 0; i < 15; i++) {
      const alive = await checkHealth();
      if (!alive) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    const stubbornPid = getPort3001Pid();
    if (stubbornPid) {
      try {
        process.kill(stubbornPid, "SIGKILL");
      } catch {
        // ignore
      }
    }
    pushLog("Backend API server stopped.");
  };

  const startBackend = async (): Promise<boolean> => {
    const alreadyRunning = await checkHealth();
    if (alreadyRunning) {
      pushLog("Backend API server is already running on 127.0.0.1:3001.");
      return true;
    }

    pushLog("Starting backend API server (npm run dev -w server)...");
    const child = spawn("npm", ["run", "dev", "-w", "server"], {
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, PORT: "3001", HOST: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"]
    });

    managedProcess = child;

    child.stdout?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        pushLog(line);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        pushLog(line);
      }
    });

    child.on("exit", (code) => {
      pushLog(`Backend process exited (code ${code ?? "null"})`);
      if (managedProcess === child) {
        managedProcess = null;
      }
    });

    for (let i = 0; i < 30; i++) {
      const ready = await checkHealth();
      if (ready) {
        pushLog("Backend API server online at http://127.0.0.1:3001");
        return true;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return await checkHealth();
  };

  return {
    name: "rjc-server-controller",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__server-control/")) {
          next();
          return;
        }

        res.setHeader("Content-Type", "application/json");

        try {
          if (req.url.startsWith("/__server-control/status") && req.method === "GET") {
            const running = await checkHealth();
            const pid = running ? managedProcess?.pid ?? getPort3001Pid() : null;
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                running,
                port: 3001,
                host: "127.0.0.1",
                pid,
                logs: logLines.slice(-20)
              })
            );
            return;
          }

          if (req.url.startsWith("/__server-control/start") && req.method === "POST") {
            const running = await startBackend();
            const pid = running ? managedProcess?.pid ?? getPort3001Pid() : null;
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                running,
                port: 3001,
                host: "127.0.0.1",
                pid,
                logs: logLines.slice(-20)
              })
            );
            return;
          }

          if (req.url.startsWith("/__server-control/stop") && req.method === "POST") {
            await stopBackend();
            const running = await checkHealth();
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                running,
                port: 3001,
                host: "127.0.0.1",
                pid: null,
                logs: logLines.slice(-20)
              })
            );
            return;
          }

          if (req.url.startsWith("/__server-control/restart") && req.method === "POST") {
            await stopBackend();
            const running = await startBackend();
            const pid = running ? managedProcess?.pid ?? getPort3001Pid() : null;
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                running,
                port: 3001,
                host: "127.0.0.1",
                pid,
                logs: logLines.slice(-20)
              })
            );
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Unknown server-control endpoint" }));
        } catch (err) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Server control failed"
            })
          );
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), rjcServerControllerPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true
      }
    }
  }
});
