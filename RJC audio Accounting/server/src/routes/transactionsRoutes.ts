import { Router } from "express";
import { z } from "zod";
import { getAccountingProvider } from "../providers/accountingProvider.js";
import { loadVault } from "../security/vault.js";
import { suggestTransactionCategories } from "../services/geminiService.js";

const ApproveTransactionSchema = z.object({
  transactionId: z.string().min(1),
  bankTransactionUri: z.string().optional(),
  datedOn: z.string().optional(),
  grossValue: z.coerce.number().optional(),
  nominalCode: z.string().min(1),
  description: z.string().min(1),
  salesTaxRate: z.coerce.number().nullable().optional()
});

export function createTransactionsRouter(dataDir?: string): Router {
  const router = Router();

  const handleGetUnexplained = async (
    req: Parameters<Parameters<typeof router.get>[1]>[0],
    res: Parameters<Parameters<typeof router.get>[1]>[1],
    next: Parameters<Parameters<typeof router.get>[1]>[2]
  ) => {
    try {
      const provider = await getAccountingProvider(dataDir);
      const bankAccountUri =
        typeof req.query.bankAccountUri === "string" && req.query.bankAccountUri.trim()
          ? req.query.bankAccountUri.trim()
          : undefined;

      const [transactions, categories, bankAccounts] = await Promise.all([
        provider.getUnexplainedTransactions(bankAccountUri),
        provider.getCategories(),
        provider.getBankAccounts()
      ]);

      res.json({
        transactions,
        categories,
        bankAccounts
      });
    } catch (err) {
      next(err);
    }
  };

  router.get("/", handleGetUnexplained);
  router.get("/unexplained", handleGetUnexplained);

  router.post("/categorize", async (req, res, next) => {
    try {
      const [vault, provider] = await Promise.all([
        loadVault(dataDir),
        getAccountingProvider(dataDir)
      ]);

      const bankAccountUri =
        typeof req.body?.bankAccountUri === "string" && req.body.bankAccountUri.trim()
          ? req.body.bankAccountUri.trim()
          : undefined;

      const [allTransactions, categories] = await Promise.all([
        provider.getUnexplainedTransactions(bankAccountUri),
        provider.getCategories()
      ]);

      const requestedIds: string[] | undefined = Array.isArray(req.body?.transactionIds)
        ? req.body.transactionIds.map((id: unknown) => String(id))
        : undefined;

      const targetTransactions =
        requestedIds && requestedIds.length > 0
          ? allTransactions.filter((t) => requestedIds.includes(t.id))
          : allTransactions.filter((t) => t.isUnexplained);

      const suggestions = await suggestTransactionCategories(
        targetTransactions,
        categories,
        vault.vatMode,
        {
          apiKey: vault.geminiApiKey
        }
      );

      res.json({
        suggestions
      });
    } catch (err) {
      next(err);
    }
  });

  const handleApproveTransaction = async (
    req: Parameters<Parameters<typeof router.post>[1]>[0],
    res: Parameters<Parameters<typeof router.post>[1]>[1],
    next: Parameters<Parameters<typeof router.post>[1]>[2]
  ) => {
    try {
      const rawId = req.params.id || req.body?.transactionId;
      const parsed = ApproveTransactionSchema.parse({
        ...req.body,
        transactionId: rawId
      });

      const provider = await getAccountingProvider(dataDir);

      let bankTransactionUri = parsed.bankTransactionUri;
      let datedOn = parsed.datedOn;
      let grossValue = parsed.grossValue;

      if (!bankTransactionUri || !datedOn || grossValue === undefined) {
        const transactions = await provider.getUnexplainedTransactions();
        const matchingTx = transactions.find(
          (t) => t.id === parsed.transactionId || t.url === parsed.bankTransactionUri
        );

        if (matchingTx) {
          bankTransactionUri = bankTransactionUri || matchingTx.url;
          datedOn = datedOn || matchingTx.datedOn;
          if (grossValue === undefined) {
            grossValue = matchingTx.unexplainedAmount || matchingTx.amount;
          }
        }
      }

      const resolvedUri =
        bankTransactionUri ||
        `https://api.sandbox.freeagent.com/v2/bank_transactions/${parsed.transactionId}`;
      const resolvedDatedOn = datedOn || new Date().toISOString().slice(0, 10);
      const resolvedGrossValue = grossValue ?? 0;

      const result = await provider.explainBankTransaction({
        transactionId: parsed.transactionId,
        bankTransactionUri: resolvedUri,
        datedOn: resolvedDatedOn,
        grossValue: resolvedGrossValue,
        nominalCode: parsed.nominalCode,
        description: parsed.description,
        salesTaxRate: parsed.salesTaxRate ?? null
      });

      res.status(200).json({
        explanationUri: result.explanationUri,
        payloadSent: result.payloadSent
      });
    } catch (err) {
      next(err);
    }
  };

  router.post("/approve", handleApproveTransaction);
  router.post("/:id/approve", handleApproveTransaction);

  return router;
}
