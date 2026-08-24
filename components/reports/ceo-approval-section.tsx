"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

function ApprovalBadge({ status }: { status: string }) {
  if (status === "yes") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Approved
      </span>
    );
  }
  if (status === "no") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      Pending
    </span>
  );
}

export function CeoApprovalSection({ reportId, items, isCeo, onUpdate }: CeoApprovalSectionProps) {
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
      setMessage(response.data?.message ?? "Approval decisions saved.");
      onUpdate?.();
    } catch {
      setMessage("Failed to save approval decisions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/60 dark:bg-amber-950/35">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-200">
            Next Day Approval Required
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {isCeo
              ? "Review each item and provide your Reason, Review, and Approval decision."
              : "These items are awaiting CEO approval."}
          </p>
        </div>
        <Badge variant="outline">{items.length} item{items.length === 1 ? "" : "s"}</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-amber-300 dark:border-amber-700">
              <th className="py-2 px-2 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                Particulars
              </th>
              <th className="py-2 px-2 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                Amount (INR)
              </th>
              <th className="py-2 px-2 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                Amount (Riyal)
              </th>
              <th className="py-2 px-2 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                Reason
              </th>
              <th className="py-2 px-2 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">
                Review
              </th>
              <th className="py-2 px-2 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">
                Approval
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
                <td className="py-2 px-2 text-right text-slate-900 dark:text-slate-100 tabular-nums">
                  {item.amountINR.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-2 text-right text-slate-900 dark:text-slate-100 tabular-nums">
                  {item.amountRiyal.toLocaleString("en-SA")}
                </td>
                <td className="py-2 px-2">
                  {isCeo ? (
                    <input
                      type="text"
                      className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Reason"
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
                      placeholder="Review"
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
                      className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-medium dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
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
                      <option value="pending">Pending</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <ApprovalBadge status={item.approval} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCeo ? (
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Decisions"}
          </Button>
          {message ? (
            <span className="text-sm text-emerald-700 dark:text-emerald-300">{message}</span>
          ) : null}
        </div>
      ) : null}

      {!isCeo && message ? (
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</div>
      ) : null}
    </div>
  );
}
