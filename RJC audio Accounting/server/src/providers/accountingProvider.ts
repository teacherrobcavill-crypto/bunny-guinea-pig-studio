import {
  BankTransaction,
  FreeAgentCategory,
  FreeAgentContact,
  FreeAgentUser,
  OperatingMode,
  SanitizedOperationalPnL,
  VatMode
} from "@rjc/shared";
import { loadVault } from "../security/vault.js";
import { FreeAgentClient } from "./freeagentClient.js";
import { MockFreeAgentProvider } from "./mockFreeAgentProvider.js";

export interface AttachmentInput {
  fileName: string;
  mimeType: string;
  dataBuffer: Buffer;
  description?: string;
}

export interface CreateBillInput {
  contactUri?: string;
  vendorName: string;
  reference: string;
  datedOn: string;
  dueOn: string;
  currency: string;
  totalValue: number;
  netValue?: number | null;
  vatValue?: number | null;
  salesTaxRate?: number | null;
  nominalCode: string;
  description: string;
  vatMode: VatMode;
  attachment?: AttachmentInput;
}

export interface CreateExpenseInput {
  userUri?: string;
  datedOn: string;
  currency: string;
  grossValue: number;
  salesTaxRate?: number | null;
  manualSalesTaxAmount?: number | null;
  nominalCode: string;
  description: string;
  vatMode: VatMode;
  attachment?: AttachmentInput;
}

export interface ExplainBankTransactionInput {
  bankTransactionUri: string;
  transactionId: string;
  datedOn: string;
  grossValue: number;
  nominalCode: string;
  description: string;
  salesTaxRate?: number | null;
}

export interface CashflowSummary {
  from: string;
  to: string;
  balanceToday: number;
  projectedBalance90Days: number;
  incoming90Days: number;
  outgoing90Days: number;
  monthlyTrend: Array<{
    month: string;
    inflow: number;
    outflow: number;
    netCashflow: number;
  }>;
}

export interface AccountingProvider {
  mode: OperatingMode;
  getCompanyInfo(): Promise<{
    name: string;
    currency: string;
    salesTaxRegistrationStatus: string;
  }>;
  getCategories(): Promise<FreeAgentCategory[]>;
  getUsers(): Promise<FreeAgentUser[]>;
  getContacts(): Promise<FreeAgentContact[]>;
  findOrCreateContact(vendorName: string): Promise<FreeAgentContact>;
  createBill(
    input: CreateBillInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }>;
  createExpense(
    input: CreateExpenseInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }>;
  getBankAccounts(): Promise<
    Array<{ url: string; name: string; currency: string; currentBalance: number }>
  >;
  getUnexplainedTransactions(bankAccountUri?: string): Promise<BankTransaction[]>;
  explainBankTransaction(
    input: ExplainBankTransactionInput
  ): Promise<{ explanationUri: string; payloadSent: Record<string, unknown> }>;
  getRawProfitAndLossSummary(
    fromDate?: string,
    toDate?: string
  ): Promise<Record<string, unknown>>;
  getSanitizedProfitAndLoss(
    fromDate?: string,
    toDate?: string
  ): Promise<SanitizedOperationalPnL>;
  getCashflowSummary(): Promise<CashflowSummary>;
}

const mockInstances = new Map<string, MockFreeAgentProvider>();

export async function getAccountingProvider(
  dataDir?: string
): Promise<AccountingProvider> {
  const vault = await loadVault(dataDir);
  if (vault.operatingMode === "mock") {
    const cacheKey = dataDir ?? "__default__";
    let instance = mockInstances.get(cacheKey);
    if (!instance) {
      instance = new MockFreeAgentProvider(dataDir);
      mockInstances.set(cacheKey, instance);
    }
    return instance;
  }

  return new FreeAgentClient(vault.operatingMode, dataDir);
}
