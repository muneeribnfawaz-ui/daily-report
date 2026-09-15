import { describe, it, expect } from "vitest";
import enTranslations from "@/lib/i18n/translations/en.json";
import arTranslations from "@/lib/i18n/translations/ar.json";

describe("Bank Edit Request Notification & Contrast Suite", () => {
  it("should have all required translation keys for the bank edit request card in English", () => {
    const banks = enTranslations.banks as Record<string, string>;
    expect(banks).toBeDefined();
    expect(banks.editRequestPending).toBe("Edit Request Pending Approval");
    expect(banks.pending).toBe("Pending");
    expect(banks.reason).toBe("Reason");
    expect(banks.bank).toBe("Bank");
    expect(banks.branch).toBe("Branch");
    expect(banks.ifsc).toBe("IFSC");
    expect(banks.product).toBe("Product");
    expect(banks.openingBalanceShort).toBe("Opening Bal");
    expect(banks.approveRequest).toBe("Approve Request");
    expect(banks.rejectRequest).toBe("Reject Request");
    expect(banks.awaitingAdminApproval).toBe("Awaiting Admin Approval");
    expect(banks.editBankDetails).toBe("Edit Bank Details");
  });

  it("should have all required translation keys for the bank edit request card in Arabic", () => {
    const banks = arTranslations.banks as Record<string, string>;
    expect(banks).toBeDefined();
    expect(banks.editRequestPending).toBe("طلب التعديل قيد الموافقة");
    expect(banks.pending).toBe("قيد الانتظار");
    expect(banks.reason).toBe("السبب");
    expect(banks.bank).toBe("البنك");
    expect(banks.branch).toBe("الفرع");
    expect(banks.ifsc).toBe("رمز IFSC");
    expect(banks.product).toBe("نوع الحساب");
    expect(banks.openingBalanceShort).toBe("الرصيد الافتتاحي");
    expect(banks.approveRequest).toBe("الموافقة على الطلب");
    expect(banks.rejectRequest).toBe("رفض الطلب");
    expect(banks.awaitingAdminApproval).toBe("في انتظار موافقة المسؤول");
    expect(banks.editBankDetails).toBe("تعديل تفاصيل البنك");
  });
});
