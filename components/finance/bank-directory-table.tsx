"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditBankModal } from "@/components/finance/edit-bank-modal";
import { Pencil, Check, X, Loader2, Clock } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

type Bank = {
  id: string;
  bankName: string;
  maskedAccountNumber: string;
  product?: string;
  branchName?: string;
  ifscCode?: string;
  currentBalance?: number;
  openingBalance?: number;
  editStatus?: string;
  editReason?: string;
  pendingEdits?: any;
};

type Props = {
  banks: Bank[];
  userRole?: string;
};

export function BankDirectoryTable({ banks, userRole }: Props) {
  const router = useRouter();
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isHigherAuthority = userRole === "admin" || userRole === "ceo";

  const handleApproveReject = async (e: React.MouseEvent, bankId: string, action: "approve" | "reject") => {
    e.stopPropagation();
    setActionLoadingId(`${bankId}-${action}`);

    try {
      const res = await fetch(`/api/finance/bank-accounts/${bankId}/approve-edit`, {
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
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-cardBorder bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Bank Name</th>
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Account Number</th>
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Product</th>
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Branch</th>
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">IFSC</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Current Balance</th>
                <th className="py-3 px-4 text-center font-semibold text-muted-foreground">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {banks.map((bank) => {
                const isPending = bank.editStatus === "pending_approval";

                return (
                  <tr
                    key={bank.id}
                    onClick={() => router.push(`/finance/banks/${bank.id}`)}
                    className="hover:bg-accent/20 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <span className="text-primary font-semibold group-hover:underline">
                        {bank.bankName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {bank.maskedAccountNumber}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{bank.product || "-"}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{bank.branchName || "-"}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {bank.ifscCode ? bank.ifscCode : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-primary">
                      {formatCurrency(bank.currentBalance || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {isPending ? (
                          isHigherAuthority ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                disabled={actionLoadingId === `${bank.id}-approve`}
                                onClick={(e) => handleApproveReject(e, bank.id, "approve")}
                              >
                                {actionLoadingId === `${bank.id}-approve` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-3 w-3 mr-1" /> Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs"
                                disabled={actionLoadingId === `${bank.id}-reject`}
                                onClick={(e) => handleApproveReject(e, bank.id, "reject")}
                              >
                                {actionLoadingId === `${bank.id}-reject` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <X className="h-3 w-3 mr-1" /> Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs">
                              <Clock className="h-3 w-3" /> Pending Approval
                            </Badge>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBank(bank);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EditBankModal
        bank={editingBank}
        isOpen={!!editingBank}
        onClose={() => setEditingBank(null)}
        onSuccess={() => router.refresh()}
        userRole={userRole}
      />
    </>
  );
}
