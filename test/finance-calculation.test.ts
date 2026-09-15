import { describe, it, expect } from "vitest";

function isSameBank(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.split("-")[0].trim().toLowerCase();
  const cleanB = b.split("-")[0].trim().toLowerCase();
  return cleanA === cleanB;
}

function calculateAccountClosing(
  bankName: string,
  openingBalance: number | string | undefined,
  receipts: any[],
  payments: any[],
  expenses: any[]
) {
  const ob = Number(openingBalance) || 0;
  const rec = (receipts || [])
    .filter((r) => isSameBank(r.bankName, bankName))
    .reduce((sum, r) => sum + (Number(r.amountINR) || 0), 0);
  const pay =
    (payments || [])
      .filter((p) => isSameBank(p.bankName, bankName))
      .reduce((sum, p) => sum + (Number(p.amountINR) || 0), 0) +
    (expenses || [])
      .filter((e) => isSameBank(e.bankName, bankName))
      .reduce((sum, e) => sum + (Number(e.amountINR) || 0), 0);
  return ob + rec - pay;
}

function calculateSummaryBanksTotal(
  bankBalances: any[],
  receipts: any[],
  payments: any[],
  expenses: any[]
) {
  return (bankBalances || []).reduce((acc, b: any) => {
    return acc + calculateAccountClosing(b.bankName, b.openingBalance, receipts, payments, expenses);
  }, 0);
}

describe("Finance Summary Bank & Cash Balances Calculation", () => {
  it("calculates correct Bank & Cash Balances for SBI and Cash accounts", () => {
    const bankBalances = [
      { bankName: "SBI - 9012", openingBalance: 50000, closingBalance: 0 },
      { bankName: "Cash", openingBalance: 0, closingBalance: 0 }
    ];

    const receipts = [{ bankName: "SBI - 9012", amountINR: 30000 }];
    const payments = [{ bankName: "SBI - 9012", amountINR: 20000 }];
    const expenses: any[] = [];

    const sbiClosing = calculateAccountClosing("SBI - 9012", 50000, receipts, payments, expenses);
    expect(sbiClosing).toBe(60000);

    const cashClosing = calculateAccountClosing("Cash", 0, receipts, payments, expenses);
    expect(cashClosing).toBe(0);

    const summaryTotal = calculateSummaryBanksTotal(bankBalances, receipts, payments, expenses);
    expect(summaryTotal).toBe(60000);
  });

  it("dynamically updates when expenses and cash receipts are added", () => {
    const bankBalances = [
      { bankName: "SBI - 9012", openingBalance: 50000, closingBalance: 0 },
      { bankName: "Cash", openingBalance: 1000, closingBalance: 0 }
    ];

    const receipts = [
      { bankName: "SBI - 9012", amountINR: 30000 },
      { bankName: "Cash", amountINR: 5000 }
    ];
    const payments = [{ bankName: "SBI - 9012", amountINR: 20000 }];
    const expenses = [{ bankName: "SBI - 9012", amountINR: 10000 }];

    // SBI closing = 50000 + 30000 - 20000 - 10000 = 50000
    const sbiClosing = calculateAccountClosing("SBI - 9012", 50000, receipts, payments, expenses);
    expect(sbiClosing).toBe(50000);

    // Cash closing = 1000 + 5000 = 6000
    const cashClosing = calculateAccountClosing("Cash", 1000, receipts, payments, expenses);
    expect(cashClosing).toBe(6000);

    // Summary total = 50000 + 6000 = 56000
    const summaryTotal = calculateSummaryBanksTotal(bankBalances, receipts, payments, expenses);
    expect(summaryTotal).toBe(56000);
  });
});
