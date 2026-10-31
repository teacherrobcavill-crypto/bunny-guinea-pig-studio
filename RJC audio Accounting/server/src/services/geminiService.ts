import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import {
  ExtractedReceipt,
  ExtractedReceiptSchema,
  EXTRACTED_RECEIPT_JSON_SCHEMA,
  FreeAgentCategory,
  VatMode,
  BankTransaction,
  TransactionCategorySuggestion,
  TransactionCategorySuggestionSchema,
  TRANSACTION_SUGGESTIONS_JSON_SCHEMA,
  FinancialSummaryResponse,
  FinancialSummaryResponseSchema,
  FINANCIAL_SUMMARY_JSON_SCHEMA,
} from "@rjc/shared";
import { sanitizePnLForGemini } from "../compliance/complianceGuard.js";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const STANDARD_SUMMARY_DISCLAIMER =
  "Operational summary only — does not constitute statutory tax or accounting advice. Statutory Corporation Tax, VAT, and payroll filings are managed directly within FreeAgent.";

export interface GeminiContentGenerator {
  models: {
    generateContent(params: {
      model: string;
      contents: unknown;
      config?: Record<string, unknown>;
    }): Promise<{ text?: string }>;
  };
}

export interface GeminiServiceOptions {
  apiKey?: string;
  client?: GeminiContentGenerator;
  allowMockFallback?: boolean;
  model?: string;
  fileNameHint?: string;
}

function resolveGeminiClient(
  options?: GeminiServiceOptions
): GeminiContentGenerator | null {
  if (options?.client) {
    return options.client;
  }
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    return new GoogleGenAI({ apiKey: apiKey.trim() }) as unknown as GeminiContentGenerator;
  }
  return null;
}

function parseJsonResponse<T>(rawText: string | undefined, context: string): T {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error(`Gemini returned an empty response for ${context}`);
  }
  try {
    return JSON.parse(rawText) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini JSON response for ${context}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

function buildCategoriesPromptList(categories: FreeAgentCategory[]): string {
  return categories
    .map(
      (cat) =>
        `- Nominal Code "${cat.nominalCode}": ${cat.description} (${cat.group})`
    )
    .join("\n");
}

function buildMockExtractedReceipt(
  fileBuffer: Buffer,
  categories: FreeAgentCategory[],
  vatMode: VatMode,
  fileNameHint?: string
): ExtractedReceipt {
  const textSample = `${fileNameHint ?? ""} ${fileBuffer
    .subarray(0, 512)
    .toString("utf8")}`.toLowerCase();

  const pickCode = (preferred: string): string => {
    const match = categories.find((c) => c.nominalCode === preferred);
    return match?.nominalCode ?? categories[0]?.nominalCode ?? "285";
  };

  if (textSample.includes("jlcpcb") || textSample.includes("pcb")) {
    const total = 142.8;
    const net = vatMode === "uk_vat_registered" ? 119.0 : null;
    const vat = vatMode === "uk_vat_registered" ? 23.8 : 0;
    return ExtractedReceiptSchema.parse({
      vendorName: "JLCPCB / Mouser Electronics",
      invoiceReference: "JLC-2026-0891",
      transactionDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      currency: "GBP",
      netAmount: net,
      vatAmount: vat,
      suggestedVatRate: vatMode === "uk_vat_registered" ? "20" : null,
      totalAmount: total,
      suggestedNominalCode: pickCode("101"),
      description:
        "4-layer prototype PCBs and SMD passives for Sonics spatial audio interface",
      confidence: 0.94,
    });
  }

  if (textSample.includes("farnell") || textSample.includes("mouser")) {
    const total = 86.4;
    const net = vatMode === "uk_vat_registered" ? 72.0 : null;
    const vat = vatMode === "uk_vat_registered" ? 14.4 : 0;
    return ExtractedReceiptSchema.parse({
      vendorName: "Farnell Element14 UK",
      invoiceReference: "FAR-992104",
      transactionDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      currency: "GBP",
      netAmount: net,
      vatAmount: vat,
      suggestedVatRate: vatMode === "uk_vat_registered" ? "20" : null,
      totalAmount: total,
      suggestedNominalCode: pickCode("249"),
      description:
        "AKM low-noise audio DAC evaluation modules and Neutrik XLR connectors",
      confidence: 0.93,
    });
  }

  const total = 58.8;
  const net = vatMode === "uk_vat_registered" ? 49.0 : null;
  const vat = vatMode === "uk_vat_registered" ? 9.8 : 0;
  return ExtractedReceiptSchema.parse({
    vendorName: "GitHub / Audio Dev Tools Ltd",
    invoiceReference: "INV-SONICS-2026",
    transactionDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    currency: "GBP",
    netAmount: net,
    vatAmount: vat,
    suggestedVatRate: vatMode === "uk_vat_registered" ? "20" : null,
    totalAmount: total,
    suggestedNominalCode: pickCode("272"),
    description:
      "DSP build runners & software subscription for Sonics audio engine",
    confidence: 0.91,
  });
}

function buildMockTransactionSuggestion(
  tx: BankTransaction,
  categories: FreeAgentCategory[]
): TransactionCategorySuggestion {
  const desc = tx.description.toLowerCase();
  const findCategory = (code: string, fallbackDesc: string) => {
    const found = categories.find((c) => c.nominalCode === code);
    return {
      code: found?.nominalCode ?? categories[0]?.nominalCode ?? code,
      description:
        found?.description ?? categories[0]?.description ?? fallbackDesc,
    };
  };

  if (tx.amount > 0 || desc.includes("stripe") || desc.includes("royalty") || desc.includes("sonics")) {
    const cat = findCategory("001", "Sales - Sonics Audio Hardware & DSP Licensing");
    return TransactionCategorySuggestionSchema.parse({
      transactionId: tx.id,
      suggestedNominalCode: cat.code,
      suggestedCategoryDescription: cat.description,
      suggestedExplanation: `Customer revenue receipt: ${tx.description}`,
      confidence: 0.95,
      rationale:
        "Inbound receipt matches Sonics plugin/hardware sales or licensing revenue.",
    });
  }

  if (desc.includes("jlcpcb") || desc.includes("mouser") || desc.includes("digikey")) {
    const cat = findCategory("101", "Cost of Sales - PCB Prototyping & Electronic Components");
    return TransactionCategorySuggestionSchema.parse({
      transactionId: tx.id,
      suggestedNominalCode: cat.code,
      suggestedCategoryDescription: cat.description,
      suggestedExplanation: `PCB & component supplier payment: ${tx.description}`,
      confidence: 0.94,
      rationale:
        "Merchant is an electronics / PCB manufacturer used for Sonics hardware production.",
    });
  }

  if (desc.includes("farnell") || desc.includes("rs components") || desc.includes("thomann")) {
    const cat = findCategory("249", "R&D - Acoustic Measurement & Audio Lab Consumables");
    return TransactionCategorySuggestionSchema.parse({
      transactionId: tx.id,
      suggestedNominalCode: cat.code,
      suggestedCategoryDescription: cat.description,
      suggestedExplanation: `Audio R&D lab consumables: ${tx.description}`,
      confidence: 0.92,
      rationale:
        "Audio/electronics lab supplier matched to R&D consumables nominal code.",
    });
  }

  if (desc.includes("aws") || desc.includes("github") || desc.includes("apple") || desc.includes("juce")) {
    const cat = findCategory("272", "Computer Software, Cloud DSP Runners & SaaS Subscriptions");
    return TransactionCategorySuggestionSchema.parse({
      transactionId: tx.id,
      suggestedNominalCode: cat.code,
      suggestedCategoryDescription: cat.description,
      suggestedExplanation: `Software & cloud tooling subscription: ${tx.description}`,
      confidence: 0.93,
      rationale:
        "Developer cloud/software vendor used for Sonics DSP compilation and notarization.",
    });
  }

  if (desc.includes("trainline") || desc.includes("tfl") || desc.includes("hotel") || desc.includes("studios")) {
    const cat = findCategory("250", "Travel & Subsistence (Studio Sessions & Trade Shows)");
    return TransactionCategorySuggestionSchema.parse({
      transactionId: tx.id,
      suggestedNominalCode: cat.code,
      suggestedCategoryDescription: cat.description,
      suggestedExplanation: `Business travel for studio demo / trade event: ${tx.description}`,
      confidence: 0.88,
      rationale:
        "Transport or studio session travel expense matched to Travel & Subsistence.",
    });
  }

  const fallback = findCategory("285", "Sundry Admin Expenses");
  return TransactionCategorySuggestionSchema.parse({
    transactionId: tx.id,
    suggestedNominalCode: fallback.code,
    suggestedCategoryDescription: fallback.description,
    suggestedExplanation: `Operational expense: ${tx.description}`,
    confidence: 0.78,
    rationale:
      "General administrative expense categorized using RJC Audio's chart of accounts.",
  });
}

/**
 * 1. Multimodal Receipt & Bill Extraction (`gemini-3.8-flash` with `inlineData`)
 */
export async function extractDocumentWithGemini(
  fileBuffer: Buffer,
  mimeType: string,
  categories: FreeAgentCategory[],
  vatMode: VatMode,
  options?: GeminiServiceOptions
): Promise<ExtractedReceipt> {
  const client = resolveGeminiClient(options);
  if (!client) {
    if (options?.allowMockFallback === false) {
      throw new Error(
        "Gemini API key is not configured and mock fallback is disabled."
      );
    }
    return buildMockExtractedReceipt(
      fileBuffer,
      categories,
      vatMode,
      options?.fileNameHint
    );
  }

  const vatInstruction =
    vatMode === "not_registered"
      ? "RJC Audio Ltd is currently NOT VAT registered (vatMode: 'not_registered'). Still extract any printed netAmount and vatAmount if visible on the receipt for verification, or set suggestedVatRate to null if not applicable."
      : "RJC Audio Ltd is UK VAT registered (vatMode: 'uk_vat_registered'). Extract netAmount, vatAmount, totalAmount, and the appropriate UK suggestedVatRate ('0', '5', '20', or 'exempt').";

  const systemInstruction = [
    "You are an expert UK bookkeeping assistant for RJC Audio Ltd, an audio technology company developing the 'Sonics' hardware and DSP software platform.",
    "Extract structured invoice/receipt details from the attached document.",
    "Select `suggestedNominalCode` strictly from the provided FreeAgent chart of accounts.",
    vatInstruction,
    "Do NOT perform statutory tax advisory or HMRC filing calculations.",
  ].join(" ");

  const promptText = [
    "Extract the receipt or supplier bill fields from this document in GBP (or the stated 3-letter ISO currency code).",
    `Current VAT Mode: ${vatMode}`,
    "Available FreeAgent Chart of Accounts categories:",
    buildCategoriesPromptList(categories),
  ].join("\n\n");

  const response = await client.models.generateContent({
    model: options?.model ?? DEFAULT_GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: EXTRACTED_RECEIPT_JSON_SCHEMA,
    },
  });

  const parsed = parseJsonResponse<unknown>(
    response.text,
    "extractDocumentWithGemini"
  );
  return ExtractedReceiptSchema.parse(parsed);
}

/**
 * 2. Batch Bank Transaction Categorization with `p-limit` concurrency control
 */
export async function suggestTransactionCategories(
  transactions: BankTransaction[],
  categories: FreeAgentCategory[],
  vatMode: VatMode,
  options?: GeminiServiceOptions & { batchSize?: number; concurrency?: number }
): Promise<TransactionCategorySuggestion[]> {
  if (transactions.length === 0) {
    return [];
  }

  const client = resolveGeminiClient(options);
  if (!client) {
    if (options?.allowMockFallback === false) {
      throw new Error(
        "Gemini API key is not configured and mock fallback is disabled."
      );
    }
    return transactions.map((tx) =>
      buildMockTransactionSuggestion(tx, categories)
    );
  }

  const batchSize = Math.max(1, options?.batchSize ?? 15);
  const concurrency = Math.max(1, options?.concurrency ?? 2);
  const limit = pLimit(concurrency);

  const batches: BankTransaction[][] = [];
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }

  const systemInstruction = [
    "You are an expert UK bookkeeping assistant for RJC Audio Ltd (makers of the 'Sonics' audio hardware & DSP platform).",
    "For each unexplained bank transaction, select the single most accurate `suggestedNominalCode` and `suggestedCategoryDescription` from the provided FreeAgent categories.",
    `Current VAT Mode: ${vatMode}.`,
    "Return a concise ledger `suggestedExplanation`, a confidence score between 0 and 1, and a brief 1-sentence `rationale`.",
  ].join(" ");

  const categoriesText = buildCategoriesPromptList(categories);

  const batchPromises = batches.map((batch) =>
    limit(async () => {
      const promptText = [
        "Categorize the following RJC Audio Ltd bank transactions using ONLY the FreeAgent nominal codes listed below.",
        "Available FreeAgent Categories:",
        categoriesText,
        "Bank Transactions to categorize (JSON):",
        JSON.stringify(
          batch.map((tx) => ({
            transactionId: tx.id,
            datedOn: tx.datedOn,
            description: tx.description,
            amount: tx.amount,
            unexplainedAmount: tx.unexplainedAmount,
          })),
          null,
          2
        ),
      ].join("\n\n");

      const response = await client.models.generateContent({
        model: options?.model ?? DEFAULT_GEMINI_MODEL,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: TRANSACTION_SUGGESTIONS_JSON_SCHEMA,
        },
      });

      const parsed = parseJsonResponse<{ suggestions?: unknown[] }>(
        response.text,
        "suggestTransactionCategories"
      );

      if (!parsed || !Array.isArray(parsed.suggestions)) {
        throw new Error(
          "Gemini response for suggestTransactionCategories is missing 'suggestions' array"
        );
      }

      return parsed.suggestions.map((item) =>
        TransactionCategorySuggestionSchema.parse(item)
      );
    })
  );

  const results = await Promise.all(batchPromises);
  return results.flat();
}

/**
 * 3. Plain-English Financial Summary (Strictly Sanitized Operational Metrics Only)
 */
export async function generatePlainEnglishSummary(
  rawOrSanitizedPnL: Record<string, unknown>,
  cashflowMetrics: Record<string, unknown>,
  deterministicVariances: Record<string, unknown>,
  options?: GeminiServiceOptions
): Promise<FinancialSummaryResponse> {
  // Mandatory HMRC Compliance Firewall: always strip `less` / Corporation Tax fields first
  const sanitizedPnL = sanitizePnLForGemini(rawOrSanitizedPnL);

  const client = resolveGeminiClient(options);
  if (!client) {
    if (options?.allowMockFallback === false) {
      throw new Error(
        "Gemini API key is not configured and mock fallback is disabled."
      );
    }

    const turnover =
      typeof sanitizedPnL.turnover === "number" ? sanitizedPnL.turnover : 48250;
    const operatingProfit =
      typeof sanitizedPnL.operatingProfit === "number"
        ? sanitizedPnL.operatingProfit
        : 19420;
    const unexplainedCount =
      typeof sanitizedPnL.unexplainedBankTransactionCount === "number"
        ? sanitizedPnL.unexplainedBankTransactionCount
        : 5;

    return FinancialSummaryResponseSchema.parse({
      executiveSummary: `RJC Audio Ltd generated £${turnover.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} in turnover with £${operatingProfit.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} in operating profit across the period, driven by Sonics DSP licensing and hardware unit deliveries.`,
      keyObservations: [
        "Gross margin remained resilient across Sonics audio interface and plugin licensing revenue streams.",
        "PCB prototyping (JLCPCB/Mouser) and acoustic R&D lab consumables represent the primary direct and technical spend categories.",
        `There are currently ${unexplainedCount} unexplained bank transaction(s) awaiting review and approval before pushing to FreeAgent.`,
      ],
      actionableNextSteps: [
        "Review and approve the high-confidence AI categorization suggestions for the unexplained bank transactions.",
        "Verify staged supplier bills (PCB fabrication and component orders) and push approved drafts to FreeAgent.",
        "Review statutory VAT / Corporation Tax obligations natively within FreeAgent's tax filing module.",
      ],
      disclaimer: STANDARD_SUMMARY_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    });
  }

  const systemInstruction = [
    "You are an operational financial narrator for the director of RJC Audio Ltd, a UK audio hardware and DSP software company ('Sonics').",
    "STRICT COMPLIANCE BOUNDARY: You are strictly prohibited from calculating, estimating, or advising on UK Corporation Tax, VAT liabilities, Self Assessment, payroll taxes, or HMRC statutory filings.",
    "Do NOT perform mental arithmetic; rely exclusively on the pre-calculated deterministic GBP figures and percentage variances supplied in the prompt.",
    "Narrate operational performance, revenue vs cost drivers, cashflow runway, and bookkeeping hygiene in clear, plain English.",
  ].join(" ");

  const promptPayload = {
    company: "RJC Audio Ltd (Sonics Audio Platform)",
    sanitizedOperationalPnL: sanitizedPnL,
    cashflowMetrics,
    deterministicVariances,
  };

  const response = await client.models.generateContent({
    model: options?.model ?? DEFAULT_GEMINI_MODEL,
    contents: [
      "Generate a plain-English operational financial briefing for RJC Audio Ltd using ONLY the pre-calculated figures below:",
      JSON.stringify(promptPayload, null, 2),
    ].join("\n\n"),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: FINANCIAL_SUMMARY_JSON_SCHEMA,
    },
  });

  const parsed = parseJsonResponse<Record<string, unknown>>(
    response.text,
    "generatePlainEnglishSummary"
  );

  return FinancialSummaryResponseSchema.parse({
    ...parsed,
    disclaimer:
      typeof parsed.disclaimer === "string" && parsed.disclaimer.trim().length > 0
        ? parsed.disclaimer
        : STANDARD_SUMMARY_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  });
}
