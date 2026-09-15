import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => {
  return {
    default: {
      moneyRequest: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      },
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
        create: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn()
      }
    }
  };
});
import db from "@/lib/db";
import { POST } from "@/app/api/money-requests/[id]/approve/route";
import { GET } from "@/app/api/money-requests/route";

vi.mock("@/lib/api-auth", () => ({
  authorizeApi: vi.fn()
}));
import { authorizeApi } from "@/lib/api-auth";

vi.mock("@/lib/audit", () => ({
  logAuditEntry: vi.fn().mockResolvedValue({})
}));

vi.mock("@/lib/currency", () => ({
  getINRtoSARRate: vi.fn().mockResolvedValue(0.045)
}));

vi.mock("@/lib/crypto", () => ({
  encryptPayload: vi.fn().mockImplementation(async (d) => d),
  decryptPayload: vi.fn().mockImplementation(async (d) => d)
}));

describe("CEO Money Request Action Visibility & Status Flow", () => {
  const pendingMoneyRequest = {
    id: "mr-123",
    workspaceId: "ws-company-1",
    submittedBy: "user-finance-1",
    submittedByName: "Sujitha",
    particulars: "Office Supplies",
    amountINR: 50000,
    amountSAR: 2250,
    priority: "medium",
    status: "pending",
    reviewComment: "",
    revisedAmountINR: null,
    revisedAmountSAR: null,
    revisionReference: ""
  };

  const forwardedMoneyRequest = {
    ...pendingMoneyRequest,
    id: "mr-456",
    status: "forwarded_to_ceo",
    reviewedByName: "HOD User"
  };

  const approvedMoneyRequest = {
    ...pendingMoneyRequest,
    id: "mr-789",
    status: "approved"
  };

  const ceoUser = {
    id: "ceo-1",
    name: "Alice CEO",
    role: "ceo",
    workspaceId: "ws-ceo-1"
  };

  const hodUser = {
    id: "hod-1",
    name: "Bob HOD",
    role: "hod",
    workspaceId: "ws-company-1"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.workspace.findMany as any).mockResolvedValue([
      { id: "ws-company-1", ownerWorkspaceId: "ws-ceo-1", isActive: true, isDeleted: false }
    ]);
    (db.workspaceMember.findMany as any).mockResolvedValue([
      { userId: "ceo-1", workspaceId: "ws-ceo-1", status: "active", isActive: true, workspace: { type: "ceo" } },
      { userId: "hod-1", workspaceId: "ws-company-1", status: "active", isActive: true, workspace: { type: "company" } }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. CEO CANNOT approve a money request before HOD has forwarded it (status is pending)", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(pendingMoneyRequest);

    const req = new Request("http://localhost/api/money-requests/mr-123/approve", {
      method: "POST",
      body: JSON.stringify({ action: "approve" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-123" }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toContain("before HOD has forwarded it");
    expect(db.moneyRequest.update).not.toHaveBeenCalled();
  });

  it("2. CEO CANNOT reject a money request before HOD has forwarded it (status is pending)", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(pendingMoneyRequest);

    const req = new Request("http://localhost/api/money-requests/mr-123/approve", {
      method: "POST",
      body: JSON.stringify({ action: "reject", reason: "Budget limit exceeded" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-123" }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toContain("before HOD has forwarded it");
    expect(db.moneyRequest.update).not.toHaveBeenCalled();
  });

  it("3. HOD CAN forward a pending money request to CEO", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: hodUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(pendingMoneyRequest);
    (db.moneyRequest.update as any).mockResolvedValue({
      ...pendingMoneyRequest,
      status: "forwarded_to_ceo"
    });
    (db.workspace.findUnique as any).mockResolvedValue({ id: "ws-company-1", ownerWorkspaceId: "ws-ceo-1" });
    (db.workspaceMember.findMany as any).mockResolvedValue([
      { userId: "ceo-1", role: "ceo", workspaceId: "ws-ceo-1" }
    ]);

    const req = new Request("http://localhost/api/money-requests/mr-123/approve", {
      method: "POST",
      body: JSON.stringify({ action: "forward" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-123" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.moneyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mr-123" },
        data: expect.objectContaining({
          status: "forwarded_to_ceo",
          reviewedBy: "hod-1"
        })
      })
    );
  });

  it("4. CEO CAN approve a money request after HOD has forwarded it", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(forwardedMoneyRequest);
    (db.moneyRequest.update as any).mockResolvedValue({
      ...forwardedMoneyRequest,
      status: "approved"
    });

    const req = new Request("http://localhost/api/money-requests/mr-456/approve", {
      method: "POST",
      body: JSON.stringify({ action: "approve" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-456" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.moneyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mr-456" },
        data: expect.objectContaining({
          status: "approved",
          reviewedBy: "ceo-1"
        })
      })
    );
  });

  it("5. CEO CAN revise and approve a money request after HOD has forwarded it", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(forwardedMoneyRequest);
    (db.moneyRequest.update as any).mockResolvedValue({
      ...forwardedMoneyRequest,
      status: "approved",
      revisedAmountINR: 40000,
      revisedAmountSAR: 1800,
      revisionReference: "Adjusted by CEO"
    });

    const req = new Request("http://localhost/api/money-requests/mr-456/approve", {
      method: "POST",
      body: JSON.stringify({ action: "approve", revisedAmountINR: 40000, revisionReference: "Adjusted by CEO" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-456" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.moneyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mr-456" },
        data: expect.objectContaining({
          status: "approved",
          revisedAmountINR: 40000,
          revisionReference: "Adjusted by CEO"
        })
      })
    );
  });

  it("6. CEO CAN reject a money request after HOD has forwarded it", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(forwardedMoneyRequest);
    (db.moneyRequest.update as any).mockResolvedValue({
      ...forwardedMoneyRequest,
      status: "rejected",
      reviewComment: "Insufficient budget this month"
    });

    const req = new Request("http://localhost/api/money-requests/mr-456/approve", {
      method: "POST",
      body: JSON.stringify({ action: "reject", reason: "Insufficient budget this month" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-456" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.moneyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mr-456" },
        data: expect.objectContaining({
          status: "rejected",
          reviewComment: "Insufficient budget this month"
        })
      })
    );
  });

  it("7. Processing an already approved or rejected money request returns validation error", async () => {
    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(approvedMoneyRequest);

    const req = new Request("http://localhost/api/money-requests/mr-789/approve", {
      method: "POST",
      body: JSON.stringify({ action: "approve" })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-789" }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain("already approved");
    expect(db.moneyRequest.update).not.toHaveBeenCalled();
  });

  it("8. Regression: Pending Money Request ₹30,000 revised by CEO becomes 'approved' and list API returns status as 'approved'", async () => {
    const thirtyThousandRequest = {
      id: "mr-30000",
      workspaceId: "ws-company-1",
      submittedBy: "user-finance-1",
      submittedByName: "Finance Officer",
      particulars: "Marketing Campaign Advance",
      amountINR: 30000,
      amountSAR: 1350,
      priority: "high",
      status: "forwarded_to_ceo",
      reviewComment: "",
      revisedAmountINR: null,
      revisedAmountSAR: null,
      revisionReference: ""
    };

    (authorizeApi as any).mockResolvedValue({ authorized: true, user: ceoUser });
    (db.moneyRequest.findUnique as any).mockResolvedValue(thirtyThousandRequest);

    const revisedApprovedRequest = {
      ...thirtyThousandRequest,
      status: "approved",
      revisedAmountINR: 25000,
      revisedAmountSAR: 1125,
      revisionReference: "Approved ₹25,000 by CEO"
    };

    (db.moneyRequest.update as any).mockResolvedValue(revisedApprovedRequest);

    // 1. CEO submits Confirm & Approve Revision
    const req = new Request("http://localhost/api/money-requests/mr-30000/approve", {
      method: "POST",
      body: JSON.stringify({
        action: "approve",
        revisedAmountINR: 25000,
        revisionReference: "Approved ₹25,000 by CEO"
      })
    });

    const res = await POST(req, { params: Promise.resolve({ id: "mr-30000" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.moneyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mr-30000" },
        data: expect.objectContaining({
          status: "approved",
          revisedAmountINR: 25000,
          revisedAmountSAR: 1125,
          revisionReference: "Approved ₹25,000 by CEO"
        })
      })
    );

    // 2. Money Request list API returns the updated item with approved status
    (db.moneyRequest.findMany as any).mockResolvedValue([revisedApprovedRequest]);
    const listReq = new Request("http://localhost/api/money-requests?workspaceId=ws-company-1", {
      method: "GET"
    });
    const listRes = await GET(listReq);
    const listJson = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(listJson.success).toBe(true);
    expect(listJson.data[0].status).toBe("approved");
    expect(listJson.data[0].revisedAmountINR).toBe(25000);
  });
});
