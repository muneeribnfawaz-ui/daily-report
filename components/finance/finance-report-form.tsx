"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { z } from "zod";
import { financeReportSchema } from "@/lib/validation";

type FinanceFormValues = z.infer<typeof financeReportSchema>;

type FinanceReportFormProps = {
  mode: "create" | "edit";
  initialData?: Partial<FinanceFormValues> & { _id?: string };
};

function formatCurrency(amount: number, currency: "INR" | "SAR" = "INR"): string {
  if (currency === "SAR") {
    return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export function FinanceReportForm({ mode, initialData }: FinanceReportFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors }
  } = useForm<FinanceFormValues>({
    defaultValues: {
      reportDate: initialData?.reportDate || todayStr,
      expenses: initialData?.expenses?.length ? initialData.expenses : [],
      receipts: initialData?.receipts?.length ? initialData.receipts : [],
      payments: initialData?.payments?.length ? initialData.payments : [],
      bankBalances: initialData?.bankBalances?.length ? initialData.bankBalances : [],
      cashBalance: initialData?.cashBalance ?? { pettyCash: 0, total: 0 },
      nextDayApprovals: initialData?.nextDayApprovals?.length ? initialData.nextDayApprovals : [],
      summary: initialData?.summary ?? { totalExpenses: 0, totalReceipts: 0, totalPayments: 0, bankBalance: 0, pettyCashBalance: 0, description: "" },
      exchangeRate: initialData?.exchangeRate || sarRate
    }
  });

  useEffect(() => {
    setValue("exchangeRate", sarRate);
  }, [sarRate, setValue]);

  const { fields: expensesFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenses" });
  const { fields: receiptsFields, append: appendReceipt, remove: removeReceipt } = useFieldArray({ control, name: "receipts" });
  const { fields: paymentsFields, append: appendPayment, remove: removePayment } = useFieldArray({ control, name: "payments" });
  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control, name: "bankBalances" });
  const { fields: nextDayFields, append: appendNextDay, remove: removeNextDay } = useFieldArray({ control, name: "nextDayApprovals" });

  const watchedValues = watch();

  const expensesTotal = (watchedValues.expenses || []).reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const receiptsTotal = (watchedValues.receipts || []).reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const paymentsTotal = (watchedValues.payments || []).reduce((acc, curr) => acc + (Number(curr.amountINR) || 0), 0);
  const banksTotal = (watchedValues.bankBalances || []).reduce((acc, curr) => acc + (Number(curr.closingBalance) || 0), 0);
  const pettyCashTotal = Number(watchedValues.cashBalance?.pettyCash) || 0;

  const onSubmit = async (data: FinanceFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    // Ensure all SAR values are accurately computed right before submit
    data.expenses.forEach(e => { e.amountSAR = e.amountINR * sarRate; });
    data.receipts.forEach(e => { e.amountSAR = e.amountINR * sarRate; });
    data.payments.forEach(e => { e.amountSAR = e.amountINR * sarRate; });
    data.nextDayApprovals.forEach(e => { e.amountSAR = e.amountINR * sarRate; });
    data.exchangeRate = sarRate;
    
    // Assign computed totals
    data.summary.totalExpenses = expensesTotal;
    data.summary.totalReceipts = receiptsTotal;
    data.summary.totalPayments = paymentsTotal;
    data.summary.bankBalance = banksTotal;
    data.summary.pettyCashBalance = pettyCashTotal;
    data.cashBalance.total = pettyCashTotal;

    try {
      const url = mode === "edit" && initialData?._id
        ? `/api/finance-reports/${initialData._id}`
        : "/api/finance-reports";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.message || "Failed to submit finance report");
        return;
      }

      setSubmitSuccess(json.message || "Finance report submitted successfully!");
      setTimeout(() => {
        router.push("/finance");
        router.refresh();
      }, 1200);
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItemTable = (
    title: string,
    fields: Record<"id", string>[],
    append: any,
    remove: any,
    namePrefix: "expenses" | "receipts" | "payments" | "nextDayApprovals"
  ) => {
    return (
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">{title}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => append({ particulars: "", amountINR: 0, amountSAR: 0 })} className="h-8 text-white hover:text-slate-900 bg-white/20 hover:bg-white/90">
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </div>
        <div className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_40px] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b">
            <div>Particulars</div>
            <div className="text-right">Amount (INR)</div>
            <div className="text-right flex justify-end items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Amount (Riyal)</div>
            <div></div>
          </div>
          {fields.map((field, index) => {
            const inrVal = Number(watchedValues[namePrefix]?.[index]?.amountINR) || 0;
            const sarVal = inrVal * sarRate;
            return (
              <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_40px] gap-2 px-4 py-2 items-center border-b last:border-0">
                <Input {...register(`${namePrefix}.${index}.particulars`)} placeholder="Enter particulars" className="h-9" />
                <Input type="number" step="0.01" min="0" {...register(`${namePrefix}.${index}.amountINR`, { valueAsNumber: true })} className="h-9 text-right" placeholder="0" />
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
            <div className="grid grid-cols-[2fr_1fr_1fr_40px] gap-2 px-4 py-3 bg-muted/10 font-bold items-center">
              <div>Total</div>
              <div className="text-right tabular-nums text-primary">
                {formatCurrency(watchedValues[namePrefix].reduce((sum, item) => sum + (Number(item.amountINR) || 0), 0))}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {formatCurrency(watchedValues[namePrefix].reduce((sum, item) => sum + (Number(item.amountINR) || 0), 0) * sarRate, "SAR")}
              </div>
              <div></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label htmlFor="reportDate" className="text-sm font-semibold text-foreground min-w-[120px]">Report Date</label>
        <Input id="reportDate" type="date" {...register("reportDate", { required: "Report date is required" })} className="max-w-[220px]" />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Exchange Rate: 1 INR = {sarRate.toFixed(4)} SAR/Riyal (auto-updated)</span>
      </div>

      {renderItemTable("Expenses", expensesFields, appendExpense, removeExpense, "expenses")}
      {renderItemTable("Receipts", receiptsFields, appendReceipt, removeReceipt, "receipts")}
      {renderItemTable("Payments", paymentsFields, appendPayment, removePayment, "payments")}

      {/* Bank Balances */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">Bank Balance</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => appendBank({ bankName: "", openingBalance: 0, receipts: 0, payments: 0, closingBalance: 0 })} className="h-8 text-white hover:text-slate-900 bg-white/20 hover:bg-white/90">
            <Plus className="h-4 w-4 mr-1" /> Add Bank
          </Button>
        </div>
        <div className="p-0 overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_40px] gap-2 px-4 py-2 bg-muted/30 text-sm font-semibold border-b min-w-[700px]">
            <div>Bank Name</div>
            <div className="text-right">Opening Bal</div>
            <div className="text-right">Receipts</div>
            <div className="text-right">Payments</div>
            <div className="text-right">Closing Bal</div>
            <div></div>
          </div>
          {bankFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_40px] gap-2 px-4 py-2 items-center border-b last:border-0 min-w-[700px]">
              <Input {...register(`bankBalances.${index}.bankName`)} placeholder="Bank name" className="h-9" />
              <Input type="number" step="0.01" {...register(`bankBalances.${index}.openingBalance`, { valueAsNumber: true })} className="h-9 text-right" placeholder="0" />
              <Input type="number" step="0.01" {...register(`bankBalances.${index}.receipts`, { valueAsNumber: true })} className="h-9 text-right" placeholder="0" />
              <Input type="number" step="0.01" {...register(`bankBalances.${index}.payments`, { valueAsNumber: true })} className="h-9 text-right" placeholder="0" />
              <Controller
                control={control}
                name={`bankBalances.${index}.closingBalance`}
                render={({ field }) => {
                  // Auto compute closing
                  const ob = Number(watchedValues.bankBalances?.[index]?.openingBalance) || 0;
                  const rec = Number(watchedValues.bankBalances?.[index]?.receipts) || 0;
                  const pay = Number(watchedValues.bankBalances?.[index]?.payments) || 0;
                  const closing = ob + rec - pay;
                  useEffect(() => { field.onChange(closing) }, [closing, field]);
                  return <div className="text-right tabular-nums text-sm font-semibold">{formatCurrency(closing)}</div>;
                }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeBank(index)} className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {bankFields.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No bank accounts added.</div>}
        </div>
      </div>

      {/* Cash Balance */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
          <h3 className="font-semibold">Cash Balance</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Petty Cash (INR)</label>
            <Input type="number" step="0.01" min="0" {...register("cashBalance.pettyCash", { valueAsNumber: true })} className="max-w-[200px]" placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Total (INR)</label>
            <div className="h-10 flex items-center font-bold text-lg text-primary tabular-nums">
              {formatCurrency(pettyCashTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Next Day Approval Required */}
      {renderItemTable("Next Day Approval Required", nextDayFields, appendNextDay, removeNextDay, "nextDayApprovals")}

      {/* Summary */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft mb-6">
        <div className="border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
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
            <div className="flex justify-between border-b pb-1">
              <span className="text-sm">Bank Balance</span>
              <span className="font-semibold tabular-nums text-primary">{formatCurrency(banksTotal)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-sm">Petty Cash Balance</span>
              <span className="font-semibold tabular-nums">{formatCurrency(pettyCashTotal)}</span>
            </div>
          </div>
          <div></div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Description</label>
            <Textarea {...register("summary.description")} rows={6} placeholder="Enter summary description..." className="resize-none" />
          </div>
        </div>
      </div>

      {submitError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</div>}
      {submitSuccess && <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{submitSuccess}</div>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push("/finance")} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : mode === "edit" ? "Update Report" : "Submit Finance Report"}
        </Button>
      </div>
    </form>
  );
}
