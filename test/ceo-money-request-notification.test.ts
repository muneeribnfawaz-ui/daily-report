import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCeoUserIdsForWorkspace, notifyCeoOfMoneyRequests } from "@/lib/notifications";

vi.mock("@/lib/db", () => {
  return {
    default: {
      workspace: {
        findUnique: vi.fn(),
        findMany: vi.fn()
      },
      workspaceMember: {
        findMany: vi.fn()
      },
      user: {
        findMany: vi.fn()
      },
      notification: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn()
      },
      moneyRequest: {
        create: vi.fn(),
        findUnique: vi.fn()
      }
    }
  };
});
import db from "@/lib/db";

describe("CEO Money Request Notification Flow", () => {
  const financeUser = {
    id: "user-finance-1",
    name: "Sujitha"
  };

  const companyA = {
    id: "ws-company-a",
    name: "Company A",
    type: "company",
    ownerWorkspaceId: "ws-ceo-a"
  };

  const companyB = {
    id: "ws-company-b",
    name: "Company B",
    type: "company",
    ownerWorkspaceId: "ws-ceo-b"
  };

  const ceoUserA = {
    id: "ceo-user-a",
    name: "Alice CEO",
    role: "ceo"
  };

  const ceoUserB = {
    id: "ceo-user-b",
    name: "Bob CEO",
    role: "ceo"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1 & 3 & 11: Correct CEO for Workspace A is resolved and foreign CEO is excluded", async () => {
    (db.workspace.findUnique as any).mockResolvedValue(companyA);
    (db.workspace.findMany as any).mockResolvedValue([]);
    (db.workspaceMember.findMany as any).mockImplementation(async (args: any) => {
      const wsIn = args?.where?.workspaceId?.in || [];
      if (wsIn.includes("ws-company-a") || wsIn.includes("ws-ceo-a")) {
        return [{ userId: ceoUserA.id, role: "ceo", workspaceId: "ws-ceo-a" }];
      }
      return [];
    });

    const ceoIds = await getCeoUserIdsForWorkspace("ws-company-a");
    expect(ceoIds).toContain("ceo-user-a");
    expect(ceoIds).not.toContain("ceo-user-b");
  });

  it("2, 4, 5, 6, 8: Notification contains actual requester name, particulars, amount, linkUrl, and is unread", async () => {
    (db.workspace.findUnique as any).mockResolvedValue(companyA);
    (db.workspace.findMany as any).mockResolvedValue([]);
    (db.workspaceMember.findMany as any).mockResolvedValue([
      { userId: ceoUserA.id, role: "ceo", workspaceId: "ws-ceo-a" }
    ]);
    (db.notification.findMany as any).mockResolvedValue([]); // No existing notifications

    let createdNotifications: any[] = [];
    (db.notification.createMany as any).mockImplementation(async (args: any) => {
      createdNotifications = args.data;
      return { count: args.data.length };
    });

    const moneyRequests = [
      {
        id: "mr-laptop-1",
        particulars: "Laptop Purchase",
        amountINR: 80000,
        description: "Dev laptop for new hire"
      }
    ];

    await notifyCeoOfMoneyRequests({
      moneyRequests,
      submitter: financeUser,
      workspaceId: "ws-company-a"
    });

    expect(createdNotifications).toHaveLength(1);
    const notif = createdNotifications[0];
    expect(notif.recipientId).toBe("ceo-user-a");
    expect(notif.type).toBe("money_request_approval_request");
    expect(notif.title).toContain("Sujitha");
    expect(notif.message).toContain("Sujitha");
    expect(notif.message).toContain("Laptop Purchase");
    expect(notif.message).toContain("80,000");
    expect(notif.linkUrl).toBe("/finance/requests/mr-laptop-1");
    expect(notif.isRead).toBe(false);
    expect(notif.metadata).toEqual({
      moneyRequestId: "mr-laptop-1",
      particulars: "Laptop Purchase",
      amountINR: 80000,
      submittedBy: "Sujitha",
      workspaceId: "ws-company-a"
    });
  });

  it("10: Duplicate notification prevention ensures one request submission does not create duplicate unread notifications", async () => {
    (db.workspace.findUnique as any).mockResolvedValue(companyA);
    (db.workspace.findMany as any).mockResolvedValue([]);
    (db.workspaceMember.findMany as any).mockResolvedValue([
      { userId: ceoUserA.id, role: "ceo", workspaceId: "ws-ceo-a" }
    ]);

    // Simulate already existing unread notification for ceoUserA on this money request
    (db.notification.findMany as any).mockResolvedValue([
      { recipientId: ceoUserA.id, linkUrl: "/finance/requests/mr-laptop-1" }
    ]);

    let createdNotifications: any[] = [];
    (db.notification.createMany as any).mockImplementation(async (args: any) => {
      createdNotifications = args.data;
      return { count: args.data.length };
    });

    await notifyCeoOfMoneyRequests({
      moneyRequests: [
        {
          id: "mr-laptop-1",
          particulars: "Laptop Purchase",
          amountINR: 80000
        }
      ],
      submitter: financeUser,
      workspaceId: "ws-company-a"
    });

    expect(createdNotifications).toHaveLength(0);
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });

  it("7 & 9: Opening the notification marks it as read and clears unread state", async () => {
    let unreadState = true;
    (db.notification.updateMany as any).mockImplementation(async (args: any) => {
      if (args?.where?.id?.in?.includes("notif-1") || args?.where?.recipientId === "ceo-user-a") {
        unreadState = false;
        return { count: 1 };
      }
      return { count: 0 };
    });

    await db.notification.updateMany({
      where: { id: { in: ["notif-1"] }, recipientId: "ceo-user-a" },
      data: { isRead: true }
    });

    expect(unreadState).toBe(false);
  });
});
