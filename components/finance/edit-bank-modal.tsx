"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
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
};

type EditBankModalProps = {
  bank: Bank | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole?: string;
};

export function EditBankModal({ bank, isOpen, onClose, onSuccess, userRole }: EditBankModalProps) {
  const { t } = useTranslation();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [product, setProduct] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number | string>(0);
  const [editReason, setEditReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHigherAuthority = userRole === "admin" || userRole === "ceo";

  useEffect(() => {
    if (bank) {
      setBankName(bank.bankName || "");
      setAccountNumber(bank.accountNumber || bank.maskedAccountNumber || "");
      setBranchName(bank.branchName || "");
      setIfscCode(bank.ifscCode || "");
      setProduct(bank.product || "");
      setOpeningBalance(bank.openingBalance !== undefined ? bank.openingBalance : 0);
      setEditReason("");
      setError(null);
    }
  }, [bank, isOpen]);

  if (!isOpen || !bank) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      setError(t("banks.bankNameRequired", "Bank Name is required."));
      return;
    }

    if (!isHigherAuthority && !editReason.trim()) {
      setError(t("banks.editReasonRequired", "Reason for Edit is required for non-admin accounts."));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/finance/bank-accounts/${bank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          accountNumber,
          branchName,
          ifscCode,
          product,
          openingBalance: Number(openingBalance) || 0,
          editReason
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || t("banks.failedUpdateBank", "Failed to update bank details"));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t("common.errorOccurred", "An unexpected error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-cardBorder bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("banks.editBankDetails", "Edit Bank Account Details")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isHigherAuthority
                ? t("banks.higherAuthorityNote", "Modifications will take effect immediately as a higher authority.")
                : t("banks.nonAdminEditNote", "Modifications will be submitted as an Edit Request for higher authority (Admin / CEO) approval.")}
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="bankName" className="text-xs font-semibold">{t("banks.bankName", "Bank Name")} *</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. State Bank of India"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="accountNumber" className="text-xs font-semibold">{t("banks.accountNumber", "Account Number")}</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ifscCode" className="text-xs font-semibold">{t("banks.ifsc", "IFSC Code")}</Label>
              <Input
                id="ifscCode"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                placeholder="e.g. SBIN0001234"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="branchName" className="text-xs font-semibold">{t("banks.branch", "Branch Name")}</Label>
              <Input
                id="branchName"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="product" className="text-xs font-semibold">{t("banks.product", "Product / Account Type")}</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Savings / Current"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="openingBalance" className="text-xs font-semibold">{t("banks.openingBalanceInr", "Opening Balance (INR)")}</Label>
            <Input
              id="openingBalance"
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
            />
          </div>

          {!isHigherAuthority && (
            <div className="grid gap-1.5">
              <Label htmlFor="editReason" className="text-xs font-semibold">{t("banks.reasonForEdit", "Reason for Edit")} *</Label>
              <Textarea
                id="editReason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder={t("banks.editReasonPlaceholder", "Please state why this bank details modification is required...")}
                rows={3}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4 animate-spin" />
                  {t("common.saving", "Saving...")}
                </>
              ) : isHigherAuthority ? (
                t("common.saveChanges", "Save Changes")
              ) : (
                t("common.submitForApproval", "Submit for Approval")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
