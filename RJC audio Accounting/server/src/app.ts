import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { ComplianceBoundaryError } from "./compliance/complianceGuard.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createReceiptsRouter } from "./routes/receiptsRoutes.js";
import { createSettingsRouter } from "./routes/settingsRoutes.js";
import { createSummariesRouter } from "./routes/summariesRoutes.js";
import { createTransactionsRouter } from "./routes/transactionsRoutes.js";

export function createApp(dataDir?: string): express.Express {
  const app = express();

  const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "rjc-audio-accounting-server"
    });
  });

  app.use("/api/auth", createAuthRouter(dataDir));
  app.use("/api/settings", createSettingsRouter(dataDir));
  app.use("/api/receipts", createReceiptsRouter(dataDir));
  app.use("/api/transactions", createTransactionsRouter(dataDir));
  app.use("/api/summaries", createSummariesRouter(dataDir));

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "Attachment exceeds FreeAgent's 5MB file size limit."
          });
          return;
        }
        res.status(400).json({
          error: err.message
        });
        return;
      }

      if (err instanceof ComplianceBoundaryError) {
        res.status(403).json({
          error: err.message
        });
        return;
      }

      if (err instanceof ZodError) {
        res.status(400).json({
          error: "Validation error",
          details: err.flatten()
        });
        return;
      }

      const message =
        err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({
        error: message
      });
    }
  );

  return app;
}
