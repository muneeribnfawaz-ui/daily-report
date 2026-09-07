"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Filter,
  Calendar,
  User,
  AlertCircle,
  Send,
  Loader2,
  Check,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type RequestItemData = {
  reportId: string;
  reportDate: Date | string;
  submittedBy?: string;
  submittedByName: string;
  particulars: string;
  amountINR: number;
  amountRiyal: number;
  reason: string;
  priority: string;
  bankName?: string;
  revisedAmountINR?: number | null;
  revisedAmountSAR?: number | null;
  revisionReference?: string;
  approval: string;
  reviewedBy?: string | null;
  reviewedByName?: string;
  reviewedAt?: Date | string | null;
  reviewComment?: string;
};

interface MoneyRequestsTableProps {
  initialRequests: RequestItemData[];
  canCreateRequest: boolean;
  userRole?: string;
  canForward?: boolean;
  canApprove?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatSAR(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })} SAR`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority?.toLowerCase() || "medium";
  const variants: Record<string, { className: string; label: string }> = {
    urgent: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 font-bold",
      label: "Urgent"
    },
    high: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 font-semibold",
      label: "High"
    },
    medium: {
      className: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
      label: "Medium"
    },
    low: {
      className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300",
      label: "Low"
    }
  };
  const v = variants[p] || variants.medium;
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide shadow-none ${v.className}`}>
      {v.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string; icon: any }> = {
    pending: {
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
      label: "Pending",
      icon: Clock
    },
    forwarded_to_ceo: {
      className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300",
      label: "Forwarded to CEO",
      icon: Clock
    },
    approved: {
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
      label: "Approved",
      icon: CheckCircle2
    },
    rejected: {
      className: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
      label: "Rejected",
      icon: XCircle
    }
  };
  const v = variants[status] || variants.pending;
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-none ${v.className}`}>
      <Icon className="h-3 w-3" />
      <span>{v.label}</span>
    </Badge>
  );
}

export function MoneyRequestsTable({
  initialRequests,
  canCreateRequest,
  userRole,
  canForward = false,
  canApprove = false
}: MoneyRequestsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [rejectModalItem, setRejectModalItem] = useState<RequestItemData | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [reviseModalItem, setReviseModalItem] = useState<RequestItemData | null>(null);
  const [revisedAmountINRInput, setRevisedAmountINRInput] = useState("");
  const [revisionReferenceInput, setRevisionReferenceInput] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isHod = userRole === "hod" || canForward;
  const isCeoOrAdmin = userRole === "ceo" || userRole === "admin" || canApprove;
  const hasReviewRights = isHod || isCeoOrAdmin;

  const totalAmountINR = initialRequests.reduce((acc, r) => acc + (r.amountINR || 0), 0);
  const pendingCount = initialRequests.filter((r) => r.approval === "pending").length;
  const forwardedCount = initialRequests.filter((r) => r.approval === "forwarded_to_ceo").length;
  const approvedCount = initialRequests.filter((r) => r.approval === "approved").length;
  const rejectedCount = initialRequests.filter((r) => r.approval === "rejected").length;
  
  const approvedAmountINR = initialRequests
    .filter((r) => r.approval === "approved")
    .reduce((acc, r) => acc + (r.revisedAmountINR ?? r.amountINR ?? 0), 0);
  const rejectedAmountINR = initialRequests
    .filter((r) => r.approval === "rejected")
    .reduce((acc, r) => acc + (r.amountINR || 0), 0);

  const filteredRequests = useMemo(() => {
    return initialRequests.filter((req) => {
      if (statusFilter !== "all" && req.approval !== statusFilter) return false;
      if (priorityFilter !== "all" && req.priority !== priorityFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesParticulars = req.particulars?.toLowerCase().includes(q);
        const matchesReason = req.reason?.toLowerCase().includes(q);
        const matchesUser = req.submittedByName?.toLowerCase().includes(q);
        const matchesRef = req.revisionReference?.toLowerCase().includes(q);
        const matchesReviewer = req.reviewedByName?.toLowerCase().includes(q);
        const matchesReviewComment = req.reviewComment?.toLowerCase().includes(q);
        if (!matchesParticulars && !matchesReason && !matchesUser && !matchesRef && !matchesReviewer && !matchesReviewComment) return false;
      }
      return true;
    });
  }, [initialRequests, search, statusFilter, priorityFilter]);

  const handleAction = async (reportId: string, action: "forward" | "approve" | "reject", reason?: string) => {
    try {
      setActionLoadingId(reportId);
      setErrorMsg("");

      const { encryptPayload } = await import("@/lib/crypto");
      const encryptedData = await encryptPayload({ action, reason });

      const res = await fetch(`/api/money-requests/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process request action");
      }

      if (action === "reject") {
        setRejectModalItem(null);
        setRejectReason("");
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (e: React.MouseEvent, req: RequestItemData) => {
    e.stopPropagation();
    setRejectModalItem(req);
    setRejectReason("");
    setErrorMsg("");
  };

  const openReviseModal = (e: React.MouseEvent, req: RequestItemData) => {
    e.stopPropagation();
    setReviseModalItem(req);
    setRevisedAmountINRInput(String(req.revisedAmountINR ?? req.amountINR ?? ""));
    setRevisionReferenceInput(req.revisionReference || "");
    setErrorMsg("");
  };

  const handleConfirmRevise = async () => {
    if (!reviseModalItem) return;
    const amount = Number(revisedAmountINRInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid revised amount in INR.");
      return;
    }

    try {
      setActionLoadingId(reviseModalItem.reportId);
      setErrorMsg("");

      const { encryptPayload } = await import("@/lib/crypto");
      const encryptedData = await encryptPayload({
        action: "approve",
        revisedAmountINR: amount,
        revisionReference: revisionReferenceInput.trim() || "Executive Revision"
      });

      const res = await fetch(`/api/money-requests/${reviseModalItem.reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to revise and approve request");
      }

      setReviseModalItem(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-md dark:border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Requested</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{formatCurrency(totalAmountINR)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{initialRequests.length} total request items</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-md dark:border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Approved</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(approvedAmountINR)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{approvedCount} approved items</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-md dark:border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending / Forwarded</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {pendingCount + forwardedCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {pendingCount} pending, {forwardedCount} forwarded to CEO
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-md dark:border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Rejected</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrency(rejectedAmountINR)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{rejectedCount} rejected items</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 dark:bg-muted/30 p-1 text-sm border border-border/50">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-sm font-semibold dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All <span className="ml-1 text-xs text-muted-foreground">({initialRequests.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === "pending"
                ? "bg-background text-foreground shadow-sm font-semibold dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending <span className="ml-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("forwarded_to_ceo")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === "forwarded_to_ceo"
                ? "bg-background text-foreground shadow-sm font-semibold dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Forwarded <span className="ml-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">({forwardedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === "approved"
                ? "bg-background text-foreground shadow-sm font-semibold dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">({approvedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              statusFilter === "rejected"
                ? "bg-background text-foreground shadow-sm font-semibold dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rejected <span className="ml-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">({rejectedCount})</span>
          </button>
        </div>

        {/* Search & Priority Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search particulars, user, reason..."
              className="h-9 pl-9 text-xs rounded-xl bg-background text-foreground"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
            className="h-9 rounded-xl border border-input bg-background text-foreground px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-cardBorder bg-card shadow-soft dark:border-border/60">
        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 dark:bg-muted/30 text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No Money Requests Found</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "No money requests match your current filters. Try changing your search query or status filter."
                : "No money requests or next-day approvals have been submitted yet."}
            </p>
            {canCreateRequest && !search && statusFilter === "all" ? (
              <Button asChild className="mt-4" size="sm">
                <Link href="/finance/requests/create">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Request
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1020px]">
              <thead>
                <tr className="border-b bg-muted/40 dark:bg-muted/20 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 pl-5 pr-3 min-w-[240px]">Particulars & Details</th>
                  <th className="py-3.5 px-3">Submitted By</th>
                  <th className="py-3.5 px-3 text-center">Priority</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3 text-right">Requested Amount</th>
                  <th className="py-3.5 px-3 text-right">Approved Money</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  {hasReviewRights && (
                    <th className="py-3.5 pr-5 pl-3 text-center min-w-[210px]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.map((req, idx) => {
                  const isApproved = req.approval === "approved";
                  const isPending = req.approval === "pending";
                  const isForwarded = req.approval === "forwarded_to_ceo";
                  const isRejected = req.approval === "rejected";
                  const hasRevision = req.revisedAmountINR !== null && req.revisedAmountINR !== undefined;
                  const displayApprovedMoney = hasRevision ? req.revisedAmountINR! : isApproved ? req.amountINR : null;
                  const isLoading = actionLoadingId === req.reportId;

                  // HOD can forward pending requests to CEO or reject them with a reason
                  const canHodAction = isHod && !isCeoOrAdmin && isPending;
                  // CEO or Admin can approve, revise, or reject pending/forwarded requests
                  const canCeoAction = isCeoOrAdmin && (isPending || isForwarded);

                  return (
                    <tr
                      key={`${req.reportId}-${idx}`}
                      onClick={() => router.push(`/finance/requests/${req.reportId}`)}
                      className="group cursor-pointer transition-colors hover:bg-muted/60 dark:hover:bg-muted/30"
                    >
                      {/* Particulars & Details */}
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="font-semibold text-foreground">{req.particulars}</div>
                        {req.reason ? (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2 max-w-[320px]">
                            {req.reason}
                          </div>
                        ) : null}

                        {/* Rejection Note display */}
                        {isRejected && req.reviewComment && (
                          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50/90 p-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <div>
                              <span className="font-semibold">
                                Rejection Reason{req.reviewedByName ? ` (${req.reviewedByName})` : ""}:
                              </span>{" "}
                              <span>{req.reviewComment}</span>
                            </div>
                          </div>
                        )}

                        {/* Forwarded Note display */}
                        {isForwarded && req.reviewedByName && (
                          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 py-1 text-[11px] font-medium text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Forwarded to CEO by <strong className="font-semibold">{req.reviewedByName}</strong></span>
                          </div>
                        )}
                      </td>

                      {/* Submitted By */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{req.submittedByName}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-3 text-center">
                        <PriorityBadge priority={req.priority} />
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          <span>{formatDate(req.reportDate)}</span>
                        </div>
                      </td>

                      {/* Requested Amount */}
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <div className="font-bold text-foreground">{formatCurrency(req.amountINR)}</div>
                        {req.amountRiyal > 0 ? (
                          <div className="text-[11px] text-muted-foreground">{formatSAR(req.amountRiyal)}</div>
                        ) : null}
                      </td>

                      {/* Revised / Approved Money */}
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        {displayApprovedMoney !== null ? (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(displayApprovedMoney)}
                            </span>
                            {hasRevision && (
                              <span className="block text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                                Revised ({req.revisionReference || "Revision"})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <StatusBadge status={req.approval} />
                      </td>

                      {/* Actions Column for HOD, CEO, Admin */}
                      {hasReviewRights && (
                        <td className="py-3.5 pr-5 pl-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : canHodAction ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* HOD Action: Forward to CEO */}
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 shadow-sm"
                                onClick={() => handleAction(req.reportId, "forward")}
                              >
                                <Send className="mr-1 h-3.5 w-3.5" />
                                Forward
                              </Button>

                              {/* HOD Action: Reject with Reason */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/20 text-xs font-semibold px-2.5"
                                onClick={(e) => openRejectModal(e, req)}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : canCeoAction ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* CEO Action: Approve */}
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold px-2 shadow-sm"
                                onClick={() => handleAction(req.reportId, "approve")}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>

                              {/* CEO Action: Revise & Approve */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/20 text-xs font-semibold px-2"
                                onClick={(e) => openReviseModal(e, req)}
                              >
                                <Edit3 className="mr-1 h-3.5 w-3.5" />
                                Revise
                              </Button>

                              {/* CEO Action: Reject with Reason */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/20 text-xs font-semibold px-2"
                                onClick={(e) => openRejectModal(e, req)}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revise & Approve Modal Dialog */}
      {reviseModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-cardBorder bg-card text-card-foreground p-6 shadow-2xl dark:border-border/80 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Revise & Approve Money Request</h3>
                  <p className="text-xs text-muted-foreground">Adjust the approved money amount before approval</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setReviseModalItem(null)}
                disabled={actionLoadingId !== null}
              >
                ✕
              </Button>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-xl bg-muted/60 dark:bg-slate-800/60 p-3.5 text-xs space-y-1.5 border border-border/50">
              <div className="flex justify-between font-semibold text-foreground">
                <span>{reviseModalItem.particulars}</span>
                <span className="text-foreground font-bold">{formatCurrency(reviseModalItem.amountINR)}</span>
              </div>
              <div className="text-muted-foreground">
                Submitted by <span className="font-medium text-foreground">{reviseModalItem.submittedByName}</span>
              </div>
            </div>

            {/* Revised Amount & Reference Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="revised-amount-input" className="block text-xs font-semibold text-foreground">
                  Revised Amount (INR) <span className="text-amber-600 dark:text-amber-400">*</span>
                </label>
                <Input
                  id="revised-amount-input"
                  type="number"
                  value={revisedAmountINRInput}
                  onChange={(e) => {
                    setRevisedAmountINRInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter revised INR amount..."
                  className="w-full text-xs rounded-xl bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="revision-reference-input" className="block text-xs font-semibold text-foreground">
                  Revision Reference / Note
                </label>
                <Input
                  id="revision-reference-input"
                  value={revisionReferenceInput}
                  onChange={(e) => setRevisionReferenceInput(e.target.value)}
                  placeholder="e.g. Approved with revised budget allocation"
                  className="w-full text-xs rounded-xl bg-background border-input text-foreground"
                />
              </div>

              {errorMsg && (
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setReviseModalItem(null)}
                disabled={actionLoadingId !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold rounded-xl shadow-sm"
                disabled={actionLoadingId !== null || !revisedAmountINRInput}
                onClick={handleConfirmRevise}
              >
                {actionLoadingId === reviseModalItem.reportId ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm & Approve Revision"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-cardBorder bg-card text-card-foreground p-6 shadow-2xl dark:border-border/80 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Reject Money Request</h3>
                  <p className="text-xs text-muted-foreground">Provide a reason for rejecting this request</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setRejectModalItem(null)}
                disabled={actionLoadingId !== null}
              >
                ✕
              </Button>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-xl bg-muted/60 dark:bg-slate-800/60 p-3.5 text-xs space-y-1.5 border border-border/50">
              <div className="flex justify-between font-semibold text-foreground">
                <span>{rejectModalItem.particulars}</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">{formatCurrency(rejectModalItem.amountINR)}</span>
              </div>
              <div className="text-muted-foreground">
                Submitted by <span className="font-medium text-foreground">{rejectModalItem.submittedByName}</span> on {formatDate(rejectModalItem.reportDate)}
              </div>
              {rejectModalItem.reason ? (
                <div className="text-xs text-muted-foreground italic border-t border-border/40 pt-1 mt-1">
                  "{rejectModalItem.reason}"
                </div>
              ) : null}
            </div>

            {/* Rejection Reason Form */}
            <div className="space-y-2">
              <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-foreground">
                Reason for Rejection <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <Textarea
                id="rejection-reason-input"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Enter specific reasons why this money request is being rejected..."
                rows={3}
                className="w-full text-xs rounded-xl bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
              {errorMsg && (
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setRejectModalItem(null)}
                disabled={actionLoadingId !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-semibold rounded-xl shadow-sm"
                disabled={actionLoadingId !== null || !rejectReason.trim()}
                onClick={() => handleAction(rejectModalItem.reportId, "reject", rejectReason.trim())}
              >
                {actionLoadingId === rejectModalItem.reportId ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Confirm Rejection"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

