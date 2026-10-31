import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud
} from "lucide-react";
import type {
  ExtractedReceipt,
  ReceiptTargetType,
  StagedDraft
} from "@rjc/shared";
import {
  approveDraft,
  deleteDraft,
  fetchDrafts,
  getDraftFileUrl,
  updateDraft,
  uploadReceipt,
  type PublicSettings,
  type ReferenceData
} from "../api/client";
import { PlainEnglishTip } from "./PlainEnglishGuide";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif"
]);

function createSampleSonicsPdfBytes(): Uint8Array {
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 260 >>
stream
BT
/Helvetica 14 Tf
50 720 Td
(JLCPCB ELECTRONICS - INVOICE JLC-2026-0891) Tj
0 -24 Td
/Helvetica 10 Tf
(Vendor: JLCPCB / Mouser Electronics UK) Tj
0 -16 Td
(Date: 2026-10-24   Due: 2026-11-24) Tj
0 -16 Td
(Item: 4-Layer Prototype Audio DSP PCBs - Sonics Interface) Tj
0 -20 Td
(Net Amount: GBP 119.00) Tj
0 -16 Td
(VAT 20%: GBP 23.80) Tj
0 -20 Td
(Total Amount: GBP 142.80) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
530
%%EOF`;

  return new TextEncoder().encode(pdfContent);
}

function parseSalesTaxRate(
  suggestedVatRate: ExtractedReceipt["suggestedVatRate"]
): number | null {
  if (!suggestedVatRate || suggestedVatRate === "exempt") {
    return 0;
  }
  const parsed = Number(suggestedVatRate);
  return Number.isFinite(parsed) ? parsed : 20;
}

export function ReceiptExtractorModule({
  settings,
  referenceData
}: {
  settings: PublicSettings | null;
  referenceData: ReferenceData | null;
}) {
  const [drafts, setDrafts] = useState<StagedDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadTargetType, setUploadTargetType] =
    useState<ReceiptTargetType>("bill");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editable form state for currently selected draft
  const [editTargetType, setEditTargetType] =
    useState<ReceiptTargetType>("bill");
  const [editContactOrUserUri, setEditContactOrUserUri] = useState<string>("");
  const [editVendorName, setEditVendorName] = useState<string>("");
  const [editInvoiceReference, setEditInvoiceReference] = useState<string>("");
  const [editTransactionDate, setEditTransactionDate] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string>("GBP");
  const [editNominalCode, setEditNominalCode] = useState<string>("250");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editNetAmount, setEditNetAmount] = useState<string>("");
  const [editVatAmount, setEditVatAmount] = useState<string>("");
  const [editVatRate, setEditVatRate] =
    useState<ExtractedReceipt["suggestedVatRate"]>("0");
  const [editTotalAmount, setEditTotalAmount] = useState<string>("0.00");

  const selectedDraft = useMemo(
    () => drafts.find((d) => d.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId]
  );

  const syncFormWithDraft = (draft: StagedDraft) => {
    setEditTargetType(draft.targetType);
    setEditContactOrUserUri(draft.targetContactOrUserUri ?? "");
    setEditVendorName(draft.extracted.vendorName);
    setEditInvoiceReference(draft.extracted.invoiceReference);
    setEditTransactionDate(draft.extracted.transactionDate);
    setEditDueDate(draft.extracted.dueDate ?? draft.extracted.transactionDate);
    setEditCurrency(draft.extracted.currency || "GBP");
    setEditNominalCode(
      draft.extracted.suggestedNominalCode ||
        referenceData?.categories[0]?.nominalCode ||
        "250"
    );
    setEditDescription(draft.extracted.description);
    setEditNetAmount(
      draft.extracted.netAmount !== null && draft.extracted.netAmount !== undefined
        ? String(draft.extracted.netAmount)
        : ""
    );
    setEditVatAmount(
      draft.extracted.vatAmount !== null && draft.extracted.vatAmount !== undefined
        ? String(draft.extracted.vatAmount)
        : ""
    );
    setEditVatRate(draft.extracted.suggestedVatRate ?? "0");
    setEditTotalAmount(String(draft.extracted.totalAmount));
  };

  const loadAllDrafts = async (preferId?: string) => {
    setLoading(true);
    try {
      const res = await fetchDrafts();
      setDrafts(res.drafts);
      const nextSelected =
        res.drafts.find((d) => d.id === (preferId ?? selectedDraftId)) ??
        res.drafts[0] ??
        null;
      setSelectedDraftId(nextSelected ? nextSelected.id : null);
      if (nextSelected) {
        syncFormWithDraft(nextSelected);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load staged drafts"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllDrafts();
  }, []);

  const handleSelectDraft = (draft: StagedDraft) => {
    setSelectedDraftId(draft.id);
    syncFormWithDraft(draft);
    setErrorMessage(null);
    setStatusBanner(null);
  };

  const validateAndUploadFile = async (file: File) => {
    setErrorMessage(null);
    setStatusBanner(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB). FreeAgent allows a maximum attachment size of 5.0 MB.`
      );
      return;
    }

    const mime = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime) && !file.name.endsWith(".pdf")) {
      setErrorMessage(
        `Unsupported file type (${file.type}). Please upload a PDF, PNG, JPG, or GIF file.`
      );
      return;
    }

    setUploading(true);
    try {
      const { draft } = await uploadReceipt(file, uploadTargetType);
      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)]);
      setSelectedDraftId(draft.id);
      syncFormWithDraft(draft);
      setStatusBanner(
        `AI successfully read "${file.name}"! Please review the details below before approving.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to upload and extract receipt"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void validateAndUploadFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void validateAndUploadFile(file);
    }
  };

  const handleGenerateSampleSonicsReceipt = async () => {
    const samplePdfBytes = createSampleSonicsPdfBytes();
    const demoFile = new File(
      [samplePdfBytes as BlobPart],
      "jlcpcb-sonics-pcb-invoice.pdf",
      { type: "application/pdf" }
    );
    await validateAndUploadFile(demoFile);
  };

  const parsedNet =
    editNetAmount.trim() === "" ? null : Number(editNetAmount);
  const parsedVat =
    editVatAmount.trim() === "" ? null : Number(editVatAmount);
  const parsedTotal = Number(editTotalAmount) || 0;

  const liveMathCheck = useMemo(
    () => {
      if (parsedNet === null || parsedVat === null) {
        return { valid: true, discrepancyPence: 0 };
      }
      const netP = Math.round(parsedNet * 100);
      const vatP = Math.round(parsedVat * 100);
      const totalP = Math.round(parsedTotal * 100);
      const diff = Math.abs(netP + vatP - totalP);
      return { valid: diff <= 1, discrepancyPence: diff };
    },
    [parsedNet, parsedVat, parsedTotal]
  );

  const isVatDisabled =
    settings?.vatMode === "not_registered" ||
    Boolean(editCurrency && editCurrency.toUpperCase() !== "GBP");

  const buildUpdatedPayload = () => ({
    targetType: editTargetType,
    targetContactOrUserUri: editContactOrUserUri.trim() || null,
    extracted: {
      vendorName: editVendorName.trim() || "Unknown Vendor",
      invoiceReference: editInvoiceReference.trim(),
      transactionDate: editTransactionDate || new Date().toISOString().slice(0, 10),
      dueDate: editDueDate || null,
      currency: editCurrency.trim().toUpperCase() || "GBP",
      netAmount: parsedNet,
      vatAmount: parsedVat,
      suggestedVatRate: isVatDisabled ? null : editVatRate,
      totalAmount: parsedTotal,
      suggestedNominalCode: editNominalCode,
      description: editDescription.trim() || "Business expense",
      confidence: selectedDraft?.extracted.confidence ?? 0.9
    }
  });

  const handleSaveDraftChanges = async () => {
    if (!selectedDraft) return;
    setSaving(true);
    setErrorMessage(null);
    setStatusBanner(null);
    try {
      const { draft: updated } = await updateDraft(
        selectedDraft.id,
        buildUpdatedPayload()
      );
      setDrafts((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      syncFormWithDraft(updated);
      setStatusBanner("Draft updated! The math check has been recalculated.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save draft changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!selectedDraft) return;
    setApproving(true);
    setErrorMessage(null);
    setStatusBanner(null);
    try {
      // Save latest form edits before approving
      await updateDraft(selectedDraft.id, buildUpdatedPayload());
      const { draft: approved, resourceUri } = await approveDraft(
        selectedDraft.id
      );
      setDrafts((prev) =>
        prev.map((d) => (d.id === approved.id ? approved : d))
      );
      syncFormWithDraft(approved);
      setStatusBanner(
        `Success! Approved and sent to FreeAgent (${resourceUri}). The temporary file has been cleaned off your disk.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to approve and push draft to FreeAgent"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraft) return;
    setDeleting(true);
    setErrorMessage(null);
    setStatusBanner(null);
    try {
      await deleteDraft(selectedDraft.id);
      const remaining = drafts.filter((d) => d.id !== selectedDraft.id);
      setDrafts(remaining);
      const next = remaining[0] ?? null;
      setSelectedDraftId(next ? next.id : null);
      if (next) {
        syncFormWithDraft(next);
      }
      setStatusBanner("Draft deleted and temporary file removed.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete draft"
      );
    } finally {
      setDeleting(false);
    }
  };

  const categories = referenceData?.categories ?? [];
  const contacts = referenceData?.contacts ?? [];
  const users = referenceData?.users ?? [];

  return (
    <div className="space-y-6">
      {/* Upload Zone & Sample Demo Receipt Generator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Upload an Invoice or Receipt
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Gemini AI reads your receipt and prepares a draft for you. Nothing touches FreeAgent until you click &ldquo;Approve&rdquo;.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Target Selector for Upload */}
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs">
              <button
                type="button"
                onClick={() => setUploadTargetType("bill")}
                className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
                  uploadTargetType === "bill"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Use for invoices paid from the company bank account"
              >
                Company Bill (Supplier Bill)
              </button>
              <button
                type="button"
                onClick={() => setUploadTargetType("expense")}
                className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
                  uploadTargetType === "expense"
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Use for items paid out of your own personal pocket"
              >
                Personal Out-of-Pocket (Director Expense)
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerateSampleSonicsReceipt()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/50 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Try with Demo Receipt (JLCPCB PDF)
            </button>
          </div>
        </div>

        {/* Drag-and-drop Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragActive
              ? "border-emerald-400 bg-emerald-950/20"
              : "border-slate-700/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />
          {uploading ? (
            <>
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-slate-200">
                Reading document with Gemini AI...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Finding supplier, dates, amounts, and checking the math
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-sky-400" />
              <p className="mt-2 text-sm font-medium text-slate-200">
                Drag &amp; drop a PDF invoice or receipt image here, or{" "}
                <span className="text-sky-400 underline">browse your files</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Accepts PDF, PNG, JPG, or GIF up to 5 MB (FreeAgent&apos;s attachment limit)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status & Error Alerts */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
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

      {/* Staged Drafts List + Split-Pane Review Drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Staged Drafts Sidebar List (4 cols) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Your Draft Receipts ({drafts.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any receipt to check and approve
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAllDrafts()}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No draft receipts right now. Upload a file or click &ldquo;Try with Demo Receipt&rdquo; above.
            </div>
          ) : (
            <div className="mt-3 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {drafts.map((draft) => {
                const isSelected = draft.id === selectedDraftId;
                const isPushed = draft.status === "pushed_to_freeagent";

                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => handleSelectDraft(draft)}
                    className={`w-full rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-sky-500 bg-sky-950/30 shadow-md shadow-sky-950/50"
                        : isPushed
                        ? "border-slate-800/80 bg-slate-950/40 opacity-70 hover:opacity-100"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 truncate text-xs">
                          {draft.extracted.vendorName || draft.fileName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                          {draft.extracted.description || draft.fileName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-slate-100">
                          {draft.extracted.currency || "GBP"}{" "}
                          {draft.extracted.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {draft.extracted.transactionDate}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {/* Status Badge */}
                      {isPushed ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Saved to FreeAgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                          Needs Review
                        </span>
                      )}

                      {/* Bill vs Expense Type Badge */}
                      <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                        {draft.targetType === "bill"
                          ? "Company Bill"
                          : "Personal Expense"}
                      </span>

                      {/* Math Check Badge */}
                      {draft.mathCheck.valid ? (
                        <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          Math OK
                        </span>
                      ) : (
                        <span className="rounded border border-amber-500/40 bg-amber-950/50 px-1.5 py-0.5 text-[10px] text-amber-300">
                          Δ {draft.mathCheck.discrepancyPence}p off
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Split-Pane Review Drawer (8 cols) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-8">
          {!selectedDraft ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-slate-400">
              <FileText className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                Click a receipt on the left to check and approve it
              </p>
              <p className="mt-1 text-xs text-slate-500">
                You can review the document preview and edit any number before saving
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Left Pane: Document Preview or Synced Purge Confirmation */}
              <div className="flex flex-col xl:col-span-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Receipt Attachment Preview
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(selectedDraft.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                {selectedDraft.status === "pushed_to_freeagent" ? (
                  <div className="flex flex-1 flex-col justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-5 text-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="h-7 w-7 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-200">
                          Saved to FreeAgent!
                        </h4>
                        <p className="mt-0.5 text-xs text-emerald-300/90">
                          This {selectedDraft.targetType === "bill" ? "company bill" : "personal expense"} is now officially recorded in your books.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-slate-950/70 p-3 text-xs font-mono text-emerald-300 break-all">
                      <div className="text-[10px] uppercase text-slate-400 mb-1">
                        FreeAgent Reference Link:
                      </div>
                      <span className="inline-flex items-center gap-1">
                        {selectedDraft.freeagentResourceUri}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </span>
                    </div>

                    <p className="mt-4 text-[11px] leading-relaxed text-emerald-200/80">
                      <strong>Privacy Protected:</strong> The temporary copy on your Mac was deleted automatically once FreeAgent received the file.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 min-h-[380px]">
                    {selectedDraft.mimeType === "application/pdf" ? (
                      <iframe
                        title={`Preview ${selectedDraft.fileName}`}
                        src={getDraftFileUrl(selectedDraft.id)}
                        className="h-full min-h-[420px] w-full border-0"
                      />
                    ) : (
                      <div className="flex h-full min-h-[380px] items-center justify-center p-3">
                        <img
                          src={getDraftFileUrl(selectedDraft.id)}
                          alt={selectedDraft.fileName}
                          className="max-h-[420px] w-auto rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Pane: Editable Extracted Fields & Math Verification */}
              <div className="space-y-4 xl:col-span-7">
                {/* Math Verification Badge + Confidence */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  {liveMathCheck.valid ? (
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Math Checked: Net + VAT = Total Matches</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span>
                        Numbers Don&apos;t Add Up: {liveMathCheck.discrepancyPence}p difference
                      </span>
                    </div>
                  )}

                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                    AI Match Confidence:{" "}
                    {Math.round((selectedDraft.extracted.confidence ?? 0.9) * 100)}%
                  </span>
                </div>

                {/* How was this paid */}
                <PlainEnglishTip title="How was this paid?">
                  Pick <strong>Company Bill</strong> if paid from the business bank account. Pick <strong>Personal Expense</strong> if paid out of your own personal pocket so the business pays you back.
                </PlainEnglishTip>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Payment Type
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTargetType("bill");
                          setEditContactOrUserUri("");
                        }}
                        className={`rounded py-1.5 font-medium transition cursor-pointer ${
                          editTargetType === "bill"
                            ? "bg-emerald-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Company Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTargetType("expense");
                          setEditContactOrUserUri(
                            settings?.defaultUserUri ?? users[0]?.url ?? ""
                          );
                        }}
                        className={`rounded py-1.5 font-medium transition cursor-pointer ${
                          editTargetType === "expense"
                            ? "bg-sky-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Personal Expense
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      {editTargetType === "bill"
                        ? "Supplier in FreeAgent"
                        : "Person to Reimburse"}
                    </label>
                    {editTargetType === "bill" ? (
                      <select
                        value={editContactOrUserUri}
                        onChange={(e) => setEditContactOrUserUri(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                      >
                        <option value="">
                          Auto-match or create from Vendor Name
                        </option>
                        {contacts.map((c) => {
                          const label =
                            c.organisationName ||
                            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
                            c.url;
                          return (
                            <option key={c.url} value={c.url}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <select
                        value={editContactOrUserUri}
                        onChange={(e) => setEditContactOrUserUri(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                      >
                        <option value="">Default Director (Rob Cavill)</option>
                        {users.map((u) => (
                          <option key={u.url} value={u.url}>
                            {u.firstName} {u.lastName} ({u.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Vendor Name & Invoice Reference */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Supplier / Shop Name
                    </label>
                    <input
                      type="text"
                      value={editVendorName}
                      onChange={(e) => setEditVendorName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Invoice or Receipt Number
                    </label>
                    <input
                      type="text"
                      value={editInvoiceReference}
                      onChange={(e) => setEditInvoiceReference(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dates & Currency */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Date on Receipt
                    </label>
                    <input
                      type="date"
                      value={editTransactionDate}
                      onChange={(e) => setEditTransactionDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Currency
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editCurrency}
                      onChange={(e) =>
                        setEditCurrency(e.target.value.toUpperCase())
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono uppercase text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* FreeAgent Category & Description */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Category Folder in FreeAgent
                    </label>
                    <select
                      value={editNominalCode}
                      onChange={(e) => setEditNominalCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.nominalCode} value={cat.nominalCode}>
                          {cat.nominalCode} — {cat.description} ({cat.group})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Short Note (What was bought)
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Financial Amounts & VAT Rate */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Amount Before Tax (Net)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editNetAmount}
                      onChange={(e) => setEditNetAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      VAT Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editVatAmount}
                      onChange={(e) => setEditVatAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      VAT Rate
                    </label>
                    <select
                      value={isVatDisabled ? "0" : (editVatRate ?? "0")}
                      disabled={isVatDisabled}
                      onChange={(e) =>
                        setEditVatRate(
                          e.target.value as ExtractedReceipt["suggestedVatRate"]
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="20">20%</option>
                      <option value="exempt">exempt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Total Amount Paid
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editTotalAmount}
                      onChange={(e) => setEditTotalAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {isVatDisabled && (
                  <p className="text-[11px] text-slate-500 italic">
                    VAT rate is disabled because RJC Audio Ltd is set to &ldquo;Not VAT Registered&rdquo; or the currency is not GBP.
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => void handleDeleteDraft()}
                    disabled={deleting || approving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/40 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Draft
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveDraftChanges()}
                      disabled={saving || approving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "Saving..." : "Save Edits"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleApproveDraft()}
                      disabled={
                        approving ||
                        selectedDraft.status === "pushed_to_freeagent"
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {approving
                        ? "Saving to FreeAgent..."
                        : selectedDraft.status === "pushed_to_freeagent"
                        ? "Already in FreeAgent"
                        : "Approve & Push to FreeAgent"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
