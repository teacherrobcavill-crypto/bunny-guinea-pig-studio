import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { BankTransaction, FreeAgentCategory } from "@rjc/shared";
import {
  approveTransaction,
  categorizeTransactions,
  fetchTransactions,
  type PublicSettings,
  type ReferenceData
} from "../api/client";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import { PlainEnglishTip } from "./PlainEnglishGuide";

interface TransactionCategorizerModuleProps {
  settings: PublicSettings | null;
  referenceData: ReferenceData | null;
}

interface RowOverrideState {
  nominalCode: string;
  description: string;
  salesTaxRate: string;
}

interface BankAccountInfo {
  url: string;
  name: string;
  currency: string;
  currentBalance: number;
}

function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
}

export function TransactionCategorizerModule({
  settings,
  referenceData
}: TransactionCategorizerModuleProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [categories, setCategories] = useState<FreeAgentCategory[]>(
    referenceData?.categories ?? []
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);
  const [selectedBankAccountUri, setSelectedBankAccountUri] =
    useState<string>("");
  const [rowOverrides, setRowOverrides] = useState<
    Record<string, RowOverrideState>
  >({});

  const [loading, setLoading] = useState<boolean>(true);
  const [categorizing, setCategorizing] = useState<boolean>(false);
  const [approvingIds, setApprovingIds] = useState<Record<string, boolean>>({});
  const [batchApproving, setBatchApproving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const isVatRegistered = settings?.vatMode === "uk_vat_registered";

  const availableCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories;
    }
    return referenceData?.categories ?? [];
  }, [categories, referenceData]);

  const syncRowDefaults = useCallback(
    (
      txList: BankTransaction[],
      catList: FreeAgentCategory[],
      existingOverrides: Record<string, RowOverrideState>
    ) => {
      const next: Record<string, RowOverrideState> = { ...existingOverrides };
      const defaultNominal = catList[0]?.nominalCode ?? "250";

      for (const tx of txList) {
        if (!next[tx.id]) {
          next[tx.id] = {
            nominalCode:
              tx.explainedNominalCode ||
              tx.suggestedNominalCode ||
              defaultNominal,
            description:
              tx.explainedDescription ||
              tx.suggestedExplanation ||
              tx.description,
            salesTaxRate: tx.amount > 0 ? "0" : "20"
          };
        }
      }
      return next;
    },
    []
  );

  const loadData = useCallback(
    async (bankAccountUri?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTransactions(bankAccountUri);
        setTransactions(data.transactions);
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
        setBankAccounts(data.bankAccounts);
        if (!selectedBankAccountUri && data.bankAccounts[0]) {
          setSelectedBankAccountUri(data.bankAccounts[0].url);
        }

        setRowOverrides((prev) =>
          syncRowDefaults(
            data.transactions,
            data.categories.length > 0
              ? data.categories
              : referenceData?.categories ?? [],
            prev
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load bank feed transactions"
        );
      } finally {
        setLoading(false);
      }
    },
    [referenceData?.categories, selectedBankAccountUri, syncRowDefaults]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSuggestCategories = async () => {
    setCategorizing(true);
    setError(null);
    setStatusBanner(null);

    const unexplainedIds = transactions
      .filter((t) => t.isUnexplained)
      .map((t) => t.id);

    if (unexplainedIds.length === 0) {
      setStatusBanner("All transactions in this bank feed are already labelled!");
      setCategorizing(false);
      return;
    }

    try {
      const { suggestions } = await categorizeTransactions(unexplainedIds);

      setTransactions((prev) =>
        prev.map((tx) => {
          const match = suggestions.find((s) => s.transactionId === tx.id);
          if (!match) return tx;
          return {
            ...tx,
            suggestedNominalCode: match.suggestedNominalCode,
            suggestedCategoryDescription: match.suggestedCategoryDescription,
            suggestedExplanation: match.suggestedExplanation,
            confidence: match.confidence,
            rationale: match.rationale
          };
        })
      );

      setRowOverrides((prev) => {
        const next = { ...prev };
        for (const s of suggestions) {
          next[s.transactionId] = {
            nominalCode: s.suggestedNominalCode,
            description: s.suggestedExplanation,
            salesTaxRate: next[s.transactionId]?.salesTaxRate ?? "20"
          };
        }
        return next;
      });

      setStatusBanner(
        `Gemini AI suggested categories for ${suggestions.length} bank line${
          suggestions.length === 1 ? "" : "s"
        }. Review and click Approve to confirm!`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate AI category suggestions"
      );
    } finally {
      setCategorizing(false);
    }
  };

  const handleApproveSingle = async (tx: BankTransaction) => {
    const override = rowOverrides[tx.id];
    const nominalCode = (
      override?.nominalCode ||
      tx.suggestedNominalCode ||
      availableCategories[0]?.nominalCode ||
      "250"
    ).trim();

    const description = (
      override?.description ||
      tx.suggestedExplanation ||
      tx.description
    ).trim();

    if (!nominalCode || !description) {
      setError("Please choose a category and enter a short note.");
      return;
    }

    setApprovingIds((prev) => ({ ...prev, [tx.id]: true }));
    setError(null);

    try {
      const salesTaxRate = isVatRegistered
        ? Number(override?.salesTaxRate ?? (tx.amount > 0 ? "0" : "20"))
        : null;

      await approveTransaction({
        transactionId: tx.id,
        bankTransactionUri: tx.url,
        datedOn: tx.datedOn,
        grossValue: tx.unexplainedAmount || tx.amount,
        nominalCode,
        description,
        salesTaxRate
      });

      const matchedCategory = availableCategories.find(
        (c) => c.nominalCode === nominalCode
      );

      setTransactions((prev) =>
        prev.map((item) =>
          item.id === tx.id
            ? {
                ...item,
                isUnexplained: false,
                unexplainedAmount: 0,
                explainedNominalCode: nominalCode,
                explainedDescription: description,
                suggestedCategoryDescription:
                  matchedCategory?.description ??
                  item.suggestedCategoryDescription,
                explainedAt: new Date().toISOString()
              }
            : item
        )
      );

      setStatusBanner(
        `Labelled "${tx.description}" (${formatGbp(tx.amount)}) as ${matchedCategory?.description ?? nominalCode}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to approve transaction ${tx.id}`
      );
    } finally {
      setApprovingIds((prev) => ({ ...prev, [tx.id]: false }));
    }
  };

  const highConfidenceUnexplained = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.isUnexplained &&
          typeof tx.confidence === "number" &&
          tx.confidence >= 0.85
      ),
    [transactions]
  );

  const handleApproveAllHighConfidence = async () => {
    if (highConfidenceUnexplained.length === 0) return;

    setBatchApproving(true);
    setError(null);
    setStatusBanner(null);

    let approvedCount = 0;

    try {
      for (const tx of highConfidenceUnexplained) {
        const override = rowOverrides[tx.id];
        const nominalCode =
          override?.nominalCode ||
          tx.suggestedNominalCode ||
          availableCategories[0]?.nominalCode ||
          "250";
        const description =
          override?.description ||
          tx.suggestedExplanation ||
          tx.description;

        const salesTaxRate = isVatRegistered
          ? Number(override?.salesTaxRate ?? (tx.amount > 0 ? "0" : "20"))
          : null;

        await approveTransaction({
          transactionId: tx.id,
          bankTransactionUri: tx.url,
          datedOn: tx.datedOn,
          grossValue: tx.unexplainedAmount || tx.amount,
          nominalCode,
          description,
          salesTaxRate
        });

        approvedCount++;

        setTransactions((prev) =>
          prev.map((item) =>
            item.id === tx.id
              ? {
                  ...item,
                  isUnexplained: false,
                  unexplainedAmount: 0,
                  explainedNominalCode: nominalCode,
                  explainedDescription: description,
                  explainedAt: new Date().toISOString()
                }
              : item
          )
        );
      }

      setStatusBanner(
        `Approved all ${approvedCount} high-confidence bank payment${approvedCount === 1 ? "" : "s"} to FreeAgent.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Batch approval stopped due to an error"
      );
    } finally {
      setBatchApproving(false);
    }
  };

  const updateRowField = (
    txId: string,
    field: keyof RowOverrideState,
    value: string
  ) => {
    setRowOverrides((prev) => ({
      ...prev,
      [txId]: {
        nominalCode:
          prev[txId]?.nominalCode ??
          availableCategories[0]?.nominalCode ??
          "250",
        description: prev[txId]?.description ?? "",
        salesTaxRate: prev[txId]?.salesTaxRate ?? "20",
        [field]: value
      }
    }));
  };

  const unexplainedCount = useMemo(
    () => transactions.filter((t) => t.isUnexplained).length,
    [transactions]
  );

  const explainedCount = transactions.length - unexplainedCount;

  const activeBankAccount =
    bankAccounts.find((b) => b.url === selectedBankAccountUri) ??
    bankAccounts[0] ??
    null;

  return (
    <div className="space-y-6">
      {/* Header Bar with Bank Summary & AI Controls */}
      <PlainEnglishTip title="How this screen works">
        Click <strong>Suggest Categories with Gemini</strong> to let AI label each bank payment. Review the suggested category in the dropdown, then click <strong>Approve</strong> to save it to FreeAgent.
      </PlainEnglishTip>

      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-semibold text-slate-100">
                  {activeBankAccount
                    ? activeBankAccount.name
                    : "Starling Business Account (RJC Audio Ltd)"}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    unexplainedCount > 0
                      ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      unexplainedCount > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  {unexplainedCount > 0
                    ? `${unexplainedCount} payments need a label`
                    : "All payments labelled!"}
                </span>

                {explainedCount > 0 && (
                  <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
                    {explainedCount} labelled &amp; reconciled
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span>
                  Bank Balance:{" "}
                  <strong className="font-mono text-slate-200">
                    {formatGbp(activeBankAccount?.currentBalance ?? 44820.5)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  VAT Setting:{" "}
                  <strong className="text-slate-300">
                    {isVatRegistered
                      ? "VAT Registered (select 20%, 5%, or 0%)"
                      : "Not VAT Registered (gross amounts)"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {bankAccounts.length > 1 && (
              <select
                value={selectedBankAccountUri}
                onChange={(e) => {
                  const uri = e.target.value;
                  setSelectedBankAccountUri(uri);
                  void loadData(uri);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {bankAccounts.map((acct) => (
                  <option key={acct.url} value={acct.url}>
                    {acct.name} ({formatGbp(acct.currentBalance)})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => void loadData(selectedBankAccountUri || undefined)}
              disabled={loading || categorizing || batchApproving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleSuggestCategories()}
              disabled={
                categorizing ||
                loading ||
                unexplainedCount === 0 ||
                batchApproving
              }
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {categorizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Suggest Categories with Gemini
            </button>

            <button
              type="button"
              onClick={() => void handleApproveAllHighConfidence()}
              disabled={
                batchApproving ||
                categorizing ||
                highConfidenceUnexplained.length === 0
              }
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {batchApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Approve All Confident Ones (&gt;= 85%)
              {highConfidenceUnexplained.length > 0 && (
                <span className="ml-0.5 rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[11px] text-emerald-200">
                  {highConfidenceUnexplained.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error & Status Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {statusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bank Transactions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3.5">Date &amp; What the Bank Says</th>
                <th className="px-4 py-3.5 text-right">Amount In / Out</th>
                <th className="px-4 py-3.5">AI Suggestion &amp; Why</th>
                <th className="px-4 py-3.5">Category Folder</th>
                <th className="px-4 py-3.5">Note Saved to FreeAgent</th>
                {isVatRegistered && (
                  <th className="px-3 py-3.5 text-center">VAT Rate</th>
                )}
                <th className="px-4 py-3.5 text-right">Confirm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td
                    colSpan={isVatRegistered ? 7 : 6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                      <span>Loading bank transactions from your account...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isVatRegistered ? 7 : 6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No transactions found for this account.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isMoneyIn = tx.amount > 0;
                  const isApproving = Boolean(approvingIds[tx.id]);
                  const override = rowOverrides[tx.id] ?? {
                    nominalCode:
                      tx.explainedNominalCode ||
                      tx.suggestedNominalCode ||
                      availableCategories[0]?.nominalCode ||
                      "250",
                    description:
                      tx.explainedDescription ||
                      tx.suggestedExplanation ||
                      tx.description,
                    salesTaxRate: isMoneyIn ? "0" : "20"
                  };

                  const confidencePct =
                    typeof tx.confidence === "number"
                      ? Math.round(tx.confidence * 100)
                      : null;

                  const matchedCategoryDesc =
                    tx.suggestedCategoryDescription ||
                    availableCategories.find(
                      (c) => c.nominalCode === override.nominalCode
                    )?.description;

                  return (
                    <tr
                      key={tx.id}
                      className={`transition ${
                        tx.isUnexplained
                          ? "hover:bg-slate-800/40"
                          : "bg-emerald-950/10 opacity-85"
                      }`}
                    >
                      {/* Date & Description */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono text-xs text-slate-400">
                          {tx.datedOn}
                        </div>
                        <div className="mt-0.5 font-medium text-slate-100">
                          {tx.description}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          Bank ID: {tx.id}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                            isMoneyIn
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {isMoneyIn ? (
                            <>
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                              +{formatGbp(tx.amount)} (In)
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
                              -{formatGbp(tx.amount)} (Out)
                            </>
                          )}
                        </span>
                      </td>

                      {/* Gemini AI Suggestion & Rationale */}
                      <td className="max-w-xs px-4 py-3.5 align-top">
                        {tx.suggestedNominalCode || confidencePct !== null ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-indigo-300 text-xs">
                                {tx.suggestedNominalCode
                                  ? `${tx.suggestedNominalCode} — ${matchedCategoryDesc ?? "Suggested Category"}`
                                  : matchedCategoryDesc}
                              </span>
                              {confidencePct !== null && (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    confidencePct >= 85
                                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                      : confidencePct >= 70
                                        ? "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                                        : "border border-rose-500/30 bg-rose-500/15 text-rose-300"
                                  }`}
                                >
                                  {confidencePct}% Sure
                                </span>
                              )}
                            </div>
                            {tx.rationale && (
                              <p className="text-xs leading-relaxed text-slate-400">
                                {tx.rationale}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-500">
                            Click &ldquo;Suggest Categories with Gemini&rdquo; above
                          </span>
                        )}
                      </td>

                      {/* Editable Category Override */}
                      <td className="px-4 py-3.5 align-top">
                        <select
                          aria-label={`Category for ${tx.description}`}
                          disabled={!tx.isUnexplained || isApproving}
                          value={override.nominalCode}
                          onChange={(e) =>
                            updateRowField(
                              tx.id,
                              "nominalCode",
                              e.target.value
                            )
                          }
                          className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {availableCategories.map((cat) => (
                            <option
                              key={cat.nominalCode}
                              value={cat.nominalCode}
                            >
                              {cat.nominalCode} - {cat.description}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Editable Ledger Explanation */}
                      <td className="px-4 py-3.5 align-top">
                        <input
                          type="text"
                          aria-label={`Explanation for ${tx.description}`}
                          disabled={!tx.isUnexplained || isApproving}
                          value={override.description}
                          onChange={(e) =>
                            updateRowField(
                              tx.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="What was this for?..."
                          className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>

                      {/* Conditional VAT Rate Selector */}
                      {isVatRegistered && (
                        <td className="px-3 py-3.5 text-center align-top">
                          <select
                            aria-label={`VAT rate for ${tx.description}`}
                            disabled={!tx.isUnexplained || isApproving}
                            value={override.salesTaxRate}
                            onChange={(e) =>
                              updateRowField(
                                tx.id,
                                "salesTaxRate",
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="20">20%</option>
                            <option value="5">5%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                      )}

                      {/* Action / Status */}
                      <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                        {tx.isUnexplained ? (
                          <button
                            type="button"
                            onClick={() => void handleApproveSingle(tx)}
                            disabled={isApproving || batchApproving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                          >
                            {isApproving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Reconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
