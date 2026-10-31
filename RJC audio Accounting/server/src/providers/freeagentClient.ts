import pLimit from "p-limit";
import {
  BankTransaction,
  FreeAgentCategory,
  FreeAgentContact,
  FreeAgentUser,
  OperatingMode,
  SanitizedOperationalPnL
} from "@rjc/shared";
import {
  assertAllowedFreeAgentPath,
  sanitizePnLForGemini
} from "../compliance/complianceGuard.js";
import { listStagedDrafts, loadVault, saveVault } from "../security/vault.js";
import {
  AccountingProvider,
  AttachmentInput,
  CashflowSummary,
  CreateBillInput,
  CreateExpenseInput,
  ExplainBankTransactionInput
} from "./accountingProvider.js";

export const FREEAGENT_USER_AGENT =
  "RJC-Audio-Accounting-Assistant/1.0 (RJC Audio Ltd; Node.js)";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

const mutationLimiter = pLimit(3);
let activeTokenRefreshPromise: Promise<string> | null = null;

export function normalizeFreeAgentAttachmentMime(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "application/pdf" || normalized === "application/x-pdf") {
    return "application/x-pdf";
  }
  if (
    normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/gif"
  ) {
    return normalized;
  }
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  throw new Error(
    `Unsupported FreeAgent attachment MIME type '${mimeType}'. Allowed: application/pdf, image/png, image/jpeg, image/gif.`
  );
}

export function buildFreeAgentAttachmentPayload(attachment: AttachmentInput): {
  data: string;
  file_name: string;
  content_type: string;
  description: string;
} {
  if (attachment.dataBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment '${attachment.fileName}' exceeds FreeAgent's 5MB limit (${attachment.dataBuffer.byteLength} bytes).`
    );
  }

  return {
    data: attachment.dataBuffer.toString("base64"),
    file_name: attachment.fileName,
    content_type: normalizeFreeAgentAttachmentMime(attachment.mimeType),
    description: attachment.description ?? attachment.fileName
  };
}

export function buildFreeAgentBillPayload(
  input: CreateBillInput,
  contactUri: string,
  categoryUri: string
): Record<string, unknown> {
  const billItem: Record<string, unknown> = {
    category: categoryUri,
    description: input.description,
    total_value: input.totalValue.toFixed(2)
  };

  if (input.vatMode === "uk_vat_registered") {
    const rate = input.salesTaxRate ?? 20;
    billItem.sales_tax_rate = rate.toFixed(2);
    if (input.vatValue !== undefined && input.vatValue !== null) {
      billItem.manual_sales_tax_amount = input.vatValue.toFixed(2);
    }
  } else {
    billItem.sales_tax_status = "OUTSIDE_SCOPE";
  }

  const bill: Record<string, unknown> = {
    contact: contactUri,
    reference: input.reference || "INV-UNSPECIFIED",
    dated_on: input.datedOn,
    due_on: input.dueOn || input.datedOn,
    currency: input.currency || "GBP",
    bill_items: [billItem]
  };

  if (input.attachment) {
    bill.attachment = buildFreeAgentAttachmentPayload(input.attachment);
  }

  return { bill };
}

export function buildFreeAgentExpensePayload(
  input: CreateExpenseInput,
  userUri: string,
  categoryUri: string
): Record<string, unknown> {
  const absGross = Math.abs(input.grossValue);
  const expense: Record<string, unknown> = {
    user: userUri,
    category: categoryUri,
    dated_on: input.datedOn,
    currency: input.currency || "GBP",
    gross_value: `-${absGross.toFixed(2)}`,
    description: input.description
  };

  if (input.vatMode === "uk_vat_registered") {
    const rate = input.salesTaxRate ?? 20;
    expense.sales_tax_rate = rate.toFixed(2);
    if (
      input.manualSalesTaxAmount !== undefined &&
      input.manualSalesTaxAmount !== null
    ) {
      expense.manual_sales_tax_amount = Math.abs(
        input.manualSalesTaxAmount
      ).toFixed(2);
    }
  } else {
    expense.sales_tax_status = "OUTSIDE_SCOPE";
  }

  if (input.attachment) {
    expense.attachment = buildFreeAgentAttachmentPayload(input.attachment);
  }

  return { expense };
}

export function buildFreeAgentExplanationPayload(
  input: ExplainBankTransactionInput,
  categoryUri: string
): Record<string, unknown> {
  const explanation: Record<string, unknown> = {
    bank_transaction: input.bankTransactionUri,
    dated_on: input.datedOn,
    gross_value: input.grossValue.toFixed(2),
    category: categoryUri,
    description: input.description
  };

  if (input.salesTaxRate !== undefined && input.salesTaxRate !== null) {
    explanation.sales_tax_rate = input.salesTaxRate.toFixed(2);
  }

  return { bank_transaction_explanation: explanation };
}

export class FreeAgentClient implements AccountingProvider {
  public readonly mode: OperatingMode;
  public readonly baseUrl: string;
  private readonly dataDir?: string;

  constructor(mode: OperatingMode = "sandbox", dataDir?: string) {
    this.mode = mode === "production" ? "production" : "sandbox";
    this.baseUrl =
      this.mode === "production"
        ? "https://api.freeagent.com"
        : "https://api.sandbox.freeagent.com";
    this.dataDir = dataDir;
  }

  public buildCategoryUri(nominalCode: string): string {
    const padded = nominalCode.trim().padStart(3, "0");
    return `${this.baseUrl}/v2/categories/${padded}`;
  }

  public async getAuthorizationUrl(
    redirectUri: string,
    state: string
  ): Promise<string> {
    const vault = await loadVault(this.dataDir);
    if (!vault.freeagentClientId) {
      throw new Error("FreeAgent Client ID is not configured in the vault.");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: vault.freeagentClientId,
      redirect_uri: redirectUri,
      state
    });

    return `${this.baseUrl}/v2/approve_app?${params.toString()}`;
  }

  public async exchangeAuthorizationCode(
    code: string,
    redirectUri: string
  ): Promise<void> {
    const vault = await loadVault(this.dataDir);
    if (!vault.freeagentClientId || !vault.freeagentClientSecret) {
      throw new Error(
        "FreeAgent Client ID and Secret must be configured before token exchange."
      );
    }

    const basicAuth = Buffer.from(
      `${vault.freeagentClientId}:${vault.freeagentClientSecret}`,
      "utf-8"
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });

    const response = await fetch(`${this.baseUrl}/v2/token_endpoint`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": FREEAGENT_USER_AGENT
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `FreeAgent OAuth token exchange failed (${response.status}): ${errText}`
      );
    }

    const tokenData = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresInMs = (tokenData.expires_in ?? 3600) * 1000;
    await saveVault(
      {
        freeagentAccessToken: tokenData.access_token,
        freeagentRefreshToken:
          tokenData.refresh_token ?? vault.freeagentRefreshToken,
        freeagentTokenExpiresAt: Date.now() + expiresInMs
      },
      this.dataDir
    );
  }

  public async ensureValidAccessToken(): Promise<string> {
    const vault = await loadVault(this.dataDir);
    const now = Date.now();
    const refreshBufferMs = 60 * 1000;

    if (
      vault.freeagentAccessToken &&
      vault.freeagentTokenExpiresAt &&
      vault.freeagentTokenExpiresAt - refreshBufferMs > now
    ) {
      return vault.freeagentAccessToken;
    }

    if (!vault.freeagentRefreshToken) {
      if (vault.freeagentAccessToken) {
        return vault.freeagentAccessToken;
      }
      throw new Error(
        "No valid FreeAgent access token or refresh token available."
      );
    }

    if (activeTokenRefreshPromise) {
      return activeTokenRefreshPromise;
    }

    activeTokenRefreshPromise = (async () => {
      try {
        const freshVault = await loadVault(this.dataDir);
        if (
          !freshVault.freeagentClientId ||
          !freshVault.freeagentClientSecret ||
          !freshVault.freeagentRefreshToken
        ) {
          throw new Error(
            "Missing FreeAgent OAuth client credentials or refresh token in vault."
          );
        }

        const basicAuth = Buffer.from(
          `${freshVault.freeagentClientId}:${freshVault.freeagentClientSecret}`,
          "utf-8"
        ).toString("base64");

        const body = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: freshVault.freeagentRefreshToken
        });

        const response = await fetch(`${this.baseUrl}/v2/token_endpoint`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": FREEAGENT_USER_AGENT
          },
          body: body.toString()
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `FreeAgent token refresh failed (${response.status}): ${errText}`
          );
        }

        const tokenData = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };

        const expiresInMs = (tokenData.expires_in ?? 3600) * 1000;
        await saveVault(
          {
            freeagentAccessToken: tokenData.access_token,
            freeagentRefreshToken:
              tokenData.refresh_token ?? freshVault.freeagentRefreshToken,
            freeagentTokenExpiresAt: Date.now() + expiresInMs
          },
          this.dataDir
        );

        return tokenData.access_token;
      } finally {
        activeTokenRefreshPromise = null;
      }
    })();

    return activeTokenRefreshPromise;
  }

  public async request<T = Record<string, unknown>>(
    pathOrUrl: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 1. Always enforce HMRC Compliance Firewall before any network call or token check!
    assertAllowedFreeAgentPath(pathOrUrl);

    const accessToken = await this.ensureValidAccessToken();
    const targetUrl = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${this.baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

    assertAllowedFreeAgentPath(targetUrl);

    const response = await fetch(targetUrl, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": FREEAGENT_USER_AGENT,
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `FreeAgent API error (${response.status} ${response.statusText}) on ${pathOrUrl}: ${errorText}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  public async getCompanyInfo(): Promise<{
    name: string;
    currency: string;
    salesTaxRegistrationStatus: string;
  }> {
    const data = await this.request<{
      company?: {
        name?: string;
        currency?: string;
        sales_tax_registration_status?: string;
      };
    }>("/v2/company");

    return {
      name: data.company?.name ?? "RJC Audio Ltd",
      currency: data.company?.currency ?? "GBP",
      salesTaxRegistrationStatus:
        data.company?.sales_tax_registration_status ?? "Registered"
    };
  }

  public async getCategories(): Promise<FreeAgentCategory[]> {
    const data = await this.request<{
      admin_expenses_categories?: Array<Record<string, unknown>>;
      cost_of_sales_categories?: Array<Record<string, unknown>>;
      income_categories?: Array<Record<string, unknown>>;
      general_categories?: Array<Record<string, unknown>>;
    }>("/v2/categories");

    const mapGroup = (
      items: Array<Record<string, unknown>> | undefined,
      groupName: string
    ): FreeAgentCategory[] =>
      (items ?? []).map((item) => ({
        nominalCode: String(item.nominal_code ?? ""),
        description: String(item.description ?? ""),
        group: groupName,
        allowableForTax:
          typeof item.allowable_for_tax === "boolean"
            ? item.allowable_for_tax
            : undefined
      }));

    return [
      ...mapGroup(data.income_categories, "Income"),
      ...mapGroup(data.cost_of_sales_categories, "Cost of Sales"),
      ...mapGroup(data.admin_expenses_categories, "Admin Expenses"),
      ...mapGroup(data.general_categories, "General")
    ];
  }

  public async getUsers(): Promise<FreeAgentUser[]> {
    const data = await this.request<{
      users?: Array<Record<string, unknown>>;
    }>("/v2/users");

    return (data.users ?? []).map((u) => ({
      url: String(u.url ?? ""),
      firstName: String(u.first_name ?? ""),
      lastName: String(u.last_name ?? ""),
      email: String(u.email ?? ""),
      role: String(u.role ?? "Director")
    }));
  }

  public async getContacts(): Promise<FreeAgentContact[]> {
    const data = await this.request<{
      contacts?: Array<Record<string, unknown>>;
    }>("/v2/contacts");

    return (data.contacts ?? []).map((c) => ({
      url: String(c.url ?? ""),
      organisationName: c.organisation_name ? String(c.organisation_name) : null,
      firstName: c.first_name ? String(c.first_name) : null,
      lastName: c.last_name ? String(c.last_name) : null,
      email: c.email ? String(c.email) : null
    }));
  }

  public async findOrCreateContact(
    vendorName: string
  ): Promise<FreeAgentContact> {
    const contacts = await this.getContacts();
    const normalizedTarget = vendorName.trim().toLowerCase();

    const existing = contacts.find((c) => {
      const org = (c.organisationName ?? "").toLowerCase();
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`
        .trim()
        .toLowerCase();
      return (
        (org && (org.includes(normalizedTarget) || normalizedTarget.includes(org))) ||
        (fullName && fullName === normalizedTarget)
      );
    });

    if (existing) {
      return existing;
    }

    return mutationLimiter(async () => {
      const created = await this.request<{
        contact?: Record<string, unknown>;
      }>("/v2/contacts", {
        method: "POST",
        body: JSON.stringify({
          contact: {
            organisation_name: vendorName.trim()
          }
        })
      });

      const c = created.contact ?? {};
      return {
        url: String(c.url ?? `${this.baseUrl}/v2/contacts/new`),
        organisationName: String(c.organisation_name ?? vendorName.trim()),
        firstName: c.first_name ? String(c.first_name) : null,
        lastName: c.last_name ? String(c.last_name) : null,
        email: c.email ? String(c.email) : null
      };
    });
  }

  public async createBill(
    input: CreateBillInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }> {
    const contactUri =
      input.contactUri ?? (await this.findOrCreateContact(input.vendorName)).url;
    const categoryUri = this.buildCategoryUri(input.nominalCode);
    const payload = buildFreeAgentBillPayload(input, contactUri, categoryUri);

    return mutationLimiter(async () => {
      const res = await this.request<{ bill?: { url?: string } }>("/v2/bills", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      return {
        resourceUri: res.bill?.url ?? `${this.baseUrl}/v2/bills/created`,
        payloadSent: payload
      };
    });
  }

  public async createExpense(
    input: CreateExpenseInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }> {
    let userUri = input.userUri;
    if (!userUri) {
      const vault = await loadVault(this.dataDir);
      if (vault.defaultUserUri) {
        userUri = vault.defaultUserUri;
      } else {
        const users = await this.getUsers();
        if (!users.length) {
          throw new Error("No FreeAgent users found to assign expense.");
        }
        userUri = users[0].url;
      }
    }

    const categoryUri = this.buildCategoryUri(input.nominalCode);
    const payload = buildFreeAgentExpensePayload(input, userUri, categoryUri);

    return mutationLimiter(async () => {
      const res = await this.request<{ expense?: { url?: string } }>(
        "/v2/expenses",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      return {
        resourceUri: res.expense?.url ?? `${this.baseUrl}/v2/expenses/created`,
        payloadSent: payload
      };
    });
  }

  public async getBankAccounts(): Promise<
    Array<{ url: string; name: string; currency: string; currentBalance: number }>
  > {
    const data = await this.request<{
      bank_accounts?: Array<Record<string, unknown>>;
    }>("/v2/bank_accounts");

    return (data.bank_accounts ?? []).map((acct) => ({
      url: String(acct.url ?? ""),
      name: String(acct.name ?? "Business Current Account"),
      currency: String(acct.currency ?? "GBP"),
      currentBalance: Number(acct.current_balance ?? 0)
    }));
  }

  public async getUnexplainedTransactions(
    bankAccountUri?: string
  ): Promise<BankTransaction[]> {
    let targetAccount = bankAccountUri;
    if (!targetAccount) {
      const accounts = await this.getBankAccounts();
      if (!accounts.length) {
        return [];
      }
      targetAccount = accounts[0].url;
    }

    const params = new URLSearchParams({
      bank_account: targetAccount,
      view: "unexplained"
    });

    const data = await this.request<{
      bank_transactions?: Array<Record<string, unknown>>;
    }>(`/v2/bank_transactions?${params.toString()}`);

    return (data.bank_transactions ?? []).map((tx) => {
      const url = String(tx.url ?? "");
      const id = url.split("/").pop() || String(tx.transaction_id ?? "");
      const amount = Number(tx.amount ?? 0);
      const unexplainedAmount = Number(tx.unexplained_amount ?? amount);

      return {
        id,
        url,
        datedOn: String(tx.dated_on ?? ""),
        description: String(tx.description ?? tx.full_description ?? ""),
        amount,
        unexplainedAmount,
        isUnexplained: Math.abs(unexplainedAmount) > 0.001
      };
    });
  }

  public async explainBankTransaction(
    input: ExplainBankTransactionInput
  ): Promise<{ explanationUri: string; payloadSent: Record<string, unknown> }> {
    const categoryUri = this.buildCategoryUri(input.nominalCode);
    const payload = buildFreeAgentExplanationPayload(input, categoryUri);

    return mutationLimiter(async () => {
      const res = await this.request<{
        bank_transaction_explanation?: { url?: string };
      }>("/v2/bank_transaction_explanations", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      return {
        explanationUri:
          res.bank_transaction_explanation?.url ??
          `${this.baseUrl}/v2/bank_transaction_explanations/created`,
        payloadSent: payload
      };
    });
  }

  public async getRawProfitAndLossSummary(
    fromDate?: string,
    toDate?: string
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (fromDate) query.set("from_date", fromDate);
    if (toDate) query.set("to_date", toDate);
    const qs = query.toString();
    const path = `/v2/accounting/profit_and_loss/summary${qs ? `?${qs}` : ""}`;

    return this.request<Record<string, unknown>>(path);
  }

  public async getSanitizedProfitAndLoss(
    fromDate?: string,
    toDate?: string
  ): Promise<SanitizedOperationalPnL> {
    const raw = await this.getRawProfitAndLossSummary(fromDate, toDate);
    const sanitized = sanitizePnLForGemini(raw);
    const summaryObj =
      (sanitized.profit_and_loss_summary as Record<string, unknown>) ??
      sanitized;

    const turnover = Number(summaryObj.income ?? summaryObj.turnover ?? 0);
    const costOfSales = Number(summaryObj.cost_of_sales ?? 0);
    const adminExpenses = Number(
      summaryObj.expenses ?? summaryObj.administrative_expenses ?? 0
    );
    const grossProfit =
      summaryObj.gross_profit !== undefined
        ? Number(summaryObj.gross_profit)
        : Math.round((turnover - costOfSales) * 100) / 100;
    const operatingProfit =
      summaryObj.operating_profit !== undefined
        ? Number(summaryObj.operating_profit)
        : Math.round((grossProfit - adminExpenses) * 100) / 100;

    const unexplained = await this.getUnexplainedTransactions();
    const drafts = await listStagedDrafts(this.dataDir);

    return {
      periodStart: String(summaryObj.from ?? fromDate ?? "2025-04-01"),
      periodEnd: String(summaryObj.to ?? toDate ?? "2026-03-31"),
      currency: "GBP",
      turnover,
      costOfSales,
      grossProfit,
      administrativeExpenses: adminExpenses,
      operatingProfit,
      expenseBreakdownByCategory: Array.isArray(
        summaryObj.expense_breakdown_by_category
      )
        ? (summaryObj.expense_breakdown_by_category as Array<{
            nominalCode: string;
            category: string;
            amount: number;
          }>)
        : [],
      unexplainedBankTransactionCount: unexplained.filter(
        (t) => t.isUnexplained
      ).length,
      stagedDraftCount: drafts.filter((d) => d.status === "draft_review").length
    };
  }

  public async getCashflowSummary(): Promise<CashflowSummary> {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const toDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const to = toDate.toISOString().slice(0, 10);

    const data = await this.request<{
      cashflow?: {
        from?: string;
        to?: string;
        balance?: number | string;
        incoming?: { total?: number | string };
        outgoing?: { total?: number | string };
        months?: Array<{
          month?: string;
          inflow?: number | string;
          outflow?: number | string;
          net_cashflow?: number | string;
        }>;
      };
    }>(`/v2/cashflow?from_date=${from}&to_date=${to}`);

    const cf = data.cashflow ?? {};
    const incoming90 = Number(cf.incoming?.total ?? 0);
    const outgoing90 = Number(cf.outgoing?.total ?? 0);
    const balanceToday = Number(cf.balance ?? 0);
    const projectedBalance90Days =
      Math.round((balanceToday + incoming90 - outgoing90) * 100) / 100;

    return {
      from: String(cf.from ?? from),
      to: String(cf.to ?? to),
      balanceToday,
      projectedBalance90Days,
      incoming90Days: incoming90,
      outgoing90Days: outgoing90,
      monthlyTrend: (cf.months ?? []).map((m) => ({
        month: String(m.month ?? ""),
        inflow: Number(m.inflow ?? 0),
        outflow: Number(m.outflow ?? 0),
        netCashflow: Number(m.net_cashflow ?? 0)
      }))
    };
  }
}
