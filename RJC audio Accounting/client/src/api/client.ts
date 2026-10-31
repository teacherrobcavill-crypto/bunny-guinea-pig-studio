import type {
  BankTransaction,
  ExtractedReceipt,
  FinancialSummaryResponse,
  FreeAgentCategory,
  FreeAgentContact,
  FreeAgentUser,
  OperatingMode,
  ReceiptTargetType,
  SanitizedOperationalPnL,
  StagedDraft,
  TransactionCategorySuggestion,
  VatMode
} from "@rjc/shared";

export interface PublicSettings {
  operatingMode: OperatingMode;
  vatMode: VatMode;
  hasGeminiApiKey: boolean;
  hasFreeagentCredentials: boolean;
  freeagentConnected: boolean;
  defaultUserUri: string | null;
  companyName: string;
  forbiddenPaths: string[];
}

export interface ReferenceData {
  categories: FreeAgentCategory[];
  users: FreeAgentUser[];
  contacts: FreeAgentContact[];
  company: {
    name: string;
    currency: string;
    salesTaxRegistrationStatus: string;
  };
}

export interface OverviewResponse {
  sanitizedPnL: SanitizedOperationalPnL;
  cashflow: {
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
  };
  variances: {
    current: {
      incomeGbp: number;
      expensesGbp: number;
      operatingProfitGbp: number;
      operatingMarginPercent: number;
    };
    deltas: {
      incomeDeltaGbp: number;
      expensesDeltaGbp: number;
      operatingProfitDeltaGbp: number;
      incomeChangePercent: number | null;
      expensesChangePercent: number | null;
      operatingProfitChangePercent: number | null;
    } | null;
  };
  summary?: FinancialSummaryResponse;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody?.error) {
        errorMessage = errBody.error;
      }
    } catch {
      // Fallback to status text if non-JSON error
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function fetchSettings(): Promise<PublicSettings> {
  return requestJson<PublicSettings>("/api/settings");
}

export async function updateSettings(
  payload: Partial<{
    operatingMode: OperatingMode;
    vatMode: VatMode;
    geminiApiKey: string;
    freeagentClientId: string;
    freeagentClientSecret: string;
    defaultUserUri: string | null;
    companyName: string;
  }>
): Promise<PublicSettings> {
  return requestJson<PublicSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchReferenceData(): Promise<ReferenceData> {
  return requestJson<ReferenceData>("/api/settings/reference-data");
}

export async function getFreeAgentAuthorizeUrl(): Promise<{
  authorizationUrl: string;
  state: string;
}> {
  return requestJson<{ authorizationUrl: string; state: string }>(
    "/api/auth/freeagent/authorize?redirect=false"
  );
}

export async function disconnectFreeAgent(): Promise<{ disconnected: boolean }> {
  return requestJson<{ disconnected: boolean }>("/api/auth/freeagent/disconnect", {
    method: "POST"
  });
}

export async function fetchOverview(
  from?: string,
  to?: string
): Promise<OverviewResponse> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return requestJson<OverviewResponse>(
    `/api/summaries/overview${qs ? `?${qs}` : ""}`
  );
}

export async function generateSummary(
  from?: string,
  to?: string
): Promise<OverviewResponse & { summary: FinancialSummaryResponse }> {
  return requestJson<OverviewResponse & { summary: FinancialSummaryResponse }>(
    "/api/summaries/generate",
    {
      method: "POST",
      body: JSON.stringify({ from, to })
    }
  );
}

export async function fetchDrafts(): Promise<{ drafts: StagedDraft[] }> {
  return requestJson<{ drafts: StagedDraft[] }>("/api/receipts/drafts");
}

export async function uploadReceipt(
  file: File,
  targetType?: ReceiptTargetType
): Promise<{ draft: StagedDraft }> {
  const formData = new FormData();
  formData.append("file", file);
  if (targetType) {
    formData.append("targetType", targetType);
  }

  return requestJson<{ draft: StagedDraft }>("/api/receipts/upload", {
    method: "POST",
    body: formData
  });
}

export async function updateDraft(
  id: string,
  payload: {
    targetType?: ReceiptTargetType;
    targetContactOrUserUri?: string | null;
    extracted?: Partial<ExtractedReceipt>;
  }
): Promise<{ draft: StagedDraft }> {
  return requestJson<{ draft: StagedDraft }>(
    `/api/receipts/drafts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function approveDraft(
  id: string
): Promise<{ draft: StagedDraft; resourceUri: string }> {
  return requestJson<{ draft: StagedDraft; resourceUri: string }>(
    `/api/receipts/drafts/${encodeURIComponent(id)}/approve`,
    {
      method: "POST"
    }
  );
}

export async function deleteDraft(id: string): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(
    `/api/receipts/drafts/${encodeURIComponent(id)}`,
    {
      method: "DELETE"
    }
  );
}

export function getDraftFileUrl(id: string): string {
  return `/api/receipts/drafts/${encodeURIComponent(id)}/file`;
}

export async function fetchTransactions(
  bankAccountUri?: string
): Promise<{
  transactions: BankTransaction[];
  categories: FreeAgentCategory[];
  bankAccounts: Array<{
    url: string;
    name: string;
    currency: string;
    currentBalance: number;
  }>;
}> {
  const params = new URLSearchParams();
  if (bankAccountUri) {
    params.set("bankAccountUri", bankAccountUri);
  }
  const qs = params.toString();
  return requestJson(
    `/api/transactions/unexplained${qs ? `?${qs}` : ""}`
  );
}

export async function categorizeTransactions(
  transactionIds?: string[]
): Promise<{ suggestions: TransactionCategorySuggestion[] }> {
  return requestJson<{ suggestions: TransactionCategorySuggestion[] }>(
    "/api/transactions/categorize",
    {
      method: "POST",
      body: JSON.stringify({ transactionIds })
    }
  );
}

export function approveTransaction(payload: {
  transactionId: string;
  bankTransactionUri?: string;
  datedOn?: string;
  grossValue?: number;
  nominalCode: string;
  description: string;
  salesTaxRate?: number | null;
}): Promise<{ explanationUri: string; payloadSent: Record<string, unknown> }> {
  return requestJson<{
    explanationUri: string;
    payloadSent: Record<string, unknown>;
  }>("/api/transactions/approve", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export interface ServerControlStatus {
  running: boolean;
  port: number;
  host: string;
  pid: number | null;
  logs: string[];
}

export async function fetchServerControlStatus(): Promise<ServerControlStatus> {
  try {
    const res = await fetch("/__server-control/status");
    if (res.ok) {
      return (await res.json()) as ServerControlStatus;
    }
  } catch {
    // Fallback to direct health check if running outside Vite dev server
  }

  try {
    const healthRes = await fetch("/api/health");
    return {
      running: healthRes.ok,
      port: 3001,
      host: "127.0.0.1",
      pid: null,
      logs: []
    };
  } catch {
    return {
      running: false,
      port: 3001,
      host: "127.0.0.1",
      pid: null,
      logs: []
    };
  }
}

export async function startBackendServer(): Promise<ServerControlStatus> {
  const res = await fetch("/__server-control/start", { method: "POST" });
  if (!res.ok) {
    throw new Error("Could not start server via control bridge");
  }
  return (await res.json()) as ServerControlStatus;
}

export async function stopBackendServer(): Promise<ServerControlStatus> {
  const res = await fetch("/__server-control/stop", { method: "POST" });
  if (!res.ok) {
    throw new Error("Could not stop server via control bridge");
  }
  return (await res.json()) as ServerControlStatus;
}

export async function restartBackendServer(): Promise<ServerControlStatus> {
  const res = await fetch("/__server-control/restart", { method: "POST" });
  if (!res.ok) {
    throw new Error("Could not restart server via control bridge");
  }
  return (await res.json()) as ServerControlStatus;
}
