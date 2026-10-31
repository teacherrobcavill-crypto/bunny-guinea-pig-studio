import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  ShieldCheck
} from "lucide-react";

export type GuideModuleId =
  | "summary"
  | "receipts"
  | "transactions"
  | "settings";

interface ModuleGuideContent {
  title: string;
  whatItDoes: string;
  safetyNote: string;
  steps: Array<{
    step: string;
    detail: string;
  }>;
  glossary: Array<{
    term: string;
    meaning: string;
  }>;
}

const GUIDE_CONTENT: Record<GuideModuleId, ModuleGuideContent> = {
  summary: {
    title: "Money Overview: How Your Business Is Doing",
    whatItDoes:
      "This page gives you a bird's-eye view of RJC Audio Ltd's money. It shows what sales came in, what was spent on costs, what is left over, and what your bank balance should look like over the next 90 days.",
    safetyNote:
      "Safe to click: Nothing on this page changes your books. All figures in the boxes are calculated using strict math, never guessed by AI.",
    steps: [
      {
        step: "1. Look at the 4 Main Boxes",
        detail:
          "Check Total Sales, Total Costs, Profit (before tax), and your Bank Balance today vs. 3 months from now."
      },
      {
        step: "2. Check Any Orange or Blue Badges",
        detail:
          "The badges at the top tell you if there are new bank payments or uploaded receipts waiting for your quick approval."
      },
      {
        step: "3. Click 'Generate Plain-English Briefing'",
        detail:
          "Ask Gemini AI to read these numbers and give you a written breakdown of any spending spikes or cost anomalies."
      }
    ],
    glossary: [
      {
        term: "Total Sales (Turnover)",
        meaning:
          "All money RJC Audio Ltd has billed or earned (e.g. Sonics sales and audio licensing) before subtracting any expenses."
      },
      {
        term: "Product Costs vs. Running Costs",
        meaning:
          "Product Costs (Cost of Sales) are direct costs to make products (like PCBs, parts, packaging). Running Costs (Admin Expenses) are everyday operations (like Cloudflare, software, or travel)."
      },
      {
        term: "Profit Before Tax (Operating Surplus)",
        meaning:
          "What is left over after paying all your business expenses — before UK Corporation Tax is calculated inside FreeAgent."
      },
      {
        term: "90-Day Forecasted Balance",
        meaning:
          "Where your bank account is projected to be in 3 months based on unpaid invoices and upcoming recurring bills."
      }
    ]
  },
  receipts: {
    title: "Upload Receipts: Turn Invoices & Receipts into Drafts",
    whatItDoes:
      "Drop any PDF invoice or photo of a paper receipt here. Gemini AI reads it and fills in the supplier, date, VAT, and total for you so you don't have to type it all out by hand.",
    safetyNote:
      "Nothing is saved to FreeAgent immediately! Everything sits safely in your 'Draft Queue' on this Mac until you review the side-by-side preview and click 'Approve & Push to FreeAgent'.",
    steps: [
      {
        step: "1. Drop or Pick a File (or click 'Try with Demo Receipt')",
        detail:
          "Upload a PDF or image (up to 5 MB). The AI extracts the supplier name, invoice number, date, VAT, and total."
      },
      {
        step: "2. Choose How It Was Paid",
        detail:
          "Click 'Supplier Bill' if RJC Audio Ltd will pay or paid from the company bank account. Click 'Director Expense' if you paid out of your own personal pocket and the company owes you back."
      },
      {
        step: "3. Check the Green Math Badge & Approve",
        detail:
          "Confirm that Net + VAT equals Total (green check). Then click 'Approve & Push to FreeAgent' to save it to your accounting books."
      }
    ],
    glossary: [
      {
        term: "Company Bill (Supplier Bill)",
        meaning:
          "An invoice from a vendor (like JLCPCB, Thomann, or Cloudflare) that the company pays directly from the business bank account."
      },
      {
        term: "Personal Expense (Director Expense)",
        meaning:
          "A business item you paid for with your own personal cash or personal credit card, which the company reimburses to you tax-free."
      },
      {
        term: "Net vs. VAT vs. Gross Total",
        meaning:
          "Net is the price before tax. VAT is the UK sales tax (usually 20%). Gross Total is the final amount paid."
      },
      {
        term: "Category Folder (Nominal Code)",
        meaning:
          "FreeAgent's numbered bookkeeping folder for where an expense lives (e.g. '363 Computer Software' or '450 Audio Equipment')."
      }
    ]
  },
  transactions: {
    title: "Label Bank Payments: Tag Your Money In and Out",
    whatItDoes:
      "When money leaves or enters your Starling or business bank account, FreeAgent imports it as 'Unexplained'. This screen uses Gemini AI to suggest the right category so you can reconcile each bank line in seconds.",
    safetyNote:
      "Clicking 'Suggest Categories with Gemini' only fills in recommendations on your screen. FreeAgent is only updated when you click 'Approve' on a row.",
    steps: [
      {
        step: "1. Click 'Suggest Categories with Gemini'",
        detail:
          "AI reviews your bank descriptions (like 'CLOUDFLARE' or 'STRIPE') and matches each one to a FreeAgent folder."
      },
      {
        step: "2. Review the Suggested Category & Confidence %",
        detail:
          "Read why AI picked that category. You can change any category dropdown or tweak the explanation text anytime."
      },
      {
        step: "3. Click 'Approve' (or 'Approve All High-Confidence')",
        detail:
          "Sends the explanation to FreeAgent so that bank transaction is marked as reconciled and accounted for."
      }
    ],
    glossary: [
      {
        term: "Unexplained Bank Line",
        meaning:
          "A bank payment or deposit imported from your business bank account that hasn't been labelled with a bookkeeping reason yet."
      },
      {
        term: "Confidence Score (e.g. 95% Match)",
        meaning:
          "How confident the AI is based on vendor names. Anything 85%+ is a standard, recognized business expense."
      },
      {
        term: "Short Explanation",
        meaning:
          "The plain-English sentence stored in FreeAgent explaining the payment (e.g. 'Monthly web hosting & CDN for Sonics website')."
      }
    ]
  },
  settings: {
    title: "Settings & Safety: Connect FreeAgent & Manage Keys",
    whatItDoes:
      "Switch between practice mode (Mock Mode) and your real FreeAgent account, save your API keys securely on your Mac, and inspect the built-in HMRC tax guardrails.",
    safetyNote:
      "All API keys and FreeAgent connection secrets are scrambled on your Mac's drive using military-grade encryption (data/vault.enc) and never leave your computer.",
    steps: [
      {
        step: "1. Choose Your Mode",
        detail:
          "Keep it on 'Practice Mode (Demo)' to experiment freely with Sonics numbers without touching any real accounts. Switch to 'FreeAgent Test Server' or 'Live Books' when ready."
      },
      {
        step: "2. Choose Your VAT Setup",
        detail:
          "Select 'VAT Registered' if RJC Audio Ltd reclaims VAT, or 'Not VAT Registered' if you only record the final amount paid."
      },
      {
        step: "3. Add Your Gemini API Key (Optional in Practice Mode)",
        detail:
          "Paste your Google Gemini API key to enable live AI reading of real PDFs and photos, and click 'Save Vault & Settings'."
      }
    ],
    glossary: [
      {
        term: "Practice Mode vs. Test Server vs. Live Books",
        meaning:
          "Practice Mode runs entirely on this computer with fake numbers. Test Server connects to FreeAgent's sandbox. Live Books syncs with your real RJC Audio Ltd accounts."
      },
      {
        term: "Encrypted Vault (data/vault.enc)",
        meaning:
          "A password-protected file on your Mac that scrambles your passwords and keys so no other app or hacker can read them."
      },
      {
        term: "HMRC Compliance Guardrail",
        meaning:
          "A hard-coded safety firewall that stops AI from ever guessing your Corporation Tax or filing tax returns — statutory filings are always done by you inside FreeAgent."
      }
    ]
  }
};

export function PlainEnglishGuideBanner({
  moduleId
}: {
  moduleId: GuideModuleId;
}) {
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const content = GUIDE_CONTENT[moduleId];

  return (
    <div className="mb-6 rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/90 to-indigo-950/30 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/15 text-sky-300">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sky-200">
              {content.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-200">
              {content.whatItDoes}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGlossary((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5 text-sky-300" />
          <span>
            {showGlossary
              ? "Hide Term Translations"
              : "What do these accounting terms mean?"}
          </span>
          {showGlossary ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* 3 Simple Action Steps */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {content.steps.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-800/90 bg-slate-950/60 p-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{item.step}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Reassurance Banner */}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-800/80 pt-3 text-xs text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>{content.safetyNote}</span>
      </div>

      {/* Expandable Plain-English Glossary */}
      {showGlossary && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-slate-800/80 pt-3 sm:grid-cols-2">
          {content.glossary.map((entry, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-3"
            >
              <div className="text-xs font-semibold text-indigo-300">
                {entry.term}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate-300">
                {entry.meaning}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlainEnglishTip({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 mb-3 flex items-start gap-2.5 rounded-lg border border-sky-500/25 bg-sky-950/30 px-3.5 py-2.5 text-xs text-sky-100">
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
      <div className="leading-relaxed">
        <strong className="text-sky-300">{title}: </strong>
        <span className="text-slate-200">{children}</span>
      </div>
    </div>
  );
}
