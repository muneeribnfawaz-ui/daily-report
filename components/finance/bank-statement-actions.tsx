"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditBankModal } from "@/components/finance/edit-bank-modal";
import { Pencil, Check, X, Loader2, Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Bank = {
  id: string;
  bankName: string;
  accountNumber?: string;
  maskedAccountNumber?: string;
  branchName?: string;
  ifscCode?: string;
  product?: string;
  openingBalance?: number;
  editStatus?: string;
  editReason?: string;
  pendingEdits?: any;
};

type Props = {
  bank: Bank;
  userRole?: string;
};

export function BankStatementActions({ bank, userRole }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const isHigherAuthority = userRole === "admin" || userRole === "ceo";
  const isPending = bank.editStatus === "pending_approval";
  const pending = bank.pendingEdits as any;

  const handleApproveReject = async (action: "approve" | "reject") => {
    if (action === "approve") setIsApproving(true);
    else setIsRejecting(true);

    try {
      const res = await fetch(`/api/finance/bank-accounts/${bank.id}/approve-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to process edit request");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsApproving(false);
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner if Pending Approval */}
      {isPending && (
        <Card className="border border-amber-300/80 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/40 shadow-soft">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 mt-0.5 sm:mt-0 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-base text-amber-950 dark:text-amber-100 tracking-tight">
                    {t("banks.editRequestPending", "Edit Request Pending Approval")}
                  </h4>
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300/90 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700/60 text-xs font-semibold px-2 py-0.5">
                    {t("banks.pending", "Pending")}
                  </Badge>
                </div>
                {bank.editReason && (
                  <p className="text-sm text-foreground/90 dark:text-slate-200 mt-1.5 leading-relaxed">
                    <span className="font-semibold text-amber-950 dark:text-amber-200">{t("banks.reason", "Reason")}:</span>{" "}
                    <span className="text-foreground dark:text-slate-100">{bank.editReason}</span>
                  </p>
                )}
                {pending && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-white/80 dark:bg-slate-900/70 border border-amber-200/80 dark:border-amber-800/50 rounded-lg p-3 shadow-xs">
                    {pending.bankName && (
                      <div className="min-w-0">
                        <span className="font-medium text-muted-foreground dark:text-slate-400">{t("banks.bank", "Bank")}:</span>{" "}
                        <span className="font-semibold text-foreground dark:text-slate-100 truncate">{pending.bankName}</span>
                      </div>
                    )}
                    {pending.branchName && (
                      <div className="min-w-0">
                        <span className="font-medium text-muted-foreground dark:text-slate-400">{t("banks.branch", "Branch")}:</span>{" "}
                        <span className="font-semibold text-foreground dark:text-slate-100 truncate">{pending.branchName}</span>
                      </div>
                    )}
                    {pending.ifscCode && (
                      <div className="min-w-0">
                        <span className="font-medium text-muted-foreground dark:text-slate-400">{t("banks.ifsc", "IFSC")}:</span>{" "}
                        <span className="font-semibold text-foreground dark:text-slate-100 uppercase truncate">{pending.ifscCode}</span>
                      </div>
                    )}
                    {pending.product && (
                      <div className="min-w-0">
                        <span className="font-medium text-muted-foreground dark:text-slate-400">{t("banks.product", "Product")}:</span>{" "}
                        <span className="font-semibold text-foreground dark:text-slate-100 truncate">{pending.product}</span>
                      </div>
                    )}
                    {pending.openingBalance !== undefined && (
                      <div className="min-w-0">
                        <span className="font-medium text-muted-foreground dark:text-slate-400">{t("banks.openingBalanceShort", "Opening Bal")}:</span>{" "}
                        <span className="font-semibold text-foreground dark:text-slate-100 tabular-nums">
                          ₹{Number(pending.openingBalance).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isHigherAuthority ? (
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleApproveReject("approve")}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {t("banks.approveRequest", "Approve Request")}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="font-medium shadow-sm"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleApproveReject("reject")}
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {t("banks.rejectRequest", "Reject Request")}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60 gap-1.5 font-medium py-1 px-2.5 shrink-0">
                <Clock className="h-3.5 w-3.5" /> {t("banks.awaitingAdminApproval", "Awaiting Admin Approval")}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Header Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="border-primary/40 text-primary hover:bg-primary/10"
          onClick={() => setIsEditModalOpen(true)}
        >
          <Pencil className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {t("banks.editBankDetails", "Edit Bank Details")}
        </Button>
      </div>

      <EditBankModal
        bank={bank}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => router.refresh()}
        userRole={userRole}
      />
    </div>
  );
}
