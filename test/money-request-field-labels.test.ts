import { describe, it, expect } from "vitest";
import enTranslations from "@/lib/i18n/translations/en.json";
import arTranslations from "@/lib/i18n/translations/ar.json";
import { financeReportSchema, leaveRequestSchema } from "@/lib/validation";

describe("Money Request Field Labels & Translation Audit Suite", () => {
  it("verifies Money Request translations use Description and NOT Reason for Leave in English", () => {
    expect(enTranslations.moneyRequests.description).toBe("Description");
    expect(enTranslations.moneyRequests.descriptionPurpose).toBe("Description / Purpose");
    expect(enTranslations.common.description).toBe("Description");
    expect(enTranslations.common.reason).toBe("Reason");

    // Leave request reason must remain "Reason for Leave"
    expect(enTranslations.leave.reason).toBe("Reason for Leave");
    expect(enTranslations.leave.reasonPlaceholder).toBe("Explain the reason for taking leave...");
  });

  it("verifies Money Request translations use Description and NOT Reason for Leave in Arabic", () => {
    expect(arTranslations.moneyRequests.description).toBe("الوصف");
    expect(arTranslations.moneyRequests.descriptionPurpose).toBe("الوصف / الغرض");
    expect(arTranslations.common.description).toBe("الوصف");
    expect(arTranslations.common.reason).toBe("السبب");

    // Leave request reason in Arabic must remain "سبب الإجازة"
    expect(arTranslations.leave.reason).toBe("سبب الإجازة");
    expect(arTranslations.leave.reasonPlaceholder).toBe("اشرح سبب طلب الإجازة...");
  });

  it("verifies Money Request payload binds to 'description' and passes validation", () => {
    const moneyRequestPayload = {
      workspaceId: "ws-company-1",
      reportDate: "2026-09-14",
      expenses: [],
      receipts: [],
      payments: [],
      bankBalances: [],
      cashBalance: { pettyCash: 0, total: 0 },
      nextDayApprovals: [
        {
          particulars: "Client Advance",
          description: "Advance for server procurement",
          priority: "high",
          amountINR: 15000,
          amountSAR: 642
        }
      ],
      summary: {
        totalExpenses: 0,
        totalReceipts: 0,
        totalPayments: 0,
        bankBalance: 0,
        pettyCashBalance: 0,
        description: ""
      },
      exchangeRate: 0.0428
    };

    const parsed = financeReportSchema.safeParse(moneyRequestPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nextDayApprovals).toHaveLength(1);
      expect(parsed.data.nextDayApprovals[0].particulars).toBe("Client Advance");
      expect(parsed.data.nextDayApprovals[0].description).toBe("Advance for server procurement");
      expect(parsed.data.nextDayApprovals[0].priority).toBe("high");
      expect(parsed.data.nextDayApprovals[0].amountINR).toBe(15000);
    }
  });

  it("verifies Leave Request schema requires reason field independently", () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const validDate = `${currentYear}-${currentMonth}-15`;
    const validLeave = {
      leaveType: "Sick Leave",
      leaveDuration: "full_day",
      fromDate: validDate,
      toDate: validDate,
      reason: "Medical checkup and consultation"
    };

    const parsed = leaveRequestSchema.safeParse(validLeave);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reason).toBe("Medical checkup and consultation");
    }

    const invalidLeave = {
      ...validLeave,
      reason: ""
    };
    const invalidParsed = leaveRequestSchema.safeParse(invalidLeave);
    expect(invalidParsed.success).toBe(false);
  });
});
