"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { LEAVE_DURATION_LABELS, LEAVE_HALF_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayName } from "@/lib/utils";
import { LeaveRejectionNoteModal } from "@/components/leave/leave-rejection-note-modal";

type LeaveRequestItem = {
  _id: string;
  employeeId: string;
  leaveNumber: string;
  name: string;
  teamName: string;
  requestedByRole: "team_member" | "team_lead";
  leaveType: string;
  leaveDuration: "full_day" | "half_day";
  leaveHalf: "first_half" | "second_half" | null;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending_tl" | "forwarded_to_hod" | "approved" | "rejected" | "cancelled";
  tlComment?: string;
  hodComment?: string;
  approvedByName?: string | null;
  approvedByRole?: string | null;
};

const statusLabel: Record<LeaveRequestItem["status"], string> = {
  pending_tl: "Pending Review",
  forwarded_to_hod: "With HOD",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled"
};

function statusVariant(status: LeaveRequestItem["status"]) {
  if (status === "approved") return "soft" as const;
  if (status === "rejected" || status === "cancelled") return "outline" as const;
  return "default" as const;
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function ReviewActionButtons({
  requestItem,
  currentUser,
  onStartReject,
  onAction
}: {
  requestItem: LeaveRequestItem;
  currentUser: SessionUser | null;
  onStartReject: (id: string) => void;
  onAction: (id: string, action: "approve" | "reject" | "cancel", comment?: string) => void;
}) {
  if (!currentUser) return null;

  const isOwner = currentUser.id === requestItem.employeeId;
  const canCancel = isOwner && (requestItem.status === "pending_tl" || requestItem.status === "forwarded_to_hod");
  const canTeamLeadReview = currentUser.role === "team_lead" && !isOwner && requestItem.status === "pending_tl";
  const canFinalize =
    (currentUser.role === "hod" || currentUser.role === "admin" || currentUser.role === "ceo" || currentUser.role === "report_manager") &&
    (requestItem.status === "pending_tl" || requestItem.status === "forwarded_to_hod");
  const canReject = canTeamLeadReview || canFinalize;

  if (!canCancel && !canReject && !canFinalize) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canTeamLeadReview ? (
          <>
            <Button size="sm" onClick={() => onAction(requestItem._id, "approve")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => onStartReject(requestItem._id)}>Reject</Button>
          </>
        ) : canFinalize ? (
          <>
            <Button size="sm" onClick={() => onAction(requestItem._id, "approve")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => onStartReject(requestItem._id)}>Reject</Button>
          </>
        ) : canReject ? (
          <Button size="sm" variant="outline" onClick={() => onStartReject(requestItem._id)}>Reject</Button>
        ) : null}
        {canCancel ? (
          <Button size="sm" variant="outline" onClick={() => onAction(requestItem._id, "cancel")}>Cancel</Button>
        ) : null}
      </div>
    </div>
  );
}

export function LeaveRequestCenter() {
  const [message, setMessage] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [page, setPage] = useState(1);
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const { data: leaveRequests, refetch } = useQuery({
    queryKey: ["leave-requests", currentUser?.role, currentUser?.teamName, page],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/leave-requests", {
        params: {
          page,
          limit: 10
        }
      });
      return response.data?.data as {
        items: LeaveRequestItem[];
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
      };
    }
  });

  const startReject = (id: string) => {
    setRejectingRequestId(id);
    setRejectionNote("");
  };

  const closeReject = () => {
    setRejectingRequestId(null);
    setRejectionNote("");
  };

  const handleAction = async (id: string, action: "approve" | "reject" | "cancel", comment = "") => {
    setMessage(null);
    try {
      await api.patch(`/api/leave-requests/${id}`, {
        action,
        comment
      });
      if (action === "reject") {
        closeReject();
      }
      await refetch();
    } catch {
      setMessage("Action failed. Please try again.");
    }
  };

  const showManagerActions = currentUser?.role === "team_lead" || currentUser?.role === "report_manager" || currentUser?.role === "hod" || currentUser?.role === "admin" || currentUser?.role === "ceo";
  const leaveItems = leaveRequests?.items ?? [];
  const totalPages = leaveRequests?.totalPages ?? 0;
  const currentPage = leaveRequests?.page ?? page;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>{showManagerActions ? "Team Leave Requests" : "My Leave Requests"}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Browse submitted leave requests and review their current status.</p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/leave-requests/create">Create Leave</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {showManagerActions
                ? "Review your team’s pending requests and move them to the next approval step."
                : "Track the current approval status of your requests."}
            </div>
            <Badge variant="soft">{leaveRequests?.totalCount ?? 0} requests</Badge>
          </div>

          <div className="space-y-3">
            {!leaveRequests ? (
              <div className="text-sm text-muted-foreground">Loading leave requests...</div>
            ) : leaveItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No leave requests found.</div>
            ) : (
              leaveItems.map((requestItem) => (
                <div key={requestItem._id} className="rounded-xl border border-cardBorder bg-background/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="soft">{requestItem.leaveNumber}</Badge>
                        <div className="text-base font-semibold text-foreground">{requestItem.name}</div>
                        <Badge variant="outline">{formatDisplayName(requestItem.teamName)}</Badge>
                        <Badge variant={statusVariant(requestItem.status)}>{statusLabel[requestItem.status]}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {requestItem.leaveType} · {LEAVE_DURATION_LABELS[requestItem.leaveDuration]}{requestItem.leaveHalf ? ` · ${LEAVE_HALF_LABELS[requestItem.leaveHalf]}` : ""} · {formatDateOnly(requestItem.fromDate)} to {formatDateOnly(requestItem.toDate)}
                      </div>
                      <div className="text-sm text-foreground/90">{requestItem.reason}</div>
                      {requestItem.approvedByName ? (
                        <div className="text-sm text-muted-foreground">
                          Approved by {requestItem.approvedByName}
                          {requestItem.approvedByRole ? ` (${ROLE_LABELS[requestItem.approvedByRole as keyof typeof ROLE_LABELS] ?? requestItem.approvedByRole})` : ""}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      <ReviewActionButtons
                        requestItem={requestItem}
                        currentUser={currentUser ?? null}
                        onStartReject={startReject}
                        onAction={handleAction}
                      />
                    </div>
                  </div>
                  {(requestItem.tlComment || requestItem.hodComment) ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {requestItem.tlComment ? <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">TL note: {requestItem.tlComment}</div> : null}
                      {requestItem.hodComment ? <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">HOD note: {requestItem.hodComment}</div> : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage <= 1}>
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage || 1} of {totalPages || 1}
            </div>
            <Button variant="outline" onClick={() => setPage((current) => current + 1)} disabled={totalPages === 0 || currentPage >= totalPages}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
      <LeaveRejectionNoteModal
        open={Boolean(rejectingRequestId)}
        value={rejectionNote}
        onChange={setRejectionNote}
        onSubmit={(note) => {
          if (rejectingRequestId) {
            void handleAction(rejectingRequestId, "reject", note);
          }
        }}
        onClose={closeReject}
      />
    </div>
  );
}
