import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHodUserIdsForWorkspace, notifyHodOfMoneyRequests } from "@/lib/notifications";
import db from "@/lib/db";

describe("HOD Money Request Notification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves active HOD user IDs for the specific company workspace", async () => {
    const mockFindMany = vi.spyOn(db.workspaceMember, "findMany").mockResolvedValueOnce([
      {
        userId: "hod-user-1",
        departments: [{ name: "Finance" }]
      },
      {
        userId: "hod-user-2",
        departments: [{ name: "Operations" }]
      }
    ] as any);

    const hodIds = await getHodUserIdsForWorkspace("ws-company-1");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-company-1",
        role: "hod",
        status: "active",
        isActive: true,
        user: { isDeleted: false }
      },
      select: {
        userId: true,
        departments: { select: { name: true } }
      }
    });

    // When a Finance HOD is found, it prioritizes the Finance HOD
    expect(hodIds).toEqual(["hod-user-1"]);
  });

  it("dispatches notification to HOD within the same company workspace and excludes submitter", async () => {
    vi.spyOn(db.workspaceMember, "findMany").mockResolvedValueOnce([
      {
        userId: "hod-user-1",
        departments: [{ name: "Finance" }]
      }
    ] as any);

    vi.spyOn(db.notification, "findMany").mockResolvedValueOnce([]); // No existing notifs

    const createManyMock = vi.spyOn(db.notification, "createMany").mockResolvedValueOnce({ count: 1 } as any);

    await notifyHodOfMoneyRequests({
      moneyRequests: [
        {
          id: "mr-101",
          particulars: "Server Upgrade",
          amountINR: 5000,
          description: "RAM Upgrade"
        }
      ],
      submitter: { id: "user-submitter-1", name: "Finance User" },
      workspaceId: "ws-company-1"
    });

    expect(createManyMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          recipientId: "hod-user-1",
          type: "money_request_approval_request",
          title: "New Money Request from Finance User",
          linkUrl: "/finance/requests/mr-101",
          isRead: false,
          metadata: expect.objectContaining({
            moneyRequestId: "mr-101",
            particulars: "Server Upgrade",
            amountINR: 5000,
            submittedBy: "Finance User",
            workspaceId: "ws-company-1"
          })
        })
      ]
    });
  });

  it("does NOT dispatch notification to HOD if submitter is the HOD themselves", async () => {
    vi.spyOn(db.workspaceMember, "findMany").mockResolvedValueOnce([
      {
        userId: "hod-user-1",
        departments: [{ name: "Finance" }]
      }
    ] as any);

    const createManyMock = vi.spyOn(db.notification, "createMany");

    await notifyHodOfMoneyRequests({
      moneyRequests: [
        {
          id: "mr-102",
          particulars: "Office Supplies",
          amountINR: 1000
        }
      ],
      submitter: { id: "hod-user-1", name: "HOD Name" }, // submitter is HOD
      workspaceId: "ws-company-1"
    });

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("does NOT duplicate unread notifications for the same money request", async () => {
    vi.spyOn(db.workspaceMember, "findMany").mockResolvedValueOnce([
      {
        userId: "hod-user-1",
        departments: [{ name: "Finance" }]
      }
    ] as any);

    // Existing unread notification found for hod-user-1
    vi.spyOn(db.notification, "findMany").mockResolvedValueOnce([
      { recipientId: "hod-user-1" }
    ] as any);

    const createManyMock = vi.spyOn(db.notification, "createMany");

    await notifyHodOfMoneyRequests({
      moneyRequests: [
        {
          id: "mr-103",
          particulars: "Electricity Bill",
          amountINR: 2000
        }
      ],
      submitter: { id: "user-submitter-1", name: "Finance User" },
      workspaceId: "ws-company-1"
    });

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("does NOT notify HODs from another workspace", async () => {
    // Workspace 2 query returns HOD 2 only
    vi.spyOn(db.workspaceMember, "findMany").mockResolvedValueOnce([
      {
        userId: "hod-user-workspace-2",
        departments: [{ name: "Finance" }]
      }
    ] as any);

    vi.spyOn(db.notification, "findMany").mockResolvedValueOnce([]);
    const createManyMock = vi.spyOn(db.notification, "createMany").mockResolvedValueOnce({ count: 1 } as any);

    await notifyHodOfMoneyRequests({
      moneyRequests: [
        {
          id: "mr-104",
          particulars: "Client Travel",
          amountINR: 4000
        }
      ],
      submitter: { id: "user-submitter-1", name: "Finance User" },
      workspaceId: "ws-company-2"
    });

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          recipientId: "hod-user-workspace-2"
        })
      ]
    });
  });
});
