"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditBankModal } from "@/components/finance/edit-bank-modal";
import { Pencil, Check, X, Loader2, Clock, AlertTriangle } from "lucide-react";

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
        <Card className="border-amber-500/40 bg-amber-500/10 shadow-soft">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 mt-0.5 sm:mt-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-amber-400">Edit Request Pending Approval</h4>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">
                    Pending
                  </Badge>
                </div>
                {bank.editReason && (
                  <p className="text-sm text-amber-200/80 mt-1">
                    <span className="font-semibold">Reason:</span> {bank.editReason}
                  </p>
                )}
                {pending && (
                  <div className="mt-2 text-xs text-amber-200/70 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pending.bankName && <div><span className="font-medium">Bank:</span> {pending.bankName}</div>}
                    {pending.branchName && <div><span className="font-medium">Branch:</span> {pending.branchName}</div>}
                    {pending.ifscCode && <div><span className="font-medium">IFSC:</span> {pending.ifscCode}</div>}
                    {pending.product && <div><span className="font-medium">Product:</span> {pending.product}</div>}
                    {pending.openingBalance !== undefined && <div><span className="font-medium">Opening Bal:</span> ₹{pending.openingBalance}</div>}
                  </div>
                )}
              </div>
            </div>

            {isHigherAuthority ? (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleApproveReject("approve")}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" /> Approve Request
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isApproving || isRejecting}
                  onClick={() => handleApproveReject("reject")}
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1.5" /> Reject Request
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Awaiting Admin Approval
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
          <Pencil className="h-4 w-4 mr-1.5" /> Edit Bank Details
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
