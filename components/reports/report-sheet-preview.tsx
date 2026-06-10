"use client";

import { cn } from "@/lib/utils";
import { LEAVE_DURATION_LABELS, LEAVE_HALF_LABELS } from "@/lib/constants";

export type ReportSheetEntry = {
  _id: string;
  employeeId?: string;
  name: string;
  teamName: string;
  reportType: string;
  reportDate: string;
  attachmentLink?: string;
  dailyMeetingUpdate?: string;
  completedWork: string;
  pendingWork: string;
  blockers: string;
  requiredClarification: string;
  employeeRole?: string | null;
  leaveStatus?: "pending_tl" | "forwarded_to_hod" | "approved" | null;
  leaveType?: string;
  leaveReason?: string;
  leaveReviewedByName?: string | null;
};

export type ReportSheetTeamGroup = {
  teamName: string;
  dailyMeetingUpdate: string;
  dailyMeetingUpdates?: Array<{
    employeeId?: string;
    name: string;
    role?: string | null;
    update: string;
  }>;
  reports: ReportSheetEntry[];
  leaveMembers?: Array<{
    employeeId: string;
    name: string;
    leaveDuration: "full_day" | "half_day";
    leaveHalf?: "first_half" | "second_half" | null;
    status: "pending_tl" | "forwarded_to_hod" | "approved";
    reviewedByName?: string | null;
  }>;
  notSharedMembers?: Array<{
    employeeId: string;
    name: string;
  }>;
};

type ReportSheetPreviewProps = {
  title: string;
  dateLabel: string;
  teamGroups: ReportSheetTeamGroup[];
  projectName?: string;
  companyName?: string;
  subtitle?: string;
};

function formatDateOnly(value: string | Date) {
  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalizedValue);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function TaskCell({ value }: { value?: string | null }) {
  const lines = (value ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return <div className="break-words text-sm text-slate-500">—</div>;
  if (lines.length === 1) return <div className="whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-900">{lines[0]}</div>;

  return (
    <ul className="list-disc space-y-1 pl-5 text-[13px] leading-6 text-slate-900">
      {lines.map((line, index) => (
        <li key={`${index}-${line}`} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-2 border-b border-slate-200 py-2 last:border-b-0 md:grid-cols-[170px_1fr] md:items-start md:gap-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="min-w-0">
        <TaskCell value={value} />
      </div>
    </div>
  );
}

function RoleText({ role }: { role?: string | null }) {
  if (!role) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
        role === "team_lead"
          ? "bg-amber-100 text-amber-900"
          : "bg-emerald-100 text-emerald-900"
      )}
    >
      {role === "team_lead" ? "Team Lead" : "Team Member"}
    </span>
  );
}

function LeaveBadge({
  status,
  leaveType,
  reviewedByName
}: {
  status?: ReportSheetEntry["leaveStatus"];
  leaveType?: string;
  reviewedByName?: string | null;
}) {
  if (!status) return null;

  const isApproved = status === "approved";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
        isApproved ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-700"
      )}
    >
      {isApproved ? `On Leave${reviewedByName ? ` · Approved by ${reviewedByName}` : ""}` : `Leave Requested${leaveType ? `: ${leaveType}` : ""}`}
    </span>
  );
}

function AttachmentRow({ value }: { value?: string | null }) {
  if (!value?.trim()) return null;

  return (
    <div className="grid gap-2 border-b border-slate-200 py-2 last:border-b-0 md:grid-cols-[170px_1fr] md:items-start md:gap-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Attachment Link</div>
      <div className="min-w-0">
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-[13px] font-medium leading-6 text-sky-700 hover:text-sky-900"
        >
          {value}
        </a>
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: ReportSheetEntry }) {
  const isLead = report.employeeRole === "team_lead";
  return (
    <div className={cn("pdf-no-break overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", isLead ? "ring-1 ring-amber-100" : "")}>
      <div className={cn("border-b border-slate-200 px-4 py-3", isLead ? "bg-amber-50" : "bg-slate-50")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="break-words text-[15px] font-bold leading-tight text-slate-900">{report.name}</div>
          <RoleText role={report.employeeRole} />
          <LeaveBadge status={report.leaveStatus} leaveType={report.leaveType} reviewedByName={report.leaveReviewedByName} />
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span>{formatDateOnly(report.reportDate)}</span>
          <span>{report.reportType}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <AttachmentRow value={report.attachmentLink} />
        <DetailRow label="Completed Work" value={report.completedWork} />
        <DetailRow label="Pending Work" value={report.pendingWork} />
        <DetailRow label="Blockers" value={report.blockers} />
        <DetailRow label="Required Clarification" value={report.requiredClarification} />
      </div>
    </div>
  );
}

function TeamCard({ teamGroup }: { teamGroup: ReportSheetTeamGroup }) {
  const teamLabel = teamGroup.teamName?.trim();
  const resolvedTeamLabel =
    !teamLabel || teamLabel.toLowerCase() === "undefined" ? "MIF Tech Members" : teamLabel;
  const memberCount = new Set([
    ...teamGroup.reports.map((report) => report.employeeId ?? report.name),
    ...(teamGroup.leaveMembers ?? []).map((member) => member.employeeId),
    ...(teamGroup.notSharedMembers ?? []).map((member) => member.employeeId)
  ]).size;
  return (
    <div className="pdf-no-break overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 px-5 py-4 text-white">
        <span className="text-2xl">⚙️</span>
        <div>
          <h3 className="break-words text-xl font-bold leading-tight">{resolvedTeamLabel}</h3>
          <p className="text-sm text-white/75">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
        </div>
      </div>

      {teamGroup.leaveMembers?.length ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
            On Leave ({teamGroup.leaveMembers.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {teamGroup.leaveMembers.map((member) => (
              <span
                key={`${member.employeeId}-${member.leaveDuration}-${member.leaveHalf ?? "none"}-${member.status}`}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                  member.status === "approved" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-700"
                )}
              >
                {member.name}
                <span className="ml-2 text-[10px] uppercase tracking-[0.12em] opacity-80">
                  {member.status === "approved"
                    ? `On Leave · ${LEAVE_DURATION_LABELS[member.leaveDuration]}${member.leaveDuration === "half_day" && member.leaveHalf ? ` · ${LEAVE_HALF_LABELS[member.leaveHalf]}` : ""}${member.reviewedByName ? ` · Approved by ${member.reviewedByName}` : ""}`
                    : `Leave Requested · ${LEAVE_DURATION_LABELS[member.leaveDuration]}${member.leaveDuration === "half_day" && member.leaveHalf ? ` · ${LEAVE_HALF_LABELS[member.leaveHalf]}` : ""}${member.reviewedByName ? ` · Reviewed by ${member.reviewedByName}` : ""}`}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {teamGroup.notSharedMembers?.length ? (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-rose-700">
            Not Shared ({teamGroup.notSharedMembers.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {teamGroup.notSharedMembers.map((member) => (
              <span
                key={`${member.employeeId}-not-shared`}
                className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200"
              >
                {member.name}
                <span className="ml-2 text-[10px] uppercase tracking-[0.12em] opacity-80">Not Shared</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {teamGroup.dailyMeetingUpdates?.length ? (
        <div className="bg-amber-50 px-5 py-1.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
            <span>📢</span>
            Daily Meeting Updates
          </div>
          <div className="space-y-2">
            {teamGroup.dailyMeetingUpdates.map((entry, index) => (
              <div key={`${entry.employeeId ?? entry.name}-${index}`} className="rounded-xl border border-amber-200 bg-white/80 px-4 py-2 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{entry.name}</span>
                  {entry.role ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-900">
                      {entry.role === "team_lead" ? "Team Lead" : "Team Member"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-slate-900">{entry.update}</div>
              </div>
            ))}
          </div>
        </div>
      ) : teamGroup.dailyMeetingUpdate ? (
        <div className="bg-amber-50 px-5 py-1.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-700">
            <span>📢</span>
            Daily Meeting Update
          </div>
          <div className="mt-1 whitespace-pre-line break-words text-sm font-bold leading-5 text-slate-900">{teamGroup.dailyMeetingUpdate}</div>
        </div>
      ) : null}

      <div className="space-y-4 px-4 pb-4 pt-0">
        {teamGroup.reports.length ? (
          teamGroup.reports.map((report) => <ReportCard key={report._id} report={report} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No reports submitted for this team on this date.
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportSheetPreview({
  title,
  dateLabel,
  teamGroups,
  projectName = "MIF Cortex",
  companyName = "MIF TECHNOLOGY",
  subtitle = "Completed Work · Pending Work · Blockers · Clarifications"
}: ReportSheetPreviewProps) {
  const totalLeaveCount = teamGroups.reduce((total, teamGroup) => total + (teamGroup.leaveMembers?.length ?? 0), 0);
  const totalNotSharedCount = teamGroups.reduce((total, teamGroup) => total + (teamGroup.notSharedMembers?.length ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-8 text-slate-900 shadow-sm md:px-10 md:py-10">
      <div className="mb-7 flex flex-col items-stretch gap-5 border-b-[3px] border-slate-900 pb-5">
        <div className="border-b-2 border-slate-200 pb-4 text-center">
          <h1 className="break-words text-3xl font-extrabold uppercase leading-tight tracking-[0.08em] text-slate-900 md:text-[42px]">
            {companyName}
          </h1>
          <p className="mt-2 text-sm tracking-[0.12em] text-slate-500">Enterprise Technology Solutions</p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
              {title}
            </h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm">
            {dateLabel}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4">
        <div className="space-y-4 text-center">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Project Name</span>
            <span className="text-lg font-extrabold text-slate-900 md:text-xl">{projectName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Total Teams</span>
              <span className="text-lg font-extrabold text-slate-900 md:text-xl">{teamGroups.length}</span>
            </div>
            <div className="hidden h-6 w-px bg-slate-200 md:block" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Total Reports</span>
              <span className="text-lg font-extrabold text-slate-900 md:text-xl">{teamGroups.reduce((count, teamGroup) => count + teamGroup.reports.length, 0)}</span>
            </div>
            <div className="hidden h-6 w-px bg-slate-200 md:block" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">On Leave</span>
              <span className="text-lg font-extrabold text-slate-900 md:text-xl">{totalLeaveCount}</span>
            </div>
            <div className="hidden h-6 w-px bg-slate-200 md:block" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Not Shared</span>
              <span className="text-lg font-extrabold text-slate-900 md:text-xl">{totalNotSharedCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {teamGroups.map((teamGroup) => (
          <TeamCard key={teamGroup.teamName} teamGroup={teamGroup} />
        ))}
        {teamGroups.length === 0 ? <div className="text-sm text-slate-500">No report data available.</div> : null}
      </div>
    </div>
  );
}
