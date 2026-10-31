import {
  BankTransaction,
  FreeAgentCategory,
  FreeAgentContact,
  FreeAgentUser,
  OperatingMode,
  SanitizedOperationalPnL
} from "@rjc/shared";
import { sanitizePnLForGemini } from "../compliance/complianceGuard.js";
import { listStagedDrafts } from "../security/vault.js";
import {
  AccountingProvider,
  CashflowSummary,
  CreateBillInput,
  CreateExpenseInput,
  ExplainBankTransactionInput
} from "./accountingProvider.js";
import {
  buildFreeAgentBillPayload,
  buildFreeAgentExpensePayload,
  buildFreeAgentExplanationPayload
} from "./freeagentClient.js";

const MOCK_BASE_URL = "https://api.sandbox.freeagent.com";

export class MockFreeAgentProvider implements AccountingProvider {
  public readonly mode: OperatingMode = "mock";
  private readonly dataDir?: string;

  private categories: FreeAgentCategory[] = [
    {
      nominalCode: "001",
      description: "Sales (Sonics Audio Licensing & Sample Packs)",
      group: "Income",
      allowableForTax: true
    },
    {
      nominalCode: "250",
      description: "Advertising & Marketing",
      group: "Admin Expenses",
      allowableForTax: true
    },
    {
      nominalCode: "285",
      description: "Accommodation & Travel",
      group: "Admin Expenses",
      allowableForTax: true
    },
    {
      nominalCode: "363",
      description: "Computer Software & Plugins",
      group: "Admin Expenses",
      allowableForTax: true
    },
    {
      nominalCode: "364",
      description: "Web Hosting & Cloud Services",
      group: "Admin Expenses",
      allowableForTax: true
    },
    {
      nominalCode: "390",
      description: "Bank & Merchant Charges",
      group: "Admin Expenses",
      allowableForTax: true
    },
    {
      nominalCode: "450",
      description: "Audio Hardware & Studio Equipment",
      group: "Admin Expenses",
      allowableForTax: true
    }
  ];

  private users: FreeAgentUser[] = [
    {
      url: `${MOCK_BASE_URL}/v2/users/101`,
      firstName: "Rob",
      lastName: "Cavill",
      email: "rob@rjcaudio.co.uk",
      role: "Director"
    }
  ];

  private contacts: FreeAgentContact[] = [
    {
      url: `${MOCK_BASE_URL}/v2/contacts/201`,
      organisationName: "Cloudflare Inc",
      firstName: null,
      lastName: null,
      email: "billing@cloudflare.com"
    },
    {
      url: `${MOCK_BASE_URL}/v2/contacts/202`,
      organisationName: "Stripe UK",
      firstName: null,
      lastName: null,
      email: "support@stripe.com"
    },
    {
      url: `${MOCK_BASE_URL}/v2/contacts/203`,
      organisationName: "GitHub Inc",
      firstName: null,
      lastName: null,
      email: "billing@github.com"
    },
    {
      url: `${MOCK_BASE_URL}/v2/contacts/204`,
      organisationName: "Thomann GmbH",
      firstName: null,
      lastName: null,
      email: "uk@thomann.de"
    },
    {
      url: `${MOCK_BASE_URL}/v2/contacts/205`,
      organisationName: "Splice Inc",
      firstName: null,
      lastName: null,
      email: "royalties@splice.com"
    },
    {
      url: `${MOCK_BASE_URL}/v2/contacts/206`,
      organisationName: "Apple Distribution",
      firstName: null,
      lastName: null,
      email: "appstore@apple.com"
    }
  ];

  private transactions: BankTransaction[] = [
    {
      id: "tx-sonics-001",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-001`,
      datedOn: "2026-02-18",
      description: "CLOUDFLARE INC -CDN/WORKERS",
      amount: -144.0,
      unexplainedAmount: -144.0,
      isUnexplained: true
    },
    {
      id: "tx-sonics-002",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-002`,
      datedOn: "2026-02-19",
      description: "STRIPE UK MERCHANT FEES",
      amount: -48.5,
      unexplainedAmount: -48.5,
      isUnexplained: true
    },
    {
      id: "tx-sonics-003",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-003`,
      datedOn: "2026-02-21",
      description: "GITHUB INC COPILOT/ACTIONS",
      amount: -32.0,
      unexplainedAmount: -32.0,
      isUnexplained: true
    },
    {
      id: "tx-sonics-004",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-004`,
      datedOn: "2026-02-23",
      description: "THOMANN GMBH NEUMANN MIC",
      amount: -840.0,
      unexplainedAmount: -840.0,
      isUnexplained: true
    },
    {
      id: "tx-sonics-005",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-005`,
      datedOn: "2026-02-25",
      description: "PADDLE.COM SONICS PAYOUT",
      amount: 4250.0,
      unexplainedAmount: 4250.0,
      isUnexplained: true
    },
    {
      id: "tx-sonics-006",
      url: `${MOCK_BASE_URL}/v2/bank_transactions/tx-sonics-006`,
      datedOn: "2026-02-27",
      description: "META ADS SONICS LAUNCH",
      amount: -310.0,
      unexplainedAmount: -310.0,
      isUnexplained: true
    }
  ];

  private createdBillsCount = 0;
  private createdExpensesCount = 0;
  private createdExplanationsCount = 0;

  constructor(dataDir?: string) {
    this.dataDir = dataDir;
  }

  public async getCompanyInfo(): Promise<{
    name: string;
    currency: string;
    salesTaxRegistrationStatus: string;
  }> {
    return {
      name: "RJC Audio Ltd",
      currency: "GBP",
      salesTaxRegistrationStatus: "Registered"
    };
  }

  public async getCategories(): Promise<FreeAgentCategory[]> {
    return [...this.categories];
  }

  public async getUsers(): Promise<FreeAgentUser[]> {
    return [...this.users];
  }

  public async getContacts(): Promise<FreeAgentContact[]> {
    return [...this.contacts];
  }

  public async findOrCreateContact(
    vendorName: string
  ): Promise<FreeAgentContact> {
    const normalized = vendorName.trim().toLowerCase();
    const existing = this.contacts.find((c) => {
      const org = (c.organisationName ?? "").toLowerCase();
      return (
        org.includes(normalized) ||
        normalized.includes(org)
      );
    });

    if (existing) {
      return existing;
    }

    const nextId = 200 + this.contacts.length + 1;
    const created: FreeAgentContact = {
      url: `${MOCK_BASE_URL}/v2/contacts/${nextId}`,
      organisationName: vendorName.trim(),
      firstName: null,
      lastName: null,
      email: null
    };
    this.contacts.push(created);
    return created;
  }

  public async createBill(
    input: CreateBillInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }> {
    const contact = input.contactUri
      ? { url: input.contactUri }
      : await this.findOrCreateContact(input.vendorName);
    const categoryUri = `${MOCK_BASE_URL}/v2/categories/${input.nominalCode.padStart(3, "0")}`;
    const payload = buildFreeAgentBillPayload(input, contact.url, categoryUri);

    this.createdBillsCount += 1;
    const resourceUri = `${MOCK_BASE_URL}/v2/bills/${5000 + this.createdBillsCount}`;

    return {
      resourceUri,
      payloadSent: payload
    };
  }

  public async createExpense(
    input: CreateExpenseInput
  ): Promise<{ resourceUri: string; payloadSent: Record<string, unknown> }> {
    const userUri = input.userUri ?? this.users[0].url;
    const categoryUri = `${MOCK_BASE_URL}/v2/categories/${input.nominalCode.padStart(3, "0")}`;
    const payload = buildFreeAgentExpensePayload(input, userUri, categoryUri);

    this.createdExpensesCount += 1;
    const resourceUri = `${MOCK_BASE_URL}/v2/expenses/${6000 + this.createdExpensesCount}`;

    return {
      resourceUri,
      payloadSent: payload
    };
  }

  public async getBankAccounts(): Promise<
    Array<{ url: string; name: string; currency: string; currentBalance: number }>
  > {
    return [
      {
        url: `${MOCK_BASE_URL}/v2/bank_accounts/1`,
        name: "Starling Business GBP (RJC Audio Ltd)",
        currency: "GBP",
        currentBalance: 44820.5
      }
    ];
  }

  public async getUnexplainedTransactions(): Promise<BankTransaction[]> {
    return this.transactions.map((t) => ({ ...t }));
  }

  public async explainBankTransaction(
    input: ExplainBankTransactionInput
  ): Promise<{ explanationUri: string; payloadSent: Record<string, unknown> }> {
    const categoryUri = `${MOCK_BASE_URL}/v2/categories/${input.nominalCode.padStart(3, "0")}`;
    const payload = buildFreeAgentExplanationPayload(input, categoryUri);

    const txIndex = this.transactions.findIndex(
      (t) =>
        t.id === input.transactionId || t.url === input.bankTransactionUri
    );

    if (txIndex >= 0) {
      this.transactions[txIndex] = {
        ...this.transactions[txIndex],
        unexplainedAmount: 0,
        isUnexplained: false,
        explainedNominalCode: input.nominalCode,
        explainedDescription: input.description,
        explainedAt: new Date().toISOString()
      };
    }

    this.createdExplanationsCount += 1;
    const explanationUri = `${MOCK_BASE_URL}/v2/bank_transaction_explanations/${7000 + this.createdExplanationsCount}`;

    return {
      explanationUri,
      payloadSent: payload
    };
  }

  public async getRawProfitAndLossSummary(
    fromDate = "2025-04-01",
    toDate = "2026-03-31"
  ): Promise<Record<string, unknown>> {
    return {
      profit_and_loss_summary: {
        from: fromDate,
        to: toDate,
        income: 68400.0,
        cost_of_sales: 4200.0,
        gross_profit: 64200.0,
        expenses: 24200.0,
        operating_profit: 40000.0,
        expense_breakdown_by_category: [
          {
            nominalCode: "364",
            category: "Web Hosting & Cloud Services",
            amount: 5840.0
          },
          {
            nominalCode: "450",
            category: "Audio Hardware & Studio Equipment",
            amount: 7920.0
          },
          {
            nominalCode: "250",
            category: "Advertising & Marketing",
            amount: 4650.0
          },
          {
            nominalCode: "363",
            category: "Computer Software & Plugins",
            amount: 3410.0
          },
          {
            nominalCode: "285",
            category: "Accommodation & Travel",
            amount: 1420.0
          },
          {
            nominalCode: "390",
            category: "Bank & Merchant Charges",
            amount: 960.0
          }
        ],
        less: [
          {
            title: "Corporation Tax",
            total: "7600.00"
          },
          {
            title: "Dividends",
            total: "15000.00"
          }
        ],
        corporation_tax_estimate: 7600.0,
        retained_profit: 17400.0
      }
    };
  }

  public async getSanitizedProfitAndLoss(
    fromDate = "2025-04-01",
    toDate = "2026-03-31"
  ): Promise<SanitizedOperationalPnL> {
    const raw = await this.getRawProfitAndLossSummary(fromDate, toDate);
    const sanitized = sanitizePnLForGemini(raw);
    const inner = (sanitized.profit_and_loss_summary ??
      sanitized) as Record<string, unknown>;

    const drafts = await listStagedDrafts(this.dataDir);
    const unexplainedCount = this.transactions.filter(
      (t) => t.isUnexplained
    ).length;

    return {
      periodStart: String(inner.from ?? fromDate),
      periodEnd: String(inner.to ?? toDate),
      currency: "GBP",
      turnover: Number(inner.income ?? 68400),
      costOfSales: Number(inner.cost_of_sales ?? 4200),
      grossProfit: Number(inner.gross_profit ?? 64200),
      administrativeExpenses: Number(inner.expenses ?? 24200),
      operatingProfit: Number(inner.operating_profit ?? 40000),
      expenseBreakdownByCategory: Array.isArray(
        inner.expense_breakdown_by_category
      )
        ? (inner.expense_breakdown_by_category as Array<{
            nominalCode: string;
            category: string;
            amount: number;
          }>)
        : [],
      unexplainedBankTransactionCount: unexplainedCount,
      stagedDraftCount: drafts.filter((d) => d.status === "draft_review").length
    };
  }

  public async getCashflowSummary(): Promise<CashflowSummary> {
    return {
      from: "2026-03-01",
      to: "2026-05-30",
      balanceToday: 44820.5,
      projectedBalance90Days: 56470.5,
      incoming90Days: 21450.0,
      outgoing90Days: 9800.0,
      monthlyTrend: [
        {
          month: "2025-10",
          inflow: 6200.0,
          outflow: 2950.0,
          netCashflow: 3250.0
        },
        {
          month: "2025-11",
          inflow: 7100.0,
          outflow: 3400.0,
          netCashflow: 3700.0
        },
        {
          month: "2025-12",
          inflow: 8450.0,
          outflow: 3820.0,
          netCashflow: 4630.0
        },
        {
          month: "2026-01",
          inflow: 6890.0,
          outflow: 3110.0,
          netCashflow: 3780.0
        },
        {
          month: "2026-02",
          inflow: 7920.0,
          outflow: 3560.0,
          netCashflow: 4360.0
        },
        {
          month: "2026-03",
          inflow: 8300.0,
          outflow: 3190.0,
          netCashflow: 5110.0
        }
      ]
    };
  }
}
