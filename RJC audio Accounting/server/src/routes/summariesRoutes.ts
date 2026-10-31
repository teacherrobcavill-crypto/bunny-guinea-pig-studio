import { Router } from "express";
import { calculateDeterministicPnLVariances } from "../compliance/complianceGuard.js";
import { getAccountingProvider } from "../providers/accountingProvider.js";
import { listStagedDrafts, loadVault } from "../security/vault.js";
import { generatePlainEnglishSummary } from "../services/geminiService.js";

export function createSummariesRouter(dataDir?: string): Router {
  const router = Router();

  const handleGetOverview = async (
    req: Parameters<Parameters<typeof router.get>[1]>[0],
    res: Parameters<Parameters<typeof router.get>[1]>[1],
    next: Parameters<Parameters<typeof router.get>[1]>[2]
  ) => {
    try {
      const fromDate =
        typeof req.query.from === "string" && req.query.from.trim()
          ? req.query.from.trim()
          : undefined;
      const toDate =
        typeof req.query.to === "string" && req.query.to.trim()
          ? req.query.to.trim()
          : undefined;

      const [provider, drafts] = await Promise.all([
        getAccountingProvider(dataDir),
        listStagedDrafts(dataDir)
      ]);

      const [sanitizedPnL, cashflow] = await Promise.all([
        provider.getSanitizedProfitAndLoss(fromDate, toDate),
        provider.getCashflowSummary()
      ]);

      sanitizedPnL.stagedDraftCount = drafts.filter(
        (d) => d.status === "draft_review"
      ).length;

      const variances = calculateDeterministicPnLVariances({
        income: sanitizedPnL.turnover,
        expenses:
          sanitizedPnL.costOfSales + sanitizedPnL.administrativeExpenses,
        operatingProfit: sanitizedPnL.operatingProfit
      });

      res.json({
        sanitizedPnL,
        cashflow,
        variances
      });
    } catch (err) {
      next(err);
    }
  };

  router.get("/", handleGetOverview);
  router.get("/overview", handleGetOverview);

  router.post("/generate", async (req, res, next) => {
    try {
      const fromDate =
        typeof req.body?.from === "string" && req.body.from.trim()
          ? req.body.from.trim()
          : undefined;
      const toDate =
        typeof req.body?.to === "string" && req.body.to.trim()
          ? req.body.to.trim()
          : undefined;

      const [vault, provider, drafts] = await Promise.all([
        loadVault(dataDir),
        getAccountingProvider(dataDir),
        listStagedDrafts(dataDir)
      ]);

      const [rawPnL, sanitizedPnL, cashflow] = await Promise.all([
        provider.getRawProfitAndLossSummary(fromDate, toDate),
        provider.getSanitizedProfitAndLoss(fromDate, toDate),
        provider.getCashflowSummary()
      ]);

      sanitizedPnL.stagedDraftCount = drafts.filter(
        (d) => d.status === "draft_review"
      ).length;

      const variances = calculateDeterministicPnLVariances({
        income: sanitizedPnL.turnover,
        expenses:
          sanitizedPnL.costOfSales + sanitizedPnL.administrativeExpenses,
        operatingProfit: sanitizedPnL.operatingProfit
      });

      const summary = await generatePlainEnglishSummary(
        rawPnL,
        cashflow as unknown as Record<string, unknown>,
        variances as unknown as Record<string, unknown>,
        {
          apiKey: vault.geminiApiKey
        }
      );

      res.json({
        summary,
        sanitizedPnL,
        cashflow,
        variances
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
