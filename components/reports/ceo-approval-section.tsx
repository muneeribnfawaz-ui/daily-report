"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

type ApprovalItemData = {
  particulars: string;
  amountINR: number;
  amountRiyal: number;
  reason: string;
  review: string;
  approval: "pending" | "yes" | "no";
};

type CeoApprovalSectionProps = {
  reportId: string;
  items: ApprovalItemData[];
  isCeo: boolean;
  onUpdate?: () => void;
};

function ApprovalBadge({ status, t }: { status: string; t: any }) {
  if (status === "yes") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        {t("reports.approved")}
      </span>
    );
  }
  if (status === "no") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
        {t("reports.rejected")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      {t("reports.pending")}
    </span>
  );
}

export function CeoApprovalSection({ reportId, items, isCeo, onUpdate }: CeoApprovalSectionProps) {
  const { t } = useTranslation();
  const [localItems, setLocalItems] = useState<ApprovalItemData[]>(
    items.map((item) => ({ ...item }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!items.length) return null;

  const handleSave = async () => {
    setMessage(null);
    setIsSaving(true);
    try {
      const approvalItems = localItems.map((item, index) => ({
        index,
        reason: item.reason,
        review: item.review,
        approval: item.approval
      }));
      const response = await api.patch(`/api/reports/${reportId}/ceo-approval`, { approvalItems });
      setMessage(response.data?.message ?? t("reports.approvalDecisionsSaved"));
      onUpdate?.();
    } catch {
      setMessage(t("reports.failedToSaveDecisions"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/60 dark:bg-amber-950/35">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-200">
            {t("reports.nextDayApprovalRequired")}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {isCeo
              ? t("reports.ceoReviewInstructions")
              : t("reports.awaitingCeoApproval")}
          </p>
        </div>
        <Badge variant="outline">
          {items.length === 1 ? t("reports.itemCount") : t("reports.itemsCount", { count: items.length })}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-amber-300 dark:border-amber-700">
              <th className="py-2 px-2 text-left rtl:text-right text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                {t("reports.particulars")}
              </th>
              <th className="py-2 px-2 text-right rtl:text-left text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                {t("reports.amountInr")}
              </th>
              <th className="py-2 px-2 text-right rtl:text-left text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                {t("reports.amountRiyal")}
              </th>
              <th className="py-2 px-2 text-left rtl:text-right text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                {t("common.reason")}
              </th>
              <th className="py-2 px-2 text-left rtl:text-right text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                {t("reports.review")}
              </th>
              <th className="py-2 px-2 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                {t("reports.approval")}
              </th>
            </tr>
          </thead>
          <tbody>
            {localItems.map((item, index) => (
              <tr
                key={`ceo-approval-${index}`}
                className="border-b border-amber-100 dark:border-amber-900/40"
              >
                <td className="py-2 px-2 text-slate-900 dark:text-slate-100 font-medium">
                  {item.particulars}
                </td>
                <td className="py-2 px-2 text-right rtl:text-left text-slate-900 dark:text-slate-100 tabular-nums">
                  {item.amountINR.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-2 text-right rtl:text-left text-slate-900 dark:text-slate-100 tabular-nums">
                  {item.amountRiyal.toLocaleString("en-SA")}
                </td>
                <td className="py-2 px-2">
                  {isCeo ? (
                    <input
                      type="text"
                      className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={t("common.reason")}
                      value={item.reason}
                      onChange={(e) => {
                        const next = [...localItems];
                        next[index] = { ...next[index], reason: e.target.value };
                        setLocalItems(next);
                      }}
                    />
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">{item.reason || "—"}</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {isCeo ? (
                    <input
                      type="text"
                      className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={t("reports.review")}
                      value={item.review}
                      onChange={(e) => {
                        const next = [...localItems];
                        next[index] = { ...next[index], review: e.target.value };
                        setLocalItems(next);
                      }}
                    />
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">{item.review || "—"}</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center">
                  {isCeo ? (
                    <select
                      className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-medium dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                      value={item.approval}
                      onChange={(e) => {
                        const next = [...localItems];
                        next[index] = {
                          ...next[index],
                          approval: e.target.value as "pending" | "yes" | "no"
                        };
                        setLocalItems(next);
                      }}
                    >
                      <option value="pending">{t("reports.pending")}</option>
                      <option value="yes">{t("reports.approved")}</option>
                      <option value="no">{t("reports.rejected")}</option>
                    </select>
                  ) : (
                    <ApprovalBadge status={item.approval} t={t} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCeo && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {message && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{message}</span>}
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primaryDark text-primary-foreground font-bold">
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
