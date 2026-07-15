"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FINANCE_REPORT_FIELDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ArrowRightLeft } from "lucide-react";

type FinanceFormValues = {
  reportDate: string;
  openingBalance: number;
  cashReceived: number;
  cardSales: number;
  onlinePayments: number;
  expenses: number;
  refunds: number;
  pettyCash: number;
  bankDeposit: number;
  closingCashBalance: number;
};

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
    formState: { errors },
    setValue
  } = useForm<FinanceFormValues>({
    defaultValues: {
      reportDate: initialData?.reportDate || todayStr,
      openingBalance: initialData?.openingBalance ?? 0,
      cashReceived: initialData?.cashReceived ?? 0,
      cardSales: initialData?.cardSales ?? 0,
      onlinePayments: initialData?.onlinePayments ?? 0,
      expenses: initialData?.expenses ?? 0,
      refunds: initialData?.refunds ?? 0,
      pettyCash: initialData?.pettyCash ?? 0,
      bankDeposit: initialData?.bankDeposit ?? 0,
      closingCashBalance: initialData?.closingCashBalance ?? 0
    }
  });

  const watchedValues = watch();

  const computedTotals = useMemo(() => {
    const v = watchedValues;
    const totalIncome = (Number(v.openingBalance) || 0) + (Number(v.cashReceived) || 0) + (Number(v.cardSales) || 0) + (Number(v.onlinePayments) || 0);
    const totalExpenses = (Number(v.expenses) || 0) + (Number(v.refunds) || 0) + (Number(v.pettyCash) || 0);
    const netBalance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netBalance };
  }, [watchedValues]);

  // Auto-compute closing cash balance
  useEffect(() => {
    const closingBalance = computedTotals.netBalance - (Number(watchedValues.bankDeposit) || 0);
    setValue("closingCashBalance", closingBalance);
  }, [computedTotals.netBalance, watchedValues.bankDeposit, setValue]);

  const onSubmit = async (data: FinanceFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Date Picker */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label htmlFor="reportDate" className="text-sm font-semibold text-foreground min-w-[120px]">
          Report Date
        </label>
        <Input
          id="reportDate"
          type="date"
          {...register("reportDate", { required: "Report date is required" })}
          className="max-w-[220px]"
        />
        {errors.reportDate && (
          <span className="text-sm text-destructive">{errors.reportDate.message}</span>
        )}
      </div>

      {/* Finance Table */}
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3.5 text-white dark:from-slate-800 dark:to-slate-700">
          <div className="text-sm font-semibold tracking-wide">Particular</div>
          <div className="text-sm font-semibold tracking-wide text-right">Amount (INR)</div>
          <div className="text-sm font-semibold tracking-wide text-right flex items-center justify-end gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 opacity-60" />
            Amount (SAR)
          </div>
        </div>

        {/* Data Rows */}
        {FINANCE_REPORT_FIELDS.map((field, idx) => {
          const fieldKey = field.key as keyof FinanceFormValues;
          const value = Number(watchedValues[fieldKey]) || 0;
          const sarValue = value * sarRate;
          const isClosing = field.key === "closingCashBalance";

          return (
            <div
              key={field.key}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-0 items-center border-b px-4 py-2.5 transition-colors ${
                idx % 2 === 0 ? "bg-card" : "bg-muted/30"
              } ${isClosing ? "bg-gradient-to-r from-primary/5 to-transparent" : ""}`}
            >
              <div className="flex items-center gap-2">
                {field.group === "income" && <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />}
                {field.group === "expense" && <TrendingDown className="h-3.5 w-3.5 text-danger shrink-0" />}
                {field.group === "neutral" && <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className={`text-sm ${isClosing ? "font-semibold" : ""}`}>{field.label}</span>
              </div>
              <div className="flex justify-end">
                {isClosing ? (
                  <div className="text-right font-bold text-lg tabular-nums text-primary">
                    {formatCurrency(value)}
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(fieldKey, {
                      valueAsNumber: true,
                      min: { value: 0, message: "Must be ≥ 0" }
                    })}
                    className="max-w-[160px] text-right tabular-nums"
                    placeholder="0"
                  />
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground tabular-nums">
                {formatCurrency(sarValue, "SAR")}
              </div>
            </div>
          );
        })}

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Totals */}
        <div className="divide-y bg-gradient-to-b from-muted/20 to-muted/5">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-bold text-success">Total Income</span>
            </div>
            <div className="text-right font-bold text-success tabular-nums">
              {formatCurrency(computedTotals.totalIncome)}
            </div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">
              {formatCurrency(computedTotals.totalIncome * sarRate, "SAR")}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <span className="text-sm font-bold text-danger">Total Expenses</span>
            </div>
            <div className="text-right font-bold text-danger tabular-nums">
              {formatCurrency(computedTotals.totalExpenses)}
            </div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">
              {formatCurrency(computedTotals.totalExpenses * sarRate, "SAR")}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-bold">Net Balance</span>
            </div>
            <div className={`text-right font-bold tabular-nums ${computedTotals.netBalance >= 0 ? "text-success" : "text-danger"}`}>
              {formatCurrency(computedTotals.netBalance)}
            </div>
            <div className="text-right text-sm text-muted-foreground tabular-nums">
              {formatCurrency(computedTotals.netBalance * sarRate, "SAR")}
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate Info */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>Exchange Rate: 1 INR = {sarRate.toFixed(4)} SAR (auto-updated)</span>
      </div>

      {/* Error / Success Messages */}
      {submitError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {submitSuccess}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/finance")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : mode === "edit" ? (
            "Update Report"
          ) : (
            "Submit Finance Report"
          )}
        </Button>
      </div>
    </form>
  );
}
