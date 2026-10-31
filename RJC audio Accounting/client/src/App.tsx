import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AudioWaveform,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  Play,
  Receipt,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal
} from "lucide-react";
import {
  fetchReferenceData,
  fetchServerControlStatus,
  fetchSettings,
  PublicSettings,
  ReferenceData,
  restartBackendServer,
  ServerControlStatus,
  startBackendServer,
  stopBackendServer
} from "./api/client";
import { FinancialSummaryWidget } from "./components/FinancialSummaryWidget";
import { PlainEnglishGuideBanner } from "./components/PlainEnglishGuide";
import { ReceiptExtractorModule } from "./components/ReceiptExtractorModule";
import { TransactionCategorizerModule } from "./components/TransactionCategorizerModule";
import { SettingsModule } from "./components/SettingsModule";

export type ActiveTab = "summary" | "receipts" | "transactions" | "settings";

const DEFAULT_SETTINGS: PublicSettings = {
  operatingMode: "mock",
  vatMode: "uk_vat_registered",
  hasGeminiApiKey: false,
  hasFreeagentCredentials: false,
  freeagentConnected: false,
  defaultUserUri: null,
  companyName: "RJC Audio Ltd",
  forbiddenPaths: [
    "/v2/vat_returns",
    "/v2/corporation_tax_returns",
    "/v2/self_assessment_returns",
    "/v2/payroll",
    "/v2/payroll_profiles",
    "/v2/cis_bands",
    "/v2/final_accounts_reports"
  ]
};

const DEFAULT_REFERENCE_DATA: ReferenceData = {
  categories: [],
  users: [],
  contacts: [],
  company: {
    name: "RJC Audio Ltd",
    currency: "GBP",
    salesTaxRegistrationStatus: "Registered"
  }
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [referenceData, setReferenceData] = useState<ReferenceData>(
    DEFAULT_REFERENCE_DATA
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<ServerControlStatus>({
    running: true,
    port: 3001,
    host: "127.0.0.1",
    pid: null,
    logs: []
  });
  const [serverActionBusy, setServerActionBusy] = useState<
    "starting" | "stopping" | "restarting" | null
  >(null);
  const [showServerLogs, setShowServerLogs] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const refreshServerStatus = useCallback(async () => {
    const status = await fetchServerControlStatus();
    setServerStatus(status);
    return status;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const status = await refreshServerStatus();
      if (!status.running) {
        setError(
          "The local accounting backend server (127.0.0.1:3001) is currently stopped. Click 'Start Server' above to launch it."
        );
        return;
      }

      setError(null);
      const [loadedSettings, loadedReference] = await Promise.all([
        fetchSettings(),
        fetchReferenceData()
      ]);
      setSettings(loadedSettings);
      setReferenceData(loadedReference);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      await refreshServerStatus();
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to local accounting server"
      );
    } finally {
      setLoading(false);
    }
  }, [refreshServerStatus]);

  useEffect(() => {
    void loadAll();
    const interval = setInterval(() => {
      void refreshServerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadAll, refreshServerStatus]);

  const handleStartServer = async () => {
    try {
      setServerActionBusy("starting");
      setError(null);
      const status = await startBackendServer();
      setServerStatus(status);
      if (status.running) {
        await loadAll();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start backend server"
      );
    } finally {
      setServerActionBusy(null);
    }
  };

  const handleStopServer = async () => {
    try {
      setServerActionBusy("stopping");
      const status = await stopBackendServer();
      setServerStatus(status);
      setError(
        "The local accounting backend server (127.0.0.1:3001) is currently stopped. Click 'Start Server' to resume."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop backend server"
      );
    } finally {
      setServerActionBusy(null);
    }
  };

  const handleRestartServer = async () => {
    try {
      setServerActionBusy("restarting");
      setError(null);
      const status = await restartBackendServer();
      setServerStatus(status);
      if (status.running) {
        await loadAll();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restart backend server"
      );
    } finally {
      setServerActionBusy(null);
    }
  };

  const operatingModeBadge = () => {
    if (settings.operatingMode === "mock") {
      return {
        label: "Practice Mode (Demo)",
        description: "Zero network calls — using built-in Sonics practice numbers",
        classes: "bg-amber-500/15 text-amber-300 border-amber-500/30"
      };
    }
    if (settings.operatingMode === "sandbox") {
      return {
        label: "FreeAgent Test Server",
        description: "Connected to FreeAgent developer testing sandbox",
        classes: "bg-sky-500/15 text-sky-300 border-sky-500/30"
      };
    }
    return {
      label: "Live FreeAgent Books",
      description: "Connected to real RJC Audio Ltd accounting records",
      classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    };
  };

  const modeBadge = operatingModeBadge();

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "summary",
      label: "Money Overview",
      subtitle: "Sales, costs, profits & AI briefing",
      icon: LayoutDashboard
    },
    {
      id: "receipts",
      label: "Upload Receipts",
      subtitle: "Read PDF/photo invoices & save drafts",
      icon: Receipt
    },
    {
      id: "transactions",
      label: "Label Bank Payments",
      subtitle: "Tag unexplained money in and out",
      icon: FileSpreadsheet
    },
    {
      id: "settings",
      label: "Settings & Safety",
      subtitle: "Connect FreeAgent, keys & rules",
      icon: Settings
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Status Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <AudioWaveform className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                  RJC Audio Ltd — Simple Bookkeeping Assistant
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Easy AI bookkeeping helper for Sonics — you always review and approve before anything is saved
              </p>
            </div>
          </div>

          {/* Status Badges & One-Click Server Power Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Built-in Start / Stop / Restart Server Control Group */}
            <div className="inline-flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl p-1 pr-1.5 shadow-inner">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  serverStatus.running
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                }`}
                title={
                  serverStatus.running
                    ? "The background accounting helper on this Mac is running and ready"
                    : "The background accounting helper on this Mac is turned off"
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    serverStatus.running
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-rose-400"
                  }`}
                />
                {serverActionBusy === "starting"
                  ? "Starting Helper..."
                  : serverActionBusy === "stopping"
                  ? "Stopping Helper..."
                  : serverActionBusy === "restarting"
                  ? "Restarting..."
                  : serverStatus.running
                  ? "App Engine: Online"
                  : "App Engine: Stopped"}
              </span>

              {!serverStatus.running ? (
                <button
                  type="button"
                  onClick={() => void handleStartServer()}
                  disabled={serverActionBusy !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start Helper
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleRestartServer()}
                    disabled={serverActionBusy !== null}
                    title="Restart the local background helper program"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw
                      className={`h-3.5 w-3.5 ${
                        serverActionBusy === "restarting" ? "animate-spin" : ""
                      }`}
                    />
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStopServer()}
                    disabled={serverActionBusy !== null}
                    title="Turn off the local background helper program"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/70 transition cursor-pointer disabled:opacity-50"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                </>
              )}
            </div>

            {/* Operating Mode Badge */}
            <span
              title={modeBadge.description}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${modeBadge.classes}`}
            >
              <Activity className="h-3.5 w-3.5" />
              {modeBadge.label}
            </span>

            {/* VAT Status Badge */}
            <span
              title={
                settings.vatMode === "uk_vat_registered"
                  ? "RJC Audio Ltd reclaims VAT: the app reads Net + VAT separately on bills"
                  : "Not VAT registered: the app only looks at the final gross total paid"
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                settings.vatMode === "uk_vat_registered"
                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              {settings.vatMode === "uk_vat_registered"
                ? "VAT Registered (Net + VAT)"
                : "Not VAT Registered (Gross Only)"}
            </span>

            {/* Gemini AI Status Indicator */}
            <span
              title={
                settings.hasGeminiApiKey
                  ? "Google Gemini AI is connected with your API key to read receipts and analyze numbers"
                  : "Using built-in Sonics practice rules (add your Gemini key in Settings for full AI)"
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                settings.hasGeminiApiKey
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {settings.hasGeminiApiKey
                ? "AI Reader: Ready"
                : "AI Reader: Practice Fallback"}
            </span>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={loading || !serverStatus.running}
              title="Refresh and sync data from your books"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Sync
            </button>
          </div>
        </div>

        {/* Permanent HMRC Compliance Guardrail Banner */}
        <div className="bg-emerald-950/60 border-t border-emerald-800/50 px-4 sm:px-6 py-2">
          <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>100% Safe:</strong> This app is strictly an assistant. It never calculates UK Corporation Tax or files anything with HMRC. All final tax filings happen manually inside FreeAgent.
              </span>
            </div>
            <span className="hidden lg:inline text-[11px] text-emerald-400/90 font-mono">
              Runs only on your Mac (127.0.0.1) • Nothing saved to FreeAgent without your approval
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row gap-6 px-4 sm:px-6 py-6">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <nav
            aria-label="Main Navigation"
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition cursor-pointer min-w-[170px] lg:min-w-0 ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate hidden sm:block">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Local Server Control Panel Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Server className="h-3.5 w-3.5 text-indigo-400" />
                <span>App Helper Engine</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  serverStatus.running
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {serverStatus.running ? "ONLINE" : "STOPPED"}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This little engine runs quietly on your Mac so the app can read files and talk to FreeAgent safely.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {!serverStatus.running ? (
                <button
                  type="button"
                  onClick={() => void handleStartServer()}
                  disabled={serverActionBusy !== null}
                  className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {serverActionBusy === "starting"
                    ? "Starting..."
                    : "Start Helper Engine"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleRestartServer()}
                    disabled={serverActionBusy !== null}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStopServer()}
                    disabled={serverActionBusy !== null}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/70 transition cursor-pointer disabled:opacity-50"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowServerLogs((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 pt-1 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="h-3 w-3" />
                {showServerLogs ? "Hide Technical Activity" : "View Technical Activity"}
              </span>
              <span>{serverStatus.logs.length} lines</span>
            </button>

            {showServerLogs && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
                {serverStatus.logs.length === 0 ? (
                  <div className="text-slate-500">No activity yet.</div>
                ) : (
                  serverStatus.logs.map((line, idx) => (
                    <div key={idx} className="break-all leading-relaxed">
                      {line}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Reference Ledger Info Card */}
          <div className="hidden lg:block bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              <span>Current Business Setup</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Company:</span>
                <span className="font-medium">{settings.companyName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Categories (Folders):</span>
                <span className="font-mono">
                  {referenceData.categories.length} available
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Saved Suppliers:</span>
                <span className="font-mono">
                  {referenceData.contacts.length}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Protected Tax Paths:</span>
                <span className="font-mono text-emerald-400">
                  {settings.forbiddenPaths.length} blocked
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Active Module Workspace */}
        <main className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800 px-4 py-3 text-sm text-rose-200 flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <div className="flex items-center gap-2">
                {!serverStatus.running && (
                  <button
                    type="button"
                    onClick={() => void handleStartServer()}
                    disabled={serverActionBusy !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {serverActionBusy === "starting"
                      ? "Starting Helper..."
                      : "Start Helper Engine"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-xs font-medium text-rose-100 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Integrated Simple Walkthrough Banner (Always visible with clear steps) */}
          <PlainEnglishGuideBanner moduleId={activeTab} />

          {activeTab === "summary" && (
            <FinancialSummaryWidget
              key={`summary-${refreshNonce}`}
              settings={settings}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === "receipts" && (
            <ReceiptExtractorModule
              key={`receipts-${refreshNonce}`}
              settings={settings}
              referenceData={referenceData}
            />
          )}
          {activeTab === "transactions" && (
            <TransactionCategorizerModule
              key={`transactions-${refreshNonce}`}
              settings={settings}
              referenceData={referenceData}
            />
          )}
          {activeTab === "settings" && (
            <SettingsModule
              key={`settings-${refreshNonce}`}
              settings={settings}
              referenceData={referenceData}
              onSettingsUpdated={loadAll}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
