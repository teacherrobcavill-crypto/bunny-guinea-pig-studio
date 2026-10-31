import { Router, Request, Response } from "express";
import { OperatingModeSchema, VatModeSchema } from "@rjc/shared";
import { loadVault, saveVault, VaultCredentials } from "../security/vault.js";
import { getAccountingProvider } from "../providers/accountingProvider.js";
import { FORBIDDEN_FREEAGENT_PATHS } from "../compliance/complianceGuard.js";

function formatPublicSettings(vault: VaultCredentials) {
  return {
    operatingMode: vault.operatingMode,
    vatMode: vault.vatMode,
    hasGeminiApiKey: Boolean(vault.geminiApiKey),
    hasFreeagentCredentials: Boolean(
      vault.freeagentClientId && vault.freeagentClientSecret
    ),
    freeagentConnected: Boolean(vault.freeagentAccessToken),
    defaultUserUri: vault.defaultUserUri ?? null,
    companyName: vault.companyName ?? "RJC Audio Ltd",
    forbiddenPaths: FORBIDDEN_FREEAGENT_PATHS
  };
}

export function createSettingsRouter(dataDir?: string): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const vault = await loadVault(dataDir);
      res.json(formatPublicSettings(vault));
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to load settings"
      });
    }
  });

  router.put("/", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const updates: Partial<VaultCredentials> = {};

      if (body.operatingMode !== undefined) {
        const parsedMode = OperatingModeSchema.safeParse(body.operatingMode);
        if (!parsedMode.success) {
          res.status(400).json({
            error: "Invalid operatingMode",
            details: parsedMode.error.flatten()
          });
          return;
        }
        updates.operatingMode = parsedMode.data;
      }

      if (body.vatMode !== undefined) {
        const parsedVat = VatModeSchema.safeParse(body.vatMode);
        if (!parsedVat.success) {
          res.status(400).json({
            error: "Invalid vatMode",
            details: parsedVat.error.flatten()
          });
          return;
        }
        updates.vatMode = parsedVat.data;
      }

      if (typeof body.geminiApiKey === "string") {
        updates.geminiApiKey = body.geminiApiKey.trim() || undefined;
      }

      if (typeof body.freeagentClientId === "string") {
        updates.freeagentClientId = body.freeagentClientId.trim() || undefined;
      }

      if (typeof body.freeagentClientSecret === "string") {
        updates.freeagentClientSecret =
          body.freeagentClientSecret.trim() || undefined;
      }

      if (body.defaultUserUri !== undefined) {
        updates.defaultUserUri =
          typeof body.defaultUserUri === "string" && body.defaultUserUri.trim()
            ? body.defaultUserUri.trim()
            : undefined;
      }

      if (typeof body.companyName === "string" && body.companyName.trim()) {
        updates.companyName = body.companyName.trim();
      }

      const updatedVault = await saveVault(updates, dataDir);
      res.json(formatPublicSettings(updatedVault));
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Failed to update settings"
      });
    }
  });

  router.get("/reference-data", async (_req: Request, res: Response) => {
    try {
      const provider = await getAccountingProvider(dataDir);
      const [categories, users, contacts, company] = await Promise.all([
        provider.getCategories(),
        provider.getUsers(),
        provider.getContacts(),
        provider.getCompanyInfo()
      ]);

      res.json({ categories, users, contacts, company });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to load reference data"
      });
    }
  });

  return router;
}
