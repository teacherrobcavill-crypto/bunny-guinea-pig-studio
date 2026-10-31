import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet
} from "lucide-react";
import type { FinancialSummaryResponse } from "@rjc/shared";
import {
  fetchOverview,
  generateSummary,
  type OverviewResponse,
  type PublicSettings
} from "../api/client";
import { PlainEnglishTip } from "./PlainEnglishGuide";

function formatGbp(amount: number): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : formatted;
}

export function FinancialSummaryWidget({
  settings,
  onNavigate
}: {
  settings: PublicSettings | null;
  onNavigate?: (
    tab: "summary" | "receipts" | "transactions" | "settings"
  ) => void;
}) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverview();
      setOverview(data);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load financial overview"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setSummaryError(null);
    try {
      const data = await generateSummary();
      setOverview(data);
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : "Failed to generate plain-English briefing"
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-400" />
        <p className="text-sm font-medium text-slate-200">
          Calculating exact sales, costs, and cashflow figures...
        </p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-6 text-rose-200">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              Unable to load money overview
            </h3>
            <p className="mt-1 text-xs text-rose-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-lg border border-rose-500/40 bg-rose-900/40 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-800/50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const { sanitizedPnL, cashflow } = overview;
  const totalExpenses =
    Math.round(
      (sanitizedPnL.costOfSales + sanitizedPnL.administrativeExpenses) * 100
    ) / 100;
  const operatingMarginPercent =
    sanitizedPnL.turnover > 0
      ? Math.round(
          (sanitizedPnL.operatingProfit / sanitizedPnL.turnover) * 1000
        ) / 10
      : 0;

  const maxCategoryExpense = Math.max(
    1,
    ...sanitizedPnL.expenseBreakdownByCategory.map((c) => c.amount)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% Exact Math (No AI Guesswork)
            </span>
            <span className="text-xs text-slate-400">
              Dates: {sanitizedPnL.periodStart} to {sanitizedPnL.periodEnd}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            {settings?.companyName ?? "RJC Audio Ltd"} — Company Money Snapshot
          </h2>
          <p className="text-xs text-slate-400">
            Here is a summary of sales, expenses, and left-over profit for this period.
          </p>
        </div>

        {/* Action Queue Callout Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.("transactions")}
            className="group flex items-center gap-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-medium text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            <Landmark className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Bank payments needing a label:{" "}
              <strong className="font-bold text-amber-100">
                {sanitizedPnL.unexplainedBankTransactionCount}
              </strong>
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("receipts")}
            className="group flex items-center gap-2.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-medium text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-500/20"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            <span>
              Uploaded receipts waiting for approval:{" "}
              <strong className="font-bold text-sky-100">
                {sanitizedPnL.stagedDraftCount}
              </strong>
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-sky-400 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => void loadOverview()}
            title="Refresh numbers from FreeAgent"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/80 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <PlainEnglishTip title="What these 4 boxes mean">
        <strong>Total Sales Billed</strong> is all money invoiced to customers.{" "}
        <strong>Total Money Spent</strong> is every business expense combined.{" "}
        <strong>Profit Left Over</strong> is what remains before tax.{" "}
        <strong>Bank Balance Today</strong> is actual cash in the account right now.
      </PlainEnglishTip>

      {/* 4 Main Plain-English KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Sales Billed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total Sales Billed</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-100">
            {formatGbp(sanitizedPnL.turnover)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Sales minus direct parts: {formatGbp(sanitizedPnL.grossProfit)}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
              {sanitizedPnL.currency}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Money made from customer sales &amp; audio licensing.
          </p>
        </div>

        {/* Card 2: Total Money Spent */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total Money Spent</span>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-100">
            {formatGbp(totalExpenses)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Product Parts: {formatGbp(sanitizedPnL.costOfSales)}</span>
            <span>Running Costs: {formatGbp(sanitizedPnL.administrativeExpenses)}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            All company bills, software, hardware, and services.
          </p>
        </div>

        {/* Card 3: Profit Left Over */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Profit Left Over (Pre-Tax)</span>
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className={`text-2xl font-bold tracking-tight ${
                sanitizedPnL.operatingProfit >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {formatGbp(sanitizedPnL.operatingProfit)}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              {operatingMarginPercent.toFixed(1)}% profit margin
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            What the business made after costs (before Corporation Tax).
          </p>
        </div>

        {/* Card 4: Current Bank Balance */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Bank Balance Today</span>
            <Wallet className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-100">
            {formatGbp(cashflow.balanceToday)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Expected in 90 Days:</span>
            <span className="font-semibold text-indigo-300">
              {formatGbp(cashflow.projectedBalance90Days)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Actual cash in your business account right now.
          </p>
        </div>
      </div>

      {/* Two-Column Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Where the money went & 90-Day Cashflow */}
        <div className="space-y-6 lg:col-span-7">
          {/* Where Did the Money Go */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Where Did the Money Go? (By Category)
                </h3>
                <p className="text-xs text-slate-400">
                  Sorted list of what you spent money on during this period
                </p>
              </div>
              <span className="rounded border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-xs font-mono text-slate-300">
                Total: {formatGbp(totalExpenses)}
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {sanitizedPnL.expenseBreakdownByCategory.map((item) => {
                const widthPercent = Math.min(
                  100,
                  Math.max(4, Math.round((item.amount / maxCategoryExpense) * 100))
                );
                const sharePercent =
                  totalExpenses > 0
                    ? Math.round((item.amount / totalExpenses) * 1000) / 10
                    : 0;

                return (
                  <div key={item.nominalCode} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 border border-slate-700">
                          {item.nominalCode}
                        </span>
                        <span className="font-medium text-slate-200">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">
                          ({sharePercent.toFixed(1)}% of spending)
                        </span>
                        <span className="font-mono font-semibold text-slate-100">
                          {formatGbp(item.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 90-Day Monthly Cashflow Trend Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  90-Day Bank Forecast: Money Coming In vs. Out
                </h3>
                <p className="text-xs text-slate-400">
                  Window: {cashflow.from} to {cashflow.to}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-300">
                  Expected In: <strong>{formatGbp(cashflow.incoming90Days)}</strong>
                </span>
                <span className="text-rose-300">
                  Expected Out: <strong>{formatGbp(cashflow.outgoing90Days)}</strong>
                </span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 font-medium">Month</th>
                    <th className="py-2.5 text-right font-medium">Expected Money In</th>
                    <th className="py-2.5 text-right font-medium">Expected Money Out</th>
                    <th className="py-2.5 text-right font-medium">
                      Net Gain / Loss
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cashflow.monthlyTrend.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono font-medium text-slate-200">
                        {row.month}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-300">
                        +{formatGbp(row.inflow)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-rose-300">
                        -{formatGbp(row.outflow)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-semibold ${
                          row.netCashflow >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {row.netCashflow >= 0 ? "+" : ""}
                        {formatGbp(row.netCashflow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Gemini Plain-English Financial Summary */}
        <div className="lg:col-span-5">
          <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-100">
                      Plain-English AI Briefing
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Gemini AI turns your numbers into a clear, simple story
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleGenerateSummary()}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Write Plain-English Briefing
                    </>
                  )}
                </button>
              </div>

              {/* Compliance Reassurance */}
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-3 text-xs text-emerald-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <span className="font-semibold text-emerald-100">
                    Safe AI Analysis:
                  </span>{" "}
                  The AI is only given operational sales and costs. Corporation Tax and personal dividends are completely removed so the AI cannot hallucinate tax advice.
                </div>
              </div>

              {summaryError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    Could Not Generate Briefing
                  </div>
                  <p className="mt-1 text-rose-200/90">{summaryError}</p>
                </div>
              )}

              {!summary ? (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                  <Sparkles className="mx-auto mb-2.5 h-6 w-6 text-slate-500" />
                  <p className="text-xs font-medium text-slate-300">
                    Ready to summarize your finances
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click &ldquo;Write Plain-English Briefing&rdquo; above to get a clear summary of your spending, any cost spikes, and what to do next.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Executive Summary */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      The Big Picture
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      {summary.executiveSummary}
                    </p>
                  </div>

                  {/* Key Observations */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Things to Notice (Spending Spikes &amp; Trends)
                    </h4>
                    <ul className="mt-2 space-y-2 text-xs text-slate-300">
                      {summary.keyObservations.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actionable Next Steps */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      Recommended To-Do List
                    </h4>
                    <ul className="mt-2 space-y-2 text-xs text-slate-300">
                      {summary.actionableNextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Simple Note Footer */}
            <div className="mt-5 rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-400">
              <strong className="text-slate-300">Important Note:</strong> This briefing is for day-to-day guidance only. Your final official Corporation Tax and VAT returns are calculated and submitted manually inside FreeAgent.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
