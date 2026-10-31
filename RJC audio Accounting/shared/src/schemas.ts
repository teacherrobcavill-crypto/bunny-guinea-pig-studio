import { z } from "zod";

export const OperatingModeSchema = z.enum(["mock", "sandbox", "production"]);
export type OperatingMode = z.infer<typeof OperatingModeSchema>;

export const VatModeSchema = z.enum(["not_registered", "uk_vat_registered"]);
export type VatMode = z.infer<typeof VatModeSchema>;

export const ReceiptTargetTypeSchema = z.enum(["bill", "expense"]);
export type ReceiptTargetType = z.infer<typeof ReceiptTargetTypeSchema>;

export const DraftStatusSchema = z.enum(["draft_review", "pushing", "pushed_to_freeagent"]);
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export const ExtractedReceiptSchema = z.object({
  vendorName: z.string().describe("Supplier or merchant name"),
  invoiceReference: z.string().describe("Invoice or receipt number, or empty string if none"),
  transactionDate: z.string().describe("ISO date YYYY-MM-DD"),
  dueDate: z.string().nullable().describe("ISO due date YYYY-MM-DD if stated, else null"),
  currency: z.string().default("GBP").describe("3-letter ISO currency code"),
  netAmount: z.number().nullable().describe("Amount excluding VAT if shown"),
  vatAmount: z.number().nullable().describe("VAT amount if shown, else 0 or null"),
  suggestedVatRate: z.enum(["0", "5", "20", "exempt"]).nullable(),
  totalAmount: z.number().describe("Gross total amount inclusive of VAT"),
  suggestedNominalCode: z.string().describe("Suggested FreeAgent nominal code"),
  description: z.string().describe("Concise line-item summary for ledger entry"),
  confidence: z.number().min(0).max(1)
});
export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;

export const MathCheckResultSchema = z.object({
  valid: z.boolean(),
  discrepancyPence: z.number()
});
export type MathCheckResult = z.infer<typeof MathCheckResultSchema>;

export const StagedDraftSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  targetType: ReceiptTargetTypeSchema,
  status: DraftStatusSchema,
  extracted: ExtractedReceiptSchema,
  mathCheck: MathCheckResultSchema,
  targetContactOrUserUri: z.string().nullable(),
  freeagentResourceUri: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type StagedDraft = z.infer<typeof StagedDraftSchema>;

export const FreeAgentCategorySchema = z.object({
  nominalCode: z.string(),
  description: z.string(),
  group: z.string(),
  allowableForTax: z.boolean().optional()
});
export type FreeAgentCategory = z.infer<typeof FreeAgentCategorySchema>;

export const FreeAgentContactSchema = z.object({
  url: z.string(),
  organisationName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable()
});
export type FreeAgentContact = z.infer<typeof FreeAgentContactSchema>;

export const FreeAgentUserSchema = z.object({
  url: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.string()
});
export type FreeAgentUser = z.infer<typeof FreeAgentUserSchema>;

export const BankTransactionSchema = z.object({
  id: z.string(),
  url: z.string(),
  datedOn: z.string(),
  description: z.string(),
  amount: z.number(),
  unexplainedAmount: z.number(),
  isUnexplained: z.boolean(),
  suggestedNominalCode: z.string().nullable().optional(),
  suggestedCategoryDescription: z.string().nullable().optional(),
  suggestedExplanation: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  rationale: z.string().nullable().optional(),
  explainedNominalCode: z.string().nullable().optional(),
  explainedDescription: z.string().nullable().optional(),
  explainedAt: z.string().nullable().optional()
});
export type BankTransaction = z.infer<typeof BankTransactionSchema>;

export const TransactionCategorySuggestionSchema = z.object({
  transactionId: z.string(),
  suggestedNominalCode: z.string(),
  suggestedCategoryDescription: z.string(),
  suggestedExplanation: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string()
});
export type TransactionCategorySuggestion = z.infer<typeof TransactionCategorySuggestionSchema>;

export const SanitizedOperationalPnLSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  currency: z.string().default("GBP"),
  turnover: z.number(),
  costOfSales: z.number(),
  grossProfit: z.number(),
  administrativeExpenses: z.number(),
  operatingProfit: z.number(),
  expenseBreakdownByCategory: z.array(
    z.object({
      nominalCode: z.string(),
      category: z.string(),
      amount: z.number()
    })
  ),
  unexplainedBankTransactionCount: z.number(),
  stagedDraftCount: z.number()
});
export type SanitizedOperationalPnL = z.infer<typeof SanitizedOperationalPnLSchema>;

export const FinancialSummaryResponseSchema = z.object({
  executiveSummary: z.string(),
  keyObservations: z.array(z.string()),
  actionableNextSteps: z.array(z.string()),
  disclaimer: z.string(),
  generatedAt: z.string()
});
export type FinancialSummaryResponse = z.infer<typeof FinancialSummaryResponseSchema>;

export const AppSettingsSchema = z.object({
  operatingMode: OperatingModeSchema,
  vatMode: VatModeSchema,
  hasGeminiApiKey: z.boolean(),
  freeagentConnected: z.boolean(),
  companyName: z.string()
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const EXTRACTED_RECEIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    vendorName: {
      type: "string",
      description: "Supplier or merchant name"
    },
    invoiceReference: {
      type: "string",
      description: "Invoice or receipt number, or empty string if none"
    },
    transactionDate: {
      type: "string",
      description: "ISO date YYYY-MM-DD"
    },
    dueDate: {
      type: ["string", "null"],
      description: "ISO due date YYYY-MM-DD if stated, else null"
    },
    currency: {
      type: "string",
      description: "3-letter ISO currency code"
    },
    netAmount: {
      type: ["number", "null"],
      description: "Amount excluding VAT if shown"
    },
    vatAmount: {
      type: ["number", "null"],
      description: "VAT amount if shown, else 0 or null"
    },
    suggestedVatRate: {
      type: ["string", "null"],
      enum: ["0", "5", "20", "exempt", null],
      description: "Suggested UK VAT rate percentage or exempt"
    },
    totalAmount: {
      type: "number",
      description: "Gross total amount inclusive of VAT"
    },
    suggestedNominalCode: {
      type: "string",
      description: "Suggested FreeAgent nominal code"
    },
    description: {
      type: "string",
      description: "Concise line-item summary for ledger entry"
    },
    confidence: {
      type: "number",
      description: "Extraction confidence score between 0 and 1"
    }
  },
  required: [
    "vendorName",
    "invoiceReference",
    "transactionDate",
    "dueDate",
    "currency",
    "netAmount",
    "vatAmount",
    "suggestedVatRate",
    "totalAmount",
    "suggestedNominalCode",
    "description",
    "confidence"
  ]
} as const;

export const TRANSACTION_SUGGESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          transactionId: { type: "string" },
          suggestedNominalCode: { type: "string" },
          suggestedCategoryDescription: { type: "string" },
          suggestedExplanation: { type: "string" },
          confidence: { type: "number" },
          rationale: { type: "string" }
        },
        required: [
          "transactionId",
          "suggestedNominalCode",
          "suggestedCategoryDescription",
          "suggestedExplanation",
          "confidence",
          "rationale"
        ]
      }
    }
  },
  required: ["suggestions"]
} as const;

export const FINANCIAL_SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    executiveSummary: { type: "string" },
    keyObservations: {
      type: "array",
      items: { type: "string" }
    },
    actionableNextSteps: {
      type: "array",
      items: { type: "string" }
    },
    disclaimer: { type: "string" }
  },
  required: [
    "executiveSummary",
    "keyObservations",
    "actionableNextSteps",
    "disclaimer"
  ]
} as const;
