import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StagedDraft } from "@rjc/shared";
import { createApp } from "../src/app.js";
import {
  decryptBuffer,
  encryptBuffer,
  ensureMasterKey,
  listStagedDrafts,
  loadVault,
  saveStagedDraft,
  saveVault
} from "../src/security/vault.js";

describe("RJC Audio Ltd Accounting Server API Routes (E2E)", () => {
  let tempDataDir: string;

  beforeEach(async () => {
    tempDataDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "rjc-audio-api-test-")
    );
  });

  afterEach(async () => {
    if (tempDataDir && fs.existsSync(tempDataDir)) {
      await fsp.rm(tempDataDir, { recursive: true, force: true });
    }
  });

  it("GET /api/health returns service status", async () => {
    const app = createApp(tempDataDir);
    const res = await request(app).get("/api/health").expect(200);

    expect(res.body).toEqual({
      status: "ok",
      service: "rjc-audio-accounting-server"
    });
  });

  it("GET /api/settings & PUT /api/settings persist VAT mode and operating mode in encrypted vault", async () => {
    const app = createApp(tempDataDir);

    const initialRes = await request(app).get("/api/settings").expect(200);
    expect(initialRes.body.operatingMode).toBe("mock");
    expect(initialRes.body.vatMode).toBe("uk_vat_registered");
    expect(initialRes.body.companyName).toBe("RJC Audio Ltd");

    const updateRes = await request(app)
      .put("/api/settings")
      .send({
        vatMode: "not_registered",
        operatingMode: "mock",
        companyName: "RJC Audio Ltd"
      })
      .expect(200);

    expect(updateRes.body.vatMode).toBe("not_registered");
    expect(updateRes.body.operatingMode).toBe("mock");

    // Verify encrypted vault file exists on disk and settings persist across reload
    const vaultPath = path.join(tempDataDir, "vault.enc");
    expect(fs.existsSync(vaultPath)).toBe(true);

    const reloadedRes = await request(app).get("/api/settings").expect(200);
    expect(reloadedRes.body.vatMode).toBe("not_registered");
    expect(reloadedRes.body.operatingMode).toBe("mock");
  });

  it("POST /api/receipts/upload stages draft & binary, and POST /api/receipts/drafts/:id/approve pushes to provider and deletes binary immediately", async () => {
    const app = createApp(tempDataDir);
    const fakePdfBuffer = Buffer.from(
      "%PDF-1.4 JLCPCB prototype 4-layer PCB invoice for Sonics DSP audio interface",
      "utf-8"
    );

    const uploadRes = await request(app)
      .post("/api/receipts/upload")
      .field("targetType", "bill")
      .attach("file", fakePdfBuffer, {
        filename: "jlcpcb-sonics-pcb.pdf",
        contentType: "application/pdf"
      })
      .expect(201);

    const draft = uploadRes.body.draft ?? uploadRes.body;
    expect(draft.id).toBeTruthy();
    expect(draft.status).toBe("draft_review");
    expect(draft.targetType).toBe("bill");
    expect(draft.mathCheck.valid).toBe(true);

    // Confirm binary is staged on disk at <dataDir>/uploads/<id>.bin
    const stagedBinPath = path.join(tempDataDir, "uploads", `${draft.id}.bin`);
    expect(fs.existsSync(stagedBinPath)).toBe(true);

    // Approve draft and push to FreeAgent provider
    const approveRes = await request(app)
      .post(`/api/receipts/drafts/${draft.id}/approve`)
      .send({
        targetType: "bill"
      })
      .expect(200);

    const approvedDraft = approveRes.body.draft ?? approveRes.body;
    expect(approvedDraft.status).toBe("pushed_to_freeagent");
    expect(approvedDraft.freeagentResourceUri).toContain("/v2/bills/");

    // Confirm binary upload file is deleted immediately after 200 OK
    expect(fs.existsSync(stagedBinPath)).toBe(false);
  });

  it("GET /api/transactions/unexplained -> POST /api/transactions/categorize -> POST /api/transactions/approve", async () => {
    const app = createApp(tempDataDir);

    const listRes = await request(app)
      .get("/api/transactions/unexplained")
      .expect(200);

    expect(Array.isArray(listRes.body.transactions)).toBe(true);
    expect(listRes.body.transactions.length).toBeGreaterThan(0);
    expect(Array.isArray(listRes.body.categories)).toBe(true);
    expect(Array.isArray(listRes.body.bankAccounts)).toBe(true);

    const targetTx = listRes.body.transactions[0];
    expect(targetTx.isUnexplained).toBe(true);

    const catRes = await request(app)
      .post("/api/transactions/categorize")
      .send({
        transactionIds: [targetTx.id]
      })
      .expect(200);

    expect(Array.isArray(catRes.body.suggestions)).toBe(true);
    expect(catRes.body.suggestions).toHaveLength(1);
    const suggestion = catRes.body.suggestions[0];
    expect(suggestion.transactionId).toBe(targetTx.id);
    expect(suggestion.suggestedNominalCode).toBeTruthy();

    const approveRes = await request(app)
      .post("/api/transactions/approve")
      .send({
        transactionId: targetTx.id,
        bankTransactionUri: targetTx.url,
        datedOn: targetTx.datedOn,
        grossValue: targetTx.amount,
        nominalCode: suggestion.suggestedNominalCode,
        description: suggestion.suggestedExplanation,
        salesTaxRate: 20
      })
      .expect(200);

    expect(approveRes.body.explanationUri).toContain(
      "/v2/bank_transaction_explanations/"
    );
    expect(
      approveRes.body.payloadSent.bank_transaction_explanation
    ).toMatchObject({
      bank_transaction: targetTx.url,
      dated_on: targetTx.datedOn,
      description: suggestion.suggestedExplanation
    });
  });

  it("GET /api/summaries/overview & POST /api/summaries/generate return deterministic P&L and plain-English summary without tax liability fields", async () => {
    const app = createApp(tempDataDir);

    const overviewRes = await request(app)
      .get("/api/summaries/overview")
      .expect(200);

    expect(overviewRes.body.sanitizedPnL).toBeDefined();
    expect(overviewRes.body.sanitizedPnL.turnover).toBeGreaterThan(0);
    expect(overviewRes.body.sanitizedPnL).not.toHaveProperty("less");
    expect(overviewRes.body.sanitizedPnL).not.toHaveProperty(
      "corporation_tax_estimate"
    );
    expect(overviewRes.body.cashflow).toBeDefined();
    expect(overviewRes.body.variances).toEqual(
      expect.objectContaining({
        incomeGbp: overviewRes.body.sanitizedPnL.turnover,
        operatingProfitGbp: overviewRes.body.sanitizedPnL.operatingProfit
      })
    );

    const genRes = await request(app)
      .post("/api/summaries/generate")
      .send({})
      .expect(200);

    expect(genRes.body.summary).toBeDefined();
    expect(genRes.body.summary.executiveSummary).toContain("RJC Audio Ltd");
    expect(Array.isArray(genRes.body.summary.keyObservations)).toBe(true);
    expect(Array.isArray(genRes.body.summary.actionableNextSteps)).toBe(true);
    expect(genRes.body.summary.disclaimer).toContain("Operational summary only");
    expect(genRes.body.sanitizedPnL).not.toHaveProperty("less");
  });

  it("Encrypted Vault & Master Key Auto-Generation: enforces 0600 permissions and AES-256-GCM tamper detection", async () => {
    const masterKey = ensureMasterKey(tempDataDir);
    const keyPath = path.join(tempDataDir, ".master.key");

    expect(masterKey.length).toBe(32);
    expect(fs.existsSync(keyPath)).toBe(true);
    expect(fs.statSync(keyPath).mode & 0o777).toBe(0o600);

    // Round-trip encryptBuffer / decryptBuffer
    const secretPayload = Buffer.from(
      JSON.stringify({ apiKey: "AIzaSy-test-secret-998877", token: "fa-oauth-token" }),
      "utf-8"
    );
    const encrypted = encryptBuffer(secretPayload, masterKey);
    const decrypted = decryptBuffer(encrypted, masterKey);
    expect(decrypted.toString("utf-8")).toBe(secretPayload.toString("utf-8"));

    // Tamper with authTag byte (offset 14 is inside 12..28 authTag range)
    const tamperedAuthTag = Buffer.from(encrypted);
    tamperedAuthTag[14] ^= 0xff;
    expect(() => decryptBuffer(tamperedAuthTag, masterKey)).toThrow();

    // Tamper with ciphertext byte
    const tamperedCiphertext = Buffer.from(encrypted);
    tamperedCiphertext[tamperedCiphertext.length - 1] ^= 0xff;
    expect(() => decryptBuffer(tamperedCiphertext, masterKey)).toThrow();

    // Verify saveVault encrypts secrets at rest and enforces 0600 on vault.enc
    const rawGeminiSecret = "AIzaSyD-SUPER-SECRET-GEMINI-KEY-RJC-AUDIO";
    const rawFreeAgentSecret = "fa_secret_live_9876543210_rjc_audio";

    await saveVault(
      {
        geminiApiKey: rawGeminiSecret,
        freeagentClientSecret: rawFreeAgentSecret,
        operatingMode: "sandbox",
        vatMode: "uk_vat_registered"
      },
      tempDataDir
    );

    const vaultPath = path.join(tempDataDir, "vault.enc");
    expect(fs.existsSync(vaultPath)).toBe(true);
    expect(fs.statSync(vaultPath).mode & 0o777).toBe(0o600);

    const rawDiskBytes = await fsp.readFile(vaultPath);
    expect(rawDiskBytes.toString("utf-8")).not.toContain(rawGeminiSecret);
    expect(rawDiskBytes.toString("utf-8")).not.toContain(rawFreeAgentSecret);

    const loaded = await loadVault(tempDataDir);
    expect(loaded.geminiApiKey).toBe(rawGeminiSecret);
    expect(loaded.freeagentClientSecret).toBe(rawFreeAgentSecret);
    expect(loaded.operatingMode).toBe("sandbox");
  });

  it("Concurrent Atomic File Writes: serializes 8 parallel saveStagedDraft calls without data loss or corruption", async () => {
    const now = new Date().toISOString();
    const draftsToSave: StagedDraft[] = Array.from({ length: 8 }, (_, idx) => ({
      id: `concurrent-draft-${idx + 1}`,
      fileName: `mouser-invoice-${idx + 1}.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: 12400 + idx * 100,
      targetType: idx % 2 === 0 ? "bill" : "expense",
      status: "draft_review",
      extracted: {
        vendorName: `Mouser Electronics Batch #${idx + 1}`,
        invoiceReference: `MSR-2026-00${idx + 1}`,
        transactionDate: "2026-03-15",
        dueDate: "2026-04-14",
        currency: "GBP",
        netAmount: 100,
        vatAmount: 20,
        suggestedVatRate: "20",
        totalAmount: 120,
        suggestedNominalCode: "201",
        description: `Audio DSP op-amps batch ${idx + 1}`,
        confidence: 0.96
      },
      mathCheck: {
        valid: true,
        discrepancyPence: 0
      },
      targetContactOrUserUri: null,
      freeagentResourceUri: null,
      createdAt: now,
      updatedAt: now
    }));

    await Promise.all(
      draftsToSave.map((draft) => saveStagedDraft(draft, tempDataDir))
    );

    const persistedDrafts = await listStagedDrafts(tempDataDir);
    expect(persistedDrafts).toHaveLength(8);

    const persistedIds = persistedDrafts.map((d) => d.id).sort();
    const expectedIds = draftsToSave.map((d) => d.id).sort();
    expect(persistedIds).toEqual(expectedIds);

    const draftsPath = path.join(tempDataDir, "staged_drafts.json");
    expect(fs.existsSync(draftsPath)).toBe(true);
    expect(fs.statSync(draftsPath).mode & 0o777).toBe(0o600);

    const rawJson = JSON.parse(await fsp.readFile(draftsPath, "utf-8"));
    expect(Array.isArray(rawJson)).toBe(true);
    expect(rawJson).toHaveLength(8);
  });

  it("File Cleanup on Draft Deletion & Double-Approve Idempotency Guard (409 Conflict)", async () => {
    const app = createApp(tempDataDir);
    const samplePdf = Buffer.from(
      "%PDF-1.4 Farnell UK component order receipt",
      "utf-8"
    );

    // 1. Upload first receipt and delete the staged draft -> binary file must be purged
    const uploadDeleteRes = await request(app)
      .post("/api/receipts/upload")
      .field("targetType", "expense")
      .attach("file", samplePdf, {
        filename: "farnell-delete-test.pdf",
        contentType: "application/pdf"
      })
      .expect(201);

    const draftToDelete = uploadDeleteRes.body.draft;
    const binToDeletePath = path.join(
      tempDataDir,
      "uploads",
      `${draftToDelete.id}.bin`
    );
    expect(fs.existsSync(binToDeletePath)).toBe(true);

    await request(app)
      .delete(`/api/receipts/drafts/${draftToDelete.id}`)
      .expect(200);

    expect(fs.existsSync(binToDeletePath)).toBe(false);

    // 2. Upload second receipt, approve once (200 OK), then approve again -> 409 Conflict
    const uploadApproveRes = await request(app)
      .post("/api/receipts/upload")
      .field("targetType", "bill")
      .attach("file", samplePdf, {
        filename: "farnell-idempotency-test.pdf",
        contentType: "application/pdf"
      })
      .expect(201);

    const draftToApprove = uploadApproveRes.body.draft;

    await request(app)
      .post(`/api/receipts/drafts/${draftToApprove.id}/approve`)
      .send({})
      .expect(200);

    const secondApproveRes = await request(app)
      .post(`/api/receipts/drafts/${draftToApprove.id}/approve`)
      .send({})
      .expect(409);

    expect(secondApproveRes.body.error).toContain("already been pushed");
  });
});
