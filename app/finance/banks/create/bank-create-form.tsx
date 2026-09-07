"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { encryptFinancePayload } from "@/lib/crypto/client-encryption";

export function BankCreateForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
      branchName: formData.get("branchName"),
      ifscCode: formData.get("ifscCode"),
      product: formData.get("product"),
      openingBalance: Number(formData.get("openingBalance")) || 0
    };

    try {
      // 1. Fetch public key config
      const configRes = await fetch("/api/finance/crypto/config");
      const config = await configRes.json();
      
      // 2. Encrypt the payload
      const { payload, signature } = await encryptFinancePayload(
        data,
        config.publicKey,
        config.hmacSecret
      );

      // 3. Send encrypted POST request
      const res = await fetch("/api/finance/bank-accounts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Signature": signature
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add bank account");
      
      router.push("/finance/banks");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <Card className="bg-card shadow-soft">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/50 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="bankName" className="text-sm font-medium">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <Input id="bankName" name="bankName" required placeholder="e.g. HDFC Bank" />
            </div>
            
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="accountNumber" className="text-sm font-medium">
                Account Number <span className="text-red-500">*</span>
              </label>
              <Input id="accountNumber" name="accountNumber" required placeholder="Account number" />
            </div>

            <div className="space-y-2">
              <label htmlFor="branchName" className="text-sm font-medium">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <Input id="branchName" name="branchName" required placeholder="Branch location" />
            </div>

            <div className="space-y-2">
              <label htmlFor="ifscCode" className="text-sm font-medium">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <Input 
                id="ifscCode" 
                name="ifscCode" 
                required 
                placeholder="e.g. SBIN0001234" 
                pattern="^[A-Za-z]{4}0[A-Za-z0-9]{6}$"
                maxLength={11}
                title="Invalid IFSC format. Must be 4 letters, a zero, and 6 alphanumeric characters."
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="product" className="text-sm font-medium">
                Product
              </label>
              <Input id="product" name="product" placeholder="e.g. Checking, Savings" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="openingBalance" className="text-sm font-medium">Opening Balance (INR)</label>
              <Input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Bank Account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
