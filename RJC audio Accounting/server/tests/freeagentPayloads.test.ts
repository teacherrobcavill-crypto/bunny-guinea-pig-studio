import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ComplianceBoundaryError } from "../src/compliance/complianceGuard.js";
import {
  FreeAgentClient,
  buildFreeAgentAttachmentPayload,
  buildFreeAgentBillPayload,
  buildFreeAgentExpensePayload,
  buildFreeAgentExplanationPayload,
  normalizeFreeAgentAttachmentMime
} from "../src/providers/freeagentClient.js";
import { MockFreeAgentProvider } from "../src/providers/mockFreeAgentProvider.js";

describe("FreeAgent Bridge & Payload Builders (Phase 3A)", () => {
  describe("normalizeFreeAgentAttachmentMime", () => {
    it("maps application/pdf to FreeAgent's required application/x-pdf", () => {
      expect(normalizeFreeAgentAttachmentMime("application/pdf")).toBe(
        "application/x-pdf"
      );
      expect(normalizeFreeAgentAttachmentMime("APPLICATION/PDF")).toBe(
        "application/x-pdf"
      );
    });

    it("preserves supported image MIME types and rejects unsupported types", () => {
      expect(normalizeFreeAgentAttachmentMime("image/png")).toBe("image/png");
      expect(normalizeFreeAgentAttachmentMime("image/jpeg")).toBe("image/jpeg");
      expect(normalizeFreeAgentAttachmentMime("image/gif")).toBe("image/gif");

      expect(() => normalizeFreeAgentAttachmentMime("text/csv")).toThrow(
        /Unsupported FreeAgent attachment MIME type/
      );
    });
  });

  describe("buildFreeAgentAttachmentPayload", () => {
    it("encodes Buffer to Base64 and normalizes MIME type", () => {
      const sample = Buffer.from("%PDF-1.7 fake invoice content", "utf-8");
      const payload = buildFreeAgentAttachmentPayload({
        fileName: "cloudflare-feb.pdf",
        mimeType: "application/pdf",
        dataBuffer: sample,
        description: "Cloudflare February Invoice"
      });

      expect(payload).toEqual({
        data: sample.toString("base64"),
        file_name: "cloudflare-feb.pdf",
        content_type: "application/x-pdf",
        description: "Cloudflare February Invoice"
      });
    });

    it("rejects attachments larger than 5MB", () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0x41);
      expect(() =>
        buildFreeAgentAttachmentPayload({
          fileName: "huge-scan.png",
          mimeType: "image/png",
          dataBuffer: oversizedBuffer
        })
      ).toThrow(/5MB limit/);
    });
  });

  describe("buildFreeAgentBillPayload & buildFreeAgentExpensePayload", () => {
    it("formats Bill payload properly under uk_vat_registered and not_registered modes", () => {
      const contactUri = "https://api.sandbox.freeagent.com/v2/contacts/201";
      const categoryUri = "https://api.sandbox.freeagent.com/v2/categories/364";

      const vatBill = buildFreeAgentBillPayload(
        {
          vendorName: "Cloudflare Inc",
          reference: "CF-2026-02",
          datedOn: "2026-02-18",
          dueOn: "2026-02-18",
          currency: "GBP",
          totalValue: 144.0,
          netValue: 120.0,
          vatValue: 24.0,
          salesTaxRate: 20,
          nominalCode: "364",
          description: "Sonics CDN & Workers Pro",
          vatMode: "uk_vat_registered"
        },
        contactUri,
        categoryUri
      );

      expect(vatBill).toEqual({
        bill: {
          contact: contactUri,
          reference: "CF-2026-02",
          dated_on: "2026-02-18",
          due_on: "2026-02-18",
          currency: "GBP",
          bill_items: [
            {
              category: categoryUri,
              description: "Sonics CDN & Workers Pro",
              total_value: "144.00",
              sales_tax_rate: "20.00",
              manual_sales_tax_amount: "24.00"
            }
          ]
        }
      });

      const nonVatBill = buildFreeAgentBillPayload(
        {
          vendorName: "Cloudflare Inc",
          reference: "CF-2026-02",
          datedOn: "2026-02-18",
          dueOn: "2026-02-18",
          currency: "GBP",
          totalValue: 144.0,
          nominalCode: "364",
          description: "Sonics CDN & Workers Pro",
          vatMode: "not_registered"
        },
        contactUri,
        categoryUri
      );

      const nonVatItem = (
        (nonVatBill.bill as Record<string, unknown>).bill_items as Array<
          Record<string, unknown>
        >
      )[0];
      expect(nonVatItem.sales_tax_status).toBe("OUTSIDE_SCOPE");
      expect(nonVatItem).not.toHaveProperty("sales_tax_rate");
      expect(nonVatItem).not.toHaveProperty("manual_sales_tax_amount");
    });

    it("formats Expense payload properly under uk_vat_registered and not_registered modes", () => {
      const userUri = "https://api.sandbox.freeagent.com/v2/users/101";
      const categoryUri = "https://api.sandbox.freeagent.com/v2/categories/450";

      const vatExpense = buildFreeAgentExpensePayload(
        {
          datedOn: "2026-02-23",
          currency: "GBP",
          grossValue: 840.0,
          salesTaxRate: 20,
          manualSalesTaxAmount: 140.0,
          nominalCode: "450",
          description: "Neumann Studio Microphone",
          vatMode: "uk_vat_registered"
        },
        userUri,
        categoryUri
      );

      expect(vatExpense).toEqual({
        expense: {
          user: userUri,
          category: categoryUri,
          dated_on: "2026-02-23",
          currency: "GBP",
          gross_value: "-840.00",
          description: "Neumann Studio Microphone",
          sales_tax_rate: "20.00",
          manual_sales_tax_amount: "140.00"
        }
      });

      const nonVatExpense = buildFreeAgentExpensePayload(
        {
          datedOn: "2026-02-23",
          currency: "GBP",
          grossValue: 840.0,
          nominalCode: "450",
          description: "Neumann Studio Microphone",
          vatMode: "not_registered"
        },
        userUri,
        categoryUri
      );

      const expObj = nonVatExpense.expense as Record<string, unknown>;
      expect(expObj.sales_tax_status).toBe("OUTSIDE_SCOPE");
      expect(expObj).not.toHaveProperty("sales_tax_rate");
    });

    it("formats Bank Transaction Explanation payload properly", () => {
      const categoryUri = "https://api.sandbox.freeagent.com/v2/categories/390";
      const explanation = buildFreeAgentExplanationPayload(
        {
          bankTransactionUri:
            "https://api.sandbox.freeagent.com/v2/bank_transactions/tx-sonics-002",
          transactionId: "tx-sonics-002",
          datedOn: "2026-02-19",
          grossValue: -48.5,
          nominalCode: "390",
          description: "Stripe UK Merchant Processing Fees",
          salesTaxRate: 0
        },
        categoryUri
      );

      expect(explanation).toEqual({
        bank_transaction_explanation: {
          bank_transaction:
            "https://api.sandbox.freeagent.com/v2/bank_transactions/tx-sonics-002",
          dated_on: "2026-02-19",
          gross_value: "-48.50",
          category: categoryUri,
          description: "Stripe UK Merchant Processing Fees",
          sales_tax_rate: "0.00"
        }
      });
    });
  });

  describe("FreeAgentClient Compliance Firewall Enforcement", () => {
    it("rejects /v2/corporation_tax_returns and /v2/vat_returns before making any network call", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const client = new FreeAgentClient("sandbox");

      await expect(
        client.request("/v2/corporation_tax_returns")
      ).rejects.toThrow(ComplianceBoundaryError);

      await expect(client.request("/v2/vat_returns")).rejects.toThrow(
        ComplianceBoundaryError
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe("MockFreeAgentProvider (RJC Audio Ltd / Sonics Data)", () => {
    it("strips Corporation Tax in getSanitizedProfitAndLoss and marks transactions explained statefully", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rjc-mock-test-"));
      try {
        const provider = new MockFreeAgentProvider(tmpDir);

        const rawPnL = await provider.getRawProfitAndLossSummary();
        const rawSummary = rawPnL.profit_and_loss_summary as Record<
          string,
          unknown
        >;
        expect(rawSummary).toHaveProperty("less");

        const sanitized = await provider.getSanitizedProfitAndLoss();
        expect(sanitized.turnover).toBe(68400);
        expect(sanitized.operatingProfit).toBe(40000);
        expect(sanitized.unexplainedBankTransactionCount).toBe(6);
        expect(JSON.stringify(sanitized)).not.toContain("Corporation Tax");

        const txsBefore = await provider.getUnexplainedTransactions();
        expect(txsBefore.filter((t) => t.isUnexplained)).toHaveLength(6);

        await provider.explainBankTransaction({
          bankTransactionUri: txsBefore[0].url,
          transactionId: txsBefore[0].id,
          datedOn: txsBefore[0].datedOn,
          grossValue: txsBefore[0].amount,
          nominalCode: "364",
          description: "Cloudflare CDN & Workers Infrastructure"
        });

        const txsAfter = await provider.getUnexplainedTransactions();
        expect(txsAfter.filter((t) => t.isUnexplained)).toHaveLength(5);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
