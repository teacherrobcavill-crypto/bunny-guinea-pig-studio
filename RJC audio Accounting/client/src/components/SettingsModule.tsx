import React, { useEffect, useState } from "react";
import type { OperatingMode, VatMode } from "@rjc/shared";
import {
  disconnectFreeAgent,
  getFreeAgentAuthorizeUrl,
  updateSettings,
  type PublicSettings,
  type ReferenceData
} from "../api/client";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  ExternalLink,
  KeyRound,
  Link2,
  Link2Off,
  Loader2,
  Lock,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck
} from "lucide-react";
import { PlainEnglishTip } from "./PlainEnglishGuide";

interface SettingsModuleProps {
  settings: PublicSettings | null;
  referenceData: ReferenceData | null;
  onSettingsUpdated: () => Promise<void> | void;
  showHints?: boolean;
}

const DEFAULT_FORBIDDEN_PATHS = [
  "/v2/corporation_tax_returns",
  "/v2/vat_returns",
  "/v2/self_assessment_returns",
  "/v2/payroll",
  "/v2/payroll_profiles",
  "/v2/final_accounts_reports"
];

export function SettingsModule({
  settings,
  referenceData,
  onSettingsUpdated,
  showHints = false
}: SettingsModuleProps) {
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(
    settings?.operatingMode ?? "mock"
  );
  const [vatMode, setVatMode] = useState<VatMode>(
    settings?.vatMode ?? "not_registered"
  );
  const [companyName, setCompanyName] = useState<string>(
    settings?.companyName ?? "RJC Audio Ltd"
  );
  const [defaultUserUri, setDefaultUserUri] = useState<string>(
    settings?.defaultUserUri ?? ""
  );

  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [freeagentClientId, setFreeagentClientId] = useState<string>("");
  const [freeagentClientSecret, setFreeagentClientSecret] =
    useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setOperatingMode(settings.operatingMode);
    setVatMode(settings.vatMode);
    setCompanyName(settings.companyName || "RJC Audio Ltd");
    setDefaultUserUri(
      settings.defaultUserUri ?? referenceData?.users?.[0]?.url ?? ""
    );
  }, [settings, referenceData]);

  const handleSaveConfiguration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setStatusMessage(null);

    try {
      const payload: Parameters<typeof updateSettings>[0] = {
        operatingMode,
        vatMode,
        companyName: companyName.trim() || "RJC Audio Ltd",
        defaultUserUri: defaultUserUri.trim() || null
      };

      if (geminiApiKey.trim()) {
        payload.geminiApiKey = geminiApiKey.trim();
      }
      if (freeagentClientId.trim()) {
        payload.freeagentClientId = freeagentClientId.trim();
      }
      if (freeagentClientSecret.trim()) {
        payload.freeagentClientSecret = freeagentClientSecret.trim();
      }

      await updateSettings(payload);

      setGeminiApiKey("");
      setFreeagentClientId("");
      setFreeagentClientSecret("");

      await onSettingsUpdated();
      setStatusMessage(
        "Settings and secure password locker credentials saved successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickModeSelect = async (mode: OperatingMode) => {
    setOperatingMode(mode);
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      await updateSettings({ operatingMode: mode });
      await onSettingsUpdated();
      const modeLabel =
        mode === "mock"
          ? "Practice Mode (Demo Sonics Data)"
          : mode === "sandbox"
          ? "Test Mode (FreeAgent Sandbox)"
          : "Live Mode (Real FreeAgent Books)";
      setStatusMessage(`Switched environment to ${modeLabel}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to switch operating mode"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickVatSelect = async (nextVatMode: VatMode) => {
    setVatMode(nextVatMode);
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      await updateSettings({ vatMode: nextVatMode });
      await onSettingsUpdated();
      setStatusMessage(
        nextVatMode === "uk_vat_registered"
          ? "VAT mode updated: Yes, VAT Registered (records net amount + 20%/5% VAT)."
          : "VAT mode updated: Not VAT Registered (records simple total prices only)."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update VAT registration mode"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConnectFreeAgent = async () => {
    setOauthLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const { authorizationUrl } = await getFreeAgentAuthorizeUrl();
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initiate FreeAgent OAuth 2.0 flow. Ensure Client ID and Secret are configured in the vault."
      );
      setOauthLoading(false);
    }
  };

  const handleDisconnectFreeAgent = async () => {
    setDisconnecting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await disconnectFreeAgent();
      await onSettingsUpdated();
      setStatusMessage(
        "Disconnected FreeAgent OAuth 2.0 session and purged tokens from vault."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect FreeAgent OAuth session"
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const forbiddenPaths =
    settings?.forbiddenPaths && settings.forbiddenPaths.length > 0
      ? settings.forbiddenPaths
      : DEFAULT_FORBIDDEN_PATHS;

  const users = referenceData?.users ?? [];

  return (
    <div className="space-y-6">
      {/* Status & Error Banners */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Operating Mode Selector */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <Server className="h-5 w-5 text-indigo-400" />
              Practice vs Real FreeAgent Books
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Pick whether you want to test and play safely with demo data or connect directly to your real accounting books.
            </p>
          </div>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            Current: {operatingMode === "mock" ? "Practice Mode (Demo)" : operatingMode === "sandbox" ? "Test Sandbox" : "Live Real Books"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              {
                id: "mock" as OperatingMode,
                title: "Practice Mode (Safe Demo)",
                subtitle: "Uses Sample Sonics Audio Data",
                description:
                  "100% safe. No real accounts or passwords needed. Uses sample Starling bank feeds, Cloudflare, Thomann, and Paddle receipts.",
                icon: Database
              },
              {
                id: "sandbox" as OperatingMode,
                title: "FreeAgent Test Sandbox",
                subtitle: "FreeAgent's Test Server",
                description:
                  "Connects to a developer sandbox account so you can test features without touching your actual business numbers.",
                icon: Sparkles
              },
              {
                id: "production" as OperatingMode,
                title: "Live FreeAgent Books",
                subtitle: "Real RJC Audio Ltd Ledger",
                description:
                  "Connects to your real FreeAgent account. All receipt uploads and bank categories require your review before anything is saved.",
                icon: Building2
              }
            ] as const
          ).map((card) => {
            const Icon = card.icon;
            const isSelected = operatingMode === card.id;
            return (
              <button
                key={card.id}
                type="button"
                disabled={saving}
                onClick={() => void handleQuickModeSelect(card.id)}
                className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-950/40"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                        isSelected
                          ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                          : "border-slate-800 bg-slate-900 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-100">
                    {card.title}
                  </h3>
                  <div className="mt-0.5 font-mono text-[11px] text-indigo-400">
                    {card.subtitle}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. VAT Registration & Company Configuration */}
      <form
        onSubmit={(e) => void handleSaveConfiguration(e)}
        className="space-y-6"
      >
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <Building2 className="h-5 w-5 text-indigo-400" />
              Company Details &amp; VAT Settings
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Tell the assistant if you are VAT registered so it knows whether to split receipts into Net + VAT, and who gets paid back for personal expenses.
            </p>
          </div>

          {/* VAT Toggle Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleQuickVatSelect("not_registered")}
              className={`flex flex-col rounded-xl border p-4 text-left transition ${
                vatMode === "not_registered"
                  ? "border-indigo-500 bg-indigo-950/30"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  Not VAT Registered (Simple Total Prices Only)
                </span>
                {vatMode === "not_registered" && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Pick this if your business does not charge VAT. Receipts will just record the final price you paid without complicated tax breakdowns.
              </p>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleQuickVatSelect("uk_vat_registered")}
              className={`flex flex-col rounded-xl border p-4 text-left transition ${
                vatMode === "uk_vat_registered"
                  ? "border-indigo-500 bg-indigo-950/30"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">
                  Yes, UK VAT Registered (Split Net + VAT)
                </span>
                {vatMode === "uk_vat_registered" && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Pick this if your business has an HMRC VAT number. Gemini will read the price before tax (Net) and the VAT amount (20%, 5%) so you can claim it back.
              </p>
            </button>
          </div>

          {/* Company Name & Default Expense Claimant User */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="company-name-input"
                className="block text-xs font-medium text-slate-300"
              >
                Company Name
              </label>
              <input
                id="company-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="RJC Audio Ltd"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="default-user-select"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300"
              >
                <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                Who gets paid back for personal expenses? (Director / Employee)
              </label>
              <select
                id="default-user-select"
                value={defaultUserUri}
                onChange={(e) => setDefaultUserUri(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                {users.length === 0 ? (
                  <option value="">
                    Rob Cavill — Director (Default FreeAgent User)
                  </option>
                ) : (
                  users.map((u) => (
                    <option key={u.url} value={u.url}>
                      {u.firstName} {u.lastName} ({u.role}) — {u.email}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </section>

        {/* 3. Safe Password & Key Locker */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                <Lock className="h-5 w-5 text-emerald-400" />
                Safe Password &amp; Key Locker
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Your AI and FreeAgent connection keys are safely scrambled and locked locally on your computer inside{" "}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">
                  data/vault.enc
                </code>
                . They are never sent to third-party servers.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Keys &amp; Settings
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Gemini API Key */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="gemini-api-key"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  Google Gemini API Key
                </label>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    settings?.hasGeminiApiKey
                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {settings?.hasGeminiApiKey
                    ? "Safely Saved in Locker"
                    : "Using Free Demo Fallback"}
                </span>
              </div>
              <input
                id="gemini-api-key"
                type="password"
                autoComplete="off"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={
                  settings?.hasGeminiApiKey
                    ? "•••••••••••••••••••••••• (Leave blank to keep saved key)"
                    : "AIzaSy... (Leave blank for sample fallback)"
                }
                className="mt-2.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* FreeAgent OAuth Client ID */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="freeagent-client-id"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  FreeAgent App Client ID
                </label>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    settings?.hasFreeagentCredentials
                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {settings?.hasFreeagentCredentials
                    ? "Safely Saved in Locker"
                    : "Not Set"}
                </span>
              </div>
              <input
                id="freeagent-client-id"
                type="password"
                autoComplete="off"
                value={freeagentClientId}
                onChange={(e) => setFreeagentClientId(e.target.value)}
                placeholder={
                  settings?.hasFreeagentCredentials
                    ? "•••••••••••••••• (Stored safely)"
                    : "Enter FreeAgent App ID"
                }
                className="mt-2.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* FreeAgent OAuth Client Secret */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="freeagent-client-secret"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
                >
                  <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                  FreeAgent App Client Secret
                </label>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    settings?.hasFreeagentCredentials
                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {settings?.hasFreeagentCredentials
                    ? "Safely Saved in Locker"
                    : "Not Set"}
                </span>
              </div>
              <input
                id="freeagent-client-secret"
                type="password"
                autoComplete="off"
                value={freeagentClientSecret}
                onChange={(e) => setFreeagentClientSecret(e.target.value)}
                placeholder={
                  settings?.hasFreeagentCredentials
                    ? "•••••••••••••••• (Stored safely)"
                    : "Enter FreeAgent App Secret"
                }
                className="mt-2.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FreeAgent OAuth 2.0 Connection Panel */}
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/90 p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  settings?.freeagentConnected
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {settings?.freeagentConnected ? (
                  <Link2 className="h-4 w-4" />
                ) : (
                  <Link2Off className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    FreeAgent Account Link
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      settings?.freeagentConnected
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {settings?.freeagentConnected
                      ? "Connected to FreeAgent"
                      : "Not Connected (Practice Mode Ready)"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Click to log in to FreeAgent with one click. It automatically keeps your bank records, bills, and expenses up to date.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void handleConnectFreeAgent()}
                disabled={oauthLoading || disconnecting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {oauthLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                Connect to FreeAgent
              </button>

              <button
                type="button"
                onClick={() => void handleDisconnectFreeAgent()}
                disabled={
                  disconnecting || oauthLoading || !settings?.freeagentConnected
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5" />
                )}
                Disconnect FreeAgent
              </button>
            </div>
          </div>
        </section>
      </form>

      {/* 4. HMRC Safety Lock (Read-Only Guardrails) */}
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/95 p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              HMRC Safety Locks &amp; Rules (Built-in Guardrails)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Hardcoded technical rules in the code that permanently block any automatic tax submissions or AI guessing of tax numbers.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Safety Locks Always Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Guardrail 1: Blocked Statutory Endpoints */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                1. Tax Submissions Are Hard-Blocked
              </span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] text-rose-300">
                Hard Block (Forbidden)
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              This app can <strong>never</strong> submit tax returns, VAT returns, or payroll directly to HMRC or Companies House. Even if requested, the connection firewall immediately blocks:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {forbiddenPaths.map((p) => (
                <code
                  key={p}
                  className="rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-1 font-mono text-[11px] text-rose-200"
                >
                  {p}
                </code>
              ))}
            </div>
          </div>

          {/* Guardrail 2: P&L Corporation Tax Stripping */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                2. AI Never Sees Corporation Tax Numbers
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                Stripped Before AI Reads It
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Before the AI writes the executive financial summary, any estimated Corporation Tax or dividend deductions are wiped out. The AI only explains your day-to-day sales and costs without hallucinating tax numbers.
            </p>
          </div>

          {/* Guardrail 3: Integer-Pence Receipt Math Verification */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                3. Exact Penny Math Verification (Net + VAT = Total)
              </span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                Penny-Accurate Check
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Every receipt figure is counted in whole pennies. The app checks that Amount Before Tax + VAT matches the Total Paid. If there is a rounding difference of more than 1p, it alerts you immediately before saving to FreeAgent.
            </p>
          </div>

          {/* Guardrail 4: Ephemeral Binary Upload Purge */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                4. Temporary Receipt Files Auto-Cleaned
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                Deleted Once Saved
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              When you upload a receipt PDF or photo, it is attached safely to your FreeAgent bill or expense. Once FreeAgent confirms it has received the file, the temporary copy is deleted from your computer to keep your storage clean.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
export default SettingsModule;
