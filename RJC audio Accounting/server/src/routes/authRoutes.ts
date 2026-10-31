import crypto from "node:crypto";
import { Router, Request, Response } from "express";
import { loadVault, saveVault } from "../security/vault.js";
import { getAccountingProvider } from "../providers/accountingProvider.js";
import { FreeAgentClient } from "../providers/freeagentClient.js";

const oauthStateStore = new Map<string, number>();
const STATE_TTL_MS = 15 * 60 * 1000;

function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [state, createdAt] of oauthStateStore.entries()) {
    if (now - createdAt > STATE_TTL_MS) {
      oauthStateStore.delete(state);
    }
  }
}

function resolveRedirectUri(req: Request): string {
  if (typeof req.query.redirectUri === "string" && req.query.redirectUri.trim()) {
    return req.query.redirectUri.trim();
  }
  if (process.env.FREEAGENT_REDIRECT_URI) {
    return process.env.FREEAGENT_REDIRECT_URI;
  }
  const protocol = req.protocol || "http";
  const host = req.get("host") || `localhost:${process.env.PORT || 4000}`;
  return `${protocol}://${host}/api/auth/freeagent/callback`;
}

export function createAuthRouter(dataDir?: string): Router {
  const router = Router();

  router.get("/status", async (_req: Request, res: Response) => {
    try {
      const [vault] = await Promise.all([
        loadVault(dataDir),
        getAccountingProvider(dataDir)
      ]);

      res.json({
        operatingMode: vault.operatingMode,
        vatMode: vault.vatMode,
        hasGeminiApiKey: Boolean(vault.geminiApiKey),
        freeagentConnected: Boolean(vault.freeagentAccessToken),
        companyName: vault.companyName ?? "RJC Audio Ltd"
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to load auth status"
      });
    }
  });

  router.get("/freeagent/authorize", async (req: Request, res: Response) => {
    try {
      pruneExpiredStates();
      const vault = await loadVault(dataDir);
      const state = crypto.randomBytes(16).toString("hex");
      oauthStateStore.set(state, Date.now());

      const mode = vault.operatingMode === "production" ? "production" : "sandbox";
      const client = new FreeAgentClient(mode, dataDir);
      const redirectUri = resolveRedirectUri(req);
      const authorizationUrl = await client.getAuthorizationUrl(redirectUri, state);

      const acceptHeader = req.get("Accept") || "";
      if (
        req.query.redirect === "false" ||
        acceptHeader.includes("application/json")
      ) {
        res.json({ authorizationUrl, state });
        return;
      }

      res.redirect(authorizationUrl);
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate FreeAgent authorization URL"
      });
    }
  });

  router.get("/freeagent/callback", async (req: Request, res: Response) => {
    try {
      pruneExpiredStates();
      const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
      const state = typeof req.query.state === "string" ? req.query.state.trim() : "";

      if (!code || !state) {
        res.status(400).json({ error: "Missing OAuth code or state parameter" });
        return;
      }

      if (!oauthStateStore.has(state)) {
        res.status(400).json({ error: "Invalid or expired OAuth state parameter" });
        return;
      }
      oauthStateStore.delete(state);

      const vault = await loadVault(dataDir);
      const mode = vault.operatingMode === "production" ? "production" : "sandbox";
      const client = new FreeAgentClient(mode, dataDir);
      const redirectUri = resolveRedirectUri(req);

      await client.exchangeAuthorizationCode(code, redirectUri);

      const acceptHeader = req.get("Accept") || "";
      if (
        req.query.redirect === "false" ||
        acceptHeader.includes("application/json")
      ) {
        res.json({ connected: true });
        return;
      }

      const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
      res.redirect(`${clientOrigin}/?oauth=connected`);
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to complete FreeAgent OAuth callback"
      });
    }
  });

  router.post("/freeagent/disconnect", async (_req: Request, res: Response) => {
    try {
      await saveVault(
        {
          freeagentAccessToken: undefined,
          freeagentRefreshToken: undefined,
          freeagentTokenExpiresAt: undefined
        },
        dataDir
      );
      res.json({ disconnected: true });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to disconnect FreeAgent credentials"
      });
    }
  });

  return router;
}
