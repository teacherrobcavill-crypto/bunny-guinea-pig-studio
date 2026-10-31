import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_FREEAGENT_PATHS,
  ComplianceBoundaryError,
  assertAllowedFreeAgentPath,
  sanitizePnLForGemini,
  verifyReceiptMathPence,
  calculateDeterministicPnLVariances,
} from "../src/compliance/complianceGuard.js";

describe("HMRC Compliance Firewall & Guardrails (complianceGuard)", () => {
  describe("assertAllowedFreeAgentPath", () => {
    it("blocks all forbidden statutory tax and payroll endpoints", () => {
      for (const path of FORBIDDEN_FREEAGENT_PATHS) {
        expect(() => assertAllowedFreeAgentPath(path)).toThrow(
          ComplianceBoundaryError
        );
        expect(() =>
          assertAllowedFreeAgentPath(`https://api.freeagent.com${path}`)
        ).toThrow(ComplianceBoundaryError);
      }
    });

    it("blocks forbidden endpoints with query strings, sub-resources, uppercase variants, and URL encoding", () => {
      expect(() =>
        assertAllowedFreeAgentPath("/v2/vat_returns?from_date=2026-01-01")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/V2/CORPORATION_TAX_RETURNS/2026")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/v2/self_assessment_returns/123")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/v2/payroll/2026/04")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/v2/payroll_profiles?user=1")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/v2/final_accounts_reports/2026")
      ).toThrow(ComplianceBoundaryError);
      expect(() =>
        assertAllowedFreeAgentPath("/v2/%76%61%74_returns")
      ).toThrow(ComplianceBoundaryError);
    });

    it("allows operational bookkeeping and management accounting endpoints", () => {
      const allowedPaths = [
        "/v2/bills",
        "/v2/expenses",
        "/v2/bank_transactions",
        "/v2/bank_transaction_explanations",
        "/v2/accounting/profit_and_loss/summary",
        "/v2/cashflow",
        "/v2/categories",
        "/v2/contacts",
        "/v2/company",
      ];

      for (const path of allowedPaths) {
        expect(() => assertAllowedFreeAgentPath(path)).not.toThrow();
      }
    });
  });

  describe("sanitizePnLForGemini", () => {
    it("strips 'less' (Corporation Tax & dividends) and tax liability fields from flat P&L payloads", () => {
      const rawFlat = {
        income: 48500,
        expenses: 14200,
        operating_profit: 34300,
        less: [
          { title: "Corporation Tax", total: 6517 },
          { title: "Dividends", total: 10000 },
        ],
        corporation_tax_estimate: 6517,
        tax_liability: 6517,
      };

      const sanitized = sanitizePnLForGemini(rawFlat);

      expect(sanitized).toEqual({
        income: 48500,
        expenses: 14200,
        operating_profit: 34300,
      });
      expect(sanitized).not.toHaveProperty("less");
      expect(sanitized).not.toHaveProperty("corporation_tax_estimate");
      expect(sanitized).not.toHaveProperty("tax_liability");
    });

    it("strips 'less' inside nested { profit_and_loss_summary: { ... } } payloads while preserving operational metrics", () => {
      const rawWrapped = {
        profit_and_loss_summary: {
          from: "2025-04-01",
          to: "2026-03-31",
          income: 62000,
          expenses: 18500,
          operating_profit: 43500,
          less: [{ title: "Corporation Tax", total: 8265 }],
          retained_profit: 35235,
        },
      };

      const sanitized = sanitizePnLForGemini(rawWrapped);
      const inner = sanitized.profit_and_loss_summary as Record<
        string,
        unknown
      >;

      expect(inner.income).toBe(62000);
      expect(inner.expenses).toBe(18500);
      expect(inner.operating_profit).toBe(43500);
      expect(inner).not.toHaveProperty("less");
    });
  });

  describe("verifyReceiptMathPence", () => {
    it("accepts exact matches in pence (100 + 20 = 120)", () => {
      const result = verifyReceiptMathPence(100, 20, 120);
      expect(result).toEqual({ valid: true, discrepancyPence: 0 });
    });

    it("accepts 1p rounding differences (e.g. £33.33 + £6.66 = £40.00)", () => {
      const exactResult = verifyReceiptMathPence(33.33, 6.67, 40.0);
      expect(exactResult).toEqual({ valid: true, discrepancyPence: 0 });

      const onePennyDiff = verifyReceiptMathPence(33.33, 6.66, 40.0);
      expect(onePennyDiff).toEqual({ valid: true, discrepancyPence: 1 });
    });

    it("accepts null netAmount or vatAmount", () => {
      expect(verifyReceiptMathPence(null, null, 45.99)).toEqual({
        valid: true,
        discrepancyPence: 0,
      });
      expect(verifyReceiptMathPence(45.99, null, 45.99)).toEqual({
        valid: true,
        discrepancyPence: 0,
      });
    });

    it("rejects discrepancies >= 2p", () => {
      const twoPenceDiff = verifyReceiptMathPence(10.0, 2.0, 12.02);
      expect(twoPenceDiff).toEqual({ valid: false, discrepancyPence: 2 });

      const majorDiff = verifyReceiptMathPence(100.0, 20.0, 150.0);
      expect(majorDiff).toEqual({ valid: false, discrepancyPence: 3000 });
    });
  });

  describe("calculateDeterministicPnLVariances", () => {
    it("computes exact GBP and percentage deltas using integer pence math", () => {
      const result = calculateDeterministicPnLVariances(
        { income: 12500.5, expenses: 4200.25, operatingProfit: 8300.25 },
        { income: 10000.0, expenses: 4000.0, operatingProfit: 6000.0 }
      );

      expect(result.incomeDeltaGbp).toBe(2500.5);
      expect(result.expensesDeltaGbp).toBe(200.25);
      expect(result.operatingProfitDeltaGbp).toBe(2300.25);
      expect(result.incomeDeltaPercent).toBe(25.0);
      expect(result.expensesDeltaPercent).toBe(5.0);
      expect(result.operatingProfitDeltaPercent).toBe(38.3);
    });
  });
});
