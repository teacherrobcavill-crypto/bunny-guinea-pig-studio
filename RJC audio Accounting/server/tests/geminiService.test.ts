import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_GEMINI_MODEL,
  extractDocumentWithGemini,
  suggestTransactionCategories,
  generatePlainEnglishSummary,
  GeminiContentGenerator,
} from "../src/services/geminiService.js";
import {
  EXTRACTED_RECEIPT_JSON_SCHEMA,
  TRANSACTION_SUGGESTIONS_JSON_SCHEMA,
  FINANCIAL_SUMMARY_JSON_SCHEMA,
  FreeAgentCategory,
  BankTransaction,
} from "@rjc/shared";

const SAMPLE_CATEGORIES: FreeAgentCategory[] = [
  {
    nominalCode: "001",
    description: "Sales - Sonics Audio Hardware & DSP Licensing",
    group: "Income",
  },
  {
    nominalCode: "101",
    description: "Cost of Sales - PCB Prototyping & Electronic Components",
    group: "Cost of Sales",
  },
  {
    nominalCode: "249",
    description: "R&D - Acoustic Measurement & Audio Lab Consumables",
    group: "Admin Expenses",
  },
  {
    nominalCode: "272",
    description: "Computer Software, Cloud DSP Runners & SaaS Subscriptions",
    group: "Admin Expenses",
  },
];

describe("geminiService (gemini-3.8-flash structured outputs & compliance)", () => {
  it("extractDocumentWithGemini sends Base64 inlineData, enforces JSON schema, and validates ExtractedReceiptSchema", async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        vendorName: "JLCPCB Precision Electronics",
        invoiceReference: "JLC-2026-4412",
        transactionDate: "2026-10-15",
        dueDate: "2026-11-14",
        currency: "GBP",
        netAmount: 200.0,
        vatAmount: 40.0,
        suggestedVatRate: "20",
        totalAmount: 240.0,
        suggestedNominalCode: "101",
        description: "4-layer immersion gold PCBs for Sonics MkII DSP board",
        confidence: 0.97,
      }),
    });

    const mockClient: GeminiContentGenerator = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const samplePdfBuffer = Buffer.from("%PDF-1.7 sample JLCPCB invoice");
    const result = await extractDocumentWithGemini(
      samplePdfBuffer,
      "application/pdf",
      SAMPLE_CATEGORIES,
      "uk_vat_registered",
      { client: mockClient }
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.model).toBe(DEFAULT_GEMINI_MODEL);
    expect(callArg.config.responseMimeType).toBe("application/json");
    expect(callArg.config.responseJsonSchema).toEqual(
      EXTRACTED_RECEIPT_JSON_SCHEMA
    );

    const parts = callArg.contents[0].parts;
    expect(parts[0].inlineData).toEqual({
      data: samplePdfBuffer.toString("base64"),
      mimeType: "application/pdf",
    });
    expect(parts[1].text).toContain("101");
    expect(parts[1].text).toContain("uk_vat_registered");

    expect(result.vendorName).toBe("JLCPCB Precision Electronics");
    expect(result.totalAmount).toBe(240.0);
    expect(result.suggestedNominalCode).toBe("101");
    expect(result.confidence).toBe(0.97);
  });

  it("suggestTransactionCategories chunks large transaction lists and enforces p-limit concurrency", async () => {
    const transactions: BankTransaction[] = Array.from(
      { length: 5 },
      (_, idx) => ({
        id: `tx-${idx + 1}`,
        url: `https://api.freeagent.com/v2/bank_transactions/${idx + 1}`,
        datedOn: "2026-10-20",
        description: `MOUSER ELECTRONICS ORDER #${idx + 1}`,
        amount: -120.5,
        unexplainedAmount: -120.5,
        isUnexplained: true,
      })
    );

    let activeCalls = 0;
    let maxObservedConcurrency = 0;

    const mockGenerateContent = vi.fn().mockImplementation(async (params) => {
      activeCalls += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, activeCalls);

      await new Promise((resolve) => setTimeout(resolve, 15));

      const promptStr = String(params.contents);
      const matchedIds = Array.from(
        promptStr.matchAll(/"transactionId":\s*"([^"]+)"/g)
      ).map((m) => m[1]);

      activeCalls -= 1;

      return {
        text: JSON.stringify({
          suggestions: matchedIds.map((id) => ({
            transactionId: id,
            suggestedNominalCode: "101",
            suggestedCategoryDescription:
              "Cost of Sales - PCB Prototyping & Electronic Components",
            suggestedExplanation: `Component order (${id})`,
            confidence: 0.94,
            rationale: "Electronic component vendor for Sonics hardware.",
          })),
        }),
      };
    });

    const mockClient: GeminiContentGenerator = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const suggestions = await suggestTransactionCategories(
      transactions,
      SAMPLE_CATEGORIES,
      "not_registered",
      {
        client: mockClient,
        batchSize: 2,
        concurrency: 2,
      }
    );

    // 5 transactions with batchSize=2 -> 3 batch calls
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(maxObservedConcurrency).toBeLessThanOrEqual(2);
    expect(suggestions).toHaveLength(5);
    expect(suggestions.map((s) => s.transactionId)).toEqual([
      "tx-1",
      "tx-2",
      "tx-3",
      "tx-4",
      "tx-5",
    ]);

    const firstCallConfig = mockGenerateContent.mock.calls[0][0].config;
    expect(firstCallConfig.responseMimeType).toBe("application/json");
    expect(firstCallConfig.responseJsonSchema).toEqual(
      TRANSACTION_SUGGESTIONS_JSON_SCHEMA
    );
  });

  it("generatePlainEnglishSummary strips 'less' (Corporation Tax) before passing payload to generateContent", async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        executiveSummary:
          "RJC Audio Ltd achieved £52,000.00 in turnover and £21,500.00 in operating profit.",
        keyObservations: [
          "Strong Sonics DSP plugin licensing growth across Q3.",
          "PCB prototyping costs tracked within expected hardware R&D budget.",
        ],
        actionableNextSteps: [
          "Categorize the 3 remaining unexplained bank transactions.",
        ],
        disclaimer:
          "Operational summary only — statutory filings are managed in FreeAgent.",
      }),
    });

    const mockClient: GeminiContentGenerator = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const rawFreeAgentPnLWithTax = {
      turnover: 52000,
      costOfSales: 14500,
      grossProfit: 37500,
      administrativeExpenses: 16000,
      operatingProfit: 21500,
      less: [
        {
          title: "Corporation Tax",
          total: 4085,
        },
        {
          title: "Dividends",
          total: 10000,
        },
      ],
      corporation_tax_estimate: 4085,
      tax_liability_reserve: 4085,
    };

    const cashflowMetrics = {
      closingCashGbp: 38400,
      monthlyBurnGbp: 5300,
    };

    const deterministicVariances = {
      incomeGbp: 52000,
      expensesGbp: 30500,
      operatingProfitGbp: 21500,
      operatingProfitDeltaPercent: 14.2,
    };

    const summary = await generatePlainEnglishSummary(
      rawFreeAgentPnLWithTax,
      cashflowMetrics,
      deterministicVariances,
      { client: mockClient }
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    const promptSentToGemini = String(callArg.contents);

    // Verify Corporation Tax & `less` deductions were completely stripped before hitting Gemini
    expect(promptSentToGemini).not.toContain('"less"');
    expect(promptSentToGemini).not.toContain("4085");
    expect(promptSentToGemini).not.toContain("corporation_tax_estimate");
    expect(promptSentToGemini).not.toContain("tax_liability_reserve");
    expect(promptSentToGemini).toContain('"operatingProfit": 21500');

    expect(callArg.config.responseMimeType).toBe("application/json");
    expect(callArg.config.responseJsonSchema).toEqual(
      FINANCIAL_SUMMARY_JSON_SCHEMA
    );

    expect(summary.executiveSummary).toContain("£52,000.00");
    expect(summary.keyObservations).toHaveLength(2);
    expect(summary.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
