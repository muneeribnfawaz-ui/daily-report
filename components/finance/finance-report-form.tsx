"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { z } from "zod";
import { financeReportSchema } from "@/lib/validation";
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/constants";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import { encryptPayload } from "@/lib/crypto";

type FinanceFormValues = z.infer<typeof financeReportSchema>;
type FinanceItemValues = FinanceFormValues["receipts"][number];

type FinanceReportFormProps = {
  mode: "create" | "edit";
  formType?: "full" | "money-request";
  initialData?: Partial<FinanceFormValues> & { _id?: string };
};

function formatCurrency(amount: number, currency: "INR" | "SAR" = "INR"): string {
  if (currency === "SAR") {
    return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function isSameBank(bank1?: string, bank2?: string): boolean {
  if (!bank1 || !bank2) return false;
  const clean1 = bank1.trim().toLowerCase();
  const clean2 = bank2.trim().toLowerCase();
  if (clean1 === clean2) return true;

  const hasSuffix1 = clean1.includes(" - ");
  const hasSuffix2 = clean2.includes(" - ");

  // If either name includes an explicit account suffix (e.g. "HDFC Bank - 1234"),
  // require exact matching so items are never duplicated across multiple bank accounts.
  if (hasSuffix1 || hasSuffix2) {
    return false;
  }

  const base1 = clean1.split(" - ")[0].trim();
  const base2 = clean2.split(" - ")[0].trim();
  return base1 === base2;
}

const buildLinkedCashReceipt = (item: any, revisionReference: string): FinanceItemValues => ({
  particulars: "Bank to Cash",
  description: item.description || "",
  bankName: "Cash",
  paymentMode: "cash" as const,
  amountINR: item.amountINR !== undefined && item.amountINR !== null ? item.amountINR : "",
  amountSAR: item.amountSAR || 0,
  priority: item.priority || "medium",
  revisionReference,
  approval: "pending" as const
});

export function FinanceReportForm({ mode, formType = "full", initialData }: FinanceReportFormProps) {
  const router = useRouter();
  const isMoneyRequestOnly = formType === "money-request";
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const handleDeleteMoneyRequest = async () => {
    if (!initialData?._id) return;
    if (!confirm("Are you sure you want to delete this money request?")) return;

    setIsDeleting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/money-requests/${initialData._id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(json.message || "Failed to delete money request");
        return;
      }

      setSubmitSuccess("Money request deleted successfully!");
      setTimeout(() => {
        router.push("/finance/requests");
        router.refresh();
      }, 1000);
    } catch {
      setSubmitError("An unexpected error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: exchangeRateData } = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rate", { cache: "no-store" });
      if (!res.ok) return { rate: 0.0428 };
      const json = await res.json();
      return json.data as { rate: number };
    },
    staleTime: 300_000
  });

  const sarRate = exchangeRateData?.rate ?? 0.0428;
  const todayStr = new Date().toISOString().slice(0, 10);

  const selectedCompanyId = useSelectedCompany();

  // Check if a report for today already exists for the logged in user
  const { data: existingReportId, isLoading: isCheckingExisting } = useQuery({
    queryKey: ["finance-today-check", selectedCompanyId, isMoneyRequestOnly],
    queryFn: async () => {
      if (!selectedCompanyId || selectedCompanyId === "all" || isMoneyRequestOnly) return null;
      const res = await fetch(`/api/finance-reports?workspaceId=${selectedCompanyId}&date=${todayStr}&submittedBy=me&limit=1`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          return String(json.data[0].id);
        }
      }
      return null;
    },
    enabled: mounted && mode === "create" && !isMoneyRequestOnly && !!selectedCompanyId && selectedCompanyId !== "all"
  });

  useEffect(() => {
    if (mode === "create" && !isMoneyRequestOnly && existingReportId) {
      router.replace(`/finance/${existingReportId}/edit`);
    }
  }, [mode, isMoneyRequestOnly, existingReportId, router]);

  // Fetch active bank accounts list for select dropdowns
  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-form-list", selectedCompanyId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (selectedCompanyId && selectedCompanyId !== "all") {
        headers["x-workspace-id"] = selectedCompanyId;
      }
      
      const res = await fetch("/api/finance/bank-accounts", { 
        cache: "no-store",
        headers
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data as { bankName: string; openingBalance: number; account_last_4?: string; product?: string }[];
    }
  });

  // Fetch yesterday's closing balances
  const { data: latestBalances } = useQuery({
    queryKey: ["latest-balances", selectedCompanyId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (selectedCompanyId && selectedCompanyId !== "all") {
        headers["x-workspace-id"] = selectedCompanyId;
      }
      const res = await fetch("/api/finance-reports/latest-balance", { cache: "no-store", headers });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.bankBalances || []) as { bankName: string; closingBalance: number }[];
    }
  });

  const sanitizeItems = (items?: any[]) =>
    (items || []).map((item) => ({
      ...item,
      amountINR: item.amountINR ? item.amountINR : ("" as any)
    }));

  const sanitizeBanks = (banks?: any[]) =>
    (banks || []).map((b) => ({
      ...b,
      openingBalance: b.openingBalance !== undefined && b.openingBalance !== null ? b.openingBalance : ("" as any),
      receipts: b.receipts !== undefined && b.receipts !== null ? b.receipts : ("" as any),
      payments: b.payments !== undefined && b.payments !== null ? b.payments : ("" as any)
    }));

  const isSubmittedRef = useRef(false);

  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const draftKey = useMemo(() => {
    return `finance_report_draft_${formType}_${selectedCompanyId || "default"}`;
  }, [formType, selectedCompanyId]);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors }
  } = useForm<FinanceFormValues>({
    defaultValues: {
      reportDate: initialData?.reportDate || todayStr,
      expenses: sanitizeItems(initialData?.expenses),
      receipts: sanitizeItems(initialData?.receipts),
      payments: sanitizeItems(initialData?.payments),
      bankBalances: sanitizeBanks(initialData?.bankBalances),
      cashBalance: {
        pettyCash: initialData?.cashBalance?.pettyCash ? initialData.cashBalance.pettyCash : ("" as any),
        total: initialData?.cashBalance?.total || 0
      },
      nextDayApprovals: initialData?.nextDayApprovals?.length
        ? sanitizeItems(initialData.nextDayApprovals)
        : isMoneyRequestOnly
        ? [{ particulars: "", description: "", priority: "medium", revisionReference: "", amountINR: "" as any, amountSAR: 0 }]
        : [],
      summary: initialData?.summary ?? { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0, description: "" },
      exchangeRate: initialData?.exchangeRate || sarRate
    }
  });

  useEffect(() => {
    setValue("exchangeRate", sarRate);
  }, [sarRate, setValue]);

  // Restore unsaved draft from localStorage on mount (create mode only)
  useEffect(() => {
    if (!mounted || mode !== "create") return;
    isSubmittedRef.current = false;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === "object") {
          reset({
            ...parsed,
            reportDate: parsed.reportDate || todayStr,
            exchangeRate: sarRate
          });
          setIsDraftRestored(true);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, [mounted, mode, draftKey, reset, todayStr, sarRate]);

  // Auto-save form draft to localStorage on value change (create mode only)
  const watchedValues = watch();

  useEffect(() => {
    if (!mounted || mode !== "create" || isSubmittedRef.current) return;
    try {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        localStorage.setItem(draftKey, JSON.stringify(watchedValues));
      }
    } catch {
      // Ignore storage write errors
    }
  }, [watchedValues, mounted, mode, draftKey]);

  const handleClearDraft = () => {
    isSubmittedRef.current = true;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage remove errors
    }
    setIsDraftRestored(false);
    reset({
      reportDate: todayStr,
      expenses: [],
      receipts: [],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: isMoneyRequestOnly
        ? [{ particulars: "", description: "", priority: "medium", revisionReference: "", amountINR: "" as any, amountSAR: 0 }]
        : [],
      summary: { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0, description: "" },
      exchangeRate: sarRate
    });
  };

  const { fields: expensesFields, prepend: prependExpense, remove: removeExpense, replace: replaceExpenses } = useFieldArray({ control, name: "expenses" });
  const { fields: receiptsFields, prepend: prependReceipt, remove: removeReceipt, replace: replaceReceipts, update: updateReceipt } = useFieldArray({ control, name: "receipts" });
  const { fields: paymentsFields, prepend: prependPayment, remove: removePayment, replace: replacePayments } = useFieldArray({ control, name: "payments" });
  const { fields: bankFields, append: appendBank, remove: removeBank, replace: replaceBank } = useFieldArray({ control, name: "bankBalances" });



  useEffect(() => {
    if (!bankAccounts) return;
    const prevBalances = latestBalances || [];

    const expectedBanks = [
      { displayName: "Cash", baseName: "Cash", defaultOB: 0 },
      ...bankAccounts.map((b) => {
        let displayName = b.bankName;
        if (b.account_last_4) displayName += ` - ${b.account_last_4}`;
        return { displayName, baseName: b.bankName, defaultOB: b.openingBalance || 0 };
      })
    ];

    if (mode === "create" && bankFields.length === 0) {
      const defaultBanks = expectedBanks.map(eb => {
        const prevBank = prevBalances.find(p => isSameBank(p.bankName, eb.displayName));
        return {
          bankName: eb.displayName,
          openingBalance: prevBank ? prevBank.closingBalance : eb.defaultOB,
          receipts: 0 as any,
          payments: 0 as any,
          closingBalance: 0
        };
      });
      replaceBank(defaultBanks);
    } else {
      const currentList = [...(watchedValues.bankBalances || [])];
      let updated = false;

      expectedBanks.forEach(eb => {
        const matchingIdx = currentList.findIndex(b => isSameBank(b.bankName, eb.displayName));
        const prevBank = prevBalances.find(p => isSameBank(p.bankName, eb.displayName));
        const targetOB = prevBank ? prevBank.closingBalance : eb.defaultOB;

        if (matchingIdx === -1) {
          currentList.push({
            bankName: eb.displayName,
            openingBalance: targetOB,
            receipts: 0 as any,
            payments: 0 as any,
            closingBalance: 0
          });
          updated = true;
        } else {
          const existing = currentList[matchingIdx];
          const existingOB = Number(existing.openingBalance) || 0;
          if (existingOB === 0 && targetOB && targetOB !== 0) {
            currentList[matchingIdx] = {
              ...existing,
              openingBalance: targetOB
            };
            updated = true;
          }
        }
      });

      if (updated) {
        replaceBank(currentList);
      }
    }
  }, [bankAccounts, latestBalances, mode, bankFields.length, replaceBank]);
  const { fields: nextDayFields, prepend: prependNextDay, remove: removeNextDay } = useFieldArray({ control, name: "nextDayApprovals" });

  const watchedBankBalances = watch("bankBalances");
  const bankOptions = useMemo(() => {
    const list = new Set<string>();
    list.add("Cash");
    if (bankAccounts) {
      bankAccounts.forEach((b) => {
        let displayName = b.bankName;
        if (b.account_last_4) displayName += ` - ${b.account_last_4}`;
        if (displayName && displayName.trim()) list.add(displayName.trim());
      });
    }
    if (Array.isArray(watchedBankBalances)) {
      watchedBankBalances.forEach((b) => {
        if (b?.bankName && b.bankName.trim()) {
          list.add(b.bankName.trim());
        }
      });
    }
    return Array.from(list);
  }, [bankAccounts, watchedBankBalances]);

  const upsertLinkedCashReceipt = (source: "expenses" | "payments", index: number, item: any) => {
    let revisionReference = item.revisionReference;
    if (!revisionReference || !revisionReference.startsWith("link_cash_")) {
      revisionReference = `link_cash_${Date.now()}_${source === "expenses" ? "e" : "p"}${index}`;
      setValue(`${source}.${index}.revisionReference`, revisionReference, { shouldDirty: true });
    }

    const receipts = getValues("receipts") || [];
    const linkedIdx = receipts.findIndex((r: any) => r.revisionReference === revisionReference);
    const expectedReceipt = buildLinkedCashReceipt(item, revisionReference);

    if (linkedIdx === -1) {
      prependReceipt(expectedReceipt);
      return;
    }

    updateReceipt(linkedIdx, {
      ...receipts[linkedIdx],
      ...expectedReceipt
    });
  };

  const removeLinkedCashReceipt = (source: "expenses" | "payments", index: number, revisionReference?: string) => {
    if (!revisionReference?.startsWith("link_cash_")) return;
    const receipts = getValues("receipts") || [];
    const linkedIdx = receipts.findIndex((r: any) => r.revisionReference === revisionReference);
    if (linkedIdx !== -1) {
      removeReceipt(linkedIdx);
    }
    setValue(`${source}.${index}.revisionReference`, "", { shouldDirty: true });
  };

  useEffect(() => {
    // Process payments
    (watchedValues.payments || []).forEach((p, i) => {
      if (p.paymentMode === "transfer_to_cash") {
        if (!p.revisionReference || !p.revisionReference.startsWith("link_cash_")) {
          const ref = `link_cash_${Date.now()}_p${i}`;
          setValue(`payments.${i}.revisionReference`, ref, { shouldDirty: true });
          prependReceipt(buildLinkedCashReceipt(p, ref));
        } else {
          // Sync if changed
          const linkedIdx = (watchedValues.receipts || []).findIndex((r: any) => r.revisionReference === p.revisionReference);
          if (linkedIdx !== -1) {
            const r = watchedValues.receipts[linkedIdx];
            const expectedReceipt = buildLinkedCashReceipt(p, p.revisionReference);
            if (
              String(r.particulars || "") !== String(expectedReceipt.particulars || "") ||
              String(r.description || "") !== String(expectedReceipt.description || "") ||
              String(r.bankName || "") !== String(expectedReceipt.bankName || "") ||
              String(r.paymentMode || "") !== String(expectedReceipt.paymentMode || "") ||
              String(r.amountINR ?? "") !== String(expectedReceipt.amountINR ?? "")
            ) {
              updateReceipt(linkedIdx, {
                ...r,
                ...expectedReceipt
              });
            }
          } else {
            // Receipt was deleted by user, recreate it
            prependReceipt(buildLinkedCashReceipt(p, p.revisionReference));
          }
        }
      } else if (p.revisionReference && p.revisionReference.startsWith("link_cash_")) {
        // Changed away from transfer_to_cash
        const linkedIdx = (watchedValues.receipts || []).findIndex((r: any) => r.revisionReference === p.revisionReference);
        if (linkedIdx !== -1) {
          removeReceipt(linkedIdx);
        }
        setValue(`payments.${i}.revisionReference`, "", { shouldDirty: true });
      }
    });

    // Process expenses
    (watchedValues.expenses || []).forEach((e, i) => {
      if (e.paymentMode === "transfer_to_cash") {
        if (!e.revisionReference || !e.revisionReference.startsWith("link_cash_")) {
          const ref = `link_cash_${Date.now()}_e${i}`;
          setValue(`expenses.${i}.revisionReference`, ref, { shouldDirty: true });
          prependReceipt(buildLinkedCashReceipt(e, ref));
        } else {
          // Sync if changed
          const linkedIdx = (watchedValues.receipts || []).findIndex((r: any) => r.revisionReference === e.revisionReference);
          if (linkedIdx !== -1) {
            const r = watchedValues.receipts[linkedIdx];
            const expectedReceipt = buildLinkedCashReceipt(e, e.revisionReference);
            if (
              String(r.particulars || "") !== String(expectedReceipt.particulars || "") ||
              String(r.description || "") !== String(expectedReceipt.description || "") ||
              String(r.bankName || "") !== String(expectedReceipt.bankName || "") ||
              String(r.paymentMode || "") !== String(expectedReceipt.paymentMode || "") ||
              String(r.amountINR ?? "") !== String(expectedReceipt.amountINR ?? "")
            ) {
              updateReceipt(linkedIdx, {
                ...r,
                ...expectedReceipt
              });
            }
          } else {
            // Receipt was deleted by user, recreate it
            prependReceipt(buildLinkedCashReceipt(e, e.revisionReference));
          }
        }
      } else if (e.revisionReference && e.revisionReference.startsWith("link_cash_")) {
        // Changed away from transfer_to_cash
        const linkedIdx = (watchedValues.receipts || []).findIndex((r: any) => r.revisionReference === e.revisionReference);
        if (linkedIdx !== -1) {
          removeReceipt(linkedIdx);
        }
        setValue(`expenses.${i}.revisionReference`, "", { shouldDirty: true });
      }
    });
  }, [watchedValues.payments, watchedValues.expenses, watchedValues.receipts, prependReceipt, updateReceipt, removeReceipt, setValue]);

  const expensesTotal = (watchedValues.expenses || []).reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const receiptsTotal = (watchedValues.receipts || [])
    .filter((r: any) => r.particulars !== "Bank to Cash" && !r.revisionReference?.startsWith("link_cash_") && r.paymentMode !== "transfer_to_cash")
    .reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const paymentsTotal = (watchedValues.payments || []).reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const banksTotal = (watchedValues.bankBalances || [])
    .filter((b: any) => b.bankName !== "Cash")
    .reduce((acc, curr) => acc + (Number(curr.closingBalance) || 0), 0);
  const pettyCashTotal = Number((watchedValues.bankBalances || []).find((b: any) => b.bankName === "Cash")?.closingBalance) || 0;

  const onSubmit = async (data: FinanceFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    // Validate that no bank or cash account is overdrawn (only for full report, NOT for money request)
    if (!isMoneyRequestOnly) {
      for (const bank of data.bankBalances || []) {
        const bName = bank.bankName;
        const ob = Number(bank.openingBalance) || 0;
        
        const rec = (data.receipts || [])
          .filter(r => isSameBank(r.bankName, bName))
          .reduce((sum, r) => sum + (Number(r.amountINR) || 0), 0);
          
        const pay = (data.payments || [])
          .filter(p => isSameBank(p.bankName, bName))
          .reduce((sum, p) => sum + (Number(p.amountINR) || 0), 0)
          + (data.expenses || [])
          .filter(e => isSameBank(e.bankName, bName))
          .reduce((sum, e) => sum + (Number(e.amountINR) || 0), 0);

        const closing = ob + rec - pay;

        if (closing < 0) {
          setSubmitError(`Insufficient funds: Payments and expenses (₹${pay}) exceed the available balance (₹${ob + rec}) for ${bName}.`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    // Ensure all numeric and SAR values are accurately computed right before submit
    data.expenses = (data.expenses || []).map((e) => ({
      ...e,
      amountINR: Number(e.amountINR) || 0,
      amountSAR: (Number(e.amountINR) || 0) * sarRate
    }));
    data.receipts = (data.receipts || []).map((e) => ({
      ...e,
      amountINR: Number(e.amountINR) || 0,
      amountSAR: (Number(e.amountINR) || 0) * sarRate
    }));
    data.payments = (data.payments || []).map((e) => ({
      ...e,
      amountINR: Number(e.amountINR) || 0,
      amountSAR: (Number(e.amountINR) || 0) * sarRate
    }));
    data.nextDayApprovals = (data.nextDayApprovals || []).map((e) => ({
      ...e,
      amountINR: Number(e.amountINR) || 0,
      amountSAR: (Number(e.amountINR) || 0) * sarRate
    }));
    data.bankBalances = (data.bankBalances || []).map((b) => {
      const ob = Number(b.openingBalance) || 0;
      const rec = (data.receipts || [])
        .filter(r => isSameBank(r.bankName, b.bankName))
        .reduce((sum, r) => sum + (Number(r.amountINR) || 0), 0);
      const pay = (data.payments || [])
        .filter(p => isSameBank(p.bankName, b.bankName))
        .reduce((sum, p) => sum + (Number(p.amountINR) || 0), 0)
        + (data.expenses || [])
        .filter(e => isSameBank(e.bankName, b.bankName))
        .reduce((sum, e) => sum + (Number(e.amountINR) || 0), 0);
      return {
        ...b,
        openingBalance: ob,
        receipts: rec,
        payments: pay,
        closingBalance: ob + rec - pay
      };
    });
    data.cashBalance = {
      pettyCash: pettyCashTotal,
      total: pettyCashTotal
    };
    data.exchangeRate = sarRate;
    
    // Assign computed totals
    data.summary.totalExpenses = expensesTotal;
    data.summary.totalReceipts = receiptsTotal;
    data.summary.totalPayments = paymentsTotal;
    data.summary.bankBalance = banksTotal;
    data.summary.pettyCashBalance = pettyCashTotal;

    try {
      const payload = { ...data, workspaceId: selectedCompanyId && selectedCompanyId !== "all" ? selectedCompanyId : null };

      const url = isMoneyRequestOnly
        ? (mode === "edit" && initialData?._id ? `/api/money-requests/${initialData._id}` : "/api/money-requests")
        : (mode === "edit" && initialData?._id ? `/api/finance-reports/${initialData._id}` : "/api/finance-reports");
      const method = mode === "edit" ? "PUT" : "POST";

      const encryptedData = await encryptPayload(payload);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.message || "Failed to submit finance report");
        return;
      }

      isSubmittedRef.current = true;
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage removal error
      }
      setIsDraftRestored(false);

      setSubmitSuccess(json.message || (isMoneyRequestOnly ? "Money request submitted successfully!" : "Finance report submitted successfully!"));
      setTimeout(() => {
        router.push(isMoneyRequestOnly ? "/finance/requests" : "/finance");
        router.refresh();
      }, 1200);
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBankBalances = () => (
    <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
      <div className="flex items-center justify-between border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
        <h3 className="font-semibold">Bank & Cash Balances</h3>
      </div>
      <div className="p-0 overflow-x-auto">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b min-w-[700px]">
          <div>Bank Name</div>
          <div className="text-right">Opening Bal</div>
          <div className="text-right">Receipts</div>
          <div className="text-right">Payments</div>
          <div className="text-right">Closing Bal</div>
        </div>
        {bankFields.map((field, index) => {
          const currentBankName = watchedValues.bankBalances?.[index]?.bankName || (field as any).bankName;
          const matchingBankInfo = bankAccounts?.find(b => isSameBank(b.bankName, currentBankName));
          const ob = Number(watchedValues.bankBalances?.[index]?.openingBalance) || 0;

          const rec = (watchedValues.receipts || [])
            .filter(r => isSameBank(r.bankName, currentBankName))
            .reduce((sum, r) => sum + (Number(r.amountINR) || 0), 0);

          const pay = (watchedValues.payments || [])
            .filter(p => isSameBank(p.bankName, currentBankName))
            .reduce((sum, p) => sum + (Number(p.amountINR) || 0), 0)
            + (watchedValues.expenses || [])
            .filter(e => isSameBank(e.bankName, currentBankName))
            .reduce((sum, e) => sum + (Number(e.amountINR) || 0), 0);

          const closing = ob + rec - pay;

          return (
            <div key={field.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 items-center border-b last:border-0 min-w-[700px]">
              <div className="flex flex-col">
                <Input {...register(`bankBalances.${index}.bankName`)} className="h-9 font-medium bg-muted/30 cursor-not-allowed text-muted-foreground" readOnly />
                {matchingBankInfo?.product && (
                  <span className="text-xs text-muted-foreground mt-1 px-1">{matchingBankInfo.product}</span>
                )}
              </div>
              <Input
                type="number"
                step="any"
                min="0"
                {...register(`bankBalances.${index}.openingBalance`)}
                className="h-9 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-muted/30 cursor-not-allowed text-muted-foreground"
                placeholder="0"
                readOnly
              />
              <div className="text-right tabular-nums text-sm font-medium text-success py-2">{formatCurrency(rec)}</div>
              <div className="text-right tabular-nums text-sm font-medium text-danger py-2">{formatCurrency(pay)}</div>
              <div className="text-right tabular-nums text-sm font-semibold py-2">{formatCurrency(closing)}</div>
            </div>
          );
        })}
        {bankFields.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No bank accounts registered in this workspace.</div>}
      </div>
    </div>
  );

  const renderItemTable = (
    title: string,
    fields: Record<"id", string>[],
    prepend: any,
    remove: any,
    namePrefix: "expenses" | "receipts" | "payments" | "nextDayApprovals"
  ) => {
    const isApproval = namePrefix === "nextDayApprovals";
    const gridCols = isApproval
      ? "grid-cols-[1.2fr_1.5fr_100px_1fr_1fr_40px] min-w-[800px]"
      : "grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_0.8fr_40px] min-w-[900px]";

    return (
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="flex items-center justify-between border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
          <h3 className="font-semibold">{title}</h3>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              prepend(
                isApproval
                  ? { particulars: "", description: "", priority: "medium", amountINR: "" as any, amountSAR: 0 }
                  : { particulars: "", description: "", bankName: "", paymentMode: "", amountINR: "" as any, amountSAR: 0 }
              )
            }
            className="h-8 bg-primary hover:bg-primaryDark text-primary-foreground font-semibold border-none shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>
        <div className="p-0 overflow-x-auto">
          <div className={`grid ${gridCols} gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b`}>
            <div>Particulars</div>
            <div>{isApproval ? "Reason / Details" : "Description"}</div>
            {isApproval && <div>Priority</div>}
            {!isApproval && <div>Bank / Cash</div>}
            {!isApproval && <div>Payment Mode</div>}
            <div className="text-right">Amount (INR)</div>
            <div className="text-right flex justify-end items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Amount (Riyal)</div>
            <div></div>
          </div>
          {fields.map((field, index) => {
            const inrVal = Number(watchedValues[namePrefix]?.[index]?.amountINR) || 0;
            const sarVal = inrVal * sarRate;
            return (
              <div key={field.id} className={`grid ${gridCols} gap-2 px-4 py-2 items-center border-b last:border-0`}>
                {(() => {
                  const { onChange: pOnChange, ...pRegister } = register(`${namePrefix}.${index}.particulars`);
                  return (
                    <Input
                      {...pRegister}
                      onChange={(e) => {
                        pOnChange(e);
                        const val = e.target.value;
                        setValue(`${namePrefix}.${index}.particulars`, val, { shouldDirty: true });
                        if (namePrefix === "expenses" || namePrefix === "payments") {
                          const currentItem = { ...(getValues(namePrefix)?.[index] || {}), particulars: val };
                          if (currentItem.paymentMode === "transfer_to_cash") {
                            upsertLinkedCashReceipt(namePrefix, index, currentItem);
                          }
                        }
                      }}
                      placeholder="Enter particulars"
                      className="h-9"
                    />
                  );
                })()}
                {(() => {
                  const { onChange: dOnChange, ...dRegister } = register(`${namePrefix}.${index}.description`);
                  return (
                    <Input
                      {...dRegister}
                      onChange={(e) => {
                        dOnChange(e);
                        const val = e.target.value;
                        setValue(`${namePrefix}.${index}.description`, val, { shouldDirty: true });
                        if (namePrefix === "expenses" || namePrefix === "payments") {
                          const currentItem = { ...(getValues(namePrefix)?.[index] || {}), description: val };
                          if (currentItem.paymentMode === "transfer_to_cash") {
                            upsertLinkedCashReceipt(namePrefix, index, currentItem);
                          }
                        }
                      }}
                      placeholder={isApproval ? "Reason for request" : "Payment description / details"}
                      className="h-9"
                    />
                  );
                })()}
                {isApproval && (
                  <select
                    {...register(`${namePrefix}.${index}.priority`)}
                    className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                )}
                {!isApproval && (() => {
                  const { onChange: bankOnChange, onBlur: bankOnBlur, name: bankName, ref: bankRef } = register(`${namePrefix}.${index}.bankName`);
                  return (
                    <select
                      name={bankName}
                      ref={bankRef}
                      onBlur={bankOnBlur}
                      value={watchedValues[namePrefix]?.[index]?.bankName || ""}
                      onChange={(event) => {
                        bankOnChange(event);
                        const nextBankName = event.target.value;
                        setValue(`${namePrefix}.${index}.bankName`, nextBankName, { shouldDirty: true });
                        if (!nextBankName) {
                          setValue(`${namePrefix}.${index}.paymentMode`, "", { shouldDirty: true });
                          if (namePrefix === "expenses" || namePrefix === "payments") {
                            removeLinkedCashReceipt(namePrefix, index, watchedValues[namePrefix]?.[index]?.revisionReference);
                          }
                        } else if (namePrefix === "receipts" && nextBankName === "Cash") {
                          setValue(`${namePrefix}.${index}.paymentMode`, "cash", { shouldDirty: true });
                        } else if (nextBankName !== "Cash" && watchedValues[namePrefix]?.[index]?.paymentMode === "cash") {
                          setValue(`${namePrefix}.${index}.paymentMode`, "", { shouldDirty: true });
                        }
                      }}
                      className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full"
                    >
                      <option value="">Select Bank</option>
                      {bankOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                {!isApproval && (() => {
                   const selectedBank = watchedValues[namePrefix]?.[index]?.bankName;
                   if (!selectedBank) {
                     return <div className="h-9 text-xs text-muted-foreground/60 italic flex items-center px-2">Select bank first</div>;
                   }
                   const { onChange: rOnChange, onBlur: rOnBlur, name: rName, ref: rRef } = register(`${namePrefix}.${index}.paymentMode`);
                   return (
                     <select
                       name={rName}
                       ref={rRef}
                       onBlur={rOnBlur}
                       value={watchedValues[namePrefix]?.[index]?.paymentMode || ""}
                       onChange={(event) => {
                         rOnChange(event);
                         const nextPaymentMode = event.target.value;
                         const currentItem = {
                           ...(getValues(namePrefix)?.[index] || {}),
                           paymentMode: nextPaymentMode
                         };

                         if ((namePrefix === "expenses" || namePrefix === "payments") && nextPaymentMode === "transfer_to_cash") {
                           upsertLinkedCashReceipt(namePrefix, index, currentItem);
                         } else if (namePrefix === "expenses" || namePrefix === "payments") {
                           removeLinkedCashReceipt(namePrefix, index, currentItem.revisionReference);
                         }
                       }}
                       className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full"
                     >
                       <option value="">Select Mode</option>
                       {(selectedBank === "Cash" 
                         ? ["cash"] 
                         : PAYMENT_MODES.filter(m => m !== "cash")
                       ).map((mode) => (
                         <option key={mode} value={mode}>
                           {PAYMENT_MODE_LABELS[mode as keyof typeof PAYMENT_MODE_LABELS]}
                         </option>
                       ))}
                     </select>
                   );
                })()}
                {(() => {
                  const { onChange: aOnChange, ...aRegister } = register(`${namePrefix}.${index}.amountINR`);
                  return (
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      {...aRegister}
                      onChange={(e) => {
                        aOnChange(e);
                        const val = e.target.value;
                        setValue(`${namePrefix}.${index}.amountINR`, val as any, { shouldDirty: true });
                        if (namePrefix === "expenses" || namePrefix === "payments") {
                          const currentItem = { ...(getValues(namePrefix)?.[index] || {}), amountINR: val };
                          if (currentItem.paymentMode === "transfer_to_cash") {
                            upsertLinkedCashReceipt(namePrefix, index, currentItem);
                          }
                        }
                      }}
                      className="h-9 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter amount"
                    />
                  );
                })()}
                <div className="text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(sarVal, "SAR")}</div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 p-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {fields.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No items added.</div>
          )}
          {fields.length > 0 && (
            <div className={`grid ${gridCols} gap-2 px-4 py-3 bg-muted/10 font-bold items-center`}>
              <div className={isApproval ? "col-span-3" : "col-span-4"}>Total</div>
              <div className="text-right tabular-nums text-primary">
                {formatCurrency((watchedValues[namePrefix] || []).reduce((sum, item) => sum + (Number(item?.amountINR) || 0), 0))}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {formatCurrency((watchedValues[namePrefix] || []).reduce((sum, item) => sum + (Number(item?.amountINR) || 0), 0) * sarRate, "SAR")}
              </div>
              <div></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (mounted && mode === "create" && isCheckingExisting) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 font-medium text-muted-foreground">Checking for existing report...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {isDraftRestored && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚡ Unsaved draft restored:</span>
            <span>Your form inputs have been automatically restored from browser storage.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearDraft}
            className="h-8 text-xs border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 font-medium"
          >
            Clear Draft
          </Button>
        </div>
      )}

      {!isMoneyRequestOnly && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="reportDate" className="text-sm font-semibold text-foreground min-w-[120px]">Report Date</label>
          <Input id="reportDate" type="date" {...register("reportDate")} readOnly className="max-w-[220px] bg-muted/30 cursor-not-allowed text-muted-foreground font-medium" />
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Exchange Rate: 1 INR = {sarRate.toFixed(4)} SAR/Riyal (auto-updated)</span>
      </div>

      {isMoneyRequestOnly ? (
        <>
          {renderBankBalances()}
          {renderItemTable("Next Day Money Request (Approval Required)", nextDayFields, prependNextDay, removeNextDay, "nextDayApprovals")}
        </>
      ) : (
        <>
          {renderItemTable("Expenses", expensesFields, prependExpense, removeExpense, "expenses")}
          {renderItemTable("Receipts", receiptsFields, prependReceipt, removeReceipt, "receipts")}
          {renderItemTable("Payments", paymentsFields, prependPayment, removePayment, "payments")}

          {/* Bank Balances */}
          {renderBankBalances()}


          <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
            <div className="border-b border-primary/20 bg-sidebar px-4 py-3 text-sidebarText">
              <h3 className="font-semibold">Summary</h3>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_2fr] gap-4 p-4 bg-muted/10 items-start">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm">Total Expenses</span>
                  <span className="font-semibold tabular-nums text-danger">{formatCurrency(expensesTotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm">Total Receipts</span>
                  <span className="font-semibold tabular-nums text-success">{formatCurrency(receiptsTotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-sm">Total Payments</span>
                  <span className="font-semibold tabular-nums text-danger">{formatCurrency(paymentsTotal)}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-sm">Bank & Cash Balances</span>
                  <span className="font-semibold tabular-nums text-primary">{formatCurrency(banksTotal)}</span>
                </div>
              </div>
              <div></div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Description</label>
                <Textarea {...register("summary.description")} rows={6} placeholder="Enter summary description..." className="resize-none" />
              </div>
            </div>
          </div>
        </>
      )}

      {submitError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</div>}
      {submitSuccess && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{submitSuccess}</div>}

      <div className="flex items-center justify-between pt-2">
        {mode === "edit" && isMoneyRequestOnly && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteMoneyRequest}
            disabled={isSubmitting || isDeleting}
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="mr-1.5 h-4 w-4" /> Delete Request</>
            )}
          </Button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <Button type="button" variant="outline" onClick={() => router.push(isMoneyRequestOnly ? "/finance/requests" : "/finance")} disabled={isSubmitting || isDeleting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || isDeleting} className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold shadow-md">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : isMoneyRequestOnly ? (
              mode === "edit" ? "Update Request" : "Submit Money Request"
            ) : mode === "edit" ? (
              "Update Report"
            ) : (
              "Submit Finance Report"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
