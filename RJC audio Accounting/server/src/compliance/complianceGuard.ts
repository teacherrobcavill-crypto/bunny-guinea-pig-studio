/**
 * HMRC Compliance Firewall & Deterministic Financial Math Guardrails
 * Ensures zero access to statutory tax filing / payroll endpoints and strips
 * statutory tax liability estimates prior to LLM ingestion.
 */

export const FORBIDDEN_FREEAGENT_PATHS = [
  "/v2/corporation_tax_returns",
  "/v2/vat_returns",
  "/v2/self_assessment_returns",
  "/v2/payroll",
  "/v2/payroll_profiles",
  "/v2/final_accounts_reports",
] as const;

export class ComplianceBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceBoundaryError";
    Object.setPrototypeOf(this, ComplianceBoundaryError.prototype);
  }
}

/**
 * Asserts that a target FreeAgent URL or path does not access any prohibited
 * HMRC statutory tax filing or payroll endpoints.
 */
export function assertAllowedFreeAgentPath(urlPath: string): void {
  let decodedPath = urlPath.trim();
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    // Keep trimmed path if malformed percent-encoding is present
  }
  const normalized = decodedPath.toLowerCase();

  for (const forbidden of FORBIDDEN_FREEAGENT_PATHS) {
    if (normalized.includes(forbidden)) {
      throw new ComplianceBoundaryError(
        `ComplianceBoundaryError: Access to '${urlPath}' is prohibited. Statutory tax filings and payroll must be handled natively in FreeAgent.`
      );
    }
  }
}

function stripTaxFieldsFromObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const {
    less: _strippedTax,
    corporation_tax: _strippedCorpTax,
    tax_liability: _strippedLiability,
    ...rest
  } = obj;

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.startsWith("corporation_tax") ||
      lowerKey.includes("tax_liability")
    ) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

/**
 * Strips the `less` array (Corporation Tax & dividend deductions) and any
 * `corporation_tax*` or tax-liability keys from FreeAgent P&L summary payloads
 * before passing data to Gemini. Supports both unwrapped and root-wrapped
 * (`{ profit_and_loss_summary: { ... } }`) responses.
 */
export function sanitizePnLForGemini(
  rawSummary: Record<string, unknown>
): Record<string, unknown> {
  const operationalMetrics = stripTaxFieldsFromObject(rawSummary);

  if (
    operationalMetrics.profit_and_loss_summary &&
    typeof operationalMetrics.profit_and_loss_summary === "object" &&
    !Array.isArray(operationalMetrics.profit_and_loss_summary)
  ) {
    operationalMetrics.profit_and_loss_summary = stripTaxFieldsFromObject(
      operationalMetrics.profit_and_loss_summary as Record<string, unknown>
    );
  }

  return operationalMetrics;
}

/**
 * Verifies receipt mathematical integrity in integer pence:
 * Net + VAT === Total (with a 1p rounding tolerance for multi-line VAT).
 */
export function verifyReceiptMathPence(
  netAmount: number | null,
  vatAmount: number | null,
  totalAmount: number
): { valid: boolean; discrepancyPence: number } {
  if (netAmount === null || vatAmount === null) {
    return { valid: true, discrepancyPence: 0 };
  }
  const diff = Math.abs(
    Math.round(netAmount * 100) +
      Math.round(vatAmount * 100) -
      Math.round(totalAmount * 100)
  );
  return { valid: diff <= 1, discrepancyPence: diff };
}

export interface PnLPeriodTotals {
  income: number;
  expenses: number;
  operatingProfit: number;
}

export interface DeterministicPnLVariances {
  incomeGbp: number;
  expensesGbp: number;
  operatingProfitGbp: number;
  incomeDeltaGbp: number | null;
  expensesDeltaGbp: number | null;
  operatingProfitDeltaGbp: number | null;
  incomeDeltaPercent: number | null;
  expensesDeltaPercent: number | null;
  operatingProfitDeltaPercent: number | null;
}

function computeDeltaGbp(current: number, previous: number): number {
  const diffPence = Math.round(current * 100) - Math.round(previous * 100);
  return diffPence / 100;
}

function computeDeltaPercent(current: number, previous: number): number | null {
  const prevPence = Math.round(previous * 100);
  if (prevPence === 0) {
    return null;
  }
  const diffPence = Math.round(current * 100) - prevPence;
  return Math.round((diffPence / Math.abs(prevPence)) * 1000) / 10;
}

/**
 * Pre-calculates deterministic GBP and percentage variances in integer pence
 * so the LLM never performs mental arithmetic on financial summaries.
 */
export function calculateDeterministicPnLVariances(
  currentPeriod: PnLPeriodTotals,
  previousPeriod?: PnLPeriodTotals
): DeterministicPnLVariances {
  const incomeGbp = Math.round(currentPeriod.income * 100) / 100;
  const expensesGbp = Math.round(currentPeriod.expenses * 100) / 100;
  const operatingProfitGbp =
    Math.round(currentPeriod.operatingProfit * 100) / 100;

  if (!previousPeriod) {
    return {
      incomeGbp,
      expensesGbp,
      operatingProfitGbp,
      incomeDeltaGbp: null,
      expensesDeltaGbp: null,
      operatingProfitDeltaGbp: null,
      incomeDeltaPercent: null,
      expensesDeltaPercent: null,
      operatingProfitDeltaPercent: null,
    };
  }

  return {
    incomeGbp,
    expensesGbp,
    operatingProfitGbp,
    incomeDeltaGbp: computeDeltaGbp(
      currentPeriod.income,
      previousPeriod.income
    ),
    expensesDeltaGbp: computeDeltaGbp(
      currentPeriod.expenses,
      previousPeriod.expenses
    ),
    operatingProfitDeltaGbp: computeDeltaGbp(
      currentPeriod.operatingProfit,
      previousPeriod.operatingProfit
    ),
    incomeDeltaPercent: computeDeltaPercent(
      currentPeriod.income,
      previousPeriod.income
    ),
    expensesDeltaPercent: computeDeltaPercent(
      currentPeriod.expenses,
      previousPeriod.expenses
    ),
    operatingProfitDeltaPercent: computeDeltaPercent(
      currentPeriod.operatingProfit,
      previousPeriod.operatingProfit
    ),
  };
}
