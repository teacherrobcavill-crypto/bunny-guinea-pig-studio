import crypto from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  ExtractedReceipt,
  ExtractedReceiptSchema,
  ReceiptTargetType,
  ReceiptTargetTypeSchema,
  StagedDraft
} from "@rjc/shared";
import {
  deleteStagedDraft,
  deleteUploadFile,
  getStagedDraft,
  listStagedDrafts,
  loadVault,
  readUploadFile,
  saveStagedDraft,
  saveUploadFile,
  updateStagedDraft
} from "../security/vault.js";
import { getAccountingProvider } from "../providers/accountingProvider.js";
import { extractDocumentWithGemini } from "../services/geminiService.js";
import { verifyReceiptMathPence } from "../compliance/complianceGuard.js";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES }
});

function parseSalesTaxRate(
  suggestedVatRate: ExtractedReceipt["suggestedVatRate"]
): number | null {
  if (!suggestedVatRate || suggestedVatRate === "exempt") {
    return 0;
  }
  const num = Number(suggestedVatRate);
  return Number.isFinite(num) ? num : 20;
}

export function createReceiptsRouter(dataDir?: string): Router {
  const router = Router();

  router.post(
    "/upload",
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({
              error: "Uploaded file exceeds FreeAgent's 5MB attachment limit."
            });
            return;
          }
          res.status(400).json({
            error: err instanceof Error ? err.message : "File upload error"
          });
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded in 'file' field." });
          return;
        }

        const normalizedMime =
          req.file.mimetype.toLowerCase() === "image/jpg"
            ? "image/jpeg"
            : req.file.mimetype.toLowerCase();

        if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
          res.status(400).json({
            error: `Unsupported file MIME type '${req.file.mimetype}'. Allowed types: application/pdf, image/png, image/jpeg, image/gif.`
          });
          return;
        }

        const [vault, provider] = await Promise.all([
          loadVault(dataDir),
          getAccountingProvider(dataDir)
        ]);
        const categories = await provider.getCategories();

        const extracted = await extractDocumentWithGemini(
          req.file.buffer,
          normalizedMime,
          categories,
          vault.vatMode,
          {
            apiKey: vault.geminiApiKey,
            fileNameHint: req.file.originalname
          }
        );

        const mathCheck = verifyReceiptMathPence(
          extracted.netAmount,
          extracted.vatAmount,
          extracted.totalAmount
        );

        const draftId = crypto.randomUUID();
        await saveUploadFile(draftId, req.file.buffer, dataDir);

        const targetType: ReceiptTargetType =
          req.body?.targetType === "expense" ? "expense" : "bill";
        const now = new Date().toISOString();

        const draft: StagedDraft = {
          id: draftId,
          fileName: req.file.originalname || `receipt-${draftId}`,
          mimeType: normalizedMime,
          fileSizeBytes: req.file.size,
          targetType,
          status: "draft_review",
          extracted,
          mathCheck,
          targetContactOrUserUri:
            typeof req.body?.targetContactOrUserUri === "string" &&
            req.body.targetContactOrUserUri.trim()
              ? req.body.targetContactOrUserUri.trim()
              : null,
          freeagentResourceUri: null,
          createdAt: now,
          updatedAt: now
        };

        const saved = await saveStagedDraft(draft, dataDir);
        res.status(201).json({ draft: saved });
      } catch (err) {
        res.status(500).json({
          error:
            err instanceof Error
              ? err.message
              : "Failed to process and stage receipt upload"
        });
      }
    }
  );

  router.get("/drafts", async (_req: Request, res: Response) => {
    try {
      const drafts = await listStagedDrafts(dataDir);
      res.json({ drafts });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to list staged drafts"
      });
    }
  });

  router.get("/drafts/:id/file", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const [draft, fileBuffer] = await Promise.all([
        getStagedDraft(id, dataDir),
        readUploadFile(id, dataDir)
      ]);

      if (!draft || !fileBuffer) {
        res.status(404).json({
          error: "Staged receipt file not found (or already purged after FreeAgent push)."
        });
        return;
      }

      res.setHeader("Content-Type", draft.mimeType);
      res.send(fileBuffer);
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to read staged receipt file"
      });
    }
  });

  router.patch("/drafts/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const body = (req.body ?? {}) as Record<string, unknown>;

      let nextTargetType: ReceiptTargetType | undefined;
      if (body.targetType !== undefined) {
        const parsedTarget = ReceiptTargetTypeSchema.safeParse(body.targetType);
        if (!parsedTarget.success) {
          res.status(400).json({
            error: "Invalid targetType; must be 'bill' or 'expense'"
          });
          return;
        }
        nextTargetType = parsedTarget.data;
      }

      const updatedDraft = await updateStagedDraft(
        id,
        (current) => {
          const partialExtracted =
            body.extracted && typeof body.extracted === "object"
              ? (body.extracted as Partial<ExtractedReceipt>)
              : {};

          const mergedExtracted = ExtractedReceiptSchema.parse({
            ...current.extracted,
            ...partialExtracted
          });

          const mathCheck = verifyReceiptMathPence(
            mergedExtracted.netAmount,
            mergedExtracted.vatAmount,
            mergedExtracted.totalAmount
          );

          const targetContactOrUserUri =
            body.targetContactOrUserUri !== undefined
              ? typeof body.targetContactOrUserUri === "string" &&
                body.targetContactOrUserUri.trim()
                ? body.targetContactOrUserUri.trim()
                : null
              : current.targetContactOrUserUri;

          return {
            ...current,
            targetType: nextTargetType ?? current.targetType,
            targetContactOrUserUri,
            extracted: mergedExtracted,
            mathCheck,
            updatedAt: new Date().toISOString()
          };
        },
        dataDir
      );

      if (!updatedDraft) {
        res.status(404).json({ error: "Staged draft not found" });
        return;
      }

      res.json({ draft: updatedDraft });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Failed to update staged draft"
      });
    }
  });

  router.delete("/drafts/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const deleted = await deleteStagedDraft(id, dataDir);
      if (!deleted) {
        res.status(404).json({ error: "Staged draft not found" });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to delete staged draft"
      });
    }
  });

  router.post("/drafts/:id/approve", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const draft = await getStagedDraft(id, dataDir);

      if (!draft) {
        res.status(404).json({ error: "Staged draft not found" });
        return;
      }

      if (draft.status === "pushed_to_freeagent") {
        res.status(409).json({
          error: "Draft has already been pushed to FreeAgent",
          draft
        });
        return;
      }

      const [fileBuffer, provider, vault] = await Promise.all([
        readUploadFile(draft.id, dataDir),
        getAccountingProvider(dataDir),
        loadVault(dataDir)
      ]);

      const attachment = fileBuffer
        ? {
            fileName: draft.fileName,
            mimeType: draft.mimeType,
            dataBuffer: fileBuffer,
            description: `${draft.extracted.vendorName} - ${draft.extracted.description}`
          }
        : undefined;

      const salesTaxRate = parseSalesTaxRate(draft.extracted.suggestedVatRate);

      let result: { resourceUri: string; payloadSent: Record<string, unknown> };

      if (draft.targetType === "bill") {
        result = await provider.createBill({
          contactUri: draft.targetContactOrUserUri ?? undefined,
          vendorName: draft.extracted.vendorName,
          reference: draft.extracted.invoiceReference || `INV-${draft.id.slice(0, 8)}`,
          datedOn: draft.extracted.transactionDate,
          dueOn: draft.extracted.dueDate ?? draft.extracted.transactionDate,
          currency: draft.extracted.currency || "GBP",
          totalValue: draft.extracted.totalAmount,
          netValue: draft.extracted.netAmount,
          vatValue: draft.extracted.vatAmount,
          salesTaxRate,
          nominalCode: draft.extracted.suggestedNominalCode,
          description: draft.extracted.description,
          vatMode: vault.vatMode,
          attachment
        });
      } else {
        result = await provider.createExpense({
          userUri: draft.targetContactOrUserUri ?? vault.defaultUserUri,
          datedOn: draft.extracted.transactionDate,
          currency: draft.extracted.currency || "GBP",
          grossValue: draft.extracted.totalAmount,
          salesTaxRate,
          manualSalesTaxAmount: draft.extracted.vatAmount,
          nominalCode: draft.extracted.suggestedNominalCode,
          description: `${draft.extracted.vendorName}: ${draft.extracted.description}`,
          vatMode: vault.vatMode,
          attachment
        });
      }

      // Immediately purge temporary binary from data/uploads/ upon FreeAgent 201 Created
      await deleteUploadFile(draft.id, dataDir);

      const updatedDraft = await updateStagedDraft(
        draft.id,
        (current) => ({
          ...current,
          status: "pushed_to_freeagent",
          freeagentResourceUri: result.resourceUri,
          updatedAt: new Date().toISOString()
        }),
        dataDir
      );

      res.status(200).json({
        draft: updatedDraft,
        resourceUri: result.resourceUri
      });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to approve and push draft to FreeAgent"
      });
    }
  });

  return router;
}
